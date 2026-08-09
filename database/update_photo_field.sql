-- Add photo field as LONGBLOB to employees table
-- This script should be executed in phpMyAdmin on the vitasiraq_hris_db database

USE vitasiraq_hris_db;

-- Add photo column as LONGBLOB after passport_expiry column
ALTER TABLE employees 
ADD COLUMN photo LONGBLOB NULL AFTER passport_expiry;

-- Verify the change
DESCRIBE employees;
