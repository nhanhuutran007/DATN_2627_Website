"use client";

import Link from "next/link";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import {
  fetchMyRefundRequests,
  fetchReceipt,
  needsManualRefund,
  REFUND_METHOD_LABEL,
  REFUND_STATUS_LABEL,
  requestRefund,
  type DonationReceipt,
  type RefundRequest,
} from "@/lib/api/finance";
import { useAuthUser } from "@/lib/auth";
import { formatVnd, paymentMethodLabel } from "@/lib/format";

type LoadState = "loading" | "ready" | "notfound" | "error";

/** Gợi ý tên ngân hàng phổ biến cho ô nhập (vẫn gõ tự do được). */
const COMMON_BANKS = [
  "Vietcombank", "VietinBank", "BIDV", "Agribank", "Techcombank", "MB Bank", "ACB", "VPBank", "Sacombank",
  "TPBank", "VIB", "HDBank", "SHB", "OCB", "MSB", "SeABank", "Eximbank", "LPBank", "Nam A Bank", "Bac A Bank",
];

/** Số tài khoản: bỏ khoảng trắng, dấu chấm, gạch ngang — khớp chuẩn hóa ở server. */
const accountDigits = (value: string) => value.replace(/[\s.-]/g, "");
const ACCOUNT_PATTERN = /^\d{6,19}$/;
const maskAccount = (value: string) => `•••• ${value.slice(-4)}`;

const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "medium", timeStyle: "short" }) : "—";

