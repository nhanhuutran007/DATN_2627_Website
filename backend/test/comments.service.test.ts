import { deepEqual, equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import type { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { CommentsService, sanitizeCommentContent } from "../src/modules/comments/comments.service";
import { CommentKind, CommentStatus } from "../src/modules/comments/entities/campaign-comment.entity";
import { NotificationType } from "../src/modules/notifications/entities/notification.entity";
import { UserRole } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const CAMPAIGN_ID = "123e4567-e89b-12d3-a456-426614174010";
const OWNER = { id: "123e4567-e89b-12d3-a456-426614174002", name: "Chủ dự án", role: UserRole.CAMPAIGN_OWNER } as any;
const ALICE = { id: "123e4567-e89b-12d3-a456-426614174003", name: "Alice", role: UserRole.USER } as any;
const BOB = { id: "123e4567-e89b-12d3-a456-426614174004", name: "Bob", role: UserRole.USER } as any;
const ADMIN = { id: "123e4567-e89b-12d3-a456-426614174001", name: "Admin", role: UserRole.ADMIN } as any;

function makeRepo() {
  const rows: any[] = [];
  let seq = 0;
  const match = (r: any, where: any) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === "object" && "_type" in v) {
        if (v._type === "isNull") return r[k] == null;
        if (v._type === "in") return v._value.includes(r[k]);
      }
      return r[k] === v;
    });
  return {
    rows,
    create: (dto: any) => ({ ...dto }),
    save: async (row: any) => {
      if (!row.id) {
        row.id = `c-${++seq}`;
        row.createdAt = new Date(Date.now() + seq);
        rows.push(row);
      }
      return row;
    },
    findOne: async ({ where }: any) => rows.find((r) => !r.deletedAt && match(r, where)) ?? null,
    find: async ({ where }: any) => rows.filter((r) => !r.deletedAt && match(r, where)),
    findAndCount: async ({ where }: any) => {
      const list = rows.filter((r) => !r.deletedAt && match(r, where)).reverse();
      return [list, list.length];
    },
    softDelete: async ({ id }: any) => {
      const r = rows.find((x) => x.id === id);
      if (r) r.deletedAt = new Date();
    },
  };
}

describe("sanitizeCommentContent", () => {
  it("bỏ ký tự điều khiển, chuẩn hóa xuống dòng, gộp dòng trống", () => {
    equal(sanitizeCommentContent("  Xin\u0000 chào\r\n\r\n\r\n\r\nbạn  "), "Xin chào\n\nbạn");
  });
});

