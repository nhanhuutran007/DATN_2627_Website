import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import {
  PaymentGateway,
  WEBHOOK_MAX_SKEW_MS,
} from "../../integrations/payment/payment.gateway";
import { frontendBaseUrl } from "../../integrations/email/email.gateway";
import {
  generateTransferCode,
  parseSepayIpn,
  type SepayCheckoutForm,
  SepayGateway,
} from "../../integrations/payment/sepay";
import { AuditService } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { RewardTier } from "../rewards/entities/reward-tier.entity";
import { User, UserRole } from "../users/entities/user.entity";
import { CreateDonationDto, WebhookDonationDto, type WebhookStatus } from "./dto/donation.dto";
import { Donation, DonationStatus } from "./entities/donation.entity";

export type DonationReceipt = {
  receiptNumber: string;
  donationId: string;
  status: DonationStatus;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  transactionId: string | null;
  completedAt: Date | null;
  donorName: string;
  isAnonymous: boolean;
  campaign: { id: string; title: string };
  rewardTitle: string | null;
  refund: {
    refundedAt: Date | null;
    reference: string | null;
    reason: string | null;
    /** `manual_transfer`: hoàn thủ công qua chuyển khoản (khoản qua SePay). */
    method: string | null;
    proofUrl: string | null;
  } | null;
};

/** Kênh thanh toán đang bật, để frontend chỉ hiện lựa chọn dùng được. */
export type PaymentOptions = {
  /** Cổng SePay (QR chuyển khoản thật); null khi chưa cấu hình merchant. */
  sepay: { env: "sandbox" | "production" } | null;
  /** Ví demo: người ủng hộ tự bấm xác nhận (không có tiền thật). */
  demoWallet: boolean;
};

/** Kết quả đối soát một đơn với SePay. */
export type SepaySyncResult = {
  donation: Donation;
  /** Trạng thái đơn phía SePay; null nếu không cần hỏi hoặc SePay không có đơn. */
  sepayStatus: string | null;
  /** true khi lần đối soát này ghi nhận thanh toán. */
  applied: boolean;
};

/** Đơn có thể đã thu tiền mà hệ thống chưa biết (IPN lỡ) — đáng hỏi lại SePay. */
const SYNCABLE_STATUSES = [DonationStatus.PENDING, DonationStatus.EXPIRED, DonationStatus.CANCELLED];

/** Phản hồi cho SePay: luôn 200 khi đã xác thực để SePay không gửi lại vô ích. */
export type SepayIpnResult = { success: true; applied: boolean };

const STATUS_FROM_GATEWAY: Record<WebhookStatus, DonationStatus> = {
  completed: DonationStatus.COMPLETED,
  failed: DonationStatus.FAILED,
  cancelled: DonationStatus.CANCELLED,
  expired: DonationStatus.EXPIRED,
};

/**
 * Trạng thái được phép chuyển sang khi nhận kết quả thanh toán. Thanh toán
 * thành công đến muộn (sau khi đơn đã hết hạn/bị hủy phía hệ thống) vẫn được
 * ghi nhận vì tiền đã thực sự chuyển — bỏ qua sẽ làm lệch đối soát; admin có
 * thể hoàn tiền nếu cần. Các kết quả không thu tiền chỉ áp dụng cho đơn `pending`.
 */
