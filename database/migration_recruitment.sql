-- Migration script to update recruitment tables for new features
-- Run this script to update existing database schema

USE vitasiraq_hris_db;

-- Update job_vacancies table
ALTER TABLE job_vacancies 
ADD COLUMN IF NOT EXISTS type ENUM('Full-time', 'Part-time', 'Contract', 'دوام كامل', 'دوام جزئي', 'عقد') NOT NULL DEFAULT 'Full-time',
ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 2,
ADD COLUMN IF NOT EXISTS status ENUM('Open', 'Closed', 'Draft', 'مفتوحة', 'مغلقة', 'مسودة') DEFAULT 'Open',
DROP COLUMN IF EXISTS title_en,
DROP COLUMN IF EXISTS employment_type,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS salary_min,
DROP COLUMN IF EXISTS salary_max,
DROP COLUMN IF EXISTS vacancies_count,
DROP COLUMN IF EXISTS published_date,
DROP COLUMN IF EXISTS closing_date;

-- Update candidates table
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS rating INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS committee_opinion TEXT,
ADD COLUMN IF NOT EXISTS decision_reason TEXT,
ADD COLUMN IF NOT EXISTS committee_scores JSON,
ADD COLUMN IF NOT EXISTS interview_date DATE,
ADD COLUMN IF NOT EXISTS interview_time TIME,
ADD COLUMN IF NOT EXISTS interview_location VARCHAR(255),
MODIFY COLUMN stage ENUM('Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected', 'تم التقديم', 'الفحص المبدئي', 'المقابلة', 'العرض الوظيفي', 'تم التعيين', 'مرفوض') DEFAULT 'Applied',
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS skills,
DROP COLUMN IF EXISTS cover_letter;

-- Update applied_job_id to allow NULL (for candidates without assigned jobs)
ALTER TABLE candidates MODIFY COLUMN applied_job_id VARCHAR(50) NULL;

-- Add foreign key constraint if not exists
ALTER TABLE candidates 
ADD CONSTRAINT IF NOT EXISTS fk_candidates_job 
FOREIGN KEY (applied_job_id) REFERENCES job_vacancies(id) ON DELETE SET NULL;
