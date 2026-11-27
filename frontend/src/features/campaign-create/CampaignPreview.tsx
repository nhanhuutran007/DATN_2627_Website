"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";

import { VideoPlayer } from "@/components/campaign/VideoPlayer";
import { Icon } from "@/components/ui/Icon";
import { RewardCard } from "@/features/rewards/RewardCard";
import { resolveMediaUrl } from "@/lib/api";
import type { RewardTier, RewardTierPayload } from "@/lib/api/rewards";
import { categoryCover, categoryIcon } from "@/lib/covers";
import { formatVnd } from "@/lib/format";
import { sanitizeRichText } from "@/lib/rich-text.server";
import { htmlToText } from "@/lib/rich-text";

type PreviewMilestone = { title: string; deadline: string; budget: string; output: string };

type CampaignPreviewProps = {
  onClose: () => void;
  title: string;
  summary: string;
  category: string;
  location: string;
  organizationName: string | null;
  ownerName: string;
  /** Ảnh đã tải lên / link ảnh; rỗng = ảnh minh họa theo lĩnh vực. */
  imageUrl: string;
  videoUrl: string;
  goalAmount: number;
  /** yyyy-mm-dd. */
  deadline: string;
  story: string;
  budget: string;
  risks: string;
  milestones: PreviewMilestone[];
  tiers: RewardTierPayload[];
};

const formatDay = (value: string) => (value ? value.split("-").reverse().join("/") : "");

/** Mức quà đang soạn → dạng thẻ quà công khai (chưa ai chọn). */
function toPreviewTier(tier: RewardTierPayload, index: number): RewardTier {
  return {
    id: `preview-${index}`,
    campaignId: "preview",
    title: tier.title,
    description: tier.description,
    minAmount: tier.minAmount,
    quantityLimit: tier.quantityLimit ?? null,
    claimedCount: 0,
    remaining: tier.quantityLimit ?? null,
    estimatedDelivery: tier.estimatedDelivery ?? null,
    sortOrder: index,
    isActive: true,
    imageUrl: tier.imageUrl ?? null,
    items: tier.items ?? [],
    requiresShipping: tier.requiresShipping ?? true,
    availableUntil: tier.availableUntil ?? null,
    available: true,
  };
}

/**
 * Xem trước trang dự án như người ủng hộ sẽ thấy (như nút "Preview" của Kickstarter), dựng từ dữ liệu
 * đang soạn — chưa cần lưu. Chỉ để xem: không có nút ủng hộ, số liệu gây quỹ bắt đầu từ 0.
 */
