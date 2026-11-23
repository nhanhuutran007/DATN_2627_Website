import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { ConflictException } from "@nestjs/common";
import type { DataSource, EntityManager } from "typeorm";

import "reflect-metadata";

import { AdminService } from "../src/modules/admin/admin.service";
import type { NotificationsService } from "../src/modules/notifications/notifications.service";
import type { User } from "../src/modules/users/entities/user.entity";
import { WalletTxType } from "../src/modules/wallet/entities/wallet.entity";
import {
  classifySourceRow,
  describeDiff,
  ledgerSumSql,
  replayLedger,
  type SourceRow,
} from "../src/modules/wallet/wallet-reconciliation";
import { MISMATCH_DETECTED_ACTION, WalletReconciliationService } from "../src/modules/wallet/wallet-reconciliation.service";
import { WalletService } from "../src/modules/wallet/wallet.service";
import { WithdrawalsService } from "../src/modules/wallet/withdrawals.service";
import { makeAuditRecorder } from "./helpers/audit";

const OWNER = "123e4567-e89b-12d3-a456-426614174002";
const ADMIN = { id: "123e4567-e89b-12d3-a456-426614174001" } as User;

function tx(id: string, type: WalletTxType, amount: number, after: [number, number, number], at: string) {
  return {
    id,
    type,
    amount: amount.toFixed(2),
    balanceAfter: after[0].toFixed(2),
    heldAfter: after[1].toFixed(2),
    withdrawingAfter: after[2].toFixed(2),
    createdAt: at,
    note: null,
  };
}

function sourceRow(overrides: Partial<SourceRow>): SourceRow {
  return {
    type: WalletTxType.TOPUP,
    userId: OWNER,
    amount: "40000.00",
    topupId: "t1",
    topupStatus: "completed",
    topupUser: OWNER,
    topupAmount: "40000.00",
    donationId: null,
    donationUser: null,
    donationAmount: null,
    withdrawalId: null,
    withdrawalUser: null,
    withdrawalAmount: null,
    withdrawalStatus: null,
    ...overrides,
  };
}

describe("wallet reconciliation (pure)", () => {
  it("replays the ledger into balance / held / withdrawing", () => {
    const result = replayLedger([
      tx("1", WalletTxType.TOPUP, 100_000, [100_000, 0, 0], "2026-11-01"),
      tx("2", WalletTxType.HOLD, 30_000, [70_000, 30_000, 0], "2026-11-02"),
      tx("3", WalletTxType.CAPTURE, 10_000, [70_000, 20_000, 0], "2026-11-03"),
      tx("4", WalletTxType.RELEASE, 20_000, [90_000, 0, 0], "2026-11-04"),
      tx("5", WalletTxType.WITHDRAW_REQUEST, 50_000, [40_000, 0, 50_000], "2026-11-05"),
      tx("6", WalletTxType.WITHDRAW_CANCEL, 50_000, [90_000, 0, 0], "2026-11-06"),
      tx("7", WalletTxType.WITHDRAW_REQUEST, 60_000, [30_000, 0, 60_000], "2026-11-07"),
      tx("8", WalletTxType.WITHDRAW_PAID, 60_000, [30_000, 0, 0], "2026-11-08"),
      tx("9", WalletTxType.REFUND, 10_000, [40_000, 0, 0], "2026-11-09"),
    ]);
    deepEqual(result.ledger, { balance: 40_000, held: 0, withdrawing: 0 });
    equal(result.firstBreak, null);
  });

  it("points at the first transaction recorded after an off-ledger edit", () => {
    // Nạp 40.000, rồi ai đó sửa số dư thành 40.000.000 trước khi ủng hộ 10.000.
    const result = replayLedger([
      tx("1", WalletTxType.TOPUP, 40_000, [40_000, 0, 0], "2026-11-23T12:32:40Z"),
      tx("2", WalletTxType.HOLD, 10_000, [39_990_000, 10_000, 0], "2026-11-23T13:00:00Z"),
      tx("3", WalletTxType.HOLD, 5_000, [39_985_000, 15_000, 0], "2026-11-23T13:05:00Z"),
    ]);
    deepEqual(result.ledger, { balance: 25_000, held: 15_000, withdrawing: 0 });
    ok(result.firstBreak);
    equal(result.firstBreak.txId, "2");
    deepEqual(result.firstBreak.jump, { balance: 39_960_000, held: 0, withdrawing: 0 });
  });

  it("builds the SQL ledger sum from the same effect table", () => {
    const sql = ledgerSumSql("held");
    ok(sql.includes("WHEN 'hold' THEN `amount`"));
    ok(sql.includes("WHEN 'capture' THEN -`amount`"));
    ok(sql.includes("WHEN 'release' THEN -`amount`"));
    ok(!sql.includes("'topup'"));
  });

  it("classifies ledger rows against their source documents", () => {
    equal(classifySourceRow(sourceRow({})), null);
    equal(classifySourceRow(sourceRow({ topupId: null })), "topup_missing");
    equal(classifySourceRow(sourceRow({ topupStatus: "pending" })), "topup_not_completed");
    equal(classifySourceRow(sourceRow({ topupAmount: "40000000.00" })), "topup_mismatch");
    equal(classifySourceRow(sourceRow({ type: WalletTxType.HOLD, topupId: null })), "donation_missing");
    equal(
      classifySourceRow(sourceRow({ type: WalletTxType.HOLD, donationId: "d1", donationUser: OWNER, donationAmount: "40000.00" })),
      null,
    );
    equal(
      classifySourceRow(sourceRow({ type: WalletTxType.WITHDRAW_PAID, withdrawalId: "w1", withdrawalUser: OWNER, withdrawalAmount: "40000.00", withdrawalStatus: "pending" })),
      "withdrawal_not_completed",
    );
  });

  it("describes a difference in admin-readable words", () => {
    equal(describeDiff({ balance: 39_960_000, held: 0, withdrawing: -5_000 }), "số dư +39.960.000 ₫, tiền chờ rút −5.000 ₫");
  });
});

