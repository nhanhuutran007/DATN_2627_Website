import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Not, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { COUNTED_DONATION_STATUSES, Donation } from "../donations/entities/donation.entity";
import { RewardRecipient } from "../donations/entities/reward-recipient.entity";
import { OrgPermission } from "../organizations/entities/organization-member.entity";
import { OrganizationAccessService } from "../organizations/organization-access.service";
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

const DAY_MS = 86_400_000;
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
/** Ngày (yyyy-mm-dd) theo giờ Việt Nam. */
const vnDay = (date: Date) => new Date(date.getTime() + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);

/**
 * Hạn chọn quà và ngày dự kiến giao phải khớp thời gian gây quỹ (như Kickstarter): chỉ chọn quà
 * trong lúc đang gây quỹ (hạn chọn không muộn hơn ngày kết thúc), và quà chỉ giao được sau khi
 * chiến dịch kết thúc (ngày giao không sớm hơn ngày kết thúc).
 */
export function tierDateProblem(
  campaign: Pick<Campaign, "endDate">,
  dates: { availableUntil?: string | Date | null; estimatedDelivery?: string | null },
  now = new Date(),
): string | null {
  const end = new Date(campaign.endDate);
  if (Number.isNaN(end.getTime())) return null;
  if (dates.availableUntil) {
    const until = new Date(dates.availableUntil);
    if (until.getTime() <= now.getTime()) return "Hạn chọn quà phải ở tương lai.";
    // Lệch 1 ngày cho chọn ngày theo giờ địa phương.
    if (until.getTime() > end.getTime() + DAY_MS) return "Hạn chọn quà không được muộn hơn ngày kết thúc gây quỹ.";
  }
  if (dates.estimatedDelivery) {
    const delivery = String(dates.estimatedDelivery).slice(0, 10);
    if (delivery < vnDay(end)) return "Ngày dự kiến giao quà phải sau ngày kết thúc gây quỹ.";
    if (delivery > vnDay(new Date(end.getTime() + 730 * DAY_MS))) {
      return "Ngày dự kiến giao quà không quá 2 năm sau ngày kết thúc gây quỹ.";
    }
  }
  return null;
}

