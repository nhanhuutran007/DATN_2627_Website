import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiPredictCard } from "@/components/ai/AiPredictCard";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { ProgressBar } from "@/components/campaign/ProgressBar";
import { PageBanner } from "@/components/layout/PageBanner";
import { Icon } from "@/components/ui/Icon";
import { CampaignLedger } from "@/features/donations/CampaignLedger";
import { DonationPanel } from "@/features/donations/DonationPanel";
import { ReportCampaignButton } from "@/features/moderation/ReportCampaignButton";
import { apiCampaignToView, fetchCampaign, fetchCampaigns } from "@/lib/api/campaigns";
import { fetchCampaignProgress, type CampaignProgress } from "@/lib/api/progress";
import { coverFor } from "@/lib/covers";
import { campaignProgress, campaigns as mockCampaigns, findCampaign, type Campaign } from "@/lib/data/campaigns";
import { formatVnd, isLiveId } from "@/lib/format";

export const dynamic = "force-dynamic";

type CampaignDetailPageProps = {
  params: Promise<{ slug: string }>;
};

type Loaded = { campaign: Campaign; live: boolean };

async function loadCampaign(slug: string): Promise<Loaded | undefined> {
  if (isLiveId(slug)) {
    try {
      return { campaign: apiCampaignToView(await fetchCampaign(slug)), live: true };
    } catch {
      return undefined;
    }
  }
  const sample = findCampaign(slug);
  return sample ? { campaign: sample, live: false } : undefined;
}

async function loadProgress(id: string): Promise<CampaignProgress | null> {
  try {
    return await fetchCampaignProgress(id);
  } catch {
    return null;
  }
}

