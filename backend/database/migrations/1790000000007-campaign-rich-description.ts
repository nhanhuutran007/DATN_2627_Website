import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Mô tả chiến dịch chuyển sang HTML từ trình soạn thảo (định dạng, ảnh, bảng):
 * TEXT (64 KB) không đủ chỗ, nâng lên MEDIUMTEXT (16 MB).
 */
export class CampaignRichDescription1790000000007 implements MigrationInterface {
  name = "CampaignRichDescription1790000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaigns MODIFY description MEDIUMTEXT NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaigns MODIFY description TEXT NOT NULL`);
  }
}