function RefundSection({ receipt, request, onRequested }: { receipt: DonationReceipt; request: RefundRequest | null; onRequested: (r: RefundRequest) => void }) {
  const banksId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Khoản qua SePay hoàn bằng chuyển khoản tay → cần tài khoản nhận.
  const needsBank = needsManualRefund(receipt.paymentMethod);

  if (receipt.status === "refunded") return null;
  if (request) {
    return (
      <div className="receipt-refund" role="status">
        <p><b>Yêu cầu hoàn tiền:</b> {REFUND_STATUS_LABEL[request.status]} · gửi {dateTime(request.createdAt)}</p>
        {request.bankAccountNumber && (
          <p className="hint">
            Tài khoản nhận hoàn: {request.bankName} · {maskAccount(request.bankAccountNumber)} · {request.bankAccountName}
          </p>
        )}
        {request.adminNotes && <p className="hint">Phản hồi của quản trị viên: {request.adminNotes}</p>}
      </div>
    );
  }

  const digits = accountDigits(accountNumber);
  const bankError =
    !needsBank ? "" :
    bankName.trim().length < 2 ? "Vui lòng nhập tên ngân hàng." :
    !ACCOUNT_PATTERN.test(digits) ? "Số tài khoản chỉ gồm 6–19 chữ số." :
    accountName.trim().length < 2 ? "Vui lòng nhập tên chủ tài khoản." :
    "";
  const canSubmit = reason.trim().length >= 10 && !bankError && !busy;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      if (bankError) setError(bankError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      onRequested(
        await requestRefund(receipt.donationId, {
          reason: reason.trim(),
          ...(needsBank
            ? { bankName: bankName.trim(), bankAccountNumber: digits, bankAccountName: accountName.trim().toUpperCase() }
            : {}),
        }),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không gửi được yêu cầu.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="receipt-refund no-print">
      {!open ? (
        <button className="link-button" type="button" onClick={() => setOpen(true)}>Yêu cầu hoàn tiền</button>
      ) : (
        <form className="form" onSubmit={submit}>
          <p className="hint">
            Bạn có thể yêu cầu hoàn trong 7 ngày sau khi ủng hộ, hoặc bất kỳ lúc nào nếu chiến dịch không đạt mục tiêu/bị hủy.
            Quản trị viên xem xét và phản hồi qua thông báo.
          </p>
          <label className="field">
            <span>Lý do (tối thiểu 10 ký tự)</span>
            <textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {needsBank && (
            <fieldset className="refund-bank">
              <legend>Tài khoản nhận hoàn tiền</legend>
              <p className="hint">
                Khoản ủng hộ qua SePay được hoàn bằng chuyển khoản. Vui lòng nhập đúng tài khoản đứng tên bạn để quản trị viên
                chuyển trả.
              </p>
              <label className="field">
                <span>Ngân hàng</span>
                <input
                  list={banksId}
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Vd. Vietcombank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <datalist id={banksId}>
                  {COMMON_BANKS.map((bank) => <option key={bank} value={bank} />)}
                </datalist>
              </label>
              <label className="field">
                <span>Số tài khoản</span>
                <input
                  inputMode="numeric"
                  maxLength={30}
                  autoComplete="off"
                  placeholder="Chỉ gồm chữ số"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Tên chủ tài khoản</span>
                <input
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Vd. NGUYEN VAN A"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                />
              </label>
            </fieldset>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="comment-composer-actions">
            <button className="button button-ghost button-sm" type="button" onClick={() => setOpen(false)}>Huỷ</button>
            <button className="button button-primary button-sm" type="submit" disabled={!canSubmit}>
              {busy ? "Đang gửi…" : "Gửi yêu cầu"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/** Biên nhận ủng hộ: in hoặc lưu PDF bằng trình duyệt. */
export function ReceiptView({ donationId }: { donationId: string }) {
  const user = useAuthUser();
  const [receipt, setReceipt] = useState<DonationReceipt | null>(null);
  const [request, setRequest] = useState<RefundRequest | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([fetchReceipt(donationId), fetchMyRefundRequests().catch(() => [] as RefundRequest[])])
      .then(([r, requests]) => {
        if (cancelled) return;
        setReceipt(r);
        setRequest(requests.find((q) => q.donationId === donationId && q.status !== "rejected") ?? requests.find((q) => q.donationId === donationId) ?? null);
        setState("ready");
      })
      .catch((err) => {
        if (!cancelled) setState(err instanceof ApiError && (err.status === 404 || err.status === 409) ? "notfound" : "error");
      });
    return () => {
      cancelled = true;
    };
  }, [donationId, user]);

  if (!user) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="receipt" size={28} /></span>
        <h1>Đăng nhập để xem biên nhận</h1>
        <p>Biên nhận chỉ hiển thị cho chính người ủng hộ.</p>
        <div className="gate-actions">
          <Link className="button button-primary" href={`/dang-nhap?next=/bien-nhan/${encodeURIComponent(donationId)}`}>Đăng nhập</Link>
        </div>
      </main>
    );
  }

  if (state === "loading") return <main className="container receipt-page"><p className="hint" role="status">Đang tải biên nhận…</p></main>;
  if (state === "notfound" || state === "error" || !receipt) {
    return (
      <main className="container gate">
        <span className="gate-icon"><Icon name="receipt" size={28} /></span>
        <h1>{state === "error" ? "Không tải được biên nhận" : "Không tìm thấy biên nhận"}</h1>
        <p>{state === "error" ? "Vui lòng thử lại sau." : "Khoản ủng hộ không tồn tại, chưa được xác nhận hoặc bạn không có quyền xem."}</p>
        <div className="gate-actions"><Link className="button button-outline" href="/dashboard">Về trang quản lý</Link></div>
      </main>
    );
  }

  const refunded = receipt.status === "refunded";
  return (
    <main className="container receipt-page">
      <div className="receipt-actions no-print">
        <Link className="receipt-back" href="/dashboard#ung-ho-cua-toi">
          <span className="receipt-back-icon" aria-hidden="true"><Icon name="wallet" size={16} /></span>
          Khoản ủng hộ của tôi
        </Link>
        <button className="button button-primary button-sm" type="button" onClick={() => window.print()}>
          <Icon name="document" size={16} /> In / Lưu PDF
        </button>
      </div>

      <article className="receipt-card" aria-labelledby="receipt-title">
        <header className="receipt-head">
          <div>
            <p className="receipt-brand">GÓP MẦM</p>
            <h1 id="receipt-title">Biên nhận ủng hộ</h1>
          </div>
          <div className="receipt-no">
            <span>Số biên nhận</span>
            <b className="mono">{receipt.receiptNumber}</b>
          </div>
        </header>

        {refunded && <p className="receipt-stamp">ĐÃ HOÀN TIỀN</p>}

        <dl className="receipt-grid">
          <div><dt>Người ủng hộ</dt><dd>{receipt.donorName}{receipt.isAnonymous && <small> (ẩn danh trên sổ cái công khai)</small>}</dd></div>
          <div><dt>Chiến dịch</dt><dd><Link href={`/du-an/${receipt.campaign.id}`}>{receipt.campaign.title}</Link></dd></div>
          <div><dt>Số tiền</dt><dd className="num receipt-amount">{formatVnd(receipt.amount)}</dd></div>
          <div><dt>Thời gian xác nhận</dt><dd>{dateTime(receipt.completedAt)}</dd></div>
          <div><dt>Kênh thanh toán</dt><dd>{paymentMethodLabel(receipt.paymentMethod)}</dd></div>
          <div><dt>Mã giao dịch</dt><dd className="mono">{receipt.transactionId ?? receipt.donationId}</dd></div>
          {receipt.rewardTitle && <div><dt>Phần quà</dt><dd>{receipt.rewardTitle}</dd></div>}
          <div><dt>Trạng thái</dt><dd>{refunded ? "Đã hoàn tiền" : "Đã xác nhận"}</dd></div>
          {receipt.refund && (
            <>
              <div><dt>Thời gian hoàn</dt><dd>{dateTime(receipt.refund.refundedAt)}</dd></div>
              {receipt.refund.method && (
                <div><dt>Hình thức hoàn</dt><dd>{REFUND_METHOD_LABEL[receipt.refund.method] ?? receipt.refund.method}</dd></div>
              )}
              <div>
                <dt>{receipt.refund.method === "manual_transfer" ? "Mã giao dịch chuyển khoản" : "Mã hoàn tiền"}</dt>
                <dd className="mono">{receipt.refund.reference ?? "—"}</dd>
              </div>
              {receipt.refund.proofUrl && (
                <div className="no-print">
                  <dt>Chứng từ hoàn</dt>
                  <dd><a href={receipt.refund.proofUrl} target="_blank" rel="noreferrer">Xem ảnh chứng từ</a></dd>
                </div>
              )}
            </>
          )}
        </dl>

        <p className="receipt-note">
          Biên nhận xác nhận khoản ủng hộ đã được cổng thanh toán ghi nhận trên nền tảng Góp Mầm. Đây không phải hóa đơn
          giá trị gia tăng.
          {receipt.paymentMethod === "wallet" && " Khoản này thanh toán bằng Ví demo Góp Mầm (môi trường thử nghiệm), không phát sinh tiền thật."}
        </p>
      </article>

      <RefundSection receipt={receipt} request={request} onRequested={setRequest} />
    </main>
  );
}
