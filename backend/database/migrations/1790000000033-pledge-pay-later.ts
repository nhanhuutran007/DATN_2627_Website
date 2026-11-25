import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bỏ mô hình ví giữ tiền, chuyển sang cam kết trả sau (như Kickstarter):
 * - ủng hộ chỉ tạo cam kết `pledged`, không thu tiền;
 * - chiến dịch đạt mục tiêu → `awaiting_payment`: người ủng hộ quét QR SePay trong 7 ngày;
 * - quá hạn → `expired` (bỏ khỏi tiến độ); chiến dịch thất bại → `released`, không phát sinh thanh toán;
 * - gom tiền đã thu rồi admin chuyển cho chủ dự án một lần (`campaign_disbursements`).
 */
export class PledgePayLater1790000000033 implements MigrationInterface {
  name = "PledgePayLater1790000000033";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE donations
        MODIFY status ENUM('pending', 'completed', 'failed', 'refunded', 'expired', 'cancelled', 'pledged', 'charge_failed', 'released', 'awaiting_payment')
          NOT NULL DEFAULT 'pending',
        ADD COLUMN payment_requested_at DATETIME NULL,
        ADD COLUMN payment_reminded_at DATETIME NULL,
        ADD KEY idx_donations_awaiting (status, payment_requested_at)
    `);
    await queryRunner.query(`
      CREATE TABLE campaign_disbursements (
        id CHAR(36) PRIMARY KEY,
        campaign_id CHAR(36) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        donation_count INT NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        bank_account_number VARCHAR(30) NOT NULL,
        bank_account_name VARCHAR(100) NOT NULL,
        transfer_reference VARCHAR(100) NOT NULL,
        proof_url VARCHAR(500) NULL,
        admin_notes VARCHAR(500) NULL,
        disbursed_by CHAR(36) NOT NULL,
        disbursed_at DATETIME NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_campaign_disbursements_campaign (campaign_id),
        CONSTRAINT fk_campaign_disbursements_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        CONSTRAINT fk_campaign_disbursements_admin FOREIGN KEY (disbursed_by) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE campaign_disbursements`);
    await queryRunner.query(`UPDATE donations SET status = 'expired' WHERE status = 'awaiting_payment'`);
    await queryRunner.query(`
      ALTER TABLE donations
        DROP KEY idx_donations_awaiting,
        DROP COLUMN payment_reminded_at,
        DROP COLUMN payment_requested_at,
        MODIFY status ENUM('pending', 'completed', 'failed', 'refunded', 'expired', 'cancelled', 'pledged', 'charge_failed', 'released')
          NOT NULL DEFAULT 'pending'
    `);
  }
}
