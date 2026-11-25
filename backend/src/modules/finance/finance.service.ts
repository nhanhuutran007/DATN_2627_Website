import { createHash } from "node:crypto";

import {
  BadGatewayException,
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
import { Between, DataSource, FindOptionsWhere, In, Like, Repository } from "typeorm";

import { AuditService, truncateForAudit } from "../../common/audit/audit.service";
import { rangeFilter, vnDateRange, vnDayEnd, vnDayStart } from "../../common/query/range";
import type { PaymentGateway } from "../../integrations/payment/payment.gateway";
import type { CardPledgeGateway } from "../../integrations/payment/stripe";
import { WalletService } from "../wallet/wallet.service";
import { closedWithoutReachingGoal } from "../campaigns/campaign-outcome";
import { CampaignDisbursement } from "../campaigns/entities/campaign-disbursement.entity";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { COUNTED_DONATION_STATUSES, Donation, DonationStatus, RefundMethod } from "../donations/entities/donation.entity";
import { MediaFile, MediaPurpose } from "../media/entities/media-file.entity";
import { MEDIA_URL_PREFIX } from "../media/media.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { RewardTier } from "../rewards/entities/reward-tier.entity";
import { User } from "../users/entities/user.entity";
import { toCsv } from "./csv";
import {
  CampaignReconciliation,
  ReconciliationQueryDto,
  ReconciliationReport,
  RefundExportQueryDto,
  RefundQueryDto,
} from "./dto/finance.dto";
import { RefundRequest, RefundRequestStatus } from "./entities/refund-request.entity";

/** Người ủng hộ tự yêu cầu hoàn trong khoảng này nếu chiến dịch còn đang gây quỹ. */
export const REFUND_WINDOW_DAYS = 7;

export type AutoRefundOutcome = { refunded: boolean; reason: string };

export type AutoRefundEvent = {
  /** `pledge_released`: cam kết trả về ví/hủy khi dự án không đạt; `auto_refund`: khoản đã thu được tự hoàn. */
  kind: "pledge_released" | "auto_refund";
  donationId: string;
  campaignTitle: string;
  donorName: string;
  amount: number;
  /** `wallet`: về ví Góp Mầm; `pledge_cancelled`: cam kết thẻ không bị trừ; `gateway`: hoàn qua cổng. */
  destination: "wallet" | "pledge_cancelled" | "gateway";
  at: string;
};

export type AutoRefundSummary = {
  releasedPledges: { count: number; amount: number };
  autoRefunds: { count: number; amount: number };
  /** Yêu cầu hoàn còn chờ admin kiểm tra và duyệt thủ công. */
  pendingManual: number;
  recent: AutoRefundEvent[];
};

const WINDOW_REFUNDABLE = [CampaignStatus.ACTIVE, CampaignStatus.PAUSED, CampaignStatus.APPROVED];

const DAY_MS = 86_400_000;

export type RefundRequestList = { items: RefundRequest[]; total: number; offset: number; limit: number };

export type RefundRequestInput = {
  reason: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
};

/** Thông tin chuyển khoản hoàn thủ công do admin nhập khi hoàn khoản qua SePay. */
export type ManualTransferInput = { transferReference?: string; proofMediaId?: string };

/** Kênh không hoàn được qua API (SePay không có API hoàn tiền) → admin chuyển khoản trả lại thủ công. */
export function needsManualRefund(paymentMethod?: string | null): boolean {
  return paymentMethod === "sepay";
}

/** Che số tài khoản trong audit log, chỉ giữ 4 số cuối. */
function maskAccount(accountNumber: string): string {
  return `***${accountNumber.slice(-4)}`;
}

function money(value: number): string {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

/** Mã giả danh ổn định cho người ủng hộ trong file xuất (không lộ tên/email). */
export function pseudonym(userId: string): string {
  return `NUH-${createHash("sha256").update(userId).digest("hex").slice(0, 10).toUpperCase()}`;
}

/** Ngày theo giờ Việt Nam (UTC+7), `yyyy-mm-dd`. */
export function vnDay(date: Date): string {
  return new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Khoảng ngày [from 00:00, to 23:59:59.999] theo giờ Việt Nam (UTC+7) — khớp với
 * ngày người quản trị chọn trên lịch; mặc định 30 ngày gần nhất.
 */
export function resolveRange(query: { from?: string; to?: string }, now = new Date()): { from: Date; to: Date } {
  const to = query.to ? new Date(`${query.to.slice(0, 10)}T23:59:59.999+07:00`) : now;
  const from = query.from
    ? new Date(`${query.from.slice(0, 10)}T00:00:00.000+07:00`)
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
    @InjectRepository(MediaFile)
    private readonly mediaRepo: Repository<MediaFile>,
    @Optional()
    @Inject("StripeGateway")
    private readonly stripe: CardPledgeGateway | null = null,
    @Optional()
    // Kiểu `X | null` làm metadata thành Object: phải chỉ rõ token, nếu không Nest âm thầm inject null.
    @Inject(WalletService)
    private readonly wallet: WalletService | null = null,
    @Optional()
    @InjectRepository(CampaignDisbursement)
    private readonly disbursementRepo: Repository<CampaignDisbursement> | null = null,
  ) {}

  // ---------- Yêu cầu hoàn tiền ----------

  async requestRefund(donationId: string, input: RefundRequestInput, user: User, now = new Date()): Promise<RefundRequest> {
    const { reason } = input;
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
    // Chiến dịch khép lại mà không đạt mục tiêu (thất bại, bị hủy, hoặc đã đóng sau
    // đó): luôn được yêu cầu hoàn, không giới hạn 7 ngày.
    const eligible =
      (WINDOW_REFUNDABLE.includes(campaign.status) && withinWindow) ||
      (await closedWithoutReachingGoal(campaign, this.donationRepo));
    if (!eligible) {
      throw new ConflictException(
        `Chỉ yêu cầu hoàn trong ${REFUND_WINDOW_DAYS} ngày sau khi ủng hộ, hoặc khi chiến dịch không đạt mục tiêu/bị hủy.`,
      );
    }
    const open = await this.refundRepo.findOne({ where: { donationId, status: RefundRequestStatus.PENDING } });
    if (open) {
      throw new ConflictException("Khoản ủng hộ này đã có yêu cầu hoàn tiền đang chờ xử lý.");
    }
    const bankFields = [input.bankName, input.bankAccountNumber, input.bankAccountName];
    const hasBank = bankFields.every(Boolean);
    if (!hasBank && (bankFields.some(Boolean) || needsManualRefund(donation.paymentMethod))) {
      throw new BadRequestException(
        "Vui lòng nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản để nhận lại tiền chuyển khoản.",
      );
    }
    const saved = await this.refundRepo.save(
      this.refundRepo.create({
        donationId,
        userId: user.id,
        reason,
        status: RefundRequestStatus.PENDING,
        bankName: hasBank ? input.bankName : null,
        bankAccountNumber: hasBank ? input.bankAccountNumber : null,
        bankAccountName: hasBank ? input.bankAccountName : null,
      }),
    );
    await this.auditService.record({
      userId: user.id,
      action: "refund.request",
      entity: "refund_request",
      entityId: saved.id,
      newValues: {
        donationId,
        amount: Number(donation.amount),
        reason: truncateForAudit(reason),
        bankAccount: hasBank && input.bankAccountNumber ? `${input.bankName} ${maskAccount(input.bankAccountNumber)}` : null,
      },
    });
    return saved;
  }

  /**
   * Hoàn tiền tự động theo kết quả dự án: chỉ khi chiến dịch kết thúc không đạt mục tiêu hoặc bị hủy,
   * khoản đã thu qua ví Góp Mầm/cổng có API được hoàn ngay (khoản ví về lại ví Góp Mầm). Khoản cam kết
   * (`pledged`) không qua đây — `PledgeSettlementService` trả thẳng về ví khi chiến dịch không đạt.
   * Mọi trường hợp khác — người ủng hộ tự yêu cầu khi dự án còn chạy, khoản SePay cần chuyển khoản tay —
   * giữ `pending` để admin kiểm tra thông tin và duyệt thủ công.
   */
  async tryAutoRefund(requestId: string, now = new Date()): Promise<AutoRefundOutcome> {
    const request = await this.refundRepo.findOne({ where: { id: requestId } });
    if (!request || request.status !== RefundRequestStatus.PENDING) {
      return { refunded: false, reason: "Yêu cầu không còn chờ xử lý." };
    }
    const donation = await this.donationRepo.findOne({ where: { id: request.donationId } });
    if (!donation || donation.status !== DonationStatus.COMPLETED) {
      return { refunded: false, reason: "Khoản ủng hộ không còn ở trạng thái hoàn được." };
    }
    if (needsManualRefund(donation.paymentMethod)) {
      return { refunded: false, reason: "Khoản qua SePay: admin kiểm tra tài khoản nhận và chuyển khoản hoàn thủ công." };
    }
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    const campaignFailed = campaign ? await closedWithoutReachingGoal(campaign, this.donationRepo) : false;
    if (!campaignFailed) {
      return { refunded: false, reason: "Dự án chưa kết thúc thất bại: admin kiểm tra và duyệt thủ công." };
    }

    const notes = "Tự động: chiến dịch kết thúc không đạt mục tiêu hoặc bị hủy.";
    await this.refundDonation(donation.id, notes, null, { viaRequest: true });
    request.status = RefundRequestStatus.APPROVED;
    request.adminNotes = notes;
    request.reviewedBy = null;
    request.reviewedAt = now;
    await this.refundRepo.save(request);
    await this.auditService.record({
      action: "refund.auto_approve",
      entity: "refund_request",
      entityId: request.id,
      oldValues: { status: RefundRequestStatus.PENDING },
      newValues: { status: RefundRequestStatus.APPROVED, adminNotes: notes, amount: Number(donation.amount) },
    });
    return { refunded: true, reason: notes };
  }

  /** Quét yêu cầu đang chờ (hệ thống tạo khi chiến dịch thất bại) để tự hoàn khoản đủ điều kiện. */
  async processPendingAutoRefunds(limit = 50, now = new Date()): Promise<number> {
    const pending = await this.refundRepo.find({
      where: { status: RefundRequestStatus.PENDING },
      order: { createdAt: "ASC" },
      take: limit,
    });
    let refunded = 0;
    for (const request of pending) {
      try {
        if ((await this.tryAutoRefund(request.id, now)).refunded) refunded += 1;
      } catch (error) {
        this.logger.error(`Không tự hoàn được yêu cầu ${request.id}: ${(error as Error).message}`);
      }
    }
    return refunded;
  }

  /**
   * Theo dõi hoàn tiền tự động cho admin: cam kết đã trả về ví (dự án không đạt mục tiêu), khoản đã thu
   * được hệ thống tự hoàn, và số yêu cầu còn chờ admin duyệt thủ công; kèm các sự kiện gần nhất.
   */
  async autoRefundSummary(range: { from?: string; to?: string } = {}, limit = 15): Promise<AutoRefundSummary> {
    // Lọc theo thời điểm hoàn: cam kết được nhả (updatedAt) / yêu cầu được tự duyệt (reviewedAt).
    const when = vnDateRange(range.from, range.to);
    const releasedSumQuery = this.donationRepo
      .createQueryBuilder("d")
      .select("COUNT(*)", "count")
      .addSelect("COALESCE(SUM(d.amount), 0)", "amount")
      .where("d.status = :status", { status: DonationStatus.RELEASED });
    if (range.from) releasedSumQuery.andWhere("d.updated_at >= :from", { from: vnDayStart(range.from) });
    if (range.to) releasedSumQuery.andWhere("d.updated_at <= :to", { to: vnDayEnd(range.to) });
    const [released, releasedSum, autoRefunds, pendingManual] = await Promise.all([
      this.donationRepo.find({
        where: { status: DonationStatus.RELEASED, ...(when ? { updatedAt: when } : {}) },
        relations: { campaign: true, user: true },
        order: { updatedAt: "DESC" },
        take: limit,
      }),
      releasedSumQuery.getRawOne<{ count: string | number; amount: string | number }>(),
      this.refundRepo.find({
        where: { status: RefundRequestStatus.APPROVED, adminNotes: Like("Tự động:%"), ...(when ? { reviewedAt: when } : {}) },
        relations: { donation: { campaign: true, user: true } },
        order: { reviewedAt: "DESC" },
      }),
      this.refundRepo.count({ where: { status: RefundRequestStatus.PENDING } }),
    ]);

    const releasedEvents: AutoRefundEvent[] = released.map((d) => ({
      kind: "pledge_released",
      donationId: d.id,
      campaignTitle: d.campaign?.title ?? "",
      donorName: d.user?.name ?? "",
      amount: Number(d.amount),
      destination: d.paymentMethod === "balance" ? "wallet" : "pledge_cancelled",
      at: new Date(d.updatedAt).toISOString(),
    }));
    const refundEvents: AutoRefundEvent[] = autoRefunds.slice(0, limit).map((r) => ({
      kind: "auto_refund",
      donationId: r.donationId,
      campaignTitle: r.donation?.campaign?.title ?? "",
      donorName: r.donation?.user?.name ?? "",
      amount: Number(r.donation?.amount ?? 0),
      destination: r.donation?.paymentMethod === "balance" ? "wallet" : "gateway",
      at: new Date(r.reviewedAt ?? r.updatedAt).toISOString(),
    }));

    return {
      releasedPledges: { count: Number(releasedSum?.count ?? 0), amount: Number(releasedSum?.amount ?? 0) },
      autoRefunds: {
        count: autoRefunds.length,
        amount: autoRefunds.reduce((sum, r) => sum + Number(r.donation?.amount ?? 0), 0),
      },
      pendingManual,
      recent: [...releasedEvents, ...refundEvents].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit),
    };
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
    const createdAt = vnDateRange(query.from, query.to);
    const base: FindOptionsWhere<RefundRequest> = {
      ...(query.status ? { status: query.status } : {}),
      ...(createdAt ? { createdAt } : {}),
    };
    const amount = rangeFilter(query.minAmount, query.maxAmount, "amount");
    const keyword = query.q?.trim();
    const like = keyword ? Like(`%${keyword}%`) : undefined;
    const where: FindOptionsWhere<RefundRequest>[] = like
      ? [
          { ...base, reason: like, ...(amount ? { donation: { amount } } : {}) },
          { ...base, user: { name: like }, ...(amount ? { donation: { amount } } : {}) },
          { ...base, user: { email: like }, ...(amount ? { donation: { amount } } : {}) },
          { ...base, donation: { campaign: { title: like }, ...(amount ? { amount } : {}) } },
        ]
      : [{ ...base, ...(amount ? { donation: { amount } } : {}) }];
    const [items, total] = await this.refundRepo.findAndCount({
      where,
      relations: { donation: { campaign: true }, user: true },
      order: { createdAt: "DESC" },
      skip: offset,
      take: limit,
    });
    return { items, total, offset, limit };
  }

  /**
   * Người ủng hộ bổ sung tài khoản nhận hoàn cho yêu cầu đang chờ (thường là yêu cầu
   * hệ thống tự tạo khi chiến dịch không đạt mục tiêu, vì SePay không có API hoàn).
   */
  async updateBankInfo(
    id: string,
    input: { bankName: string; bankAccountNumber: string; bankAccountName: string },
    user: User,
  ): Promise<RefundRequest> {
    const request = await this.refundRepo.findOne({ where: { id } });
    if (!request || request.userId !== user.id) {
      throw new NotFoundException("Refund request not found");
    }
    if (request.status !== RefundRequestStatus.PENDING) {
      throw new ConflictException("Yêu cầu đã được xử lý.");
    }
    request.bankName = input.bankName;
    request.bankAccountNumber = input.bankAccountNumber;
    request.bankAccountName = input.bankAccountName;
    const saved = await this.refundRepo.save(request);
    await this.auditService.record({
      userId: user.id,
      action: "refund.bank-update",
      entity: "refund_request",
      entityId: id,
      newValues: { bankAccount: `${input.bankName} ${maskAccount(input.bankAccountNumber)}` },
    });
    return saved;
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

  async approve(id: string, adminNotes: string, admin: User, manual: ManualTransferInput = {}): Promise<RefundRequest> {
    const request = await this.getPendingRequest(id);
    if (!request.bankAccountNumber) {
      const donation = await this.donationRepo.findOne({ where: { id: request.donationId } });
      if (donation && needsManualRefund(donation.paymentMethod)) {
        throw new BadRequestException("Người ủng hộ chưa bổ sung tài khoản nhận hoàn nên chưa chuyển khoản hoàn được.");
      }
    }
    await this.refundDonation(request.donationId, `Duyệt yêu cầu hoàn: ${adminNotes}`, admin, { viaRequest: true, manual });
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
   * liệu chiến dịch và trả lại suất quà. Khoản qua SePay (không có API hoàn) không
   * gọi cổng: admin đã chuyển khoản trả lại và phải nhập mã giao dịch thật.
   */
  async refundDonation(
    donationId: string,
    reason: string,
    /** `null` = hệ thống (hoàn tiền tự động). */
    actor: User | null,
    options: { viaRequest?: boolean; manual?: ManualTransferInput } = {},
  ): Promise<Donation> {
    const viaRequest = options.viaRequest ?? false;
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status !== DonationStatus.COMPLETED) {
      throw new ConflictException("Chỉ hoàn được khoản ủng hộ đã xác nhận và chưa hoàn.");
    }
    // Đã gom tiền chuyển cho chủ dự án: Góp Mầm không còn giữ khoản này để hoàn.
    if (this.disbursementRepo && (await this.disbursementRepo.count({ where: { campaignId: donation.campaignId } })) > 0) {
      throw new ConflictException("Chiến dịch đã được giải ngân cho chủ dự án nên không hoàn tiền qua hệ thống được.");
    }
    const amount = Number(donation.amount);
    const refundedAt = new Date();
    const manualTransfer = needsManualRefund(donation.paymentMethod);
    const transferReference = options.manual?.transferReference?.trim();
    if (manualTransfer && !transferReference) {
      throw new BadRequestException(
        "Khoản ủng hộ qua SePay phải chuyển khoản hoàn thủ công: nhập mã giao dịch chuyển khoản đã thực hiện.",
      );
    }
    const toWallet = donation.paymentMethod === "balance";
    const refundMethod = manualTransfer
      ? RefundMethod.MANUAL_TRANSFER
      : toWallet
        ? RefundMethod.WALLET
        : RefundMethod.GATEWAY;
    const refundProofUrl =
      manualTransfer && options.manual?.proofMediaId && actor
        ? await this.resolveRefundProof(options.manual.proofMediaId, actor)
        : null;

    const refundReference = await this.dataSource.transaction(async (manager) => {
      const claimed = await manager.update(
        Donation,
        { id: donationId, status: DonationStatus.COMPLETED },
        { status: DonationStatus.REFUNDED, refundedAt, refundReason: reason.slice(0, 500) },
      );
      if (!claimed.affected) {
        throw new ConflictException("Khoản ủng hộ vừa được xử lý bởi yêu cầu khác.");
      }
      let refundId: string;
      if (manualTransfer && transferReference) {
        refundId = transferReference;
      } else if (toWallet) {
        // Ủng hộ bằng ví: hoàn thẳng về ví Góp Mầm trong cùng transaction.
        if (!this.wallet) {
          throw new BadGatewayException("Ví Góp Mầm chưa sẵn sàng nên chưa hoàn được khoản này.");
        }
        refundId = await this.wallet.refund(manager, donation, reason);
      } else if (donation.paymentMethod === "stripe") {
        // Khoản cam kết đã trừ tiền thẻ: hoàn qua Stripe theo mã PaymentIntent (`pi_…`).
        if (!this.stripe || !donation.transactionId) {
          throw new BadGatewayException("Cổng thẻ Stripe chưa cấu hình nên chưa hoàn được khoản này.");
        }
        const result = await this.stripe.refund(donation.transactionId);
        if (!result.success) {
          throw new BadGatewayException("Stripe từ chối hoàn tiền. Vui lòng thử lại sau.");
        }
        refundId = result.refundId;
      } else {
        const result = await this.paymentGateway.refundTransaction({
          transactionId: donation.transactionId ?? donation.id,
          amount,
          reason,
        });
        if (!result.success) {
          throw new BadGatewayException("Cổng thanh toán từ chối hoàn tiền. Vui lòng thử lại sau.");
        }
        refundId = result.refundId;
      }
      await manager.update(Donation, { id: donationId }, { refundReference: refundId, refundMethod, refundProofUrl });
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
      return refundId;
    });

    await this.auditService.record({
      userId: actor?.id ?? null,
      action: "donation.refund",
      entity: "donation",
      entityId: donationId,
      oldValues: { status: DonationStatus.COMPLETED },
      newValues: {
        status: DonationStatus.REFUNDED,
        amount,
        campaignId: donation.campaignId,
        refundReference,
        refundMethod,
        refundProofUrl,
        reason: truncateForAudit(reason),
        viaRequest,
      },
    });
    await this.notifyRefunded(donation, amount, refundReference).catch((error: Error) =>
      this.logger.error(`Không gửi được thông báo hoàn tiền ${donationId}: ${error.message}`),
    );
    return {
      ...donation,
      status: DonationStatus.REFUNDED,
      refundedAt,
      refundReference,
      refundReason: reason,
      refundMethod,
      refundProofUrl,
    } as Donation;
  }

  /** Chứng từ hoàn phải là ảnh `refund_proof` do chính admin đang thao tác tải lên. */
  private async resolveRefundProof(mediaId: string, actor: User): Promise<string> {
    const file = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!file || file.purpose !== MediaPurpose.REFUND_PROOF) {
      throw new BadRequestException("Chứng từ không tồn tại hoặc không phải ảnh chứng từ hoàn tiền.");
    }
    if (file.ownerId !== actor.id) {
      throw new ForbiddenException("Chỉ dùng được chứng từ do chính bạn tải lên.");
    }
    return `${MEDIA_URL_PREFIX}${file.storageKey}`;
  }

  private async notifyRefunded(donation: Donation, amount: number, reference: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    const title = campaign?.title ?? "chiến dịch";
    await this.notificationsService.notify([
      {
        userId: donation.userId,
        type: NotificationType.REFUND_APPROVED,
        title: "Khoản ủng hộ đã được hoàn",
        message: needsManualRefund(donation.paymentMethod)
          ? `Khoản ${money(amount)} cho chiến dịch "${title}" đã được hoàn bằng chuyển khoản về tài khoản bạn cung cấp (mã giao dịch ${reference}).`
          : `Khoản ${money(amount)} cho chiến dịch "${title}" đã được hoàn qua cổng thanh toán.`,
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
          // Tiến độ chiến dịch gồm cả cam kết chưa trừ tiền (gây quỹ tất cả hoặc không).
          .andWhere("d.status IN (:...statuses)", { statuses: COUNTED_DONATION_STATUSES })
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
      from: vnDay(from),
      to: vnDay(to),
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
    return { filename: `doi-soat_${vnDay(from)}_${vnDay(to)}.csv`, content: toCsv(header, rows), rows: rows.length };
  }

  /**
   * CSV danh sách yêu cầu hoàn kèm tài khoản nhận để admin chuyển khoản trả lại. Có dữ liệu cá nhân
   * (tên, email, số tài khoản) nên chỉ admin tải được và mỗi lần xuất đều ghi audit.
   */
  async exportRefundsCsv(
    query: RefundExportQueryDto,
    actor: User,
    now = new Date(),
  ): Promise<{ filename: string; content: string; rows: number }> {
    const createdAt = vnDateRange(query.from, query.to);
    const requests = await this.refundRepo.find({
      where: { ...(query.status ? { status: query.status } : {}), ...(createdAt ? { createdAt } : {}) },
      relations: { donation: { campaign: true }, user: true },
      order: { createdAt: "ASC" },
      take: 5000,
    });
    const header = [
      "ma_yeu_cau", "thoi_gian_yeu_cau", "trang_thai", "ma_khoan_ung_ho", "ma_noi_dung_ck", "kenh_thanh_toan",
      "can_chuyen_khoan_tay", "so_tien", "chien_dich", "nguoi_ung_ho", "email", "ngan_hang", "so_tai_khoan",
      "chu_tai_khoan", "ly_do", "ghi_chu_admin", "thoi_gian_xu_ly", "ma_hoan_tien",
    ];
    const rows = requests.map((r) => [
      r.id, r.createdAt, r.status, r.donationId, r.donation?.transferCode ?? "", r.donation?.paymentMethod ?? "",
      needsManualRefund(r.donation?.paymentMethod) ? "co" : "khong", Number(r.donation?.amount ?? 0),
      r.donation?.campaign?.title ?? "", r.user?.name ?? "", r.user?.email ?? "", r.bankName ?? "",
      r.bankAccountNumber ?? "", r.bankAccountName ?? "", r.reason, r.adminNotes ?? "", r.reviewedAt ?? "",
      r.donation?.refundReference ?? "",
    ]);
    await this.auditService.record({
      userId: actor.id,
      action: "finance.export_refunds",
      entity: "refund_request",
      newValues: { status: query.status ?? null, from: query.from ?? null, to: query.to ?? null, rows: rows.length },
    });
    const day = vnDay(now);
    const period = query.from || query.to ? `_${query.from?.slice(0, 10) ?? "dau"}_${query.to?.slice(0, 10) ?? "nay"}` : "";
    return { filename: `hoan-tien_${query.status ?? "tat-ca"}${period}_${day}.csv`, content: toCsv(header, rows), rows: rows.length };
  }
}
