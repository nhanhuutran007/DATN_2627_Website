import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Nhắc người theo dõi khi dự án đang gây quỹ sắp hết hạn (như "Remind me" của
 * Kickstarter). `reminded_at` đánh dấu đã nhắc để job chạy lại không nhắc hai lần.
 */
export class FollowEndingReminders1790000000020 implements MigrationInterface {
  name = "FollowEndingReminders1790000000020";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaign_follows ADD COLUMN reminded_at DATETIME NULL`);
    await queryRunner.query(`CREATE INDEX idx_campaign_follows_reminder ON campaign_follows(reminded_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_campaign_follows_reminder ON campaign_follows`);
    await queryRunner.query(`ALTER TABLE campaign_follows DROP COLUMN reminded_at`);
  }
}
