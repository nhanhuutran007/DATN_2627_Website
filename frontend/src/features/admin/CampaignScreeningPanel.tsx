"use client";

import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";
import {
  fetchCampaignScreening,
  rerunCampaignScreening,
  SCREENING_LEVEL_LABEL,
  SCREENING_RECOMMENDATION_LABEL,
  type CampaignScreening,
  type ScreeningCheck,
  type ScreeningSummary,
} from "@/lib/api/automation";

const STATUS_ICON: Record<ScreeningCheck["status"], IconName> = { pass: "check", warn: "flag", fail: "x" };
const STATUS_TEXT: Record<ScreeningCheck["status"], string> = { pass: "Đạt", warn: "Cần lưu ý", fail: "Không đạt" };

/** Nhãn điểm rủi ro gọn cho bảng danh sách chiến dịch. */
export function ScreeningBadge({ screening }: { screening?: ScreeningSummary | null }) {
  if (!screening) return <span className="table-muted">Chưa chấm</span>;
  return (
    <span className="screening-cell">
      <span className={`screening-badge is-${screening.level}`} title={SCREENING_RECOMMENDATION_LABEL[screening.recommendation]}>
        {screening.score}/100 · {SCREENING_LEVEL_LABEL[screening.level]}
      </span>
      <small className="table-cell-note">
        {screening.autoApproved ? "Hệ thống đã tự phát hành" : SCREENING_RECOMMENDATION_LABEL[screening.recommendation]}
      </small>
    </span>
  );
}

/** Kết quả duyệt tự động trong hồ sơ duyệt: 4 bước kiểm tra, điểm rủi ro, đề xuất và lý do gợi ý. */
export function CampaignScreeningPanel({ campaignId }: { campaignId: string }) {
  const [screening, setScreening] = useState<CampaignScreening | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCampaignScreening(campaignId)
      .then((value) => active && setScreening(value))
      .catch((err: unknown) => active && setError(err instanceof ApiError ? err.message : "Không tải được kết quả duyệt tự động."));
    return () => {
      active = false;
    };
  }, [campaignId]);

  const rerun = async () => {
    setBusy(true);
    setError("");
    try {
      setScreening(await rerunCampaignScreening(campaignId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không chạy lại được bước kiểm tra.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="screening-panel" aria-labelledby="screening-title">
      <div className="screening-head">
        <h3 id="screening-title">Duyệt tự động</h3>
        <button className="link-inline" type="button" disabled={busy} onClick={() => void rerun()}>
          {busy ? "Đang kiểm tra…" : "Kiểm tra lại"}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!screening && !error && <p className="hint">Đang kiểm tra hồ sơ…</p>}
      {screening && (
        <>
          <div className={`screening-summary is-${screening.level}`}>
            <p className="screening-score">
              <b>{screening.score}</b>/100
            </p>
            <div>
              <p className="screening-level">{SCREENING_LEVEL_LABEL[screening.level]}</p>
              <p>
                {screening.autoApproved
                  ? "Hệ thống đã tự phát hành hồ sơ này (chế độ tự duyệt rủi ro thấp)."
                  : `Đề xuất: ${SCREENING_RECOMMENDATION_LABEL[screening.recommendation]}.`}
              </p>
            </div>
          </div>
          <ol className="screening-checks">
            {screening.checks.map((check, index) => (
              <li key={check.key} className={`is-${check.status}`}>
                <div className="screening-check-head">
                  <span className="screening-check-icon" aria-hidden="true"><Icon name={STATUS_ICON[check.status]} size={14} /></span>
                  <b>Bước {index + 1}. {check.label}</b>
                  <span className="screening-check-status">{STATUS_TEXT[check.status]}{check.points > 0 ? ` · +${check.points} điểm` : ""}</span>
                </div>
                {(check.findings.length > 0 || check.notes.length > 0) && (
                  <ul>
                    {check.findings.map((finding) => <li key={finding.message}>{finding.message}</li>)}
                    {check.notes.map((note) => <li key={note} className="is-note">{note}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ol>
          {screening.suggestedReason && (
            <p className="review-note"><b>Gợi ý nội dung yêu cầu bổ sung:</b> {screening.suggestedReason}</p>
          )}
          <p className="screening-foot">
            Kiểm tra bằng bộ luật phiên bản {screening.rulesVersion} lúc {new Date(screening.screenedAt).toLocaleString("vi-VN")}. Chỉ để
            hỗ trợ: quyết định duyệt, yêu cầu bổ sung hay từ chối vẫn do admin.
          </p>
        </>
      )}
    </section>
  );
}
