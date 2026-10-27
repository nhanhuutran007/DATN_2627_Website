import Image from "next/image";
import Link from "next/link";

import { ProgressRing } from "@/components/campaign/ProgressRing";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";
import { coverFor } from "@/lib/covers";
import { formatVnd } from "@/lib/format";

/** Thẻ tối giản theo mục "Discover fundraisers supporting charities" của GoFundMe: ảnh, địa điểm, tên, số đã nhận và vòng %. */
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
        <div>
          <h3 className="cf-card-title">
            <Link href={href}>{campaign.title}</Link>
          </h3>
          <p className="cf-card-raised">{formatVnd(campaign.raised)} đã nhận</p>
          {campaign.organization && <p className="cf-card-org">cho {campaign.organization.name}</p>}
        </div>
        <ProgressRing value={progress} size={60} />
      </div>
    </article>
  );
}
