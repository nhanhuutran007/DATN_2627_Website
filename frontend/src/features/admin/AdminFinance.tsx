import { useCallback, useEffect, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { Icon } from "@/components/ui/Icon";
import { PAGE_SIZE, Pagination, pageSlice } from "@/components/ui/Pagination";
import { useManualRefundDialog } from "@/features/admin/ManualRefundDialog";
import { ApiError } from "@/lib/api";
import {
  approveRefund,
  downloadReconciliationCsv,
  downloadRefundsCsv,
  fetchAdminRefunds,
  fetchReconciliation,
  needsManualRefund,
  REFUND_METHOD_LABEL,
  REFUND_STATUS_LABEL,
  rejectRefund,
  type ReconciliationReport,
  type RefundRequest,
  type RefundRequestStatus,
} from "@/lib/api/finance";
import { formatVnd } from "@/lib/format";

/** Ngày theo lịch địa phương dạng yyyy-mm-dd (toISOString lệch ngày trước 7h sáng giờ VN). */
const isoDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
/** yyyy-mm-dd (hoặc ISO) → dd/mm/yyyy, giữ nguyên ngày như backend đã chốt. */
const viDay = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** Chọn nhanh kỳ đối soát; trả về [từ ngày, đến ngày]. */
const RECON_PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: "7 ngày", range: () => [isoDay(new Date(Date.now() - 6 * 86_400_000)), isoDay(new Date())] },
  { label: "30 ngày", range: () => [isoDay(new Date(Date.now() - 30 * 86_400_000)), isoDay(new Date())] },
  {
    label: "Tháng này",
    range: () => {
      const now = new Date();
      return [isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), isoDay(now)];
    },
  },
  {
    label: "Tháng trước",
    range: () => {
      const now = new Date();
      return [isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)), isoDay(new Date(now.getFullYear(), now.getMonth(), 0))];
    },
  },
];

/** Chênh lệch có dấu, vd. "+200.000 ₫" / "−1 lượt" (chỉ gọi khi khác 0). */
const signed = (value: number, format: (n: number) => string) => (value > 0 ? "+" : "−") + format(Math.abs(value));

