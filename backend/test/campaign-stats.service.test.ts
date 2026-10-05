import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { RateLimiterService } from "../src/common/rate-limit/rate-limiter.service";
import { CampaignStatsService, lastUtcDays, utcDate } from "../src/modules/campaigns/campaign-stats.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";

const CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const OWNER = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-10-05T10:00:00Z");

function user(id: string, role = UserRole.USER): User {
  return { id, role, status: UserStatus.ACTIVE } as User;
}

function setup(status = CampaignStatus.ACTIVE) {
  const campaign = {
    id: CAMPAIGN_ID,
    ownerId: OWNER,
    status,
    viewCount: 200,
    backerCount: 10,
    currentAmount: 3_000_000,
    goalAmount: 10_000_000,
  };
  const increments: string[] = [];
  const upserts: unknown[][] = [];
  const campaignRepo = {
    findOne: async ({ where }: { where: { id: string } }) => (where.id === CAMPAIGN_ID ? { ...campaign } : null),
    manager: {
      transaction: async (fn: (m: unknown) => Promise<void>) =>
        fn({
          increment: async (_e: unknown, _w: unknown, column: string) => {
            increments.push(column);
          },
          query: async (_sql: string, params: unknown[]) => {
            upserts.push(params);
          },
        }),
    },
  };
  const viewDailyRepo = {
    find: async () => [
      { campaignId: CAMPAIGN_ID, viewDate: new Date("2026-10-05T00:00:00Z"), views: 7 },
      { campaignId: CAMPAIGN_ID, viewDate: "2026-10-03", views: 4 },
    ],
  };
  const donationRepo = {
    find: async () => [
      { amount: 500_000, status: DonationStatus.COMPLETED, completedAt: new Date("2026-10-05T03:00:00Z") },
      { amount: 200_000, status: DonationStatus.COMPLETED, completedAt: new Date("2026-10-05T08:00:00Z") },
      { amount: 900_000, status: DonationStatus.REFUNDED, completedAt: new Date("2026-10-04T08:00:00Z") },
    ],
  };
  const followRepo = { count: async () => 6 };
  const rateLimiter = new RateLimiterService();
  const service = new CampaignStatsService(
    campaignRepo as never,
    viewDailyRepo as never,
    donationRepo as never,
    followRepo as never,
    rateLimiter,
  );
  return { service, increments, upserts, rateLimiter };
}

describe("CampaignStatsService", () => {
  let ctx: ReturnType<typeof setup>;

  beforeEach(() => {
    ctx = setup();
  });

  describe("recordView", () => {
    it("đếm lượt xem đầu tiên, bỏ qua lượt xem lặp lại của cùng người trong 30 phút", async () => {
      deepEqual(await ctx.service.recordView(CAMPAIGN_ID, { ip: "1.2.3.4", userAgent: "UA" }, NOW), { counted: true });
      deepEqual(await ctx.service.recordView(CAMPAIGN_ID, { ip: "1.2.3.4", userAgent: "UA" }, NOW), { counted: false });
      deepEqual(ctx.increments, ["viewCount"]);
      deepEqual(ctx.upserts, [[CAMPAIGN_ID, "2026-10-05"]]);
    });

    it("người xem khác (khác IP/UA hoặc tài khoản) được đếm riêng", async () => {
      await ctx.service.recordView(CAMPAIGN_ID, { ip: "1.2.3.4", userAgent: "UA" }, NOW);
      await ctx.service.recordView(CAMPAIGN_ID, { ip: "5.6.7.8", userAgent: "UA" }, NOW);
      await ctx.service.recordView(CAMPAIGN_ID, { user: user("u-2") }, NOW);
      equal(ctx.increments.length, 3);
    });

    it("chủ dự án tự xem không được tính", async () => {
      deepEqual(await ctx.service.recordView(CAMPAIGN_ID, { user: user(OWNER) }, NOW), { counted: false });
      equal(ctx.increments.length, 0);
    });

    it("chiến dịch chưa công khai trả 404", async () => {
      const draft = setup(CampaignStatus.DRAFT);
      await rejects(draft.service.recordView(CAMPAIGN_ID, { ip: "1.1.1.1" }, NOW), NotFoundException);
      await rejects(ctx.service.recordView("missing", { ip: "1.1.1.1" }, NOW), NotFoundException);
    });
  });

  describe("getStats", () => {
    it("chỉ chủ dự án hoặc admin xem được", async () => {
      await rejects(ctx.service.getStats(CAMPAIGN_ID, user("stranger"), 7, NOW), ForbiddenException);
      const asAdmin = await ctx.service.getStats(CAMPAIGN_ID, user("admin", UserRole.ADMIN), 7, NOW);
      equal(asAdmin.campaignId, CAMPAIGN_ID);
    });

    it("gộp lượt xem và giao dịch theo ngày UTC, đủ N ngày kể cả ngày trống", async () => {
      const stats = await ctx.service.getStats(CAMPAIGN_ID, user(OWNER), 7, NOW);
      equal(stats.daily.length, 7);
      equal(stats.daily[0].date, "2026-09-29");
      equal(stats.daily[6].date, "2026-10-05");
      deepEqual(stats.daily[6], { date: "2026-10-05", views: 7, donations: 2, amount: 700_000 });
      deepEqual(stats.daily[4], { date: "2026-10-03", views: 4, donations: 0, amount: 0 });
      // Đã hoàn tiền: vẫn là một lượt chuyển đổi nhưng không còn là tiền quỹ.
      deepEqual(stats.daily[5], { date: "2026-10-04", views: 0, donations: 1, amount: 0 });
    });

    it("tính tỷ lệ chuyển đổi = lượt ủng hộ / lượt xem, kèm người theo dõi", async () => {
      const stats = await ctx.service.getStats(CAMPAIGN_ID, user(OWNER), 7, NOW);
      equal(stats.conversionRate, 10 / 200);
      equal(stats.followerCount, 6);
      equal(stats.viewCount, 200);
    });
  });

  it("lastUtcDays/utcDate theo UTC, cũ → mới", () => {
    deepEqual(lastUtcDays(new Date("2026-10-01T23:30:00Z"), 3), ["2026-09-29", "2026-09-30", "2026-10-01"]);
    equal(utcDate(new Date("2026-10-05T23:59:59Z")), "2026-10-05");
    ok(lastUtcDays(NOW, 30).length === 30);
  });
});
