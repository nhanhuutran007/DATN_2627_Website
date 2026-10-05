import { useId, useState } from "react";

export type DailyValue = {
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  value: number;
  /** Dòng phụ trong tooltip, vd. "3 lượt ủng hộ". */
  note?: string;
};

type DailyColumnChartProps = {
  title: string;
  points: DailyValue[];
  /** Màu cột (một chuỗi số liệu → không cần chú thích). */
  color: string;
  format: (value: number) => string;
};

function shortDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

/**
 * Biểu đồ cột theo ngày, một chuỗi số liệu. Cột ≤ 24px, đầu cột bo 4px, khe 2px;
 * vùng bấm/rê là cả cột chiều cao (rộng hơn vạch). Có bảng số liệu đi kèm.
 */
export function DailyColumnChart({ title, points, color, format }: DailyColumnChartProps) {
  const id = useId();
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...points.map((point) => point.value));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const current = active === null ? null : points[active];

  return (
    <figure className="daily-chart">
      <figcaption className="daily-chart-head">
        <span className="daily-chart-title">{title}</span>
        <span className="daily-chart-total">{format(total)}</span>
      </figcaption>

      <div className="daily-chart-plot" onMouseLeave={() => setActive(null)}>
        <span className="daily-chart-max" aria-hidden="true">{max > 0 ? format(max) : ""}</span>
        <div
          className="daily-chart-bars"
          role="group"
          aria-label={`${title}: ${points.length} ngày gần nhất, tổng ${format(total)}`}
        >
          {points.map((point, index) => {
            const height = max > 0 ? (point.value / max) * 100 : 0;
            return (
              <button
                key={point.date}
                type="button"
                className={`daily-chart-col${active === index ? " is-active" : ""}`}
                aria-label={`${shortDate(point.date)}: ${format(point.value)}${point.note ? `, ${point.note}` : ""}`}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
              >
                {point.value > 0 && (
                  <span className="daily-chart-bar" style={{ height: `max(${height}%, 2px)`, background: color }} />
                )}
              </button>
            );
          })}
        </div>
        {current && active !== null && (
          <div
            className="daily-chart-tip"
            role="status"
            style={{ left: `${((active + 0.5) / points.length) * 100}%` }}
          >
            <b>{shortDate(current.date)}</b>
            <span>{format(current.value)}</span>
            {current.note && <small>{current.note}</small>}
          </div>
        )}
      </div>

      <div className="daily-chart-axis" aria-hidden="true">
        <span>{points[0] ? shortDate(points[0].date) : ""}</span>
        <span>{points.length > 2 ? shortDate(points[Math.floor(points.length / 2)].date) : ""}</span>
        <span>{points.length > 1 ? shortDate(points[points.length - 1].date) : ""}</span>
      </div>

      <details className="daily-chart-table">
        <summary aria-controls={`${id}-table`}>Xem bảng số liệu</summary>
        <div className="table-wrap" id={`${id}-table`}>
          <table className="data-table">
            <thead><tr><th scope="col">Ngày</th><th scope="col" className="num">{title}</th></tr></thead>
            <tbody>
              {points.filter((point) => point.value > 0).map((point) => (
                <tr key={point.date}>
                  <td>{shortDate(point.date)}</td>
                  <td className="num">{format(point.value)}{point.note ? ` (${point.note})` : ""}</td>
                </tr>
              ))}
              {total === 0 && <tr><td colSpan={2} className="hint">Chưa có số liệu trong khoảng này.</td></tr>}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
