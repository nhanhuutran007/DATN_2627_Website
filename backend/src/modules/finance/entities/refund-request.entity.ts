import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Donation } from "../../donations/entities/donation.entity";
import type { User } from "../../users/entities/user.entity";

export enum RefundRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("refund_requests")
export class RefundRequest extends BaseEntity {
  @Column({ name: "donation_id" })
  donationId!: string;

  @ManyToOne("Donation")
  @JoinColumn({ name: "donation_id" })
  donation?: Donation;

  @Column({ name: "user_id" })
  userId!: string;

  @ManyToOne("User")
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ type: "text" })
  reason!: string;

  @Column({ type: "enum", enum: RefundRequestStatus, default: RefundRequestStatus.PENDING })
  status!: RefundRequestStatus;

  @Column({ name: "admin_notes", type: "text", nullable: true })
  adminNotes?: string | null;

  @Column({ name: "reviewed_by", type: "varchar", nullable: true })
  reviewedBy?: string | null;

  @Column({ name: "reviewed_at", type: "datetime", nullable: true })
  reviewedAt?: Date | null;
}
