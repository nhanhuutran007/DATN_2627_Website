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
];
const NEW_NOTIFICATION_TYPES = ["refund_approved", "refund_rejected", "donation_refunded"];

const enumSql = (values: string[]) => `ENUM(${values.map((v) => `'${v}'`).join(", ")})`;

/**
 * Hoàn tiền: người ủng hộ gửi yêu cầu, admin duyệt (human-in-the-loop). Donation
 * lưu thời điểm, mã hoàn tiền của cổng thanh toán và lý do.
 */
export class Refunds1780000000005 implements MigrationInterface {
  name = "Refunds1780000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refund_requests (
        id CHAR(36) PRIMARY KEY,
        donation_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        admin_notes TEXT NULL,
        reviewed_by CHAR(36) NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_refund_requests_status (status, created_at),
        KEY idx_refund_requests_donation (donation_id, status),
        CONSTRAINT fk_refund_request_donation FOREIGN KEY (donation_id) REFERENCES donations(id),
        CONSTRAINT fk_refund_request_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_refund_request_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE donations
        ADD COLUMN refunded_at DATETIME NULL AFTER completed_at,
        ADD COLUMN refund_reference VARCHAR(255) NULL AFTER refunded_at,
        ADD COLUMN refund_reason VARCHAR(500) NULL AFTER refund_reference
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
    await queryRunner.query(`ALTER TABLE donations DROP COLUMN refund_reason, DROP COLUMN refund_reference, DROP COLUMN refunded_at`);
    await queryRunner.query(`DROP TABLE refund_requests`);
  }
}
