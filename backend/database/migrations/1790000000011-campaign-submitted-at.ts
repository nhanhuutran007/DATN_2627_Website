import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Thời điểm chủ dự án gửi duyệt lần gần nhất: hàng chờ duyệt xếp theo cột này (ai gửi trước duyệt trước)
 * và admin thấy hồ sơ đã chờ bao lâu. Dữ liệu cũ lấy từ audit `campaign.submit`; hồ sơ đang chờ
 * mà không có audit (vd. dữ liệu seed) lấy ngày tạo.
 */
export class CampaignSubmittedAt1790000000011 implements MigrationInterface {
  name = "CampaignSubmittedAt1790000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaigns ADD COLUMN submitted_at DATETIME NULL AFTER status`);
    await queryRunner.query(`
      UPDATE campaigns c
      SET submitted_at = (
        SELECT MAX(a.created_at) FROM audit_logs a
        WHERE a.action = 'campaign.submit' AND a.entity = 'campaign' AND a.entity_id = c.id
      )
    `);
    await queryRunner.query(`
      UPDATE campaigns SET submitted_at = created_at
      WHERE submitted_at IS NULL AND status IN ('pending', 'needs_info')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN submitted_at`);
  }
}
