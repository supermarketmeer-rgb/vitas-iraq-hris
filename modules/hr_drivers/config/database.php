<?php
/**
 * Drivers & Trips Management Module
 * Database Connection using PDO MySQL
 * Connected to main HRIS database: vitasiraq_hris_db
 * All drivers tables use the "drv_" prefix
 */

declare(strict_types=1);

// Configuration Settings - use same DB as main HRIS application
define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'vitasiraq_hris_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: getenv('DB_PASSWORD') ?: '');
define('DB_CHARSET', 'utf8mb4');

// System Configurations
define('APP_NAME', 'موديول إدارة السائقين والرحلات والرواتب');
define('APP_NAME_EN', 'Drivers & Trips HR Module');
define('APP_VERSION', '1.0.0');
define('DEFAULT_CURRENCY', 'د.ع'); // IQD

// Table name constants with drv_ prefix
define('TBL_OFFICES',           'drv_offices');
define('TBL_DRIVERS',           'drv_drivers');
define('TBL_TRIP_TYPES',        'drv_trip_types');
define('TBL_TRIP_ROUTES',       'drv_trip_routes');
define('TBL_DRIVER_TRIPS',      'drv_driver_trips');
define('TBL_PAYROLLS',          'drv_payrolls');
define('TBL_PAYROLL_DETAILS',   'drv_payroll_trip_details');
define('TBL_RATES_HISTORY',     'drv_trip_rates_history');
define('TBL_USERS',             'drv_users');
define('TBL_AUDIT_LOGS',        'drv_audit_logs');

/**
 * Returns a singleton PDO instance with strict error handling and UTF-8 collation
 */
function getDBConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            DB_HOST,
            DB_PORT,
            DB_NAME,
            DB_CHARSET
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // Log real error on server, show safe message to client
            error_log('Database Connection Error: ' . $e->getMessage());
            die(json_encode([
                'success' => false,
                'message' => 'تعذر الاتصال بقاعدة البيانات. يرجى التحقق من تشغيل MySQL في XAMPP والتأكد من استيراد schema.sql'
            ], JSON_UNESCAPED_UNICODE));
        }
    }

    return $pdo;
}
