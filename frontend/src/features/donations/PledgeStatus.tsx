"use client";

import Link from "next/link";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { ShareCampaignButton } from "@/features/follows/ShareCampaignButton";
import { ApiError } from "@/lib/api";
import {
  cancelDonation,
  CHARGE_RETRY_DAYS,
  createStripeCheckout,
  retryCharge,
  syncStripeDonation,
  type ApiDonation,
} from "@/lib/api/donations";
import { formatVnd, paymentMethodLabel } from "@/lib/format";
import { refreshWallet } from "@/lib/wallet-store";

type PledgeStatusProps = {
  donation: ApiDonation;
  campaignId: string;
  campaignTitle: string;
  /** Ngày kết thúc gây quỹ (đã định dạng) — mốc trừ tiền nếu đạt mục tiêu. */
  endDate?: string;
  rewardTitle?: string | null;
  onChange: (donation: ApiDonation) => void;
  onStartOver: () => void;
};

const DAY_MS = 86_400_000;

function vnDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Trạng thái khoản ủng hộ theo mô hình tất cả hoặc không: chờ lưu thẻ, đã cam kết
 * (chưa trừ tiền), trừ tiền thất bại (đổi thẻ / thử lại trong hạn), hoặc đã giải phóng.
 */
export function PledgeStatus({ donation, campaignId, campaignTitle, endDate, rewardTitle, onChange, onStartOver }: PledgeStatusProps) {
  const [busy, setBusy] = useState<"" | "card" | "retry" | "cancel" | "check">("");
  const [error, setError] = useState("");
  const amount = formatVnd(Number(donation.amount));
  const isCard = donation.paymentMethod === "stripe";
  const fromWallet = donation.paymentMethod === "balance";

  const run = async (kind: Exclude<typeof busy, "">, action: () => Promise<void>, fallback: string) => {
    setBusy(kind);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(errorText(err, fallback));
    } finally {
      setBusy("");
    }
  };

  const openCardCheckout = () =>
    run("card", async () => {
      const { url } = await createStripeCheckout(donation.id);
      window.location.assign(url);
    }, "Không mở được trang lưu thẻ. Vui lòng thử lại.");

  const checkAgain = () =>
    run("check", async () => onChange((await syncStripeDonation(donation.id)).donation), "Chưa kiểm tra được với Stripe. Vui lòng thử lại.");

  const retry = () =>
    run("retry", async () => onChange(await retryCharge(donation.id)), "Chưa trừ được tiền. Vui lòng thử lại hoặc cập nhật thẻ khác.");

  const withdraw = () =>
    run("cancel", async () => {
      onChange(await cancelDonation(donation.id));
      if (fromWallet) void refreshWallet();
    }, "Không rút được cam kết. Vui lòng thử lại.");

  const details = (
    <dl className="receipt">
      <div><dt>Số tiền cam kết</dt><dd className="num">{amount}</dd></div>
      <div><dt>Kênh</dt><dd>{paymentMethodLabel(donation.paymentMethod)}</dd></div>
      {rewardTitle !== undefined && (
        <div><dt>Phần quà</dt><dd>{donation.rewardTierId ? rewardTitle ?? "Có" : "Không kèm quà"}</dd></div>
      )}
      <div><dt>Mã giao dịch</dt><dd className="mono">{donation.id.slice(0, 8).toUpperCase()}</dd></div>
    </dl>
  );
  const errorLine = error && <p className="form-error" role="alert">{error}</p>;

  if (donation.status === "pending") {
    return (
      <div className="donate-result" aria-live="polite">
        <h2>Chưa lưu thẻ xong</h2>
        <p>
          Bạn chưa hoàn tất bước lưu thẻ ở Stripe nên cam kết chưa được ghi nhận. Nếu vừa lưu xong, bấm “Kiểm tra lại”;
          giao dịch chưa lưu thẻ sẽ tự hết hạn sau 30 phút.
        </p>
        {details}
        {errorLine}
        <div className="donate-result-actions">
          <button className="button button-primary button-lg" type="button" disabled={!!busy} onClick={openCardCheckout}>
            {busy === "card" ? "Đang mở Stripe…" : "Tiếp tục lưu thẻ"}
          </button>
          <button className="button button-outline button-lg" type="button" disabled={!!busy} onClick={checkAgain}>
            {busy === "check" ? "Đang kiểm tra…" : "Kiểm tra lại"}
          </button>
          <button className="button button-ghost button-lg" type="button" disabled={!!busy} onClick={withdraw}>
            {busy === "cancel" ? "Đang hủy…" : "Hủy giao dịch"}
          </button>
        </div>
      </div>
    );
  }

  if (donation.status === "pledged") {
    return (
      <div className="donate-result" aria-live="polite">
        <span className="donate-result-icon" aria-hidden="true"><Icon name="heart" size={28} /></span>
        <h2>Bạn đã cam kết ủng hộ!</h2>
        <p>
          Cam kết {amount} cho “{campaignTitle}” đã được ghi nhận và tính vào tiến độ dự án.{" "}
          <b>{fromWallet ? "Số tiền đang được giữ trong ví của bạn." : "Bạn chưa bị trừ tiền."}</b>{" "}
          Bạn đã được tự động theo dõi dự án để nhận cập nhật.
        </p>
        <ul className="pledge-rules">
          <li>
            <Icon name="check" size={16} /> Nếu dự án đạt mục tiêu khi kết thúc{endDate ? ` (${endDate})` : ""}, hệ thống mới trừ {amount}
            {isCard ? " từ thẻ bạn đã lưu" : fromWallet ? " từ khoản đang giữ trong ví" : " từ ví demo"}.
          </li>
          <li>
            <Icon name="check" size={16} />{" "}
            {fromWallet
              ? "Nếu không đạt mục tiêu, toàn bộ số tiền tự hoàn về ví Góp Mầm của bạn."
              : "Nếu không đạt mục tiêu, cam kết tự hủy và bạn không mất đồng nào."}
          </li>
          <li><Icon name="check" size={16} /> Bạn có thể rút cam kết bất cứ lúc nào trước khi dự án kết thúc.</li>
        </ul>
        {details}
        {errorLine}
        <div className="donate-result-actions">
          <ShareCampaignButton campaignId={campaignId} title={campaignTitle} className="button button-dark button-lg" label="Chia sẻ dự án" />
          <button className="button button-outline button-lg" type="button" disabled={!!busy} onClick={withdraw}>
            {busy === "cancel" ? "Đang rút…" : "Rút cam kết"}
          </button>
        </div>
        <Link className="donate-result-back" href={`/du-an/${encodeURIComponent(campaignId)}`}>Quay lại trang dự án</Link>
      </div>
    );
  }

  if (donation.status === "charge_failed") {
    const failedAt = donation.chargeFailedAt ? new Date(donation.chargeFailedAt) : new Date();
    const deadline = new Date(failedAt.getTime() + CHARGE_RETRY_DAYS * DAY_MS);
    return (
      <div className="donate-result" aria-live="polite">
        <h2>Chưa trừ được tiền</h2>
        <p>
          “{campaignTitle}” đã đạt mục tiêu nhưng chưa trừ được {amount} từ phương thức bạn đã lưu
          {donation.lastChargeError ? ` (lý do: ${donation.lastChargeError})` : ""}. Hãy cập nhật thẻ hoặc thử lại trước{" "}
          <b>{vnDate(deadline)}</b>, nếu không cam kết sẽ bị hủy.
        </p>
        {details}
        {errorLine}
        <div className="donate-result-actions">
          {isCard && (
            <button className="button button-primary button-lg" type="button" disabled={!!busy} onClick={openCardCheckout}>
              {busy === "card" ? "Đang mở Stripe…" : "Dùng thẻ khác"}
            </button>
          )}
          <button className={isCard ? "button button-outline button-lg" : "button button-primary button-lg"} type="button" disabled={!!busy} onClick={retry}>
            {busy === "retry" ? "Đang thử…" : "Thử trừ lại"}
          </button>
          {isCard && (
            <button className="button button-ghost button-lg" type="button" disabled={!!busy} onClick={checkAgain}>
              {busy === "check" ? "Đang kiểm tra…" : "Tôi vừa đổi thẻ"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // released (không đạt mục tiêu) hoặc trạng thái kết thúc khác của khoản cam kết.
  return (
    <div className="donate-result" aria-live="polite">
      <h2>{donation.status === "released" ? (fromWallet ? "Tiền đã hoàn về ví" : "Bạn không bị trừ tiền") : "Cam kết đã kết thúc"}</h2>
      <p>
        {donation.status === "released"
          ? fromWallet
            ? `“${campaignTitle}” không đạt mục tiêu nên ${amount} đã được hoàn về ví Góp Mầm của bạn.`
            : `“${campaignTitle}” không đạt mục tiêu nên cam kết ${amount} của bạn đã được hủy. Không có khoản tiền nào bị trừ.`
          : "Khoản cam kết này không còn hiệu lực và bạn không bị trừ tiền."}
      </p>
      {details}
      <div className="donate-result-actions">
        <button className="button button-primary button-lg" type="button" onClick={onStartOver}>Tạo giao dịch mới</button>
      </div>
    </div>
  );
}
