import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Chủ dự án tự hủy chiến dịch (không xóa): lưu lý do công khai và thời điểm hủy để trang dự án
 * hiện nhãn "Đã hủy" kèm lý do, và để đếm số lần hủy của mỗi chủ dự án (cảnh báo rủi ro).
 * `cancelled_from`: trạng thái ngay trước khi hủy — chỉ chiến dịch đã công khai (`active`) mới
 * còn xem công khai sau khi hủy; hồ sơ chờ duyệt/đã duyệt bị hủy vẫn chỉ chủ dự án và admin xem.
 */
export class CampaignOwnerCancel1790000000039 implements MigrationInterface {
  name = "CampaignOwnerCancel1790000000039";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaigns ADD COLUMN cancel_reason VARCHAR(500) NULL AFTER rejection_reason`);
    await queryRunner.query(`ALTER TABLE campaigns ADD COLUMN cancelled_at DATETIME NULL AFTER cancel_reason`);
    await queryRunner.query(`ALTER TABLE campaigns ADD COLUMN cancelled_from VARCHAR(20) NULL AFTER cancelled_at`);
    await queryRunner.query(`CREATE INDEX idx_campaigns_owner_cancelled ON campaigns (owner_id, cancelled_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_campaigns_owner_cancelled ON campaigns`);
    await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN cancelled_from`);
    await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN cancelled_at`);
    await queryRunner.query(`ALTER TABLE campaigns DROP COLUMN cancel_reason`);
  }
}
