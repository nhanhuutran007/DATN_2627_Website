import { ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSource, EntityManager } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import type { User } from "../users/entities/user.entity";
import { WalletTxType } from "./entities/wallet.entity";
import {
  bucketDiffCents,
  centsToVnd,
  classifySourceRow,
  describeDiff,
  isZero,
  type LedgerBreak,
  ledgerSumSql,
  replayLedger,
  SOURCE_ISSUE_MESSAGE,
  type SourceIssueKind,
  type SourceRow,
  toCents,
  type WalletBuckets,
} from "./wallet-reconciliation";

/** Đường dẫn trang đối soát ví trong khu quản trị (dùng cho thông báo). */
export const ADMIN_WALLET_PATH = "/admin/doi-soat?tab=vi";
export const MISMATCH_DETECTED_ACTION = "wallet.reconcile.mismatch_detected";

export type WalletSourceIssue = {
  kind: SourceIssueKind;
  message: string;
  txId: string | null;
  type: WalletTxType | null;
  amount: number;
  at: Date | string | null;
};

export type WalletReconRow = {
  userId: string;
  name: string;
  email: string;
  wallet: WalletBuckets;
  /** Số dư dựng lại từ sổ giao dịch. */
  ledger: WalletBuckets;
  /** wallet − ledger (VND); khác 0 = tiền bị thêm/bớt ngoài sổ. */
  diff: WalletBuckets;
  totalTopup: number;
  totalCaptured: number;
  totalWithdrawn: number;
  totalRefunded: number;
  txCount: number;
  lastActivityAt: Date | string | null;
  sourceIssues: number;
  status: "ok" | "mismatch";
  /** Tóm tắt cho admin, vd. "số dư +40.000.000 ₫"; null khi khớp. */
  summary: string | null;
};

export type WalletReconTotals = {
  wallets: number;
  mismatched: number;
  /** Tổng tiền người dùng đang gửi trên nền tảng (số dư + đang giữ + chờ rút) theo bảng ví. */
  liability: number;
  /** Cùng số trên nhưng dựng lại từ sổ giao dịch. */
  ledgerLiability: number;
  totalTopup: number;
  totalCaptured: number;
  totalWithdrawn: number;
};

export type WalletReconPage = {
  items: WalletReconRow[];
  total: number;
  offset: number;
  limit: number;
  totals: WalletReconTotals;
  checkedAt: Date;
};

export type WalletReconDetail = WalletReconRow & {
  issues: WalletSourceIssue[];
  /** Lần đầu tiên số dư ghi trên sổ nhảy khác phép cộng dồn (sửa ngoài sổ giữa hai giao dịch). */
  firstBreak: LedgerBreak | null;
  /** Ví bị sửa sau giao dịch cuối cùng: so số dư hiện tại với số ghi ở giao dịch cuối. */
  changedAfterLastTx: { at: Date | string; diff: WalletBuckets } | null;
  /** Có thể đưa ví về đúng sổ (sổ không âm và đang lệch). */
  canRestore: boolean;
  transactions: {
    id: string;
    type: WalletTxType;
    amount: number;
    balanceAfter: number;
    heldAfter: number;
    withdrawingAfter: number;
    note: string | null;
    createdAt: Date | string;
  }[];
};

export type WalletReconQuery = { q?: string; issuesOnly?: boolean; offset?: number; limit?: number };

type WalletSqlRow = {
  userId: string;
  name: string;
  email: string;
  balance: string | number;
  held: string | number;
  withdrawing: string | number;
  ledgerBalance: string | number;
  ledgerHeld: string | number;
  ledgerWithdrawing: string | number;
  totalTopup: string | number;
  totalCaptured: string | number;
  totalWithdrawn: string | number;
  totalRefunded: string | number;
  txCount: string | number;
  lastActivityAt: Date | string | null;
};

type SourceSqlRow = SourceRow & { id: string; createdAt: Date | string };
type UnrecordedTopup = { id: string; userId: string; amount: string | number; createdAt: Date | string };
type IssueWithUser = WalletSourceIssue & { userId: string };

const MAX_DETAIL_TX = 200;

