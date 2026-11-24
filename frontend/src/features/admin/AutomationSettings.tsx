"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { ALL_TIME, dateRangeParams, DateRangeFilter, hasDateRange, type DateRange } from "@/components/ui/DateRangeFilter";
import {
  fetchAutomationSettings,
  fetchAutoRefundSummary,
  updateAutomationSettings,
  type AutomationSettings,
  type AutoRefundEvent,
  type AutoRefundSummary,
  type CampaignReviewMode,
} from "@/lib/api/automation";

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

function useAutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetchAutomationSettings()
      .then((value) => active && setSettings(value))
      .catch((err: unknown) => active && setNotice({ tone: "error", text: errorText(err, "Không tải được cấu hình tự động.") }));
    return () => {
      active = false;
    };
  }, []);

  const save = async (patch: Partial<Omit<AutomationSettings, "updatedAt">>, success: string) => {
    setBusy(true);
    setNotice(null);
    try {
      setSettings(await updateAutomationSettings(patch));
      setNotice({ tone: "ok", text: success });
    } catch (err) {
      setNotice({ tone: "error", text: errorText(err, "Không lưu được cấu hình.") });
    } finally {
      setBusy(false);
    }
  };

  return { settings, busy, notice, save };
}

function Notice({ notice }: { notice: { tone: "ok" | "error"; text: string } | null }) {
  if (!notice) return null;
  return (
    <p className={notice.tone === "ok" ? "admin-notice" : "form-error"} role={notice.tone === "ok" ? "status" : "alert"}>
      {notice.text}
    </p>
  );
}

const REVIEW_MODES: Array<{ value: CampaignReviewMode; title: string; text: string }> = [
  {
    value: "manual_all",
    title: "Admin duyệt tất cả",
    text: "Mọi chiến dịch phải được admin bấm duyệt trước khi công khai. Duyệt tự động chỉ chấm điểm và xếp hồ sơ rủi ro lên trước.",
  },
  {
    value: "auto_low_risk",
    title: "Tự phát hành hồ sơ rủi ro thấp",
    text: "Hồ sơ đủ thông tin, chủ dự án đã xác minh email, không có nội dung cấm và rủi ro thấp được phát hành ngay. Còn lại chờ admin duyệt.",
  },
];

/** Chọn chế độ duyệt chiến dịch (đặt ở mục "Duyệt chiến dịch"). */
export function ReviewAutomationPanel() {
  const { settings, busy, notice, save } = useAutomationSettings();
  return (
    <section className="admin-card automation-card" aria-labelledby="review-automation-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Duyệt tự động</p>
          <h2 id="review-automation-title">Chế độ duyệt chiến dịch</h2>
        </div>
      </div>
      <p className="automation-lead">
        Khi chủ dự án gửi hồ sơ, hệ thống tự kiểm tra 4 bước: <b>đủ thông tin bắt buộc</b>, <b>giấy tờ và xác minh</b> (email, giấy phép tổ chức),{" "}
        <b>nội dung cấm</b> (bộ luật từ khóa) và <b>chấm điểm rủi ro</b> 0–100. Hệ thống không bao giờ tự từ chối hồ sơ.
      </p>
      <div className="automation-options" role="radiogroup" aria-label="Chế độ duyệt chiến dịch">
        {REVIEW_MODES.map((mode) => {
          const checked = settings?.campaignReviewMode === mode.value;
          return (
            <label key={mode.value} className={`automation-option${checked ? " is-checked" : ""}`}>
              <input
                type="radio"
                name="campaign-review-mode"
                value={mode.value}
                checked={checked}
                disabled={!settings || busy}
                onChange={() => void save({ campaignReviewMode: mode.value }, `Đã chuyển sang chế độ “${mode.title}”.`)}
              />
              <span>
                <b>{mode.title}</b>
                <small>{mode.text}</small>
              </span>
            </label>
          );
        })}
      </div>
      <Notice notice={notice} />
    </section>
  );
}

/**
 * Một nhãn duy nhất cho mỗi cách hoàn (không thêm dòng phụ): chỉ "về ví" mới cần phân biệt
 * nhả cam kết (chưa trừ tiền) với hoàn khoản đã thu.
 */
