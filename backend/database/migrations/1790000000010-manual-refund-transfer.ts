import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Hoàn tiền thủ công cho khoản qua SePay (SePay không có API hoàn tiền):
 * - `refund_requests`: tài khoản nhận hoàn do người ủng hộ khai (ngân hàng, số tài khoản, chủ tài khoản).
 * - `donations.refund_method`: `gateway` (cổng thanh toán hoàn) | `manual_transfer` (admin chuyển khoản trả lại);
 *   với `manual_transfer`, `refund_reference` là mã giao dịch chuyển khoản thật do admin nhập.
 * - `donations.refund_proof_url` + `media_files.purpose = refund_proof`: ảnh chứng từ chuyển khoản (không bắt buộc).
 * Cột mới NULL với dữ liệu cũ.
 */
export class ManualRefundTransfer1790000000010 implements MigrationInterface {
  name = "ManualRefundTransfer1790000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE refund_requests ADD COLUMN bank_name VARCHAR(100) NULL AFTER reason`);
    await queryRunner.query(`ALTER TABLE refund_requests ADD COLUMN bank_account_number VARCHAR(30) NULL AFTER bank_name`);
    await queryRunner.query(`ALTER TABLE refund_requests ADD COLUMN bank_account_name VARCHAR(100) NULL AFTER bank_account_number`);
    await queryRunner.query(`ALTER TABLE donations ADD COLUMN refund_method VARCHAR(20) NULL AFTER refund_reference`);
    await queryRunner.query(`ALTER TABLE donations ADD COLUMN refund_proof_url VARCHAR(500) NULL AFTER refund_method`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt', 'refund_proof') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không thu hẹp ENUM được khi còn giá trị 'refund_proof'; bản ghi chứng từ hoàn bị bỏ.
    await queryRunner.query(`DELETE FROM media_files WHERE purpose = 'refund_proof'`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar', 'expense_receipt') NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE donations DROP COLUMN refund_proof_url`);
    await queryRunner.query(`ALTER TABLE donations DROP COLUMN refund_method`);
    await queryRunner.query(`ALTER TABLE refund_requests DROP COLUMN bank_account_name`);
    await queryRunner.query(`ALTER TABLE refund_requests DROP COLUMN bank_account_number`);
    await queryRunner.query(`ALTER TABLE refund_requests DROP COLUMN bank_name`);
  }
}