describe("CommentsService", () => {
  let repo: ReturnType<typeof makeRepo>;
  let audit: ReturnType<typeof makeAuditRecorder>;
  let notifier: ReturnType<typeof makeNotifierRecorder>;
  let status: CampaignStatus;
  let service: CommentsService;

  beforeEach(() => {
    repo = makeRepo();
    audit = makeAuditRecorder();
    notifier = makeNotifierRecorder();
    status = CampaignStatus.ACTIVE;
    const campaignsService = {
      findById: async (id: string) => {
        if (id !== CAMPAIGN_ID) throw new NotFoundException("Campaign not found");
        return { id: CAMPAIGN_ID, title: "Thư viện vùng cao", ownerId: OWNER.id, status };
      },
    } as unknown as CampaignsService;
    service = new CommentsService(repo as any, campaignsService, audit.service, notifier.service);
  });

  it("đặt câu hỏi: lưu nội dung đã làm sạch, báo chủ dự án", async () => {
    const view = await service.create(CAMPAIGN_ID, { content: "  Khi nào bắt đầu xây?\u0007 ", kind: CommentKind.QUESTION }, ALICE);
    equal(view.content, "Khi nào bắt đầu xây?");
    equal(view.kind, CommentKind.QUESTION);
    equal(view.isOwner, false);
    deepEqual(view.author, { id: ALICE.id, name: "Alice", avatar: null });
    equal(notifier.notified.length, 1);
    equal(notifier.notified[0].userId, OWNER.id);
    equal(notifier.notified[0].type, NotificationType.COMMENT_NEW);
    ok(notifier.notified[0].link?.endsWith("#hoi-dap"));
  });

  it("chủ dự án trả lời: báo người hỏi, không tự báo cho mình, có nhãn chủ dự án", async () => {
    const q = await service.create(CAMPAIGN_ID, { content: "Câu hỏi?", kind: CommentKind.QUESTION }, ALICE);
    notifier.notified.length = 0;
    const reply = await service.create(CAMPAIGN_ID, { content: "Tháng sau ạ.", parentId: q.id }, OWNER);
    equal(reply.isOwner, true);
    equal(notifier.notified.length, 1);
    equal(notifier.notified[0].userId, ALICE.id);
    equal(notifier.notified[0].type, NotificationType.COMMENT_REPLY);
    equal(notifier.notified[0].title, "Chủ dự án đã trả lời bạn");
  });

  it("người khác trả lời: báo cả người viết gốc và chủ dự án", async () => {
    const root = await service.create(CAMPAIGN_ID, { content: "Ý kiến" }, ALICE);
    notifier.notified.length = 0;
    await service.create(CAMPAIGN_ID, { content: "Đồng ý", parentId: root.id }, BOB);
    deepEqual(notifier.notified.map((n) => n.userId).sort(), [ALICE.id, OWNER.id].sort());
  });

  it("trả lời luôn là bình luận, chỉ 1 cấp, cùng chiến dịch", async () => {
    const root = await service.create(CAMPAIGN_ID, { content: "Gốc" }, ALICE);
    const reply = await service.create(CAMPAIGN_ID, { content: "Trả lời", parentId: root.id, kind: CommentKind.QUESTION }, BOB);
    equal(reply.kind, CommentKind.COMMENT);
    await rejects(service.create(CAMPAIGN_ID, { content: "Cấp 2", parentId: reply.id }, ALICE), BadRequestException);
    await rejects(service.create(CAMPAIGN_ID, { content: "Sai", parentId: "khong-ton-tai" }, ALICE), NotFoundException);
  });

  it("chiến dịch chưa công khai: 404 khi xem và khi bình luận", async () => {
    status = CampaignStatus.PENDING;
    await rejects(service.listForCampaign(CAMPAIGN_ID, {}), NotFoundException);
    await rejects(service.create(CAMPAIGN_ID, { content: "Xin chào" }, ALICE), NotFoundException);
  });

  it("từ chối nội dung rỗng sau khi làm sạch", async () => {
    await rejects(service.create(CAMPAIGN_ID, { content: "\u0000\u0001 " }, ALICE), BadRequestException);
  });

  it("chỉ tác giả hoặc admin xóa được; xóa mềm có audit", async () => {
    const c = await service.create(CAMPAIGN_ID, { content: "Của Alice" }, ALICE);
    await rejects(service.remove(c.id, BOB), ForbiddenException);
    await service.remove(c.id, ALICE);
    ok(repo.rows[0].deletedAt);
    equal(audit.entries.at(-1)?.action, "comment.delete");
    const c2 = await service.create(CAMPAIGN_ID, { content: "Vi phạm" }, BOB);
    await service.remove(c2.id, ADMIN);
    equal((audit.entries.at(-1)?.newValues as any).byAdmin, true);
  });

  it("admin ẩn/hiện: có audit, báo tác giả khi ẩn, không ẩn hai lần", async () => {
    const c = await service.create(CAMPAIGN_ID, { content: "Spam" }, BOB);
    notifier.notified.length = 0;
    const hidden = await service.hide(c.id, "Nội dung quảng cáo", ADMIN);
    equal(hidden.status, CommentStatus.HIDDEN);
    equal(hidden.hiddenBy, ADMIN.id);
    equal(audit.entries.at(-1)?.action, "comment.hide");
    equal(notifier.notified[0].userId, BOB.id);
    equal(notifier.notified[0].type, NotificationType.COMMENT_HIDDEN);
    await rejects(service.hide(c.id, "Lần nữa", ADMIN), ConflictException);
    const shown = await service.unhide(c.id, ADMIN);
    equal(shown.status, CommentStatus.VISIBLE);
    equal(shown.hiddenReason, null);
    equal(audit.entries.at(-1)?.action, "comment.unhide");
  });

  it("danh sách công khai: gom trả lời theo bình luận gốc, bỏ bình luận bị ẩn", async () => {
    const a = await service.create(CAMPAIGN_ID, { content: "Gốc A" }, ALICE);
    const b = await service.create(CAMPAIGN_ID, { content: "Gốc B" }, BOB);
    await service.create(CAMPAIGN_ID, { content: "Trả lời A", parentId: a.id }, OWNER);
    await service.hide(b.id, "Vi phạm quy định", ADMIN);
    const page = await service.listForCampaign(CAMPAIGN_ID, {});
    equal(page.total, 1);
    equal(page.items[0].id, a.id);
    equal(page.items[0].replies.length, 1);
    equal(page.items[0].replies[0].isOwner, true);
  });
});
