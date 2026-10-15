import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { CollapsibleStory } from "@/components/campaign/CollapsibleStory";
import { ProgressRing } from "@/components/campaign/ProgressRing";
import { Icon } from "@/components/ui/Icon";
import { CampaignComments } from "@/features/comments/CampaignComments";
import { CampaignLedger } from "@/features/donations/CampaignLedger";
import { DonateDialogButton } from "@/features/donations/DonateDialogButton";
import { DonorHighlights } from "@/features/donations/DonorHighlights";
import { FollowCampaignButton } from "@/features/follows/FollowCampaignButton";
import { MilestoneRevisions } from "@/features/progress/MilestoneRevisions";
import { ProgressTimeline } from "@/features/progress/ProgressTimeline";
import { ShareCampaignButton } from "@/features/follows/ShareCampaignButton";
import { CampaignViewTracker } from "@/features/campaign-stats/CampaignViewTracker";
import { ReportCampaignButton } from "@/features/moderation/ReportCampaignButton";
import {
  apiCampaignToView,
  fetchCampaign,
  fetchCampaigns,
  isPublishedStatus,
  reviewStatusLabel,
} from "@/lib/api/campaigns";
import {
  fetchCampaignProgress,
  MILESTONE_STATE_LABEL,
  MILESTONE_STATE_TONE,
  TRANSPARENCY_LABEL,
  type CampaignProgress,
} from "@/lib/api/progress";
import { fetchRewardTiers, type RewardTier } from "@/lib/api/rewards";
import { coverFor } from "@/lib/covers";
import { campaignProgress, campaigns as mockCampaigns, findCampaign, type Campaign } from "@/lib/data/campaigns";
import { formatVnd, isLiveId } from "@/lib/format";
import { sanitizeRichText } from "@/lib/rich-text.server";
import { timeAgo } from "@/lib/time";

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

