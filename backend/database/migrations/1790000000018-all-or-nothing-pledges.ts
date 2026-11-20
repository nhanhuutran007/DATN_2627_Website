import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Gây quỹ "tất cả hoặc không" (như Kickstarter): khoản ủng hộ qua thẻ/ví chỉ được
 * cam kết (`pledged`) lúc ủng hộ, trừ tiền khi chiến dịch hết hạn và đạt mục tiêu.
 * - `pledged`: đã lưu thẻ/ví, chưa trừ tiền (tính vào tiến độ).
 * - `charge_failed`: đạt mục tiêu nhưng trừ thẻ thất bại, chờ người ủng hộ đổi thẻ.
 * - `released`: chiến dịch không đạt/bị hủy, cam kết giải phóng, không trừ tiền.
 * Cột tham chiếu cổng thẻ chỉ lưu mã Stripe (`cus_…`, `pm_…`, `cs_…`), không lưu số thẻ.
 */
export class AllOrNothingPledges1790000000018 implements MigrationInterface {
  name = "AllOrNothingPledges1790000000018";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE donations
        MODIFY status ENUM('pending', 'completed', 'failed', 'refunded', 'expired', 'cancelled', 'pledged', 'charge_failed', 'released')
          NOT NULL DEFAULT 'pending',
        ADD COLUMN pledged_at DATETIME NULL,
        ADD COLUMN payment_customer_ref VARCHAR(255) NULL,
        ADD COLUMN payment_method_ref VARCHAR(255) NULL,
        ADD COLUMN setup_session_ref VARCHAR(255) NULL,
        ADD COLUMN charge_attempts INT NOT NULL DEFAULT 0,
        ADD COLUMN charge_failed_at DATETIME NULL,
        ADD COLUMN last_charge_error VARCHAR(255) NULL
    `);
    // Job tất toán quét cam kết theo chiến dịch + trạng thái.
    await queryRunner.query(`CREATE INDEX idx_donations_campaign_status ON donations(campaign_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_donations_setup_session ON donations(setup_session_ref)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_donations_setup_session ON donations`);
    await queryRunner.query(`DROP INDEX idx_donations_campaign_status ON donations`);
    // Không thu hẹp ENUM được khi còn giá trị mới: cam kết chưa trừ tiền gộp về `cancelled`.
    await queryRunner.query(
      `UPDATE donations SET status = 'cancelled' WHERE status IN ('pledged', 'charge_failed', 'released')`,
    );
    await queryRunner.query(`
      ALTER TABLE donations
        MODIFY status ENUM('pending', 'completed', 'failed', 'refunded', 'expired', 'cancelled')
          NOT NULL DEFAULT 'pending',
        DROP COLUMN pledged_at,
        DROP COLUMN payment_customer_ref,
        DROP COLUMN payment_method_ref,
        DROP COLUMN setup_session_ref,
        DROP COLUMN charge_attempts,
        DROP COLUMN charge_failed_at,
        DROP COLUMN last_charge_error
    `);
  }
}
