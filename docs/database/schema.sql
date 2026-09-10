-- =============================================================
-- Góp Mầm - Crowdfunding Platform
-- Schema khởi tạo cho MySQL 8
-- Đồng bộ với backend/database/migrations/1746800000000-init-schema.ts
-- Chạy trực tiếp trên hosting MySQL (phpMyAdmin / mysql CLI / Workbench)
-- =============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- Table: users
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `milestone_updates`;
DROP TABLE IF EXISTS `milestones`;
DROP TABLE IF EXISTS `donations`;
DROP TABLE IF EXISTS `campaigns`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('user','campaign_owner','admin') NOT NULL DEFAULT 'user',
  `status` ENUM('active','inactive','banned') NOT NULL DEFAULT 'active',
  `avatar` VARCHAR(255) NULL,
  `bio` VARCHAR(500) NULL,
  `phone` VARCHAR(100) NULL,
  `organization` VARCHAR(255) NULL,
  `email_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: campaigns
-- -------------------------------------------------------------
CREATE TABLE `campaigns` (
  `id` CHAR(36) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `owner_id` CHAR(36) NOT NULL,
  `goal_amount` DECIMAL(15,2) NOT NULL,
  `current_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `start_date` DATETIME NOT NULL,
  `end_date` DATETIME NOT NULL,
  `status` ENUM('draft','pending','approved','rejected','active','paused','success','failed','cancelled') NOT NULL DEFAULT 'draft',
  `image_url` VARCHAR(500) NULL,
  `video_url` VARCHAR(500) NULL,
  `location` VARCHAR(255) NULL,
  `backer_count` INT NOT NULL DEFAULT 0,
  `view_count` INT NOT NULL DEFAULT 0,
  `rejection_reason` TEXT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_campaigns_status` (`status`),
  KEY `idx_campaigns_category` (`category`),
  CONSTRAINT `fk_campaign_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: donations
-- -------------------------------------------------------------
CREATE TABLE `donations` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `currency` VARCHAR(3) NOT NULL DEFAULT 'VND',
  `status` ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  `payment_method` VARCHAR(50) NULL,
  `transaction_id` VARCHAR(255) NULL,
  `idempotency_key` VARCHAR(255) NOT NULL,
  `message` TEXT NULL,
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_transaction_id` (`transaction_id`),
  UNIQUE KEY `UQ_idempotency_key` (`idempotency_key`),
  KEY `idx_donations_user` (`user_id`),
  KEY `idx_donations_campaign` (`campaign_id`),
  CONSTRAINT `fk_donation_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_donation_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: milestones
-- -------------------------------------------------------------
CREATE TABLE `milestones` (
  `id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `target_date` DATETIME NULL,
  `budget` DECIMAL(15,2) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_milestone_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: milestone_updates
-- -------------------------------------------------------------
CREATE TABLE `milestone_updates` (
  `id` CHAR(36) NOT NULL,
  `milestone_id` CHAR(36) NOT NULL,
  `content` TEXT NOT NULL,
  `image_url` VARCHAR(500) NULL,
  `expense_amount` DECIMAL(15,2) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_update_milestone` FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: notifications
-- -------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` CHAR(36) NOT NULL,
  `user_id` CHAR(36) NOT NULL,
  `type` ENUM('campaign_approved','campaign_rejected','donation_received','milestone_completed','system') NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `related_id` CHAR(36) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: reports
-- -------------------------------------------------------------
CREATE TABLE `reports` (
  `id` CHAR(36) NOT NULL,
  `reporter_id` CHAR(36) NOT NULL,
  `campaign_id` CHAR(36) NULL,
  `reason` ENUM('spam','fraud','inappropriate','misinformation','other') NOT NULL,
  `description` TEXT NOT NULL,
  `status` ENUM('pending','reviewing','resolved','dismissed') NOT NULL DEFAULT 'pending',
  `admin_notes` TEXT NULL,
  `resolved_at` DATETIME NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_report_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_report_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- Table: audit_logs
-- -------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` CHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(100) NOT NULL,
  `entity_id` VARCHAR(36) NULL,
  `old_values` JSON NULL,
  `new_values` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
