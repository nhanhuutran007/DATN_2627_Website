"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_TONE,
  RISK_LEVEL_LABEL,
  USER_ROLE_LABEL,
  USER_STATUS_LABEL,
} from "@/features/admin/labels";
import { resolveMediaUrl } from "@/lib/api";
import { fetchAdminUserDetail, type AdminUserDetail } from "@/lib/api/admin";
import type { ApiCampaignStatus } from "@/lib/api/campaigns";

const money = (value: number | string | null | undefined) => `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString("vi-VN") : "—");

/** Thông tin một tài khoản (vd. chủ dự án) để admin đánh giá trước khi duyệt. */
export function UserDetailDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminUserDetail(userId)
      .then((loaded) => !cancelled && setDetail(loaded))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Không tải được thông tin người dùng."));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const user = detail?.user;
  const byStatus = Object.entries(detail?.campaigns.byStatus ?? {}) as Array<[ApiCampaignStatus, number]>;

  return (
    <dialog
      ref={ref}
      className="app-dialog review-dialog user-detail-dialog"
      aria-labelledby="user-detail-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="review-head">
        <div>
          <p className="eyebrow">Thông tin tài khoản</p>
          <h2 id="user-detail-title">{user?.name ?? "Đang tải…"}</h2>
        </div>
        <button className="review-close" type="button" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </header>

      <div className="review-body">
        {error && <p className="form-error" role="alert">{error}</p>}
        {!detail && !error && <p className="hint">Đang tải thông tin…</p>}

        {detail && user && (
          <>
            <div className="user-detail-profile">
              <span className="user-detail-avatar" aria-hidden="true">
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- ảnh đại diện do người dùng tải lên
                  <img src={resolveMediaUrl(user.avatar)} alt="" />
                ) : (
                  user.name.trim().charAt(0).toUpperCase()
                )}
              </span>
              <div>
                <div className="user-detail-tags">
                  <span className="tag">{USER_ROLE_LABEL[user.role]}</span>
                  <span className={`table-status ${user.status === "active" ? "success" : user.status === "banned" ? "failed" : "changes"}`}>
                    {USER_STATUS_LABEL[user.status]}
                  </span>
                  {user.emailVerified ? (
                    <span className="tag tag-green">Email đã xác minh</span>
                  ) : (
                    <span className="tag tag-amber">Email chưa xác minh</span>
                  )}
                </div>
                {user.bio && <p>{user.bio}</p>}
              </div>
            </div>

            <dl className="review-facts">
              <div><dt>Email</dt><dd>{user.email}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{user.phone || "—"}</dd></div>
              <div><dt>Tổ chức</dt><dd>{user.organization || "—"}</dd></div>
              <div><dt>Ngày tham gia</dt><dd>{date(user.createdAt)}</dd></div>
              <div>
                <dt>Chiến dịch đã tạo</dt>
                <dd>
                  {detail.campaigns.total}
                  {byStatus.length > 0 && (
                    <small>{byStatus.map(([status, count]) => `${count} ${CAMPAIGN_STATUS_LABEL[status].toLowerCase()}`).join(" · ")}</small>
                  )}
                </dd>
              </div>
              <div><dt>Tổng đã huy động</dt><dd>{money(detail.campaigns.raisedAmount)}</dd></div>
              <div>
                <dt>Đã ủng hộ</dt>
                <dd>{money(detail.donations.amount)}<small>{detail.donations.count} giao dịch thành công</small></dd>
              </div>
            </dl>

            {detail.openRisks.length > 0 && (
              <section>
                <h3>Cảnh báo rủi ro đang mở ({detail.openRisks.length})</h3>
                <ul className="review-tiers">
                  {detail.openRisks.map((alert) => (
                    <li key={alert.id}>
                      <span className={`risk-level ${alert.level}`}>{RISK_LEVEL_LABEL[alert.level]}</span>{" "}
                      <b>{alert.entityType === "user" ? "Tài khoản" : "Chiến dịch"}:</b> {alert.entityName}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h3>Chiến dịch gần đây</h3>
              {detail.campaigns.recent.length === 0 ? (
                <p className="table-muted">Chưa tạo chiến dịch nào.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">Chiến dịch</th>
                        <th scope="col" className="num">Đã huy động / mục tiêu</th>
                        <th scope="col">Kết thúc</th>
                        <th scope="col">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.campaigns.recent.map((campaign) => (
                        <tr key={campaign.id}>
                          <td>
                            <a href={`/du-an/${campaign.id}`} target="_blank" rel="noreferrer">{campaign.title}</a>
                            <small className="table-muted"> · {campaign.category}</small>
                          </td>
                          <td className="num">{money(campaign.currentAmount)} / {money(campaign.goalAmount)}</td>
                          <td className="nowrap">{date(campaign.endDate)}</td>
                          <td>
                            <span className={`table-status ${CAMPAIGN_STATUS_TONE[campaign.status]}`}>{CAMPAIGN_STATUS_LABEL[campaign.status]}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {detail.campaigns.total > detail.campaigns.recent.length && (
                <p className="table-muted">Hiển thị {detail.campaigns.recent.length}/{detail.campaigns.total} chiến dịch mới nhất.</p>
              )}
            </section>
          </>
        )}
      </div>
    </dialog>
  );
}
