import type { Metadata } from "next";

import { PageBanner } from "@/components/layout/PageBanner";
import { CampaignExplorer } from "@/features/discovery/CampaignExplorer";

export const metadata: Metadata = {
  title: "Dự án đang gây quỹ",
  description:
    "Danh sách chiến dịch gây quỹ đã được kiểm duyệt: giáo dục, môi trường, y tế, nông nghiệp và khởi nghiệp. Lọc theo lĩnh vực, trạng thái và tiến độ.",
  alternates: { canonical: "/du-an" },
};

type DiscoveryPageProps = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const params = await searchParams;

  return (
    <main>
      <PageBanner
        title="Dự án đang gây quỹ"
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Dự án" }]}
        image={{ src: "/images/cover-library.webp", alt: "" }}
      >
        <p className="page-banner-lead">
          Chỉ gồm chiến dịch đã được quản trị viên duyệt. Hồ sơ nháp, chờ duyệt hoặc bị từ chối không xuất hiện ở đây.
        </p>
      </PageBanner>
      <div className="container block-tight">
        <CampaignExplorer
          key={`${params.q ?? ""}:${params.category ?? ""}`}
          initialQuery={params.q}
          initialCategory={params.category}
        />
      </div>
    </main>
  );
}
