import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { MediaFile, MediaPurpose } from "../media/entities/media-file.entity";
import { MEDIA_URL_PREFIX } from "../media/media.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { User, UserRole } from "../users/entities/user.entity";
import {
  CampaignUpdatesQueryDto,
  CreateMilestoneDto,
  CreateMilestoneUpdateDto,
  MilestoneQueryDto,
  ReceiptAttachmentDto,
  UpdateMilestoneDto,
} from "./dto/progress.dto";
import { MilestoneRevision, type MilestoneRevisionValues } from "./entities/milestone-revision.entity";
import { Milestone } from "./entities/milestone.entity";
import { MilestoneUpdateAttachment } from "./entities/milestone-update-attachment.entity";
import { MilestoneUpdate } from "./entities/milestone-update.entity";

const LOCKED_STATUSES = [
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.CANCELLED,
  CampaignStatus.ENDED,
];

/**
 * Trạng thái được đăng cập nhật/đánh dấu hoàn thành mốc: đã phát hành, kể cả sau
 * khi gây quỹ thành công (tiền thường được chi sau thời điểm này). Chiến dịch
 * thất bại/bị hủy đã hoàn tiền nên không còn khoản chi để báo cáo.
 */
const REPORTABLE_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.ENDED,
];

/**
 * Trạng thái một mốc theo thời gian: quá hạn mà chưa hoàn thành là `overdue`;
 * nếu chủ dự án đã đăng cập nhật cho mốc đó sau hạn thì là `overdue_explained`.
 */
export type MilestoneState = "completed" | "on_track" | "overdue" | "overdue_explained";

/** Tóm tắt minh bạch của cả chiến dịch, hiển thị công khai. */
export type TransparencyStatus = "no_plan" | "on_track" | "late" | "late_explained";

export type CampaignProgressResult = {
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  totalBudget: number;
  totalExpense: number;
  totalRaised: number;
  backerCount: number;
  lastUpdateAt: Date | null;
  revisionCount: number;
  transparency: TransparencyStatus;
  milestoneStates: { id: string; state: MilestoneState }[];
};

/** Trường của mốc được ghi vào lịch sử thay đổi (sau khi phát hành cần lý do). */
const REVISION_FIELDS = ["title", "description", "targetDate", "budget"] as const;
type RevisionField = (typeof REVISION_FIELDS)[number];

function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeField(field: RevisionField, value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (field === "targetDate") return toIsoOrNull(value);
  if (field === "budget") return Number(value);
  return String(value);
}

