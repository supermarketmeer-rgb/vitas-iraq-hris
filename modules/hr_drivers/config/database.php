<?php
/**
 * Driver & Transportation Management System (DTMS)
 * Database Connection & Auto-Setup Script for XAMPP
 * Compatible with PHP 8.x + MySQL PDO
 */

$sharedConfigPath = __DIR__ . '/../../config/app_config.php';
if (!is_file($sharedConfigPath)) {
    throw new RuntimeException('Central Portal configuration is unavailable.');
}
$appConfig = require $sharedConfigPath;
if (!is_array($appConfig)) {
    throw new RuntimeException('Central Portal configuration is invalid.');
}

define('DTMS_ENV', strtolower((string)(getenv('DTMS_ENV') ?: ($appConfig['app_env'] ?? 'production'))));
define('DB_HOST', (string)(getenv('DTMS_DB_HOST') ?: ($appConfig['db_host'] ?? 'localhost')));
define('DB_PORT', (string)(getenv('DTMS_DB_PORT') ?: ($appConfig['db_port'] ?? '3306')));
define('DB_USER', (string)(getenv('DTMS_DB_USER') ?: ($appConfig['db_user'] ?? '')));
define('DB_PASS', (string)(getenv('DTMS_DB_PASS') ?: ($appConfig['db_pass'] ?? '')));
define('DB_NAME', (string)(getenv('DTMS_DB_NAME') ?: ($appConfig['dtms_db_name'] ?? 'dtms_db')));
define('DB_CHARSET', 'utf8mb4');

class Database {
    private static ?PDO $pdo = null;

