"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
  ORGANIZATION_STATUS_LABEL,
  ORGANIZATION_TYPE_LABEL,
  fetchMyOrganizations,
  type Organization,
} from "@/lib/api/organizations";
import { useAuthUser, useRedirectAdmin } from "@/lib/auth";
import { formatVnd } from "@/lib/format";
import { OrganizationForm } from "./OrganizationForm";
import { OrganizationLogo } from "./OrganizationLogo";

/** Lời giải thích cho người đại diện theo trạng thái hồ sơ. */
const STATUS_HINT: Record<Organization["status"], string> = {
  pending: "Hồ sơ đang chờ quản trị viên đối chiếu giấy tờ. Bạn sẽ nhận thông báo khi có kết quả.",
  needs_info: "Quản trị viên cần bạn bổ sung thông tin. Sửa hồ sơ theo ghi chú bên dưới rồi lưu để gửi xét lại.",
  verified: "Tổ chức đã hiển thị công khai và mọi người có thể gây quỹ cho tổ chức.",
  rejected: "Hồ sơ chưa được chấp nhận. Bạn có thể sửa theo ghi chú và gửi xét lại.",
  suspended: "Trang tổ chức đang tạm ẩn và không nhận chiến dịch mới. Liên hệ quản trị viên nếu cần giải trình.",
};

/** Hồ sơ tổ chức mà người dùng đang đại diện: trạng thái xác minh, ghi chú của admin và sửa hồ sơ. */
export function MyOrganizations() {
  const user = useAuthUser();
  const redirecting = useRedirectAdmin();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Organization[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState(searchParams.get("da-gui") ? "Đã gửi hồ sơ. Quản trị viên sẽ xem xét và thông báo kết quả cho bạn." : "");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyOrganizations()
      .then((list) => {
        if (cancelled) return;
        setItems(list);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (redirecting) return null;

  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="shield" size={28} /></span>
        <h1>Đăng nhập để xem tổ chức của bạn</h1>
        <p>Theo dõi trạng thái xác minh và cập nhật hồ sơ tổ chức bạn đại diện.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href="/dang-nhap?next=/to-chuc/cua-toi">Đăng nhập</Link>
        </div>
      </main>
    );
  }

  const saved = (updated: Organization) => {
    setItems((list) => list.map((item) => (item.id === updated.id ? updated : item)));
    setEditingId(null);
    setNotice(updated.status === "pending" ? "Đã lưu và gửi hồ sơ để xét lại." : "Đã lưu thay đổi.");
  };

  return (
    <main className="org-page">
      <div className="org-page-inner">
        <div className="org-page-head">
          <div>
            <h1>Tổ chức của tôi</h1>
            <p className="org-lead">Hồ sơ tổ chức bạn đại diện và trạng thái xác minh.</p>
          </div>
          <Link className="button button-outline" href="/to-chuc/dang-ky">Đăng ký tổ chức khác</Link>
        </div>

        {notice && <p className="form-notice" role="status">{notice}</p>}
        {state === "loading" && <p className="hint" role="status">Đang tải…</p>}
        {state === "error" && <p className="form-error" role="alert">Không tải được danh sách tổ chức.</p>}
        {state === "ready" && items.length === 0 && (
          <div className="activity-empty">
            <p>Bạn chưa đăng ký tổ chức nào.</p>
            <Link className="button button-primary" href="/to-chuc/dang-ky">Đăng ký tổ chức</Link>
          </div>
        )}

        <ul className="org-mine-list">
          {items.map((organization) => {
            const status = ORGANIZATION_STATUS_LABEL[organization.status];
            const editing = editingId === organization.id;
            return (
              <li className="org-mine-item" key={organization.id}>
                <div className="org-mine-head">
                  <OrganizationLogo organization={organization} />
                  <div className="org-mine-title">
                    <h2>{organization.name}</h2>
                    <p>{ORGANIZATION_TYPE_LABEL[organization.type]} · {organization.province}</p>
                  </div>
                  <span className={`tag ${status.tone}`}>{status.label}</span>
                </div>
                <p className="org-mine-hint">{STATUS_HINT[organization.status]}</p>
                {organization.reviewNotes && organization.status !== "verified" && (
                  <p className="own-reason"><b>Ghi chú của quản trị viên:</b> {organization.reviewNotes}</p>
                )}
                <dl className="org-mine-facts">
                  <div><dt>Số giấy phép</dt><dd>{organization.registrationNumber}</dd></div>
                  <div><dt>Gửi lúc</dt><dd>{new Date(organization.submittedAt).toLocaleString("vi-VN")}</dd></div>
                  {organization.verifiedAt && <div><dt>Xác minh ngày</dt><dd>{new Date(organization.verifiedAt).toLocaleDateString("vi-VN")}</dd></div>}
                  {organization.totalRaised !== undefined && <div><dt>Đã huy động</dt><dd>{formatVnd(organization.totalRaised)}</dd></div>}
                </dl>
                <div className="own-actions">
                  {organization.status === "verified" && (
                    <Link className="button button-outline button-sm" href={`/to-chuc/${organization.slug}`}>Xem trang công khai</Link>
                  )}
                  <button
                    className="button button-ghost button-sm"
                    type="button"
                    aria-expanded={editing}
                    onClick={() => setEditingId(editing ? null : organization.id)}
                  >
                    {editing ? "Đóng" : ["needs_info", "rejected"].includes(organization.status) ? "Sửa và gửi lại" : "Sửa hồ sơ"}
                  </button>
                </div>
                {editing && (
                  <div className="org-mine-edit">
                    <OrganizationForm organization={organization} representativeName={user.name} onSaved={saved} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
