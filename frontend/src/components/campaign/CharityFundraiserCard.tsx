import Image from "next/image";
import Link from "next/link";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";
import { coverFor } from "@/lib/covers";
import { formatVnd } from "@/lib/format";

/** Thẻ gây quỹ cho tổ chức: ảnh, địa điểm, tên, tổ chức nhận, thanh tiến độ ngang (giống thẻ dự án) và số đã nhận. */
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
        <p className="cf-card-raised"><b>{formatVnd(campaign.raised)}</b> đã nhận · {progress}%</p>
      </div>
    </article>
  );
}
