import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Kết quả duyệt tự động (sàng lọc trước khi admin xét) của mỗi chiến dịch: điểm rủi ro 0–100,
 * mức rủi ro, đề xuất và danh sách từng bước kiểm tra (JSON). Mỗi chiến dịch giữ một bản mới nhất,
 * chạy lại khi chủ dự án gửi duyệt hoặc admin bấm "Kiểm tra lại".
 */
export class CampaignScreenings1790000000028 implements MigrationInterface {
  name = "CampaignScreenings1790000000028";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_screenings (
        id CHAR(36) NOT NULL PRIMARY KEY,
        campaign_id CHAR(36) NOT NULL,
        score INT NOT NULL,
        level VARCHAR(10) NOT NULL,
        recommendation VARCHAR(20) NOT NULL,
        checks JSON NOT NULL,
        rules_version VARCHAR(20) NOT NULL,
        auto_approved TINYINT(1) NOT NULL DEFAULT 0,
        screened_at DATETIME NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_campaign_screenings_campaign (campaign_id),
        KEY idx_campaign_screenings_score (score),
        CONSTRAINT fk_campaign_screenings_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE campaign_screenings`);
  }
}
