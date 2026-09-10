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

export type WebhookPayload = {
  donationId: string;
  status: "completed" | "failed";
  transactionId?: string;
};

export async function createDonation(payload: CreateDonationPayload): Promise<ApiDonation> {
  return api.post<ApiDonation>("/donations", payload);
}

export async function confirmDonation(payload: WebhookPayload): Promise<ApiDonation> {
  return api.post<ApiDonation>("/donations/webhook", payload);
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
