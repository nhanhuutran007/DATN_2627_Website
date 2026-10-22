"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { PAGE_SIZE, Pagination } from "@/components/ui/Pagination";
import { ApiError } from "@/lib/api";
import { fetchAuditLogs, type AuditLogEntry, type AuditLogQuery } from "@/lib/api/admin";
import { formatDateTime } from "@/lib/format";

import {
  AUDIT_ACTION_LABEL,
  AUDIT_ENTITY_LABEL,
  AUDIT_FIELD_LABEL,
  AUDIT_GROUP_LABEL,
  auditGroup,
  type AuditGroup,
} from "./auditLabels";

type Filters = {
  group: AuditGroup | "";
  entity: string;
  from: string;
  to: string;
  hideSessions: boolean;
  actor: { id: string; label: string } | null;
};

const DEFAULT_FILTERS: Filters = { group: "", entity: "", from: "", to: "", hideSessions: true, actor: null };

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

function toQuery(filters: Filters, page: number): AuditLogQuery {
  return {
    group: filters.group || undefined,
    entity: filters.entity || undefined,
    userId: filters.actor?.id,
    from: filters.from || undefined,
    to: filters.to || undefined,
    hideSessions: filters.hideSessions ? "true" : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
}

/** Giá trị trong chi tiết thay đổi: mảng nối bằng mũi tên (vd. thứ tự), object rút gọn JSON. */
function fieldValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (Array.isArray(value)) return value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(" → ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ChangeTable({ entry }: { entry: AuditLogEntry }) {
  const before = entry.oldValues ?? {};
  const after = entry.newValues ?? {};
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const hasBefore = Object.keys(before).length > 0;
  return (
    <div className="audit-changes">
      <table>
        <thead>
          <tr><th>Trường</th>{hasBefore && <th>Trước</th>}<th>{hasBefore ? "Sau" : "Giá trị"}</th></tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const changed = hasBefore && fieldValue(before[field]) !== fieldValue(after[field]);
            return (
              <tr key={field}>
                <td title={field}>{AUDIT_FIELD_LABEL[field] ?? field}</td>
                {hasBefore && <td className={changed ? "audit-old" : undefined}>{fieldValue(before[field])}</td>}
                <td className={changed ? "audit-new" : undefined}>{fieldValue(after[field])}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {entry.userAgent && <p className="table-muted">Thiết bị: {entry.userAgent}</p>}
    </div>
  );
}

/** Nhật ký kiểm toán: lọc theo nhóm, đối tượng, người thực hiện, khoảng ngày; hiển thị tên thay cho mã. */
export function AuditLogViewer({ onShowUser }: { onShowUser?: (userId: string) => void }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Gọi API rồi cập nhật state trong callback (không setState đồng bộ để dùng được trong effect lần đầu).
  const fetchPage = useCallback(
    (next: Filters, nextPage: number) =>
      fetchAuditLogs(toQuery(next, nextPage))
        .then((result) => {
          setItems(result.items);
          setTotal(result.total);
          setPage(nextPage);
          setExpanded(null);
          setError(null);
        })
        .catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Không tải được nhật ký kiểm toán"))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void fetchPage(DEFAULT_FILTERS, 0);
  }, [fetchPage]);

  const load = (next: Filters, nextPage: number) => {
    setLoading(true);
    return fetchPage(next, nextPage);
  };

  const apply = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    void load(next, 0);
  };

  const filtered =
    filters.group || filters.entity || filters.from || filters.to || filters.actor || !filters.hideSessions;

  return (
    <section className="admin-card admin-table-card" id="nhat-ky-kiem-toan">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Truy vết thay đổi</p>
          <h2>{loading && items.length === 0 ? "Nhật ký kiểm toán" : `${total.toLocaleString("vi-VN")} bản ghi`}</h2>
        </div>
      </div>

      <div className="admin-filter-bar">
        <select
          className="filter-button"
          aria-label="Lọc theo nhóm hành động"
          value={filters.group}
          onChange={(event) => apply({ group: event.target.value as Filters["group"] })}
        >
          <option value="">Mọi nhóm hành động</option>
          {(Object.keys(AUDIT_GROUP_LABEL) as AuditGroup[]).map((group) => (
            <option key={group} value={group}>{AUDIT_GROUP_LABEL[group]}</option>
          ))}
        </select>
        <select
          className="filter-button"
          aria-label="Lọc theo đối tượng"
          value={filters.entity}
          onChange={(event) => apply({ entity: event.target.value })}
        >
          <option value="">Mọi đối tượng</option>
          {Object.entries(AUDIT_ENTITY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div className="admin-filter-range recon-dates">
          <input className="filter-button" type="date" aria-label="Từ ngày" value={filters.from} max={filters.to || undefined} onChange={(event) => apply({ from: event.target.value })} />
          <span aria-hidden="true">–</span>
          <input className="filter-button" type="date" aria-label="Đến ngày" value={filters.to} min={filters.from || undefined} onChange={(event) => apply({ to: event.target.value })} />
        </div>
        <label className="audit-toggle">
          <input type="checkbox" checked={filters.hideSessions} onChange={(event) => apply({ hideSessions: event.target.checked })} />
          Ẩn đăng nhập/đăng xuất
        </label>
        {filters.actor && (
          <span className="audit-chip">
            Người thực hiện: <b>{filters.actor.label}</b>
            <button type="button" aria-label="Bỏ lọc người thực hiện" onClick={() => apply({ actor: null })}>×</button>
          </span>
        )}
        {filtered && (
          <button className="link-inline" type="button" onClick={() => apply(DEFAULT_FILTERS)}>Xóa bộ lọc</button>
        )}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="table-scroll">
        <table>
          <thead><tr><th>Thời gian</th><th>Hành động</th><th>Đối tượng</th><th>Người thực hiện</th><th>IP</th><th /></tr></thead>
          <tbody>
            {items.map((entry) => {
              const group = auditGroup(entry.action);
              const hasChanges = Boolean(entry.oldValues || entry.newValues);
              const isOpen = expanded === entry.id;
              const actorLabel = entry.actor?.name ?? (entry.userId ? `Tài khoản ${shortId(entry.userId)}` : "Hệ thống");
              return (
                <Fragment key={entry.id}>
                  <tr>
                    <td className="audit-time">{formatDateTime(entry.createdAt)}</td>
                    <td>
                      <span className={`audit-action audit-${group ?? "other"}`} title={entry.action}>
                        {AUDIT_ACTION_LABEL[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td>
                      {entry.entityLabel && entry.entity === "user" && entry.entityId && onShowUser ? (
                        <button className="link-inline audit-entity-name" type="button" title="Xem thông tin tài khoản" onClick={() => onShowUser(entry.entityId!)}>
                          {entry.entityLabel}
                        </button>
                      ) : entry.entityLabel ? (
                        <b className="audit-entity-name">{entry.entityLabel}</b>
                      ) : null}
                      <small className="audit-sub">
                        {AUDIT_ENTITY_LABEL[entry.entity] ?? entry.entity}
                        {entry.entityId && <> · <span className="mono">{shortId(entry.entityId)}</span></>}
                      </small>
                    </td>
                    <td>
                      {entry.userId ? (
                        <button
                          className="link-inline audit-entity-name"
                          type="button"
                          title="Chỉ xem thao tác của người này"
                          onClick={() => apply({ actor: { id: entry.userId!, label: actorLabel } })}
                        >
                          {actorLabel}
                        </button>
                      ) : (
                        <span className="table-muted">Hệ thống</span>
                      )}
                      {entry.actor?.email && <small className="audit-sub">{entry.actor.email}</small>}
                    </td>
                    <td className="mono">{entry.ipAddress ?? "—"}</td>
                    <td>
                      {hasChanges && (
                        <button className="audit-expand" type="button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : entry.id)}>
                          {isOpen ? "Thu gọn" : "Chi tiết"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="table-detail-row">
                      <td colSpan={6}><ChangeTable entry={entry} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6}><span className="table-muted">Không có bản ghi nào khớp bộ lọc.</span></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} onChange={(next) => void load(filters, next)} disabled={loading} />
      <p className="risk-footnote">
        <Icon name="shield" size={15} /> Nhật ký chỉ ghi thêm, không thể sửa/xóa — dùng để truy vết duyệt hồ sơ, thanh toán, đăng nhập và hành động quản trị.
        Bấm tên người thực hiện để chỉ xem thao tác của người đó.
      </p>
    </section>
  );
}
