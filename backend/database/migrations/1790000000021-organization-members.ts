import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Cộng tác viên của tổ chức (như "Collaborators" của Kickstarter): người đại diện mời
 * tài khoản khác bằng email, gán chức danh và từng quyền; người được mời chấp nhận thì
 * thành `active`. Quyền chỉ áp dụng cho chiến dịch của tổ chức do người đại diện hoặc
 * cộng tác viên tạo (xem `OrganizationAccessService`).
 */
export class OrganizationMembers1790000000021 implements MigrationInterface {
  name = "OrganizationMembers1790000000021";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organization_members (
        id CHAR(36) PRIMARY KEY,
        organization_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        invited_by CHAR(36) NOT NULL,
        title VARCHAR(100) NOT NULL,
        status ENUM('pending', 'active') NOT NULL DEFAULT 'pending',
        can_edit_profile TINYINT(1) NOT NULL DEFAULT 0,
        can_post_updates TINYINT(1) NOT NULL DEFAULT 0,
        can_report_progress TINYINT(1) NOT NULL DEFAULT 0,
        can_manage_rewards TINYINT(1) NOT NULL DEFAULT 0,
        accepted_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_organization_members_org_user (organization_id, user_id),
        KEY idx_organization_members_user (user_id, status),
        CONSTRAINT fk_organization_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        CONSTRAINT fk_organization_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_organization_members_inviter FOREIGN KEY (invited_by) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE organization_members`);
  }
}
