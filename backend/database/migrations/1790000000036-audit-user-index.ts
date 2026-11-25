import { MigrationInterface, QueryRunner } from "typeorm";

/** Phân tích tài khoản clone tra IP trong nhật ký theo người dùng: thêm chỉ mục cho truy vấn đó. */
export class AuditUserIndex1790000000036 implements MigrationInterface {
  name = "AuditUserIndex1790000000036";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX idx_audit_logs_user_created ON audit_logs (user_id, created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_audit_logs_user_created ON audit_logs`);
  }
}
