import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import { User } from "../../users/entities/user.entity";

/** Ví Góp Mầm của một tài khoản: `balance` dùng được, `held` đang giữ cho cam kết. */
@Entity("wallets")
export class Wallet {
  @PrimaryColumn({ name: "user_id", type: "char", length: 36 })
  userId!: string;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  held!: number;

  /** Đã gửi yêu cầu rút, chờ admin chuyển khoản (không dùng ủng hộ được). */
  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  withdrawing!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

export enum WalletTxType {
  /** Nạp tiền qua SePay. */
  TOPUP = "topup",
  /** Ủng hộ bằng ví: chuyển từ số dư sang tiền giữ. */
  HOLD = "hold",
  /** Chiến dịch đạt mục tiêu: trừ hẳn tiền giữ. */
  CAPTURE = "capture",
  /** Không đạt/bị hủy/rút cam kết: tiền giữ trả về số dư. */
  RELEASE = "release",
  /** Admin hoàn khoản ủng hộ đã trừ: cộng lại số dư. */
  REFUND = "refund",
  /** Gửi yêu cầu rút: số dư → chờ rút. */
  WITHDRAW_REQUEST = "withdraw_request",
  /** Admin đã chuyển khoản: trừ hẳn khoản chờ rút. */
  WITHDRAW_PAID = "withdraw_paid",
  /** Admin từ chối hoặc người dùng hủy: chờ rút → số dư. */
  WITHDRAW_CANCEL = "withdraw_cancel",
}

@Entity("wallet_transactions")
export class WalletTransaction extends BaseEntity {
  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ type: "enum", enum: WalletTxType })
  type!: WalletTxType;

  /** Luôn dương; chiều tăng/giảm suy từ `type`. */
  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: number;

  @Column({ name: "balance_after", type: "decimal", precision: 15, scale: 2 })
  balanceAfter!: number;

  @Column({ name: "held_after", type: "decimal", precision: 15, scale: 2 })
  heldAfter!: number;

  @Column({ name: "withdrawing_after", type: "decimal", precision: 15, scale: 2, default: 0 })
  withdrawingAfter!: number;

  @Column({ name: "donation_id", type: "char", length: 36, nullable: true })
  donationId?: string | null;

  @Column({ name: "topup_id", type: "char", length: 36, nullable: true })
  topupId?: string | null;

  @Column({ name: "withdrawal_id", type: "char", length: 36, nullable: true })
  withdrawalId?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  note?: string | null;
}

export enum TopupStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

/** Một lần nạp ví qua SePay; mã `NP…` là `order_invoice_number` gửi SePay. */
@Entity("wallet_topups")
export class WalletTopup extends BaseEntity {
  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: number;

  @Column({ type: "enum", enum: TopupStatus, default: TopupStatus.PENDING })
  status!: TopupStatus;

  @Column({ name: "transfer_code", length: 20, unique: true })
  transferCode!: string;

  @Column({ name: "transaction_id", type: "varchar", length: 255, nullable: true })
  transactionId?: string | null;

  @Column({ name: "completed_at", type: "datetime", nullable: true })
  completedAt?: Date | null;
}

export enum WithdrawalStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
}

/** Yêu cầu rút tiền từ ví về tài khoản ngân hàng; admin chuyển khoản tay rồi duyệt. */
@Entity("wallet_withdrawals")
export class WalletWithdrawal extends BaseEntity {
  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: number;

  @Column({ name: "bank_name", length: 100 })
  bankName!: string;

  @Column({ name: "bank_account_number", length: 30 })
  bankAccountNumber!: string;

  @Column({ name: "bank_account_name", length: 100 })
  bankAccountName!: string;

  @Column({ type: "enum", enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
  status!: WithdrawalStatus;

  /** Mã giao dịch chuyển khoản admin đã thực hiện. */
  @Column({ name: "transfer_reference", type: "varchar", length: 100, nullable: true })
  transferReference?: string | null;

  @Column({ name: "proof_url", type: "varchar", length: 500, nullable: true })
  proofUrl?: string | null;

  @Column({ name: "admin_notes", type: "varchar", length: 500, nullable: true })
  adminNotes?: string | null;

  @Column({ name: "reviewed_by", type: "char", length: 36, nullable: true })
  reviewedBy?: string | null;

  @Column({ name: "reviewed_at", type: "datetime", nullable: true })
  reviewedAt?: Date | null;
}
