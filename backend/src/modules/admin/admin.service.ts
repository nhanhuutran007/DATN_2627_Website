import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  Like,
  Repository,
} from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { rangeFilter } from "../../common/query/range";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { User, UserRole, UserStatus } from "../users/entities/user.entity";
import {
  AdminCampaignQueryDto,
  AdminDonationQueryDto,
  AdminUserQueryDto,
  UpdateUserStatusDto,
} from "./dto/admin.dto";
import {
  RiskAlert,
  RiskAlertLevel,
  RiskAlertStatus,
  RiskEntityType,
} from "./entities/risk-alert.entity";

export type AdminListResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

type StatusTotals = Record<string, number>;

/** Giao dịch kèm mức cảnh báo cao nhất đang mở của chiến dịch/người ủng hộ liên quan. */
export type FlaggedDonation = Donation & {
  riskLevel: RiskAlertLevel | null;
  riskSource: "campaign" | "user" | "both" | null;
};

const RISK_RANK: Record<RiskAlertLevel, number> = {
  [RiskAlertLevel.LOW]: 1,
  [RiskAlertLevel.MEDIUM]: 2,
  [RiskAlertLevel.HIGH]: 3,
};

function higherRisk(a: RiskAlertLevel | undefined, b: RiskAlertLevel): RiskAlertLevel {
  return a && RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

function toMoney(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function monthLabel(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Số việc cần xử lý cho badge trên sidebar quản trị. */
export type AdminNavCounts = {
  pendingCampaigns: number;
  openRisks: number;
  openReports: number;
  /** Bình luận đang hiển thị nhưng có báo cáo chưa xử lý. */
  reportedComments: number;
  /** Giao dịch SePay chờ thanh toán quá lâu, có thể cần đối soát tay. */
  stalePendingSepay: number;
  pendingRefunds: number;
  /** Chiến dịch có số ghi trên chiến dịch lệch với tổng giao dịch thành công (lũy kế). */
  ledgerMismatches: number;
  /** Ngày từ lần sao lưu gần nhất; null nếu chưa từng sao lưu. */
  daysSinceBackup: number | null;
};

/** Giao dịch SePay "chờ" quá mốc này thì đáng để admin đối soát tay. */
const STALE_SEPAY_MINUTES = 30;

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(RiskAlert)
    private readonly riskAlertRepo: Repository<RiskAlert>,
    private readonly auditService: AuditService,
  ) {}

  /** Đếm nhanh bằng SQL (mỗi mục một COUNT) để sidebar làm mới thường xuyên mà không tải danh sách. */
  async navCounts(now = new Date()): Promise<AdminNavCounts> {
    const count = async (sql: string, params: unknown[] = []) => {
      const [row] = await this.userRepo.manager.query(sql, params);
      return toMoney(row?.n);
    };
    const [
      pendingCampaigns,
      openRisks,
      openReports,
      reportedComments,
      stalePendingSepay,
      pendingRefunds,
      ledgerMismatches,
      lastBackupRows,
    ] = await Promise.all([
      count("SELECT COUNT(*) AS n FROM `campaigns` WHERE `status` = 'pending'"),
      count("SELECT COUNT(*) AS n FROM `risk_alerts` WHERE `status` = 'open'"),
      count("SELECT COUNT(*) AS n FROM `reports` WHERE `status` IN ('pending', 'reviewing')"),
      count(
        "SELECT COUNT(DISTINCT r.`comment_id`) AS n FROM `reports` r " +
          "JOIN `campaign_comments` c ON c.`id` = r.`comment_id` " +
          "WHERE r.`status` IN ('pending', 'reviewing') AND c.`status` = 'visible'",
      ),
      count(
        "SELECT COUNT(*) AS n FROM `donations` WHERE `status` = 'pending' AND `payment_method` = 'sepay' AND `created_at` < ?",
        [new Date(now.getTime() - STALE_SEPAY_MINUTES * 60_000)],
      ),
      count("SELECT COUNT(*) AS n FROM `refund_requests` WHERE `status` = 'pending'"),
      // Cùng tiêu chí "lệch" với trang Đối soát (chênh > 0,5đ hoặc khác số lượt), nhưng xét mọi chiến dịch.
      count(
        "SELECT COUNT(*) AS n FROM `campaigns` c LEFT JOIN (" +
          "SELECT `campaign_id`, SUM(`amount`) AS s, COUNT(*) AS k FROM `donations` WHERE `status` = 'completed' GROUP BY `campaign_id`" +
          ") d ON d.`campaign_id` = c.`id` " +
          "WHERE ABS(c.`current_amount` - COALESCE(d.s, 0)) > 0.5 OR c.`backer_count` <> COALESCE(d.k, 0)",
      ),
      this.userRepo.manager.query(
        "SELECT `created_at` AS createdAt FROM `audit_logs` WHERE `action` = 'backup.export' ORDER BY `created_at` DESC LIMIT 1",
      ) as Promise<Array<{ createdAt: Date | string }>>,
    ]);
    const lastBackup = lastBackupRows[0]?.createdAt;
    return {
      pendingCampaigns,
      openRisks,
      openReports,
      reportedComments,
      stalePendingSepay,
      pendingRefunds,
      ledgerMismatches,
      daysSinceBackup: lastBackup ? Math.floor((now.getTime() - new Date(lastBackup).getTime()) / 86_400_000) : null,
    };
  }

  async getOverview(): Promise<Record<string, unknown>> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const users = await this.userRepo.find({
      select: { role: true, status: true, createdAt: true },
    });
    const campaigns = await this.campaignRepo.find({
      select: {
        status: true,
        category: true,
        currentAmount: true,
        endDate: true,
        createdAt: true,
      },
    });
    const donations = await this.donationRepo.find({
      select: { status: true, amount: true, completedAt: true },
    });

    const campaignTotals = campaigns.reduce<StatusTotals>((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] ?? 0) + 1;
      return acc;
    }, {});

    const completed = donations.filter(
      (donation) => donation.status === DonationStatus.COMPLETED,
    );
    const failed = donations.filter(
      (donation) => donation.status === DonationStatus.FAILED,
    );
    const completedAmount = completed.reduce(
      (sum, donation) => sum + toMoney(donation.amount),
      0,
    );
    const failedAmount = failed.reduce(
      (sum, donation) => sum + toMoney(donation.amount),
      0,
    );

    const successCount = campaignTotals[CampaignStatus.SUCCESS] ?? 0;
    const failedCampaigns = campaignTotals[CampaignStatus.FAILED] ?? 0;
    const closed = successCount + failedCampaigns;
    const successRate = closed > 0 ? Math.round((successCount / closed) * 10_000) / 10_000 : 0;
    // Chiến dịch đã qua kiểm duyệt: "approved" chỉ là trạng thái tạm trước khi gây quỹ,
    // nên phải cộng cả các trạng thái phía sau nó.
    const reviewed = [
      CampaignStatus.APPROVED,
      CampaignStatus.ACTIVE,
      CampaignStatus.PAUSED,
      CampaignStatus.SUCCESS,
      CampaignStatus.FAILED,
      CampaignStatus.ENDED,
    ].reduce((sum, status) => sum + (campaignTotals[status] ?? 0), 0);

    const openRisks = await this.riskAlertRepo.find({
      where: { status: RiskAlertStatus.OPEN },
      select: { level: true },
    });
    const riskCounts = {
      open: openRisks.length,
      high: openRisks.filter((alert) => alert.level === RiskAlertLevel.HIGH).length,
      medium: openRisks.filter((alert) => alert.level === RiskAlertLevel.MEDIUM).length,
    };

    const byCategory: Record<
      string,
      { campaigns: number; raised: number }
    > = {};
    for (const campaign of campaigns) {
      const bucket = byCategory[campaign.category] ?? {
        campaigns: 0,
        raised: 0,
      };
      bucket.campaigns += 1;
      bucket.raised += toMoney(campaign.currentAmount);
      byCategory[campaign.category] = bucket;
    }
    const topCategories = Object.entries(byCategory)
      .map(([category, value]) => ({
        category,
        campaigns: value.campaigns,
        raised: Math.round(value.raised),
      }))
      .sort(
        (a, b) =>
          b.campaigns - a.campaigns || b.raised - a.raised,
      )
      .slice(0, 5);

    const monthly: Array<{ month: string; raised: number; donations: number }> =
      [];
    for (let back = 5; back >= 0; back -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1);
      const inMonth = completed.filter((donation) => {
        const completedAt = donation.completedAt
          ? new Date(donation.completedAt)
          : null;
        return completedAt !== null && completedAt >= start && completedAt < end;
      });
      monthly.push({
        month: monthLabel(start),
        raised: Math.round(
          inMonth.reduce((sum, donation) => sum + toMoney(donation.amount), 0),
        ),
        donations: inMonth.length,
      });
    }

    return {
      users: {
        total: users.length,
        active: users.filter((user) => user.status === UserStatus.ACTIVE).length,
        banned: users.filter((user) => user.status === UserStatus.BANNED).length,
        owners: users.filter((user) => user.role === UserRole.CAMPAIGN_OWNER).length,
        newThisMonth: users.filter(
          (user) => new Date(user.createdAt).getTime() >= monthStart.getTime(),
        ).length,
      },
      campaigns: {
        total: campaigns.length,
        draft: campaignTotals[CampaignStatus.DRAFT] ?? 0,
        pending: campaignTotals[CampaignStatus.PENDING] ?? 0,
        needsInfo: campaignTotals[CampaignStatus.NEEDS_INFO] ?? 0,
        approved: campaignTotals[CampaignStatus.APPROVED] ?? 0,
        reviewed,
        active: campaignTotals[CampaignStatus.ACTIVE] ?? 0,
        ended: campaignTotals[CampaignStatus.ENDED] ?? 0,
        success: successCount,
        failed: failedCampaigns,
        rejected: campaignTotals[CampaignStatus.REJECTED] ?? 0,
      },
      donations: {
        total: donations.length,
        completed: completed.length,
        failed: failed.length,
        pending: donations.filter(
          (donation) => donation.status === DonationStatus.PENDING,
        ).length,
        refunded: donations.filter(
          (donation) => donation.status === DonationStatus.REFUNDED,
        ).length,
        expired: donations.filter(
          (donation) => donation.status === DonationStatus.EXPIRED,
        ).length,
        cancelled: donations.filter(
          (donation) => donation.status === DonationStatus.CANCELLED,
        ).length,
        completedAmount: Math.round(completedAmount),
        failedAmount: Math.round(failedAmount),
      },
      successRate,
      risks: riskCounts,
      topCategories,
      monthly,
    };
  }

  async listCampaigns(
    query: AdminCampaignQueryDto,
  ): Promise<AdminListResult<Campaign>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const base: FindOptionsWhere<Campaign> = {};
    if (query.status) base.status = query.status;
    const category = query.category?.trim();
    if (category) base.category = category;
    const goal = rangeFilter(query.minGoal, query.maxGoal, "goal");
    if (goal) base.goalAmount = goal;
    let where: FindOptionsWhere<Campaign> | FindOptionsWhere<Campaign>[];
    const keyword = query.q?.trim();
    if (keyword) {
      const like = `%${keyword}%`;
      where = [
        { ...base, title: Like(like) },
        { ...base, description: Like(like) },
        { ...base, location: Like(like) },
      ];
    } else {
      where = base;
    }

    const [items, total] = await this.campaignRepo.findAndCount({
      where,
      relations: { owner: true },
      order: this.campaignOrder(query.sort),
      skip: offset,
      take: limit,
    });
    return { items, total, limit, offset };
  }

  async listDonations(
    query: AdminDonationQueryDto,
  ): Promise<AdminListResult<FlaggedDonation>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    // Cảnh báo rủi ro gắn với chiến dịch hoặc người dùng, không gắn từng giao dịch:
    // giao dịch "bị cảnh báo" là giao dịch thuộc một trong hai đối tượng đó.
    const openAlerts = await this.riskAlertRepo.find({
      select: { entityType: true, entityId: true, level: true },
      where: { status: RiskAlertStatus.OPEN },
    });
    const campaignRisk = new Map<string, RiskAlertLevel>();
    const userRisk = new Map<string, RiskAlertLevel>();
    for (const alert of openAlerts) {
      const target = alert.entityType === RiskEntityType.CAMPAIGN ? campaignRisk : userRisk;
      target.set(alert.entityId, higherRisk(target.get(alert.entityId), alert.level));
    }

    const base: FindOptionsWhere<Donation> = query.status ? { status: query.status } : {};
    const amount = rangeFilter(query.minAmount, query.maxAmount, "amount");
    if (amount) base.amount = amount;
    // Điều kiện OR: (cảnh báo theo chiến dịch | theo người ủng hộ) × (các trường tìm kiếm).
    let where: FindOptionsWhere<Donation>[] = [base];
    if (query.flagged) {
      where = [
        ...(campaignRisk.size ? [{ ...base, campaignId: In([...campaignRisk.keys()]) }] : []),
        ...(userRisk.size ? [{ ...base, userId: In([...userRisk.keys()]) }] : []),
      ];
      if (where.length === 0) {
        return { items: [], total: 0, limit, offset };
      }
    }
    const keyword = query.q?.trim();
    if (keyword) {
      const like = Like(`%${keyword}%`);
      where = where.flatMap((condition) => [
        { ...condition, campaign: { title: like } },
        { ...condition, user: { name: like } },
        { ...condition, user: { email: like } },
        { ...condition, transactionId: like },
      ]);
    }

    const [donations, total] = await this.donationRepo.findAndCount({
      where,
      relations: { user: true, campaign: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    // Gắn thêm thuộc tính vào chính entity (giữ class để serializer vẫn ẩn trường nhạy cảm).
    const items = donations.map((donation) => {
      const fromCampaign = campaignRisk.get(donation.campaignId);
      const fromUser = userRisk.get(donation.userId);
      const riskLevel = fromCampaign && fromUser
        ? higherRisk(fromCampaign, fromUser)
        : fromCampaign ?? fromUser ?? null;
      // Nguồn cảnh báo để admin biết rủi ro thuộc chiến dịch hay người ủng hộ, không phải riêng giao dịch
      const riskSource: FlaggedDonation["riskSource"] =
        fromCampaign && fromUser ? "both" : fromCampaign ? "campaign" : fromUser ? "user" : null;
      return Object.assign(donation, { riskLevel, riskSource });
    });
    return { items, total, limit, offset };
  }

  async listUsers(
    query: AdminUserQueryDto,
  ): Promise<AdminListResult<User>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const base: FindOptionsWhere<User> = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    let where: FindOptionsWhere<User> | FindOptionsWhere<User>[];
    const keyword = query.q?.trim();
    if (keyword) {
      const like = `%${keyword}%`;
      where = [
        { ...base, name: Like(like) },
        { ...base, email: Like(like) },
      ];
    } else {
      where = base;
    }

    const [items, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items, total, limit, offset };
  }

  /** Hồ sơ một tài khoản cho admin: thông tin liên hệ, chiến dịch đã tạo, ủng hộ và cảnh báo đang mở. */
  async getUserDetail(id: string): Promise<Record<string, unknown>> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const campaigns = await this.campaignRepo.find({
      select: { id: true, title: true, status: true, category: true, goalAmount: true, currentAmount: true, backerCount: true, endDate: true, createdAt: true },
      where: { owner: { id } },
      order: { createdAt: "DESC" },
    });
    const campaignsByStatus: Record<string, number> = {};
    for (const campaign of campaigns) {
      campaignsByStatus[campaign.status] = (campaignsByStatus[campaign.status] ?? 0) + 1;
    }

    const donations = await this.donationRepo.find({
      select: { amount: true },
      where: { userId: id, status: DonationStatus.COMPLETED },
    });

    const campaignIds = campaigns.map((campaign) => campaign.id);
    const openAlerts = await this.riskAlertRepo.find({
      where: [
        { status: RiskAlertStatus.OPEN, entityType: RiskEntityType.USER, entityId: id },
        ...(campaignIds.length
          ? [{ status: RiskAlertStatus.OPEN, entityType: RiskEntityType.CAMPAIGN, entityId: In(campaignIds) }]
          : []),
      ],
      order: { createdAt: "DESC" },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        organization: user.organization ?? null,
        bio: user.bio ?? null,
        avatar: user.avatar ?? null,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      campaigns: {
        total: campaigns.length,
        byStatus: campaignsByStatus,
        raisedAmount: campaigns.reduce((sum, campaign) => sum + toMoney(campaign.currentAmount), 0),
        recent: campaigns.slice(0, 10),
      },
      donations: {
        count: donations.length,
        amount: donations.reduce((sum, donation) => sum + toMoney(donation.amount), 0),
      },
      openRisks: openAlerts.map((alert) => ({
        id: alert.id,
        entityType: alert.entityType,
        entityName: alert.entityName,
        level: alert.level,
        score: alert.score,
      })),
    };
  }

  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDto,
    currentUser: User,
  ): Promise<User> {
    if (id === currentUser.id && dto.status === UserStatus.BANNED) {
      throw new BadRequestException("Admins cannot ban themselves");
    }

    const user = await this.userRepo.findOneBy({ id });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.role === UserRole.ADMIN && dto.status === UserStatus.BANNED) {
      throw new BadRequestException("Không thể khóa tài khoản quản trị viên");
    }

    const previousStatus = user.status;
    user.status = dto.status;
    if (dto.status === UserStatus.BANNED && previousStatus !== UserStatus.BANNED) {
      // Thu hồi mọi phiên đang có: kể cả khi mở khóa sau này, token cũ không dùng lại được.
      user.sessionsRevokedAt = new Date();
    }
    const saved = await this.userRepo.save(user);
    await this.auditService.record({
      userId: currentUser.id,
      action: "user.status.update",
      entity: "user",
      entityId: saved.id,
      oldValues: { status: previousStatus },
      newValues: { status: saved.status, reason: dto.reason?.trim() || null },
    });
    return saved;
  }

  private campaignOrder(
    sort?: string,
  ): FindOptionsOrder<Campaign> {
    switch (sort) {
      case "ending":
        return { endDate: "ASC" };
      case "raised":
        return { currentAmount: "DESC" };
      case "backers":
        return { backerCount: "DESC" };
      // Hàng chờ duyệt: ai gửi trước được xét trước
      case "submitted":
        return { submittedAt: "ASC", createdAt: "ASC" };
      case "newest":
      default:
        return { createdAt: "DESC" };
    }
  }
}