import React, { useState } from 'react';

const FULL_SQL_SCRIPT = `-- =====================================================
-- VITAS IRAQ HRMS - Complete Database Schema
-- =====================================================
-- Database: hrms_pro_db
-- Character Set: utf8mb4
-- Collation: utf8mb4_unicode_ci
-- =====================================================

-- Create Database
CREATE DATABASE IF NOT EXISTS \`hrms_pro_db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`hrms_pro_db\`;

-- =====================================================
-- TABLE: users
-- =====================================================
CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`username\` varchar(100) NOT NULL UNIQUE,
    \`password\` varchar(255) NOT NULL,
    \`full_name\` varchar(255) NOT NULL,
    \`email\` varchar(150) NOT NULL UNIQUE,
    \`role\` varchar(50) NOT NULL DEFAULT 'Admin',
    \`can_manage_employees\` tinyint(1) DEFAULT 1,
    \`can_manage_finance\` tinyint(1) DEFAULT 1,
    \`can_manage_recruitment\` tinyint(1) DEFAULT 1,
    \`can_manage_settings\` tinyint(1) DEFAULT 0,
    \`can_manage_users\` tinyint(1) DEFAULT 1,
    \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`allowed_screens\` text DEFAULT NULL,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: employees
-- =====================================================
CREATE TABLE IF NOT EXISTS \`employees\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` varchar(50) NOT NULL UNIQUE,
    \`badge_no\` varchar(50) DEFAULT NULL,
    \`full_name_en\` varchar(255) NOT NULL,
    \`full_name_ar\` varchar(255) NOT NULL,
    \`dob\` date DEFAULT NULL,
    \`mobile\` varchar(50) DEFAULT NULL,
    \`position\` varchar(150) DEFAULT NULL,
    \`email\` varchar(150) NOT NULL UNIQUE,
    \`gender\` enum('male','female') NOT NULL DEFAULT 'male',
    \`marital_status\` enum('single','married','divorced','widow') NOT NULL DEFAULT 'single',
    \`spouse_name\` varchar(255) DEFAULT NULL,
    \`spouse_employed_here\` tinyint(4) DEFAULT 0,
    \`photo_url\` LONGTEXT DEFAULT NULL,
    \`bank_name\` varchar(150) DEFAULT NULL,
    \`iban\` varchar(50) DEFAULT NULL,
    \`national_id\` varchar(100) DEFAULT NULL,
    \`passport_no\` varchar(100) DEFAULT NULL,
    \`passport_expiry\` date DEFAULT NULL,
    \`location_en\` varchar(255) DEFAULT NULL,
    \`location_ar\` varchar(255) DEFAULT NULL,
    \`years_of_employment\` int(11) DEFAULT 0,
    \`years_in_position\` int(11) DEFAULT 0,
    \`emergency_mobile\` varchar(255) DEFAULT NULL,
    \`position_en\` varchar(255) DEFAULT NULL,
    \`position_ar\` varchar(255) DEFAULT NULL,
    \`personal_email\` varchar(255) DEFAULT NULL,
    \`org_email\` varchar(255) DEFAULT NULL,
    \`supervisor_name\` varchar(255) DEFAULT NULL,
    \`work_scope\` varchar(50) DEFAULT NULL,
    \`department\` varchar(150) DEFAULT NULL,
    \`contract_start_date\` date DEFAULT NULL,
    \`contract_end_date\` date DEFAULT NULL,
    \`contract_original_start\` date DEFAULT NULL,
    \`probation_end_date\` date DEFAULT NULL,
    \`exit_date\` date DEFAULT NULL,
    \`term_of_contract\` varchar(150) DEFAULT NULL,
    \`grade\` varchar(100) DEFAULT NULL,
    \`basic_salary\` varchar(100) DEFAULT NULL,
    \`written_basic_salary_ar\` text DEFAULT NULL,
    \`transportation_fixed\` decimal(15,2) DEFAULT 0.00,
    \`fixed_bonus\` decimal(15,2) DEFAULT 0.00,
    \`phone_allowance\` decimal(15,2) DEFAULT 0.00,
    \`certificate_allowance\` decimal(15,2) DEFAULT 0.00,
    \`nationality\` varchar(100) DEFAULT NULL,
    \`children_json\` longtext DEFAULT NULL,
    \`status_changes_json\` longtext DEFAULT NULL,
    \`trainings_json\` longtext DEFAULT NULL,
    \`warnings_json\` longtext DEFAULT NULL,
    \`status\` enum('active','inactive','onboarding') NOT NULL DEFAULT 'onboarding',
    \`candidate_id\` int(11) DEFAULT NULL UNIQUE,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: attendance
-- =====================================================
CREATE TABLE IF NOT EXISTS \`attendance\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` int(11) NOT NULL,
    \`attendance_date\` date NOT NULL,
    \`day_of_week\` tinyint(1) NOT NULL,
    \`check_in\` time DEFAULT NULL,
    \`check_out\` time DEFAULT NULL,
    \`work_hours\` decimal(5,2) DEFAULT NULL,
    \`late_minutes\` int(11) NOT NULL DEFAULT 0,
    \`overtime_minutes\` int(11) NOT NULL DEFAULT 0,
    \`status\` enum('present','absent','late','on_leave','holiday','weekend') NOT NULL DEFAULT 'present',
    \`notes\` text DEFAULT NULL,
    \`sync_id\` varchar(64) DEFAULT NULL UNIQUE,
    \`updated_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: approval_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS \`approval_requests\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` int(11) NOT NULL,
    \`type\` enum('Annual Leave','Sick Leave','Travel Expense','Contract Renewal','Asset Request','Other') NOT NULL,
    \`amount\` decimal(10,2) DEFAULT NULL,
    \`start_date\` date DEFAULT NULL,
    \`end_date\` date DEFAULT NULL,
    \`details\` text DEFAULT NULL,
    \`status\` enum('Pending Review','Awaiting Invoice','Urgent','Approved','Rejected') NOT NULL DEFAULT 'Pending Review',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: payroll_periods
-- =====================================================
CREATE TABLE IF NOT EXISTS \`payroll_periods\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`period_name\` varchar(100) NOT NULL,
    \`start_date\` date NOT NULL,
    \`end_date\` date NOT NULL,
    \`total_salary\` decimal(15,2) NOT NULL DEFAULT 0.00,
    \`status\` enum('Draft','Processing','Approved','Paid') NOT NULL DEFAULT 'Draft',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: salary_slips
-- =====================================================
CREATE TABLE IF NOT EXISTS \`salary_slips\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` int(11) NOT NULL,
    \`payroll_period_id\` int(11) NOT NULL,
    \`base_salary\` decimal(12,2) NOT NULL,
    \`allowances\` decimal(12,2) NOT NULL DEFAULT 0.00,
    \`deductions\` decimal(12,2) NOT NULL DEFAULT 0.00,
    \`net_salary\` decimal(12,2) NOT NULL,
    \`status\` enum('Pending','Paid') NOT NULL DEFAULT 'Pending',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: notifications
-- =====================================================
CREATE TABLE IF NOT EXISTS \`notifications\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` int(11) DEFAULT NULL,
    \`title\` varchar(255) NOT NULL,
    \`message\` text NOT NULL,
    \`type\` enum('alert','message','approval','system') NOT NULL DEFAULT 'system',
    \`is_read\` tinyint(1) NOT NULL DEFAULT 0,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: assets
-- =====================================================
CREATE TABLE IF NOT EXISTS \`assets\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`asset_name\` varchar(255) NOT NULL,
    \`serial_number\` varchar(100) NOT NULL UNIQUE,
    \`category\` varchar(100) NOT NULL,
    \`status\` enum('available','assigned','maintenance') NOT NULL DEFAULT 'available',
    \`employee_id\` int(11) DEFAULT NULL,
    \`handover_date\` date DEFAULT NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: job_openings
-- =====================================================
CREATE TABLE IF NOT EXISTS \`job_openings\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`title\` varchar(255) NOT NULL,
    \`department\` varchar(150) NOT NULL,
    \`location\` varchar(150) NOT NULL,
    \`type\` varchar(100) NOT NULL,
    \`status\` enum('active','paused','closed') NOT NULL DEFAULT 'active',
    \`requirements\` text DEFAULT NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: candidates
-- =====================================================
CREATE TABLE IF NOT EXISTS \`candidates\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`job_opening_id\` int(11) NOT NULL,
    \`full_name\` varchar(255) NOT NULL,
    \`email\` varchar(150) NOT NULL,
    \`mobile\` varchar(50) DEFAULT NULL,
    \`stage\` enum('Applied','Screening','Interview','Shortlisted','Offer','Hired','Rejected') NOT NULL DEFAULT 'Applied',
    \`resume_url\` varchar(255) DEFAULT NULL,
    \`photo_url\` varchar(255) DEFAULT NULL,
    \`rating\` int(11) DEFAULT 3,
    \`experience_years\` int(11) DEFAULT 0,
    \`notes\` text DEFAULT NULL,
    \`committee_opinion\` text DEFAULT NULL,
    \`decision_reason\` text DEFAULT NULL,
    \`committee_scores\` text DEFAULT NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: support_tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS \`support_tickets\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` int(11) NOT NULL,
    \`subject\` varchar(255) NOT NULL,
    \`category\` enum('IT Support','HR Query','Facilities','Other') NOT NULL,
    \`description\` text NOT NULL,
    \`status\` enum('Open','In Progress','Resolved','Closed') NOT NULL DEFAULT 'Open',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: audit_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`user_name\` varchar(255) NOT NULL,
    \`user_role\` varchar(150) NOT NULL DEFAULT 'System User',
    \`event_type\` varchar(100) NOT NULL,
    \`description\` text NOT NULL,
    \`ip_address\` varchar(100) DEFAULT '127.0.0.1',
    \`location\` varchar(150) DEFAULT 'Baghdad, Iraq',
    \`severity\` enum('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'LOW',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: offices
-- =====================================================
CREATE TABLE IF NOT EXISTS \`offices\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`code\` varchar(50) NOT NULL UNIQUE,
    \`name_ar\` varchar(255) NOT NULL,
    \`name_en\` varchar(255) NOT NULL,
    \`address_ar\` text DEFAULT NULL,
    \`address_en\` text DEFAULT NULL,
    \`type_ar\` varchar(100) DEFAULT 'فرع إقليمي',
    \`type_en\` varchar(100) DEFAULT 'Regional Branch',
    \`governorate_ar\` varchar(100) DEFAULT 'بغداد',
    \`governorate_en\` varchar(100) DEFAULT 'Baghdad',
    \`workforce_count\` int(11) DEFAULT 45,
    \`manager_ar\` varchar(255) DEFAULT 'غير معين',
    \`manager_en\` varchar(255) DEFAULT 'Unassigned',
    \`status_ar\` varchar(100) DEFAULT '● نشط',
    \`status_en\` varchar(100) DEFAULT '● Active',
    \`working_hours_ar\` varchar(255) DEFAULT '08:00 ص - 04:00 م',
    \`working_hours_en\` varchar(255) DEFAULT '08:00 AM - 04:00 PM',
    \`icon\` varchar(100) DEFAULT 'domain',
    \`bg_class\` varchar(100) DEFAULT 'bg-teal-900',
    \`type_badge_bg\` varchar(100) DEFAULT 'bg-teal-500',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: departments
-- =====================================================
CREATE TABLE IF NOT EXISTS \`departments\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`code\` varchar(50) NOT NULL UNIQUE,
    \`name_ar\` varchar(255) NOT NULL,
    \`name_en\` varchar(255) NOT NULL,
    \`description_ar\` text DEFAULT NULL,
    \`description_en\` text DEFAULT NULL,
    \`head_ar\` varchar(255) DEFAULT 'غير معين',
    \`head_en\` varchar(255) DEFAULT 'Unassigned',
    \`staff_count\` int(11) DEFAULT 20,
    \`icon\` varchar(100) DEFAULT 'business_center',
    \`bg_color\` varchar(100) DEFAULT 'bg-indigo-50',
    \`text_color\` varchar(100) DEFAULT 'text-indigo-600',
    \`border_color\` varchar(100) DEFAULT 'border-indigo-100',
    \`badge_text_color\` varchar(100) DEFAULT 'text-indigo-600',
    \`badge_bg_color\` varchar(100) DEFAULT 'bg-indigo-50',
    \`badge_border_color\` varchar(100) DEFAULT 'border-indigo-200',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: positions
-- =====================================================
CREATE TABLE IF NOT EXISTS \`positions\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`code\` varchar(50) NOT NULL UNIQUE,
    \`title_ar\` varchar(255) NOT NULL,
    \`title_en\` varchar(255) NOT NULL,
    \`description_ar\` text DEFAULT NULL,
    \`description_en\` text DEFAULT NULL,
    \`department_id\` int(11) DEFAULT NULL,
    \`grade_level\` varchar(50) DEFAULT NULL,
    \`salary_range_min\` decimal(15,2) DEFAULT NULL,
    \`salary_range_max\` decimal(15,2) DEFAULT NULL,
    \`requirements_ar\` text DEFAULT NULL,
    \`requirements_en\` text DEFAULT NULL,
    \`status\` enum('active','inactive') NOT NULL DEFAULT 'active',
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: leaves
-- =====================================================
CREATE TABLE IF NOT EXISTS \`leaves\` (
    \`id\` int(11) NOT NULL AUTO_INCREMENT,
    \`employee_id\` int(11) NOT NULL,
    \`leave_type\` enum('Annual','Sick','Emergency','Maternity','Paternity','Unpaid','Study','Other') NOT NULL,
    \`start_date\` date NOT NULL,
    \`end_date\` date NOT NULL,
    \`total_days\` decimal(5,2) NOT NULL,
    \`reason\` text DEFAULT NULL,
    \`status\` enum('Pending','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',
    \`approved_by\` int(11) DEFAULT NULL,
    \`approved_at\` timestamp NULL DEFAULT NULL,
    \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default Admin Seed
INSERT IGNORE INTO users (username, password, full_name, email, role, can_manage_employees, can_manage_finance, can_manage_recruitment, can_manage_settings, can_manage_users) 
VALUES ('admin', 'admin', 'مدير النظام (Super Admin)', 'admin@vitasiraq.iq', 'Super Admin', 1, 1, 1, 1, 1);
`;

