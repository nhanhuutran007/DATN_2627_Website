"use client";

import { useEffect } from "react";

import { recordCampaignView } from "@/lib/api/campaign-stats";

/** Ghi nhận lượt xem trang chiến dịch (không hiển thị gì). */
export function CampaignViewTracker({ campaignId }: { campaignId: string }) {
  useEffect(() => {
    void recordCampaignView(campaignId);
  }, [campaignId]);
  return null;
}
