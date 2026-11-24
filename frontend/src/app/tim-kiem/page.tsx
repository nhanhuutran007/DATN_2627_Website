import type { Metadata } from "next";

import { CampaignExplorer } from "@/features/discovery/CampaignExplorer";

export const metadata: Metadata = {
  title: "Tìm dự án",
  description: "Tìm và lọc các chiến dịch gây quỹ đã được kiểm duyệt theo lĩnh vực, trạng thái, địa điểm, mục tiêu và tiến độ.",
  alternates: { canonical: "/tim-kiem" },
};

type SearchPageProps = {
  searchParams: Promise<{ q?: string; category?: string; "trang-thai"?: string }>;
};

/** Trang tìm kiếm toàn bộ dự án, bố cục theo GoFundMe /s: ô tìm kiếm lớn, các nút lọc bo tròn, lưới dự án. */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const category = params.category?.trim() ?? "";
  const status = params["trang-thai"]?.trim() ?? "";

  return (
    <main className="container search-page">
      <CampaignExplorer key={`${q}:${category}:${status}`} initialQuery={q} initialCategory={category} initialStatus={status} />
    </main>
  );
}
