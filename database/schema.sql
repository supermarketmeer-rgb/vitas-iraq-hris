-- Vitas Iraq HRMS Database Schema
-- MySQL Database for Human Resources Management System

-- Create Database
CREATE DATABASE IF NOT EXISTS vitasiraq_hris_db;
USE vitasiraq_hris_db;

-- Users Table (for authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role ENUM('Super Admin', 'HR Manager', 'Manager', 'Employee', 'Candidate') NOT NULL,
    department VARCHAR(255),
    employee_id VARCHAR(50),
    branch VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    badge_no VARCHAR(50) NULL,
    full_name_ar VARCHAR(255) NOT NULL,
    full_name_en VARCHAR(255) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    personal_email VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    emergency_phone VARCHAR(50) NULL,
    dob DATE NULL,
    years_of_employment INT DEFAULT 0,
    years_in_position INT DEFAULT 0,
    exit_date DATE NULL,
    gender VARCHAR(50) NULL,
    marital_status VARCHAR(50) NULL,
    nationality VARCHAR(100) NULL,
    department VARCHAR(255) NULL,
    position_ar VARCHAR(255) NULL,
    position_en VARCHAR(255) NULL,
    branch VARCHAR(255) NULL,
    branch_en VARCHAR(255) NULL,
    supervisor_name VARCHAR(255) NULL,
    work_scope VARCHAR(255) NULL,
    salary DECIMAL(15, 2) NULL,
    basic_salary DECIMAL(15, 2) NULL,
    transportation_fixed DECIMAL(15, 2) NULL,
    fixed_bonus DECIMAL(15, 2) NULL,
    phone_allowance DECIMAL(15, 2) NULL,
    certificate_allowance DECIMAL(15, 2) NULL,
    written_basic_salary_ar VARCHAR(255) NULL,
    bank_name VARCHAR(255) NULL,
    iban VARCHAR(100) NULL,
    national_id VARCHAR(100) NULL,
    passport_no VARCHAR(100) NULL,
    passport_expiry DATE NULL,
    photo LONGBLOB NULL,
    spouse_name VARCHAR(255) NULL,
    spouse_employed_here TINYINT DEFAULT 0,
    children_details TEXT NULL,
    original_start_date DATE NULL,
    contract_start_date DATE NULL,
    contract_end_date DATE NULL,
    probation_end_date DATE NULL,
    term_of_contract VARCHAR(255) NULL,
    grade VARCHAR(100) NULL,
    trainings_record TEXT NULL,
    warnings_record TEXT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    on_hold TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    leave_type ENUM('Annual', 'Sick', 'Maternity', 'Paternity', 'Unpaid', 'Personal', 'Emergency') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason TEXT,
    status ENUM('قيد الانتظار', 'مقبول', 'مرفوض') DEFAULT 'قيد الانتظار',
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(50),
    approved_date TIMESTAMP NULL,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
);

-- Job Vacancies Table
CREATE TABLE IF NOT EXISTS job_vacancies (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    location VARCHAR(255),
    type ENUM('Full-time', 'Part-time', 'Contract', 'دوام كامل', 'دوام جزئي', 'عقد') NOT NULL,
    experience_years INT DEFAULT 2,
    status ENUM('Open', 'Closed', 'Draft', 'مفتوحة', 'مغلقة', 'مسودة') DEFAULT 'Open',
    requirements TEXT,
    deadline DATE,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    candidates_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    applied_job_id VARCHAR(50),
    job_title VARCHAR(255),
    stage ENUM('Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected', 'تم التقديم', 'الفحص المبدئي', 'المقابلة', 'العرض الوظيفي', 'تم التعيين', 'مرفوض') DEFAULT 'Applied',
    rating INT DEFAULT 5,
    experience_years INT DEFAULT 0,
    notes TEXT,
    photo_url TEXT,
    resume_url TEXT,
    committee_opinion TEXT,
    decision_reason TEXT,
    committee_scores JSON,
    interview_date DATE,
    interview_time TIME,
    interview_location VARCHAR(255),
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (applied_job_id) REFERENCES job_vacancies(id) ON DELETE SET NULL
);

-- Asset Records Table
CREATE TABLE IF NOT EXISTS asset_records (
    id VARCHAR(50) PRIMARY KEY,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(100),
    serial_number VARCHAR(100),
    description TEXT,
    purchase_date DATE,
    purchase_cost DECIMAL(15, 2),
    current_value DECIMAL(15, 2),
    asset_condition ENUM('New', 'Good', 'Fair', 'Poor', 'Damaged') DEFAULT 'New',
    location VARCHAR(255),
    assigned_to VARCHAR(50),
    assigned_date DATE,
    return_date DATE,
    status ENUM('Available', 'Assigned', 'In Maintenance', 'Retired', 'Lost') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
);

