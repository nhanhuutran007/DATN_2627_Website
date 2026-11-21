import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ví Góp Mầm: mỗi tài khoản một ví, nạp qua SePay (chuyển khoản QR, tự cộng khi IPN
 * báo thành công). Ủng hộ bằng ví = cam kết "tất cả hoặc không": tiền chuyển từ số dư
 * sang `held` (giữ lại); chiến dịch đạt mục tiêu thì trừ hẳn, không đạt/bị hủy/rút cam
 * kết thì hoàn về số dư. Mọi biến động ghi vào sổ `wallet_transactions`.
 */
export class Wallets1790000000023 implements MigrationInterface {
  name = "Wallets1790000000023";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE wallets (
        user_id CHAR(36) PRIMARY KEY,
        balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        held DECIMAL(15,2) NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT chk_wallets_non_negative CHECK (balance >= 0 AND held >= 0),
        CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      CREATE TABLE wallet_topups (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        status ENUM('pending', 'completed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
        transfer_code VARCHAR(20) NOT NULL,
        transaction_id VARCHAR(255) NULL,
        completed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_wallet_topups_transfer_code (transfer_code),
        KEY idx_wallet_topups_user (user_id, created_at),
        KEY idx_wallet_topups_status (status, created_at),
        CONSTRAINT fk_wallet_topups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    // UNIQUE(type, donation_id)/(type, topup_id): một khoản ủng hộ chỉ được giữ/trừ/hoàn
    // đúng một lần, một lần nạp chỉ cộng một lần (NULL không tính trùng trong MySQL).
    await queryRunner.query(`
      CREATE TABLE wallet_transactions (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type ENUM('topup', 'hold', 'capture', 'release', 'refund') NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        balance_after DECIMAL(15,2) NOT NULL,
        held_after DECIMAL(15,2) NOT NULL,
        donation_id CHAR(36) NULL,
        topup_id CHAR(36) NULL,
        note VARCHAR(255) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY uq_wallet_tx_donation (type, donation_id),
        UNIQUE KEY uq_wallet_tx_topup (type, topup_id),
        KEY idx_wallet_tx_user (user_id, created_at),
        CONSTRAINT fk_wallet_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE wallet_transactions`);
    await queryRunner.query(`DROP TABLE wallet_topups`);
    await queryRunner.query(`DROP TABLE wallets`);
  }
}
