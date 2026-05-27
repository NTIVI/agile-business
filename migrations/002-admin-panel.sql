-- ============================================================
-- Migration 002: Admin Panel — Users, Orders, Roles
-- ============================================================

USE `agile_business`;

-- ── admin_users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admin_users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(255) DEFAULT 'Admin',
    `role` ENUM('admin','manager','director') DEFAULT 'manager',
    `avatar_url` VARCHAR(500) DEFAULT '',
    `is_active` TINYINT DEFAULT 1,
    `last_login` DATETIME NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_role` (`role`),
    INDEX `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `lead_id` INT NULL,
    `client_name` VARCHAR(255) NOT NULL DEFAULT '',
    `client_email` VARCHAR(255) DEFAULT '',
    `client_phone` VARCHAR(100) DEFAULT '',
    `service` VARCHAR(100) DEFAULT '',
    `description` TEXT,
    `status` ENUM('new','in_progress','completed','cancelled','on_hold') DEFAULT 'new',
    `total_price` DECIMAL(12,2) DEFAULT 0,
    `source` VARCHAR(100) DEFAULT '',
    `source_detail` VARCHAR(255) DEFAULT '',
    `deadline` DATE NULL,
    `assigned_to` INT NULL,
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`),
    INDEX `idx_created` (`created_at`),
    INDEX `idx_lead` (`lead_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
