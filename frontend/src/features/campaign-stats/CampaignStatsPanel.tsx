"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { fetchCampaignStats, type CampaignStats } from "@/lib/api/campaign-stats";
import { formatVnd } from "@/lib/format";

import { DailyColumnChart } from "./DailyColumnChart";

const AMOUNT_COLOR = "#e0402b";
const VIEWS_COLOR = "#2f6fd0";
const RANGES = [7, 30, 90] as const;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stats: CampaignStats };

const compactNumber = (value: number) => value.toLocaleString("vi-VN");

/** Số liệu một chiến dịch cho chủ dự án: lượt xem, chuyển đổi, diễn biến theo ngày. */
export function CampaignStatsPanel({ campaignId }: { campaignId: string }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [state, setState] = useState<State>({ status: "loading" });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCampaignStats(campaignId, days)
      .then((stats) => {
        if (active) setState({ status: "ready", stats });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof ApiError ? error.message : "Không tải được số liệu.",
        });
      });
    return () => {
      active = false;
    };
  }, [campaignId, days, requestKey]);

  const changeRange = (next: (typeof RANGES)[number]) => {
    setState({ status: "loading" });
    setDays(next);
  };

  return (
    <div className="stats-panel">
      <div className="stats-range" role="group" aria-label="Khoảng thời gian">
        {RANGES.map((range) => (
          <button
            key={range}
            type="button"
            aria-pressed={days === range}
            onClick={() => changeRange(range)}
          >
            {range} ngày
          </button>
        ))}
      </div>

      {state.status === "loading" && <p className="hint" role="status">Đang tải số liệu…</p>}
      {state.status === "error" && (
        <p className="form-error" role="alert">
          {state.message}{" "}
          <button className="link-inline" type="button" onClick={() => { setState({ status: "loading" }); setRequestKey((k) => k + 1); }}>
            Thử lại
          </button>
        </p>
      )}
      {state.status === "ready" && <StatsBody stats={state.stats} />}
    </div>
  );
}

function StatsBody({ stats }: { stats: CampaignStats }) {
  const conversion = stats.conversionRate === null ? "—" : `${(stats.conversionRate * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
  return (
    <>
      <dl className="stats-tiles">
        <div><dt>Lượt xem</dt><dd className="num">{compactNumber(stats.viewCount)}</dd></div>
        <div><dt>Lượt ủng hộ</dt><dd className="num">{compactNumber(stats.backerCount)}</dd></div>
        <div>
          <dt>Tỷ lệ chuyển đổi</dt>
          <dd className="num">{conversion}</dd>
        </div>
        <div><dt>Người theo dõi</dt><dd className="num">{compactNumber(stats.followerCount)}</dd></div>
      </dl>
      <p className="hint stats-note">
        Tỷ lệ chuyển đổi = lượt ủng hộ thành công / lượt xem. Lượt xem lặp lại của cùng một người trong 30 phút chỉ tính một lần; bạn tự xem chiến dịch của mình không được tính.
      </p>
      <div className="stats-charts">
        <DailyColumnChart
          title="Số tiền ủng hộ theo ngày"
          color={AMOUNT_COLOR}
          format={formatVnd}
          points={stats.daily.map((point) => ({
            date: point.date,
            value: point.amount,
            note: point.donations > 0 ? `${point.donations} lượt ủng hộ` : undefined,
          }))}
        />
        <DailyColumnChart
          title="Lượt xem theo ngày"
          color={VIEWS_COLOR}
          format={compactNumber}
          points={stats.daily.map((point) => ({ date: point.date, value: point.views }))}
        />
      </div>
    </>
  );
}
