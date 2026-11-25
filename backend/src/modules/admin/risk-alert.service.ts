import { BadRequestException, Inject, Injectable, Logger, NotFoundException, Optional } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, In, Like, MoreThan, Not, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import type { AiFraudResponse } from "../../integrations/ai/ai.types";
import { AiService, logAmountZScore, maxDonationsPerDonor } from "../ai/ai.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import {
  COUNTED_DONATION_STATUSES,
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
import { type PledgeIntegrity, PledgeIntegrityService } from "./pledge-integrity.service";

const SCAN_STATUSES = [
  CampaignStatus.PENDING,
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  // Đã thành công nhưng chưa giải ngân: vẫn soi để admin biết trước khi chuyển tiền.
  CampaignStatus.SUCCESS,
];

/** Ngưỡng mức cảnh báo của dịch vụ AI (dùng cho dấu hiệu tài khoản clone). */
function integrityLevel(score: number): RiskAlertLevel {
  return score >= 0.7 ? RiskAlertLevel.HIGH : score >= 0.35 ? RiskAlertLevel.MEDIUM : RiskAlertLevel.LOW;
}
const LEVEL_RANK: Record<RiskAlertLevel, number> = {
  [RiskAlertLevel.LOW]: 0,
  [RiskAlertLevel.MEDIUM]: 1,
  [RiskAlertLevel.HIGH]: 2,
};

const HOUR_MS = 3_600_000;

export type GenerateWarningsResult = {
  aiAvailable: boolean;
  scanned: number;
  flagged: number;
};

@Injectable()
export class RiskAlertService {
  private readonly logger = new Logger(RiskAlertService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(RiskAlert)
    private readonly riskAlertRepo: Repository<RiskAlert>,
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
    @Optional()
    @Inject(PledgeIntegrityService)
    private readonly integrity: PledgeIntegrityService | null = null,
  ) {}

  /** Quét định kỳ để cảnh báo (và chặn giải ngân) không phụ thuộc admin bấm "Quét". */
  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledScan(): Promise<void> {
    try {
      const result = await this.generateWarnings(null, 50);
      if (result.flagged > 0) this.logger.log(`Risk scan: ${JSON.stringify(result)}`);
    } catch (error) {
      this.logger.error(`Quét cảnh báo rủi ro định kỳ thất bại: ${(error as Error).message}`);
    }
  }

  /** Tài khoản nghi là clone của một chiến dịch (tính lại tại thời điểm xem). */
  async pledgeSuspects(campaignId: string): Promise<PledgeIntegrity> {
    if (!this.integrity) throw new NotFoundException("Chưa bật phân tích cam kết");
    return this.integrity.analyze(campaignId);
  }

