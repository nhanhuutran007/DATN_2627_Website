import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Cấu hình nền tảng do quản trị viên chỉnh trên giao diện (khóa → giá trị JSON dạng văn bản).
 * Mục đầu tiên là `support_contact`: thông tin liên hệ hỗ trợ hiển thị ở trang /lien-he,
 * header/footer và chính sách quyền riêng tư.
 */
export class PlatformSettings1790000000017 implements MigrationInterface {
  name = "PlatformSettings1790000000017";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE platform_settings (
        setting_key VARCHAR(64) NOT NULL,
        value TEXT NOT NULL,
        updated_by CHAR(36) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (setting_key),
        CONSTRAINT fk_platform_settings_user FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE platform_settings`);
  }
}
