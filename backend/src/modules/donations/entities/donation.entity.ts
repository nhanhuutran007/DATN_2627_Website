import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import type { Campaign } from "../../campaigns/entities/campaign.entity";
import type { RewardTier } from "../../rewards/entities/reward-tier.entity";
import type { User } from "../../users/entities/user.entity";

export enum DonationStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  /** Đơn `pending` quá hạn thanh toán (job `DonationExpiryService`). */
  EXPIRED = "expired",
  /** Người ủng hộ hủy hoặc cổng thanh toán báo hủy. */
  CANCELLED = "cancelled",
  /**
   * Đã cam kết (tất cả hoặc không): thẻ/ví đã lưu nhưng CHƯA trừ tiền. Tính vào tiến
   * độ chiến dịch; chỉ trừ tiền khi chiến dịch hết hạn và đạt mục tiêu.
   */
  PLEDGED = "pledged",
  /** Chiến dịch đạt mục tiêu nhưng trừ tiền thẻ thất bại: người ủng hộ có hạn để đổi thẻ. */
  CHARGE_FAILED = "charge_failed",
  /** Chiến dịch không đạt mục tiêu (hoặc bị hủy): cam kết được giải phóng, không trừ tiền. */
  RELEASED = "released",
}

/**
 * Trạng thái được tính vào `currentAmount`/`backerCount` của chiến dịch: tiền đã thu
 * (`completed`) và cam kết chưa trừ (`pledged`, `charge_failed` còn trong hạn đổi thẻ).
 */
export const COUNTED_DONATION_STATUSES: readonly DonationStatus[] = [
  DonationStatus.COMPLETED,
  DonationStatus.PLEDGED,
  DonationStatus.CHARGE_FAILED,
];

export enum RefundMethod {
  GATEWAY = "gateway",
  MANUAL_TRANSFER = "manual_transfer",
  /** Hoàn về ví Góp Mầm (khoản ủng hộ bằng ví). */
  WALLET = "wallet",
}

@Entity("donations")
export class Donation extends BaseEntity {
  @Column({ name: "user_id" })
  userId!: string;

  @ManyToOne("User", "donations")
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "campaign_id" })
  campaignId!: string;

  @ManyToOne("Campaign", "donations")
  @JoinColumn({ name: "campaign_id" })
  campaign!: Campaign;

  /** Mức quà người ủng hộ chọn (null nếu ủng hộ không nhận quà). */
  @Column({ name: "reward_tier_id", type: "varchar", nullable: true })
  rewardTierId?: string | null;

  @ManyToOne("RewardTier")
  @JoinColumn({ name: "reward_tier_id" })
  rewardTier?: RewardTier | null;

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

  /** Mã nội dung chuyển khoản VietQR (vd. `GM7K2QX9AB`) để đối chiếu với sao kê ngân hàng. */
  @Column({ name: "transfer_code", type: "varchar", length: 20, nullable: true, unique: true })
  transferCode?: string | null;

  @Column({ name: "idempotency_key", length: 255, unique: true })
  idempotencyKey!: string;

  @Column({ type: "text", nullable: true })
  message?: string;

  @Column({ name: "is_anonymous", default: false })
  isAnonymous!: boolean;

  @Column({ name: "completed_at", type: "datetime", nullable: true })
  completedAt?: Date;

  @Column({ name: "refunded_at", type: "datetime", nullable: true })
  refundedAt?: Date | null;

  /** Mã hoàn tiền do cổng thanh toán trả về. */
  @Column({ name: "refund_reference", type: "varchar", length: 255, nullable: true })
  refundReference?: string | null;

  @Column({ name: "refund_reason", type: "varchar", length: 500, nullable: true })
  refundReason?: string | null;

  /** `gateway`: cổng thanh toán hoàn; `manual_transfer`: admin chuyển khoản trả lại (khoản qua SePay). */
  @Column({ name: "refund_method", type: "varchar", length: 20, nullable: true })
  refundMethod?: RefundMethod | null;

  /** Lúc cam kết được ghi nhận (thẻ/ví đã lưu, chưa trừ tiền). */
  @Column({ name: "pledged_at", type: "datetime", nullable: true })
  pledgedAt?: Date | null;

  /** Mã khách hàng ở cổng thẻ (Stripe `cus_…`) — không chứa số thẻ. */
  @Column({ name: "payment_customer_ref", type: "varchar", length: 255, nullable: true })
  paymentCustomerRef?: string | null;

  /** Mã phương thức thanh toán đã lưu ở cổng thẻ (Stripe `pm_…`) — không chứa số thẻ. */
  @Column({ name: "payment_method_ref", type: "varchar", length: 255, nullable: true })
  paymentMethodRef?: string | null;

  /** Phiên lưu thẻ gần nhất (Stripe Checkout `cs_…`), để đối soát khi webhook không tới. */
  @Column({ name: "setup_session_ref", type: "varchar", length: 255, nullable: true })
  setupSessionRef?: string | null;

  @Column({ name: "charge_attempts", type: "int", default: 0 })
  chargeAttempts!: number;

  /** Lần trừ tiền thất bại đầu tiên: mốc tính hạn đổi thẻ. */
  @Column({ name: "charge_failed_at", type: "datetime", nullable: true })
  chargeFailedAt?: Date | null;

  @Column({ name: "last_charge_error", type: "varchar", length: 255, nullable: true })
  lastChargeError?: string | null;

  /** Ảnh chứng từ chuyển khoản hoàn (chỉ với `manual_transfer`, không bắt buộc). */
  @Column({ name: "refund_proof_url", type: "varchar", length: 500, nullable: true })
  refundProofUrl?: string | null;
}
