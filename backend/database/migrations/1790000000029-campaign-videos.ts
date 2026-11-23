import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Video giới thiệu dự án tải lên hệ thống: `media_files.purpose` thêm `campaign_video`.
 * Cột `campaigns.video_url` đã có sẵn (nay nhận link YouTube hoặc đường dẫn video đã tải lên).
 */
export class CampaignVideos1790000000029 implements MigrationInterface {
  name = "CampaignVideos1790000000029";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt', 'refund_proof',
          'organization_logo', 'organization_document', 'category_image', 'campaign_video') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không thu hẹp ENUM được khi còn giá trị mới: bỏ video đã gắn và bản ghi video.
    await queryRunner.query(`UPDATE campaigns SET video_url = NULL WHERE video_url LIKE '/api/v1/media/campaign-videos/%'`);
    await queryRunner.query(`DELETE FROM media_files WHERE purpose = 'campaign_video'`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt', 'refund_proof',
          'organization_logo', 'organization_document', 'category_image') NOT NULL
    `);
  }
}