interface TableSummary {
  name: string;
  uiScreen: string;
  module: string;
  columnsCount: number;
  description: string;
  keyFields: string[];
}

const SCHEMA_TABLES: TableSummary[] = [
  {
    name: 'users',
    uiScreen: 'بوابة تسجيل الدخول وإدارة المستخدمين والعدسة الأمنية (Cat 1 & Cat 9)',
    module: 'Authentication & System Users',
    columnsCount: 15,
    description: 'حسابات مستخدمي النظام والصلاحيات المخصصة لشاشات النظام',
    keyFields: ['username', 'password', 'role', 'email', 'can_manage_employees', 'allowed_screens'],
  },
  {
    name: 'employees',
    uiScreen: 'إدارة ملفات الموظفين والهيكل التنظيمي والبطاقات (Cat 3)',
    module: 'Employee Information System',
    columnsCount: 53,
    description: 'السجل الكامل للموظفين شامل البيانات الشخصية، صورة الموظف، الراتب، البدلات، والعقود',
    keyFields: ['employee_id', 'full_name_ar', 'photo_url', 'org_email', 'position', 'basic_salary', 'bank_name', 'iban'],
  },
  {
    name: 'employee_contracts',
    uiScreen: 'إدارة العقود والتعيين وتجديد عقود العمل (Cat 3)',
    module: 'Contracts Management',
    columnsCount: 14,
    description: 'سجلات عقود الموظفين وتاريخ البداية والنهاية والبنود والشروط',
    keyFields: ['employee_id', 'contract_type', 'start_date', 'end_date', 'salary', 'status'],
  },
  {
    name: 'employee_children',
    uiScreen: 'البيانات العائلية والأبناء للموظف ومخصصات الأطفال (Cat 3)',
    module: 'Employee Dependents',
    columnsCount: 8,
    description: 'أسماء وأعمار وتفاصيل أبناء الموظف لحساب مخصصات الأطفال والضمان',
    keyFields: ['employee_id', 'child_name', 'birth_date', 'gender', 'is_dependent'],
  },
  {
    name: 'employee_evaluations',
    uiScreen: 'نظام تقييم الأداء والمراجعات السنوية (Cat 7)',
    module: 'Performance Evaluations',
    columnsCount: 12,
    description: 'تقييمات الكفاءة والدرجات السنوية والتوصيات والمكافآت',
    keyFields: ['employee_id', 'evaluator_id', 'period', 'score', 'feedback', 'status'],
  },
  {
    name: 'employee_status_changes',
    uiScreen: 'سجل التنقلات والترقيات وحالات الموظف (Cat 3 & Cat 7)',
    module: 'Career Status History',
    columnsCount: 10,
    description: 'تتبع تغيرات المسمى الوظيفي، النقل بين الفروع والترقيات التاريخية',
    keyFields: ['employee_id', 'old_position', 'new_position', 'change_date', 'reason'],
  },
  {
    name: 'employee_trainings',
    uiScreen: 'إدارة الدورات التدريبية والشهادات والتطوير (Cat 7)',
    module: 'Training & Skills',
    columnsCount: 11,
    description: 'سجلات دورات التدريب والشهادات والمهارات المكتسبة للموظفين',
    keyFields: ['employee_id', 'course_title', 'provider', 'start_date', 'completion_status'],
  },
  {
    name: 'employee_warnings',
    uiScreen: 'إدارة العقوبات والإنذارات والمخالفات الإدارية (Cat 9)',
    module: 'Disciplinary & Warnings',
    columnsCount: 9,
    description: 'سجلات الإنذارات الشفهية والخطية والمخالفات والانضباط',
    keyFields: ['employee_id', 'warning_type', 'issue_date', 'reason', 'issuer_id'],
  },
  {
    name: 'end_of_service',
    uiScreen: 'مكافأة نهاية الخدمة والتسويات والإنهاء (Cat 3 & Cat 5)',
    module: 'Offboarding & Clearance',
    columnsCount: 12,
    description: 'احتساب مستحقات نهاية الخدمة وبراء الذمة واستقالات الموظفين',
    keyFields: ['employee_id', 'resignation_date', 'reason', 'indemnity_amount', 'clearance_status'],
  },
  {
    name: 'attendance',
    uiScreen: 'إدارة الحضور والغياب والبصمة والساعات الإضافية (Cat 4)',
    module: 'Time & Attendance',
    columnsCount: 13,
    description: 'سجلات البصمة اليومية للحضور، التأخير والساعات الإضافية',
    keyFields: ['employee_id', 'attendance_date', 'check_in', 'check_out', 'late_minutes', 'overtime_minutes'],
  },
  {
    name: 'approval_requests',
    uiScreen: 'نظام الموافقة الذكي والموافقات المتعددة المستويات (Cat 4 & Cat 10)',
    module: 'Workflows & Approvals',
    columnsCount: 11,
    description: 'طلبات الموافقات على الإجازات والمشتريات والتنقلات من القيادات',
    keyFields: ['requester_id', 'request_type', 'approver_id', 'status', 'created_at'],
  },
  {
    name: 'self_service_requests',
    uiScreen: 'بوابة الخدمة الذاتية للموظفين (Self-Service Portal) (Cat 11)',
    module: 'Employee Self Service',
    columnsCount: 10,
    description: 'طلبات الشهادات، تعريف الراتب والوثائق الذاتية للموظف',
    keyFields: ['employee_id', 'request_type', 'details', 'status', 'approved_by'],
  },
  {
    name: 'payroll_periods',
    uiScreen: 'إعداد دورات الرواتب الاحتساب الشهري (Cat 5)',
    module: 'Payroll Engine',
    columnsCount: 7,
    description: 'فترات المسيرات الشهرية للرواتب والمبالغ الإجمالية وحالة الصرف',
    keyFields: ['period_name', 'start_date', 'end_date', 'total_salary', 'status'],
  },
  {
    name: 'payroll_period_rows',
    uiScreen: 'تفاصيل سطور مسير الرواتب الشهري (Cat 5)',
    module: 'Payroll Details',
    columnsCount: 14,
    description: 'سطور احتساب الرواتب والبدلات والمقتطعات لكل موظف داخل المسير',
    keyFields: ['payroll_period_id', 'employee_id', 'basic_salary', 'allowances', 'net_salary'],
  },
  {
    name: 'payroll_adjustments',
    uiScreen: 'تعديلات الرواتب والاستقطاعات والبدلات الاستثنائية (Cat 5)',
    module: 'Salary Adjustments',
    columnsCount: 9,
    description: 'التعديلات المالية الطارئة والمكافآت والخصومات الشهرية',
    keyFields: ['employee_id', 'type', 'amount', 'reason', 'effective_date'],
  },
  {
    name: 'payroll_finalized_periods',
    uiScreen: 'أرشيف المسيرات النهائية المعتمدة للرواتب (Cat 5)',
    module: 'Finalized Payroll Periods',
    columnsCount: 8,
    description: 'المسيرات الشهرية المختومة والمعتمدة نهائياً للصرف البنكي',
    keyFields: ['period_code', 'approval_date', 'total_disbursed', 'bank_file_generated'],
  },
  {
    name: 'payroll_finalized_rows',
    uiScreen: 'أرشيف سطور المسيرات النهائية المعتمدة (Cat 5)',
    module: 'Finalized Payroll Rows',
    columnsCount: 15,
    description: 'البيانات التاريخية غير القابلة للتعديل للرواتب بعد الاعتماد',
    keyFields: ['finalized_period_id', 'employee_id', 'net_disbursed', 'bank_account'],
  },
  {
    name: 'salary_slips',
    uiScreen: 'قسائم رواتب الموظفين الفردية والمسيرات (Cat 5)',
    module: 'Payroll Slips',
    columnsCount: 9,
    description: 'تفاصيل الاستحقاقات والاستقطاعات والصافي لكافة الموظفين',
    keyFields: ['employee_id', 'payroll_period_id', 'base_salary', 'allowances', 'deductions', 'net_salary'],
  },
  {
    name: 'compensations',
    uiScreen: 'إدارة التعويضات والبدلات والمزايا المالية (Cat 5)',
    module: 'Compensation & Benefits',
    columnsCount: 10,
    description: 'سلم البدلات والمزايا الوظيفية للخطورة، السكن، والمحروقات',
    keyFields: ['position_id', 'allowance_name', 'amount', 'is_percentage', 'status'],
  },
  {
    name: 'job_openings',
    uiScreen: 'الاستقطاب والتوظيف والوظائف الشاغرة (Cat 6)',
    module: 'Recruitment & Job Board',
    columnsCount: 9,
    description: 'إعلانات الوظائف والاحتياج الوظيفي للدوائر والفروع',
    keyFields: ['title', 'department', 'location', 'type', 'status', 'requirements'],
  },
  {
    name: 'candidates',
    uiScreen: 'بوابة المتقدمين للعمل ونظام التقييم واللجان (Cat 6)',
    module: 'Applicant Tracking System (ATS)',
    columnsCount: 17,
    description: 'سجلات طلبات التوظيف ومراحل المقابلة والتنقيط والقرار',
    keyFields: ['job_opening_id', 'full_name', 'email', 'stage', 'rating', 'committee_scores'],
  },
  {
    name: 'career_paths',
    uiScreen: 'مسارات النمو والتسلسل الوظيفي (Cat 6 & Cat 7)',
    module: 'Career Pathways',
    columnsCount: 8,
    description: 'مخطط التدرج الوظيفي والتطوير المستقبلي للكوادر',
    keyFields: ['from_position_id', 'to_position_id', 'required_experience_years'],
  },
  {
    name: 'assets',
    uiScreen: 'إدارة أصول وعهدة الموظفين التقنية والأثاث (Cat 8)',
    module: 'Company Assets Management',
    columnsCount: 8,
    description: 'مخزون الأجهزة وسجلات تسليم العهد للموظفين',
    keyFields: ['asset_name', 'serial_number', 'category', 'status', 'employee_id', 'handover_date'],
  },
  {
    name: 'contract_template_clauses',
    uiScreen: 'نماذج وبنود العقود القانونية (Cat 8)',
    module: 'Contract Templates',
    columnsCount: 7,
    description: 'البنود القانونية القياسية والفقرات الاختيارية لنماذج العقود',
    keyFields: ['clause_title', 'content_ar', 'content_en', 'is_mandatory'],
  },
  {
    name: 'contract_custom_variables',
    uiScreen: 'متغيرات العقود المخصصة والدمج التلقائي (Cat 8)',
    module: 'Contract Dynamic Fields',
    columnsCount: 6,
    description: 'الحقول الديناميكية المستخدمة في طباعة وتوليد صيغ العقود',
    keyFields: ['variable_key', 'variable_label', 'default_value'],
  },
  {
    name: 'disciplinary_records',
    uiScreen: 'السجل التأديبي واللجان التحقيقية (Cat 9)',
    module: 'Disciplinary Actions',
    columnsCount: 10,
    description: 'محاضر اللجان التحقيقية والقرارات الانضباطية الرسمية',
    keyFields: ['employee_id', 'committee_date', 'investigation_summary', 'penalty'],
  },
  {
    name: 'audit_logs',
    uiScreen: 'سجلات التدقيق والأمان وسجل الأحداث (Cat 9)',
    module: 'Audit & Compliance',
    columnsCount: 9,
    description: 'سجل العمليات الدقيقة وحركات الدخول والحذف والعدسة التفتيشية',
    keyFields: ['user_name', 'event_type', 'description', 'ip_address', 'severity'],
  },
  {
    name: 'app_settings',
    uiScreen: 'إعدادات النظام العامة والهوية والشعار (Cat 10)',
    module: 'System Settings',
    columnsCount: 12,
    description: 'إعدادات اسم المؤسسة، اللوغو، اللغة، السنة المالية، وربط السيرفر',
    keyFields: ['setting_key', 'setting_value', 'description'],
  },
  {
    name: 'settings_offices',
    uiScreen: 'جدول إعدادات ومواقع الفروع (Cat 10)',
    module: 'Offices Master Config',
    columnsCount: 8,
    description: 'إعدادات الفروع والعناوين الرئيسية والإقليمية',
    keyFields: ['office_code', 'office_name', 'governorate'],
  },
  {
    name: 'settings_positions',
    uiScreen: 'جدول إعدادات المسميات الوظيفية (Cat 10)',
    module: 'Positions Master Config',
    columnsCount: 7,
    description: 'دليل الوظائف المعتمدة والمراتب الإدارية',
    keyFields: ['position_title', 'department_id', 'grade_level'],
  },
  {
    name: 'settings_contract_types',
    uiScreen: 'إعدادات أنواع العقود والمدة (Cat 10)',
    module: 'Contract Types Config',
    columnsCount: 6,
    description: 'أنواع العقود (دائم، مؤقت، استشاري، تجربة)',
    keyFields: ['type_name', 'default_duration_months', 'requires_renewal'],
  },
  {
    name: 'settings_trainings',
    uiScreen: 'دليل البرامج التدريبية المعتمدة (Cat 10)',
    module: 'Training Courses Master',
    columnsCount: 8,
    description: 'المناهج والبرامج التدريبية المقرة للمؤسسة',
    keyFields: ['course_code', 'title', 'category', 'duration_hours'],
  },
  {
    name: 'settings_status_changes',
    uiScreen: 'أنواع التغييرات الوظيفية المعتمدة (Cat 10)',
    module: 'Status Change Master',
    columnsCount: 5,
    description: 'أنواع الترقيات والتنقلات والإنهاء المتاحة في النظام',
    keyFields: ['code', 'title_ar', 'description'],
  },
  {
    name: 'offices',
    uiScreen: 'الفروع والمكاتب الإقليمية بالمحافظات (Cat 3 & Cat 10)',
    module: 'Organizational Locations',
    columnsCount: 17,
    description: 'فروع ومكاتب مؤسسة فيتاس العراق وساعات العمل والمدرين المسؤولين',
    keyFields: ['code', 'name_ar', 'name_en', 'governorate_ar', 'workforce_count', 'manager_ar'],
  },
  {
    name: 'departments',
    uiScreen: 'الأقسام والهيكل الإداري للمؤسسة (Cat 3)',
    module: 'Department Structure',
    columnsCount: 16,
    description: 'الأقسام الإدارية والتشغيلية وعدد الكادر ووصف المهام',
    keyFields: ['code', 'name_ar', 'name_en', 'head_ar', 'staff_count'],
  },
  {
    name: 'positions',
    uiScreen: 'المسميات الوظيفية والمستويات (Cat 3)',
    module: 'Positions Catalog',
    columnsCount: 10,
    description: 'قائمة الوظائف الشاغرة والقائمة في جميع الفروع',
    keyFields: ['title_ar', 'department_id', 'pay_grade', 'min_salary'],
  },
  {
    name: 'roles',
    uiScreen: 'مستويات الصلاحيات والأدوار القيادية (Cat 10)',
    module: 'Role-Based Access Control (RBAC)',
    columnsCount: 8,
    description: 'الأدوار الإدارية (مدير عام، مدير موارد بشرية، محاسب، موظف)',
    keyFields: ['role_name', 'permissions_json', 'description'],
  },
  {
    name: 'n8n_workflows',
    uiScreen: 'نظام الأتمتة وسيناريوهات n8n والربط التلقائي (Cat 10)',
    module: 'Automation & Integration Engine',
    columnsCount: 8,
    description: 'سيناريوهات الربط التلقائي والرسائل والعمليات مع السيرفر السحابي',
    keyFields: ['workflow_name', 'trigger_event', 'status', 'last_execution'],
  },
  {
    name: 'reports',
    uiScreen: 'التقارير الشاملة والمؤشرات المجهزة (Cat 2 & Cat 10)',
    module: 'Standard Reports',
    columnsCount: 7,
    description: 'التقارير الجاهزة للحضور والرواتب والموظفين',
    keyFields: ['report_key', 'title_ar', 'category', 'sql_query'],
  },
  {
    name: 'saved_dynamic_reports',
    uiScreen: 'منشئ التقارير المخصصة الديناميكي (Cat 10)',
    module: 'Dynamic Report Builder',
    columnsCount: 9,
    description: 'التقارير التي ينشئها المستخدم بالفلترة والمؤشرات المخصصة',
    keyFields: ['report_name', 'created_by', 'columns_json', 'filters_json'],
  },
  {
    name: 'notifications',
    uiScreen: 'مركز الإشعارات والتنبيهات المباشرة (All System)',
    module: 'System Notifications',
    columnsCount: 7,
    description: 'الإشعارات التلقائية للتأخيرات والطلبات والموافقات',
    keyFields: ['employee_id', 'title', 'message', 'type', 'is_read'],
  },
  {
    name: 'support_tickets',
    uiScreen: 'مركز دعم الموظفين وتذاكر الاستفسارات (Cat 11)',
    module: 'Helpdesk & Ticket System',
    columnsCount: 8,
    description: 'تذاكر الدعم الفني، الاستفسارات الإدارية وشكاوى الموظفين',
    keyFields: ['employee_id', 'subject', 'category', 'description', 'status'],
  },
];

