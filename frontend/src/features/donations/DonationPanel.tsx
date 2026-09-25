"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { ApiError, hasSession } from "@/lib/api";
import {
  confirmDonation,
  createDonation,
  generateIdempotencyKey,
  type ApiDonation,
} from "@/lib/api/donations";
import { formatVnd } from "@/lib/format";

type DonationPanelProps = {
  campaignId: string;
  campaignTitle: string;
  /** false khi đang xem dữ liệu mẫu — không cho gửi giao dịch. */
  enabled?: boolean;
};

const PRESETS = [100_000, 200_000, 500_000, 1_000_000];
const MIN_AMOUNT = 20_000;

export function DonationPanel({ campaignId, campaignTitle, enabled = true }: DonationPanelProps) {
  const [amount, setAmount] = useState(200_000);
  const [customAmount, setCustomAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [payment, setPayment] = useState("wallet");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [donation, setDonation] = useState<ApiDonation | null>(null);

  const effectiveAmount = useMemo(() => {
    if (!customAmount) return amount;
    const parsed = Number(customAmount.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount, customAmount]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!hasSession()) {
      setError("login");
      return;
    }
    if (effectiveAmount < MIN_AMOUNT) {
      setError(`Số tiền tối thiểu là ${formatVnd(MIN_AMOUNT)}.`);
      return;
    }

    setLoading(true);
    try {
      const created = await createDonation({
        campaignId,
        amount: effectiveAmount,
        paymentMethod: payment,
        isAnonymous: anonymous,
        idempotencyKey: generateIdempotencyKey(),
      });
      const confirmed = await confirmDonation({ donationId: created.id, status: "completed" });
      setDonation(confirmed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (donation) {
    return (
      <div className="give give-done" aria-live="polite">
        <h2 className="give-title">Đã ghi nhận khoản ủng hộ</h2>
        <p>Cảm ơn bạn đã ủng hộ “{campaignTitle}”. Khoản này sẽ xuất hiện trong sổ cái của chiến dịch.</p>
        <dl className="receipt">
          <div><dt>Số tiền</dt><dd className="num">{formatVnd(Number(donation.amount) || effectiveAmount)}</dd></div>
          <div><dt>Mã giao dịch</dt><dd className="mono">{donation.transactionId ?? donation.id}</dd></div>
          <div><dt>Kênh</dt><dd>{donation.paymentMethod === "payos" ? "PayOS sandbox" : "Ví demo"}</dd></div>
          <div><dt>Hiển thị</dt><dd>{donation.isAnonymous ? "Ẩn danh" : "Tên của bạn"}</dd></div>
          <div><dt>Trạng thái</dt><dd>{donation.status === "completed" ? "Đã xác nhận" : "Đang xử lý"}</dd></div>
        </dl>
        <button className="button button-outline" type="button" onClick={() => setDonation(null)}>
          Ủng hộ thêm
        </button>
      </div>
    );
  }

  return (
    <form className="give" onSubmit={submit} noValidate>
      <h2 className="give-title">Ủng hộ dự án</h2>

      <fieldset className="give-amounts">
        <legend>Số tiền</legend>
        {PRESETS.map((preset) => (
          <button
            aria-pressed={!customAmount && amount === preset}
            key={preset}
            type="button"
            onClick={() => { setAmount(preset); setCustomAmount(""); }}
          >
            <span className="num">{new Intl.NumberFormat("vi-VN").format(preset)}</span>
          </button>
        ))}
      </fieldset>

      <label className="give-field">
        <span>Số khác (VNĐ)</span>
        <input
          inputMode="numeric"
          placeholder={`Tối thiểu ${new Intl.NumberFormat("vi-VN").format(MIN_AMOUNT)}`}
          value={customAmount}
          onChange={(event) => setCustomAmount(event.target.value)}
        />
      </label>

      <fieldset className="give-methods">
        <legend>Kênh thanh toán (thử nghiệm)</legend>
        <label>
          <input type="radio" name="payment" value="wallet" checked={payment === "wallet"} onChange={(event) => setPayment(event.target.value)} />
          <span>Ví demo Góp Mầm</span>
        </label>
        <label>
          <input type="radio" name="payment" value="payos" checked={payment === "payos"} onChange={(event) => setPayment(event.target.value)} />
          <span>PayOS sandbox</span>
        </label>
      </fieldset>

      <label className="give-check">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
        <span>Không hiện tên tôi trong sổ cái</span>
      </label>

      {error === "login" ? (
        <p className="form-error" role="alert">
          Bạn cần <Link href={`/dang-nhap?next=/du-an/${encodeURIComponent(campaignId)}`}>đăng nhập</Link> để ủng hộ.
        </p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}

      <button className="button button-primary button-block" type="submit" disabled={loading || !enabled}>
        {loading ? "Đang xử lý…" : `Ủng hộ ${formatVnd(effectiveAmount)}`}
      </button>
      <p className="fineprint">
        {enabled
          ? "Bản demo dùng thanh toán sandbox, không trừ tiền thật và không lưu dữ liệu thẻ. Số tiền chỉ được cộng khi giao dịch được xác nhận."
          : "Đây là dữ liệu mẫu, không thể ủng hộ."}
      </p>
    </form>
  );
}
