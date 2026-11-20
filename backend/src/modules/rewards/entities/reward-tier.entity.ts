import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Campaign } from "../../campaigns/entities/campaign.entity";

/** Một món trong phần quà, vd. { name: "Sổ tay dự án", quantity: 1 }. */
export type RewardItem = { name: string; quantity: number };

/** Mức ủng hộ kèm phần quà của chiến dịch. */
@Entity("reward_tiers")
export class RewardTier extends BaseEntity {
  @Column({ name: "campaign_id" })
  campaignId!: string;

  @ManyToOne("Campaign")
  @JoinColumn({ name: "campaign_id" })
  campaign?: Campaign;

  @Column({ length: 120 })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ name: "min_amount", type: "decimal", precision: 15, scale: 2 })
  minAmount!: number;

  /** `null` = không giới hạn số suất. */
  @Column({ name: "quantity_limit", type: "int", nullable: true })
  quantityLimit?: number | null;

  /** Số suất đã có người nhận (chỉ tăng khi thanh toán được xác nhận). */
  @Column({ name: "claimed_count", type: "int", default: 0 })
  claimedCount!: number;

  @Column({ name: "estimated_delivery", type: "date", nullable: true })
  estimatedDelivery?: string | null;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  /** Ảnh minh họa phần quà. */
  @Column({ name: "image_url", type: "varchar", length: 500, nullable: true })
  imageUrl?: string | null;

  /** Các món "Bao gồm" (như Kickstarter); `null` = chỉ có mô tả. */
  @Column({ type: "json", nullable: true })
  items?: RewardItem[] | null;

  /** Cần giao tận nơi → hỏi địa chỉ người nhận; `false` = quà số/ghi danh/không cần gửi. */
  @Column({ name: "requires_shipping", type: "boolean", default: true })
  requiresShipping!: boolean;

  /** Hết hạn chọn quà (quà theo đợt, ưu đãi sớm); `null` = đến hết chiến dịch. */
  @Column({ name: "available_until", type: "datetime", nullable: true })
  availableUntil?: Date | null;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
