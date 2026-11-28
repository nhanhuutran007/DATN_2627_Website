import { useState } from "react";

import { ApiError } from "@/lib/api";
import { publishCampaign, type ApiCampaign } from "@/lib/api/campaigns";

const DAY_MS = 86_400_000;

function formatDay(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type Props = {
  campaign: ApiCampaign;
  onPublished: (campaign: ApiCampaign) => Promise<void> | void;
  onCancel: () => void;
};

/**
 * Chủ dự án tự phát hành chiến dịch đã được duyệt. Ngày kết thúc đã chọn lúc tạo dự án, không chọn
 * lại ở đây; nếu duyệt lâu làm thời hạn còn dưới 7 ngày, máy chủ tự dời để giữ số ngày gây quỹ.
 */
export function PublishCampaignPanel({ campaign, onPublished, onCancel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openedAt] = useState(() => Date.now());
  const daysLeft = Math.floor((new Date(campaign.endDate).getTime() - openedAt) / DAY_MS);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const saved = await publishCampaign(campaign.id);
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
        {daysLeft >= 7 ? (
          <> Dự án gây quỹ đến hết ngày <b>{formatDay(campaign.endDate)}</b> như bạn đã chọn lúc tạo.</>
        ) : (
          <> Ngày kết thúc bạn chọn đã gần, nên khi phát hành sẽ được dời để giữ đủ số ngày gây quỹ đã dự định.</>
        )}
      </p>
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
