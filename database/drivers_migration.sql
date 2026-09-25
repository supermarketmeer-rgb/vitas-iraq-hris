-- ============================================================
-- Drivers Module Database Migration
-- Merges hr_drivers_db tables into vitasiraq_hris_db
-- All tables prefixed with "drv_" to avoid conflicts
-- Run this on: vitasiraq_hris_db
-- ============================================================

USE vitasiraq_hris_db;

-- ─── 1. drv_offices ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_offices` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `manager_name` varchar(150) DEFAULT NULL,
  `manager_name_en` varchar(150) DEFAULT NULL,
  `manager_email` varchar(100) DEFAULT NULL,
  `manager_badge_no` varchar(50) DEFAULT NULL,
  `manager_password_hash` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_office_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. drv_trip_types ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_trip_types` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name_ar` varchar(100) NOT NULL,
  `name_en` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. drv_trip_routes ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_trip_routes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `route_code` varchar(50) NOT NULL,
  `office_id` int(10) unsigned NOT NULL,
  `name` varchar(150) NOT NULL,
  `trip_type_id` int(10) unsigned NOT NULL,
  `departure_city` varchar(100) NOT NULL,
  `arrival_city` varchar(100) NOT NULL,
  `pathway` text DEFAULT NULL,
  `current_rate` decimal(12,2) NOT NULL DEFAULT 0.00,
  `currency` varchar(10) NOT NULL DEFAULT 'IQD',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_code` (`route_code`),
  KEY `trip_type_id` (`trip_type_id`),
  KEY `idx_route_office` (`office_id`),
  KEY `idx_route_active` (`is_active`),
  CONSTRAINT `drv_trip_routes_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `drv_offices` (`id`),
  CONSTRAINT `drv_trip_routes_ibfk_2` FOREIGN KEY (`trip_type_id`) REFERENCES `drv_trip_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. drv_drivers ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_drivers` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) NOT NULL,
  `driver_number` varchar(50) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `full_name_en` varchar(150) DEFAULT NULL,
  `father_name` varchar(100) DEFAULT NULL,
  `mother_name` varchar(100) DEFAULT NULL,
  `phone` varchar(30) NOT NULL,
  `national_id` varchar(50) NOT NULL,
  `license_number` varchar(50) NOT NULL,
  `license_type` enum('خاصة','عامة','ثقيلة','دراجة','أخرى') NOT NULL DEFAULT 'خاصة',
  `license_issue_date` date DEFAULT NULL,
  `license_expiry_date` date DEFAULT NULL,
  `office_id` int(10) unsigned NOT NULL,
  `status` enum('active','inactive','on_leave','suspended','transferred','resigned') NOT NULL DEFAULT 'active',
  `hire_date` date NOT NULL,
  `termination_date` date DEFAULT NULL,
  `base_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transport_allowance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `fuel_allowance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `driver_password_hash` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  UNIQUE KEY `driver_number` (`driver_number`),
  KEY `idx_driver_office` (`office_id`),
  KEY `idx_driver_status` (`status`),
  KEY `idx_driver_deleted` (`deleted_at`),
  KEY `idx_driver_phone` (`phone`),
  CONSTRAINT `drv_drivers_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `drv_offices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. drv_driver_trips ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_driver_trips` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `trip_number` varchar(50) NOT NULL,
  `trip_date` date NOT NULL,
  `office_id` int(10) unsigned NOT NULL,
  `driver_id` int(10) unsigned NOT NULL,
  `route_id` int(10) unsigned NOT NULL,
  `trip_type_id` int(10) unsigned NOT NULL,
  `departure_city` varchar(100) NOT NULL,
  `arrival_city` varchar(100) NOT NULL,
  `departure_time` time NOT NULL,
  `arrival_time` time DEFAULT NULL,
  `trip_count` decimal(5,2) NOT NULL DEFAULT 1.00,
  `trip_rate` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `is_rate_manually_edited` tinyint(1) NOT NULL DEFAULT 0,
  `rate_edit_reason` varchar(255) DEFAULT NULL,
  `status` enum('draft','pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reviewed_by` int(10) unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `payroll_id` int(10) unsigned DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_number` (`trip_number`),
  UNIQUE KEY `uk_driver_trip_duplicate` (`driver_id`,`trip_date`,`route_id`,`departure_time`),
  KEY `office_id` (`office_id`),
  KEY `route_id` (`route_id`),
  KEY `trip_type_id` (`trip_type_id`),
  KEY `idx_trip_date` (`trip_date`),
  KEY `idx_trip_driver` (`driver_id`),
  KEY `idx_trip_status` (`status`),
  KEY `idx_trip_payroll` (`payroll_id`),
  CONSTRAINT `drv_driver_trips_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `drv_offices` (`id`),
  CONSTRAINT `drv_driver_trips_ibfk_2` FOREIGN KEY (`driver_id`) REFERENCES `drv_drivers` (`id`),
  CONSTRAINT `drv_driver_trips_ibfk_3` FOREIGN KEY (`route_id`) REFERENCES `drv_trip_routes` (`id`),
  CONSTRAINT `drv_driver_trips_ibfk_4` FOREIGN KEY (`trip_type_id`) REFERENCES `drv_trip_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. drv_payrolls ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_payrolls` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `payroll_code` varchar(50) NOT NULL,
  `driver_id` int(10) unsigned NOT NULL,
  `office_id` int(10) unsigned NOT NULL,
  `month` tinyint(3) unsigned NOT NULL,
  `year` smallint(5) unsigned NOT NULL,
  `base_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `approved_trips_count` int(10) unsigned NOT NULL DEFAULT 0,
  `approved_trips_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transport_allowance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `fuel_allowance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `additions_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `deductions_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `advances_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('draft','calculated','approved','paid') NOT NULL DEFAULT 'calculated',
  `approved_by` int(10) unsigned DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `reopened_by` int(10) unsigned DEFAULT NULL,
  `reopened_at` datetime DEFAULT NULL,
  `reopen_reason` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `payroll_code` (`payroll_code`),
  UNIQUE KEY `uk_driver_month_year` (`driver_id`,`month`,`year`),
  KEY `office_id` (`office_id`),
  KEY `idx_payroll_period` (`year`,`month`),
  KEY `idx_payroll_status` (`status`),
  CONSTRAINT `drv_payrolls_ibfk_1` FOREIGN KEY (`driver_id`) REFERENCES `drv_drivers` (`id`),
  CONSTRAINT `drv_payrolls_ibfk_2` FOREIGN KEY (`office_id`) REFERENCES `drv_offices` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. drv_payroll_trip_details ─────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_payroll_trip_details` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `payroll_id` int(10) unsigned NOT NULL,
  `driver_trip_id` int(10) unsigned NOT NULL,
  `trip_date` date NOT NULL,
  `route_name` varchar(150) NOT NULL,
  `departure_city` varchar(100) NOT NULL,
  `arrival_city` varchar(100) NOT NULL,
  `trip_rate` decimal(12,2) NOT NULL,
  `trip_count` decimal(5,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `payroll_id` (`payroll_id`),
  KEY `driver_trip_id` (`driver_trip_id`),
  CONSTRAINT `drv_payroll_trip_details_ibfk_1` FOREIGN KEY (`payroll_id`) REFERENCES `drv_payrolls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `drv_payroll_trip_details_ibfk_2` FOREIGN KEY (`driver_trip_id`) REFERENCES `drv_driver_trips` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. drv_trip_rates_history ───────────────────────────────
CREATE TABLE IF NOT EXISTS `drv_trip_rates_history` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `route_id` int(10) unsigned NOT NULL,
  `old_rate` decimal(12,2) NOT NULL,
  `new_rate` decimal(12,2) NOT NULL,
  `effective_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `changed_by` int(10) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `route_id` (`route_id`),
  CONSTRAINT `drv_trip_rates_history_ibfk_1` FOREIGN KEY (`route_id`) REFERENCES `drv_trip_routes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 9. drv_users (Drivers portal users - separate from HRIS users) ──
CREATE TABLE IF NOT EXISTS `drv_users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` enum('admin','hr_manager','hr_employee','payroll','viewer') NOT NULL DEFAULT 'hr_employee',
  `office_id` int(10) unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `office_id` (`office_id`),
  KEY `idx_user_role` (`role`),
  CONSTRAINT `drv_users_ibfk_1` FOREIGN KEY (`office_id`) REFERENCES `drv_offices` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 10. drv_audit_logs (Drivers audit - separate from HRIS audit) ──
CREATE TABLE IF NOT EXISTS `drv_audit_logs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(10) unsigned DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_table` (`table_name`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════
-- MIGRATE DATA from hr_drivers_db to vitasiraq_hris_db
-- ═══════════════════════════════════════════════════════════

-- Copy offices (skip if already exist by code)
INSERT IGNORE INTO drv_offices 
  (id, code, name_ar, name_en, city, address, manager_name, manager_name_en, manager_email, manager_badge_no, manager_password_hash, phone, is_active, created_at, updated_at)
SELECT id, code, name_ar, name_en, city, address, manager_name, manager_name_en, manager_email, manager_badge_no, manager_password_hash, phone, is_active, created_at, updated_at
FROM hr_drivers_db.offices;

-- Copy trip types
INSERT IGNORE INTO drv_trip_types 
  (id, name_ar, name_en, code, description, is_active)
SELECT id, name_ar, name_en, code, description, is_active
FROM hr_drivers_db.trip_types;

-- Copy trip routes
INSERT IGNORE INTO drv_trip_routes 
  (id, route_code, office_id, name, trip_type_id, departure_city, arrival_city, pathway, current_rate, currency, is_active, notes, created_at, updated_at)
SELECT id, route_code, office_id, name, trip_type_id, departure_city, arrival_city, pathway, current_rate, currency, is_active, notes, created_at, updated_at
FROM hr_drivers_db.trip_routes;

-- Copy drivers
INSERT IGNORE INTO drv_drivers 
  (id, employee_code, driver_number, full_name, full_name_en, father_name, mother_name, phone, national_id, license_number, license_type, license_issue_date, license_expiry_date, office_id, status, hire_date, termination_date, base_salary, transport_allowance, fuel_allowance, notes, avatar_url, deleted_at, created_by, created_at, updated_at, driver_password_hash)
SELECT id, employee_code, driver_number, full_name, full_name_en, father_name, mother_name, phone, national_id, license_number, license_type, license_issue_date, license_expiry_date, office_id, status, hire_date, termination_date, base_salary, transport_allowance, fuel_allowance, notes, avatar_url, deleted_at, created_by, created_at, updated_at, driver_password_hash
FROM hr_drivers_db.drivers;

-- Copy driver trips
INSERT IGNORE INTO drv_driver_trips 
  (id, trip_number, trip_date, office_id, driver_id, route_id, trip_type_id, departure_city, arrival_city, departure_time, arrival_time, trip_count, trip_rate, total_amount, is_rate_manually_edited, rate_edit_reason, status, reviewed_by, reviewed_at, rejection_reason, payroll_id, notes, created_by, created_at, updated_at)
SELECT id, trip_number, trip_date, office_id, driver_id, route_id, trip_type_id, departure_city, arrival_city, departure_time, arrival_time, trip_count, trip_rate, total_amount, is_rate_manually_edited, rate_edit_reason, status, reviewed_by, reviewed_at, rejection_reason, payroll_id, notes, created_by, created_at, updated_at
FROM hr_drivers_db.driver_trips;

-- Copy payrolls
INSERT IGNORE INTO drv_payrolls 
  (id, payroll_code, driver_id, office_id, month, year, base_salary, approved_trips_count, approved_trips_amount, transport_allowance, fuel_allowance, additions_amount, deductions_amount, advances_amount, net_salary, status, approved_by, approved_at, reopened_by, reopened_at, reopen_reason, notes, created_by, created_at, updated_at)
SELECT id, payroll_code, driver_id, office_id, month, year, base_salary, approved_trips_count, approved_trips_amount, transport_allowance, fuel_allowance, additions_amount, deductions_amount, advances_amount, net_salary, status, approved_by, approved_at, reopened_by, reopened_at, reopen_reason, notes, created_by, created_at, updated_at
FROM hr_drivers_db.payrolls;

-- Copy payroll trip details
INSERT IGNORE INTO drv_payroll_trip_details 
  (id, payroll_id, driver_trip_id, trip_date, route_name, departure_city, arrival_city, trip_rate, trip_count, total_amount, created_at)
SELECT id, payroll_id, driver_trip_id, trip_date, route_name, departure_city, arrival_city, trip_rate, trip_count, total_amount, created_at
FROM hr_drivers_db.payroll_trip_details;

-- Copy trip rates history
INSERT IGNORE INTO drv_trip_rates_history 
  (id, route_id, old_rate, new_rate, effective_date, reason, changed_by, created_at)
SELECT id, route_id, old_rate, new_rate, effective_date, reason, changed_by, created_at
FROM hr_drivers_db.trip_rates_history;

-- Copy users from hr_drivers_db
INSERT IGNORE INTO drv_users 
  (id, username, password_hash, full_name, email, role, office_id, is_active, last_login, created_at, updated_at)
SELECT id, username, password_hash, full_name, email, role, office_id, is_active, last_login, created_at, updated_at
FROM hr_drivers_db.users;

-- Copy audit logs from hr_drivers_db
INSERT IGNORE INTO drv_audit_logs 
  (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at)
SELECT id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, created_at
FROM hr_drivers_db.audit_logs;

-- ─── Verification ────────────────────────────────────────────
SELECT 'Migration Complete!' as status;
SELECT 'drv_offices' as tbl, COUNT(*) as rows FROM drv_offices
UNION ALL SELECT 'drv_drivers', COUNT(*) FROM drv_drivers
UNION ALL SELECT 'drv_trip_types', COUNT(*) FROM drv_trip_types
UNION ALL SELECT 'drv_trip_routes', COUNT(*) FROM drv_trip_routes
UNION ALL SELECT 'drv_driver_trips', COUNT(*) FROM drv_driver_trips
UNION ALL SELECT 'drv_payrolls', COUNT(*) FROM drv_payrolls
UNION ALL SELECT 'drv_payroll_trip_details', COUNT(*) FROM drv_payroll_trip_details
UNION ALL SELECT 'drv_trip_rates_history', COUNT(*) FROM drv_trip_rates_history
UNION ALL SELECT 'drv_users', COUNT(*) FROM drv_users
UNION ALL SELECT 'drv_audit_logs', COUNT(*) FROM drv_audit_logs;
