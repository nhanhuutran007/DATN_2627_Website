import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bổ sung cho bảng `reports` (đã tạo ở init-schema) để admin xử lý báo cáo vi
 * phạm: ai xử lý (`resolved_by`), chiến dịch có bị tạm dừng theo báo cáo không,
 * và index cho hàng đợi kiểm duyệt (lọc theo trạng thái / chiến dịch / người báo cáo).
 */
export class ModerationReports1760000000002 implements MigrationInterface {
  name = "ModerationReports1760000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reports
        ADD COLUMN resolved_by CHAR(36) NULL AFTER admin_notes,
        ADD COLUMN campaign_paused TINYINT(1) NOT NULL DEFAULT 0 AFTER resolved_by,
        ADD CONSTRAINT fk_report_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)
    `);
    await queryRunner.query(`CREATE INDEX idx_report_status ON reports(status, created_at)`);
    await queryRunner.query(`CREATE INDEX idx_report_campaign_reporter ON reports(campaign_id, reporter_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // MySQL/MariaDB bỏ index ngầm của fk_report_campaign khi index kép
    // (campaign_id, ...) được tạo ở up(); phải còn một index khác bắt đầu bằng
    // campaign_id thì mới drop được index kép.
    const [{ n }] = (await queryRunner.query(`
      SELECT COUNT(*) AS n FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reports'
        AND COLUMN_NAME = 'campaign_id' AND SEQ_IN_INDEX = 1
        AND INDEX_NAME <> 'idx_report_campaign_reporter'
    `)) as Array<{ n: number | string }>;
    if (Number(n) === 0) {
      await queryRunner.query(`CREATE INDEX idx_report_campaign ON reports(campaign_id)`);
    }
    await queryRunner.query(`DROP INDEX idx_report_campaign_reporter ON reports`);
    await queryRunner.query(`DROP INDEX idx_report_status ON reports`);
    await queryRunner.query(`ALTER TABLE reports DROP FOREIGN KEY fk_report_resolver`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN campaign_paused, DROP COLUMN resolved_by`);
  }
}
