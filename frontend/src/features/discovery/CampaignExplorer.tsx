"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Icon } from "@/components/ui/Icon";
import { trackBehaviorEvent } from "@/lib/api/ai";
import {
  apiCampaignToView,
  fetchCampaigns,
  spreadCategoryImages,
  type ApiCampaignStatus,
  type CampaignQuery,
  type CampaignSort,
} from "@/lib/api/campaigns";
import { useCategories } from "@/lib/api/categories";
import { campaigns as mockCampaigns, type Campaign } from "@/lib/data/campaigns";

type CampaignExplorerProps = {
  initialQuery?: string;
  initialCategory?: string;
};

const PAGE_SIZE = 12;
const SKELETON_DELAY_MS = 180;
const SKELETON_CARDS = 8;
const DEBOUNCE_MS = 350;
const MILLION = 1_000_000;


const STATUS_OPTIONS: Record<string, { label: string; statuses: ApiCampaignStatus[] }> = {
  open: { label: "Đang gây quỹ", statuses: ["active"] },
  success: { label: "Đã đạt mục tiêu", statuses: ["success"] },
  closed: { label: "Đã kết thúc", statuses: ["ended", "failed"] },
};

const GOAL_OPTIONS: Record<string, { label: string; minGoal?: number; maxGoal?: number }> = {
  lt50: { label: "Dưới 50 triệu", maxGoal: 50 * MILLION },
  "50-200": { label: "50 – 200 triệu", minGoal: 50 * MILLION, maxGoal: 200 * MILLION },
  "200-1000": { label: "200 triệu – 1 tỷ", minGoal: 200 * MILLION, maxGoal: 1000 * MILLION },
  gt1000: { label: "Trên 1 tỷ", minGoal: 1000 * MILLION },
};

const PROGRESS_OPTIONS: Record<string, { label: string; minProgress?: number; maxProgress?: number }> = {
  lt25: { label: "Dưới 25%", maxProgress: 25 },
  "25-75": { label: "25% – 75%", minProgress: 25, maxProgress: 75 },
  "75-100": { label: "Trên 75%, chưa đủ", minProgress: 75, maxProgress: 99.99 },
  done: { label: "Đã đủ 100%", minProgress: 100 },
};

const TIME_LEFT_OPTIONS: Record<string, string> = {
  "7": "Còn tối đa 7 ngày",
  "30": "Còn tối đa 30 ngày",
};

const SORT_OPTIONS: Record<Extract<CampaignSort, "popular" | "ending" | "progress" | "newest">, string> = {
  popular: "Nhiều người ủng hộ",
  ending: "Sắp hết hạn",
  progress: "Gần đạt mục tiêu",
  newest: "Mới phát hành",
};

type Filters = {
  q: string;
  category: string;
  status: string;
  location: string;
  goal: string;
  progress: string;
  timeLeft: string;
  sort: keyof typeof SORT_OPTIONS;
};

type Result = {
  key: string;
  items: Campaign[];
  total: number;
  source: "live" | "sample";
};

function toQuery(filters: Filters, text: { q: string; location: string }): CampaignQuery {
  return {
    q: text.q || undefined,
    category: filters.category || undefined,
    status: STATUS_OPTIONS[filters.status]?.statuses,
    location: text.location || undefined,
    ...(GOAL_OPTIONS[filters.goal] ?? {}),
    ...(PROGRESS_OPTIONS[filters.progress] ?? {}),
    endingWithinDays: filters.timeLeft ? Number(filters.timeLeft) : undefined,
    sort: filters.sort,
  };
}

/** Khi không gọi được máy chủ: lọc thô dữ liệu mẫu theo từ khóa/lĩnh vực. */
function sampleResult(query: CampaignQuery): Pick<Result, "items" | "total"> {
  const q = query.q?.toLocaleLowerCase("vi");
  const items = mockCampaigns.filter((campaign) => {
    const haystack = [campaign.title, campaign.summary, campaign.location, campaign.owner]
      .join(" ")
      .toLocaleLowerCase("vi");
    return (!q || haystack.includes(q)) && (!query.category || campaign.category === query.category);
  });
  return { items, total: items.length };
}

const EMPTY_FILTERS: Filters = {
  q: "",
  category: "",
  status: "",
  location: "",
  goal: "",
  progress: "",
  timeLeft: "",
  sort: "popular",
};

