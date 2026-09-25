"use client";

import { useEffect, useState } from "react";

import { fetchCampaignLedger, type CampaignLedger as Ledger } from "@/lib/api/donations";
import { formatDateTime, formatVnd } from "@/lib/format";

type CampaignLedgerProps = {
  campaignId: string;
};

const METHOD_LABEL: Record<string, string> = {
  wallet: "Ví demo",
  wallet_demo: "Ví demo",
  payos: "PayOS sandbox",
};

export function CampaignLedger({ campaignId }: CampaignLedgerProps) {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCampaignLedger(campaignId, 20)
      .then((result) => {
        if (active) setLedger(result);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [campaignId]);

  if (failed) return <p className="empty-line">Không tải được sổ cái giao dịch.</p>;
  if (!ledger) return <p className="empty-line" aria-live="polite">Đang tải sổ cái…</p>;
  if (ledger.items.length === 0) {
    return <p className="empty-line">Chưa có khoản ủng hộ nào được xác nhận.</p>;
  }

  return (
    <>
      <div className="table-wrap">
        <table className="plain-table ledger-table">
          <caption className="sr-only">Các khoản ủng hộ đã được xác nhận, mới nhất trước</caption>
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
      <p className="fineprint">
        Hiển thị {ledger.items.length} / {ledger.total} giao dịch đã xác nhận. Mã tham chiếu được rút gọn; người
        chọn ẩn danh không hiện tên.
      </p>
    </>
  );
}
