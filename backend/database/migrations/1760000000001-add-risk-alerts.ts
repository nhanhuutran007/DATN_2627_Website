import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRiskAlerts1760000000001 implements MigrationInterface {
  name = "AddRiskAlerts1760000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE risk_alerts (
        id CHAR(36) PRIMARY KEY,
        entity_type ENUM('campaign', 'user') NOT NULL,
        entity_id CHAR(36) NOT NULL,
        entity_name VARCHAR(255) NOT NULL,
        risk_level ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
        risk_score FLOAT NOT NULL DEFAULT 0,
        method ENUM('ai', 'rule') NOT NULL DEFAULT 'ai',
        reasons JSON NOT NULL,
        evidences JSON NOT NULL,
        status ENUM('open', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
        resolved_by CHAR(36) NULL,
        resolved_at DATETIME(6) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_risk_resolver FOREIGN KEY (resolved_by) REFERENCES users(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_risk_status ON risk_alerts(status);
      CREATE INDEX idx_risk_entity ON risk_alerts(entity_type, entity_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE risk_alerts`);
  }
}