type RefundFilters = { status: RefundRequestStatus | ""; q: string; minAmount: string; maxAmount: string };
const DEFAULT_REFUND_FILTERS: RefundFilters = { status: "pending", q: "", minAmount: "", maxAmount: "" };
/** Tiêu đề thẻ: "{số} yêu cầu …" theo trạng thái đang lọc. */
const REFUND_COUNT_LABEL: Record<RefundRequestStatus | "", string> = {
  pending: "yêu cầu đang chờ xử lý",
  approved: "yêu cầu đã hoàn tiền",
  rejected: "yêu cầu không chấp nhận",
  "": "yêu cầu hoàn tiền",
};

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
  const [manualDialog, openManualRefund] = useManualRefundDialog();
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [refundFilter, setRefundFilter] = useState<RefundFilters>(DEFAULT_REFUND_FILTERS);
  const [refundDraft, setRefundDraft] = useState<RefundFilters>(DEFAULT_REFUND_FILTERS);
  const [reconQuery, setReconQuery] = useState("");
  const [reconFilter, setReconFilter] = useState<ReconFilter>("");
  const [refundPage, setRefundPage] = useState(0);
  const [refundTotal, setRefundTotal] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadRefunds = useCallback(async (filters: RefundFilters, page: number) => {
    const minAmount = amountParam(filters.minAmount);
    const maxAmount = amountParam(filters.maxAmount);
    if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
      setNotice({ tone: "error", text: "Số tiền \"từ\" không được lớn hơn số tiền \"đến\"" });
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
      setNotice({ tone: "error", text: errorText(err, "Không tải được yêu cầu hoàn tiền") });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminRefunds("pending", { limit: PAGE_SIZE })
      .then((r) => { if (!cancelled) { setRefunds(r.items); setRefundTotal(r.total); } })
      .catch((err) => { if (!cancelled) setNotice({ tone: "error", text: errorText(err, "Không tải được yêu cầu hoàn tiền") }); });
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

  const approveManually = async (request: RefundRequest, amount: string) => {
    const result = await openManualRefund({
      title: "Duyệt hoàn tiền thủ công",
      amount,
      notesLabel: "Ghi chú (gửi cho người ủng hộ và lưu nhật ký)",
      confirmLabel: "Đã chuyển khoản — duyệt hoàn",
      bank: request.bankAccountNumber
        ? { bankName: request.bankName ?? "", bankAccountNumber: request.bankAccountNumber, bankAccountName: request.bankAccountName ?? "" }
        : null,
      transferCode: request.donation?.transferCode,
    });
    if (!result) return;
    setBusy(request.id);
    setNotice(null);
    try {
      await approveRefund(request.id, result.notes, { transferReference: result.transferReference, proofMediaId: result.proofMediaId });
      await loadRefunds(refundFilter, refundPage);
      setNotice({ tone: "ok", text: `Đã ghi nhận hoàn ${amount} qua chuyển khoản (mã ${result.transferReference}).` });
      onChanged?.();
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không xử lý được yêu cầu") });
    } finally {
      setBusy(null);
    }
  };

  const exportRefunds = async () => {
    setBusy("export-refunds");
    setNotice(null);
    try {
      await downloadRefundsCsv(refundFilter.status || undefined);
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không xuất được CSV") });
    } finally {
      setBusy(null);
    }
  };

  const decide = async (request: RefundRequest, approve: boolean) => {
    const amount = formatVnd(Number(request.donation?.amount ?? 0));
    if (approve && needsManualRefund(request.donation?.paymentMethod)) {
      await approveManually(request, amount);
      return;
    }
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
      setNotice({ tone: "ok", text: approve ? `Đã hoàn ${amount} qua cổng thanh toán sandbox.` : "Đã từ chối yêu cầu hoàn tiền." });
      onChanged?.();
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không xử lý được yêu cầu") });
    } finally {
      setBusy(null);
    }
  };

  const loadReport = async (range: { from: string; to: string }) => {
    setReportError(null);
    try {
      setReport(await fetchReconciliation(range));
      setReportPage(0);
    } catch (err) {
      setReportError(errorText(err, "Không tải được đối soát"));
    }
  };

  const runReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadReport({ from, to });
  };

  const applyPreset = ([presetFrom, presetTo]: [string, string]) => {
    setFrom(presetFrom);
    setTo(presetTo);
    void loadReport({ from: presetFrom, to: presetTo });
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
      {manualDialog}
      {view === "refunds" && (
      <section className="admin-card risk-card" id="hoan-tien">
        <div className="card-heading">
          <div><p className="eyebrow">Tài chính</p><h2>{refundTotal} {REFUND_COUNT_LABEL[refundFilter.status]}</h2></div>
          <div className="risk-heading-actions">
            <button
              className="button button-outline button-sm"
              type="button"
              disabled={busy === "export-refunds"}
              onClick={() => void exportRefunds()}
              title="Danh sách kèm tài khoản nhận hoàn để chuyển khoản trả lại"
            >
              <Icon name="document" size={15} /> {busy === "export-refunds" ? "Đang xuất…" : "Xuất CSV"}
            </button>
          </div>
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
          <select
            className="filter-button"
            aria-label="Lọc theo trạng thái"
            value={refundDraft.status}
            onChange={(e) => applyRefundFilters({ ...refundDraft, status: e.target.value as RefundRequestStatus | "" })}
          >
            <option value="pending">Chờ xử lý</option>
            <option value="approved">Đã hoàn tiền</option>
            <option value="rejected">Không chấp nhận</option>
            <option value="">Tất cả trạng thái</option>
          </select>
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
        {notice && (
          <p className={notice.tone === "ok" ? "admin-notice" : "admin-notice error"} role={notice.tone === "ok" ? "status" : "alert"}>
            {notice.text}
          </p>
        )}
        <div className="risk-list">
          {refunds.length === 0 ? (
            <article>
              {refundFilter.q || refundFilter.minAmount || refundFilter.maxAmount ? (
                <p className="table-muted">
                  Không có yêu cầu nào khớp bộ lọc.{" "}
                  <button className="link-inline" type="button" onClick={() => applyRefundFilters({ ...DEFAULT_REFUND_FILTERS, status: refundFilter.status })}>
                    Xóa bộ lọc
                  </button>
                </p>
              ) : refundFilter.status === "pending" ? (
                <p className="table-muted">
                  Không còn yêu cầu hoàn tiền nào đang chờ xử lý.{" "}
                  <button className="link-inline" type="button" onClick={() => applyRefundFilters({ ...DEFAULT_REFUND_FILTERS, status: "" })}>
                    Xem tất cả yêu cầu
                  </button>
                </p>
              ) : (
                <p className="table-muted">Chưa có yêu cầu hoàn tiền nào ở trạng thái này.</p>
              )}
            </article>
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
                  {needsManualRefund(r.donation?.paymentMethod) && (
                    <div className="refund-bank-info">
                      <span className="refund-manual-tag">Hoàn thủ công qua chuyển khoản</span>
                      {r.bankAccountNumber ? (
                        <span>
                          {r.bankName} · <b className="mono">{r.bankAccountNumber}</b> · {r.bankAccountName}
                          {r.donation?.transferCode && <> · mã ủng hộ <span className="mono">{r.donation.transferCode}</span></>}
                        </span>
                      ) : (
                        <span className="table-muted">Người ủng hộ chưa khai tài khoản nhận hoàn</span>
                      )}
                    </div>
                  )}
                  {r.status === "approved" && r.donation?.refundReference && (
                    <small>
                      <b>{REFUND_METHOD_LABEL[r.donation.refundMethod ?? ""] ?? "Mã hoàn"}:</b>{" "}
                      <span className="mono">{r.donation.refundReference}</span>
                      {r.donation.refundProofUrl && (
                        <> · <a href={r.donation.refundProofUrl} target="_blank" rel="noreferrer">chứng từ</a></>
                      )}
                    </small>
                  )}
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
        <p className="risk-footnote"><Icon name="shield" size={15} /> Ví demo hoàn qua cổng thanh toán sandbox; khoản qua SePay phải chuyển khoản trả lại thủ công rồi nhập mã giao dịch. Mọi lần hoàn đều trừ số liệu chiến dịch, trả lại suất quà và ghi nhật ký kiểm toán.</p>
      </section>
      )}

      {view === "reconciliation" && (
      <section className="admin-card admin-table-card" id="doi-soat">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Tài chính</p>
            <h2>{report ? `Kỳ ${viDay(report.from)} – ${viDay(report.to)}` : "Đối soát giao dịch"}</h2>
          </div>
          <div className="risk-heading-actions">
            <button
              className="button button-outline button-sm"
              type="button"
              disabled={busy === "export"}
              onClick={exportCsv}
              title="Xuất đối soát theo khoảng ngày đang chọn"
            >
              <Icon name="document" size={15} /> {busy === "export" ? "Đang xuất…" : "Xuất CSV"}
            </button>
          </div>
        </div>
        <form className="admin-filter-bar" onSubmit={runReport}>
          <div className="recon-presets" role="group" aria-label="Chọn nhanh kỳ đối soát">
            {RECON_PRESETS.map((preset) => {
              const [presetFrom, presetTo] = preset.range();
              const active = presetFrom === from && presetTo === to;
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={active ? "is-active" : undefined}
                  aria-pressed={active}
                  onClick={() => applyPreset([presetFrom, presetTo])}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="admin-filter-range recon-dates">
            <input className="filter-button" type="date" aria-label="Từ ngày" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            <span aria-hidden="true">–</span>
            <input className="filter-button" type="date" aria-label="Đến ngày" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="button button-primary admin-filter-submit" type="submit">Xem đối soát</button>
          {report && (
            <>
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
            </>
          )}
        </form>
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
                  <tr className="recon-groups">
                    <th rowSpan={2}>Chiến dịch</th>
                    <th colSpan={3} title="Chỉ tính giao dịch trong khoảng ngày đang chọn">Trong kỳ</th>
                    <th colSpan={3} className="recon-ledger" title="Tính từ khi chiến dịch bắt đầu, không phụ thuộc khoảng ngày">
                      Lũy kế · kiểm tra khớp sổ
                    </th>
                  </tr>
                  <tr>
                    <th className="num">Xác nhận</th>
                    <th className="num">Hoàn</th>
                    <th className="num">Ròng</th>
                    <th className="num recon-ledger" title="Số tiền và lượt ủng hộ đang ghi trên chiến dịch">Trên chiến dịch</th>
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
                        <td className="num recon-ledger">{formatVnd(c.recordedAmount)}<small>{c.recordedBackers} lượt</small></td>
                        <td className="num">{formatVnd(c.ledgerAmount)}<small>{c.ledgerBackers} lượt</small></td>
                        <td>
                          {c.mismatch ? (
                            <>
                              <span className="tag tag-red">Lệch</span>
                              <small className="recon-diff" title="Số ghi trên chiến dịch so với sổ giao dịch">
                                {[
                                  Math.abs(c.recordedAmount - c.ledgerAmount) > 0.5 && signed(c.recordedAmount - c.ledgerAmount, formatVnd),
                                  c.recordedBackers !== c.ledgerBackers && signed(c.recordedBackers - c.ledgerBackers, (n) => `${n} lượt`),
                                ].filter(Boolean).join(" · ")}
                              </small>
                            </>
                          ) : (
                            <span className="tag tag-green">Khớp</span>
                          )}
                        </td>
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
