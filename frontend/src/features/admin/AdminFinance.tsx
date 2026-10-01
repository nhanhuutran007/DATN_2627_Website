import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
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
const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

/** Hoàn tiền (duyệt yêu cầu) và đối soát cho trang quản trị. */
export function AdminFinance({ onChanged }: { onChanged?: () => void }) {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [refundFilter, setRefundFilter] = useState<RefundRequestStatus | "">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const loadRefunds = useCallback(async (status: RefundRequestStatus | "") => {
    try {
      setRefunds((await fetchAdminRefunds(status || undefined)).items);
    } catch (err) {
      setNotice(errorText(err, "Không tải được yêu cầu hoàn tiền"));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminRefunds("pending")
      .then((r) => { if (!cancelled) setRefunds(r.items); })
      .catch((err) => { if (!cancelled) setNotice(errorText(err, "Không tải được yêu cầu hoàn tiền")); });
    fetchReconciliation({})
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((err) => { if (!cancelled) setReportError(errorText(err, "Không tải được đối soát")); });
    return () => {
      cancelled = true;
    };
  }, []);

  const decide = async (request: RefundRequest, approve: boolean) => {
    const amount = formatVnd(Number(request.donation?.amount ?? 0));
    const input = window.prompt(
      approve
        ? `Duyệt hoàn ${amount}? Ghi chú (bắt buộc, gửi cho người ủng hộ và lưu nhật ký):`
        : "Lý do không chấp nhận (bắt buộc, gửi cho người ủng hộ):",
      "",
    );
    if (input === null) return;
    if (input.trim().length < 5) {
      setNotice("Vui lòng nhập ghi chú tối thiểu 5 ký tự.");
      return;
    }
    setBusy(request.id);
    setNotice(null);
    try {
      if (approve) await approveRefund(request.id, input.trim());
      else await rejectRefund(request.id, input.trim());
      await loadRefunds(refundFilter);
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
      <section className="admin-card risk-card" id="hoan-tien">
        <div className="card-heading">
          <div><p className="eyebrow">Tài chính</p><h2>Yêu cầu hoàn tiền</h2></div>
          <select
            className="filter-button"
            aria-label="Lọc yêu cầu hoàn tiền"
            value={refundFilter}
            onChange={(e) => { const v = e.target.value as RefundRequestStatus | ""; setRefundFilter(v); void loadRefunds(v); }}
          >
            <option value="pending">Chờ xử lý</option>
            <option value="approved">Đã hoàn tiền</option>
            <option value="rejected">Không chấp nhận</option>
            <option value="">Tất cả</option>
          </select>
        </div>
        {notice && <p className="admin-notice" role="status">{notice}</p>}
        <div className="risk-list">
          {refunds.length === 0 ? (
            <article><p className="table-muted">Không có yêu cầu nào ở trạng thái này.</p></article>
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
        <p className="risk-footnote"><Icon name="shield" size={15} /> Hoàn tiền gọi cổng thanh toán sandbox, trừ số liệu chiến dịch, trả lại suất quà và ghi nhật ký kiểm toán.</p>
      </section>

      <section className="admin-card" id="doi-soat">
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
                  <tr><th>Chiến dịch</th><th>Xác nhận</th><th>Hoàn</th><th>Ròng</th><th>Ghi trên chiến dịch</th><th>Theo sổ giao dịch</th><th>Khớp</th></tr>
                </thead>
                <tbody>
                  {report.campaigns.length === 0 ? (
                    <tr><td colSpan={7} className="table-muted">Không có giao dịch trong kỳ.</td></tr>
                  ) : (
                    report.campaigns.map((c) => (
                      <tr key={c.campaignId}>
                        <td>{c.title}</td>
                        <td className="num">{formatVnd(c.completedAmount)}</td>
                        <td className="num">{formatVnd(c.refundedAmount)}</td>
                        <td className="num">{formatVnd(c.netAmount)}</td>
                        <td className="num">{formatVnd(c.recordedAmount)} · {c.recordedBackers} lượt</td>
                        <td className="num">{formatVnd(c.ledgerAmount)} · {c.ledgerBackers} lượt</td>
                        <td>{c.mismatch ? <span className="tag tag-red">Lệch</span> : <span className="tag tag-green">Khớp</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="risk-footnote"><Icon name="shield" size={15} /> File CSV giả danh người ủng hộ (mã NUH-…), không chứa tên/email; mỗi lần xuất được ghi nhật ký.</p>
          </>
        )}
      </section>
    </>
  );
}
