"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { CampaignPredictionCard } from "@/features/campaign-stats/CampaignPredictionCard";
import { resolveMediaUrl } from "@/lib/api";
import type { AdminCampaign } from "@/lib/api/admin";
import { fetchCampaign, type ApiCampaign } from "@/lib/api/campaigns";
import { fetchRewardTiers, type RewardTier } from "@/lib/api/rewards";
import { looksLikeHtml } from "@/lib/rich-text";

type Props = {
  campaign: AdminCampaign;
  statusLabel: string;
  /** Nút quyết định (duyệt/bổ sung/từ chối…) — chỉ hiện sau khi đã mở hồ sơ. */
  actions: ReactNode;
  onClose: () => void;
};

const money = (value: number | string | null | undefined) => `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;
const date = (value?: string | null) => (value ? new Date(value).toLocaleDateString("vi-VN") : "—");

const FRAME_STYLE = `
  body { margin: 0; font: 15px/1.75 "Be Vietnam Pro", "Segoe UI", Arial, sans-serif; color: #4a5268; overflow-wrap: anywhere; }
  body > p:first-child { color: #151d36; font-weight: 500; }
  h2, h3, h4 { color: #151d36; margin: 1.2em 0 .4em; line-height: 1.35; }
  img { max-width: 100%; height: auto; border-radius: 8px; }
  figure { margin: 1em 0; } figcaption { color: #6b7385; font-size: .88em; text-align: center; }
  blockquote { margin: 0 0 1em; padding: .4em 1em; border-left: 4px solid #e0402b; background: #f5f6f9; }
  table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #e5e7ee; padding: 6px 8px; text-align: left; }
  a { color: #e0402b; }
`;

/**
 * Hiển thị HTML mô tả trong iframe sandbox (không cho chạy script): admin xem cả hồ sơ
 * chưa duyệt, kể cả dữ liệu cũ chưa qua bộ lọc HTML của backend.
 */
function DescriptionFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(240);
  const fit = () => {
    const body = ref.current?.contentDocument?.body;
    if (body) setHeight(body.scrollHeight + 8);
  };
  return (
    <iframe
      ref={ref}
      className="review-description-frame"
      title="Mô tả dự án"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      srcDoc={`<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${FRAME_STYLE}</style></head><body>${html}</body></html>`}
      style={{ height }}
      onLoad={() => {
        fit();
        // Ảnh tải xong sau sự kiện load của khung thì đo lại chiều cao.
        ref.current?.contentDocument?.querySelectorAll("img").forEach((img) => img.addEventListener("load", fit));
      }}
    />
  );
}

/** Hồ sơ đầy đủ của chiến dịch để admin xem trước khi quyết định duyệt. */
export function CampaignReviewDialog({ campaign, statusLabel, actions, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<ApiCampaign | null>(null);
  const [tiers, setTiers] = useState<RewardTier[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCampaign(campaign.id), fetchRewardTiers(campaign.id).catch(() => [])])
      .then(([loaded, loadedTiers]) => {
        if (cancelled) return;
        setDetail(loaded);
        setTiers(loadedTiers);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Không tải được hồ sơ chiến dịch."));
    return () => {
      cancelled = true;
    };
  }, [campaign.id]);

  const milestones = (detail?.milestones ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const plannedBudget = milestones.reduce((sum, m) => sum + Number(m.budget ?? 0), 0);
  const goal = Number(campaign.goalAmount);
  const owner = detail?.owner ?? campaign.owner;
  const description = detail?.description ?? "";

  return (
    <dialog
      ref={ref}
      className="app-dialog review-dialog"
      aria-labelledby="review-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="review-head">
        <div>
          <p className="eyebrow">Hồ sơ chiến dịch · {statusLabel}</p>
          <h2 id="review-title">{campaign.title}</h2>
        </div>
        <button className="review-close" type="button" aria-label="Đóng" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </header>

      <div className="review-body">
        {error && <p className="form-error" role="alert">{error}</p>}
        {!detail && !error && <p className="hint">Đang tải hồ sơ…</p>}

        {detail && (
          <>
            <dl className="review-facts">
              <div><dt>Chủ dự án</dt><dd>{owner?.name ?? "—"}{campaign.owner?.email && <small>{campaign.owner.email}</small>}</dd></div>
              <div><dt>Lĩnh vực</dt><dd>{detail.category}</dd></div>
              <div><dt>Địa điểm</dt><dd>{detail.location ?? "—"}</dd></div>
              <div><dt>Mục tiêu</dt><dd>{money(detail.goalAmount)}</dd></div>
              <div><dt>Bắt đầu – kết thúc</dt><dd>{date(detail.startDate)} – {date(detail.endDate)}</dd></div>
              <div><dt>Gửi lúc</dt><dd>{date(detail.updatedAt ?? detail.createdAt)}</dd></div>
            </dl>

            {detail.rejectionReason && (
              <p className="review-note"><b>Ghi chú lần xét trước:</b> {detail.rejectionReason}</p>
            )}

            {detail.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh do người dùng tải lên, kích thước bất kỳ
              <img className="review-cover" src={resolveMediaUrl(detail.imageUrl)} alt={`Ảnh đại diện: ${detail.title}`} />
            )}

            <section>
              <h3>Câu chuyện, dự toán và rủi ro</h3>
              {looksLikeHtml(description) ? (
                <DescriptionFrame html={description} />
              ) : (
                <div className="review-plain">
                  {description.split(/\n+/).filter((line) => line.trim()).map((line, index) => <p key={index}>{line}</p>)}
                </div>
              )}
            </section>

            <section>
              <h3>Kế hoạch theo mốc</h3>
              {milestones.length === 0 ? (
                <p className="table-muted">Chưa có mốc nào.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table review-milestones">
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Mốc</th>
                        <th scope="col">Hạn</th>
                        <th scope="col" className="num">Ngân sách</th>
                        <th scope="col">Kết quả đầu ra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestones.map((m, index) => (
                        <tr key={m.id}>
                          <td>{index + 1}</td>
                          <td>{m.title}</td>
                          <td className="nowrap">{date(m.targetDate)}</td>
                          <td className="num">{m.budget ? money(m.budget) : "—"}</td>
                          <td>{m.description || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {milestones.length > 0 && (
                <p className={`review-budget ${goal > 0 && Math.abs(plannedBudget - goal) / goal > 0.1 ? "is-off" : ""}`}>
                  Tổng ngân sách các mốc <b>{money(plannedBudget)}</b> / mục tiêu <b>{money(goal)}</b>
                  {goal > 0 && Math.abs(plannedBudget - goal) / goal > 0.1 && " — lệch hơn 10%"}
                </p>
              )}
            </section>

            <section>
              <h3>Mức quà tặng</h3>
              {tiers.length === 0 ? (
                <p className="table-muted">Không có mức quà tặng.</p>
              ) : (
                <ul className="review-tiers">
                  {tiers.map((tier) => (
                    <li key={tier.id}>
                      <b>{tier.title}</b> · từ {money(tier.minAmount)}
                      {tier.quantityLimit !== null && ` · giới hạn ${tier.quantityLimit}`}
                      {tier.description && <small>{tier.description}</small>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3>Ước lượng AI</h3>
              <CampaignPredictionCard campaignId={campaign.id} variant="admin" />
            </section>
          </>
        )}
      </div>

      <footer className="review-foot">
        <a className="button button-outline button-sm" href={`/du-an/${campaign.id}`} target="_blank" rel="noreferrer">
          Xem như người ủng hộ<span className="sr-only"> (mở tab mới)</span>
        </a>
        {detail ? actions : <span />}
      </footer>
    </dialog>
  );
}
