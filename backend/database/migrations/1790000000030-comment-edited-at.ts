import { MigrationInterface, QueryRunner } from "typeorm";

/** Người viết sửa được bình luận của mình; `edited_at` để hiển thị "(đã chỉnh sửa)". */
export class CommentEditedAt1790000000030 implements MigrationInterface {
  name = "CommentEditedAt1790000000030";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaign_comments ADD COLUMN edited_at DATETIME NULL AFTER content`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE campaign_comments DROP COLUMN edited_at`);
  }
}
