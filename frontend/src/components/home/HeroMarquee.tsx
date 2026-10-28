import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { coverFor } from "@/lib/covers";
import { campaignProgress, type Campaign } from "@/lib/data/campaigns";

/** Số ảnh tối thiểu để dải ảnh đủ dài, không lộ khoảng trống khi trôi. */
const MIN_TILES = 8;
/** Giây cho mỗi ảnh đi hết một vòng: càng lớn càng trôi chậm. */
const SECONDS_PER_TILE = 7;

/**
 * Ưu tiên dự án đang gây quỹ, mỗi ảnh chỉ dùng một lần (nhiều dự án chung ảnh minh họa theo lĩnh vực);
 * thiếu thì lặp lại cho đủ dài.
 */
function pickTiles(campaigns: Campaign[]): Campaign[] {
  const open = campaigns.filter((campaign) => campaign.status === "Đang gây quỹ");
  const source = open.length >= 4 ? open : campaigns;
  const seen = new Set<string>();
  const unique = source.filter((campaign) => {
    const src = coverFor(campaign).src;
    if (seen.has(src)) return false;
    seen.add(src);
    return true;
  });
  const tiles = unique.length > 0 ? unique : source;
  const filled = [...tiles];
  while (filled.length > 0 && filled.length < MIN_TILES) filled.push(...tiles.slice(0, MIN_TILES - filled.length));
  return filled;
}

/** Dải ảnh dự án (cùng khung 4:3) trôi chậm từ phải sang trái ở hero; rê chuột để dừng, bấm để mở dự án. */
export function HeroMarquee({ campaigns }: { campaigns: Campaign[] }) {
  const tiles = pickTiles(campaigns);
  if (tiles.length === 0) return null;
  // Nhân đôi dải để vòng lặp liền mạch: trôi đúng nửa chiều dài rồi quay về đầu.
  const track = [...tiles, ...tiles];
  const style = { "--marquee-duration": `${tiles.length * SECONDS_PER_TILE}s` } as CSSProperties;

  return (
    <div className="hero-marquee" role="region" aria-label="Dự án đang gây quỹ">
      <ul className="hero-marquee-track" style={style}>
        {track.map((campaign, index) => {
          const copy = index >= tiles.length;
          const cover = coverFor(campaign);
          const progress = Math.min(campaignProgress(campaign), 100);
          return (
            <li className="hero-tile" key={`${campaign.slug}-${index}`} aria-hidden={copy || undefined}>
              <Link href={`/du-an/${campaign.slug}`} tabIndex={copy ? -1 : undefined}>
                {/* Tải sẵn mọi ảnh: tải lười làm ô sắp trôi vào còn trống rồi ảnh mới bật ra, trông như dải bị khựng. */}
                <Image src={cover.src} alt="" fill sizes="380px" loading="eager" unoptimized={!cover.illustrative} />
                <span className="hero-tile-caption">
                  <span className="hero-tile-cat">{campaign.category}</span>
                  <span className="hero-tile-title">{campaign.title}</span>
                  <span className="hero-tile-bar" aria-hidden="true"><i style={{ width: `${progress}%` }} /></span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
