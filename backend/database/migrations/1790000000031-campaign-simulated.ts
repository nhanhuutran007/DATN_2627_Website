import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Đánh dấu dự án MÔ PHỎNG (`npm run seed:ai-history`): AI vẫn học từ chúng, nhưng chúng không
 * hiện ở danh sách/tìm kiếm, "Câu chuyện thành công" hay số liệu công khai của nền tảng.
 * Dự án mô phỏng đã tạo trước migration này được nhận ra qua dòng ghi chú trong mô tả.
 */
export class CampaignSimulated1790000000031 implements MigrationInterface {
  name = "CampaignSimulated1790000000031";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE campaigns ADD COLUMN is_simulated TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured`,
    );
    await queryRunner.query(`CREATE INDEX idx_campaigns_is_simulated ON campaigns (is_simulated)`);
    await queryRunner.query(
      `UPDATE campaigns SET is_simulated = 1 WHERE description LIKE '%Dữ liệu mô phỏng để minh họa chức năng AI%'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_campaigns_is_simulated ON campaigns`);
    await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN is_simulated`);
  }
}
