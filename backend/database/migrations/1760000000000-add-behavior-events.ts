import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBehaviorEvents1760000000000 implements MigrationInterface {
  name = "AddBehaviorEvents1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE behavior_events (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        campaign_id CHAR(36) NOT NULL,
        event_type ENUM('view', 'follow', 'contribute') NOT NULL,
        category VARCHAR(100) NOT NULL,
        event_data JSON NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_behavior_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_behavior_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`CREATE INDEX idx_behavior_user_type ON behavior_events(user_id, event_type)`);
    await queryRunner.query(`CREATE INDEX idx_behavior_campaign ON behavior_events(campaign_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE behavior_events`);
  }
}