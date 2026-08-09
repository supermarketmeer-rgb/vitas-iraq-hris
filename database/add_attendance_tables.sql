-- ============================================================
-- Attendance System Tables for VITAS Iraq HRMS
-- These tables are needed for attendance and timesheet functionality
-- ============================================================

USE vitasiraq_hris_db;

-- ============================================================
-- Table: shift_types
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_types (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) DEFAULT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  work_hours DECIMAL(4,2) NOT NULL DEFAULT 8.00,
  grace_minutes INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Grace period in minutes',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default shift types
INSERT INTO shift_types (name, name_en, start_time, end_time, work_hours, grace_minutes) VALUES
('صباحي', 'Morning Shift', '08:00:00', '16:00:00', 8.00, 15),
('مسائي', 'Evening Shift', '16:00:00', '00:00:00', 8.00, 15),
('ليلي', 'Night Shift', '00:00:00', '08:00:00', 8.00, 15),
('مرن', 'Flexible Shift', '09:00:00', '17:00:00', 8.00, 30);

-- ============================================================
-- Table: attendance_details (multiple punches per day)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_details (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_id INT UNSIGNED NOT NULL,
  punch_time DATETIME NOT NULL,
  punch_type ENUM('in', 'out') NOT NULL,
  device_id VARCHAR(50) DEFAULT NULL,
  location VARCHAR(150) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attendance_id (attendance_id),
  KEY idx_punch_time (punch_time),
  FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: holidays
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  name_en VARCHAR(150) DEFAULT NULL,
  holiday_date DATE NOT NULL,
  type ENUM('official', 'company', 'religious') NOT NULL DEFAULT 'official',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: attendance_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  key_name VARCHAR(100) NOT NULL,
  key_value TEXT DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_key_name (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default attendance settings
INSERT INTO attendance_settings (key_name, key_value, description) VALUES
('sync_interval', '5', 'Auto-sync interval in minutes'),
('auto_sync', '1', 'Enable automatic sync (1=yes, 0=no)'),
('timezone', 'Asia/Baghdad', 'Application timezone'),
('date_format', 'Y/m/d', 'Date display format'),
('work_hours_sunday', '8', 'Work hours for Sunday'),
('work_hours_monday', '8', 'Work hours for Monday'),
('work_hours_tuesday', '8', 'Work hours for Tuesday'),
('work_hours_wednesday', '8', 'Work hours for Wednesday'),
('work_hours_thursday', '7', 'Work hours for Thursday'),
('work_hours_friday', '0', 'Work hours for Friday'),
('work_hours_saturday', '0', 'Work hours for Saturday'),
('weekend_days', '5,6', 'Weekend days (1=Mon, ..., 7=Sun)'),
('sql_server_enabled', '0', 'Enable SQL Server sync (1=yes, 0=no)'),
('sql_server_host', '', 'SQL Server host'),
('sql_server_database', '', 'SQL Server database name'),
('sql_server_username', '', 'SQL Server username'),
('sql_server_password', '', 'SQL Server password');

-- ============================================================
-- Update employees table to include shift_type_id
-- ============================================================
ALTER TABLE employees ADD COLUMN shift_type_id INT UNSIGNED DEFAULT NULL AFTER position_en;
ALTER TABLE employees ADD FOREIGN KEY (shift_type_id) REFERENCES shift_types(id) ON DELETE SET NULL;

-- ============================================================
-- Table: sql_server_sync_log
-- ============================================================
CREATE TABLE IF NOT EXISTS sql_server_sync_log (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  started_at DATETIME NOT NULL,
  finished_at DATETIME DEFAULT NULL,
  duration_seconds INT DEFAULT NULL,
  status ENUM('running', 'success', 'failed', 'partial') NOT NULL DEFAULT 'running',
  records_new INT UNSIGNED NOT NULL DEFAULT 0,
  records_updated INT UNSIGNED NOT NULL DEFAULT 0,
  records_failed INT UNSIGNED NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  sync_type ENUM('auto', 'manual', 'startup') NOT NULL DEFAULT 'auto',
  source_table VARCHAR(100) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_started_at (started_at),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;