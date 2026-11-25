"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { fetchBackerQuality, type BackerQuality } from "@/lib/api/donations";
import { formatVndCompact } from "@/lib/format";

/**
 * Chỉ số trung tính về người ủng hộ ở thẻ gây quỹ: bao nhiêu người đã từng thanh toán thật trên
 * Góp Mầm (tài khoản ảo chỉ cam kết, không bao giờ trả) và — khi dự án đã tới bước thanh toán —
 * số đã thanh toán so với số đã cam kết. Không đánh giá hay buộc tội dự án.
 */
export function BackerQualityNote({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<BackerQuality | null>(null);

  useEffect(() => {
    let active = true;
    fetchBackerQuality(campaignId)
      .then((loaded) => {
        if (active) setData(loaded);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [campaignId]);

  if (!data || (data.verifiedRatio === null && !data.paymentPhase)) return null;

  return (
    <div className="fund-quality">
      {data.verifiedRatio !== null && (
        <p title="Người đã từng hoàn tất ít nhất một khoản thanh toán trên Góp Mầm">
          <Icon name="shield" size={14} />
          <span>
            <b className="num">{Math.round(data.verifiedRatio * 100)}%</b> người ủng hộ đã từng thanh toán trên Góp Mầm (
            {data.verifiedBackers}/{data.backers} người)
          </span>
        </p>
      )}
      {data.paymentPhase && (
        <p>
          <Icon name="check" size={14} />
          <span>
            Đã thanh toán <b className="num">{formatVndCompact(data.paidAmount)}</b> / cam kết{" "}
            <b className="num">{formatVndCompact(data.committedAmount)}</b>
          </span>
        </p>
      )}
    </div>
  );
}
