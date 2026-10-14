"use client";

import { useEffect, useState } from "react";

import { fetchCampaignLedger, type LedgerEntry } from "@/lib/api/donations";
import { formatVnd } from "@/lib/format";
import { timeAgo } from "@/lib/time";

type DonorHighlightsProps = {
  campaignId: string;
};

type Highlights = { total: number; recent: LedgerEntry | null; top: LedgerEntry | null };

/** Người ủng hộ gần nhất và lớn nhất (từ sổ cái đã xác nhận) ở thẻ gây quỹ. */
export function DonorHighlights({ campaignId }: DonorHighlightsProps) {
  const [data, setData] = useState<Highlights | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCampaignLedger(campaignId, 1, "recent"), fetchCampaignLedger(campaignId, 1, "top")])
      .then(([recent, top]) => {
        if (active) setData({ total: recent.total, recent: recent.items[0] ?? null, top: top.items[0] ?? null });
      })
      .catch(() => {
        // Không chặn trang nếu sổ cái lỗi: chỉ ẩn khối này.
        if (active) setData({ total: 0, recent: null, top: null });
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  if (!data || data.total === 0) return null;

  return (
    <div className="donor-highlights">
      <p className="donor-highlights-count">
        <b>{data.total.toLocaleString("vi-VN")}</b> lượt ủng hộ đã xác nhận
      </p>
      <ul>
        {data.recent && <DonorRow entry={data.recent} note={`Gần nhất · ${timeAgo(data.recent.completedAt)}`} />}
        {data.top && data.top.id !== data.recent?.id && <DonorRow entry={data.top} note="Ủng hộ lớn nhất" />}
      </ul>
      <a className="button button-outline button-sm button-block" href="#so-cai">Xem tất cả giao dịch</a>
    </div>
  );
}

function DonorRow({ entry, note }: { entry: LedgerEntry; note: string }) {
  const name = entry.donorName ?? "Người ủng hộ ẩn danh";
  return (
    <li className="donor-row">
      <span className="donor-avatar" aria-hidden="true">{entry.donorName ? entry.donorName.charAt(0).toUpperCase() : "?"}</span>
      <span className="donor-body">
        <span className="donor-name">{name}</span>
        <span className="donor-meta"><b>{formatVnd(entry.amount)}</b> · {note}</span>
      </span>
    </li>
  );
}
