# Standalone Incentives Management System - PHP & MySQL Backend

This folder contains the complete, independent PHP & MySQL backend implementation of the Incentives Management System.

## Requirements
* Apache with mod_rewrite enabled (XAMPP / WAMP / Linux LAMP)
* PHP 8.0 or higher with PDO and JSON extensions
* MySQL 5.7+ or MariaDB 10.4+

## Quick Installation on XAMPP
1. Move or link this folder into your XAMPP web root:
   `C:\xampp\htdocs\IncentivesManagement`
2. Start Apache and MySQL from the XAMPP Control Panel.
3. Open `http://localhost/phpmyadmin` and import `schema.sql`.
4. Verify configuration in `config.php`:
   - Database name: `incentives_management_db`
   - User: `root`, Password: (empty by default)
5. Test the health API:
   `http://localhost/IncentivesManagement/backend-php-mysql/api.php?action=health`
6. Test authenticated HR endpoints with Bearer Token:
   `Authorization: Bearer ims_secure_token_live_hr_sync_2026_finance`
