-- Add departments table to settings tables
USE vitasiraq_hris_db;

-- Departments Table (الأقسام والإدارات)
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed Initial Data for Departments
INSERT INTO departments (name_en, name_ar, sort_order) VALUES
('Human Resources & Operations', 'إدارة الموارد البشرية والعمليات', 1),
('Finance & Accounting', 'قسم المالية والمحاسبة', 2),
('Information Technology', 'قسم تقنية المعلومات', 3),
('Sales & Marketing', 'قسم المبيعات والتسويق', 4),
('Microfinance & Operations', 'إدارة التمويل الأصغر والعمليات', 5),
('Risk, Compliance & Audit', 'المخاطر والامتثال والتدقيق', 6),
('Finance & Collection', 'الشؤون المالية والتحصيل', 7)
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_ar=VALUES(name_ar), sort_order=VALUES(sort_order);
