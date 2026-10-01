import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Đối chiếu số liệu quỹ với sổ giao dịch: `current_amount` = tổng tiền và
 * `backer_count` = số giao dịch `completed` của từng chiến dịch (cùng quy tắc
 * cộng dồn trong donations.service). Sửa dữ liệu seed cũ gõ cứng số liệu không
 * khớp giao dịch. Giá trị cũ được lưu lại để `down()` khôi phục.
 */
export class ReconcileCampaignTotals1780000000000 implements MigrationInterface {
  name = "ReconcileCampaignTotals1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_totals_backup_1780000000000 (
        campaign_id CHAR(36) PRIMARY KEY,
        current_amount DECIMAL(15,2) NOT NULL,
        backer_count INT NOT NULL
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      INSERT INTO campaign_totals_backup_1780000000000 (campaign_id, current_amount, backer_count)
      SELECT id, current_amount, backer_count FROM campaigns
    `);
    await queryRunner.query(`
      UPDATE campaigns c
      LEFT JOIN (
        SELECT campaign_id, SUM(amount) AS total, COUNT(*) AS backers
        FROM donations
        WHERE status = 'completed'
        GROUP BY campaign_id
      ) d ON d.campaign_id = c.id
      SET c.current_amount = COALESCE(d.total, 0),
          c.backer_count = COALESCE(d.backers, 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE campaigns c
      JOIN campaign_totals_backup_1780000000000 b ON b.campaign_id = c.id
      SET c.current_amount = b.current_amount,
          c.backer_count = b.backer_count
    `);
    await queryRunner.query(`DROP TABLE campaign_totals_backup_1780000000000`);
  }
}