type QueryHandler = (sql: string, params: unknown[]) => unknown;

function makeService(handler: QueryHandler) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const manager = {
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return handler(sql, params);
    },
  } as unknown as EntityManager;
  const dataSource = {
    manager,
    transaction: async <T>(work: (m: EntityManager) => Promise<T>) => work(manager),
  } as unknown as DataSource;
  const audit = makeAuditRecorder();
  const notices: unknown[] = [];
  const notifications = {
    notify: async (input: unknown) => {
      notices.push(input);
    },
  } as unknown as NotificationsService;
  const service = new WalletReconciliationService(dataSource, audit.service, notifications);
  return { service, calls, audit, notices, manager };
}

/** Kịch bản owner2: nạp thật 40.000, giữ 40.000 cho cam kết, rồi số dư bị sửa tay thành 40.000.000. */
function forgedWalletHandler(state: { balance: string; held: string; lastAlert?: Record<string, unknown> }): QueryHandler {
  return (sql) => {
    if (sql.includes("UNION SELECT `user_id` FROM `wallet_transactions`")) {
      return [
        {
          userId: OWNER,
          name: "Trần Thị Bích",
          email: "owner2@gopmam.com",
          balance: state.balance,
          held: state.held,
          withdrawing: "0.00",
          ledgerBalance: "0.00",
          ledgerHeld: "40000.00",
          ledgerWithdrawing: "0.00",
          totalTopup: "40000.00",
          totalCaptured: "0.00",
          totalWithdrawn: "0.00",
          totalRefunded: "0.00",
          txCount: 2,
          lastActivityAt: "2026-11-23T12:33:25Z",
        },
      ];
    }
    if (sql.includes("LEFT JOIN `wallet_topups`")) return [];
    if (sql.includes("NOT EXISTS")) return [];
    if (sql.includes("`balance_after` AS balanceAfter")) {
      return [
        tx("1", WalletTxType.TOPUP, 40_000, [40_000, 0, 0], "2026-11-23T12:32:40Z"),
        tx("2", WalletTxType.HOLD, 40_000, [0, 40_000, 0], "2026-11-23T12:33:25Z"),
      ];
    }
    if (sql.includes("FOR UPDATE")) return [{ balance: state.balance, held: state.held, withdrawing: "0.00" }];
    if (sql.startsWith("SELECT COALESCE(SUM")) return [{ balance: "0.00", held: "40000.00", withdrawing: "0.00" }];
    if (sql.startsWith("UPDATE `wallets`")) return { affectedRows: 1 };
    if (sql.includes("`role` = 'admin'")) return [{ id: ADMIN.id }];
    if (sql.includes("`audit_logs`")) return state.lastAlert ? [{ newValues: state.lastAlert }] : [];
    throw new Error(`Unexpected SQL: ${sql}`);
  };
}

