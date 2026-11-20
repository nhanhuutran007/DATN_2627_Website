import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { FindOperator } from "typeorm";

import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { PostVisibility, type CampaignPost } from "../src/modules/posts/entities/campaign-post.entity";
import { PostsService } from "../src/modules/posts/posts.service";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const OWNER = "00000000-0000-4000-8000-000000000001";
const BACKER = "00000000-0000-4000-8000-000000000002";
const STRANGER = "00000000-0000-4000-8000-000000000003";
const CAMPAIGN = "00000000-0000-4000-8000-0000000000c1";

function makeUser(id: string, role = UserRole.USER): User {
  return { id, role, status: UserStatus.ACTIVE } as User;
}

function inValues(value: unknown): unknown[] | null {
  return value instanceof FindOperator && value.type === "in" ? (value.value as unknown[]) : null;
}

function matches(row: Record<string, unknown>, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const list = inValues(expected);
    return list ? list.includes(row[key]) : row[key] === expected;
  });
}

function makePostRepo() {
  const rows: CampaignPost[] = [];
  let seq = 0;
  return {
    rows,
    create: (data: Partial<CampaignPost>) => ({ ...data }) as CampaignPost,
    save: async (row: CampaignPost) => {
      if (!row.id) {
        seq += 1;
        row.id = `post-${seq}`;
        row.createdAt = new Date(Date.now() + seq);
        rows.push(row);
      }
      return row;
    },
    maximum: async (_field: "number", where: { campaignId: string }) => {
      const numbers = rows.filter((row) => row.campaignId === where.campaignId).map((row) => row.number);
      return numbers.length ? Math.max(...numbers) : null;
    },
    findOne: async ({ where }: { where: { id: string } }) => rows.find((row) => row.id === where.id) ?? null,
    findAndCount: async ({ where, skip, take }: { where: { campaignId: string }; skip: number; take: number }) => {
      const found = rows.filter((row) => row.campaignId === where.campaignId).sort((a, b) => b.number - a.number);
      return [found.slice(skip, skip + take), found.length] as const;
    },
    update: async (where: { id: string }, patch: Partial<CampaignPost>) => {
      rows.filter((row) => row.id === where.id).forEach((row) => Object.assign(row, patch));
    },
    delete: async (where: { id: string }) => {
      const index = rows.findIndex((row) => row.id === where.id);
      if (index >= 0) rows.splice(index, 1);
    },
  };
}

function makeLikeRepo() {
  const rows: Array<{ postId: string; userId: string }> = [];
  return {
    rows,
    createQueryBuilder: () => {
      let value: { postId: string; userId: string };
      const qb = {
        insert: () => qb,
        into: () => qb,
        values: (v: { postId: string; userId: string }) => ((value = v), qb),
        orIgnore: () => qb,
        execute: async () => {
          if (!rows.some((row) => row.postId === value.postId && row.userId === value.userId)) rows.push(value);
        },
      };
      return qb;
    },
    delete: async (where: { postId: string; userId: string }) => {
      const index = rows.findIndex((row) => matches(row, where));
      if (index >= 0) rows.splice(index, 1);
    },
    count: async ({ where }: { where: { postId: string } }) => rows.filter((row) => matches(row, where)).length,
    find: async ({ where }: { where: Record<string, unknown> }) => rows.filter((row) => matches(row, where)),
  };
}

