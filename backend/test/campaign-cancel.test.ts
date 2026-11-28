import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { describe, it } from "node:test";

import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { RiskAlertLevel, RiskEntityType } from "../src/modules/admin/entities/risk-alert.entity";
import { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CancelCampaignDto } from "../src/modules/campaigns/dto/campaign.dto";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationsService } from "../src/modules/donations/donations.service";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { UserRole, UserStatus } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const ID = "123e4567-e89b-12d3-a456-426614174000";
const OWNER_ID = "123e4567-e89b-12d3-a456-426614174001";
const DAY = 86_400_000;
const NOW = new Date("2026-11-27T03:00:00Z");
const REASON = { reason: "Nhóm thay đổi kế hoạch, không thể triển khai" };

function makeUser(role = UserRole.USER, id = OWNER_ID) {
  return { id, name: "Chủ dự án", email: "owner@example.com", role, status: UserStatus.ACTIVE, emailVerified: true } as any;
}

type Setup = {
  status?: CampaignStatus;
  endInDays?: number;
  currentAmount?: number;
  goalAmount?: number;
  backerCount?: number;
  moneyIn?: number;
  priorCancels?: number;
  existingAlert?: any;
};

function setup(opts: Setup = {}) {
  const campaign: any = {
    id: ID,
    title: "Vườn ươm",
    ownerId: OWNER_ID,
    status: opts.status ?? CampaignStatus.ACTIVE,
    goalAmount: opts.goalAmount ?? 10_000_000,
    currentAmount: opts.currentAmount ?? 1_000_000,
    backerCount: opts.backerCount ?? 2,
    endDate: new Date(NOW.getTime() + (opts.endInDays ?? 20) * DAY),
    isFeatured: true,
  };
  const updates: Array<{ where: any; patch: any }> = [];
  const repo: any = {
    findOne: async () => campaign,
    update: async (where: any, patch: any) => {
      updates.push({ where, patch });
      return { affected: where.status === campaign.status ? 1 : 0 };
    },
    find: async () =>
      Array.from({ length: (opts.priorCancels ?? 0) + 1 }, (_, i) => ({ id: `c${i}`, title: `Dự án ${i}`, cancelReason: "lý do" })),
  };
  const donationQueries: any[] = [];
  const donationRepo: any = {
    count: async (query: any) => (donationQueries.push(query), opts.moneyIn ?? 0),
  };
  const savedAlerts: any[] = [];
  const riskAlertRepo: any = {
    findOne: async () => opts.existingAlert ?? null,
    create: (value: any) => value,
    save: async (value: any) => (savedAlerts.push(value), value),
  };
  const audit = makeAuditRecorder();
  const notifier = makeNotifierRecorder();
  const service = new CampaignsService(repo, audit.service, notifier.service, null, null, null, donationRepo, riskAlertRepo);
  return { service, campaign, updates, audit, notifier, savedAlerts, donationQueries };
}

describe("CampaignsService.cancelByOwner — chủ dự án tự hủy", () => {
  it("đang gây quỹ, chưa có tiền thật: chuyển sang cancelled, lưu lý do, bỏ nổi bật, ghi audit + báo chủ dự án", async () => {
    const { service, updates, audit, notifier, donationQueries } = setup();
    const saved = await service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW);
    equal(saved.status, CampaignStatus.CANCELLED);
    equal(saved.cancelReason, REASON.reason);
    equal(updates[0].where.status, CampaignStatus.ACTIVE);
    equal(updates[0].patch.isFeatured, false);
    equal(updates[0].patch.cancelledAt.getTime(), NOW.getTime());
    equal(updates[0].patch.cancelledFrom, CampaignStatus.ACTIVE);
    // Chỉ chặn khi có khoản đã thu / đang chờ trả — cam kết `pledged` vẫn được hủy.
    deepEqual(donationQueries[0].where.status.value, [DonationStatus.COMPLETED, DonationStatus.AWAITING_PAYMENT, DonationStatus.CHARGE_FAILED]);
    const entry = audit.entries.at(-1);
    equal(entry?.action, "campaign.cancel");
    equal(entry?.newValues?.reason, REASON.reason);
    equal(entry?.newValues?.backers, 2);
    ok(notifier.notified.some((n: any) => n.userId === OWNER_ID && /hủy/.test(n.title)));
  });

  it("chờ duyệt / đã duyệt cũng tự hủy được", async () => {
    for (const status of [CampaignStatus.PENDING, CampaignStatus.APPROVED]) {
      const { service } = setup({ status });
      equal((await service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW)).status, CampaignStatus.CANCELLED);
    }
  });

  it("chỉ chủ dự án — admin và người khác bị chặn (403)", async () => {
    const { service } = setup();
    await rejects(service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(UserRole.ADMIN, "admin-id"), NOW), (e: any) => e.status === 403);
    await rejects(service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(UserRole.USER, "other"), NOW), (e: any) => e.status === 403);
  });

  it("bị admin tạm dừng, đã kết thúc hoặc là bản nháp thì không tự hủy được (409)", async () => {
    for (const status of [CampaignStatus.PAUSED, CampaignStatus.SUCCESS, CampaignStatus.FAILED, CampaignStatus.ENDED, CampaignStatus.CANCELLED, CampaignStatus.DRAFT]) {
      const { service, updates } = setup({ status });
      await rejects(service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW), (e: any) => e.status === 409);
      equal(updates.length, 0);
    }
  });

  it("đã có khoản thanh toán thật / đang chờ thanh toán → phải nhờ admin (409)", async () => {
    const { service, updates } = setup({ moneyIn: 1 });
    await rejects(service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW), (e: any) => e.status === 409 && /quản trị viên/.test(e.message));
    equal(updates.length, 0);
  });

  it("phút chót: còn ≤ 3 ngày và đạt ≥ 80% mục tiêu → chặn; còn xa hạn hoặc tiến độ thấp → cho hủy", async () => {
    const late = setup({ endInDays: 2, currentAmount: 8_500_000 });
    await rejects(late.service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW), (e: any) => e.status === 409 && /phút chót/.test(e.message));
    equal((await setup({ endInDays: 2, currentAmount: 3_000_000 }).service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW)).status, CampaignStatus.CANCELLED);
    equal((await setup({ endInDays: 10, currentAmount: 9_000_000 }).service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW)).status, CampaignStatus.CANCELLED);
  });

  it("hai yêu cầu đồng thời: lần thứ hai thấy trạng thái đã đổi → 409", async () => {
    const { service, campaign } = setup();
    const first = service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW);
    await first;
    campaign.status = CampaignStatus.ACTIVE; // bản đọc cũ
    const repoUpdate = (service as any).campaignRepo.update;
    (service as any).campaignRepo.update = async (where: any, patch: any) => ({ ...(await repoUpdate(where, patch)), affected: 0 });
    await rejects(service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW), (e: any) => e.status === 409);
  });

  it("tự hủy lần đầu: không cảnh báo; từ lần thứ 2 trong 180 ngày: cảnh báo MEDIUM, lần 3+: HIGH (cảnh báo cấp người dùng)", async () => {
    const first = setup({ priorCancels: 0 });
    await first.service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW);
    equal(first.savedAlerts.length, 0);

    const second = setup({ priorCancels: 1 });
    await second.service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW);
    equal(second.savedAlerts.length, 1);
    equal(second.savedAlerts[0].entityType, RiskEntityType.USER);
    equal(second.savedAlerts[0].entityId, OWNER_ID);
    equal(second.savedAlerts[0].level, RiskAlertLevel.MEDIUM);

    const existingAlert = { id: "a1", level: RiskAlertLevel.MEDIUM };
    const third = setup({ priorCancels: 2, existingAlert });
    await third.service.cancelByOwner(ID, REASON as CancelCampaignDto, makeUser(), NOW);
    equal(third.savedAlerts[0], existingAlert);
    equal(existingAlert.level, RiskAlertLevel.HIGH);
  });
});

