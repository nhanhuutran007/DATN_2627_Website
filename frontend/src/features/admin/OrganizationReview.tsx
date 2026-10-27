"use client";

import { Fragment, useEffect, useState } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { PAGE_SIZE, Pagination } from "@/components/ui/Pagination";
import { ApiError, resolveMediaUrl } from "@/lib/api";
import {
  ORGANIZATION_STATUS_LABEL,
  ORGANIZATION_TYPE_LABEL,
  fetchAdminOrganizations,
  reviewOrganization,
  type Organization,
  type OrganizationStatus,
  type ReviewDecision,
} from "@/lib/api/organizations";
import { formatVnd } from "@/lib/format";

type StatusFilter = OrganizationStatus | "open" | "";

const STATUS_TONE: Record<OrganizationStatus, string> = {
  pending: "pending",
  needs_info: "changes",
  verified: "success",
  rejected: "failed",
  suspended: "failed",
};

/** Hành động được phép theo trạng thái (khớp ma trận ở backend). */
const ACTIONS: Record<OrganizationStatus, ReviewDecision[]> = {
  pending: ["verified", "needs_info", "rejected"],
  needs_info: ["verified", "rejected"],
  verified: ["suspended"],
  suspended: ["verified"],
  rejected: [],
};

const ACTION_LABEL: Record<ReviewDecision, string> = {
  verified: "Xác minh",
  needs_info: "Yêu cầu bổ sung",
  rejected: "Từ chối",
  suspended: "Tạm ngưng",
};

const MIN_NOTES = 10;

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function waiting(value: string): string {
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  return days <= 0 ? "hôm nay" : `${days} ngày trước`;
}

