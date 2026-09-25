"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { campaignProgress, type Campaign } from "@/lib/data/campaigns";
import { coverFor } from "@/lib/covers";

type CategoryShowcaseProps = {
  campaigns: Campaign[];
};

/** Lưới dự án có tab lọc theo lĩnh vực (chỉ những lĩnh vực đang có dự án). */
export function CategoryShowcase({ campaigns }: CategoryShowcaseProps) {
  const categories = useMemo(
    () => Array.from(new Set(campaigns.map((campaign) => campaign.category))),
    [campaigns],
  );
  const [active, setActive] = useState("");
  const shown = (active ? campaigns.filter((c) => c.category === active) : campaigns).slice(0, 6);

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Lọc theo lĩnh vực">
        {["", ...categories].map((category) => (
          <button
            aria-selected={active === category}
            className="tab"
            key={category || "all"}
            role="tab"
            type="button"
            onClick={() => setActive(category)}
          >
            {category || "Tất cả"}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="muted-center">Chưa có dự án nào được phát hành.</p>
      ) : (
        <div className="tile-grid" role="tabpanel">
          {shown.map((campaign) => {
            const cover = coverFor(campaign);
            return (
              <Link className="tile" href={`/du-an/${campaign.slug}`} key={campaign.slug}>
                <Image src={cover.src} alt={cover.alt} fill sizes="(max-width: 700px) 100vw, 33vw" unoptimized={!cover.illustrative} />
                <span className="tile-overlay">
                  <span className="tile-cat">{campaign.category}</span>
                  <span className="tile-title">{campaign.title}</span>
                  <span className="tile-pct">Đã đạt {campaignProgress(campaign)}% mục tiêu</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
