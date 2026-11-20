import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Mức quà chi tiết như Kickstarter: ảnh minh họa, danh sách món "Bao gồm" (tên + số
 * lượng), có cần giao tận nơi không (quà số/không cần địa chỉ) và hạn chọn quà.
 */
export class RewardTierDetails1790000000022 implements MigrationInterface {
  name = "RewardTierDetails1790000000022";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reward_tiers
        ADD COLUMN image_url VARCHAR(500) NULL,
        ADD COLUMN items JSON NULL,
        ADD COLUMN requires_shipping TINYINT(1) NOT NULL DEFAULT 1,
        ADD COLUMN available_until DATETIME NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE reward_tiers
        DROP COLUMN image_url,
        DROP COLUMN items,
        DROP COLUMN requires_shipping,
        DROP COLUMN available_until
    `);
  }
}
