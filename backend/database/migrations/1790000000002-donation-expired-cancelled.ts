import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Trạng thái giao dịch `expired` (đơn `pending` quá hạn thanh toán, do job tự
 * chuyển) và `cancelled` (người ủng hộ hủy hoặc cổng thanh toán báo hủy), kèm
 * chỉ mục cho job quét đơn `pending` theo thời điểm tạo.
 */
export class DonationExpiredCancelled1790000000002 implements MigrationInterface {
  name = "DonationExpiredCancelled1790000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE donations
        MODIFY status ENUM('pending', 'completed', 'failed', 'refunded', 'expired', 'cancelled')
          NOT NULL DEFAULT 'pending'
    `);
    await queryRunner.query(`CREATE INDEX idx_donations_status_created ON donations(status, created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_donations_status_created ON donations`);
    // Không thu hẹp ENUM được khi còn giá trị mới; gộp về `failed` (đều là chưa thu tiền).
    await queryRunner.query(`UPDATE donations SET status = 'failed' WHERE status IN ('expired', 'cancelled')`);
    await queryRunner.query(`
      ALTER TABLE donations
        MODIFY status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending'
    `);
  }
}
