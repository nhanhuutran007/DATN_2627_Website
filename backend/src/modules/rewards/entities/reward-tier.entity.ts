import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Campaign } from "../../campaigns/entities/campaign.entity";

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

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
