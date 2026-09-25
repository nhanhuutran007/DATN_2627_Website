import { api } from "../api";

export type ApiDonationStatus = "pending" | "completed" | "failed" | "refunded";

export type ApiDonation = {
  id: string;
  userId: string;
  campaignId: string;
  amount: number | string;
  currency: string;
  status: ApiDonationStatus;
  paymentMethod?: string | null;
  transactionId?: string | null;
  idempotencyKey: string;
  message?: string | null;
  isAnonymous: boolean;
  completedAt?: string | null;
  createdAt?: string;
  campaign?: {
    id: string;
    title: string;
  } | null;
  user?: {
    id: string;
    name: string;
  } | null;
};

export type CreateDonationPayload = {
  campaignId: string;
  amount: number;
  paymentMethod: string;
  message?: string;
  isAnonymous?: boolean;
  idempotencyKey: string;
};

export type ConfirmDonationPayload = {
  donationId: string;
  status: "completed" | "failed";
};

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

export async function fetchMyDonations(): Promise<ApiDonation[]> {
  return api.get<ApiDonation[]>("/donations/mine");
}

export async function fetchDonation(id: string): Promise<ApiDonation> {
  return api.get<ApiDonation>(`/donations/${encodeURIComponent(id)}`);
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
  reference: string;
  completedAt: string;
};

export type CampaignLedger = {
  items: LedgerEntry[];
  total: number;
};

/** Sổ cái công khai: chỉ giao dịch đã xác nhận, ẩn danh được tôn trọng. */
export async function fetchCampaignLedger(campaignId: string, limit = 20): Promise<CampaignLedger> {
  return api.get<CampaignLedger>(
    `/campaigns/${encodeURIComponent(campaignId)}/donations?limit=${limit}`,
  );
}