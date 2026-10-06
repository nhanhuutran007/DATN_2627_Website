import { api, apiDownload } from "../api";
import type { ApiCampaign, ApiCampaignStatus } from "./campaigns";

export type AdminUserRole = "user" | "campaign_owner" | "admin";
export type AdminUserStatus = "active" | "inactive" | "banned";
export type AdminDonationStatus = "pending" | "completed" | "failed" | "refunded" | "expired" | "cancelled";

export type AdminOverview = {
  users: {
    total: number;
    active: number;
    banned: number;
    owners: number;
    newThisMonth: number;
  };
  campaigns: {
    total: number;
    draft: number;
    pending: number;
    needsInfo: number;
    approved: number;
    active: number;
    ended: number;
    success: number;
    failed: number;
    rejected: number;
  };
  donations: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    refunded: number;
    expired: number;
    cancelled: number;
    completedAmount: number;
    failedAmount: number;
  };
  successRate: number;
  risks: {
    open: number;
    high: number;
    medium: number;
  };
  topCategories: Array<{ category: string; campaigns: number; raised: number }>;
  monthly: Array<{ month: string; raised: number; donations: number }>;
};

export type AdminCampaign = ApiCampaign & {
  owner?: { id: string; name: string; email?: string } | null;
};

export type AdminCampaignList = {
  items: AdminCampaign[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminDonation = {
  id: string;
  userId: string;
  user?: { id: string; name: string; email: string } | null;
  campaignId: string;
  campaign?: { id: string; title: string } | null;
  amount: number | string;
  currency: string;
  status: AdminDonationStatus;
  paymentMethod?: string | null;
  transactionId?: string | null;
  message?: string | null;
  isAnonymous: boolean;
  completedAt?: string | null;
  createdAt: string;
  /** Mức cảnh báo cao nhất đang mở của chiến dịch/người ủng hộ liên quan. */
  riskLevel?: RiskLevel | null;
};

export type AdminDonationList = {
  items: AdminDonation[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  emailVerified: boolean;
  createdAt: string;
};

export type AdminUserList = {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditLogEntry = {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type AuditLogList = {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditLogQuery = {
  action?: string;
  entity?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
};

export type ModerateDecision = Extract<
  ApiCampaignStatus,
  "approved" | "active" | "rejected" | "needs_info" | "ended"
>;

export type RiskLevel = "high" | "medium" | "low";
export type RiskStatus = "open" | "resolved" | "dismissed";
export type RiskMethod = "ai" | "rule";

export type RiskReason = {
  group: string;
  label: string;
  weight: number;
};

export type AdminRiskAlert = {
  id: string;
  entityType: "campaign" | "user";
  entityId: string;
  entityName: string;
  level: RiskLevel;
  score: number;
  method: RiskMethod;
  reasons: RiskReason[];
  evidences: Record<string, number>;
  status: RiskStatus;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminRiskList = {
  items: AdminRiskAlert[];
  total: number;
  limit: number;
  offset: number;
};

export type RiskQuery = {
  status?: RiskStatus;
  level?: RiskLevel;
  limit?: number;
  offset?: number;
};

export async function fetchAdminRisks(query: RiskQuery = {}): Promise<AdminRiskList> {
  const params = toParams(query);
  return api.get<AdminRiskList>(`/admin/risks${params ? `?${params}` : ""}`);
}

export async function generateRiskWarnings(): Promise<{
  aiAvailable: boolean;
  scanned: number;
  flagged: number;
}> {
  return api.post("/admin/risks/generate");
}

export async function setRiskStatus(id: string, status: RiskStatus): Promise<AdminRiskAlert> {
  return api.patch<AdminRiskAlert>(`/admin/risks/${encodeURIComponent(id)}/status`, { status });
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  return api.get<AdminOverview>("/admin/overview");
}

export async function fetchAdminCampaigns(query: {
  status?: ApiCampaignStatus;
  q?: string;
  sort?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AdminCampaignList> {
  const params = toParams(query);
  return api.get<AdminCampaignList>(`/admin/campaigns${params ? `?${params}` : ""}`);
}

export async function fetchAdminDonations(query: {
  status?: AdminDonationStatus;
  /** Chỉ giao dịch của chiến dịch/người ủng hộ đang có cảnh báo rủi ro. */
  flagged?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<AdminDonationList> {
  const { flagged, ...rest } = query;
  const params = toParams({ ...rest, flagged: flagged ? "true" : undefined });
  return api.get<AdminDonationList>(`/admin/donations${params ? `?${params}` : ""}`);
}

export async function fetchAdminUsers(query: {
  q?: string;
  role?: AdminUserRole;
  status?: AdminUserStatus;
  limit?: number;
  offset?: number;
} = {}): Promise<AdminUserList> {
  const params = toParams(query);
  return api.get<AdminUserList>(`/admin/users${params ? `?${params}` : ""}`);
}

export async function setUserStatus(
  id: string,
  status: AdminUserStatus,
): Promise<AdminUser> {
  return api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}/status`, { status });
}

export async function fetchAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogList> {
  const params = toParams(query);
  return api.get<AuditLogList>(`/admin/audit-logs${params ? `?${params}` : ""}`);
}

export async function moderateCampaign(
  id: string,
  status: ModerateDecision,
  reason?: string,
): Promise<ApiCampaign> {
  const body: Record<string, string> = { status };
  if (reason && reason.trim()) {
    body.reason = reason.trim();
  }
  return api.patch<ApiCampaign>(`/campaigns/${encodeURIComponent(id)}/moderate`, body);
}

function toParams(
  query: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  return params.toString();
}

/** Tối đa dự án nổi bật cùng lúc (khớp backend `MAX_FEATURED`). */
export const MAX_FEATURED = 6;

/** Chọn/bỏ dự án nổi bật ở trang chủ. */
export function setCampaignFeatured(id: string, featured: boolean): Promise<ApiCampaign> {
  return api.patch<ApiCampaign>(`/admin/campaigns/${encodeURIComponent(id)}/featured`, { featured });
}

async function saveDownload(path: string, fallbackName: string): Promise<void> {
  const { blob, filename } = await apiDownload(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** CSV thống kê theo chiến dịch (không dữ liệu cá nhân, chủ dự án giả danh). */
export function downloadCampaignStatsCsv(): Promise<void> {
  return saveDownload("/admin/exports/campaigns", "thong-ke-chien-dich.csv");
}

/** CSV ủng hộ theo ngày × lĩnh vực trong khoảng ngày (mặc định 30 ngày). */
export function downloadDailyDonationsCsv(range: { from?: string; to?: string }): Promise<void> {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const qs = params.toString();
  return saveDownload(`/admin/exports/donations-daily${qs ? `?${qs}` : ""}`, "ung-ho-theo-ngay.csv");
}
