import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Gộp thông báo "có khoản ủng hộ mới" chưa đọc của cùng một chiến dịch thành một dòng
 * (số khoản + tổng tiền) và chỉ mục theo ngày tạo cho job xóa thông báo quá 90 ngày.
 */
export class NotificationGrouping1790000000013 implements MigrationInterface {
  name = "NotificationGrouping1790000000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE notifications ADD COLUMN group_count INT NOT NULL DEFAULT 1 AFTER related_id`,
    );
    await queryRunner.query(`ALTER TABLE notifications ADD COLUMN group_amount DECIMAL(15,2) NULL AFTER group_count`);
    await queryRunner.query(`CREATE INDEX idx_notifications_created ON notifications (created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_notifications_created ON notifications`);
    await queryRunner.query(`ALTER TABLE notifications DROP COLUMN group_amount`);
    await queryRunner.query(`ALTER TABLE notifications DROP COLUMN group_count`);
  }
}