export function CampaignExplorer({ initialQuery = "", initialCategory = "" }: CampaignExplorerProps) {
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, q: initialQuery, category: initialCategory });
  const categories = useCategories();
  // Ô gõ chữ chỉ gửi lên server sau khi người dùng ngừng gõ.
  const [text, setText] = useState({ q: initialQuery.trim(), location: "" });
  const [result, setResult] = useState<Result | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setText({ q: filters.q.trim(), location: filters.location.trim() }),
      DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [filters.q, filters.location]);

  const query = useMemo(() => toQuery(filters, text), [filters, text]);
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    let active = true;
    // Phụ thuộc vào chuỗi khóa (không phải object) để gõ phím chưa qua debounce
    // không gây gọi API lại khi điều kiện lọc thực tế không đổi.
    const current = JSON.parse(queryKey) as CampaignQuery;
    fetchCampaigns({ ...current, limit: PAGE_SIZE, offset: 0 })
      .then((response) => {
        if (!active) return;
        setResult({ key: queryKey, items: response.items.map(apiCampaignToView), total: response.total, source: "live" });
      })
      .catch(() => {
        if (!active) return;
        setResult({ key: queryKey, ...sampleResult(current), source: "sample" });
      });
    return () => {
      active = false;
    };
  }, [queryKey]);

  const loading = result?.key !== queryKey;
  const items = result?.items ?? [];

  // Như GoFundMe: lần tải đầu hoặc tải lâu thì hiện thẻ khung; lọc nhanh chỉ làm mờ nhẹ kết quả cũ
  // để lưới không chớp qua khung chờ rồi lại hiện kết quả.
  const [slowKey, setSlowKey] = useState<string | null>(null);
  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlowKey(queryKey), SKELETON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loading, queryKey]);
  const showSkeleton = loading && (!result || slowKey === queryKey);
  const total = result?.total ?? 0;
  const canLoadMore = !loading && result?.source === "live" && items.length < total;

  const loadMore = async () => {
    if (!result) return;
    setLoadingMore(true);
    setMoreError("");
    try {
      const response = await fetchCampaigns({ ...query, limit: PAGE_SIZE, offset: result.items.length });
      setResult((current) =>
        current && current.key === queryKey
          ? { ...current, items: [...current.items, ...response.items.map(apiCampaignToView)], total: response.total }
          : current,
      );
    } catch {
      setMoreError("Không tải thêm được. Vui lòng thử lại.");
    } finally {
      setLoadingMore(false);
    }
  };

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const hasFilter = Object.entries(filters).some(([key, value]) => key !== "sort" && value !== "");
  const reset = () => setFilters(EMPTY_FILTERS);
  const categoryOptions = Object.fromEntries(categories.map((item) => [item, item]));

  return (
    <>
      <form className="search-hero" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="search-q">Tìm dự án</label>
        <div className="search-box">
          <Icon name="search" size={20} />
          <input
            id="search-q"
            type="search"
            value={filters.q}
            maxLength={200}
            autoComplete="off"
            onChange={(event) => update("q", event.target.value)}
            placeholder="Tìm theo tên dự án, nội dung hoặc địa phương"
          />
          {filters.q && (
            <button className="search-clear" type="button" aria-label="Xóa từ khóa" onClick={() => update("q", "")}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      </form>

      <div className="search-filters" role="group" aria-label="Bộ lọc dự án">
        <FilterPill label="Lĩnh vực" allLabel="Tất cả lĩnh vực" value={filters.category} options={categoryOptions} onChange={(value) => update("category", value)} />
        <FilterPill
          label="Trạng thái"
          allLabel="Mọi trạng thái"
          value={filters.status}
          options={Object.fromEntries(Object.entries(STATUS_OPTIONS).map(([key, option]) => [key, option.label]))}
          onChange={(value) => update("status", value)}
        />
        <LocationPill value={filters.location} onChange={(value) => update("location", value)} />
        <FilterPill
          label="Mục tiêu vốn"
          allLabel="Mọi mức"
          value={filters.goal}
          options={Object.fromEntries(Object.entries(GOAL_OPTIONS).map(([key, option]) => [key, option.label]))}
          onChange={(value) => update("goal", value)}
        />
        <FilterPill
          label="Tiến độ"
          allLabel="Mọi mức"
          value={filters.progress}
          options={Object.fromEntries(Object.entries(PROGRESS_OPTIONS).map(([key, option]) => [key, option.label]))}
          onChange={(value) => update("progress", value)}
        />
        <FilterPill label="Thời gian còn lại" allLabel="Không giới hạn" value={filters.timeLeft} options={TIME_LEFT_OPTIONS} onChange={(value) => update("timeLeft", value)} />
        <FilterPill
          label="Sắp xếp"
          value={filters.sort}
          options={SORT_OPTIONS}
          onChange={(value) => update("sort", value as Filters["sort"])}
          showValue
        />
        {hasFilter && (
          <button className="search-reset" type="button" onClick={reset}>Xóa bộ lọc</button>
        )}
      </div>

      <div className="search-head">
        <h1>{filters.q.trim() ? `Kết quả cho “${filters.q.trim()}”` : "Dự án"}</h1>
        <p aria-live="polite">
          {loading ? "Đang tải…" : `${total.toLocaleString("vi-VN")} dự án${hasFilter ? " phù hợp" : ""}`}
        </p>
      </div>
      {result?.source === "sample" && (
        <p className="sample-flag">Dữ liệu mẫu — không kết nối được máy chủ (chỉ lọc theo từ khóa, lĩnh vực)</p>
      )}

      {showSkeleton ? (
        <div className="card-grid search-grid result-skeleton" aria-hidden="true">
          {Array.from({ length: SKELETON_CARDS }, (_, index) => (
            <div className="skeleton-card" key={index}>
              <span className="skeleton-block skeleton-media" />
              <span className="skeleton-block skeleton-line" />
              <span className="skeleton-block skeleton-line skeleton-line-short" />
              <span className="skeleton-block skeleton-bar" />
            </div>
          ))}
        </div>
      ) : !loading && items.length === 0 ? (
        <div className="search-empty results-enter">
          <h2>Không tìm thấy dự án phù hợp</h2>
          <p>Thử từ khóa ngắn hơn hoặc bỏ bớt bộ lọc.</p>
          {hasFilter && <button className="account-pill" type="button" onClick={reset}>Xóa bộ lọc</button>}
        </div>
      ) : (
        <div
          className={`card-grid search-grid results-enter${loading ? " is-loading" : ""}`}
          aria-busy={loading}
          // Đổi khóa khi có bộ kết quả mới để cả lưới chạy lại hiệu ứng hiện dần
          key={result?.key ?? "initial"}
        >
          {spreadCategoryImages(items).map((campaign) => (
            <CampaignCard
              campaign={campaign}
              key={campaign.slug}
              // Chỉ khi đang tìm theo từ khóa: bấm vào kết quả là tín hiệu "search" cho gợi ý AI
              onOpen={text.q ? () => void trackBehaviorEvent(campaign.slug, "search") : undefined}
            />
          ))}
        </div>
      )}

      {canLoadMore && (
        <div className="search-more">
          <button className="account-pill" type="button" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Đang tải…" : "Xem thêm"}
          </button>
        </div>
      )}
      {moreError && <p className="form-error" role="alert">{moreError}</p>}
    </>
  );
}

/** Đóng bảng chọn khi bấm ra ngoài hoặc nhấn Esc. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

type FilterPillProps = {
  label: string;
  /** Lựa chọn "không lọc" (giá trị rỗng); bỏ qua với bộ lọc luôn có giá trị như Sắp xếp. */
  allLabel?: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
  /** Luôn hiện giá trị đang chọn thay vì tên bộ lọc (vd. Sắp xếp). */
  showValue?: boolean;
};

