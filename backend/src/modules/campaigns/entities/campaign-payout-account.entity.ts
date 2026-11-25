import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

/** Tài khoản ngân hàng nhận tiền gây quỹ của một chiến dịch (chỉ chủ dự án và admin xem). */
@Entity("campaign_payout_accounts")
export class CampaignPayoutAccount {
  @PrimaryColumn({ name: "campaign_id", type: "char", length: 36 })
  campaignId!: string;

  @Column({ name: "bank_name", length: 100 })
  bankName!: string;

  @Column({ name: "bank_account_number", length: 30 })
  bankAccountNumber!: string;

  @Column({ name: "bank_account_name", length: 100 })
  bankAccountName!: string;

  @Column({ name: "updated_by", type: "char", length: 36 })
  updatedBy!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
