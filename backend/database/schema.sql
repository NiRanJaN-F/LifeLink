-- ============================================================================
-- LifeLink Database Schema
-- Platform: MySQL 8.0+ / AWS RDS for MySQL
-- Description: Blood donation management system schema with strict constraints,
--              foreign key cascading, performance indexes, and seed data.
-- ============================================================================

-- Ensure consistent charset and collation
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Table: users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'donor', 'admin') NOT NULL DEFAULT 'user',
  `status` ENUM('active', 'blocked', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Table: blood_groups
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blood_groups` (
  `blood_group_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `group_name` VARCHAR(10) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`blood_group_id`),
  UNIQUE KEY `uk_blood_groups_name` (`group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Table: donors
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `donors` (
  `donor_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `blood_group_id` INT UNSIGNED NOT NULL,
  `age` TINYINT UNSIGNED NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `last_donation_date` DATE DEFAULT NULL,
  `verification_status` ENUM('pending', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`donor_id`),
  UNIQUE KEY `uk_donors_user_id` (`user_id`),
  KEY `idx_donors_blood_group` (`blood_group_id`),
  KEY `idx_donors_search` (`verification_status`, `is_available`, `blood_group_id`),
  KEY `idx_donors_city` (`city`),
  KEY `idx_donors_state` (`state`),
  CONSTRAINT `fk_donors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_donors_blood_group` FOREIGN KEY (`blood_group_id`) REFERENCES `blood_groups` (`blood_group_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Table: blood_requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blood_requests` (
  `request_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `blood_group_id` INT UNSIGNED NOT NULL,
  `patient_name` VARCHAR(150) NOT NULL,
  `hospital_name` VARCHAR(255) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `units_required` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `urgency` ENUM('normal', 'urgent', 'emergency') NOT NULL DEFAULT 'normal',
  `required_date` DATE NOT NULL,
  `contact_phone` VARCHAR(20) NOT NULL,
  `request_status` ENUM('pending', 'approved', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  KEY `idx_requests_user` (`user_id`),
  KEY `idx_requests_blood_group` (`blood_group_id`),
  KEY `idx_requests_feed` (`request_status`, `urgency`, `created_at`),
  KEY `idx_requests_city` (`city`),
  CONSTRAINT `fk_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_requests_blood_group` FOREIGN KEY (`blood_group_id`) REFERENCES `blood_groups` (`blood_group_id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Table: request_responses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `request_responses` (
  `response_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` INT UNSIGNED NOT NULL,
  `donor_id` INT UNSIGNED NOT NULL,
  `response_status` ENUM('accepted', 'rejected') NOT NULL,
  `responded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`response_id`),
  UNIQUE KEY `uk_request_donor_response` (`request_id`, `donor_id`),
  KEY `idx_responses_donor` (`donor_id`),
  KEY `idx_responses_status` (`response_status`),
  CONSTRAINT `fk_responses_request` FOREIGN KEY (`request_id`) REFERENCES `blood_requests` (`request_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_responses_donor` FOREIGN KEY (`donor_id`) REFERENCES `donors` (`donor_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Table: notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_user_read` (`user_id`, `is_read`, `created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Seed Data: Initial Blood Groups (Idempotent INSERT IGNORE)
-- ----------------------------------------------------------------------------
INSERT INTO `blood_groups` (`blood_group_id`, `group_name`) VALUES
  (1, 'A+'),
  (2, 'A-'),
  (3, 'B+'),
  (4, 'B-'),
  (5, 'O+'),
  (6, 'O-'),
  (7, 'AB+'),
  (8, 'AB-')
ON DUPLICATE KEY UPDATE `group_name` = VALUES(`group_name`);

SET FOREIGN_KEY_CHECKS = 1;
