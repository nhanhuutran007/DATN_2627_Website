import Image from "next/image";
import Link from "next/link";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { campaignProgress, campaignTimeLabel, type Campaign } from "@/lib/data/campaigns";
import { coverFor } from "@/lib/covers";

/** Thẻ gây quỹ cho tổ chức: ảnh, địa điểm, tên, tổ chức nhận, thanh tiến độ ngang và hàng thời gian · % như thẻ ở trang khám phá. */
export function CharityFundraiserCard({ campaign }: { campaign: Campaign }) {
  const progress = campaignProgress(campaign);
  const cover = coverFor(campaign);
  const href = `/du-an/${encodeURIComponent(campaign.slug)}`;

  return (
    <article className="cf-card">
      <div className="cf-card-media">
        <Image src={cover.src} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 360px" unoptimized={!cover.illustrative} />
        <span className="cf-card-location">{campaign.location}</span>
      </div>
      <div className="cf-card-body">
        <h3 className="cf-card-title">
          <Link href={href}>{campaign.title}</Link>
        </h3>
        {campaign.organization && <p className="cf-card-org">cho {campaign.organization.name}</p>}
        <ProgressBar value={progress} label={`Đạt ${progress}% mục tiêu`} />
        {/* Cùng kiểu với CampaignCard: thời gian còn lại bên trái, % đã đạt (có thể vượt 100%) bên phải. */}
        <p className="c-card-stats">
          <span className="c-card-time" title={campaign.endDate ? `Kết thúc ${campaign.endDate}` : undefined}>
            <Icon name="clock" size={14} /> {campaignTimeLabel(campaign)}
          </span>
          <span className={`c-card-pct${progress >= 100 ? " is-funded" : ""}`}>
            <b>{progress.toLocaleString("vi-VN")}%</b> đã đạt
          </span>
        </p>
      </div>
    </article>
  );
}
