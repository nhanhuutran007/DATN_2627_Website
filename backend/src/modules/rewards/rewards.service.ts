import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, IsNull, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CreateRewardTierDto,
  RewardClaimView,
  RewardTierView,
  UpdateRewardTierDto,
} from "./dto/reward.dto";
import { RewardTier } from "./entities/reward-tier.entity";

export const MAX_TIERS_PER_CAMPAIGN = 10;

/** Chiến dịch đã công khai: ai cũng xem được mức quà. */
const PUBLIC_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

/** Chưa phát hành: chủ dự án sửa mọi thông tin của mức quà. */
const DRAFT_STATUSES = [CampaignStatus.DRAFT, CampaignStatus.REJECTED, CampaignStatus.NEEDS_INFO, CampaignStatus.PENDING];

/** Đã kết thúc: không thêm/sửa mức quà nữa. */
const CLOSED_STATUSES = [
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.CANCELLED,
  CampaignStatus.ENDED,
];

export function toTierView(tier: RewardTier): RewardTierView {
  const limit = tier.quantityLimit ?? null;
  return {
    id: tier.id,
    campaignId: tier.campaignId,
    title: tier.title,
    description: tier.description,
    minAmount: Number(tier.minAmount),
    quantityLimit: limit,
    claimedCount: tier.claimedCount,
    remaining: limit === null ? null : Math.max(0, limit - tier.claimedCount),
    estimatedDelivery: tier.estimatedDelivery ?? null,
    sortOrder: tier.sortOrder,
    isActive: tier.isActive,
  };
}

/**
 * Mức ủng hộ & phần quà. Sau khi chiến dịch phát hành, số tiền tối thiểu không
 * đổi được và giới hạn suất không thấp hơn số đã nhận — người đã ủng hộ không
 * bị đổi luật. Mức đã có người nhận chỉ tắt được, không xóa.
 */
@Injectable()
export class RewardsService {
  constructor(
    @InjectRepository(RewardTier)
    private readonly tierRepo: Repository<RewardTier>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    private readonly campaignsService: CampaignsService,
    private readonly auditService: AuditService,
  ) {}

