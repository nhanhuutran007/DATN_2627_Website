import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { ApiError } from "@/lib/api";
import { imageByCategory, type ApiCampaignStatus } from "@/lib/api/campaigns";
import { unfollowCampaign, type FollowedCampaign } from "@/lib/api/follows";
import { coverFor } from "@/lib/covers";
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

type MyFollowsProps = {
  items: FollowedCampaign[];
  /** Gọi sau khi bỏ theo dõi thành công. */
  onRemove: (campaignId: string) => void;
};

/** Các chiến dịch người dùng đang theo dõi (nhận thông báo cập nhật). */
export function MyFollows({ items, onRemove }: MyFollowsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const unfollow = async (campaignId: string) => {
    setBusyId(campaignId);
    setError("");
    try {
      await unfollowCampaign(campaignId);
      onRemove(campaignId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không bỏ theo dõi được, vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="activity-empty">
        <p>Bấm “Theo dõi” ở trang dự án để nhận thông báo khi dự án có cập nhật, đạt mốc hoặc đổi trạng thái.</p>
        <Link className="button button-outline" href="/du-an">Khám phá dự án</Link>
      </div>
    );
  }

  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <ul className="activity-list">
        {items.map((item) => {
          const status = STATUS_LABEL[item.campaign.status];
          const percent = percentOf(item);
          const cover = coverFor({
            image: imageByCategory(item.campaign.category),
            imageUrl: item.campaign.imageUrl ?? undefined,
            title: item.campaign.title,
          });
          return (
            <li className="activity-item" key={item.campaign.id}>
              <span className="activity-thumb" aria-hidden="true">
                <Image src={cover.src} alt="" fill sizes="72px" unoptimized={!cover.illustrative} />
              </span>
              <div className="activity-body">
                <p className="activity-title">
                  <Link href={`/du-an/${item.campaign.id}`}>{item.campaign.title}</Link>
                </p>
                <ProgressBar value={Math.min(percent, 100)} label={`Đạt ${percent}% mục tiêu`} />
                <p className="activity-meta">
                  <b className="num">{formatVnd(Number(item.campaign.currentAmount))}</b> / {formatVnd(Number(item.campaign.goalAmount))} · {percent}%
                </p>
              </div>
              <div className="activity-side">
                {status && <span className={`tag ${status.tone}`}>{status.label}</span>}
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
