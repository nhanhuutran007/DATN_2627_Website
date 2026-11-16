import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Thông tin nhận quà (người nhận, số điện thoại, địa chỉ) của khoản ủng hộ có chọn mức quà.
 * Tách bảng riêng khỏi `donations` để dữ liệu cá nhân này không đi theo các API giao dịch/sổ cái;
 * chỉ danh sách người nhận quà của chủ dự án (và admin) đọc tới. Một khoản ủng hộ có tối đa một dòng.
 */
export class RewardRecipients1790000000016 implements MigrationInterface {
  name = "RewardRecipients1790000000016";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reward_recipients (
        donation_id CHAR(36) NOT NULL,
        recipient_name VARCHAR(120) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        address VARCHAR(300) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (donation_id),
        CONSTRAINT fk_reward_recipients_donation FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE reward_recipients`);
  }
}
