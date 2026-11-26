import { useState } from "react";

import { ApiError } from "@/lib/api";
import { publishCampaign, type ApiCampaign } from "@/lib/api/campaigns";

/** Khớp `MIN/MAX_CAMPAIGN_DURATION_DAYS` ở backend: thời gian gây quỹ tính từ lúc phát hành. */
const MIN_DAYS = 7;
const MAX_DAYS = 60;
const DAY_MS = 86_400_000;

function toDateInput(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateAfter(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59`);
}

/** Số ngày gây quỹ nếu phát hành ngay bây giờ. */
function daysFromToday(value: string) {
  return value ? Math.floor((endOfDay(value).getTime() - Date.now()) / DAY_MS) : 0;
}

/** Ngày kết thúc đề xuất: giữ ngày đã chọn nếu còn hợp lệ, không thì kéo vào khoảng 7–60 ngày. */
function initialDeadline(endDate: string) {
  const current = toDateInput(new Date(endDate));
  const min = dateAfter(MIN_DAYS);
  const max = dateAfter(MAX_DAYS);
  if (current < min) return dateAfter(30);
  return current > max ? max : current;
}

type Props = {
  campaign: ApiCampaign;
  onPublished: (campaign: ApiCampaign) => Promise<void> | void;
  onCancel: () => void;
};

/**
 * Chủ dự án tự phát hành chiến dịch đã được duyệt. Thời gian gây quỹ bắt đầu từ lúc bấm, nên cho
 * chọn lại ngày kết thúc (7–60 ngày kể từ hôm nay) nếu duyệt lâu làm ngày cũ không còn phù hợp.
 */
export function PublishCampaignPanel({ campaign, onPublished, onCancel }: Props) {
  const [deadline, setDeadline] = useState(() => initialDeadline(campaign.endDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const min = dateAfter(MIN_DAYS);
  const max = dateAfter(MAX_DAYS);
  const days = daysFromToday(deadline);
  const changed = deadline !== toDateInput(new Date(campaign.endDate));

  const submit = async () => {
    if (!deadline || deadline < min || deadline > max) {
      setError(`Chọn ngày kết thúc trong ${MIN_DAYS}–${MAX_DAYS} ngày kể từ hôm nay.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await publishCampaign(campaign.id, changed ? endOfDay(deadline).toISOString() : undefined);
      await onPublished(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không phát hành được, vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <div className="publish-panel" role="region" aria-label={`Phát hành ${campaign.title}`}>
      <p>
        Hồ sơ đã được duyệt. Khi phát hành, dự án hiện công khai trên trang khám phá và bắt đầu nhận cam kết ủng hộ.
        Thời gian gây quỹ tính từ lúc bạn bấm.
      </p>
      <label htmlFor={`publish-end-${campaign.id}`}>Ngày kết thúc gây quỹ</label>
      <input
        id={`publish-end-${campaign.id}`}
        type="date"
        min={min}
        max={max}
        value={deadline}
        disabled={busy}
        onChange={(e) => setDeadline(e.target.value)}
      />
      <small>
        {MIN_DAYS}–{MAX_DAYS} ngày kể từ hôm nay{days > 0 ? ` · gây quỹ ${days} ngày` : ""}.
      </small>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="publish-actions">
        <button className="button button-primary button-sm" type="button" disabled={busy} onClick={submit}>
          {busy ? "Đang phát hành…" : "Phát hành ngay"}
        </button>
        <button className="button button-ghost button-sm" type="button" disabled={busy} onClick={onCancel}>
          Để sau
        </button>
      </div>
    </div>
  );
}
