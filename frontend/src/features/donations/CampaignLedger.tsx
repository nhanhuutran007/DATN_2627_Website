"use client";

import { useEffect, useState } from "react";

import { fetchCampaignLedger, type CampaignLedger as Ledger } from "@/lib/api/donations";
import { formatDateTime, formatVnd } from "@/lib/format";

type CampaignLedgerProps = {
  campaignId: string;
  /** "recent": mới nhất trước; "top": số tiền lớn nhất trước. */
  sort?: "recent" | "top";
};

const METHOD_LABEL: Record<string, string> = {
  wallet: "Ví demo",
  wallet_demo: "Ví demo",
  payos: "PayOS sandbox",
};

/** Số dòng hiển thị ban đầu; bấm "Xem tất cả" để tải tối đa FULL_ROWS (giới hạn của API). */
const PREVIEW_ROWS = 10;
const FULL_ROWS = 50;

export function CampaignLedger({ campaignId, sort = "recent" }: CampaignLedgerProps) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCampaignLedger(campaignId, expanded ? FULL_ROWS : PREVIEW_ROWS, sort)
      .then((result) => {
        if (active) setLedger(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [campaignId, expanded, sort]);

  if (failed) return <p className="empty-line">Không tải được sổ cái giao dịch.</p>;
  if (!ledger) return <p className="empty-line" aria-live="polite">Đang tải sổ cái…</p>;
  if (ledger.items.length === 0) {
    return <p className="empty-line">Chưa có khoản ủng hộ nào được xác nhận.</p>;
  }

  return (
    <>
      <div className="table-wrap">
        <table className="plain-table ledger-table">
          <caption className="sr-only">Các khoản ủng hộ đã được xác nhận, {sort === "top" ? "lớn nhất" : "mới nhất"} trước</caption>
          <thead>
            <tr>
              <th scope="col">Thời điểm xác nhận</th>
              <th scope="col">Người ủng hộ</th>
              <th scope="col">Kênh</th>
              <th scope="col" className="num">Số tiền</th>
              <th scope="col">Tham chiếu</th>
            </tr>
          </thead>
          <tbody>
            {ledger.items.map((entry) => (
              <tr key={entry.id}>
                <td className="mono nowrap">{formatDateTime(entry.completedAt)}</td>
                <td>{entry.donorName ?? <i>Ẩn danh</i>}</td>
                <td>{METHOD_LABEL[entry.paymentMethod ?? ""] ?? "—"}</td>
                <td className="num">{formatVnd(entry.amount)}</td>
                <td className="mono">{entry.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!expanded && ledger.total > ledger.items.length && (
        <button className="button button-outline button-sm ledger-more" type="button" onClick={() => setExpanded(true)}>
          Xem tất cả {ledger.total.toLocaleString("vi-VN")} giao dịch
        </button>
      )}
      <p className="fineprint">
        Hiển thị {ledger.items.length} / {ledger.total} giao dịch đã xác nhận. Mã tham chiếu được rút gọn; người
        chọn ẩn danh không hiện tên.
      </p>
    </>
  );
}
