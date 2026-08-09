-- Company Calendar and Events Tables
-- جداول تقويم الشركة والأحداث

USE vitasiraq_hris_db;

-- Company Events Table (أحداث الشركة)
CREATE TABLE IF NOT EXISTS company_events (
    id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) UNIQUE NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    event_type ENUM('holiday', 'meeting', 'training', 'conference', 'social', 'announcement', 'deadline', 'other') NOT NULL DEFAULT 'other',
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    location_ar VARCHAR(255),
    all_day TINYINT(1) DEFAULT 0,
    is_recurring TINYINT(1) DEFAULT 0,
    recurrence_pattern ENUM('daily', 'weekly', 'monthly', 'yearly', 'custom') NULL,
    recurrence_end_date DATE NULL,
    department VARCHAR(255) NULL,
    target_audience ENUM('all', 'management', 'employees', 'specific_department', 'specific_employees') DEFAULT 'all',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('draft', 'published', 'cancelled', 'completed') DEFAULT 'draft',
    created_by VARCHAR(50) NOT NULL,
    updated_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES employees(id) ON DELETE SET NULL,
    INDEX idx_events_date (event_date),
    INDEX idx_events_type (event_type),
    INDEX idx_events_status (status),
    INDEX idx_events_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event Attendees Table (الحضور للأحداث)
CREATE TABLE IF NOT EXISTS event_attendees (
    id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    attendance_status ENUM('invited', 'accepted', 'declined', 'tentative', 'attended') DEFAULT 'invited',
    response_date TIMESTAMP NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES company_events(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_employee (event_id, employee_id),
    INDEX idx_attendees_event (event_id),
    INDEX idx_attendees_employee (employee_id),
    INDEX idx_attendees_status (attendance_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Event Reminders Table (تذكيرات الأحداث)
CREATE TABLE IF NOT EXISTS event_reminders (
    id VARCHAR(50) PRIMARY KEY,
    event_id VARCHAR(50) NOT NULL,
    reminder_time INT NOT NULL COMMENT 'Minutes before event',
    reminder_type ENUM('email', 'notification', 'both') DEFAULT 'notification',
    sent TINYINT(1) DEFAULT 0,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES company_events(id) ON DELETE CASCADE,
    INDEX idx_reminders_event (event_id),
    INDEX idx_reminders_sent (sent)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Company Holidays Table (عطلات الشركة)
CREATE TABLE IF NOT EXISTS company_holidays (
    id VARCHAR(50) PRIMARY KEY,
    holiday_id VARCHAR(50) UNIQUE NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    holiday_date DATE NOT NULL,
    is_recurring TINYINT(1) DEFAULT 1 COMMENT 'Repeats every year',
    holiday_type ENUM('national', 'religious', 'company', 'optional', 'emergency') NOT NULL DEFAULT 'national',
    is_paid TINYINT(1) DEFAULT 1,
    is_emergency TINYINT(1) DEFAULT 0 COMMENT 'Is this an emergency holiday',
    scope ENUM('all_branches', 'specific_branches') DEFAULT 'all_branches' COMMENT 'Holiday scope',
    created_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE CASCADE,
    INDEX idx_holidays_date (holiday_date),
    INDEX idx_holidays_type (holiday_type),
    INDEX idx_holidays_emergency (is_emergency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Holiday Branches Table (الفروع المتأثرة بالعطلات)
CREATE TABLE IF NOT EXISTS holiday_branches (
    id VARCHAR(50) PRIMARY KEY,
    holiday_id VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (holiday_id) REFERENCES company_holidays(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE KEY unique_holiday_branch (holiday_id, branch_id),
    INDEX idx_holiday_branches_holiday (holiday_id),
    INDEX idx_holiday_branches_branch (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee Calendar Preferences Table (تفضيلات تقويم الموظف)
CREATE TABLE IF NOT EXISTS employee_calendar_preferences (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    default_view ENUM('day', 'week', 'month', 'agenda') DEFAULT 'month',
    week_start ENUM('saturday', 'sunday', 'monday') DEFAULT 'saturday',
    show_weekends TINYINT(1) DEFAULT 1,
    reminder_default INT DEFAULT 30 COMMENT 'Default reminder in minutes',
    email_notifications TINYINT(1) DEFAULT 1,
    app_notifications TINYINT(1) DEFAULT 1,
    color_scheme VARCHAR(50) DEFAULT 'default',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: Add emergency holiday support
ALTER TABLE company_holidays 
ADD COLUMN IF NOT EXISTS is_emergency TINYINT(1) DEFAULT 0 COMMENT 'Is this an emergency holiday',
ADD COLUMN IF NOT EXISTS scope ENUM('all_branches', 'specific_branches') DEFAULT 'all_branches' COMMENT 'Holiday scope',
MODIFY COLUMN holiday_type ENUM('national', 'religious', 'company', 'optional', 'emergency') NOT NULL DEFAULT 'national';

-- Seed Sample Data
INSERT INTO company_holidays (id, holiday_id, name_ar, name_en, description_ar, description_en, holiday_date, is_recurring, holiday_type, is_paid, is_emergency, scope, created_by) VALUES
('H001', 'HOL-001', 'عيد الفطر', 'Eid al-Fitr', 'عطلة عيد الفطر السعيد', 'Eid al-Fitr holiday', '2026-03-20', 1, 'religious', 1, 0, 'all_branches', 'ADMIN001'),
('H002', 'HOL-002', 'عيد الأضحى', 'Eid al-Adha', 'عطلة عيد الأضحى المبارك', 'Eid al-Adha holiday', '2026-06-27', 1, 'religious', 1, 0, 'all_branches', 'ADMIN001'),
('H003', 'HOL-003', 'رأس السنة الميلادية', 'New Year', 'بداية السنة الجديدة', 'New Year celebration', '2026-01-01', 1, 'national', 1, 0, 'all_branches', 'ADMIN001'),
('H004', 'HOL-004', 'استقلال العراق', 'Iraq Independence Day', 'ذكرى استقلال العراق', 'Iraq Independence Day', '2026-10-03', 1, 'national', 1, 0, 'all_branches', 'ADMIN001');

INSERT INTO company_events (id, event_id, title_ar, title_en, description_ar, description_en, event_type, event_date, start_time, end_time, location, location_ar, all_day, is_recurring, target_audience, priority, status, created_by) VALUES
('E001', 'EVT-001', 'اجتماع شهري للموظفين', 'Monthly Employee Meeting', 'اجتماع شهري لمناقشة التقدم والمشاريع', 'Monthly meeting to discuss progress and projects', 'meeting', '2026-08-15', '09:00:00', '11:00:00', 'Conference Room', 'قاعة الاجتماعات', 0, 1, 'all', 'medium', 'published', 'ADMIN001'),
('E002', 'EVT-002', 'دورة تدريبية للسلامة', 'Safety Training Course', 'دورة تدريبية إلزامية للسلامة والمخاطر', 'Mandatory safety training course', 'training', '2026-08-20', '08:30:00', '16:30:00', 'Training Center', 'مركز التدريب', 0, 0, 'all', 'high', 'published', 'ADMIN001'),
('E003', 'EVT-003', 'يوم التأسيس', 'Company Anniversary', 'احتفال بذكرى تأسيس الشركة', 'Company anniversary celebration', 'social', '2026-09-01', NULL, NULL, 'Main Hall', 'القاعة الرئيسية', 1, 1, 'all', 'high', 'published', 'ADMIN001');
