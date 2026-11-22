import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bình luận trên bài cập nhật dự án: dùng lại bảng `campaign_comments` (kiểm duyệt, báo cáo,
 * xóa mềm có sẵn), thêm `post_id` trỏ tới bài. `post_id` NULL = bình luận/hỏi đáp chung của
 * chiến dịch như trước. Xóa bài thì xóa luôn bình luận của bài.
 */
export class PostComments1790000000026 implements MigrationInterface {
  name = "PostComments1790000000026";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaign_comments ADD COLUMN post_id CHAR(36) NULL AFTER campaign_id`);
    await queryRunner.query(`CREATE INDEX idx_campaign_comments_post ON campaign_comments (post_id, created_at)`);
    await queryRunner.query(
      `ALTER TABLE campaign_comments ADD CONSTRAINT fk_campaign_comments_post FOREIGN KEY (post_id) REFERENCES campaign_posts(id) ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaign_comments DROP FOREIGN KEY fk_campaign_comments_post`);
    await queryRunner.query(`DROP INDEX idx_campaign_comments_post ON campaign_comments`);
    await queryRunner.query(`ALTER TABLE campaign_comments DROP COLUMN post_id`);
  }
}
