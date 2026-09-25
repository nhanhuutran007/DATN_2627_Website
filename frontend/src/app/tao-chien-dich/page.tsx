import type { Metadata } from "next";

import { PageBanner } from "@/components/layout/PageBanner";
import { CampaignWizard } from "@/features/campaign-create/CampaignWizard";

export const metadata: Metadata = {
  title: "Tạo chiến dịch",
  description: "Soạn hồ sơ chiến dịch gây quỹ theo từng bước và gửi quản trị viên xét duyệt.",
  robots: { index: false },
};

export default function CreateCampaignPage() {
  return (
    <main>
      <PageBanner
        title="Tạo chiến dịch gây quỹ"
        crumbs={[{ href: "/", label: "Trang chủ" }, { label: "Tạo chiến dịch" }]}
        image={{ src: "/images/cover-startup.webp", alt: "" }}
      >
        <p className="page-banner-lead">Soạn hồ sơ theo 4 bước, lưu nháp bất cứ lúc nào. Hồ sơ chỉ được công khai sau khi quản trị viên duyệt.</p>
      </PageBanner>
      <div className="container block-tight">
        <CampaignWizard />
      </div>
    </main>
  );
}
