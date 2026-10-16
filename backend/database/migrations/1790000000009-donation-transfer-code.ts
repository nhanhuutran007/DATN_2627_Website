import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Chuyển khoản qua VietQR: mỗi khoản ủng hộ có một mã nội dung chuyển khoản riêng
 * (vd. `GM7K2QX9AB`) để đối chiếu biến động số dư ngân hàng với đúng đơn.
 * NULL với các đơn tạo trước migration này.
 */
export class DonationTransferCode1790000000009 implements MigrationInterface {
  name = "DonationTransferCode1790000000009";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE donations ADD COLUMN transfer_code VARCHAR(20) NULL AFTER transaction_id`);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_donations_transfer_code ON donations (transfer_code)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX UQ_donations_transfer_code ON donations`);
    await queryRunner.query(`ALTER TABLE donations DROP COLUMN transfer_code`);
  }
}