async function loadRelated(current: Campaign, live: boolean): Promise<Campaign[]> {
  if (!live) return mockCampaigns.filter((item) => item.slug !== current.slug).slice(0, 3);
  try {
    const response = await fetchCampaigns({ limit: 12, sort: "popular" });
    const others = response.items.map(apiCampaignToView).filter((item) => item.slug !== current.slug);
    const same = others.filter((item) => item.category === current.category);
    return (same.length > 0 ? same : others).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadCampaign(slug);
  if (!loaded) return { title: "Không tìm thấy dự án", robots: { index: false } };
  const { campaign, live } = loaded;
  const cover = coverFor(campaign);
  return {
    title: campaign.title,
    description: campaign.summary,
    alternates: { canonical: `/du-an/${campaign.slug}` },
    robots: live ? undefined : { index: false },
    openGraph: {
      type: "article",
      title: campaign.title,
      description: campaign.summary,
      images: [{ url: cover.src, alt: cover.alt }],
    },
  };
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { slug } = await params;
  const loaded = await loadCampaign(slug);
  if (!loaded) notFound();

  const { campaign, live } = loaded;
  const [progress, related] = await Promise.all([
    live ? loadProgress(campaign.slug) : Promise.resolve(null),
    loadRelated(campaign, live),
  ]);
  const percent = campaignProgress(campaign);
  const open = campaign.status === "Đang gây quỹ";
  const plannedBudget = campaign.milestones.reduce((sum, milestone) => sum + milestone.budget, 0);
  const totalMilestones = progress?.totalMilestones ?? campaign.milestones.length;
  const budget = progress?.totalBudget ?? plannedBudget;
  const cover = coverFor(campaign);

  return (
    <main>
      <PageBanner
        title={campaign.title}
        crumbs={[{ href: "/", label: "Trang chủ" }, { href: "/du-an", label: "Dự án" }, { label: campaign.category }]}
        image={cover}
      >
        <ul className="banner-meta">
          <li><Icon name="document" size={15} /> {campaign.category}</li>
          <li><Icon name="location" size={15} /> {campaign.location}</li>
          <li><Icon name="user" size={15} /> {campaign.owner}</li>
          <li className={open ? "is-open" : ""}>{campaign.status}</li>
        </ul>
      </PageBanner>

      <div className="container detail-layout">
        {!live && <p className="notice-sample">Dữ liệu mẫu — không phải chiến dịch thật trên hệ thống.</p>}

        <div className="detail-main">
          <section className="panel" aria-labelledby="gioi-thieu-du-an">
            <h2 id="gioi-thieu-du-an">Giới thiệu dự án</h2>
            <div className="detail-story">
              {campaign.story.map((paragraph, index) => (
                <p className={index === 0 ? "detail-lead" : undefined} key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {cover.illustrative && <p className="hint">Ảnh đầu trang là ảnh minh họa theo lĩnh vực.</p>}
          </section>

          <section className="panel" aria-labelledby="ke-hoach">
            <h2 id="ke-hoach">Kế hoạch và ngân sách</h2>
            {campaign.milestones.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Mốc công việc</th>
                      <th scope="col">Hạn</th>
                      <th scope="col" className="num">Ngân sách</th>
                      <th scope="col">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.milestones.map((milestone, index) => (
                      <tr key={`${milestone.title}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{milestone.title}</td>
                        <td className="nowrap">{milestone.date}</td>
                        <td className="num">{formatVnd(milestone.budget)}</td>
                        <td><span className={`tag ${milestone.status === "Hoàn thành" ? "tag-green" : ""}`}>{milestone.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Tổng ngân sách dự kiến</td>
                      <td className="num">{formatVnd(plannedBudget)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="hint">Chủ dự án chưa công bố kế hoạch theo mốc.</p>
            )}
          </section>

          <section className="panel" aria-labelledby="so-cai">
            <h2 id="so-cai">Sổ cái giao dịch</h2>
            <p className="hint">Các khoản ủng hộ đã được cổng thanh toán xác nhận, mới nhất ở trên.</p>
            {live ? <CampaignLedger campaignId={campaign.slug} /> : <p className="hint">Dữ liệu mẫu không có sổ cái.</p>}
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel fund-card" aria-label="Tiến độ gây quỹ">
            <p className="fund-amount">{formatVnd(campaign.raised)}</p>
            <p className="fund-target">đã nhận / mục tiêu {formatVnd(campaign.target)}</p>
            <ProgressBar value={percent} label={`Đạt ${percent}% mục tiêu`} />
            <ul className="fund-stats">
              <li><strong>{percent}%</strong><span>hoàn thành</span></li>
              <li><strong>{campaign.backers.toLocaleString("vi-VN")}</strong><span>lượt ủng hộ</span></li>
              <li><strong>{open ? campaign.daysLeft : "—"}</strong><span>{open ? "ngày còn lại" : campaign.status}</span></li>
            </ul>
            {open && <a className="button button-primary button-block" href="#ung-ho">Ủng hộ ngay</a>}
            {live && <div className="fund-report"><ReportCampaignButton campaignId={campaign.slug} campaignSlug={campaign.slug} /></div>}
          </section>

          {open && (
            <div className="panel" id="ung-ho">
              <DonationPanel campaignId={campaign.slug} campaignTitle={campaign.title} enabled={live} />
            </div>
          )}

          <section className="panel" aria-labelledby="thong-tin-ho-so">
            <h2 id="thong-tin-ho-so" className="panel-title-sm">Thông tin hồ sơ</h2>
            <ul className="facts">
              <li><span>Kiểm duyệt</span><span>Đã được quản trị viên duyệt</span></li>
              <li>
                <span>Kế hoạch</span>
                <span>
                  {totalMilestones === 0
                    ? "Chưa có mốc"
                    : progress
                      ? `${progress.completedMilestones}/${totalMilestones} mốc hoàn thành`
                      : `${totalMilestones} mốc`}
                </span>
              </li>
              <li><span>Chi tiêu đã báo cáo</span><span>{progress && progress.totalExpense > 0 ? formatVnd(progress.totalExpense) : "Chưa có"}</span></li>
              <li><span>Ngân sách kế hoạch</span><span>{budget > 0 ? formatVnd(budget) : "—"}</span></li>
              {campaign.endDate && <li><span>Hạn gây quỹ</span><span>{campaign.endDate}</span></li>}
            </ul>
          </section>

          {live && <AiPredictCard campaignId={campaign.slug} />}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="block block-soft" aria-labelledby="lien-quan">
          <div className="container">
            <div className="block-head block-head-split">
              <div>
                <span className="pill">Dự án liên quan</span>
                <h2 id="lien-quan">Có thể bạn cũng quan tâm</h2>
              </div>
              <Link className="link-arrow" href="/du-an">Xem tất cả <Icon name="arrow-right" size={16} /></Link>
            </div>
            <div className="card-grid">
              {related.map((item) => <CampaignCard campaign={item} key={item.slug} />)}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
