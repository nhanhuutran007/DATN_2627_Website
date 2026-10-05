import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, Repository, SelectQueryBuilder } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { User, UserRole } from "../users/entities/user.entity";
import { campaignStatusNotifications } from "./campaign-notifications";
import {
  CampaignQueryDto,
  CreateCampaignDto,
  ModerateCampaignDto,
  UpdateCampaignDto,
} from "./dto/campaign.dto";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";

const PUBLIC_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.SUCCESS,
  CampaignStatus.ENDED,
];

const OWNER_EDITABLE_STATUSES = [
  CampaignStatus.DRAFT,
  CampaignStatus.REJECTED,
  CampaignStatus.NEEDS_INFO,
];

const SUBMITTABLE_STATUSES = [
  CampaignStatus.DRAFT,
  CampaignStatus.REJECTED,
  CampaignStatus.NEEDS_INFO,
];

/**
 * Ma trận chuyển trạng thái cho phép khi admin duyệt (`moderate`), theo vòng đời
 * README: draft → pending ⇄ needs_info → approved → active → (paused ⇄ active)
 * → success | failed → ended; từ pending có thể rejected. Chuyển ngoài bảng này
 * bị từ chối, kể cả khi status đích hợp lệ theo DTO.
 */
const MODERATE_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [],
  [CampaignStatus.PENDING]: [
    CampaignStatus.APPROVED,
    CampaignStatus.REJECTED,
    CampaignStatus.NEEDS_INFO,
  ],
  [CampaignStatus.APPROVED]: [CampaignStatus.ACTIVE],
  [CampaignStatus.REJECTED]: [],
  [CampaignStatus.NEEDS_INFO]: [],
  [CampaignStatus.ACTIVE]: [CampaignStatus.PAUSED, CampaignStatus.ENDED],
  [CampaignStatus.PAUSED]: [CampaignStatus.ACTIVE],
  [CampaignStatus.SUCCESS]: [CampaignStatus.ENDED],
  [CampaignStatus.FAILED]: [CampaignStatus.ENDED],
  [CampaignStatus.CANCELLED]: [],
  [CampaignStatus.ENDED]: [],
};

/** Chiến dịch đã công khai (người dùng nhìn thấy được), dùng cho thống kê. */
const STATS_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

const DAY_MS = 86_400_000;

/** Tỷ lệ hoàn thành (%) theo số tiền đã xác nhận; NULLIF tránh chia cho 0. */
const PROGRESS_PERCENT_SQL = "(c.currentAmount * 100 / NULLIF(c.goalAmount, 0))";

/** Thoát ký tự đại diện của LIKE để từ khóa như "100%" được tìm đúng nghĩa đen. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export type PlatformStats = {
  /** Tổng tiền đã ghi nhận — chỉ tăng khi giao dịch được cổng thanh toán xác nhận. */
  totalRaised: number;
  totalBackers: number;
  publicCampaigns: number;
  activeCampaigns: number;
  successfulCampaigns: number;
};

