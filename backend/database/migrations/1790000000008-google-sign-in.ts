import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Đăng nhập bằng Google: lưu mã tài khoản Google (`sub`) để nhận diện người dùng
 * kể cả khi họ đổi email Google. NULL với tài khoản chỉ dùng email + mật khẩu.
 */
export class GoogleSignIn1790000000008 implements MigrationInterface {
  name = "GoogleSignIn1790000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN google_id VARCHAR(64) NULL AFTER password_hash`);
    await queryRunner.query(`CREATE UNIQUE INDEX UQ_users_google_id ON users (google_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX UQ_users_google_id ON users`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN google_id`);
  }
}
