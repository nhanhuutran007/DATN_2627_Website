import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tài khoản ngân hàng nhận tiền của chiến dịch: chủ dự án khai báo, admin dùng để chuyển khoản
 * tiền gây quỹ (SePay không có API chi nên admin chuyển tay). Bảng riêng, không nằm trong
 * `campaigns`, để số tài khoản không lộ qua các API công khai trả về chiến dịch.
 */
export class CampaignPayoutAccounts1790000000032 implements MigrationInterface {
  name = "CampaignPayoutAccounts1790000000032";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE campaign_payout_accounts (
        campaign_id CHAR(36) PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        bank_account_number VARCHAR(30) NOT NULL,
        bank_account_name VARCHAR(100) NOT NULL,
        updated_by CHAR(36) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_campaign_payout_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_payout_user FOREIGN KEY (updated_by) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE campaign_payout_accounts`);
  }
}
