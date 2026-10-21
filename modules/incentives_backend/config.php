<?php
/**
 * Standalone Incentives Management System (IMS)
 * Database & Environment Configuration
 */

declare(strict_types=1);

define('DB_HOST', getenv('IMS_DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('IMS_DB_PORT') ?: '3306');
define('DB_NAME', getenv('IMS_DB_NAME') ?: 'incentives_management_db');
define('DB_USER', getenv('IMS_DB_USER') ?: 'root');
define('DB_PASS', getenv('IMS_DB_PASS') ?: '');

// Security & API
define('HR_API_SECRET_KEY', getenv('IMS_HR_API_TOKEN') ?: 'ims_secure_token_live_hr_sync_2026_finance');
define('APP_ENV', getenv('APP_ENV') ?: 'development');

/**
 * Returns a configured PDO instance
 */
function getDbConnection(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_PORT, DB_NAME);
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'success' => false,
                'error'   => 'تعذر الاتصال بقاعدة بيانات الحوافز: ' . $e->getMessage(),
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
    return $pdo;
}

/**
 * Sends standard JSON response
 */
function sendJsonResponse(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Authenticates HR API requests using Bearer token
 */
function authenticateHrRequest(): void {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (empty($authHeader) || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        sendJsonResponse([
            'success' => false,
            'error'   => 'غير مصرح: ترويسة المصادقة المعتمدة مفقودة (Missing Bearer Token)',
        ], 401);
    }
    
    $token = $matches[1];
    if ($token !== HR_API_SECRET_KEY) {
        sendJsonResponse([
            'success' => false,
            'error'   => 'رمز المصادقة غير صالح للوصول إلى واجهة الحوافز (Invalid Token)',
        ], 403);
    }
}
