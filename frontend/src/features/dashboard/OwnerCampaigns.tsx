import Link from "next/link";
import { useMemo, useState } from "react";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { useDialog } from "@/components/ui/DialogProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { CampaignStatsPanel } from "@/features/campaign-stats/CampaignStatsPanel";
import { ProgressManager } from "@/features/progress/ProgressManager";
import { RewardManager } from "@/features/rewards/RewardManager";
import { ApiError } from "@/lib/api";
import { deleteCampaign, submitCampaign, type ApiCampaign, type ApiCampaignStatus } from "@/lib/api/campaigns";
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
/** Đã phát hành → có lượt xem/giao dịch để thống kê. */
const PUBLISHED: ApiCampaignStatus[] = ["approved", "active", "paused", "success", "failed", "ended"];
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

type OwnerCampaignsProps = {
  campaigns: ApiCampaign[];
  /** Tải lại danh sách sau khi gửi duyệt/xóa. */
  reload: () => Promise<void>;
};

/** Khu vực chủ dự án: số liệu tổng, danh sách chiến dịch và việc cần làm. */
export function OwnerCampaigns({ campaigns, reload }: OwnerCampaignsProps) {
  const dialog = useDialog();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rewardsOpen, setRewardsOpen] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState<string | null>(null);
  const [progressOpen, setProgressOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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
    if (action === "delete") {
      const ok = await dialog.confirm({
        title: "Xóa bản nháp?",
        message: <>Bản nháp <b>{campaign.title}</b> sẽ bị xóa vĩnh viễn. Thao tác này không hoàn tác được.</>,
        confirmLabel: "Xóa bản nháp",
        tone: "danger",
      });
      if (!ok) return;
    }
    setBusyId(campaign.id);
    setMessage(null);
    try {
      if (action === "submit") await submitCampaign(campaign.id);
      else await deleteCampaign(campaign.id);
      await reload();
      setMessage({ tone: "ok", text: action === "submit" ? `Đã gửi “${campaign.title}” để xét duyệt.` : `Đã xóa “${campaign.title}”.` });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Không thực hiện được, vui lòng thử lại." });
    } finally {
      setBusyId(null);
    }
  };

  if (campaigns.length === 0) {
    return (
      <div className="activity-empty">
        <p>Bạn chưa có chiến dịch nào. Soạn hồ sơ đầu tiên để bắt đầu gây quỹ.</p>
        <Link className="button button-outline" href="/tao-chien-dich">Tạo chiến dịch</Link>
      </div>
    );
  }

  return (
    <div className="owner-area">
      {message && <p className={message.tone === "ok" ? "form-notice" : "form-error"} role="status">{message.text}</p>}

      <div className="owner-stats">
        <div><small>Đã nhận (đã xác nhận)</small><strong className="num">{formatVnd(totals.raised)}</strong></div>
        <div><small>Lượt ủng hộ</small><strong className="num">{totals.backers.toLocaleString("vi-VN")}</strong></div>
        <div><small>Đang gây quỹ</small><strong className="num">{totals.active}</strong></div>
        <div><small>Chờ duyệt</small><strong className="num">{totals.pending}</strong></div>
      </div>

      {tasks.length > 0 && (
        <section className="owner-tasks" aria-labelledby="viec-can-lam">
          <h3 id="viec-can-lam">Việc cần làm</h3>
          <ul className="tasks">
            {tasks.map((task) => (
              <li key={task.key}>
                <span className="task-ico"><Icon name={task.icon} size={16} /></span>
                <a href={task.href}>{task.text}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="own-list" id="chien-dich">
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
                {PUBLISHED.includes(c.status) && (
                  <button
                    className="button button-ghost button-sm"
                    type="button"
                    aria-expanded={statsOpen === c.id}
                    onClick={() => setStatsOpen((id) => (id === c.id ? null : c.id))}
                  >
                    Số liệu
                  </button>
                )}
                {PUBLISHED.includes(c.status) && (
                  <button
                    className="button button-ghost button-sm"
                    type="button"
                    aria-expanded={progressOpen === c.id}
                    onClick={() => setProgressOpen((id) => (id === c.id ? null : c.id))}
                  >
                    Tiến độ
                  </button>
                )}
                <button
                  className="button button-ghost button-sm"
                  type="button"
                  aria-expanded={rewardsOpen === c.id}
                  onClick={() => setRewardsOpen((id) => (id === c.id ? null : c.id))}
                >
                  Mức quà
                </button>
              </div>
              {statsOpen === c.id && <CampaignStatsPanel campaignId={c.id} />}
              {progressOpen === c.id && <ProgressManager campaignId={c.id} readOnly={c.status === "failed"} />}
              {rewardsOpen === c.id && (
                <RewardManager campaignId={c.id} closed={["success", "failed", "cancelled", "ended"].includes(c.status)} />
              )}
            </li>
          );
        })}
      </ul>

      <p className="owner-note">
        <Icon name="shield" size={15} /> Số tiền và lượt ủng hộ chỉ tính giao dịch đã được cổng thanh toán xác nhận; duyệt, tạm dừng và chỉnh sửa đều được ghi nhật ký.
      </p>
    </div>
  );
}
