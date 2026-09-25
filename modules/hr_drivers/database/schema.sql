-- ==============================================================================
-- Drivers & Trips Management Module (موديول إدارة السائقين والرحلات والرواتب)
-- Compatibility: MySQL 8.x / MariaDB 10.4+ / XAMPP
-- Engine: InnoDB, Charset: utf8mb4, Collation: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `hr_drivers_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hr_drivers_db`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. Offices Table (المكاتب والفروع)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `offices`;
CREATE TABLE `offices` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name_ar` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(50) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_office_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Users & Roles (المستخدمون والصلاحيات)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(100) NULL,
    `role` ENUM('admin', 'hr_manager', 'hr_employee', 'payroll', 'viewer') NOT NULL DEFAULT 'hr_employee',
    `office_id` INT UNSIGNED NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `last_login` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`) ON DELETE SET NULL,
    INDEX `idx_user_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Drivers Table (بيانات السائقين)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `drivers`;
CREATE TABLE `drivers` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `employee_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'الرقم الوظيفي',
    `driver_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'رقم السائق الداخلي',
    `full_name` VARCHAR(150) NOT NULL COMMENT 'الاسم الكامل',
    `father_name` VARCHAR(100) NULL COMMENT 'اسم الأب',
    `mother_name` VARCHAR(100) NULL COMMENT 'اسم الأم',
    `phone` VARCHAR(30) NOT NULL COMMENT 'رقم الهاتف',
    `national_id` VARCHAR(50) NOT NULL COMMENT 'رقم الهوية / البطاقة الوطنية',
    `license_number` VARCHAR(50) NOT NULL COMMENT 'رقم رخصة القيادة',
    `license_type` ENUM('عمومي', 'خصوصي', 'إنشائي', 'دولي', 'أخرى') NOT NULL DEFAULT 'عمومي' COMMENT 'نوع الرخصة',
    `license_issue_date` DATE NULL COMMENT 'تاريخ إصدار الرخصة',
    `license_expiry_date` DATE NULL COMMENT 'تاريخ انتهاء الرخصة',
    `office_id` INT UNSIGNED NOT NULL COMMENT 'المكتب التابع له',
    `status` ENUM('active', 'inactive', 'on_leave', 'suspended', 'transferred', 'resigned') NOT NULL DEFAULT 'active' COMMENT 'حالة السائق',
    `hire_date` DATE NOT NULL COMMENT 'تاريخ المباشرة',
    `termination_date` DATE NULL COMMENT 'تاريخ انتهاء الخدمة',
    `base_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'الراتب الأساسي',
    `transport_allowance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'بدل النقل',
    `fuel_allowance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'بدل الوقود',
    `notes` TEXT NULL COMMENT 'ملاحظات',
    `avatar_url` VARCHAR(255) NULL COMMENT 'صورة السائق',
    `deleted_at` DATETIME NULL COMMENT 'Soft Delete',
    `created_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`),
    INDEX `idx_driver_office` (`office_id`),
    INDEX `idx_driver_status` (`status`),
    INDEX `idx_driver_deleted` (`deleted_at`),
    INDEX `idx_driver_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Trip Types Table (أنواع الرحلات)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `trip_types`;
CREATE TABLE `trip_types` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name_ar` VARCHAR(100) NOT NULL,
    `name_en` VARCHAR(100) NOT NULL,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Trip Routes & Base Rates Table (جدول مسارات الرحلات والأسعار)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `trip_routes`;
