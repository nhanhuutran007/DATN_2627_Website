import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import type { EmailCategory } from "../../integrations/email/email-categories";
import type { ChargeFailedDetails, EmailGateway } from "../../integrations/email/email.gateway";
import { COUNTED_DONATION_STATUSES, Donation } from "../donations/entities/donation.entity";
import { CampaignFollow } from "../follows/entities/campaign-follow.entity";
import { User } from "../users/entities/user.entity";
import { NotificationQueryDto } from "./dto/notification.dto";
import { Notification, NotificationType } from "./entities/notification.entity";

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Đường dẫn tương đối trong web, vd. `/du-an/<id>`. */
  link?: string;
  relatedId?: string;
  /** Gửi kèm email (chỉ cho sự kiện quan trọng, vd. kết quả xét duyệt). */
  email?: boolean;
  /**
   * Khoản ủng hộ mới cho chủ dự án (`DONATION_RECEIVED`, `relatedId` = chiến dịch): nếu còn thông báo
   * cùng chiến dịch chưa đọc thì cộng dồn vào đó thay vì thêm một dòng mới.
   */
  donationGroup?: { campaignTitle: string; amount: number };
  /** Tiêu đề email riêng (mặc định dùng `title`); nên cụ thể để Gmail không gom nhầm các thư. */
  emailSubject?: string;
  /** Email dùng template "Cần xử lý" (trừ tiền cam kết thất bại) thay cho email thông báo chung. */
  chargeFailed?: ChargeFailedDetails;
  /** Loại email cho cài đặt bật/tắt của admin; thiếu thì suy từ `type` (`emailCategoryForType`). */
  emailCategory?: EmailCategory;
};

const CATEGORY_BY_TYPE: Record<NotificationType, EmailCategory> = {
  [NotificationType.CAMPAIGN_APPROVED]: "campaign_owner",
  [NotificationType.CAMPAIGN_REJECTED]: "campaign_owner",
  [NotificationType.CAMPAIGN_NEEDS_INFO]: "campaign_owner",
  [NotificationType.CAMPAIGN_PAUSED]: "campaign_owner",
  [NotificationType.CAMPAIGN_RESUMED]: "campaign_owner",
  [NotificationType.CAMPAIGN_ENDED]: "campaign_owner",
  [NotificationType.MILESTONE_OVERDUE]: "campaign_owner",
  [NotificationType.DONATION_RECEIVED]: "donation_received",
  [NotificationType.DONATION_CONFIRMED]: "donation_receipt",
  [NotificationType.MILESTONE_COMPLETED]: "campaign_updates",
  [NotificationType.PROGRESS_UPDATE]: "campaign_updates",
  [NotificationType.MILESTONE_RESCHEDULED]: "campaign_updates",
  [NotificationType.REFUND_APPROVED]: "refunds",
  [NotificationType.REFUND_REJECTED]: "refunds",
  [NotificationType.DONATION_REFUNDED]: "refunds",
  [NotificationType.COMMENT_NEW]: "comments",
  [NotificationType.COMMENT_REPLY]: "comments",
  [NotificationType.COMMENT_HIDDEN]: "comments",
  [NotificationType.REPORT_RESOLVED]: "other",
  [NotificationType.SYSTEM]: "other",
};

/** Loại email của một thông báo: ghi rõ ở `emailCategory`, không có thì suy từ loại thông báo. */
export function emailCategoryOf(input: Pick<NotifyInput, "type" | "emailCategory">): EmailCategory {
  return input.emailCategory ?? CATEGORY_BY_TYPE[input.type] ?? "other";
}

export type NotificationPage = {
  items: Notification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
};

const TITLE_MAX = 200;

