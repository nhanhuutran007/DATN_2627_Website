import { createHash } from "node:crypto";

import {
  BadGatewayException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, DataSource, FindOptionsWhere, In, Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import type { PaymentGateway } from "../../integrations/payment/payment.gateway";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { Donation, DonationStatus } from "../donations/entities/donation.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { RewardTier } from "../rewards/entities/reward-tier.entity";
import { User } from "../users/entities/user.entity";
import { toCsv } from "./csv";
import {
  CampaignReconciliation,
  ReconciliationQueryDto,
  ReconciliationReport,
  RefundQueryDto,
} from "./dto/finance.dto";
import { RefundRequest, RefundRequestStatus } from "./entities/refund-request.entity";

/** Người ủng hộ tự yêu cầu hoàn trong khoảng này nếu chiến dịch còn đang gây quỹ. */
export const REFUND_WINDOW_DAYS = 7;

/** Chiến dịch thất bại/hủy: luôn được yêu cầu hoàn. */
const ALWAYS_REFUNDABLE = [CampaignStatus.FAILED, CampaignStatus.CANCELLED];
const WINDOW_REFUNDABLE = [CampaignStatus.ACTIVE, CampaignStatus.PAUSED, CampaignStatus.APPROVED];

const DAY_MS = 86_400_000;

export type RefundRequestList = { items: RefundRequest[]; total: number; offset: number; limit: number };

function money(value: number): string {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

/** Mã giả danh ổn định cho người ủng hộ trong file xuất (không lộ tên/email). */
export function pseudonym(userId: string): string {
  return `NUH-${createHash("sha256").update(userId).digest("hex").slice(0, 10).toUpperCase()}`;
}

/** Khoảng ngày [from 00:00, to 23:59:59.999] (UTC); mặc định 30 ngày gần nhất. */
export function resolveRange(query: { from?: string; to?: string }, now = new Date()): { from: Date; to: Date } {
  const to = query.to ? new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`) : now;
  const from = query.from
    ? new Date(`${query.from.slice(0, 10)}T00:00:00.000Z`)
    : new Date(to.getTime() - 30 * DAY_MS);
  return { from, to };
}

/**
 * Hoàn tiền (người ủng hộ yêu cầu → admin duyệt, hoặc admin hoàn trực tiếp) và
 * đối soát. Mọi thao tác tiền có audit; số liệu chiến dịch luôn khớp sổ giao dịch.
 */
@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    @InjectRepository(RefundRequest)
    private readonly refundRepo: Repository<RefundRequest>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly dataSource: DataSource,
    @Inject("PaymentGateway")
    private readonly paymentGateway: PaymentGateway,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ---------- Yêu cầu hoàn tiền ----------

  async requestRefund(donationId: string, reason: string, user: User, now = new Date()): Promise<RefundRequest> {
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation || donation.userId !== user.id) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status !== DonationStatus.COMPLETED) {
      throw new ConflictException("Chỉ yêu cầu hoàn được khoản ủng hộ đã xác nhận.");
    }
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    const completedAt = donation.completedAt ? new Date(donation.completedAt).getTime() : 0;
    const withinWindow = now.getTime() - completedAt <= REFUND_WINDOW_DAYS * DAY_MS;
    const eligible =
      ALWAYS_REFUNDABLE.includes(campaign.status) ||
      (WINDOW_REFUNDABLE.includes(campaign.status) && withinWindow);
    if (!eligible) {
      throw new ConflictException(
        `Chỉ yêu cầu hoàn trong ${REFUND_WINDOW_DAYS} ngày sau khi ủng hộ, hoặc khi chiến dịch không đạt mục tiêu/bị hủy.`,
      );
    }
    const open = await this.refundRepo.findOne({ where: { donationId, status: RefundRequestStatus.PENDING } });
    if (open) {
      throw new ConflictException("Khoản ủng hộ này đã có yêu cầu hoàn tiền đang chờ xử lý.");
    }
    const saved = await this.refundRepo.save(
      this.refundRepo.create({ donationId, userId: user.id, reason, status: RefundRequestStatus.PENDING }),
    );
    await this.auditService.record({
      userId: user.id,
      action: "refund.request",
      entity: "refund_request",
      entityId: saved.id,
      newValues: { donationId, amount: Number(donation.amount), reason: truncateForAudit(reason) },
    });
    return saved;
  }

  listMine(user: User): Promise<RefundRequest[]> {
    return this.refundRepo.find({
      where: { userId: user.id },
      relations: { donation: true },
      order: { createdAt: "DESC" },
      take: 100,
    });
  }

  async adminList(query: RefundQueryDto): Promise<RefundRequestList> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 30;
    const [items, total] = await this.refundRepo.findAndCount({
      where: query.status ? { status: query.status } : {},
      relations: { donation: { campaign: true }, user: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items, total, offset, limit };
  }

  private async getPendingRequest(id: string): Promise<RefundRequest> {
    const request = await this.refundRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException("Refund request not found");
    }
    if (request.status !== RefundRequestStatus.PENDING) {
      throw new ConflictException("Yêu cầu đã được xử lý.");
    }
    return request;
  }

  async approve(id: string, adminNotes: string, admin: User): Promise<RefundRequest> {
    const request = await this.getPendingRequest(id);
    await this.refundDonation(request.donationId, `Duyệt yêu cầu hoàn: ${adminNotes}`, admin, true);
    request.status = RefundRequestStatus.APPROVED;
    request.adminNotes = adminNotes;
    request.reviewedBy = admin.id;
    request.reviewedAt = new Date();
    const saved = await this.refundRepo.save(request);
    await this.auditService.record({
      userId: admin.id,
      action: "refund.approve",
      entity: "refund_request",
      entityId: id,
      oldValues: { status: RefundRequestStatus.PENDING },
      newValues: { status: RefundRequestStatus.APPROVED, adminNotes: truncateForAudit(adminNotes) },
    });
    return saved;
  }

  async reject(id: string, adminNotes: string, admin: User): Promise<RefundRequest> {
    const request = await this.getPendingRequest(id);
    request.status = RefundRequestStatus.REJECTED;
    request.adminNotes = adminNotes;
    request.reviewedBy = admin.id;
    request.reviewedAt = new Date();
    const saved = await this.refundRepo.save(request);
    await this.auditService.record({
      userId: admin.id,
      action: "refund.reject",
      entity: "refund_request",
      entityId: id,
      oldValues: { status: RefundRequestStatus.PENDING },
      newValues: { status: RefundRequestStatus.REJECTED, adminNotes: truncateForAudit(adminNotes) },
    });
    await this.notificationsService.notify({
      userId: request.userId,
      type: NotificationType.REFUND_REJECTED,
      title: "Yêu cầu hoàn tiền chưa được chấp nhận",
      message: `Quản trị viên đã xem xét và chưa chấp nhận yêu cầu hoàn tiền. Lý do: ${adminNotes}`,
      link: `/bien-nhan/${request.donationId}`,
      relatedId: id,
      email: true,
    });
    return saved;
  }

  // ---------- Hoàn tiền ----------

  /**
   * Hoàn toàn bộ một khoản đã xác nhận. Trong 1 transaction: đổi trạng thái có
   * điều kiện (chống hoàn 2 lần), gọi cổng thanh toán (lỗi → rollback), trừ số
   * liệu chiến dịch và trả lại suất quà.
   */
  async refundDonation(donationId: string, reason: string, actor: User, viaRequest = false): Promise<Donation> {
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status !== DonationStatus.COMPLETED) {
      throw new ConflictException("Chỉ hoàn được khoản ủng hộ đã xác nhận và chưa hoàn.");
    }
    const amount = Number(donation.amount);
    const refundedAt = new Date();

    const refundReference = await this.dataSource.transaction(async (manager) => {
      const claimed = await manager.update(
        Donation,
        { id: donationId, status: DonationStatus.COMPLETED },
        { status: DonationStatus.REFUNDED, refundedAt, refundReason: reason.slice(0, 500) },
      );
      if (!claimed.affected) {
        throw new ConflictException("Khoản ủng hộ vừa được xử lý bởi yêu cầu khác.");
      }
      const result = await this.paymentGateway.refundTransaction({
        transactionId: donation.transactionId ?? donation.id,
        amount,
        reason,
      });
      if (!result.success) {
        throw new BadGatewayException("Cổng thanh toán từ chối hoàn tiền. Vui lòng thử lại sau.");
      }
      await manager.update(Donation, { id: donationId }, { refundReference: result.refundId });
      await manager
        .createQueryBuilder()
        .update(Campaign)
        .set({
          currentAmount: () => "GREATEST(current_amount - :amount, 0)",
          backerCount: () => "GREATEST(backer_count - 1, 0)",
        })
        .where("id = :id", { id: donation.campaignId })
        .setParameter("amount", amount)
        .execute();
      if (donation.rewardTierId) {
        await manager
          .createQueryBuilder()
          .update(RewardTier)
          .set({ claimedCount: () => "claimed_count - 1" })
          .where("id = :id", { id: donation.rewardTierId })
          .andWhere("claimed_count > 0")
          .execute();
      }
      return result.refundId;
    });

    await this.auditService.record({
      userId: actor.id,
      action: "donation.refund",
      entity: "donation",
      entityId: donationId,
      oldValues: { status: DonationStatus.COMPLETED },
      newValues: {
        status: DonationStatus.REFUNDED,
        amount,
        campaignId: donation.campaignId,
        refundReference,
        reason: truncateForAudit(reason),
        viaRequest,
      },
    });
    await this.notifyRefunded(donation, amount).catch((error: Error) =>
      this.logger.error(`Không gửi được thông báo hoàn tiền ${donationId}: ${error.message}`),
    );
    return { ...donation, status: DonationStatus.REFUNDED, refundedAt, refundReference, refundReason: reason } as Donation;
  }

  private async notifyRefunded(donation: Donation, amount: number): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    const title = campaign?.title ?? "chiến dịch";
    await this.notificationsService.notify([
      {
        userId: donation.userId,
        type: NotificationType.REFUND_APPROVED,
        title: "Khoản ủng hộ đã được hoàn",
        message: `Khoản ${money(amount)} cho chiến dịch "${title}" đã được hoàn qua cổng thanh toán.`,
        link: `/bien-nhan/${donation.id}`,
        relatedId: donation.id,
        email: true,
      },
      ...(campaign && campaign.ownerId !== donation.userId
        ? [
            {
              userId: campaign.ownerId,
              type: NotificationType.DONATION_REFUNDED,
              title: "Một khoản ủng hộ đã được hoàn",
              message: `Chiến dịch "${title}" vừa hoàn ${money(amount)} cho người ủng hộ; số tiền đã huy động được cập nhật.`,
              link: "/dashboard",
              relatedId: campaign.id,
            },
          ]
        : []),
    ]);
  }

  // ---------- Đối soát ----------

  async reconcile(query: ReconciliationQueryDto, now = new Date()): Promise<ReconciliationReport> {
    const { from, to } = resolveRange(query, now);
    const campaignFilter: FindOptionsWhere<Donation> = query.campaignId ? { campaignId: query.campaignId } : {};
    const completed = await this.donationRepo.find({
      where: {
        ...campaignFilter,
        status: In([DonationStatus.COMPLETED, DonationStatus.REFUNDED]),
        completedAt: Between(from, to),
      },
    });
    const refunded = await this.donationRepo.find({
      where: { ...campaignFilter, status: DonationStatus.REFUNDED, refundedAt: Between(from, to) },
    });

    const byCampaign = new Map<string, { completedCount: number; completedAmount: number; refundedCount: number; refundedAmount: number }>();
    const bucket = (id: string) => {
      const b = byCampaign.get(id) ?? { completedCount: 0, completedAmount: 0, refundedCount: 0, refundedAmount: 0 };
      byCampaign.set(id, b);
      return b;
    };
    for (const d of completed) {
      const b = bucket(d.campaignId);
      b.completedCount += 1;
      b.completedAmount += Number(d.amount);
    }
    for (const d of refunded) {
      const b = bucket(d.campaignId);
      b.refundedCount += 1;
      b.refundedAmount += Number(d.amount);
    }

    const ids = [...byCampaign.keys()];
    const campaigns = ids.length ? await this.campaignRepo.find({ where: { id: In(ids) } }) : [];
    const ledgerRows: Array<{ campaignId: string; total: string | number; backers: string | number }> = ids.length
      ? await this.donationRepo
          .createQueryBuilder("d")
          .select("d.campaign_id", "campaignId")
          .addSelect("COALESCE(SUM(d.amount), 0)", "total")
          .addSelect("COUNT(*)", "backers")
          .where("d.campaign_id IN (:...ids)", { ids })
          .andWhere("d.status = :status", { status: DonationStatus.COMPLETED })
          .groupBy("d.campaign_id")
          .getRawMany()
      : [];
    const ledger = new Map(ledgerRows.map((r) => [r.campaignId, { amount: Number(r.total), backers: Number(r.backers) }]));

    const rows: CampaignReconciliation[] = campaigns
      .map((c) => {
        const b = byCampaign.get(c.id)!;
        const l = ledger.get(c.id) ?? { amount: 0, backers: 0 };
        const recordedAmount = Number(c.currentAmount);
        return {
          campaignId: c.id,
          title: c.title,
          ...b,
          netAmount: b.completedAmount - b.refundedAmount,
          recordedAmount,
          recordedBackers: c.backerCount,
          ledgerAmount: l.amount,
          ledgerBackers: l.backers,
          mismatch: Math.abs(recordedAmount - l.amount) > 0.5 || c.backerCount !== l.backers,
        };
      })
      .sort((a, b) => b.completedAmount - a.completedAmount);

    const totals = rows.reduce(
      (acc, r) => ({
        completedCount: acc.completedCount + r.completedCount,
        completedAmount: acc.completedAmount + r.completedAmount,
        refundedCount: acc.refundedCount + r.refundedCount,
        refundedAmount: acc.refundedAmount + r.refundedAmount,
        netAmount: acc.netAmount + r.netAmount,
      }),
      { completedCount: 0, completedAmount: 0, refundedCount: 0, refundedAmount: 0, netAmount: 0 },
    );
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totals,
      campaigns: rows,
      mismatches: rows.filter((r) => r.mismatch).length,
    };
  }

  /** CSV giao dịch trong kỳ (xác nhận hoặc hoàn trong kỳ). Người ủng hộ được giả danh hóa. */
  async exportCsv(query: ReconciliationQueryDto, actor: User, now = new Date()): Promise<{ filename: string; content: string; rows: number }> {
    const { from, to } = resolveRange(query, now);
    const campaignFilter: FindOptionsWhere<Donation> = query.campaignId ? { campaignId: query.campaignId } : {};
    const donations = await this.donationRepo.find({
      where: [
        { ...campaignFilter, status: In([DonationStatus.COMPLETED, DonationStatus.REFUNDED]), completedAt: Between(from, to) },
        { ...campaignFilter, status: DonationStatus.REFUNDED, refundedAt: Between(from, to) },
      ],
      relations: { campaign: true, rewardTier: true },
      order: { completedAt: "ASC" },
    });
    const header = [
      "ma_giao_dich", "thoi_gian_xac_nhan", "ma_chien_dich", "chien_dich", "so_tien", "tien_te", "trang_thai",
      "kenh_thanh_toan", "ma_cong_thanh_toan", "nguoi_ung_ho", "an_danh", "muc_qua",
      "thoi_gian_hoan", "ma_hoan_tien", "ly_do_hoan",
    ];
    const rows = donations.map((d) => [
      d.id, d.completedAt ?? "", d.campaignId, d.campaign?.title ?? "", Number(d.amount), d.currency, d.status,
      d.paymentMethod ?? "", d.transactionId ?? "", pseudonym(d.userId), d.isAnonymous ? "co" : "khong",
      d.rewardTier?.title ?? "", d.refundedAt ?? "", d.refundReference ?? "", d.refundReason ?? "",
    ]);
    await this.auditService.record({
      userId: actor.id,
      action: "finance.export",
      entity: "donation",
      newValues: { from: from.toISOString(), to: to.toISOString(), campaignId: query.campaignId ?? null, rows: rows.length },
    });
    const day = (date: Date) => date.toISOString().slice(0, 10);
    return { filename: `doi-soat_${day(from)}_${day(to)}.csv`, content: toCsv(header, rows), rows: rows.length };
  }
}
