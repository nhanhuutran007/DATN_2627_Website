import { api } from "../api";

/**
 * `pledged`: đã cam kết, CHƯA trả tiền — chỉ phải trả khi chiến dịch đạt mục tiêu.
 * `awaiting_payment`: chiến dịch đã đạt mục tiêu, người ủng hộ cần quét QR SePay trong hạn.
 * `charge_failed`: đạt mục tiêu nhưng trừ thẻ thất bại, cần đổi thẻ trong hạn.
 * `released`: chiến dịch không đạt, cam kết được hủy, không trừ tiền.
 */
export type ApiDonationStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "expired"
  | "cancelled"
  | "pledged"
  | "charge_failed"
  | "released"
  | "awaiting_payment";

export type ApiDonation = {
  id: string;
  userId: string;
  campaignId: string;
  amount: number | string;
  currency: string;
  status: ApiDonationStatus;
  paymentMethod?: string | null;
  transactionId?: string | null;
  /** Mã nội dung chuyển khoản VietQR (vd. `GM7K2QX9AB`). */
  transferCode?: string | null;
  idempotencyKey: string;
  message?: string | null;
  isAnonymous: boolean;
  rewardTierId?: string | null;
  completedAt?: string | null;
  /** Lúc cam kết được ghi nhận (gây quỹ tất cả hoặc không). */
  pledgedAt?: string | null;
  /** Lần trừ tiền thất bại đầu tiên — hạn đổi thẻ tính từ mốc này. */
  chargeFailedAt?: string | null;
  lastChargeError?: string | null;
  /** Lúc được yêu cầu thanh toán (chiến dịch đạt mục tiêu) — hạn trả tính từ mốc này. */
  paymentRequestedAt?: string | null;
  createdAt?: string;
  campaign?: {
    id: string;
    title: string;
    /** Có khi API trả kèm chiến dịch đầy đủ (vd. `/donations/mine`) để hiện ảnh bìa. */
    category?: string;
    imageUrl?: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
  } | null;
};

export type CreateDonationPayload = {
  campaignId: string;
  amount: number;
  /** Chỉ còn `sepay` (cam kết, trả qua QR SePay khi dự án đạt mục tiêu). */
  paymentMethod?: "sepay";
  message?: string;
  isAnonymous?: boolean;
  idempotencyKey: string;
  /** Mức quà chọn kèm khoản ủng hộ (số tiền phải ≥ mức tối thiểu). */
  rewardTierId?: string;
  /** Bắt buộc khi chọn mức quà; chỉ chủ dự án và quản trị viên xem được. */
  rewardRecipient?: RewardRecipient;
};

export type RewardRecipient = { name: string; phone: string; address: string };

export type ConfirmDonationPayload = {
  donationId: string;
  status: "completed" | "failed";
};

/** Quyền cam kết trả sau của chính mình (`GET /donations/pledge-standing`). */
export type PledgeStanding = {
  abandoned: number;
  tier: "good" | "warned" | "limited" | "blocked";
  maxOpenCampaigns: number;
  openCampaigns: number;
  canPledge: boolean;
  newAccount: boolean;
};

export function fetchPledgeStanding(): Promise<PledgeStanding> {
  return api.get<PledgeStanding>("/donations/pledge-standing");
}

export async function createDonation(payload: CreateDonationPayload): Promise<ApiDonation> {
  return api.post<ApiDonation>("/donations", payload);
}

/**
 * Xác nhận thanh toán ví demo (sandbox). Webhook thật `/donations/webhook` cần chữ ký
 * HMAC do cổng thanh toán gửi từ server nên trình duyệt không được gọi trực tiếp.
 */
export async function confirmDonation(payload: ConfirmDonationPayload): Promise<ApiDonation> {
  return api.post<ApiDonation>(
    `/donations/${encodeURIComponent(payload.donationId)}/confirm`,
    { status: payload.status },
  );
}

/** Hủy giao dịch đang chờ thanh toán (chỉ chủ giao dịch). */
export async function cancelDonation(donationId: string): Promise<ApiDonation> {
  return api.post<ApiDonation>(`/donations/${encodeURIComponent(donationId)}/cancel`);
}

export async function fetchMyDonations(): Promise<ApiDonation[]> {
  return api.get<ApiDonation[]>("/donations/mine");
}

export async function fetchDonation(id: string): Promise<ApiDonation> {
  return api.get<ApiDonation>(`/donations/${encodeURIComponent(id)}`);
}

export type PaymentOptions = {
  /** Cổng SePay (QR chuyển khoản); null khi máy chủ chưa cấu hình merchant. */
  sepay: { env: "sandbox" | "production" } | null;
  /** Ví demo (tự xác nhận, không có tiền thật); tắt khi SePay chạy production. */
  demoWallet: boolean;
  /** Thẻ qua Stripe (lưu thẻ, trừ khi đạt mục tiêu); null khi máy chủ chưa cấu hình. */
  stripe?: { testMode: boolean } | null;
  /** Ví Góp Mầm: nạp qua SePay, ủng hộ bằng số dư (tiền được giữ đến khi chiến dịch kết thúc). */
  balance?: { demoTopup: boolean } | null;
};

