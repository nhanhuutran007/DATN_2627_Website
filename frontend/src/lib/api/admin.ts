import { api, apiDownload, apiFetch } from "../api";
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
    reviewed: number;
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
  /** Mã nội dung chuyển khoản (khoản qua SePay). */
  transferCode?: string | null;
  message?: string | null;
  isAnonymous: boolean;
  completedAt?: string | null;
  createdAt: string;
  /** Mức cảnh báo cao nhất đang mở của chiến dịch/người ủng hộ liên quan. */
  riskLevel?: RiskLevel | null;
  /** Cảnh báo đó thuộc chiến dịch, người ủng hộ, hay cả hai. */
  riskSource?: "campaign" | "user" | "both" | null;
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

export type AdminUserDetail = {
  user: AdminUser & {
    phone: string | null;
    organization: string | null;
    bio: string | null;
    avatar: string | null;
  };
  campaigns: {
    total: number;
    byStatus: Partial<Record<ApiCampaignStatus, number>>;
    raisedAmount: number;
    recent: Array<{
      id: string;
      title: string;
      status: ApiCampaignStatus;
      category: string;
      goalAmount: number | string;
      currentAmount: number | string;
      backerCount: number;
      endDate: string;
      createdAt: string;
    }>;
  };
  donations: { count: number; amount: number };
  openRisks: Array<{ id: string; entityType: "campaign" | "user"; entityName: string; level: RiskLevel; score: number }>;
};

export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  return api.get<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}`);
}

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
  /** Tên/email người thực hiện (null nếu hệ thống hoặc tài khoản đã xóa). */
  actor?: { name: string; email: string } | null;
  /** Tên đối tượng (chiến dịch, người dùng, lĩnh vực, mốc) nếu còn tồn tại. */
  entityLabel?: string | null;
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
  group?: "auth" | "account" | "finance" | "content" | "system";
  hideSessions?: "true";
  /** yyyy-mm-dd theo giờ Việt Nam */
  from?: string;
  to?: string;
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
  entityType?: AdminRiskAlert["entityType"];
  method?: RiskMethod;
  q?: string;
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

export async function setRiskStatus(id: string, status: RiskStatus, notes?: string): Promise<AdminRiskAlert> {
  return api.patch<AdminRiskAlert>(`/admin/risks/${encodeURIComponent(id)}/status`, { status, notes });
}

/** Số việc cần xử lý cho badge trên sidebar quản trị. */
export type AdminNavCounts = {
  pendingCampaigns: number;
  openRisks: number;
  openReports: number;
  reportedComments: number;
  stalePendingSepay: number;
  pendingRefunds: number;
  ledgerMismatches: number;
  daysSinceBackup: number | null;
};

export function fetchAdminNavCounts(): Promise<AdminNavCounts> {
  return api.get<AdminNavCounts>("/admin/nav-counts");
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  return api.get<AdminOverview>("/admin/overview");
}

export async function fetchAdminCampaigns(query: {
  status?: ApiCampaignStatus;
  q?: string;
  category?: string;
  minGoal?: number;
  maxGoal?: number;
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
  /** Tìm theo chiến dịch, người ủng hộ (tên/email) hoặc mã giao dịch. */
  q?: string;
  minAmount?: number;
  maxAmount?: number;
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
  reason?: string,
): Promise<AdminUser> {
  return api.patch<AdminUser>(`/admin/users/${encodeURIComponent(id)}/status`, { status, reason });
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

/** Tải bản sao lưu toàn bộ dữ liệu (.json.gz). */
export function downloadBackup(): Promise<void> {
  return saveDownload("/admin/backup/export", "gopmam-sao-luu.json.gz");
}

export type RestoreBackupResult = { tables: number; rows: number; createdAt: string };

export type BackupStatus = {
  /** Phiên bản cấu trúc CSDL hiện tại; file sao lưu phải trùng mới khôi phục được. */
  schemaVersion: string | null;
  maxBytes: number;
  lastBackup: { createdAt: string; by: string | null; rows: number | null; bytes: number | null } | null;
};

export function fetchBackupStatus(): Promise<BackupStatus> {
  return api.get<BackupStatus>("/admin/backup/status");
}

/** Ghi đè toàn bộ dữ liệu bằng file sao lưu; `confirm` phải là chuỗi xác nhận. */
export function restoreBackup(file: File, confirm: string): Promise<RestoreBackupResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("confirm", confirm);
  return apiFetch<RestoreBackupResult>("/admin/backup/restore", { method: "POST", body: form });
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