/** Hàng chờ xác minh tổ chức: admin xem giấy phép rồi quyết định, mọi quyết định ghi nhật ký kiểm toán. */
export function OrganizationReview() {
  const dialog = useDialog();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<Organization[] | null>(null);
  const [total, setTotal] = useState(0);
  const [requestKey, setRequestKey] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminOrganizations({ status, q: query, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err: unknown) => {
        if (active) setNotice({ tone: "error", text: errorText(err, "Không tải được danh sách tổ chức.") });
      });
    return () => {
      active = false;
    };
  }, [status, query, page, requestKey]);

  const decide = async (organization: Organization, decision: ReviewDecision) => {
    let notes: string | undefined;
    if (decision === "verified") {
      const ok = await dialog.confirm({
        title: organization.status === "suspended" ? "Mở lại tổ chức" : "Xác minh tổ chức",
        message: (
          <>
            Đã đối chiếu giấy phép <b>{organization.registrationNumber}</b> của <b>{organization.name}</b>? Tổ chức sẽ hiển thị công
            khai và nhận chiến dịch gây quỹ.
          </>
        ),
        confirmLabel: organization.status === "suspended" ? "Mở lại" : "Xác minh",
      });
      if (!ok) return;
    } else {
      const result = await dialog.prompt({
        title: `${ACTION_LABEL[decision]}: ${organization.name}`,
        message:
          decision === "needs_info"
            ? "Ghi rõ người đại diện cần bổ sung gì; họ sẽ nhận ghi chú này qua thông báo và email."
            : decision === "suspended"
              ? "Trang tổ chức sẽ tạm ẩn và không nhận chiến dịch mới; chiến dịch đang chạy giữ nguyên."
              : "Người đại diện sẽ thấy lý do; hồ sơ bị từ chối không còn giữ số giấy phép.",
        label: "Lý do (lưu nhật ký kiểm toán)",
        placeholder: decision === "needs_info" ? "VD: Ảnh giấy phép bị mờ, vui lòng chụp lại rõ số quyết định…" : "VD: Số giấy phép không khớp với cơ quan cấp…",
        minLength: MIN_NOTES,
        maxLength: 1000,
        confirmLabel: ACTION_LABEL[decision],
        tone: decision === "needs_info" ? undefined : "danger",
      });
      if (!result) return;
      notes = result.value.trim();
    }
    setBusy(organization.id);
    setNotice(null);
    try {
      await reviewOrganization(organization.id, decision, notes);
      setNotice({ tone: "ok", text: `Đã cập nhật “${organization.name}”: ${ORGANIZATION_STATUS_LABEL[decision].label.toLowerCase()}.` });
      setRequestKey((key) => key + 1);
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không lưu được quyết định.") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="admin-card admin-table-card" id="to-chuc">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Tổ chức</p>
          <h2>{items ? `${total.toLocaleString("vi-VN")} hồ sơ tổ chức` : "Xác minh tổ chức"}</h2>
        </div>
      </div>
      <div className="admin-policy">
        <Icon name="shield" size={22} />
        <p>
          <b>Đối chiếu giấy tờ trước khi xác minh</b>
          <span>Kiểm tra ảnh giấy phép khớp tên tổ chức, số giấy phép và cơ quan cấp. Chỉ tổ chức đã xác minh mới hiển thị công khai và nhận chiến dịch gây quỹ.</span>
        </p>
      </div>
      <form
        className="admin-filter-bar"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setQuery(q.trim());
        }}
      >
        <input
          className="filter-button admin-filter-search"
          type="search"
          placeholder="Tìm theo tên tổ chức…"
          aria-label="Tìm tổ chức"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <select
          className="filter-button"
          aria-label="Lọc theo trạng thái"
          value={status}
          onChange={(event) => {
            setPage(0);
            setStatus(event.target.value as StatusFilter);
          }}
        >
          <option value="open">Chờ xác minh</option>
          <option value="needs_info">Cần bổ sung</option>
          <option value="verified">Đã xác minh</option>
          <option value="suspended">Tạm ngưng</option>
          <option value="rejected">Đã từ chối</option>
          <option value="">Tất cả trạng thái</option>
        </select>
        <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
      </form>
      {notice && (
        <p className={notice.tone === "ok" ? "admin-notice" : "form-error"} role={notice.tone === "ok" ? "status" : "alert"}>{notice.text}</p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr><th>Tổ chức</th><th>Người đại diện</th><th>Giấy phép</th><th>Gửi lúc</th><th>Trạng thái</th><th /></tr>
          </thead>
          <tbody>
            {items === null ? (
              <tr><td colSpan={6}><span className="table-muted">Đang tải…</span></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6}><span className="table-muted">Không có hồ sơ nào khớp bộ lọc.</span></td></tr>
            ) : (
              items.map((organization) => {
                const open = expanded === organization.id;
                return (
                  <Fragment key={organization.id}>
                    <tr>
                      <td>
                        <b>{organization.name}</b>
                        <span className="table-cell-note">{ORGANIZATION_TYPE_LABEL[organization.type]} · {organization.province}</span>
                      </td>
                      <td>
                        {organization.representative?.name ?? "—"}
                        <span className="table-cell-note">{organization.representativeTitle}</span>
                      </td>
                      <td>
                        {organization.registrationNumber}
                        <span className="table-cell-note">{organization.issuedBy}</span>
                      </td>
                      <td>
                        {new Date(organization.submittedAt).toLocaleDateString("vi-VN")}
                        <span className="table-cell-note">{waiting(organization.submittedAt)}</span>
                      </td>
                      <td>
                        <span className={`table-status ${STATUS_TONE[organization.status]}`}>{ORGANIZATION_STATUS_LABEL[organization.status].label}</span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : organization.id)}>
                            {open ? "Thu gọn" : "Xem hồ sơ"}
                          </button>
                          {ACTIONS[organization.status].map((decision) => (
                            <button
                              key={decision}
                              className={decision === "rejected" || decision === "suspended" ? "table-danger-action" : undefined}
                              type="button"
                              disabled={busy === organization.id}
                              onClick={() => void decide(organization, decision)}
                            >
                              {organization.status === "suspended" && decision === "verified" ? "Mở lại" : ACTION_LABEL[decision]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="table-detail-row">
                        <td colSpan={6}>
                          <div className="org-review-detail">
                            <div>
                              <h3>Sứ mệnh</h3>
                              <p>{organization.mission}</p>
                              <dl className="org-mine-facts">
                                <div><dt>Email</dt><dd>{organization.email}</dd></div>
                                <div><dt>Điện thoại</dt><dd>{organization.phone}</dd></div>
                                <div><dt>Địa chỉ</dt><dd>{organization.address}, {organization.province}</dd></div>
                                {organization.website && (
                                  <div><dt>Website</dt><dd><a href={organization.website} target="_blank" rel="noopener noreferrer nofollow">{organization.website}</a></dd></div>
                                )}
                                {organization.representative?.email && <div><dt>Email người đại diện</dt><dd>{organization.representative.email}</dd></div>}
                                {organization.status === "verified" && (
                                  <div><dt>Đã huy động</dt><dd>{formatVnd(organization.totalRaised ?? 0)} · {organization.campaignCount ?? 0} chiến dịch</dd></div>
                                )}
                              </dl>
                              {organization.reviewNotes && <p className="own-reason"><b>Ghi chú lần xét trước:</b> {organization.reviewNotes}</p>}
                            </div>
                            {organization.documentUrl && (
                              <a className="org-review-doc" href={resolveMediaUrl(organization.documentUrl)} target="_blank" rel="noopener noreferrer">
                                {/* eslint-disable-next-line @next/next/no-img-element -- ảnh giấy phép do người dùng tải lên */}
                                <img src={resolveMediaUrl(organization.documentUrl)} alt={`Ảnh giấy phép của ${organization.name}`} />
                                <span>Mở ảnh giấy phép</span>
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} onChange={setPage} />
    </section>
  );
}
