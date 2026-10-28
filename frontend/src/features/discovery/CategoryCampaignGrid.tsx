"use client";

import { useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { apiCampaignToView, fetchCampaigns, spreadCategoryImages } from "@/lib/api/campaigns";
import type { Campaign } from "@/lib/data/campaigns";

type CategoryCampaignGridProps = {
  category: string;
  initialItems: Campaign[];
  total: number;
  pageSize: number;
  /** false khi đang hiển thị dữ liệu mẫu: không gọi máy chủ để tải thêm. */
  live: boolean;
};

/** Lưới dự án của một lĩnh vực, nút "Xem thêm" tải tiếp từng trang. */
export function CategoryCampaignGrid({ category, initialItems, total, pageSize, live }: CategoryCampaignGridProps) {
  const [items, setItems] = useState(initialItems);
  const [count, setCount] = useState(total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMore = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchCampaigns({ category, sort: "popular", limit: pageSize, offset: items.length });
      setItems((current) => [...current, ...response.items.map(apiCampaignToView)]);
      setCount(response.total);
    } catch {
      setError("Không tải thêm được. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return <p className="category-empty">Lĩnh vực này chưa có dự án nào được công khai. Hãy là người đầu tiên tạo chiến dịch!</p>;
  }

  return (
    <>
      <div className="card-grid results-enter" aria-busy={loading}>
        {spreadCategoryImages(items).map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} />)}
      </div>
      {live && items.length < count && (
        <div className="category-more">
          <button className="button button-outline" type="button" disabled={loading} onClick={() => void loadMore()}>
            {loading ? "Đang tải…" : "Xem thêm"}
          </button>
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </>
  );
}
