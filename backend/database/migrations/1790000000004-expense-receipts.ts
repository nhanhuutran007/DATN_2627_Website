import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Chứng từ chi tiêu cho bài cập nhật tiến độ:
 * - `media_files.purpose` thêm `expense_receipt` (ảnh hóa đơn/biên lai, lưu ở `receipts/`).
 * - `milestone_update_attachments`: mỗi chứng từ gắn với đúng một bài cập nhật và
 *   một file đã tải lên (UNIQUE media_file_id — không dùng lại một chứng từ cho
 *   nhiều khoản chi). Xóa bài cập nhật thì xóa luôn liên kết, file vẫn còn trong kho.
 */
export class ExpenseReceipts1790000000004 implements MigrationInterface {
  name = "ExpenseReceipts1790000000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt') NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE milestone_update_attachments (
        id CHAR(36) PRIMARY KEY,
        milestone_update_id CHAR(36) NOT NULL,
        media_file_id CHAR(36) NOT NULL,
        url VARCHAR(500) NOT NULL,
        caption VARCHAR(200) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_milestone_update_attachments_media (media_file_id),
        KEY idx_milestone_update_attachments_update (milestone_update_id, sort_order),
        CONSTRAINT fk_mu_attachments_update FOREIGN KEY (milestone_update_id) REFERENCES milestone_updates(id) ON DELETE CASCADE,
        CONSTRAINT fk_mu_attachments_media FOREIGN KEY (media_file_id) REFERENCES media_files(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE milestone_update_attachments`);
    // Không thu hẹp ENUM được khi còn giá trị 'expense_receipt'; bản ghi chứng từ bị bỏ.
    await queryRunner.query(`DELETE FROM media_files WHERE purpose = 'expense_receipt'`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar') NOT NULL
    `);
  }
}