  /** `admin` = null: lần quét tự động của hệ thống. */
  async generateWarnings(admin: Pick<User, "id"> | null, limit = 20): Promise<GenerateWarningsResult> {
    let campaigns = await this.campaignRepo.find({
      where: { status: In(SCAN_STATUSES) },
      order: { backerCount: "DESC" },
      take: Math.max(1, limit),
    });
    if (this.integrity) {
      const disbursed = await this.integrity.disbursedIds(campaigns.map((c) => c.id)).catch(() => new Set<string>());
      campaigns = campaigns.filter((c) => !disbursed.has(c.id));
    }

    let aiAvailable = true;
    const keptIds: string[] = [];

    for (const campaign of campaigns) {
      const integrity = this.integrity ? await this.integrity.analyze(campaign.id).catch(() => null) : null;
      const result = await this.aiService.getFraudScore({ campaignId: campaign.id }, integrity?.features ?? {});

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

      // Dấu hiệu tài khoản clone luôn được tính ở backend: vẫn có khi AI chưa chạy hoặc bản AI cũ chưa có luật.
      if (integrity && integrity.reasons.length > 0) {
        const known = new Set(reasons.map((reason) => reason.group));
        reasons = [...reasons, ...integrity.reasons.filter((reason) => !known.has(reason.group))].sort((a, b) => b.weight - a.weight);
        score = Math.max(score, Math.round(integrity.score * 100) / 100);
        const fromIntegrity = integrityLevel(integrity.score);
        if (LEVEL_RANK[fromIntegrity] > LEVEL_RANK[level]) level = fromIntegrity;
        evidences = { ...evidences, ...integrity.features };
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

    // Chỉ đóng cảnh báo cũ khi lần quét thực sự chấm lại được chiến dịch nào đó
    if (campaigns.length > 0) await this.resolveStaleOpenAlerts(admin, keptIds, campaigns.map((c) => c.id));

    const summary = {
      aiAvailable,
      scanned: campaigns.length,
      flagged: keptIds.length,
    };
    await this.auditService.record({
      userId: admin?.id,
      action: "risk_alert.generate",
      entity: "risk_alert",
      newValues: { ...summary, alertIds: keptIds },
    });
    return summary;
  }

  async list(query: RiskQueryDto) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const base: FindOptionsWhere<RiskAlert> = {};
    if (query.status) base.status = query.status;
    if (query.level) base.level = query.level;
    if (query.entityType) base.entityType = query.entityType;
    if (query.method) base.method = query.method;
    const keyword = query.q?.trim();
    const where = keyword
      ? [
          { ...base, entityName: Like(`%${keyword}%`) },
          { ...base, entityId: Like(`${keyword.toLowerCase()}%`) },
        ]
      : base;

    const [items, total] = await this.riskAlertRepo.findAndCount({
      where,
      // Mỗi lần quét tạo cảnh báo cùng thời điểm: xếp theo điểm để rủi ro cao nhất lên đầu hàng chờ.
      order: { score: "DESC", createdAt: "DESC" },
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

    const notes = dto.notes?.trim() ?? "";
    if (dto.status !== RiskAlertStatus.OPEN && notes.length < 5) {
      throw new BadRequestException("Cần ghi lý do (ít nhất 5 ký tự) khi xác nhận hoặc bỏ qua cảnh báo.");
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
      newValues: { status: saved.status, notes: notes || null },
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
      method: Not(RiskMethod.RECEIPT),
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

  private async resolveStaleOpenAlerts(admin: Pick<User, "id"> | null, keptIds: string[], scannedIds: string[]): Promise<void> {
    const stale = await this.riskAlertRepo.findBy({
      method: Not(RiskMethod.RECEIPT),
      status: RiskAlertStatus.OPEN,
    });
    // Chiến dịch vẫn thuộc diện quét nhưng lần này chưa tới lượt (giới hạn số lượng): giữ cảnh báo,
    // không đóng nhầm khi chưa được chấm lại.
    const scannable = new Set(
      ((await this.campaignRepo.find({ select: { id: true }, where: { status: In(SCAN_STATUSES) } })) ?? []).map((c) => c.id),
    );
    for (const candidate of stale) {
      if (keptIds.includes(candidate.id)) continue;
      if (
        candidate.entityType === RiskEntityType.CAMPAIGN &&
        candidate.entityId &&
        scannable.has(candidate.entityId) &&
        !scannedIds.includes(candidate.entityId)
      ) {
        continue;
      }
      candidate.status = RiskAlertStatus.RESOLVED;
      candidate.resolvedBy = admin?.id;
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

    const [total, failed, recentDonations, completed] = await Promise.all([
      this.donationRepo.count({ where: { campaignId } }),
      this.donationRepo.count({
        where: { campaignId, status: DonationStatus.FAILED },
      }),
      this.donationRepo.find({
        where: { campaignId, createdAt: MoreThan(lastHour) },
        select: { id: true, userId: true },
      }),
      this.donationRepo.find({
        // Gồm cả cam kết chưa trừ tiền: với gây quỹ tất cả hoặc không, đó là dòng ủng hộ chính.
        where: { campaignId, status: In([...COUNTED_DONATION_STATUSES]) },
        select: { id: true, amount: true },
      }),
    ]);
    // Cùng cách tính với đặc trưng gửi sang dịch vụ AI: theo từng tài khoản, số tiền trên log
    const recent = maxDonationsPerDonor(recentDonations);
    const zScore = logAmountZScore(completed.map((donation) => Number(donation.amount) || 0));

    const reasons: RiskReason[] = [];
    if (recent >= 3) {
      reasons.push({
        group: "frequency",
        label: "Một tài khoản ủng hộ nhiều lần trong thời gian ngắn",
        weight: 0.4,
      });
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