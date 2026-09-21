import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, In, MoreThan, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import type { AiFraudResponse } from "../../integrations/ai/ai.types";
import { AiService } from "../ai/ai.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import {
  Donation,
  DonationStatus,
} from "../donations/entities/donation.entity";
import { User } from "../users/entities/user.entity";
import {
  RiskQueryDto,
  UpdateRiskStatusDto,
} from "./dto/admin.dto";
import {
  RiskAlert,
  RiskAlertLevel,
  RiskAlertStatus,
  RiskEntityType,
  RiskMethod,
  RiskReason,
} from "./entities/risk-alert.entity";

const SCAN_STATUSES = [
  CampaignStatus.PENDING,
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
];

const HOUR_MS = 3_600_000;

export type GenerateWarningsResult = {
  aiAvailable: boolean;
  scanned: number;
  flagged: number;
};

@Injectable()
export class RiskAlertService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(RiskAlert)
    private readonly riskAlertRepo: Repository<RiskAlert>,
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
  ) {}

  async generateWarnings(admin: User, limit = 20): Promise<GenerateWarningsResult> {
    const campaigns = await this.campaignRepo.find({
      where: { status: In(SCAN_STATUSES) },
      order: { backerCount: "DESC" },
      take: Math.max(1, limit),
    });

    let aiAvailable = true;
    const keptIds: string[] = [];

    for (const campaign of campaigns) {
      const result = await this.aiService.getFraudScore({
        campaignId: campaign.id,
      });

      let level: RiskAlertLevel;
      let score: number;
      let method: RiskMethod;
      let reasons: RiskReason[];
      let evidences: Record<string, number>;

      if (result.available) {
        const data = result.data;
        level = customToLevel(data.level);
        score = Math.round(data.riskScore * 100) / 100;
        method = data.method === "RULE" ? RiskMethod.RULE : RiskMethod.AI;
        reasons = data.reasons.map((reason) => ({
          group: reason.group,
          label: reason.label,
          weight: reason.weight,
        }));
        evidences = data.evidences;
      } else {
        aiAvailable = false;
        const fallback = await this.ruleFallback(campaign.id);
        level = fallback.level;
        score = fallback.score;
        method = RiskMethod.RULE;
        reasons = fallback.reasons;
        evidences = fallback.evidences;
      }

      if (level === RiskAlertLevel.LOW) continue;

      const alert = await this.upsertCampaignAlert(
        campaign,
        level,
        score,
        method,
        reasons,
        evidences,
      );
      keptIds.push(alert.id);
    }

    await this.resolveStaleOpenAlerts(admin, keptIds);

    const summary = {
      aiAvailable,
      scanned: campaigns.length,
      flagged: keptIds.length,
    };
    await this.auditService.record({
      userId: admin.id,
      action: "risk_alert.generate",
      entity: "risk_alert",
      newValues: { ...summary, alertIds: keptIds },
    });
    return summary;
  }

  async list(query: RiskQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const where: FindOptionsWhere<RiskAlert> = {};
    if (query.status) where.status = query.status;
    if (query.level) where.level = query.level;

    const [items, total] = await this.riskAlertRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items, total, limit, offset };
  }

  async updateStatus(
    id: string,
    dto: UpdateRiskStatusDto,
    admin: User,
  ): Promise<RiskAlert> {
    const alert = await this.riskAlertRepo.findOneBy({ id });
    if (!alert) {
      throw new NotFoundException("Risk alert not found");
    }

    const previousStatus = alert.status;
    alert.status = dto.status;
    alert.resolvedBy = admin.id;
    alert.resolvedAt = new Date();
    const saved = await this.riskAlertRepo.save(alert);
    await this.auditService.record({
      userId: admin.id,
      action: "risk_alert.status.update",
      entity: "risk_alert",
      entityId: saved.id,
      oldValues: { status: previousStatus },
      newValues: { status: saved.status },
    });
    return saved;
  }

  private async upsertCampaignAlert(
    campaign: Campaign,
    level: RiskAlertLevel,
    score: number,
    method: RiskMethod,
    reasons: RiskReason[],
    evidences: Record<string, number>,
  ): Promise<RiskAlert> {
    const existing = await this.riskAlertRepo.findOneBy({
      entityType: RiskEntityType.CAMPAIGN,
      entityId: campaign.id,
      status: RiskAlertStatus.OPEN,
    });

    if (existing) {
      existing.level = level;
      existing.score = score;
      existing.method = method;
      existing.reasons = reasons;
      existing.evidences = evidences;
      return this.riskAlertRepo.save(existing);
    }

    return this.riskAlertRepo.save(
      this.riskAlertRepo.create({
        entityType: RiskEntityType.CAMPAIGN,
        entityId: campaign.id,
        entityName: campaign.title,
        level,
        score,
        method,
        reasons,
        evidences,
      }),
    );
  }

  private async resolveStaleOpenAlerts(admin: User, keptIds: string[]): Promise<void> {
    if (keptIds.length === 0) return;

    const stale = await this.riskAlertRepo.findBy({
      status: RiskAlertStatus.OPEN,
    });
    for (const candidate of stale) {
      if (keptIds.includes(candidate.id)) continue;
      candidate.status = RiskAlertStatus.RESOLVED;
      candidate.resolvedBy = admin.id;
      candidate.resolvedAt = new Date();
      await this.riskAlertRepo.save(candidate);
    }
  }

  private async ruleFallback(campaignId: string): Promise<{
    level: RiskAlertLevel;
    score: number;
    reasons: RiskReason[];
    evidences: Record<string, number>;
  }> {
    const lastHour = new Date(Date.now() - HOUR_MS);

    const [total, failed, recent] = await Promise.all([
      this.donationRepo.count({ where: { campaignId } }),
      this.donationRepo.count({
        where: { campaignId, status: DonationStatus.FAILED },
      }),
      this.donationRepo.count({
        where: { campaignId, createdAt: MoreThan(lastHour) },
      }),
    ]);

    const completed = await this.donationRepo.find({
      where: { campaignId, status: DonationStatus.COMPLETED },
      select: { amount: true },
    });
    const amounts = completed.map((donation) => Number(donation.amount) || 0);
    const zScore = this.amountZScore(amounts);

    const reasons: RiskReason[] = [];
    if (recent >= 3) {
      reasons.push({ group: "frequency", label: "Nhiều giao dịch trong thời gian ngắn", weight: 0.4 });
    }
    if (failed >= 2) {
      reasons.push({ group: "payment", label: "Tỷ lệ thanh toán thất bại cao", weight: 0.35 });
    }
    if (zScore >= 2) {
      reasons.push({ group: "amount", label: "Giá trị tài trợ bất thường so với lịch sử", weight: 0.25 });
    }

    const evidences = {
      contribution_count_1h: recent,
      failed_payment_count: failed,
      total_payment_count: total,
      amount_z_score: Number(zScore.toFixed(6)),
    };

    if (reasons.length === 0) {
      return { level: RiskAlertLevel.LOW, score: 0, reasons: [], evidences };
    }

    const score =
      Math.round(
        Math.min(1, reasons.reduce((sum, reason) => sum + reason.weight, 0)) * 100,
      ) / 100;
    const level =
      score >= 0.6
        ? RiskAlertLevel.HIGH
        : score >= 0.3
          ? RiskAlertLevel.MEDIUM
          : RiskAlertLevel.LOW;

    return { level, score, reasons, evidences };
  }

  private amountZScore(amounts: number[]): number {
    if (amounts.length < 2) return 0;
    const mean = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance =
      amounts.reduce((sum, amount) => sum + (amount - mean) ** 2, 0) / amounts.length;
    const std = Math.sqrt(variance);
    if (!Number.isFinite(std) || std <= 0) return 0;
    return Math.max(...amounts.map((amount) => (amount - mean) / std));
  }
}

function customToLevel(level: AiFraudResponse["level"]): RiskAlertLevel {
  switch (level) {
    case "HIGH":
      return RiskAlertLevel.HIGH;
    case "MEDIUM":
      return RiskAlertLevel.MEDIUM;
    default:
      return RiskAlertLevel.LOW;
  }
}