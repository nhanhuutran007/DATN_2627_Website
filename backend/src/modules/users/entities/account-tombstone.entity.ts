import { Column, Entity } from "typeorm";

import { BaseEntity } from "../../../common/base.entity";

/**
 * Dấu vết của một tài khoản đã xóa: chỉ lưu mã băm định danh (không lưu email/SĐT/số tài khoản
 * gốc) để đối chiếu khi có người đăng ký lại — chặn tài khoản từng bị khóa vì vi phạm quay lại,
 * mang số lần bỏ cam kết sang tài khoản mới, và cảnh báo admin khi định danh cũ xuất hiện lại.
 */
@Entity("account_tombstones")
export class AccountTombstone extends BaseEntity {
  /** Id tài khoản cũ (hàng `users` vẫn còn, đã ẩn danh hóa). */
  @Column({ name: "user_id", type: "char", length: 36 })
  userId!: string;

  @Column({ name: "email_hash", type: "char", length: 64 })
  emailHash!: string;

  @Column({ name: "google_hash", type: "char", length: 64, nullable: true })
  googleHash?: string | null;

  @Column({ name: "phone_hashes", type: "json" })
  phoneHashes!: string[];

  @Column({ name: "bank_hashes", type: "json" })
  bankHashes!: string[];

  /** Tài khoản đã bị khóa vì vi phạm khi bị xóa → không cho đăng ký lại bằng định danh này. */
  @Column({ name: "was_banned", type: "boolean", default: false })
  wasBanned!: boolean;

  @Column({ name: "ban_reason", type: "varchar", length: 500, nullable: true })
  banReason?: string | null;

  @Column({ name: "abandoned_pledges", type: "int", default: 0 })
  abandonedPledges!: number;

  @Column({ type: "varchar", length: 20 })
  role!: string;

  /** `self`: người dùng tự xóa; `admin`: quản trị viên xóa tài khoản vi phạm. */
  @Column({ name: "deleted_by", type: "varchar", length: 10 })
  deletedBy!: "self" | "admin";

  @Column({ type: "varchar", length: 500, nullable: true })
  reason?: string | null;

  /** Tài khoản mới đăng ký lại bằng cùng email (nếu có). */
  @Column({ name: "reused_by", type: "char", length: 36, nullable: true })
  reusedBy?: string | null;
}
