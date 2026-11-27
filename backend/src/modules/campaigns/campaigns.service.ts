import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, In, Repository, SelectQueryBuilder } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { sanitizeRichText } from "../../common/html/rich-text";
import { RefundRequest, RefundRequestStatus } from "../finance/entities/refund-request.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { Organization, OrganizationStatus } from "../organizations/entities/organization.entity";
import { AutomationSettingsService } from "../support/automation-settings.service";
import { User, UserRole } from "../users/entities/user.entity";
import {
  draftDurationProblem,
  type DurationProblem,
  MAX_CAMPAIGN_DURATION_DAYS,
  MIN_CAMPAIGN_DURATION_DAYS,
  publishDurationProblem,
} from "./campaign-duration";
import { campaignStatusNotifications } from "./campaign-notifications";
import { CampaignScreeningService, type ScreeningView } from "./campaign-screening.service";
import {
  CampaignQueryDto,
  CreateCampaignDto,
  ModerateCampaignDto,
  UpdateCampaignDto,
} from "./dto/campaign.dto";
import { CampaignPayoutAccount } from "./entities/campaign-payout-account.entity";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";

/** Đã phát hành (chủ dự án bấm "Phát hành" sau khi được duyệt). `approved` chưa công khai. */
const PUBLIC_STATUSES = [
  CampaignStatus.ACTIVE,
  CampaignStatus.SUCCESS,
  CampaignStatus.ENDED,
];

/** Hồ sơ chưa phát hành (kể cả đã duyệt nhưng chủ dự án chưa bấm phát hành): chỉ chủ dự án/admin xem. */
const UNPUBLISHED_STATUSES = [
  CampaignStatus.DRAFT,
  CampaignStatus.PENDING,
  CampaignStatus.NEEDS_INFO,
  CampaignStatus.REJECTED,
  CampaignStatus.APPROVED,
];

/** Thông tin liên hệ của một chiến dịch công khai (nút "Liên hệ"); trường rỗng = chưa công khai. */
export type CampaignContact = {
  owner: { name: string; email: string | null; phone: string | null; address: string | null };
  organization: { name: string; slug: string; email: string; phone: string; address: string; website: string | null } | null;
};

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
 * approved → active KHÔNG thuộc admin: chủ dự án tự bấm phát hành (`publish`).
 */
