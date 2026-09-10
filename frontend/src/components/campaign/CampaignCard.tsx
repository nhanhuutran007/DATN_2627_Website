"use client";

import Link from "next/link";
import { useState } from "react";

import { ProgressBar } from "@/components/campaign/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { campaignProgress, formatCurrency, type Campaign } from "@/lib/data/campaigns";

type CampaignCardProps = {
  campaign: Campaign;
  showAiReason?: boolean;
};

export function CampaignCard({ campaign, showAiReason = false }: CampaignCardProps) {
  const [saved, setSaved] = useState(false);
  const progress = campaignProgress(campaign);

  return (
    <article className="campaign-card">
      <div className={`campaign-card-image atlas atlas-${campaign.image}`}>
        <span className={`status-badge status-${campaign.status === "Đã đạt mục tiêu" ? "success" : "active"}`}>
          {campaign.status}
        </span>
        <button
          className={`save-button ${saved ? "saved" : ""}`}
          type="button"
          aria-label={saved ? "Bỏ lưu chiến dịch" : "Lưu chiến dịch"}
          aria-pressed={saved}
          onClick={() => setSaved((value) => !value)}
        >
          <Icon name="heart" size={19} />
        </button>
      </div>
      <div className="campaign-card-content">
        {showAiReason && campaign.aiReason && (
          <div className="ai-reason"><Icon name="sparkles" size={15} /> {campaign.aiReason}</div>
        )}
        <div className="campaign-card-meta">
          <span>{campaign.category}</span>
          <span><Icon name="location" size={14} /> {campaign.location}</span>
        </div>
        <h3><Link href={`/du-an/${campaign.slug}`}>{campaign.title}</Link></h3>
        <p className="campaign-summary">{campaign.summary}</p>
        <div className="owner-line">
          <span className="owner-avatar">{campaign.owner.charAt(0)}</span>
          <span>{campaign.owner}</span>
          {campaign.verified && <span className="verified-dot" title="Hồ sơ đã xác minh"><Icon name="check" size={11} /></span>}
        </div>
        <ProgressBar value={progress} label={`Đã đạt ${progress}% mục tiêu`} />
        <div className="campaign-funding-row">
          <div><strong>{formatCurrency(campaign.raised)}</strong><span>đã góp · {progress}%</span></div>
          <div className="align-right"><strong>{campaign.daysLeft || "—"}</strong><span>{campaign.daysLeft ? "ngày còn lại" : "đã hoàn tất"}</span></div>
        </div>
      </div>
    </article>
  );
}