export function CampaignPreview(props: CampaignPreviewProps) {
  const { onClose } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Mốc "bây giờ" cố định lúc mở xem trước (không đổi giữa các lần vẽ lại).
  const [openedAt] = useState(() => Date.now());

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  const cover = props.imageUrl
    ? { src: resolveMediaUrl(props.imageUrl), alt: `Ảnh đại diện: ${props.title || "dự án"}`, illustrative: false }
    : (() => {
        const fallback = props.category ? categoryCover(props.category) : null;
        return fallback ? { src: fallback.src, alt: fallback.alt, illustrative: true } : null;
      })();
  const fundraisingDays = props.deadline
    ? Math.max(0, Math.ceil((new Date(`${props.deadline}T23:59:59`).getTime() - openedAt) / 86_400_000))
    : null;
  const hasStory = htmlToText(props.story).length > 0;
  const hasBudget = htmlToText(props.budget).length > 0;
  const hasRisks = htmlToText(props.risks).length > 0;
  const plannedBudget = props.milestones.reduce((sum, m) => sum + (Number(m.budget) || 0), 0);

  return (
    <dialog
      ref={ref}
      className="campaign-preview"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="campaign-preview-bar">
        <span className="campaign-preview-badge">
          <Icon name="eye" size={16} /> Bản xem trước — chưa công khai
        </span>
        <button className="button button-dark button-sm" type="button" onClick={onClose}>
          <Icon name="x" size={16} /> Đóng xem trước
        </button>
      </div>

      <div className="campaign-preview-page">
        <p className="campaign-preview-crumbs">
          {props.category || "Chưa chọn lĩnh vực"}
          {props.location && <> · <Icon name="location" size={14} /> {props.location}</>}
        </p>
        <h1 className="detail-title" id={titleId}>{props.title || "Chưa đặt tên dự án"}</h1>

        <div className="campaign-preview-hero">
          <div>
            <figure className="detail-cover">
              {props.videoUrl ? (
                <VideoPlayer url={props.videoUrl} title={props.title || "Video giới thiệu"} />
              ) : cover ? (
                <>
                  <Image src={cover.src} alt={cover.alt} fill sizes="(max-width: 960px) 100vw, 720px" unoptimized />
                  {cover.illustrative && <figcaption>Ảnh minh họa theo lĩnh vực</figcaption>}
                </>
              ) : (
                <span className="campaign-preview-cover-icon" aria-hidden="true">
                  <Icon name={categoryIcon(props.category)} size={48} />
                </span>
              )}
            </figure>
            <p className="campaign-preview-organizer">
              <span className="organizer-avatar" aria-hidden="true">{(props.ownerName || "?").charAt(0).toUpperCase()}</span>
              <span>
                <b>{props.ownerName || "Bạn"}</b>{" "}
                {props.organizationName ? <>đang gây quỹ cho <b>{props.organizationName}</b></> : "đang tổ chức gây quỹ"}
              </span>
            </p>
          </div>

          <aside className="panel fund-card campaign-preview-fund" aria-label="Tiến độ gây quỹ">
            <p className="fund-amount">0&nbsp;₫</p>
            <p className="fund-target">đã ủng hộ trên mục tiêu <b>{props.goalAmount > 0 ? formatVnd(props.goalAmount) : "—"}</b></p>
            <div className="fund-stat-row">
              <div className="fund-stat">
                <p className="fund-stat-value num">0</p>
                <p className="fund-stat-label">lượt ủng hộ</p>
              </div>
              <div className="fund-stat">
                <p className="fund-stat-value num">{fundraisingDays ?? "—"}</p>
                <p className="fund-stat-label">ngày (đến {formatDay(props.deadline) || "—"})</p>
              </div>
            </div>
            <p className="hint">Số ngày còn lại tính từ lúc bạn bấm Phát hành sau khi hồ sơ được duyệt.</p>
          </aside>
        </div>

        <div className="campaign-preview-body">
          {props.summary.trim() && <p className="detail-lead campaign-preview-summary">{props.summary.trim()}</p>}

          <section className="detail-section">
            <h2>Câu chuyện dự án</h2>
            {hasStory ? (
              <div className="detail-story rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(props.story) }} />
            ) : (
              <p className="campaign-preview-missing"><Icon name="alert" size={15} /> Chưa viết câu chuyện dự án.</p>
            )}
          </section>

          <section className="detail-section">
            <h2>Kế hoạch sử dụng vốn</h2>
            {hasBudget ? (
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(props.budget) }} />
            ) : (
              <p className="campaign-preview-missing"><Icon name="alert" size={15} /> Chưa nhập dự toán sử dụng vốn.</p>
            )}
          </section>

          <section className="detail-section">
            <h2>Rủi ro và phương án ứng phó</h2>
            {hasRisks ? (
              <div className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichText(props.risks) }} />
            ) : (
              <p className="campaign-preview-missing"><Icon name="alert" size={15} /> Chưa nêu rủi ro và phương án ứng phó.</p>
            )}
          </section>

          <section className="detail-section">
            <h2>Kế hoạch theo mốc</h2>
            {props.milestones.length > 0 ? (
              <>
                <ol className="campaign-preview-milestones">
                  {props.milestones.map((m, index) => (
                    <li key={index}>
                      <b>{m.title}</b>
                      <span className="hint">
                        {m.deadline ? `Hạn ${formatDay(m.deadline)}` : "Chưa đặt hạn"}
                        {m.budget ? ` · ${formatVnd(Number(m.budget))}` : ""}
                      </span>
                      {m.output.trim() && <p>{m.output.trim()}</p>}
                    </li>
                  ))}
                </ol>
                <p className="hint">Tổng ngân sách các mốc: <b>{formatVnd(plannedBudget)}</b></p>
              </>
            ) : (
              <p className="campaign-preview-missing"><Icon name="alert" size={15} /> Chưa có mốc nào.</p>
            )}
          </section>

          {props.tiers.length > 0 && (
            <section className="detail-section">
              <h2>Quà tri ân</h2>
              <div className="campaign-preview-rewards">
                {props.tiers.map((tier, index) => <RewardCard key={index} tier={toPreviewTier(tier, index)} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </dialog>
  );
}
