"use client";

import { FormEvent, useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/data/campaigns";

type DonationPanelProps = {
  campaignTitle: string;
};

const presets = [100_000, 300_000, 500_000, 1_000_000];

export function DonationPanel({ campaignTitle }: DonationPanelProps) {
  const [amount, setAmount] = useState(300_000);
  const [customAmount, setCustomAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [payment, setPayment] = useState("payos");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const effectiveAmount = useMemo(() => {
    if (!customAmount) return amount;
    const parsed = Number(customAmount.replace(/\D/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount, customAmount]);

  const submitDonation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (effectiveAmount < 20_000) {
      setMessage("Số tiền tài trợ tối thiểu là 20.000 ₫.");
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="donation-panel donation-confirmation" aria-live="polite">
        <span className="confirmation-icon"><Icon name="check" size={26} /></span>
        <p className="eyebrow">Đơn tài trợ demo đã sẵn sàng</p>
        <h2>{formatCurrency(effectiveAmount)}</h2>
        <p>Bạn đang tài trợ cho “{campaignTitle}”. Đây là mô phỏng sandbox nên chưa có khoản tiền hay giao dịch thật nào được ghi nhận.</p>
        <div className="sandbox-receipt">
          <span>Mã đơn mô phỏng</span><b>GM-DEMO-260909</b>
          <span>Phương thức</span><b>{payment === "payos" ? "PayOS Sandbox" : "Ví demo"}</b>
          <span>Hiển thị tên</span><b>{anonymous ? "Ẩn danh" : "Người tài trợ demo"}</b>
        </div>
        <button className="button button-primary full-button" type="button" onClick={() => setSubmitted(false)}>Quay lại chỉnh sửa</button>
      </div>
    );
  }

  return (
    <form className="donation-panel" onSubmit={submitDonation}>
      <p className="eyebrow">Đồng hành cùng dự án</p>
      <h2>Chọn mức tài trợ</h2>
      <p className="donation-intro">Mỗi đóng góp đều tạo thêm động lực để dự án đi xa hơn.</p>

      <div className="amount-grid">
        {presets.map((preset) => (
          <button
            className={!customAmount && amount === preset ? "active" : ""}
            type="button"
            key={preset}
            onClick={() => { setAmount(preset); setCustomAmount(""); }}
          >
            {new Intl.NumberFormat("vi-VN").format(preset)} ₫
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="custom-amount">Hoặc nhập số tiền khác</label>
      <div className="amount-input">
        <input
          id="custom-amount"
          inputMode="numeric"
          placeholder="Tối thiểu 20.000"
          value={customAmount}
          onChange={(event) => setCustomAmount(event.target.value)}
        />
        <span>VNĐ</span>
      </div>

      <fieldset className="payment-methods">
        <legend>Phương thức thanh toán thử nghiệm</legend>
        <label className={payment === "payos" ? "active" : ""}>
          <input type="radio" name="payment" value="payos" checked={payment === "payos"} onChange={(event) => setPayment(event.target.value)} />
          <span className="payment-logo">P</span><span><b>PayOS Sandbox</b><small>Quét QR hoặc chuyển khoản thử nghiệm</small></span>
        </label>
        <label className={payment === "wallet" ? "active" : ""}>
          <input type="radio" name="payment" value="wallet" checked={payment === "wallet"} onChange={(event) => setPayment(event.target.value)} />
          <span className="payment-logo wallet-logo"><Icon name="wallet" size={17} /></span><span><b>Ví Góp Mầm demo</b><small>Không phát sinh giao dịch thật</small></span>
        </label>
      </fieldset>

      <label className="checkbox-row">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} />
        <span>Hiển thị đóng góp dưới tên ẩn danh</span>
      </label>

      {message && <p className="form-error" role="alert">{message}</p>}

      <button className="button button-primary full-button donation-submit" type="submit">
        Tiếp tục với {formatCurrency(effectiveAmount)} <Icon name="arrow-right" size={18} />
      </button>
      <p className="payment-note"><Icon name="shield" size={15} /> Không lưu dữ liệu thẻ. Số tiền chỉ được ghi nhận sau webhook có chữ ký hợp lệ.</p>
    </form>
  );
}
