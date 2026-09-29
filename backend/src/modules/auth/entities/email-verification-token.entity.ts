import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

@Entity("email_verification_tokens")
export class EmailVerificationToken extends BaseEntity {
  @Column({ name: "user_id", length: 36 })
  userId!: string;

  /** SHA-256 (hex) của token gửi qua email; token gốc không được lưu. */
  @Column({ name: "token_hash", length: 64 })
  tokenHash!: string;

  @Column({ name: "expires_at", type: "datetime" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "datetime", nullable: true })
  usedAt?: Date | null;
}
