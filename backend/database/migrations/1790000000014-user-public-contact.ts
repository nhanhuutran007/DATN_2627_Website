import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Thông tin liên hệ công khai do chủ dự án tự điền (nút "Liên hệ" ở trang dự án). Tách khỏi email
 * đăng nhập và số điện thoại tài khoản, vốn chỉ trả cho chính chủ và admin.
 */
export class UserPublicContact1790000000014 implements MigrationInterface {
  name = "UserPublicContact1790000000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN contact_email VARCHAR(255) NULL AFTER organization`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN contact_phone VARCHAR(30) NULL AFTER contact_email`);
    await queryRunner.query(`ALTER TABLE users ADD COLUMN contact_address VARCHAR(300) NULL AFTER contact_phone`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN contact_address`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN contact_phone`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN contact_email`);
  }
}
