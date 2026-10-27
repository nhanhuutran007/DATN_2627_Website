import type { Metadata } from "next";

import { CampaignWizard } from "@/features/campaign-create/CampaignWizard";
import { api } from "@/lib/api";
import { fetchOrganization, toPicked, type PickedOrganization } from "@/lib/api/organizations";

export const metadata: Metadata = {
  title: "Tạo chiến dịch",
  description: "Soạn hồ sơ chiến dịch gây quỹ theo từng bước và gửi quản trị viên xét duyệt.",
  robots: { index: false },
};

type CreateCampaignPageProps = {
  searchParams: Promise<{ "linh-vuc"?: string | string[]; "to-chuc"?: string | string[] }>;
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

/** `?to-chuc=<slug>` từ trang tổ chức: API công khai chỉ trả tổ chức đã xác minh. */
async function resolveOrganization(value: string | string[] | undefined): Promise<PickedOrganization | undefined> {
  if (typeof value !== "string" || !value) return undefined;
  try {
    return toPicked(await fetchOrganization(value));
  } catch {
    return undefined;
  }
}

/** Trang toàn màn hình (không header/footer, xem ChromeGate), bố cục theo trang tạo gây quỹ của GoFundMe. */
export default async function CreateCampaignPage({ searchParams }: CreateCampaignPageProps) {
  const params = await searchParams;
  const [initialCategory, initialOrganization] = await Promise.all([
    resolveCategory(params["linh-vuc"]),
    resolveOrganization(params["to-chuc"]),
  ]);
  return (
    <main>
      <CampaignWizard initialCategory={initialCategory} initialOrganization={initialOrganization} />
    </main>
  );
}