CREATE TABLE `trip_routes` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `route_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'رقم الرحلة أو الرمز',
    `office_id` INT UNSIGNED NOT NULL COMMENT 'المكتب',
    `name` VARCHAR(150) NOT NULL COMMENT 'اسم أو وصف الرحلة',
    `trip_type_id` INT UNSIGNED NOT NULL COMMENT 'نوع الرحلة',
    `departure_city` VARCHAR(100) NOT NULL COMMENT 'مدينة الانطلاق',
    `arrival_city` VARCHAR(100) NOT NULL COMMENT 'مدينة الوصول',
    `pathway` TEXT NULL COMMENT 'المسار والتفاصيل',
    `current_rate` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'سعر الرحلة الحالي',
    `currency` VARCHAR(10) NOT NULL DEFAULT 'IQD' COMMENT 'العملة',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'الحالة',
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`),
    FOREIGN KEY (`trip_type_id`) REFERENCES `trip_types`(`id`),
    INDEX `idx_route_office` (`office_id`),
    INDEX `idx_route_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Trip Rate History (سجل تغيرات أسعار الرحلات التاريخية)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `trip_rates_history`;
CREATE TABLE `trip_rates_history` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `route_id` INT UNSIGNED NOT NULL,
    `old_rate` DECIMAL(12, 2) NOT NULL,
    `new_rate` DECIMAL(12, 2) NOT NULL,
    `effective_date` DATE NOT NULL,
    `reason` VARCHAR(255) NULL,
    `changed_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`route_id`) REFERENCES `trip_routes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Driver Trips / Timesheet (سجل الرحلات الفعلي)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `driver_trips`;
CREATE TABLE `driver_trips` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `trip_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'رقم السجل / الكود',
    `trip_date` DATE NOT NULL COMMENT 'تاريخ الرحلة',
    `office_id` INT UNSIGNED NOT NULL COMMENT 'المكتب',
    `driver_id` INT UNSIGNED NOT NULL COMMENT 'السائق',
    `route_id` INT UNSIGNED NOT NULL COMMENT 'الرحلة الأساسية',
    `trip_type_id` INT UNSIGNED NOT NULL COMMENT 'نوع الرحلة',
    `departure_city` VARCHAR(100) NOT NULL COMMENT 'مدينة الانطلاق',
    `arrival_city` VARCHAR(100) NOT NULL COMMENT 'مدينة الوصول',
    `departure_time` TIME NOT NULL COMMENT 'وقت الانطلاق',
    `arrival_time` TIME NULL COMMENT 'وقت الوصول / العودة',
    `trip_count` DECIMAL(5, 2) NOT NULL DEFAULT 1.00 COMMENT 'عدد الرحلات / التكرار',
    `trip_rate` DECIMAL(12, 2) NOT NULL COMMENT 'سعر الرحلة المحفوظ تاريخياً',
    `total_amount` DECIMAL(12, 2) NOT NULL COMMENT 'الإجمالي = السعر * العدد',
    `is_rate_manually_edited` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'هل تم تعديل السعر يدوياً',
    `rate_edit_reason` VARCHAR(255) NULL COMMENT 'سبب التعديل اليدوي للسعر',
    `status` ENUM('draft', 'pending', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT 'حالة الرحلة',
    `reviewed_by` INT UNSIGNED NULL COMMENT 'المستخدم المعتمد / الرافض',
    `reviewed_at` DATETIME NULL COMMENT 'تاريخ ووقت المراجعة',
    `rejection_reason` TEXT NULL COMMENT 'سبب الرفض إن وجد',
    `payroll_id` INT UNSIGNED NULL COMMENT 'معرف الراتب المرتبط عند الإدراج',
    `notes` TEXT NULL,
    `created_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`),
    FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`),
    FOREIGN KEY (`route_id`) REFERENCES `trip_routes`(`id`),
    FOREIGN KEY (`trip_type_id`) REFERENCES `trip_types`(`id`),
    INDEX `idx_trip_date` (`trip_date`),
    INDEX `idx_trip_driver` (`driver_id`),
    INDEX `idx_trip_status` (`status`),
    INDEX `idx_trip_payroll` (`payroll_id`),
    -- قيد لمنع تكرار نفس السائق في نفس التاريخ والمسار ووقت الانطلاق
    UNIQUE KEY `uk_driver_trip_duplicate` (`driver_id`, `trip_date`, `route_id`, `departure_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Payrolls Table (رواتب السائقين)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `payrolls`;
