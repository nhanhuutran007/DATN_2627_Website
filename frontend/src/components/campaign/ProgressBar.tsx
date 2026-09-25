type ProgressBarProps = {
  value: number;
  label?: string;
};

/** Thanh tiến độ mảnh; vượt 100% vẫn hiển thị đầy (con số % nằm ở chữ bên cạnh). */
export function ProgressBar({ value, label }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div
      className="meter"
      role="progressbar"
      aria-label={label ?? "Tiến độ gây quỹ"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={normalized}
    >
      <span style={{ width: `${normalized}%` }} />
    </div>
  );
}
