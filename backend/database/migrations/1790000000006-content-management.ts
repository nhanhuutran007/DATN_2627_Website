import { MigrationInterface, QueryRunner } from "typeorm";

/** Lĩnh vực có sẵn trước khi có bảng danh mục (khớp seed và giao diện cũ). */
const DEFAULT_CATEGORIES = ["Giáo dục", "Môi trường", "Nông nghiệp", "Y tế", "Khởi nghiệp", "Công nghệ"];

/**
 * Quản trị nội dung:
 * - `campaigns.is_featured/featured_at`: admin chọn dự án nổi bật cho trang chủ.
 * - `categories`: danh mục lĩnh vực do admin quản lý (thay danh sách viết cứng).
 *   `campaigns.category` vẫn lưu tên (không đổi schema chiến dịch); đổi tên danh
 *   mục thì service cập nhật luôn các chiến dịch. Tắt danh mục: không nhận chiến
 *   dịch mới, chiến dịch cũ giữ nguyên.
 */
export class ContentManagement1790000000006 implements MigrationInterface {
  name = "ContentManagement1790000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE campaigns
        ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER status,
        ADD COLUMN featured_at DATETIME NULL AFTER is_featured,
        ADD KEY idx_campaigns_featured (is_featured, featured_at)
    `);
    await queryRunner.query(`
      CREATE TABLE categories (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(300) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_categories_name (name)
      ) ENGINE=InnoDB
    `);
    // Danh mục mặc định + mọi lĩnh vực chiến dịch đang dùng (không để chiến dịch cũ mồ côi).
    const used: Array<{ category: string }> = await queryRunner.query(
      `SELECT DISTINCT category FROM campaigns WHERE category IS NOT NULL AND category <> ''`,
    );
    const names = [...new Set([...DEFAULT_CATEGORIES, ...used.map((row) => row.category)])];
    for (const [index, name] of names.entries()) {
      await queryRunner.query(
        `INSERT INTO categories (id, name, sort_order, is_active) VALUES (UUID(), ?, ?, 1)`,
        [name, index],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE categories`);
    await queryRunner.query(`
      ALTER TABLE campaigns
        DROP KEY idx_campaigns_featured,
        DROP COLUMN featured_at,
        DROP COLUMN is_featured
    `);
  }
}
