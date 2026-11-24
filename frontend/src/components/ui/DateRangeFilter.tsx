"use client";

/** Khoảng ngày "yyyy-mm-dd" (giờ máy người dùng); chuỗi rỗng = không giới hạn đầu đó. */
export type DateRange = { preset: DateRangePreset; from: string; to: string };

export type DateRangePreset = "" | "today" | "7d" | "30d" | "this-month" | "last-month" | "custom";

export const ALL_TIME: DateRange = { preset: "", from: "", to: "" };

const PRESET_LABEL: Record<DateRangePreset, string> = {
  "": "Mọi thời gian",
  today: "Hôm nay",
  "7d": "7 ngày qua",
  "30d": "30 ngày qua",
  "this-month": "Tháng này",
  "last-month": "Tháng trước",
  custom: "Tùy chọn ngày…",
};

function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Khoảng ngày của một lựa chọn nhanh, tính tại thời điểm chọn. */
export function presetRange(preset: DateRangePreset, now = new Date()): DateRange {
  const today = isoDay(now);
  const daysAgo = (n: number) => isoDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n));
  switch (preset) {
    case "today":
      return { preset, from: today, to: today };
    case "7d":
      return { preset, from: daysAgo(6), to: today };
    case "30d":
      return { preset, from: daysAgo(29), to: today };
    case "this-month":
      return { preset, from: isoDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
    case "last-month":
      return {
        preset,
        from: isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: isoDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    default:
      return ALL_TIME;
  }
}

/** Có đang lọc theo thời gian không (để hiện nút "Xóa bộ lọc"). */
export function hasDateRange(range: DateRange): boolean {
  return Boolean(range.from || range.to);
}

/** Tham số gửi API: chỉ kèm đầu đã chọn. */
export function dateRangeParams(range: DateRange): { from?: string; to?: string } {
  return { ...(range.from ? { from: range.from } : {}), ...(range.to ? { to: range.to } : {}) };
}

/**
 * Lọc theo khoảng thời gian: chọn nhanh (hôm nay, 7/30 ngày, tháng này/trước) hoặc "Tùy chọn ngày…"
 * để hiện hai ô Từ ngày – Đến ngày. Mọi thay đổi gọi `onChange` ngay để danh sách tải lại.
 */
export function DateRangeFilter({
  value,
  onChange,
  label = "Khoảng thời gian",
}: {
  value: DateRange;
  onChange: (next: DateRange) => void;
  label?: string;
}) {
  const today = isoDay(new Date());
  return (
    <div className="date-range-filter">
      <select
        className="filter-button"
        aria-label={label}
        value={value.preset}
        onChange={(event) => {
          const preset = event.target.value as DateRangePreset;
          // "Tùy chọn" giữ khoảng đang có để người dùng chỉnh tiếp từ đó.
          onChange(preset === "custom" ? { ...value, preset } : presetRange(preset));
        }}
      >
        {(Object.keys(PRESET_LABEL) as DateRangePreset[]).map((preset) => (
          <option key={preset || "all"} value={preset}>
            {PRESET_LABEL[preset]}
          </option>
        ))}
      </select>
      {value.preset === "custom" && (
        <span className="date-range-inputs">
          <input
            className="filter-button"
            type="date"
            aria-label="Từ ngày"
            value={value.from}
            max={value.to || today}
            onChange={(event) => onChange({ ...value, from: event.target.value })}
          />
          <span aria-hidden="true">–</span>
          <input
            className="filter-button"
            type="date"
            aria-label="Đến ngày"
            value={value.to}
            min={value.from || undefined}
            max={today}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
          />
        </span>
      )}
    </div>
  );
}
