"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import { trackBehaviorEvent } from "@/lib/api/ai";
import { fetchFollowStatus, followCampaign, unfollowCampaign, type FollowStatus } from "@/lib/api/follows";
import { useIsAuthenticated } from "@/lib/auth";

type FollowCampaignButtonProps = {
  campaignId: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng thử lại.";
}

/** Theo dõi để nhận thông báo khi chiến dịch có cập nhật, đạt mốc hoặc đổi trạng thái. */
export function FollowCampaignButton({ campaignId }: FollowCampaignButtonProps) {
  const loggedIn = useIsAuthenticated();
  const [status, setStatus] = useState<FollowStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Tải lại khi đăng nhập/đăng xuất để biết người này đã theo dõi chưa.
  useEffect(() => {
    let active = true;
    fetchFollowStatus(campaignId)
      .then((next) => {
        if (active) setStatus(next);
      })
      .catch(() => {
        if (active) setStatus(null);
      });
    return () => {
      active = false;
    };
  }, [campaignId, loggedIn]);

  const toggle = async () => {
    if (!status) return;
    setBusy(true);
    setError("");
    try {
      const next = status.following ? await unfollowCampaign(campaignId) : await followCampaign(campaignId);
      setStatus(next);
      if (next.following) void trackBehaviorEvent(campaignId, "follow");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const count = status ? status.followerCount.toLocaleString("vi-VN") : "…";

  return (
    <div className="follow-box">
      {loggedIn ? (
        <button
          className={`button button-outline button-block${status?.following ? " is-following" : ""}`}
          type="button"
          aria-pressed={status?.following ?? false}
          disabled={busy || !status}
          onClick={toggle}
        >
          <Icon name={status?.following ? "check" : "bell"} size={16} />
          {status?.following ? "Đang theo dõi" : "Theo dõi"}
          <span className="follow-count" aria-label={`${count} người theo dõi`}>{count}</span>
        </button>
      ) : (
        <Link className="button button-outline button-block" href={`/dang-nhap?next=/du-an/${campaignId}`}>
          <Icon name="bell" size={16} /> Đăng nhập để theo dõi
          <span className="follow-count" aria-label={`${count} người theo dõi`}>{count}</span>
        </Link>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
