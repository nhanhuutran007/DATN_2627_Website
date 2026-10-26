import { MigrationInterface, QueryRunner } from "typeorm";

/** Thêm loại hành vi "search" (bấm vào dự án từ kết quả tìm kiếm) làm tín hiệu cho mô hình gợi ý. */
export class BehaviorEventSearch1790000000012 implements MigrationInterface {
  name = "BehaviorEventSearch1790000000012";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE behavior_events MODIFY event_type ENUM('view', 'follow', 'contribute', 'search') NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM behavior_events WHERE event_type = 'search'`);
    await queryRunner.query(
      `ALTER TABLE behavior_events MODIFY event_type ENUM('view', 'follow', 'contribute') NOT NULL`,
    );
  }
}
