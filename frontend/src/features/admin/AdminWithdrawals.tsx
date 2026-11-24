"use client";

import { useCallback, useEffect, useState } from "react";

import { ALL_TIME, dateRangeParams, DateRangeFilter, hasDateRange, type DateRange } from "@/components/ui/DateRangeFilter";
import { useDialog } from "@/components/ui/DialogProvider";
import { PAGE_SIZE, Pagination } from "@/components/ui/Pagination";
import { useManualRefundDialog } from "@/features/admin/ManualRefundDialog";
import { ApiError } from "@/lib/api";
import {
  approveWithdrawal,
  fetchAdminWithdrawals,
  rejectWithdrawal,
  WITHDRAWAL_STATUS_LABEL,
  type Withdrawal,
  type WithdrawalStatus,
} from "@/lib/api/wallet";
import { formatDateTime, formatVnd } from "@/lib/format";

const COUNT_LABEL: Record<WithdrawalStatus | "", string> = {
  pending: "yêu cầu rút chờ chuyển khoản",
  completed: "yêu cầu đã chuyển khoản",
  rejected: "yêu cầu bị từ chối",
  cancelled: "yêu cầu người dùng đã hủy",
  "": "yêu cầu rút tiền",
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Hàng chờ rút tiền ví: admin chuyển khoản tay từ tài khoản Góp Mầm (SePay không có API chi)
 * rồi duyệt kèm mã giao dịch và ảnh chứng từ; hoặc từ chối kèm lý do (tiền trả về ví).
 */
export function AdminWithdrawals() {
  const dialog = useDialog();
  const [manualDialog, openManual] = useManualRefundDialog();
  const [status, setStatus] = useState<WithdrawalStatus | "">("pending");
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async (nextStatus: WithdrawalStatus | "", nextPage: number, nextRange: DateRange, nextQuery: string) => {
    setLoading(true);
    try {
      const result = await fetchAdminWithdrawals(nextStatus || undefined, nextPage * PAGE_SIZE, PAGE_SIZE, {
        q: nextQuery.trim() || undefined,
        ...dateRangeParams(nextRange),
      });
      setItems(result.items);
      setTotal(result.total);
      setPage(nextPage);
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không tải được yêu cầu rút tiền.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminWithdrawals("pending", 0, PAGE_SIZE)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err: unknown) => {
        if (active) setNotice({ tone: "error", text: errorText(err, "Không tải được yêu cầu rút tiền.") });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const approve = async (item: Withdrawal) => {
    const amount = formatVnd(item.amount);
    const result = await openManual({
      title: "Chi tiền rút ví",
      amount,
      notesLabel: "Ghi chú (lưu nhật ký)",
      confirmLabel: "Đã chuyển khoản — xác nhận",
      bank: { bankName: item.bankName, bankAccountNumber: item.bankAccountNumber, bankAccountName: item.bankAccountName },
      transferCode: null,
    });
    if (!result) return;
    setBusy(item.id);
    setNotice(null);
    try {
      await approveWithdrawal(item.id, {
        adminNotes: result.notes,
        transferReference: result.transferReference,
        ...(result.proofMediaId ? { proofMediaId: result.proofMediaId } : {}),
      });
      await load(status, page, range, query);
      setNotice({ tone: "ok", text: `Đã ghi nhận chuyển ${amount} cho ${item.user?.name ?? "người dùng"} (mã ${result.transferReference}).` });
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không duyệt được yêu cầu.") });
    } finally {
      setBusy(null);
    }
  };

  const reject = async (item: Withdrawal) => {
    const result = await dialog.prompt({
      title: "Từ chối yêu cầu rút tiền",
      message: <>Số tiền <b>{formatVnd(item.amount)}</b> sẽ trả lại số dư ví của người dùng, kèm lý do bạn nhập.</>,
      label: "Lý do (gửi cho người dùng)",
      placeholder: "Vd. Tên chủ tài khoản không khớp tên tài khoản Góp Mầm",
      minLength: 5,
      maxLength: 500,
      confirmLabel: "Từ chối",
      tone: "danger",
    });
    if (!result) return;
    setBusy(item.id);
    setNotice(null);
    try {
      await rejectWithdrawal(item.id, result.value.trim());
      await load(status, page, range, query);
      setNotice({ tone: "ok", text: `Đã từ chối và trả ${formatVnd(item.amount)} về ví người dùng.` });
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không từ chối được yêu cầu.") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {manualDialog}
      <section className="admin-card risk-card" id="rut-tien">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Tài chính</p>
            <h2>{total} {COUNT_LABEL[status]}</h2>
          </div>
        </div>
        <form
          className="admin-filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            void load(status, 0, range, query);
          }}
        >
          <input
            className="filter-button admin-filter-search"
            type="search"
            placeholder="Tìm theo tên, email hoặc chủ tài khoản…"
            aria-label="Tìm yêu cầu rút tiền"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            className="filter-button"
            aria-label="Lọc theo trạng thái"
            value={status}
            onChange={(event) => {
              const next = event.target.value as WithdrawalStatus | "";
              setStatus(next);
              void load(next, 0, range, query);
            }}
          >
            <option value="pending">Chờ chuyển khoản</option>
            <option value="completed">Đã chuyển khoản</option>
            <option value="rejected">Bị từ chối</option>
            <option value="cancelled">Người dùng đã hủy</option>
            <option value="">Tất cả trạng thái</option>
          </select>
          <DateRangeFilter
            label="Lọc theo ngày gửi yêu cầu"
            value={range}
            onChange={(next) => {
              setRange(next);
              void load(status, 0, next, query);
            }}
          />
          <button className="button button-primary admin-filter-submit" type="submit">Tìm</button>
          {(hasDateRange(range) || query.trim()) && (
            <button
              className="link-inline"
              type="button"
              onClick={() => {
                setRange(ALL_TIME);
                setQuery("");
                void load(status, 0, ALL_TIME, "");
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </form>
        {notice && (
          <p className={notice.tone === "ok" ? "admin-notice" : "admin-notice error"} role={notice.tone === "ok" ? "status" : "alert"}>
            {notice.text}
          </p>
        )}
        <div className="risk-list">
          {loading ? (
            <article><p className="table-muted" role="status">Đang tải…</p></article>
          ) : items.length === 0 ? (
            <article>
              <p className="table-muted">
                {hasDateRange(range) || query.trim()
                  ? "Không có yêu cầu nào khớp bộ lọc."
                  : status === "pending"
                    ? "Không còn yêu cầu rút tiền nào đang chờ."
                    : "Chưa có yêu cầu nào ở trạng thái này."}
              </p>
            </article>
          ) : (
            items.map((item) => {
              const label = WITHDRAWAL_STATUS_LABEL[item.status];
              const tone = item.status === "pending" ? "pending" : item.status === "completed" ? "resolved" : "dismissed";
              return (
                <article key={item.id}>
                  <span className={`report-status ${tone}`}>{label.label}</span>
                  <div>
                    <div className="request-head">
                      <h3>{item.user?.name ?? "Người dùng"}</h3>
                      <strong className="request-amount num">{formatVnd(item.amount)}</strong>
                    </div>
                    <ul className="request-meta">
                      <li><span>Gửi lúc</span> {formatDateTime(item.createdAt)}</li>
                      {item.user?.email && <li><span>Email</span> {item.user.email}</li>}
                    </ul>
                    <div className="refund-bank-info">
                      <span className="refund-manual-tag">Chuyển khoản tới</span>
                      <dl className="bank-grid">
                        <div><dt>Ngân hàng</dt><dd>{item.bankName}</dd></div>
                        <div><dt>Số tài khoản</dt><dd className="mono">{item.bankAccountNumber}</dd></div>
                        <div><dt>Chủ tài khoản</dt><dd>{item.bankAccountName}</dd></div>
                      </dl>
                    </div>
                    {item.transferReference && (
                      <small>
                        <b>Mã giao dịch:</b> <span className="mono">{item.transferReference}</span>
                        {item.proofUrl && <> · <a href={item.proofUrl} target="_blank" rel="noreferrer">chứng từ</a></>}
                      </small>
                    )}
                    {item.adminNotes && <small><b>Ghi chú quản trị:</b> {item.adminNotes}</small>}
                  </div>
                  <div className="risk-actions">
                    {item.status === "pending" && (
                      <>
                        <button className="resolve" type="button" disabled={busy === item.id} onClick={() => approve(item)}>
                          Đã chuyển khoản
                        </button>
                        <button type="button" disabled={busy === item.id} onClick={() => reject(item)}>Từ chối</button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
        <Pagination page={page} total={total} onChange={(next) => void load(status, next, range, query)} />
      </section>
    </>
  );
}
