"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import {
  deleteCampaign,
  fetchMyCampaigns,
  submitCampaign,
  type ApiCampaign,
  type ApiCampaignStatus,
} from "@/lib/api/campaigns";
import { useAuthUser } from "@/lib/auth";
import { formatVnd } from "@/lib/format";

const STATUS: Record<ApiCampaignStatus, { label: string; tone: string }> = {
  draft: { label: "Bản nháp", tone: "" },
  pending: { label: "Chờ duyệt", tone: "tag-amber" },
  needs_info: { label: "Cần bổ sung", tone: "tag-amber" },
  rejected: { label: "Bị từ chối", tone: "tag-red" },
  approved: { label: "Đã duyệt", tone: "tag-blue" },
  active: { label: "Đang gây quỹ", tone: "tag-green" },
  paused: { label: "Tạm dừng", tone: "tag-red" },
  success: { label: "Đạt mục tiêu", tone: "tag-green" },
  failed: { label: "Không đạt", tone: "" },
  cancelled: { label: "Đã hủy", tone: "" },
  ended: { label: "Kết thúc", tone: "" },
};

const EDITABLE: ApiCampaignStatus[] = ["draft", "rejected", "needs_info"];
const DAY_MS = 86_400_000;

type Task = { key: string; icon: IconName; text: string; href: string };

function buildTasks(campaigns: ApiCampaign[]): Task[] {
  const now = Date.now();
  const tasks: Task[] = [];
  for (const c of campaigns) {
    if (c.status === "draft") {
      tasks.push({ key: `${c.id}-draft`, icon: "document", text: `“${c.title}” vẫn là bản nháp, chưa gửi duyệt.`, href: "#chien-dich" });
    }
    if (c.status === "needs_info") {
      tasks.push({ key: `${c.id}-info`, icon: "message", text: `Quản trị viên yêu cầu bổ sung cho “${c.title}”.`, href: "#chien-dich" });
    }
    if (c.status === "paused") {
      tasks.push({ key: `${c.id}-paused`, icon: "shield", text: `“${c.title}” đang bị tạm dừng, xem lý do để giải trình.`, href: "#chien-dich" });
    }
    if (c.status === "active" && (c.milestones?.length ?? 0) === 0) {
      tasks.push({ key: `${c.id}-plan`, icon: "chart", text: `“${c.title}” chưa có kế hoạch theo mốc để báo cáo chi tiêu.`, href: `/du-an/${c.id}` });
    }
    if (c.status === "active") {
      const daysLeft = Math.ceil((new Date(c.endDate).getTime() - now) / DAY_MS);
      if (daysLeft >= 0 && daysLeft <= 7) {
        tasks.push({ key: `${c.id}-ending`, icon: "clock", text: `“${c.title}” còn ${daysLeft} ngày gây quỹ.`, href: `/du-an/${c.id}` });
      }
    }
  }
  return tasks;
}

