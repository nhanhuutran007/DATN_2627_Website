import { MigrationInterface, QueryRunner } from "typeorm";

/** Câu hỏi thường gặp do chủ dự án tự soạn cho từng dự án (như mục FAQ của Kickstarter). */
export class CampaignFaqs1790000000037 implements MigrationInterface {
  name = "CampaignFaqs1790000000037";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_faqs (
        id CHAR(36) PRIMARY KEY,
        campaign_id CHAR(36) NOT NULL,
        question VARCHAR(300) NOT NULL,
        answer TEXT NOT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_campaign_faqs_campaign (campaign_id, sort_order),
        CONSTRAINT fk_campaign_faq_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE campaign_faqs`);
  }
}
