import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { PAGE_SIZE, Pagination, pageSlice } from "@/components/ui/Pagination";
import { ApiError } from "@/lib/api";
import {
  approveRefund,
  downloadReconciliationCsv,
  fetchAdminRefunds,
  fetchReconciliation,
  REFUND_STATUS_LABEL,
  rejectRefund,
  type ReconciliationReport,
  type RefundRequest,
  type RefundRequestStatus,
} from "@/lib/api/finance";
import { formatVnd } from "@/lib/format";

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

type RefundFilters = { status: RefundRequestStatus | ""; q: string; minAmount: string; maxAmount: string };
const DEFAULT_REFUND_FILTERS: RefundFilters = { status: "pending", q: "", minAmount: "", maxAmount: "" };

/** Lọc bảng đối soát: tất cả, chỉ lệch sổ, chỉ khớp, hoặc có hoàn tiền trong kỳ. */
type ReconFilter = "" | "mismatch" | "match" | "refunded";

/** Số tiền nhập trong ô lọc (đồng); trống hoặc không hợp lệ thì bỏ qua. */
function amountParam(value: string): number | undefined {
  const amount = Number(value);
  return value.trim() === "" || !Number.isFinite(amount) || amount < 0 ? undefined : amount;
}
const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** Hoàn tiền (duyệt yêu cầu) hoặc đối soát cho trang quản trị, tùy `view`. */
export function AdminFinance({ view, onChanged }: { view: "refunds" | "reconciliation"; onChanged?: () => void }) {
  const dialog = useDialog();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [refundFilter, setRefundFilter] = useState<RefundFilters>(DEFAULT_REFUND_FILTERS);
  const [refundDraft, setRefundDraft] = useState<RefundFilters>(DEFAULT_REFUND_FILTERS);
  const [reconQuery, setReconQuery] = useState("");
  const [reconFilter, setReconFilter] = useState<ReconFilter>("");
  const [refundPage, setRefundPage] = useState(0);
  const [refundTotal, setRefundTotal] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadRefunds = useCallback(async (filters: RefundFilters, page: number) => {
    const minAmount = amountParam(filters.minAmount);
    const maxAmount = amountParam(filters.maxAmount);
    if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
      setNotice("Số tiền \"từ\" không được lớn hơn số tiền \"đến\"");
      return;
    }
    const search = { q: filters.q.trim() || undefined, minAmount, maxAmount };
    try {
      const fetchPage = (p: number) =>
        fetchAdminRefunds(filters.status || undefined, { offset: p * PAGE_SIZE, limit: PAGE_SIZE }, search);
      let result = await fetchPage(page);
      // Trang vừa xử lý hết mục cuối: lùi về trang cuối còn dữ liệu.
      if (result.items.length === 0 && page > 0) {
        page = Math.max(0, Math.ceil(result.total / PAGE_SIZE) - 1);
        result = await fetchPage(page);
      }
      setRefunds(result.items);
      setRefundTotal(result.total);
      setRefundPage(page);
      setNotice(null);
    } catch (err) {
      setNotice(errorText(err, "Không tải được yêu cầu hoàn tiền"));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminRefunds("pending", { limit: PAGE_SIZE })
      .then((r) => { if (!cancelled) { setRefunds(r.items); setRefundTotal(r.total); } })
      .catch((err) => { if (!cancelled) setNotice(errorText(err, "Không tải được yêu cầu hoàn tiền")); });
    fetchReconciliation({})
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((err) => { if (!cancelled) setReportError(errorText(err, "Không tải được đối soát")); });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyRefundFilters = (filters: RefundFilters) => {
    setRefundDraft(filters);
    setRefundFilter(filters);
    void loadRefunds(filters, 0);
  };

  const reconKeyword = reconQuery.trim().toLowerCase();
  const reconRows = (report?.campaigns ?? []).filter((c) => {
    if (reconKeyword && !c.title.toLowerCase().includes(reconKeyword)) return false;
    if (reconFilter === "mismatch") return c.mismatch;
    if (reconFilter === "match") return !c.mismatch;
    if (reconFilter === "refunded") return c.refundedAmount > 0;
    return true;
  });

  const decide = async (request: RefundRequest, approve: boolean) => {
    const amount = formatVnd(Number(request.donation?.amount ?? 0));
    const result = await dialog.prompt({
      title: approve ? "Duyệt yêu cầu hoàn tiền" : "Từ chối yêu cầu hoàn tiền",
      message: approve ? (
        <>Hoàn <b>{amount}</b> qua cổng thanh toán. Số tiền của chiến dịch sẽ giảm tương ứng; thao tác không hoàn tác được.</>
      ) : (
        <>Người ủng hộ sẽ nhận thông báo kèm lý do không chấp nhận hoàn <b>{amount}</b>.</>
      ),
      label: approve ? "Ghi chú (gửi cho người ủng hộ và lưu nhật ký)" : "Lý do không chấp nhận (gửi cho người ủng hộ)",
      minLength: 5,
      maxLength: 500,
      confirmLabel: approve ? "Duyệt hoàn tiền" : "Từ chối yêu cầu",
      tone: approve ? "danger" : "default",
    });
    if (!result) return;
    const input = result.value;
    setBusy(request.id);
    setNotice(null);
    try {
      if (approve) await approveRefund(request.id, input);
      else await rejectRefund(request.id, input);
      await loadRefunds(refundFilter, refundPage);
      setNotice(approve ? `Đã hoàn ${amount} qua cổng thanh toán sandbox.` : "Đã từ chối yêu cầu hoàn tiền.");
      if (approve) onChanged?.();
    } catch (err) {
      setNotice(errorText(err, "Không xử lý được yêu cầu"));
    } finally {
      setBusy(null);
    }
  };

  const runReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReportError(null);
    try {
      setReport(await fetchReconciliation({ from, to }));
      setReportPage(0);
    } catch (err) {
      setReportError(errorText(err, "Không tải được đối soát"));
    }
  };

  const exportCsv = async () => {
    setBusy("export");
    setReportError(null);
    try {
      await downloadReconciliationCsv({ from, to });
    } catch (err) {
      setReportError(errorText(err, "Không xuất được CSV"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {view === "refunds" && (
      <section className="admin-card risk-card" id="hoan-tien">
        <div className="card-heading">
          <div><p className="eyebrow">Tài chính</p><h2>Yêu cầu hoàn tiền</h2></div>
          <select
            className="filter-button"
            aria-label="Lọc yêu cầu hoàn tiền"
            value={refundDraft.status}
            onChange={(e) => applyRefundFilters({ ...refundDraft, status: e.target.value as RefundRequestStatus | "" })}
          >
            <option value="pending">Chờ xử lý</option>
            <option value="approved">Đã hoàn tiền</option>
            <option value="rejected">Không chấp nhận</option>
            <option value="">Tất cả</option>
          </select>
        </div>
        <form
          className="admin-filter-bar"
          onSubmit={(event) => {
            event.preventDefault();
            applyRefundFilters(refundDraft);
          }}
        >
          <input
            className="filter-button admin-filter-search"
            type="search"
            placeholder="Tìm theo chiến dịch, người yêu cầu, lý do…"
            aria-label="Tìm yêu cầu hoàn tiền"
            value={refundDraft.q}
            onChange={(e) => setRefundDraft({ ...refundDraft, q: e.target.value })}
          />
          <label className="admin-filter-range">
            <span>Số tiền (đ)</span>
            <input
              className="filter-button"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              placeholder="Từ"
              aria-label="Số tiền từ (đồng)"
              value={refundDraft.minAmount}
              onChange={(e) => setRefundDraft({ ...refundDraft, minAmount: e.target.value })}
            />
            <span aria-hidden="true">–</span>
            <input
              className="filter-button"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              placeholder="Đến"
              aria-label="Số tiền đến (đồng)"
              value={refundDraft.maxAmount}
              onChange={(e) => setRefundDraft({ ...refundDraft, maxAmount: e.target.value })}
            />
          </label>
          <button className="button button-primary admin-filter-submit" type="submit">Lọc</button>
          {(refundFilter.q || refundFilter.minAmount || refundFilter.maxAmount) && (
            <button
              className="link-inline"
              type="button"
              onClick={() => applyRefundFilters({ ...DEFAULT_REFUND_FILTERS, status: refundDraft.status })}
            >
              Xóa bộ lọc
            </button>
          )}
        </form>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        <div className="risk-list">
          {refunds.length === 0 ? (
            <article><p className="table-muted">Không có yêu cầu nào khớp bộ lọc.</p></article>
          ) : (
            refunds.map((r) => (
              <article key={r.id}>
                <span className={`report-status ${r.status === "pending" ? "pending" : r.status === "approved" ? "resolved" : "dismissed"}`}>
                  {REFUND_STATUS_LABEL[r.status]}
                </span>
                <div>
                  <h3>{formatVnd(Number(r.donation?.amount ?? 0))} · {r.donation?.campaign?.title ?? "Chiến dịch"}</h3>
                  <p>
                    {new Date(r.createdAt).toLocaleString("vi-VN")} · bởi {r.user ? `${r.user.name}${r.user.email ? ` (${r.user.email})` : ""}` : "người dùng"}
                  </p>
                  <p className="report-quote">{r.reason}</p>
                  {r.adminNotes && <small><b>Ghi chú quản trị:</b> {r.adminNotes}</small>}
                </div>
                <div className="risk-actions">
                  {r.status === "pending" && (
                    <>
                      <button className="resolve" type="button" disabled={busy === r.id} onClick={() => decide(r, true)}>Duyệt hoàn tiền</button>
                      <button type="button" disabled={busy === r.id} onClick={() => decide(r, false)}>Từ chối</button>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
        <Pagination page={refundPage} total={refundTotal} onChange={(page) => void loadRefunds(refundFilter, page)} />
        <p className="risk-footnote"><Icon name="shield" size={15} /> Hoàn tiền gọi cổng thanh toán sandbox, trừ số liệu chiến dịch, trả lại suất quà và ghi nhật ký kiểm toán.</p>
      </section>
      )}

      {view === "reconciliation" && (
      <section className="admin-card admin-table-card" id="doi-soat">
        <div className="card-heading">
          <div><p className="eyebrow">Tài chính</p><h2>Đối soát giao dịch</h2></div>
        </div>
        <form className="recon-filter" onSubmit={runReport}>
          <label className="field"><span>Từ ngày</span><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field"><span>Đến ngày</span><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></label>
          <button className="button button-outline button-sm" type="submit">Xem đối soát</button>
          <button className="button button-primary button-sm" type="button" disabled={busy === "export"} onClick={exportCsv}>
            {busy === "export" ? "Đang xuất…" : "Xuất CSV"}
          </button>
        </form>
        {report && (
          <div className="admin-filter-bar">
            <input
              className="filter-button admin-filter-search"
              type="search"
              placeholder="Tìm theo tên chiến dịch…"
              aria-label="Tìm chiến dịch trong bảng đối soát"
              value={reconQuery}
              onChange={(e) => { setReconQuery(e.target.value); setReportPage(0); }}
            />
            <select
              className="filter-button"
              aria-label="Lọc kết quả đối soát"
              value={reconFilter}
              onChange={(e) => { setReconFilter(e.target.value as ReconFilter); setReportPage(0); }}
            >
              <option value="">Tất cả chiến dịch</option>
              <option value="mismatch">Chỉ chiến dịch lệch sổ</option>
              <option value="match">Chỉ chiến dịch khớp</option>
              <option value="refunded">Có hoàn tiền trong kỳ</option>
            </select>
            {(reconQuery || reconFilter) && (
              <button className="link-inline" type="button" onClick={() => { setReconQuery(""); setReconFilter(""); setReportPage(0); }}>
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
        {reportError && <p className="form-error" role="alert">{reportError}</p>}
        {report && (
          <>
            <dl className="recon-totals">
              <div><dt>Đã xác nhận</dt><dd className="num">{formatVnd(report.totals.completedAmount)}<small> · {report.totals.completedCount} giao dịch</small></dd></div>
              <div><dt>Đã hoàn</dt><dd className="num">{formatVnd(report.totals.refundedAmount)}<small> · {report.totals.refundedCount} giao dịch</small></dd></div>
              <div><dt>Ròng trong kỳ</dt><dd className="num">{formatVnd(report.totals.netAmount)}</dd></div>
              <div><dt>Chiến dịch lệch sổ</dt><dd className={report.mismatches ? "recon-bad" : "recon-ok"}>{report.mismatches}</dd></div>
            </dl>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Chiến dịch</th>
                    <th className="num">Xác nhận</th>
                    <th className="num">Hoàn</th>
                    <th className="num">Ròng</th>
                    <th className="num" title="Số tiền và lượt ủng hộ đang ghi trên chiến dịch">Trên chiến dịch</th>
                    <th className="num" title="Tính lại từ các giao dịch đã xác nhận">Theo sổ giao dịch</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {reconRows.length === 0 ? (
                    <tr><td colSpan={7} className="table-muted">{report.campaigns.length === 0 ? "Không có giao dịch trong kỳ." : "Không có chiến dịch nào khớp bộ lọc."}</td></tr>
                  ) : (
                    pageSlice(reconRows, reportPage).map((c) => (
                      <tr key={c.campaignId}>
                        <td><b>{c.title}</b></td>
                        <td className="num">{formatVnd(c.completedAmount)}</td>
                        <td className="num">{c.refundedAmount > 0 ? formatVnd(c.refundedAmount) : <span className="table-muted">—</span>}</td>
                        <td className="num">{formatVnd(c.netAmount)}</td>
                        <td className="num">{formatVnd(c.recordedAmount)}<small>{c.recordedBackers} lượt</small></td>
                        <td className="num">{formatVnd(c.ledgerAmount)}<small>{c.ledgerBackers} lượt</small></td>
                        <td>{c.mismatch ? <span className="tag tag-red">Lệch</span> : <span className="tag tag-green">Khớp</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={reportPage} total={reconRows.length} onChange={setReportPage} />
            <p className="risk-footnote"><Icon name="shield" size={15} /> File CSV giả danh người ủng hộ (mã NUH-…), không chứa tên/email; mỗi lần xuất được ghi nhật ký.</p>
          </>
        )}
      </section>
      )}
    </>
  );
}