export function OwnerDashboard() {
  const user = useAuthUser();
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetchMyCampaigns({ sort: "latest", limit: 100 });
      setCampaigns(response.items);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyCampaigns({ sort: "latest", limit: 100 })
      .then((response) => {
        if (cancelled) return;
        setCampaigns(response.items);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const totals = useMemo(() => campaigns.reduce(
    (acc, c) => {
      acc.raised += Number(c.currentAmount) || 0;
      acc.backers += Number(c.backerCount) || 0;
      if (c.status === "active") acc.active += 1;
      if (c.status === "pending") acc.pending += 1;
      return acc;
    },
    { raised: 0, backers: 0, active: 0, pending: 0 },
  ), [campaigns]);
  const tasks = useMemo(() => buildTasks(campaigns), [campaigns]);

  const act = async (campaign: ApiCampaign, action: "submit" | "delete") => {
    if (action === "delete" && !window.confirm(`Xóa bản nháp “${campaign.title}”? Thao tác này không hoàn tác được.`)) return;
    setBusyId(campaign.id);
    setMessage(null);
    try {
      if (action === "submit") await submitCampaign(campaign.id);
      else await deleteCampaign(campaign.id);
      await load();
      setMessage({ tone: "ok", text: action === "submit" ? `Đã gửi “${campaign.title}” để xét duyệt.` : `Đã xóa “${campaign.title}”.` });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Không thực hiện được, vui lòng thử lại." });
    } finally {
      setBusyId(null);
    }
  };

  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="user" size={28} /></span>
        <h1>Đăng nhập để quản lý chiến dịch</h1>
        <p>Trang này dành cho chủ dự án theo dõi số tiền đã nhận, trạng thái duyệt và việc cần làm.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href="/dang-nhap?next=/dashboard">Đăng nhập</Link>
          <Link className="button button-outline" href="/dang-ky">Tạo tài khoản</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="dash">
      <section className="dash-head">
        <div className="container dash-head-inner">
          <div>
            <p className="dash-kicker">Trang quản lý</p>
            <h1>Xin chào, {user.name}</h1>
            <p>{state === "ready" ? (campaigns.length > 0 ? `Bạn có ${campaigns.length} chiến dịch.` : "Bạn chưa có chiến dịch nào.") : "Đang tải dữ liệu…"}</p>
          </div>
          <Link className="button button-primary" href="/tao-chien-dich">+ Tạo chiến dịch</Link>
        </div>
      </section>

      <div className="container dash-body">
        {state === "error" && (
          <div className="form-error" role="alert">
            Không tải được danh sách chiến dịch.{" "}
            <button className="link-inline" type="button" onClick={() => { setState("loading"); void load(); }}>Thử lại</button>
          </div>
        )}
        {message && <p className={message.tone === "ok" ? "form-notice" : "form-error"} role="status">{message.text}</p>}

        <div className="kpis">
          <div className="kpi"><span className="kpi-ico"><Icon name="wallet" size={22} /></span><div><small>Đã nhận (đã xác nhận)</small><strong className="num">{formatVnd(totals.raised)}</strong></div></div>
          <div className="kpi"><span className="kpi-ico"><Icon name="users" size={22} /></span><div><small>Lượt ủng hộ</small><strong className="num">{totals.backers.toLocaleString("vi-VN")}</strong></div></div>
          <div className="kpi"><span className="kpi-ico"><Icon name="chart" size={22} /></span><div><small>Đang gây quỹ</small><strong className="num">{totals.active}</strong></div></div>
          <div className="kpi"><span className="kpi-ico"><Icon name="clock" size={22} /></span><div><small>Chờ duyệt</small><strong className="num">{totals.pending}</strong></div></div>
        </div>

        <div className="dash-grid">
          <section className="panel" id="chien-dich" aria-labelledby="ds-chien-dich">
            <h2 id="ds-chien-dich">Chiến dịch của bạn</h2>
            {state === "loading" && <p className="hint">Đang tải…</p>}
            {state === "ready" && campaigns.length === 0 && (
              <div className="empty-box">
                <p>Chưa có chiến dịch nào. Soạn hồ sơ đầu tiên để bắt đầu gây quỹ.</p>
                <Link className="button button-primary" href="/tao-chien-dich">Tạo chiến dịch</Link>
              </div>
            )}
            <ul className="own-list">
              {campaigns.map((c) => {
                const raised = Number(c.currentAmount) || 0;
                const goal = Number(c.goalAmount) || 0;
                const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
                const status = STATUS[c.status];
                const editable = EDITABLE.includes(c.status);
                return (
                  <li className="own-item" key={c.id}>
                    <div className="own-top">
                      <span className={`tag ${status.tone}`}>{status.label}</span>
                      <span className="own-end">Kết thúc {new Date(c.endDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <h3><Link href={`/du-an/${c.id}`}>{c.title}</Link></h3>
                    {c.rejectionReason && ["rejected", "needs_info", "paused"].includes(c.status) && (
                      <p className="own-reason"><b>Lý do từ quản trị viên:</b> {c.rejectionReason}</p>
                    )}
                    <ProgressBar value={percent} label={`Đạt ${percent}% mục tiêu`} />
                    <div className="own-figures">
                      <span><b className="num">{formatVnd(raised)}</b> / <span className="num">{formatVnd(goal)}</span></span>
                      <span className="num">{percent}%</span>
                    </div>
                    <div className="own-actions">
                      <Link className="button button-outline button-sm" href={`/du-an/${c.id}`}>Xem</Link>
                      {editable && (
                        <button className="button button-primary button-sm" type="button" disabled={busyId === c.id} onClick={() => act(c, "submit")}>
                          Gửi duyệt
                        </button>
                      )}
                      {editable && (
                        <button className="button button-ghost button-sm" type="button" disabled={busyId === c.id} onClick={() => act(c, "delete")}>
                          Xóa
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className="dash-side">
            <section className="panel" aria-labelledby="viec-can-lam">
              <h2 id="viec-can-lam" className="panel-title-sm">Việc cần làm</h2>
              {state !== "ready" ? (
                <p className="hint">Đang tải…</p>
              ) : tasks.length === 0 ? (
                <p className="hint">Không có việc nào cần xử lý.</p>
              ) : (
                <ul className="tasks">
                  {tasks.map((task) => (
                    <li key={task.key}>
                      <span className="task-ico"><Icon name={task.icon} size={16} /></span>
                      <a href={task.href}>{task.text}</a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel" aria-labelledby="minh-bach-note">
              <h2 id="minh-bach-note" className="panel-title-sm">Số liệu được tính thế nào?</h2>
              <ul className="check-list">
                <li><Icon name="check" size={15} /> Số tiền chỉ cộng khi cổng thanh toán xác nhận giao dịch.</li>
                <li><Icon name="check" size={15} /> Lượt ủng hộ đếm theo giao dịch đã hoàn tất, không nhập tay.</li>
                <li><Icon name="check" size={15} /> Duyệt, tạm dừng, chỉnh sửa đều được ghi nhật ký.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
