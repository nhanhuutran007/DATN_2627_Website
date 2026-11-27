import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Khóa cho job định kỳ khi chạy nhiều instance backend sau ALB: mỗi job một dòng, instance nào
 * giành được "hợp đồng thuê" (locked_until còn trong tương lai) thì chạy, các instance khác bỏ qua.
 * Khóa tự đổi chủ theo tên job nên dùng `name` làm khóa chính thay cho UUID.
 *
 * `IF NOT EXISTS`: bản đầu mang số 038 (trùng `RemoveWallets1790000000038`) đã chạy trên RDS và
 * Docker local; đổi sang 039 thì lần chạy lại chỉ ghi nhận, không tạo lại bảng.
 */
export class SchedulerLocks1790000000039 implements MigrationInterface {
  name = "SchedulerLocks1790000000039";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scheduler_locks (
        name VARCHAR(100) PRIMARY KEY,
        locked_until DATETIME(3) NOT NULL,
        locked_by VARCHAR(120) NOT NULL DEFAULT '',
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE scheduler_locks`);
  }
}
