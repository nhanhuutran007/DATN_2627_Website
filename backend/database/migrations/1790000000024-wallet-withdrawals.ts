import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Rút tiền từ ví về tài khoản ngân hàng. SePay không có API chuyển tiền đi nên admin
 * chuyển khoản tay rồi nhập mã giao dịch (giống hoàn tiền SePay):
 * - gửi yêu cầu: số dư → `withdrawing` (khóa lại, không dùng ủng hộ được);
 * - admin duyệt: trừ hẳn `withdrawing`; từ chối hoặc người dùng hủy: trả về số dư.
 */
export class WalletWithdrawals1790000000024 implements MigrationInterface {
  name = "WalletWithdrawals1790000000024";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE wallets ADD COLUMN withdrawing DECIMAL(15,2) NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE wallets DROP CHECK chk_wallets_non_negative`);
    await queryRunner.query(
      `ALTER TABLE wallets ADD CONSTRAINT chk_wallets_non_negative CHECK (balance >= 0 AND held >= 0 AND withdrawing >= 0)`,
    );
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
        MODIFY type ENUM('topup', 'hold', 'capture', 'release', 'refund', 'withdraw_request', 'withdraw_paid', 'withdraw_cancel') NOT NULL,
        ADD COLUMN withdrawing_after DECIMAL(15,2) NOT NULL DEFAULT 0,
        ADD COLUMN withdrawal_id CHAR(36) NULL,
        ADD UNIQUE KEY uq_wallet_tx_withdrawal (type, withdrawal_id)
    `);
    await queryRunner.query(`
      CREATE TABLE wallet_withdrawals (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        bank_account_number VARCHAR(30) NOT NULL,
        bank_account_name VARCHAR(100) NOT NULL,
        status ENUM('pending', 'completed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
        transfer_reference VARCHAR(100) NULL,
        proof_url VARCHAR(500) NULL,
        admin_notes VARCHAR(500) NULL,
        reviewed_by CHAR(36) NULL,
        reviewed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        KEY idx_wallet_withdrawals_user (user_id, created_at),
        KEY idx_wallet_withdrawals_status (status, created_at),
        CONSTRAINT fk_wallet_withdrawals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_wallet_withdrawals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE wallet_withdrawals`);
    await queryRunner.query(
      `DELETE FROM wallet_transactions WHERE type IN ('withdraw_request', 'withdraw_paid', 'withdraw_cancel')`,
    );
    await queryRunner.query(`
      ALTER TABLE wallet_transactions
        DROP INDEX uq_wallet_tx_withdrawal,
        DROP COLUMN withdrawal_id,
        DROP COLUMN withdrawing_after,
        MODIFY type ENUM('topup', 'hold', 'capture', 'release', 'refund') NOT NULL
    `);
    // Tiền đang chờ rút trả về số dư trước khi bỏ cột.
    await queryRunner.query(`UPDATE wallets SET balance = balance + withdrawing, withdrawing = 0`);
    await queryRunner.query(`ALTER TABLE wallets DROP CHECK chk_wallets_non_negative`);
    await queryRunner.query(`ALTER TABLE wallets DROP COLUMN withdrawing`);
    await queryRunner.query(`ALTER TABLE wallets ADD CONSTRAINT chk_wallets_non_negative CHECK (balance >= 0 AND held >= 0)`);
  }
}