CREATE TABLE `payrolls` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payroll_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'كود كشف الراتب',
    `driver_id` INT UNSIGNED NOT NULL COMMENT 'السائق',
    `office_id` INT UNSIGNED NOT NULL COMMENT 'المكتب',
    `month` TINYINT UNSIGNED NOT NULL COMMENT 'الشهر (1-12)',
    `year` SMALLINT UNSIGNED NOT NULL COMMENT 'السنة (مثال: 2026)',
    `base_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'الراتب الأساسي',
    `approved_trips_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'عدد الرحلات المعتمدة',
    `approved_trips_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'إجمالي قيمة الرحلات المعتمدة',
    `transport_allowance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'بدل النقل',
    `fuel_allowance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'بدل الوقود',
    `additions_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'الإضافات والمكافآت',
    `deductions_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'الخصومات والغياب',
    `advances_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'السلف المستردة',
    `net_salary` DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'صافي الراتب المستحق',
    `status` ENUM('draft', 'calculated', 'approved', 'paid') NOT NULL DEFAULT 'calculated',
    `approved_by` INT UNSIGNED NULL,
    `approved_at` DATETIME NULL,
    `reopened_by` INT UNSIGNED NULL,
    `reopened_at` DATETIME NULL,
    `reopen_reason` TEXT NULL,
    `notes` TEXT NULL,
    `created_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`),
    FOREIGN KEY (`office_id`) REFERENCES `offices`(`id`),
    -- لا يمكن إنشاء كشفين لنفس السائق لنفس الشهر والسنة
    UNIQUE KEY `uk_driver_month_year` (`driver_id`, `month`, `year`),
    INDEX `idx_payroll_period` (`year`, `month`),
    INDEX `idx_payroll_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Payroll Trip Items / Details (تفاصيل الرحلات المساهمة في الراتب)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `payroll_trip_details`;
CREATE TABLE `payroll_trip_details` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payroll_id` INT UNSIGNED NOT NULL,
    `driver_trip_id` INT UNSIGNED NOT NULL,
    `trip_date` DATE NOT NULL,
    `route_name` VARCHAR(150) NOT NULL,
    `departure_city` VARCHAR(100) NOT NULL,
    `arrival_city` VARCHAR(100) NOT NULL,
    `trip_rate` DECIMAL(12, 2) NOT NULL,
    `trip_count` DECIMAL(5, 2) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`payroll_id`) REFERENCES `payrolls`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`driver_trip_id`) REFERENCES `driver_trips`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Audit Logs Table (سجل العمليات والأمان)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NULL,
    `username` VARCHAR(100) NOT NULL,
    `action` VARCHAR(50) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, APPROVE, REJECT, REOPEN',
    `table_name` VARCHAR(50) NOT NULL,
    `record_id` INT UNSIGNED NOT NULL,
    `old_values` JSON NULL,
    `new_values` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_table_record` (`table_name`, `record_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- SEED DATA (بيانات تجريبية جاهزة للاختبار الفوري)
-- ==============================================================================

-- 1. المكاتب
INSERT INTO `offices` (`id`, `code`, `name_ar`, `name_en`, `city`, `phone`, `is_active`) VALUES
(1, 'OFF-BGW', 'مكتب بغداد الرئيسي', 'Baghdad HQ', 'بغداد', '07701122334', 1),
(2, 'OFF-BSR', 'مكتب البصرة', 'Basra Branch', 'البصرة', '07802233445', 1),
(3, 'OFF-KRB', 'مكتب كربلاء', 'Karbala Branch', 'كربلاء', '07713344556', 1),
(4, 'OFF-NJF', 'مكتب النجف', 'Najaf Branch', 'النجف', '07814455667', 1),
(5, 'OFF-MSL', 'مكتب الموصل', 'Mosul Branch', 'الموصل', '07725566778', 1),
(6, 'OFF-ERB', 'مكتب أربيل', 'Erbil Branch', 'أربيل', '07506677889', 1);

-- 2. المستخدمون (Password: admin123 -> $2y$10$wT8Kz51Fk.eZ7sZ...)
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `email`, `role`, `office_id`, `is_active`) VALUES
(1, 'admin', '$2y$10$tZ9K6W6YpLqmYpUf7Vd9gexb7l6D0wO6E/eR0mZ2c8P4E2nL.xT6G', 'مدير النظام (Administrator)', 'admin@company.com', 'admin', 1, 1),
(2, 'hrmanager', '$2y$10$tZ9K6W6YpLqmYpUf7Vd9gexb7l6D0wO6E/eR0mZ2c8P4E2nL.xT6G', 'مدير الموارد البشرية (HR Manager)', 'hr@company.com', 'hr_manager', 1, 1),
(3, 'payroll_officer', '$2y$10$tZ9K6W6YpLqmYpUf7Vd9gexb7l6D0wO6E/eR0mZ2c8P4E2nL.xT6G', 'مسؤول الرواتب (Payroll)', 'payroll@company.com', 'payroll', 1, 1),
(4, 'hr_emp', '$2y$10$tZ9K6W6YpLqmYpUf7Vd9gexb7l6D0wO6E/eR0mZ2c8P4E2nL.xT6G', 'موظف إدخال الرحلات (HR Employee)', 'emp@company.com', 'hr_employee', 1, 1);

