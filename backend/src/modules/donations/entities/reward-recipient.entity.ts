import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * Người nhận quà của một khoản ủng hộ có chọn mức quà. Bảng riêng (khóa chính = `donation_id`)
 * để thông tin cá nhân không lộ qua API giao dịch; chỉ `GET /campaigns/:id/reward-claims` đọc.
 */
@Entity("reward_recipients")
export class RewardRecipient {
  @PrimaryColumn({ name: "donation_id", type: "char", length: 36 })
  donationId!: string;

  @Column({ name: "recipient_name", length: 120 })
  recipientName!: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 300 })
  address!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
