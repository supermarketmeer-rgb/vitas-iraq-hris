-- Copy company_profile table from vitas_hris to vitasiraq_hris_db
-- This script was executed successfully on 2026-08-03

-- Step 1: Drop the table if it exists in target database (to avoid conflicts)
DROP TABLE IF EXISTS company_profile;

-- Step 2: Create the table with the same structure as source
CREATE TABLE company_profile (
  id varchar(50) NOT NULL,
  company_name varchar(255) NOT NULL,
  company_name_en varchar(255) DEFAULT NULL,
  logo_url text DEFAULT NULL,
  address text DEFAULT NULL,
  city varchar(100) DEFAULT NULL,
  country varchar(100) DEFAULT 'Iraq',
  phone varchar(50) DEFAULT NULL,
  email varchar(255) DEFAULT NULL,
  website varchar(255) DEFAULT NULL,
  tax_id varchar(100) DEFAULT NULL,
  registration_number varchar(100) DEFAULT NULL,
  established_date date DEFAULT NULL,
  description text DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Step 3: Copy all data from source database
INSERT INTO vitasiraq_hris_db.company_profile SELECT * FROM vitas_hris.company_profile;
