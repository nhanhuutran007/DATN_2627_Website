import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Quên / đặt lại mật khẩu:
 * - `password_reset_tokens`: token dùng một lần, chỉ lưu SHA-256 của token
 *   (token gốc chỉ nằm trong email), có hạn dùng và thời điểm đã dùng.
 * - `users.password_changed_at`: JWT phát hành trước thời điểm này bị từ chối,
 *   nên đặt lại mật khẩu sẽ đăng xuất mọi phiên cũ.
 */
export class PasswordReset1770000000000 implements MigrationInterface {
  name = "PasswordReset1770000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN password_changed_at DATETIME NULL AFTER locked_until
    `);
    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        requested_ip VARCHAR(45) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_password_reset_token_hash (token_hash),
        KEY idx_password_reset_user (user_id, created_at),
        CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE password_reset_tokens`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN password_changed_at`);
  }
}
