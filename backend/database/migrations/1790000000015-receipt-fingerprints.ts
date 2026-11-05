import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Dấu vân ảnh chứng từ để phát hiện dùng lại, và nguồn cảnh báo `receipt` để nút quét
 * rủi ro không tự đóng cảnh báo chứng từ. Ảnh tải lên trước migration này giữ NULL.
 */
export class ReceiptFingerprints1790000000015 implements MigrationInterface {
  name = "ReceiptFingerprints1790000000015";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE media_files ADD COLUMN content_hash CHAR(64) NULL AFTER original_name`);
    await queryRunner.query(`ALTER TABLE media_files ADD COLUMN perceptual_hash VARCHAR(512) NULL AFTER content_hash`);
    await queryRunner.query(`CREATE INDEX idx_media_files_content_hash ON media_files (content_hash)`);
    await queryRunner.query(`ALTER TABLE risk_alerts MODIFY method ENUM('ai', 'rule', 'receipt') NOT NULL DEFAULT 'ai'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM risk_alerts WHERE method = 'receipt'`);
    await queryRunner.query(`ALTER TABLE risk_alerts MODIFY method ENUM('ai', 'rule') NOT NULL DEFAULT 'ai'`);
    await queryRunner.query(`DROP INDEX idx_media_files_content_hash ON media_files`);
    await queryRunner.query(`ALTER TABLE media_files DROP COLUMN perceptual_hash`);
    await queryRunner.query(`ALTER TABLE media_files DROP COLUMN content_hash`);
  }
}
