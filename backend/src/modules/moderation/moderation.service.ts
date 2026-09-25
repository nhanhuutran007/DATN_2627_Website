import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FindOptionsWhere, In, Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { CampaignsService } from "../campaigns/campaigns.service";
import { CampaignStatus } from "../campaigns/entities/campaign.entity";
import { User } from "../users/entities/user.entity";
import {
  CreateReportDto,
  ReportQueryDto,
  ReviewReportDto,
} from "./dto/report.dto";
import { Report, ReportStatus } from "./entities/report.entity";

/** Chỉ báo cáo được chiến dịch đã công khai (người dùng có thể nhìn thấy). */
const REPORTABLE_CAMPAIGN_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

const OPEN_STATUSES = [ReportStatus.PENDING, ReportStatus.REVIEWING];

/** Ma trận xử lý: resolved/dismissed là kết luận cuối, không mở lại. */
const REVIEW_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.PENDING]: [
    ReportStatus.REVIEWING,
    ReportStatus.RESOLVED,
    ReportStatus.DISMISSED,
  ],
  [ReportStatus.REVIEWING]: [ReportStatus.RESOLVED, ReportStatus.DISMISSED],
  [ReportStatus.RESOLVED]: [],
  [ReportStatus.DISMISSED]: [],
};

const MIN_ADMIN_NOTES = 5;

export type ReportListResult = {
  items: Report[];
  total: number;
  limit: number;
  offset: number;
};

/**
 * Báo cáo vi phạm chiến dịch (UGC moderation). Người dùng gửi báo cáo; admin
 * xem hàng đợi và **tự quyết định** (human-in-the-loop) — hệ thống không tự
 * khóa/ẩn chiến dịch dựa trên số lượng báo cáo. Mọi quyết định có lý do và audit.
 */
@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,
    private readonly campaignsService: CampaignsService,
    private readonly auditService: AuditService,
  ) {}

  async createReport(dto: CreateReportDto, reporter: User): Promise<Report> {
    const campaign = await this.campaignsService.findById(dto.campaignId);

    if (!REPORTABLE_CAMPAIGN_STATUSES.includes(campaign.status)) {
      // Không tiết lộ sự tồn tại của chiến dịch chưa công khai.
      throw new NotFoundException("Campaign not found");
    }
    if (campaign.ownerId === reporter.id) {
      throw new ForbiddenException("You cannot report your own campaign");
    }

    const openReport = await this.reportRepo.findOneBy({
      reporterId: reporter.id,
      campaignId: campaign.id,
      status: In(OPEN_STATUSES),
    });
    if (openReport) {
      throw new ConflictException(
        "You already have an open report for this campaign",
      );
    }

    const saved = await this.reportRepo.save(
      this.reportRepo.create({
        reporterId: reporter.id,
        campaignId: campaign.id,
        reason: dto.reason,
        description: dto.description,
        status: ReportStatus.PENDING,
        campaignPaused: false,
      }),
    );
    await this.auditService.record({
      userId: reporter.id,
      action: "report.create",
      entity: "report",
      entityId: saved.id,
      newValues: {
        campaignId: campaign.id,
        reason: saved.reason,
        description: truncateForAudit(saved.description),
      },
    });
    return saved;
  }

  async findMine(reporter: User): Promise<Report[]> {
    return this.reportRepo.find({
      where: { reporterId: reporter.id },
      relations: { campaign: true },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async list(query: ReportQueryDto): Promise<ReportListResult> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const where: FindOptionsWhere<Report> = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.reason ? { reason: query.reason } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    };
    const [items, total] = await this.reportRepo.findAndCount({
      where,
      relations: { campaign: true, reporter: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items, total, limit, offset };
  }

  async review(id: string, dto: ReviewReportDto, admin: User): Promise<Report> {
    const report = await this.reportRepo.findOneBy({ id });
    if (!report) {
      throw new NotFoundException("Report not found");
    }

    if (!REVIEW_TRANSITIONS[report.status].includes(dto.status)) {
      throw new ConflictException(
        `Cannot move report from "${report.status}" to "${dto.status}"`,
      );
    }

    const notes = dto.adminNotes?.trim() ?? "";
    const isConclusion =
      dto.status === ReportStatus.RESOLVED ||
      dto.status === ReportStatus.DISMISSED;
    if (isConclusion && notes.length < MIN_ADMIN_NOTES) {
      throw new BadRequestException(
        `adminNotes (at least ${MIN_ADMIN_NOTES} characters) is required to resolve or dismiss a report`,
      );
    }

    const pauseCampaign = dto.pauseCampaign === true;
    if (pauseCampaign && dto.status !== ReportStatus.RESOLVED) {
      throw new BadRequestException(
        "pauseCampaign is only allowed when resolving a report",
      );
    }
    if (pauseCampaign && !report.campaignId) {
      throw new BadRequestException("This report is not linked to a campaign");
    }

    // Tạm dừng trước khi lưu báo cáo: nếu chiến dịch không ở trạng thái
    // tạm dừng được (vd. không còn `active`), moderate() ném 409 và báo cáo
    // giữ nguyên, admin không bị hiểu nhầm là đã tạm dừng.
    if (pauseCampaign && report.campaignId) {
      await this.campaignsService.moderate(
        report.campaignId,
        {
          status: CampaignStatus.PAUSED,
          reason: `Tạm dừng do báo cáo vi phạm: ${notes}`,
        },
        admin,
      );
    }

    const previous = {
      status: report.status,
      adminNotes: report.adminNotes ?? null,
    };
    report.status = dto.status;
    if (notes) {
      report.adminNotes = notes;
    }
    report.resolvedBy = admin.id;
    report.resolvedAt = isConclusion ? new Date() : null;
    report.campaignPaused = report.campaignPaused || pauseCampaign;

    const saved = await this.reportRepo.save(report);
    await this.auditService.record({
      userId: admin.id,
      action: "report.review",
      entity: "report",
      entityId: saved.id,
      oldValues: previous,
      newValues: {
        status: saved.status,
        adminNotes: truncateForAudit(saved.adminNotes ?? null),
        campaignPaused: pauseCampaign,
        campaignId: saved.campaignId ?? null,
      },
    });
    return saved;
  }
}
