import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";

import { CampaignsService } from "../campaigns/campaigns.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { COUNTED_DONATION_STATUSES } from "../donations/entities/donation.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import type { User } from "../users/entities/user.entity";
import { CampaignFollow } from "./entities/campaign-follow.entity";

/** Chiến dịch người dùng nhìn thấy được (xem số người theo dõi). */
const VISIBLE_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

/** Nhắc người theo dõi trước khi hết hạn bao lâu (Kickstarter nhắc 48 giờ trước). */
export const REMINDER_WINDOW_HOURS = 48;
const HOUR_MS = 3_600_000;
const REMINDER_BATCH = 200;

/** Chỉ theo dõi mới được khi chiến dịch còn đang diễn ra. */
const FOLLOWABLE_STATUSES = [CampaignStatus.APPROVED, CampaignStatus.ACTIVE, CampaignStatus.PAUSED];

export type FollowStatus = { following: boolean; followerCount: number };

export type FollowedCampaign = {
  followedAt: Date;
  campaign: Pick<
    Campaign,
    "id" | "title" | "category" | "status" | "goalAmount" | "currentAmount" | "endDate" | "imageUrl" | "location"
  >;
};

export type FollowedCampaignPage = { items: FollowedCampaign[]; total: number; limit: number; offset: number };

/**
 * Theo dõi chiến dịch: người theo dõi nhận thông báo cập nhật như người ủng hộ
 * (xem `NotificationsService.notifyCampaignBackers`) và một lời nhắc khi dự án sắp
 * hết hạn. Ủng hộ thành công thì tự động theo dõi (`DonationsService`). Idempotent.
 */
@Injectable()
export class FollowsService {
  private readonly logger = new Logger(FollowsService.name);

  constructor(
    @InjectRepository(CampaignFollow)
    private readonly followRepo: Repository<CampaignFollow>,
    private readonly campaignsService: CampaignsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async status(campaignId: string, user?: User | null): Promise<FollowStatus> {
    await this.getVisibleCampaign(campaignId);
    return this.currentStatus(campaignId, user?.id);
  }

  async follow(campaignId: string, user: User): Promise<FollowStatus> {
    const campaign = await this.getVisibleCampaign(campaignId);
    if (campaign.ownerId === user.id) {
      throw new BadRequestException("Bạn là chủ dự án nên đã nhận mọi thông báo của chiến dịch này.");
    }
    if (!FOLLOWABLE_STATUSES.includes(campaign.status)) {
      throw new BadRequestException("Chiến dịch đã kết thúc, không thể theo dõi thêm.");
    }
    // INSERT IGNORE: bấm theo dõi hai lần (hoặc hai tab cùng lúc) không lỗi trùng khóa.
    await this.followRepo
      .createQueryBuilder()
      .insert()
      .into(CampaignFollow)
      .values({ userId: user.id, campaignId })
      .orIgnore()
      .execute();
    return this.currentStatus(campaignId, user.id);
  }

  async unfollow(campaignId: string, user: User): Promise<FollowStatus> {
    await this.followRepo.delete({ userId: user.id, campaignId });
    return this.currentStatus(campaignId, user.id);
  }

  async listMine(user: User, limit = 20, offset = 0): Promise<FollowedCampaignPage> {
    const [follows, total] = await this.followRepo.findAndCount({
      where: { userId: user.id, campaign: { status: In(VISIBLE_STATUSES) } },
      relations: { campaign: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    const items = follows
      .filter((follow): follow is CampaignFollow & { campaign: Campaign } => Boolean(follow.campaign))
      .map((follow) => ({
        followedAt: follow.createdAt,
        campaign: {
          id: follow.campaign.id,
          title: follow.campaign.title,
          category: follow.campaign.category,
          status: follow.campaign.status,
          goalAmount: follow.campaign.goalAmount,
          currentAmount: follow.campaign.currentAmount,
          endDate: follow.campaign.endDate,
          imageUrl: follow.campaign.imageUrl,
          location: follow.campaign.location,
        },
      }));
    return { items, total, limit, offset };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleEndingReminders(): Promise<void> {
    const sent = await this.sendEndingReminders();
    if (sent > 0) this.logger.log(`Follow ending reminders sent: ${sent}`);
  }

  /**
   * Nhắc người đang theo dõi khi dự án đang gây quỹ còn dưới 48 giờ. Bỏ qua người đã
   * ủng hộ (kể cả đang cam kết) vì lời nhắc là để kịp ủng hộ. Đánh dấu `reminded_at`
   * có điều kiện trước khi gửi nên job chạy chồng không nhắc hai lần.
   */
  async sendEndingReminders(now: Date = new Date()): Promise<number> {
    const until = new Date(now.getTime() + REMINDER_WINDOW_HOURS * HOUR_MS);
    const due = await this.followRepo
      .createQueryBuilder("f")
      .innerJoinAndSelect("f.campaign", "c")
      .where("f.reminded_at IS NULL")
      .andWhere("c.status = :status", { status: CampaignStatus.ACTIVE })
      .andWhere("c.end_date > :now AND c.end_date <= :until", { now, until })
      .andWhere(
        `NOT EXISTS (SELECT 1 FROM donations d WHERE d.campaign_id = f.campaign_id
          AND d.user_id = f.user_id AND d.status IN (:...counted))`,
        { counted: COUNTED_DONATION_STATUSES },
      )
      .orderBy("c.end_date", "ASC")
      .take(REMINDER_BATCH)
      .getMany();

    let sent = 0;
    for (const follow of due) {
      const claimed = await this.followRepo.update({ id: follow.id, remindedAt: IsNull() }, { remindedAt: now });
      if (!claimed.affected || !follow.campaign) continue;
      const hours = Math.max(1, Math.round((new Date(follow.campaign.endDate).getTime() - now.getTime()) / HOUR_MS));
      await this.notificationsService
        .notify({
          userId: follow.userId,
          type: NotificationType.SYSTEM,
          title: "Dự án bạn theo dõi sắp kết thúc",
          message: `"${follow.campaign.title}" chỉ còn khoảng ${hours} giờ gây quỹ. Ủng hộ ngay nếu bạn muốn đồng hành cùng dự án.`,
          link: `/du-an/${follow.campaign.id}/ung-ho`,
          relatedId: follow.campaign.id,
          email: true,
          emailCategory: "follow_reminder",
        })
        .catch(() => undefined);
      sent += 1;
    }
    return sent;
  }

  private async currentStatus(campaignId: string, userId?: string): Promise<FollowStatus> {
    const [followerCount, following] = await Promise.all([
      this.followRepo.count({ where: { campaignId } }),
      userId ? this.followRepo.existsBy({ campaignId, userId }) : Promise.resolve(false),
    ]);
    return { following, followerCount };
  }

  private async getVisibleCampaign(campaignId: string): Promise<Campaign> {
    const campaign = await this.campaignsService.findById(campaignId);
    if (!VISIBLE_STATUSES.includes(campaign.status)) {
      // Không tiết lộ chiến dịch chưa công khai.
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }
}
