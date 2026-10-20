"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useId, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { SepayPaymentStatus, type SepayReturn } from "@/features/donations/SepayPaymentStatus";
import { ShareCampaignButton } from "@/features/follows/ShareCampaignButton";
import { ApiError, hasSession } from "@/lib/api";
import { useIsAdmin } from "@/lib/auth";
import {
  cancelDonation,
  confirmDonation,
  createDonation,
  createSepayCheckout,
  fetchCampaignLedger,
  fetchDonation,
  fetchPaymentOptions,
  generateIdempotencyKey,
  type ApiDonation,
  type LedgerEntry,
  type PaymentOptions,
  submitSepayCheckout,
  syncSepayDonation,
} from "@/lib/api/donations";
import { formatVnd, paymentMethodLabel } from "@/lib/format";
import type { RewardTier } from "@/lib/api/rewards";

type DonationPanelProps = {
  campaignId: string;
  campaignTitle: string;
  /** false khi chiến dịch chưa công khai/đã đóng — không cho gửi giao dịch. */
  enabled?: boolean;
  /** Mức quà đang nhận của chiến dịch. */
  rewardTiers?: RewardTier[];
  /** Quay về từ trang SePay (`?donation=…&payment=…`): hiện trạng thái đơn đó. */
  sepayReturn?: { donationId: string; result: SepayReturn } | null;
};

const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];
const SUGGESTED = 200_000;
const MIN_AMOUNT = 20_000;
const MAX_DIGITS = 12;

type PaymentMethod = { value: string; label: string; note: string };

const DEMO_METHODS: PaymentMethod[] = [
  { value: "wallet", label: "Ví demo Góp Mầm", note: "Xác nhận ngay, dùng cho buổi demo" },
];

/** SePay (khi máy chủ đã cấu hình) đứng đầu và được chọn sẵn; ví demo chỉ khi còn bật. */
function paymentMethods(options: PaymentOptions | null): PaymentMethod[] {
  if (!options) return DEMO_METHODS;
  const sepay: PaymentMethod[] = options.sepay
    ? [{
        value: "sepay",
        label: options.sepay.env === "sandbox" ? "Chuyển khoản QR · SePay (sandbox)" : "Chuyển khoản QR · SePay",
        note: "Quét mã VietQR bằng app ngân hàng bất kỳ, xác nhận tự động",
      }]
    : [];
  return [...sepay, ...(options.demoWallet ? DEMO_METHODS : [])];
}

const vnNumber = new Intl.NumberFormat("vi-VN");

/**
 * Form ủng hộ trên trang /du-an/[id]/ung-ho (bố cục theo trang donate của GoFundMe):
 * chọn nhanh số tiền hoặc nhập ô lớn → quà (nếu có) → kênh thanh toán → tóm tắt → xác nhận.
 */
