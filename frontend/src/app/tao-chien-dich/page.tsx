import type { Metadata } from "next";

import { CampaignWizard } from "@/features/campaign-create/CampaignWizard";

export const metadata: Metadata = {
  title: "Bắt đầu chiến dịch",
  description: "Tạo hồ sơ chiến dịch gây quỹ theo từng bước minh bạch.",
};

export default function CreateCampaignPage() {
  return <main className="wizard-page"><div className="container"><CampaignWizard /></div></main>;
}
