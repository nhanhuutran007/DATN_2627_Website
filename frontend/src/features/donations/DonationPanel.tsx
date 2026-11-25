"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useId, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { PledgeStatus } from "@/features/donations/PledgeStatus";
import { RewardCard } from "@/features/rewards/RewardCard";
import { SepayPaymentStatus, type SepayReturn } from "@/features/donations/SepayPaymentStatus";
import { ShareCampaignButton } from "@/features/follows/ShareCampaignButton";
import { ApiError, hasSession } from "@/lib/api";
import { useAuthUser, useIsAdmin } from "@/lib/auth";
import {
  cancelDonation,
  createDonation,
  fetchCampaignLedger,
  fetchDonation,
  fetchPaymentOptions,
  fetchPledgeStanding,
  generateIdempotencyKey,
  PAYMENT_WINDOW_DAYS,
  type ApiDonation,
  type ApiDonationStatus,
  type LedgerEntry,
  type PaymentOptions,
  type PledgeStanding,
  syncSepayDonation,
} from "@/lib/api/donations";
import { formatVnd, paymentMethodLabel } from "@/lib/format";
import { isRewardAvailable, type RewardTier } from "@/lib/api/rewards";

type DonationPanelProps = {
  campaignId: string;
  campaignTitle: string;
  /** false khi chiến dịch chưa công khai/đã đóng — không cho gửi giao dịch. */
  enabled?: boolean;
  /** Mức quà đang nhận của chiến dịch. */
  rewardTiers?: RewardTier[];
  /**
   * `?donation=…` (từ thông báo mời thanh toán, `result` = null) hoặc quay về từ SePay
   * (`&payment=…`): hiện trạng thái khoản đó.
   */
  sepayReturn?: { donationId: string; result: SepayReturn | null } | null;
  /** Ngày kết thúc gây quỹ (đã định dạng dd/mm/yyyy): mốc trừ tiền các khoản cam kết nếu đạt mục tiêu. */
  endDate?: string;
  /** Mức quà chọn sẵn từ nút "Chọn quà này" ở trang dự án (`?qua=`). */
  initialRewardId?: string;
};

/** Trạng thái riêng của khoản cam kết (tất cả hoặc không), hiển thị bằng `PledgeStatus`. */
const PLEDGE_STATES: ApiDonationStatus[] = ["pledged", "awaiting_payment", "charge_failed", "released"];

const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];
const SUGGESTED = 200_000;
const MIN_AMOUNT = 20_000;
const PHONE_PATTERN = /^\+?[0-9 .-]{8,20}$/;

/** Kiểm tra thông tin nhận quà giống máy chủ (`RewardRecipientDto`); trả lỗi đầu tiên hoặc "". */
function recipientError(recipient: { name: string; phone: string; address: string }): string {
  if (recipient.name.trim().length < 2) return "Vui lòng nhập họ tên người nhận quà.";
  if (!PHONE_PATTERN.test(recipient.phone.trim())) return "Số điện thoại người nhận quà không hợp lệ.";
  if (recipient.address.trim().length < 10) return "Vui lòng nhập địa chỉ nhận quà đầy đủ (số nhà, đường, phường/xã, tỉnh/thành).";
  return "";
}
/** Khớp `@MaxLength(500)` của `CreateDonationDto.message`. */
const MESSAGE_MAX = 500;
const MAX_DIGITS = 12;

const vnNumber = new Intl.NumberFormat("vi-VN");

/**
 * Form ủng hộ trên trang /du-an/[id]/ung-ho (bố cục theo trang donate của GoFundMe):
 * chọn nhanh số tiền hoặc nhập ô lớn → quà (nếu có) → tóm tắt → cam kết. Như Kickstarter, Góp Mầm
 * không thu tiền lúc ủng hộ: dự án đạt mục tiêu mới mời người ủng hộ quét QR SePay.
 */
