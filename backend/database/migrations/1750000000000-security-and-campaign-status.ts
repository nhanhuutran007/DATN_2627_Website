import { MigrationInterface, QueryRunner } from "typeorm";

export class SecurityAndCampaignStatus1750000000000 implements MigrationInterface {
  name = "SecurityAndCampaignStatus1750000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN failed_login_count INT NOT NULL DEFAULT 0,
        ADD COLUMN locked_until DATETIME NULL
    `);

    await queryRunner.query(`
      ALTER TABLE campaigns
        MODIFY COLUMN status ENUM(
          'draft', 'pending', 'approved', 'rejected', 'needs_info',
          'active', 'paused', 'success', 'failed', 'cancelled', 'ended'
        ) NOT NULL DEFAULT 'draft'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE campaigns
        MODIFY COLUMN status ENUM(
          'draft', 'pending', 'approved', 'rejected',
          'active', 'paused', 'success', 'failed', 'cancelled'
        ) NOT NULL DEFAULT 'draft'
    `);

    await queryRunner.query(`
      ALTER TABLE users
        DROP COLUMN locked_until,
        DROP COLUMN failed_login_count
    `);
  }
}