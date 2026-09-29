import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Xác minh email sau khi đăng ký: token dùng một lần, chỉ lưu SHA-256 của
 * token (token gốc chỉ nằm trong email), có hạn dùng và thời điểm đã dùng.
 */
export class EmailVerification1770000000001 implements MigrationInterface {
  name = "EmailVerification1770000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE email_verification_tokens (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        token_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_email_verification_token_hash (token_hash),
        KEY idx_email_verification_user (user_id, created_at),
        CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE email_verification_tokens`);
  }
}
