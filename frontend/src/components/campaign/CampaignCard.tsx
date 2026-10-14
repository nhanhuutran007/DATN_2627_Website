import Image from "next/image";
import Link from "next/link";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";
import { coverFor } from "@/lib/covers";
import { formatVnd } from "@/lib/format";

type CampaignCardProps = {
  campaign: Campaign;
  /** Hiện lý do gợi ý từ AI (chỉ khi có). */
  showAiReason?: boolean;
};

/** Thẻ dự án: ảnh lớn kèm số lượt ủng hộ, tiêu đề, thanh tiến độ và số tiền đã nhận. */
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
        <span className="c-card-backers">
          <Icon name="users" size={13} /> {campaign.backers.toLocaleString("vi-VN")} lượt ủng hộ
        </span>
      </Link>
      <div className="c-card-body">
        <p className="c-card-cat">{campaign.category} · {campaign.location}</p>
        <h3 className="c-card-title"><Link href={href}>{campaign.title}</Link></h3>
        {showAiReason && campaign.aiReason && (
          <p className="c-card-reason"><Icon name="sparkles" size={14} /> {campaign.aiReason}</p>
        )}
        <ProgressBar value={progress} label={`Đạt ${progress}% mục tiêu`} />
        <div className="c-card-figures">
          <span><b>{formatVnd(campaign.raised)}</b> đã nhận</span>
          <span className="c-card-pct">{progress}%</span>
        </div>
        <p className="c-card-foot">
          Mục tiêu {formatVnd(campaign.target)}
          {open && <> · còn {campaign.daysLeft} ngày</>}
        </p>
      </div>
    </article>
  );
}