/** Mức quà còn chọn được: đang mở, còn suất, chưa quá hạn chọn. */
export function isTierAvailable(tier: RewardTier, now = new Date()): boolean {
  const soldOut = tier.quantityLimit != null && tier.claimedCount >= tier.quantityLimit;
  const expired = !!tier.availableUntil && new Date(tier.availableUntil).getTime() <= now.getTime();
  return tier.isActive && !soldOut && !expired;
}

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
    imageUrl: tier.imageUrl ?? null,
    items: tier.items ?? [],
    requiresShipping: tier.requiresShipping ?? true,
    availableUntil: tier.availableUntil ?? null,
    available: isTierAvailable(tier),
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
    @InjectRepository(RewardRecipient)
    private readonly recipientRepo: Repository<RewardRecipient>,
    @Optional()
    // Kiểu `X | null` làm metadata thành Object: phải chỉ rõ token, nếu không Nest âm thầm inject null.
    @Inject(OrganizationAccessService)
    private readonly access: OrganizationAccessService | null = null,
  ) {}

  /** Chủ dự án, admin, hoặc đội ngũ tổ chức có quyền "Quản lý mức quà". */
  private async assertCanManage(campaign: Campaign, user: User): Promise<void> {
    const message = "Bạn không có quyền quản lý mức quà của chiến dịch này.";
    if (this.access) {
      await this.access.assertCanOnCampaign(campaign, user, OrgPermission.MANAGE_REWARDS, message);
      return;
    }
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(message);
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
    await this.assertCanManage(campaign, user);
    const tiers = await this.tierRepo.find({ where: { campaignId }, order: { sortOrder: "ASC", minAmount: "ASC" } });
    return tiers.map(toTierView);
  }

  async create(campaignId: string, dto: CreateRewardTierDto, user: User): Promise<RewardTierView> {
    const campaign = await this.campaignsService.findById(campaignId);
    await this.assertCanManage(campaign, user);
    if (CLOSED_STATUSES.includes(campaign.status)) {
      throw new ConflictException("Chiến dịch đã kết thúc, không thêm mức quà được.");
    }
    const dateProblem = tierDateProblem(campaign, dto);
    if (dateProblem) throw new BadRequestException(dateProblem);
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
        imageUrl: dto.imageUrl || null,
        items: dto.items?.length ? dto.items : null,
        requiresShipping: dto.requiresShipping ?? true,
        availableUntil: dto.availableUntil ? new Date(dto.availableUntil) : null,
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
    await this.assertCanManage(campaign, user);
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
    // Đã có người chọn quà gửi tận nơi: không chuyển sang "không cần giao" (sẽ mất địa chỉ đã hứa gửi).
    if (dto.requiresShipping === false && tier.requiresShipping && tier.claimedCount > 0) {
      throw new ConflictException("Đã có người nhận quà này nên không đổi sang quà không cần giao được.");
    }

    // Chỉ kiểm tra ngày được đổi (không chặn sửa tên/mô tả của mức quà cũ).
    const changedDates = {
      ...(dto.availableUntil !== undefined &&
      (dto.availableUntil ? new Date(dto.availableUntil).getTime() : null) !==
        (tier.availableUntil ? new Date(tier.availableUntil).getTime() : null)
        ? { availableUntil: dto.availableUntil }
        : {}),
      ...(dto.estimatedDelivery !== undefined && dto.estimatedDelivery !== tier.estimatedDelivery
        ? { estimatedDelivery: dto.estimatedDelivery }
        : {}),
    };
    const dateProblem = tierDateProblem(campaign, changedDates);
    if (dateProblem) throw new BadRequestException(dateProblem);

    const before = toTierView(tier);
    if (dto.title !== undefined) tier.title = dto.title;
    if (dto.description !== undefined) tier.description = dto.description;
    if (dto.minAmount !== undefined) tier.minAmount = dto.minAmount;
    if (dto.quantityLimit !== undefined) tier.quantityLimit = dto.quantityLimit;
    if (dto.estimatedDelivery !== undefined) tier.estimatedDelivery = dto.estimatedDelivery;
    if (dto.sortOrder !== undefined) tier.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) tier.isActive = dto.isActive;
    if (dto.imageUrl !== undefined) tier.imageUrl = dto.imageUrl || null;
    if (dto.items !== undefined) tier.items = dto.items.length ? dto.items : null;
    if (dto.requiresShipping !== undefined) tier.requiresShipping = dto.requiresShipping;
    if (dto.availableUntil !== undefined) tier.availableUntil = dto.availableUntil ? new Date(dto.availableUntil) : null;
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
    await this.assertCanManage(campaign, user);
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

  /**
   * Danh sách người nhận quà (như backer report của Kickstarter): khoản đã thu tiền và
   * khoản cam kết đang được tính, kèm trạng thái để biết khoản nào cần gửi quà.
   */
  async listClaims(campaignId: string, user: User): Promise<RewardClaimView[]> {
    const campaign = await this.campaignsService.findById(campaignId);
    await this.assertCanManage(campaign, user);
    const donations = await this.donationRepo.find({
      where: { campaignId, status: In([...COUNTED_DONATION_STATUSES]), rewardTierId: Not(IsNull()) },
      relations: { user: true, rewardTier: true },
      order: { createdAt: "DESC" },
      take: 500,
    });
    const recipients = donations.length
      ? await this.recipientRepo.find({ where: { donationId: In(donations.map((d) => d.id)) } })
      : [];
    const recipientOf = new Map(recipients.map((r) => [r.donationId, r]));
    return donations.map((d) => {
      const recipient = recipientOf.get(d.id);
      return {
        donationId: d.id,
        tierId: d.rewardTierId as string,
        tierTitle: d.rewardTier?.title ?? "",
        amount: Number(d.amount),
        backerName: d.isAnonymous ? "Ẩn danh" : (d.user?.name ?? "Người ủng hộ"),
        status: d.status,
        completedAt: d.completedAt ?? d.pledgedAt ?? null,
        recipient: recipient ? { name: recipient.recipientName, phone: recipient.phone, address: recipient.address } : null,
      };
    });
  }
}
