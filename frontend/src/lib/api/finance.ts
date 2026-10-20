import { api, apiDownload } from "../api";
import type { ApiDonationStatus } from "./donations";

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export const REFUND_STATUS_LABEL: Record<RefundRequestStatus, string> = {
  pending: "Chờ xử lý",
  approved: "Đã hoàn tiền",
  rejected: "Không chấp nhận",
};

/** Kênh không có API hoàn tiền (SePay) → admin chuyển khoản trả lại thủ công. Khớp `needsManualRefund` ở backend. */
export function needsManualRefund(paymentMethod?: string | null): boolean {
  return paymentMethod === "sepay";
}

export const REFUND_METHOD_LABEL: Record<string, string> = {
  gateway: "Hoàn qua cổng thanh toán",
  manual_transfer: "Hoàn thủ công qua chuyển khoản",
};

/** Tài khoản nhận hoàn do người ủng hộ khai. */
export type RefundBankAccount = { bankName: string; bankAccountNumber: string; bankAccountName: string };

/** Mã chuyển khoản hoàn thật (bắt buộc với khoản SePay) và ảnh chứng từ (tùy chọn). */
export type ManualTransferInput = { transferReference?: string; proofMediaId?: string };

export type RefundRequest = {
  id: string;
  donationId: string;
  userId: string;
  reason: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  status: RefundRequestStatus;
  adminNotes?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  donation?: {
    id: string;
    amount: number | string;
    status: ApiDonationStatus;
    campaignId: string;
    campaign?: { id: string; title: string } | null;
    completedAt?: string | null;
    paymentMethod?: string | null;
    transferCode?: string | null;
    refundReference?: string | null;
    refundMethod?: string | null;
    refundProofUrl?: string | null;
  } | null;
  user?: { id: string; name: string; email?: string } | null;
};

export type RefundRequestList = { items: RefundRequest[]; total: number; offset: number; limit: number };

export type DonationReceipt = {
  receiptNumber: string;
  donationId: string;
  status: ApiDonationStatus;
  amount: number;
  currency: string;
  paymentMethod: string | null;
  transactionId: string | null;
  completedAt: string | null;
  donorName: string;
  isAnonymous: boolean;
  campaign: { id: string; title: string };
  rewardTitle: string | null;
  refund: {
    refundedAt: string | null;
    reference: string | null;
    reason: string | null;
    method: string | null;
    proofUrl: string | null;
  } | null;
};

export type CampaignReconciliation = {
  campaignId: string;
  title: string;
  completedCount: number;
  completedAmount: number;
  refundedCount: number;
  refundedAmount: number;
  netAmount: number;
  recordedAmount: number;
  recordedBackers: number;
  ledgerAmount: number;
  ledgerBackers: number;
  mismatch: boolean;
};

export type ReconciliationReport = {
  from: string;
  to: string;
  totals: { completedCount: number; completedAmount: number; refundedCount: number; refundedAmount: number; netAmount: number };
  campaigns: CampaignReconciliation[];
  mismatches: number;
};

export function fetchReceipt(donationId: string): Promise<DonationReceipt> {
  return api.get<DonationReceipt>(`/donations/${encodeURIComponent(donationId)}/receipt`);
}

export function requestRefund(
  donationId: string,
  input: { reason: string } & Partial<RefundBankAccount>,
): Promise<RefundRequest> {
  return api.post<RefundRequest>(`/donations/${encodeURIComponent(donationId)}/refund-request`, input);
}

export function fetchMyRefundRequests(): Promise<RefundRequest[]> {
  return api.get<RefundRequest[]>("/refund-requests/mine");
}

export function fetchAdminRefunds(
  status?: RefundRequestStatus,
  page: { offset?: number; limit?: number } = {},
  filters: { q?: string; minAmount?: number; maxAmount?: number } = {},
): Promise<RefundRequestList> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (filters.q) params.set("q", filters.q);
  if (filters.minAmount !== undefined) params.set("minAmount", String(filters.minAmount));
  if (filters.maxAmount !== undefined) params.set("maxAmount", String(filters.maxAmount));
  if (page.offset !== undefined) params.set("offset", String(page.offset));
  if (page.limit !== undefined) params.set("limit", String(page.limit));
  const qs = params.toString();
  return api.get<RefundRequestList>(`/admin/refunds${qs ? `?${qs}` : ""}`);
}

export function approveRefund(id: string, adminNotes: string, manual: ManualTransferInput = {}): Promise<RefundRequest> {
  return api.patch<RefundRequest>(`/admin/refunds/${encodeURIComponent(id)}/approve`, { adminNotes, ...manual });
}

export function rejectRefund(id: string, adminNotes: string): Promise<RefundRequest> {
  return api.patch<RefundRequest>(`/admin/refunds/${encodeURIComponent(id)}/reject`, { adminNotes });
}

export function refundDonationDirectly(donationId: string, reason: string, manual: ManualTransferInput = {}): Promise<unknown> {
  return api.post(`/admin/donations/${encodeURIComponent(donationId)}/refund`, { reason, ...manual });
}

/** Tải CSV yêu cầu hoàn kèm tài khoản nhận (để chuyển khoản trả lại). */
export async function downloadRefundsCsv(status?: RefundRequestStatus): Promise<void> {
  const { blob, filename } = await apiDownload(`/admin/refunds/export${status ? `?status=${status}` : ""}`);
  saveBlob(blob, filename ?? "hoan-tien.csv");
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function rangeQuery(range: { from?: string; to?: string; campaignId?: string }): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  if (range.campaignId) params.set("campaignId", range.campaignId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function fetchReconciliation(range: { from?: string; to?: string; campaignId?: string }): Promise<ReconciliationReport> {
  return api.get<ReconciliationReport>(`/admin/reconciliation${rangeQuery(range)}`);
}

/** Tải CSV đối soát và mở hộp lưu file của trình duyệt. */
export async function downloadReconciliationCsv(range: { from?: string; to?: string; campaignId?: string }): Promise<void> {
  const { blob, filename } = await apiDownload(`/admin/reconciliation/export${rangeQuery(range)}`);
  saveBlob(blob, filename ?? "doi-soat.csv");
}