async function loadRewardTiers(id: string): Promise<RewardTier[]> {
  try {
    return await fetchRewardTiers(id);
  } catch {
    return [];
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
  const [progress, related, rewardTiers] = await Promise.all([
    live ? loadProgress(campaign.slug) : Promise.resolve(null),
    loadRelated(campaign, live),
    live ? loadRewardTiers(campaign.slug) : Promise.resolve([]),
  ]);
  const percent = campaignProgress(campaign);
  const open = campaign.status === "Đang gây quỹ";
  // Hồ sơ chưa công khai: các API theo dõi/lượt xem/sổ cái/bình luận/báo cáo trả 404.
  const published = live && isPublishedStatus(campaign.apiStatus);
  const plannedBudget = campaign.milestones.reduce((sum, milestone) => sum + milestone.budget, 0);
  const totalMilestones = progress?.totalMilestones ?? campaign.milestones.length;
  const budget = progress?.totalBudget ?? plannedBudget;
  const cover = coverFor(campaign);
  const stateById = new Map((progress?.milestoneStates ?? []).map((item) => [item.id, item.state]));

  const crumbs = [{ href: "/", label: "Trang chủ" }, { href: "/du-an", label: "Dự án" }, { label: campaign.category }];
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: crumb.href } : {}),
    })),
  };

  return (
    <main className="detail-page">
      <div className="container detail-head">
        <nav className="detail-crumbs" aria-label="Vị trí trang">
          {crumbs.map((crumb, index) => (
            <span key={crumb.label}>
              {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
              {index < crumbs.length - 1 && <span aria-hidden="true"> / </span>}
            </span>
          ))}
        </nav>
        <h1 className="detail-title">{campaign.title}</h1>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      </div>

      <div className="container detail-layout">
        {published && <CampaignViewTracker campaignId={campaign.slug} />}
        {!live && <p className="notice-sample">Dữ liệu mẫu — không phải chiến dịch thật trên hệ thống.</p>}
        {live && !published && (
          <p className="notice-sample" role="status">
            Hồ sơ chưa công khai ({campaign.status.toLowerCase()}): chưa hiển thị trong danh sách dự án, chưa nhận ủng hộ, theo dõi hay bình luận.
          </p>
        )}

        <div className="detail-main">
          <figure className="detail-cover">
            <Image src={cover.src} alt={cover.alt} fill priority sizes="(max-width: 960px) 100vw, 720px" unoptimized={!cover.illustrative} />
            {!open && <span className="detail-cover-status">{campaign.status}</span>}
            {cover.illustrative && <figcaption>Ảnh minh họa theo lĩnh vực</figcaption>}
          </figure>

          <div className="detail-organizer">
            <span className="organizer-avatar" aria-hidden="true">{campaign.owner.charAt(0).toUpperCase()}</span>
            <p>
              <b>{campaign.owner}</b> đang tổ chức gây quỹ
              <span className="detail-organizer-meta"><Icon name="location" size={14} /> {campaign.location}</span>
            </p>
          </div>

          <ul className="detail-badges">
            {published && <li><Icon name="shield" size={15} /> Hồ sơ đã được kiểm duyệt</li>}
            <li><Icon name="receipt" size={15} /> Chỉ ghi nhận giao dịch đã xác nhận</li>
          </ul>

          <section className="detail-story-block" aria-labelledby="gioi-thieu-du-an">
            <h2 id="gioi-thieu-du-an" className="sr-only">Câu chuyện dự án</h2>
            <CollapsibleStory>
              {campaign.storyHtml ? (
                <div className="detail-story rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(campaign.storyHtml) }} />
              ) : (
                <div className="detail-story">
                  {campaign.story.map((paragraph, index) => (
                    <p className={index === 0 ? "detail-lead" : undefined} key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              )}
            </CollapsibleStory>

            {open && published && (
              <div className="detail-actions">
                <DonateDialogButton
                  campaignId={campaign.slug}
                  campaignTitle={campaign.title}
                  rewardTiers={rewardTiers}
                  className="button button-outline"
                  label="Ủng hộ"
                />
                <ShareCampaignButton campaignId={campaign.slug} title={campaign.title} />
              </div>
            )}

            <p className="detail-meta">
              <span>{campaign.category}</span>
              {campaign.endDate && <span>Hạn gây quỹ {campaign.endDate}</span>}
            </p>
            {published && <div className="detail-report"><ReportCampaignButton campaignId={campaign.slug} campaignSlug={campaign.slug} /></div>}
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
                        <td>
                          {(() => {
                            const state = milestone.id ? stateById.get(milestone.id) : undefined;
                            return state ? (
                              <span className={`tag ${MILESTONE_STATE_TONE[state]}`}>{MILESTONE_STATE_LABEL[state]}</span>
                            ) : (
                              <span className={`tag ${milestone.status === "Hoàn thành" ? "tag-green" : milestone.status === "Quá hạn" ? "tag-red" : ""}`}>{milestone.status}</span>
                            );
                          })()}
                        </td>
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
            {progress && progress.overdueMilestones > 0 && (
              <p className="hint">
                &quot;Chậm tiến độ&quot;: mốc đã quá hạn mà chưa hoàn thành. &quot;Đã giải trình&quot;: chủ dự án đã đăng cập nhật sau hạn — xem Nhật ký tiến độ bên dưới.
              </p>
            )}
            {live && progress && progress.revisionCount > 0 && <MilestoneRevisions campaignId={campaign.slug} />}
          </section>

          <section className="panel" id="nhat-ky" aria-labelledby="nhat-ky-title">
            <h2 id="nhat-ky-title">Nhật ký tiến độ &amp; chi tiêu</h2>
            <p className="hint">Cập nhật của chủ dự án theo từng mốc. Mỗi khoản chi kèm ảnh chứng từ; tổng chi không vượt số tiền đã được xác nhận.</p>
            {live ? <ProgressTimeline campaignId={campaign.slug} /> : <p className="hint">Dữ liệu mẫu không có nhật ký tiến độ.</p>}
          </section>

          <section className="panel" aria-labelledby="so-cai">
            <h2 id="so-cai">Sổ cái giao dịch</h2>
            <p className="hint">Các khoản ủng hộ đã được cổng thanh toán xác nhận, mới nhất ở trên.</p>
            {published ? (
              <CampaignLedger key={campaign.backers} campaignId={campaign.slug} />
            ) : (
              <p className="hint">{live ? "Sổ cái mở khi hồ sơ được duyệt và công khai." : "Dữ liệu mẫu không có sổ cái."}</p>
            )}
          </section>

          <section className="panel" id="hoi-dap" aria-labelledby="hoi-dap-title">
            <h2 id="hoi-dap-title">Hỏi đáp &amp; bình luận</h2>
            <p className="hint">Đặt câu hỏi cho chủ dự án hoặc chia sẻ ý kiến. Nội dung vi phạm có thể bị quản trị viên ẩn.</p>
            {published ? (
              <CampaignComments campaignId={campaign.slug} />
            ) : (
              <p className="hint">{live ? "Hỏi đáp mở khi hồ sơ được duyệt và công khai." : "Dữ liệu mẫu không có bình luận."}</p>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <section className="panel fund-card" aria-label="Tiến độ gây quỹ">
            <div className="fund-head">
              <ProgressRing value={percent} />
              <div>
                <p className="fund-amount">{formatVnd(campaign.raised)} <span>đã nhận</span></p>
                <p className="fund-target">trên mục tiêu {formatVnd(campaign.target)}</p>
                <p className="fund-sub">
                  {campaign.backers.toLocaleString("vi-VN")} lượt ủng hộ · {open ? `còn ${campaign.daysLeft} ngày` : campaign.status}
                </p>
              </div>
            </div>
            {open && (
              <DonateDialogButton
                campaignId={campaign.slug}
                campaignTitle={campaign.title}
                enabled={published}
                rewardTiers={rewardTiers}
                className="button button-primary button-block button-lg"
              />
            )}
            {published && (
              <div className="fund-social">
                <FollowCampaignButton campaignId={campaign.slug} />
                <ShareCampaignButton campaignId={campaign.slug} title={campaign.title} />
              </div>
            )}
            {/* key theo số lượt ủng hộ: tải lại khi trang làm mới sau một khoản ủng hộ mới. */}
            {published && <DonorHighlights key={campaign.backers} campaignId={campaign.slug} />}
          </section>

          <section className="panel" aria-labelledby="thong-tin-ho-so">
            <h2 id="thong-tin-ho-so" className="panel-title-sm">Thông tin hồ sơ</h2>
            <ul className="facts">
              <li>
                <span>Kiểm duyệt</span>
                <span className={published || !live ? undefined : "fact-warn"}>{reviewStatusLabel(campaign.apiStatus)}</span>
              </li>
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
              {progress && (
                <li>
                  <span>Tình trạng tiến độ</span>
                  <span className={progress.transparency === "late" ? "fact-warn" : undefined}>{TRANSPARENCY_LABEL[progress.transparency]}</span>
                </li>
              )}
              {progress && progress.totalMilestones > 0 && (
                <li>
                  <span>Cập nhật gần nhất</span>
                  <span>{progress.lastUpdateAt ? timeAgo(progress.lastUpdateAt) : "Chưa có"}</span>
                </li>
              )}
              <li><span>Chi tiêu đã báo cáo</span><span>{progress && progress.totalExpense > 0 ? formatVnd(progress.totalExpense) : "Chưa có"}</span></li>
              <li><span>Ngân sách kế hoạch</span><span>{budget > 0 ? formatVnd(budget) : "—"}</span></li>
              {campaign.endDate && <li><span>Hạn gây quỹ</span><span>{campaign.endDate}</span></li>}
            </ul>
          </section>

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
              <Link className="button button-outline button-sm" href="/tim-kiem">Xem tất cả dự án</Link>
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
