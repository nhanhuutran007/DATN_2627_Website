import { createHash } from "node:crypto";

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";

import { RateLimiterService } from "../../common/rate-limit/rate-limiter.service";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { CampaignFollow } from "../follows/entities/campaign-follow.entity";
import { User, UserRole } from "../users/entities/user.entity";
import { CampaignViewDaily } from "./entities/campaign-view-daily.entity";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";

/** Một người xem lại trong khoảng này chỉ tính một lượt. */
export const VIEW_DEDUPE_WINDOW_MS = 30 * 60_000;
export const DEFAULT_STATS_DAYS = 30;
const DAY_MS = 86_400_000;

/** Chiến dịch công khai mới được đếm lượt xem. */
const VIEWABLE_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

export type ViewResult = { counted: boolean };

export type DailyPoint = { date: string; views: number; donations: number; amount: number };

export type CampaignStats = {
  campaignId: string;
  viewCount: number;
  backerCount: number;
  followerCount: number;
  currentAmount: number;
  goalAmount: number;
  /** Lượt ủng hộ thành công / lượt xem (0–1); null khi chưa có lượt xem. */
  conversionRate: number | null;
  days: number;
  daily: DailyPoint[];
};

/** `YYYY-MM-DD` theo UTC. */
export function utcDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Danh sách N ngày UTC liên tiếp kết thúc ở `now` (cũ → mới). */
export function lastUtcDays(now: Date, days: number): string[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, index) => utcDate(new Date(end - (days - 1 - index) * DAY_MS)));
}

/**
 * Lượt xem + số liệu cho chủ dự án. Lượt xem chống đếm trùng bằng
 * `RateLimiterService` (Redis khi có, rơi về bộ nhớ) theo người xem: tài khoản
 * nếu đã đăng nhập, ngược lại băm IP + user-agent (không lưu IP thô).
 */
@Injectable()
export class CampaignStatsService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignViewDaily)
    private readonly viewDailyRepo: Repository<CampaignViewDaily>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(CampaignFollow)
    private readonly followRepo: Repository<CampaignFollow>,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async recordView(
    campaignId: string,
    viewer: { user?: User | null; ip?: string; userAgent?: string },
    now: Date = new Date(),
  ): Promise<ViewResult> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign || !VIEWABLE_STATUSES.includes(campaign.status)) {
      throw new NotFoundException("Campaign not found");
    }
    // Chủ dự án tự xem không làm phồng số liệu của chính mình.
    if (viewer.user && viewer.user.id === campaign.ownerId) {
      return { counted: false };
    }

    const viewerKey = viewer.user
      ? `u:${viewer.user.id}`
      : `a:${createHash("sha256").update(`${viewer.ip ?? ""}|${viewer.userAgent ?? ""}`).digest("hex").slice(0, 32)}`;
    const decision = await this.rateLimiter.consume(`campaign-view:${campaignId}:${viewerKey}`, 1, VIEW_DEDUPE_WINDOW_MS);
    if (!decision.allowed) {
      return { counted: false };
    }

    const viewDate = utcDate(now);
    await this.campaignRepo.manager.transaction(async (manager) => {
      await manager.increment(Campaign, { id: campaignId }, "viewCount", 1);
      // Upsert nguyên tử, chạy được trên cả MySQL 8 và MariaDB.
      await manager.query(
        `INSERT INTO campaign_view_daily (campaign_id, view_date, views) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE views = views + 1`,
        [campaignId, viewDate],
      );
    });
    return { counted: true };
  }

  async getStats(
    campaignId: string,
    user: User,
    days = DEFAULT_STATS_DAYS,
    now: Date = new Date(),
  ): Promise<CampaignStats> {
    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    if (campaign.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException("You can only view statistics of your own campaigns");
    }

    const dates = lastUtcDays(now, days);
    const from = new Date(`${dates[0]}T00:00:00.000Z`);

    const [viewRows, donations, followerCount] = await Promise.all([
      this.viewDailyRepo.find({ where: { campaignId, viewDate: In(dates) } }),
      // Chỉ giao dịch đã xác nhận (kể cả đã hoàn tiền sau đó vẫn là lượt chuyển đổi đã xảy ra).
      this.donationRepo.find({
        select: { amount: true, completedAt: true, status: true },
        where: {
          campaignId,
          status: In([DonationStatus.COMPLETED, DonationStatus.REFUNDED]),
          completedAt: Between(from, now),
        },
      }),
      this.followRepo.count({ where: { campaignId } }),
    ]);

    const byDate = new Map<string, DailyPoint>(
      dates.map((date) => [date, { date, views: 0, donations: 0, amount: 0 }]),
    );
    for (const row of viewRows) {
      // Driver mysql2 trả cột DATE dạng Date (timezone "Z" → nửa đêm UTC) hoặc chuỗi.
      const value: unknown = row.viewDate;
      const point = byDate.get(value instanceof Date ? utcDate(value) : String(value).slice(0, 10));
      if (point) point.views += Number(row.views);
    }
    for (const donation of donations) {
      if (!donation.completedAt) continue;
      const point = byDate.get(utcDate(new Date(donation.completedAt)));
      if (!point) continue;
      point.donations += 1;
      // Đã hoàn tiền thì không còn là tiền quỹ giữ lại.
      if (donation.status === DonationStatus.COMPLETED) point.amount += Number(donation.amount);
    }

    const viewCount = Number(campaign.viewCount) || 0;
    const backerCount = Number(campaign.backerCount) || 0;
    return {
      campaignId,
      viewCount,
      backerCount,
      followerCount,
      currentAmount: Number(campaign.currentAmount) || 0,
      goalAmount: Number(campaign.goalAmount) || 0,
      conversionRate: viewCount > 0 ? Math.min(1, backerCount / viewCount) : null,
      days,
      daily: dates.map((date) => byDate.get(date)!),
    };
  }
}
