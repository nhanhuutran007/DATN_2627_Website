import { equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { ForbiddenException } from "@nestjs/common";
import { FindOperator } from "typeorm";

import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import type { CampaignComment } from "../src/modules/comments/entities/campaign-comment.entity";
import { DonationStatus } from "../src/modules/donations/entities/donation.entity";
import { PostVisibility, type CampaignPost } from "../src/modules/posts/entities/campaign-post.entity";
import { PostsService } from "../src/modules/posts/posts.service";
import { UserRole, UserStatus, type User } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const OWNER = "00000000-0000-4000-8000-000000000001";
const BACKER = "00000000-0000-4000-8000-000000000002";
const OTHER_BACKER = "00000000-0000-4000-8000-000000000004";
const STRANGER = "00000000-0000-4000-8000-000000000003";
const ADMIN = "00000000-0000-4000-8000-0000000000ad";
const CAMPAIGN = "00000000-0000-4000-8000-0000000000c1";

type Row = Record<string, unknown>;

function makeUser(id: string, role = UserRole.USER): User {
  return { id, role, status: UserStatus.ACTIVE, name: `User ${id.slice(-2)}` } as User;
}

/** So khớp điều kiện `where` đơn giản, hỗ trợ `In(...)` và `IsNull()`. */
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected instanceof FindOperator) {
      if (expected.type === "in") return (expected.value as unknown[]).includes(row[key]);
      if (expected.type === "isNull") return row[key] === null || row[key] === undefined;
    }
    return row[key] === expected;
  });
}

function makeCommentRepo() {
  const rows: CampaignComment[] = [];
  let seq = 0;
  return {
    rows,
    create: (data: Partial<CampaignComment>) => ({ ...data }) as CampaignComment,
    save: async (row: CampaignComment) => {
      seq += 1;
      row.id = `comment-${seq}`;
      row.createdAt = new Date(Date.now() + seq);
      rows.push(row);
      return row;
    },
    findOne: async ({ where }: { where: Row }) => rows.find((row) => matches(row as unknown as Row, where)) ?? null,
    find: async ({ where }: { where: Row }) => rows.filter((row) => matches(row as unknown as Row, where)),
    findAndCount: async ({ where, skip, take }: { where: Row; skip: number; take: number }) => {
      const found = rows.filter((row) => matches(row as unknown as Row, where)).reverse();
      return [found.slice(skip, skip + take), found.length] as const;
    },
  };
}

describe("Bình luận bài cập nhật", () => {
  let posts: CampaignPost[];
  let comments: ReturnType<typeof makeCommentRepo>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let service: PostsService;

  const owner = makeUser(OWNER);
  const backer = makeUser(BACKER);
  const otherBacker = makeUser(OTHER_BACKER);
  const stranger = makeUser(STRANGER);
  const admin = makeUser(ADMIN, UserRole.ADMIN);

  beforeEach(() => {
    const campaign = { id: CAMPAIGN, ownerId: OWNER, title: "Thư viện nhỏ", status: CampaignStatus.ACTIVE };
    const donations = [
      { campaignId: CAMPAIGN, userId: BACKER, status: DonationStatus.COMPLETED },
      { campaignId: CAMPAIGN, userId: OTHER_BACKER, status: DonationStatus.PLEDGED },
    ];
    posts = [
      { id: "post-public", campaignId: CAMPAIGN, number: 1, title: "Đợt sách đầu", visibility: PostVisibility.PUBLIC } as CampaignPost,
      { id: "post-private", campaignId: CAMPAIGN, number: 2, title: "Chỉ người ủng hộ", visibility: PostVisibility.BACKERS } as CampaignPost,
    ];
    comments = makeCommentRepo();
    notifier = makeNotifierRecorder();
    service = new PostsService(
      { findOne: async ({ where }: { where: { id: string } }) => posts.find((p) => p.id === where.id) ?? null } as never,
      {} as never,
      { findOne: async ({ where }: { where: { id: string } }) => (where.id === CAMPAIGN ? campaign : null) } as never,
      { exists: async ({ where }: { where: Row }) => donations.some((row) => matches(row, where)) } as never,
      makeAuditRecorder().service,
      notifier.service,
      null,
      comments as never,
    );
  });

  it("chỉ người đã ủng hộ được bình luận; người lạ và chủ dự án không mở luồng mới", async () => {
    const created = await service.createComment("post-public", { content: "Mong sớm nhận sách!" }, backer);
    equal(created.author.id, BACKER);
    equal(comments.rows[0].postId, "post-public");
    equal(comments.rows[0].campaignId, CAMPAIGN);
    equal(notifier.notified.at(-1)?.userId, OWNER);

    await rejects(service.createComment("post-public", { content: "Xin chào" }, stranger), ForbiddenException);
    await rejects(service.createComment("post-public", { content: "Xin chào" }, owner), ForbiddenException);
  });

  it("chủ dự án và quản trị viên trả lời được; người trả lời được báo kèm email", async () => {
    const root = await service.createComment("post-public", { content: "Khi nào giao quà?" }, backer);

    const byAdmin = await service.createComment("post-public", { content: "Tuần sau nhé.", parentId: root.id }, admin);
    equal(byAdmin.isAdmin, true);
    const notice = notifier.notified.at(-1);
    equal(notice?.userId, BACKER);
    equal(notice?.email, true);
    ok(notice?.title.startsWith("Quản trị viên"));

    const byOwner = await service.createComment("post-public", { content: "Đúng vậy ạ.", parentId: root.id }, owner);
    equal(byOwner.isOwner, true);

    const thread = await service.listComments("post-public", {}, null);
    equal(thread.total, 1);
    equal(thread.items[0].replies.length, 2);
  });

  it("người ủng hộ hỏi tiếp được trong luồng của mình, không trả lời luồng người khác", async () => {
    const root = await service.createComment("post-public", { content: "Cho mình hỏi thêm" }, backer);
    await service.createComment("post-public", { content: "Bổ sung câu hỏi", parentId: root.id }, backer);
    await rejects(
      service.createComment("post-public", { content: "Mình cũng muốn biết", parentId: root.id }, otherBacker),
      ForbiddenException,
    );
  });

  it("bài dành riêng người ủng hộ: người lạ không xem cũng không bình luận được", async () => {
    await service.createComment("post-private", { content: "Cảm ơn đội dự án" }, otherBacker);
    await rejects(service.listComments("post-private", {}, stranger), ForbiddenException);
    await rejects(service.listComments("post-private", {}, null), ForbiddenException);
    equal((await service.listComments("post-private", {}, backer)).total, 1);
  });
});
