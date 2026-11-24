const vndFormatter = new Intl.NumberFormat("vi-VN");
/** Khoảng trắng không ngắt dòng: số tiền không bị tách "₫"/"triệu" xuống dòng riêng. */
const NBSP = "\u00A0";

/** 32600000 → "32.600.000 ₫" */
export function formatVnd(value: number): string {
  return `${vndFormatter.format(Math.round(value))}${NBSP}₫`;
}

/** 32600000 → "32,6 triệu" — dùng cho chỗ hẹp, luôn kèm số đầy đủ ở nơi khác. */
export function formatVndShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}${NBSP}tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}${NBSP}triệu`;
  return formatVnd(value);
}

/**
 * Số tiền gọn cho dự án: 100000 → "100k", 1000000 → "1M", 1500000 → "1,5M", 2300000000 → "2,3B".
 * Dưới 1.000 giữ nguyên kèm "₫". Nơi dùng nên kèm số đầy đủ (`formatVnd`) trong `title` để rê chuột xem.
 */
export function formatVndCompact(value: number): string {
  const amount = Math.max(0, Math.round(value));
  const units: Array<[number, string]> = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "k"],
  ];
  for (const [size, suffix] of units) {
    if (amount >= size) {
      // Làm tròn xuống 1 chữ số thập phân để không hiện "đạt 1M" khi mới có 999.999 ₫.
      const scaled = Math.floor((amount / size) * 10) / 10;
      return `${scaled.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}${suffix}`;
    }
  }
  return `${amount.toLocaleString("vi-VN")}${NBSP}₫`;
}

/** "25/09/2026" */
export function formatDay(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "25/09/2026 15:04" */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Chiến dịch từ API có id dạng UUID; dữ liệu mẫu dùng slug chữ. */
export function isLiveId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

/** Nhãn kênh thanh toán; `payos` chỉ còn ở giao dịch cũ (kênh đã thay bằng SePay). */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  sepay: "Chuyển khoản qua SePay",
  stripe: "Thẻ quốc tế (Stripe)",
  balance: "Ví Góp Mầm",
  wallet: "Ví demo Góp Mầm",
  wallet_demo: "Ví demo Góp Mầm",
  payos: "PayOS sandbox (cũ)",
};

export function paymentMethodLabel(method: string | null | undefined): string {
  return method ? (PAYMENT_METHOD_LABELS[method] ?? method) : "—";
}