export const DatabaseSchemaViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'interactive' | 'sql'>('interactive');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleCopySQL = () => {
    navigator.clipboard.writeText(FULL_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSQL = () => {
    const blob = new Blob([FULL_SQL_SCRIPT], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hrms_pro_db_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredTables = SCHEMA_TABLES.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.uiScreen.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">database</span>
            <h2 className="text-base font-bold text-white">
              مخطط قاعدة البيانات الموحد (hrms_pro_db Complete Schema)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            مطابقة دقيقة لكافة حقول الشاشات مع جداول وعلاقات قاعدة البيانات لضمان الاستقرار والتكامل
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-[#0a0c10] p-1 rounded-xl border border-white/10 flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('interactive')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'interactive'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الجداول والتطابق (14 Table)
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'sql'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              سكربت SQL المباشر
            </button>
          </div>

          <button
            onClick={handleCopySQL}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-teal-500/40 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all"
            title="نسخ سكربت SQL كاملاً"
          >
            <span className="material-symbols-outlined text-sm text-teal-400">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'تم النسخ!' : 'نسخ SQL'}
          </button>

          <button
            onClick={handleDownloadSQL}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 flex items-center gap-1.5 transition-all"
            title="تحميل ملف hrms_pro_db.sql"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            تحميل SQL
          </button>
        </div>
      </div>

      {/* Database Location Directory Path Status Banner */}
      <div className="p-4 rounded-2xl bg-[#0a0c10] border border-teal-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <span className="material-symbols-outlined text-lg">folder_zip</span>
          </div>
          <div>
            <p className="font-bold text-slate-200 flex items-center gap-2">
              <span>مسار قاعدة البيانات النشط:</span>
              <span className="font-mono text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                C:\vitas_hris\hrms_pro_db.db
              </span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              تم إنشاء المجلد وقاعدة البيانات تلقائياً عند التشغيل الأول لخدمة النظام وتخزين النسخ الاحتياطية.
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-[11px] flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          STORAGE CREATED & READY
        </span>
      </div>

      {/* Tab 1: Interactive Table List & Field Mapping */}
      {activeTab === 'interactive' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <input
              type="text"
              placeholder="تصفية الجداول والحقول أو الشاشات المقابلة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full sm:w-80 bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
            />
            <span className="text-xs text-slate-400 font-mono">
              إجمالي الجداول: <strong className="text-teal-400">{SCHEMA_TABLES.length}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTables.map(t => (
              <div
                key={t.name}
                className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 hover:border-teal-500/40 transition-all space-y-2.5 text-xs shadow-md"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400 text-base">table_chart</span>
                    <span className="font-mono font-bold text-white text-sm">table: {t.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono text-[10px] font-bold">
                    {t.columnsCount} columns
                  </span>
                </div>

                <p className="text-slate-300 font-sans">{t.description}</p>

                <div className="bg-white/5 p-2 rounded-xl text-[11px] space-y-1">
                  <span className="text-slate-400 block font-bold">الشاشة الموافقة في النظام:</span>
                  <span className="text-emerald-400 font-medium">{t.uiScreen}</span>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block mb-1">الحقول المفتاحية:</span>
                  <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                    {t.keyFields.map(f => (
                      <span key={f} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Full SQL Code Editor View */}
      {activeTab === 'sql' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>hrms_pro_db_schema.sql (UTF-8, InnoDB, MySQL 8.0+)</span>
            <span>{FULL_SQL_SCRIPT.split('\n').length} lines</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#07090e] border border-white/10 h-96 overflow-y-auto font-mono text-[11px] text-teal-300 custom-scrollbar leading-relaxed selection:bg-teal-600 selection:text-white">
            <pre className="whitespace-pre-wrap">{FULL_SQL_SCRIPT}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
