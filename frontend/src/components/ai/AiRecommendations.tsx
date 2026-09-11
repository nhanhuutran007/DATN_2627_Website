"use client";

import { useEffect, useState } from "react";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fetchAiRecommendations } from "@/lib/api/ai";
import type { Campaign } from "@/lib/data/campaigns";

type AiRecommendationsProps = {
  fallback?: Campaign[];
};

export function AiRecommendations({ fallback = [] }: AiRecommendationsProps) {
  const [items, setItems] = useState<Campaign[]>(fallback);
  const [source, setSource] = useState<string | undefined>();
  const [detail, setDetail] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    fetchAiRecommendations({ limit: 3 })
      .then((result) => {
        if (cancelled) return;
        if (result.items.length > 0) {
          setItems(result.items.map((item) => item.campaign));
        }
        setSource(result.source);
        setDetail(result.detail);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const isFallback = source === "POPULAR_FALLBACK";

  return (
    <section className="section ai-section">
      <div className="container">
        <div className="ai-heading-row">
          <SectionHeading
            eyebrow="Dành riêng cho bạn"
            title="Có thể bạn sẽ quan tâm"
            description="Gợi ý cá nhân hóa dựa trên sở thích và hành vi của bạn, kèm giải thích tại sao. Khi dịch vụ AI gián đoạn, hệ thống tự chuyển sang dự án phổ biến."
          />
          <div className="ai-label">
            <Icon name="sparkles" size={18} />
            {isFallback ? "Dự án phổ biến" : "Gợi ý có giải thích"}
          </div>
        </div>
        <div className="campaign-grid campaign-grid-three">
          {items.map((campaign) => (
            <CampaignCard campaign={campaign} key={campaign.slug} showAiReason />
          ))}
        </div>
        {detail && <p className="ai-note">{detail}</p>}
      </div>
    </section>
  );
}