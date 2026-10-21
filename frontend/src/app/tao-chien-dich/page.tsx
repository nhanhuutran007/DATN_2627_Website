import type { Metadata } from "next";

import { CampaignWizard } from "@/features/campaign-create/CampaignWizard";
import { api } from "@/lib/api";

export const metadata: Metadata = {
  title: "Tạo chiến dịch",
  description: "Soạn hồ sơ chiến dịch gây quỹ theo từng bước và gửi quản trị viên xét duyệt.",
  robots: { index: false },
};

type CreateCampaignPageProps = {
  searchParams: Promise<{ "linh-vuc"?: string | string[] }>;
};

/** Chỉ nhận lĩnh vực đang mở (theo `GET /categories`), tránh chọn sẵn giá trị tùy ý từ URL. */
async function resolveCategory(value: string | string[] | undefined): Promise<string | undefined> {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const categories = await api.get<Array<{ name: string; isActive: boolean }>>("/categories");
    return categories.some((item) => item.isActive && item.name === value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Trang toàn màn hình (không header/footer, xem ChromeGate), bố cục theo trang tạo gây quỹ của GoFundMe. */
export default async function CreateCampaignPage({ searchParams }: CreateCampaignPageProps) {
  const initialCategory = await resolveCategory((await searchParams)["linh-vuc"]);
  return (
    <main>
      <CampaignWizard initialCategory={initialCategory} />
    </main>
  );
}
