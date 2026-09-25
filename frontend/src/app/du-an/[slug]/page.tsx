import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { DonationPanel } from "@/features/donations/DonationPanel";
import { ReportCampaignButton } from "@/features/moderation/ReportCampaignButton";
import { apiCampaignToView, fetchCampaign, fetchCampaigns } from "@/lib/api/campaigns";
import {
  campaignProgress,
  campaigns as mockCampaigns,
  findCampaign,
  formatCurrency,
  type Campaign,
} from "@/lib/data/campaigns";

export const dynamic = "force-dynamic";

type CampaignDetailPageProps = {
  params: Promise<{ slug: string }>;
};

async function loadCampaign(slug: string): Promise<Campaign | undefined> {
  try {
    const apiCampaign = await fetchCampaign(encodeURIComponent(slug));
    return apiCampaignToView(apiCampaign);
  } catch {
    return findCampaign(slug);
  }
}

async function loadRelated(current: Campaign): Promise<Campaign[]> {
  try {
    const response = await fetchCampaigns({ limit: 20, sort: "latest" });
    const list = response.items.map(apiCampaignToView);
    const sameCategory = list.filter((item) => item.slug !== current.slug && item.category === current.category);
    const candidates = sameCategory.length > 0 ? sameCategory : list;
    return candidates.filter((item) => item.slug !== current.slug).slice(0, 3);
  } catch {
    return mockCampaigns.filter((item) => item.slug !== current.slug).slice(0, 3);
  }
}

export async function generateMetadata({ params }: CampaignDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  return campaign
    ? { title: campaign.title, description: campaign.summary }
    : { title: "Không tìm thấy dự án" };
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { slug } = await params;
  const campaign = await loadCampaign(slug);
  if (!campaign) notFound();

  const progress = campaignProgress(campaign);
  const related = await loadRelated(campaign);

  return (
    <main className="page-surface campaign-detail-page">
      <div className="container breadcrumb">
        <Link href="/">Trang chủ</Link><span>/</span><Link href="/du-an">Dự án</Link><span>/</span><b>{campaign.category}</b>
      </div>

      <section className="container campaign-detail-hero">
        <div className={`detail-media atlas atlas-${campaign.image}`}>
          <span className="detail-category">{campaign.category}</span>
        </div>
        <div className="detail-summary">
          <div className="detail-status"><span>{campaign.status}</span><span><Icon name="shield" size={15} /> Đã kiểm duyệt</span></div>
          <h1>{campaign.title}</h1>
          <p>{campaign.summary}</p>
          <div className="detail-owner">
            <span className="detail-owner-avatar">{campaign.owner.charAt(0)}</span>
            <div><small>Khởi tạo bởi</small><b>{campaign.owner} {campaign.verified && <i><Icon name="check" size={10} /></i>}</b></div>
            <span className="detail-location"><Icon name="location" size={16} /> {campaign.location}</span>
          </div>
          <ProgressBar value={progress} label={`Đã huy động ${progress}%`} />
          <div className="detail-numbers">
            <div><strong>{formatCurrency(campaign.raised)}</strong><span>đã góp trên mục tiêu {formatCurrency(campaign.target)}</span></div>
            <div><strong>{campaign.backers.toLocaleString("vi-VN")}</strong><span>người tài trợ</span></div>
            <div><strong>{campaign.daysLeft || "Đủ"}</strong><span>{campaign.daysLeft ? "ngày còn lại" : "mục tiêu"}</span></div>
          </div>
          <div className="detail-actions">
            <a className="button button-primary button-large" href="#tai-tro">Tài trợ dự án <Icon name="arrow-right" size={19} /></a>
            <ReportCampaignButton campaignId={campaign.slug} campaignSlug={campaign.slug} />
          </div>
        </div>
      </section>

      <nav className="detail-tabs" aria-label="Nội dung dự án">
        <div className="container">
          <a className="active" href="#cau-chuyen">Câu chuyện</a>
          <a href="#ke-hoach">Kế hoạch</a>
          <a href="#cap-nhat">Cập nhật</a>
        </div>
      </nav>

      <section className="container detail-content-grid">
        <div className="detail-main-column">
          <article className="content-block" id="cau-chuyen">
            <p className="eyebrow">Câu chuyện dự án</p>
            <h2>Một thay đổi bền vững bắt đầu từ cộng đồng địa phương.</h2>
            {campaign.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </article>

          <article className="content-block" id="ke-hoach">
            <p className="eyebrow">Kế hoạch thực hiện</p>
            <h2>Mốc công việc & ngân sách</h2>
            {campaign.milestones.length > 0 ? (
              <div className="milestone-list">
                {campaign.milestones.map((milestone, index) => (
                  <div className="milestone-row" key={`${milestone.title}-${index}`}>
                    <span className={`milestone-dot milestone-${milestone.status === "Hoàn thành" ? "done" : milestone.status === "Đang thực hiện" ? "active" : "next"}`}><Icon name={milestone.status === "Hoàn thành" ? "check" : "clock"} size={15} /></span>
                    <div><small>Mốc {index + 1} · {milestone.date}</small><h3>{milestone.title}</h3><p>Ngân sách dự kiến: <b>{formatCurrency(milestone.budget)}</b></p></div>
                    <span className="milestone-status">{milestone.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="detail-empty-note">Kế hoạch chi tiết đang được chủ dự án cập nhật.</p>
            )}
          </article>

          <article className="content-block update-block" id="cap-nhat">
            <p className="eyebrow">Cập nhật mới nhất</p>
            <small>{campaign.latestUpdate.date}</small>
            <h2>{campaign.latestUpdate.title}</h2>
            <p>{campaign.latestUpdate.excerpt}</p>
          </article>
        </div>

        <aside className="detail-sidebar" id="tai-tro">
          <DonationPanel campaignId={campaign.slug} campaignTitle={campaign.title} />
          <div className="transparency-card" id="minh-chung">
            <div className="transparency-score"><span>{campaign.transparencyScore}</span><small>/100</small></div>
            <div><p className="eyebrow">Chỉ số minh bạch</p><h2>Hồ sơ rất tốt</h2></div>
            <ul>
              <li><Icon name="check" size={14} /> Danh tính chủ dự án đã xác minh</li>
              <li><Icon name="check" size={14} /> Kế hoạch ngân sách có phiên bản</li>
              <li><Icon name="check" size={14} /> Tiến độ cập nhật đúng lịch</li>
            </ul>
            <p className="transparency-note">Chỉ số hỗ trợ tham khảo, không phải bảo đảm tuyệt đối về kết quả dự án.</p>
          </div>
        </aside>
      </section>

      <section className="section related-section">
        <div className="container">
          <div className="section-heading"><div><p className="eyebrow">Tiếp tục khám phá</p><h2>Dự án liên quan</h2></div><Link className="text-link" href="/du-an">Xem tất cả <Icon name="arrow-right" size={18} /></Link></div>
          <div className="campaign-grid campaign-grid-three">{related.map((item) => <CampaignCard campaign={item} key={item.slug} />)}</div>
        </div>
      </section>
    </main>
  );
}
