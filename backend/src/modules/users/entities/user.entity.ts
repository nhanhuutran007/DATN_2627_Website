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

  @Column({ name: "email_verified", default: false })
  emailVerified!: boolean;

  @Exclude({ toPlainOnly: true })
  @Column({ name: "failed_login_count", default: 0 })
  failedLoginCount!: number;

  @Exclude({ toPlainOnly: true })
  @Column({ name: "locked_until", type: "datetime", nullable: true })
  lockedUntil?: Date | null;

  @OneToMany("Campaign", "owner")
  campaigns!: any[];

  @OneToMany("Donation", "user")
  donations!: any[];
}