function formatDateVi(value: string | null | undefined): string {
  if (!value) return "chưa đặt";
  return new Date(value).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepo: Repository<Milestone>,
    @InjectRepository(MilestoneUpdate)
    private readonly milestoneUpdateRepo: Repository<MilestoneUpdate>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(MediaFile)
    private readonly mediaRepo: Repository<MediaFile>,
    @InjectRepository(MilestoneUpdateAttachment)
    private readonly attachmentRepo: Repository<MilestoneUpdateAttachment>,
    @InjectRepository(MilestoneRevision)
    private readonly revisionRepo: Repository<MilestoneRevision>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findCampaignMilestones(
    campaignId: string,
    query: MilestoneQueryDto = {},
  ): Promise<{ items: Milestone[]; total: number }> {
    const [items, total] = await Promise.all([
      this.milestoneRepo.find({
        where: { campaignId },
        order: { sortOrder: "ASC", createdAt: "ASC" },
        skip: query.offset ?? 0,
        take: query.limit ?? 100,
      }),
      this.milestoneRepo.count({ where: { campaignId } }),
    ]);
    return { items, total };
  }

  async createMilestone(
    campaignId: string,
    dto: CreateMilestoneDto,
    user: User,
  ): Promise<Milestone> {
    const campaign = await this.getCampaign(campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);

    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(campaignId));
    const milestone = this.milestoneRepo.create({
      campaignId,
      title: dto.title,
      description: dto.description,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      budget: dto.budget,
      sortOrder,
      isCompleted: false,
    });
    const saved = await this.milestoneRepo.save(milestone);
    await this.auditService.record({
      userId: user.id,
      action: "milestone.create",
      entity: "milestone",
      entityId: saved.id,
      newValues: {
        campaignId,
        title: saved.title,
        budget: saved.budget,
        targetDate: saved.targetDate ?? null,
      },
    });
    return saved;
  }

  async updateMilestone(
    id: string,
    dto: UpdateMilestoneDto,
    user: User,
  ): Promise<Milestone> {
    const milestone = await this.getMilestone(id);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);

    const { changeReason, sortOrder } = dto;
    const current = milestone as unknown as Record<string, unknown>;
    const oldValues: MilestoneRevisionValues = {};
    const newValues: MilestoneRevisionValues = {};
    for (const field of REVISION_FIELDS) {
      if (dto[field] === undefined) continue;
      const before = normalizeField(field, current[field]);
      const after = normalizeField(field, dto[field]);
      if (before === after) continue;
      Object.assign(oldValues, { [field]: before });
      Object.assign(newValues, { [field]: after });
    }
    const sortChanged = sortOrder !== undefined && sortOrder !== milestone.sortOrder;
    if (Object.keys(newValues).length === 0 && !sortChanged) {
      return milestone;
    }

    const published = REPORTABLE_STATUSES.includes(campaign.status);
    const reason = changeReason?.trim() ?? "";
    const scheduleChanged = "targetDate" in newValues || "budget" in newValues;
    if (published && Object.keys(newValues).length > 0 && !reason) {
      throw new BadRequestException(
        "Chiến dịch đã phát hành: cần nêu lý do thay đổi mốc (lý do được công khai cho người ủng hộ).",
      );
    }
    if (published && milestone.isCompleted && scheduleChanged) {
      throw new ConflictException("Mốc đã hoàn thành, không thể đổi hạn hoặc ngân sách.");
    }

    if (newValues.title !== undefined) milestone.title = newValues.title ?? milestone.title;
    if (newValues.description !== undefined) milestone.description = newValues.description ?? undefined;
    if (newValues.budget !== undefined) milestone.budget = newValues.budget ?? undefined;
    if (newValues.targetDate !== undefined) {
      milestone.targetDate = newValues.targetDate ? new Date(newValues.targetDate) : undefined;
      // Hạn mới: job nhắc quá hạn tính lại từ đầu.
      milestone.overdueNotifiedAt = null;
    }
    if (sortChanged) milestone.sortOrder = sortOrder;
    const saved = await this.milestoneRepo.save(milestone);

    await this.auditService.record({
      userId: user.id,
      action: "milestone.update",
      entity: "milestone",
      entityId: saved.id,
      oldValues: { ...oldValues, ...(sortChanged ? { sortOrder: current.sortOrder } : {}) },
      newValues: {
        ...newValues,
        ...(sortChanged ? { sortOrder } : {}),
        ...(reason ? { changeReason: truncateForAudit(reason) } : {}),
      },
    });

    if (published && Object.keys(newValues).length > 0) {
      await this.revisionRepo.save(
        this.revisionRepo.create({ milestoneId: saved.id, changedBy: user.id, reason, oldValues, newValues }),
      );
      if (scheduleChanged) {
        const parts: string[] = [];
        if ("targetDate" in newValues) {
          parts.push(`hạn từ ${formatDateVi(oldValues.targetDate)} sang ${formatDateVi(newValues.targetDate)}`);
        }
        if ("budget" in newValues) {
          const fmt = (v: number | null | undefined) => `${Number(v ?? 0).toLocaleString("vi-VN")} ₫`;
          parts.push(`ngân sách từ ${fmt(oldValues.budget)} sang ${fmt(newValues.budget)}`);
        }
        await this.notificationsService.notifyCampaignBackers(
          campaign.id,
          {
            type: NotificationType.MILESTONE_RESCHEDULED,
            title: "Dự án bạn ủng hộ thay đổi kế hoạch",
            message: `Chiến dịch "${campaign.title}" đổi ${parts.join(", ")} của mốc "${saved.title}". Lý do: ${reason}`,
            link: `/du-an/${campaign.id}#ke-hoach`,
            relatedId: saved.id,
          },
          [campaign.ownerId],
        );
      }
    }
    return saved;
  }

  async removeMilestone(id: string, user: User): Promise<void> {
    const milestone = await this.getMilestone(id);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertEditable(campaign);
    if (REPORTABLE_STATUSES.includes(campaign.status)) {
      throw new ConflictException(
        "Không thể xóa mốc sau khi chiến dịch phát hành; hãy đổi hạn/ngân sách kèm lý do.",
      );
    }

    const snapshot = {
      campaignId: milestone.campaignId,
      title: milestone.title,
      budget: milestone.budget,
      isCompleted: milestone.isCompleted,
    };
    await this.milestoneRepo.remove(milestone);
    await this.auditService.record({
      userId: user.id,
      action: "milestone.delete",
      entity: "milestone",
      entityId: id,
      oldValues: snapshot,
    });
  }

  async completeMilestone(id: string, user: User): Promise<Milestone> {
    const milestone = await this.getMilestone(id);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertReportable(campaign);

    const wasCompleted = milestone.isCompleted;
    milestone.isCompleted = true;
    milestone.completedAt = new Date();
    const saved = await this.milestoneRepo.save(milestone);
    await this.auditService.record({
      userId: user.id,
      action: "milestone.complete",
      entity: "milestone",
      entityId: saved.id,
      newValues: { isCompleted: true, completedAt: saved.completedAt },
    });
    if (!wasCompleted) {
      await this.notificationsService.notifyCampaignBackers(
        campaign.id,
        {
          type: NotificationType.MILESTONE_COMPLETED,
          title: "Dự án bạn ủng hộ vừa hoàn thành một mốc",
          message: `Chiến dịch "${campaign.title}" đã hoàn thành mốc "${saved.title}".`,
          link: `/du-an/${campaign.id}`,
          relatedId: saved.id,
        },
        [campaign.ownerId],
      );
    }
    return saved;
  }

  async addMilestoneUpdate(
    milestoneId: string,
    dto: CreateMilestoneUpdateDto,
    user: User,
  ): Promise<MilestoneUpdate> {
    const milestone = await this.getMilestone(milestoneId);
    const campaign = await this.getCampaign(milestone.campaignId);
    this.assertCanManage(campaign, user);
    this.assertReportable(campaign);

    const expense = Number(dto.expenseAmount ?? 0);
    const receiptInputs = dto.receipts ?? [];
    if (expense > 0 && receiptInputs.length === 0) {
      throw new BadRequestException("Báo cáo chi tiêu cần kèm ít nhất một chứng từ (ảnh hóa đơn/biên lai).");
    }
    if (expense > 0) {
      await this.assertExpenseWithinRaised(campaign.id, expense);
    }
    const receipts = await this.resolveReceipts(receiptInputs, user);

    const update = this.milestoneUpdateRepo.create({
      milestoneId,
      content: dto.content.trim(),
      imageUrl: dto.imageUrl,
      expenseAmount: expense > 0 ? expense : undefined,
      attachments: receipts,
    });
    const saved = await this.milestoneUpdateRepo.save(update);
    await this.auditService.record({
      userId: user.id,
      action: "milestone_update.create",
      entity: "milestone_update",
      entityId: saved.id,
      newValues: {
        milestoneId,
        expenseAmount: saved.expenseAmount ?? null,
        receiptMediaIds: receipts.map((receipt) => receipt.mediaFileId),
        content: truncateForAudit(saved.content),
      },
    });
    await this.notificationsService.notifyCampaignBackers(
      campaign.id,
      {
        type: NotificationType.PROGRESS_UPDATE,
        title: "Có báo cáo tiến độ mới",
        message: `Chiến dịch "${campaign.title}" vừa cập nhật tiến độ mốc "${milestone.title}".`,
        link: `/du-an/${campaign.id}#nhat-ky`,
        relatedId: saved.id,
      },
      [campaign.ownerId],
    );
    return saved;
  }

  async listMilestoneUpdates(milestoneId: string): Promise<MilestoneUpdate[]> {
    return this.milestoneUpdateRepo.find({
      where: { milestoneId },
      relations: { attachments: true },
      order: { createdAt: "DESC", attachments: { sortOrder: "ASC" } },
    });
  }

  /** Nhật ký tiến độ của cả chiến dịch (mới nhất trước), kèm tên mốc và chứng từ. */
  async listCampaignUpdates(
    campaignId: string,
    query: CampaignUpdatesQueryDto = {},
  ): Promise<{ items: (MilestoneUpdate & { milestoneTitle: string })[]; total: number }> {
    await this.getCampaign(campaignId);
    const milestones = await this.milestoneRepo.find({ where: { campaignId } });
    if (milestones.length === 0) {
      return { items: [], total: 0 };
    }
    const titles = new Map(milestones.map((milestone) => [milestone.id, milestone.title]));
    const [updates, total] = await this.milestoneUpdateRepo.findAndCount({
      where: { milestoneId: In([...titles.keys()]) },
      relations: { attachments: true },
      order: { createdAt: "DESC", attachments: { sortOrder: "ASC" } },
      skip: query.offset ?? 0,
      take: query.limit ?? 20,
    });
    const items = updates.map((update) =>
      Object.assign(update, { milestoneTitle: titles.get(update.milestoneId) ?? "" }),
    );
    return { items, total };
  }

  async getCampaignProgress(
    campaignId: string,
    now: Date = new Date(),
  ): Promise<CampaignProgressResult> {
    const campaign = await this.getCampaign(campaignId);
    const [milestones, raised] = await Promise.all([
      this.milestoneRepo.find({ where: { campaignId } }),
      this.donationRepo.sum("amount", {
        campaignId,
        status: DonationStatus.COMPLETED,
      }),
    ]);

    const totalBudget = milestones.reduce(
      (total, milestone) => total + Number(milestone.budget ?? 0),
      0,
    );

    const milestoneIds = milestones.map((milestone) => milestone.id);
    const [updates, revisionCount] =
      milestoneIds.length > 0
        ? await Promise.all([
            this.milestoneUpdateRepo.find({ where: { milestoneId: In(milestoneIds) } }),
            this.revisionRepo.count({ where: { milestoneId: In(milestoneIds) } }),
          ])
        : [[] as MilestoneUpdate[], 0];
    const totalExpense = updates.reduce(
      (total, update) => total + Number(update.expenseAmount ?? 0),
      0,
    );

    const milestoneStates = milestones.map((milestone) => ({
      id: milestone.id,
      state: this.milestoneState(milestone, updates, now),
    }));
    const overdue = milestoneStates.filter((item) => item.state === "overdue").length;
    const explained = milestoneStates.filter((item) => item.state === "overdue_explained").length;
    const transparency: TransparencyStatus =
      milestones.length === 0 ? "no_plan" : overdue > 0 ? "late" : explained > 0 ? "late_explained" : "on_track";
    const lastUpdateAt = updates.reduce<Date | null>((latest, update) => {
      const created = update.createdAt ? new Date(update.createdAt) : null;
      return created && (!latest || created > latest) ? created : latest;
    }, null);

    return {
      totalMilestones: milestones.length,
      completedMilestones: milestones.filter((milestone) => milestone.isCompleted).length,
      overdueMilestones: overdue + explained,
      totalBudget,
      totalExpense,
      totalRaised: Number(raised ?? 0),
      backerCount: campaign.backerCount,
      lastUpdateAt,
      revisionCount,
      transparency,
      milestoneStates,
    };
  }

  /** Lịch sử thay đổi kế hoạch (mới nhất trước), công khai — không kèm người sửa. */
  async listMilestoneRevisions(
    campaignId: string,
  ): Promise<(MilestoneRevision & { milestoneTitle: string })[]> {
    await this.getCampaign(campaignId);
    const milestones = await this.milestoneRepo.find({ where: { campaignId } });
    if (milestones.length === 0) return [];
    const titles = new Map(milestones.map((milestone) => [milestone.id, milestone.title]));
    const revisions = await this.revisionRepo.find({
      where: { milestoneId: In([...titles.keys()]) },
      order: { createdAt: "DESC" },
      take: 50,
    });
    return revisions.map((revision) =>
      Object.assign(revision, { milestoneTitle: titles.get(revision.milestoneId) ?? "" }),
    );
  }

  private milestoneState(milestone: Milestone, updates: MilestoneUpdate[], now: Date): MilestoneState {
    if (milestone.isCompleted) return "completed";
    const target = milestone.targetDate ? new Date(milestone.targetDate) : null;
    if (!target || target.getTime() > now.getTime()) return "on_track";
    const explained = updates.some(
      (update) =>
        update.milestoneId === milestone.id &&
        update.createdAt !== undefined &&
        new Date(update.createdAt).getTime() >= target.getTime(),
    );
    return explained ? "overdue_explained" : "overdue";
  }

  private async getCampaign(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  private async getMilestone(id: string): Promise<Milestone> {
    const milestone = await this.milestoneRepo.findOne({ where: { id } });
    if (!milestone) {
      throw new NotFoundException("Milestone not found");
    }
    return milestone;
  }

  private async nextSortOrder(campaignId: string): Promise<number> {
    const max = await this.milestoneRepo.maximum("sortOrder", { campaignId });
    return (max ?? 0) + 1;
  }

  private assertCanManage(campaign: Campaign, user: User): void {
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        "You can only manage milestones of your own campaigns",
      );
    }
  }

  private assertReportable(campaign: Campaign): void {
    if (!REPORTABLE_STATUSES.includes(campaign.status)) {
      throw new ConflictException(
        "Chỉ báo cáo tiến độ cho chiến dịch đã phát hành và chưa thất bại/hủy.",
      );
    }
  }

  /** Tổng chi đã báo cáo (kể cả khoản mới) không vượt số tiền đã huy động được xác nhận. */
  private async assertExpenseWithinRaised(campaignId: string, expense: number): Promise<void> {
    const { totalExpense, totalRaised } = await this.getCampaignProgress(campaignId);
    if (totalExpense + expense > totalRaised) {
      throw new ConflictException(
        "Tổng chi tiêu báo cáo vượt số tiền đã huy động được xác nhận.",
      );
    }
  }

  /**
   * Chứng từ phải là ảnh `expense_receipt` do chính người đăng tải lên (admin
   * được dùng ảnh của chủ dự án) và chưa gắn vào bài cập nhật nào khác.
   */
  private async resolveReceipts(
    inputs: ReceiptAttachmentDto[],
    user: User,
  ): Promise<MilestoneUpdateAttachment[]> {
    if (inputs.length === 0) return [];
    const ids = [...new Set(inputs.map((input) => input.mediaId))];
    if (ids.length !== inputs.length) {
      throw new BadRequestException("Mỗi chứng từ chỉ được đính kèm một lần.");
    }
    const [files, used] = await Promise.all([
      this.mediaRepo.find({ where: { id: In(ids) } }),
      this.attachmentRepo.count({ where: { mediaFileId: In(ids) } }),
    ]);
    if (used > 0) {
      throw new ConflictException("Chứng từ này đã được dùng cho một báo cáo khác.");
    }
    const byId = new Map(files.map((file) => [file.id, file]));
    return inputs.map((input, index) => {
      const file = byId.get(input.mediaId);
      if (!file || file.purpose !== MediaPurpose.EXPENSE_RECEIPT) {
        throw new BadRequestException("Chứng từ không tồn tại hoặc không phải ảnh chứng từ.");
      }
      if (file.ownerId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException("Bạn chỉ được đính kèm chứng từ do mình tải lên.");
      }
      const attachment = new MilestoneUpdateAttachment();
      attachment.mediaFileId = file.id;
      attachment.url = `${MEDIA_URL_PREFIX}${file.storageKey}`;
      attachment.caption = input.caption?.trim() || null;
      attachment.sortOrder = index;
      return attachment;
    });
  }

  private assertEditable(campaign: Campaign): void {
    if (LOCKED_STATUSES.includes(campaign.status)) {
      throw new ConflictException(
        "Milestones cannot be modified after a campaign is closed",
      );
    }
  }
}