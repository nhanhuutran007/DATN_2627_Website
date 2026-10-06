import { createHash } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, In, Repository } from "typeorm";

import { AuditService } from "../../common/audit/audit.service";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { toCsv } from "../finance/csv";
import { resolveRange } from "../finance/finance.service";
import { MilestoneUpdate } from "../progress/entities/milestone-update.entity";
import { Milestone } from "../progress/entities/milestone.entity";
import type { User } from "../users/entities/user.entity";

export type CsvFile = { filename: string; content: string; rows: number };

/** Mã giả danh chủ dự án: đối chiếu được giữa các lần xuất nhưng không lộ danh tính. */
export function ownerPseudonym(ownerId: string): string {
  return `CDA-${createHash("sha256").update(`owner:${ownerId}`).digest("hex").slice(0, 10).toUpperCase()}`;
}

/** Ngày theo giờ Việt Nam (UTC+7), `yyyy-mm-dd` — thống kê theo ngày làm việc địa phương. */
function vnDay(date: Date): string {
  return new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Xuất thống kê cho báo cáo/đối tác: chỉ số liệu tổng hợp, không có tên, email,
 * số điện thoại hay danh tính người ủng hộ; chủ dự án được giả danh. Mỗi lần
 * xuất ghi audit `admin.export`.
 */
@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Milestone)
    private readonly milestoneRepo: Repository<Milestone>,
    @InjectRepository(MilestoneUpdate)
    private readonly milestoneUpdateRepo: Repository<MilestoneUpdate>,
    private readonly auditService: AuditService,
  ) {}

  /** Một dòng cho mỗi chiến dịch: mục tiêu, số đã huy động, tiến độ mốc, chi đã báo cáo. */
  async exportCampaigns(admin: User, now = new Date()): Promise<CsvFile> {
    const [campaigns, milestones, updates] = await Promise.all([
      this.campaignRepo.find({ order: { createdAt: "ASC" } }),
      this.milestoneRepo.find(),
      this.milestoneUpdateRepo.find(),
    ]);

    const milestoneCampaign = new Map(milestones.map((milestone) => [milestone.id, milestone.campaignId]));
    const plan = new Map<string, { total: number; done: number; expense: number }>();
    const entry = (campaignId: string) => {
      const existing = plan.get(campaignId) ?? { total: 0, done: 0, expense: 0 };
      plan.set(campaignId, existing);
      return existing;
    };
    for (const milestone of milestones) {
      const item = entry(milestone.campaignId);
      item.total++;
      if (milestone.isCompleted) item.done++;
    }
    for (const update of updates) {
      const campaignId = milestoneCampaign.get(update.milestoneId);
      if (campaignId) entry(campaignId).expense += Number(update.expenseAmount ?? 0);
    }

    const header = [
      "ma_chien_dich", "ten", "linh_vuc", "dia_phuong", "trang_thai", "noi_bat", "ma_chu_du_an",
      "muc_tieu", "da_huy_dong", "ty_le_dat", "luot_ung_ho", "luot_xem",
      "so_moc", "moc_hoan_thanh", "chi_da_bao_cao", "ngay_tao", "ngay_bat_dau", "ngay_ket_thuc",
    ];
    const rows = campaigns.map((campaign) => {
      const goal = Number(campaign.goalAmount);
      const raised = Number(campaign.currentAmount);
      const item = plan.get(campaign.id) ?? { total: 0, done: 0, expense: 0 };
      return [
        campaign.id, campaign.title, campaign.category, campaign.location ?? "", campaign.status,
        campaign.isFeatured ? "co" : "khong", ownerPseudonym(campaign.ownerId),
        goal, raised, goal > 0 ? Math.round((raised / goal) * 1000) / 10 : 0, campaign.backerCount, campaign.viewCount,
        item.total, item.done, item.expense,
        isoDay(campaign.createdAt), isoDay(campaign.startDate), isoDay(campaign.endDate),
      ];
    });

    await this.auditService.record({
      userId: admin.id,
      action: "admin.export",
      entity: "export",
      newValues: { kind: "campaigns", rows: rows.length },
    });
    return { filename: `thong-ke-chien-dich_${isoDay(now)}.csv`, content: toCsv(header, rows), rows: rows.length };
  }

  /** Ủng hộ theo ngày (giờ VN) × lĩnh vực trong khoảng [from, to]; mặc định 30 ngày gần nhất. */
  async exportDailyDonations(query: { from?: string; to?: string }, admin: User, now = new Date()): Promise<CsvFile> {
    const { from, to } = resolveRange(query, now);
    const donations = await this.donationRepo.find({
      where: {
        status: In([DonationStatus.COMPLETED, DonationStatus.REFUNDED]),
        completedAt: Between(from, to),
      },
      select: { id: true, campaignId: true, amount: true, status: true, completedAt: true },
    });
    const campaignIds = [...new Set(donations.map((donation) => donation.campaignId))];
    const campaigns = campaignIds.length
      ? await this.campaignRepo.find({ where: { id: In(campaignIds) }, select: { id: true, category: true } })
      : [];
    const categoryOf = new Map(campaigns.map((campaign) => [campaign.id, campaign.category]));

    type Bucket = { completed: number; completedAmount: number; refunded: number; refundedAmount: number };
    const buckets = new Map<string, Bucket>();
    for (const donation of donations) {
      if (!donation.completedAt) continue;
      const key = `${vnDay(new Date(donation.completedAt))}|${categoryOf.get(donation.campaignId) ?? "Khác"}`;
      const bucket = buckets.get(key) ?? { completed: 0, completedAmount: 0, refunded: 0, refundedAmount: 0 };
      // Giao dịch đã hoàn tiền vẫn tính vào ngày được xác nhận, tách cột riêng.
      if (donation.status === DonationStatus.REFUNDED) {
        bucket.refunded++;
        bucket.refundedAmount += Number(donation.amount);
      } else {
        bucket.completed++;
        bucket.completedAmount += Number(donation.amount);
      }
      buckets.set(key, bucket);
    }

    const header = ["ngay", "linh_vuc", "so_luot_thanh_cong", "tien_thanh_cong", "so_luot_hoan", "tien_hoan"];
    const rows = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, bucket]) => {
        const [date, category] = key.split("|");
        return [date, category, bucket.completed, bucket.completedAmount, bucket.refunded, bucket.refundedAmount];
      });

    await this.auditService.record({
      userId: admin.id,
      action: "admin.export",
      entity: "export",
      newValues: { kind: "donations-daily", from: from.toISOString(), to: to.toISOString(), rows: rows.length },
    });
    return {
      filename: `ung-ho-theo-ngay_${isoDay(from)}_${isoDay(to)}.csv`,
      content: toCsv(header, rows),
      rows: rows.length,
    };
  }
}
