-- Company News Table for Vitas Iraq HRMS
-- جدول أخبار المؤسسة

USE vitasiraq_hris_db;

-- Create company_news table
CREATE TABLE IF NOT EXISTS company_news (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title_ar VARCHAR(255) NOT NULL,
    title_en VARCHAR(255) NOT NULL,
    content_ar TEXT NOT NULL,
    content_en TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    target_audience VARCHAR(50) DEFAULT 'all',
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    published_by VARCHAR(50),
    publish_date DATETIME,
    expiry_date DATETIME,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    attachment_url VARCHAR(500),
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_publish_date (publish_date),
    INDEX idx_category (category)
);

-- Insert sample news data
INSERT INTO company_news (title_ar, title_en, content_ar, content_en, category, target_audience, priority, published_by, publish_date, status) VALUES
('ترحيب بالموظفين الجدد', 'Welcome New Employees', 'يسرنا الترحيب بالموظفين الجدد الانضمام إلى فريق فيتاس العراق. نتطلع للعمل معكم وتحقيق النجاح معاً.', 'We are pleased to welcome new employees joining the Vitas Iraq team. We look forward to working together and achieving success.', 'general', 'all', 'normal', 'HR Admin', NOW(), 'published'),
('تحديث سياسة الإجازات', 'Leave Policy Update', 'تم تحديث سياسة الإجازات السنوية. يرجى مراجعة قسم الموارد البشرية للحصول على التفاصيل الجديدة.', 'The annual leave policy has been updated. Please visit the HR department for new details.', 'policy', 'all', 'high', 'HR Manager', NOW(), 'published'),
('إغلاق المكتب في العيد', 'Office Closure for Holiday', 'سيتم إغلاق المكتب الرئيسي بمناسبة العيد الفطر من تاريخ [التاريخ] وإعادة العمل في [التاريخ].', 'The main office will be closed for Eid al-Fitr from [date] and will resume work on [date].', 'holiday', 'all', 'urgent', 'Administration', NOW(), 'published');