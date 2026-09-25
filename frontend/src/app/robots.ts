import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Trang cá nhân / quản trị không cần lập chỉ mục
      disallow: ["/admin", "/dashboard", "/tao-chien-dich"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
