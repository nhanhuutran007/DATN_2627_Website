"use client";

import Image from "next/image";
import { useState, useSyncExternalStore } from "react";

import { ProgressRing } from "@/components/campaign/ProgressRing";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/LogoMark";
import { formatVndShort } from "@/lib/format";

import { SHARE_CHANNELS } from "./ShareCampaignButton";

type ShareSpreadProps = {
  campaignId: string;
  title: string;
  owner: string;
  raised: number;
  percent: number;
  cover: { src: string; alt: string; illustrative: boolean };
  /** Chỉ hiện nhãn "Ủng hộ ngay!" trên thẻ xem trước khi chiến dịch còn nhận tiền. */
  open: boolean;
};

const noopSubscribe = () => () => {};

/**
 * Mục "Chia sẻ giúp nhiều hơn bạn nghĩ" (theo "Sharing helps more than you think" của
 * GoFundMe): thẻ xem trước khi chia sẻ + hàng nút sao chép liên kết và mạng xã hội.
 */
export function ShareSpread({ campaignId, title, owner, raised, percent, cover, open }: ShareSpreadProps) {
  // Liên kết tuyệt đối chỉ biết ở trình duyệt; lúc render trên server để trống.
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = `${origin}/du-an/${encodeURIComponent(campaignId)}`;
  const text = `Cùng ủng hộ dự án "${title}" trên Góp Mầm`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Sao chép liên kết dự án:", url);
    }
  };

  return (
    <div className="share-spread">
      <div className="share-preview" aria-hidden="true">
        <div className="share-preview-text">
          <LogoMark size={28} />
          <b>{title}</b>
          <span>
            Tổ chức bởi
            <strong>{owner}</strong>
          </span>
        </div>
        <div className="share-preview-media">
          <Image src={cover.src} alt="" fill sizes="(max-width: 560px) 50vw, 340px" unoptimized={!cover.illustrative} />
          <span className="share-preview-heart"><Icon name="heart" size={20} /></span>
          <div className="share-preview-stats">
            <ProgressRing value={percent} size={76} />
            <span className="share-preview-raised">Đã nhận {formatVndShort(raised)}</span>
            {open && <span className="share-preview-cta">Ủng hộ ngay!</span>}
          </div>
        </div>
      </div>

      <ul className="share-spread-channels" aria-label="Chia sẻ dự án">
        <li>
          <button className="share-glyph share-glyph-link" type="button" onClick={copy} aria-label={copied ? "Đã sao chép liên kết" : "Sao chép liên kết"} title={copied ? "Đã sao chép" : "Sao chép liên kết"}>
            <Icon name={copied ? "check" : "copy"} size={20} />
          </button>
        </li>
        {SHARE_CHANNELS.map((channel) => (
          <li key={channel.key}>
            <a
              className={`share-glyph share-glyph-${channel.key}`}
              href={channel.href(url, text)}
              target={channel.key === "email" ? undefined : "_blank"}
              rel="noopener noreferrer"
              aria-label={`Chia sẻ qua ${channel.label}`}
              title={channel.label}
            >
              {"text" in channel.glyph ? channel.glyph.text : <Icon name={channel.glyph.icon} size={20} />}
            </a>
          </li>
        ))}
      </ul>
      <p className="share-spread-status" aria-live="polite">{copied ? "Đã sao chép liên kết dự án." : ""}</p>
    </div>
  );
}
