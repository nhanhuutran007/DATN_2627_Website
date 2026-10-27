import type { MetadataRoute } from "next";

import { fetchCampaigns } from "@/lib/api/campaigns";
import { fetchOrganizations } from "@/lib/api/organizations";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/du-an`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/bat-dau-gay-quy`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/to-chuc`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/gay-quy-cho-to-chuc`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/danh-cho-to-chuc`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/dang-ky`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Mỗi nguồn lỗi độc lập: API tổ chức lỗi vẫn giữ được danh sách dự án và ngược lại.
  const [campaigns, organizations] = await Promise.all([
    fetchCampaigns({ limit: 100, sort: "latest" }).then((result) => result.items).catch(() => []),
    fetchOrganizations({ limit: 50 }).then((result) => result.items).catch(() => []),
  ]);
  return [
    ...staticPages,
    ...campaigns.map((campaign) => ({
      url: `${siteUrl}/du-an/${campaign.id}`,
      lastModified: campaign.updatedAt ? new Date(campaign.updatedAt) : now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...organizations.map((organization) => ({
      url: `${siteUrl}/to-chuc/${organization.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
