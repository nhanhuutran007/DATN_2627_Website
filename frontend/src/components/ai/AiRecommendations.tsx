"use client";

import { useEffect, useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { fetchAiRecommendations, type AiRecommendSource } from "@/lib/api/ai";
import type { Campaign } from "@/lib/data/campaigns";

type AiRecommendationsProps = {
  /** Hiển thị khi chưa có (hoặc không lấy được) gợi ý. */
  fallback?: Campaign[];
};

const SOURCE_LABEL: Record<AiRecommendSource, string> = {
  COLLABORATIVE: "dựa trên những người ủng hộ có quan tâm giống bạn",
  CONTENT: "dựa trên lĩnh vực bạn đã xem và ủng hộ",
  COLD_START: "cho tài khoản mới, theo lĩnh vực được quan tâm nhiều",
  POPULAR_FALLBACK: "dịch vụ gợi ý tạm gián đoạn, đang hiển thị dự án được ủng hộ nhiều",
};

export function AiRecommendations({ fallback = [] }: AiRecommendationsProps) {
  const [items, setItems] = useState<Campaign[]>(fallback);
  const [source, setSource] = useState<AiRecommendSource | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetchAiRecommendations({ limit: 3 })
      .then((result) => {
        if (cancelled) return;
        if (result.items.length > 0) setItems(result.items.map((item) => item.campaign));
        setSource(result.source);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="block block-soft" aria-labelledby="goi-y">
      <div className="container">
        <div className="block-head block-head-center">
          <span className="pill">Gợi ý dành cho bạn</span>
          <h2 id="goi-y">Có thể bạn sẽ quan tâm</h2>
          <p>
            {source
              ? `Gợi ý ${SOURCE_LABEL[source]}. Kết quả chỉ để tham khảo.`
              : "Đăng nhập để nhận gợi ý kèm lý do. Hiện đang hiển thị các dự án mới phát hành."}
          </p>
        </div>
        <div className="card-grid">
          {items.map((campaign) => <CampaignCard campaign={campaign} key={campaign.slug} showAiReason />)}
        </div>
      </div>
    </section>
  );
}
