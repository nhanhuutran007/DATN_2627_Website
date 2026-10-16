import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import {
  cancelDonation,
  createSepayCheckout,
  fetchDonation,
  submitSepayCheckout,
  type ApiDonation,
} from "@/lib/api/donations";
import { formatVnd } from "@/lib/format";

/** Kết quả SePay báo qua URL chuyển hướng — chỉ để hiển thị, không phải xác nhận thanh toán. */
export type SepayReturn = "success" | "error" | "cancel";

type SepayPaymentStatusProps = {
  donation: ApiDonation;
  result: SepayReturn;
  /** Trạng thái đơn thay đổi (đã xác nhận, hủy, hết hạn). */
  onChange: (donation: ApiDonation) => void;
};

/** Hỏi lại trạng thái đơn theo chu kỳ này cho tới khi IPN của SePay tới. */
const POLL_MS = 3000;

const COPY: Record<SepayReturn, { title: string; text: string }> = {
  success: {
    title: "Đang chờ xác nhận thanh toán",
    text: "SePay đã nhận yêu cầu. Khoản ủng hộ được ghi nhận ngay khi ngân hàng xác nhận — thường chỉ vài giây. Trang sẽ tự cập nhật.",
  },
  cancel: {
    title: "Bạn đã dừng thanh toán",
    text: "Chưa có khoản tiền nào được ghi nhận. Bạn có thể quay lại trang thanh toán hoặc hủy giao dịch.",
  },
  error: {
    title: "Thanh toán chưa hoàn tất",
    text: "Chưa có khoản tiền nào được ghi nhận. Nếu bạn đã chuyển khoản, trang sẽ tự cập nhật khi ngân hàng xác nhận.",
  },
};

/**
 * Màn hình sau khi quay về từ trang SePay. Luôn hỏi server vì chỉ IPN có xác thực
 * mới đổi trạng thái đơn; người dùng đã chuyển khoản mà quay về trang lỗi vẫn được cập nhật.
 */
export function SepayPaymentStatus({ donation, result, onChange }: SepayPaymentStatusProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = window.setInterval(() => {
      fetchDonation(donation.id)
        .then((latest) => {
          if (active && latest.status !== "pending") onChange(latest);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [donation.id, onChange]);

  const payAgain = async () => {
    setBusy(true);
    setError("");
    try {
      submitSepayCheckout(await createSepayCheckout(donation.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không mở được trang thanh toán. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      onChange(await cancelDonation(donation.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không hủy được giao dịch. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[result];
  return (
    <div className="donate-result" aria-live="polite">
      <h2>{copy.title}</h2>
      <p>{copy.text}</p>
      <dl className="receipt">
        <div><dt>Số tiền</dt><dd className="num">{formatVnd(Number(donation.amount))}</dd></div>
        <div><dt>Mã đơn</dt><dd className="mono">{donation.transferCode ?? donation.id}</dd></div>
      </dl>
      <p className="payment-waiting">
        <span className="payment-waiting-dot" aria-hidden="true" />
        Đang kiểm tra trạng thái giao dịch…
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="donate-result-actions">
        <button className="button button-primary button-lg" type="button" disabled={busy} onClick={payAgain}>
          {result === "success" ? "Mở lại trang thanh toán" : "Thanh toán lại"}
        </button>
        <button className="button button-outline button-lg" type="button" disabled={busy} onClick={cancel}>
          Hủy giao dịch
        </button>
      </div>
    </div>
  );
}
