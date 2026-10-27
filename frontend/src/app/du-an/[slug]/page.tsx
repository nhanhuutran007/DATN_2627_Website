import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CampaignCard } from "@/components/campaign/CampaignCard";
import { CollapsibleStory } from "@/components/campaign/CollapsibleStory";
import { ProgressRing } from "@/components/campaign/ProgressRing";
import { Icon } from "@/components/ui/Icon";
import { CampaignComments } from "@/features/comments/CampaignComments";
import { DonateLink } from "@/features/donations/DonateLink";
import { DonorHighlights } from "@/features/donations/DonorHighlights";
import { WordsOfSupport } from "@/features/donations/WordsOfSupport";
import { FollowCampaignButton } from "@/features/follows/FollowCampaignButton";
import { MilestoneRevisions } from "@/features/progress/MilestoneRevisions";
import { ProgressTimeline } from "@/features/progress/ProgressTimeline";
import { ShareCampaignButton } from "@/features/follows/ShareCampaignButton";
import { ShareSpread } from "@/features/follows/ShareSpread";
import { CampaignViewTracker } from "@/features/campaign-stats/CampaignViewTracker";
import { ReportCampaignButton } from "@/features/moderation/ReportCampaignButton";
import { OrganizationLogo } from "@/features/organizations/OrganizationLogo";
import {
  apiCampaignToView,
  fetchCampaign,
  fetchCampaigns,
  isPublishedStatus,
} from "@/lib/api/campaigns";
import {
  fetchCampaignProgress,
  MILESTONE_STATE_LABEL,
  MILESTONE_STATE_TONE,
  TRANSPARENCY_LABEL,
  type CampaignProgress,
} from "@/lib/api/progress";
import { coverFor } from "@/lib/covers";
import { campaignProgress, campaigns as mockCampaigns, findCampaign, type Campaign } from "@/lib/data/campaigns";
import { formatVnd, formatVndShort, isLiveId } from "@/lib/format";
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
  // Hồ sơ chưa công khai: các API theo dõi/lượt xem/sổ cái/bình luận/báo cáo trả 404.
  const published = live && isPublishedStatus(campaign.apiStatus);
  const plannedBudget = campaign.milestones.reduce((sum, milestone) => sum + milestone.budget, 0);
  const totalMilestones = progress?.totalMilestones ?? campaign.milestones.length;
  const budget = progress?.totalBudget ?? plannedBudget;
  const cover = coverFor(campaign);
  const donateHref = `/du-an/${encodeURIComponent(campaign.slug)}/ung-ho`;
  const ownerInitial = campaign.owner.charAt(0).toUpperCase();
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

          <a className="detail-organizer" href="#nguoi-to-chuc">
            <span className="organizer-avatar" aria-hidden="true">{ownerInitial}</span>
            <span>
              <b>{campaign.owner}</b>{" "}
              {campaign.organization ? <>đang gây quỹ cho <b>{campaign.organization.name}</b></> : "đang tổ chức gây quỹ"}
            </span>
          </a>

          <p className="detail-protected">
            <Icon name="shield" size={16} />
            {published
              ? "Ủng hộ được bảo vệ · hồ sơ đã kiểm duyệt, chỉ ghi nhận giao dịch đã xác nhận"
              : "Chỉ ghi nhận giao dịch đã xác nhận"}
          </p>

          {campaign.organization && (
            <Link className="detail-beneficiary" href={`/to-chuc/${encodeURIComponent(campaign.organization.slug)}`}>
              <OrganizationLogo organization={campaign.organization} size="sm" />
              <span>
                <span>Bạn có thể tạo nên khác biệt bằng cách ủng hộ <b>{campaign.organization.name}</b> qua chiến dịch này.</span>
                <small><Icon name="shield" size={13} /> Tổ chức đã xác minh · Xem trang tổ chức</small>
              </span>
            </Link>
          )}

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
                <DonateLink className="button button-primary" href={donateHref}>Ủng hộ</DonateLink>
                <ShareCampaignButton campaignId={campaign.slug} title={campaign.title} />
              </div>
            )}
          </section>

          <section className="detail-section" id="nhat-ky" aria-labelledby="nhat-ky-title">
            {live ? (
              <ProgressTimeline
                campaignId={campaign.slug}
                initialSize={1}
                heading={{ id: "nhat-ky-title", title: "Cập nhật" }}
                organizer={campaign.owner}
              />
            ) : (
              <>
                <h2 id="nhat-ky-title">Cập nhật</h2>
                <p className="hint">Dữ liệu mẫu không có nhật ký tiến độ.</p>
              </>
            )}
            <p className="section-note">Mỗi khoản chi kèm ảnh chứng từ; tổng chi không vượt số tiền đã được xác nhận.</p>
          </section>

          {published && (
            <section className="detail-section" aria-labelledby="chia-se-title">
              <h2 id="chia-se-title">Chia sẻ giúp nhiều hơn bạn nghĩ</h2>
              <p className="section-lead">
                Mỗi lượt chia sẻ đưa dự án <b>đến với nhiều người hơn</b> — kể cả khi bạn chưa thể ủng hộ.
              </p>
              <ShareSpread
                campaignId={campaign.slug}
                title={campaign.title}
                owner={campaign.owner}
                raised={campaign.raised}
                percent={percent}
                cover={cover}
                open={open}
              />
            </section>
          )}

          <section className="detail-section" id="nguoi-to-chuc" aria-labelledby="nguoi-to-chuc-title">
            <h2 id="nguoi-to-chuc-title">{campaign.organization ? "Người tổ chức và đơn vị thụ hưởng" : "Người tổ chức"}</h2>
            <div className="organizer-pair">
              <div className="organizer-card">
                <span className="organizer-avatar organizer-avatar-lg" aria-hidden="true">{ownerInitial}</span>
                <div>
                  <b>{campaign.owner}</b>
                  <span>Người tổ chức</span>
                  <span className="organizer-location"><Icon name="location" size={14} /> {campaign.location}</span>
                </div>
              </div>
              {campaign.organization && (
                <>
                  <span className="organizer-arrow" aria-hidden="true"><Icon name="arrow-right" size={18} /></span>
                  <div className="organizer-card organizer-beneficiary">
                    <OrganizationLogo organization={campaign.organization} size="lg" />
                    <div>
                      <b>{campaign.organization.name}</b>
                      <span className="organizer-verified"><Icon name="shield" size={14} /> Tổ chức đã xác minh · Đơn vị thụ hưởng</span>
                      <Link href={`/to-chuc/${encodeURIComponent(campaign.organization.slug)}`}>Xem trang tổ chức</Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {published && (
            <section className="detail-section" id="loi-dong-vien" aria-labelledby="loi-dong-vien-title">
              <WordsOfSupport campaignId={campaign.slug} titleId="loi-dong-vien-title" open={open} />
            </section>
          )}

          <section className="detail-section" aria-labelledby="ke-hoach">
            <h2 id="ke-hoach">Kế hoạch và ngân sách</h2>
            <ul className="plan-facts">
              <li>
                <span>Tiến độ</span>
                <b>
                  {totalMilestones === 0
                    ? "Chưa có mốc"
                    : progress
                      ? `${progress.completedMilestones}/${totalMilestones} mốc hoàn thành`
                      : `${totalMilestones} mốc`}
                </b>
              </li>
              {progress && (
                <li>
                  <span>Tình trạng</span>
                  <b className={progress.transparency === "late" ? "fact-warn" : undefined}>{TRANSPARENCY_LABEL[progress.transparency]}</b>
                </li>
              )}
              {progress && progress.totalMilestones > 0 && (
                <li>
                  <span>Cập nhật gần nhất</span>
                  <b>{progress.lastUpdateAt ? timeAgo(progress.lastUpdateAt) : "Chưa có"}</b>
                </li>
              )}
              <li><span>Chi tiêu đã báo cáo</span><b>{progress && progress.totalExpense > 0 ? formatVnd(progress.totalExpense) : "Chưa có"}</b></li>
              <li><span>Ngân sách kế hoạch</span><b>{budget > 0 ? formatVnd(budget) : "—"}</b></li>
            </ul>
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
                &quot;Chậm tiến độ&quot;: mốc đã quá hạn mà chưa hoàn thành. &quot;Đã giải trình&quot;: chủ dự án đã đăng cập nhật sau hạn — xem mục Cập nhật ở trên.
              </p>
            )}
            {live && progress && progress.revisionCount > 0 && <MilestoneRevisions campaignId={campaign.slug} />}
          </section>

          <section className="detail-section" id="hoi-dap" aria-labelledby="hoi-dap-title">
            <h2 id="hoi-dap-title">Hỏi đáp &amp; bình luận</h2>
            {published ? (
              <CampaignComments campaignId={campaign.slug} />
            ) : (
              <p className="hint">{live ? "Hỏi đáp mở khi hồ sơ được duyệt và công khai." : "Dữ liệu mẫu không có bình luận."}</p>
            )}
          </section>

          <p className="detail-meta">
            {campaign.createdDate && <span>Tạo ngày {campaign.createdDate}</span>}
            <span><Link href={`/du-an?category=${encodeURIComponent(campaign.category)}`}>{campaign.category}</Link></span>
            {campaign.endDate && <span>Hạn gây quỹ {campaign.endDate}</span>}
          </p>
          {published && (
            <div className="detail-report">
              <ReportCampaignButton campaignId={campaign.slug} campaignSlug={campaign.slug} />
              <FollowCampaignButton campaignId={campaign.slug} compact />
            </div>
          )}
        </div>

        <aside className="detail-side">
          <section className="panel fund-card" aria-label="Tiến độ gây quỹ">
            <div className="fund-head">
              <ProgressRing value={percent} />
              <div>
                <p className="fund-amount">{formatVnd(campaign.raised)}</p>
                <p className="fund-target">
                  đã nhận / mục tiêu <abbr title={formatVnd(campaign.target)}>{formatVndShort(campaign.target)}</abbr>
                </p>
                <p className="fund-sub">
                  {campaign.backers.toLocaleString("vi-VN")} lượt ủng hộ · {open ? `còn ${campaign.daysLeft} ngày` : campaign.status}
                </p>
              </div>
            </div>
            {open && published && (
              <div className="fund-actions">
                <DonateLink className="button button-primary button-block button-lg" href={donateHref}>Ủng hộ ngay</DonateLink>
                <ShareCampaignButton
                  campaignId={campaign.slug}
                  title={campaign.title}
                  className="button button-dark button-block button-lg"
                />
              </div>
            )}
            {/* key theo số lượt ủng hộ: tải lại khi trang làm mới sau một khoản ủng hộ mới. */}
            {published && <DonorHighlights key={campaign.backers} campaignId={campaign.slug} />}
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
