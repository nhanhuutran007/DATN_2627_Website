import { api } from "../api";

export type CampaignReviewMode = "manual_all" | "auto_low_risk";

export type AutomationSettings = {
  campaignReviewMode: CampaignReviewMode;
  updatedAt: string | null;
};

/** Sự kiện hoàn tiền tự động khi dự án không đạt mục tiêu. */
export type AutoRefundEvent = {
  kind: "pledge_released" | "auto_refund";
  donationId: string;
  campaignTitle: string;
  donorName: string;
  amount: number;
  destination: "wallet" | "pledge_cancelled" | "gateway";
  at: string;
};

export type AutoRefundSummary = {
  releasedPledges: { count: number; amount: number };
  autoRefunds: { count: number; amount: number };
  pendingManual: number;
  recent: AutoRefundEvent[];
};

export function fetchAutoRefundSummary(): Promise<AutoRefundSummary> {
  return api.get<AutoRefundSummary>("/admin/refunds/auto-summary");
}

export type ScreeningLevel = "low" | "medium" | "high";
export type ScreeningRecommendation = "auto_approve" | "manual_review" | "needs_info";

export type ScreeningCheck = {
  key: "completeness" | "verification" | "content" | "risk";
  label: string;
  status: "pass" | "warn" | "fail";
  points: number;
  findings: Array<{ status: "warn" | "fail"; message: string; points: number }>;
  notes: string[];
};

export type CampaignScreening = {
  campaignId: string;
  score: number;
  level: ScreeningLevel;
  recommendation: ScreeningRecommendation;
  checks: ScreeningCheck[];
  suggestedReason: string | null;
  rulesVersion: string;
  autoApproved: boolean;
  screenedAt: string;
};

/** Tóm tắt gắn vào mỗi dòng danh sách chiến dịch của admin. */
export type ScreeningSummary = Pick<CampaignScreening, "score" | "level" | "recommendation" | "autoApproved" | "screenedAt">;

export const SCREENING_LEVEL_LABEL: Record<ScreeningLevel, string> = {
  low: "Rủi ro thấp",
  medium: "Rủi ro vừa",
  high: "Rủi ro cao",
};

export const SCREENING_RECOMMENDATION_LABEL: Record<ScreeningRecommendation, string> = {
  auto_approve: "Đủ điều kiện duyệt nhanh",
  manual_review: "Cần admin xem kỹ",
  needs_info: "Nên yêu cầu bổ sung",
};

export function fetchAutomationSettings(): Promise<AutomationSettings> {
  return api.get<AutomationSettings>("/admin/automation-settings");
}

export function updateAutomationSettings(
  payload: Partial<Omit<AutomationSettings, "updatedAt">>,
): Promise<AutomationSettings> {
  return api.patch<AutomationSettings>("/admin/automation-settings", payload);
}

export function fetchCampaignScreening(campaignId: string): Promise<CampaignScreening> {
  return api.get<CampaignScreening>(`/admin/campaigns/${encodeURIComponent(campaignId)}/screening`);
}

export function rerunCampaignScreening(campaignId: string): Promise<CampaignScreening> {
  return api.post<CampaignScreening>(`/admin/campaigns/${encodeURIComponent(campaignId)}/screening`, {});
}