/** Nút bo tròn mở danh sách lựa chọn; đang lọc thì tô đậm và hiện giá trị đã chọn. */
function FilterPill({ label, allLabel, value, options, onChange, showValue = false }: FilterPillProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const id = useId();
  const active = value !== "" && !showValue;
  const choices: Array<[string, string]> = [...(allLabel ? [["", allLabel] as [string, string]] : []), ...Object.entries(options)];
  const text = showValue ? `${label}: ${options[value] ?? ""}` : active ? options[value] ?? value : label;

  return (
    <div className="filter-pill" ref={ref}>
      <button
        className={`filter-pill-btn${active ? " is-active" : ""}`}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label}: ${value ? options[value] ?? value : allLabel ?? ""}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{text}</span>
        <Icon name="chevron-down" size={14} className={open ? "gh-caret is-open" : "gh-caret"} />
      </button>
      {open && (
        <div className="filter-pop" id={id} role="radiogroup" aria-label={label}>
          {choices.map(([key, optionText]) => (
            <label className="filter-option" key={key || "all"}>
              <input
                type="radio"
                name={id}
                checked={value === key}
                onChange={() => {
                  onChange(key);
                  setOpen(false);
                }}
              />
              <span>{optionText}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Lọc theo địa điểm: ô nhập tự do trong bảng chọn. */
function LocationPill({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const id = useId();
  const active = value.trim() !== "";

  const apply = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="filter-pill" ref={ref}>
      <button
        className={`filter-pill-btn${active ? " is-active" : ""}`}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setDraft(value);
          setOpen((current) => !current);
        }}
      >
        <span>{active ? value : "Địa điểm"}</span>
        <Icon name="chevron-down" size={14} className={open ? "gh-caret is-open" : "gh-caret"} />
      </button>
      {open && (
        <form
          className="filter-pop filter-pop-form"
          id={id}
          onSubmit={(event) => {
            event.preventDefault();
            apply(draft.trim());
          }}
        >
          <label htmlFor={`${id}-input`}>Tỉnh/thành hoặc địa phương</label>
          <input id={`${id}-input`} value={draft} maxLength={100} placeholder="VD: Đà Nẵng" autoFocus onChange={(event) => setDraft(event.target.value)} />
          <div className="filter-pop-actions">
            {active && <button className="filter-pop-link" type="button" onClick={() => apply("")}>Bỏ lọc</button>}
            <button className="account-pill account-pill-solid" type="submit">Áp dụng</button>
          </div>
        </form>
      )}
    </div>
  );
}
