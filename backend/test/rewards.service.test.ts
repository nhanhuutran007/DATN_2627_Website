import { equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { DemoWalletGateway } from "../src/integrations/payment/payment.gateway";
import type { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationsService } from "../src/modules/donations/donations.service";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { RewardTier } from "../src/modules/rewards/entities/reward-tier.entity";
import { MAX_TIERS_PER_CAMPAIGN, RewardsService, toTierView } from "../src/modules/rewards/rewards.service";
import { UserRole } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const TIER_ID = "44444444-4444-4444-8444-444444444444";
const OWNER = { id: "11111111-1111-4111-8111-111111111111", role: UserRole.CAMPAIGN_OWNER } as any;
const DONOR = { id: "22222222-2222-4222-8222-222222222222", role: UserRole.USER, name: "Donor" } as any;
const ADMIN = { id: "99999999-9999-4999-8999-999999999999", role: UserRole.ADMIN } as any;

function makeTier(overrides: Partial<RewardTier> = {}): RewardTier {
  return Object.assign(new RewardTier(), {
    id: TIER_ID,
    campaignId: CAMPAIGN_ID,
    title: "Thư cảm ơn + sổ tay",
    description: "Thư cảm ơn viết tay và sổ tay dự án",
    minAmount: 200000,
    quantityLimit: 2,
    claimedCount: 0,
    estimatedDelivery: null,
    sortOrder: 0,
    isActive: true,
    ...overrides,
  });
}

describe("toTierView", () => {
  it("tính số suất còn lại; null khi không giới hạn", () => {
    equal(toTierView(makeTier({ quantityLimit: 5, claimedCount: 2 })).remaining, 3);
    equal(toTierView(makeTier({ quantityLimit: null })).remaining, null);
    equal(toTierView(makeTier({ minAmount: "200000.00" as unknown as number })).minAmount, 200000);
  });
});

describe("RewardsService", () => {
  let tiers: RewardTier[];
  let linkedDonations: number;
  let status: CampaignStatus;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let service: RewardsService;

  beforeEach(() => {
    tiers = [makeTier()];
    linkedDonations = 0;
    status = CampaignStatus.DRAFT;
    audit = makeAuditRecorder();
    const tierRepo: any = {
      findOne: async ({ where }: any) => tiers.find((t) => t.id === where.id) ?? null,
      find: async ({ where }: any) => tiers.filter((t) => t.campaignId === where.campaignId && (where.isActive === undefined || t.isActive === where.isActive)),
      count: async () => tiers.length,
      create: (dto: any) => Object.assign(new RewardTier(), dto),
      save: async (t: any) => {
        if (!t.id) {
          t.id = `t-${tiers.length + 1}`;
          tiers.push(t);
        }
        return t;
      },
      softDelete: async ({ id }: any) => {
        tiers = tiers.filter((t) => t.id !== id);
      },
    };
    const donationRepo: any = {
      count: async () => linkedDonations,
      find: async () => [
        { id: "d1", rewardTierId: TIER_ID, rewardTier: { title: "Quà A" }, amount: "300000.00", isAnonymous: false, user: { name: "Alice" }, completedAt: new Date() },
        { id: "d2", rewardTierId: TIER_ID, rewardTier: { title: "Quà A" }, amount: "250000.00", isAnonymous: true, user: { name: "Bob" }, completedAt: new Date() },
      ],
    };
    const campaignsService = {
      findById: async () => ({ id: CAMPAIGN_ID, ownerId: OWNER.id, status }),
    } as unknown as CampaignsService;
    service = new RewardsService(tierRepo, donationRepo, campaignsService, audit.service);
  });

  it("chủ dự án tạo mức quà (có audit); người khác bị chặn", async () => {
    const view = await service.create(CAMPAIGN_ID, { title: "Áo phông", description: "Áo phông in logo dự án", minAmount: 500000, quantityLimit: 50 }, OWNER);
    equal(view.remaining, 50);
    equal(audit.entries.at(-1)?.action, "reward_tier.create");
    await rejects(service.create(CAMPAIGN_ID, { title: "Áo", description: "Áo phông in logo", minAmount: 500000 }, DONOR), ForbiddenException);
  });

  it(`tối đa ${MAX_TIERS_PER_CAMPAIGN} mức mỗi chiến dịch`, async () => {
    tiers = Array.from({ length: MAX_TIERS_PER_CAMPAIGN }, (_, i) => makeTier({ id: `x${i}` }));
    await rejects(service.create(CAMPAIGN_ID, { title: "Thêm", description: "Mức thứ mười một", minAmount: 50000 }, OWNER), BadRequestException);
  });

  it("chiến dịch đã kết thúc: không thêm/sửa", async () => {
    status = CampaignStatus.SUCCESS;
    await rejects(service.create(CAMPAIGN_ID, { title: "Muộn", description: "Thêm sau khi kết thúc", minAmount: 50000 }, OWNER), ConflictException);
    await rejects(service.update(TIER_ID, { title: "Đổi" }, OWNER), ConflictException);
  });

  it("sau khi phát hành: không đổi số tiền tối thiểu, vẫn sửa mô tả/tắt được", async () => {
    status = CampaignStatus.ACTIVE;
    await rejects(service.update(TIER_ID, { minAmount: 100000 }, OWNER), ConflictException);
    const view = await service.update(TIER_ID, { description: "Mô tả mới chi tiết hơn", isActive: false }, OWNER);
    equal(view.isActive, false);
    equal(audit.entries.at(-1)?.action, "reward_tier.update");
  });

  it("trước khi phát hành: đổi được số tiền tối thiểu", async () => {
    const view = await service.update(TIER_ID, { minAmount: 150000 }, OWNER);
    equal(view.minAmount, 150000);
  });

  it("giới hạn suất không thấp hơn số đã nhận", async () => {
    tiers = [makeTier({ quantityLimit: 10, claimedCount: 4 })];
    await rejects(service.update(TIER_ID, { quantityLimit: 3 }, OWNER), ConflictException);
    equal((await service.update(TIER_ID, { quantityLimit: 4 }, ADMIN)).remaining, 0);
  });

  it("mức đã có người chọn không xóa được; mức chưa ai chọn thì xóa mềm", async () => {
    linkedDonations = 1;
    await rejects(service.remove(TIER_ID, OWNER), ConflictException);
    linkedDonations = 0;
    await service.remove(TIER_ID, OWNER);
    equal(tiers.length, 0);
    equal(audit.entries.at(-1)?.action, "reward_tier.delete");
  });

  it("công khai chỉ khi chiến dịch đã công khai", async () => {
    status = CampaignStatus.PENDING;
    await rejects(service.listPublic(CAMPAIGN_ID), NotFoundException);
    status = CampaignStatus.ACTIVE;
    equal((await service.listPublic(CAMPAIGN_ID)).length, 1);
  });

  it("danh sách nhận quà: chỉ chủ dự án, tôn trọng ẩn danh", async () => {
    await rejects(service.listClaims(CAMPAIGN_ID, DONOR), ForbiddenException);
    const claims = await service.listClaims(CAMPAIGN_ID, OWNER);
    equal(claims[0].backerName, "Alice");
    equal(claims[1].backerName, "Ẩn danh");
    equal(claims[0].amount, 300000);
  });
});

describe("DonationsService + mức quà", () => {
  let tier: RewardTier;
  let claimAffected: number;
  let updates: any[];
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let service: DonationsService;
  let pending: any;

  beforeEach(() => {
    tier = makeTier();
    claimAffected = 1;
    updates = [];
    notifier = makeNotifierRecorder();
    pending = {
      id: "55555555-5555-4555-8555-555555555555",
      userId: DONOR.id,
      campaignId: CAMPAIGN_ID,
      amount: 300000,
      status: DonationStatus.PENDING,
      rewardTierId: TIER_ID,
    };
    const campaign = { id: CAMPAIGN_ID, title: "Thư viện", ownerId: OWNER.id, status: CampaignStatus.ACTIVE, endDate: new Date(Date.now() + 86400000) };
    const donationRepo: any = {
      findOne: async ({ where }: any) => (where.idempotencyKey ? null : pending),
      create: (dto: any) => dto,
      save: async (d: any) => ({ id: "new", ...d }),
    };
    const campaignRepo: any = { findOne: async () => campaign };
    const qb: any = {
      update: () => qb,
      set: () => qb,
      where: () => qb,
      andWhere: () => qb,
      execute: async () => ({ affected: claimAffected }),
    };
    const manager: any = {
      update: async (_e: any, where: any, patch: any) => {
        updates.push({ where, patch });
        return { affected: 1 };
      },
      increment: async () => undefined,
      findOne: async () => pending,
      createQueryBuilder: () => qb,
    };
    const dataSource: any = {
      transaction: async (fn: any) => fn(manager),
      getRepository: () => ({ findOne: async () => tier }),
    };
    service = new DonationsService(donationRepo, campaignRepo, dataSource, new DemoWalletGateway("secret"), makeAuditRecorder().service, notifier.service);
  });

  const createDto = (overrides: any = {}) => ({
    campaignId: CAMPAIGN_ID,
    amount: 300000,
    paymentMethod: "wallet",
    idempotencyKey: "k-" + Math.random(),
    rewardTierId: TIER_ID,
    ...overrides,
  });

  it("tạo giao dịch kèm mức quà hợp lệ", async () => {
    const donation = await service.create(createDto(), DONOR);
    equal(donation.rewardTierId, TIER_ID);
  });

  it("từ chối khi số tiền thấp hơn mức tối thiểu", async () => {
    await rejects(service.create(createDto({ amount: 100000 }), DONOR), BadRequestException);
  });

  it("từ chối khi mức hết suất, đang tắt hoặc thuộc chiến dịch khác", async () => {
    tier = makeTier({ quantityLimit: 2, claimedCount: 2 });
    await rejects(service.create(createDto(), DONOR), ConflictException);
    tier = makeTier({ isActive: false });
    await rejects(service.create(createDto(), DONOR), NotFoundException);
    tier = makeTier({ campaignId: "other" });
    await rejects(service.create(createDto(), DONOR), NotFoundException);
  });

  it("xác nhận thanh toán → trừ suất, thông báo nêu phần quà", async () => {
    const result = await service.confirmDemoPayment(pending.id, "completed", DONOR);
    equal(result.status, DonationStatus.COMPLETED);
    equal(result.rewardTierId, TIER_ID);
    ok(!updates.some((u) => u.patch.rewardTierId === null));
    const donorNote = notifier.notified.find((n) => n.userId === DONOR.id);
    ok(donorNote?.message.includes("Phần quà: Thư cảm ơn + sổ tay"));
  });

  it("hết suất đúng lúc xác nhận → vẫn ghi nhận tiền, bỏ quà và báo rõ", async () => {
    claimAffected = 0;
    const result = await service.confirmDemoPayment(pending.id, "completed", DONOR);
    equal(result.status, DonationStatus.COMPLETED);
    equal(result.rewardTierId, null);
    ok(updates.some((u) => u.patch.rewardTierId === null));
    const donorNote = notifier.notified.find((n) => n.userId === DONOR.id);
    ok(donorNote?.message.includes("vừa hết suất"));
  });
});
