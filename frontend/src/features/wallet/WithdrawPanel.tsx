"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { useDialog } from "@/components/ui/DialogProvider";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { BankFields, bankDraftError, bankPayload, EMPTY_BANK, type BankDraft } from "@/features/finance/BankFields";
import { ApiError } from "@/lib/api";
import {
  cancelWithdrawal,
  fetchMyWithdrawals,
  MIN_WITHDRAW,
  requestWithdrawal,
  WITHDRAWAL_STATUS_LABEL,
  type Withdrawal,
} from "@/lib/api/wallet";
import { formatDateTime, formatVnd } from "@/lib/format";

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (err.status === 429) return "Bạn gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau.";
    return err.message;
  }
  return fallback;
}

type WithdrawPanelProps = {
  /** Số dư dùng được hiện tại (null = đang tải). */
  balance: number | null;
  /** Gọi sau khi gửi/hủy yêu cầu để tải lại số dư và lịch sử ví. */
  onChanged: () => void;
};

/**
 * Rút tiền ví về tài khoản ngân hàng: số tiền bị khóa ngay khi gửi yêu cầu (cần mã OTP),
 * quản trị viên chuyển khoản tay rồi xác nhận kèm mã giao dịch; bị từ chối hoặc tự hủy
 * thì tiền trả lại số dư.
 */
export function WithdrawPanel({ balance, onChanged }: WithdrawPanelProps) {
  const id = useId();
  const dialog = useDialog();
  const [items, setItems] = useState<Withdrawal[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);
  const [digits, setDigits] = useState("");
  const [bank, setBank] = useState<BankDraft>(EMPTY_BANK);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetchMyWithdrawals()
      .then((list) => {
        if (active) setItems(list);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const amount = digits ? Number(digits) : 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (amount < MIN_WITHDRAW) return setError(`Số tiền rút tối thiểu ${formatVnd(MIN_WITHDRAW)}.`);
    if (balance !== null && amount > balance) return setError(`Số dư dùng được chỉ còn ${formatVnd(balance)}.`);
    const invalid = bankDraftError(bank);
    if (invalid) return setError(invalid);
    setBusy("submit");
    setError("");
    try {
      // Máy chủ yêu cầu mã OTP gửi email; hộp nhập mã tự mở rồi gửi lại.
      const created = await requestWithdrawal({ amount, ...bankPayload(bank) });
      setDigits("");
      setBank(EMPTY_BANK);
      setOpen(false);
      setNotice(`Đã gửi yêu cầu rút ${formatVnd(created.amount)}. Quản trị viên sẽ chuyển khoản và báo cho bạn.`);
      setReloadKey((key) => key + 1);
      onChanged();
    } catch (err) {
      setError(errorText(err, "Không gửi được yêu cầu rút tiền."));
    } finally {
      setBusy("");
    }
  };

  const cancel = async (item: Withdrawal) => {
    const ok = await dialog.confirm({
      title: `Hủy yêu cầu rút ${formatVnd(item.amount)}?`,
      message: "Số tiền sẽ trả lại số dư ví ngay.",
      confirmLabel: "Hủy yêu cầu",
    });
    if (!ok) return;
    setBusy(item.id);
    setError("");
    try {
      await cancelWithdrawal(item.id);
      setReloadKey((key) => key + 1);
      onChanged();
    } catch (err) {
      setError(errorText(err, "Không hủy được yêu cầu."));
    } finally {
      setBusy("");
    }
  };

  return (
    <section className="panel wallet-withdraw" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>Rút tiền về tài khoản ngân hàng</h2>
      <p className="hint">
        Số tiền rút bị khóa ngay khi gửi yêu cầu. Quản trị viên chuyển khoản từ tài khoản Góp Mầm sang tài khoản của bạn
        (thường trong 1–3 ngày làm việc) rồi gửi mã giao dịch. Bạn có thể hủy khi yêu cầu còn chờ.
      </p>
      {notice && <p className="form-notice" role="status">{notice}</p>}

      {open ? (
        <form className="wallet-withdraw-form" onSubmit={submit} noValidate>
          <label className="field">
            <span>Số tiền rút</span>
            <MoneyInput value={digits} placeholder={`Tối thiểu ${MIN_WITHDRAW.toLocaleString("vi-VN")}đ`} onChange={setDigits} />
            {balance !== null && (
              <small className="hint">
                Dùng được: {formatVnd(balance)}{" "}
                <button className="link-inline" type="button" onClick={() => setDigits(String(Math.floor(balance)))}>Rút hết</button>
              </small>
            )}
          </label>
          <BankFields
            value={bank}
            onChange={setBank}
            hint="Tài khoản phải đứng tên bạn. Sai thông tin có thể khiến yêu cầu bị từ chối (tiền vẫn trả lại ví)."
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="own-actions">
            <button className="button button-primary" type="submit" disabled={!!busy}>
              {busy === "submit" ? "Đang gửi…" : "Gửi yêu cầu rút"}
            </button>
            <button className="button button-ghost" type="button" disabled={!!busy} onClick={() => setOpen(false)}>Đóng</button>
          </div>
        </form>
      ) : (
        <button
          className="button button-outline wallet-withdraw-open"
          type="button"
          disabled={balance !== null && balance < MIN_WITHDRAW}
          onClick={() => { setOpen(true); setNotice(""); setError(""); }}
        >
          Rút tiền
        </button>
      )}
      {!open && balance !== null && balance < MIN_WITHDRAW && (
        <p className="hint">Cần số dư tối thiểu {formatVnd(MIN_WITHDRAW)} để rút.</p>
      )}
      {!open && error && <p className="form-error" role="alert">{error}</p>}

      {items && items.length > 0 && (
        <ul className="wallet-withdraw-list">
          {items.map((item) => {
            const status = WITHDRAWAL_STATUS_LABEL[item.status];
            return (
              <li key={item.id}>
                <div>
                  <b className="num">{formatVnd(item.amount)}</b>
                  <span className="hint">
                    {item.bankName} {item.bankAccountNumber} · {formatDateTime(item.createdAt)}
                  </span>
                  {item.transferReference && <span className="hint">Mã giao dịch: <span className="mono">{item.transferReference}</span></span>}
                  {item.status === "rejected" && item.adminNotes && <span className="hint">Lý do: {item.adminNotes}</span>}
                </div>
                <div className="wallet-withdraw-side">
                  <span className={`tag ${status.tone}`}>{status.label}</span>
                  {item.status === "pending" && (
                    <button className="link-button" type="button" disabled={busy === item.id} onClick={() => cancel(item)}>
                      Hủy<span className="sr-only"> yêu cầu rút {formatVnd(item.amount)}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
