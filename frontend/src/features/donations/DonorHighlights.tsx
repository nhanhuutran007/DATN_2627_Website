"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { fetchCampaignLedger, type LedgerEntry } from "@/lib/api/donations";
import { formatVnd } from "@/lib/format";
import { timeAgo } from "@/lib/time";

import { CampaignLedger } from "./CampaignLedger";

type DonorHighlightsProps = {
  campaignId: string;
};

type Highlights = { total: number; recent: LedgerEntry | null; top: LedgerEntry | null };
type LedgerSort = "recent" | "top";

/**
 * Người ủng hộ gần nhất và lớn nhất (từ sổ cái đã xác nhận) ở thẻ gây quỹ; hai nút
 * "Xem tất cả" / "Xem lớn nhất" mở sổ cái giao dịch trong hộp thoại (theo mẫu GoFundMe).
 */
export function DonorHighlights({ campaignId }: DonorHighlightsProps) {
  const [data, setData] = useState<Highlights | null>(null);
  const [sort, setSort] = useState<LedgerSort | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (sort && !dialog.open) dialog.showModal();
    if (!sort && dialog.open) dialog.close();
  }, [sort]);

  if (!data || data.total === 0) return null;

  return (
    <div className="donor-highlights">
      <p className="donor-highlights-count">
        <span className="donor-highlights-icon" aria-hidden="true"><Icon name="chart" size={16} /></span>
        <b>{data.total.toLocaleString("vi-VN")}</b> lượt ủng hộ đã xác nhận
      </p>
      <ul>
        {data.recent && <DonorRow entry={data.recent} note={`Gần nhất · ${timeAgo(data.recent.completedAt)}`} />}
        {data.top && data.top.id !== data.recent?.id && <DonorRow entry={data.top} note="Ủng hộ lớn nhất" />}
      </ul>
      <div className="donor-highlights-actions">
        <button className="button button-outline button-sm" type="button" aria-haspopup="dialog" onClick={() => setSort("recent")}>
          Xem tất cả
        </button>
        <button className="button button-outline button-sm" type="button" aria-haspopup="dialog" onClick={() => setSort("top")}>
          <Icon name="sparkles" size={15} /> Xem lớn nhất
        </button>
      </div>

      <dialog
        ref={ref}
        className="app-dialog ledger-dialog"
        aria-labelledby={titleId}
        onClose={() => setSort(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSort(null);
        }}
      >
        <div className="share-dialog-head">
          <h2 id={titleId}>Sổ cái giao dịch ({data.total.toLocaleString("vi-VN")})</h2>
          <button className="share-dialog-close" type="button" aria-label="Đóng" onClick={() => setSort(null)}>
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="ledger-tabs" role="tablist" aria-label="Sắp xếp giao dịch">
          {(["recent", "top"] as LedgerSort[]).map((value) => (
            <button key={value} type="button" role="tab" aria-selected={sort === value} onClick={() => setSort(value)}>
              {value === "recent" ? "Mới nhất" : "Lớn nhất"}
            </button>
          ))}
        </div>
        <div className="ledger-dialog-body">
          {/* Chỉ tải khi mở; key theo cách sắp xếp để mỗi tab bắt đầu từ trang đầu. */}
          {sort && <CampaignLedger key={sort} campaignId={campaignId} sort={sort} />}
        </div>
      </dialog>
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