describe("CampaignsService.findVisible — chiến dịch đã hủy", () => {
  function visible(cancelledFrom: string) {
    const { service, campaign } = setup();
    Object.assign(campaign, { status: CampaignStatus.CANCELLED, cancelledFrom });
    return service;
  }

  it("hủy khi đang gây quỹ: vẫn xem công khai (kèm lý do)", async () => {
    equal((await visible(CampaignStatus.ACTIVE).findVisible(ID, null)).status, CampaignStatus.CANCELLED);
  });

  it("hủy khi chờ duyệt/đã duyệt: người lạ nhận 404, chủ dự án và admin vẫn xem", async () => {
    for (const from of [CampaignStatus.PENDING, CampaignStatus.APPROVED]) {
      const service = visible(from);
      await rejects(service.findVisible(ID, null), (e: any) => e.status === 404);
      await rejects(service.findVisible(ID, { id: "stranger", role: UserRole.USER } as any), (e: any) => e.status === 404);
      equal((await service.findVisible(ID, { id: OWNER_ID, role: UserRole.USER } as any)).status, CampaignStatus.CANCELLED);
      equal((await service.findVisible(ID, { id: "admin", role: UserRole.ADMIN } as any)).status, CampaignStatus.CANCELLED);
    }
  });
});

describe("CancelCampaignDto", () => {
  it("lý do bắt buộc 10–500 ký tự (cắt khoảng trắng)", async () => {
    const errors = async (reason: unknown) => (await validate(plainToInstance(CancelCampaignDto, { reason }))).length;
    ok((await errors(undefined)) > 0);
    ok((await errors("   ngắn   ")) > 0);
    ok((await errors("x".repeat(501))) > 0);
    equal(await errors("  Nhóm thay đổi kế hoạch  "), 0);
  });
});

describe("DonationsService.releasePledge — lời nhắn khi chủ dự án hủy", () => {
  function service() {
    const notifier = makeNotifierRecorder();
    const svc = new DonationsService({} as any, {} as any, {} as any, {} as any, makeAuditRecorder().service, notifier.service);
    (svc as any).uncountPledge = async () => true;
    return { svc, notifier };
  }
  const pledge = { id: "d1", userId: "u1", campaignId: ID, amount: 200000 } as any;

  it("dự án bị hủy: nói rõ đã hủy kèm lý do, không bị trừ tiền", async () => {
    const { svc, notifier } = service();
    await svc.releasePledge(pledge, "Vườn ươm", "Nhóm thay đổi kế hoạch");
    const sent: any = notifier.notified.at(-1);
    equal(sent.title, "Dự án bạn ủng hộ đã bị hủy");
    ok(sent.message.includes("Nhóm thay đổi kế hoạch"));
    ok(sent.message.includes("Không có khoản tiền nào bị trừ"));
  });

  it("không đạt mục tiêu: giữ lời nhắn cũ", async () => {
    const { svc, notifier } = service();
    await svc.releasePledge(pledge, "Vườn ươm");
    equal((notifier.notified.at(-1) as any).title, "Bạn không bị trừ tiền");
  });
});
