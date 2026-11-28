import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tự xóa tài khoản kiểu Kickstarter: "xóa nhưng không mất dấu".
 * - `users.deleted_at`: tài khoản đã xóa được ẩn danh hóa tại chỗ (giữ id để sổ cái, bình luận,
 *   nhật ký kiểm toán không gãy), email được giải phóng để đăng ký lại.
 * - `users.inherited_abandoned_pledges`: số lần bỏ cam kết mang sang tài khoản mới đăng ký lại
 *   bằng cùng email (không "rửa" được giới hạn cam kết bằng cách xóa rồi tạo lại).
 * - `account_tombstones`: dấu vết chỉ gồm mã băm (HMAC) của email, Google ID, số điện thoại, số tài
 *   khoản ngân hàng — đủ để đối chiếu chống lách lệnh cấm mà không lưu lại dữ liệu cá nhân gốc.
 */
export class AccountDeletion1790000000040 implements MigrationInterface {
  name = "AccountDeletion1790000000040";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN inherited_abandoned_pledges INT NOT NULL DEFAULT 0`);
    await queryRunner.query(`
      CREATE TABLE account_tombstones (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        email_hash CHAR(64) NOT NULL,
        google_hash CHAR(64) NULL,
        phone_hashes JSON NOT NULL,
        bank_hashes JSON NOT NULL,
        was_banned TINYINT(1) NOT NULL DEFAULT 0,
        ban_reason VARCHAR(500) NULL,
        abandoned_pledges INT NOT NULL DEFAULT 0,
        role VARCHAR(20) NOT NULL,
        deleted_by VARCHAR(10) NOT NULL,
        reason VARCHAR(500) NULL,
        reused_by CHAR(36) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_tombstones_email (email_hash),
        KEY idx_tombstones_google (google_hash),
        KEY idx_tombstones_user (user_id),
        CONSTRAINT fk_tombstones_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE account_tombstones`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN inherited_abandoned_pledges`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN deleted_at`);
  }
}
