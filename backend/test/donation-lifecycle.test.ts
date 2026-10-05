import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ConflictException, NotFoundException } from "@nestjs/common";

import { DemoWalletGateway, signWebhookPayload } from "../src/integrations/payment/payment.gateway";
import {
  DEFAULT_PENDING_TTL_MINUTES,
  DonationExpiryService,
  pendingTtlMinutes,
} from "../src/modules/donations/donation-expiry.service";
import { DonationsService } from "../src/modules/donations/donations.service";
import { Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const SECRET = "lifecycle-secret";
const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const DONATION_ID = "22222222-2222-4222-8222-222222222222";
const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";

function user(id = OWNER_ID): User {
  return { id, role: UserRole.USER, status: UserStatus.ACTIVE } as User;
}

type Row = Pick<Donation, "id" | "userId" | "campaignId" | "amount" | "status" | "transactionId" | "createdAt"> & {
  completedAt?: Date;
  rewardTierId?: string | null;
};

/**
 * Một bảng `donations` giả có update có điều kiện như MySQL: chỉ ghi khi mọi
 * điều kiện khớp, trả `affected`. Dùng chung cho repository và transaction.
 */
function makeStore(initial: Partial<Row> = {}) {
  const row: Row = {
    id: DONATION_ID,
    userId: OWNER_ID,
    campaignId: CAMPAIGN_ID,
    amount: 500_000,
    status: DonationStatus.PENDING,
    transactionId: "DEMO-1",
    createdAt: new Date(),
    ...initial,
  };
  const increments: Array<{ column: string; value: number }> = [];
  const matches = (where: Partial<Row>) =>
    Object.entries(where).every(([key, value]) => row[key as keyof Row] === value);
  const update = async (_entityOrWhere: unknown, whereOrPatch: unknown, maybePatch?: unknown) => {
    // repo.update(where, patch) | manager.update(Entity, where, patch)
    const [where, patch] = maybePatch === undefined ? [_entityOrWhere, whereOrPatch] : [whereOrPatch, maybePatch];
    if (!matches(where as Partial<Row>)) return { affected: 0 };
    Object.assign(row, patch);
    return { affected: 1 };
  };
  const manager = {
    update,
    findOne: async () => ({ ...row }),
    increment: async (_entity: unknown, _where: unknown, column: string, value: number) => {
      increments.push({ column, value: Number(value) });
    },
  };
  const donationRepo = {
    findOne: async ({ where }: { where: { id: string } }) => (where.id === row.id ? { ...row } : null),
    update: (where: Partial<Row>, patch: Partial<Row>) => update(where, patch),
    find: async () => (row.status === DonationStatus.PENDING ? [{ ...row }] : []),
  };
  const campaignRepo = { findOne: async () => ({ id: CAMPAIGN_ID, title: "C", ownerId: "owner" }) };
  const dataSource = { transaction: async (fn: (m: typeof manager) => unknown) => fn(manager), getRepository: () => ({}) };
  return { row, increments, donationRepo, campaignRepo, dataSource };
}

function makeService(store: ReturnType<typeof makeStore>, audit: ReturnType<typeof makeAuditRecorder>) {
  return new DonationsService(
    store.donationRepo as never,
    store.campaignRepo as never,
    store.dataSource as never,
    new DemoWalletGateway(SECRET),
    audit.service,
    makeNotifierRecorder().service,
  );
}

function signed(status: "completed" | "failed" | "cancelled" | "expired") {
  const dto = { donationId: DONATION_ID, status, timestamp: Date.now() };
  return { dto, signature: signWebhookPayload(SECRET, dto) };
}

describe("Vòng đời giao dịch: hủy / hết hạn", () => {
  let audit: ReturnType<typeof makeAuditRecorder>;

  beforeEach(() => {
    audit = makeAuditRecorder();
  });

  describe("cancel", () => {
    it("người ủng hộ hủy đơn đang chờ, ghi audit", async () => {
      const store = makeStore();
      const result = await makeService(store, audit).cancel(DONATION_ID, user());
      equal(result.status, DonationStatus.CANCELLED);
      equal(store.row.status, DonationStatus.CANCELLED);
      equal(audit.entries.at(-1)?.action, "donation.cancel");
    });

    it("hủy lại đơn đã hủy là idempotent", async () => {
      const store = makeStore({ status: DonationStatus.CANCELLED });
      const result = await makeService(store, audit).cancel(DONATION_ID, user());
      equal(result.status, DonationStatus.CANCELLED);
      equal(audit.entries.length, 0);
    });

    it("không hủy được đơn đã thành công hoặc của người khác", async () => {
      const done = makeStore({ status: DonationStatus.COMPLETED });
      await rejects(makeService(done, audit).cancel(DONATION_ID, user()), ConflictException);
      equal(done.row.status, DonationStatus.COMPLETED);

      const pending = makeStore();
      await rejects(
        makeService(pending, audit).cancel(DONATION_ID, user("99999999-9999-4999-8999-999999999999")),
        NotFoundException,
      );
    });
  });

  describe("ví demo", () => {
    it("không cho thanh toán đơn đã hết hạn hoặc đã hủy", async () => {
      for (const status of [DonationStatus.EXPIRED, DonationStatus.CANCELLED]) {
        const store = makeStore({ status });
        await rejects(makeService(store, audit).confirmDemoPayment(DONATION_ID, "completed", user()), ConflictException);
        equal(store.row.status, status);
        deepEqual(store.increments, []);
      }
    });
  });

  describe("webhook", () => {
    it("cổng báo hủy/hết hạn chuyển đơn pending sang trạng thái tương ứng, không cộng tiền", async () => {
      for (const [status, expected] of [
        ["cancelled", DonationStatus.CANCELLED],
        ["expired", DonationStatus.EXPIRED],
      ] as const) {
        const store = makeStore();
        const { dto, signature } = signed(status);
        const result = await makeService(store, audit).handleWebhook(dto, signature);
        equal(result.status, expected);
        deepEqual(store.increments, []);
      }
    });

    it("thanh toán thành công đến muộn vẫn được ghi nhận và đánh dấu để admin xem xét", async () => {
      const store = makeStore({ status: DonationStatus.EXPIRED });
      const { dto, signature } = signed("completed");
      const result = await makeService(store, audit).handleWebhook(dto, signature);
      equal(result.status, DonationStatus.COMPLETED);
      deepEqual(store.increments.map((i) => i.column), ["currentAmount", "backerCount"]);
      const entry = audit.entries.at(-1);
      equal(entry?.action, "donation.payment.completed");
      equal(entry?.oldValues?.status, DonationStatus.EXPIRED);
      equal(entry?.newValues?.lateCompletion, true);
    });

    it("báo thất bại cho đơn đã hết hạn thì bỏ qua (idempotent)", async () => {
      const store = makeStore({ status: DonationStatus.EXPIRED });
      const { dto, signature } = signed("failed");
      const result = await makeService(store, audit).handleWebhook(dto, signature);
      equal(result.status, DonationStatus.EXPIRED);
      equal(audit.entries.length, 0);
    });

    it("không hủy ngược một đơn đã thành công", async () => {
      const store = makeStore({ status: DonationStatus.COMPLETED });
      const { dto, signature } = signed("cancelled");
      const result = await makeService(store, audit).handleWebhook(dto, signature);
      equal(result.status, DonationStatus.COMPLETED);
      equal(store.row.status, DonationStatus.COMPLETED);
    });
  });

  describe("DonationExpiryService", () => {
    it("chuyển đơn pending quá hạn sang expired và ghi audit", async () => {
      const store = makeStore({ createdAt: new Date(Date.now() - 2 * 3_600_000) });
      const expired = await new DonationExpiryService(store.donationRepo as never, audit.service).expirePendingDonations();
      equal(expired, 1);
      equal(store.row.status, DonationStatus.EXPIRED);
      equal(audit.entries.at(-1)?.action, "donation.expire");
    });

    it("không đè lên kết quả thanh toán vừa về cùng lúc", async () => {
      const store = makeStore();
      // Mô phỏng: lúc job đọc vẫn pending, nhưng trước khi ghi thì webhook đã chốt.
      const repo = {
        ...store.donationRepo,
        find: async () => [{ ...store.row }],
        update: async (where: Partial<Row>, patch: Partial<Row>) => {
          store.row.status = DonationStatus.COMPLETED;
          return store.donationRepo.update(where, patch);
        },
      };
      const expired = await new DonationExpiryService(repo as never, audit.service).expirePendingDonations();
      equal(expired, 0);
      equal(store.row.status, DonationStatus.COMPLETED);
      equal(audit.entries.length, 0);
    });

    it("đọc TTL từ cấu hình, sai thì dùng mặc định", () => {
      equal(pendingTtlMinutes("45"), 45);
      equal(pendingTtlMinutes("0"), DEFAULT_PENDING_TTL_MINUTES);
      equal(pendingTtlMinutes("abc"), DEFAULT_PENDING_TTL_MINUTES);
      equal(pendingTtlMinutes(undefined), DEFAULT_PENDING_TTL_MINUTES);
      ok(DEFAULT_PENDING_TTL_MINUTES > 0);
    });
  });
});
