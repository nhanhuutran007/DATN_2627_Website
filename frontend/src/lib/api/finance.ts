import { api, apiDownload } from "../api";
import type { ApiDonationStatus } from "./donations";

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export const REFUND_STATUS_LABEL: Record<RefundRequestStatus, string> = {
  pending: "Chờ xử lý",
  approved: "Đã hoàn tiền",
  rejected: "Không chấp nhận",
};

export type RefundRequest = {
  id: string;
  donationId: string;
  userId: string;
  reason: string;
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
  refund: { refundedAt: string | null; reference: string | null; reason: string | null } | null;
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

export function requestRefund(donationId: string, reason: string): Promise<RefundRequest> {
  return api.post<RefundRequest>(`/donations/${encodeURIComponent(donationId)}/refund-request`, { reason });
}

export function fetchMyRefundRequests(): Promise<RefundRequest[]> {
  return api.get<RefundRequest[]>("/refund-requests/mine");
}

export function fetchAdminRefunds(status?: RefundRequestStatus): Promise<RefundRequestList> {
  return api.get<RefundRequestList>(`/admin/refunds${status ? `?status=${status}` : ""}`);
}

export function approveRefund(id: string, adminNotes: string): Promise<RefundRequest> {
  return api.patch<RefundRequest>(`/admin/refunds/${encodeURIComponent(id)}/approve`, { adminNotes });
}

export function rejectRefund(id: string, adminNotes: string): Promise<RefundRequest> {
  return api.patch<RefundRequest>(`/admin/refunds/${encodeURIComponent(id)}/reject`, { adminNotes });
}

export function refundDonationDirectly(donationId: string, reason: string): Promise<unknown> {
  return api.post(`/admin/donations/${encodeURIComponent(donationId)}/refund`, { reason });
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
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? "doi-soat.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
