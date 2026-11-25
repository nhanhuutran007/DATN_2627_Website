"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { BankFields, bankDraftError, bankPayload, EMPTY_BANK, maskAccount, type BankDraft } from "@/features/finance/BankFields";
import { ApiError } from "@/lib/api";
import { deleteMyBankAccount, fetchMyBankAccount, saveMyBankAccount, type MyBankAccount } from "@/lib/api/users";
import { formatDateTime } from "@/lib/format";

/**
 * Dòng "Tài khoản ngân hàng" ở Cài đặt › Tài khoản: tài khoản mặc định để nhận tiền gây quỹ
 * (điền sẵn khi tạo chiến dịch) và nhận hoàn tiền. Lưu/đổi/xóa cần mã OTP gửi email.
 */
export function BankAccountSettings() {
  const dialog = useDialog();
  const [account, setAccount] = useState<MyBankAccount | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [bank, setBank] = useState<BankDraft>(EMPTY_BANK);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchMyBankAccount()
      .then((loaded) => active && setAccount(loaded))
      .catch(() => {
        if (!active) return;
        setAccount(null);
        setMessage({ tone: "error", text: "Không tải được tài khoản ngân hàng." });
      });
    return () => {
      active = false;
    };
  }, []);

  const startEdit = () => {
    setBank(account ? { bankName: account.bankName, accountNumber: account.bankAccountNumber, accountName: account.bankAccountName } : EMPTY_BANK);
    setEditing(true);
    setMessage(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const invalid = bankDraftError(bank);
    if (invalid) return setMessage({ tone: "error", text: invalid });
    setBusy(true);
    setMessage(null);
    try {
      setAccount(await saveMyBankAccount(bankPayload(bank)));
      setEditing(false);
      setMessage({ tone: "ok", text: "Đã lưu tài khoản ngân hàng. Email xác nhận đã được gửi cho bạn." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Không lưu được tài khoản ngân hàng." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await dialog.confirm({
      title: "Xóa tài khoản ngân hàng?",
      message: "Tài khoản nhận tiền đã khai báo cho từng chiến dịch không bị ảnh hưởng.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteMyBankAccount();
      setAccount(null);
      setMessage({ tone: "ok", text: "Đã xóa tài khoản ngân hàng." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Không xóa được tài khoản ngân hàng." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="account-row" aria-labelledby="account-bank-label">
      <div className="account-row-main">
        <h2 id="account-bank-label" className="account-label">Tài khoản ngân hàng</h2>
        {editing ? (
          <form className="account-edit" onSubmit={submit} noValidate>
            <BankFields
              legend="Tài khoản ngân hàng của bạn"
              value={bank}
              onChange={setBank}
              hint="Dùng để nhận tiền gây quỹ và hoàn tiền. Tên chủ tài khoản viết hoa, không dấu như trên ứng dụng ngân hàng. Lưu cần mã xác minh gửi qua email."
            />
            <div className="account-edit-actions">
              <button className="account-pill" type="button" disabled={busy} onClick={() => setEditing(false)}>Hủy</button>
              <button className="account-pill account-pill-solid" type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Lưu"}</button>
            </div>
          </form>
        ) : account === undefined ? (
          <p className="account-value is-empty">Đang tải…</p>
        ) : account ? (
          <>
            <p className="account-value">
              {account.bankName} · <span className="mono">{maskAccount(account.bankAccountNumber)}</span> · {account.bankAccountName}
            </p>
            <small className="account-hint">
              Cập nhật {formatDateTime(account.updatedAt)}. Được điền sẵn khi bạn tạo chiến dịch; chỉ bạn và quản trị viên xem được.
            </small>
          </>
        ) : (
          <p className="account-value is-empty">Chưa có. Thêm để nhận tiền gây quỹ và hoàn tiền nhanh hơn.</p>
        )}
        {message && (
          <p className={message.tone === "ok" ? "form-notice" : "form-error"} role={message.tone === "ok" ? "status" : "alert"}>
            {message.text}
          </p>
        )}
      </div>
      {!editing && account !== undefined && (
        <div className="account-edit-actions">
          {account && (
            <button className="account-pill account-pill-danger" type="button" disabled={busy} onClick={() => void remove()}>Xóa</button>
          )}
          <button className="account-pill" type="button" disabled={busy} onClick={startEdit}>{account ? "Sửa" : "Thêm"}</button>
        </div>
      )}
    </section>
  );
}
