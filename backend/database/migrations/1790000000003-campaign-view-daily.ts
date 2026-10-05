import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Lượt xem chiến dịch theo ngày (UTC) để chủ dự án xem diễn biến theo thời gian
 * và tính tỷ lệ chuyển đổi. Đây là bảng đếm tổng hợp nên khóa chính là cặp
 * (chiến dịch, ngày) thay vì UUID: mỗi lượt xem hợp lệ chỉ cộng 1 vào đúng dòng.
 * `campaigns.view_count` vẫn là tổng tích lũy.
 */
export class CampaignViewDaily1790000000003 implements MigrationInterface {
  name = "CampaignViewDaily1790000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_view_daily (
        campaign_id CHAR(36) NOT NULL,
        view_date DATE NOT NULL,
        views INT NOT NULL DEFAULT 0,
        PRIMARY KEY (campaign_id, view_date),
        CONSTRAINT fk_campaign_view_daily_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE campaign_view_daily`);
  }
}
