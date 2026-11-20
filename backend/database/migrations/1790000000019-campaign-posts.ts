import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bài cập nhật dự án dạng bài đăng (như mục "Updates" của Kickstarter): chủ dự án
 * đăng tin tức có tiêu đề, đánh số "Cập nhật #N" theo từng chiến dịch, chọn công
 * khai hoặc chỉ người ủng hộ xem; người dùng thích (like) được bài.
 * Tách khỏi `milestone_updates` (báo cáo tiến độ/chi tiêu theo mốc, có chứng từ).
 */
export class CampaignPosts1790000000019 implements MigrationInterface {
  name = "CampaignPosts1790000000019";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_posts (
        id CHAR(36) PRIMARY KEY,
        campaign_id CHAR(36) NOT NULL,
        author_id CHAR(36) NOT NULL,
        number INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        image_url VARCHAR(500) NULL,
        visibility ENUM('public', 'backers') NOT NULL DEFAULT 'public',
        like_count INT NOT NULL DEFAULT 0,
        edited_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_campaign_posts_number (campaign_id, number),
        KEY idx_campaign_posts_campaign (campaign_id, created_at),
        CONSTRAINT fk_campaign_posts_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_posts_author FOREIGN KEY (author_id) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE campaign_post_likes (
        id CHAR(36) PRIMARY KEY,
        post_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_campaign_post_likes_post_user (post_id, user_id),
        KEY idx_campaign_post_likes_user (user_id),
        CONSTRAINT fk_campaign_post_likes_post FOREIGN KEY (post_id) REFERENCES campaign_posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE campaign_post_likes`);
    await queryRunner.query(`DROP TABLE campaign_posts`);
  }
}
