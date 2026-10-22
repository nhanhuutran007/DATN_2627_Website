"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/LogoMark";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { PAGE_SIZE, Pagination } from "@/components/ui/Pagination";
import { CategoryManager, StatsExport } from "@/features/admin/AdminContent";
import { BackupManager } from "@/features/admin/BackupManager";
import { AdminFinance } from "@/features/admin/AdminFinance";
import { CampaignReviewDialog } from "@/features/admin/CampaignReviewDialog";
import { CopyableCode, DonationDetailDialog } from "@/features/admin/DonationDetailDialog";
import { AuditLogViewer } from "@/features/admin/AuditLogViewer";
import { UserDetailDialog } from "@/features/admin/UserDetailDialog";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  RISK_LEVEL_LABEL,
  USER_ROLE_LABEL,
  USER_STATUS_LABEL,
} from "@/features/admin/labels";
import { ADMIN_SECTION_GROUPS, ADMIN_SECTIONS, adminHref, findAdminSection } from "@/features/admin/sections";
import { CampaignPredictionCard } from "@/features/campaign-stats/CampaignPredictionCard";
import {
  fetchAdminCampaigns,
  fetchAdminDonations,
  fetchAdminNavCounts,
  fetchAdminOverview,
  fetchAdminRisks,
  fetchAdminUsers,
  generateRiskWarnings,
  MAX_FEATURED,
  moderateCampaign,
  setCampaignFeatured,
  setRiskStatus,
  setUserStatus,
  type AdminCampaign,
  type AdminDonation,
  type AdminNavCounts,
  type AdminOverview,
  type AdminRiskAlert,
  type AdminUser,
  type AdminUserStatus,
  type ModerateDecision,
  type RiskStatus,
} from "@/lib/api/admin";
import { logoutRequest } from "@/lib/api";
import type { ApiCampaignStatus } from "@/lib/api/campaigns";
import { fetchAdminCategories } from "@/lib/api/categories";
import { syncSepayDonation } from "@/lib/api/donations";
import { needsManualRefund, refundDonationDirectly } from "@/lib/api/finance";
import { useManualRefundDialog } from "@/features/admin/ManualRefundDialog";
import {
  fetchAdminComments,
  hideComment,
  unhideComment,
  type AdminComment,
  type CommentKind,
  type CommentStatus,
} from "@/lib/api/comments";
import {
  fetchAdminReports,
  REPORT_REASON_LABEL,
  REPORT_STATUS_LABEL,
  reviewReport,
  type CampaignReport,
  type ReportReason,
  type ReportStatusFilter,
  type ReviewStatus,
} from "@/lib/api/reports";
import { useAuthUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/data/campaigns";
import { paymentMethodLabel } from "@/lib/format";

const DONATION_STATUS_LABEL: Record<AdminDonation["status"], string> = {
  pending: "Chờ xử lý",
  completed: "Thành công",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
  expired: "Hết hạn",
  cancelled: "Đã hủy",
};

const DONATION_STATUS_TONE: Record<AdminDonation["status"], string> = {
  pending: "pending",
  completed: "success",
  failed: "failed",
  refunded: "changes",
  expired: "draft",
  cancelled: "draft",
};

/** Lọc theo trạng thái, hoặc "flagged" = giao dịch có cảnh báo rủi ro đang mở. */
type DonationFilter = AdminDonation["status"] | "" | "flagged";

const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  open: "Chưa xử lý",
  resolved: "Đã xác nhận",
  dismissed: "Đã bỏ qua",
};

const MIN_REPORT_NOTES = 5;

const NAV_REFRESH_MS = 60_000;
/** Quá số ngày này chưa sao lưu thì nhắc trên sidebar (khớp trang Sao lưu). */
const BACKUP_STALE_DAYS = 7;

type NavBadge = { text: string; title: string; tone?: "warn" };

/** Badge cho từng mục sidebar; null = không có việc cần xử lý. */
function navBadge(slug: string, counts: AdminNavCounts | null): NavBadge | null {
  if (!counts) return null;
  const numeric = (value: number, title: string): NavBadge | null =>
    value > 0 ? { text: value > 99 ? "99+" : String(value), title: `${value} ${title}` } : null;
  switch (slug) {
    case "cho-duyet":
      return numeric(counts.pendingCampaigns, "chiến dịch chờ duyệt");
    case "rui-ro":
      return numeric(counts.openRisks, "cảnh báo rủi ro chưa xử lý");
    case "bao-cao-vi-pham":
      return numeric(counts.openReports, "báo cáo vi phạm cần xử lý");
    case "binh-luan":
      return numeric(counts.reportedComments, "bình luận đang bị báo cáo");
    case "giao-dich":
      return numeric(counts.stalePendingSepay, "giao dịch SePay chờ quá 30 phút, nên đối soát");
    case "hoan-tien":
      return numeric(counts.pendingRefunds, "yêu cầu hoàn tiền chờ xử lý");
    case "doi-soat":
      return numeric(counts.ledgerMismatches, "chiến dịch lệch sổ (lũy kế)");
    case "sao-luu":
      if (counts.daysSinceBackup === null) return { text: "!", title: "Chưa từng sao lưu dữ liệu", tone: "warn" };
      return counts.daysSinceBackup >= BACKUP_STALE_DAYS
        ? { text: "!", title: `Đã ${counts.daysSinceBackup} ngày chưa sao lưu`, tone: "warn" }
        : null;
    default:
      return null;
  }
}

/** Tiêu đề thẻ: "{số} {danh từ} {trạng thái đang lọc}", thay cho tên trang lặp lại. */
const CAMPAIGN_COUNT_LABEL: Record<string, string> = {
  pending: "chờ duyệt",
  approved: "đã duyệt",
  needs_info: "cần bổ sung",
  rejected: "bị từ chối",
  draft: "bản nháp",
  active: "đang gây quỹ",
  paused: "tạm dừng",
};
const RISK_COUNT_LABEL: Record<string, string> = { open: "chưa xử lý", resolved: "đã xác nhận", dismissed: "đã bỏ qua" };
const REPORT_COUNT_LABEL: Record<string, string> = {
  open: "cần xử lý",
  pending: "chờ xem xét",
  reviewing: "đang xem xét",
  resolved: "đã xử lý vi phạm",
  dismissed: "không vi phạm",
};
const COMMENT_COUNT_LABEL: Record<string, string> = { visible: "đang hiển thị", hidden: "đã ẩn" };
const DONATION_COUNT_LABEL: Record<string, string> = {
  completed: "thành công",
  pending: "chờ xử lý",
  failed: "thất bại",
  refunded: "đã hoàn tiền",
  expired: "hết hạn",
  cancelled: "đã hủy",
  flagged: "có cảnh báo rủi ro",
};

function countTitle(total: number, noun: string, status: string, labels: Record<string, string>): string {
  const suffix = labels[status];
  return `${total.toLocaleString("vi-VN")} ${noun}${suffix ? ` ${suffix}` : ""}`;
}

function money(value: number | string): string {
  return formatCurrency(Number(value) || 0);
}

const DAY_MS = 86_400_000;

/** "hôm nay" / "N ngày trước": hồ sơ đã nằm trong hàng chờ bao lâu. */
function waitingLabel(value: string): string {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS);
  return days <= 0 ? "hôm nay" : `${days} ngày trước`;
}

/** Chiến dịch chưa gây quỹ mà sắp tới (≤ 7 ngày) hoặc đã qua ngày kết thúc: cần duyệt gấp. */
function endDateWarning(campaign: AdminCampaign): string | null {
  if (!["pending", "needs_info", "approved"].includes(campaign.status)) return null;
  const days = Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / DAY_MS);
  if (days <= 0) return "Đã quá ngày kết thúc";
  return days <= 7 ? `Còn ${days} ngày` : null;
}

/** Ngày kèm giờ:phút, dùng cho giao dịch (đối soát, phát hiện giao dịch dồn dập). */
function formatDateTime(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${formatDate(date)} ${time}`;
}

const RISK_SOURCE_TITLE: Record<NonNullable<AdminDonation["riskSource"]>, string> = {
  campaign: "Rủi ro của chiến dịch (cảnh báo đang mở), không phải riêng giao dịch này",
  user: "Rủi ro của người ủng hộ (cảnh báo đang mở), không phải riêng giao dịch này",
  both: "Cả chiến dịch và người ủng hộ đang có cảnh báo mở",
};

function formatDate(value: string | number | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${hours}:${minutes} · ${day}/${month}/${now.getFullYear()}`;
}