/** Số dư theo bảng ví và theo sổ, cho mọi người dùng từng có ví hoặc giao dịch ví. */
function walletRowsSql(singleUser: boolean): string {
  return (
    "SELECT u.`id` AS userId, u.`name` AS name, u.`email` AS email, " +
    "COALESCE(w.`balance`, 0) AS balance, COALESCE(w.`held`, 0) AS held, COALESCE(w.`withdrawing`, 0) AS withdrawing, " +
    "COALESCE(l.lb, 0) AS ledgerBalance, COALESCE(l.lh, 0) AS ledgerHeld, COALESCE(l.lw, 0) AS ledgerWithdrawing, " +
    "COALESCE(l.topups, 0) AS totalTopup, COALESCE(l.captured, 0) AS totalCaptured, " +
    "COALESCE(l.withdrawn, 0) AS totalWithdrawn, COALESCE(l.refunded, 0) AS totalRefunded, " +
    "COALESCE(l.n, 0) AS txCount, l.lastAt AS lastActivityAt " +
    "FROM (SELECT `user_id` FROM `wallets` UNION SELECT `user_id` FROM `wallet_transactions`) k " +
    "JOIN `users` u ON u.`id` = k.`user_id` " +
    "LEFT JOIN `wallets` w ON w.`user_id` = k.`user_id` " +
    "LEFT JOIN (SELECT `user_id`, " +
    `${ledgerSumSql("balance")} AS lb, ${ledgerSumSql("held")} AS lh, ${ledgerSumSql("withdrawing")} AS lw, ` +
    "SUM(CASE WHEN `type` = 'topup' THEN `amount` ELSE 0 END) AS topups, " +
    "SUM(CASE WHEN `type` = 'capture' THEN `amount` ELSE 0 END) AS captured, " +
    "SUM(CASE WHEN `type` = 'withdraw_paid' THEN `amount` ELSE 0 END) AS withdrawn, " +
    "SUM(CASE WHEN `type` = 'refund' THEN `amount` ELSE 0 END) AS refunded, " +
    "COUNT(*) AS n, MAX(`created_at`) AS lastAt " +
    "FROM `wallet_transactions`" +
    (singleUser ? " WHERE `user_id` = ?" : "") +
    " GROUP BY `user_id`) l ON l.`user_id` = k.`user_id`" +
    (singleUser ? " WHERE k.`user_id` = ?" : "")
  );
}

/** Dòng sổ không khớp chứng từ gốc (đơn nạp, khoản ủng hộ, yêu cầu rút). */
function sourceIssuesSql(singleUser: boolean): string {
  return (
    "SELECT tx.`id` AS id, tx.`user_id` AS userId, tx.`type` AS type, tx.`amount` AS amount, tx.`created_at` AS createdAt, " +
    "t.`id` AS topupId, t.`status` AS topupStatus, t.`user_id` AS topupUser, t.`amount` AS topupAmount, " +
    "d.`id` AS donationId, d.`user_id` AS donationUser, d.`amount` AS donationAmount, " +
    "ww.`id` AS withdrawalId, ww.`user_id` AS withdrawalUser, ww.`amount` AS withdrawalAmount, ww.`status` AS withdrawalStatus " +
    "FROM `wallet_transactions` tx " +
    "LEFT JOIN `wallet_topups` t ON t.`id` = tx.`topup_id` " +
    "LEFT JOIN `donations` d ON d.`id` = tx.`donation_id` " +
    "LEFT JOIN `wallet_withdrawals` ww ON ww.`id` = tx.`withdrawal_id` " +
    "WHERE (" +
    "(tx.`type` = 'topup' AND (t.`id` IS NULL OR t.`status` <> 'completed' OR t.`user_id` <> tx.`user_id` OR ABS(t.`amount` - tx.`amount`) > 0.005)) " +
    "OR (tx.`type` IN ('hold', 'capture', 'release', 'refund') AND (d.`id` IS NULL OR d.`user_id` <> tx.`user_id` OR ABS(d.`amount` - tx.`amount`) > 0.005)) " +
    "OR (tx.`type` IN ('withdraw_request', 'withdraw_paid', 'withdraw_cancel') AND (ww.`id` IS NULL OR ww.`user_id` <> tx.`user_id` OR ABS(ww.`amount` - tx.`amount`) > 0.005)) " +
    "OR (tx.`type` = 'withdraw_paid' AND ww.`status` <> 'completed')" +
    ")" +
    (singleUser ? " AND tx.`user_id` = ?" : "") +
    " ORDER BY tx.`created_at` ASC"
  );
}

