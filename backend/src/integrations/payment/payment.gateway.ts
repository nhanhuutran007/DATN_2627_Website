import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  raw?: Record<string, unknown>;
}

/** Trường được ký trong webhook thanh toán. */
export type WebhookSignedFields = {
  donationId: string;
  status: string;
  transactionId?: string;
};

export interface PaymentGateway {
  /**
   * `demo`: cổng sandbox nội bộ, cho phép người tài trợ xác nhận thanh toán ví demo.
   * `live`: cổng thật, trạng thái chỉ đổi qua webhook có chữ ký.
   */
  readonly mode: "demo" | "live";

  createTransaction(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResult>;

  /** Trả `true` chỉ khi chữ ký khớp với nội dung webhook. */
  verifyWebhookSignature(payload: WebhookSignedFields, signature: string): boolean;
}

/** Chuỗi chuẩn hóa dùng để ký, tránh phụ thuộc thứ tự khóa/khoảng trắng của JSON. */
export function webhookSigningString(payload: WebhookSignedFields): string {
  return [payload.donationId, payload.status, payload.transactionId ?? ""].join(".");
}

/** HMAC-SHA256 (hex) của nội dung webhook. Dùng cho cổng gọi lại và cho test/demo. */
export function signWebhookPayload(secret: string, payload: WebhookSignedFields): string {
  return createHmac("sha256", secret).update(webhookSigningString(payload)).digest("hex");
}

export class DemoWalletGateway implements PaymentGateway {
  readonly mode = "demo" as const;

  /** `webhookSecret` rỗng nghĩa là từ chối mọi webhook (fail closed). */
  constructor(private readonly webhookSecret: string = "") {}

  async createTransaction(params: {
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaymentResult> {
    const transactionId = `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`;
    return {
      success: true,
      transactionId,
      raw: { amount: params.amount, currency: params.currency, mode: "demo" },
    };
  }

  verifyWebhookSignature(payload: WebhookSignedFields, signature: string): boolean {
    if (!this.webhookSecret || !signature) {
      return false;
    }
    const expected = Buffer.from(signWebhookPayload(this.webhookSecret, payload), "utf8");
    const received = Buffer.from(signature.trim().toLowerCase(), "utf8");
    return expected.length === received.length && timingSafeEqual(expected, received);
  }
}
