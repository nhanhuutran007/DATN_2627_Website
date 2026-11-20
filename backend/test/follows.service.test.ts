import { deepEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import type { CampaignFollow } from "../src/modules/follows/entities/campaign-follow.entity";
import { FollowsService } from "../src/modules/follows/follows.service";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";
import { makeNotifierRecorder } from "./helpers/notifications";

const OWNER = "00000000-0000-4000-8000-000000000001";
const FAN = "00000000-0000-4000-8000-000000000002";
const CAMPAIGN = "00000000-0000-4000-8000-0000000000c1";

function makeUser(id: string): User {
  return { id, role: UserRole.USER, status: UserStatus.ACTIVE } as User;
}

/** Bảng `campaign_follows` giả trong bộ nhớ, có ràng buộc UNIQUE(user, campaign). */
function makeFollowRepo() {
  const rows: Array<Pick<CampaignFollow, "userId" | "campaignId">> = [];
  const match = (where: Partial<CampaignFollow>) => (row: Pick<CampaignFollow, "userId" | "campaignId">) =>
    (!where.userId || row.userId === where.userId) && (!where.campaignId || row.campaignId === where.campaignId);
  const repo = {
    rows,
    createQueryBuilder: () => {
      let value: Pick<CampaignFollow, "userId" | "campaignId">;
      const qb = {
        insert: () => qb,
        into: () => qb,
        values: (v: Pick<CampaignFollow, "userId" | "campaignId">) => ((value = v), qb),
        orIgnore: () => qb,
        execute: async () => {
          if (!rows.some(match(value))) rows.push(value);
          return {};
        },
      };
      return qb;
    },
    delete: async (where: Partial<CampaignFollow>) => {
      for (let i = rows.length - 1; i >= 0; i -= 1) if (match(where)(rows[i])) rows.splice(i, 1);
      return { affected: 1 };
    },
    count: async ({ where }: { where: Partial<CampaignFollow> }) => rows.filter(match(where)).length,
    existsBy: async (where: Partial<CampaignFollow>) => rows.some(match(where)),
  };
  return repo;
}

describe("FollowsService", () => {
  let followRepo: ReturnType<typeof makeFollowRepo>;
  let campaignStatus: CampaignStatus;
  let service: FollowsService;

  beforeEach(() => {
    followRepo = makeFollowRepo();
    campaignStatus = CampaignStatus.ACTIVE;
    const campaignsService = {
      findById: async (id: string) => {
        if (id !== CAMPAIGN) throw new NotFoundException("Campaign not found");
        return { id, ownerId: OWNER, status: campaignStatus };
      },
    };
    service = new FollowsService(followRepo as never, campaignsService as never, makeNotifierRecorder().service);
  });

  it("theo dõi idempotent và đếm đúng số người theo dõi", async () => {
    deepEqual(await service.follow(CAMPAIGN, makeUser(FAN)), { following: true, followerCount: 1 });
    deepEqual(await service.follow(CAMPAIGN, makeUser(FAN)), { following: true, followerCount: 1 });
    equal(followRepo.rows.length, 1);
  });

  it("bỏ theo dõi rồi xem trạng thái", async () => {
    await service.follow(CAMPAIGN, makeUser(FAN));
    deepEqual(await service.unfollow(CAMPAIGN, makeUser(FAN)), { following: false, followerCount: 0 });
    deepEqual(await service.status(CAMPAIGN, null), { following: false, followerCount: 0 });
  });

  it("khách xem được số người theo dõi, không biết ai theo dõi", async () => {
    await service.follow(CAMPAIGN, makeUser(FAN));
    deepEqual(await service.status(CAMPAIGN, null), { following: false, followerCount: 1 });
    deepEqual(await service.status(CAMPAIGN, makeUser(FAN)), { following: true, followerCount: 1 });
  });

  it("chủ dự án không tự theo dõi chiến dịch của mình", async () => {
    await rejects(service.follow(CAMPAIGN, makeUser(OWNER)), BadRequestException);
  });

  it("không theo dõi được chiến dịch đã kết thúc, nhưng vẫn bỏ theo dõi được", async () => {
    await service.follow(CAMPAIGN, makeUser(FAN));
    campaignStatus = CampaignStatus.ENDED;
    await rejects(service.follow(CAMPAIGN, makeUser("someone-else")), BadRequestException);
    deepEqual(await service.unfollow(CAMPAIGN, makeUser(FAN)), { following: false, followerCount: 0 });
  });

  it("chiến dịch chưa công khai trả 404 (không lộ hồ sơ nháp)", async () => {
    for (const status of [CampaignStatus.DRAFT, CampaignStatus.PENDING, CampaignStatus.REJECTED]) {
      campaignStatus = status;
      await rejects(service.status(CAMPAIGN, null), NotFoundException);
      await rejects(service.follow(CAMPAIGN, makeUser(FAN)), NotFoundException);
    }
  });
});

describe("FollowsService – nhắc dự án sắp hết hạn", () => {
  const NOW = new Date("2026-11-20T08:00:00Z");
  const HOUR = 3_600_000;
  const OTHER = "00000000-0000-4000-8000-000000000003";
  let campaign: { id: string; title: string; ownerId: string; status: CampaignStatus; endDate: Date };
  let rows: Array<{ id: string; userId: string; campaignId: string; remindedAt: Date | null }>;
  let backers: Set<string>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let service: FollowsService;

  beforeEach(() => {
    campaign = { id: CAMPAIGN, title: "Thư viện nhỏ", ownerId: OWNER, status: CampaignStatus.ACTIVE, endDate: new Date(NOW.getTime() + 30 * HOUR) };
    rows = [
      { id: "f1", userId: FAN, campaignId: CAMPAIGN, remindedAt: null },
      { id: "f2", userId: OTHER, campaignId: CAMPAIGN, remindedAt: null },
    ];
    backers = new Set();
    notifier = makeNotifierRecorder();
    // Lọc giống câu SQL của service: chưa nhắc, đang gây quỹ, hết hạn trong 48 giờ, chưa ủng hộ.
    const qb = {
      innerJoinAndSelect: () => qb,
      where: () => qb,
      andWhere: () => qb,
      orderBy: () => qb,
      take: () => qb,
      getMany: async () => {
        const end = campaign.endDate.getTime();
        const due = campaign.status === CampaignStatus.ACTIVE && end > NOW.getTime() && end <= NOW.getTime() + 48 * HOUR;
        return due ? rows.filter((r) => r.remindedAt === null && !backers.has(r.userId)).map((r) => ({ ...r, campaign })) : [];
      },
    };
    const followRepo = {
      createQueryBuilder: () => qb,
      update: async (where: { id: string }, patch: { remindedAt: Date }) => {
        const row = rows.find((r) => r.id === where.id && r.remindedAt === null);
        if (row) Object.assign(row, patch);
        return { affected: row ? 1 : 0 };
      },
    };
    service = new FollowsService(followRepo as never, {} as never, notifier.service);
  });

  it("nhắc một lần người theo dõi chưa ủng hộ khi còn dưới 48 giờ", async () => {
    backers.add(OTHER);
    equal(await service.sendEndingReminders(NOW), 1);
    deepEqual(notifier.notified.map((n) => n.userId), [FAN]);
    equal(notifier.notified[0].link, `/du-an/${CAMPAIGN}/ung-ho`);
    equal(notifier.notified[0].email, true);
    equal(await service.sendEndingReminders(NOW), 0);
    equal(notifier.notified.length, 1);
  });

  it("không nhắc khi còn xa hạn hoặc chiến dịch không còn gây quỹ", async () => {
    campaign.endDate = new Date(NOW.getTime() + 72 * HOUR);
    equal(await service.sendEndingReminders(NOW), 0);
    campaign.endDate = new Date(NOW.getTime() + 5 * HOUR);
    campaign.status = CampaignStatus.PAUSED;
    equal(await service.sendEndingReminders(NOW), 0);
    equal(notifier.notified.length, 0);
  });
});
