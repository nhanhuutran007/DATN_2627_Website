import Stripe from "stripe";

/**
 * Cổng thẻ Stripe theo mô hình "tất cả hoặc không" (như Kickstarter): lúc ủng hộ chỉ
 * LƯU thẻ qua Checkout ở chế độ `setup` (không trừ tiền); khi chiến dịch hết hạn và đạt
 * mục tiêu, server trừ tiền thẻ đã lưu (PaymentIntent `off_session`). Không giữ tiền
 * (authorization hold) vì hold chỉ sống ~7 ngày, ngắn hơn thời gian gây quỹ.
 *
 * Stripe chưa nhận pháp nhân Việt Nam: dùng test mode (khóa `sk_test_…`) cho đồ án.
 * VND là tiền tệ không có phần thập phân trên Stripe: 50.000 ₫ gửi `amount: 50000`.
 */
export type StripeConfig = {
  secretKey: string;
  /** `whsec_…` để xác thực webhook; rỗng = từ chối mọi webhook (vẫn đối soát được qua API). */
  webhookSecret: string;
};

type Env = Record<string, string | undefined>;

/** `null` (ẩn kênh thẻ) khi chưa có STRIPE_SECRET_KEY. */
export function stripeConfigFromEnv(env: Env = process.env): StripeConfig | null {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!secretKey) return null;
  return { secretKey, webhookSecret: env.STRIPE_WEBHOOK_SECRET?.trim() ?? "" };
}

/** Kết quả phiên lưu thẻ, đọc từ Stripe (nguồn sự thật), không từ trình duyệt. */
export type CardSetupResult =
  | { status: "saved"; donationId: string | null; customerId: string; paymentMethodId: string }
  | { status: "open" | "expired"; donationId: string | null };

export type ChargeResult =
  | { success: true; transactionId: string }
  | { success: false; error: string; transactionId?: string };

/** Sự kiện webhook đã xác thực chữ ký; chỉ quan tâm phiên lưu thẻ đã hoàn tất. */
export type CardWebhookEvent = { type: "setup-completed"; sessionId: string } | { type: "ignored"; eventType: string };

/** Phần dùng chung của cổng thẻ — test thay bằng bản giả, không gọi mạng. */
export interface CardPledgeGateway {
  readonly testMode: boolean;
  createSetupCheckout(params: {
    donationId: string;
    userId: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    /** Khách hàng Stripe đã có (đổi thẻ sau khi trừ tiền thất bại). */
    customerId?: string | null;
  }): Promise<{ sessionId: string; url: string }>;
  getSetupResult(sessionId: string): Promise<CardSetupResult>;
  chargeSaved(params: {
    donationId: string;
    amount: number;
    customerId: string;
    paymentMethodId: string;
    /** Cùng khóa → Stripe trả lại đúng lần trừ cũ (chống trừ hai lần khi job chạy chồng). */
    idempotencyKey: string;
  }): Promise<ChargeResult>;
  refund(transactionId: string): Promise<{ success: boolean; refundId: string }>;
  parseWebhook(rawBody: Buffer, signature: string | undefined): CardWebhookEvent;
}

/** Phiên Checkout sống tối thiểu 30 phút theo quy định Stripe, khớp TTL đơn `pending`. */
const SETUP_SESSION_TTL_SECONDS = 30 * 60 + 60;

export class StripeGateway implements CardPledgeGateway {
  private readonly client: Stripe;

  constructor(private readonly config: StripeConfig, client?: Stripe) {
    this.client = client ?? new Stripe(config.secretKey);
  }

  get testMode(): boolean {
    return this.config.secretKey.startsWith("sk_test_") || this.config.secretKey.startsWith("rk_test_");
  }

  async createSetupCheckout(params: {
    donationId: string;
    userId: string;
    description: string;
    successUrl: string;
    cancelUrl: string;
    customerId?: string | null;
  }): Promise<{ sessionId: string; url: string }> {
    // Mỗi khoản cam kết một khách hàng Stripe (chỉ metadata nội bộ, không gửi email/tên).
    const customerId =
      params.customerId ??
      (await this.client.customers.create({ metadata: { userId: params.userId } })).id;
    const session = await this.client.checkout.sessions.create({
      mode: "setup",
      currency: "vnd",
      allowed_payment_method_types: ["card"],
      customer: customerId,
      client_reference_id: params.donationId,
      metadata: { donationId: params.donationId },
      setup_intent_data: { description: params.description, metadata: { donationId: params.donationId } },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      expires_at: Math.floor(Date.now() / 1000) + SETUP_SESSION_TTL_SECONDS,
    });
    if (!session.url) {
      throw new Error("Stripe không trả về URL Checkout");
    }
    return { sessionId: session.id, url: session.url };
  }

  async getSetupResult(sessionId: string): Promise<CardSetupResult> {
    const session = await this.client.checkout.sessions.retrieve(sessionId, { expand: ["setup_intent"] });
    const donationId = session.metadata?.donationId ?? session.client_reference_id ?? null;
    const intent = session.setup_intent;
    if (session.status === "complete" && intent && typeof intent !== "string" && intent.status === "succeeded") {
      const paymentMethodId = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (paymentMethodId && customerId) {
        return { status: "saved", donationId, customerId, paymentMethodId };
      }
    }
    return { status: session.status === "expired" ? "expired" : "open", donationId };
  }

  async chargeSaved(params: {
    donationId: string;
    amount: number;
    customerId: string;
    paymentMethodId: string;
    idempotencyKey: string;
  }): Promise<ChargeResult> {
    try {
      const intent = await this.client.paymentIntents.create(
        {
          amount: Math.round(params.amount),
          currency: "vnd",
          customer: params.customerId,
          payment_method: params.paymentMethodId,
          off_session: true,
          confirm: true,
          metadata: { donationId: params.donationId },
        },
        { idempotencyKey: params.idempotencyKey },
      );
      if (intent.status === "succeeded") {
        return { success: true, transactionId: intent.id };
      }
      return { success: false, error: `Thanh toán chưa hoàn tất (${intent.status})`, transactionId: intent.id };
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        // Thẻ bị từ chối hoặc ngân hàng yêu cầu xác thực (3DS) khi người dùng không có mặt.
        return { success: false, error: error.code ?? error.message, transactionId: error.payment_intent?.id };
      }
      throw error;
    }
  }

  async refund(transactionId: string): Promise<{ success: boolean; refundId: string }> {
    const refund = await this.client.refunds.create({ payment_intent: transactionId });
    return { success: refund.status !== "failed" && refund.status !== "canceled", refundId: refund.id };
  }

  parseWebhook(rawBody: Buffer, signature: string | undefined): CardWebhookEvent {
    if (!this.config.webhookSecret || !signature) {
      throw new Error("Stripe webhook secret missing or no signature");
    }
    const event = this.client.webhooks.constructEvent(rawBody, signature, this.config.webhookSecret);
    if (event.type === "checkout.session.completed" && event.data.object.mode === "setup") {
      return { type: "setup-completed", sessionId: event.data.object.id };
    }
    return { type: "ignored", eventType: event.type };
  }
}