/** Đơn nạp đã thanh toán mà sổ ví không có dòng cộng tiền tương ứng. */
function unrecordedTopupsSql(singleUser: boolean): string {
  return (
    "SELECT t.`id` AS id, t.`user_id` AS userId, t.`amount` AS amount, t.`completed_at` AS createdAt " +
    "FROM `wallet_topups` t WHERE t.`status` = 'completed' AND NOT EXISTS (" +
    "SELECT 1 FROM `wallet_transactions` x WHERE x.`topup_id` = t.`id` AND x.`type` = 'topup')" +
    (singleUser ? " AND t.`user_id` = ?" : "")
  );
}

const vnd = (value: string | number | null | undefined) => toCents(value) / 100;

function formatVnd(value: number): string {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

/**
 * Đối soát ví Góp Mầm: số dư trong bảng `wallets` phải bằng số dựng lại từ sổ
 * `wallet_transactions`, và mỗi dòng sổ phải có chứng từ gốc (đơn nạp SePay, khoản ủng hộ,
 * yêu cầu rút). Ví lệch bị chặn tiêu tiền/rút tiền cho tới khi admin xử lý; admin không sửa
 * số dư tay mà chỉ đưa ví về đúng sổ (có nhật ký kiểm toán).
 */
@Injectable()
export class WalletReconciliationService {
  private readonly logger = new Logger(WalletReconciliationService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Quét toàn bộ ví (dữ liệu nhỏ: một truy vấn tổng hợp + một truy vấn chứng từ). */
  async scan(manager: EntityManager = this.dataSource.manager): Promise<{ rows: WalletReconRow[]; issues: WalletSourceIssue[] }> {
    const [walletRows, sourceRows, unrecorded] = await Promise.all([
      manager.query(walletRowsSql(false)) as Promise<WalletSqlRow[]>,
      manager.query(sourceIssuesSql(false)) as Promise<SourceSqlRow[]>,
      manager.query(unrecordedTopupsSql(false)) as Promise<UnrecordedTopup[]>,
    ]);
    const issues = this.collectIssues(sourceRows, unrecorded);
    const issueCount = new Map<string, number>();
    for (const issue of issues) issueCount.set(issue.userId, (issueCount.get(issue.userId) ?? 0) + 1);
    return { rows: walletRows.map((row) => this.toRow(row, issueCount.get(row.userId) ?? 0)), issues };
  }

  async list(query: WalletReconQuery = {}): Promise<WalletReconPage> {
    const { rows } = await this.scan();
    const totals: WalletReconTotals = {
      wallets: rows.length,
      mismatched: rows.filter((row) => row.status === "mismatch").length,
      liability: vnd(rows.reduce((sum, row) => sum + toCents(row.wallet.balance) + toCents(row.wallet.held) + toCents(row.wallet.withdrawing), 0) / 100),
      ledgerLiability: vnd(rows.reduce((sum, row) => sum + toCents(row.ledger.balance) + toCents(row.ledger.held) + toCents(row.ledger.withdrawing), 0) / 100),
      totalTopup: vnd(rows.reduce((sum, row) => sum + toCents(row.totalTopup), 0) / 100),
      totalCaptured: vnd(rows.reduce((sum, row) => sum + toCents(row.totalCaptured), 0) / 100),
      totalWithdrawn: vnd(rows.reduce((sum, row) => sum + toCents(row.totalWithdrawn), 0) / 100),
    };
    const q = query.q?.trim().toLowerCase();
    const filtered = rows
      .filter((row) => !query.issuesOnly || row.status === "mismatch")
      .filter((row) => !q || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q))
      // Ví lệch lên đầu, sau đó ví nhiều tiền nhất.
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "mismatch" ? -1 : 1;
        const total = (row: WalletReconRow) => row.wallet.balance + row.wallet.held + row.wallet.withdrawing;
        return total(b) - total(a);
      });
    const offset = query.offset ?? 0;
    const limit = Math.min(query.limit ?? 20, 100);
    return { items: filtered.slice(offset, offset + limit), total: filtered.length, offset, limit, totals, checkedAt: new Date() };
  }

  async countMismatched(): Promise<number> {
    const { rows } = await this.scan();
    return rows.filter((row) => row.status === "mismatch").length;
  }

  async detail(userId: string, manager: EntityManager = this.dataSource.manager): Promise<WalletReconDetail> {
    const [walletRows, sourceRows, unrecorded, transactions] = await Promise.all([
      manager.query(walletRowsSql(true), [userId, userId]) as Promise<WalletSqlRow[]>,
      manager.query(sourceIssuesSql(true), [userId]) as Promise<SourceSqlRow[]>,
      manager.query(unrecordedTopupsSql(true), [userId]) as Promise<UnrecordedTopup[]>,
      manager.query(
        "SELECT `id`, `type`, `amount`, `balance_after` AS balanceAfter, `held_after` AS heldAfter, " +
          "`withdrawing_after` AS withdrawingAfter, `note`, `created_at` AS createdAt " +
          "FROM `wallet_transactions` WHERE `user_id` = ? ORDER BY `created_at` ASC, `id` ASC",
        [userId],
      ) as Promise<Array<{ id: string; type: WalletTxType; amount: string; balanceAfter: string; heldAfter: string; withdrawingAfter: string; note: string | null; createdAt: Date | string }>>,
    ]);
    const walletRow = walletRows[0];
    if (!walletRow) throw new NotFoundException("Người dùng này chưa có ví.");
    const issues = this.collectIssues(sourceRows, unrecorded);
    const row = this.toRow(walletRow, issues.length);
    const replay = replayLedger(transactions);
    const last = transactions[transactions.length - 1];
    const afterLast = last
      ? bucketDiffCents(row.wallet, { balance: vnd(last.balanceAfter), held: vnd(last.heldAfter), withdrawing: vnd(last.withdrawingAfter) })
      : bucketDiffCents(row.wallet, { balance: 0, held: 0, withdrawing: 0 });
    const ledgerNonNegative = row.ledger.balance >= 0 && row.ledger.held >= 0 && row.ledger.withdrawing >= 0;
    return {
      ...row,
      issues: issues.map((issue) => ({ kind: issue.kind, message: issue.message, txId: issue.txId, type: issue.type, amount: issue.amount, at: issue.at })),
      firstBreak: replay.firstBreak,
      changedAfterLastTx: isZero(afterLast) ? null : { at: last?.createdAt ?? walletRow.lastActivityAt ?? new Date(), diff: centsToVnd(afterLast) },
      canRestore: !isZero(row.diff) && ledgerNonNegative,
      transactions: transactions
        .slice(-MAX_DETAIL_TX)
        .reverse()
        .map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: vnd(tx.amount),
          balanceAfter: vnd(tx.balanceAfter),
          heldAfter: vnd(tx.heldAfter),
          withdrawingAfter: vnd(tx.withdrawingAfter),
          note: tx.note,
          createdAt: tx.createdAt,
        })),
    };
  }

  /**
   * Chặn tiêu/rút tiền từ ví đang lệch. Gọi trong transaction của thao tác (trước khi đổi số dư)
   * để kết quả kiểm tra và thao tác nhìn cùng một trạng thái.
   */
  async assertConsistent(userId: string, audience: "user" | "admin", manager: EntityManager = this.dataSource.manager): Promise<void> {
    const [walletRows, sourceRows, unrecorded] = await Promise.all([
      manager.query(walletRowsSql(true), [userId, userId]) as Promise<WalletSqlRow[]>,
      manager.query(sourceIssuesSql(true), [userId]) as Promise<SourceSqlRow[]>,
      manager.query(unrecordedTopupsSql(true), [userId]) as Promise<UnrecordedTopup[]>,
    ]);
    const walletRow = walletRows[0];
    if (!walletRow) return;
    const row = this.toRow(walletRow, this.collectIssues(sourceRows, unrecorded).length);
    if (row.status === "ok") return;
    throw new ConflictException(
      audience === "admin"
        ? `Ví của người dùng đang lệch sổ (${row.summary}). Xử lý ở mục Đối soát ví trước khi chi tiền.`
        : "Ví của bạn đang được đối soát nên tạm thời chưa dùng được. Vui lòng liên hệ hỗ trợ.",
    );
  }

  /**
   * Đưa ví về đúng số dư dựng lại từ sổ (bỏ phần tiền thêm/bớt ngoài sổ). Không áp dụng khi
   * sổ cho ra số âm: nghĩa là tiền ảo đã được tiêu, admin phải xử lý các khoản đó trước.
   */
  async restore(userId: string, reason: string, admin: User): Promise<WalletReconDetail> {
    const result = await this.dataSource.transaction(async (manager) => {
      const locked = (await manager.query(
        "SELECT `balance`, `held`, `withdrawing` FROM `wallets` WHERE `user_id` = ? FOR UPDATE",
        [userId],
      )) as Array<{ balance: string; held: string; withdrawing: string }>;
      if (!locked[0]) throw new NotFoundException("Người dùng này chưa có ví.");
      const [ledgerRow] = (await manager.query(
        `SELECT ${ledgerSumSql("balance")} AS balance, ${ledgerSumSql("held")} AS held, ${ledgerSumSql("withdrawing")} AS withdrawing ` +
          "FROM `wallet_transactions` WHERE `user_id` = ?",
        [userId],
      )) as Array<{ balance: string; held: string; withdrawing: string }>;
      const before: WalletBuckets = { balance: vnd(locked[0].balance), held: vnd(locked[0].held), withdrawing: vnd(locked[0].withdrawing) };
      const ledger: WalletBuckets = { balance: vnd(ledgerRow?.balance), held: vnd(ledgerRow?.held), withdrawing: vnd(ledgerRow?.withdrawing) };
      const diff = bucketDiffCents(before, ledger);
      if (isZero(diff)) throw new ConflictException("Ví đã khớp sổ giao dịch, không cần khôi phục.");
      if (ledger.balance < 0 || ledger.held < 0 || ledger.withdrawing < 0) {
        throw new ConflictException(
          "Sổ giao dịch cho ra số âm: phần tiền ngoài sổ đã được dùng để ủng hộ hoặc rút. " +
            "Hãy xử lý các khoản đó (hủy cam kết, từ chối yêu cầu rút) trước rồi khôi phục.",
        );
      }
      await manager.query("UPDATE `wallets` SET `balance` = ?, `held` = ?, `withdrawing` = ? WHERE `user_id` = ?", [
        ledger.balance,
        ledger.held,
        ledger.withdrawing,
        userId,
      ]);
      return { before, ledger, diff: centsToVnd(diff) };
    });
    await this.auditService.record({
      userId: admin.id,
      action: "wallet.reconcile.restore",
      entity: "wallet",
      entityId: userId,
      oldValues: { ...result.before },
      newValues: { ...result.ledger, removed: result.diff, reason },
    });
    await this.notificationsService
      .notify({
        userId,
        type: NotificationType.SYSTEM,
        title: "Số dư ví đã được điều chỉnh",
        message:
          `Quản trị viên đã đưa ví Góp Mầm của bạn về đúng sổ giao dịch (${describeDiff(this.negate(result.diff))}). ` +
          `Số dư hiện tại: ${formatVnd(result.ledger.balance)}.`,
        link: "/vi",
        relatedId: userId,
      })
      .catch(() => undefined);
    return this.detail(userId);
  }

  /**
   * Mỗi 10 phút: ví nào mới lệch (hoặc lệch khác lần báo trước) thì ghi nhật ký và báo cho
   * mọi admin. Lần báo gần nhất lưu trong audit log nên khởi động lại không báo trùng.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleScheduledCheck(): Promise<void> {
    try {
      const alerted = await this.alertNewMismatches();
      if (alerted > 0) this.logger.warn(`Wallet mismatches alerted: ${alerted}`);
    } catch (error) {
      this.logger.error(`Wallet reconciliation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async alertNewMismatches(): Promise<number> {
    const { rows } = await this.scan();
    const mismatched = rows.filter((row) => row.status === "mismatch");
    if (mismatched.length === 0) return 0;
    const admins = (await this.dataSource.manager.query(
      "SELECT `id` FROM `users` WHERE `role` = 'admin' AND `status` = 'active'",
    )) as Array<{ id: string }>;
    let alerted = 0;
    for (const row of mismatched) {
      const signature = `${toCents(row.diff.balance)}|${toCents(row.diff.held)}|${toCents(row.diff.withdrawing)}|${row.sourceIssues}`;
      const [last] = (await this.dataSource.manager.query(
        "SELECT `new_values` AS newValues FROM `audit_logs` WHERE `action` = ? AND `entity_id` = ? ORDER BY `created_at` DESC LIMIT 1",
        [MISMATCH_DETECTED_ACTION, row.userId],
      )) as Array<{ newValues: string | Record<string, unknown> | null }>;
      const previous = typeof last?.newValues === "string" ? (JSON.parse(last.newValues) as Record<string, unknown>) : last?.newValues;
      if (previous?.signature === signature) continue;
      await this.auditService.record({
        action: MISMATCH_DETECTED_ACTION,
        entity: "wallet",
        entityId: row.userId,
        newValues: { signature, diff: row.diff, ledger: row.ledger, wallet: row.wallet, sourceIssues: row.sourceIssues },
      });
      await this.notificationsService
        .notify(
          admins.map((admin) => ({
            userId: admin.id,
            type: NotificationType.SYSTEM,
            title: "Phát hiện ví lệch sổ",
            message: `Ví của ${row.name} (${row.email}) lệch sổ giao dịch: ${row.summary}. Ví đã bị tạm khóa tiêu/rút tiền.`,
            link: `${ADMIN_WALLET_PATH}&user=${row.userId}`,
            relatedId: row.userId,
          })),
        )
        .catch(() => undefined);
      alerted += 1;
    }
    return alerted;
  }

  private negate(diff: WalletBuckets): WalletBuckets {
    return { balance: -diff.balance, held: -diff.held, withdrawing: -diff.withdrawing };
  }

  private collectIssues(
    sourceRows: SourceSqlRow[],
    unrecorded: UnrecordedTopup[],
  ): IssueWithUser[] {
    const issues: IssueWithUser[] = [];
    for (const row of sourceRows) {
      const kind = classifySourceRow(row);
      if (!kind) continue;
      issues.push({ userId: row.userId, kind, message: SOURCE_ISSUE_MESSAGE[kind], txId: row.id, type: row.type, amount: vnd(row.amount), at: row.createdAt });
    }
    for (const topup of unrecorded) {
      issues.push({
        userId: topup.userId,
        kind: "topup_unrecorded",
        message: SOURCE_ISSUE_MESSAGE.topup_unrecorded,
        txId: null,
        type: null,
        amount: vnd(topup.amount),
        at: topup.createdAt,
      });
    }
    return issues;
  }

  private toRow(row: WalletSqlRow, sourceIssues: number): WalletReconRow {
    const wallet: WalletBuckets = { balance: vnd(row.balance), held: vnd(row.held), withdrawing: vnd(row.withdrawing) };
    const ledger: WalletBuckets = { balance: vnd(row.ledgerBalance), held: vnd(row.ledgerHeld), withdrawing: vnd(row.ledgerWithdrawing) };
    const diffCents = bucketDiffCents(wallet, ledger);
    const diff = centsToVnd(diffCents);
    const mismatch = !isZero(diffCents) || sourceIssues > 0;
    const parts = [
      isZero(diffCents) ? "" : describeDiff(diff),
      sourceIssues > 0 ? `${sourceIssues} giao dịch không khớp chứng từ` : "",
    ].filter(Boolean);
    return {
      userId: row.userId,
      name: row.name,
      email: row.email,
      wallet,
      ledger,
      diff,
      totalTopup: vnd(row.totalTopup),
      totalCaptured: vnd(row.totalCaptured),
      totalWithdrawn: vnd(row.totalWithdrawn),
      totalRefunded: vnd(row.totalRefunded),
      txCount: Number(row.txCount) || 0,
      lastActivityAt: row.lastActivityAt,
      sourceIssues,
      status: mismatch ? "mismatch" : "ok",
      summary: mismatch ? parts.join("; ") : null,
    };
  }
}
