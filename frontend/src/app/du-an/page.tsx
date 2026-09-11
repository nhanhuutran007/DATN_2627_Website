import type { Metadata } from "next";

import { CampaignExplorer } from "@/features/discovery/CampaignExplorer";

export const metadata: Metadata = {
  title: "Khám phá dự án",
  description: "Tìm kiếm và lọc các chiến dịch xã hội, giáo dục, y tế, môi trường và khởi nghiệp.",
};

type DiscoveryPageProps = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const params = await searchParams;

  return (
    <main className="page-surface">
      <section className="page-hero page-hero-compact">
        <div className="container">
          <p className="eyebrow">Khám phá</p>
          <h1>Tìm một dự án<br /><em>đáng để tin.</em></h1>
          <p>Tìm kiếm toàn văn, lọc theo lĩnh vực và theo dõi các chiến dịch đã được kiểm duyệt.</p>
        </div>
      </section>
      <section className="container explorer-section">
        <CampaignExplorer
          key={`${params.q ?? ""}:${params.category ?? ""}`}
          initialQuery={params.q}
          initialCategory={params.category}
        />
      </section>
    </main>
  );
}
