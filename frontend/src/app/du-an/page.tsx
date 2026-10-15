import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CategoryLanding } from "@/features/discovery/CategoryLanding";
import { DiscoverHub } from "@/features/discovery/DiscoverHub";

export const dynamic = "force-dynamic";

type DiscoveryPageProps = {
  searchParams: Promise<{ q?: string; category?: string; xem?: string }>;
};

export async function generateMetadata({ searchParams }: DiscoveryPageProps): Promise<Metadata> {
  const category = (await searchParams).category?.trim();
  if (category) {
    return {
      title: `Dự án ${category.toLocaleLowerCase("vi")}`,
      description: `Khám phá và ủng hộ các dự án ${category.toLocaleLowerCase("vi")} đã được kiểm duyệt trên Góp Mầm.`,
      alternates: { canonical: `/du-an?category=${encodeURIComponent(category)}` },
    };
  }
  return {
    title: "Khám phá dự án",
    description:
      "Khám phá chiến dịch gây quỹ đã được kiểm duyệt theo lĩnh vực: giáo dục, môi trường, y tế, nông nghiệp, khởi nghiệp. Lọc theo trạng thái và tiến độ.",
    alternates: { canonical: "/du-an" },
  };
}

/**
 * `/du-an` không tham số: trang khám phá theo lĩnh vực (kiểu GoFundMe Discover).
 * `category`: trang riêng của lĩnh vực. `q` hoặc `xem=tat-ca`: chuyển sang trang tìm kiếm /tim-kiem.
 */
export default async function DiscoveryPage({ searchParams }: DiscoveryPageProps) {
  const params = await searchParams;
  const category = params.category?.trim() ?? "";
  const q = params.q?.trim() ?? "";

  if (!category && !q && params.xem !== "tat-ca") {
    return (
      <main>
        <DiscoverHub />
      </main>
    );
  }

  if (category && !q) {
    return (
      <main>
        <CategoryLanding category={category} />
      </main>
    );
  }

  // Tìm kiếm và "xem tất cả" đã chuyển sang trang /tim-kiem (kiểu GoFundMe /s); giữ link cũ hoạt động.
  const target = new URLSearchParams();
  if (q) target.set("q", q);
  if (category) target.set("category", category);
  const query = target.toString();
  redirect(query ? `/tim-kiem?${query}` : "/tim-kiem");
}
