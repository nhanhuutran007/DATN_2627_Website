import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  FindOptionsOrder,
  FindOptionsWhere,
  Like,
  Repository,
} from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
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
} from "./entities/risk-alert.entity";

export type AdminListResult<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

type StatusTotals = Record<string, number>;

function toMoney(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function monthLabel(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

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

    const base: FindOptionsWhere<Campaign> = query.status
      ? { status: query.status }
      : {};
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
  ): Promise<AdminListResult<Donation>> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [items, total] = await this.donationRepo.findAndCount({
      where: query.status ? { status: query.status } : {},
      relations: { user: true, campaign: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
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

    const previousStatus = user.status;
    user.status = dto.status;
    const saved = await this.userRepo.save(user);
    await this.auditService.record({
      userId: currentUser.id,
      action: "user.status.update",
      entity: "user",
      entityId: saved.id,
      oldValues: { status: previousStatus },
      newValues: { status: saved.status },
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
      case "newest":
      default:
        return { createdAt: "DESC" };
    }
  }
}