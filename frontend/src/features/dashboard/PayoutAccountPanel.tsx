"use client";

import { useEffect, useState, type FormEvent } from "react";

import { BankFields, bankDraftError, bankPayload, EMPTY_BANK, type BankDraft } from "@/features/finance/BankFields";
import { ApiError } from "@/lib/api";
import { fetchPayoutInfo, savePayoutAccount, type PayoutAccount, type PayoutDisbursement } from "@/lib/api/campaigns";
import { formatDateTime, formatVnd } from "@/lib/format";

/**
 * Chủ dự án khai báo tài khoản ngân hàng nhận tiền gây quỹ của chiến dịch; quản trị viên dùng
 * thông tin này để chuyển khoản. Lưu/đổi cần mã OTP gửi email.
 */
export function PayoutAccountPanel({ campaignId }: { campaignId: string }) {
  const [account, setAccount] = useState<PayoutAccount | null | undefined>(undefined);
  const [disbursement, setDisbursement] = useState<PayoutDisbursement | null>(null);
  const [editing, setEditing] = useState(false);
  const [bank, setBank] = useState<BankDraft>(EMPTY_BANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchPayoutInfo(campaignId)
      .then((loaded) => {
        if (!active) return;
        setAccount(loaded.account);
        setDisbursement(loaded.disbursement);
        setEditing(!loaded.account);
      })
      .catch((err) => {
        if (!active) return;
        setAccount(null);
        setError(err instanceof ApiError ? err.message : "Không tải được tài khoản nhận tiền.");
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  const startEdit = () => {
    setBank(account ? { bankName: account.bankName, accountNumber: account.bankAccountNumber, accountName: account.bankAccountName } : EMPTY_BANK);
    setEditing(true);
    setNotice("");
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const invalid = bankDraftError(bank);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError("");
    try {
      const saved = await savePayoutAccount(campaignId, bankPayload(bank));
      setAccount(saved);
      setEditing(false);
      setNotice("Đã lưu tài khoản nhận tiền. Email xác nhận đã được gửi cho bạn.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lưu được tài khoản nhận tiền.");
    } finally {
      setBusy(false);
    }
  };

  if (account === undefined) return <div className="payout-panel"><p className="hint">Đang tải…</p></div>;

  return (
    <div className="payout-panel">
      <p className="hint">
        Khi dự án thành công, người ủng hộ có 7 ngày để thanh toán cam kết. Hết hạn, Góp Mầm gom toàn bộ tiền đã thu và chuyển
        vào tài khoản này một lần. Tài khoản nên đứng tên bạn hoặc tổ chức thụ hưởng; chỉ bạn và quản trị viên xem được.
      </p>
      {notice && <p className="form-notice" role="status">{notice}</p>}
      {disbursement && (
        <p className="form-notice" role="status">
          Đã giải ngân <b className="num">{formatVnd(disbursement.amount)}</b> ({disbursement.donationCount} khoản ủng hộ) ngày{" "}
          {formatDateTime(disbursement.disbursedAt)} về {disbursement.bankName} {disbursement.bankAccountNumber} · mã giao dịch{" "}
          <span className="mono">{disbursement.transferReference}</span>
          {disbursement.proofUrl && <> · <a href={disbursement.proofUrl} target="_blank" rel="noreferrer">chứng từ</a></>}
        </p>
      )}

      {!editing && account && (
        <>
          <dl className="manual-refund-bank">
            <div><dt>Ngân hàng</dt><dd>{account.bankName}</dd></div>
            <div><dt>Số tài khoản</dt><dd className="mono">{account.bankAccountNumber}</dd></div>
            <div><dt>Chủ tài khoản</dt><dd>{account.bankAccountName}</dd></div>
            <div><dt>Cập nhật</dt><dd>{formatDateTime(account.updatedAt)}</dd></div>
          </dl>
          <button className="button button-outline button-sm" type="button" onClick={startEdit}>Đổi tài khoản</button>
        </>
      )}

      {editing && (
        <form onSubmit={submit} noValidate>
          <BankFields
            legend="Tài khoản nhận tiền gây quỹ"
            value={bank}
            onChange={setBank}
            hint="Kiểm tra kỹ số tài khoản và tên chủ tài khoản (viết hoa, không dấu như trên ứng dụng ngân hàng)."
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="own-actions">
            <button className="button button-primary button-sm" type="submit" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu tài khoản"}
            </button>
            {account && (
              <button className="button button-ghost button-sm" type="button" disabled={busy} onClick={() => setEditing(false)}>
                Hủy
              </button>
            )}
          </div>
        </form>
      )}
      {!editing && error && <p className="form-error" role="alert">{error}</p>}
    </div>
  );
}
