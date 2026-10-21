import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

/** Thao tác cần xác minh bổ sung bằng mã OTP qua email. */
export enum StepUpPurpose {
  CHANGE_PASSWORD = "change_password",
  REFUND_REQUEST = "refund_request",
  ADMIN_REFUND = "admin_refund",
}

@Entity("step_up_codes")
export class StepUpCode extends BaseEntity {
  @Column({ name: "user_id", length: 36 })
  userId!: string;

  @Column({ type: "varchar", length: 30 })
  purpose!: StepUpPurpose;

  /** HMAC-SHA256 (hex) của mã 6 số; mã gốc chỉ nằm trong email. */
  @Column({ name: "code_hash", length: 64 })
  codeHash!: string;

  @Column({ name: "expires_at", type: "datetime" })
  expiresAt!: Date;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ name: "used_at", type: "datetime", nullable: true })
  usedAt?: Date | null;
}
