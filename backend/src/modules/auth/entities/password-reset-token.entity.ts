import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

@Entity("password_reset_tokens")
export class PasswordResetToken extends BaseEntity {
  @Column({ name: "user_id", length: 36 })
  userId!: string;

  /** SHA-256 (hex) của token gửi qua email; token gốc không được lưu. */
  @Column({ name: "token_hash", length: 64 })
  tokenHash!: string;

  @Column({ name: "expires_at", type: "datetime" })
  expiresAt!: Date;

  @Column({ name: "used_at", type: "datetime", nullable: true })
  usedAt?: Date | null;

  // Kiểu `string | null` được reflect thành Object, nên phải khai báo type rõ ràng.
  @Column({ name: "requested_ip", type: "varchar", length: 45, nullable: true })
  requestedIp?: string | null;
}
