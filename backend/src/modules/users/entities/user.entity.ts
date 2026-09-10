import { Column, Entity, OneToMany } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

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

  @Column({ unique: true, length: 255 })
  email!: string;

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

  @Column({ length: 100, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  organization?: string;

  @Column({ name: "email_verified", default: false })
  emailVerified!: boolean;

  @Column({ name: "failed_login_count", default: 0 })
  failedLoginCount!: number;

  @Column({ name: "locked_until", type: "datetime", nullable: true })
  lockedUntil?: Date | null;

  @OneToMany("Campaign", "owner")
  campaigns!: any[];

  @OneToMany("Donation", "user")
  donations!: any[];
}
