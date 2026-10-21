-- ===================================================================
-- Standalone Incentives Management System (IMS)
-- Database Name: incentives_management_db
-- Target DBMS: MySQL 5.7+ / 8.0+ / MariaDB 10.4+
-- Charset: utf8mb4 COLLATE utf8mb4_unicode_ci
-- ===================================================================

CREATE DATABASE IF NOT EXISTS `incentives_management_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `incentives_management_db`;

-- -------------------------------------------------------------------
-- 1. Table: ims_users
-- System users, roles and credentials
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_users` (
  `id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `role` ENUM('admin', 'specialist', 'reviewer', 'approver') NOT NULL DEFAULT 'specialist',
  `office` VARCHAR(100) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 2. Table: ims_employees
-- Standalone employees table (with employee_id as institutional HR link)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_employees` (
  `id` VARCHAR(50) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Institutional / HR unique employee number',
  `name` VARCHAR(150) NOT NULL,
  `office` VARCHAR(100) NOT NULL,
  `job_title` VARCHAR(100) NOT NULL,
  `category` ENUM('Loan Officer', 'Loan Officer Supervisor') NOT NULL,
  `supervisor_id` VARCHAR(50) NULL COMMENT 'Refers to employee_id of the supervisor',
  `status` ENUM('Active', 'On Leave', 'Inactive') NOT NULL DEFAULT 'Active',
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_emp_id` (`employee_id`),
  INDEX `idx_sup_id` (`supervisor_id`),
  INDEX `idx_office` (`office`),
  INDEX `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 3. Table: ims_variables_config
-- The 10 customizable variables definition
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_variables_config` (
  `id` VARCHAR(50) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. Variable01 to Variable10',
  `name_ar` VARCHAR(150) NOT NULL,
  `name_en` VARCHAR(150) NOT NULL,
  `data_type` ENUM('integer', 'currency', 'percentage', 'number') NOT NULL DEFAULT 'number',
  `unit` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  `default_value` DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
  `min_val` DECIMAL(14, 4) NULL,
  `max_val` DECIMAL(14, 4) NULL,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 4. Table: ims_formulas
-- Dynamic formula definitions and version tracking
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_formulas` (
  `id` VARCHAR(50) NOT NULL,
  `formula_type` ENUM('lo_incentives', 'lo_transportation', 'lo_bonus', 'supervisor_incentives') NOT NULL,
  `name_ar` VARCHAR(150) NOT NULL,
  `name_en` VARCHAR(150) NOT NULL,
  `expression` TEXT NOT NULL COMMENT 'Safe math formula AST expression',
  `description` TEXT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_by` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_formula_type` (`formula_type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 5. Table: ims_import_batches
-- Excel import batches tracking
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_import_batches` (
  `id` VARCHAR(50) NOT NULL,
  `period` VARCHAR(7) NOT NULL COMMENT 'Format: YYYY-MM',
  `file_name` VARCHAR(255) NOT NULL,
  `sheet_name` VARCHAR(100) NOT NULL,
  `total_rows` INT NOT NULL DEFAULT 0,
  `valid_rows` INT NOT NULL DEFAULT 0,
  `error_rows` INT NOT NULL DEFAULT 0,
  `column_mappings` JSON NOT NULL,
  `imported_by` VARCHAR(100) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_batch_period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 6. Table: ims_imported_rows
-- Raw imported variable rows per employee
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_imported_rows` (
  `id` BIGINT AUTO_INCREMENT NOT NULL,
  `batch_id` VARCHAR(50) NOT NULL,
  `period` VARCHAR(7) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `employee_name` VARCHAR(150) NULL,
  `office` VARCHAR(100) NULL,
  `variables_json` JSON NOT NULL COMMENT 'Variables key-value map',
  `is_valid` TINYINT(1) NOT NULL DEFAULT 1,
  `errors_json` JSON NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`batch_id`) REFERENCES `ims_import_batches`(`id`) ON DELETE CASCADE,
  INDEX `idx_row_emp_period` (`employee_id`, `period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 7. Table: ims_lo_entitlements
-- Calculated results for Loan Officers
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_lo_entitlements` (
  `id` VARCHAR(100) NOT NULL,
  `batch_id` VARCHAR(50) NOT NULL,
  `period` VARCHAR(7) NOT NULL,
  `employee_id` VARCHAR(50) NOT NULL,
  `employee_name` VARCHAR(150) NOT NULL,
  `office` VARCHAR(100) NOT NULL,
  `supervisor_id` VARCHAR(50) NULL,
  `variables_snapshot` JSON NOT NULL,
  `incentives` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `transportation` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `bonus` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_entitlements` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `formula_version_used` JSON NOT NULL,
  `breakdown_json` JSON NULL,
  `status` ENUM('Draft', 'Calculated', 'Under Review', 'Approved', 'Locked') NOT NULL DEFAULT 'Calculated',
  `calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calculated_by` VARCHAR(100) NOT NULL,
  `revision` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  INDEX `idx_lo_period` (`period`),
  INDEX `idx_lo_empid` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 8. Table: ims_supervisor_entitlements
-- Calculated results for Supervisors
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_supervisor_entitlements` (
  `id` VARCHAR(100) NOT NULL,
  `batch_id` VARCHAR(50) NOT NULL,
  `period` VARCHAR(7) NOT NULL,
  `supervisor_id` VARCHAR(50) NOT NULL,
  `supervisor_name` VARCHAR(150) NOT NULL,
  `office` VARCHAR(100) NOT NULL,
  `supervised_officers_count` INT NOT NULL DEFAULT 0,
  `qualified_officers_count` INT NOT NULL DEFAULT 0,
  `total_disbursed_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_disbursed_count` INT NOT NULL DEFAULT 0,
  `average_repayment_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `total_team_incentives` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `average_team_incentives` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `incentives` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `transportation` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `bonus` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total_entitlements` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `formula_version_used` INT NOT NULL DEFAULT 1,
  `formula_expression` TEXT NOT NULL,
  `breakdown_json` JSON NULL,
  `status` ENUM('Draft', 'Calculated', 'Under Review', 'Approved', 'Locked') NOT NULL DEFAULT 'Calculated',
  `calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `calculated_by` VARCHAR(100) NOT NULL,
  `revision` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  INDEX `idx_sup_period` (`period`),
  INDEX `idx_sup_supid` (`supervisor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 9. Table: ims_period_summaries
-- Executive period state, status lifecycle and approval
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_period_summaries` (
  `period` VARCHAR(7) NOT NULL,
  `status` ENUM('Draft', 'Calculated', 'Under Review', 'Approved', 'Locked') NOT NULL DEFAULT 'Draft',
  `lo_count` INT NOT NULL DEFAULT 0,
  `supervisor_count` INT NOT NULL DEFAULT 0,
  `total_incentives` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_transportation` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `total_bonus` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `last_calculated_at` DATETIME NULL,
  `approved_by` VARCHAR(100) NULL,
  `approved_at` DATETIME NULL,
  `locked_by` VARCHAR(100) NULL,
  `locked_at` DATETIME NULL,
  `recalculation_notes` JSON NULL,
  PRIMARY KEY (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------
-- 10. Table: ims_audit_logs
-- Comprehensive audit trail
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ims_audit_logs` (
  `id` VARCHAR(50) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` VARCHAR(50) NOT NULL,
  `user_name` VARCHAR(150) NOT NULL,
  `user_role` VARCHAR(50) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `affected_entity_id` VARCHAR(100) NULL,
  `ip_address` VARCHAR(50) NULL,
  `previous_value` TEXT NULL,
  `new_value` TEXT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_audit_time` (`timestamp`),
  INDEX `idx_audit_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================================================
-- SEED DATA: Variables Definitions
-- ===================================================================
INSERT INTO `ims_variables_config` (`id`, `code`, `name_ar`, `name_en`, `data_type`, `unit`, `description`, `default_value`, `min_val`, `max_val`) VALUES
('var_01', 'Variable01', 'عدد القروض المنصرفة', 'Disbursed Loans Count', 'integer', 'قرض', 'إجمالي عدد ملفات التمويل المنصرفة للعملاء', 0, 0, 200),
('var_02', 'Variable02', 'إجمالي قيمة المبالغ المنصرفة', 'Total Disbursed Volume', 'currency', 'ريال', 'المبلغ الإجمالي الممنوح بالريال', 0, 0, NULL),
('var_03', 'Variable03', 'نسبة التحصيل والسداد', 'Repayment Collection Rate', 'percentage', '%', 'النسبة المئوية للأقساط المحصلة', 95, 0, 100),
('var_04', 'Variable04', 'عدد العملاء النشطين بالمحفظة', 'Active Portfolio Clients', 'integer', 'عميل', 'إجمالي عدد المقترضين القائمين', 0, 0, NULL),
('var_05', 'Variable05', 'محفظة المخاطر المتأخرة PAR>30', 'Portfolio at Risk (PAR30)', 'percentage', '%', 'نسبة القروض المتعثرة المتأخرة لأكثر من 30 يوماً', 2, 0, 100),
('var_06', 'Variable06', 'عدد الزيارات الميدانية المنفذة', 'Field Inspection Visits', 'integer', 'زيارة', 'عدد المعاينات والزيارات الميدانية', 0, 0, NULL),
('var_07', 'Variable07', 'عدد العملاء الجدد المكتسبين', 'New Clients Acquisition', 'integer', 'عميل جديد', 'العملاء الجدد الذين تم ضمهم للمرة الأولى', 0, 0, NULL),
('var_08', 'Variable08', 'مؤشر جودة ملفات الائتمان', 'Credit File Quality Score', 'number', 'نقطة', 'درجة تقييم دقة البيانات والاستعلام الائتماني', 90, 0, 100),
('var_09', 'Variable09', 'أيام العمل الميداني الفعلية', 'Actual Field Days Worked', 'integer', 'يوم', 'عدد أيام الحضور والعمل الميداني المعتمدة', 22, 0, 31),
('var_10', 'Variable10', 'مؤشر التميز والأداء النوعي', 'Operational Excellence Index', 'number', 'معامل', 'معامل إضافي يعكس رضا العملاء والالتزام', 1, 0, 10)
ON DUPLICATE KEY UPDATE `code`=VALUES(`code`);

-- ===================================================================
-- SEED DATA: Default Dynamic Formulas
-- ===================================================================
INSERT INTO `ims_formulas` (`id`, `formula_type`, `name_ar`, `name_en`, `expression`, `description`, `version`, `effective_from`, `is_active`, `updated_by`) VALUES
('fml_lo_inc_v1', 'lo_incentives', 'معادلة حوافز مسؤولي القروض الأساسية', 'Loan Officer Incentives Core Formula', 'IF(Variable03 >= 95, (Variable01 * 140) + (Variable02 * 0.0035) - (Variable05 * 80), (Variable01 * 75) + (Variable02 * 0.0018))', 'حافز الأداء المرتبط بنسبة السداد وحجم التمويل والحد من المخاطر', 1, '2026-01-01', 1, 'مدير النظام'),
('fml_lo_trans_v1', 'lo_transportation', 'مخصصات بدل الانتقال الميداني', 'Loan Officer Transportation Allowance', 'IF(Variable06 >= 15, 750 + (Variable06 - 15) * 30, Variable06 * 40)', 'بدل الانتقال الميداني بحسب عدد المعاينات والزيارات', 1, '2026-01-01', 1, 'مدير النظام'),
('fml_lo_bonus_v1', 'lo_bonus', 'مكافآت التميز والعملاء الجدد', 'Performance & New Acquisition Bonus', 'IF(Variable03 >= 97 AND Variable07 >= 6, 1200 + (Variable10 * 100), IF(Variable03 >= 95 AND Variable07 >= 3, 600, 0))', 'مكافأة الاستحواذ وسداد المحفظة الممتاز', 1, '2026-01-01', 1, 'مدير النظام'),
('fml_sup_inc_v1', 'supervisor_incentives', 'معادلة حوافز مشرفي مسؤولي القروض', 'Supervisor Entitlement Rollup Formula', 'IF(LO_AVG_REPAYMENT >= 95, (LO_TOTAL_INCENTIVES * 0.16) + (LO_QUALIFIED_COUNT * 250) + (LO_TOTAL_DISBURSED * 0.0008), LO_TOTAL_INCENTIVES * 0.09)', 'حافز الإشراف التجميعي المبني على إجمالي حوافز وصرف وتحصيل الفريق', 1, '2026-01-01', 1, 'مدير النظام')
ON DUPLICATE KEY UPDATE `version`=VALUES(`version`);
