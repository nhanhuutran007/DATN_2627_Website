"use client";

import { Icon } from "@/components/ui/Icon";
import { formatVnd } from "@/lib/format";

const MASK = "••••••";

type MaskedAmountProps = {
  value: number;
  shown: boolean;
  className?: string;
};

/**
 * Số tiền trong ví, mặc định che bằng "••••••" với mọi số dư (kể cả 0 ₫). Bản che và bản thật
 * chồng lên cùng một ô nên khung giữ nguyên kích thước khi bấm hiện/ẩn.
 */
export function MaskedAmount({ value, shown, className }: MaskedAmountProps) {
  return (
    <span className={`masked-amount${className ? ` ${className}` : ""}`}>
      <span className={shown ? "is-off" : undefined} aria-hidden={shown}>{MASK}</span>
      <span className={shown ? undefined : "is-off"} aria-hidden={!shown}>{formatVnd(value)}</span>
      {!shown && <span className="sr-only">Số tiền đang ẩn</span>}
    </span>
  );
}

type BalanceToggleProps = {
  shown: boolean;
  onToggle: () => void;
  className?: string;
};

/** Nút con mắt bật/tắt hiển thị số dư. Chặn nổi bọt để dùng được bên trong `<label>` của lựa chọn. */
export function BalanceToggle({ shown, onToggle, className }: BalanceToggleProps) {
  return (
    <button
      className={`balance-toggle${className ? ` ${className}` : ""}`}
      type="button"
      aria-pressed={shown}
      aria-label={shown ? "Ẩn số dư ví" : "Hiện số dư ví"}
      title={shown ? "Ẩn số dư" : "Hiện số dư"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <Icon name={shown ? "eye-off" : "eye"} size={16} />
    </button>
  );
}
