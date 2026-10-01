import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Mức ủng hộ & phần quà của chiến dịch. `claimed_count` chỉ tăng khi khoản ủng
 * hộ được cổng thanh toán xác nhận (update có điều kiện, không vượt
 * `quantity_limit`). Donation lưu mức quà người ủng hộ nhận (nếu có).
 */
export class RewardTiers1780000000004 implements MigrationInterface {
  name = "RewardTiers1780000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reward_tiers (
        id CHAR(36) PRIMARY KEY,
        campaign_id CHAR(36) NOT NULL,
        title VARCHAR(120) NOT NULL,
        description TEXT NOT NULL,
        min_amount DECIMAL(15,2) NOT NULL,
        quantity_limit INT NULL,
        claimed_count INT NOT NULL DEFAULT 0,
        estimated_delivery DATE NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        KEY idx_reward_tiers_campaign (campaign_id, sort_order),
        CONSTRAINT fk_reward_tier_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        CONSTRAINT chk_reward_tier_amount CHECK (min_amount > 0),
        CONSTRAINT chk_reward_tier_claims CHECK (quantity_limit IS NULL OR claimed_count <= quantity_limit)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE donations
        ADD COLUMN reward_tier_id CHAR(36) NULL AFTER campaign_id,
        ADD CONSTRAINT fk_donation_reward_tier FOREIGN KEY (reward_tier_id) REFERENCES reward_tiers(id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE donations DROP FOREIGN KEY fk_donation_reward_tier`);
    await queryRunner.query(`ALTER TABLE donations DROP COLUMN reward_tier_id`);
    await queryRunner.query(`DROP TABLE reward_tiers`);
  }
}
