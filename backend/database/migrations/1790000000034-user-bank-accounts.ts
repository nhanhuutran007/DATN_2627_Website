import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tài khoản ngân hàng mặc định của mỗi người dùng (trang Cài đặt → Ngân hàng). Dùng để điền sẵn
 * tài khoản nhận tiền khi tạo chiến dịch và tài khoản nhận hoàn tiền. Bảng riêng, không nằm
 * trong `users`, để số tài khoản không lộ qua các API trả về người dùng.
 */
export class UserBankAccounts1790000000034 implements MigrationInterface {
  name = "UserBankAccounts1790000000034";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_bank_accounts (
        user_id CHAR(36) PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        bank_account_number VARCHAR(30) NOT NULL,
        bank_account_name VARCHAR(100) NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_user_bank_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE user_bank_accounts`);
  }
}
