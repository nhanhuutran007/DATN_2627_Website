import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Theo dõi chiến dịch: mỗi người theo dõi một chiến dịch tối đa một lần
 * (UNIQUE), nhận thông báo cập nhật như người ủng hộ. Xóa người dùng/chiến
 * dịch thì xóa luôn lượt theo dõi.
 */
export class CampaignFollows1790000000001 implements MigrationInterface {
  name = "CampaignFollows1790000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_follows (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        campaign_id CHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_campaign_follows_user_campaign (user_id, campaign_id),
        KEY idx_campaign_follows_campaign (campaign_id),
        CONSTRAINT fk_campaign_follows_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_follows_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE campaign_follows`);
  }
}