-- 3. أنواع الرحلات
INSERT INTO `trip_types` (`id`, `name_ar`, `name_en`, `code`, `description`, `is_active`) VALUES
(1, 'داخل المدينة', 'Inside City', 'CITY_LOCAL', 'الرحلات والتوصيلات داخل حدود نفس المحافظة', 1),
(2, 'بين المحافظات', 'Inter-City', 'INTER_CITY', 'رحلات التنقل بين المدن والمحافظات العراقية', 1),
(3, 'رحلة خارجية / إقليمية', 'External / Regional', 'EXTERNAL', 'رحلات عبر المنافذ أو خارج الحدود', 1),
(4, 'مهمة خاصة / أخرى', 'Special Duty', 'SPECIAL', 'مهمات ووفود خاصة تتطلب ترتيبات منفصلة', 1);

-- 4. مسارات الرحلات والأسعار الأساسية
INSERT INTO `trip_routes` (`id`, `route_code`, `office_id`, `name`, `trip_type_id`, `departure_city`, `arrival_city`, `pathway`, `current_rate`, `currency`, `is_active`, `notes`) VALUES
(1, 'BGW-LOC-01', 1, 'بغداد → داخل المدينة (توصيل وإجراءات)', 1, 'بغداد', 'بغداد', 'كافة قطاعات العاصمة بغداد (كرخ ورصافة)', 10000.00, 'IQD', 1, 'سعر ثابت للرحلة الواحدة'),
(2, 'BGW-KRB-01', 1, 'بغداد → كربلاء المقدسة', 2, 'بغداد', 'كربلاء', 'طريق المرور السريع الجنوبي', 50000.00, 'IQD', 1, 'يشمل أجور المرور'),
(3, 'BGW-NJF-01', 1, 'بغداد → النجف الأشرف', 2, 'بغداد', 'النجف', 'طريق سريع الدورة - الحلة - النجف', 60000.00, 'IQD', 1, 'رحلة ذهاب وإياب اعتيادية'),
(4, 'BGW-BSR-01', 1, 'بغداد → البصرة الفيحاء', 2, 'بغداد', 'البصرة', 'طريق المرور السريع رقم 1', 120000.00, 'IQD', 1, 'مسار طويل مخصص للشاحنات والمركبات'),
(5, 'BSR-LOC-01', 2, 'البصرة → داخل المدينة', 1, 'البصرة', 'البصرة', 'مركز المدينة والموانئ والمعقل', 10000.00, 'IQD', 1, 'رحلة داخلية'),
(6, 'BSR-BGW-01', 2, 'البصرة → بغداد', 2, 'البصرة', 'بغداد', 'طريق المرور السريع باتجاه بغداد', 100000.00, 'IQD', 1, 'رحلة خط رئيسي'),
(7, 'ERB-MSL-01', 6, 'أربيل → الموصل', 2, 'أربيل', 'الموصل', 'طريق أربيل - خازر - الموصل', 35000.00, 'IQD', 1, 'خط مباشر'),
(8, 'KRB-NJF-01', 3, 'كربلاء → النجف', 2, 'كربلاء', 'النجف', 'طريق النجف - كربلاء القديم والجديد', 25000.00, 'IQD', 1, 'رحلة دورية');

-- 5. السائقون
INSERT INTO `drivers` (`id`, `employee_code`, `driver_number`, `full_name`, `father_name`, `mother_name`, `phone`, `national_id`, `license_number`, `license_type`, `license_issue_date`, `license_expiry_date`, `office_id`, `status`, `hire_date`, `base_salary`, `transport_allowance`, `fuel_allowance`, `notes`) VALUES
(1, 'EMP-1001', 'DRV-01', 'أحمد كريم حميد الشمري', 'كريم', 'فاطمة', '07705544332', '19881029384', 'LIC-BGW-8472', 'عمومي', '2020-03-15', '2028-03-15', 1, 'active', '2022-01-10', 600000.00, 50000.00, 100000.00, 'سائق قديم ملتزم بالمسارات الجنوبية'),
(2, 'EMP-1002', 'DRV-02', 'علي حيدر كاظم الزيدي', 'حيدر', 'زينب', '07804433221', '19924039281', 'LIC-BGW-9912', 'عمومي', '2021-06-01', '2029-06-01', 1, 'active', '2022-05-15', 600000.00, 50000.00, 80000.00, 'سائق داخل بغداد والفرات الأوسط'),
(3, 'EMP-1003', 'DRV-03', 'حسين عادل جبر المالكي', 'عادل', 'مريم', '07719988776', '19857362819', 'LIC-BSR-1124', 'عمومي', '2019-01-20', '2027-01-20', 2, 'active', '2021-03-01', 650000.00, 60000.00, 120000.00, 'مسؤول حركة خط البصرة الدولي'),
(4, 'EMP-1004', 'DRV-04', 'محمد عبد الله فاضل السعدي', 'عبد الله', 'خديجة', '07503322119', '19958273611', 'LIC-ERB-4411', 'عمومي', '2022-09-10', '2030-09-10', 6, 'active', '2023-02-01', 580000.00, 40000.00, 75000.00, 'خط الشمال والموصل'),
(5, 'EMP-1005', 'DRV-05', 'ياسر شاكر محمود الدليمي', 'شاكر', 'هدى', '07817766554', '19902938475', 'LIC-KRB-7721', 'خصوصي', '2021-11-05', '2029-11-05', 3, 'on_leave', '2023-06-15', 550000.00, 50000.00, 60000.00, 'إجازة اعتيادية حالياً');

