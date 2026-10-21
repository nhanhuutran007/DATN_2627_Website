import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Xác minh bổ sung (step-up) cho thao tác nhạy cảm bằng mã OTP gửi qua email.
 * - `step_up_codes`: mã 6 số chỉ lưu HMAC, gắn với một mục đích (`purpose`), có hạn dùng,
 *   đếm số lần nhập sai và thời điểm đã dùng.
 */
export class StepUpCodes1790000000011 implements MigrationInterface {
  name = "StepUpCodes1790000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE step_up_codes (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        purpose VARCHAR(30) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT NOT NULL DEFAULT 0,
        used_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_step_up_user_purpose (user_id, purpose, created_at),
        CONSTRAINT fk_step_up_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE step_up_codes`);
  }
}
