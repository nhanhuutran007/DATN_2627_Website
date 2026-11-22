import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Report, ReportStatus } from "../moderation/entities/report.entity";
import { Organization } from "../organizations/entities/organization.entity";
import { Milestone } from "../progress/entities/milestone.entity";
import { User } from "../users/entities/user.entity";
import {
  htmlToPlainText,
  screenCampaign,
  type ScreeningInput,
  type ScreeningResult,
} from "./campaign-screening.rules";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";
import { CampaignScreening } from "./entities/campaign-screening.entity";

export type ScreeningView = ScreeningResult & { campaignId: string; screenedAt: string; autoApproved: boolean };

const SUCCESS_STATUSES = [CampaignStatus.SUCCESS, CampaignStatus.ENDED];

/** Gom dữ liệu cho bộ luật duyệt tự động, lưu kết quả mới nhất của mỗi chiến dịch. */
@Injectable()
export class CampaignScreeningService {
  private readonly logger = new Logger(CampaignScreeningService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignScreening)
    private readonly screeningRepo: Repository<CampaignScreening>,
    private readonly auditService: AuditService,
  ) {}

  /** Chạy bộ luật và lưu kết quả (ghi đè lần trước). */
  async screen(campaignId: string, now = new Date()): Promise<ScreeningView> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    const input = await this.collect(campaign, now);
    const result = screenCampaign(input);

    const existing = await this.screeningRepo.findOne({ where: { campaignId } });
    const saved = await this.screeningRepo.save(
      this.screeningRepo.create({
        ...(existing ? { id: existing.id } : {}),
        campaignId,
        score: result.score,
        level: result.level,
        recommendation: result.recommendation,
        checks: result.checks,
        rulesVersion: result.rulesVersion,
        autoApproved: false,
        screenedAt: now,
      }),
    );
    await this.auditService.record({
      action: "campaign.screen",
      entity: "campaign",
      entityId: campaignId,
      newValues: {
        score: result.score,
        level: result.level,
        recommendation: result.recommendation,
        rulesVersion: result.rulesVersion,
      },
    });
    return this.toView(saved, result.suggestedReason);
  }

  /** Bản mới nhất; chưa có thì chạy ngay (hồ sơ gửi trước khi có tính năng này). */
  async latest(campaignId: string): Promise<ScreeningView> {
    const row = await this.screeningRepo.findOne({ where: { campaignId } });
    if (!row) return this.screen(campaignId);
    return this.toView(row, null);
  }

  async markAutoApproved(campaignId: string): Promise<void> {
    await this.screeningRepo.update({ campaignId }, { autoApproved: true });
  }

  /** Tóm tắt cho danh sách admin (điểm, mức, đề xuất) theo id chiến dịch. */
  async summaries(campaignIds: string[]): Promise<Map<string, Pick<CampaignScreening, "score" | "level" | "recommendation" | "autoApproved" | "screenedAt">>> {
    if (campaignIds.length === 0) return new Map();
    const rows = await this.screeningRepo.find({
      where: { campaignId: In(campaignIds) },
      select: { campaignId: true, score: true, level: true, recommendation: true, autoApproved: true, screenedAt: true },
    });
    return new Map(rows.map((row) => [row.campaignId, row]));
  }

  private async collect(campaign: Campaign, now: Date): Promise<ScreeningInput> {
    const manager = this.campaignRepo.manager;
    const [milestones, owner, organization, ownerCampaigns, duplicates] = await Promise.all([
      manager.getRepository(Milestone).find({ where: { campaignId: campaign.id }, select: { id: true, budget: true } }),
      manager.getRepository(User).findOne({ where: { id: campaign.ownerId } }),
      campaign.organizationId
        ? manager.getRepository(Organization).findOne({ where: { id: campaign.organizationId }, select: { id: true, status: true } })
        : Promise.resolve(null),
      this.campaignRepo.find({
        where: { ownerId: campaign.ownerId, id: Not(campaign.id) },
        select: { id: true, status: true },
      }),
      this.countDuplicates(campaign),
    ]);
    const otherIds = ownerCampaigns.map((c) => c.id);
    const upheldReports = otherIds.length
      ? await manager.getRepository(Report).count({ where: { campaignId: In(otherIds), status: ReportStatus.RESOLVED } })
      : 0;
    if (!owner) this.logger.warn(`Không tìm thấy chủ dự án của chiến dịch ${campaign.id}`);

    return {
      campaign: {
        title: campaign.title ?? "",
        descriptionText: htmlToPlainText(campaign.description ?? ""),
        goalAmount: Number(campaign.goalAmount) || 0,
        startDate: campaign.startDate ? new Date(campaign.startDate) : null,
        endDate: new Date(campaign.endDate),
        imageUrl: campaign.imageUrl,
        location: campaign.location,
        organizationId: campaign.organizationId,
      },
      milestones: milestones.map((m) => ({ budget: m.budget === null || m.budget === undefined ? null : Number(m.budget) })),
      owner: {
        emailVerified: Boolean(owner?.emailVerified),
        createdAt: owner?.createdAt ? new Date(owner.createdAt) : now,
        hasContact: Boolean(owner?.phone || owner?.contactPhone || owner?.contactEmail),
      },
      organizationStatus: organization ? String(organization.status) : null,
      history: {
        rejectedCampaigns: ownerCampaigns.filter((c) => c.status === CampaignStatus.REJECTED).length,
        successfulCampaigns: ownerCampaigns.filter((c) => SUCCESS_STATUSES.includes(c.status)).length,
        upheldReports,
      },
      duplicates,
      now,
    };
  }

  /** Chiến dịch của người khác trùng tên (không phân biệt hoa thường) hoặc trùng 200 ký tự đầu câu chuyện. */
  private async countDuplicates(campaign: Campaign): Promise<number> {
    const title = (campaign.title ?? "").trim().toLowerCase();
    const head = (campaign.description ?? "").trim().slice(0, 200);
    const qb = this.campaignRepo
      .createQueryBuilder("c")
      .where("c.ownerId <> :ownerId", { ownerId: campaign.ownerId })
      .andWhere("c.id <> :id", { id: campaign.id })
      .andWhere("c.status <> :draft", { draft: CampaignStatus.DRAFT });
    if (head.length >= 120) {
      qb.andWhere("(LOWER(TRIM(c.title)) = :title OR LEFT(TRIM(c.description), 200) = :head)", { title, head });
    } else {
      qb.andWhere("LOWER(TRIM(c.title)) = :title", { title });
    }
    return qb.getCount();
  }

  private toView(row: CampaignScreening, suggestedReason: string | null): ScreeningView {
    const reason =
      suggestedReason ??
      (row.recommendation === "needs_info"
        ? (row.checks.find((c) => c.key === "completeness")?.findings ?? [])
          .filter((f) => f.status === "fail")
          .map((f) => f.message)
          .join(" ")
        : null);
    return {
      campaignId: row.campaignId,
      score: row.score,
      level: row.level,
      recommendation: row.recommendation,
      checks: row.checks,
      suggestedReason: reason || null,
      rulesVersion: row.rulesVersion,
      autoApproved: row.autoApproved,
      screenedAt: new Date(row.screenedAt).toISOString(),
    };
  }
}
