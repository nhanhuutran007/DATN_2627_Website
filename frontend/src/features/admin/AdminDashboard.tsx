"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  fetchAdminCampaigns,
  fetchAdminDonations,
  fetchAdminOverview,
  fetchAdminRisks,
  fetchAdminUsers,
  fetchAuditLogs,
  generateRiskWarnings,
  moderateCampaign,
  setRiskStatus,
  setUserStatus,
  type AdminCampaign,
  type AdminDonation,
  type AdminOverview,
  type AdminRiskAlert,
  type AdminUser,
  type AdminUserStatus,
  type AuditLogEntry,
  type ModerateDecision,
  type RiskStatus,
} from "@/lib/api/admin";
import type { ApiCampaignStatus } from "@/lib/api/campaigns";
import {
  fetchAdminReports,
  REPORT_REASON_LABEL,
  REPORT_STATUS_LABEL,
  reviewReport,
  type CampaignReport,
  type ReportStatus,
  type ReviewStatus,
} from "@/lib/api/reports";
import { useAuthUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/data/campaigns";

const CAMPAIGN_STATUS_LABEL: Record<ApiCampaignStatus, string> = {
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

const CAMPAIGN_STATUS_TONE: Record<ApiCampaignStatus, string> = {
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

const DONATION_STATUS_LABEL: Record<AdminDonation["status"], string> = {
  pending: "Chờ xử lý",
  completed: "Thành công",
  failed: "Thất bại",
  refunded: "Hoàn tiền",
};

const DONATION_STATUS_TONE: Record<AdminDonation["status"], string> = {
  pending: "pending",
  completed: "success",
  failed: "failed",
  refunded: "changes",
};

const USER_STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: "Hoạt động",
  inactive: "Không hoạt động",
  banned: "Đã khóa",
};

const USER_ROLE_LABEL: Record<AdminUser["role"], string> = {
  user: "Người ủng hộ",
  campaign_owner: "Chủ dự án",
  admin: "Quản trị",
};

const RISK_LEVEL_LABEL: Record<AdminRiskAlert["level"], string> = {
  high: "Cao",
  medium: "Vừa",
  low: "Thấp",
};

const RISK_STATUS_LABEL: Record<RiskStatus, string> = {
  open: "Chưa xử lý",
  resolved: "Đã xác nhận",
  dismissed: "Đã bỏ qua",
};

const AUDIT_ENTITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Tất cả đối tượng" },
  { value: "campaign", label: "Chiến dịch" },
  { value: "donation", label: "Giao dịch" },
  { value: "user", label: "Người dùng (gồm đăng nhập/đăng ký)" },
  { value: "milestone", label: "Mốc tiến độ" },
  { value: "milestone_update", label: "Bài cập nhật" },
  { value: "risk_alert", label: "Cảnh báo rủi ro" },
  { value: "report", label: "Báo cáo vi phạm" },
];

const MIN_REPORT_NOTES = 5;

function money(value: number | string): string {
  return formatCurrency(Number(value) || 0);
}

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

export function AdminDashboard() {
  const user = useAuthUser();
  const isAdmin = user?.role === "admin";

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [campaigns, setCampaigns] = useState<AdminCampaign[]>([]);
  const [donations, setDonations] = useState<AdminDonation[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [risks, setRisks] = useState<AdminRiskAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [reportFilter, setReportFilter] = useState<ReportStatus | "">("pending");

  const [campaignFilter, setCampaignFilter] = useState<ApiCampaignStatus | "">("pending");
  const [donationFilter, setDonationFilter] = useState<AdminDonation["status"] | "">("completed");
  const [riskFilter, setRiskFilter] = useState<RiskStatus | "">("open");
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const [ov, camps, dons, usrs, riskList, audit, reportList] = await Promise.all([
          fetchAdminOverview(),
          fetchAdminCampaigns({ status: "pending", limit: 20 }),
          fetchAdminDonations({ status: "completed", limit: 20 }),
          fetchAdminUsers({ limit: 20 }),
          fetchAdminRisks({ status: "open", limit: 50 }),
          fetchAuditLogs({ limit: 50 }),
          fetchAdminReports({ status: "pending", limit: 50 }),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setCampaigns(camps.items);
        setDonations(dons.items);
        setUsers(usrs.items);
        setRisks(riskList.items);
        setAuditLogs(audit.items);
        setReports(reportList.items);
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

  async function reloadOverview() {
    try {
      setOverview(await fetchAdminOverview());
    } catch {
      // dữ liệu tổng quan có thể cũ hơn một nhịp; không làm gián đoạn thao tác
    }
  }

  async function changeCampaignFilter(status: ApiCampaignStatus | "") {
    setCampaignFilter(status);
    try {
      const result = await fetchAdminCampaigns({ status: status || undefined, limit: 20 });
      setCampaigns(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách chiến dịch");
    }
  }

  async function changeDonationFilter(status: AdminDonation["status"] | "") {
    setDonationFilter(status);
    try {
      const result = await fetchAdminDonations({ status: status || undefined, limit: 20 });
      setDonations(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách giao dịch");
    }
  }

  async function handleModerate(campaign: AdminCampaign, status: ModerateDecision) {
    const needsReason = status === "needs_info" || status === "rejected";
    let reason: string | undefined;
    if (needsReason) {
      const promptLabel =
        status === "needs_info"
          ? `Ghi chú bổ sung cho chiến dịch "${campaign.title}"`
          : `Lý do từ chối chiến dịch "${campaign.title}"`;
      const input = window.prompt(promptLabel, "");
      if (input === null) return;
      if (!input.trim()) {
        setNotice("Vui lòng nhập lý do để gửi yêu cầu.");
        return;
      }
      reason = input.trim();
    }
    setBusy(campaign.id);
    setNotice(null);
    try {
      await moderateCampaign(campaign.id, status, reason);
      await Promise.all([
        changeCampaignFilter(campaignFilter),
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
    setBusy(adminUser.id);
    setNotice(null);
    try {
      await setUserStatus(adminUser.id, next);
      const result = await fetchAdminUsers({ limit: 20 });
      setUsers(result.items);
      await reloadOverview();
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

  async function loadRisks(status: RiskStatus | "") {
    try {
      const result = await fetchAdminRisks({ status: status || undefined, limit: 50 });
      setRisks(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được cảnh báo rủi ro");
    }
  }

  async function changeRiskFilter(status: RiskStatus | "") {
    setRiskFilter(status);
    await loadRisks(status);
  }

  async function changeAuditFilter(entity: string) {
    setAuditEntityFilter(entity);
    try {
      const result = await fetchAuditLogs({ entity: entity || undefined, limit: 50 });
      setAuditLogs(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được nhật ký kiểm toán");
    }
  }

  function auditActorLabel(entry: AuditLogEntry): string {
    if (!entry.userId) return "Hệ thống";
    const match = users.find((candidate) => candidate.id === entry.userId);
    return match ? `${match.name} (${match.email})` : entry.userId.slice(0, 8).toUpperCase();
  }

  async function handleGenerateRisks() {
    setBusy("risks");
    setNotice(null);
    try {
      const result = await generateRiskWarnings();
      await Promise.all([loadRisks(riskFilter), reloadOverview()]);
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
    setBusy(alert.id);
    setNotice(null);
    try {
      await setRiskStatus(alert.id, status);
      await Promise.all([loadRisks(riskFilter), reloadOverview()]);
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

  async function loadReports(status: ReportStatus | "") {
    try {
      const result = await fetchAdminReports({ status: status || undefined, limit: 50 });
      setReports(result.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được báo cáo vi phạm");
    }
  }

  async function changeReportFilter(status: ReportStatus | "") {
    setReportFilter(status);
    await loadReports(status);
  }

  async function handleReportDecision(report: CampaignReport, status: ReviewStatus) {
    const title = report.campaign?.title ?? "chiến dịch";
    let adminNotes: string | undefined;
    let pauseCampaign = false;

    if (status !== "reviewing") {
      const input = window.prompt(
        status === "resolved"
          ? `Kết luận vi phạm cho báo cáo về "${title}" (bắt buộc, lưu vào nhật ký)`
          : `Lý do bỏ qua báo cáo về "${title}" (bắt buộc, lưu vào nhật ký)`,
        "",
      );
      if (input === null) return;
      if (input.trim().length < MIN_REPORT_NOTES) {
        setNotice(`Vui lòng nhập ghi chú tối thiểu ${MIN_REPORT_NOTES} ký tự.`);
        return;
      }
      adminNotes = input.trim();
      if (status === "resolved" && report.campaign?.status === "active") {
        pauseCampaign = window.confirm(
          `Tạm dừng chiến dịch "${title}" để chủ dự án giải trình? Chiến dịch có thể được cho tiếp tục sau.`,
        );
      }
    }

    setBusy(report.id);
    setNotice(null);
    try {
      await reviewReport(report.id, { status, adminNotes, pauseCampaign });
      const reloads: Array<Promise<unknown>> = [loadReports(reportFilter)];
      if (pauseCampaign) reloads.push(changeCampaignFilter(campaignFilter), reloadOverview());
      await Promise.all(reloads);
      setNotice(
        status === "reviewing"
          ? `Đã chuyển báo cáo về "${title}" sang đang xem xét.`
          : status === "resolved"
            ? `Đã xác nhận vi phạm "${title}"${pauseCampaign ? " và tạm dừng chiến dịch" : ""}.`
            : `Đã bỏ qua báo cáo về "${title}".`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Không cập nhật được báo cáo");
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

  const tableActions = (campaign: AdminCampaign) => {
    const disabled = busy === campaign.id;
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
    return <span className="table-muted">Không cần thao tác</span>;
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
  const maxMonthly = Math.max(1, ...(overview?.monthly ?? []).map((entry) => entry.raised));

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-profile">
            <span>{user.name.charAt(0).toUpperCase()}</span>
            <div><b>{user.name}</b><small>{user.email}</small></div>
          </div>
          <nav aria-label="Điều hướng quản trị">
            <a className="active" href="#tong-quan"><Icon name="chart" size={19} /> Tổng quan</a>
            <a href="#cho-duyet"><Icon name="document" size={19} /> Duyệt chiến dịch {pendingCount > 0 && <i>{pendingCount}</i>}</a>
            <a href="#rui-ro"><Icon name="shield" size={19} /> Cảnh báo rủi ro {(overview?.risks.open ?? 0) > 0 && <i>{overview?.risks.open}</i>}</a>
            <a href="#bao-cao-vi-pham"><Icon name="bell" size={19} /> Báo cáo vi phạm</a>
            <a href="#giao-dich"><Icon name="receipt" size={19} /> Giao dịch</a>
            <a href="#nguoi-dung"><Icon name="users" size={19} /> Người dùng</a>
            <a href="#nhat-ky-kiem-toan"><Icon name="clock" size={19} /> Nhật ký kiểm toán</a>
          </nav>
          <div className="admin-policy"><Icon name="shield" size={22} /><p><b>AI không tự động xử phạt</b><span>Mọi cảnh báo phải có quản trị viên xem xét và lưu lý do quyết định.</span></p></div>
        </aside>

        <div className="admin-content" id="tong-quan">
          <header className="admin-content-header">
            <div>
              <p className="eyebrow">Bảng điều khiển</p>
              <h1>Tổng quan hệ thống</h1>
              <span>Dữ liệu cập nhật lúc {formatTimestamp()}</span>
            </div>
            <div>
              <Link className="button button-primary" href="/">Xem trang người dùng</Link>
            </div>
          </header>

          {error && (
            <div className="admin-notice error" role="alert">
              <Icon name="bell" size={16} /> {error} — dữ liệu hiển thị có thể chưa đầy đủ.
            </div>
          )}
          {notice && !error && (
            <div className="admin-notice" role="status">
              <Icon name="check" size={16} /> {notice}
            </div>
          )}

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
                <strong>{overview ? money(overview.donations.completedAmount) : "—"}</strong>
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
              <div className="card-heading"><div><p className="eyebrow">Hàng chờ xét duyệt</p><h2>{pendingCount} hồ sơ</h2></div><a href="#cho-duyet">Xem tất cả</a></div>
              <div className="donut-wrap">
                <div className="donut"><span><b>{pendingCount}</b><small>chờ duyệt</small></span></div>
                <ul>
                  <li><i className="orange" /><span>Chờ duyệt</span><b>{overview?.campaigns.pending ?? 0}</b></li>
                  <li><i className="yellow" /><span>Cần bổ sung</span><b>{overview?.campaigns.needsInfo ?? 0}</b></li>
                  <li><i className="green" /><span>Đang gây quỹ</span><b>{overview?.campaigns.active ?? 0}</b></li>
                </ul>
              </div>
              <div className="review-sla"><Icon name="clock" size={18} /><span><b>Đã duyệt {overview?.campaigns.approved ?? 0} chiến dịch</b><small>Kể từ khi hệ thống vận hành</small></span></div>
            </section>
          </div>

          <section className="admin-card admin-table-card" id="cho-duyet">
            <div className="card-heading">
              <div><p className="eyebrow">Duyệt hồ sơ</p><h2>Chiến dịch</h2></div>
              <select className="filter-button" aria-label="Lọc theo trạng thái chiến dịch" value={campaignFilter} onChange={(event) => changeCampaignFilter(event.target.value as ApiCampaignStatus | "")}>
                <option value="pending">Chờ duyệt</option>
                <option value="approved">Đã duyệt</option>
                <option value="needs_info">Cần bổ sung</option>
                <option value="rejected">Bị từ chối</option>
                <option value="draft">Bản nháp</option>
                <option value="active">Đang gây quỹ</option>
                <option value="paused">Tạm dừng</option>
                <option value="">Tất cả trạng thái</option>
              </select>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Chiến dịch</th><th>Chủ dự án</th><th>Mục tiêu</th><th>Đã huy động</th><th>Hạng mục</th><th>Kết thúc</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id}>
                      <td><b>{campaign.title}</b></td>
                      <td>{campaign.owner?.name ?? "Chưa có"}</td>
                      <td>{money(campaign.goalAmount)}</td>
                      <td>{money(campaign.currentAmount)}</td>
                      <td>{campaign.category}</td>
                      <td>{formatDate(campaign.endDate)}</td>
                      <td><span className={`table-status ${CAMPAIGN_STATUS_TONE[campaign.status]}`}>{CAMPAIGN_STATUS_LABEL[campaign.status]}</span></td>
                      <td>{tableActions(campaign)}</td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr><td colSpan={8}><span className="table-muted">Không có chiến dịch nào trong trạng thái này.</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card risk-card" id="rui-ro">
            <div className="card-heading">
              <div><p className="eyebrow">Human-in-the-loop</p><h2>Cảnh báo rủi ro AI</h2></div>
              <div className="risk-heading-actions">
                <select className="filter-button" aria-label="Lọc theo trạng thái cảnh báo" value={riskFilter} onChange={(event) => changeRiskFilter(event.target.value as RiskStatus | "")}>
                  <option value="open">Chưa xử lý</option>
                  <option value="resolved">Đã xác nhận</option>
                  <option value="dismissed">Đã bỏ qua</option>
                  <option value="">Tất cả trạng thái</option>
                </select>
                <button className="model-version" type="button" disabled={busy === "risks"} onClick={handleGenerateRisks}>
                  <Icon name="sparkles" size={15} /> Quét lại
                </button>
              </div>
            </div>
            <div className="risk-list">
              {risks.length === 0 ? (
                <article>
                  <p className="table-muted">Không có cảnh báo nào ở trạng thái này. Nhấn Quét lại để chạy AI chấm điểm rủi ro cho các chiến dịch đang hoạt động.</p>
                </article>
              ) : (
                risks.map((alert) => (
                  <article key={alert.id}>
                    <span className={`risk-level ${alert.level}`}>{RISK_LEVEL_LABEL[alert.level]}</span>
                    <div>
                      <h3>{alert.entityName}</h3>
                      <p>{alert.entityId.slice(0, 8).toUpperCase()} · {riskEntityLabel(alert)} · {alert.method === "ai" ? "Chấm điểm bằng AI" : "Cảnh báo bằng luật dự phòng"}</p>
                      <small><b>Nguyên nhân:</b> {alert.reasons.map((reason) => reason.label).join(" · ")}</small>
                      <small><b>Bằng chứng:</b> {evidenceSummary(alert.evidences)}</small>
                    </div>
                    <div>{riskActions(alert)}</div>
                  </article>
                ))
              )}
            </div>
            <p className="risk-footnote"><Icon name="shield" size={15} /> Cảnh báo AI chỉ giúp ưu tiên kiểm tra. Không tự động khóa tài khoản, tạm dừng chiến dịch hay công khai cáo buộc. Quyết định cuối cùng do quản trị viên đưa ra và được ghi vào nhật ký kiểm toán.</p>
          </section>

          <section className="admin-card risk-card" id="bao-cao-vi-pham">
            <div className="card-heading">
              <div><p className="eyebrow">Kiểm duyệt nội dung</p><h2>Báo cáo vi phạm</h2></div>
              <select className="filter-button" aria-label="Lọc theo trạng thái báo cáo" value={reportFilter} onChange={(event) => changeReportFilter(event.target.value as ReportStatus | "")}>
                <option value="pending">Chờ xem xét</option>
                <option value="reviewing">Đang xem xét</option>
                <option value="resolved">Đã xử lý vi phạm</option>
                <option value="dismissed">Không vi phạm</option>
                <option value="">Tất cả trạng thái</option>
              </select>
            </div>
            <div className="risk-list">
              {reports.length === 0 ? (
                <article>
                  <p className="table-muted">Không có báo cáo nào ở trạng thái này.</p>
                </article>
              ) : (
                reports.map((report) => (
                  <article key={report.id}>
                    <span className={`report-status ${report.status}`}>{REPORT_STATUS_LABEL[report.status]}</span>
                    <div>
                      <h3>{report.campaign?.title ?? "Chiến dịch đã bị xoá"}</h3>
                      <p>{REPORT_REASON_LABEL[report.reason]} · {formatDate(report.createdAt)} · bởi {report.reporter ? `${report.reporter.name}${report.reporter.email ? ` (${report.reporter.email})` : ""}` : "người dùng"}</p>
                      <p className="report-quote">{report.description}</p>
                      {report.adminNotes && <small><b>Ghi chú quản trị:</b> {report.adminNotes}</small>}
                    </div>
                    <div>{reportActions(report)}</div>
                  </article>
                ))
              )}
            </div>
            <p className="risk-footnote"><Icon name="shield" size={15} /> Hệ thống không tự ẩn hay tạm dừng chiến dịch theo số lượng báo cáo. Quản trị viên xem xét, ghi lý do và mọi quyết định được lưu vào nhật ký kiểm toán.</p>
          </section>

          <section className="admin-card admin-table-card" id="giao-dich">
            <div className="card-heading">
              <div><p className="eyebrow">Minh bạch quỹ</p><h2>Giao dịch tài trợ</h2></div>
              <select className="filter-button" aria-label="Lọc theo trạng thái giao dịch" value={donationFilter} onChange={(event) => changeDonationFilter(event.target.value as AdminDonation["status"] | "")}>
                <option value="completed">Thành công</option>
                <option value="pending">Chờ xử lý</option>
                <option value="failed">Thất bại</option>
                <option value="refunded">Hoàn tiền</option>
                <option value="">Tất cả trạng thái</option>
              </select>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Người ủng hộ</th><th>Chiến dịch</th><th>Số tiền</th><th>Phương thức</th><th>Mã giao dịch</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {donations.map((donation) => (
                    <tr key={donation.id}>
                      <td><b>{donation.isAnonymous ? "Ẩn danh" : (donation.user?.name ?? "Người ủng hộ")}</b></td>
                      <td>{donation.campaign?.title ?? "—"}</td>
                      <td>{money(donation.amount)}</td>
                      <td>{donation.paymentMethod ?? "—"}</td>
                      <td>{donation.transactionId ? donation.transactionId.slice(0, 10).toUpperCase() : "—"}</td>
                      <td>{formatDate(donation.completedAt ?? donation.createdAt)}</td>
                      <td><span className={`table-status ${DONATION_STATUS_TONE[donation.status]}`}>{DONATION_STATUS_LABEL[donation.status]}</span></td>
                    </tr>
                  ))}
                  {donations.length === 0 && (
                    <tr><td colSpan={7}><span className="table-muted">Không có giao dịch nào trong trạng thái này.</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card admin-table-card" id="nguoi-dung">
            <div className="card-heading">
              <div><p className="eyebrow">Quản lý tài khoản</p><h2>Người dùng</h2></div>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Tên</th><th>Email</th><th>Vai trò</th><th>Ngày tham gia</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {users.map((adminUser) => {
                    const isSelf = user.id === adminUser.id;
                    return (
                      <tr key={adminUser.id}>
                        <td><b>{adminUser.name}{isSelf && " (bạn)"}</b></td>
                        <td>{adminUser.email}</td>
                        <td>{USER_ROLE_LABEL[adminUser.role]}</td>
                        <td>{formatDate(adminUser.createdAt)}</td>
                        <td><span className={`table-status ${adminUser.status === "active" ? "success" : adminUser.status === "banned" ? "failed" : "changes"}`}>{USER_STATUS_LABEL[adminUser.status]}</span></td>
                        <td>
                          {isSelf ? (
                            <span className="table-muted">Tài khoản của bạn</span>
                          ) : (
                            <button type="button" disabled={busy === adminUser.id} onClick={() => handleToggleUserStatus(adminUser)}>
                              {adminUser.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-card admin-table-card" id="nhat-ky-kiem-toan">
            <div className="card-heading">
              <div><p className="eyebrow">Truy vết thay đổi</p><h2>Nhật ký kiểm toán</h2></div>
              <select
                className="filter-button"
                aria-label="Lọc theo đối tượng"
                value={auditEntityFilter}
                onChange={(event) => changeAuditFilter(event.target.value)}
              >
                {AUDIT_ENTITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Thời gian</th><th>Hành động</th><th>Đối tượng</th><th>Người thực hiện</th><th>IP</th><th /></tr></thead>
                <tbody>
                  {auditLogs.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td><code>{entry.action}</code></td>
                      <td>{entry.entity}{entry.entityId ? ` · ${entry.entityId.slice(0, 8).toUpperCase()}` : ""}</td>
                      <td>{auditActorLabel(entry)}</td>
                      <td>{entry.ipAddress ?? "—"}</td>
                      <td>
                        {(entry.oldValues || entry.newValues) && (
                          <details>
                            <summary>Chi tiết</summary>
                            <pre className="audit-detail">
                              {JSON.stringify({ old: entry.oldValues, new: entry.newValues }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr><td colSpan={6}><span className="table-muted">Không có bản ghi audit nào khớp bộ lọc.</span></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="risk-footnote"><Icon name="shield" size={15} /> Nhật ký chỉ ghi thêm, không thể sửa/xóa — dùng để truy vết duyệt hồ sơ, thanh toán, đăng nhập và hành động quản trị.</p>
          </section>
        </div>
      </div>
    </main>
  );
}