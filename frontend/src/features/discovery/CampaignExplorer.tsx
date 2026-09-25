"use client";

import { useEffect, useMemo, useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { apiCampaignToView, fetchCampaigns } from "@/lib/api/campaigns";
import {
  campaigns as mockCampaigns,
  campaignProgress,
  type Campaign,
} from "@/lib/data/campaigns";

type CampaignExplorerProps = {
  initialQuery?: string;
  initialCategory?: string;
};

type SortOption = "popular" | "ending" | "progress";

type LoadState = "loading" | "live" | "sample";

const CATEGORIES = ["Giáo dục", "Môi trường", "Nông nghiệp", "Y tế", "Khởi nghiệp", "Công nghệ"];

export function CampaignExplorer({ initialQuery = "", initialCategory = "" }: CampaignExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortOption>("popular");

  const [all, setAll] = useState<Campaign[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;
    fetchCampaigns({ limit: 100, sort: "latest" })
      .then((response) => {
        if (!active) return;
        setAll(response.items.map(apiCampaignToView));
        setState("live");
      })
      .catch(() => {
        if (!active) return;
        setAll(mockCampaigns);
        setState("sample");
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const present = new Set(all.map((campaign) => campaign.category));
    return Array.from(new Set([...CATEGORIES, ...present]));
  }, [all]);

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    const filtered = all.filter((campaign) => {
      const haystack = [campaign.title, campaign.summary, campaign.location, campaign.owner, campaign.category]
        .join(" ")
        .toLocaleLowerCase("vi");
      return (!q || haystack.includes(q))
        && (!category || campaign.category === category)
        && (!status || (status === "closed"
          ? campaign.status === "Kết thúc" || campaign.status === "Đã kết thúc"
          : campaign.status === status));
    });
    return filtered.sort((a, b) => {
      if (sort === "ending") return (a.daysLeft || Infinity) - (b.daysLeft || Infinity);
      if (sort === "progress") return campaignProgress(b) - campaignProgress(a);
      return b.backers - a.backers;
    });
  }, [all, category, query, sort, status]);

  const hasFilter = Boolean(query || category || status);
  const reset = () => {
    setQuery("");
    setCategory("");
    setStatus("");
    setSort("popular");
  };

  return (
    <>
      <form className="filter-bar" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="filter-field filter-field-wide">
          <span>Từ khóa</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên dự án, địa phương, chủ dự án…"
          />
        </label>
        <label className="filter-field">
          <span>Lĩnh vực</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Tất cả</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Trạng thái</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả</option>
            <option value="Đang gây quỹ">Đang gây quỹ</option>
            <option value="Đã đạt mục tiêu">Đã đạt mục tiêu</option>
            <option value="closed">Đã kết thúc</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Sắp xếp</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            <option value="popular">Nhiều người ủng hộ</option>
            <option value="ending">Sắp hết hạn</option>
            <option value="progress">Gần đạt mục tiêu</option>
          </select>
        </label>
      </form>

      <div className="results-line" aria-live="polite">
        {state === "loading" ? (
          <span>Đang tải danh sách…</span>
        ) : (
          <span>
            <b className="num">{results.length}</b> hồ sơ{hasFilter ? " khớp bộ lọc" : ""}
            {hasFilter && <button type="button" onClick={reset}>Bỏ lọc</button>}
          </span>
        )}
        {state === "sample" && <span className="sample-flag">Dữ liệu mẫu — không kết nối được máy chủ</span>}
      </div>

      {state !== "loading" && results.length === 0 ? (
        <div className="empty-box">
          <p>Không có hồ sơ nào khớp. Thử bỏ bớt điều kiện hoặc dùng từ khóa ngắn hơn.</p>
          {hasFilter && <button className="button button-outline" type="button" onClick={reset}>Bỏ lọc</button>}
        </div>
      ) : (
        <div className="card-grid">
          {results.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} />)}
        </div>
      )}
    </>
  );
}
