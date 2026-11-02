import { Exclude, Expose } from "class-transformer";
import { Column, Entity, OneToMany } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

/**
 * Nhóm serialize cho dữ liệu liên hệ (email, số điện thoại). Chỉ controller
 * dành cho chính chủ/admin bật nhóm này qua `@SerializeOptions`; ở mọi nơi
 * khác (vd. `owner` trong API chiến dịch công khai) các trường này bị ẩn.
 */
export const USER_PRIVATE_GROUP = "user:private";

export enum UserRole {
  USER = "user",
  CAMPAIGN_OWNER = "campaign_owner",
  ADMIN = "admin",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BANNED = "banned",
}

@Entity("users")
export class User extends BaseEntity {
  @Column({ length: 100 })
  name!: string;

  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ unique: true, length: 255 })
  email!: string;

  // Không bao giờ trả ra API (ClassSerializerInterceptor toàn cục trong main.ts)
  @Exclude({ toPlainOnly: true })
  @Column({ name: "password_hash", length: 255 })
  passwordHash!: string;

  /** Mã tài khoản Google (`sub`) khi người dùng đăng nhập bằng Google; NULL nếu chưa liên kết. */
  @Exclude({ toPlainOnly: true })
  @Column({ name: "google_id", type: "varchar", length: 64, nullable: true, unique: true })
  googleId?: string | null;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ length: 255, nullable: true })
  avatar?: string;

  @Column({ length: 500, nullable: true })
  bio?: string;

  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ length: 100, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  organization?: string;

  /**
   * Liên hệ công khai do chủ dự án tự điền, chỉ hiện khi người đã đăng nhập bấm "Liên hệ" ở trang dự án
   * (`GET /campaigns/:id/contact`); không kèm trong dữ liệu chiến dịch công khai.
   */
  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "contact_email", type: "varchar", length: 255, nullable: true })
  contactEmail?: string | null;

  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "contact_phone", type: "varchar", length: 30, nullable: true })
  contactPhone?: string | null;

  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "contact_address", type: "varchar", length: 300, nullable: true })
  contactAddress?: string | null;

  @Column({ name: "email_verified", default: false })
  emailVerified!: boolean;

  @Exclude({ toPlainOnly: true })
  @Column({ name: "failed_login_count", default: 0 })
  failedLoginCount!: number;

  @Exclude({ toPlainOnly: true })
  @Column({ name: "locked_until", type: "datetime", nullable: true })
  lockedUntil?: Date | null;

  /** JWT phát hành trước thời điểm này không còn hợp lệ (đổi/đặt lại mật khẩu). */
  @Exclude({ toPlainOnly: true })
  @Column({ name: "password_changed_at", type: "datetime", nullable: true })
  passwordChangedAt?: Date | null;

  /** "Đăng xuất khỏi mọi thiết bị": JWT phát hành trước thời điểm này bị từ chối. */
  @Exclude({ toPlainOnly: true })
  @Column({ name: "sessions_revoked_at", type: "datetime", nullable: true })
  sessionsRevokedAt?: Date | null;

  /** Đồng ý ghi nhận hành vi để cá nhân hóa gợi ý AI (opt-in, mặc định tắt). */
  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "ai_tracking_consent", default: false })
  aiTrackingConsent!: boolean;

  /** NULL = người dùng chưa từng quyết định (frontend hiển thị lời mời). */
  @Expose({ groups: [USER_PRIVATE_GROUP] })
  @Column({ name: "ai_consent_updated_at", type: "datetime", nullable: true })
  aiConsentUpdatedAt?: Date | null;

  @OneToMany("Campaign", "owner")
  campaigns!: any[];

  @OneToMany("Donation", "user")
  donations!: any[];
}
