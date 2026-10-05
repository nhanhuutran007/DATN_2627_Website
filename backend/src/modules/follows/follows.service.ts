import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { CampaignsService } from "../campaigns/campaigns.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
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
 * (xem `NotificationsService.notifyCampaignBackers`). Thao tác idempotent.
 */
@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(CampaignFollow)
    private readonly followRepo: Repository<CampaignFollow>,
    private readonly campaignsService: CampaignsService,
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
