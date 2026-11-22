import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ảnh đại diện lĩnh vực do admin tải lên (`categories.image_url`), thay cho bộ ảnh minh họa có sẵn
 * ở frontend. `media_files.purpose` thêm `category_image` (chỉ admin được tải).
 */
export class CategoryImages1790000000027 implements MigrationInterface {
  name = "CategoryImages1790000000027";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE categories ADD COLUMN image_url VARCHAR(500) NULL AFTER description`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt', 'refund_proof',
          'organization_logo', 'organization_document', 'category_image') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không thu hẹp ENUM được khi còn giá trị mới; bản ghi ảnh lĩnh vực bị bỏ.
    await queryRunner.query(`DELETE FROM media_files WHERE purpose = 'category_image'`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt', 'refund_proof',
          'organization_logo', 'organization_document') NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE categories DROP COLUMN image_url`);
  }
}
