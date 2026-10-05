import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Đăng xuất phía server + ảnh đại diện:
 * - `revoked_tokens`: `jti` của access/refresh token đã đăng xuất, giữ tới khi
 *   token tự hết hạn (sau đó dòng được dọn, token cũng không còn dùng được).
 * - `users.sessions_revoked_at`: "đăng xuất khỏi mọi thiết bị" — JWT phát hành
 *   trước thời điểm này bị từ chối (cùng cơ chế với `password_changed_at`).
 * - `media_files.purpose` thêm `avatar` cho ảnh đại diện tải lên.
 */
export class SessionRevocationAndAvatar1790000000000 implements MigrationInterface {
  name = "SessionRevocationAndAvatar1790000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE revoked_tokens (
        jti CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        KEY idx_revoked_tokens_expires (expires_at),
        CONSTRAINT fk_revoked_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE users
        ADD COLUMN sessions_revoked_at DATETIME NULL AFTER password_changed_at
    `);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image', 'avatar') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không thu hẹp ENUM được khi còn giá trị 'avatar'; bản ghi ảnh đại diện bị bỏ.
    await queryRunner.query(`DELETE FROM media_files WHERE purpose = 'avatar'`);
    await queryRunner.query(`
      ALTER TABLE media_files
        MODIFY purpose ENUM('campaign_image', 'progress_image') NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN sessions_revoked_at`);
    await queryRunner.query(`DROP TABLE revoked_tokens`);
  }
}
