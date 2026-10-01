import { MigrationInterface, QueryRunner } from "typeorm";

const OLD_TYPES = ["campaign_approved", "campaign_rejected", "donation_received", "milestone_completed", "system"];
const NEW_TYPES = [
  ...OLD_TYPES,
  "campaign_needs_info",
  "campaign_paused",
  "campaign_resumed",
  "campaign_ended",
  "donation_confirmed",
  "progress_update",
  "report_resolved",
];

const enumSql = (values: string[]) => `ENUM(${values.map((v) => `'${v}'`).join(", ")})`;

/**
 * Thông báo trong ứng dụng: thêm loại sự kiện, đường dẫn để mở đúng trang khi
 * bấm vào, và index cho truy vấn "thông báo chưa đọc của tôi".
 */
export class NotificationsDelivery1780000000002 implements MigrationInterface {
  name = "NotificationsDelivery1780000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE notifications MODIFY type ${enumSql(NEW_TYPES)} NOT NULL`);
    await queryRunner.query(`ALTER TABLE notifications ADD COLUMN link VARCHAR(300) NULL AFTER message`);
    await queryRunner.query(
      `CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read, created_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_notifications_user_read ON notifications`);
    await queryRunner.query(`ALTER TABLE notifications DROP COLUMN link`);
    await queryRunner.query(
      `DELETE FROM notifications WHERE type NOT IN (${OLD_TYPES.map((v) => `'${v}'`).join(", ")})`,
    );
    await queryRunner.query(`ALTER TABLE notifications MODIFY type ${enumSql(OLD_TYPES)} NOT NULL`);
  }
}
