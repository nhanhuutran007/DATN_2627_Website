const vndFormatter = new Intl.NumberFormat("vi-VN");

/** 32600000 → "32.600.000 ₫" */
export function formatVnd(value: number): string {
  return `${vndFormatter.format(Math.round(value))} ₫`;
}

/** 32600000 → "32,6 triệu" — dùng cho chỗ hẹp, luôn kèm số đầy đủ ở nơi khác. */
export function formatVndShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  return formatVnd(value);
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