export type CampaignListResult = {
  items: Campaign[];
  total: number;
  limit: number;
  offset: number;
};

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(
    query: CampaignQueryDto,
    ownerId?: string,
  ): Promise<CampaignListResult> {
    const limit = query.limit ?? 9;
    const offset = query.offset ?? 0;
    const statuses = query.status?.length ? query.status : undefined;

    // Danh sách công khai chỉ được lọc trong các trạng thái đã công khai; nếu
    // không, `?status=draft` sẽ lộ hồ sơ nháp/chờ duyệt của người khác.
    if (!ownerId && statuses?.some((status) => !STATS_STATUSES.includes(status))) {
      throw new BadRequestException(
        `status must be one of: ${STATS_STATUSES.join(", ")}`,
      );
    }
    if (query.minGoal !== undefined && query.maxGoal !== undefined && query.minGoal > query.maxGoal) {
      throw new BadRequestException("minGoal must not exceed maxGoal");
    }
    if (
      query.minProgress !== undefined &&
      query.maxProgress !== undefined &&
      query.minProgress > query.maxProgress
    ) {
      throw new BadRequestException("minProgress must not exceed maxProgress");
    }

    // Bước 1: lọc + sắp xếp + phân trang trên riêng bảng campaigns (lấy id).
    // Không join milestones ở bước này vì quan hệ 1-n làm lệch LIMIT/OFFSET và
    // TypeORM không phân trang được khi ORDER BY theo biểu thức (tỷ lệ %).
    const qb = this.campaignRepo.createQueryBuilder("c").select("c.id", "id");
    this.applyListFilters(qb, query, statuses, ownerId);
    this.applyListOrder(qb, query.sort);

    const [rows, total] = await Promise.all([
      qb.clone().offset(offset).limit(limit).getRawMany<{ id: string }>(),
      qb.clone().getCount(),
    ]);
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) {
      return { items: [], total, limit, offset };
    }

    // Bước 2: nạp đủ quan hệ cho đúng trang đó rồi giữ thứ tự của bước 1.
    const loaded = await this.campaignRepo.find({
      where: { id: In(ids) },
      relations: { owner: true, milestones: true },
    });
    const byId = new Map(loaded.map((campaign) => [campaign.id, campaign]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((campaign): campaign is Campaign => campaign !== undefined);

    return { items, total, limit, offset };
  }

  private applyListFilters(
    qb: SelectQueryBuilder<Campaign>,
    query: CampaignQueryDto,
    statuses: CampaignStatus[] | undefined,
    ownerId?: string,
  ): void {
    if (ownerId) {
      qb.where("c.ownerId = :ownerId", { ownerId });
      if (statuses) qb.andWhere("c.status IN (:...statuses)", { statuses });
    } else {
      qb.where("c.status IN (:...statuses)", { statuses: statuses ?? PUBLIC_STATUSES });
      if (query.category) qb.andWhere("c.category = :category", { category: query.category });
    }

    const q = query.q?.trim();
    if (q) {
      qb.andWhere(
        new Brackets((sub) => {
          const like = { q: `%${escapeLike(q)}%` };
          sub
            .where("c.title LIKE :q", like)
            .orWhere("c.description LIKE :q", like)
            .orWhere("c.location LIKE :q", like);
        }),
      );
    }

    const location = query.location?.trim();
    if (location) {
      qb.andWhere("c.location LIKE :location", { location: `%${escapeLike(location)}%` });
    }
    if (query.minGoal !== undefined) qb.andWhere("c.goalAmount >= :minGoal", { minGoal: query.minGoal });
    if (query.maxGoal !== undefined) qb.andWhere("c.goalAmount <= :maxGoal", { maxGoal: query.maxGoal });
    if (query.minProgress !== undefined) {
      qb.andWhere(`${PROGRESS_PERCENT_SQL} >= :minProgress`, { minProgress: query.minProgress });
    }
    if (query.maxProgress !== undefined) {
      qb.andWhere(`${PROGRESS_PERCENT_SQL} <= :maxProgress`, { maxProgress: query.maxProgress });
    }

    const now = new Date();
    if (query.endingWithinDays !== undefined) {
      qb.andWhere("c.status = :activeStatus", { activeStatus: CampaignStatus.ACTIVE })
        .andWhere("c.endDate >= :now", { now })
        .andWhere("c.endDate <= :endingBefore", {
          endingBefore: new Date(now.getTime() + query.endingWithinDays * DAY_MS),
        });
    } else if (query.sort === "ending") {
      // "Sắp hết hạn" chỉ có nghĩa với chiến dịch chưa quá hạn.
      qb.andWhere("c.endDate >= :now", { now });
    }
  }

  private applyListOrder(qb: SelectQueryBuilder<Campaign>, sort?: string): void {
    switch (sort) {
      case "ending":
        qb.orderBy("c.endDate", "ASC");
        break;
      case "progress":
        qb.orderBy(PROGRESS_PERCENT_SQL, "DESC");
        break;
      case "newest":
      case "latest":
        qb.orderBy("c.createdAt", "DESC");
        break;
      case "popular":
      default:
        qb.orderBy("c.backerCount", "DESC");
    }
    // Thứ tự ổn định giữa các trang khi giá trị sắp xếp bằng nhau.
    qb.addOrderBy("c.createdAt", "DESC").addOrderBy("c.id", "ASC");
  }

  async findById(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: { owner: true, milestones: true },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  async create(dto: CreateCampaignDto, owner: User): Promise<Campaign> {
    const campaign = this.campaignRepo.create({
      title: dto.title,
      description: dto.description,
      category: dto.category,
      ownerId: owner.id,
      goalAmount: dto.goalAmount,
      currentAmount: 0,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: new Date(dto.endDate),
      status: CampaignStatus.DRAFT,
      imageUrl: dto.imageUrl,
      location: dto.location,
      backerCount: 0,
      viewCount: 0,
    });
    return this.campaignRepo.save(campaign);
  }

  async update(
    id: string,
    dto: UpdateCampaignDto,
    currentUser: User,
  ): Promise<Campaign> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);

    if (!OWNER_EDITABLE_STATUSES.includes(campaign.status)) {
      throw new ForbiddenException(
        "Only draft, rejected or needs-info campaigns can be edited before approval",
      );
    }

    const current = campaign as unknown as Record<string, unknown>;
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(dto)) {
      oldValues[field] = truncateForAudit(current[field]);
      newValues[field] = truncateForAudit(value);
    }

    Object.assign(campaign, dto);
    const saved = await this.campaignRepo.save(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.update",
      entity: "campaign",
      entityId: saved.id,
      oldValues,
      newValues,
    });
    return saved;
  }

  async submitForReview(id: string, currentUser: User): Promise<Campaign> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);

    if (!SUBMITTABLE_STATUSES.includes(campaign.status)) {
      throw new ForbiddenException(
        "Only draft, rejected or needs-info campaigns can be submitted for review",
      );
    }

    const previousStatus = campaign.status;
    campaign.status = CampaignStatus.PENDING;
    campaign.rejectionReason = undefined;
    const saved = await this.campaignRepo.save(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.submit",
      entity: "campaign",
      entityId: saved.id,
      oldValues: { status: previousStatus },
      newValues: { status: saved.status },
    });
    return saved;
  }

  async moderate(
    id: string,
    dto: ModerateCampaignDto,
    currentUser: User,
  ): Promise<Campaign> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException("Only admins can moderate campaigns");
    }

    const campaign = await this.findById(id);

    if (!MODERATE_TRANSITIONS[campaign.status].includes(dto.status)) {
      throw new ConflictException(
        `Cannot move campaign from "${campaign.status}" to "${dto.status}"`,
      );
    }

    const needsReason = [
      CampaignStatus.REJECTED,
      CampaignStatus.NEEDS_INFO,
      CampaignStatus.PAUSED,
    ].includes(dto.status);

    if (needsReason && !dto.reason?.trim()) {
      throw new BadRequestException(
        "A reason is required for rejected, needs-info or paused campaigns",
      );
    }

    const previous = {
      status: campaign.status,
      rejectionReason: campaign.rejectionReason ?? null,
    };
    campaign.status = dto.status;
    campaign.rejectionReason = needsReason ? dto.reason : undefined;
    const saved = await this.campaignRepo.save(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.moderate",
      entity: "campaign",
      entityId: saved.id,
      oldValues: previous,
      newValues: {
        status: saved.status,
        rejectionReason: saved.rejectionReason ?? null,
      },
    });

    const notices = campaignStatusNotifications(saved, previous.status, saved.status, dto.reason);
    if (notices.owner) await this.notificationsService.notify(notices.owner);
    if (notices.backers) {
      await this.notificationsService.notifyCampaignBackers(saved.id, notices.backers, [saved.ownerId]);
    }
    return saved;
  }

  async remove(id: string, currentUser: User): Promise<void> {
    const campaign = await this.findById(id);
    this.assertCanManage(campaign, currentUser);
    // Chỉ xóa được hồ sơ chưa từng công khai; chiến dịch đã phát hành có thể đã
    // nhận tiền nên phải kết thúc qua luồng kiểm duyệt (moderate → ended) để giữ sổ cái.
    if (!OWNER_EDITABLE_STATUSES.includes(campaign.status)) {
      throw new ConflictException(
        "Only draft, rejected or needs-info campaigns can be deleted; end published campaigns instead",
      );
    }
    const snapshot = {
      title: campaign.title,
      status: campaign.status,
      ownerId: campaign.ownerId,
      goalAmount: campaign.goalAmount,
    };
    const campaignId = campaign.id;
    await this.campaignRepo.remove(campaign);
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.delete",
      entity: "campaign",
      entityId: campaignId,
      oldValues: snapshot,
    });
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const row = await this.campaignRepo
      .createQueryBuilder("c")
      .select("COALESCE(SUM(c.currentAmount), 0)", "totalRaised")
      .addSelect("COALESCE(SUM(c.backerCount), 0)", "totalBackers")
      .addSelect("COUNT(*)", "publicCampaigns")
      .addSelect("SUM(CASE WHEN c.status = :active THEN 1 ELSE 0 END)", "activeCampaigns")
      .addSelect("SUM(CASE WHEN c.status = :success THEN 1 ELSE 0 END)", "successfulCampaigns")
      .where("c.status IN (:...statuses)", { statuses: STATS_STATUSES })
      .setParameters({ active: CampaignStatus.ACTIVE, success: CampaignStatus.SUCCESS })
      .getRawOne<Record<keyof PlatformStats, string | number | null>>();

    const num = (value: string | number | null | undefined) => Number(value ?? 0) || 0;
    return {
      totalRaised: num(row?.totalRaised),
      totalBackers: num(row?.totalBackers),
      publicCampaigns: num(row?.publicCampaigns),
      activeCampaigns: num(row?.activeCampaigns),
      successfulCampaigns: num(row?.successfulCampaigns),
    };
  }

  private assertCanManage(campaign: Campaign, user: User): void {
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only manage your own campaigns");
    }
  }
}