function refundLabel(event: AutoRefundEvent): { text: string; tone: string } {
  if (event.destination === "gateway") return { text: "Hoàn qua cổng thanh toán", tone: "is-gateway" };
  if (event.destination === "pledge_cancelled") return { text: "Hủy cam kết thẻ (chưa trừ tiền)", tone: "is-pledge_cancelled" };
  return event.kind === "pledge_released"
    ? { text: "Trả cam kết về ví", tone: "is-wallet" }
    : { text: "Hoàn tiền đã thu về ví", tone: "is-wallet" };
}

const money = (value: number) => `${Math.round(value).toLocaleString("vi-VN")}\u00A0₫`;

/**
 * Theo dõi hoàn tiền tự động (đặt ở mục "Hoàn tiền"): khi dự án hết hạn mà không đạt mục tiêu hoặc bị hủy,
 * hệ thống tự trả khoản cam kết/ủng hộ về ví Góp Mầm của người ủng hộ. Không có nút bật/tắt — các yêu cầu
 * hoàn hay rút tiền khác đều do admin kiểm tra và duyệt thủ công ở danh sách bên dưới.
 */
export function RefundAutoMonitor({ refreshKey = 0 }: { refreshKey?: number }) {
  const [summary, setSummary] = useState<AutoRefundSummary | null>(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  useEffect(() => {
    let active = true;
    fetchAutoRefundSummary(dateRangeParams(range))
      .then((value) => active && setSummary(value))
      .catch((err: unknown) => active && setError(errorText(err, "Không tải được số liệu hoàn tiền tự động.")));
    return () => {
      active = false;
    };
  }, [refreshKey, range]);

  return (
    <section className="admin-card admin-table-card automation-card refund-monitor" aria-labelledby="refund-monitor-title">
      <div className="card-heading">
        <div>
          <p className="eyebrow">Theo dõi</p>
          <h2 id="refund-monitor-title">Hoàn tiền tự động khi dự án không đạt mục tiêu</h2>
        </div>
        <div className="risk-heading-actions">
          <DateRangeFilter label="Lọc theo thời điểm hoàn" value={range} onChange={setRange} />
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!summary && !error && <p className="hint">Đang tải…</p>}
      {summary && (
        <>
          <dl className="refund-monitor-stats">
            <div>
              <dt>Cam kết đã trả về ví</dt>
              <dd><b>{money(summary.releasedPledges.amount)}</b></dd>
              <dd className="stat-meta">{summary.releasedPledges.count.toLocaleString("vi-VN")} khoản</dd>
            </div>
            <div>
              <dt>Khoản đã thu được tự hoàn</dt>
              <dd><b>{money(summary.autoRefunds.amount)}</b></dd>
              <dd className="stat-meta">{summary.autoRefunds.count.toLocaleString("vi-VN")} khoản</dd>
            </div>
            <div className={summary.pendingManual > 0 ? "is-attention" : undefined}>
              <dt>Chờ admin duyệt thủ công</dt>
              <dd><b>{summary.pendingManual.toLocaleString("vi-VN")}</b></dd>
              <dd className="stat-meta">yêu cầu hoàn tiền đang chờ</dd>
            </div>
          </dl>
          {summary.recent.length === 0 ? (
            <p className="table-muted">
              {hasDateRange(range) ? "Không có khoản nào được hoàn tự động trong khoảng thời gian này." : "Chưa có khoản nào được hoàn tự động."}
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Thời điểm</th><th>Dự án</th><th>Người ủng hộ</th><th className="num">Số tiền</th><th>Hình thức hoàn</th></tr>
                </thead>
                <tbody>
                  {summary.recent.map((event) => (
                    <tr key={`${event.kind}-${event.donationId}`}>
                      <td className="nowrap">{formatDateTime(event.at)}</td>
                      <td>{event.campaignTitle || "—"}</td>
                      <td>{event.donorName || "—"}</td>
                      <td className="num">{money(event.amount)}</td>
                      <td>
                        <span className={`refund-destination ${refundLabel(event).tone}`}>{refundLabel(event).text}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
