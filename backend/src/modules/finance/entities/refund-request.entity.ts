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

  /** Tài khoản nhận hoàn (bắt buộc với khoản qua SePay — admin chuyển khoản trả lại thủ công). */
  @Column({ name: "bank_name", type: "varchar", length: 100, nullable: true })
  bankName?: string | null;

  @Column({ name: "bank_account_number", type: "varchar", length: 30, nullable: true })
  bankAccountNumber?: string | null;

  @Column({ name: "bank_account_name", type: "varchar", length: 100, nullable: true })
  bankAccountName?: string | null;

  @Column({ type: "enum", enum: RefundRequestStatus, default: RefundRequestStatus.PENDING })
  status!: RefundRequestStatus;

  @Column({ name: "admin_notes", type: "text", nullable: true })
  adminNotes?: string | null;

  @Column({ name: "reviewed_by", type: "varchar", nullable: true })
  reviewedBy?: string | null;

  @Column({ name: "reviewed_at", type: "datetime", nullable: true })
  reviewedAt?: Date | null;
}
