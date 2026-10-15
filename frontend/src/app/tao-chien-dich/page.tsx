import type { Metadata } from "next";

import { CampaignWizard } from "@/features/campaign-create/CampaignWizard";

export const metadata: Metadata = {
  title: "Tạo chiến dịch",
  description: "Soạn hồ sơ chiến dịch gây quỹ theo từng bước và gửi quản trị viên xét duyệt.",
  robots: { index: false },
};

/** Trang toàn màn hình (không header/footer, xem ChromeGate), bố cục theo trang tạo gây quỹ của GoFundMe. */
export default function CreateCampaignPage() {
  return (
    <main>
      <CampaignWizard />
    </main>
  );
}
