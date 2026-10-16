import type { AdminRiskAlert, AdminUser, AdminUserStatus } from "@/lib/api/admin";
import type { ApiCampaignStatus } from "@/lib/api/campaigns";

/** Nhãn hiển thị dùng chung trong trang quản trị. */

export const CAMPAIGN_STATUS_LABEL: Record<ApiCampaignStatus, string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  needs_info: "Cần bổ sung",
  active: "Đang gây quỹ",
  paused: "Tạm dừng",
  success: "Đã đạt mục tiêu",
  failed: "Thất bại",
  cancelled: "Đã huỷ",
  ended: "Kết thúc",
};

export const CAMPAIGN_STATUS_TONE: Record<ApiCampaignStatus, string> = {
  draft: "draft",
  pending: "pending",
  approved: "success",
  rejected: "failed",
  needs_info: "changes",
  active: "success",
  paused: "draft",
  success: "success",
  failed: "failed",
  cancelled: "failed",
  ended: "draft",
};

export const USER_STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  banned: "Đã khóa",
};

export const USER_ROLE_LABEL: Record<AdminUser["role"], string> = {
  user: "Người ủng hộ",
  campaign_owner: "Chủ dự án",
  admin: "Quản trị",
};

export const RISK_LEVEL_LABEL: Record<AdminRiskAlert["level"], string> = {
  high: "Cao",
  medium: "Vừa",
  low: "Thấp",
};