function transitionSources(next: DonationStatus): DonationStatus[] {
  return next === DonationStatus.COMPLETED
    ? [DonationStatus.PENDING, DonationStatus.EXPIRED, DonationStatus.CANCELLED]
    : [DonationStatus.PENDING];
}

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly dataSource: DataSource,
    @Inject("PaymentGateway") private readonly paymentGateway: PaymentGateway,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    @Optional()
    @Inject("SepayGateway")
    private readonly sepay: SepayGateway | null = null,
  ) {}

  /**
   * Ví demo chỉ dùng khi chưa nhận tiền thật: SePay chạy production thì tắt hẳn để
   * không ai tự "xác nhận" khoản ủng hộ không có tiền làm sai số liệu quỹ.
   */
  private demoWalletEnabled(): boolean {
    return this.paymentGateway.mode === "demo" && this.sepay?.env !== "production";
  }

  paymentOptions(): PaymentOptions {
    return {
      sepay: this.sepay ? { env: this.sepay.env } : null,
      demoWallet: this.demoWalletEnabled(),
    };
  }

  /**
   * Form thanh toán SePay cho đơn `pending` của chính người ủng hộ. `order_invoice_number`
   * là `transferCode` của đơn để IPN tìm lại đúng đơn. URL trả về chỉ để hiển thị.
   */
  async createSepayCheckout(donationId: string, user: User): Promise<SepayCheckoutForm> {
    if (!this.sepay) {
      throw new NotFoundException("Cổng SePay chưa được cấu hình");
    }
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation || donation.userId !== user.id) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status !== DonationStatus.PENDING) {
      throw new ConflictException("Giao dịch không còn chờ thanh toán. Vui lòng tạo giao dịch mới.");
    }
    if (donation.paymentMethod !== "sepay" || !donation.transferCode) {
      throw new ConflictException("Giao dịch này không thanh toán qua SePay");
    }
    const returnUrl = (result: string) =>
      `${frontendBaseUrl()}/du-an/${encodeURIComponent(donation.campaignId)}/ung-ho?donation=${donation.id}&payment=${result}`;
    return this.sepay.buildCheckout({
      invoiceNumber: donation.transferCode,
      amount: Math.round(Number(donation.amount)),
      description: `Ung ho Gop Mam ${donation.transferCode}`,
      successUrl: returnUrl("success"),
      errorUrl: returnUrl("error"),
      cancelUrl: returnUrl("cancel"),
    });
  }

  /**
   * Đối soát với API tra cứu của SePay khi IPN không tới: nguồn sự thật là SePay
   * (gọi từ server bằng secret key), không phải trình duyệt. Người ủng hộ đối soát
   * được đơn của mình (màn hình chờ tự gọi), admin đối soát được mọi đơn.
   */
  async syncSepayDonation(donationId: string, user: User): Promise<SepaySyncResult> {
    if (!this.sepay) {
      throw new NotFoundException("Cổng SePay chưa được cấu hình");
    }
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation || (donation.userId !== user.id && user.role !== UserRole.ADMIN)) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.paymentMethod !== "sepay" || !donation.transferCode) {
      throw new ConflictException("Giao dịch này không thanh toán qua SePay");
    }
    if (!SYNCABLE_STATUSES.includes(donation.status)) {
      return { donation, sepayStatus: null, applied: false };
    }

    let order;
    try {
      order = await this.sepay.fetchOrder(donation.transferCode);
    } catch {
      throw new ServiceUnavailableException("Không kết nối được SePay. Vui lòng thử lại sau.");
    }
    if (!order) {
      return { donation, sepayStatus: null, applied: false };
    }
    const paid = order.orderStatus === "CAPTURED";
    const amountMatches = order.currency === "VND" && Math.round(order.amount) === Math.round(Number(donation.amount));
    if (!paid) {
      return { donation, sepayStatus: order.orderStatus, applied: false };
    }
    if (!amountMatches) {
      await this.auditService.record({
        userId: user.id,
        action: "donation.sepay.amount-mismatch",
        entity: "donation",
        entityId: donation.id,
        newValues: { source: "sepay-sync", amount: order.amount, currency: order.currency, expectedAmount: Number(donation.amount), orderId: order.orderId },
      });
      return { donation, sepayStatus: order.orderStatus, applied: false };
    }
    const result = await this.applyPaymentResult(
      {
        donationId: donation.id,
        status: "completed",
        transactionId: `SEPAY-${order.orderId}`.slice(0, 255),
        timestamp: Date.now(),
      },
      "sepay-sync",
      user.id,
    );
    return { donation: result, sepayStatus: order.orderStatus, applied: result.status === DonationStatus.COMPLETED };
  }

  /**
   * IPN của SePay. Xác thực `X-Secret-Key` TRƯỚC mọi truy vấn; chỉ `ORDER_PAID` +
   * `CAPTURED` với đúng số tiền/tiền tệ mới được ghi nhận. Sai lệch (số tiền khác,
   * hủy giao dịch đã thu) chỉ ghi audit để admin xử lý — không tự đổi số liệu quỹ.
   */
  async handleSepayIpn(body: unknown, secretKey: string | undefined): Promise<SepayIpnResult> {
    if (!this.sepay || !this.sepay.verifyIpnSecret(secretKey)) {
      await this.auditService.record({
        action: "donation.sepay.rejected",
        entity: "donation",
        newValues: { reason: this.sepay ? "invalid-secret" : "sepay-disabled" },
      });
      throw new UnauthorizedException("Invalid IPN secret");
    }
    const ipn = parseSepayIpn(body);
    if (!ipn) {
      throw new BadRequestException("Invalid IPN payload");
    }
    const donation = await this.donationRepo.findOne({ where: { transferCode: ipn.invoiceNumber } });
    if (!donation) {
      await this.auditService.record({
        action: "donation.sepay.unmatched",
        entity: "donation",
        newValues: { invoiceNumber: ipn.invoiceNumber, amount: ipn.amount, transactionId: ipn.transactionId },
      });
      return { success: true, applied: false };
    }
    const paid = ipn.notificationType === "ORDER_PAID" && ipn.orderStatus === "CAPTURED";
    const amountMatches = ipn.currency === "VND" && Math.round(ipn.amount) === Math.round(Number(donation.amount));
    if (!paid || !amountMatches) {
      await this.auditService.record({
        action: paid ? "donation.sepay.amount-mismatch" : "donation.sepay.ignored",
        entity: "donation",
        entityId: donation.id,
        newValues: {
          notificationType: ipn.notificationType,
          orderStatus: ipn.orderStatus,
          amount: ipn.amount,
          currency: ipn.currency,
          expectedAmount: Number(donation.amount),
          transactionId: ipn.transactionId,
        },
      });
      return { success: true, applied: false };
    }
    const result = await this.applyPaymentResult(
      {
        donationId: donation.id,
        status: "completed",
        transactionId: `SEPAY-${ipn.transactionId}`.slice(0, 255),
        timestamp: Date.now(),
      },
      "sepay-ipn",
    );
    return { success: true, applied: result.status === DonationStatus.COMPLETED };
  }

  async create(dto: CreateDonationDto, user: User): Promise<Donation> {
    const existing = await this.donationRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      return existing;
    }

    const campaign = await this.campaignRepo.findOne({
      where: { id: dto.campaignId },
    });
    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new ConflictException("Campaign is not accepting donations");
    }

    const endDate = new Date(campaign.endDate);
    if (endDate.getTime() <= Date.now()) {
      throw new ConflictException("Campaign has ended");
    }

    if (dto.rewardTierId) {
      await this.assertRewardTierAvailable(dto.rewardTierId, campaign.id, dto.amount);
    }

    if (dto.paymentMethod === "sepay" && !this.sepay) {
      throw new BadRequestException("Cổng SePay chưa được cấu hình");
    }
    if (dto.paymentMethod !== "sepay" && !this.demoWalletEnabled()) {
      throw new BadRequestException("Kênh thanh toán demo đã tắt. Vui lòng chọn SePay.");
    }

    const paymentResult = await this.paymentGateway.createTransaction({
      amount: dto.amount,
      currency: "VND",
      metadata: { campaignId: dto.campaignId, userId: user.id },
    });

    const donation = this.donationRepo.create({
      userId: user.id,
      campaignId: dto.campaignId,
      amount: dto.amount,
      currency: "VND",
      status: DonationStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      transactionId: paymentResult.transactionId,
      transferCode: generateTransferCode(),
      idempotencyKey: dto.idempotencyKey,
      message: dto.message,
      isAnonymous: dto.isAnonymous ?? false,
      rewardTierId: dto.rewardTierId ?? null,
    });

    return this.donationRepo.save(donation);
  }

  /**
   * Kiểm tra lúc tạo giao dịch (suất chỉ bị trừ khi thanh toán được xác nhận,
   * xem applyPaymentResult): mức thuộc chiến dịch, đang nhận, đủ tiền, còn suất.
   */
  private async assertRewardTierAvailable(tierId: string, campaignId: string, amount: number): Promise<void> {
    const tier = await this.dataSource.getRepository(RewardTier).findOne({ where: { id: tierId } });
    if (!tier || tier.campaignId !== campaignId || !tier.isActive) {
      throw new NotFoundException("Reward tier not found");
    }
    if (Number(amount) < Number(tier.minAmount)) {
      throw new BadRequestException(
        `Mức quà "${tier.title}" cần ủng hộ tối thiểu ${Number(tier.minAmount).toLocaleString("vi-VN")} ₫.`,
      );
    }
    if (tier.quantityLimit != null && tier.claimedCount >= tier.quantityLimit) {
      throw new ConflictException(`Mức quà "${tier.title}" đã hết suất.`);
    }
  }

  /**
   * Webhook từ cổng thanh toán. Chữ ký được kiểm tra TRƯỚC mọi truy vấn để không
   * lộ việc khoản tài trợ có tồn tại hay không; chữ ký sai bị ghi audit.
   * `timestamp` nằm trong nội dung được ký nên cũng chống được replay: một
   * webhook hợp lệ nhưng quá cũ bị từ chối dù chữ ký khớp.
   */
  async handleWebhook(
    dto: WebhookDonationDto,
    signature: string | undefined,
  ): Promise<Donation> {
    const valid = this.paymentGateway.verifyWebhookSignature(
      {
        donationId: dto.donationId,
        status: dto.status,
        transactionId: dto.transactionId,
        timestamp: dto.timestamp,
      },
      signature ?? "",
    );
    if (!valid) {
      await this.auditService.record({
        action: "donation.webhook.rejected",
        entity: "donation",
        entityId: dto.donationId,
        newValues: { reason: "invalid-signature", claimedStatus: dto.status },
      });
      throw new UnauthorizedException("Invalid webhook signature");
    }

    if (Math.abs(Date.now() - dto.timestamp) > WEBHOOK_MAX_SKEW_MS) {
      await this.auditService.record({
        action: "donation.webhook.rejected",
        entity: "donation",
        entityId: dto.donationId,
        newValues: { reason: "stale-timestamp", claimedStatus: dto.status },
      });
      throw new UnauthorizedException("Webhook timestamp is too old");
    }

    return this.applyPaymentResult(dto, "payment-webhook");
  }

  /**
   * Mô phỏng cổng sandbox gọi lại cho ví demo. Chỉ chủ khoản tài trợ đã đăng nhập
   * mới xác nhận được, và chỉ khi cổng đang ở chế độ demo (không dùng với cổng thật).
   */
  async confirmDemoPayment(
    donationId: string,
    status: "completed" | "failed",
    user: User,
  ): Promise<Donation> {
    if (!this.demoWalletEnabled()) {
      throw new ForbiddenException(
        "Client-side confirmation is only available with the demo wallet",
      );
    }
    const donation = await this.donationRepo.findOne({
      where: { id: donationId },
    });
    if (!donation || donation.userId !== user.id) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.paymentMethod === "sepay") {
      // Tiền thật: chỉ IPN có xác thực của SePay mới được xác nhận đơn.
      throw new ForbiddenException("Giao dịch SePay chỉ được xác nhận bởi cổng thanh toán");
    }
    if (donation.status === DonationStatus.EXPIRED || donation.status === DonationStatus.CANCELLED) {
      // Ví demo mô phỏng người dùng bấm thanh toán: cổng không cho trả đơn đã hết hạn/hủy.
      throw new ConflictException(
        donation.status === DonationStatus.EXPIRED
          ? "Giao dịch đã hết hạn thanh toán. Vui lòng tạo giao dịch mới."
          : "Giao dịch đã bị hủy. Vui lòng tạo giao dịch mới.",
      );
    }
    return this.applyPaymentResult(
      {
        donationId,
        status,
        transactionId: donation.transactionId,
        timestamp: Date.now(),
      },
      "demo-wallet",
      user.id,
    );
  }

  private async applyPaymentResult(
    dto: WebhookDonationDto,
    source: "payment-webhook" | "demo-wallet" | "sepay-ipn" | "sepay-sync",
    actorId?: string,
  ): Promise<Donation> {
    const donation = await this.donationRepo.findOne({
      where: { id: dto.donationId },
    });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    const nextStatus = STATUS_FROM_GATEWAY[dto.status];
    const sources = transitionSources(nextStatus);
    const previousStatus = donation.status;
    if (!sources.includes(previousStatus)) {
      // Đã xử lý rồi (hoặc chuyển không hợp lệ, vd. hủy một đơn đã thành công): idempotent.
      return donation;
    }
    const nextTransactionId = dto.transactionId ?? donation.transactionId;
    const completedAt =
      nextStatus === DonationStatus.COMPLETED
        ? new Date()
        : donation.completedAt;

    const outcome = await this.dataSource.transaction(async (manager) => {
      // Update có điều kiện trên chính cột `status`: chỉ ghi khi donation vẫn
      // còn ở đúng trạng thái đã đọc. Guard ở trên đọc ngoài transaction nên
      // không đủ để chống race — nếu update vô điều kiện, hai webhook (hoặc
      // webhook đua với xác nhận ví demo/job hết hạn) cùng đọc rồi cùng ghi sẽ
      // cùng cộng tiền/backer trùng lặp cho một donation.
      const updateResult = await manager.update(
        Donation,
        { id: donation.id, status: previousStatus },
        { status: nextStatus, transactionId: nextTransactionId, completedAt },
      );

      if (!updateResult.affected) {
        // Một request khác đã xử lý donation này trước — trả lại bản ghi hiện
        // tại, không cộng tiền/backer lần nữa, không ghi audit trùng.
        const current = await manager.findOne(Donation, {
          where: { id: donation.id },
        });
        return { applied: false as const, donation: current ?? donation };
      }

      let rewardDropped = false;
      if (nextStatus === DonationStatus.COMPLETED && donation.rewardTierId) {
        // Trừ suất có điều kiện: hai giao dịch đua nhau không vượt giới hạn.
        const claim = await manager
          .createQueryBuilder()
          .update(RewardTier)
          .set({ claimedCount: () => "claimed_count + 1" })
          .where("id = :id", { id: donation.rewardTierId })
          .andWhere("(quantity_limit IS NULL OR claimed_count < quantity_limit)")
          .execute();
        if (!claim.affected) {
          // Hết suất đúng lúc xác nhận: vẫn ghi nhận tiền, không kèm quà.
          rewardDropped = true;
          await manager.update(Donation, { id: donation.id }, { rewardTierId: null });
        }
      }

      if (nextStatus === DonationStatus.COMPLETED) {
        await manager.increment(
          Campaign,
          { id: donation.campaignId },
          "currentAmount",
          donation.amount,
        );
        await manager.increment(
          Campaign,
          { id: donation.campaignId },
          "backerCount",
          1,
        );
      }

      return {
        applied: true as const,
        rewardDropped,
        donation: {
          ...donation,
          status: nextStatus,
          transactionId: nextTransactionId,
          completedAt,
          rewardTierId: rewardDropped ? null : donation.rewardTierId,
        } as Donation,
      };
    });

    if (!outcome.applied) {
      return outcome.donation;
    }

    const result = outcome.donation;
    await this.auditService.record({
      userId: actorId,
      action: `donation.payment.${result.status}`,
      entity: "donation",
      entityId: result.id,
      oldValues: { status: previousStatus },
      newValues: {
        status: result.status,
        amount: result.amount,
        campaignId: result.campaignId,
        transactionId: result.transactionId ?? null,
        source,
        // Thanh toán thành công sau khi đơn đã hết hạn/bị hủy: cần admin xem xét.
        ...(previousStatus !== DonationStatus.PENDING ? { lateCompletion: true } : {}),
      },
    });
    if (result.status === DonationStatus.COMPLETED) {
      // Giao dịch đã commit: lỗi khi gửi thông báo không được làm hỏng phản hồi thanh toán.
      await this.notifyDonationCompleted(result, outcome.rewardDropped).catch(() => undefined);
    }
    return result;
  }

  /** Báo người ủng hộ và chủ dự án; không nêu tên người ủng hộ (tôn trọng ẩn danh). */
  private async notifyDonationCompleted(donation: Donation, rewardDropped: boolean): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    if (!campaign) return;
    const amount = `${Number(donation.amount).toLocaleString("vi-VN")} ₫`;
    const tier = donation.rewardTierId
      ? await this.dataSource.getRepository(RewardTier).findOne({ where: { id: donation.rewardTierId } })
      : null;
    const rewardNote = tier
      ? ` Phần quà: ${tier.title}.`
      : rewardDropped
        ? " Mức quà bạn chọn vừa hết suất nên khoản ủng hộ được ghi nhận không kèm quà."
        : "";
    await this.notificationsService.notify([
      {
        userId: donation.userId,
        type: NotificationType.DONATION_CONFIRMED,
        title: "Ủng hộ thành công",
        message: `Khoản ủng hộ ${amount} cho chiến dịch "${campaign.title}" đã được xác nhận.${rewardNote} Cảm ơn bạn!`,
        link: `/bien-nhan/${donation.id}`,
        relatedId: donation.id,
        email: true,
      },
      ...(campaign.ownerId !== donation.userId
        ? [
            {
              userId: campaign.ownerId,
              type: NotificationType.DONATION_RECEIVED,
              title: "Có khoản ủng hộ mới",
              message: `Chiến dịch "${campaign.title}" vừa nhận ${amount} (đã xác nhận).`,
              link: "/dashboard",
              relatedId: campaign.id,
              email: true,
            },
          ]
        : []),
    ]);
  }

  async findById(id: string): Promise<Donation> {
    const donation = await this.donationRepo.findOne({
      where: { id },
      relations: { user: true, campaign: true },
    });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    return donation;
  }

  /**
   * Chi tiết một khoản ủng hộ: chỉ người ủng hộ hoặc admin. Người khác nhận 404
   * (không tiết lộ khoản ủng hộ có tồn tại).
   */
  async findForUser(id: string, user: User): Promise<Donation> {
    const donation = await this.donationRepo.findOne({
      where: { id },
      relations: { user: true, campaign: true, rewardTier: true },
    });
    if (!donation || (donation.userId !== user.id && user.role !== UserRole.ADMIN)) {
      throw new NotFoundException("Donation not found");
    }
    return donation;
  }

  /** Biên nhận (in/lưu PDF ở trình duyệt). Không phải hóa đơn thuế. */
  async getReceipt(id: string, user: User): Promise<DonationReceipt> {
    const d = await this.findForUser(id, user);
    if (d.status !== DonationStatus.COMPLETED && d.status !== DonationStatus.REFUNDED) {
      throw new ConflictException("Biên nhận chỉ có cho khoản ủng hộ đã xác nhận.");
    }
    const issued = d.completedAt ? new Date(d.completedAt) : new Date(d.createdAt);
    const ymd = issued.toISOString().slice(0, 10).replace(/-/g, "");
    return {
      receiptNumber: `GM-${ymd}-${d.id.slice(0, 8).toUpperCase()}`,
      donationId: d.id,
      status: d.status,
      amount: Number(d.amount),
      currency: d.currency,
      paymentMethod: d.paymentMethod ?? null,
      transactionId: d.transactionId ?? null,
      completedAt: d.completedAt ?? null,
      donorName: d.user?.name ?? "Người ủng hộ",
      isAnonymous: d.isAnonymous,
      campaign: { id: d.campaignId, title: d.campaign?.title ?? "" },
      rewardTitle: d.rewardTier?.title ?? null,
      refund: d.status === DonationStatus.REFUNDED
        ? {
            refundedAt: d.refundedAt ?? null,
            reference: d.refundReference ?? null,
            reason: d.refundReason ?? null,
            method: d.refundMethod ?? null,
            proofUrl: d.refundProofUrl ?? null,
          }
        : null,
    };
  }

  /**
   * Người ủng hộ tự hủy đơn chưa thanh toán. Idempotent với đơn đã hủy; đơn đã
   * có kết quả khác (thành công, thất bại, hết hạn, hoàn tiền) không hủy được.
   */
  async cancel(donationId: string, user: User): Promise<Donation> {
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation || donation.userId !== user.id) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status === DonationStatus.CANCELLED) {
      return donation;
    }
    // Có điều kiện: không đè lên kết quả thanh toán vừa về cùng lúc.
    const result = await this.donationRepo.update(
      { id: donation.id, status: DonationStatus.PENDING },
      { status: DonationStatus.CANCELLED },
    );
    if (!result.affected) {
      throw new ConflictException("Chỉ hủy được giao dịch đang chờ thanh toán.");
    }
    await this.auditService.record({
      userId: user.id,
      action: "donation.cancel",
      entity: "donation",
      entityId: donation.id,
      oldValues: { status: DonationStatus.PENDING },
      newValues: { status: DonationStatus.CANCELLED, amount: donation.amount, campaignId: donation.campaignId },
    });
    return { ...donation, status: DonationStatus.CANCELLED } as Donation;
  }

  async findMine(userId: string): Promise<Donation[]> {
    return this.donationRepo.find({
      where: { userId },
      relations: { campaign: true, rewardTier: true },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Sổ cái công khai của một chiến dịch: chỉ giao dịch đã được xác nhận, trả
   * về đối tượng thu gọn (không email, không lời nhắn, mã giao dịch bị che).
   * Người chọn ẩn danh hiển thị `donorName = null`. `sort=top`: khoản lớn nhất trước.
   */
  async listPublicLedger(campaignId: string, limit = 20, sort: LedgerSort = "recent"): Promise<PublicLedger> {
    const campaign = await this.campaignRepo.findOneBy({ id: campaignId });
    if (!campaign || !LEDGER_VISIBLE_STATUSES.includes(campaign.status)) {
      throw new NotFoundException("Campaign not found");
    }

    const take = Math.min(Math.max(1, limit), 50);
    const [donations, total] = await this.donationRepo.findAndCount({
      where: { campaignId, status: DonationStatus.COMPLETED },
      relations: { user: true },
      order:
        sort === "top"
          ? { amount: "DESC", completedAt: "DESC" }
          : { completedAt: "DESC", createdAt: "DESC" },
      take,
    });

    return {
      total,
      items: donations.map((donation) => ({
        id: donation.id,
        donorName: donation.isAnonymous ? null : (donation.user?.name ?? null),
        amount: Number(donation.amount),
        currency: donation.currency,
        paymentMethod: donation.paymentMethod ?? null,
        reference: maskReference(donation.transactionId ?? donation.id),
        completedAt: donation.completedAt ?? donation.createdAt,
      })),
    };
  }
}

export const LEDGER_SORTS = ["recent", "top"] as const;
export type LedgerSort = (typeof LEDGER_SORTS)[number];

const LEDGER_VISIBLE_STATUSES = [
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.SUCCESS,
  CampaignStatus.FAILED,
  CampaignStatus.ENDED,
];

export type PublicLedgerEntry = {
  id: string;
  donorName: string | null;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  reference: string;
  completedAt: Date;
};

export type PublicLedger = {
  items: PublicLedgerEntry[];
  total: number;
};

/** Chỉ giữ 6 ký tự cuối để đối chiếu, không lộ toàn bộ mã giao dịch. */
function maskReference(value: string): string {
  const tail = value.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `•••${tail}`;
}
