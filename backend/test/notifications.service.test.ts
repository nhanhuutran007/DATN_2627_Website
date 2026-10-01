import { equal, ok, rejects } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import { NotFoundException } from "@nestjs/common";

import { campaignStatusNotifications } from "../src/modules/campaigns/campaign-notifications";
import { CampaignsService } from "../src/modules/campaigns/campaigns.service";
import { CampaignStatus } from "../src/modules/campaigns/entities/campaign.entity";
import { NotificationType } from "../src/modules/notifications/entities/notification.entity";
import { NotificationsService } from "../src/modules/notifications/notifications.service";
import { UserRole } from "../src/modules/users/entities/user.entity";
import { makeAuditRecorder } from "./helpers/audit";
import { makeNotifierRecorder } from "./helpers/notifications";

const OWNER = "11111111-1111-4111-8111-111111111111";
const DONOR_A = "22222222-2222-4222-8222-222222222222";
const DONOR_B = "33333333-3333-4333-8333-333333333333";

function makeNotificationRepo() {
  const rows: any[] = [];
  return {
    rows,
    failSave: false,
    create: (dto: any) => dto,
    async save(input: any) {
      if (this.failSave) throw new Error("db down");
      const list = Array.isArray(input) ? input : [input];
      for (const row of list) {
        if (!row.id) {
          row.id = `n-${rows.length + 1}`;
          rows.push(row);
        }
      }
      return input;
    },
    findOne: async ({ where }: any) => rows.find((r) => r.id === where.id && r.userId === where.userId) ?? null,
    count: async ({ where }: any) => rows.filter((r) => r.userId === where.userId && r.isRead === where.isRead).length,
    findAndCount: async ({ where }: any) => {
      const list = rows.filter((r) => r.userId === where.userId && (where.isRead === undefined || r.isRead === where.isRead));
      return [list, list.length];
    },
    update: async (where: any, patch: any) => {
      const list = rows.filter((r) => r.userId === where.userId && r.isRead === where.isRead);
      list.forEach((r) => Object.assign(r, patch));
      return { affected: list.length };
    },
  };
}

function makeDonationRepo(donorIds: string[]) {
  return {
    createQueryBuilder: () => {
      const qb: any = {
        select: () => qb,
        where: () => qb,
        andWhere: () => qb,
        getRawMany: async () => donorIds.map((userId) => ({ userId })),
      };
      return qb;
    },
  };
}

describe("NotificationsService", () => {
  let repo: ReturnType<typeof makeNotificationRepo>;
  let emails: any[];
  let service: NotificationsService;

  beforeEach(() => {
    repo = makeNotificationRepo();
    emails = [];
    const userRepo = { find: async () => [{ id: OWNER, email: "owner@example.com", name: "Chủ dự án" }] };
    const emailGateway = { sendNotification: async (m: any) => { emails.push(m); } };
    service = new NotificationsService(repo as any, makeDonationRepo([DONOR_A, DONOR_B, OWNER]) as any, userRepo as any, emailGateway as any);
  });

  it("lưu thông báo chưa đọc, chỉ gửi email khi được yêu cầu", async () => {
    await service.notify([
      { userId: OWNER, type: NotificationType.CAMPAIGN_APPROVED, title: "Đã duyệt", message: "m", link: "/dashboard", email: true },
      { userId: DONOR_A, type: NotificationType.DONATION_CONFIRMED, title: "Ủng hộ thành công", message: "m" },
    ]);
    equal(repo.rows.length, 2);
    equal(repo.rows[0].isRead, false);
    equal(repo.rows[0].link, "/dashboard");
    equal(emails.length, 1);
    equal(emails[0].to, "owner@example.com");
    equal(emails[0].link, "/dashboard");
  });

  it("không ném lỗi khi lưu thất bại (không làm hỏng nghiệp vụ chính)", async () => {
    repo.failSave = true;
    await service.notify({ userId: OWNER, type: NotificationType.SYSTEM, title: "t", message: "m", email: true });
    equal(repo.rows.length, 0);
    equal(emails.length, 0);
  });

  it("gửi cho người ủng hộ, loại trừ chủ dự án", async () => {
    const count = await service.notifyCampaignBackers(
      "c1",
      { type: NotificationType.PROGRESS_UPDATE, title: "Cập nhật", message: "m" },
      [OWNER],
    );
    equal(count, 2);
    ok(repo.rows.every((r) => r.userId !== OWNER));
  });

  it("đánh dấu đã đọc chỉ với thông báo của chính mình", async () => {
    await service.notify({ userId: DONOR_A, type: NotificationType.SYSTEM, title: "t", message: "m" });
    const id = repo.rows[0].id;
    await rejects(service.markRead(id, DONOR_B), NotFoundException);
    const read = await service.markRead(id, DONOR_A);
    equal(read.isRead, true);
    equal(await service.unreadCount(DONOR_A), 0);
  });

  it("đánh dấu tất cả đã đọc chỉ ảnh hưởng người dùng hiện tại", async () => {
    await service.notify([
      { userId: DONOR_A, type: NotificationType.SYSTEM, title: "1", message: "m" },
      { userId: DONOR_A, type: NotificationType.SYSTEM, title: "2", message: "m" },
      { userId: DONOR_B, type: NotificationType.SYSTEM, title: "3", message: "m" },
    ]);
    const { updated } = await service.markAllRead(DONOR_A);
    equal(updated, 2);
    equal(await service.unreadCount(DONOR_B), 1);
  });
});