-- 6. سجل الرحلات والـ Timesheet
INSERT INTO `driver_trips` (`id`, `trip_number`, `trip_date`, `office_id`, `driver_id`, `route_id`, `trip_type_id`, `departure_city`, `arrival_city`, `departure_time`, `arrival_time`, `trip_count`, `trip_rate`, `total_amount`, `is_rate_manually_edited`, `status`, `reviewed_by`, `reviewed_at`, `notes`) VALUES
(1, 'TRIP-202609-001', '2026-09-01', 1, 1, 2, 2, 'بغداد', 'كربلاء', '07:30:00', '11:00:00', 1.00, 50000.00, 50000.00, 0, 'approved', 2, '2026-09-02 09:15:00', 'رحلة وفد تجاري، تمت بنجاح'),
(2, 'TRIP-202609-002', '2026-09-03', 1, 1, 3, 2, 'بغداد', 'النجف', '06:00:00', '12:30:00', 1.00, 60000.00, 60000.00, 0, 'approved', 2, '2026-09-04 10:00:00', 'توصيل مستلزمات طبية'),
(3, 'TRIP-202609-003', '2026-09-05', 1, 1, 1, 1, 'بغداد', 'بغداد', '09:00:00', '14:00:00', 2.00, 10000.00, 20000.00, 0, 'approved', 2, '2026-09-06 08:30:00', 'رحلتان داخليتان لنقل طرود'),
(4, 'TRIP-202609-004', '2026-09-08', 1, 2, 1, 1, 'بغداد', 'بغداد', '08:00:00', '13:00:00', 3.00, 10000.00, 30000.00, 0, 'approved', 2, '2026-09-09 11:20:00', '3 رحلات داخلية موزعة في الكرخ'),
(5, 'TRIP-202609-005', '2026-09-10', 2, 3, 6, 2, 'البصرة', 'بغداد', '05:00:00', '16:00:00', 1.00, 100000.00, 100000.00, 0, 'approved', 2, '2026-09-11 09:40:00', 'نقل موظفي الإدارة الإقليمية'),
(6, 'TRIP-202609-006', '2026-09-12', 1, 1, 2, 2, 'بغداد', 'كربلاء', '08:00:00', '12:00:00', 1.00, 50000.00, 50000.00, 0, 'pending', NULL, NULL, 'بانتظار مراجعة مسير الحركة'),
(7, 'TRIP-202609-007', '2026-09-13', 2, 3, 5, 1, 'البصرة', 'البصرة', '10:00:00', '15:00:00', 1.00, 15000.00, 15000.00, 1, 'pending', NULL, NULL, 'تعديل السعر يدوياً بسبب الحمولة الثقيلة');

-- 7. رواتب تجريبية لشهر أغسطس 2026
INSERT INTO `payrolls` (`id`, `payroll_code`, `driver_id`, `office_id`, `month`, `year`, `base_salary`, `approved_trips_count`, `approved_trips_amount`, `transport_allowance`, `fuel_allowance`, `additions_amount`, `deductions_amount`, `advances_amount`, `net_salary`, `status`, `approved_by`, `approved_at`, `notes`) VALUES
(1, 'PAY-202608-001', 1, 1, 8, 2026, 600000.00, 6, 280000.00, 50000.00, 100000.00, 25000.00, 0.00, 50000.00, 1005000.00, 'approved', 1, '2026-09-01 10:00:00', 'راتب معتمد لشهر آب 2026');

-- 8. Audit Log أولي
INSERT INTO `audit_logs` (`id`, `user_id`, `username`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`) VALUES
(1, 1, 'admin', 'INIT', 'database', 1, NULL, JSON_OBJECT('message', 'Initial database schema and seeds installed successfully'), '127.0.0.1');
