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
import { DataSource, EntityManager, In, Raw, Repository } from "typeorm";

import {
  PaymentGateway,
  WEBHOOK_MAX_SKEW_MS,
} from "../../integrations/payment/payment.gateway";
import type { CardPledgeGateway, CardSetupResult, ChargeResult } from "../../integrations/payment/stripe";
import { frontendBaseUrl } from "../../integrations/email/email.gateway";
import {
  generateTransferCode,
  parseSepayIpn,
  type SepayCheckoutForm,
  SepayGateway,
} from "../../integrations/payment/sepay";
import { AuditService } from "../../common/audit/audit.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { CampaignFollow } from "../follows/entities/campaign-follow.entity";
import { NotificationType } from "../notifications/entities/notification.entity";
import { donationGroupText, NotificationsService } from "../notifications/notifications.service";
import { RewardTier } from "../rewards/entities/reward-tier.entity";
import { RewardRecipient } from "./entities/reward-recipient.entity";
import { User, UserRole } from "../users/entities/user.entity";
import { WalletService } from "../wallet/wallet.service";
import { CreateDonationDto, WebhookDonationDto, type WebhookStatus } from "./dto/donation.dto";
import { COUNTED_DONATION_STATUSES, Donation, DonationStatus } from "./entities/donation.entity";

/** Kênh ví Góp Mầm: nạp qua SePay rồi ủng hộ bằng số dư (cam kết, tiền được giữ trong ví). */
export const WALLET_BALANCE_METHOD = "balance";

/** Số dư ví không đủ khi giữ tiền: ném trong transaction để hoàn tác việc ghi nhận cam kết. */
class InsufficientBalanceError extends Error {}

/** MySQL hủy một trong hai transaction tranh khóa (an toàn để thử lại). */
function isDeadlock(error: unknown): boolean {
  const code = (error as { code?: string; driverError?: { code?: string } })?.code ?? (error as { driverError?: { code?: string } })?.driverError?.code;
  return code === "ER_LOCK_DEADLOCK" || code === "ER_LOCK_WAIT_TIMEOUT";
}

/** Hạn đổi thẻ sau khi trừ tiền cam kết thất bại (như Kickstarter: 7 ngày). */
export const CHARGE_RETRY_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * Kênh trả ngay (tiền chuyển đi lúc ủng hộ): SePay. Các kênh còn lại (thẻ Stripe, ví
 * demo) theo mô hình tất cả hoặc không — chỉ cam kết, trừ tiền khi chiến dịch đạt mục tiêu.
 */
export function isPledgeMethod(paymentMethod?: string | null): boolean {
  return paymentMethod !== "sepay";
}

/** Chiến dịch còn nhận/giữ cam kết: đang chạy (hoặc tạm dừng) và chưa tới hạn. */
function campaignOpenForPledges(campaign: Campaign | null, now = new Date()): boolean {
  return (
    !!campaign &&
    (campaign.status === CampaignStatus.ACTIVE || campaign.status === CampaignStatus.PAUSED) &&
    new Date(campaign.endDate).getTime() > now.getTime()
  );
}

function money(value: number | string): string {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

function vnDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

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
  /** Cổng SePay (QR chuyển khoản thật, chỉ dùng để nạp ví); null khi chưa cấu hình merchant. */
  sepay: { env: "sandbox" | "production" } | null;
  /** Ví demo: người ủng hộ tự bấm xác nhận (không có tiền thật). */
  demoWallet: boolean;
  /** Thẻ qua Stripe (lưu thẻ, trừ khi đạt mục tiêu); null khi chưa cấu hình khóa. */
  stripe: { testMode: boolean } | null;
  /** Ví Góp Mầm (nạp qua SePay, ủng hộ bằng số dư); `demoTopup` = cho nạp thử. */
  balance: { demoTopup: boolean } | null;
};

/** Kết quả đối soát phiên lưu thẻ Stripe. */
export type StripeSyncResult = { donation: Donation; applied: boolean };

type PaymentSource =
  | "payment-webhook"
  | "demo-wallet"
  | "sepay-ipn"
  | "sepay-sync"
  | "stripe-webhook"
  | "stripe-sync"
  | "wallet-balance";

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
  if (next === DonationStatus.COMPLETED) {
    return [DonationStatus.PENDING, DonationStatus.EXPIRED, DonationStatus.CANCELLED];
  }
  // Lưu thẻ xong ngay sau khi đơn quá hạn chờ vẫn nhận; đơn người dùng đã hủy thì không.
  if (next === DonationStatus.PLEDGED) {
    return [DonationStatus.PENDING, DonationStatus.EXPIRED];
  }
  return [DonationStatus.PENDING];
}