  private assertCanManage(campaign: Campaign, user: User): void {
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Chỉ chủ dự án được quản lý mức quà.");
    }
  }

  private async getTier(id: string): Promise<RewardTier> {
    const tier = await this.tierRepo.findOne({ where: { id } });
    if (!tier) {
      throw new NotFoundException("Reward tier not found");
    }
    return tier;
  }

  /** Công khai: mức quà đang nhận của chiến dịch đã công khai. */
  async listPublic(campaignId: string): Promise<RewardTierView[]> {
    const campaign = await this.campaignsService.findById(campaignId);
    if (!PUBLIC_STATUSES.includes(campaign.status)) {
      throw new NotFoundException("Campaign not found");
    }
    const tiers = await this.tierRepo.find({
      where: { campaignId, isActive: true },
      order: { sortOrder: "ASC", minAmount: "ASC" },
    });
    return tiers.map(toTierView);
  }

  /** Chủ dự án/admin: mọi mức (kể cả đang tắt). */
  async listForManage(campaignId: string, user: User): Promise<RewardTierView[]> {
    const campaign = await this.campaignsService.findById(campaignId);
    this.assertCanManage(campaign, user);
    const tiers = await this.tierRepo.find({ where: { campaignId }, order: { sortOrder: "ASC", minAmount: "ASC" } });
    return tiers.map(toTierView);
  }

  async create(campaignId: string, dto: CreateRewardTierDto, user: User): Promise<RewardTierView> {
    const campaign = await this.campaignsService.findById(campaignId);
    this.assertCanManage(campaign, user);
    if (CLOSED_STATUSES.includes(campaign.status)) {
      throw new ConflictException("Chiến dịch đã kết thúc, không thêm mức quà được.");
    }
    const count = await this.tierRepo.count({ where: { campaignId } });
    if (count >= MAX_TIERS_PER_CAMPAIGN) {
      throw new BadRequestException(`Tối đa ${MAX_TIERS_PER_CAMPAIGN} mức quà mỗi chiến dịch.`);
    }
    const saved = await this.tierRepo.save(
      this.tierRepo.create({
        campaignId,
        title: dto.title,
        description: dto.description,
        minAmount: dto.minAmount,
        quantityLimit: dto.quantityLimit ?? null,
        estimatedDelivery: dto.estimatedDelivery ?? null,
        sortOrder: dto.sortOrder ?? count,
        claimedCount: 0,
        isActive: true,
      }),
    );
    await this.auditService.record({
      userId: user.id,
      action: "reward_tier.create",
      entity: "reward_tier",
      entityId: saved.id,
      newValues: { campaignId, title: saved.title, minAmount: dto.minAmount, quantityLimit: saved.quantityLimit ?? null },
    });
    return toTierView(saved);
  }

  async update(id: string, dto: UpdateRewardTierDto, user: User): Promise<RewardTierView> {
    const tier = await this.getTier(id);
    const campaign = await this.campaignsService.findById(tier.campaignId);
    this.assertCanManage(campaign, user);
    if (CLOSED_STATUSES.includes(campaign.status)) {
      throw new ConflictException("Chiến dịch đã kết thúc, không sửa mức quà được.");
    }
    const published = !DRAFT_STATUSES.includes(campaign.status);
    if (published && dto.minAmount !== undefined && Number(dto.minAmount) !== Number(tier.minAmount)) {
      throw new ConflictException("Không đổi được số tiền tối thiểu sau khi chiến dịch đã phát hành.");
    }
    if (dto.quantityLimit !== undefined && dto.quantityLimit !== null && dto.quantityLimit < tier.claimedCount) {
      throw new ConflictException(`Giới hạn không được thấp hơn số suất đã nhận (${tier.claimedCount}).`);
    }

    const before = toTierView(tier);
    if (dto.title !== undefined) tier.title = dto.title;
    if (dto.description !== undefined) tier.description = dto.description;
    if (dto.minAmount !== undefined) tier.minAmount = dto.minAmount;
    if (dto.quantityLimit !== undefined) tier.quantityLimit = dto.quantityLimit;
    if (dto.estimatedDelivery !== undefined) tier.estimatedDelivery = dto.estimatedDelivery;
    if (dto.sortOrder !== undefined) tier.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) tier.isActive = dto.isActive;
    const saved = await this.tierRepo.save(tier);
    await this.auditService.record({
      userId: user.id,
      action: "reward_tier.update",
      entity: "reward_tier",
      entityId: id,
      oldValues: { title: before.title, minAmount: before.minAmount, quantityLimit: before.quantityLimit, isActive: before.isActive },
      newValues: { title: saved.title, minAmount: Number(saved.minAmount), quantityLimit: saved.quantityLimit ?? null, isActive: saved.isActive },
    });
    return toTierView(saved);
  }

  async remove(id: string, user: User): Promise<void> {
    const tier = await this.getTier(id);
    const campaign = await this.campaignsService.findById(tier.campaignId);
    this.assertCanManage(campaign, user);
    const linked = await this.donationRepo.count({ where: { rewardTierId: id } });
    if (tier.claimedCount > 0 || linked > 0) {
      throw new ConflictException("Mức quà đã có người chọn: hãy tắt (ngừng nhận) thay vì xóa.");
    }
    await this.tierRepo.softDelete({ id });
    await this.auditService.record({
      userId: user.id,
      action: "reward_tier.delete",
      entity: "reward_tier",
      entityId: id,
      oldValues: { campaignId: tier.campaignId, title: tier.title },
    });
  }

  /** Danh sách người nhận quà để chủ dự án chuẩn bị giao (chỉ khoản đã xác nhận). */
  async listClaims(campaignId: string, user: User): Promise<RewardClaimView[]> {
    const campaign = await this.campaignsService.findById(campaignId);
    this.assertCanManage(campaign, user);
    const donations = await this.donationRepo.find({
      where: { campaignId, status: DonationStatus.COMPLETED, rewardTierId: Not(IsNull()) },
      relations: { user: true, rewardTier: true },
      order: { completedAt: "DESC" },
      take: 500,
    });
    return donations.map((d) => ({
      donationId: d.id,
      tierId: d.rewardTierId as string,
      tierTitle: d.rewardTier?.title ?? "",
      amount: Number(d.amount),
      backerName: d.isAnonymous ? "Ẩn danh" : (d.user?.name ?? "Người ủng hộ"),
      completedAt: d.completedAt ?? null,
    }));
  }
}