describe("WalletReconciliationService", () => {
  it("flags a wallet whose balance was edited outside the ledger", async () => {
    const { service } = makeService(forgedWalletHandler({ balance: "40000000.00", held: "40000.00" }));
    const page = await service.list();
    equal(page.totals.mismatched, 1);
    equal(page.totals.liability, 40_040_000);
    equal(page.totals.ledgerLiability, 40_000);
    const [row] = page.items;
    equal(row.status, "mismatch");
    deepEqual(row.diff, { balance: 40_000_000, held: 0, withdrawing: 0 });
    equal(row.summary, "số dư +40.000.000 ₫");
    equal(await service.countMismatched(), 1);
  });

  it("explains in detail that the change happened after the last transaction", async () => {
    const { service } = makeService(forgedWalletHandler({ balance: "40000000.00", held: "40000.00" }));
    const detail = await service.detail(OWNER);
    equal(detail.firstBreak, null);
    ok(detail.changedAfterLastTx);
    deepEqual(detail.changedAfterLastTx.diff, { balance: 40_000_000, held: 0, withdrawing: 0 });
    equal(detail.canRestore, true);
    equal(detail.transactions[0].id, "2", "newest transaction first");
  });

  it("blocks spending and paying out from a mismatched wallet", async () => {
    const { service, manager } = makeService(forgedWalletHandler({ balance: "40000000.00", held: "40000.00" }));
    await rejects(service.assertConsistent(OWNER, "user", manager), ConflictException);
    await rejects(service.assertConsistent(OWNER, "admin"), /lệch sổ/);
  });

  it("lets a consistent wallet through", async () => {
    const { service } = makeService(forgedWalletHandler({ balance: "0.00", held: "40000.00" }));
    await service.assertConsistent(OWNER, "user");
    equal((await service.list()).totals.mismatched, 0);
  });

  it("restores the wallet to the ledger, audits it and tells the user", async () => {
    const state = { balance: "40000000.00", held: "40000.00" };
    const { service, calls, audit, notices } = makeService(forgedWalletHandler(state));
    await service.restore(OWNER, "Số dư bị sửa thẳng trong cơ sở dữ liệu", ADMIN);
    const update = calls.find((call) => call.sql.startsWith("UPDATE `wallets`"));
    ok(update);
    deepEqual(update.params, [0, 40_000, 0, OWNER]);
    const entry = audit.entries.find((e) => e.action === "wallet.reconcile.restore");
    ok(entry);
    equal(entry.userId, ADMIN.id);
    deepEqual(entry.newValues?.removed, { balance: 40_000_000, held: 0, withdrawing: 0 });
    equal(notices.length, 1);
  });

  it("refuses to restore when the forged money was already spent (ledger would go negative)", async () => {
    const { service } = makeService((sql, params) => {
      if (sql.includes("FOR UPDATE")) return [{ balance: "39990000.00", held: "50000.00", withdrawing: "0.00" }];
      if (sql.startsWith("SELECT COALESCE(SUM")) return [{ balance: "-10000.00", held: "50000.00", withdrawing: "0.00" }];
      return forgedWalletHandler({ balance: "0", held: "0" })(sql, params);
    });
    await rejects(service.restore(OWNER, "Số dư bị sửa thẳng trong cơ sở dữ liệu", ADMIN), /số âm/);
  });

  it("alerts admins once per distinct mismatch", async () => {
    const state: { balance: string; held: string; lastAlert?: Record<string, unknown> } = { balance: "40000000.00", held: "40000.00" };
    const { service, audit, notices } = makeService(forgedWalletHandler(state));
    equal(await service.alertNewMismatches(), 1);
    const entry = audit.entries.find((e) => e.action === MISMATCH_DETECTED_ACTION);
    ok(entry);
    equal(notices.length, 1);
    // Lần quét sau với cùng chênh lệch: không báo lại.
    state.lastAlert = entry.newValues;
    equal(await service.alertNewMismatches(), 0);
  });
});

describe("wallet reconciliation wiring", () => {
  // Tham số kiểu `T | null` được TypeScript ghi metadata là Object: thiếu @Inject(T) thì Nest
  // tiêm null và việc chặn ví lệch âm thầm không chạy.
  for (const target of [WalletService, WithdrawalsService, AdminService]) {
    it(`${target.name} declares an explicit injection token for the reconciliation service`, () => {
      const declared = (Reflect.getMetadata("self:paramtypes", target) ?? []) as Array<{ param: unknown }>;
      ok(declared.some((entry) => entry.param === WalletReconciliationService));
    });
  }
});
