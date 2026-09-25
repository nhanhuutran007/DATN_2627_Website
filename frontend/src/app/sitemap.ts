import type { MetadataRoute } from "next";

import { fetchCampaigns } from "@/lib/api/campaigns";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/du-an`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/dang-ky`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const { items } = await fetchCampaigns({ limit: 100, sort: "latest" });
    return [
      ...staticPages,
      ...items.map((campaign) => ({
        url: `${siteUrl}/du-an/${campaign.id}`,
        lastModified: campaign.updatedAt ? new Date(campaign.updatedAt) : now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticPages;
  }
}