const MODERATE_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  [CampaignStatus.DRAFT]: [],
  [CampaignStatus.PENDING]: [
    CampaignStatus.APPROVED,
    CampaignStatus.REJECTED,
    CampaignStatus.NEEDS_INFO,
  ],
  [CampaignStatus.APPROVED]: [],
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
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    @Inject(CampaignScreeningService)
    private readonly screeningService: CampaignScreeningService | null = null,
    @Optional()
    @Inject(AutomationSettingsService)
    private readonly automationSettings: AutomationSettingsService | null = null,
    @Optional()
    @InjectRepository(CampaignPayoutAccount)
    private readonly payoutRepo: Repository<CampaignPayoutAccount> | null = null,
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
      relations: { owner: true, milestones: true, organization: true },
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
    // Dự án mô phỏng chỉ dành cho AI học, không lẫn vào danh sách công khai hay của chủ dự án.
    qb.andWhere("c.isSimulated = :simulated", { simulated: false });
    if (query.organizationId) {
      qb.andWhere("c.organizationId = :organizationId", { organizationId: query.organizationId });
    }
    if (query.forOrganization) {
      qb.andWhere(
        "EXISTS (SELECT 1 FROM organizations o WHERE o.id = c.organization_id AND o.status = :verifiedOrg AND o.deleted_at IS NULL)",
        { verifiedOrg: OrganizationStatus.VERIFIED },
      );
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
      case "featured":
        // Admin chọn trước (mới chọn trước), phần còn lại theo độ phổ biến.
        qb.orderBy("c.isFeatured", "DESC")
          .addOrderBy("c.featuredAt", "DESC")
          .addOrderBy("c.backerCount", "DESC");
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
      relations: { owner: true, milestones: true, organization: true },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  /**
   * Chi tiết cho `GET /campaigns/:id`: hồ sơ chưa phát hành (nháp, chờ duyệt, cần bổ sung, bị từ chối)
   * chỉ chủ dự án và admin xem được; người khác nhận 404 như không tồn tại để không lộ nội dung.
   */
  async findVisible(id: string, viewer: Pick<User, "id" | "role"> | null): Promise<Campaign> {
    const campaign = await this.findById(id);
    const privileged = viewer !== null && (viewer.id === campaign.ownerId || viewer.role === UserRole.ADMIN);
    if (UNPUBLISHED_STATUSES.includes(campaign.status) && !privileged) {
      throw new NotFoundException("Campaign not found");
    }
    return campaign;
  }

  /**
   * Liên hệ của chiến dịch đã công khai: phần chủ dự án tự công khai trong Cài đặt (không phải email đăng nhập
   * hay số điện thoại tài khoản) và liên hệ của tổ chức thụ hưởng nếu tổ chức còn được xác minh.
   */
  async getContact(id: string): Promise<CampaignContact> {
    const campaign = await this.campaignRepo.findOne({ where: { id }, relations: { owner: true, organization: true } });
    if (!campaign || !PUBLIC_STATUSES.includes(campaign.status)) {
      throw new NotFoundException("Campaign not found");
    }
    const owner = campaign.owner;
    const organization = campaign.organization as Organization | null | undefined;
    return {
      owner: {
        name: owner.name,
        email: owner.contactEmail || null,
        phone: owner.contactPhone || null,
        address: owner.contactAddress || null,
      },
      organization:
        organization && organization.status === OrganizationStatus.VERIFIED
          ? {
              name: organization.name,
              slug: organization.slug,
              email: organization.email,
              phone: organization.phone,
              address: organization.address,
              website: organization.website ?? null,
            }
          : null,
    };
  }

  /**
   * Ngày kết thúc của hồ sơ chưa phát hành: cách hôm nay 7–60 ngày. Thời gian gây quỹ thật tính từ lúc
   * chủ dự án phát hành nên được kiểm tra lại lúc đó.
   */
  private assertDraftDuration(endDate: string | Date): void {
    const problem = draftDurationProblem(new Date(endDate), new Date());
    if (problem === "too_short") {
      throw new BadRequestException(
        `Ngày kết thúc phải cách hôm nay ít nhất ${MIN_CAMPAIGN_DURATION_DAYS} ngày — hãy sửa ngày kết thúc (nhớ dự trù 2–3 ngày chờ duyệt)`,
      );
    }
    if (problem === "too_long") {
      throw new BadRequestException(
        `Thời gian gây quỹ tối đa ${MAX_CAMPAIGN_DURATION_DAYS} ngày (ngày kết thúc cách hôm nay tối đa ${MAX_CAMPAIGN_DURATION_DAYS} ngày)`,
      );
    }
  }

  private static publishDurationMessage(problem: DurationProblem): string {
    return problem === "too_short"
      ? `Còn chưa tới ${MIN_CAMPAIGN_DURATION_DAYS} ngày gây quỹ — hãy chọn ngày kết thúc mới (${MIN_CAMPAIGN_DURATION_DAYS}–${MAX_CAMPAIGN_DURATION_DAYS} ngày kể từ hôm nay)`
      : `Thời gian gây quỹ tối đa ${MAX_CAMPAIGN_DURATION_DAYS} ngày kể từ lúc phát hành — hãy chọn ngày kết thúc sớm hơn`;
  }

  async create(dto: CreateCampaignDto, owner: User): Promise<Campaign> {
    this.assertDraftDuration(dto.endDate);
    const campaign = this.campaignRepo.create({
      title: dto.title,
      description: sanitizeRichText(dto.description),
      category: dto.category,
      ownerId: owner.id,
      goalAmount: dto.goalAmount,
      currentAmount: 0,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: new Date(dto.endDate),
      status: CampaignStatus.DRAFT,
      imageUrl: dto.imageUrl,
      videoUrl: dto.videoUrl ?? null,
      location: dto.location,
      organizationId: dto.organizationId ?? null,
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

    if (dto.endDate) this.assertDraftDuration(dto.endDate);
    if (dto.description !== undefined) dto.description = sanitizeRichText(dto.description);

    const current = campaign as unknown as Record<string, unknown>;
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(dto)) {
      oldValues[field] = truncateForAudit(current[field]);
      newValues[field] = truncateForAudit(value);
    }

    Object.assign(campaign, dto);
    // Quan hệ đã nạp sẽ ghi đè cột khi save nếu không bỏ đi.
    if (dto.organizationId !== undefined) campaign.organization = undefined;
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

    // Ngày kết thúc phải cách hôm nay 7–60 ngày (chủ dự án tự dự trù thời gian chờ duyệt).
    this.assertDraftDuration(campaign.endDate);

    // Như Kickstarter: phải khai báo nơi nhận tiền trước khi gửi duyệt, để khi thành công admin giải ngân được ngay.
    if (this.payoutRepo && (await this.payoutRepo.count({ where: { campaignId: campaign.id } })) === 0) {
      throw new BadRequestException("Vui lòng khai báo tài khoản ngân hàng nhận tiền trước khi gửi duyệt.");
    }

    const previousStatus = campaign.status;
    campaign.status = CampaignStatus.PENDING;
    campaign.submittedAt = new Date();
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
    return this.runAutoReview(saved);
  }

  /**
   * Duyệt tự động sau khi gửi: chấm điểm hồ sơ cho hàng đợi admin. Chỉ khi admin bật chế độ
   * `auto_low_risk` và hồ sơ qua đủ các bước, rủi ro thấp thì hệ thống tự duyệt (pending → approved);
   * chủ dự án vẫn tự bấm "Phát hành" như khi admin duyệt tay.
   * Không bao giờ tự từ chối hay yêu cầu bổ sung — các trường hợp đó luôn để admin quyết định.
   * Lỗi khi chấm điểm không chặn việc gửi duyệt.
   */
  private async runAutoReview(campaign: Campaign): Promise<Campaign> {
    if (!this.screeningService) return campaign;
    let screening: ScreeningView;
    try {
      screening = await this.screeningService.screen(campaign.id);
    } catch (error) {
      this.logger.error(`Không chấm điểm được chiến dịch ${campaign.id}: ${(error as Error).message}`);
      return campaign;
    }
    const settings = this.automationSettings ? await this.automationSettings.get().catch(() => null) : null;
    if (settings?.campaignReviewMode !== "auto_low_risk" || screening.recommendation !== "auto_approve") {
      return campaign;
    }
    const approved = await this.campaignRepo.update(
      { id: campaign.id, status: CampaignStatus.PENDING },
      { status: CampaignStatus.APPROVED },
    );
    if (!approved.affected) return campaign;
    await this.screeningService.markAutoApproved(campaign.id);
    const saved = { ...campaign, status: CampaignStatus.APPROVED } as Campaign;
    await this.auditService.record({
      action: "campaign.auto_approve",
      entity: "campaign",
      entityId: campaign.id,
      oldValues: { status: CampaignStatus.PENDING },
      newValues: { status: CampaignStatus.APPROVED, score: screening.score, rulesVersion: screening.rulesVersion },
    });
    const notices = campaignStatusNotifications(saved, CampaignStatus.PENDING, CampaignStatus.APPROVED);
    if (notices.owner) await this.notificationsService.notify(notices.owner).catch(() => undefined);
    return saved;
  }

  /**
   * Chủ dự án phát hành chiến dịch đã được duyệt (approved → active). Thời gian gây quỹ tính từ lúc
   * này: `startDate` = bây giờ, ngày kết thúc phải còn 7–60 ngày. Nếu duyệt lâu làm ngày đã chọn
   * không còn hợp lệ, chủ dự án gửi kèm `endDate` mới (chỉ được đổi ngày kết thúc ở bước này).
   * Chỉ chủ dự án — admin duyệt nhưng không phát hành thay.
   */
  async publish(id: string, currentUser: User, endDate?: string): Promise<Campaign> {
    const campaign = await this.findById(id);
    if (campaign.ownerId !== currentUser.id) {
      throw new ForbiddenException("Chỉ chủ dự án mới được phát hành chiến dịch");
    }
    if (campaign.status !== CampaignStatus.APPROVED) {
      throw new ConflictException("Chỉ phát hành được chiến dịch đã được duyệt và chưa phát hành");
    }

    const now = new Date();
    const nextEnd = endDate ? new Date(endDate) : new Date(campaign.endDate);
    const problem = publishDurationProblem(nextEnd, now);
    if (problem) throw new BadRequestException(CampaignsService.publishDurationMessage(problem));

    const previous = { status: campaign.status, startDate: campaign.startDate, endDate: campaign.endDate };
    // Cập nhật có điều kiện: hai lần bấm đồng thời chỉ một lần thành công.
    const result = await this.campaignRepo.update(
      { id: campaign.id, status: CampaignStatus.APPROVED },
      { status: CampaignStatus.ACTIVE, startDate: now, endDate: nextEnd },
    );
    if (!result.affected) {
      throw new ConflictException("Chiến dịch vừa được phát hành hoặc đổi trạng thái");
    }
    const saved = Object.assign(campaign, { status: CampaignStatus.ACTIVE, startDate: now, endDate: nextEnd });
    await this.auditService.record({
      userId: currentUser.id,
      action: "campaign.publish",
      entity: "campaign",
      entityId: saved.id,
      oldValues: previous,
      newValues: { status: saved.status, startDate: now, endDate: nextEnd },
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

    // Xung đột lợi ích: admin không được tự duyệt/điều chỉnh chiến dịch của chính mình.
    if (campaign.ownerId === currentUser.id) {
      throw new ForbiddenException("Admins cannot moderate their own campaigns");
    }

    if (!MODERATE_TRANSITIONS[campaign.status].includes(dto.status)) {
      throw new ConflictException(
        `Cannot move campaign from "${campaign.status}" to "${dto.status}"`,
      );
    }

    // Đóng chiến dịch thất bại: xử lý hết yêu cầu hoàn tiền đang chờ trước, để
    // người ủng hộ không bị bỏ lại giữa chừng.
    if (campaign.status === CampaignStatus.FAILED && dto.status === CampaignStatus.ENDED) {
      const pendingRefunds = await this.campaignRepo.manager
        .getRepository(RefundRequest)
        .createQueryBuilder("r")
        .innerJoin("r.donation", "d")
        .where("d.campaignId = :campaignId", { campaignId: campaign.id })
        .andWhere("r.status = :status", { status: RefundRequestStatus.PENDING })
        .getCount();
      if (pendingRefunds > 0) {
        throw new ConflictException(
          `Còn ${pendingRefunds} yêu cầu hoàn tiền đang chờ xử lý; hãy duyệt hoặc từ chối trước khi đóng chiến dịch.`,
        );
      }
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
      // Số liệu công khai chỉ tính dự án thật.
      .andWhere("c.isSimulated = :simulated", { simulated: false })
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