describe("PostsService", () => {
  let campaign: { id: string; ownerId: string; title: string; status: CampaignStatus };
  let donations: Array<{ campaignId: string; userId: string; status: DonationStatus }>;
  let postRepo: ReturnType<typeof makePostRepo>;
  let likeRepo: ReturnType<typeof makeLikeRepo>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let service: PostsService;

  const owner = makeUser(OWNER);
  const backer = makeUser(BACKER);
  const stranger = makeUser(STRANGER);

  beforeEach(() => {
    campaign = { id: CAMPAIGN, ownerId: OWNER, title: "Thư viện nhỏ", status: CampaignStatus.ACTIVE };
    donations = [{ campaignId: CAMPAIGN, userId: BACKER, status: DonationStatus.COMPLETED }];
    postRepo = makePostRepo();
    likeRepo = makeLikeRepo();
    notifier = makeNotifierRecorder();
    const campaignRepo = {
      findOne: async ({ where }: { where: { id: string } }) => (where.id === campaign.id ? campaign : null),
    };
    const donationRepo = {
      exists: async ({ where }: { where: Record<string, unknown> }) => donations.some((row) => matches(row, where)),
      createQueryBuilder: () => {
        const qb = {
          select: () => qb,
          where: () => qb,
          andWhere: () => qb,
          getRawMany: async () =>
            [...new Set(donations.filter((d) => d.status === DonationStatus.COMPLETED).map((d) => d.userId))].map((userId) => ({ userId })),
        };
        return qb;
      },
    };
    service = new PostsService(
      postRepo as never,
      likeRepo as never,
      campaignRepo as never,
      donationRepo as never,
      makeAuditRecorder().service,
      notifier.service,
    );
  });

  const draft = (visibility = PostVisibility.PUBLIC) => ({
    title: "Đã nhận sách đợt một",
    content: "Hôm nay thư viện đã nhận 300 cuốn sách đầu tiên từ nhà xuất bản.",
    visibility,
  });

  it("đánh số Cập nhật #N tăng dần và trả bài mới nhất trước", async () => {
    const first = await service.create(CAMPAIGN, draft(), owner);
    const second = await service.create(CAMPAIGN, draft(), owner);
    equal(first.number, 1);
    equal(second.number, 2);
    const page = await service.listForCampaign(CAMPAIGN, {}, null);
    deepEqual(page.items.map((item) => item.number), [2, 1]);
    equal(page.total, 2);
  });

  it("chỉ chủ dự án được đăng bài", async () => {
    await rejects(service.create(CAMPAIGN, draft(), stranger), ForbiddenException);
  });

  it("không đăng bài cho chiến dịch chưa công khai, và người ngoài không xem được", async () => {
    campaign.status = CampaignStatus.DRAFT;
    await rejects(service.create(CAMPAIGN, draft(), owner), ConflictException);
    await rejects(service.listForCampaign(CAMPAIGN, {}, stranger), NotFoundException);
    equal((await service.listForCampaign(CAMPAIGN, {}, owner)).total, 0);
  });

  it("bài chỉ cho người ủng hộ: ẩn nội dung với khách, mở với người đã ủng hộ và chủ dự án", async () => {
    await service.create(CAMPAIGN, { ...draft(PostVisibility.BACKERS), imageUrl: "https://example.com/a.jpg" }, owner);

    const [guestView] = (await service.listForCampaign(CAMPAIGN, {}, null)).items;
    equal(guestView.locked, true);
    equal(guestView.content, null);
    equal(guestView.imageUrl, null);
    equal(guestView.title, "Đã nhận sách đợt một");

    const [backerView] = (await service.listForCampaign(CAMPAIGN, {}, backer)).items;
    equal(backerView.locked, false);
    ok(backerView.content?.includes("300 cuốn"));

    const [ownerView] = (await service.listForCampaign(CAMPAIGN, {}, owner)).items;
    equal(ownerView.locked, false);
  });

  it("bài công khai báo cho người ủng hộ và người theo dõi; bài riêng chỉ báo người ủng hộ", async () => {
    await service.create(CAMPAIGN, draft(), owner);
    equal(notifier.backerNotices.length, 1);
    deepEqual(notifier.backerNotices[0].excludeUserIds, [OWNER]);
    equal(notifier.notified.length, 0);

    await service.create(CAMPAIGN, draft(PostVisibility.BACKERS), owner);
    equal(notifier.backerNotices.length, 1);
    deepEqual(notifier.notified.map((n) => n.userId), [BACKER]);
    ok(notifier.notified[0].title.startsWith("Cập nhật #2"));
  });

  it("thích bài idempotent, bỏ thích giảm số đếm; không thích được bài đang khóa", async () => {
    const pub = await service.create(CAMPAIGN, draft(), owner);
    deepEqual(await service.like(pub.id, stranger), { liked: true, likeCount: 1 });
    deepEqual(await service.like(pub.id, stranger), { liked: true, likeCount: 1 });
    equal((await service.findOne(pub.id, stranger)).liked, true);
    deepEqual(await service.unlike(pub.id, stranger), { liked: false, likeCount: 0 });

    const priv = await service.create(CAMPAIGN, draft(PostVisibility.BACKERS), owner);
    await rejects(service.like(priv.id, stranger), ForbiddenException);
    deepEqual(await service.like(priv.id, backer), { liked: true, likeCount: 1 });
  });

  it("sửa bài ghi thời điểm chỉnh sửa; người khác không sửa/xóa được", async () => {
    const post = await service.create(CAMPAIGN, draft(), owner);
    await rejects(service.update(post.id, { title: "Tiêu đề lạ" }, stranger), ForbiddenException);
    const edited = await service.update(post.id, { title: "Đã nhận 300 cuốn sách", imageUrl: null }, owner);
    equal(edited.title, "Đã nhận 300 cuốn sách");
    ok(edited.editedAt instanceof Date);
    await rejects(service.remove(post.id, stranger), ForbiddenException);
    await service.remove(post.id, makeUser("00000000-0000-4000-8000-0000000000ad", UserRole.ADMIN));
    equal(postRepo.rows.length, 0);
  });
});
