import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

/**
 * Lần giải ngân (duy nhất) tiền gây quỹ cho chủ dự án: admin gom mọi khoản đã thu của chiến dịch
 * thành công rồi chuyển khoản tay một lần. Lưu bản sao tài khoản nhận tại thời điểm chuyển để
 * đối soát kể cả khi chủ dự án đổi tài khoản sau đó.
 */
@Entity("campaign_disbursements")
export class CampaignDisbursement extends BaseEntity {
  @Column({ name: "campaign_id", type: "char", length: 36, unique: true })
  campaignId!: string;

  @Column({ type: "decimal", precision: 15, scale: 2 })
  amount!: number;

  /** Số khoản ủng hộ đã thu được gom vào lần giải ngân này. */
  @Column({ name: "donation_count", type: "int" })
  donationCount!: number;

  @Column({ name: "bank_name", length: 100 })
  bankName!: string;

  @Column({ name: "bank_account_number", length: 30 })
  bankAccountNumber!: string;

  @Column({ name: "bank_account_name", length: 100 })
  bankAccountName!: string;

  @Column({ name: "transfer_reference", length: 100 })
  transferReference!: string;

  @Column({ name: "proof_url", type: "varchar", length: 500, nullable: true })
  proofUrl?: string | null;

  @Column({ name: "admin_notes", type: "varchar", length: 500, nullable: true })
  adminNotes?: string | null;

  @Column({ name: "disbursed_by", type: "char", length: 36 })
  disbursedBy!: string;

  @Column({ name: "disbursed_at", type: "datetime" })
  disbursedAt!: Date;
}
