import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

export enum DonationStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

@Entity("donations")
export class Donation extends BaseEntity {
  @Column({ name: "user_id" })
  userId!: string;

  @ManyToOne("User", "donations")
  @JoinColumn({ name: "user_id" })
  user!: any;

  @Column({ name: "campaign_id" })
  campaignId!: string;

  @ManyToOne("Campaign", "donations")
  @JoinColumn({ name: "campaign_id" })
  campaign!: any;

  @Column({
    type: "decimal",
    precision: 15,
    scale: 2,
  })
  amount!: number;

  @Column({ length: 3, default: "VND" })
  currency!: string;

  @Column({ type: "enum", enum: DonationStatus, default: DonationStatus.PENDING })
  status!: DonationStatus;

  @Column({ name: "payment_method", length: 50, nullable: true })
  paymentMethod?: string;

  @Column({ name: "transaction_id", length: 255, nullable: true, unique: true })
  transactionId?: string;

  @Column({ name: "idempotency_key", length: 255, unique: true })
  idempotencyKey!: string;

  @Column({ type: "text", nullable: true })
  message?: string;

  @Column({ name: "is_anonymous", default: false })
  isAnonymous!: boolean;

  @Column({ name: "completed_at", type: "datetime", nullable: true })
  completedAt?: Date;
}
