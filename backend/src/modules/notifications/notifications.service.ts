import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import type { EmailGateway } from "../../integrations/email/email.gateway";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
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
};

export type NotificationPage = {
  items: Notification[];
  total: number;
  unread: number;
  page: number;
  limit: number;
};

const TITLE_MAX = 200;

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
  ) {}

  /**
   * Tạo thông báo (và email nếu yêu cầu). Không bao giờ ném lỗi: thông báo
   * hỏng không được làm hỏng nghiệp vụ chính (duyệt, thanh toán, tiến độ).
   */
  async notify(input: NotifyInput | NotifyInput[]): Promise<void> {
    const inputs = (Array.isArray(input) ? input : [input]).filter((i) => i.userId);
    if (inputs.length === 0) return;
    try {
      await this.notificationRepo.save(
        inputs.map((i) =>
          this.notificationRepo.create({
            userId: i.userId,
            type: i.type,
            title: i.title.slice(0, TITLE_MAX),
            message: i.message,
            link: i.link ?? null,
            relatedId: i.relatedId,
            isRead: false,
          }),
        ),
      );
    } catch (error) {
      this.logger.error(`Không lưu được ${inputs.length} thông báo: ${(error as Error).message}`);
      return;
    }

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
            subject: i.title,
            paragraphs: [i.message],
            link: i.link,
          })
          .catch((error: Error) =>
            this.logger.error(`Gửi email thông báo cho user ${user.id} thất bại: ${error.message}`),
          );
      }
    } catch (error) {
      this.logger.error(`Không gửi được email thông báo: ${(error as Error).message}`);
    }
  }

  /** Gửi cho mọi người đã ủng hộ thành công chiến dịch (mỗi người một thông báo). */
  async notifyCampaignBackers(
    campaignId: string,
    base: Omit<NotifyInput, "userId">,
    excludeUserIds: string[] = [],
  ): Promise<number> {
    try {
      const rows: Array<{ userId: string }> = await this.donationRepo
        .createQueryBuilder("d")
        .select("DISTINCT d.user_id", "userId")
        .where("d.campaign_id = :campaignId", { campaignId })
        .andWhere("d.status = :status", { status: DonationStatus.COMPLETED })
        .getRawMany();
      const exclude = new Set(excludeUserIds);
      const userIds = rows.map((r) => r.userId).filter((id) => id && !exclude.has(id));
      await this.notify(userIds.map((userId) => ({ ...base, userId })));
      return userIds.length;
    } catch (error) {
      this.logger.error(`Không tìm được người ủng hộ của chiến dịch ${campaignId}: ${(error as Error).message}`);
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
