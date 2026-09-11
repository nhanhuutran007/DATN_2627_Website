import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Repository } from "typeorm";

import { AiGateway } from "../../integrations/ai/ai.gateway";
import type {
  AiFraudResponse,
  AiPredictFeatures,
  AiPredictResponse,
  AiRecommendResponse,
  AiUserEvent,
  CampaignFeature,
} from "../../integrations/ai/ai.types";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { User } from "../users/entities/user.entity";
import {
  CreateBehaviorEventDto,
  FraudAiDto,
  PredictAiDto,
  RecommendAiDto,
} from "./dto/ai.dto";
import { BehaviorEvent, BehaviorEventType } from "./entities/behavior-event.entity";

const PUBLIC_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.SUCCESS,
  CampaignStatus.ENDED,
];

const CATEGORY_IDS: Record<string, number> = {
  "Môi trường": 0,
  "Khởi nghiệp": 1,
  "Giáo dục": 2,
  "Y tế": 3,
  "Văn hóa": 4,
  "Công nghệ": 5,
};

const EVENT_TYPE_MAP: Record<BehaviorEventType, AiUserEvent["eventType"]> = {
  [BehaviorEventType.VIEW]: "VIEW",
  [BehaviorEventType.FOLLOW]: "FOLLOW",
  [BehaviorEventType.CONTRIBUTE]: "CONTRIBUTE",
};

const DAY_MS = 86_400_000;

export type RecommendResult = {
  available: boolean;
  source?: string;
  items: {
    campaign: Campaign;
    score: number;
    reason: string;
  }[];
  detail?: string;
};

export type PredictResult =
  | { available: true; campaignId: string; data: AiPredictResponse }
  | { available: false; campaignId: string };

