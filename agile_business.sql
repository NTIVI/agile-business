-- ============================================================
-- Agile Business — MySQL Database Schema
-- Import via phpMyAdmin or: mysql -u USER -p < agile_business.sql
-- For full setup with data use: node setup-db.js
-- ============================================================

CREATE DATABASE IF NOT EXISTS `agile_business`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agile_business`;

-- ── visitors ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `visitors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(36),
    `ip` VARCHAR(45),
    `user_agent` TEXT,
    `device` VARCHAR(20) DEFAULT 'desktop',
    `browser` VARCHAR(50) DEFAULT 'unknown',
    `os` VARCHAR(50) DEFAULT 'unknown',
    `referrer` TEXT,
    `page` VARCHAR(255) DEFAULT '/',
    `lang` VARCHAR(10) DEFAULT 'ru',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_created` (`created_at`),
    INDEX `idx_page` (`page`),
    INDEX `idx_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── leads ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `leads` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) DEFAULT '',
    `company` VARCHAR(255) DEFAULT '',
    `message` TEXT,
    `source` VARCHAR(50) DEFAULT 'contact',
    `service` VARCHAR(100) DEFAULT '',
    `service_sub` VARCHAR(200) DEFAULT '',
    `company_size` VARCHAR(50) DEFAULT '',
    `complexity` VARCHAR(50) DEFAULT '',
    `duration` VARCHAR(50) DEFAULT '',
    `estimated_price` DECIMAL(12,2) DEFAULT 0,
    `status` ENUM('new','processing','accepted','rejected','completed') DEFAULT 'new',
    `notes` TEXT,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_status` (`status`),
    INDEX `idx_created` (`created_at`),
    INDEX `idx_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── calculator_sessions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `calculator_sessions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(36) UNIQUE,
    `current_step` INT DEFAULT 1,
    `completed` TINYINT DEFAULT 0,
    `service` VARCHAR(100) DEFAULT '',
    `service_sub` VARCHAR(200) DEFAULT '',
    `company_size` VARCHAR(50) DEFAULT '',
    `complexity` VARCHAR(50) DEFAULT '',
    `duration` VARCHAR(50) DEFAULT '',
    `description` TEXT,
    `it_criteria_json` MEDIUMTEXT,
    `estimated_price` DECIMAL(12,2) DEFAULT 0,
    `relevance_score` FLOAT DEFAULT 0,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_completed` (`completed`),
    INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── seo_settings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `seo_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `page` VARCHAR(50) UNIQUE NOT NULL,
    `title` VARCHAR(255) DEFAULT '',
    `description` TEXT,
    `keywords` TEXT,
    `og_title` VARCHAR(255) DEFAULT '',
    `og_description` TEXT,
    `og_image` VARCHAR(255) DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) UNIQUE NOT NULL,
    `setting_value` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── i18n_translations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `i18n_translations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `lang` VARCHAR(10) NOT NULL,
    `tkey` VARCHAR(190) NOT NULL,
    `tvalue` MEDIUMTEXT,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_lang_key` (`lang`, `tkey`),
    INDEX `idx_lang` (`lang`),
    INDEX `idx_key` (`tkey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Legacy clients / reviews (used by API for client profiles and project reviews)
