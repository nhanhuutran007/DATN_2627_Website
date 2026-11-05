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
import { useDialog } from "@/components/ui/DialogProvider";
import { resolveMediaUrl } from "@/lib/api";
import {
  deleteUser,
  fetchAdminUserDetail,
  setUserRole,
  type AdminUserDetail,
  type AdminUserRole,
} from "@/lib/api/admin";
import type { ApiCampaignStatus } from "@/lib/api/campaigns";

const money = (value: number | string | null | undefined) => `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString("vi-VN") : "—");

const ROLE_OPTIONS: AdminUserRole[] = ["user", "campaign_owner", "admin"];

type UserDetailDialogProps = {
  userId: string;
  onClose: () => void;
  /** Tài khoản admin đang đăng nhập: không tự đổi vai trò/xóa chính mình. */
  currentUserId?: string;
  /** Gọi sau khi đổi vai trò hoặc xóa để trang tải lại danh sách. */
  onChanged?: (change: "role" | "deleted") => void;
};

/** Thông tin một tài khoản (vd. chủ dự án) để admin đánh giá trước khi duyệt. */
export function UserDetailDialog({ userId, onClose, currentUserId, onChanged }: UserDetailDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const dialog = useDialog();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState("");
  const [role, setRole] = useState<AdminUserRole | "">("");
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminUserDetail(userId)
      .then((loaded) => {
        if (cancelled) return;
        setDetail(loaded);
        setRole(loaded.user.role);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Không tải được thông tin người dùng."));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const user = detail?.user;
  const byStatus = Object.entries(detail?.campaigns.byStatus ?? {}) as Array<[ApiCampaignStatus, number]>;
  const isSelf = Boolean(currentUserId && currentUserId === userId);
  // Tài khoản đã có chiến dịch/ủng hộ thì server không cho xóa: báo trước thay vì để bấm rồi lỗi.
  const hasHistory = Boolean(detail && (detail.campaigns.total > 0 || detail.donations.count > 0));

  async function handleSaveRole() {
    if (!user || !role || role === user.role) return;
    const granting = role === "admin";
    const revoking = user.role === "admin";
    const confirmed = await dialog.confirm({
      title: granting ? "Cấp quyền quản trị" : "Đổi vai trò tài khoản",
      message: (
        <>
          <b>{user.name}</b>: {USER_ROLE_LABEL[user.role]} → <b>{USER_ROLE_LABEL[role]}</b>.{" "}
          {granting
            ? "Tài khoản này sẽ duyệt chiến dịch, hoàn tiền và xem dữ liệu cá nhân của mọi người dùng."
            : revoking
              ? "Tài khoản sẽ mất toàn bộ quyền quản trị ngay lập tức."
              : "Thay đổi có hiệu lực ngay."}{" "}
          Cần nhập mã xác minh gửi qua email.
        </>
      ),
      confirmLabel: granting ? "Cấp quyền" : "Đổi vai trò",
      tone: granting || revoking ? "danger" : "default",
    });
    if (!confirmed) return;
    setBusy(true);
    setActionMessage(null);
    try {
      const updated = await setUserRole(user.id, role);
      setDetail((current) => (current ? { ...current, user: { ...current.user, role: updated.role } } : current));
      setActionMessage({ tone: "success", text: `Đã đổi vai trò thành ${USER_ROLE_LABEL[updated.role]}.` });
      onChanged?.("role");
    } catch (err) {
      setRole(user.role);
      setActionMessage({ tone: "error", text: err instanceof Error ? err.message : "Không đổi được vai trò." });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    const confirmed = await dialog.confirm({
      title: "Xóa tài khoản",
      message: (
        <>
          Xóa vĩnh viễn tài khoản <b>{user.name}</b> ({user.email}). Chỉ áp dụng cho tài khoản chưa có hoạt động;
          thao tác không hoàn tác được và cần nhập mã xác minh gửi qua email.
        </>
      ),
      confirmLabel: "Xóa tài khoản",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusy(true);
    setActionMessage(null);
    try {
      await deleteUser(user.id);
      onChanged?.("deleted");
      onClose();
    } catch (err) {
      setActionMessage({ tone: "error", text: err instanceof Error ? err.message : "Không xóa được tài khoản." });
      setBusy(false);
    }
  }

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

      {user && (
        <footer className="review-foot user-manage-foot">
          {isSelf ? (
            <span className="table-muted">Đây là tài khoản của bạn: nhờ quản trị viên khác đổi vai trò.</span>
          ) : (
            <>
              <div className="user-manage-role">
                <label htmlFor="user-role-select">Vai trò</label>
                <select
                  id="user-role-select"
                  value={role}
                  disabled={busy}
                  onChange={(event) => setRole(event.target.value as AdminUserRole)}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{USER_ROLE_LABEL[option]}</option>
                  ))}
                </select>
                <button
                  className="button button-outline button-sm"
                  type="button"
                  disabled={busy || !role || role === user.role}
                  onClick={handleSaveRole}
                >
                  Lưu vai trò
                </button>
              </div>
              <div className="admin-actions">
                <button
                  type="button"
                  disabled={busy || hasHistory || user.role === "admin"}
                  title={
                    user.role === "admin"
                      ? "Thu quyền quản trị trước khi xóa"
                      : hasHistory
                        ? "Tài khoản đã có chiến dịch hoặc giao dịch: hãy khóa thay vì xóa để giữ lịch sử"
                        : undefined
                  }
                  onClick={handleDelete}
                >
                  Xóa tài khoản
                </button>
              </div>
            </>
          )}
          {actionMessage && (
            <p
              className={actionMessage.tone === "error" ? "form-error user-manage-message" : "hint user-manage-message"}
              role={actionMessage.tone === "error" ? "alert" : "status"}
            >
              {actionMessage.text}
            </p>
          )}
          {!isSelf && hasHistory && user.role !== "admin" && (
            <p className="table-muted user-manage-message">
              Tài khoản đã có chiến dịch hoặc giao dịch nên không xóa được — dùng “Khóa tài khoản” để giữ lịch sử.
            </p>
          )}
        </footer>
      )}
    </dialog>
  );
}