export function DonationPanel({ campaignId, campaignTitle, enabled = true, rewardTiers = [], sepayReturn = null }: DonationPanelProps) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [digits, setDigits] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [payment, setPayment] = useState("wallet");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [donation, setDonation] = useState<ApiDonation | null>(null);
  const [rewardTierId, setRewardTierId] = useState("");
  const [recent, setRecent] = useState<LedgerEntry | null>(null);
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const methods = paymentMethods(options);
  const amountId = useId();
  const selectedTier = rewardTiers.find((tier) => tier.id === rewardTierId) ?? null;
  const amount = digits ? Number(digits) : 0;

  // Một dòng "ai đó vừa ủng hộ" dưới ô số tiền, lấy từ sổ cái đã xác nhận.
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchCampaignLedger(campaignId, 1, "recent")
      .then((page) => {
        if (active) setRecent(page.items[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [campaignId, enabled]);

  useEffect(() => {
    let active = true;
    fetchPaymentOptions()
      .then((data) => {
        if (!active) return;
        setOptions(data);
        if (data.sepay) setPayment("sepay");
        else if (!data.demoWallet) setPayment("");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Quay về từ SePay: tải lại đơn (trạng thái thật do IPN quyết định, không theo URL).
  const returnDonationId = sepayReturn?.donationId;
  useEffect(() => {
    if (!returnDonationId || !hasSession()) return;
    let active = true;
    fetchDonation(returnDonationId)
      // Đơn SePay chưa ghi nhận (kể cả đã hết hạn): hỏi thẳng SePay một lần phòng IPN bị lỡ.
      .then((found) =>
        found.paymentMethod === "sepay" && found.status !== "completed" && found.status !== "refunded"
          ? syncSepayDonation(found.id).then((result) => result.donation, () => found)
          : found,
      )
      .then((found) => {
        if (active) setDonation(found);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [returnDonationId]);

  const handleStatusChange = useCallback((next: ApiDonation) => setDonation(next), []);

  // Giao dịch vừa xác nhận: tải lại số liệu tiến độ ở đầu trang từ server.
  const completed = donation?.status === "completed";
  useEffect(() => {
    if (completed) router.refresh();
  }, [completed, router]);

  const setAmount = (value: number) => setDigits(String(value));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!hasSession()) {
      setError("login");
      return;
    }
    if (amount < MIN_AMOUNT) {
      setError(`Số tiền tối thiểu là ${formatVnd(MIN_AMOUNT)}.`);
      return;
    }
    if (selectedTier && amount < selectedTier.minAmount) {
      setError(`Mức quà "${selectedTier.title}" cần ủng hộ tối thiểu ${formatVnd(selectedTier.minAmount)}.`);
      return;
    }

    setLoading(true);
    let created: ApiDonation | null = null;
    try {
      created = await createDonation({
        campaignId,
        amount,
        paymentMethod: payment,
        isAnonymous: anonymous,
        idempotencyKey: generateIdempotencyKey(),
        ...(selectedTier ? { rewardTierId: selectedTier.id } : {}),
      });
      // Đơn đã tạo: dù xác nhận lỗi vẫn hiển thị để người dùng thanh toán lại hoặc hủy.
      setDonation(created);
      if (payment === "sepay") {
        // Sang trang SePay quét QR; kết quả về qua IPN, trang này chỉ hiển thị lại.
        submitSepayCheckout(await createSepayCheckout(created.id));
        return;
      }
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

  // Tài khoản quản trị chỉ dùng để quản trị (backend cũng từ chối tạo khoản ủng hộ).
  if (isAdmin) {
    return (
      <div className="form-notice" role="status">
        Tài khoản quản trị không thể ủng hộ. Hãy dùng một tài khoản người dùng thường.{" "}
        <Link href="/admin">Về trang quản trị</Link>
      </div>
    );
  }

  if (donation?.status === "pending" && donation.paymentMethod === "sepay") {
    return (
      <SepayPaymentStatus
        donation={donation}
        result={sepayReturn?.donationId === donation.id ? sepayReturn.result : "error"}
        onChange={handleStatusChange}
      />
    );
  }

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
      <div className="donate-result" aria-live="polite">
        <h2>{outcome.title}</h2>
        <p>{outcome.text}</p>
        <dl className="receipt">
          <div><dt>Số tiền</dt><dd className="num">{formatVnd(Number(donation.amount) || amount)}</dd></div>
          <div><dt>Mã giao dịch</dt><dd className="mono">{donation.transactionId ?? donation.id}</dd></div>
        </dl>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="donate-result-actions">
          {pending ? (
            <>
              <button className="button button-primary button-lg" type="button" disabled={loading} onClick={retryPayment}>
                {loading ? "Đang xử lý…" : "Thanh toán lại"}
              </button>
              <button className="button button-outline button-lg" type="button" disabled={loading} onClick={cancelPending}>
                Hủy giao dịch
              </button>
            </>
          ) : (
            <button className="button button-primary button-lg" type="button" onClick={startOver}>Tạo giao dịch mới</button>
          )}
        </div>
      </div>
    );
  }

  if (donation) {
    return (
      <div className="donate-result" aria-live="polite">
        <span className="donate-result-icon" aria-hidden="true"><Icon name="heart" size={28} /></span>
        <h2>Cảm ơn bạn đã ủng hộ!</h2>
        <p>
          Khoản ủng hộ cho “{campaignTitle}” đã được xác nhận và ghi vào sổ cái công khai của dự án. Biên nhận cũng được
          gửi tới email của bạn.
        </p>
        <dl className="receipt">
          <div><dt>Số tiền</dt><dd className="num">{formatVnd(Number(donation.amount) || amount)}</dd></div>
          <div><dt>Mã giao dịch</dt><dd className="mono">{donation.transactionId ?? donation.id}</dd></div>
          <div><dt>Kênh</dt><dd>{paymentMethodLabel(donation.paymentMethod)}</dd></div>
          <div><dt>Hiển thị</dt><dd>{donation.isAnonymous ? "Ẩn danh" : "Tên của bạn"}</dd></div>
          {selectedTier && <div><dt>Phần quà</dt><dd>{donation.rewardTierId ? selectedTier.title : "Hết suất — ghi nhận không kèm quà"}</dd></div>}
        </dl>
        <p className="donate-result-share">Chia sẻ dự án để thêm nhiều người biết đến — đó cũng là một cách ủng hộ.</p>
        <div className="donate-result-actions">
          <ShareCampaignButton campaignId={campaignId} title={campaignTitle} className="button button-dark button-lg" label="Chia sẻ dự án" />
          <Link className="button button-outline button-lg" href={`/bien-nhan/${donation.id}`}>Xem biên nhận</Link>
        </div>
        <Link className="donate-result-back" href={`/du-an/${encodeURIComponent(campaignId)}`}>Quay lại trang dự án</Link>
      </div>
    );
  }

  return (
    <form className="donate-form" onSubmit={submit} noValidate>
      <fieldset className="donate-presets">
        <legend className="sr-only">Chọn nhanh số tiền</legend>
        {PRESETS.map((preset) => (
          <button aria-pressed={amount === preset} key={preset} type="button" onClick={() => setAmount(preset)}>
            <span className="num">{vnNumber.format(preset)}</span>
            {preset === SUGGESTED && <small>Gợi ý</small>}
          </button>
        ))}
      </fieldset>

      <div className="donate-amount">
        <label htmlFor={amountId}>
          <b>₫</b>
          <span>VNĐ</span>
        </label>
        <input
          id={amountId}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          aria-describedby={`${amountId}-hint`}
          value={digits ? vnNumber.format(amount) : ""}
          onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, MAX_DIGITS))}
        />
      </div>
      <p className="donate-amount-hint" id={`${amountId}-hint`}>
        Tối thiểu {formatVnd(MIN_AMOUNT)}
        {recent && (
          <span className="donate-recent">
            <Icon name="heart" size={14} /> {recent.donorName ?? "Một người ẩn danh"} vừa ủng hộ {formatVnd(recent.amount)}
          </span>
        )}
      </p>

      {rewardTiers.length > 0 && (
        <fieldset className="donate-section give-rewards">
          <legend>Chọn phần quà <small>(không bắt buộc)</small></legend>
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
                    if (amount < tier.minAmount) setAmount(tier.minAmount);
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

      <fieldset className="donate-section donate-methods">
        <legend>Phương thức thanh toán</legend>
        {methods.map((method) => (
          <label key={method.value}>
            <input type="radio" name="payment" value={method.value} checked={payment === method.value} onChange={() => setPayment(method.value)} />
            <span>
              <b>{method.label}</b>
              <small>{method.note}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="donate-check">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
        <span>Không hiển thị tên tôi công khai trên dự án và sổ cái.</span>
      </label>

      <section className="donate-summary" aria-labelledby={`${amountId}-summary`}>
        <h2 id={`${amountId}-summary`}>Khoản ủng hộ của bạn</h2>
        <dl>
          <div><dt>Số tiền ủng hộ</dt><dd className="num">{formatVnd(amount)}</dd></div>
          {selectedTier && <div><dt>Phần quà</dt><dd>{selectedTier.title}</dd></div>}
          <div className="donate-summary-total"><dt>Tổng thanh toán hôm nay</dt><dd className="num">{formatVnd(amount)}</dd></div>
        </dl>
      </section>

      {error === "login" ? (
        <p className="form-error" role="alert">
          Bạn cần <Link href={`/dang-nhap?next=/du-an/${encodeURIComponent(campaignId)}/ung-ho`}>đăng nhập</Link> để ủng hộ.
        </p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}

      <button className="button button-primary button-block button-lg" type="submit" disabled={loading || !enabled || !payment}>
        {loading ? "Đang xử lý…" : "Ủng hộ ngay"}
      </button>
      <p className="fineprint">
        {enabled ? (
          <>
            Khi bấm “Ủng hộ ngay”, bạn đồng ý với <Link href="/chinh-sach-bao-mat">chính sách quyền riêng tư</Link> của Góp Mầm.
            {payment === "sepay"
              ? "Bạn sẽ được chuyển sang trang thanh toán SePay để quét QR. Góp Mầm không lưu thông tin tài khoản hay thẻ của bạn."
              : "Bản demo dùng thanh toán sandbox, không trừ tiền thật và không lưu dữ liệu thẻ."}
          </>
        ) : (
          "Dự án hiện không nhận ủng hộ."
        )}
      </p>
    </form>
  );
}
