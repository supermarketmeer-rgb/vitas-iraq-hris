-- Script to transfer recruitment tables from vitas_hris to vitasiraq_hris_db
-- Run this script in MySQL/XAMPP phpMyAdmin

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Use target database
USE vitasiraq_hris_db;

-- Drop existing tables in target database if they exist
DROP TABLE IF EXISTS candidates;
DROP TABLE IF EXISTS job_vacancies;

-- Create job_vacancies table in target database
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

-- Create candidates table in target database
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

-- Create training_records table in target database
CREATE TABLE IF NOT EXISTS training_records (
    id VARCHAR(50) PRIMARY KEY,
    training_name VARCHAR(255) NOT NULL,
    training_type VARCHAR(100),
    description TEXT,
    start_date DATE,
    end_date DATE,
    location VARCHAR(255),
    instructor VARCHAR(255),
    status ENUM('Planned', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Planned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Transfer data from vitas_hris to vitasiraq_hris_db
-- Job Vacancies
INSERT INTO vitasiraq_hris_db.job_vacancies (id, title, department, location, type, experience_years, status, requirements, deadline, created_date, candidates_count, created_at, updated_at)
SELECT 
    id, 
    title, 
    department, 
    location, 
    COALESCE(type, 'Full-time'),
    COALESCE(experience_years, 2),
    COALESCE(status, 'Open'),
    requirements,
    deadline,
    created_date,
    COALESCE(candidates_count, 0),
    created_at,
    updated_at
FROM vitas_hris.job_vacancies;

-- Candidates
INSERT INTO vitasiraq_hris_db.candidates (id, full_name, email, phone, applied_job_id, job_title, stage, rating, experience_years, notes, photo_url, resume_url, committee_opinion, decision_reason, committee_scores, interview_date, interview_time, interview_location, applied_date, created_at, updated_at)
SELECT 
    id,
    COALESCE(full_name, CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
    email,
    phone,
    applied_job_id,
    job_title,
    COALESCE(stage, 'Applied'),
    COALESCE(rating, 5),
    COALESCE(experience_years, 0),
    notes,
    photo_url,
    resume_url,
    committee_opinion,
    decision_reason,
    committee_scores,
    interview_date,
    interview_time,
    interview_location,
    applied_date,
    created_at,
    updated_at
FROM vitas_hris.candidates;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Display transfer results
SELECT 'Job Vacancies transferred:' AS message, COUNT(*) AS count FROM vitasiraq_hris_db.job_vacancies;
SELECT 'Candidates transferred:' AS message, COUNT(*) AS count FROM vitasiraq_hris_db.candidates;
