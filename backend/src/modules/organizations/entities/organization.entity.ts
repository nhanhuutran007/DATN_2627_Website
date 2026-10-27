import { Expose } from "class-transformer";
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";
import { USER_PRIVATE_GROUP } from "../../users/entities/user.entity";

export enum OrganizationType {
  CHARITY_FUND = "charity_fund",
  NGO = "ngo",
  SOCIAL_ENTERPRISE = "social_enterprise",
  EDUCATION = "education",
  HEALTH = "health",
  OTHER = "other",
}

export enum OrganizationStatus {
  PENDING = "pending",
  NEEDS_INFO = "needs_info",
  VERIFIED = "verified",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
}

/**
 * Tổ chức thụ hưởng (quỹ từ thiện, tổ chức phi lợi nhuận, doanh nghiệp xã hội…).
 * Người đại diện đăng ký hồ sơ kèm giấy phép; chỉ khi admin xác minh (`verified`)
 * thì tổ chức mới hiện công khai và nhận chiến dịch gây quỹ.
 */
@Entity("organizations")
export class Organization extends BaseEntity {
  @Column({ length: 140, unique: true })
  slug!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ name: "org_type", type: "enum", enum: OrganizationType })
  type!: OrganizationType;

  /** Số giấy phép/quyết định thành lập — thông tin công khai của pháp nhân. */
  @Column({ name: "registration_number", length: 100 })
  registrationNumber!: string;

  @Column({ name: "issued_by", length: 200 })
  issuedBy!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  category?: string | null;

  @Column({ type: "text" })
  mission!: string;

  @Column({ type: "varchar", length: 300, nullable: true })
  website?: string | null;

  @Column({ length: 200 })
  email!: string;

  @Column({ length: 30 })
  phone!: string;

  @Column({ length: 300 })
  address!: string;

  @Column({ length: 100 })
  province!: string;

  @Column({ name: "logo_url", type: "varchar", length: 500, nullable: true })
  logoUrl?: string | null;

  /** Ảnh giấy phép: chỉ người đại diện và admin xem (không trả ở API công khai). */
  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "document_url", length: 500 })
  documentUrl!: string;

  @Column({ name: "representative_id" })
  representativeId!: string;

  @ManyToOne("User")
  @JoinColumn({ name: "representative_id" })
  representative?: unknown;

  @Column({ name: "representative_title", length: 100 })
  representativeTitle!: string;

  @Column({ type: "enum", enum: OrganizationStatus, default: OrganizationStatus.PENDING })
  status!: OrganizationStatus;

  /** Ghi chú của admin khi yêu cầu bổ sung/từ chối/tạm ngưng (chỉ người đại diện và admin thấy). */
  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "review_notes", type: "text", nullable: true })
  reviewNotes?: string | null;

  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "reviewed_by", type: "char", length: 36, nullable: true })
  reviewedBy?: string | null;

  @Column({ name: "reviewed_at", type: "datetime", nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: "verified_at", type: "datetime", nullable: true })
  verifiedAt?: Date | null;

  /** Lần gửi (lại) hồ sơ gần nhất; hàng chờ xác minh xếp theo cột này. */
  @Column({ name: "submitted_at", type: "datetime" })
  submittedAt!: Date;

  @DeleteDateColumn({ name: "deleted_at" })
  deletedAt?: Date | null;
}
