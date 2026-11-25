import { equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ConflictException } from "@nestjs/common";

import { DemoWalletGateway } from "../src/integrations/payment/payment.gateway";
import type { CardPledgeGateway, CardSetupResult, ChargeResult } from "../src/integrations/payment/stripe";
import { CampaignStatus, type Campaign } from "../src/modules/campaigns/entities/campaign.entity";
import { CHARGE_RETRY_DAYS, DonationsService } from "../src/modules/donations/donations.service";
import { Donation, DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { AUTO_REFUND_REASON, PledgeSettlementService } from "../src/modules/donations/pledge-settlement.service";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const DONOR_ID = "11111111-1111-4111-8111-111111111111";
const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const TIER_ID = "44444444-4444-4444-8444-444444444444";
const DAY = 86_400_000;

const donor = { id: DONOR_ID, role: UserRole.USER, status: UserStatus.ACTIVE } as User;

type Row = Donation & { campaign?: Campaign };

/**
 * Bảng `donations` + `campaigns` giả: update có điều kiện như MySQL, ghi lại các lệnh
 * trừ số liệu chiến dịch (`GREATEST(current_amount - …)`) và trả suất quà.
 */
function makeWorld(opts: { campaign?: Partial<Campaign>; donations?: Array<Partial<Donation>> } = {}) {
  const campaign = {
    id: CAMPAIGN_ID,
    title: "Vườn rau trường học",
    ownerId: "owner",
    status: CampaignStatus.ACTIVE,
    goalAmount: 1_000_000,
    currentAmount: 1_200_000,
    backerCount: 3,
    endDate: new Date(Date.now() + 10 * DAY),
    ...opts.campaign,
  } as Campaign;
  const rows: Row[] = (opts.donations ?? []).map((d, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i}`,
    userId: DONOR_ID,
    campaignId: CAMPAIGN_ID,
    amount: 300_000,
    currency: "VND",
    status: DonationStatus.PLEDGED,
    paymentMethod: "wallet",
    chargeAttempts: 0,
    createdAt: new Date(),
    ...d,
  }) as Row);
  const uncounted: Array<{ campaignId: string; amount: number }> = [];
  const rewardReleases: string[] = [];
  const increments: string[] = [];
  const refundRequests: Array<Record<string, unknown>> = [];

  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => {
      const actual = (row as unknown as Record<string, unknown>)[k];
      // `IsNull()` của TypeORM trong update có điều kiện.
      if (v && typeof v === "object" && (v as { type?: string }).type === "isNull") return actual == null;
      return actual === v;
    });
  const update = async (a: unknown, b: unknown, c?: unknown) => {
    const [where, patch] = (c === undefined ? [a, b] : [b, c]) as [Record<string, unknown>, Partial<Row>];
    const row = rows.find((r) => matches(r, where));
    if (!row) return { affected: 0 };
    Object.assign(row, patch);
    return { affected: 1 };
  };
  const queryBuilder = () => {
    let entity: unknown;
    let params: Record<string, unknown> = {};
    const chain = {
      update: (e: unknown) => ((entity = e), chain),
      set: () => chain,
      where: (_sql: string, p: Record<string, unknown>) => ((params = { ...params, ...p }), chain),
      andWhere: () => chain,
      setParameter: (k: string, v: unknown) => ((params[k] = v), chain),
      execute: async () => {
        const name = (entity as { name?: string })?.name;
        if (name === "Campaign") uncounted.push({ campaignId: String(params.id), amount: Number(params.amount) });
        if (name === "RewardTier") rewardReleases.push(String(params.id));
        return { affected: 1 };
      },
    };
    return chain;
  };
  const manager = {
    update,
    findOne: async (_e: unknown, { where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null,
    increment: async (_e: unknown, _w: unknown, column: string) => {
      increments.push(column);
    },
    createQueryBuilder: queryBuilder,
  };
  const donationRepo = {
    findOne: async ({ where }: { where: Record<string, unknown> }) => {
      const row = rows.find((r) => matches(r, where));
      return row ? { ...row } : null;
    },
    update: (where: Record<string, unknown>, patch: Partial<Row>) => update(where, patch),
    // Bộ lọc của job tất toán: trạng thái + (tuỳ chọn) trạng thái chiến dịch.
    // Hiểu thêm các toán tử TypeORM job dùng cho cam kết chờ thanh toán (LessThan/Between/IsNull).
    find: async ({ where }: { where: { status: DonationStatus } & Record<string, unknown> }) =>
      rows
        .filter((r) => r.status === where.status)
        .filter((r) =>
          Object.entries(where).every(([key, op]) => {
            if (key === "status" || key === "campaign" || !op || typeof op !== "object" || !("type" in op)) return true;
            const { type, value } = op as { type: string; value: unknown };
            const actual = (r as unknown as Record<string, unknown>)[key] as Date | null | undefined;
            if (type === "isNull") return actual == null;
            if (actual == null) return false;
            if (type === "lessThan") return actual.getTime() < (value as Date).getTime();
            if (type === "between") {
              const [from, to] = value as [Date, Date];
              return actual.getTime() >= from.getTime() && actual.getTime() <= to.getTime();
            }
            return true;
          }),
        )
        .map((r) => ({ ...r, campaign })),
    createQueryBuilder: () => {
      const chain = {
        innerJoinAndSelect: () => chain,
        leftJoin: () => chain,
        where: () => chain,
        andWhere: () => chain,
        orderBy: () => chain,
        take: () => chain,
        getMany: async () =>
          [CampaignStatus.FAILED, CampaignStatus.CANCELLED].includes(campaign.status)
            ? rows
                .filter((r) => r.status === DonationStatus.COMPLETED && !refundRequests.some((q) => q.donationId === r.id))
                .map((r) => ({ ...r, campaign }))
            : [],
      };
      return chain;
    },
  };
  const campaignRepo = { findOne: async () => ({ ...campaign }) };
  const refundRepo = {
    create: (v: Record<string, unknown>) => v,
    save: async (v: Record<string, unknown>) => {
      const saved = { id: `rr-${refundRequests.length}`, ...v };
      refundRequests.push(saved);
      return saved;
    },
  };
  const dataSource = {
    transaction: async (fn: (m: typeof manager) => unknown) => fn(manager),
    getRepository: () => ({ findOne: async () => null }),
  };
  return { campaign, rows, uncounted, rewardReleases, increments, refundRequests, donationRepo, campaignRepo, refundRepo, dataSource };
}

/** Cổng thẻ giả: điều khiển kết quả trừ tiền và phiên lưu thẻ. */
function makeCardGateway(overrides: Partial<CardPledgeGateway> = {}) {
  const charges: Array<{ idempotencyKey: string; paymentMethodId: string }> = [];
  let chargeResult: ChargeResult = { success: true, transactionId: "pi_ok" };
  let setupResult: CardSetupResult = { status: "open", donationId: null };
  const gateway: CardPledgeGateway = {
    testMode: true,
    createSetupCheckout: async () => ({ sessionId: "cs_new", url: "https://checkout.stripe.test/cs_new" }),
    getSetupResult: async () => setupResult,
    chargeSaved: async (p) => {
      charges.push({ idempotencyKey: p.idempotencyKey, paymentMethodId: p.paymentMethodId });
      return chargeResult;
    },
    refund: async () => ({ success: true, refundId: "re_1" }),
    parseWebhook: () => {
      throw new Error("bad signature");
    },
    ...overrides,
  };
  return {
    gateway,
    charges,
    setCharge: (r: ChargeResult) => (chargeResult = r),
    setSetup: (r: CardSetupResult) => (setupResult = r),
  };
}

function makeService(world: ReturnType<typeof makeWorld>, card: CardPledgeGateway | null = null) {
  const audit = makeAuditRecorder();
  const notifier = makeNotifierRecorder();
  const service = new DonationsService(
    world.donationRepo as never,
    world.campaignRepo as never,
    world.dataSource as never,
    new DemoWalletGateway("secret"),
    audit.service,
    notifier.service,
    null,
    card,
  );
  return { service, audit, notifier };
}

describe("Gây quỹ tất cả hoặc không — cam kết", () => {
  describe("ghi nhận cam kết", () => {
    it("ví demo xác nhận → `pledged`, cộng tiến độ, chưa có mã trừ tiền", async () => {
      const world = makeWorld({ donations: [{ status: DonationStatus.PENDING, transactionId: "DEMO-1" }] });
      const { service, notifier } = makeService(world);
      const result = await service.confirmDemoPayment(world.rows[0].id, "completed", donor);
      equal(result.status, DonationStatus.PLEDGED);
      ok(world.rows[0].pledgedAt);
      equal(world.rows[0].completedAt, undefined);
      equal(world.increments.join(","), "currentAmount,backerCount");
      ok(notifier.notified[0].message.includes("CHƯA phải trả tiền"));
    });

    it("chiến dịch đã chốt trong lúc lưu thẻ → không nhận cam kết muộn", async () => {
      const world = makeWorld({
        campaign: { status: CampaignStatus.FAILED, endDate: new Date(Date.now() - DAY) },
        donations: [{ status: DonationStatus.PENDING }],
      });
      const { service, audit } = makeService(world);
      const result = await service.confirmDemoPayment(world.rows[0].id, "completed", donor);
      equal(result.status, DonationStatus.FAILED);
      equal(world.increments.length, 0);
      equal(audit.entries.at(-1)?.action, "donation.pledge.rejected");
    });

    it("Stripe: phiên lưu thẻ hoàn tất → cam kết kèm mã khách hàng/thẻ (không trừ tiền)", async () => {
      const world = makeWorld({ donations: [{ status: DonationStatus.PENDING, paymentMethod: "stripe", setupSessionRef: "cs_1" }] });
      const card = makeCardGateway();
      card.setSetup({ status: "saved", donationId: world.rows[0].id, customerId: "cus_1", paymentMethodId: "pm_1" });
      const { service } = makeService(world, card.gateway);
      const { donation, applied } = await service.syncStripeDonation(world.rows[0].id, donor);
      ok(applied);
      equal(donation.status, DonationStatus.PLEDGED);
      equal(world.rows[0].paymentMethodRef, "pm_1");
      equal(card.charges.length, 0);
    });

    it("Stripe: webhook sai chữ ký bị từ chối và ghi audit", async () => {
      const world = makeWorld();
      const { service, audit } = makeService(world, makeCardGateway().gateway);
      await rejects(service.handleStripeWebhook(Buffer.from("{}"), "t=1,v1=bad"), (e: { status?: number }) => e.status === 401);
      equal(audit.entries.at(-1)?.action, "donation.stripe.rejected");
    });
  });

  describe("rút cam kết", () => {
    it("trước hạn: hủy, trừ khỏi tiến độ, trả suất quà", async () => {
      const world = makeWorld({ donations: [{ rewardTierId: TIER_ID }] });
      const { service, audit } = makeService(world);
      const result = await service.cancel(world.rows[0].id, donor);
      equal(result.status, DonationStatus.CANCELLED);
      equal(world.uncounted[0]?.amount, 300_000);
      equal(world.rewardReleases[0], TIER_ID);
      equal(audit.entries.at(-1)?.action, "donation.pledge.cancel");
    });

    it("sau hạn chiến dịch: không rút được", async () => {
      const world = makeWorld({ campaign: { status: CampaignStatus.SUCCESS, endDate: new Date(Date.now() - DAY) }, donations: [{}] });
      await rejects(makeService(world).service.cancel(world.rows[0].id, donor), ConflictException);
      equal(world.rows[0].status, DonationStatus.PLEDGED);
    });
  });

  describe("trừ tiền khi đạt mục tiêu", () => {
    it("ví demo: `pledged` → `completed`, không cộng tiến độ lần nữa", async () => {
      const world = makeWorld({ campaign: { status: CampaignStatus.SUCCESS }, donations: [{}] });
      const { service, notifier } = makeService(world);
      const result = await service.chargePledge(world.rows[0].id);
      equal(result.status, DonationStatus.COMPLETED);
      ok(world.rows[0].transactionId?.startsWith("DEMO-"));
      equal(world.increments.length, 0);
      equal(notifier.notified[0].title, "Đã trừ tiền khoản ủng hộ");
    });

    it("Stripe từ chối thẻ → `charge_failed`, báo hạn đổi thẻ; đổi thẻ mới thì trừ lại ngay", async () => {
      const world = makeWorld({
        campaign: { status: CampaignStatus.SUCCESS },
        donations: [{ paymentMethod: "stripe", paymentCustomerRef: "cus_1", paymentMethodRef: "pm_old", setupSessionRef: "cs_1" }],
      });
      const card = makeCardGateway();
      card.setCharge({ success: false, error: "card_declined" });
      const { service, notifier } = makeService(world, card.gateway);

      const failed = await service.chargePledge(world.rows[0].id);
      equal(failed.status, DonationStatus.CHARGE_FAILED);
      equal(world.rows[0].lastChargeError, "card_declined");
      ok(world.rows[0].chargeFailedAt);
      equal(card.charges[0].idempotencyKey, `pledge-charge-${world.rows[0].id}-1`);
      ok(notifier.notified[0].message.includes("cập nhật thẻ"));

      // Phiên cũ (thẻ đã thử) không kích hoạt trừ lại.
      card.setSetup({ status: "saved", donationId: world.rows[0].id, customerId: "cus_1", paymentMethodId: "pm_old" });
      equal((await service.syncStripeDonation(world.rows[0].id, donor)).applied, false);
      equal(card.charges.length, 1);

      card.setSetup({ status: "saved", donationId: world.rows[0].id, customerId: "cus_1", paymentMethodId: "pm_new" });
      card.setCharge({ success: true, transactionId: "pi_2" });
      const { donation, applied } = await service.syncStripeDonation(world.rows[0].id, donor);
      ok(applied);
      equal(donation.status, DonationStatus.COMPLETED);
      equal(world.rows[0].transactionId, "pi_2");
      equal(card.charges[1].paymentMethodId, "pm_new");
      equal(card.charges[1].idempotencyKey, `pledge-charge-${world.rows[0].id}-2`);
    });

    it("thử trừ lại chỉ trong hạn đổi thẻ", async () => {
      const world = makeWorld({
        campaign: { status: CampaignStatus.SUCCESS },
        donations: [{ status: DonationStatus.CHARGE_FAILED, chargeFailedAt: new Date(Date.now() - (CHARGE_RETRY_DAYS + 1) * DAY) }],
      });
      await rejects(makeService(world).service.retryCharge(world.rows[0].id, donor), ConflictException);
    });
  });

  describe("PledgeSettlementService", () => {
    let world: ReturnType<typeof makeWorld>;
    const settlement = (w: ReturnType<typeof makeWorld>, card: CardPledgeGateway | null = null) => {
      const { service, notifier } = makeService(w, card);
      const audit = makeAuditRecorder();
      return {
        job: new PledgeSettlementService(w.donationRepo as never, w.refundRepo as never, service, audit.service, notifier.service),
        notifier,
        audit,
      };
    };

    beforeEach(() => {
      world = makeWorld();
    });

    it("trả sau (SePay): đạt mục tiêu → yêu cầu thanh toán, không tự trừ", async () => {
      world = makeWorld({ campaign: { status: CampaignStatus.SUCCESS }, donations: [{ paymentMethod: "sepay" }] });
      const { job, notifier } = settlement(world);
      const result = await job.settle();
      equal(result.paymentRequested, 1);
      equal(result.charged, 0);
      equal(world.rows[0].status, DonationStatus.AWAITING_PAYMENT);
      ok(world.rows[0].paymentRequestedAt);
      ok(notifier.notified.some((n) => n.link?.includes(`donation=${world.rows[0].id}`)));
      // Vẫn tính vào tiến độ trong lúc chờ trả.
      equal(world.uncounted.length, 0);
    });

    it("trả sau (SePay): chiến dịch không đạt → giải phóng, không phát sinh thanh toán", async () => {
      world = makeWorld({ campaign: { status: CampaignStatus.FAILED }, donations: [{ paymentMethod: "sepay" }] });
      const result = await settlement(world).job.settle();
      equal(result.released, 1);
      equal(world.rows[0].status, DonationStatus.RELEASED);
    });

    it("trả sau (SePay): quá 7 ngày chưa trả → hủy, bỏ khỏi tiến độ; còn 2 ngày → nhắc một lần", async () => {
      const now = new Date();
      world = makeWorld({
        campaign: { status: CampaignStatus.SUCCESS },
        donations: [
          { paymentMethod: "sepay", status: DonationStatus.AWAITING_PAYMENT, paymentRequestedAt: new Date(now.getTime() - 8 * DAY) },
          { paymentMethod: "sepay", status: DonationStatus.AWAITING_PAYMENT, paymentRequestedAt: new Date(now.getTime() - 6 * DAY) },
          { paymentMethod: "sepay", status: DonationStatus.AWAITING_PAYMENT, paymentRequestedAt: new Date(now.getTime() - 1 * DAY) },
        ],
      });
      const first = await settlement(world).job.settle(now);
      equal(first.paymentExpired, 1);
      equal(first.paymentReminded, 1);
      equal(world.rows[0].status, DonationStatus.EXPIRED);
      equal(world.uncounted.length, 1);
      equal(world.rows[1].status, DonationStatus.AWAITING_PAYMENT);
      ok(world.rows[1].paymentRemindedAt);
      equal(world.rows[2].paymentRemindedAt, undefined);
      const second = await settlement(world).job.settle(now);
      equal(second.paymentReminded, 0);
    });

    it("trả sau: thanh toán thử (chưa cấu hình SePay) hoàn tất cam kết mà không cộng tiến độ lần nữa", async () => {
      world = makeWorld({
        campaign: { status: CampaignStatus.SUCCESS },
        donations: [{ paymentMethod: "sepay", status: DonationStatus.AWAITING_PAYMENT, paymentRequestedAt: new Date(), transferCode: "GMTEST2345" }],
      });
      const { service } = makeService(world);
      const paid = await service.confirmDemoPayment(world.rows[0].id, "completed", donor);
      equal(paid.status, DonationStatus.COMPLETED);
      equal(world.increments.length, 0);
    });

    it("trả sau: không rút được cam kết sau khi dự án thành công", async () => {
      world = makeWorld({
        campaign: { status: CampaignStatus.SUCCESS },
        donations: [{ paymentMethod: "sepay", status: DonationStatus.AWAITING_PAYMENT, paymentRequestedAt: new Date() }],
      });
      await rejects(makeService(world).service.cancel(world.rows[0].id, donor), (err: { status?: number }) => err.status === 409);
    });

    it("chiến dịch đạt mục tiêu → trừ tiền mọi cam kết", async () => {
      world = makeWorld({ campaign: { status: CampaignStatus.SUCCESS }, donations: [{}, {}] });
      const result = await settlement(world).job.settle();
      equal(result.charged, 2);
      ok(world.rows.every((r) => r.status === DonationStatus.COMPLETED));
    });

    it("chiến dịch không đạt → giải phóng cam kết, không trừ đồng nào", async () => {
      world = makeWorld({ campaign: { status: CampaignStatus.FAILED, currentAmount: 300_000 }, donations: [{}] });
      const card = makeCardGateway();
      const { job, notifier } = settlement(world, card.gateway);
      const result = await job.settle();
      equal(result.released, 1);
      equal(world.rows[0].status, DonationStatus.RELEASED);
      equal(card.charges.length, 0);
      equal(world.uncounted[0]?.amount, 300_000);
      ok(notifier.notified.some((n) => n.title === "Bạn không bị trừ tiền"));
    });

    it("`ended` xét theo tiến độ: chưa đủ mục tiêu thì giải phóng", async () => {
      world = makeWorld({ campaign: { status: CampaignStatus.ENDED, currentAmount: 500_000, goalAmount: 1_000_000 }, donations: [{}] });
      equal((await settlement(world).job.settle()).released, 1);
    });

    it("chiến dịch còn chạy → không đụng tới cam kết", async () => {
      world = makeWorld({ donations: [{}] });
      const result = await settlement(world).job.settle();
      equal(result.charged + result.released, 0);
      equal(world.rows[0].status, DonationStatus.PLEDGED);
    });

    it("trừ tiền thất bại quá hạn đổi thẻ → hủy cam kết, trừ khỏi tiến độ", async () => {
      world = makeWorld({
        campaign: { status: CampaignStatus.SUCCESS },
        donations: [{ status: DonationStatus.CHARGE_FAILED, chargeFailedAt: new Date(Date.now() - (CHARGE_RETRY_DAYS + 1) * DAY) }],
      });
      const result = await settlement(world).job.settle();
      equal(result.expiredFailures, 1);
      equal(world.rows[0].status, DonationStatus.FAILED);
      equal(world.uncounted.length, 1);
    });

    it("khoản SePay đã thu của chiến dịch thất bại → tự tạo yêu cầu hoàn một lần, nhắc bổ sung tài khoản", async () => {
      world = makeWorld({
        campaign: { status: CampaignStatus.FAILED },
        donations: [{ status: DonationStatus.COMPLETED, paymentMethod: "sepay" }],
      });
      const { job, notifier } = settlement(world);
      equal((await job.settle()).refundRequests, 1);
      equal(world.refundRequests[0].reason, AUTO_REFUND_REASON);
      equal(world.refundRequests[0].bankAccountNumber, null);
      ok(notifier.notified.some((n) => n.title === "Bổ sung tài khoản để nhận hoàn tiền"));
      equal((await job.settle()).refundRequests, 0, "không tạo trùng");
    });
  });
});
