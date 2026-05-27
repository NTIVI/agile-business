-- ============================================================
-- Migration 003: CRM 2.0, Marketing, CMS 2.0, Finance, Security
-- ============================================================
USE `agile_business`;

-- ── UTM columns on leads ─────────────────────────────────────
ALTER TABLE `leads` ADD COLUMN `stage` VARCHAR(50) DEFAULT 'new' AFTER `status`;
ALTER TABLE `leads` ADD COLUMN `utm_source` VARCHAR(255) DEFAULT '' AFTER `stage`;
ALTER TABLE `leads` ADD COLUMN `utm_medium` VARCHAR(255) DEFAULT '' AFTER `utm_source`;
ALTER TABLE `leads` ADD COLUMN `utm_campaign` VARCHAR(255) DEFAULT '' AFTER `utm_medium`;
ALTER TABLE `leads` ADD COLUMN `utm_content` VARCHAR(255) DEFAULT '' AFTER `utm_campaign`;
ALTER TABLE `leads` ADD COLUMN `utm_term` VARCHAR(255) DEFAULT '' AFTER `utm_content`;
ALTER TABLE `leads` ADD INDEX `idx_stage` (`stage`);

-- ── CMS: drafts, SEO, scheduled publish ──────────────────────
ALTER TABLE `pages` ADD COLUMN `status` ENUM('draft','published','scheduled','archived') DEFAULT 'published' AFTER `html`;
ALTER TABLE `pages` ADD COLUMN `publish_at` DATETIME NULL AFTER `status`;
ALTER TABLE `pages` ADD COLUMN `seo_title` VARCHAR(255) DEFAULT '' AFTER `publish_at`;
ALTER TABLE `pages` ADD COLUMN `seo_description` TEXT AFTER `seo_title`;
ALTER TABLE `pages` ADD COLUMN `og_title` VARCHAR(255) DEFAULT '' AFTER `seo_description`;
ALTER TABLE `pages` ADD COLUMN `og_description` TEXT AFTER `og_title`;

ALTER TABLE `articles` ADD COLUMN `status` ENUM('draft','published','scheduled','archived') DEFAULT 'published' AFTER `cover_image`;
ALTER TABLE `articles` ADD COLUMN `publish_at` DATETIME NULL AFTER `status`;
ALTER TABLE `articles` ADD COLUMN `seo_title` VARCHAR(255) DEFAULT '' AFTER `publish_at`;
ALTER TABLE `articles` ADD COLUMN `seo_description` TEXT AFTER `seo_title`;
ALTER TABLE `articles` ADD COLUMN `og_title` VARCHAR(255) DEFAULT '' AFTER `seo_description`;
ALTER TABLE `articles` ADD COLUMN `og_description` TEXT AFTER `og_title`;

-- ── 2FA columns on admin_users ───────────────────────────────
ALTER TABLE `admin_users` ADD COLUMN `totp_secret` VARCHAR(255) DEFAULT '' AFTER `last_login`;
ALTER TABLE `admin_users` ADD COLUMN `totp_enabled` TINYINT DEFAULT 0 AFTER `totp_secret`;

-- ── tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `entity_type` VARCHAR(30) DEFAULT '',
    `entity_id` INT NULL,
    `title` VARCHAR(500) NOT NULL DEFAULT '',
    `description` TEXT,
    `assigned_to` INT NULL,
    `due_date` DATETIME NULL,
    `status` ENUM('pending','in_progress','done','cancelled') DEFAULT 'pending',
    `priority` ENUM('low','normal','high','urgent') DEFAULT 'normal',
    `created_by` INT NULL,
    `completed_at` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_entity` (`entity_type`, `entity_id`),
    INDEX `idx_assigned` (`assigned_to`),
    INDEX `idx_status` (`status`),
    INDEX `idx_due` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── comments / communication log ─────────────────────────────
CREATE TABLE IF NOT EXISTS `comments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `entity_type` VARCHAR(30) NOT NULL DEFAULT '',
    `entity_id` INT NOT NULL,
    `user_id` INT NULL,
    `text` TEXT NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── lead stage history ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `lead_stage_history` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `lead_id` INT NOT NULL,
    `from_stage` VARCHAR(50) DEFAULT '',
    `to_stage` VARCHAR(50) NOT NULL,
    `user_id` INT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_lead` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── content versions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `content_versions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `entity_type` VARCHAR(30) NOT NULL DEFAULT '',
    `entity_id` INT NOT NULL,
    `lang` VARCHAR(10) DEFAULT 'ru',
    `title` VARCHAR(500) DEFAULT '',
    `html` LONGTEXT,
    `created_by` INT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── proposals (commercial offers) ────────────────────────────
CREATE TABLE IF NOT EXISTS `proposals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `order_id` INT NULL,
    `lead_id` INT NULL,
    `client_name` VARCHAR(255) DEFAULT '',
    `client_email` VARCHAR(255) DEFAULT '',
    `client_phone` VARCHAR(100) DEFAULT '',
    `items_json` JSON,
    `total` DECIMAL(12,2) DEFAULT 0,
    `status` ENUM('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
    `valid_until` DATE NULL,
    `notes` TEXT,
    `created_by` INT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`),
    INDEX `idx_lead` (`lead_id`),
    INDEX `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── invoices ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `invoices` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `proposal_id` INT NULL,
    `order_id` INT NULL,
    `client_name` VARCHAR(255) DEFAULT '',
    `client_email` VARCHAR(255) DEFAULT '',
    `items_json` JSON,
    `total` DECIMAL(12,2) DEFAULT 0,
    `status` ENUM('draft','sent','paid','overdue','cancelled') DEFAULT 'draft',
    `due_date` DATE NULL,
    `paid_at` DATETIME NULL,
    `notes` TEXT,
    `created_by` INT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`),
    INDEX `idx_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── audit log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_log` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NULL,
    `username` VARCHAR(100) DEFAULT '',
    `action` VARCHAR(100) NOT NULL DEFAULT '',
    `entity_type` VARCHAR(50) DEFAULT '',
    `entity_id` INT NULL,
    `details` TEXT,
    `ip` VARCHAR(45) DEFAULT '',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_user` (`user_id`),
    INDEX `idx_action` (`action`),
    INDEX `idx_entity` (`entity_type`, `entity_id`),
    INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── login attempts ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `login_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) DEFAULT '',
    `ip` VARCHAR(45) DEFAULT '',
    `success` TINYINT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_ip` (`ip`),
    INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
