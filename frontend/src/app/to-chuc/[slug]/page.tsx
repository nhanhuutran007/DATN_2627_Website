import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CharityFundraiserCard } from "@/components/campaign/CharityFundraiserCard";
import { Icon } from "@/components/ui/Icon";
import { OrganizationLogo } from "@/features/organizations/OrganizationLogo";
import { ApiError } from "@/lib/api";
import { apiCampaignToView, fetchCampaigns } from "@/lib/api/campaigns";
import { ORGANIZATION_TYPE_LABEL, fetchOrganization, type Organization } from "@/lib/api/organizations";
import type { Campaign } from "@/lib/data/campaigns";
import { formatVnd } from "@/lib/format";

export const dynamic = "force-dynamic";

type OrganizationPageProps = {
  params: Promise<{ slug: string }>;
};

/** `null` = không tồn tại hoặc chưa xác minh (API trả 404); lỗi khác thì ném để hiện trang lỗi. */
async function loadOrganization(slug: string): Promise<Organization | null> {
  try {
    return await fetchOrganization(slug);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
}

async function loadCampaigns(organizationId: string): Promise<Campaign[] | null> {
  try {
    const result = await fetchCampaigns({ organizationId, sort: "popular", limit: 9 });
    return result.items.map(apiCampaignToView);
  } catch {
    return null;
  }
}

function websiteLabel(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function generateMetadata({ params }: OrganizationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const organization = await loadOrganization(slug).catch(() => null);
  if (!organization) return { title: "Không tìm thấy tổ chức", robots: { index: false } };
  return {
    title: organization.name,
    description: organization.mission.slice(0, 160),
    alternates: { canonical: `/to-chuc/${organization.slug}` },
  };
}

/** Trang tổ chức công khai: sứ mệnh, thông tin pháp lý đã xác minh và các chiến dịch gây quỹ cho tổ chức. */
export default async function OrganizationProfilePage({ params }: OrganizationPageProps) {
  const { slug } = await params;
  const organization = await loadOrganization(slug);
  if (!organization) notFound();
  const campaigns = await loadCampaigns(organization.id);
  const fundraiseHref = `/tao-chien-dich?to-chuc=${encodeURIComponent(organization.slug)}`;
  const active = (campaigns ?? []).filter((campaign) => campaign.status === "Đang gây quỹ");

  return (
    <main className="org-profile">
      <section className="org-profile-hero">
        <div className="container org-profile-head">
          <nav className="detail-crumbs" aria-label="Vị trí trang">
            <Link href="/">Trang chủ</Link> <span aria-hidden="true">/</span> <Link href="/to-chuc">Tổ chức</Link>
          </nav>
          <div className="org-profile-id">
            <OrganizationLogo organization={organization} size="lg" />
            <div>
              <h1>{organization.name}</h1>
              <p className="org-profile-badge"><Icon name="shield" size={16} /> Tổ chức đã xác minh</p>
              <p className="org-profile-meta">
                <span>{ORGANIZATION_TYPE_LABEL[organization.type]}</span>
                <span><Icon name="location" size={14} /> {organization.province}</span>
                {organization.category && <span>{organization.category}</span>}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container org-profile-layout">
        <div className="org-profile-main">
          <section className="detail-section" aria-labelledby="org-about">
            <h2 id="org-about">Về tổ chức</h2>
            <p className="org-profile-mission">{organization.mission}</p>
          </section>

          <section className="detail-section" aria-labelledby="org-campaigns">
            <h2 id="org-campaigns">Chiến dịch gây quỹ cho tổ chức</h2>
            {campaigns === null ? (
              <p className="hint" role="alert">Không tải được danh sách chiến dịch.</p>
            ) : campaigns.length === 0 ? (
              <div className="empty-box">
                <p>Chưa có chiến dịch nào. Hãy là người đầu tiên gây quỹ cho {organization.name}.</p>
                <Link className="button button-primary button-sm" href={fundraiseHref}>Bắt đầu gây quỹ</Link>
              </div>
            ) : (
              <div className="cf-grid org-profile-campaigns">
                {campaigns.map((campaign) => <CharityFundraiserCard key={campaign.slug} campaign={campaign} />)}
              </div>
            )}
          </section>

          <section className="detail-section" aria-labelledby="org-legal">
            <h2 id="org-legal">Thông tin pháp lý và liên hệ</h2>
            <dl className="org-mine-facts org-profile-facts">
              <div><dt>Số giấy phép</dt><dd>{organization.registrationNumber}</dd></div>
              <div><dt>Cơ quan cấp</dt><dd>{organization.issuedBy}</dd></div>
              {organization.verifiedAt && (
                <div><dt>Xác minh ngày</dt><dd>{new Date(organization.verifiedAt).toLocaleDateString("vi-VN")}</dd></div>
              )}
              <div><dt>Địa chỉ</dt><dd>{organization.address}, {organization.province}</dd></div>
              <div><dt>Email</dt><dd><a href={`mailto:${organization.email}`}>{organization.email}</a></dd></div>
              <div><dt>Điện thoại</dt><dd><a href={`tel:${organization.phone.replace(/\s+/g, "")}`}>{organization.phone}</a></dd></div>
              {organization.website && (
                <div>
                  <dt>Website</dt>
                  <dd><a href={organization.website} target="_blank" rel="noopener noreferrer nofollow">{websiteLabel(organization.website)}</a></dd>
                </div>
              )}
            </dl>
            <p className="section-note">
              Quản trị viên Góp Mầm đã đối chiếu giấy phép với tên tổ chức và cơ quan cấp. Mỗi chiến dịch vẫn được kiểm duyệt riêng và
              công khai sổ cái, tiến độ, chứng từ chi tiêu.
            </p>
          </section>
        </div>

        <aside className="org-profile-side">
          <section className="panel org-profile-card" aria-label="Gây quỹ cho tổ chức">
            <p className="fund-amount">{formatVnd(organization.totalRaised ?? 0)}</p>
            <p className="fund-target">đã huy động qua {organization.campaignCount ?? 0} chiến dịch</p>
            <p className="fund-sub">Chỉ tính các khoản ủng hộ đã được cổng thanh toán xác nhận.</p>
            <div className="fund-actions">
              {active[0] && (
                <Link className="button button-primary button-block button-lg" href={`/du-an/${encodeURIComponent(active[0].slug)}/ung-ho`}>
                  Ủng hộ ngay
                </Link>
              )}
              <Link className={`button ${active[0] ? "button-dark" : "button-primary"} button-block button-lg`} href={fundraiseHref}>
                Gây quỹ cho tổ chức
              </Link>
            </div>
            {active[0] && <p className="hint">“Ủng hộ ngay” chuyển tới chiến dịch đang gây quỹ nổi bật nhất của tổ chức.</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
