import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProgressRing } from "@/components/campaign/ProgressRing";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/LogoMark";
import { DonationPanel } from "@/features/donations/DonationPanel";
import type { SepayReturn } from "@/features/donations/SepayPaymentStatus";
import { apiCampaignToView, fetchCampaign, isPublishedStatus } from "@/lib/api/campaigns";
import { fetchRewardTiers, type RewardTier } from "@/lib/api/rewards";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";
import { formatVnd, isLiveId } from "@/lib/format";

export const dynamic = "force-dynamic";

type DonatePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ donation?: string; payment?: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEPAY_RESULTS: readonly SepayReturn[] = ["success", "error", "cancel"];

/** `?donation=<uuid>&payment=success|error|cancel` do SePay chuyển hướng về. */
function parseSepayReturn(query: { donation?: string; payment?: string }) {
  const result = SEPAY_RESULTS.find((value) => value === query.payment);
  if (!query.donation || !UUID_PATTERN.test(query.donation) || !result) return null;
  return { donationId: query.donation, result };
}

async function loadCampaign(slug: string): Promise<Campaign | undefined> {
  if (!isLiveId(slug)) return undefined;
  try {
    return apiCampaignToView(await fetchCampaign(slug));
  } catch {
    return undefined;
  }
}

async function loadRewardTiers(id: string): Promise<RewardTier[]> {
  try {
    return await fetchRewardTiers(id);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: DonatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  return {
    title: campaign ? `Ủng hộ ${campaign.title}` : "Ủng hộ dự án",
    robots: { index: false },
  };
}

/**
 * Trang ủng hộ toàn màn hình (không header/footer — xem ChromeGate), theo trang donate
 * của GoFundMe: một thẻ ở giữa gồm tiến độ + form, bên dưới là khối cam kết minh bạch.
 */
export default async function DonatePage({ params, searchParams }: DonatePageProps) {
  const { slug } = await params;
  const sepayReturn = parseSepayReturn(await searchParams);
  const campaign = await loadCampaign(slug);
  if (!campaign) notFound();

  const rewardTiers = await loadRewardTiers(campaign.slug);
  const percent = campaignProgress(campaign);
  const remaining = campaign.target - campaign.raised;
  const accepting = isPublishedStatus(campaign.apiStatus) && campaign.status === "Đang gây quỹ";
  const backHref = `/du-an/${encodeURIComponent(campaign.slug)}`;

  return (
    <div className="donate-page">
      <header className="donate-topbar">
        <Link className="donate-back" href={backHref}>
          <Icon name="chevron-left" size={20} /> Dự án
        </Link>
        <Link className="logo" href="/" aria-label="Góp Mầm – Trang chủ">
          <LogoMark className="logo-mark" />
          <span className="logo-text">GÓP <b>MẦM</b></span>
        </Link>
        <span aria-hidden="true" />
      </header>

      <main className="donate-main">
        <div className="donate-card">
          <div className="donate-card-head">
            <ProgressRing value={percent} size={72} />
            <div>
              <h1>{campaign.title}</h1>
              {campaign.organization && (
                <p className="donate-beneficiary">
                  <Icon name="shield" size={14} />
                  <span>Khoản ủng hộ dành cho <b>{campaign.organization.name}</b> · tổ chức đã xác minh</span>
                </p>
              )}
              <p>
                {!accepting
                  ? `Dự án hiện không nhận ủng hộ (${campaign.status.toLowerCase()}).`
                  : remaining > 0
                    ? `Còn ${formatVnd(remaining)} để đạt mục tiêu. Cùng tạo đà cho dự án!`
                    : "Dự án đã đạt mục tiêu — khoản ủng hộ thêm giúp dự án làm được nhiều hơn."}
              </p>
            </div>
          </div>

          <DonationPanel campaignId={campaign.slug} campaignTitle={campaign.title} enabled={accepting} rewardTiers={rewardTiers} sepayReturn={sepayReturn} />
        </div>

        <aside className="donate-protect">
          <Icon name="shield" size={22} />
          <div>
            <h2>Góp Mầm minh bạch khoản ủng hộ của bạn</h2>
            <p>
              Số tiền chỉ được cộng vào dự án khi giao dịch được xác nhận và hiện trong sổ cái công khai. Nếu có vấn đề,
              bạn có thể gửi yêu cầu hoàn tiền từ trang biên nhận để quản trị viên xem xét.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