function formatVnd(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} ₫`;
}

/** Tiêu đề + nội dung của thông báo ủng hộ đã gộp `count` khoản. */
export function donationGroupText(campaignTitle: string, count: number, total: number): { title: string; message: string } {
  return count <= 1
    ? { title: "Có khoản ủng hộ mới", message: `Chiến dịch "${campaignTitle}" vừa nhận ${formatVnd(total)} (đã xác nhận).` }
    : {
        title: `Có ${count} khoản ủng hộ mới`,
        message: `Chiến dịch "${campaignTitle}" đã nhận ${count} khoản ủng hộ mới, tổng ${formatVnd(total)} (đã xác nhận).`,
      };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @Inject("EmailGateway")
    private readonly emailGateway: EmailGateway,
    @InjectRepository(CampaignFollow)
    private readonly followRepo: Repository<CampaignFollow>,
  ) {}

  /**
   * Tạo thông báo (và email nếu yêu cầu). Không bao giờ ném lỗi: thông báo
   * hỏng không được làm hỏng nghiệp vụ chính (duyệt, thanh toán, tiến độ).
   */
  async notify(input: NotifyInput | NotifyInput[]): Promise<void> {
    const inputs = (Array.isArray(input) ? input : [input]).filter((i) => i.userId);
    if (inputs.length === 0) return;
    const fresh: NotifyInput[] = [];
    for (const i of inputs) {
      if (!(await this.mergeDonationGroup(i))) fresh.push(i);
    }
    try {
      if (fresh.length > 0) {
        await this.notificationRepo.save(
          fresh.map((i) =>
            this.notificationRepo.create({
              userId: i.userId,
              type: i.type,
              title: i.title.slice(0, TITLE_MAX),
              message: i.message,
              link: i.link ?? null,
              relatedId: i.relatedId,
              isRead: false,
              groupCount: 1,
              groupAmount: i.donationGroup?.amount ?? null,
            }),
          ),
        );
      }
    } catch (error) {
      this.logger.error(`Không lưu được ${fresh.length} thông báo: ${(error as Error).message}`);
      return;
    }

    await this.sendEmails(inputs);
  }

  /**
   * Cộng khoản ủng hộ vào thông báo chưa đọc cùng chiến dịch (đưa lên đầu danh sách). Trả `false` khi
   * không gộp được (không phải khoản ủng hộ, chưa có thông báo chưa đọc, thông báo cũ thiếu tổng tiền,
   * hoặc người dùng vừa đọc) để `notify` tạo dòng mới như thường.
   */
  private async mergeDonationGroup(input: NotifyInput): Promise<boolean> {
    const group = input.donationGroup;
    if (!group || input.type !== NotificationType.DONATION_RECEIVED || !input.relatedId) return false;
    try {
      const existing = await this.notificationRepo.findOne({
        where: { userId: input.userId, type: NotificationType.DONATION_RECEIVED, relatedId: input.relatedId, isRead: false },
        order: { createdAt: "DESC" },
      });
      if (!existing || existing.groupAmount === null || existing.groupAmount === undefined) return false;
      const count = existing.groupCount + 1;
      const total = Number(existing.groupAmount) + group.amount;
      const text = donationGroupText(group.campaignTitle, count, total);
      // Có điều kiện isRead=false: người dùng vừa bấm đọc thì để khoản mới thành thông báo riêng.
      const result = await this.notificationRepo.update(
        { id: existing.id, isRead: false },
        { groupCount: count, groupAmount: total, title: text.title.slice(0, TITLE_MAX), message: text.message, createdAt: new Date() },
      );
      return Boolean(result.affected);
    } catch (error) {
      this.logger.error(`Không gộp được thông báo ủng hộ: ${(error as Error).message}`);
      return false;
    }
  }

  private async sendEmails(inputs: NotifyInput[]): Promise<void> {
    const emailInputs = inputs.filter((i) => i.email);
    if (emailInputs.length === 0) return;
    try {
      const users = await this.userRepo.find({ where: { id: In(emailInputs.map((i) => i.userId)) } });
      const byId = new Map(users.map((u) => [u.id, u]));
      for (const i of emailInputs) {
        const user = byId.get(i.userId);
        if (!user) continue;
        await this.emailGateway
          .sendNotification({
            to: user.email,
            name: user.name,
            subject: i.emailSubject ?? i.title,
            paragraphs: [i.message],
            link: i.link,
            chargeFailed: i.chargeFailed,
            category: emailCategoryOf(i),
          })
          .catch((error: Error) =>
            this.logger.error(`Gửi email thông báo cho user ${user.id} thất bại: ${error.message}`),
          );
      }
    } catch (error) {
      this.logger.error(`Không gửi được email thông báo: ${(error as Error).message}`);
    }
  }

  /**
   * Gửi cho mọi người đã ủng hộ thành công và mọi người đang theo dõi chiến
   * dịch (mỗi người một thông báo, không trùng).
   */
  async notifyCampaignBackers(
    campaignId: string,
    base: Omit<NotifyInput, "userId">,
    excludeUserIds: string[] = [],
  ): Promise<number> {
    try {
      const [backers, follows] = await Promise.all([
        this.donationRepo
          .createQueryBuilder("d")
          .select("DISTINCT d.user_id", "userId")
          .where("d.campaign_id = :campaignId", { campaignId })
          // Người đang cam kết (chưa bị trừ tiền) cũng là người ủng hộ cần nhận tin.
          .andWhere("d.status IN (:...statuses)", { statuses: COUNTED_DONATION_STATUSES })
          .getRawMany<{ userId: string }>(),
        this.followRepo.find({ select: { userId: true }, where: { campaignId } }),
      ]);
      const exclude = new Set(excludeUserIds);
      const userIds = [...new Set([...backers, ...follows].map((r) => r.userId))].filter(
        (id) => id && !exclude.has(id),
      );
      await this.notify(userIds.map((userId) => ({ emailCategory: "campaign_backers" as const, ...base, userId })));
      return userIds.length;
    } catch (error) {
      this.logger.error(`Không tìm được người ủng hộ của chiến dịch ${campaignId}: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Tin cập nhật của dự án (bài cập nhật, tiến độ, mốc): chỉ gửi người đang theo dõi, kèm email.
   * Ủng hộ thành công đã tự động theo dõi, nên người ủng hộ nhận tin cho tới khi tự bỏ theo dõi.
   * `onlyUserIds`: giới hạn thêm (vd. bài chỉ dành cho người ủng hộ).
   */
  async notifyCampaignFollowers(
    campaignId: string,
    base: Omit<NotifyInput, "userId" | "email">,
    excludeUserIds: string[] = [],
    onlyUserIds?: string[],
  ): Promise<number> {
    try {
      const follows = await this.followRepo.find({ select: { userId: true }, where: { campaignId } });
      const exclude = new Set(excludeUserIds);
      const only = onlyUserIds ? new Set(onlyUserIds) : null;
      const userIds = [...new Set(follows.map((r) => r.userId))].filter(
        (id) => id && !exclude.has(id) && (!only || only.has(id)),
      );
      await this.notify(
        userIds.map((userId) => ({ emailCategory: "campaign_updates" as const, ...base, userId, email: true })),
      );
      return userIds.length;
    } catch (error) {
      this.logger.error(`Không tìm được người theo dõi của chiến dịch ${campaignId}: ${(error as Error).message}`);
      return 0;
    }
  }

  async listForUser(userId: string, query: NotificationQueryDto): Promise<NotificationPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { userId, ...(query.unread ? { isRead: false } : {}) };
    const [items, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unread = await this.unreadCount(userId);
    return { items, total, unread, page, limit };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({ where: { id, userId } });
    if (!notification) {
      throw new NotFoundException("Notification not found");
    }
    if (!notification.isRead) {
      notification.isRead = true;
      await this.notificationRepo.save(notification);
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
    return { updated: result.affected ?? 0 };
  }
}
