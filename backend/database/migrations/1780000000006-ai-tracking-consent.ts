import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Đồng ý cho phép ghi nhận hành vi để cá nhân hóa gợi ý (opt-in, mặc định tắt).
 * `ai_consent_updated_at` NULL nghĩa là người dùng chưa từng quyết định.
 */
export class AiTrackingConsent1780000000006 implements MigrationInterface {
  name = "AiTrackingConsent1780000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN ai_tracking_consent TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN ai_consent_updated_at DATETIME NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN ai_consent_updated_at,
        DROP COLUMN ai_tracking_consent
    `);
  }
}