    public static function getConnection(): PDO {
        if (self::$pdo === null) {
            try {
                if (!preg_match('/^[A-Za-z0-9_]+$/', DB_NAME)) {
                    throw new RuntimeException('Invalid database name configuration.');
                }
                if (DTMS_ENV === 'production' && (DB_USER === 'root' || DB_PASS === '')) {
                    throw new RuntimeException('Production requires a dedicated password-protected database account.');
                }

                if (DTMS_ENV !== 'production') {
                    $initDsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=" . DB_CHARSET;
                    $initPdo = new PDO($initDsn, DB_USER, DB_PASS, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                    ]);
                    $initPdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
                }

                // Connect to the specific database
                $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
                self::$pdo = new PDO($dsn, DB_USER, DB_PASS, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
                ]);
                self::$pdo->exec("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");
                self::$pdo->exec("SET CHARACTER SET utf8mb4;");

                $autoMigrate = strtolower((string)(getenv('DTMS_AUTO_MIGRATE') ?: (DTMS_ENV === 'production' ? 'false' : 'true')));
                if (in_array($autoMigrate, ['1', 'true', 'yes'], true)) {
                    self::ensureSchemaExists();
                }

            } catch (Throwable $e) {
                error_log('DTMS database connection failed: ' . $e->getMessage());
                http_response_code(503);
                die(json_encode([
                    'status' => 'error',
                    'message' => 'Database service is unavailable.'
                ], JSON_UNESCAPED_UNICODE));
            }
        }
        return self::$pdo;
    }

    private static function ensureSchemaExists(): void {
        self::$pdo->exec("
            CREATE TABLE IF NOT EXISTS system_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value LONGTEXT NULL,
                is_secret TINYINT(1) NOT NULL DEFAULT 0,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        $schemaVersion = '2026-10-16-1';
        $versionStmt = self::$pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'dtms_schema_version' LIMIT 1");
        $versionStmt->execute();
        if ((string)($versionStmt->fetchColumn() ?: '') === $schemaVersion) {
            return;
        }

        $stmt = self::$pdo->query("SHOW TABLES LIKE 'trips'");
        if ($stmt->rowCount() === 0) {
            $schemaFile = __DIR__ . '/../schema.sql';
            if (file_exists($schemaFile)) {
                $sql = file_get_contents($schemaFile);
                self::$pdo->exec($sql);
            }
        }

        // Keep existing installations compatible when module roles are expanded.
        $usersTable = self::$pdo->query("SHOW TABLES LIKE 'users'");
        if ($usersTable->rowCount() > 0) {
            $roleColumn = self::$pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
            $roleType = strtolower((string)($roleColumn['Type'] ?? ''));
            if (strpos($roleType, "'security'") === false || strpos($roleType, "'viewer'") === false) {
                self::$pdo->exec("ALTER TABLE users MODIFY role ENUM('admin','supervisor','security','viewer','driver') NOT NULL");
            }
            $reportAccessColumn = self::$pdo->query("SHOW COLUMNS FROM users LIKE 'can_view_reports'");
            if ($reportAccessColumn->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE users ADD can_view_reports TINYINT(1) NOT NULL DEFAULT 0");
            }
            $preferredLanguageColumn = self::$pdo->query("SHOW COLUMNS FROM users LIKE 'preferred_language'");
            if ($preferredLanguageColumn->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE users ADD preferred_language ENUM('ar','en') NOT NULL DEFAULT 'ar'");
            }
            if (self::$pdo->query("SHOW COLUMNS FROM users LIKE 'driver_mode'")->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE users ADD driver_mode ENUM('simple','complex') NOT NULL DEFAULT 'simple' AFTER can_view_reports");
            }
            if (self::$pdo->query("SHOW COLUMNS FROM users LIKE 'portal_user_id'")->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE users ADD portal_user_id BIGINT UNSIGNED NULL AFTER id");
                self::$pdo->exec("ALTER TABLE users ADD UNIQUE KEY uq_users_portal_user_id (portal_user_id)");
            }
        }

        $driversTable = self::$pdo->query("SHOW TABLES LIKE 'drivers'");
        if ($driversTable->rowCount() > 0 && self::$pdo->query("SHOW COLUMNS FROM drivers LIKE 'portal_user_id'")->rowCount() === 0) {
            self::$pdo->exec("ALTER TABLE drivers ADD portal_user_id BIGINT UNSIGNED NULL AFTER user_id");
            self::$pdo->exec("ALTER TABLE drivers ADD KEY idx_drivers_portal_user_id (portal_user_id)");
        }

        if (self::$pdo->query("SHOW TABLES LIKE 'vehicles'")->rowCount() > 0 && self::$pdo->query("SHOW COLUMNS FROM vehicles LIKE 'odometer_unit'")->rowCount() === 0) {
            self::$pdo->exec("ALTER TABLE vehicles ADD odometer_unit ENUM('km','mile') NOT NULL DEFAULT 'km' AFTER last_odometer");
        }
        if (self::$pdo->query("SHOW TABLES LIKE 'vehicles'")->rowCount() > 0) {
            $vehicleOdometerColumn = self::$pdo->query("SHOW COLUMNS FROM vehicles LIKE 'last_odometer'")->fetch();
            if (str_starts_with(strtolower((string)($vehicleOdometerColumn['Type'] ?? '')), 'int')) {
                self::$pdo->exec("ALTER TABLE vehicles MODIFY last_odometer DECIMAL(12,1) NULL DEFAULT 0");
            }
        }
        if (self::$pdo->query("SHOW TABLES LIKE 'odometer_records'")->rowCount() > 0) {
            $readingColumn = self::$pdo->query("SHOW COLUMNS FROM odometer_records LIKE 'reading'")->fetch();
            if (str_starts_with(strtolower((string)($readingColumn['Type'] ?? '')), 'int')) {
                self::$pdo->exec("ALTER TABLE odometer_records MODIFY reading DECIMAL(12,1) NOT NULL");
            }
            if (self::$pdo->query("SHOW COLUMNS FROM odometer_records LIKE 'display_reading'")->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE odometer_records ADD display_reading DECIMAL(12,1) NULL AFTER reading");
                self::$pdo->exec("UPDATE odometer_records SET display_reading = reading WHERE display_reading IS NULL");
            }
            if (self::$pdo->query("SHOW COLUMNS FROM odometer_records LIKE 'reading_unit'")->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE odometer_records ADD reading_unit ENUM('km','mile') NOT NULL DEFAULT 'km' AFTER display_reading");
            }
        }

        if (self::$pdo->query("SHOW TABLES LIKE 'notifications'")->rowCount() > 0) {
            if (self::$pdo->query("SHOW COLUMNS FROM notifications LIKE 'title_en'")->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE notifications ADD title_en VARCHAR(255) NULL AFTER title");
            }
            if (self::$pdo->query("SHOW COLUMNS FROM notifications LIKE 'message_en'")->rowCount() === 0) {
                self::$pdo->exec("ALTER TABLE notifications ADD message_en TEXT NULL AFTER message");
            }
        }

        self::$pdo->exec("
            CREATE TABLE IF NOT EXISTS governorates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name_ar VARCHAR(100) NOT NULL UNIQUE,
                name_en VARCHAR(100) NOT NULL UNIQUE,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $governorates = [
            ['بغداد','Baghdad'],['بابل','Babylon'],['البصرة','Basra'],['أربيل','Erbil'],
            ['النجف الأشرف','Najaf'],['كربلاء المقدسة','Karbala'],['نينوى','Nineveh'],['كركوك','Kirkuk'],
            ['الأنبار','Anbar'],['ذي قار','Dhi Qar'],['ميسان','Maysan'],['المثنى','Muthanna'],
            ['القادسية (الديوانية)','Al-Qadisiyah'],['واسط','Wasit'],['ديالى','Diyala'],
            ['صلاح الدين','Saladin'],['السليمانية','Sulaymaniyah'],['دهوك','Duhok']
        ];
        if ((int)self::$pdo->query("SELECT COUNT(*) FROM governorates")->fetchColumn() === 0) {
            $seedGovernorate = self::$pdo->prepare("INSERT INTO governorates (name_ar, name_en) VALUES (?, ?)");
            foreach ($governorates as $governorate) {
                $seedGovernorate->execute($governorate);
            }
        }

        if (self::$pdo->query("SHOW TABLES LIKE 'offices'")->rowCount() > 0 && self::$pdo->query("SHOW COLUMNS FROM offices LIKE 'phone'")->rowCount() === 0) {
            self::$pdo->exec("ALTER TABLE offices ADD phone VARCHAR(50) NULL AFTER address");
        }

        $tripColumns = [
            'record_type' => "ALTER TABLE trips ADD record_type ENUM('trip','work_session') NOT NULL DEFAULT 'trip' AFTER trip_type",
            'internal_trip_count' => "ALTER TABLE trips ADD internal_trip_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER record_type",
            'external_trip_count' => "ALTER TABLE trips ADD external_trip_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER internal_trip_count",
            'passenger_names' => "ALTER TABLE trips ADD passenger_names TEXT NULL AFTER external_trip_count",
            'start_point_type' => "ALTER TABLE trips ADD start_point_type ENUM('driver_governorate','office_branch','governorate') NULL AFTER governorate",
            'start_governorate_id' => "ALTER TABLE trips ADD start_governorate_id INT NULL AFTER start_point_type",
            'start_office_id' => "ALTER TABLE trips ADD start_office_id INT NULL AFTER start_governorate_id",
            'start_point_name' => "ALTER TABLE trips ADD start_point_name VARCHAR(255) NULL AFTER start_office_id",
            'start_location_detail' => "ALTER TABLE trips ADD start_location_detail VARCHAR(255) NULL AFTER start_point_name"
        ];
        foreach ($tripColumns as $column => $sql) {
            if (self::$pdo->query("SHOW COLUMNS FROM trips LIKE " . self::$pdo->quote($column))->rowCount() === 0) {
                self::$pdo->exec($sql);
            }
        }
        self::$pdo->exec("
            CREATE TABLE IF NOT EXISTS work_session_routes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                trip_id INT NOT NULL,
                from_governorate_id INT NOT NULL,
                to_governorate_id INT NOT NULL,
                sort_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                KEY idx_work_session_routes_trip (trip_id, sort_order),
                CONSTRAINT fk_work_session_routes_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
                CONSTRAINT fk_work_session_routes_from FOREIGN KEY (from_governorate_id) REFERENCES governorates(id),
                CONSTRAINT fk_work_session_routes_to FOREIGN KEY (to_governorate_id) REFERENCES governorates(id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        if (self::$pdo->query("SHOW TABLES LIKE 'trip_destinations'")->rowCount() > 0) {
            foreach ([
                'governorate_id' => "ALTER TABLE trip_destinations ADD governorate_id INT NULL AFTER client_key",
                'governorate_name' => "ALTER TABLE trip_destinations ADD governorate_name VARCHAR(100) NULL AFTER governorate_id"
            ] as $column => $sql) {
                if (self::$pdo->query("SHOW COLUMNS FROM trip_destinations LIKE " . self::$pdo->quote($column))->rowCount() === 0) self::$pdo->exec($sql);
            }
        } else {
            self::$pdo->exec("
                CREATE TABLE trip_destinations (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    trip_id INT NOT NULL,
                    client_key VARCHAR(100) NOT NULL,
                    governorate_id INT NULL,
                    governorate_name VARCHAR(100) NULL,
                    destination VARCHAR(255) NOT NULL,
                    visit_location VARCHAR(255) NOT NULL DEFAULT '',
                    purpose TEXT NULL,
                    sort_order INT NOT NULL DEFAULT 0,
                    completed TINYINT(1) NOT NULL DEFAULT 0,
                    completed_at DATETIME NULL,
                    completed_by VARCHAR(191) NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE KEY uq_trip_destination_key (trip_id, client_key),
                    KEY idx_trip_destinations_trip (trip_id, sort_order),
                    CONSTRAINT fk_trip_destinations_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ");
        }

        $saveVersion = self::$pdo->prepare("
            INSERT INTO system_settings (setting_key, setting_value, is_secret)
            VALUES ('dtms_schema_version', ?, 0)
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), is_secret = 0
        ");
        $saveVersion->execute([$schemaVersion]);
    }
}
