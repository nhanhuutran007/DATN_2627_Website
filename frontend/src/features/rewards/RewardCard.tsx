import Image from "next/image";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import { resolveMediaUrl } from "@/lib/api";
import { deliveryLabel, isRewardAvailable, type RewardTier } from "@/lib/api/rewards";
import { formatVnd } from "@/lib/format";

/** Hạn chọn quà: "Chọn đến 30/11/2026"; đã quá hạn (máy chủ báo không còn chọn được) thì ghi rõ. */
function deadlineLabel(tier: RewardTier, available: boolean): string | null {
  if (!tier.availableUntil) return null;
  const soldOut = tier.remaining === 0;
  if (!available && tier.isActive && !soldOut) return "Đã hết hạn chọn";
  return `Chọn đến ${new Date(tier.availableUntil).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`;
}

type RewardCardProps = {
  tier: RewardTier;
  /** Nút/ liên kết hành động ở chân thẻ ("Chọn quà này"). */
  action?: ReactNode;
  /** Thẻ đang được chọn (trang ủng hộ). */
  selected?: boolean;
};

/**
 * Thẻ phần quà kiểu Kickstarter: ảnh, "Ủng hộ từ X ₫", tên, mô tả, danh sách món
 * bao gồm, dự kiến giao, cách giao, số người đã chọn và số suất/hạn còn lại.
 */
export function RewardCard({ tier, action, selected = false }: RewardCardProps) {
  const available = isRewardAvailable(tier);
  const soldOut = tier.remaining === 0;
  const delivery = deliveryLabel(tier.estimatedDelivery);
  const deadline = deadlineLabel(tier, available);
  const items = tier.items ?? [];
  const shipping = tier.requiresShipping ?? true;

  return (
    <article className={`reward-card${selected ? " is-selected" : ""}${available ? "" : " is-unavailable"}`}>
      {tier.imageUrl && (
        <div className="reward-card-media">
          <Image src={resolveMediaUrl(tier.imageUrl)} alt="" fill sizes="(max-width: 700px) 100vw, 360px" unoptimized />
        </div>
      )}
      <div className="reward-card-body">
        <p className="reward-card-price">Ủng hộ từ <b className="num">{formatVnd(tier.minAmount)}</b></p>
        <h3 className="reward-card-title">{tier.title}</h3>
        <p className="reward-card-desc">{tier.description}</p>

        {items.length > 0 && (
          <div className="reward-card-block">
            <p className="reward-card-label">Bao gồm</p>
            <ul className="reward-card-items">
              {items.map((item, index) => (
                <li key={`${item.name}-${index}`}>
                  {item.quantity > 1 && <span className="num">{item.quantity}× </span>}
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="reward-card-facts">
          {delivery && (
            <div>
              <dt>Dự kiến giao</dt>
              <dd>{delivery}</dd>
            </div>
          )}
          <div>
            <dt>Cách nhận</dt>
            <dd>{shipping ? "Gửi tận nơi trong Việt Nam" : "Không cần giao (quà số/ghi danh)"}</dd>
          </div>
        </dl>

        <p className="reward-card-meta">
          <span><Icon name="users" size={14} /> <b className="num">{tier.claimedCount.toLocaleString("vi-VN")}</b> người ủng hộ</span>
          {tier.quantityLimit !== null && (
            <span className={soldOut ? "reward-card-limit is-out" : "reward-card-limit"}>
              {soldOut ? "Đã hết suất" : `Giới hạn · còn ${tier.remaining}/${tier.quantityLimit}`}
            </span>
          )}
          {deadline && <span className="reward-card-limit"><Icon name="clock" size={14} /> {deadline}</span>}
          {!tier.isActive && <span className="reward-card-limit is-out">Ngừng nhận</span>}
        </p>
        {action && <div className="reward-card-action">{action}</div>}
      </div>
    </article>
  );
}
