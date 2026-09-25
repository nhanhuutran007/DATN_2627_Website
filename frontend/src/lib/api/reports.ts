import { api } from "../api";
import type { ApiCampaignStatus } from "./campaigns";

export type ReportReason = "spam" | "fraud" | "inappropriate" | "misinformation" | "other";
export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";
export type ReviewStatus = Exclude<ReportStatus, "pending">;

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  fraud: "Nghi lừa đảo / gian lận",
  misinformation: "Thông tin sai sự thật",
  inappropriate: "Nội dung không phù hợp",
  spam: "Spam / quảng cáo",
  other: "Lý do khác",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Chờ xem xét",
  reviewing: "Đang xem xét",
  resolved: "Đã xử lý vi phạm",
  dismissed: "Không vi phạm",
};

export type CampaignReport = {
  id: string;
  reporterId: string;
  reporter?: { id: string; name: string; email?: string } | null;
  campaignId?: string | null;
  campaign?: { id: string; title: string; status: ApiCampaignStatus } | null;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  adminNotes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  campaignPaused: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ReportList = {
  items: CampaignReport[];
  total: number;
  limit: number;
  offset: number;
};

export async function submitReport(payload: {
  campaignId: string;
  reason: ReportReason;
  description: string;
}): Promise<CampaignReport> {
  return api.post<CampaignReport>("/reports", payload);
}

export async function fetchAdminReports(query: {
  status?: ReportStatus;
  limit?: number;
  offset?: number;
} = {}): Promise<ReportList> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  return api.get<ReportList>(`/admin/reports${qs ? `?${qs}` : ""}`);
}

export async function reviewReport(
  id: string,
  payload: { status: ReviewStatus; adminNotes?: string; pauseCampaign?: boolean },
): Promise<CampaignReport> {
  return api.patch<CampaignReport>(`/admin/reports/${encodeURIComponent(id)}`, payload);
}