-- Risk Records Table
CREATE TABLE IF NOT EXISTS risk_records (
    id VARCHAR(50) PRIMARY KEY,
    risk_title VARCHAR(255) NOT NULL,
    risk_category VARCHAR(100),
    risk_level ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
    description TEXT,
    likelihood ENUM('Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'),
    impact ENUM('Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'),
    mitigation_strategy TEXT,
    owner VARCHAR(50),
    status ENUM('Open', 'In Progress', 'Mitigated', 'Closed') DEFAULT 'Open',
    identified_date DATE NOT NULL,
    target_date DATE,
    closed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner) REFERENCES employees(id) ON DELETE SET NULL
);

-- Document Records Table (Legacy - maintained for compatibility)
CREATE TABLE IF NOT EXISTS document_records (
    id VARCHAR(50) PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    file_url TEXT,
    file_size INT,
    file_format VARCHAR(50),
    uploaded_by VARCHAR(50),
    employee_id VARCHAR(50),
    expiry_date DATE,
    access_level ENUM('Public', 'Internal', 'Confidential', 'Restricted') DEFAULT 'Internal',
    status ENUM('Active', 'Expired', 'Archived', 'Deleted') DEFAULT 'Active',
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Document Categories Table (تصنيفات الوثائق)
CREATE TABLE IF NOT EXISTS document_categories (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_ar TEXT NULL,
  description_en TEXT NULL,
  icon_name VARCHAR(100) DEFAULT 'FileText',
  requirement_level ENUM('mandatory', 'optional', 'recommended') DEFAULT 'optional',
  is_custom TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_categories_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee Documents Table (وثائق الموظفين - Enhanced)
CREATE TABLE IF NOT EXISTS employee_documents (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  document_number VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category_id VARCHAR(36) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  issue_date DATE NULL,
  expiry_date DATE NULL,
  issuing_authority VARCHAR(255) NULL,
  status ENUM('valid', 'expiring_soon', 'expired', 'under_review', 'rejected', 'archived') NOT NULL DEFAULT 'valid',
  description TEXT NULL,
  keywords TEXT NULL,
  notes TEXT NULL,
  current_version INT UNSIGNED DEFAULT 1,
  file_size BIGINT UNSIGNED NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  uploader_id VARCHAR(50) NOT NULL,
  uploader_name VARCHAR(255) NOT NULL,
  is_archived TINYINT(1) DEFAULT 0,
  alert_days INT UNSIGNED DEFAULT 30,
  ocr_extracted TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  CONSTRAINT fk_docs_category FOREIGN KEY (category_id) REFERENCES document_categories (id) ON DELETE CASCADE,
  CONSTRAINT fk_docs_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  INDEX idx_docs_number (document_number),
  INDEX idx_docs_status (status),
  INDEX idx_docs_expiry (expiry_date),
  INDEX idx_docs_emp_cat (employee_id, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document Versions Table (إصدارات الوثائق)
CREATE TABLE IF NOT EXISTS document_versions (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL,
  version_number INT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT UNSIGNED NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  change_summary TEXT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_versions_document FOREIGN KEY (document_id) REFERENCES employee_documents (id) ON DELETE CASCADE,
  INDEX idx_versions_doc_ver (document_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Document Expiry & Alerts Table (تنبيهات الانتهاء)
CREATE TABLE IF NOT EXISTS document_expiry_alerts (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  alert_trigger_date DATE NOT NULL,
  channel ENUM('app', 'email', 'telegram', 'whatsapp') NOT NULL DEFAULT 'app',
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_expiry_document FOREIGN KEY (document_id) REFERENCES employee_documents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Workflow Requests Table (طلبات مسارات العمل)
CREATE TABLE IF NOT EXISTS workflow_requests (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  request_code VARCHAR(50) NOT NULL UNIQUE,
  document_id VARCHAR(36) NULL,
  document_title VARCHAR(255) NOT NULL,
  employee_id VARCHAR(50) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  workflow_type ENUM('upload', 'replacement', 'approval', 'deletion', 'archive', 'renewal') NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'revision_requested') DEFAULT 'pending',
  current_step INT UNSIGNED DEFAULT 1,
  total_steps INT UNSIGNED DEFAULT 2,
  requester_name VARCHAR(255) NOT NULL,
  approver_role VARCHAR(100) NOT NULL,
  comments TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs Table (سجل العمليات والتدقيق)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(100) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(100) NOT NULL,
  action_type ENUM('upload', 'edit', 'version_update', 'download', 'print', 'archive', 'restore', 'delete', 'view', 'approve', 'reject') NOT NULL,
  entity_name VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  details TEXT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action_type),
  INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System Notifications Table
CREATE TABLE IF NOT EXISTS system_notifications (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info', 'success', 'warning', 'error', 'leave', 'payroll', 'recruitment') DEFAULT 'info',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    target_audience VARCHAR(100),
    user_id VARCHAR(50),
    link_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Iraq',
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_id VARCHAR(50),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    description TEXT,
    manager_id VARCHAR(50),
    branch_id VARCHAR(50),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

-- Company Profile Table
CREATE TABLE IF NOT EXISTS company_profile (
    id VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    company_name_en VARCHAR(255),
    logo_url TEXT,
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Iraq',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    tax_id VARCHAR(100),
    registration_number VARCHAR(100),
    established_date DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert Default Data
INSERT INTO company_profile (id, company_name, company_name_en, address, city, country, phone, email, website, established_date, description) VALUES
('COMP-001', 'فيتاس العراق', 'Vitas Iraq', 'بغداد، العراق', 'بغداد', 'العراق', '+964 780 000 0000', 'info@vitasiraq.com', 'https://vitasiraq.com', '2010-01-01', 'شركة فيتاس العراق للخدمات المتكاملة');

INSERT INTO branches (id, name, name_en, address, city, country, phone, email) VALUES
('BRANCH-001', 'المقر الرئيسي - بغداد', 'Headquarters - Baghdad', 'المنصور، بغداد', 'بغداد', 'العراق', '+964 780 000 0001', 'baghdad@vitasiraq.com'),
('BRANCH-002', 'فرع البصرة', 'Basra Branch', 'البصرة، العراق', 'البصرة', 'العراق', '+964 780 000 0002', 'basra@vitasiraq.com'),
('BRANCH-003', 'فرع أربيل', 'Erbil Branch', 'أربيل، العراق', 'أربيل', 'العراق', '+964 780 000 0003', 'erbil@vitasiraq.com');

INSERT INTO departments (id, name, name_en, description, branch_id) VALUES
('DEPT-001', 'إدارة الموارد البشرية والعمليات', 'Human Resources & Operations', 'إدارة شؤون الموظفين والعمليات اليومية', 'BRANCH-001'),
('DEPT-002', 'قسم المالية والمحاسبة', 'Finance & Accounting', 'إدارة الشؤون المالية والمحاسبية', 'BRANCH-001'),
('DEPT-003', 'قسم تقنية المعلومات', 'Information Technology', 'إدارة البنية التحتية التقنية والدعم الفني', 'BRANCH-001'),
('DEPT-004', 'قسم المبيعات والتسويق', 'Sales & Marketing', 'إدارة المبيعات والتسويق والعلاقات العامة', 'BRANCH-001');

INSERT INTO users (id, name, email, role, department, employee_id, branch) VALUES
('usr-001', 'مدير الموارد البشرية', 'hr.admin@vitasiraq.com', 'Super Admin', 'إدارة الموارد البشرية والعمليات', 'VTS-1001', 'المقر الرئيسي - بغداد');

-- Seed Standard Document Categories (تصنيفات الوثائق القياسية)
INSERT INTO document_categories (id, code, name_ar, name_en, description_ar, description_en, icon_name, requirement_level) VALUES
('cat-1', 'CAT_PERSONAL', 'الوثائق الشخصية', 'Personal Documents', 'البطاقة الوطنية، الجواز، بطاقة السكن والتموين', 'National ID, Passport, Residence & Ration Cards', 'UserCheck', 'mandatory'),
('cat-2', 'CAT_EMPLOYMENT', 'وثائق التوظيف', 'Employment Documents', 'عقد العمل، عرض الوظيفة، اتفاقية السرية', 'Employment Contract, Job Offer, NDA', 'Briefcase', 'mandatory'),
('cat-3', 'CAT_QUALIFICATIONS', 'المؤهلات العلمية', 'Academic Qualifications', 'الشهادات الجامعية، الدبلومات، الشهادات المهنية', 'University Degrees, Diplomas, Professional Certificates', 'GraduationCap', 'mandatory'),
('cat-4', 'CAT_TRAINING', 'التدريب والتطوير', 'Training & Development', 'شهادات التدريب، ورش العمل، دورات التحسين المهني', 'Training Certificates, Workshops, CPD Courses', 'BookOpen', 'optional'),
('cat-5', 'CAT_MEDICAL', 'الوثائق الطبية', 'Medical Documents', 'الفحص الطبي، الشهادات الصحية، لقاحات العمل', 'Medical Examination, Health Certificates, Work Vaccinations', 'HeartPulse', 'mandatory'),
('cat-6', 'CAT_BANKING', 'الوثائق المصرفية', 'Banking Documents', 'بيانات الحساب البنكي، رقم IBAN، بطاقة الراتب', 'Bank Account Details, IBAN, Salary Card', 'CreditCard', 'mandatory'),
('cat-7', 'CAT_VISA', 'وثائق الإقامة والفيزا', 'Visa & Residence Documents', 'فيزا العمل، إذن الإقامة، تجديدات التأشيرة', 'Work Visa, Residence Permit, Visa Renewals', 'Plane', 'mandatory'),
('cat-8', 'CAT_DRIVING', 'رخصة القيادة والمركبات', 'Driving License & Vehicles', 'رخصة القيادة، بطاقة المركبة، تأمين السيارة', 'Driving License, Vehicle Registration, Car Insurance', 'Car', 'optional'),
('cat-9', 'CAT_PERFORMANCE', 'تقييمات الأداء', 'Performance Evaluations', 'تقييمات الأداء السنوية، مراجعات التطور الوظيفي', 'Annual Performance Reviews, Career Progress Reviews', 'TrendingUp', 'optional'),
('cat-10', 'CAT_OTHER', 'وثائق أخرى', 'Other Documents', 'أي وثائق إضافية لا تنتمي للتصنيفات المذكورة', 'Any additional documents not belonging to mentioned categories', 'File', 'optional');

-- Settings Tables (جداول الإعدادات)

-- Branches/Locations Table (الفروع والمواقع)
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Positions/Job Titles Table (المسميات الوظيفية)
CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments Table (الأقسام والإدارات)
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Contract Types Table (أنواع العقود)
CREATE TABLE IF NOT EXISTS contract_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Status Changes Table (تغييرات الحالة)
CREATE TABLE IF NOT EXISTS status_changes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Trainings Table (التدريبات)
CREATE TABLE IF NOT EXISTS trainings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Initial Data for Settings Tables
INSERT INTO branches (name_en, name_ar, sort_order) VALUES
('Baghdad Main Office', 'المكتب الرئيسي بغداد', 1),
('Erbil Branch', 'فرع أربيل', 2),
('Basra Branch', 'فرع البصرة', 3);

INSERT INTO positions (name_en, name_ar, sort_order) VALUES
('General Manager', 'المدير العام', 1),
('HR Manager', 'مدير الموارد البشرية', 2),
('Accountant', 'محاسب', 3);

INSERT INTO departments (name_en, name_ar, sort_order) VALUES
('Human Resources & Operations', 'إدارة الموارد البشرية والعمليات', 1),
('Finance & Accounting', 'قسم المالية والمحاسبة', 2),
('Information Technology', 'قسم تقنية المعلومات', 3),
('Sales & Marketing', 'قسم المبيعات والتسويق', 4),
('Microfinance & Operations', 'إدارة التمويل الأصغر والعمليات', 5),
('Risk, Compliance & Audit', 'المخاطر والامتثال والتدقيق', 6),
('Finance & Collection', 'الشؤون المالية والتحصيل', 7);

INSERT INTO contract_types (name_en, name_ar, sort_order) VALUES
('Full Time Contract', 'عقد دوام كامل', 1),
('Part Time Contract', 'عقد دوام جزئي', 2),
('Temporary Contract', 'عقد مؤقت', 3);

INSERT INTO status_changes (name_en, name_ar, sort_order) VALUES
('Active', 'نشط', 1),
('On Leave', 'في إجازة', 2),
('Terminated', 'منتهي الخدمة', 3);

INSERT INTO trainings (name_en, name_ar, sort_order) VALUES
('Safety Training', 'تدريب السلامة', 1),
('Leadership Training', 'تدريب القيادة', 2),
('Technical Skills', 'المهارات التقنية', 3);

-- Create Indexes for Performance
CREATE INDEX idx_employees_employee_id ON employees(employee_id);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_candidates_job_vacancy_id ON candidates(job_vacancy_id);
CREATE INDEX idx_candidates_stage ON candidates(stage);
CREATE INDEX idx_asset_records_assigned_to ON asset_records(assigned_to);
CREATE INDEX idx_notifications_user_id ON system_notifications(user_id);
CREATE INDEX idx_notifications_is_read ON system_notifications(is_read);