/** "completed" từ cổng/ví nghĩa là đã thu tiền (SePay) hoặc đã lưu phương thức (cam kết). */
function nextStatusFor(status: WebhookStatus, paymentMethod?: string | null): DonationStatus {
  if (status === "completed" && isPledgeMethod(paymentMethod)) {
    return DonationStatus.PLEDGED;
  }
  return STATUS_FROM_GATEWAY[status];
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
    @Optional()
    @Inject("StripeGateway")
    private readonly stripe: CardPledgeGateway | null = null,
    @Optional()
    // Kiểu `X | null` làm metadata thành Object: phải chỉ rõ token, nếu không Nest âm thầm inject null.
    @Inject(WalletService)
    private readonly wallet: WalletService | null = null,
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
      stripe: this.stripe ? { testMode: this.stripe.testMode } : null,
      balance: this.wallet ? { demoTopup: this.wallet.demoTopupEnabled() } : null,
    };
  }

  /**
   * Trang Stripe Checkout (chế độ `setup`: chỉ lưu thẻ, KHÔNG trừ tiền) cho đơn `pending`
   * của chính người ủng hộ, hoặc để đổi thẻ khi lần trừ tiền cam kết thất bại.
   */
  async createStripeCheckout(donationId: string, user: User, now = new Date()): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new NotFoundException("Cổng thẻ Stripe chưa được cấu hình");
    }
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation || donation.userId !== user.id) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.paymentMethod !== "stripe") {
      throw new ConflictException("Giao dịch này không thanh toán bằng thẻ Stripe");
    }
    if (donation.status === DonationStatus.CHARGE_FAILED) {
      if (now.getTime() > this.chargeRetryDeadline(donation).getTime()) {
        throw new ConflictException("Đã quá hạn cập nhật thẻ cho khoản cam kết này.");
      }
    } else if (donation.status !== DonationStatus.PENDING) {
      throw new ConflictException("Giao dịch không còn chờ lưu thẻ. Vui lòng tạo giao dịch mới.");
    }
    const base = `${frontendBaseUrl()}/du-an/${encodeURIComponent(donation.campaignId)}/ung-ho?donation=${donation.id}`;
    let session: { sessionId: string; url: string };
    try {
      session = await this.stripe.createSetupCheckout({
        donationId: donation.id,
        userId: user.id,
        description: `Cam ket ung ho Gop Mam ${donation.id.slice(0, 8).toUpperCase()}`,
        successUrl: `${base}&payment=success`,
        cancelUrl: `${base}&payment=cancel`,
        customerId: donation.paymentCustomerRef ?? null,
      });
    } catch {
      throw new ServiceUnavailableException("Không kết nối được Stripe. Vui lòng thử lại sau.");
    }
    await this.donationRepo.update({ id: donation.id }, { setupSessionRef: session.sessionId });
    return { url: session.url };
  }

  /**
   * Hỏi Stripe kết quả phiên lưu thẻ (khi webhook chưa tới, vd. chạy local không có
   * `stripe listen`). Nguồn sự thật là Stripe gọi từ server, không phải URL trả về.
   */
  async syncStripeDonation(donationId: string, user: User): Promise<StripeSyncResult> {
    if (!this.stripe) {
      throw new NotFoundException("Cổng thẻ Stripe chưa được cấu hình");
    }
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation || (donation.userId !== user.id && user.role !== UserRole.ADMIN)) {
      throw new NotFoundException("Donation not found");
    }
    const waiting = [DonationStatus.PENDING, DonationStatus.EXPIRED, DonationStatus.CHARGE_FAILED];
    if (donation.paymentMethod !== "stripe" || !donation.setupSessionRef || !waiting.includes(donation.status)) {
      return { donation, applied: false };
    }
    let result: CardSetupResult;
    try {
      result = await this.stripe.getSetupResult(donation.setupSessionRef);
    } catch {
      throw new ServiceUnavailableException("Không kết nối được Stripe. Vui lòng thử lại sau.");
    }
    return this.applyCardSaved(donation, result, "stripe-sync", user.id);
  }

  /**
   * Webhook Stripe (`checkout.session.completed`, chế độ setup). Chữ ký `Stripe-Signature`
   * trên raw body được kiểm TRƯỚC mọi truy vấn; sau đó vẫn hỏi lại Stripe trạng thái phiên.
   */
  async handleStripeWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<{ received: true; applied: boolean }> {
    let event;
    try {
      if (!this.stripe || !rawBody) throw new Error("stripe-disabled");
      event = this.stripe.parseWebhook(rawBody, signature);
    } catch {
      await this.auditService.record({
        action: "donation.stripe.rejected",
        entity: "donation",
        newValues: { reason: this.stripe ? "invalid-signature" : "stripe-disabled" },
      });
      throw new UnauthorizedException("Invalid Stripe signature");
    }
    if (event.type !== "setup-completed") {
      return { received: true, applied: false };
    }
    const donation = await this.donationRepo.findOne({ where: { setupSessionRef: event.sessionId } });
    if (!donation) {
      await this.auditService.record({
        action: "donation.stripe.unmatched",
        entity: "donation",
        newValues: { sessionId: event.sessionId },
      });
      return { received: true, applied: false };
    }
    // Lỗi mạng ở đây ném 5xx để Stripe tự gửi lại webhook.
    const result = await this.stripe!.getSetupResult(event.sessionId);
    const outcome = await this.applyCardSaved(donation, result, "stripe-webhook");
    return { received: true, applied: outcome.applied };
  }

  /**
   * Thẻ đã lưu ở Stripe: đơn đang chờ → cam kết; khoản trừ tiền thất bại → cập nhật thẻ
   * mới rồi trừ lại ngay. Phiên của đơn khác hoặc thẻ cũ (đã thử) bị bỏ qua.
   */
  private async applyCardSaved(
    donation: Donation,
    result: CardSetupResult,
    source: "stripe-webhook" | "stripe-sync",
    actorId?: string,
  ): Promise<StripeSyncResult> {
    if (result.status !== "saved" || (result.donationId && result.donationId !== donation.id)) {
      return { donation, applied: false };
    }
    if (donation.status === DonationStatus.CHARGE_FAILED) {
      if (result.paymentMethodId === donation.paymentMethodRef) {
        return { donation, applied: false };
      }
      const updated = await this.donationRepo.update(
        { id: donation.id, status: DonationStatus.CHARGE_FAILED },
        { paymentCustomerRef: result.customerId, paymentMethodRef: result.paymentMethodId },
      );
      if (!updated.affected) {
        return { donation, applied: false };
      }
      await this.auditService.record({
        userId: actorId,
        action: "donation.pledge.card-updated",
        entity: "donation",
        entityId: donation.id,
        newValues: { source },
      });
      const charged = await this.chargePledge(donation.id);
      return { donation: charged, applied: charged.status === DonationStatus.COMPLETED };
    }
    const pledged = await this.applyPaymentResult(
      { donationId: donation.id, status: "completed", timestamp: Date.now() },
      source,
      actorId,
      { paymentCustomerRef: result.customerId, paymentMethodRef: result.paymentMethodId },
    );
    return { donation: pledged, applied: pledged.status === DonationStatus.PLEDGED };
  }

  private chargeRetryDeadline(donation: Donation): Date {
    const failedAt = donation.chargeFailedAt ? new Date(donation.chargeFailedAt) : new Date();
    return new Date(failedAt.getTime() + CHARGE_RETRY_DAYS * DAY_MS);
  }

  /**
   * Trừ tiền một khoản cam kết (chiến dịch đã đạt mục tiêu). Gọi bởi job tất toán, sau
   * khi người ủng hộ đổi thẻ, hoặc khi họ bấm "Thử trừ lại". Số liệu chiến dịch không
   * đổi (cam kết đã được tính); chỉ trạng thái chuyển `completed` hoặc `charge_failed`.
   * Khóa idempotency theo lần thử: job chạy chồng không trừ hai lần cùng một lần thử.
   */
  async chargePledge(donationId: string, now = new Date(), actorId?: string): Promise<Donation> {
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    const from = donation.status;
    if (from !== DonationStatus.PLEDGED && from !== DonationStatus.CHARGE_FAILED) {
      return donation;
    }
    if (donation.paymentMethod === WALLET_BALANCE_METHOD) {
      return this.captureWalletPledge(donation, from, now, actorId);
    }
    const attempt = (donation.chargeAttempts ?? 0) + 1;
    let result: ChargeResult;
    if (donation.paymentMethod === "stripe") {
      result =
        this.stripe && donation.paymentCustomerRef && donation.paymentMethodRef
          ? await this.stripe.chargeSaved({
              donationId: donation.id,
              amount: Number(donation.amount),
              customerId: donation.paymentCustomerRef,
              paymentMethodId: donation.paymentMethodRef,
              idempotencyKey: `pledge-charge-${donation.id}-${attempt}`,
            })
          : { success: false, error: "Không có thẻ đã lưu hoặc cổng Stripe đang tắt" };
    } else {
      const tx = await this.paymentGateway.createTransaction({
        amount: Number(donation.amount),
        currency: donation.currency ?? "VND",
        metadata: { donationId: donation.id, pledgeCharge: true },
      });
      result = tx.success ? { success: true, transactionId: tx.transactionId } : { success: false, error: "Ví demo từ chối" };
    }

    if (result.success) {
      const updated = await this.donationRepo.update(
        { id: donation.id, status: from },
        {
          status: DonationStatus.COMPLETED,
          transactionId: result.transactionId,
          completedAt: now,
          chargeAttempts: attempt,
          lastChargeError: null,
        },
      );
      if (!updated.affected) {
        return (await this.donationRepo.findOne({ where: { id: donation.id } })) ?? donation;
      }
      const charged = { ...donation, status: DonationStatus.COMPLETED, transactionId: result.transactionId, completedAt: now, chargeAttempts: attempt, lastChargeError: null } as Donation;
      await this.auditService.record({
        userId: actorId,
        action: "donation.pledge.charged",
        entity: "donation",
        entityId: donation.id,
        oldValues: { status: from },
        newValues: { status: DonationStatus.COMPLETED, amount: Number(donation.amount), campaignId: donation.campaignId, transactionId: result.transactionId, attempt },
      });
      await this.notifyPledgeCharged(charged).catch(() => undefined);
      return charged;
    }

    const chargeFailedAt = donation.chargeFailedAt ?? now;
    const lastChargeError = result.error.slice(0, 255);
    const updated = await this.donationRepo.update(
      { id: donation.id, status: from },
      { status: DonationStatus.CHARGE_FAILED, chargeAttempts: attempt, chargeFailedAt, lastChargeError },
    );
    if (!updated.affected) {
      return (await this.donationRepo.findOne({ where: { id: donation.id } })) ?? donation;
    }
    const failed = { ...donation, status: DonationStatus.CHARGE_FAILED, chargeAttempts: attempt, chargeFailedAt, lastChargeError } as Donation;
    await this.auditService.record({
      userId: actorId,
      action: "donation.pledge.charge-failed",
      entity: "donation",
      entityId: donation.id,
      oldValues: { status: from },
      newValues: { status: DonationStatus.CHARGE_FAILED, error: lastChargeError, attempt },
    });
    await this.notifyChargeFailed(failed).catch(() => undefined);
    return failed;
  }

  /** Chiến dịch đạt mục tiêu: trừ hẳn tiền đang giữ trong ví và hoàn tất khoản ủng hộ. */
  private async captureWalletPledge(donation: Donation, from: DonationStatus, now: Date, actorId?: string): Promise<Donation> {
    if (!this.wallet) {
      // Để nguyên `pledged`, lần tất toán sau thử lại.
      throw new ServiceUnavailableException("Ví Góp Mầm chưa sẵn sàng");
    }
    const attempt = (donation.chargeAttempts ?? 0) + 1;
    const transactionId = `VI-${donation.id.slice(0, 8).toUpperCase()}`;
    const captured = await this.dataSource.transaction(async (manager) => {
      const updated = await manager.update(
        Donation,
        { id: donation.id, status: from },
        { status: DonationStatus.COMPLETED, transactionId, completedAt: now, chargeAttempts: attempt, lastChargeError: null },
      );
      if (!updated.affected) return false;
      await this.wallet!.capture(manager, donation);
      return true;
    });
    if (!captured) {
      return (await this.donationRepo.findOne({ where: { id: donation.id } })) ?? donation;
    }
    const charged = { ...donation, status: DonationStatus.COMPLETED, transactionId, completedAt: now, chargeAttempts: attempt, lastChargeError: null } as Donation;
    await this.auditService.record({
      userId: actorId,
      action: "donation.pledge.charged",
      entity: "donation",
      entityId: donation.id,
      oldValues: { status: from },
      newValues: { status: DonationStatus.COMPLETED, amount: Number(donation.amount), campaignId: donation.campaignId, transactionId, attempt, source: "wallet" },
    });
    await this.notifyPledgeCharged(charged).catch(() => undefined);
    return charged;
  }

  /** Người ủng hộ thử trừ lại khoản cam kết thất bại (vd. đã nạp thêm tiền vào thẻ). */
  async retryCharge(donationId: string, user: User, now = new Date()): Promise<Donation> {
    const donation = await this.donationRepo.findOne({ where: { id: donationId } });
    if (!donation || donation.userId !== user.id) {
      throw new NotFoundException("Donation not found");
    }
    if (donation.status !== DonationStatus.CHARGE_FAILED) {
      throw new ConflictException("Chỉ thử lại được khoản cam kết trừ tiền thất bại.");
    }
    if (now.getTime() > this.chargeRetryDeadline(donation).getTime()) {
      throw new ConflictException("Đã quá hạn cập nhật thanh toán cho khoản cam kết này.");
    }
    return this.chargePledge(donation.id, now, user.id);
  }

  /** Chiến dịch không đạt mục tiêu/bị hủy: giải phóng cam kết, không trừ tiền. */
  async releasePledge(donation: Donation, campaignTitle: string): Promise<boolean> {
    const released = await this.uncountPledge(donation, DonationStatus.PLEDGED, DonationStatus.RELEASED);
    if (!released) return false;
    await this.auditService.record({
      action: "donation.pledge.released",
      entity: "donation",
      entityId: donation.id,
      oldValues: { status: DonationStatus.PLEDGED },
      newValues: { status: DonationStatus.RELEASED, amount: Number(donation.amount), campaignId: donation.campaignId },
    });
    await this.notificationsService
      .notify({
        userId: donation.userId,
        type: NotificationType.CAMPAIGN_ENDED,
        title: donation.paymentMethod === WALLET_BALANCE_METHOD ? "Tiền đã hoàn về ví" : "Bạn không bị trừ tiền",
        message:
          donation.paymentMethod === WALLET_BALANCE_METHOD
            ? `Chiến dịch "${campaignTitle}" không đạt mục tiêu nên ${money(donation.amount)} bạn ủng hộ đã được hoàn về ví Góp Mầm.`
            : `Chiến dịch "${campaignTitle}" không đạt mục tiêu nên khoản cam kết ${money(donation.amount)} của bạn đã được hủy. Không có khoản tiền nào bị trừ.`,
        link: donation.paymentMethod === WALLET_BALANCE_METHOD ? "/vi" : `/du-an/${donation.campaignId}`,
        relatedId: donation.id,
        email: true,
      })
      .catch(() => undefined);
    return true;
  }

  /** Quá hạn đổi thẻ: bỏ khoản cam kết, trừ khỏi số liệu chiến dịch, trả suất quà. */
  async expireChargeFailure(donation: Donation, campaignTitle: string): Promise<boolean> {
    const expired = await this.uncountPledge(donation, DonationStatus.CHARGE_FAILED, DonationStatus.FAILED);
    if (!expired) return false;
    await this.auditService.record({
      action: "donation.pledge.charge-expired",
      entity: "donation",
      entityId: donation.id,
      oldValues: { status: DonationStatus.CHARGE_FAILED },
      newValues: { status: DonationStatus.FAILED, amount: Number(donation.amount), campaignId: donation.campaignId, retryDays: CHARGE_RETRY_DAYS },
    });
    await this.notificationsService
      .notify({
        userId: donation.userId,
        type: NotificationType.SYSTEM,
        title: "Khoản cam kết đã bị hủy",
        message: `Không trừ được tiền cho khoản cam kết ${money(donation.amount)} của chiến dịch "${campaignTitle}" sau ${CHARGE_RETRY_DAYS} ngày nên khoản này đã bị hủy. Bạn không bị trừ tiền.`,
        link: `/du-an/${donation.campaignId}`,
        relatedId: donation.id,
        email: true,
      })
      .catch(() => undefined);
    return true;
  }

  /**
   * Bỏ một khoản đang được tính (cam kết) khỏi số liệu chiến dịch trong một transaction:
   * đổi trạng thái có điều kiện, trừ `currentAmount`/`backerCount`, trả lại suất quà.
   */
  private async uncountPledge(
    donation: Donation,
    from: DonationStatus,
    to: DonationStatus,
    manager?: EntityManager,
  ): Promise<boolean> {
    const run = async (m: EntityManager) => {
      const result = await m.update(Donation, { id: donation.id, status: from }, { status: to });
      if (!result.affected) return false;
      // Ủng hộ bằng ví: tiền đang giữ trả về số dư cùng transaction.
      if (donation.paymentMethod === WALLET_BALANCE_METHOD) {
        if (!this.wallet) throw new ServiceUnavailableException("Ví Góp Mầm chưa sẵn sàng");
        await this.wallet.release(m, donation);
      }
      await m
        .createQueryBuilder()
        .update(Campaign)
        .set({
          currentAmount: () => "GREATEST(current_amount - :amount, 0)",
          backerCount: () => "GREATEST(backer_count - 1, 0)",
        })
        .where("id = :id", { id: donation.campaignId })
        .setParameter("amount", Number(donation.amount))
        .execute();
      if (donation.rewardTierId) {
        await m
          .createQueryBuilder()
          .update(RewardTier)
          .set({ claimedCount: () => "claimed_count - 1" })
          .where("id = :id", { id: donation.rewardTierId })
          .andWhere("claimed_count > 0")
          .execute();
      }
      return true;
    };
    return manager ? run(manager) : this.dataSource.transaction(run);
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
    // Đơn nạp ví (mã `NP…`) dùng chung URL IPN với khoản ủng hộ (mã `GM…`).
    if (this.wallet?.isTopupInvoice(ipn.invoiceNumber)) {
      return this.wallet.handleTopupIpn(ipn);
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

    let rewardNeedsShipping = false;
    if (dto.rewardTierId) {
      const tier = await this.assertRewardTierAvailable(dto.rewardTierId, campaign.id, dto.amount);
      rewardNeedsShipping = tier.requiresShipping ?? true;
      if (rewardNeedsShipping && !dto.rewardRecipient) {
        throw new BadRequestException("Vui lòng nhập họ tên, số điện thoại và địa chỉ người nhận quà.");
      }
    }

    // SePay chỉ còn là cổng nạp tiền vào ví Góp Mầm; ủng hộ thì dùng số dư ví (cam kết tất cả hoặc không).
    // Đơn SePay cũ vẫn được IPN/đối soát/hoàn tiền xử lý như trước.
    if (dto.paymentMethod === "sepay") {
      throw new BadRequestException(
        "SePay dùng để nạp tiền vào ví Góp Mầm. Vui lòng nạp ví rồi ủng hộ bằng số dư ví.",
      );
    }
    if (dto.paymentMethod === "stripe" && !this.stripe) {
      throw new BadRequestException("Cổng thẻ Stripe chưa được cấu hình");
    }
    if (dto.paymentMethod === "wallet" && !this.demoWalletEnabled()) {
      throw new BadRequestException("Kênh thanh toán demo đã tắt. Vui lòng chọn kênh khác.");
    }
    if (dto.paymentMethod === WALLET_BALANCE_METHOD) {
      if (!this.wallet) {
        throw new BadRequestException("Ví Góp Mầm chưa sẵn sàng.");
      }
      // Báo sớm cho dễ hiểu; việc giữ tiền thật vẫn kiểm tra có điều kiện trong transaction.
      const { balance } = await this.wallet.summary(user.id);
      if (balance < dto.amount) {
        throw new BadRequestException(
          `Số dư ví (${money(balance)}) không đủ để ủng hộ ${money(dto.amount)}. Vui lòng nạp thêm ${money(dto.amount - balance)}.`,
        );
      }
    }

    // Thẻ Stripe nhận mã giao dịch thật (`pi_…`) khi trừ tiền; ví có mã riêng lúc trừ; kênh khác giữ mã tham chiếu cũ.
    const paymentResult =
      dto.paymentMethod === "stripe" || dto.paymentMethod === WALLET_BALANCE_METHOD
        ? null
        : await this.paymentGateway.createTransaction({
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
      transactionId: paymentResult?.transactionId,
      transferCode: generateTransferCode(),
      idempotencyKey: dto.idempotencyKey,
      // Lời động viên hiển thị công khai: bỏ khoảng trắng thừa, chuỗi rỗng coi như không có.
      message: dto.message?.trim() || undefined,
      isAnonymous: dto.isAnonymous ?? true,
      rewardTierId: dto.rewardTierId ?? null,
    });

    const saved = await this.donationRepo.save(donation);
    // Quà không cần giao (quà số, ghi danh…): không lưu địa chỉ dù trình duyệt có gửi.
    if (dto.rewardTierId && dto.rewardRecipient && rewardNeedsShipping) {
      await this.dataSource.getRepository(RewardRecipient).save({
        donationId: saved.id,
        recipientName: dto.rewardRecipient.name.trim(),
        phone: dto.rewardRecipient.phone.trim(),
        address: dto.rewardRecipient.address.trim(),
      });
    }
    if (dto.paymentMethod === WALLET_BALANCE_METHOD) {
      return this.pledgeFromWallet(saved, user);
    }
    return saved;
  }

  /**
   * Ủng hộ bằng ví: giữ tiền trong ví và ghi nhận cam kết trong cùng một transaction
   * (không cần bước thanh toán ngoài). Số dư không đủ thì khoản này thất bại, không
   * giữ đồng nào.
   */
  private async pledgeFromWallet(donation: Donation, user: User): Promise<Donation> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.applyPaymentResult(
          { donationId: donation.id, status: "completed", timestamp: Date.now() },
          "wallet-balance",
          user.id,
        );
      } catch (error) {
        // Hai lệnh ủng hộ cùng lúc trên một ví có thể bị MySQL chọn hủy một bên (deadlock):
        // transaction đã hoàn tác sạch nên thử lại; lần sau sẽ thấy đúng số dư còn lại.
        if (isDeadlock(error) && attempt < 3) continue;
        const insufficient = error instanceof InsufficientBalanceError;
        await this.donationRepo.update(
          { id: donation.id, status: DonationStatus.PENDING },
          { status: DonationStatus.FAILED, lastChargeError: insufficient ? "Số dư ví không đủ" : "Không giữ được tiền trong ví" },
        );
        if (insufficient) {
          throw new BadRequestException(`Số dư ví không đủ để ủng hộ ${money(donation.amount)}. Vui lòng nạp thêm.`);
        }
        throw new ConflictException("Ví đang xử lý một giao dịch khác. Vui lòng thử lại.");
      }
    }
  }

  /**
   * Kiểm tra lúc tạo giao dịch (suất chỉ bị trừ khi thanh toán được xác nhận,
   * xem applyPaymentResult): mức thuộc chiến dịch, đang nhận, đủ tiền, còn suất.
   */
  private async assertRewardTierAvailable(tierId: string, campaignId: string, amount: number): Promise<RewardTier> {
    const tier = await this.dataSource.getRepository(RewardTier).findOne({ where: { id: tierId } });
    if (!tier || tier.campaignId !== campaignId || !tier.isActive) {
      throw new NotFoundException("Reward tier not found");
    }
    if (tier.availableUntil && new Date(tier.availableUntil).getTime() <= Date.now()) {
      throw new ConflictException(`Mức quà "${tier.title}" đã hết hạn chọn.`);
    }
    if (Number(amount) < Number(tier.minAmount)) {
      throw new BadRequestException(
        `Mức quà "${tier.title}" cần ủng hộ tối thiểu ${Number(tier.minAmount).toLocaleString("vi-VN")} ₫.`,
      );
    }
    if (tier.quantityLimit != null && tier.claimedCount >= tier.quantityLimit) {
      throw new ConflictException(`Mức quà "${tier.title}" đã hết suất.`);
    }
    return tier;
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

  /**
   * Ghi kết quả thanh toán. Với kênh trả ngay (SePay) "completed" là đã thu tiền; với
   * kênh cam kết (thẻ, ví demo) "completed" là đã lưu phương thức → `pledged`, chưa trừ.
   * Cả hai đều được cộng vào tiến độ chiến dịch và giữ suất quà.
   */
  private async applyPaymentResult(
    dto: WebhookDonationDto,
    source: PaymentSource,
    actorId?: string,
    extra: Partial<Pick<Donation, "paymentCustomerRef" | "paymentMethodRef">> = {},
  ): Promise<Donation> {
    const donation = await this.donationRepo.findOne({
      where: { id: dto.donationId },
    });
    if (!donation) {
      throw new NotFoundException("Donation not found");
    }
    const nextStatus = nextStatusFor(dto.status, donation.paymentMethod);
    const sources = transitionSources(nextStatus);
    const previousStatus = donation.status;
    if (!sources.includes(previousStatus)) {
      // Đã xử lý rồi (hoặc chuyển không hợp lệ, vd. hủy một đơn đã thành công): idempotent.
      return donation;
    }
    if (nextStatus === DonationStatus.PLEDGED) {
      const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
      if (!campaignOpenForPledges(campaign)) {
        // Chiến dịch đã chốt kết quả trong lúc người ủng hộ đang lưu thẻ: không nhận cam
        // kết muộn (sẽ làm lệch kết quả đã chốt). Chưa trừ tiền nên không cần hoàn.
        const closed = await this.donationRepo.update(
          { id: donation.id, status: previousStatus },
          { status: DonationStatus.FAILED, lastChargeError: "Chiến dịch đã kết thúc trước khi lưu thẻ xong" },
        );
        if (closed.affected) {
          await this.auditService.record({
            userId: actorId,
            action: "donation.pledge.rejected",
            entity: "donation",
            entityId: donation.id,
            oldValues: { status: previousStatus },
            newValues: { status: DonationStatus.FAILED, reason: "campaign-closed", source },
          });
          return { ...donation, status: DonationStatus.FAILED } as Donation;
        }
        return (await this.donationRepo.findOne({ where: { id: donation.id } })) ?? donation;
      }
    }
    const counted = nextStatus === DonationStatus.COMPLETED || nextStatus === DonationStatus.PLEDGED;
    const nextTransactionId = dto.transactionId ?? donation.transactionId;
    const completedAt =
      nextStatus === DonationStatus.COMPLETED
        ? new Date()
        : donation.completedAt;
    const pledgedAt = nextStatus === DonationStatus.PLEDGED ? new Date() : donation.pledgedAt;

    const outcome = await this.dataSource.transaction(async (manager) => {
      // Update có điều kiện trên chính cột `status`: chỉ ghi khi donation vẫn
      // còn ở đúng trạng thái đã đọc. Guard ở trên đọc ngoài transaction nên
      // không đủ để chống race — nếu update vô điều kiện, hai webhook (hoặc
      // webhook đua với xác nhận ví demo/job hết hạn) cùng đọc rồi cùng ghi sẽ
      // cùng cộng tiền/backer trùng lặp cho một donation.
      const updateResult = await manager.update(
        Donation,
        { id: donation.id, status: previousStatus },
        {
          status: nextStatus,
          transactionId: nextTransactionId,
          completedAt,
          ...(nextStatus === DonationStatus.PLEDGED ? { pledgedAt, ...extra } : {}),
        },
      );

      if (!updateResult.affected) {
        // Một request khác đã xử lý donation này trước — trả lại bản ghi hiện
        // tại, không cộng tiền/backer lần nữa, không ghi audit trùng.
        const current = await manager.findOne(Donation, {
          where: { id: donation.id },
        });
        return { applied: false as const, donation: current ?? donation };
      }

      // Ủng hộ bằng ví: giữ tiền cùng lúc ghi nhận cam kết; không đủ số dư thì hoàn tác cả hai.
      if (nextStatus === DonationStatus.PLEDGED && donation.paymentMethod === WALLET_BALANCE_METHOD) {
        if (!this.wallet || !(await this.wallet.hold(manager, donation))) {
          throw new InsufficientBalanceError();
        }
      }

      let rewardDropped = false;
      if (counted && donation.rewardTierId) {
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

      if (counted) {
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
          ...(nextStatus === DonationStatus.PLEDGED ? { pledgedAt, ...extra } : {}),
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
    if (result.status === DonationStatus.COMPLETED || result.status === DonationStatus.PLEDGED) {
      // Giao dịch đã commit: lỗi khi gửi thông báo không được làm hỏng phản hồi thanh toán.
      await this.notifyDonationCompleted(result, outcome.rewardDropped).catch(() => undefined);
      await this.autoFollow(result).catch(() => undefined);
    }
    return result;
  }

  /**
   * Ủng hộ (hoặc cam kết) thành công thì tự động theo dõi dự án để nhận cập nhật và
   * lời nhắc. INSERT IGNORE: đã theo dõi rồi thì giữ nguyên. Chủ dự án không theo dõi
   * chính dự án của mình (đã nhận mọi thông báo).
   */
  private async autoFollow(donation: Donation): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    if (!campaign || campaign.ownerId === donation.userId) return;
    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(CampaignFollow)
      .values({ userId: donation.userId, campaignId: donation.campaignId })
      .orIgnore()
      .execute();
  }

  /** Báo người ủng hộ: khoản cam kết đã được trừ tiền vì chiến dịch đạt mục tiêu. */
  private async notifyPledgeCharged(donation: Donation): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    await this.notificationsService.notify({
      userId: donation.userId,
      type: NotificationType.DONATION_CONFIRMED,
      title: "Đã trừ tiền khoản ủng hộ",
      message: `Chiến dịch "${campaign?.title ?? ""}" đã đạt mục tiêu nên khoản cam kết ${money(donation.amount)} của bạn vừa được trừ tiền. Cảm ơn bạn!`,
      link: `/bien-nhan/${donation.id}`,
      relatedId: donation.id,
      email: true,
    });
  }

  /** Báo người ủng hộ: trừ tiền thất bại, cần đổi thẻ trước hạn. */
  private async notifyChargeFailed(donation: Donation): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    const deadline = this.chargeRetryDeadline(donation);
    const link = `/du-an/${donation.campaignId}/ung-ho?donation=${donation.id}&payment=success`;
    await this.notificationsService.notify({
      userId: donation.userId,
      type: NotificationType.SYSTEM,
      title: "Chưa trừ được tiền khoản ủng hộ",
      message: `Chiến dịch "${campaign?.title ?? ""}" đã đạt mục tiêu nhưng chưa trừ được ${money(donation.amount)} từ phương thức bạn đã lưu. Vui lòng cập nhật thẻ trước ${vnDate(deadline)}, nếu không khoản cam kết sẽ bị hủy.`,
      link,
      relatedId: donation.id,
      email: true,
      chargeFailed: {
        campaignTitle: campaign?.title ?? "",
        amount: Number(donation.amount),
        reason: donation.lastChargeError,
        deadline,
        graceDays: CHARGE_RETRY_DAYS,
        fixLink: link,
      },
    });
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
    const pledged = donation.status === DonationStatus.PLEDGED;
    await this.notificationsService.notify([
      pledged
        ? {
            userId: donation.userId,
            type: NotificationType.DONATION_CONFIRMED,
            title: "Đã ghi nhận cam kết ủng hộ",
            message:
              donation.paymentMethod === WALLET_BALANCE_METHOD
                ? `${amount} cho chiến dịch "${campaign.title}" đang được giữ trong ví của bạn. Tiền chỉ bị trừ nếu chiến dịch đạt mục tiêu khi kết thúc ngày ${vnDate(campaign.endDate)}; không đạt thì hoàn về ví.${rewardNote} Cảm ơn bạn!`
                : `Cam kết ${amount} cho chiến dịch "${campaign.title}" đã được ghi nhận, bạn CHƯA bị trừ tiền. Tiền chỉ được trừ nếu chiến dịch đạt mục tiêu khi kết thúc ngày ${vnDate(campaign.endDate)}; không đạt thì không trừ.${rewardNote} Cảm ơn bạn!`,
            link: `/du-an/${campaign.id}`,
            relatedId: donation.id,
            email: true,
          }
        : {
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
              ...donationGroupText(campaign.title, 1, Number(donation.amount)),
              link: "/dashboard",
              relatedId: campaign.id,
              email: true,
              // Nhiều khoản liên tiếp gộp thành một thông báo chưa đọc: "Có N khoản ủng hộ mới, tổng …"
              donationGroup: { campaignTitle: campaign.title, amount: Number(donation.amount) },
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
    if (donation.status === DonationStatus.PLEDGED) {
      return this.cancelPledge(donation, user);
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

  /**
   * Rút cam kết trước hạn chiến dịch (như Kickstarter): chưa trừ tiền nên chỉ cần bỏ
   * khỏi tiến độ và trả suất quà. Sau hạn (đang/đã trừ tiền) thì không rút được.
   */
  private async cancelPledge(donation: Donation, user: User): Promise<Donation> {
    const campaign = await this.campaignRepo.findOne({ where: { id: donation.campaignId } });
    if (!campaignOpenForPledges(campaign)) {
      throw new ConflictException("Chiến dịch đã kết thúc nên không rút được cam kết.");
    }
    const cancelled = await this.uncountPledge(donation, DonationStatus.PLEDGED, DonationStatus.CANCELLED);
    if (!cancelled) {
      throw new ConflictException("Khoản cam kết vừa được xử lý. Vui lòng tải lại trang.");
    }
    await this.auditService.record({
      userId: user.id,
      action: "donation.pledge.cancel",
      entity: "donation",
      entityId: donation.id,
      oldValues: { status: DonationStatus.PLEDGED },
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
    // Gồm cam kết chưa trừ tiền (đánh dấu `pledged`) — khớp với tiến độ đang hiển thị.
    const [donations, total] = await this.donationRepo.findAndCount({
      where: { campaignId, status: In([...COUNTED_DONATION_STATUSES]) },
      relations: { user: true },
      order:
        sort === "top"
          ? { amount: "DESC", createdAt: "DESC" }
          : { createdAt: "DESC" },
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
        status: donation.status === DonationStatus.COMPLETED ? ("completed" as const) : ("pledged" as const),
        reference: maskReference(donation.transactionId ?? donation.id),
        completedAt: donation.completedAt ?? donation.pledgedAt ?? donation.createdAt,
      })),
    };
  }

  /**
   * "Lời động viên" công khai: lời nhắn người ủng hộ để lại cùng khoản đã xác nhận
   * (form ủng hộ ghi rõ lời nhắn sẽ hiển thị công khai). Chỉ trả tên (hoặc null nếu
   * ẩn danh), số tiền, lời nhắn và thời điểm — không email, không mã giao dịch.
   */
  async listSupportMessages(campaignId: string, offset = 0, limit = 10): Promise<SupportMessagePage> {
    const campaign = await this.campaignRepo.findOneBy({ id: campaignId });
    if (!campaign || !LEDGER_VISIBLE_STATUSES.includes(campaign.status)) {
      throw new NotFoundException("Campaign not found");
    }

    const [donations, total] = await this.donationRepo.findAndCount({
      where: {
        campaignId,
        status: In([...COUNTED_DONATION_STATUSES]),
        message: Raw((column) => `${column} IS NOT NULL AND TRIM(${column}) <> ''`),
      },
      relations: { user: true },
      order: { createdAt: "DESC" },
      skip: Math.max(0, offset),
      take: Math.min(Math.max(1, limit), 50),
    });

    return {
      total,
      items: donations.map((donation) => ({
        id: donation.id,
        donorName: donation.isAnonymous ? null : (donation.user?.name ?? null),
        amount: Number(donation.amount),
        message: (donation.message ?? "").trim(),
        createdAt: donation.completedAt ?? donation.pledgedAt ?? donation.createdAt,
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
  /** `pledged`: đã cam kết, chưa trừ tiền (trừ khi chiến dịch đạt mục tiêu). */
  status: "completed" | "pledged";
  reference: string;
  completedAt: Date;
};

export type PublicLedger = {
  items: PublicLedgerEntry[];
  total: number;
};

export type SupportMessage = {
  id: string;
  donorName: string | null;
  amount: number;
  message: string;
  createdAt: Date;
};

export type SupportMessagePage = {
  items: SupportMessage[];
  total: number;
};

/** Chỉ giữ 6 ký tự cuối để đối chiếu, không lộ toàn bộ mã giao dịch. */
function maskReference(value: string): string {
  const tail = value.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `•••${tail}`;
}
