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
];
const NEW_NOTIFICATION_TYPES = ["comment_new", "comment_reply", "comment_hidden"];

const enumSql = (values: string[]) => `ENUM(${values.map((v) => `'${v}'`).join(", ")})`;

/**
 * Bình luận / hỏi đáp trên trang chiến dịch (trả lời 1 cấp), soft delete, ẩn
 * bởi admin kèm lý do. Báo cáo vi phạm có thể nhắm vào một bình luận cụ thể
 * (`reports.comment_id`) để dùng chung hàng đợi kiểm duyệt của admin.
 */
export class CampaignComments1780000000003 implements MigrationInterface {
  name = "CampaignComments1780000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_comments (
        id CHAR(36) PRIMARY KEY,
        campaign_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        parent_id CHAR(36) NULL,
        kind ENUM('comment', 'question') NOT NULL DEFAULT 'comment',
        content TEXT NOT NULL,
        status ENUM('visible', 'hidden') NOT NULL DEFAULT 'visible',
        hidden_reason VARCHAR(500) NULL,
        hidden_by CHAR(36) NULL,
        hidden_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        KEY idx_comments_campaign (campaign_id, parent_id, created_at),
        KEY idx_comments_status (status, created_at),
        CONSTRAINT fk_comment_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_comment_parent FOREIGN KEY (parent_id) REFERENCES campaign_comments(id),
        CONSTRAINT fk_comment_hidden_by FOREIGN KEY (hidden_by) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE reports
        ADD COLUMN comment_id CHAR(36) NULL AFTER campaign_id,
        ADD COLUMN comment_hidden TINYINT(1) NOT NULL DEFAULT 0 AFTER campaign_paused,
        ADD CONSTRAINT fk_report_comment FOREIGN KEY (comment_id) REFERENCES campaign_comments(id)
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
    await queryRunner.query(`DELETE FROM reports WHERE comment_id IS NOT NULL`);
    await queryRunner.query(`ALTER TABLE reports DROP FOREIGN KEY fk_report_comment`);
    await queryRunner.query(`ALTER TABLE reports DROP COLUMN comment_hidden, DROP COLUMN comment_id`);
    await queryRunner.query(`DROP TABLE campaign_comments`);
  }
}
