import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ApiError } from "@/lib/api";
import { imageForCampaign } from "@/lib/api/campaigns";
import { cancelDonation, type ApiDonation } from "@/lib/api/donations";
import { coverFor } from "@/lib/covers";
import { formatVnd, paymentMethodLabel } from "@/lib/format";

const STATUS_LABEL: Record<ApiDonation["status"], { label: string; tone: string }> = {
  completed: { label: "Đã xác nhận", tone: "tag-green" },
  pending: { label: "Đang xử lý", tone: "tag-amber" },
  failed: { label: "Thất bại", tone: "tag-red" },
  refunded: { label: "Đã hoàn tiền", tone: "tag-blue" },
  expired: { label: "Hết hạn thanh toán", tone: "" },
  cancelled: { label: "Đã hủy", tone: "" },
};

export type MyDonation = ApiDonation & { rewardTier?: { title: string } | null };

/** Số khoản hiện lúc đầu và thêm vào mỗi lần bấm "Xem thêm". */
const PAGE_STEP = 10;

type MyDonationsProps = {
  items: MyDonation[];
  /** Gọi khi một khoản đổi trạng thái tại chỗ (vd. vừa hủy giao dịch chờ). */
  onChange: (updated: MyDonation) => void;
};

/** Lịch sử ủng hộ của người dùng hiện tại (mới nhất trước), kèm ảnh dự án và link biên nhận. */
export function MyDonations({ items, onChange }: MyDonationsProps) {
  const [visible, setVisible] = useState(PAGE_STEP);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const cancel = async (donation: MyDonation) => {
    setBusyId(donation.id);
    setActionError("");
    try {
      const updated = await cancelDonation(donation.id);
      onChange({ ...donation, status: updated.status });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Không hủy được giao dịch, vui lòng thử lại.");
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="activity-empty">
        <p>Các khoản bạn ủng hộ sẽ hiện ở đây, kèm biên nhận để lưu hoặc in.</p>
        <Link className="button button-outline" href="/du-an">Khám phá dự án</Link>
      </div>
    );
  }

  return (
    <>
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      <ul className="activity-list">
        {items.slice(0, visible).map((d) => {
          const status = STATUS_LABEL[d.status];
          const hasReceipt = d.status === "completed" || d.status === "refunded";
          const date = d.completedAt ?? d.createdAt;
          const cover = d.campaign
            ? coverFor({ image: imageForCampaign({ category: d.campaign.category ?? "", title: d.campaign.title, id: d.campaign.id }), imageUrl: d.campaign.imageUrl ?? undefined, title: d.campaign.title })
            : null;
          return (
            <li className="activity-item" key={d.id}>
              <span className="activity-thumb" aria-hidden="true">
                {cover && <Image src={cover.src} alt="" fill sizes="72px" unoptimized={!cover.illustrative} />}
              </span>
              <div className="activity-body">
                <p className="activity-title">
                  {d.campaign ? <Link href={`/du-an/${d.campaign.id}`}>{d.campaign.title}</Link> : "Chiến dịch không còn tồn tại"}
                </p>
                <p className="activity-meta">
                  {date ? new Date(date).toLocaleDateString("vi-VN") : "—"}
                  {d.paymentMethod && <> · {paymentMethodLabel(d.paymentMethod)}</>}
                  {d.rewardTier && <> · Quà: {d.rewardTier.title}</>}
                </p>
                <div className="activity-links">
                  {hasReceipt && <Link href={`/bien-nhan/${d.id}`}>Biên nhận</Link>}
                  {d.status === "pending" && (
                    <button className="link-button" type="button" disabled={busyId === d.id} onClick={() => cancel(d)}>
                      Hủy giao dịch<span className="sr-only"> {formatVnd(Number(d.amount))}</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="activity-side">
                <strong className="num">{formatVnd(Number(d.amount))}</strong>
                <span className={`tag ${status.tone}`}>{status.label}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {items.length > PAGE_STEP && (
        <div className="activity-more">
          <p className="hint" role="status">Đang hiển thị {Math.min(visible, items.length)}/{items.length} khoản ủng hộ</p>
          {visible < items.length ? (
            <button className="button button-outline button-sm" type="button" onClick={() => setVisible((n) => n + PAGE_STEP)}>
              Xem thêm {Math.min(PAGE_STEP, items.length - visible)} khoản
            </button>
          ) : (
            <button className="button button-outline button-sm" type="button" onClick={() => setVisible(PAGE_STEP)}>
              Thu gọn
            </button>
          )}
        </div>
      )}
    </>
  );
}
