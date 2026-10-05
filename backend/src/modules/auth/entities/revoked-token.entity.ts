import { CreateDateColumn, Column, Entity, PrimaryColumn } from "typeorm";

/** `jti` của JWT đã bị thu hồi khi đăng xuất; giữ tới lúc token tự hết hạn. */
@Entity("revoked_tokens")
export class RevokedToken {
  @PrimaryColumn({ length: 36 })
  jti!: string;

  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ name: "expires_at", type: "datetime" })
  expiresAt!: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
