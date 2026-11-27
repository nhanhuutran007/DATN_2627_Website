"use client";

import { useCallback, useEffect, useState } from "react";

import { useManualRefundDialog } from "@/features/admin/ManualRefundDialog";
import { ApiError } from "@/lib/api";
import { disburseCampaign, fetchDisbursements, type DisbursementRow, type DisbursementState } from "@/lib/api/finance";
import { formatDateTime, formatVnd } from "@/lib/format";

const STATE_LABEL: Record<DisbursementState, { label: string; tone: string }> = {
  ready: { label: "Chờ giải ngân", tone: "pending" },
  collecting: { label: "Đang thu tiền", tone: "dismissed" },
  disbursed: { label: "Đã giải ngân", tone: "resolved" },
};

const COUNT_LABEL: Record<DisbursementState | "", string> = {
  ready: "chiến dịch chờ giải ngân",
  collecting: "chiến dịch đang chờ người ủng hộ thanh toán",
  disbursed: "chiến dịch đã giải ngân",
  "": "chiến dịch thành công",
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Giải ngân: Góp Mầm không giữ tiền của người dùng. Người ủng hộ trả cam kết (QR SePay) về tài khoản
 * Góp Mầm sau khi dự án đạt mục tiêu; hết hạn thanh toán thì admin gom tổng đã thu và chuyển khoản
 * tay MỘT lần cho chủ dự án, rồi ghi nhận mã giao dịch + chứng từ.
 */
export function AdminDisbursements() {
  const [manualDialog, openManual] = useManualRefundDialog();
  const [state, setState] = useState<DisbursementState | "">("ready");
  const [items, setItems] = useState<DisbursementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async (next: DisbursementState | "") => {
    setLoading(true);
    try {
      setItems(await fetchDisbursements(next || undefined));
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không tải được danh sách giải ngân.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchDisbursements("ready")
      .then((rows) => active && setItems(rows))
      .catch((err: unknown) => active && setNotice({ tone: "error", text: errorText(err, "Không tải được danh sách giải ngân.") }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const disburse = async (row: DisbursementRow) => {
    if (!row.payoutAccount) return;
    const amount = formatVnd(row.collected);
    const result = await openManual({
      title: `Giải ngân cho “${row.campaign.title}”`,
      amount,
      notesLabel: "Ghi chú (lưu nhật ký)",
      confirmLabel: "Đã chuyển khoản — ghi nhận giải ngân",
      bank: row.payoutAccount,
      transferCode: null,
    });
    if (!result) return;
    setBusy(row.campaign.id);
    setNotice(null);
    try {
      await disburseCampaign(row.campaign.id, {
        transferReference: result.transferReference,
        adminNotes: result.notes,
        ...(result.proofMediaId ? { proofMediaId: result.proofMediaId } : {}),
      });
      await load(state);
      setNotice({ tone: "ok", text: `Đã ghi nhận chuyển ${amount} cho ${row.owner.name} (mã ${result.transferReference}).` });
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không ghi nhận được giải ngân.") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {manualDialog}
      <section className="admin-card risk-card" id="giai-ngan">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Tài chính</p>
            <h2>{items.length} {COUNT_LABEL[state]}</h2>
          </div>
        </div>
        <p className="hint">
          Mỗi chiến dịch thành công được giải ngân một lần, sau khi mọi cam kết đã thanh toán hoặc hết hạn trả. Chuyển khoản tay
          từ tài khoản Góp Mầm tới tài khoản chủ dự án đã khai báo, rồi nhập mã giao dịch.
        </p>
        <div className="admin-filter-bar">
          <select
            className="filter-button"
            aria-label="Lọc theo trạng thái giải ngân"
            value={state}
            onChange={(event) => {
              const next = event.target.value as DisbursementState | "";
              setState(next);
              void load(next);
            }}
          >
            <option value="ready">Chờ giải ngân</option>
            <option value="collecting">Đang thu tiền</option>
            <option value="disbursed">Đã giải ngân</option>
            <option value="">Tất cả</option>
          </select>
        </div>
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
              <p className="table-muted">{state === "ready" ? "Không có chiến dịch nào chờ giải ngân." : "Không có chiến dịch nào ở trạng thái này."}</p>
            </article>
          ) : (
            items.map((row) => {
              const label = STATE_LABEL[row.state];
              const lateExtra = row.disbursement ? row.collected - row.disbursement.amount : 0;
              return (
                <article key={row.campaign.id}>
                  <span className={`report-status ${label.tone}`}>{label.label}</span>
                  <div>
                    <div className="request-head">
                      <h3><a href={`/du-an/${row.campaign.id}`} target="_blank" rel="noreferrer">{row.campaign.title}</a></h3>
                      <strong className="request-amount num">{formatVnd(row.disbursement?.amount ?? row.collected)}</strong>
                    </div>
                    <ul className="request-meta">
                      <li><span>Chủ dự án</span> {row.owner.name} · {row.owner.email}</li>
                      <li><span>Kết thúc</span> {formatDateTime(row.campaign.endDate)}</li>
                      <li><span>Đã thu</span> {formatVnd(row.collected)} ({row.paidCount} khoản)</li>
                      {row.outstandingCount > 0 && (
                        <li><span>Chưa thanh toán</span> {formatVnd(row.outstanding)} ({row.outstandingCount} cam kết)</li>
                      )}
                    </ul>
                    {row.disbursement ? (
                      <small>
                        <b>Đã chuyển</b> {formatDateTime(row.disbursement.disbursedAt)} tới {row.disbursement.bankName}{" "}
                        <span className="mono">{row.disbursement.bankAccountNumber}</span> · mã <span className="mono">{row.disbursement.transferReference}</span>
                        {row.disbursement.proofUrl && <> · <a href={row.disbursement.proofUrl} target="_blank" rel="noreferrer">chứng từ</a></>}
                      </small>
                    ) : row.payoutAccount ? (
                      <div className="refund-bank-info">
                        <span className="refund-manual-tag">Chuyển khoản tới</span>
                        <dl className="bank-grid">
                          <div><dt>Ngân hàng</dt><dd>{row.payoutAccount.bankName}</dd></div>
                          <div><dt>Số tài khoản</dt><dd className="mono">{row.payoutAccount.bankAccountNumber}</dd></div>
                          <div><dt>Chủ tài khoản</dt><dd>{row.payoutAccount.bankAccountName}</dd></div>
                        </dl>
                      </div>
                    ) : (
                      <small className="form-error">Chủ dự án chưa khai báo tài khoản nhận tiền.</small>
                    )}
                    {lateExtra > 0 && (
                      <small className="form-error">
                        Có {formatVnd(lateExtra)} thanh toán muộn sau lần giải ngân — cần chuyển bổ sung ngoài hệ thống.
                      </small>
                    )}
                  </div>
                  <div className="risk-actions">
                    {row.state === "ready" && (
                      <button
                        className="resolve"
                        type="button"
                        disabled={busy === row.campaign.id || !row.payoutAccount}
                        title={row.payoutAccount ? undefined : "Chờ chủ dự án khai báo tài khoản nhận tiền"}
                        onClick={() => disburse(row)}
                      >
                        Đã chuyển khoản
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
