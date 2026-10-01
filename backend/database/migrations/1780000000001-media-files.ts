import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ảnh người dùng tải lên (ảnh chiến dịch, ảnh bài cập nhật tiến độ). Nội dung
 * nằm trong kho lưu trữ (ổ đĩa hoặc S3); bảng này giữ chủ sở hữu, loại file đã
 * kiểm tra bằng magic bytes, kích thước và soft delete.
 */
export class MediaFiles1780000000001 implements MigrationInterface {
  name = "MediaFiles1780000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE media_files (
        id CHAR(36) PRIMARY KEY,
        owner_id CHAR(36) NOT NULL,
        storage_key VARCHAR(120) NOT NULL,
        mime_type VARCHAR(50) NOT NULL,
        size_bytes INT NOT NULL,
        purpose ENUM('campaign_image', 'progress_image') NOT NULL,
        original_name VARCHAR(255) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        UNIQUE KEY uq_media_files_storage_key (storage_key),
        KEY idx_media_files_owner (owner_id, created_at),
        CONSTRAINT fk_media_files_owner FOREIGN KEY (owner_id) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE media_files`);
  }
}
