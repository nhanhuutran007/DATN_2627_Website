"use client";

import { useEffect, useMemo, useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Icon } from "@/components/ui/Icon";
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

type SortOption = "popular" | "ending" | "newest" | "progress";

type DataSource = "api" | "mock" | null;

export function CampaignExplorer({ initialQuery = "", initialCategory = "" }: CampaignExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortOption>("popular");
  const [aiOnly, setAiOnly] = useState(false);

  const [viewCampaigns, setViewCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<DataSource>(null);

  useEffect(() => {
    let active = true;

    async function loadCampaigns() {
      setLoading(true);
      setSource(null);
      try {
        const response = await fetchCampaigns({ limit: 100, sort: "latest" });
        if (!active) return;
        setViewCampaigns(response.items.map(apiCampaignToView));
        setSource("api");
      } catch {
        if (!active) return;
        setViewCampaigns(mockCampaigns);
        setSource("mock");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCampaigns();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi");
    const result = viewCampaigns.filter((campaign) => {
      const searchable = [campaign.title, campaign.summary, campaign.location, campaign.owner, campaign.category]
        .join(" ")
        .toLocaleLowerCase("vi");
      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (!category || campaign.category === category) &&
        (!status || campaign.status === status) &&
        (!aiOnly || Boolean(campaign.aiReason))
      );
    });

    return [...result].sort((a, b) => {
      if (sort === "ending") return a.daysLeft - b.daysLeft;
      if (sort === "progress") return campaignProgress(b) - campaignProgress(a);
      if (sort === "newest") return Number(b.status === "Mới phát hành") - Number(a.status === "Mới phát hành");
      return b.backers - a.backers;
    });
  }, [aiOnly, category, query, sort, status, viewCampaigns]);

  const clearFilters = () => {
    setQuery("");
    setCategory("");
    setStatus("");
    setSort("popular");
    setAiOnly(false);
  };

  return (
    <div className="explorer-layout">
      <aside className="filter-panel" aria-label="Bộ lọc chiến dịch">
        <div className="filter-title-row">
          <h2>Bộ lọc</h2>
          <button type="button" onClick={clearFilters}>Đặt lại</button>
        </div>
        <label className="field-label" htmlFor="explorer-search">Từ khóa</label>
        <div className="search-field">
          <Icon name="search" size={18} />
          <input
            id="explorer-search"
            value={query}
            placeholder="Tên dự án, địa điểm..."
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <label className="field-label" htmlFor="category-filter">Lĩnh vực</label>
        <div className="select-field">
          <select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Tất cả lĩnh vực</option>
            <option value="Môi trường">Môi trường</option>
            <option value="Khởi nghiệp">Khởi nghiệp</option>
            <option value="Giáo dục">Giáo dục</option>
            <option value="Y tế">Y tế</option>
          </select>
          <Icon name="chevron-down" size={16} />
        </div>

        <label className="field-label" htmlFor="status-filter">Trạng thái</label>
        <div className="select-field">
          <select id="status-filter" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="Đang gây quỹ">Đang gây quỹ</option>
            <option value="Đã đạt mục tiêu">Đã đạt mục tiêu</option>
            <option value="Đã kết thúc">Đã kết thúc</option>
          </select>
          <Icon name="chevron-down" size={16} />
        </div>

        <div className="filter-divider" />
        <label className="switch-row">
          <span><Icon name="sparkles" size={17} /><span><b>Gợi ý cho bạn</b><small>Có lý do xếp hạng từ AI</small></span></span>
          <input type="checkbox" checked={aiOnly} onChange={(event) => setAiOnly(event.target.checked)} />
          <i aria-hidden="true" />
        </label>

        <div className="filter-help">
          <Icon name="shield" size={18} />
          <p><b>Chỉ dự án đủ điều kiện</b><span>Danh sách công khai không hiển thị bản nháp, dự án bị tạm dừng hoặc chưa duyệt.</span></p>
        </div>
      </aside>

      <section className="explorer-results" aria-live="polite">
        <div className="results-toolbar">
          <div>
            <strong>{loading ? "Đang tải…" : `${filtered.length} dự án`}</strong>
            <span>{loading ? "đang kết nối hệ thống" : "phù hợp với bộ lọc"}</span>
          </div>
          <label className="sort-control">
            <span>Sắp xếp</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="popular">Phổ biến nhất</option>
              <option value="ending">Sắp kết thúc</option>
              <option value="newest">Mới phát hành</option>
              <option value="progress">Tiến độ cao nhất</option>
            </select>
          </label>
        </div>

        {source === "mock" && (
          <p className="explorer-source-note">
            <Icon name="shield" size={15} /> Backend tạm thời không kết nối được, đang hiển thị dữ liệu mẫu.
          </p>
        )}

        {filtered.length > 0 ? (
          <div className="campaign-grid explorer-grid">
            {filtered.map((campaign: Campaign) => (
              <CampaignCard campaign={campaign} key={campaign.slug} showAiReason={aiOnly} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span><Icon name="search" size={30} /></span>
            <h2>{loading ? "Đang tải dự án" : "Chưa tìm thấy dự án phù hợp"}</h2>
            <p>
              {loading
                ? "Đang kết nối và đồng bộ danh sách chiến dịch từ hệ thống."
                : "Thử bỏ bớt điều kiện hoặc tìm bằng một từ khóa ngắn hơn."}
            </p>
            {!loading && (
              <button className="button button-primary" type="button" onClick={clearFilters}>Xóa bộ lọc</button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}