function evidenceSummary(evidences: Record<string, number>): string {
  const parts: string[] = [];
  if (evidences.contribution_count_1h) {
    parts.push(`${evidences.contribution_count_1h} giao dịch trong 1 giờ`);
  }
  if (evidences.failed_payment_count) {
    parts.push(`${evidences.failed_payment_count} thanh toán thất bại`);
  }
  if (evidences.total_payment_count) {
    parts.push(`${evidences.total_payment_count} giao dịch`);
  }
  if (evidences.amount_z_score) {
    parts.push(`z = ${evidences.amount_z_score}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "chưa có dữ liệu chi tiết";
}

const NARROW_QUERY = "(max-width: 960px)";
const NOTICE_TIMEOUT_MS = 6000;

type Paging = { page: number; total: number };

/** Bộ lọc danh sách duyệt chiến dịch; mục tiêu nhập theo triệu đồng. */
type CampaignFilters = { status: ApiCampaignStatus | ""; q: string; category: string; minGoal: string; maxGoal: string };
const DEFAULT_CAMPAIGN_FILTERS: CampaignFilters = { status: "pending", q: "", category: "", minGoal: "", maxGoal: "" };
const MILLION = 1_000_000;

/** Bộ lọc danh sách cảnh báo rủi ro. */
type RiskFilters = {
  status: RiskStatus | "";
  q: string;
  level: AdminRiskAlert["level"] | "";
  entityType: AdminRiskAlert["entityType"] | "";
  method: AdminRiskAlert["method"] | "";
};
/** Bộ lọc danh sách báo cáo vi phạm. */
type ReportFilters = { status: ReportStatusFilter | ""; q: string; reason: ReportReason | ""; target: "campaign" | "comment" | "" };
// Mặc định gồm cả báo cáo đang xem xét: nhận xem xét xong không bị "biến mất" khỏi danh sách
const DEFAULT_REPORT_FILTERS: ReportFilters = { status: "open", q: "", reason: "", target: "" };

const DEFAULT_RISK_FILTERS: RiskFilters = { status: "open", q: "", level: "", entityType: "", method: "" };

/** Số tiền nhập trong ô lọc (đồng); trống hoặc không hợp lệ thì bỏ qua. */
function amountParam(value: string): number | undefined {
  const amount = Number(value);
  return value.trim() === "" || !Number.isFinite(amount) || amount < 0 ? undefined : amount;
}

type DonationFilters = { status: DonationFilter; q: string; minAmount: string; maxAmount: string };
const DEFAULT_DONATION_FILTERS: DonationFilters = { status: "completed", q: "", minAmount: "", maxAmount: "" };

type CommentFilters = { status: CommentStatus | ""; q: string; kind: CommentKind | ""; level: "root" | "reply" | ""; reported: boolean };
const DEFAULT_COMMENT_FILTERS: CommentFilters = { status: "visible", q: "", kind: "", level: "", reported: false };

type UserFilters = { q: string; role: AdminUser["role"] | ""; status: AdminUserStatus | "" };
const DEFAULT_USER_FILTERS: UserFilters = { q: "", role: "", status: "" };

function goalParam(value: string): number | undefined {
  const amount = Number(value.replace(",", "."));
  return value.trim() === "" || !Number.isFinite(amount) || amount < 0 ? undefined : Math.round(amount * MILLION);
}
const FIRST_PAGE: Paging = { page: 0, total: 0 };

/** Tải một trang; nếu trang đó đã trống (vd. vừa duyệt mục cuối) thì lùi về trang cuối còn dữ liệu. */
async function loadPage<T>(
  fetcher: (offset: number) => Promise<{ items: T[]; total: number }>,
  page: number,
  setItems: (items: T[]) => void,
  setPaging: (paging: Paging) => void,
): Promise<void> {
  let result = await fetcher(page * PAGE_SIZE);
  if (result.items.length === 0 && page > 0) {
    page = Math.max(0, Math.ceil(result.total / PAGE_SIZE) - 1);
    result = await fetcher(page * PAGE_SIZE);
  }
  setItems(result.items);
  setPaging({ page, total: result.total });
}

export function AdminDashboard() {
  const user = useAuthUser();
  const isAdmin = user?.role === "admin";
  const dialog = useDialog();
  const [manualRefundDialog, openManualRefund] = useManualRefundDialog();
  // Mục đang xem lấy từ URL: /admin là tổng quan, /admin/<slug> là từng mục riêng.
  const pathname = usePathname();
  const slug = pathname.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
  const section = findAdminSection(slug) ?? ADMIN_SECTIONS[0];
  const view = section.slug;

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [risks, setRisks] = useState<AdminRiskAlert[]>([]);
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [reportFilter, setReportFilter] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [reportDraft, setReportDraft] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  // Badge trên sidebar: đếm riêng, độc lập với bộ lọc đang chọn ở từng trang
  const [navCounts, setNavCounts] = useState<AdminNavCounts | null>(null);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [commentFilter, setCommentFilter] = useState<CommentFilters>(DEFAULT_COMMENT_FILTERS);
  const [commentDraft, setCommentDraft] = useState<CommentFilters>(DEFAULT_COMMENT_FILTERS);
  const [campaignPaging, setCampaignPaging] = useState<Paging>(FIRST_PAGE);
  const [donationPaging, setDonationPaging] = useState<Paging>(FIRST_PAGE);
  const [userPaging, setUserPaging] = useState<Paging>(FIRST_PAGE);
  const [riskPaging, setRiskPaging] = useState<Paging>(FIRST_PAGE);
  const [reportPaging, setReportPaging] = useState<Paging>(FIRST_PAGE);
  const [commentPaging, setCommentPaging] = useState<Paging>(FIRST_PAGE);

  const [campaignFilter, setCampaignFilter] = useState<CampaignFilters>(DEFAULT_CAMPAIGN_FILTERS);
  const [campaignDraft, setCampaignDraft] = useState<CampaignFilters>(DEFAULT_CAMPAIGN_FILTERS);
  const [campaignCategories, setCampaignCategories] = useState<string[]>([]);
  // Hồ sơ đang mở: các nút quyết định chỉ nằm trong hồ sơ, buộc admin xem đủ trước khi duyệt.
  const [reviewing, setReviewing] = useState<AdminCampaign | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingDonation, setViewingDonation] = useState<AdminDonation | null>(null);
  // Desktop: dải icon, rê chuột (hoặc focus bàn phím) thì mở rộng đè lên nội dung; màn hẹp: nút trình đơn mở rộng.
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(NARROW_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = () => {
      setNarrow(media.matches);
      setSidebarOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const sidebarRail = narrow ? !sidebarOpen : !sidebarHovered;

  const router = useRouter();
  const logout = async () => {
    await logoutRequest();
    router.push("/");
  };
  const [predictionOpen, setPredictionOpen] = useState<string | null>(null);
  const [donationFilter, setDonationFilter] = useState<DonationFilters>(DEFAULT_DONATION_FILTERS);
  const [donationDraft, setDonationDraft] = useState<DonationFilters>(DEFAULT_DONATION_FILTERS);
  const [userFilter, setUserFilter] = useState<UserFilters>(DEFAULT_USER_FILTERS);
  const [userDraft, setUserDraft] = useState<UserFilters>(DEFAULT_USER_FILTERS);
  const [riskFilter, setRiskFilter] = useState<RiskFilters>(DEFAULT_RISK_FILTERS);
  const [riskDraft, setRiskDraft] = useState<RiskFilters>(DEFAULT_RISK_FILTERS);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Thông báo kết quả thao tác tự tắt sau vài giây và không mang sang mục khác
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const [noticeView, setNoticeView] = useState(view);
  if (noticeView !== view) {
    setNoticeView(view);
    setNotice(null);
  }

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const [ov, camps, dons, usrs, riskList, reportList, commentList] = await Promise.all([
          fetchAdminOverview(),
          fetchAdminCampaigns({ status: "pending", limit: PAGE_SIZE }),
          fetchAdminDonations({ status: "completed", limit: PAGE_SIZE }),
          fetchAdminUsers({ limit: PAGE_SIZE }),
          fetchAdminRisks({ status: "open", limit: PAGE_SIZE }),
          fetchAdminReports({ status: "open", limit: PAGE_SIZE }),
          fetchAdminComments({ status: "visible", limit: PAGE_SIZE }),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setCampaigns(camps.items);
        setDonations(dons.items);
        setUsers(usrs.items);
        setRisks(riskList.items);
        setReports(reportList.items);
        setComments(commentList.items);
        setCampaignPaging({ page: 0, total: camps.total });
        setDonationPaging({ page: 0, total: dons.total });
        setUserPaging({ page: 0, total: usrs.total });
        setRiskPaging({ page: 0, total: riskList.total });
        setReportPaging({ page: 0, total: reportList.total });
        setCommentPaging({ page: 0, total: commentList.total });
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không kết nối được hệ thống");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Cả hạng mục đã ngừng nhận dự án mới vẫn có chiến dịch cũ cần lọc được.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    fetchAdminCategories()
      .then((items) => {
        if (!cancelled) setCampaignCategories(items.map((item) => item.name));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function reloadOverview() {
    void refreshNavCounts();
    try {
      setOverview(await fetchAdminOverview());
    } catch {
      // dữ liệu tổng quan có thể cũ hơn một nhịp; không làm gián đoạn thao tác
    }
  }

  function refreshNavCounts() {
    return fetchAdminNavCounts()
      .then(setNavCounts)
      .catch(() => undefined); // badge cũ hơn một nhịp không ảnh hưởng thao tác
  }

  // Làm mới badge khi đổi trang và định kỳ mỗi phút (việc mới có thể do người khác tạo).
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = () =>
      fetchAdminNavCounts()
        .then((counts) => {
          if (!cancelled) setNavCounts(counts);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, NAV_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isAdmin, view]);

  async function loadCampaigns(filters: CampaignFilters, page: number) {
    const minGoal = goalParam(filters.minGoal);
    const maxGoal = goalParam(filters.maxGoal);
    if (minGoal !== undefined && maxGoal !== undefined && minGoal > maxGoal) {
      setError("Mục tiêu \"từ\" không được lớn hơn mục tiêu \"đến\"");
      return;
    }
    try {
      await loadPage(
        (offset) => fetchAdminCampaigns({
          status: filters.status || undefined,
          q: filters.q.trim() || undefined,
          category: filters.category || undefined,
          minGoal,
          maxGoal,
          // Hàng chờ duyệt: ai gửi trước được xét trước
          sort: filters.status === "pending" ? "submitted" : undefined,
          limit: PAGE_SIZE,
          offset,
        }),
        page, setCampaigns, setCampaignPaging,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách chiến dịch");
    }
  }

  async function applyCampaignFilters(filters: CampaignFilters) {
    setCampaignDraft(filters);
    setCampaignFilter(filters);
    await loadCampaigns(filters, 0);
  }

  async function loadDonations(filters: DonationFilters, page: number) {
    const minAmount = amountParam(filters.minAmount);
    const maxAmount = amountParam(filters.maxAmount);
    if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
      setError("Số tiền \"từ\" không được lớn hơn số tiền \"đến\"");
      return;
    }
    const search = { q: filters.q.trim() || undefined, minAmount, maxAmount };
    try {
      await loadPage(
        (offset) => fetchAdminDonations(
          filters.status === "flagged"
            ? { flagged: true, ...search, limit: PAGE_SIZE, offset }
            : { status: filters.status || undefined, ...search, limit: PAGE_SIZE, offset },
        ),
        page, setDonations, setDonationPaging,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách giao dịch");
    }
  }

  async function applyDonationFilters(filters: DonationFilters) {
    setDonationDraft(filters);
    setDonationFilter(filters);
    await loadDonations(filters, 0);
  }

  async function loadUsers(filters: UserFilters, page: number) {
    try {
      await loadPage(
        (offset) => fetchAdminUsers({
          q: filters.q.trim() || undefined,
          role: filters.role || undefined,
          status: filters.status || undefined,
          limit: PAGE_SIZE,
          offset,
        }),
        page, setUsers, setUserPaging,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách người dùng");
    }
  }

  async function applyUserFilters(filters: UserFilters) {
    setUserDraft(filters);
    setUserFilter(filters);
    await loadUsers(filters, 0);
  }

  async function handleFeatured(campaign: AdminCampaign) {
    const next = !campaign.isFeatured;
    if (next) {
      const confirmed = await dialog.confirm({
        title: "Đặt dự án nổi bật",
        message: (
          <>
            Đưa <b>{campaign.title}</b> lên mục Dự án nổi bật ở trang chủ. Trang chủ chỉ hiện 3 dự án được chọn gần nhất, nên một dự án
            nổi bật khác có thể bị đẩy khỏi trang chủ.
          </>
        ),
        confirmLabel: "Đặt nổi bật",
      });
      if (!confirmed) return;
    }
    setBusy(campaign.id);
    setNotice(null);
    try {
      await setCampaignFeatured(campaign.id, next);
      await loadCampaigns(campaignFilter, campaignPaging.page);
      setNotice(next
        ? `Đã đưa "${campaign.title}" vào mục Dự án nổi bật ở trang chủ.`
        : `Đã bỏ "${campaign.title}" khỏi mục Dự án nổi bật.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không cập nhật được mục nổi bật");
    } finally {
      setBusy(null);
    }
  }

  async function handleModerate(campaign: AdminCampaign, status: ModerateDecision) {
    const needsReason = status === "needs_info" || status === "rejected";
    let reason: string | undefined;
    if (needsReason) {
      const asking = status === "needs_info";
      const result = await dialog.prompt({
        title: asking ? "Yêu cầu bổ sung hồ sơ" : "Từ chối chiến dịch",
        message: (
          <>
            Chiến dịch <b>{campaign.title}</b>.{" "}
            {asking
              ? "Chủ dự án sẽ nhận thông báo kèm ghi chú này và có thể chỉnh sửa rồi gửi duyệt lại."
              : "Chủ dự án sẽ nhận thông báo kèm lý do từ chối."}
          </>
        ),
        label: asking ? "Ghi chú bổ sung (gửi cho chủ dự án)" : "Lý do từ chối (gửi cho chủ dự án)",
        placeholder: asking ? "VD: Bổ sung báo giá thiết bị và xác nhận của địa phương…" : "VD: Hồ sơ chưa chứng minh được nguồn lực thực hiện…",
        maxLength: 1000,
        confirmLabel: asking ? "Gửi yêu cầu bổ sung" : "Từ chối chiến dịch",
        tone: asking ? "default" : "danger",
      });
      if (!result) return;
      reason = result.value;
    } else {
      // Duyệt = hiện công khai; kích hoạt/cho tiếp tục = bắt đầu nhận tiền: hỏi lại trước khi áp dụng.
      const resuming = status === "active" && campaign.status === "paused";
      const confirmed = await dialog.confirm(
        status === "approved"
          ? {
            title: campaign.status === "needs_info" ? "Duyệt lại chiến dịch" : "Duyệt chiến dịch",
            message: <>Chiến dịch <b>{campaign.title}</b> sẽ hiển thị công khai trên trang khám phá. Chiến dịch chỉ nhận ủng hộ sau khi được kích hoạt.</>,
            confirmLabel: "Duyệt",
          }
          : {
            title: resuming ? "Cho chiến dịch tiếp tục" : "Kích hoạt chiến dịch",
            message: <>Chiến dịch <b>{campaign.title}</b> sẽ {resuming ? "nhận ủng hộ trở lại" : "bắt đầu nhận ủng hộ"} ngay sau khi xác nhận.</>,
            confirmLabel: resuming ? "Cho tiếp tục" : "Kích hoạt",
          },
      );
      if (!confirmed) return;
    }
    setBusy(campaign.id);
    setNotice(null);
    try {
      await moderateCampaign(campaign.id, status, reason);
      setReviewing(null);
      await Promise.all([
        loadCampaigns(campaignFilter, campaignPaging.page),
        reloadOverview(),
      ]);
      setNotice(`Đã cập nhật trạng thái chiến dịch "${campaign.title}".`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không cập nhật được chiến dịch");
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleUserStatus(adminUser: AdminUser) {
    if (user && adminUser.id === user.id) return;
    const next: AdminUserStatus = adminUser.status === "active" ? "banned" : "active";
    let reason: string | undefined;
    if (next === "banned") {
      const result = await dialog.prompt({
        title: "Khóa tài khoản",
        message: (
          <>
            Tài khoản <b>{adminUser.name}</b> ({adminUser.email}) sẽ bị đăng xuất ngay trên mọi thiết bị và không đăng nhập được cho tới khi mở khóa.
          </>
        ),
        label: "Lý do khóa (lưu nhật ký kiểm toán)",
        placeholder: "VD: Đăng nhiều bình luận spam, mạo danh tổ chức từ thiện…",
        minLength: 5,
        maxLength: 500,
        confirmLabel: "Khóa tài khoản",
        tone: "danger",
      });
      if (!result) return;
      reason = result.value;
    } else {
      const confirmed = await dialog.confirm({
        title: "Mở khóa tài khoản",
        message: <>Tài khoản <b>{adminUser.name}</b> sẽ hoạt động trở lại bình thường.</>,
        confirmLabel: "Mở khóa",
      });
      if (!confirmed) return;
    }
    setBusy(adminUser.id);
    setNotice(null);
    try {
      await setUserStatus(adminUser.id, next, reason);
      await Promise.all([loadUsers(userFilter, userPaging.page), reloadOverview()]);
      setNotice(
        next === "banned"
          ? `Đã khóa tài khoản ${adminUser.name}.`
          : `Đã mở khóa tài khoản ${adminUser.name}.`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không cập nhật được tài khoản");
    } finally {
      setBusy(null);
    }
  }

  async function loadRisks(filters: RiskFilters, page: number) {
    try {
      await loadPage(
        (offset) => fetchAdminRisks({
          status: filters.status || undefined,
          level: filters.level || undefined,
          entityType: filters.entityType || undefined,
          method: filters.method || undefined,
          q: filters.q.trim() || undefined,
          limit: PAGE_SIZE,
          offset,
        }),
        page, setRisks, setRiskPaging,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được cảnh báo rủi ro");
    }
  }

  async function applyRiskFilters(filters: RiskFilters) {
    setRiskDraft(filters);
    setRiskFilter(filters);
    await loadRisks(filters, 0);
  }

  async function handleGenerateRisks() {
    setBusy("risks");
    setNotice(null);
    try {
      const result = await generateRiskWarnings();
      await Promise.all([loadRisks(riskFilter, riskPaging.page), reloadOverview()]);
      setNotice(
        result.aiAvailable
          ? `Đã quét ${result.scanned} chiến dịch, phát hiện ${result.flagged} cảnh báo (AI service khả dụng).`
          : `Đã quét ${result.scanned} chiến dịch bằng luật dự phòng (AI service không khả dụng), phát hiện ${result.flagged} cảnh báo.`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không quét được cảnh báo");
    } finally {
      setBusy(null);
    }
  }

  async function handleRiskDecision(alert: AdminRiskAlert, status: RiskStatus) {
    const resolving = status === "resolved";
    const result = await dialog.prompt({
      title: resolving ? "Xác nhận đã xử lý cảnh báo" : "Bỏ qua cảnh báo",
      message: (
        <>
          Cảnh báo về {riskEntityLabel(alert)} <b>{alert.entityName}</b>.{" "}
          {resolving
            ? "Ghi rõ đã kiểm tra gì và xử lý ra sao (vd. tạm dừng chiến dịch, yêu cầu bổ sung giấy tờ)."
            : "Ghi rõ vì sao cảnh báo này không đáng lo (vd. đã xác minh danh tính, số liệu bất thường có lý do)."}
        </>
      ),
      label: "Lý do (lưu nhật ký kiểm toán)",
      placeholder: resolving ? "VD: Đã gọi xác minh chủ dự án, yêu cầu bổ sung hóa đơn…" : "VD: Lượt ủng hộ tăng đột biến do được báo chí đưa tin…",
      minLength: 5,
      maxLength: 1000,
      confirmLabel: resolving ? "Xác nhận đã xử lý" : "Bỏ qua cảnh báo",
    });
    if (!result) return;
    setBusy(alert.id);
    setNotice(null);
    try {
      await setRiskStatus(alert.id, status, result.value);
      await Promise.all([loadRisks(riskFilter, riskPaging.page), reloadOverview()]);
      setNotice(
        status === "resolved"
          ? `Đã xác nhận cảnh báo "${alert.entityName}".`
          : `Đã bỏ qua cảnh báo "${alert.entityName}".`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không cập nhật được cảnh báo");
    } finally {
      setBusy(null);
    }
  }

  async function loadReports(filters: ReportFilters, page: number) {
    try {
      await loadPage(
        (offset) => fetchAdminReports({
          status: filters.status || undefined,
          reason: filters.reason || undefined,
          target: filters.target || undefined,
          q: filters.q.trim() || undefined,
          limit: PAGE_SIZE,
          offset,
        }),
        page, setReports, setReportPaging,
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được báo cáo vi phạm");
    }
  }

  async function applyReportFilters(filters: ReportFilters) {
    setReportDraft(filters);
    setReportFilter(filters);
    await loadReports(filters, 0);
  }

  async function handleReportDecision(report: CampaignReport, status: ReviewStatus) {
    const title = report.campaign?.title ?? "chiến dịch";
    let adminNotes: string | undefined;
    let pauseCampaign = false;
    let hideReportedComment = false;

    if (status !== "reviewing") {
      const resolving = status === "resolved";
      const canHideComment = resolving && Boolean(report.commentId) && report.comment?.status === "visible";
      const canPause = resolving && !canHideComment && report.campaign?.status === "active";
      const result = await dialog.prompt({
        title: resolving ? "Xác nhận vi phạm" : "Bỏ qua báo cáo",
        message: (
          <>
            Báo cáo về <b>{title}</b>. Ghi chú được lưu vào nhật ký kiểm toán
            {resolving ? " và dùng làm căn cứ xử lý." : "."}
          </>
        ),
        label: resolving ? "Kết luận vi phạm" : "Lý do bỏ qua",
        minLength: MIN_REPORT_NOTES,
        maxLength: 1000,
        confirmLabel: resolving ? "Xác nhận vi phạm" : "Bỏ qua báo cáo",
        tone: resolving ? "danger" : "default",
        checkbox: canHideComment
          ? { label: "Ẩn bình luận bị báo cáo khỏi trang dự án", hint: "Tác giả nhận thông báo kèm kết luận này.", defaultChecked: true }
          : canPause
            ? { label: "Tạm dừng chiến dịch để chủ dự án giải trình", hint: "Có thể cho chiến dịch tiếp tục sau khi đã giải trình." }
            : undefined,
      });
      if (!result) return;
      adminNotes = result.value;
      hideReportedComment = canHideComment && result.checked;
      pauseCampaign = canPause && result.checked;
    }

    setBusy(report.id);
    setNotice(null);
    try {
      await reviewReport(report.id, { status, adminNotes, pauseCampaign, hideComment: hideReportedComment });
      const reloads: Array<Promise<unknown>> = [
        loadReports(reportFilter, reportPaging.page),
        refreshNavCounts(),
      ];
      if (hideReportedComment) reloads.push(loadComments(commentFilter, commentPaging.page));
      if (pauseCampaign) reloads.push(loadCampaigns(campaignFilter, campaignPaging.page), reloadOverview());
      await Promise.all(reloads);
      setNotice(
        status === "reviewing"
          ? `Đã chuyển báo cáo về "${title}" sang đang xem xét.`
          : status === "resolved"
            ? `Đã xác nhận vi phạm "${title}"${pauseCampaign ? " và tạm dừng chiến dịch" : ""}${hideReportedComment ? " và ẩn bình luận" : ""}.`
            : `Đã bỏ qua báo cáo về "${title}".`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không cập nhật được báo cáo");
    } finally {
      setBusy(null);
    }
  }

  async function handleSepaySync(donation: AdminDonation) {
    setBusy(donation.id);
    setNotice(null);
    try {
      const result = await syncSepayDonation(donation.id);
      if (result.applied) {
        await Promise.all([loadDonations(donationFilter, donationPaging.page), reloadOverview()]);
        setNotice(`SePay xác nhận đã thu ${money(donation.amount)} — đã ghi nhận khoản ủng hộ.`);
      } else {
        setNotice(
          result.sepayStatus
            ? `SePay báo trạng thái ${result.sepayStatus}: chưa thu tiền hoặc số tiền không khớp, không thay đổi gì.`
            : "SePay không có đơn này hoặc giao dịch không cần đối soát.",
        );
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không đối soát được với SePay");
    } finally {
      setBusy(null);
    }
  }

  async function handleDirectRefund(donation: AdminDonation) {
    if (needsManualRefund(donation.paymentMethod)) {
      const manual = await openManualRefund({
        title: "Hoàn tiền trực tiếp (thủ công)",
        amount: money(donation.amount),
        notesLabel: "Lý do hoàn tiền (lưu nhật ký và gửi người ủng hộ)",
        confirmLabel: "Đã chuyển khoản — ghi nhận hoàn",
        bank: null,
        transferCode: donation.transferCode,
      });
      if (!manual) return;
      setBusy(donation.id);
      setNotice(null);
      try {
        await refundDonationDirectly(donation.id, manual.notes, {
          transferReference: manual.transferReference,
          proofMediaId: manual.proofMediaId,
        });
        await Promise.all([loadDonations(donationFilter, donationPaging.page), reloadOverview()]);
        setNotice(`Đã ghi nhận hoàn ${money(donation.amount)} qua chuyển khoản (mã ${manual.transferReference}).`);
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Không hoàn được giao dịch");
      } finally {
        setBusy(null);
      }
      return;
    }
    const result = await dialog.prompt({
      title: "Hoàn tiền trực tiếp",
      message: (
        <>
          Hoàn <b>{money(donation.amount)}</b> cho khoản ủng hộ vào <b>{donation.campaign?.title ?? "chiến dịch"}</b> qua cổng
          thanh toán. Số tiền của chiến dịch sẽ giảm tương ứng; thao tác không hoàn tác được.
        </>
      ),
      label: "Lý do hoàn tiền (lưu nhật ký và gửi người ủng hộ)",
      minLength: 5,
      maxLength: 500,
      confirmLabel: "Hoàn tiền",
      tone: "danger",
    });
    if (!result) return;
    const input = result.value;
    setBusy(donation.id);
    setNotice(null);
    try {
      await refundDonationDirectly(donation.id, input);
      await Promise.all([loadDonations(donationFilter, donationPaging.page), reloadOverview()]);
      setNotice(`Đã hoàn ${money(donation.amount)} qua cổng thanh toán sandbox.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không hoàn được giao dịch");
    } finally {
      setBusy(null);
    }
  }

  async function loadComments(filters: CommentFilters, page: number) {
    try {
      await loadPage(
        (offset) => fetchAdminComments({
          status: filters.status || undefined,
          kind: filters.kind || undefined,
          level: filters.level || undefined,
          reported: filters.reported || undefined,
          q: filters.q.trim() || undefined,
          limit: PAGE_SIZE,
          offset,
        }),
        page, setComments, setCommentPaging,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không tải được bình luận");
    }
  }

  async function applyCommentFilters(filters: CommentFilters) {
    setCommentDraft(filters);
    setCommentFilter(filters);
    await loadComments(filters, 0);
  }

  async function handleCommentVisibility(comment: AdminComment) {
    const hiding = comment.status === "visible";
    let reason = "";
    if (hiding) {
      const result = await dialog.prompt({
        title: "Ẩn bình luận",
        message: <>Bình luận của <b>{comment.user?.name ?? "người dùng"}</b> sẽ không còn hiển thị trên trang dự án.</>,
        label: "Lý do ẩn (gửi cho tác giả và lưu vào nhật ký)",
        minLength: 5,
        maxLength: 500,
        confirmLabel: "Ẩn bình luận",
        tone: "danger",
      });
      if (!result) return;
      reason = result.value;
    }
    setBusy(comment.id);
    setNotice(null);
    try {
      if (hiding) await hideComment(comment.id, reason);
      else await unhideComment(comment.id);
      await loadComments(commentFilter, commentPaging.page);
      setNotice(hiding ? "Đã ẩn bình luận và thông báo cho tác giả." : "Đã hiện lại bình luận.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không cập nhật được bình luận");
    } finally {
      setBusy(null);
    }
  }

  const reportActions = (report: CampaignReport) => {
    if (report.status === "resolved" || report.status === "dismissed") {
      return (
        <span>
          {REPORT_STATUS_LABEL[report.status]}
          {report.campaignPaused ? " · đã tạm dừng chiến dịch" : ""}
          {report.commentHidden ? " · đã ẩn bình luận" : ""}
          {report.resolvedAt ? ` · ${formatDate(report.resolvedAt)}` : ""}
        </span>
      );
    }
    const disabled = busy === report.id;
    return (
      <div className="risk-actions">
        {report.status === "pending" && (
          <button type="button" disabled={disabled} onClick={() => handleReportDecision(report, "reviewing")}>
            Nhận xem xét
          </button>
        )}
        <button className="resolve" type="button" disabled={disabled} onClick={() => handleReportDecision(report, "resolved")}>
          Xác nhận vi phạm
        </button>
        <button type="button" disabled={disabled} onClick={() => handleReportDecision(report, "dismissed")}>
          Không vi phạm
        </button>
      </div>
    );
  };

  // Cảnh báo cũ còn lưu cả luật điểm 0: chỉ hiện luật thực sự kích hoạt, nặng nhất trước
  const riskReasonSummary = (alert: AdminRiskAlert) => {
    const active = alert.reasons.filter((reason) => reason.weight > 0).sort((a, b) => b.weight - a.weight);
    return active.length > 0 ? active.map((reason) => reason.label).join(" · ") : "không có luật nào vượt ngưỡng";
  };

  const riskEntityLabel = (alert: AdminRiskAlert) =>
    alert.entityType === "campaign" ? "chiến dịch" : "tài khoản";

  const riskActions = (alert: AdminRiskAlert) => {
    if (alert.status !== "open") {
      return <span>{RISK_STATUS_LABEL[alert.status]}</span>;
    }
    const disabled = busy === alert.id;
    return (
      <div className="risk-actions">
        <button className="resolve" type="button" disabled={disabled} onClick={() => handleRiskDecision(alert, "resolved")}>
          Xác nhận đã xử lý
        </button>
        <button type="button" disabled={disabled} onClick={() => handleRiskDecision(alert, "dismissed")}>
          Bỏ qua
        </button>
      </div>
    );
  };

  // Backend chặn admin tự duyệt chiến dịch của mình; ẩn nút thay vì để bấm rồi báo lỗi
  const isOwnCampaign = (campaign: AdminCampaign) => (campaign.owner?.id ?? campaign.ownerId) === user?.id;

  // Thao tác tài chính chỉ trong hộp thoại chi tiết; đóng hộp thoại trước khi mở bước xác nhận
  const donationActions = (donation: AdminDonation) => {
    const run = (action: (target: AdminDonation) => Promise<void>) => () => {
      setViewingDonation(null);
      void action(donation);
    };
    const refundable = donation.status === "completed";
    const syncable = donation.paymentMethod === "sepay" && ["pending", "expired", "cancelled"].includes(donation.status);
    if (!refundable && !syncable) return <span className="table-muted">Không cần thao tác</span>;
    return (
      <div className="admin-actions">
        {syncable && <button type="button" disabled={busy === donation.id} onClick={run(handleSepaySync)}>Đối soát SePay</button>}
        {refundable && <button type="button" disabled={busy === donation.id} onClick={run(handleDirectRefund)}>Hoàn tiền</button>}
      </div>
    );
  };

  const tableActions = (campaign: AdminCampaign) => {
    const disabled = busy === campaign.id;
    if (isOwnCampaign(campaign)) {
      return ["pending", "approved", "needs_info", "paused"].includes(campaign.status)
        ? <span className="table-muted">Chiến dịch của bạn: cần quản trị viên khác duyệt</span>
        : null;
    }
    if (campaign.status === "pending") {
      return (
        <div className="admin-actions">
          <button className="approve" type="button" disabled={disabled} onClick={() => handleModerate(campaign, "approved")}>
            Duyệt
          </button>
          <button type="button" disabled={disabled} onClick={() => handleModerate(campaign, "needs_info")}>
            Bổ sung
          </button>
          <button type="button" disabled={disabled} onClick={() => handleModerate(campaign, "rejected")}>
            Từ chối
          </button>
        </div>
      );
    }
    if (campaign.status === "approved") {
      return (
        <div className="admin-actions">
          <button className="approve" type="button" disabled={disabled} onClick={() => handleModerate(campaign, "active")}>
            Kích hoạt
          </button>
          <button type="button" disabled={disabled} onClick={() => handleModerate(campaign, "needs_info")}>
            Bổ sung
          </button>
        </div>
      );
    }
    if (campaign.status === "needs_info") {
      return (
        <div className="admin-actions">
          <button className="approve" type="button" disabled={disabled} onClick={() => handleModerate(campaign, "approved")}>
            Duyệt lại
          </button>
          <button type="button" disabled={disabled} onClick={() => handleModerate(campaign, "rejected")}>
            Từ chối
          </button>
        </div>
      );
    }
    if (campaign.status === "paused") {
      return (
        <div className="admin-actions">
          <button className="approve" type="button" disabled={disabled} onClick={() => handleModerate(campaign, "active")}>
            Cho tiếp tục
          </button>
        </div>
      );
    }
    return null;
  };

  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="shield" size={28} /></span>
        <h1>Đăng nhập để vào trang quản trị</h1>
        <p>Chỉ tài khoản quản trị viên được truy cập trang này.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href="/dang-nhap?next=/admin">Đăng nhập</Link>
          <Link className="button button-outline" href="/du-an">Xem dự án</Link>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="shield" size={28} /></span>
        <h1>Không có quyền truy cập</h1>
        <p>Tài khoản này không phải quản trị viên.</p>
        <div className="gate-actions">
          <Link className="button button-outline" href="/">Về trang chủ</Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="container gate" aria-live="polite">
        <p className="hint">Đang tải dữ liệu quản trị…</p>
      </main>
    );
  }

  const campaignsStats = overview?.campaigns;
  const pendingCount = campaignsStats?.pending ?? 0;
  // Hàng chờ duyệt thì cột "Đã huy động" luôn 0 đ: thay bằng ngày gửi duyệt
  const awaitingReview = campaignFilter.status === "pending";
  const maxMonthly = Math.max(1, ...(overview?.monthly ?? []).map((entry) => entry.raised));
  // Tổng của biểu đồ chỉ cộng 6 tháng đang hiển thị, không lấy tổng toàn thời gian
  const monthlyTotal = (overview?.monthly ?? []).reduce((sum, entry) => sum + entry.raised, 0);

  return (
    <main className="admin-page">
      {manualRefundDialog}
      <div className={`admin-shell${sidebarRail ? " is-rail" : ""}`}>
        {narrow && sidebarOpen && (
          <div className="admin-sidebar-backdrop" aria-hidden="true" onClick={() => setSidebarOpen(false)} />
        )}
        <aside
          className={`admin-sidebar${narrow && sidebarOpen ? " is-open" : ""}`}
          id="admin-sidebar"
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          // Chỉ mở rộng khi focus đến từ bàn phím: quay lại tab hay chụp màn hình xong, trình duyệt
          // trả focus về liên kết vừa bấm chuột trong sidebar và không được tự bung sidebar ra.
          onFocus={(event) => {
            if ((event.target as HTMLElement).matches(":focus-visible")) setSidebarHovered(true);
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSidebarHovered(false);
          }}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setSidebarOpen(false);
          }}
        >
          <div className="admin-brand">
            <Link className="logo" href="/" aria-label="Góp Mầm – Trang chủ">
              <LogoMark className="logo-mark" />
              <span className="logo-text">GÓP <b>MẦM</b></span>
            </Link>
          </div>
          {/* Chỉ màn hẹp (không rê chuột được) mới cần nút trình đơn trong dải icon */}
          {narrow && (
            <button
              className="admin-menu-toggle"
              type="button"
              aria-controls="admin-sidebar"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Thu gọn thanh điều hướng" : "Mở rộng thanh điều hướng"}
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <Icon name={sidebarOpen ? "x" : "menu"} size={22} />
            </button>
          )}
          <nav aria-label="Điều hướng quản trị">
            {ADMIN_SECTION_GROUPS.map((group) => (
              <div className="admin-nav-group" key={group.label ?? "chung"}>
                {group.label && <p className="admin-nav-label">{group.label}</p>}
                {group.sections.map((item) => {
                  const badge = navBadge(item.slug, navCounts);
                  return (
                    <Link
                      className={item.slug === view ? "active" : undefined}
                      aria-current={item.slug === view ? "page" : undefined}
                      href={adminHref(item.slug)}
                      key={item.slug}
                      title={item.label}
                    >
                      <Icon name={item.icon} size={19} /> <span>{item.label}</span>
                      {badge && <i className={badge.tone === "warn" ? "is-warn" : undefined} title={badge.title}>{badge.text}</i>}
                    </Link>
                  );
                })}
              </div>
            ))}
            <button className="admin-logout" type="button" title="Đăng xuất" onClick={logout}>
              <Icon name="logout" size={19} /> <span>Đăng xuất</span>
            </button>
          </nav>
        </aside>

        <div className="admin-content" id="tong-quan">
          <header className="admin-content-header">
            <div className="admin-content-title">
              <p className="eyebrow">Bảng điều khiển</p>
              <h1>{section.title}</h1>
              <span>Dữ liệu cập nhật lúc {formatTimestamp()}</span>
            </div>
            {/* Khu quản trị không dùng header của site: lối ra trang công khai, thông báo và tài khoản nằm ở đây */}
            <div className="admin-topbar-actions">
              <Link className="button button-outline button-sm" href="/" target="_blank" rel="noopener">
                Xem trang công khai <Icon name="arrow-right" size={15} />
              </Link>
              <NotificationBell />
              <Link className="admin-account" href="/ho-so" title="Cài đặt tài khoản">
                <span>{user.name.charAt(0).toUpperCase()}</span>
                <b>{user.name}</b>
              </Link>
            </div>
          </header>

          {error && (
            <div className="admin-notice error" role="alert">
              <Icon name="bell" size={16} /> <span>{error} — dữ liệu hiển thị có thể chưa đầy đủ.</span>
              <button className="admin-notice-close" type="button" aria-label="Đóng thông báo" onClick={() => setError(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
          )}
          {notice && !error && (
            <div className="admin-notice" role="status">
              <Icon name="check" size={16} /> <span>{notice}</span>
              <button className="admin-notice-close" type="button" aria-label="Đóng thông báo" onClick={() => setNotice(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
          )}

          {view === "" && (
            <>
          <section className="admin-stat-grid">
            <article>
              <span className="stat-icon blue"><Icon name="users" /></span>
              <div><small>Tài khoản</small><strong>{overview?.users.total.toLocaleString("vi-VN") ?? "—"}</strong><em>+{overview?.users.newThisMonth ?? 0} tháng này · {overview?.users.owners ?? 0} chủ dự án</em></div>
            </article>
            <article>
              <span className="stat-icon orange"><Icon name="rocket" /></span>
              <div><small>Chiến dịch</small><strong>{overview?.campaigns.total.toLocaleString("vi-VN") ?? "—"}</strong><em>{pendingCount} đang chờ duyệt</em></div>
            </article>
            <article>
              <span className="stat-icon green"><Icon name="wallet" /></span>
              <div><small>Tài trợ đã xác minh</small><strong>{overview ? money(overview.donations.completedAmount) : "—"}</strong><em>{overview?.donations.completed ?? 0} giao dịch thành công</em></div>
            </article>
            <article>
              <span className="stat-icon red"><Icon name="shield" /></span>
              <div><small>Cảnh báo AI</small><strong>{overview?.risks.open.toLocaleString("vi-VN") ?? "—"}</strong><em>{overview?.risks.high ?? 0} mức ưu tiên cao · chờ xử lý</em></div>
            </article>
            <article>
              <span className="stat-icon yellow"><Icon name="chart" /></span>
              <div><small>Tỷ lệ thành công</small><strong>{Math.round((overview?.successRate ?? 0) * 100)}%</strong><em>{overview?.campaigns.success ?? 0} đạt mục tiêu / {overview?.campaigns.failed ?? 0} thất bại</em></div>
            </article>
          </section>

          <div className="admin-primary-grid">
            <section className="admin-card admin-chart-card">
              <div className="card-heading">
                <div><p className="eyebrow">Dòng tiền đã xác minh</p><h2>Tài trợ theo tháng (6 tháng)</h2></div>
              </div>
              <div className="admin-chart-summary">
                <strong>{overview ? money(monthlyTotal) : "—"}</strong>
                <span><i /> Tài trợ thành công</span>
              </div>
              <div className="admin-month-bars" aria-label="Biểu đồ tài trợ theo tháng">
                {(overview?.monthly ?? []).map((entry) => (
                  <div className="bar-row" key={entry.month}>
                    <span>{entry.month.slice(5, 7)}/{entry.month.slice(2, 4)}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(2, (entry.raised / maxMonthly) * 100)}%` }} /></div>
                    <b>{formatCurrency(entry.raised)}</b>
                  </div>
                ))}
                {(overview?.monthly ?? []).length === 0 && <p className="table-muted">Chưa có giao dịch hoàn tất để thống kê.</p>}
              </div>
            </section>

            <section className="admin-card review-overview-card">
              <div className="card-heading"><div><p className="eyebrow">Hàng chờ xét duyệt</p><h2>{pendingCount} hồ sơ</h2></div><Link href={adminHref("cho-duyet")}>Xem tất cả</Link></div>
              <div className="donut-wrap">
                <div className="donut"><span><b>{pendingCount}</b><small>chờ duyệt</small></span></div>
                <ul>
                  <li><i className="orange" /><span>Chờ duyệt</span><b>{overview?.campaigns.pending ?? 0}</b></li>
                  <li><i className="yellow" /><span>Cần bổ sung</span><b>{overview?.campaigns.needsInfo ?? 0}</b></li>
                  <li><i className="green" /><span>Đang gây quỹ</span><b>{overview?.campaigns.active ?? 0}</b></li>
                </ul>
              </div>
              <div className="review-sla"><Icon name="clock" size={18} /><span><b>Đã duyệt {overview?.campaigns.reviewed ?? 0} chiến dịch</b><small>Kể từ khi hệ thống vận hành</small></span></div>
            </section>
          </div>
          {/* Xuất CSV nằm cùng số liệu tổng quan thay vì một mục riêng trên sidebar */}
          <StatsExport />
            </>
          )}

          {view === "cho-duyet" && (
          <section className="admin-card admin-table-card" id="cho-duyet">
            <div className="card-heading">
              <div><p className="eyebrow">Duyệt hồ sơ</p><h2>{countTitle(campaignPaging.total, "chiến dịch", campaignFilter.status, CAMPAIGN_COUNT_LABEL)}</h2></div>
            </div>
            <form
              className="admin-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                void applyCampaignFilters(campaignDraft);
              }}
            >
              <input
                className="filter-button admin-filter-search"
                type="search"
                placeholder="Tìm theo tên, mô tả, địa điểm…"
                aria-label="Tìm chiến dịch"
                value={campaignDraft.q}
                onChange={(event) => setCampaignDraft({ ...campaignDraft, q: event.target.value })}
              />
              <select className="filter-button" aria-label="Lọc theo trạng thái chiến dịch" value={campaignDraft.status} onChange={(event) => applyCampaignFilters({ ...campaignDraft, status: event.target.value as ApiCampaignStatus | "" })}>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="needs_info">Cần bổ sung</option>
                <option value="rejected">Bị từ chối</option>
                <option value="draft">Bản nháp</option>
                <option value="active">Đang gây quỹ</option>
                <option value="paused">Tạm dừng</option>
                <option value="">Tất cả trạng thái</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo lĩnh vực"
                value={campaignDraft.category}
                onChange={(event) => applyCampaignFilters({ ...campaignDraft, category: event.target.value })}
              >
                <option value="">Tất cả lĩnh vực</option>
                {campaignCategories.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <label className="admin-filter-range">
                <span>Mục tiêu (triệu đ)</span>
                <input
                  className="filter-button"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  placeholder="Từ"
                  aria-label="Mục tiêu từ (triệu đồng)"
                  value={campaignDraft.minGoal}
                  onChange={(event) => setCampaignDraft({ ...campaignDraft, minGoal: event.target.value })}
                />
                <span aria-hidden="true">–</span>
                <input
                  className="filter-button"
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  placeholder="Đến"
                  aria-label="Mục tiêu đến (triệu đồng)"
                  value={campaignDraft.maxGoal}
                  onChange={(event) => setCampaignDraft({ ...campaignDraft, maxGoal: event.target.value })}
                />
              </label>
              <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
              {(campaignFilter.q || campaignFilter.category || campaignFilter.minGoal || campaignFilter.maxGoal) && (
                <button
                  className="link-inline"
                  type="button"
                  onClick={() => applyCampaignFilters({ ...DEFAULT_CAMPAIGN_FILTERS, status: campaignDraft.status })}
                >
                  Xóa bộ lọc
                </button>
              )}
            </form>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Chiến dịch</th><th>Chủ dự án</th><th>Hạng mục</th><th>Mục tiêu</th><th>{awaitingReview ? "Gửi duyệt" : "Đã huy động"}</th><th>Kết thúc</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <Fragment key={campaign.id}>
                    <tr>
                      <td>
                        <b>{campaign.title}</b>
                        {campaign.isFeatured && <span className="tag tag-amber featured-tag">Nổi bật</span>}
                        {(campaign.isFeatured || ["approved", "active", "success"].includes(campaign.status)) && (
                          <button
                            className="link-inline table-sub-action"
                            type="button"
                            disabled={busy === campaign.id}
                            title={`Trang chủ hiển thị 3 dự án nổi bật mới chọn nhất; tối đa ${MAX_FEATURED} dự án`}
                            onClick={() => handleFeatured(campaign)}
                          >
                            {campaign.isFeatured ? "Bỏ nổi bật" : "Đặt nổi bật"}
                          </button>
                        )}
                        <button
                          className="link-inline table-sub-action"
                          type="button"
                          aria-expanded={predictionOpen === campaign.id}
                          onClick={() => setPredictionOpen((id) => (id === campaign.id ? null : campaign.id))}
                        >
                          {predictionOpen === campaign.id ? "Ẩn ước lượng" : "Ước lượng AI"}
                        </button>
                      </td>
                      <td>
                        {campaign.owner ? (
                          <button
                            className="link-inline owner-link"
                            type="button"
                            title="Xem thông tin chủ dự án"
                            onClick={() => setViewingUserId(campaign.owner!.id)}
                          >
                            {campaign.owner.name}
                          </button>
                        ) : (
                          "Chưa có"
                        )}
                      </td>
                      <td>{campaign.category}</td>
                      <td>{money(campaign.goalAmount)}</td>
                      <td>
                        {awaitingReview ? (
                          <>
                            {formatDate(campaign.submittedAt ?? campaign.createdAt ?? campaign.startDate)}
                            <small className="table-cell-note">{waitingLabel(campaign.submittedAt ?? campaign.createdAt ?? campaign.startDate)}</small>
                          </>
                        ) : (
                          money(campaign.currentAmount)
                        )}
                      </td>
                      <td>
                        {formatDate(campaign.endDate)}
                        {endDateWarning(campaign) && <small className="table-cell-note is-urgent">{endDateWarning(campaign)}</small>}
                      </td>
                      <td><span className={`table-status ${CAMPAIGN_STATUS_TONE[campaign.status]}`}>{CAMPAIGN_STATUS_LABEL[campaign.status]}</span></td>
                      <td>
                        <button
                          className={`review-open ${tableActions(campaign) && !isOwnCampaign(campaign) ? "is-primary" : ""}`}
                          type="button"
                          onClick={() => setReviewing(campaign)}
                        >
                          {campaign.status === "pending" && !isOwnCampaign(campaign) ? "Xem hồ sơ & duyệt" : "Xem hồ sơ"}
                        </button>
                      </td>
                    </tr>
                    {predictionOpen === campaign.id && (
                      <tr className="table-detail-row">
                        <td colSpan={8}><CampaignPredictionCard campaignId={campaign.id} variant="admin" /></td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                  {campaigns.length === 0 && (
                    <tr><td colSpan={8}><span className="table-muted">Không có chiến dịch nào khớp bộ lọc.</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={campaignPaging.page} total={campaignPaging.total} onChange={(page) => void loadCampaigns(campaignFilter, page)} />
          </section>
          )}

          {viewingUserId && (
            <UserDetailDialog userId={viewingUserId} onClose={() => setViewingUserId(null)} />
          )}

          {reviewing && (
            <CampaignReviewDialog
              campaign={reviewing}
              statusLabel={CAMPAIGN_STATUS_LABEL[reviewing.status]}
              actions={tableActions(reviewing) ?? <span className="table-muted">Không cần thao tác</span>}
              onClose={() => setReviewing(null)}
            />
          )}

          {view === "rui-ro" && (
          <section className="admin-card risk-card" id="rui-ro">
            <div className="card-heading">
              <div><p className="eyebrow">Human-in-the-loop · AI</p><h2>{countTitle(riskPaging.total, "cảnh báo", riskFilter.status, RISK_COUNT_LABEL)}</h2></div>
              <div className="risk-heading-actions">
                <button className="model-version" type="button" disabled={busy === "risks"} onClick={handleGenerateRisks}>
                  <Icon name="sparkles" size={15} /> Quét lại
                </button>
              </div>
            </div>
            <div className="admin-policy">
              <Icon name="shield" size={22} />
              <p>
                <b>AI không tự động xử phạt</b>
                <span>Cảnh báo AI chỉ giúp ưu tiên kiểm tra: không tự khóa tài khoản, tạm dừng chiến dịch hay công khai cáo buộc. Quản trị viên xem xét, ghi lý do và quyết định được lưu vào nhật ký kiểm toán.</span>
              </p>
            </div>
            <form
              className="admin-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                void applyRiskFilters(riskDraft);
              }}
            >
              <input
                className="filter-button admin-filter-search"
                type="search"
                placeholder="Tìm theo tên hoặc mã đối tượng…"
                aria-label="Tìm cảnh báo rủi ro"
                value={riskDraft.q}
                onChange={(event) => setRiskDraft({ ...riskDraft, q: event.target.value })}
              />
              <select className="filter-button" aria-label="Lọc theo trạng thái cảnh báo" value={riskDraft.status} onChange={(event) => applyRiskFilters({ ...riskDraft, status: event.target.value as RiskStatus | "" })}>
                <option value="open">Chưa xử lý</option>
                <option value="resolved">Đã xác nhận</option>
                <option value="dismissed">Đã bỏ qua</option>
                <option value="">Tất cả trạng thái</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo mức rủi ro"
                value={riskDraft.level}
                onChange={(event) => applyRiskFilters({ ...riskDraft, level: event.target.value as RiskFilters["level"] })}
              >
                <option value="">Mọi mức rủi ro</option>
                <option value="high">Rủi ro {RISK_LEVEL_LABEL.high.toLowerCase()}</option>
                <option value="medium">Rủi ro {RISK_LEVEL_LABEL.medium.toLowerCase()}</option>
                <option value="low">Rủi ro {RISK_LEVEL_LABEL.low.toLowerCase()}</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo đối tượng"
                value={riskDraft.entityType}
                onChange={(event) => applyRiskFilters({ ...riskDraft, entityType: event.target.value as RiskFilters["entityType"] })}
              >
                <option value="">Mọi đối tượng</option>
                <option value="campaign">Chiến dịch</option>
                <option value="user">Người dùng</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo phương pháp"
                value={riskDraft.method}
                onChange={(event) => applyRiskFilters({ ...riskDraft, method: event.target.value as RiskFilters["method"] })}
              >
                <option value="">Mọi phương pháp</option>
                <option value="ai">Chấm điểm bằng AI</option>
                <option value="rule">Luật dự phòng</option>
              </select>
              <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
              {(riskFilter.q || riskFilter.level || riskFilter.entityType || riskFilter.method) && (
                <button
                  className="link-inline"
                  type="button"
                  onClick={() => applyRiskFilters({ ...DEFAULT_RISK_FILTERS, status: riskDraft.status })}
                >
                  Xóa bộ lọc
                </button>
              )}
            </form>
            <div className="risk-list">
              {risks.length === 0 ? (
                <article>
                  <p className="table-muted">Không có cảnh báo nào khớp bộ lọc. Nhấn Quét lại để chạy AI chấm điểm rủi ro cho các chiến dịch đang hoạt động.</p>
                </article>
              ) : (
                risks.map((alert) => (
                  <article key={alert.id}>
                    <span className={`risk-level ${alert.level}`}>{RISK_LEVEL_LABEL[alert.level]}</span>
                    <div>
                      <h3>
                        {alert.entityType === "campaign" ? (
                          <a href={`/du-an/${alert.entityId}`} target="_blank" rel="noreferrer" title="Mở trang chiến dịch">{alert.entityName}</a>
                        ) : (
                          <button className="link-inline" type="button" title="Xem thông tin tài khoản" onClick={() => setViewingUserId(alert.entityId)}>{alert.entityName}</button>
                        )}
                      </h3>
                      <p>{alert.entityId.slice(0, 8).toUpperCase()} · {riskEntityLabel(alert)} · Điểm rủi ro <b>{alert.score.toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b> · {alert.method === "ai" ? "Chấm điểm bằng AI" : "Cảnh báo bằng luật dự phòng"}</p>
                      <small><b>Nguyên nhân:</b> {riskReasonSummary(alert)}</small>
                      <small><b>Bằng chứng:</b> {evidenceSummary(alert.evidences)}</small>
                    </div>
                    <div>{riskActions(alert)}</div>
                  </article>
                ))
              )}
            </div>
            <Pagination page={riskPaging.page} total={riskPaging.total} onChange={(page) => void loadRisks(riskFilter, page)} />
          </section>
          )}

          {view === "bao-cao-vi-pham" && (
          <section className="admin-card risk-card" id="bao-cao-vi-pham">
            <div className="card-heading">
              <div><p className="eyebrow">Kiểm duyệt nội dung</p><h2>{countTitle(reportPaging.total, "báo cáo", reportFilter.status, REPORT_COUNT_LABEL)}</h2></div>
            </div>
            <form
              className="admin-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                void applyReportFilters(reportDraft);
              }}
            >
              <input
                className="filter-button admin-filter-search"
                type="search"
                placeholder="Tìm theo nội dung, chiến dịch, người báo cáo…"
                aria-label="Tìm báo cáo vi phạm"
                value={reportDraft.q}
                onChange={(event) => setReportDraft({ ...reportDraft, q: event.target.value })}
              />
              <select className="filter-button" aria-label="Lọc theo trạng thái báo cáo" value={reportDraft.status} onChange={(event) => applyReportFilters({ ...reportDraft, status: event.target.value as ReportStatusFilter | "" })}>
                <option value="open">Cần xử lý</option>
                <option value="pending">Chờ xem xét</option>
                <option value="reviewing">Đang xem xét</option>
                <option value="resolved">Đã xử lý vi phạm</option>
                <option value="dismissed">Không vi phạm</option>
                <option value="">Tất cả trạng thái</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo lý do báo cáo"
                value={reportDraft.reason}
                onChange={(event) => applyReportFilters({ ...reportDraft, reason: event.target.value as ReportFilters["reason"] })}
              >
                <option value="">Mọi lý do</option>
                {(Object.keys(REPORT_REASON_LABEL) as ReportReason[]).map((reason) => (
                  <option key={reason} value={reason}>{REPORT_REASON_LABEL[reason]}</option>
                ))}
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo đối tượng bị báo cáo"
                value={reportDraft.target}
                onChange={(event) => applyReportFilters({ ...reportDraft, target: event.target.value as ReportFilters["target"] })}
              >
                <option value="">Mọi đối tượng</option>
                <option value="campaign">Chiến dịch</option>
                <option value="comment">Bình luận</option>
              </select>
              <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
              {(reportFilter.q || reportFilter.reason || reportFilter.target) && (
                <button
                  className="link-inline"
                  type="button"
                  onClick={() => applyReportFilters({ ...DEFAULT_REPORT_FILTERS, status: reportDraft.status })}
                >
                  Xóa bộ lọc
                </button>
              )}
            </form>
            <div className="risk-list">
              {reports.length === 0 ? (
                <article>
                  <p className="table-muted">Không có báo cáo nào khớp bộ lọc.</p>
                </article>
              ) : (
                reports.map((report) => (
                  <article key={report.id}>
                    <span className={`report-status ${report.status}`}>{REPORT_STATUS_LABEL[report.status]}</span>
                    <div>
                      <h3>
                        {report.campaign ? (
                          <a href={`/du-an/${report.campaign.id}`} target="_blank" rel="noreferrer" title="Mở trang chiến dịch">{report.campaign.title}</a>
                        ) : (
                          "Chiến dịch đã bị xoá"
                        )}
                      </h3>
                      <p>
                        {REPORT_REASON_LABEL[report.reason]} · {formatDate(report.createdAt)} · bởi{" "}
                        {report.reporter ? (
                          <button className="link-inline" type="button" title="Xem thông tin người báo cáo" onClick={() => setViewingUserId(report.reporter!.id)}>
                            {report.reporter.name}{report.reporter.email ? ` (${report.reporter.email})` : ""}
                          </button>
                        ) : (
                          "người dùng"
                        )}
                      </p>
                      {report.comment && (
                        <p className="report-quote report-comment"><b>Bình luận bị báo cáo{report.comment.status === "hidden" ? " (đã ẩn)" : ""}:</b> {report.comment.content}</p>
                      )}
                      <p className="report-quote">{report.description}</p>
                      {report.adminNotes && <small><b>Ghi chú quản trị:</b> {report.adminNotes}</small>}
                    </div>
                    <div>{reportActions(report)}</div>
                  </article>
                ))
              )}
            </div>
            <Pagination page={reportPaging.page} total={reportPaging.total} onChange={(page) => void loadReports(reportFilter, page)} />
            <p className="risk-footnote"><Icon name="shield" size={15} /> Hệ thống không tự ẩn hay tạm dừng chiến dịch theo số lượng báo cáo. Quản trị viên xem xét, ghi lý do và mọi quyết định được lưu vào nhật ký kiểm toán.</p>
          </section>
          )}

          {view === "binh-luan" && (
          <section className="admin-card risk-card" id="binh-luan">
            <div className="card-heading">
              <div><p className="eyebrow">Kiểm duyệt nội dung</p><h2>{countTitle(commentPaging.total, "bình luận & câu hỏi", commentFilter.status, COMMENT_COUNT_LABEL)}</h2></div>
            </div>
            <form
              className="admin-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                void applyCommentFilters(commentDraft);
              }}
            >
              <input
                className="filter-button admin-filter-search"
                type="search"
                placeholder="Tìm theo nội dung, người viết, chiến dịch…"
                aria-label="Tìm bình luận"
                value={commentDraft.q}
                onChange={(event) => setCommentDraft({ ...commentDraft, q: event.target.value })}
              />
              <select className="filter-button" aria-label="Lọc bình luận theo trạng thái" value={commentDraft.status} onChange={(event) => applyCommentFilters({ ...commentDraft, status: event.target.value as CommentStatus | "" })}>
                <option value="visible">Đang hiển thị</option>
                <option value="hidden">Đã ẩn</option>
                <option value="">Tất cả trạng thái</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo loại bình luận"
                value={commentDraft.kind}
                onChange={(event) => applyCommentFilters({ ...commentDraft, kind: event.target.value as CommentFilters["kind"] })}
              >
                <option value="">Bình luận &amp; câu hỏi</option>
                <option value="comment">Chỉ bình luận</option>
                <option value="question">Chỉ câu hỏi</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc bình luận gốc hay câu trả lời"
                value={commentDraft.level}
                onChange={(event) => applyCommentFilters({ ...commentDraft, level: event.target.value as CommentFilters["level"] })}
              >
                <option value="">Gốc &amp; trả lời</option>
                <option value="root">Chỉ bình luận gốc</option>
                <option value="reply">Chỉ câu trả lời</option>
              </select>
              <select
                className="filter-button"
                aria-label="Lọc bình luận bị báo cáo"
                value={commentDraft.reported ? "reported" : ""}
                onChange={(event) => applyCommentFilters({ ...commentDraft, reported: event.target.value === "reported" })}
              >
                <option value="">Mọi bình luận</option>
                <option value="reported">Đang bị báo cáo</option>
              </select>
              <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
              {(commentFilter.q || commentFilter.kind || commentFilter.level || commentFilter.reported) && (
                <button
                  className="link-inline"
                  type="button"
                  onClick={() => applyCommentFilters({ ...DEFAULT_COMMENT_FILTERS, status: commentDraft.status })}
                >
                  Xóa bộ lọc
                </button>
              )}
            </form>
            <div className="risk-list">
              {comments.length === 0 ? (
                <article>
                  <p className="table-muted">Không có bình luận nào khớp bộ lọc.</p>
                </article>
              ) : (
                comments.map((comment) => (
                  <article key={comment.id}>
                    {/* Nhãn loại dùng màu trung tính; chỉ bình luận đã ẩn mới đổi màu */}
                    <span className={`report-status ${comment.status === "hidden" ? "dismissed" : "neutral"}`}>
                      {comment.kind === "question" ? "Câu hỏi" : comment.parentId ? "Trả lời" : "Bình luận"}
                    </span>
                    <div>
                      <h3>
                        {comment.campaign ? (
                          <a href={`/du-an/${comment.campaign.id}`} target="_blank" rel="noreferrer" title="Mở trang chiến dịch">{comment.campaign.title}</a>
                        ) : (
                          "Chiến dịch"
                        )}
                        {comment.openReportCount > 0 && (
                          <Link className="comment-flag is-reported" href={adminHref("bao-cao-vi-pham")} title="Xem báo cáo vi phạm">
                            Bị báo cáo{comment.openReportCount > 1 ? ` (${comment.openReportCount})` : ""}
                          </Link>
                        )}
                        {comment.ownerReplied !== null && comment.status === "visible" && (
                          <span className={`comment-flag ${comment.ownerReplied ? "is-answered" : "is-unanswered"}`}>
                            {comment.ownerReplied ? "Chủ dự án đã trả lời" : "Chưa trả lời"}
                          </span>
                        )}
                      </h3>
                      <p>
                        {formatDate(comment.createdAt)} · bởi{" "}
                        {comment.user ? (
                          <button className="link-inline" type="button" title="Xem thông tin người viết" onClick={() => setViewingUserId(comment.user!.id)}>
                            {comment.user.name}{comment.user.email ? ` (${comment.user.email})` : ""}
                          </button>
                        ) : (
                          "người dùng"
                        )}
                      </p>
                      {comment.parent && (
                        <p className="comment-parent">↳ Trả lời {comment.parent.authorName ?? "người dùng"}: “{comment.parent.content}”</p>
                      )}
                      <p className="report-quote">{comment.content}</p>
                      {comment.status === "hidden" && comment.hiddenReason && <small><b>Lý do ẩn:</b> {comment.hiddenReason}</small>}
                    </div>
                    <div className="risk-actions">
                      <button className={comment.status === "visible" ? "is-danger" : undefined} type="button" disabled={busy === comment.id} onClick={() => handleCommentVisibility(comment)}>
                        {comment.status === "visible" ? "Ẩn bình luận" : "Hiện lại"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
            <Pagination page={commentPaging.page} total={commentPaging.total} onChange={(page) => void loadComments(commentFilter, page)} />
            <p className="risk-footnote"><Icon name="shield" size={15} /> Ẩn bình luận cần ghi lý do; tác giả được thông báo và thao tác được lưu vào nhật ký kiểm toán.</p>
          </section>
          )}

          {view === "giao-dich" && (
          <section className="admin-card admin-table-card" id="giao-dich">
            <div className="card-heading">
              <div><p className="eyebrow">Minh bạch quỹ</p><h2>{countTitle(donationPaging.total, "giao dịch", donationFilter.status, DONATION_COUNT_LABEL)}</h2></div>
            </div>
            <form
              className="admin-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                void applyDonationFilters(donationDraft);
              }}
            >
              <input
                className="filter-button admin-filter-search"
                type="search"
                placeholder="Tìm theo chiến dịch, người ủng hộ, mã giao dịch…"
                aria-label="Tìm giao dịch"
                value={donationDraft.q}
                onChange={(event) => setDonationDraft({ ...donationDraft, q: event.target.value })}
              />
              <select className="filter-button" aria-label="Lọc theo trạng thái giao dịch" value={donationDraft.status} onChange={(event) => applyDonationFilters({ ...donationDraft, status: event.target.value as DonationFilter })}>
                <option value="completed">Thành công</option>
                <option value="pending">Chờ xử lý</option>
                <option value="failed">Thất bại</option>
                <option value="refunded">Đã hoàn tiền</option>
                <option value="expired">Hết hạn</option>
                <option value="cancelled">Đã hủy</option>
                <option value="flagged">Có cảnh báo rủi ro</option>
                <option value="">Tất cả trạng thái</option>
              </select>
              <label className="admin-filter-range">
                <span>Số tiền (đ)</span>
                <input
                  className="filter-button"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="Từ"
                  aria-label="Số tiền từ (đồng)"
                  value={donationDraft.minAmount}
                  onChange={(event) => setDonationDraft({ ...donationDraft, minAmount: event.target.value })}
                />
                <span aria-hidden="true">–</span>
                <input
                  className="filter-button"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="Đến"
                  aria-label="Số tiền đến (đồng)"
                  value={donationDraft.maxAmount}
                  onChange={(event) => setDonationDraft({ ...donationDraft, maxAmount: event.target.value })}
                />
              </label>
              <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
              {(donationFilter.q || donationFilter.minAmount || donationFilter.maxAmount) && (
                <button
                  className="link-inline"
                  type="button"
                  onClick={() => applyDonationFilters({ ...DEFAULT_DONATION_FILTERS, status: donationDraft.status })}
                >
                  Xóa bộ lọc
                </button>
              )}
            </form>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Người ủng hộ</th><th>Chiến dịch</th><th>Số tiền</th><th>Phương thức</th><th>Mã giao dịch</th><th>Thời gian</th><th>Trạng thái</th><th>Rủi ro</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr key={donation.id}>
                      <td>
                        {donation.isAnonymous || !donation.user ? (
                          <b>{donation.isAnonymous ? "Ẩn danh" : "Người ủng hộ"}</b>
                        ) : (
                          <button className="link-inline owner-link" type="button" title="Xem thông tin người ủng hộ" onClick={() => setViewingUserId(donation.user!.id)}>
                            {donation.user.name}
                          </button>
                        )}
                      </td>
                      <td>
                        {donation.campaign ? (
                          <a className="table-link" href={`/du-an/${donation.campaign.id}`} target="_blank" rel="noreferrer" title="Mở trang chiến dịch">{donation.campaign.title}</a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{money(donation.amount)}</td>
                      <td>{paymentMethodLabel(donation.paymentMethod)}</td>
                      <td>{donation.transactionId ? <CopyableCode value={donation.transactionId} /> : "—"}</td>
                      <td className="nowrap">{formatDateTime(donation.completedAt ?? donation.createdAt)}</td>
                      <td><span className={`table-status ${DONATION_STATUS_TONE[donation.status]}`}>{DONATION_STATUS_LABEL[donation.status]}</span></td>
                      <td>
                        {donation.riskLevel ? (
                          <Link className={`risk-level ${donation.riskLevel}`} href={adminHref("rui-ro")} title={RISK_SOURCE_TITLE[donation.riskSource ?? "campaign"]}>
                            {RISK_LEVEL_LABEL[donation.riskLevel]}
                          </Link>
                        ) : (
                          <span className="table-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button type="button" onClick={() => setViewingDonation(donation)}>Chi tiết</button>
                      </td>
                    </tr>
                  ))}
                  {donations.length === 0 && (
                    <tr><td colSpan={9}><span className="table-muted">{donationFilter.status === "flagged" && !donationFilter.q && !donationFilter.minAmount && !donationFilter.maxAmount ? "Không có giao dịch nào liên quan tới cảnh báo rủi ro đang mở." : "Không có giao dịch nào khớp bộ lọc."}</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={donationPaging.page} total={donationPaging.total} onChange={(page) => void loadDonations(donationFilter, page)} />
          </section>
          )}

          {viewingDonation && (
            <DonationDetailDialog
              donation={viewingDonation}
              statusLabel={DONATION_STATUS_LABEL[viewingDonation.status]}
              actions={donationActions(viewingDonation)}
              onClose={() => setViewingDonation(null)}
            />
          )}

          {view === "hoan-tien" && <AdminFinance view="refunds" onChanged={() => { void loadDonations(donationFilter, donationPaging.page); void reloadOverview(); }} />}
          {view === "doi-soat" && <AdminFinance view="reconciliation" onChanged={() => { void loadDonations(donationFilter, donationPaging.page); void reloadOverview(); }} />}

          {view === "nguoi-dung" && (
          <section className="admin-card admin-table-card" id="nguoi-dung">
            <div className="card-heading">
              <div><p className="eyebrow">Quản lý tài khoản</p><h2>{userPaging.total} người dùng</h2></div>
            </div>
            {overview && (
              <div className="user-summary" role="group" aria-label="Lọc nhanh người dùng">
                {([
                  ["Tổng", overview.users.total, DEFAULT_USER_FILTERS],
                  ["Hoạt động", overview.users.active, { ...DEFAULT_USER_FILTERS, status: "active" }],
                  ["Bị khóa", overview.users.banned, { ...DEFAULT_USER_FILTERS, status: "banned" }],
                  ["Chủ dự án", overview.users.owners, { ...DEFAULT_USER_FILTERS, role: "campaign_owner" }],
                ] as [string, number, UserFilters][]).map(([label, count, filters]) => {
                  const active = filters.role === userFilter.role && filters.status === userFilter.status && !userFilter.q;
                  return (
                    <button
                      key={label}
                      type="button"
                      className={active ? "is-active" : undefined}
                      aria-pressed={active}
                      onClick={() => void applyUserFilters(filters)}
                    >
                      <b>{count}</b> {label}
                    </button>
                  );
                })}
                <span className="table-muted">+{overview.users.newThisMonth} mới trong tháng</span>
              </div>
            )}
            <form
              className="admin-filter-bar"
              onSubmit={(event) => {
                event.preventDefault();
                void applyUserFilters(userDraft);
              }}
            >
              <input
                className="filter-button admin-filter-search"
                type="search"
                placeholder="Tìm theo tên hoặc email…"
                aria-label="Tìm người dùng"
                value={userDraft.q}
                onChange={(event) => setUserDraft({ ...userDraft, q: event.target.value })}
              />
              <select
                className="filter-button"
                aria-label="Lọc theo vai trò"
                value={userDraft.role}
                onChange={(event) => applyUserFilters({ ...userDraft, role: event.target.value as UserFilters["role"] })}
              >
                <option value="">Mọi vai trò</option>
                {(Object.keys(USER_ROLE_LABEL) as AdminUser["role"][]).map((role) => (
                  <option key={role} value={role}>{USER_ROLE_LABEL[role]}</option>
                ))}
              </select>
              <select
                className="filter-button"
                aria-label="Lọc theo trạng thái tài khoản"
                value={userDraft.status}
                onChange={(event) => applyUserFilters({ ...userDraft, status: event.target.value as UserFilters["status"] })}
              >
                <option value="">Mọi trạng thái</option>
                {(Object.keys(USER_STATUS_LABEL) as AdminUserStatus[]).map((status) => (
                  <option key={status} value={status}>{USER_STATUS_LABEL[status]}</option>
                ))}
              </select>
              <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
              {(userFilter.q || userFilter.role || userFilter.status) && (
                <button className="link-inline" type="button" onClick={() => applyUserFilters(DEFAULT_USER_FILTERS)}>
                  Xóa bộ lọc
                </button>
              )}
            </form>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Tên</th><th>Email</th><th>Vai trò</th><th>Ngày tham gia</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {users.map((adminUser) => {
                    const isSelf = user.id === adminUser.id;
                    return (
                      <tr key={adminUser.id}>
                        <td>
                          <b>
                            <button className="link-inline" type="button" title="Xem thông tin tài khoản" onClick={() => setViewingUserId(adminUser.id)}>
                              {adminUser.name}
                            </button>
                            {isSelf && " (bạn)"}
                          </b>
                        </td>
                        <td>
                          {adminUser.email}
                          {!adminUser.emailVerified && <span className="user-unverified" title="Người dùng chưa bấm link xác thực email">Chưa xác thực</span>}
                        </td>
                        <td>{USER_ROLE_LABEL[adminUser.role]}</td>
                        <td>{formatDate(adminUser.createdAt)}</td>
                        <td><span className={`table-status ${adminUser.status === "active" ? "success" : adminUser.status === "banned" ? "failed" : "changes"}`}>{USER_STATUS_LABEL[adminUser.status]}</span></td>
                        <td>
                          {isSelf ? (
                            <span className="table-muted">Tài khoản của bạn</span>
                          ) : adminUser.role === "admin" && adminUser.status === "active" ? (
                            <span className="table-muted" title="Không thể khóa tài khoản quản trị viên">Quản trị viên</span>
                          ) : (
                            <button
                              className={adminUser.status === "active" ? "table-danger-action" : undefined}
                              type="button"
                              disabled={busy === adminUser.id}
                              onClick={() => handleToggleUserStatus(adminUser)}
                            >
                              {adminUser.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={6}><span className="table-muted">Không có người dùng nào khớp bộ lọc.</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={userPaging.page} total={userPaging.total} onChange={(page) => void loadUsers(userFilter, page)} />
          </section>
          )}

          {view === "danh-muc" && (
            <CategoryManager
              onShowCampaigns={(category) => {
                void applyCampaignFilters({ ...DEFAULT_CAMPAIGN_FILTERS, status: "", category });
                router.push(adminHref("cho-duyet"));
              }}
            />
          )}
          {view === "sao-luu" && <BackupManager />}

          {view === "nhat-ky-kiem-toan" && (
          <AuditLogViewer onShowUser={setViewingUserId} />
          )}
        </div>
      </div>
    </main>
  );
}