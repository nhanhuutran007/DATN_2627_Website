"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import { ApiError, hasSession } from "@/lib/api";
import {
  cancelDonation,
  confirmDonation,
  createDonation,
  generateIdempotencyKey,
  type ApiDonation,
} from "@/lib/api/donations";
import { formatVnd } from "@/lib/format";
import type { RewardTier } from "@/lib/api/rewards";

type DonationPanelProps = {
  campaignId: string;
  campaignTitle: string;
  /** false khi đang xem dữ liệu mẫu — không cho gửi giao dịch. */
  enabled?: boolean;
  /** Mức quà đang nhận của chiến dịch. */
  rewardTiers?: RewardTier[];
};

const PRESETS = [100_000, 200_000, 500_000, 1_000_000];
const MIN_AMOUNT = 20_000;

export function DonationPanel({ campaignId, campaignTitle, enabled = true, rewardTiers = [] }: DonationPanelProps) {
  const [amount, setAmount] = useState(200_000);
  const [customAmount, setCustomAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [payment, setPayment] = useState("wallet");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [donation, setDonation] = useState<ApiDonation | null>(null);
  const [rewardTierId, setRewardTierId] = useState("");
  const selectedTier = rewardTiers.find((tier) => tier.id === rewardTierId) ?? null;

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
    if (selectedTier && effectiveAmount < selectedTier.minAmount) {
      setError(`Mức quà "${selectedTier.title}" cần ủng hộ tối thiểu ${formatVnd(selectedTier.minAmount)}.`);
      return;
    }

    setLoading(true);
    let created: ApiDonation | null = null;
    try {
      created = await createDonation({
        campaignId,
        amount: effectiveAmount,
        paymentMethod: payment,
        isAnonymous: anonymous,
        idempotencyKey: generateIdempotencyKey(),
        ...(selectedTier ? { rewardTierId: selectedTier.id } : {}),
      });
      // Đơn đã tạo: dù xác nhận lỗi vẫn hiển thị để người dùng thanh toán lại hoặc hủy.
      setDonation(created);
      setDonation(await confirmDonation({ donationId: created.id, status: "completed" }));
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (created) setError("Chưa xác nhận được thanh toán do lỗi kết nối. Bạn có thể thanh toán lại hoặc hủy giao dịch.");
      else setError("Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const retryPayment = async () => {
    if (!donation) return;
    setLoading(true);
    setError("");
    try {
      setDonation(await confirmDonation({ donationId: donation.id, status: "completed" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Chưa xác nhận được thanh toán. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const cancelPending = async () => {
    if (!donation) return;
    setLoading(true);
    setError("");
    try {
      setDonation(await cancelDonation(donation.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không hủy được giao dịch. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const startOver = () => {
    setDonation(null);
    setRewardTierId("");
    setError("");
  };

  if (donation && donation.status !== "completed") {
    const pending = donation.status === "pending";
    const outcome = {
      pending: { title: "Giao dịch đang chờ thanh toán", text: "Bạn có thể thanh toán lại hoặc hủy giao dịch. Giao dịch chưa thanh toán sẽ tự hết hạn sau 30 phút." },
      cancelled: { title: "Đã hủy giao dịch", text: "Không có khoản tiền nào được ghi nhận." },
      expired: { title: "Giao dịch đã hết hạn", text: "Giao dịch quá thời gian chờ thanh toán. Không có khoản tiền nào được ghi nhận." },
      failed: { title: "Thanh toán không thành công", text: "Không có khoản tiền nào được ghi nhận. Bạn có thể thử lại." },
      refunded: { title: "Khoản ủng hộ đã được hoàn tiền", text: "" },
    }[donation.status];
    return (
      <div className="give give-done" aria-live="polite">
        <h2 className="give-title">{outcome.title}</h2>
        <p>{outcome.text}</p>
        <dl className="receipt">
          <div><dt>Số tiền</dt><dd className="num">{formatVnd(Number(donation.amount) || effectiveAmount)}</dd></div>
          <div><dt>Mã giao dịch</dt><dd className="mono">{donation.transactionId ?? donation.id}</dd></div>
        </dl>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="give-done-actions">
          {pending ? (
            <>
              <button className="button button-primary" type="button" disabled={loading} onClick={retryPayment}>
                {loading ? "Đang xử lý…" : "Thanh toán lại"}
              </button>
              <button className="button button-outline" type="button" disabled={loading} onClick={cancelPending}>
                Hủy giao dịch
              </button>
            </>
          ) : (
            <button className="button button-primary" type="button" onClick={startOver}>Tạo giao dịch mới</button>
          )}
        </div>
      </div>
    );
  }

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
          {selectedTier && <div><dt>Phần quà</dt><dd>{donation.rewardTierId ? selectedTier.title : "Hết suất — ghi nhận không kèm quà"}</dd></div>}
          <div><dt>Trạng thái</dt><dd>Đã xác nhận</dd></div>
        </dl>
        <div className="give-done-actions">
          <Link className="button button-primary" href={`/bien-nhan/${donation.id}`}>Xem biên nhận</Link>
          <button className="button button-outline" type="button" onClick={startOver}>
            Ủng hộ thêm
          </button>
        </div>
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

      {rewardTiers.length > 0 && (
        <fieldset className="give-rewards">
          <legend>Chọn phần quà</legend>
          <label className="reward-option">
            <input type="radio" name="reward" value="" checked={!rewardTierId} onChange={() => setRewardTierId("")} />
            <span className="reward-option-body"><b>Ủng hộ không nhận quà</b></span>
          </label>
          {rewardTiers.map((tier) => {
            const soldOut = tier.remaining === 0;
            return (
              <label className="reward-option" key={tier.id}>
                <input
                  type="radio"
                  name="reward"
                  value={tier.id}
                  checked={rewardTierId === tier.id}
                  disabled={soldOut}
                  onChange={() => {
                    setRewardTierId(tier.id);
                    if (effectiveAmount < tier.minAmount) {
                      setCustomAmount(String(tier.minAmount));
                    }
                  }}
                />
                <span className="reward-option-body">
                  <span className="reward-option-head">
                    <b>{tier.title}</b>
                    <b className="num">từ {formatVnd(tier.minAmount)}</b>
                  </span>
                  <span>{tier.description}</span>
                  <small>
                    {soldOut ? "Đã hết suất" : tier.remaining === null ? "Không giới hạn suất" : `Còn ${tier.remaining}/${tier.quantityLimit} suất`}
                    {tier.estimatedDelivery && ` · Dự kiến gửi ${new Date(tier.estimatedDelivery).toLocaleDateString("vi-VN")}`}
                  </small>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

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
