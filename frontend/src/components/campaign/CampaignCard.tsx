import Image from "next/image";
import Link from "next/link";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";
import { categoryIcon, coverFor } from "@/lib/covers";
import { formatVnd } from "@/lib/format";

type CampaignCardProps = {
  campaign: Campaign;
  /** Hiện lý do gợi ý từ AI (chỉ khi có). */
  showAiReason?: boolean;
};

export function CampaignCard({ campaign, showAiReason = false }: CampaignCardProps) {
  const progress = campaignProgress(campaign);
  const cover = coverFor(campaign);
  const open = campaign.status === "Đang gây quỹ";
  const href = `/du-an/${campaign.slug}`;

  return (
    <article className="c-card">
      <Link className="c-card-media" href={href} tabIndex={-1} aria-hidden="true">
        <Image src={cover.src} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 380px" unoptimized={!cover.illustrative} />
        {!open && <span className="c-card-status">{campaign.status}</span>}
      </Link>
      <span className="c-card-badge" aria-hidden="true"><Icon name={categoryIcon(campaign.category)} size={20} /></span>
      <div className="c-card-body">
        <p className="c-card-cat">{campaign.category} · {campaign.location}</p>
        <h3 className="c-card-title"><Link href={href}>{campaign.title}</Link></h3>
        <p className="c-card-text">{campaign.summary}</p>
        {showAiReason && campaign.aiReason && (
          <p className="c-card-reason"><Icon name="sparkles" size={14} /> {campaign.aiReason}</p>
        )}
        <ProgressBar value={progress} label={`Đạt ${progress}% mục tiêu`} />
        <div className="c-card-figures">
          <span><b>{formatVnd(campaign.raised)}</b> / {formatVnd(campaign.target)}</span>
          <span className="c-card-pct">{progress}%</span>
        </div>
        <div className="c-card-foot">
          <span><Icon name="users" size={15} /> {campaign.backers.toLocaleString("vi-VN")} lượt ủng hộ</span>
          <span>{open ? <><Icon name="clock" size={15} /> Còn {campaign.daysLeft} ngày</> : campaign.status}</span>
        </div>
        <Link className="c-card-more" href={href}>Xem chi tiết <Icon name="arrow-right" size={16} /></Link>
      </div>
    </article>
  );
}
