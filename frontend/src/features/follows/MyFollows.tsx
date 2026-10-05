import Link from "next/link";
import { useEffect, useState } from "react";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { ApiError } from "@/lib/api";
import type { ApiCampaignStatus } from "@/lib/api/campaigns";
import { fetchMyFollows, unfollowCampaign, type FollowedCampaign } from "@/lib/api/follows";
import { formatVnd } from "@/lib/format";

const STATUS_LABEL: Partial<Record<ApiCampaignStatus, { label: string; tone: string }>> = {
  approved: { label: "Sắp mở", tone: "tag-blue" },
  active: { label: "Đang gây quỹ", tone: "tag-green" },
  paused: { label: "Tạm dừng", tone: "tag-amber" },
  success: { label: "Đạt mục tiêu", tone: "tag-green" },
  failed: { label: "Không đạt", tone: "tag-red" },
  ended: { label: "Kết thúc", tone: "" },
};

function percentOf(item: FollowedCampaign): number {
  const goal = Number(item.campaign.goalAmount);
  if (!goal) return 0;
  return Math.round((Number(item.campaign.currentAmount) / goal) * 100);
}

/** Các chiến dịch người dùng đang theo dõi (nhận thông báo cập nhật). */
export function MyFollows() {
  const [items, setItems] = useState<FollowedCampaign[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchMyFollows(50)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unfollow = async (campaignId: string) => {
    setBusyId(campaignId);
    setError("");
    try {
      await unfollowCampaign(campaignId);
      setItems((current) => current.filter((item) => item.campaign.id !== campaignId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không bỏ theo dõi được, vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  if (state === "loading") return <p className="hint" role="status">Đang tải…</p>;
  if (state === "error") return <p className="form-error" role="alert">Không tải được danh sách theo dõi.</p>;
  if (items.length === 0) {
    return (
      <div className="empty-box">
        <p>Bạn chưa theo dõi chiến dịch nào. Bấm “Theo dõi” ở trang dự án để nhận thông báo khi có cập nhật.</p>
        <Link className="button button-outline" href="/du-an">Khám phá dự án</Link>
      </div>
    );
  }

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ul className="follow-list">
        {items.map((item) => {
          const status = STATUS_LABEL[item.campaign.status];
          const percent = percentOf(item);
          return (
            <li key={item.campaign.id}>
              <div className="follow-list-head">
                <Link href={`/du-an/${item.campaign.id}`}>{item.campaign.title}</Link>
                {status && <span className={`tag ${status.tone}`}>{status.label}</span>}
              </div>
              <ProgressBar value={Math.min(percent, 100)} label={`Đạt ${percent}% mục tiêu`} />
              <div className="follow-list-foot">
                <small className="hint">
                  {formatVnd(Number(item.campaign.currentAmount))} / {formatVnd(Number(item.campaign.goalAmount))} · {percent}%
                </small>
                <button
                  className="link-button"
                  type="button"
                  disabled={busyId === item.campaign.id}
                  onClick={() => unfollow(item.campaign.id)}
                >
                  Bỏ theo dõi<span className="sr-only"> {item.campaign.title}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
