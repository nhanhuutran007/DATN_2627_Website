import { randomInt, timingSafeEqual } from "node:crypto";

import { SePayPgClient } from "sepay-pg-node";

/**
 * Cổng thanh toán SePay (https://developer.sepay.vn/vi/cong-thanh-toan): backend ký
 * form thanh toán bằng secret key, trình duyệt POST form sang trang SePay (QR chuyển
 * khoản). Kết quả chỉ được tin khi SePay gọi IPN về server kèm `X-Secret-Key` —
 * redirect `success_url` của trình duyệt chỉ để hiển thị, không bao giờ cộng tiền.
 */
export type SepayEnv = "sandbox" | "production";

export type SepayConfig = {
  env: SepayEnv;
  merchantId: string;
  secretKey: string;
  /** Khóa SePay gửi trong header `X-Secret-Key` của IPN (mặc định = secretKey). */
  ipnSecret: string;
};

type Env = Record<string, string | undefined>;

/** `null` (tắt SePay) khi thiếu merchant/secret — không bao giờ tạo form không ký được. */
export function sepayConfigFromEnv(env: Env = process.env): SepayConfig | null {
  const merchantId = env.SEPAY_MERCHANT_ID?.trim() ?? "";
  const secretKey = env.SEPAY_SECRET_KEY?.trim() ?? "";
  if (!merchantId || !secretKey) return null;
  return {
    env: env.SEPAY_ENV?.trim() === "production" ? "production" : "sandbox",
    merchantId,
    secretKey,
    ipnSecret: env.SEPAY_IPN_SECRET?.trim() || secretKey,
  };
}

/** Bỏ chữ dễ nhầm (0/O, 1/I/L) vì mã có thể hiện trong nội dung chuyển khoản. */
const TRANSFER_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Mã đơn duy nhất gửi SePay làm `order_invoice_number`, vd. `GM7K2QX9AB`. */
export function generateTransferCode(): string {
  let code = "GM";
  for (let i = 0; i < 8; i += 1) {
    code += TRANSFER_CODE_ALPHABET[randomInt(TRANSFER_CODE_ALPHABET.length)];
  }
  return code;
}

export type SepayCheckoutForm = {
  /** URL trang thanh toán SePay, trình duyệt POST form tới đây. */
  action: string;
  fields: Record<string, string>;
};

export class SepayGateway {
  private readonly client: SePayPgClient;

  constructor(private readonly config: SepayConfig) {
    this.client = new SePayPgClient({
      env: config.env,
      merchant_id: config.merchantId,
      secret_key: config.secretKey,
    });
  }

  get env(): SepayEnv {
    return this.config.env;
  }

  /** Form thanh toán một lần (QR chuyển khoản) đã có chữ ký HMAC của SePay SDK. */
  buildCheckout(params: {
    invoiceNumber: string;
    amount: number;
    description: string;
    successUrl: string;
    errorUrl: string;
    cancelUrl: string;
  }): SepayCheckoutForm {
    const fields = this.client.checkout.initOneTimePaymentFields({
      operation: "PURCHASE",
      payment_method: "BANK_TRANSFER",
      order_invoice_number: params.invoiceNumber,
      order_amount: params.amount,
      currency: "VND",
      order_description: params.description,
      success_url: params.successUrl,
      error_url: params.errorUrl,
      cancel_url: params.cancelUrl,
    });
    return {
      action: this.client.checkout.initCheckoutUrl(),
      fields: Object.fromEntries(
        Object.entries(fields)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)]),
      ),
    };
  }

  /** So khớp `X-Secret-Key` của IPN, thời gian hằng để không lộ khóa qua timing. */
  verifyIpnSecret(received: string | undefined): boolean {
    if (!received) return false;
    const expected = Buffer.from(this.config.ipnSecret, "utf8");
    const actual = Buffer.from(received.trim(), "utf8");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}

/** Phần IPN hệ thống cần (SePay gửi thêm thông tin thẻ/khách hàng — bỏ qua). */
export type SepayIpn = {
  notificationType: string;
  orderStatus: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  /** Mã giao dịch phía SePay, lưu làm `transactionId` để đối soát. */
  transactionId: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

/** Đọc payload IPN; `null` nếu thiếu trường bắt buộc (mã đơn, số tiền, mã giao dịch). */
export function parseSepayIpn(body: unknown): SepayIpn | null {
  const root = asRecord(body);
  const order = asRecord(root?.order);
  if (!root || !order) return null;
  const transaction = asRecord(root.transaction);
  const invoiceNumber = asText(order.order_invoice_number);
  const amount = Number(asText(order.order_amount));
  const transactionId = asText(transaction?.transaction_id) || asText(transaction?.id) || asText(order.order_id);
  if (!invoiceNumber || !Number.isFinite(amount) || amount <= 0 || !transactionId) return null;
  return {
    notificationType: asText(root.notification_type).toUpperCase(),
    orderStatus: asText(order.order_status).toUpperCase(),
    invoiceNumber,
    amount,
    currency: (asText(order.order_currency) || "VND").toUpperCase(),
    transactionId,
  };
}
