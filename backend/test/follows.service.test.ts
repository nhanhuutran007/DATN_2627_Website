import { deepEqual, equal, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import type { CampaignFollow } from "../src/modules/follows/entities/campaign-follow.entity";
import { FollowsService } from "../src/modules/follows/follows.service";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";

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
    service = new FollowsService(followRepo as never, campaignsService as never);
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