export type FraudResult =
  | { available: true; entityType: string; entityId: string; data: AiFraudResponse }
  | { available: false; entityType: string; entityId: string };

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BehaviorEvent)
    private readonly eventRepo: Repository<BehaviorEvent>,
    @Inject("AiGateway")
    private readonly aiGateway: AiGateway,
  ) {}

  async health(): Promise<{ available: boolean; detail?: string }> {
    try {
      await this.aiGateway.health();
      return { available: true };
    } catch (error) {
      return { available: false, detail: errorMessage(error) };
    }
  }

  async recommend(dto: RecommendAiDto, user?: User): Promise<RecommendResult> {
    const limit = dto.limit ?? 10;
    const excludeIds = dto.excludeIds ?? [];
    const candidates = await this.loadCandidates(Math.min(limit * 3, 60));

    if (candidates.length === 0) {
      return { available: true, source: "COLD_START", items: [], detail: "Không có chiến dịch để gợi ý" };
    }

    const history = user ? await this.buildHistory(user) : [];
    const preferences = dto.preferences?.length
      ? dto.preferences
      : this.derivePreferences(history);

    try {
      const response = await this.aiGateway.recommend({
        userId: user?.id ?? null,
        preferences,
        excludeIds,
        candidates: candidates.map((campaign) => this.toCampaignFeature(campaign)),
        history,
      });
      return this.attachRecommendItems(response, candidates, limit);
    } catch {
      const items = candidates
        .filter((campaign) => !excludeIds.includes(campaign.id))
        .map((campaign) => ({
          campaign,
          score: campaign.backerCount * 1.5 + campaign.viewCount * 0.7,
          reason: "Được cộng đồng đánh giá cao",
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return {
        available: true,
        source: "POPULAR_FALLBACK",
        items,
        detail: "Dịch vụ AI tạm thời gián đoạn, hiển thị dự án phổ biến",
      };
    }
  }

  async predict(dto: PredictAiDto): Promise<PredictResult> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: dto.campaignId },
      relations: { owner: true, milestones: true },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    const features = await this.buildPredictFeatures(campaign);

    try {
      const data = await this.aiGateway.predict({
        campaignId: campaign.id,
        features,
      });
      return { available: true, campaignId: campaign.id, data };
    } catch {
      return { available: false, campaignId: campaign.id };
    }
  }

  async getFraudScore(dto: FraudAiDto): Promise<FraudResult> {
    if (!dto.campaignId && !dto.userId) {
      throw new BadRequestException("Provide at least campaignId or userId");
    }

    if (dto.campaignId) {
      const entityId = dto.campaignId;
      const features = await this.buildCampaignFraudFeatures(entityId);
      try {
        const data = await this.aiGateway.getFraudScore({
          entityType: "CAMPAIGN",
          entityId,
          features,
        });
        return { available: true, entityType: "CAMPAIGN", entityId, data };
      } catch {
        return { available: false, entityType: "CAMPAIGN", entityId };
      }
    }

    const entityId = dto.userId as string;
    const features = await this.buildUserFraudFeatures(entityId);
    try {
      const data = await this.aiGateway.getFraudScore({
        entityType: "USER",
        entityId,
        features,
      });
      return { available: true, entityType: "USER", entityId, data };
    } catch {
      return { available: false, entityType: "USER", entityId };
    }
  }

  async recordEvent(dto: CreateBehaviorEventDto, user: User): Promise<BehaviorEvent> {
    const campaign = await this.campaignRepo.findOne({ where: { id: dto.campaignId } });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    const event = this.eventRepo.create({
      userId: user.id,
      campaignId: dto.campaignId,
      eventType: dto.eventType,
      category: campaign.category,
    });
    return this.eventRepo.save(event);
  }

  private async loadCandidates(limit: number): Promise<Campaign[]> {
    return this.campaignRepo.find({
      where: { status: In(PUBLIC_STATUSES) },
      relations: { owner: true, milestones: true },
      order: { backerCount: "DESC" },
      take: Math.max(1, limit),
    });
  }

  private async buildHistory(user: User): Promise<AiUserEvent[]> {
    const events = await this.eventRepo.find({
      where: { userId: user.id },
      order: { createdAt: "DESC" },
      take: 50,
    });

    const history: AiUserEvent[] = events.map((event) => ({
      campaignId: event.campaignId,
      eventType: EVENT_TYPE_MAP[event.eventType],
      category: event.category,
    }));

    const donations = await this.donationRepo.find({
      where: { userId: user.id, status: DonationStatus.COMPLETED },
      relations: { campaign: true },
      order: { createdAt: "DESC" },
      take: 50,
    });

    for (const donation of donations) {
      const category = donation.campaign?.category;
      if (!category) continue;
      history.push({ campaignId: donation.campaignId, eventType: "CONTRIBUTE", category });
    }

    return history;
  }

  private derivePreferences(history: AiUserEvent[]): string[] {
    const counts = new Map<string, number>();
    for (const event of history) {
      if (!event.category) continue;
      counts.set(event.category, (counts.get(event.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }

  private async buildPredictFeatures(campaign: Campaign): Promise<AiPredictFeatures> {
    const milestones = campaign.milestones ?? [];
    const ownerCampaignCount = await this.campaignRepo.count({
      where: { ownerId: campaign.ownerId },
    });

    return {
      categoryId: CATEGORY_IDS[campaign.category] ?? 0,
      goalAmount: Number(campaign.goalAmount) || 0,
      durationDays: this.daysBetween(campaign.startDate, campaign.endDate),
      profileScore: this.profileScore(campaign),
      contentLength: campaign.description?.length ?? 0,
      imageCount: campaign.imageUrl ? 1 : 0,
      hasVideo: Boolean(campaign.videoUrl),
      storyWordCount: (campaign.description ?? "").split(/\s+/).filter(Boolean).length,
      ownerCampaignCount,
      ownerCredentialApproved: Boolean(campaign.owner?.emailVerified),
      hasBudgetReport: milestones.some((milestone) => milestone.budget != null),
      earlyViews: campaign.viewCount,
      earlyBackers: campaign.backerCount,
    };
  }

  private async buildCampaignFraudFeatures(campaignId: string): Promise<Record<string, number>> {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [total, failed, recent] = await Promise.all([
      this.donationRepo.count({ where: { campaignId } }),
      this.donationRepo.count({ where: { campaignId, status: DonationStatus.FAILED } }),
      this.donationRepo.count({ where: { campaignId, createdAt: MoreThan(lastHour) } }),
    ]);

    const completed = await this.donationRepo.find({
      where: { campaignId, status: DonationStatus.COMPLETED },
      select: { amount: true },
    });
    const amounts = completed.map((donation) => Number(donation.amount) || 0);

    return {
      contribution_count_1h: recent,
      failed_payment_count: failed,
      total_payment_count: total,
      device_shared_accounts: 0,
      amount_z_score: this.amountZScore(amounts),
      ip_country_changes: 0,
      new_account_days: 0,
      profile_change_frequency: 0,
    };
  }

  private async buildUserFraudFeatures(userId: string): Promise<Record<string, number>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [total, failed, recent] = await Promise.all([
      this.donationRepo.count({ where: { userId } }),
      this.donationRepo.count({ where: { userId, status: DonationStatus.FAILED } }),
      this.donationRepo.count({ where: { userId, createdAt: MoreThan(lastHour) } }),
    ]);

    return {
      contribution_count_1h: recent,
      failed_payment_count: failed,
      total_payment_count: total,
      device_shared_accounts: 0,
      amount_z_score: 0,
      ip_country_changes: 0,
      new_account_days: Math.max(
        0,
        Math.floor((Date.now() - new Date(user.createdAt).getTime()) / DAY_MS),
      ),
      profile_change_frequency: 0,
    };
  }

  private amountZScore(amounts: number[]): number {
    if (amounts.length < 2) return 0;
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, amount) => sum + (amount - mean) ** 2, 0) / amounts.length;
    const std = Math.sqrt(variance);
    if (!Number.isFinite(std) || std <= 0) return 0;
    return Number(
      Math.max(...amounts.map((amount) => (amount - mean) / std)).toFixed(6),
    );
  }

  private attachRecommendItems(
    response: AiRecommendResponse,
    candidates: Campaign[],
    limit: number,
  ): RecommendResult {
    const byId = new Map(candidates.map((campaign) => [campaign.id, campaign]));
    const items = response.items
      .map((item) => {
        const campaign = byId.get(item.campaignId);
        return campaign ? { campaign, score: item.score, reason: item.reason } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, limit);

    return {
      available: true,
      source: response.source,
      items,
      detail: response.detail,
    };
  }

  private toCampaignFeature(campaign: Campaign): CampaignFeature {
    const target = Number(campaign.goalAmount) || 0;
    const current = Number(campaign.currentAmount) || 0;

    return {
      campaignId: campaign.id,
      category: campaign.category ?? "",
      title: campaign.title,
      keywords: this.extractKeywords(campaign.title, campaign.category),
      target,
      durationDays: this.daysBetween(campaign.startDate, campaign.endDate),
      profileScore: this.profileScore(campaign),
      fundedRatio: Math.min(1, target > 0 ? current / target : 0),
      daysLeft: Math.max(
        0,
        Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / DAY_MS),
      ),
      views: campaign.viewCount,
      backersCount: campaign.backerCount,
      contentLength: campaign.description?.length ?? 0,
      imageCount: campaign.imageUrl ? 1 : 0,
      hasVideo: Boolean(campaign.videoUrl),
      status: campaign.status,
    };
  }

  private profileScore(campaign: Campaign): number {
    let score = 0;
    if (campaign.title?.trim()) score += 20;
    if (campaign.description?.trim()) score += 20;
    if (campaign.category?.trim()) score += 10;
    if (campaign.imageUrl) score += 10;
    if (campaign.location) score += 5;
    if (campaign.videoUrl) score += 10;

    const milestones = campaign.milestones ?? [];
    score += Math.min(milestones.length, 3) * 5;
    if (milestones.some((milestone) => milestone.budget != null)) score += 10;

    return Math.min(100, score);
  }

  private daysBetween(start: Date, end: Date): number {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.round(diff / DAY_MS));
  }

  private extractKeywords(title: string, category: string): string[] {
    const stopWords = new Set([
      "cho", "và", "của", "dự", "án", "mới", "phát", "triển", "cộng", "đồng",
      "từ", "các", "với", "như", "được", "đã", "không", "này", "đó", "the",
      "and", "for",
    ]);
    const tokens = `${title} ${category}`
      .toLowerCase()
      .split(/[^a-z0-9àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]+/)
      .filter((word) => word.length >= 3 && !stopWords.has(word));
    return [...new Set(tokens)].slice(0, 10);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}