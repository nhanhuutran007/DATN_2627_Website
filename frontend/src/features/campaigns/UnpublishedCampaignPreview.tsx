"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchCampaign, reviewStatusLabel, type ApiCampaign, type ApiCampaignStatus } from "@/lib/api/campaigns";
import { useAuthUser, useIsAuthenticated } from "@/lib/auth";
import { formatVnd } from "@/lib/format";
import { sanitizeRichText } from "@/lib/rich-text.server";

const EDITABLE: ApiCampaignStatus[] = ["draft", "rejected", "needs_info"];

type Loaded = { id: string; campaign: ApiCampaign | null };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("vi-VN");
}

/**
 * Máy chủ chỉ trả hồ sơ chưa phát hành (nháp, chờ duyệt, cần bổ sung, bị từ chối) cho chủ dự án và admin,
 * mà trang dự án render ở server không có token, nên bản xem trước tải lại ở trình duyệt kèm phiên đăng nhập.
 * Người khác (hoặc ID không tồn tại) thấy trang "Không tìm thấy dự án".
 */
export function UnpublishedCampaignPreview({ id }: { id: string }) {
  const authenticated = useIsAuthenticated();
  const user = useAuthUser();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    fetchCampaign(id)
      .then((campaign) => !cancelled && setLoaded({ id, campaign }))
      .catch(() => !cancelled && setLoaded({ id, campaign: null }));
    return () => {
      cancelled = true;
    };
  }, [authenticated, id]);

  const current = loaded?.id === id ? loaded : null;
  if (authenticated && !current) {
    return (
      <main className="container status-page" aria-busy="true">
        <p>Đang tải hồ sơ…</p>
      </main>
    );
  }

  const campaign = current?.campaign ?? null;
  if (!authenticated || !campaign) {
    return (
      <main className="container status-page">
        <div>
          <p className="status-code num" aria-hidden="true">404</p>
          <h1>Không tìm thấy dự án</h1>
          <p>Dự án không tồn tại, đã được gỡ hoặc chưa được công khai.</p>
          <div className="status-actions">
            <Link className="button button-primary" href="/du-an">Khám phá dự án</Link>
            <Link className="button button-outline" href="/">Về trang chủ</Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwner = user?.id === campaign.ownerId;
  const canEdit = isOwner && EDITABLE.includes(campaign.status);
  const note = ["needs_info", "rejected"].includes(campaign.status) ? campaign.rejectionReason : null;

  return (
    <main className="container preview-page">
      <p className="preview-banner" role="status">
        <b>{reviewStatusLabel(campaign.status)}</b> · Bản xem trước: hồ sơ chưa công khai, chỉ chủ dự án và quản trị viên xem được.
      </p>
      {note && (
        <p className="preview-note">
          <b>Lý do từ quản trị viên:</b> {note}
        </p>
      )}
      <h1>{campaign.title}</h1>
      <p className="preview-meta">
        {campaign.category}
        {campaign.location ? ` · ${campaign.location}` : ""} · Mục tiêu {formatVnd(Number(campaign.goalAmount))}
        {campaign.endDate ? ` · Kết thúc ${formatDate(campaign.endDate)}` : ""}
      </p>
      {campaign.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- ảnh do người dùng tải lên, kích thước không cố định
        <img className="preview-cover" src={campaign.imageUrl} alt="" />
      )}
      {/* Giữ định dạng như trang dự án (bảng dự toán có khung, tiêu đề, danh sách), không làm phẳng thành chữ. */}
      <div className="preview-story detail-story rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(campaign.description) }} />
      <div className="status-actions">
        {canEdit && (
          <Link className="button button-primary" href={`/tao-chien-dich?sua=${encodeURIComponent(campaign.id)}`}>
            Sửa hồ sơ
          </Link>
        )}
        <Link className="button button-outline" href={isOwner ? "/dashboard" : "/admin/cho-duyet"}>
          {isOwner ? "Về trang quản lý" : "Về trang quản trị"}
        </Link>
      </div>
    </main>
  );
}
