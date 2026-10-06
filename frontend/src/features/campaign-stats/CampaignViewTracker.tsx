"use client";

import { useEffect } from "react";

import { trackBehaviorEvent } from "@/lib/api/ai";
import { recordCampaignView } from "@/lib/api/campaign-stats";

/**
 * Ghi nhận lượt xem trang chiến dịch (không hiển thị gì): đếm lượt xem cho số liệu
 * của chủ dự án, và hành vi "xem" cho gợi ý AI nếu người dùng đã đồng ý.
 */
export function CampaignViewTracker({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    void recordCampaignView(campaignId);
    void trackBehaviorEvent(campaignId, "view");
  }, [campaignId]);
  return null;
}
