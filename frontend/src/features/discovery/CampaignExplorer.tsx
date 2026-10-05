"use client";

import { useEffect, useMemo, useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import {
  apiCampaignToView,
  fetchCampaigns,
  type ApiCampaignStatus,
  type CampaignQuery,
  type CampaignSort,
} from "@/lib/api/campaigns";
import { campaigns as mockCampaigns, type Campaign } from "@/lib/data/campaigns";

type CampaignExplorerProps = {
  initialQuery?: string;
  initialCategory?: string;
};

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 350;
const MILLION = 1_000_000;

const CATEGORIES = ["Giáo dục", "Môi trường", "Nông nghiệp", "Y tế", "Khởi nghiệp", "Công nghệ"];

const STATUS_OPTIONS: Record<string, { label: string; statuses: ApiCampaignStatus[] }> = {
  open: { label: "Đang gây quỹ", statuses: ["approved", "active"] },
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
  // Ô gõ chữ chỉ gửi lên server sau khi người dùng ngừng gõ.
  const [text, setText] = useState({ q: initialQuery.trim(), location: "" });
  const [result, setResult] = useState<Result | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  // Chỉ có tác dụng trên màn hình hẹp (CSS): thu gọn nhóm lọc nâng cao.
  const [showAdvanced, setShowAdvanced] = useState(false);

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
  const advancedCount = [filters.location, filters.goal, filters.progress, filters.timeLeft].filter(Boolean).length;
  const reset = () => setFilters(EMPTY_FILTERS);

  return (
    <>
      <form className="filter-bar" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="filter-field filter-field-wide">
          <span>Từ khóa</span>
          <input
            type="search"
            value={filters.q}
            maxLength={200}
            onChange={(event) => update("q", event.target.value)}
            placeholder="Tên dự án, nội dung, địa phương…"
          />
        </label>
        <label className="filter-field">
          <span>Lĩnh vực</span>
          <select value={filters.category} onChange={(event) => update("category", event.target.value)}>
            <option value="">Tất cả</option>
            {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Trạng thái</span>
          <select value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(STATUS_OPTIONS).map(([value, option]) => (
              <option key={value} value={value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Sắp xếp</span>
          <select value={filters.sort} onChange={(event) => update("sort", event.target.value as Filters["sort"])}>
            {Object.entries(SORT_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <button
          className="button button-outline filter-toggle"
          type="button"
          aria-expanded={showAdvanced}
          aria-controls="loc-nang-cao"
          onClick={() => setShowAdvanced((value) => !value)}
        >
          {showAdvanced ? "Ẩn lọc nâng cao" : "Lọc nâng cao"}
          {advancedCount > 0 && <span className="follow-count">{advancedCount}</span>}
        </button>

        <div className={`filter-more${showAdvanced ? " is-open" : ""}`} id="loc-nang-cao">
          <label className="filter-field">
            <span>Địa điểm</span>
            <input
              value={filters.location}
              maxLength={100}
              onChange={(event) => update("location", event.target.value)}
              placeholder="VD: Đà Nẵng"
            />
          </label>
          <label className="filter-field">
            <span>Mục tiêu vốn</span>
            <select value={filters.goal} onChange={(event) => update("goal", event.target.value)}>
              <option value="">Mọi mức</option>
              {Object.entries(GOAL_OPTIONS).map(([value, option]) => (
                <option key={value} value={value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Tỷ lệ hoàn thành</span>
            <select value={filters.progress} onChange={(event) => update("progress", event.target.value)}>
              <option value="">Mọi mức</option>
              {Object.entries(PROGRESS_OPTIONS).map(([value, option]) => (
                <option key={value} value={value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Thời gian còn lại</span>
            <select value={filters.timeLeft} onChange={(event) => update("timeLeft", event.target.value)}>
              <option value="">Không giới hạn</option>
              {Object.entries(TIME_LEFT_OPTIONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </form>

      <div className="results-line" aria-live="polite">
        {loading ? (
          <span>Đang tải danh sách…</span>
        ) : (
          <span>
            <b className="num">{total.toLocaleString("vi-VN")}</b> hồ sơ{hasFilter ? " khớp bộ lọc" : ""}
            {hasFilter && <button type="button" onClick={reset}>Bỏ lọc</button>}
          </span>
        )}
        {result?.source === "sample" && (
          <span className="sample-flag">Dữ liệu mẫu — không kết nối được máy chủ (chỉ lọc theo từ khóa, lĩnh vực)</span>
        )}
      </div>

      {!loading && items.length === 0 ? (
        <div className="empty-box">
          <p>Không có hồ sơ nào khớp. Thử bỏ bớt điều kiện hoặc dùng từ khóa ngắn hơn.</p>
          {hasFilter && <button className="button button-outline" type="button" onClick={reset}>Bỏ lọc</button>}
        </div>
      ) : (
        <div className={`card-grid${loading ? " is-loading" : ""}`} aria-busy={loading}>
          {items.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} />)}
        </div>
      )}

      {canLoadMore && (
        <div className="load-more">
          <button className="button button-outline" type="button" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? "Đang tải…" : `Xem thêm (${(total - items.length).toLocaleString("vi-VN")} hồ sơ)`}
          </button>
        </div>
      )}
      {moreError && <p className="form-error" role="alert">{moreError}</p>}
    </>
  );
}
