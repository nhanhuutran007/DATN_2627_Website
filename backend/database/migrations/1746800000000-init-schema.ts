import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1746800000000 implements MigrationInterface {
  name = "InitSchema1746800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id CHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'campaign_owner', 'admin') NOT NULL DEFAULT 'user',
        status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
        avatar VARCHAR(255) NULL,
        bio VARCHAR(500) NULL,
        phone VARCHAR(100) NULL,
        organization VARCHAR(255) NULL,
        email_verified TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE campaigns (
        id CHAR(36) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        owner_id CHAR(36) NOT NULL,
        goal_amount DECIMAL(15,2) NOT NULL,
        current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        status ENUM('draft', 'pending', 'approved', 'rejected', 'active', 'paused', 'success', 'failed', 'cancelled') NOT NULL DEFAULT 'draft',
        image_url VARCHAR(500) NULL,
        video_url VARCHAR(500) NULL,
        location VARCHAR(255) NULL,
        backer_count INT NOT NULL DEFAULT 0,
        view_count INT NOT NULL DEFAULT 0,
        rejection_reason TEXT NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_campaign_owner FOREIGN KEY (owner_id) REFERENCES users(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE donations (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        campaign_id CHAR(36) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'VND',
        status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50) NULL,
        transaction_id VARCHAR(255) NULL UNIQUE,
        idempotency_key VARCHAR(255) NOT NULL UNIQUE,
        message TEXT NULL,
        is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
        completed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_donation_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT fk_donation_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE milestones (
        id CHAR(36) PRIMARY KEY,
        campaign_id CHAR(36) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT NULL,
        target_date DATETIME NULL,
        budget DECIMAL(15,2) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        is_completed TINYINT(1) NOT NULL DEFAULT 0,
        completed_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_milestone_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE milestone_updates (
        id CHAR(36) PRIMARY KEY,
        milestone_id CHAR(36) NOT NULL,
        content TEXT NOT NULL,
        image_url VARCHAR(500) NULL,
        expense_amount DECIMAL(15,2) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_update_milestone FOREIGN KEY (milestone_id) REFERENCES milestones(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE notifications (
        id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NOT NULL,
        type ENUM('campaign_approved', 'campaign_rejected', 'donation_received', 'milestone_completed', 'system') NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        related_id CHAR(36) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE reports (
        id CHAR(36) PRIMARY KEY,
        reporter_id CHAR(36) NOT NULL,
        campaign_id CHAR(36) NULL,
        reason ENUM('spam', 'fraud', 'inappropriate', 'misinformation', 'other') NOT NULL,
        description TEXT NOT NULL,
        status ENUM('pending', 'reviewing', 'resolved', 'dismissed') NOT NULL DEFAULT 'pending',
        admin_notes TEXT NULL,
        resolved_at DATETIME NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
        CONSTRAINT fk_report_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id CHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NULL,
        action VARCHAR(100) NOT NULL,
        entity VARCHAR(100) NOT NULL,
        entity_id VARCHAR(36) NULL,
        old_values JSON NULL,
        new_values JSON NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_campaigns_status ON campaigns(status);
      CREATE INDEX idx_campaigns_category ON campaigns(category);
      CREATE INDEX idx_donations_user ON donations(user_id);
      CREATE INDEX idx_donations_campaign ON donations(campaign_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE audit_logs`);
    await queryRunner.query(`DROP TABLE reports`);
    await queryRunner.query(`DROP TABLE notifications`);
    await queryRunner.query(`DROP TABLE milestone_updates`);
    await queryRunner.query(`DROP TABLE milestones`);
    await queryRunner.query(`DROP TABLE donations`);
    await queryRunner.query(`DROP TABLE campaigns`);
    await queryRunner.query(`DROP TABLE users`);
  }
}