export function DonationPanel({
  campaignId,
  campaignTitle,
  enabled = true,
  rewardTiers = [],
  sepayReturn = null,
  endDate,
  initialRewardId,
}: DonationPanelProps) {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  // Quà chọn sẵn từ trang dự án: chỉ khi còn chọn được; số tiền bắt đầu bằng mức tối thiểu của quà.
  const initialTier = rewardTiers.find((tier) => tier.id === initialRewardId && isRewardAvailable(tier)) ?? null;
  const [digits, setDigits] = useState(initialTier ? String(initialTier.minAmount) : "");
  const [anonymous, setAnonymous] = useState(true);
  const [message, setMessage] = useState("");
  const user = useAuthUser();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Hủy có trạng thái riêng: người dùng vẫn hủy được khi "Thanh toán lại" đang chạy (TC_DON_010).
  const [cancelling, setCancelling] = useState(false);
  const [donation, setDonation] = useState<ApiDonation | null>(null);
  const [rewardTierId, setRewardTierId] = useState(initialTier?.id ?? "");
  // Người nhận quà (TC_DON_007): chỉ hỏi khi chọn mức quà, gửi cho chủ dự án để gửi quà.
  const [recipient, setRecipient] = useState({ name: "", phone: "", address: "" });
  const [recent, setRecent] = useState<LedgerEntry | null>(null);
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [standing, setStanding] = useState<PledgeStanding | null>(null);
  const amountId = useId();
  const selectedTier = rewardTiers.find((tier) => tier.id === rewardTierId) ?? null;
  // Quà số/ghi danh không cần địa chỉ; mức quà cũ (API chưa có trường) coi như gửi tận nơi.
  const needsAddress = !!selectedTier && (selectedTier.requiresShipping ?? true);
  const amount = digits ? Number(digits) : 0;
  // Như Kickstarter: phần vượt mức tối thiểu của quà là "ủng hộ thêm".
  const bonus = selectedTier ? Math.max(0, amount - selectedTier.minAmount) : 0;

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
        if (active) setOptions(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Quyền cam kết: đủ giới hạn thì khóa nút cam kết và giải thích lý do.
  const userId = user?.id;
  useEffect(() => {
    if (!userId || !enabled) return;
    let active = true;
    fetchPledgeStanding()
      .then((data) => {
        if (active) setStanding(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, enabled]);
  const pledgeFull = !!standing && !standing.canPledge;

  // Mở từ thông báo hoặc quay về từ SePay: tải lại khoản đó (trạng thái thật do IPN quyết định, không theo URL).
  const returnDonationId = sepayReturn?.donationId;
  const returnedFromSepay = !!sepayReturn?.result;
  useEffect(() => {
    if (!returnDonationId || !hasSession()) return;
    let active = true;
    fetchDonation(returnDonationId)
      // Vừa quay về từ SePay mà chưa ghi nhận: hỏi thẳng SePay một lần phòng IPN bị lỡ.
      .then((found) => {
        const unpaid = ["pending", "awaiting_payment", "expired", "cancelled"].includes(found.status);
        if (returnedFromSepay && found.paymentMethod === "sepay" && unpaid) {
          return syncSepayDonation(found.id).then((result) => result.donation, () => found);
        }
        return found;
      })
      .then((found) => {
        if (active) setDonation(found);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [returnDonationId, returnedFromSepay]);

  const handleStatusChange = useCallback((next: ApiDonation) => setDonation(next), []);

  // Giao dịch vừa xác nhận hoặc vừa cam kết: tải lại số liệu tiến độ ở đầu trang từ server.
  const counted = donation?.status === "completed" || donation?.status === "pledged";
  useEffect(() => {
    if (counted) router.refresh();
  }, [counted, router]);

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
    if (needsAddress) {
      const missing = recipientError(recipient);
      if (missing) {
        setError(missing);
        return;
      }
    }

    setLoading(true);
    try {
      const created = await createDonation({
        campaignId,
        amount,
        paymentMethod: "sepay",
        isAnonymous: anonymous,
        ...(message.trim() ? { message: message.trim() } : {}),
        idempotencyKey: generateIdempotencyKey(),
        ...(selectedTier ? { rewardTierId: selectedTier.id } : {}),
        ...(needsAddress
          ? { rewardRecipient: { name: recipient.name.trim(), phone: recipient.phone.trim(), address: recipient.address.trim() } }
          : {}),
      });
      // Máy chủ ghi nhận cam kết ngay (không có bước thanh toán lúc này).
      setDonation(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không kết nối được máy chủ. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const cancelPending = async () => {
    if (!donation) return;
    setCancelling(true);
    setError("");
    try {
      setDonation(await cancelDonation(donation.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không hủy được giao dịch. Vui lòng thử lại.");
    } finally {
      setCancelling(false);
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

  // Vừa quay về từ SePay (hoặc đơn SePay cũ đang chờ): chờ IPN xác nhận.
  const waitingSepay =
    donation?.paymentMethod === "sepay" &&
    (donation.status === "pending" ||
      (donation.status === "awaiting_payment" && sepayReturn?.donationId === donation.id && !!sepayReturn.result));
  if (donation && waitingSepay) {
    return (
      <SepayPaymentStatus
        donation={donation}
        result={sepayReturn?.donationId === donation.id && sepayReturn.result ? sepayReturn.result : "error"}
        onChange={handleStatusChange}
      />
    );
  }

  if (donation && PLEDGE_STATES.includes(donation.status)) {
    return (
      <PledgeStatus
        donation={donation}
        campaignId={campaignId}
        campaignTitle={campaignTitle}
        endDate={endDate}
        options={options}
        rewardTitle={donation.rewardTierId ? rewardTiers.find((tier) => tier.id === donation.rewardTierId)?.title ?? null : undefined}
        onChange={handleStatusChange}
        onStartOver={startOver}
      />
    );
  }

  if (donation && donation.status !== "completed") {
    const pending = donation.status === "pending";
    const outcomes: Partial<Record<ApiDonationStatus, { title: string; text: string }>> = {
      pending: { title: "Giao dịch đang chờ thanh toán", text: "Giao dịch chưa thanh toán sẽ tự hết hạn sau 30 phút." },
      cancelled: { title: "Đã hủy cam kết", text: "Không có khoản tiền nào được ghi nhận." },
      expired: { title: "Cam kết đã hết hạn", text: `Khoản này không được thanh toán trong ${PAYMENT_WINDOW_DAYS} ngày sau khi dự án đạt mục tiêu nên đã tự hủy. Bạn không bị trừ tiền.` },
      failed: { title: "Thanh toán không thành công", text: "Không có khoản tiền nào được ghi nhận. Bạn có thể thử lại." },
      refunded: { title: "Khoản ủng hộ đã được hoàn tiền", text: "" },
    };
    const outcome = outcomes[donation.status] ?? { title: "Giao dịch đã kết thúc", text: "" };
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
            <button className="button button-outline button-lg" type="button" disabled={cancelling} onClick={cancelPending}>
              {cancelling ? "Đang hủy…" : "Hủy giao dịch"}
            </button>
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
          gửi tới email của bạn. Bạn đã được tự động theo dõi dự án để nhận các bài cập nhật.
        </p>
        <dl className="receipt">
          <div><dt>Số tiền</dt><dd className="num">{formatVnd(Number(donation.amount) || amount)}</dd></div>
          <div><dt>Mã giao dịch</dt><dd className="mono">{donation.transactionId ?? donation.id}</dd></div>
          <div><dt>Kênh</dt><dd>{paymentMethodLabel(donation.paymentMethod)}</dd></div>
          <div><dt>Hiển thị trên sổ cái</dt><dd>{donation.isAnonymous ? "Ẩn danh" : user?.name ?? "Tên tài khoản của bạn"}</dd></div>
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
        {selectedTier ? (
          <>
            Mức quà cần từ {formatVnd(selectedTier.minAmount)}
            {bonus > 0 && <> · gồm <b className="num">{formatVnd(bonus)}</b> ủng hộ thêm</>}
          </>
        ) : (
          <>Tối thiểu {formatVnd(MIN_AMOUNT)}</>
        )}
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
            const available = isRewardAvailable(tier);
            return (
              <label className={`reward-option reward-option-card${available ? "" : " is-unavailable"}`} key={tier.id}>
                <input
                  type="radio"
                  name="reward"
                  value={tier.id}
                  checked={rewardTierId === tier.id}
                  disabled={!available}
                  onChange={() => {
                    setRewardTierId(tier.id);
                    if (amount < tier.minAmount) setAmount(tier.minAmount);
                  }}
                />
                <RewardCard tier={tier} selected={rewardTierId === tier.id} />
              </label>
            );
          })}
          {selectedTier && !needsAddress && (
            <p className="reward-recipient-note">Phần quà này không cần giao nên không cần địa chỉ nhận quà.</p>
          )}
          {needsAddress && (
            <div className="reward-recipient">
              <p className="reward-recipient-note">
                Thông tin nhận quà chỉ chia sẻ với chủ dự án để gửi quà (kể cả khi bạn ủng hộ ẩn danh), không hiển thị công khai.
              </p>
              <label className="field">
                <span>Họ tên người nhận</span>
                <input
                  value={recipient.name}
                  maxLength={120}
                  autoComplete="name"
                  onChange={(e) => setRecipient((r) => ({ ...r, name: e.target.value }))}
                />
              </label>
              <label className="field">
                <span>Số điện thoại</span>
                <input
                  value={recipient.phone}
                  maxLength={20}
                  inputMode="tel"
                  autoComplete="tel"
                  onChange={(e) => setRecipient((r) => ({ ...r, phone: e.target.value }))}
                />
              </label>
              <label className="field reward-recipient-address">
                <span>Địa chỉ nhận quà</span>
                <input
                  value={recipient.address}
                  maxLength={300}
                  autoComplete="street-address"
                  placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
                  onChange={(e) => setRecipient((r) => ({ ...r, address: e.target.value }))}
                />
              </label>
            </div>
          )}
        </fieldset>
      )}

      <section className="donate-section donate-methods" aria-labelledby={`${amountId}-how`}>
        <h2 className="donate-section-title" id={`${amountId}-how`}>Cách thanh toán</h2>
        <ol className="pledge-steps">
          <li><b>Hôm nay:</b> bạn chỉ cam kết, không phải trả đồng nào.</li>
          <li>
            <b>Dự án đạt mục tiêu khi kết thúc{endDate ? ` (${endDate})` : ""}:</b> bạn nhận thông báo và email mời thanh toán,
            quét QR SePay trong {PAYMENT_WINDOW_DAYS} ngày.
          </li>
          <li><b>Không đạt mục tiêu:</b> cam kết tự hủy, không phát sinh thanh toán.</li>
        </ol>
        <p className="donate-aon">
          <Icon name="shield" size={15} />
          <span>
            Góp Mầm không giữ tiền của bạn trong ví. Tiền chỉ chuyển khi dự án thành công, sau đó được gom và chuyển cho chủ dự án
            một lần. Bạn có thể rút cam kết bất cứ lúc nào trước khi dự án kết thúc.
          </span>
        </p>
      </section>

      <div className="donate-section donate-message">
        <label className="donate-message-label" htmlFor={`${amountId}-message`}>
          Lời động viên <small>(không bắt buộc)</small>
        </label>
        <textarea
          id={`${amountId}-message`}
          rows={3}
          maxLength={MESSAGE_MAX}
          placeholder="Gửi vài lời tới người tổ chức và dự án…"
          value={message}
          aria-describedby={`${amountId}-message-hint`}
          onChange={(event) => setMessage(event.target.value)}
        />
        <small id={`${amountId}-message-hint`}>
          Hiển thị công khai ở mục “Lời động viên” của dự án{anonymous ? " dưới tên “Người ủng hộ ẩn danh”" : " kèm tên của bạn"} khi khoản ủng hộ được xác nhận.
          <span className="num"> {message.length}/{MESSAGE_MAX}</span>
        </small>
      </div>

      <label className="donate-check">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
        <span>Không hiển thị tên tôi công khai trên dự án và sổ cái.</span>
      </label>

      <section className="donate-summary" aria-labelledby={`${amountId}-summary`}>
        <h2 id={`${amountId}-summary`}>Khoản ủng hộ của bạn</h2>
        <dl>
          <div><dt>Số tiền cam kết</dt><dd className="num">{formatVnd(amount)}</dd></div>
          {selectedTier && <div><dt>Phần quà</dt><dd>{selectedTier.title} · từ {formatVnd(selectedTier.minAmount)}</dd></div>}
          {selectedTier && bonus > 0 && <div><dt>Ủng hộ thêm</dt><dd className="num">{formatVnd(bonus)}</dd></div>}
          <div className="donate-summary-total"><dt>Thanh toán hôm nay</dt><dd className="num">{formatVnd(0)}</dd></div>
        </dl>
      </section>

      {standing && <PledgeStandingNotice standing={standing} />}

      {error === "login" ? (
        <p className="form-error" role="alert">
          Bạn cần <Link href={`/dang-nhap?next=/du-an/${encodeURIComponent(campaignId)}/ung-ho`}>đăng nhập</Link> để ủng hộ.
        </p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : null}

      <button className="button button-primary button-block button-lg" type="submit" disabled={loading || !enabled || pledgeFull}>
        {loading ? "Đang xử lý…" : "Cam kết ủng hộ"}
      </button>
      <p className="fineprint">
        {enabled ? (
          <>
            Khi bấm “Cam kết ủng hộ”, bạn đồng ý với <Link href="/chinh-sach-bao-mat">chính sách quyền riêng tư</Link> của Góp Mầm
            và cam kết thanh toán {amount > 0 ? formatVnd(amount) : "số tiền trên"} qua QR SePay nếu dự án đạt mục tiêu.
          </>
        ) : (
          "Dự án hiện không nhận ủng hộ."
        )}
      </p>
    </form>
  );
}

/** Nhắc về quyền cam kết trả sau: đã bỏ cam kết, đang bị giới hạn, hoặc phải thanh toán ngay. */
function PledgeStandingNotice({ standing }: { standing: PledgeStanding }) {
  if (standing.tier === "blocked") {
    return (
      <p className="form-error" role="alert">
        Bạn đã bỏ {standing.abandoned} cam kết không thanh toán nên không thể cam kết thêm. Vui lòng liên hệ quản trị viên Góp Mầm.
      </p>
    );
  }
  if (!standing.canPledge) {
    return (
      <p className="form-notice" role="status">
        Bạn đang có {standing.openCampaigns}/{standing.maxOpenCampaigns} cam kết chưa thanh toán
        {standing.tier === "limited" ? " (bị giới hạn vì đã bỏ cam kết)" : standing.newAccount ? " (mức của tài khoản mới)" : ""}. Hãy
        thanh toán hoặc chờ các dự án đó kết thúc rồi cam kết tiếp.
      </p>
    );
  }
  if (standing.tier === "limited" || standing.tier === "warned") {
    return (
      <p className="form-notice" role="status">
        Bạn từng bỏ {standing.abandoned} cam kết không thanh toán. Bỏ nhiều lần sẽ bị giới hạn rồi khóa tài khoản; mỗi cam kết thanh
        toán đủ sẽ xóa bớt một lần bỏ.
      </p>
    );
  }
  return null;
}