describe("campaignStatusNotifications", () => {
  const campaign = { id: "c1", title: "Thư viện vùng cao", ownerId: OWNER };

  it("từ chối: báo chủ dự án kèm lý do và email", () => {
    const n = campaignStatusNotifications(campaign, CampaignStatus.PENDING, CampaignStatus.REJECTED, "Thiếu dự toán");
    equal(n.owner?.type, NotificationType.CAMPAIGN_REJECTED);
    ok(n.owner?.message.includes("Thiếu dự toán"));
    equal(n.owner?.email, true);
    equal(n.backers, undefined);
  });

  it("tạm dừng: báo cả chủ dự án và người ủng hộ", () => {
    const n = campaignStatusNotifications(campaign, CampaignStatus.ACTIVE, CampaignStatus.PAUSED, "Đang xác minh");
    equal(n.owner?.type, NotificationType.CAMPAIGN_PAUSED);
    equal(n.backers?.type, NotificationType.CAMPAIGN_PAUSED);
    equal(n.backers?.link, "/du-an/c1");
  });

  it("phân biệt phát hành lần đầu và tiếp tục sau tạm dừng", () => {
    equal(campaignStatusNotifications(campaign, CampaignStatus.APPROVED, CampaignStatus.ACTIVE).owner?.type, NotificationType.CAMPAIGN_APPROVED);
    equal(campaignStatusNotifications(campaign, CampaignStatus.PAUSED, CampaignStatus.ACTIVE).owner?.type, NotificationType.CAMPAIGN_RESUMED);
  });

  it("kết thúc thành công/thất bại: báo người ủng hộ", () => {
    equal(campaignStatusNotifications(campaign, CampaignStatus.ACTIVE, CampaignStatus.SUCCESS).backers?.type, NotificationType.CAMPAIGN_ENDED);
    equal(campaignStatusNotifications(campaign, CampaignStatus.ACTIVE, CampaignStatus.FAILED).backers?.type, NotificationType.CAMPAIGN_ENDED);
  });
});

describe("CampaignsService.moderate phát thông báo", () => {
  it("tạm dừng chiến dịch → báo chủ dự án và người ủng hộ (trừ chủ dự án)", async () => {
    const campaign: any = { id: "c1", title: "Thư viện", ownerId: OWNER, status: CampaignStatus.ACTIVE };
    const repo: any = {
      findOne: async () => campaign,
      save: async (c: any) => c,
    };
    const notifier = makeNotifierRecorder();
    const service = new CampaignsService(repo, makeAuditRecorder().service, notifier.service);
    await service.moderate("c1", { status: CampaignStatus.PAUSED, reason: "Xác minh báo cáo" } as any, { id: "admin", role: UserRole.ADMIN } as any);
    equal(notifier.notified.length, 1);
    equal(notifier.notified[0].userId, OWNER);
    equal(notifier.notified[0].type, NotificationType.CAMPAIGN_PAUSED);
    equal(notifier.backerNotices.length, 1);
    equal(notifier.backerNotices[0].campaignId, "c1");
    equal(notifier.backerNotices[0].excludeUserIds[0], OWNER);
  });
});
