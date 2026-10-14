type ProgressRingProps = {
  value: number;
  size?: number;
};

/** Vòng tròn % đạt mục tiêu; vượt 100% vẫn vẽ đầy, con số hiển thị giá trị thật. */
export function ProgressRing({ value, size = 64 }: ProgressRingProps) {
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(100, value));

  return (
    <div
      className="progress-ring"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={`Đạt ${value}% mục tiêu`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={filled}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
        <circle
          className="progress-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="progress-ring-label">{value}%</span>
    </div>
  );
}
