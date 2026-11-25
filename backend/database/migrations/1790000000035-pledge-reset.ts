import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Mốc admin "mở lại quyền cam kết trả sau" cho một tài khoản: các lần bỏ cam kết trước mốc này
 * không còn tính (xem `computePledgeStanding`).
 */
export class PledgeReset1790000000035 implements MigrationInterface {
  name = "PledgeReset1790000000035";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN pledge_reset_at DATETIME NULL`);
    // Đếm lần bỏ cam kết theo người dùng + thời điểm mời thanh toán.
    await queryRunner.query(`CREATE INDEX idx_donations_user_payment_requested ON donations (user_id, payment_requested_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_donations_user_payment_requested ON donations`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN pledge_reset_at`);
  }
}