/** Hạn đổi thẻ sau khi trừ tiền cam kết thất bại (khớp `CHARGE_RETRY_DAYS` ở backend). */
export const CHARGE_RETRY_DAYS = 7;

/** Hạn thanh toán sau khi chiến dịch đạt mục tiêu (khớp `PAYMENT_WINDOW_DAYS` ở backend, như Kickstarter). */
export const PAYMENT_WINDOW_DAYS = 7;

/** Hạn chót thanh toán của cam kết đang chờ trả. */
export function paymentDeadline(donation: Pick<ApiDonation, "paymentRequestedAt">): Date {
  const requestedAt = donation.paymentRequestedAt ? new Date(donation.paymentRequestedAt) : new Date();
  return new Date(requestedAt.getTime() + PAYMENT_WINDOW_DAYS * 86_400_000);
}

/** Mở Stripe Checkout để lưu thẻ (cam kết) hoặc đổi thẻ khi trừ tiền thất bại. */
export async function createStripeCheckout(donationId: string): Promise<{ url: string }> {
  return api.post<{ url: string }>(`/donations/${encodeURIComponent(donationId)}/stripe-checkout`);
}

/** Nhờ server hỏi lại Stripe kết quả lưu thẻ (khi webhook chưa tới). */
export async function syncStripeDonation(donationId: string): Promise<{ donation: ApiDonation; applied: boolean }> {
  return api.post<{ donation: ApiDonation; applied: boolean }>(`/donations/${encodeURIComponent(donationId)}/stripe-sync`);
}

/** Thử trừ lại khoản cam kết trừ tiền thất bại. */
export async function retryCharge(donationId: string): Promise<ApiDonation> {
  return api.post<ApiDonation>(`/donations/${encodeURIComponent(donationId)}/retry-charge`);
}

export async function fetchPaymentOptions(): Promise<PaymentOptions> {
  return api.get<PaymentOptions>("/donations/payment-options");
}

export type SepayCheckoutForm = {
  /** URL trang thanh toán SePay. */
  action: string;
  /** Trường ẩn đã ký ở server (secret key không bao giờ xuống trình duyệt). */
  fields: Record<string, string>;
};

export async function createSepayCheckout(donationId: string): Promise<SepayCheckoutForm> {
  return api.post<SepayCheckoutForm>(`/donations/${encodeURIComponent(donationId)}/sepay-checkout`);
}

export type SepaySyncResult = {
  donation: ApiDonation;
  sepayStatus: string | null;
  applied: boolean;
};

/** Nhờ server hỏi lại SePay trạng thái đơn (khi IPN chưa tới). */
export async function syncSepayDonation(donationId: string): Promise<SepaySyncResult> {
  return api.post<SepaySyncResult>(`/donations/${encodeURIComponent(donationId)}/sepay-sync`);
}

/** POST form đã ký sang SePay (trình duyệt rời trang hiện tại). */
export function submitSepayCheckout(form: SepayCheckoutForm): void {
  const element = document.createElement("form");
  element.method = "POST";
  element.action = form.action;
  for (const [name, value] of Object.entries(form.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    element.appendChild(input);
  }
  document.body.appendChild(element);
  element.submit();
}

export function generateIdempotencyKey(): string {
  return `donation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export type LedgerEntry = {
  id: string;
  donorName: string | null;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  /** `pledged`: đã cam kết, chưa trừ tiền (bản API cũ không có trường này). */
  status?: "completed" | "pledged";
  reference: string;
  completedAt: string;
};

export type CampaignLedger = {
  items: LedgerEntry[];
  total: number;
};

/** Sổ cái công khai: chỉ giao dịch đã xác nhận, ẩn danh được tôn trọng. */
export async function fetchCampaignLedger(
  campaignId: string,
  limit = 20,
  sort: "recent" | "top" = "recent",
): Promise<CampaignLedger> {
  return api.get<CampaignLedger>(
    `/campaigns/${encodeURIComponent(campaignId)}/donations?limit=${limit}&sort=${sort}`,
  );
}
export type SupportMessage = {
  id: string;
  donorName: string | null;
  amount: number;
  message: string;
  createdAt: string;
};

export type SupportMessagePage = {
  items: SupportMessage[];
  total: number;
};

/** "Lời động viên": lời nhắn công khai kèm khoản ủng hộ đã xác nhận, mới nhất trước. */
export async function fetchSupportMessages(campaignId: string, offset = 0, limit = 10): Promise<SupportMessagePage> {
  return api.get<SupportMessagePage>(
    `/campaigns/${encodeURIComponent(campaignId)}/support-messages?offset=${offset}&limit=${limit}`,
  );
}

/** Chỉ số người ủng hộ công khai của chiến dịch (không lộ danh tính). */
export type BackerQuality = {
  backers: number;
  verifiedBackers: number;
  /** null khi quá ít người để tính. */
  verifiedRatio: number | null;
  committedAmount: number;
  paidAmount: number;
  paymentPhase: boolean;
};

export function fetchBackerQuality(campaignId: string): Promise<BackerQuality> {
  return api.get<BackerQuality>(`/campaigns/${encodeURIComponent(campaignId)}/backer-quality`);
}
