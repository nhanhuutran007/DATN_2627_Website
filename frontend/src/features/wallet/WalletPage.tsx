"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { BalanceToggle, MaskedAmount } from "@/components/ui/MaskedAmount";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { ApiError } from "@/lib/api";
import { useAuthUser, useRedirectAdmin } from "@/lib/auth";
import { submitSepayCheckout } from "@/lib/api/donations";
import {
  cancelTopup,
  confirmDemoTopup,
  createTopup,
  fetchWallet,
  MIN_TOPUP,
  syncTopup,
  WALLET_TX_LABEL,
  type WalletTopup,
  type WalletView,
} from "@/lib/api/wallet";
import { formatDateTime, formatVnd } from "@/lib/format";
import { publishWallet } from "@/lib/wallet-store";

import { WithdrawPanel } from "./WithdrawPanel";

const PRESETS = [100_000, 200_000, 500_000, 1_000_000, 2_000_000];

function errorText(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (err.status === 429) return "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.";
    return err.message;
  }
  return fallback;
}

/** Chỉ cho quay lại trang nội bộ sau khi nạp (tránh chuyển hướng ra ngoài). */
function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}

/**
 * Ví Góp Mầm: nạp qua SePay (chuyển khoản QR, tự cộng khi thanh toán thành công), xem số
 * dư dùng được, số đang giữ cho cam kết và lịch sử. Ủng hộ bằng ví theo "tất cả hoặc không":
 * đạt mục tiêu mới trừ, không đạt thì hoàn về ví.
 */
/** Nạp ví đã tắt (Góp Mầm không giữ tiền người dùng); phần nạp giữ lại trong code nhưng không hiển thị. */
const TOPUP_ENABLED = false;

