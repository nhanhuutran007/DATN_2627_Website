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
  /** Gọi khi người dùng bấm mở dự án (vd. ghi hành vi "search" ở trang tìm kiếm). */
  onOpen?: () => void;
};

/**
 * Thẻ dự án tối giản như kết quả tìm kiếm của GoFundMe: ảnh, tên, người tổ chức, thanh tiến độ và số đã nhận.
 * Chi tiết (lĩnh vực, địa điểm, mục tiêu, hạn…) để ở trang dự án.
 */
export function CampaignCard({ campaign, showAiReason = false, onOpen }: CampaignCardProps) {
  const progress = campaignProgress(campaign);
  const cover = coverFor(campaign);
  const open = campaign.status === "Đang gây quỹ";
  const href = `/du-an/${campaign.slug}`;

  return (
    <article className="c-card">
      <Link className="c-card-media" href={href} tabIndex={-1} aria-hidden="true" onClick={onOpen}>
        <Image src={cover.src} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 380px" unoptimized={!cover.illustrative} />
        {!open && <span className="c-card-status">{campaign.status}</span>}
      </Link>
      <div className="c-card-body">
        <h3 className="c-card-title"><Link href={href} onClick={onOpen}>{campaign.title}</Link></h3>
        <p className="c-card-by">
          {campaign.organization ? (
            <><Icon name="shield" size={13} /> cho {campaign.organization.name}</>
          ) : (
            <>bởi {campaign.owner}</>
          )}
        </p>
        {showAiReason && campaign.aiReason && (
          <p className="c-card-reason"><Icon name="sparkles" size={14} /> {campaign.aiReason}</p>
        )}
        <ProgressBar value={progress} label={`Đạt ${progress}% mục tiêu`} />
        <p className="c-card-raised">{formatVnd(campaign.raised)} đã nhận</p>
      </div>
    </article>
  );
}