CREATE TABLE IF NOT EXISTS `clients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(120) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `is_active` TINYINT DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_clients_slug` (`slug`),
    UNIQUE KEY `uk_clients_email` (`email`),
    INDEX `idx_clients_active` (`is_active`),
    INDEX `idx_clients_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_profiles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `client_id` INT NOT NULL,
    `company_name` VARCHAR(255) DEFAULT '',
    `logo_url` VARCHAR(255) DEFAULT '',
    `website` VARCHAR(255) DEFAULT '',
    `description` TEXT,
    `address` VARCHAR(255) DEFAULT '',
    `city` VARCHAR(120) DEFAULT '',
    `country` VARCHAR(120) DEFAULT '',
    `lat` DECIMAL(10,7) DEFAULT NULL,
    `lng` DECIMAL(10,7) DEFAULT NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_client_profiles_client` (`client_id`),
    CONSTRAINT `fk_client_profiles_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_reviews` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `client_id` INT NOT NULL,
    `lang` VARCHAR(10) NOT NULL,
    `rating` TINYINT DEFAULT 5,
    `review_text` TEXT,
    `is_published` TINYINT DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_project_client_lang` (`project_id`, `client_id`, `lang`),
    INDEX `idx_reviews_project` (`project_id`),
    INDEX `idx_reviews_client` (`client_id`),
    INDEX `idx_reviews_lang_published` (`lang`, `is_published`),
    CONSTRAINT `fk_reviews_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_reviews_client` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── pages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `pages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(80) UNIQUE NOT NULL,
    `title` VARCHAR(255) DEFAULT '',
    `html` MEDIUMTEXT,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── page_locales ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `page_locales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `page_id` INT NOT NULL,
    `lang` VARCHAR(10) NOT NULL,
    `title` VARCHAR(255) DEFAULT '',
    `html` MEDIUMTEXT,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_page_lang` (`page_id`, `lang`),
    INDEX `idx_lang` (`lang`),
    CONSTRAINT `fk_page_locales_page` FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(120) UNIQUE NOT NULL,
    `is_published` TINYINT DEFAULT 1,
    `cover_image` VARCHAR(255) DEFAULT '',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_published` (`is_published`),
    INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── project_locales ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `project_locales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `project_id` INT NOT NULL,
    `lang` VARCHAR(10) NOT NULL,
    `title` VARCHAR(255) DEFAULT '',
    `excerpt` TEXT,
    `html` MEDIUMTEXT,
    `gallery_json` MEDIUMTEXT,
    `stack_json` MEDIUMTEXT,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_project_lang` (`project_id`, `lang`),
    INDEX `idx_lang` (`lang`),
    CONSTRAINT `fk_project_locales_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── articles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `articles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `slug` VARCHAR(140) UNIQUE NOT NULL,
    `is_published` TINYINT DEFAULT 1,
    `cover_image` VARCHAR(255) DEFAULT '',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_published` (`is_published`),
    INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── article_locales ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `article_locales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `article_id` INT NOT NULL,
    `lang` VARCHAR(10) NOT NULL,
    `title` VARCHAR(255) DEFAULT '',
    `excerpt` TEXT,
    `html` MEDIUMTEXT,
    `gallery_json` MEDIUMTEXT,
    `stack_json` MEDIUMTEXT,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_article_lang` (`article_id`, `lang`),
    INDEX `idx_lang` (`lang`),
    CONSTRAINT `fk_article_locales_article` FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── page_views ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `page_views` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `page` VARCHAR(255),
    `views` INT DEFAULT 1,
    `view_date` DATE,
    UNIQUE KEY `uk_page_date` (`page`, `view_date`),
    INDEX `idx_date` (`view_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── analytics_events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `analytics_events` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `session_id` VARCHAR(64) NOT NULL,
    `event_type` VARCHAR(50) NOT NULL DEFAULT 'pageview',
    `page_url` VARCHAR(500),
    `page_title` VARCHAR(255),
    `referrer` VARCHAR(500),
    `device_type` VARCHAR(20),
    `browser` VARCHAR(50),
    `os` VARCHAR(50),
    `screen_width` INT,
    `screen_height` INT,
    `language` VARCHAR(10),
    `country` VARCHAR(50),
    `city` VARCHAR(100),
    `element_clicked` VARCHAR(255),
    `scroll_depth` INT,
    `time_on_page` INT,
    `is_calculator_start` TINYINT DEFAULT 0,
    `is_calculator_complete` TINYINT DEFAULT 0,
    `is_lead_submit` TINYINT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_session` (`session_id`),
    INDEX `idx_created` (`created_at`),
    INDEX `idx_event` (`event_type`),
    INDEX `idx_page` (`page_url`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Default data ─────────────────────────────────────────────
INSERT IGNORE INTO `seo_settings` (`page`, `title`, `description`, `keywords`) VALUES
('home', 'Agile Business — Бизнес-консалтинг нового поколения', 'Профессиональный бизнес-консалтинг в 11 сферах', 'бизнес консалтинг, стратегия, аналитика'),
('calculator', 'Калькулятор стоимости — Agile Business', 'Рассчитайте стоимость консалтинговых услуг онлайн', 'калькулятор стоимости, консалтинг');

INSERT IGNORE INTO `pages` (`slug`, `title`, `html`) VALUES
('about', 'О нас', '<h2>О нас</h2><p>Добавьте текст через админку.</p>'),
('works', 'Наши работы', '<h2>Наши работы</h2><p>Добавьте проекты через админку.</p>'),
('articles', 'Статьи', '<h2>Статьи</h2><p>Добавьте статьи через админку.</p>');