export function WalletPage() {
  const user = useAuthUser();
  const redirecting = useRedirectAdmin();
  const params = useSearchParams();
  const amountId = useId();
  const next = safeNext(params.get("next"));
  const suggested = Number(params.get("nap")) || 0;
  const [wallet, setWallet] = useState<WalletView | null>(null);
  // Số dư che mặc định với mọi tài khoản (kể cả ví 0 ₫); một nút con mắt bật/tắt cho cả trang.
  const [shown, setShown] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [digits, setDigits] = useState(suggested >= MIN_TOPUP ? String(Math.ceil(suggested)) : "");
  const [pending, setPending] = useState<WalletTopup | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Quay về từ SePay (`?topup=…&payment=…`): hỏi lại server (IPN có thể chưa tới).
  const returnTopup = params.get("topup");
  useEffect(() => {
    if (!user || !returnTopup) return;
    let active = true;
    syncTopup(returnTopup)
      .then((topup) => {
        if (!active) return;
        if (topup.status === "completed") setNotice(`Đã cộng ${formatVnd(Number(topup.amount))} vào ví.`);
        else if (params.get("payment") === "success") setNotice("Đang chờ ngân hàng xác nhận chuyển khoản. Số dư sẽ tự cập nhật khi SePay báo thành công.");
        setReloadKey((key) => key + 1);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user, returnTopup, params]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchWallet()
      .then((data) => {
        if (!active) return;
        setWallet(data);
        publishWallet(data);
      })
      .catch((err: unknown) => {
        if (active) setLoadError(errorText(err, "Không tải được ví."));
      });
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  if (redirecting) return null;
  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="wallet" size={28} /></span>
        <h1>Đăng nhập để dùng ví Góp Mầm</h1>
        <p>Nạp tiền một lần, ủng hộ nhiều dự án; dự án không đạt mục tiêu thì tiền tự hoàn về ví.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href={`/dang-nhap?next=${encodeURIComponent("/vi")}`}>Đăng nhập</Link>
        </div>
      </main>
    );
  }

  const amount = digits ? Number(digits) : 0;

  const startTopup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    if (amount < MIN_TOPUP) {
      setError(`Số tiền nạp tối thiểu ${formatVnd(MIN_TOPUP)}.`);
      return;
    }
    setBusy("create");
    setError("");
    setNotice("");
    try {
      const { topup, checkout } = await createTopup(amount);
      if (checkout) {
        // Sang SePay quét QR; tiền tự cộng khi SePay báo thanh toán thành công.
        submitSepayCheckout(checkout);
        return;
      }
      setPending(topup);
    } catch (err) {
      setError(errorText(err, "Không tạo được lệnh nạp."));
    } finally {
      setBusy("");
    }
  };

  const confirmDemo = async () => {
    if (!pending) return;
    setBusy("demo");
    setError("");
    try {
      const topup = await confirmDemoTopup(pending.id);
      setPending(null);
      setDigits("");
      setNotice(`Đã cộng ${formatVnd(Number(topup.amount))} vào ví (nạp thử).`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(errorText(err, "Không xác nhận được lệnh nạp."));
    } finally {
      setBusy("");
    }
  };

  const cancel = async () => {
    if (!pending) return;
    setBusy("cancel");
    try {
      await cancelTopup(pending.id);
      setPending(null);
    } catch (err) {
      setError(errorText(err, "Không hủy được lệnh nạp."));
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="wallet-page">
      <div className="wallet-inner">
        <div className="wallet-head">
          <h1>Ví Góp Mầm</h1>
          <p className="org-lead">
            Ví Góp Mầm đã <b>ngừng nhận nạp tiền</b>: giờ bạn chỉ cần cam kết ủng hộ, và chỉ thanh toán bằng QR SePay khi dự án
            đạt mục tiêu. Nếu còn số dư cũ, bạn có thể rút về tài khoản ngân hàng bên dưới.
          </p>
        </div>

        {notice && <p className="form-notice" role="status">{notice}</p>}
        {next && notice && (
          <p><Link className="button button-primary" href={next}>Tiếp tục ủng hộ</Link></p>
        )}
        {loadError && <p className="form-error" role="alert">{loadError}</p>}

        <section className="wallet-balances" aria-label="Số dư ví">
          <div className="wallet-balance">
            <span className="wallet-balance-label">
              Số dư dùng được
              <BalanceToggle className="balance-toggle-sm" shown={shown} onToggle={() => setShown((value) => !value)} />
            </span>
            <b className="num">{wallet ? <MaskedAmount className="masked-amount-start" value={wallet.balance} shown={shown} /> : "…"}</b>
          </div>
          <div className="wallet-balance wallet-balance-held">
            <span>Đang giữ cho cam kết</span>
            <b className="num">{wallet ? <MaskedAmount className="masked-amount-start" value={wallet.held} shown={shown} /> : "…"}</b>
            <small>Trừ khi dự án đạt mục tiêu, hoàn về ví nếu không đạt</small>
          </div>
          {wallet && wallet.withdrawing > 0 && (
            <div className="wallet-balance wallet-balance-held">
              <span>Đang chờ rút về ngân hàng</span>
              <b className="num"><MaskedAmount className="masked-amount-start" value={wallet.withdrawing} shown={shown} /></b>
              <small>Quản trị viên đang chuyển khoản</small>
            </div>
          )}
        </section>

        {TOPUP_ENABLED && (
        <section className="panel wallet-topup" aria-labelledby={`${amountId}-title`}>
          <h2 id={`${amountId}-title`}>Nạp tiền vào ví</h2>
          {pending ? (
            <div className="wallet-pending">
              <p>
                Lệnh nạp <b className="num">{formatVnd(Number(pending.amount))}</b> · mã <span className="mono">{pending.transferCode}</span>
              </p>
              <p className="hint">
                Môi trường thử nghiệm chưa cấu hình SePay: bấm “Xác nhận nạp thử” để giả lập ngân hàng báo chuyển khoản thành công.
              </p>
              <div className="own-actions">
                <button className="button button-primary" type="button" disabled={!!busy} onClick={confirmDemo}>
                  {busy === "demo" ? "Đang xác nhận…" : "Xác nhận nạp thử"}
                </button>
                <button className="button button-ghost" type="button" disabled={!!busy} onClick={cancel}>Hủy lệnh nạp</button>
              </div>
            </div>
          ) : (
            <form className="wallet-topup-form" onSubmit={startTopup} noValidate>
              <fieldset className="donate-presets">
                <legend className="sr-only">Chọn nhanh số tiền nạp</legend>
                {PRESETS.map((preset) => (
                  <button aria-pressed={amount === preset} key={preset} type="button" onClick={() => setDigits(String(preset))}>
                    <span className="num">{preset.toLocaleString("vi-VN")}</span>
                  </button>
                ))}
              </fieldset>
              <label className="field">
                <span>Số tiền nạp</span>
                <MoneyInput id={amountId} value={digits} placeholder="Tối thiểu 10.000đ" onChange={setDigits} />
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button button-primary button-lg" type="submit" disabled={!!busy || (!!wallet && !wallet.sepay && !wallet.demoTopup)}>
                {busy === "create" ? "Đang tạo lệnh…" : wallet?.sepay ? "Nạp qua SePay (QR chuyển khoản)" : "Tạo lệnh nạp thử"}
              </button>
              <p className="fineprint">
                {wallet?.sepay
                  ? "Bạn sẽ sang trang SePay để quét VietQR bằng app ngân hàng. Tiền tự cộng vào ví khi chuyển khoản thành công."
                  : "Môi trường thử nghiệm: lệnh nạp được xác nhận thủ công, không có tiền thật."}
              </p>
            </form>
          )}
        </section>
        )}

        <WithdrawPanel balance={wallet ? wallet.balance : null} onChanged={() => setReloadKey((key) => key + 1)} />

        <section className="wallet-history" aria-labelledby="wallet-history-title">
          <h2 id="wallet-history-title">Lịch sử ví</h2>
          {!wallet ? (
            <p className="hint" role="status">Đang tải…</p>
          ) : wallet.transactions.length === 0 ? (
            <p className="hint">Chưa có giao dịch nào.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Thời gian</th>
                    <th scope="col">Nội dung</th>
                    <th scope="col" className="num">Số tiền</th>
                    <th scope="col" className="num">Số dư sau</th>
                    <th scope="col" className="num">Đang giữ sau</th>
                    <th scope="col" className="num">Chờ rút sau</th>
                  </tr>
                </thead>
                <tbody>
                  {wallet.transactions.map((tx) => {
                    const meta = WALLET_TX_LABEL[tx.type];
                    return (
                      <tr key={tx.id}>
                        <td className="nowrap">{formatDateTime(tx.createdAt)}</td>
                        <td>
                          {meta.label}
                          {tx.type === "capture" && tx.donationId && (
                            <> · <Link href={`/bien-nhan/${tx.donationId}`}>Biên nhận</Link></>
                          )}
                        </td>
                        <td className={`num wallet-amount wallet-amount-${tx.type}`}>
                          {meta.sign}{formatVnd(tx.amount)}
                        </td>
                        <td className="num"><MaskedAmount value={tx.balanceAfter} shown={shown} /></td>
                        <td className="num"><MaskedAmount value={tx.heldAfter} shown={shown} /></td>
                        <td className="num"><MaskedAmount value={tx.withdrawingAfter ?? 0} shown={shown} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
