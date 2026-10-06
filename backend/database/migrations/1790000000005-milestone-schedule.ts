import { MigrationInterface, QueryRunner } from "typeorm";

const NOTIFICATION_TYPES_BEFORE = [
  "campaign_approved",
  "campaign_rejected",
  "donation_received",
  "milestone_completed",
  "system",
  "campaign_needs_info",
  "campaign_paused",
  "campaign_resumed",
  "campaign_ended",
  "donation_confirmed",
  "progress_update",
  "report_resolved",
  "comment_new",
  "comment_reply",
  "comment_hidden",
  "refund_approved",
  "refund_rejected",
  "donation_refunded",
];
const NEW_NOTIFICATION_TYPES = ["milestone_overdue", "milestone_rescheduled"];

const enumSql = (values: string[]) => `ENUM(${values.map((v) => `'${v}'`).join(", ")})`;

/**
 * Theo dõi chậm tiến độ và lịch sử thay đổi kế hoạch:
 * - `milestones.overdue_notified_at`: lần cuối nhắc chủ dự án mốc quá hạn (job
 *   nhắc lại tối đa 7 ngày/lần; đổi hạn thì đặt lại NULL).
 * - `milestone_revisions`: mỗi lần sửa mốc sau khi chiến dịch phát hành (giá trị
 *   cũ/mới + lý do bắt buộc), công khai cho người ủng hộ.
 */
export class MilestoneSchedule1790000000005 implements MigrationInterface {
  name = "MilestoneSchedule1790000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE milestones ADD COLUMN overdue_notified_at DATETIME NULL AFTER completed_at`);
    await queryRunner.query(`
      CREATE TABLE milestone_revisions (
        id CHAR(36) PRIMARY KEY,
        milestone_id CHAR(36) NOT NULL,
        changed_by CHAR(36) NOT NULL,
        reason VARCHAR(500) NOT NULL,
        old_values TEXT NOT NULL,
        new_values TEXT NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_milestone_revisions_milestone (milestone_id, created_at),
        CONSTRAINT fk_milestone_revisions_milestone FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
        CONSTRAINT fk_milestone_revisions_user FOREIGN KEY (changed_by) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(
      `ALTER TABLE notifications MODIFY type ${enumSql([...NOTIFICATION_TYPES_BEFORE, ...NEW_NOTIFICATION_TYPES])} NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM notifications WHERE type IN (${NEW_NOTIFICATION_TYPES.map((v) => `'${v}'`).join(", ")})`,
    );
    await queryRunner.query(`ALTER TABLE notifications MODIFY type ${enumSql(NOTIFICATION_TYPES_BEFORE)} NOT NULL`);
    await queryRunner.query(`DROP TABLE milestone_revisions`);
    await queryRunner.query(`ALTER TABLE milestones DROP COLUMN overdue_notified_at`);
  }
}
