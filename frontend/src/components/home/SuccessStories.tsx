import Link from "next/link";

import { FadeInImage } from "@/components/ui/FadeInImage";
import { Icon } from "@/components/ui/Icon";
import { spreadCategoryImages } from "@/lib/api/campaigns";
import { coverFor } from "@/lib/covers";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";
import { formatVnd, formatVndShort } from "@/lib/format";

type SuccessStoriesProps = {
  /** Dự án đã đạt mục tiêu (thật, không gồm dữ liệu mô phỏng), xếp theo số người ủng hộ. */
  campaigns: Campaign[];
};

/**
 * "Câu chuyện thành công" như mục Success stories của Kickstarter: một dự án nổi bật lớn bên
 * trái, các dự án khác thành danh sách bên phải — cho người xem thấy tiền ủng hộ đã thành việc thật.
 */
export function SuccessStories({ campaigns }: SuccessStoriesProps) {
  if (campaigns.length === 0) return null;
  const [lead, ...rest] = spreadCategoryImages(campaigns);

  return (
    <section className="block success-stories" aria-labelledby="cau-chuyen-thanh-cong">
      <div className="container">
        <div className="block-head block-head-split">
          <div>
            <span className="pill">Đã đạt mục tiêu</span>
            <h2 id="cau-chuyen-thanh-cong">Câu chuyện thành công</h2>
            <p>Những dự án đã thành hiện thực nhờ cộng đồng — xem tiền ủng hộ đã được dùng vào việc gì.</p>
          </div>
          <Link className="button button-outline button-sm" href="/tim-kiem?trang-thai=success">Xem các dự án đã thành công</Link>
        </div>

        <div className="success-grid">
          <StoryCard campaign={lead} lead />
          {rest.length > 0 && (
            <div className="success-list">
              {rest.map((campaign) => <StoryCard key={campaign.slug} campaign={campaign} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StoryCard({ campaign, lead = false }: { campaign: Campaign; lead?: boolean }) {
  const cover = coverFor(campaign);
  const percent = Math.round(campaignProgress(campaign));
  const href = `/du-an/${campaign.slug}`;

  return (
    <article className={`success-card${lead ? " is-lead" : ""}`}>
      <Link className="success-media" href={href} tabIndex={-1} aria-hidden="true">
        <FadeInImage
          src={cover.src}
          alt=""
          fill
          sizes={lead ? "(max-width: 900px) 100vw, 640px" : "(max-width: 900px) 40vw, 200px"}
          unoptimized={!cover.illustrative}
        />
        <span className="success-badge"><Icon name="check" size={14} /> Đạt {percent}%</span>
      </Link>
      <div className="success-body">
        <span className="success-category">{campaign.category}</span>
        <h3><Link href={href}>{campaign.title}</Link></h3>
        {lead && campaign.summary && <p className="success-summary">{campaign.summary}</p>}
        <p className="success-facts">
          <b title={formatVnd(campaign.raised)}>{formatVndShort(campaign.raised)}</b> từ{" "}
          <b>{campaign.backers.toLocaleString("vi-VN")}</b> người ủng hộ
          <span aria-hidden="true"> · </span>
          <span>{campaign.organization ? `cho ${campaign.organization.name}` : `bởi ${campaign.owner}`}</span>
        </p>
        {lead && (
          <Link className="success-more" href={href}>
            Đọc câu chuyện <Icon name="arrow-right" size={16} />
          </Link>
        )}
      </div>
    </article>
  );
}
