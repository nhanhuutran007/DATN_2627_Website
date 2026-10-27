import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tổ chức thụ hưởng (theo "Nonprofit" của GoFundMe):
 * - `organizations`: hồ sơ tổ chức do người đại diện đăng ký; admin xác minh giấy tờ pháp lý
 *   (pending → needs_info ⇄ pending → verified | rejected; verified → suspended ⇄ verified).
 *   Chỉ tổ chức `verified` hiện công khai và nhận chiến dịch gây quỹ.
 * - `campaigns.organization_id`: chiến dịch gây quỹ cho một tổ chức (NULL = gây quỹ cá nhân như cũ).
 * - `media_files.purpose` thêm `organization_logo`, `organization_document` (ảnh chụp giấy phép).
 */
export class Organizations1790000000012 implements MigrationInterface {
  name = "Organizations1790000000012";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organizations (
        id CHAR(36) PRIMARY KEY,
        slug VARCHAR(140) NOT NULL,
        name VARCHAR(200) NOT NULL,
        org_type ENUM('charity_fund', 'ngo', 'social_enterprise', 'education', 'health', 'other') NOT NULL,
        registration_number VARCHAR(100) NOT NULL,
        issued_by VARCHAR(200) NOT NULL,
        category VARCHAR(100) NULL,
        mission TEXT NOT NULL,
        website VARCHAR(300) NULL,
        email VARCHAR(200) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        address VARCHAR(300) NOT NULL,
        province VARCHAR(100) NOT NULL,
        logo_url VARCHAR(500) NULL,
        document_url VARCHAR(500) NOT NULL,
        representative_id CHAR(36) NOT NULL,
        representative_title VARCHAR(100) NOT NULL,
        status ENUM('pending', 'needs_info', 'verified', 'rejected', 'suspended') NOT NULL DEFAULT 'pending',
        review_notes TEXT NULL,
        reviewed_by CHAR(36) NULL,
        reviewed_at DATETIME NULL,
        verified_at DATETIME NULL,
        submitted_at DATETIME NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        deleted_at DATETIME(6) NULL,
        UNIQUE KEY uq_organizations_slug (slug),
        KEY idx_organizations_status (status, submitted_at),
        KEY idx_organizations_registration (registration_number),
        CONSTRAINT fk_organization_representative FOREIGN KEY (representative_id) REFERENCES users (id),
        CONSTRAINT fk_organization_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE campaigns
        ADD COLUMN organization_id CHAR(36) NULL AFTER owner_id,
        ADD KEY idx_campaigns_organization (organization_id),
        ADD CONSTRAINT fk_campaign_organization FOREIGN KEY (organization_id) REFERENCES organizations (id)
    `);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt', 'refund_proof',
          'organization_logo', 'organization_document') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không thu hẹp ENUM được khi còn giá trị mới; bản ghi ảnh của tổ chức bị bỏ.
    await queryRunner.query(`DELETE FROM media_files WHERE purpose IN ('organization_logo', 'organization_document')`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt', 'refund_proof') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE campaigns
        DROP FOREIGN KEY fk_campaign_organization,
        DROP KEY idx_campaigns_organization,
        DROP COLUMN organization_id
    `);
    await queryRunner.query(`DROP TABLE organizations`);
  }
}
