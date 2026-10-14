"use client";

export const PAGE_SIZE = 10;

type PaginationProps = {
  /** Trang hiện tại, tính từ 0. */
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  disabled?: boolean;
};

/** Các số trang cần hiện: trang đầu, cuối và lân cận trang hiện tại; null là dấu "…". */
function pageItems(page: number, count: number): Array<number | null> {
  const wanted = new Set([0, count - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < count));
  const sorted = [...wanted].sort((a, b) => a - b);
  const items: Array<number | null> = [];
  sorted.forEach((p, index) => {
    if (index > 0 && p - sorted[index - 1] > 1) items.push(null);
    items.push(p);
  });
  return items;
}

export function Pagination({ page, total, pageSize = PAGE_SIZE, onChange, disabled }: PaginationProps) {
  const count = Math.ceil(total / pageSize);
  if (count <= 1) return null;

  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="pagination-info">{from}–{to} / {total.toLocaleString("vi-VN")}</span>
      <div className="pagination-pages">
        <button type="button" disabled={disabled || page === 0} onClick={() => onChange(page - 1)} aria-label="Trang trước">‹</button>
        {pageItems(page, count).map((item, index) =>
          item === null ? (
            <span className="pagination-gap" key={`gap-${index}`}>…</span>
          ) : (
            <button
              type="button"
              key={item}
              className={item === page ? "is-active" : undefined}
              aria-current={item === page ? "page" : undefined}
              disabled={disabled}
              onClick={() => item !== page && onChange(item)}
            >
              {item + 1}
            </button>
          ),
        )}
        <button type="button" disabled={disabled || page >= count - 1} onClick={() => onChange(page + 1)} aria-label="Trang sau">›</button>
      </div>
    </nav>
  );
}

/** Phân trang phía client cho danh sách đã tải đủ. */
export function pageSlice<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  return items.slice(page * pageSize, (page + 1) * pageSize);
}
