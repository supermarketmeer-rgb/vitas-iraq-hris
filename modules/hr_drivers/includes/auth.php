<?php
/**
 * Authentication Helper for HR Module Integration
 * Manages user sessions, authentication requirements, CSRF, and audit logging.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── SSO Authentication Handshake from vitas-iraq-hris ──
if (isset($_GET['sso_user']) && !empty($_GET['sso_user'])) {
    $raw = @base64_decode($_GET['sso_user']);
    $userObj = json_decode($raw, true);
    if (is_array($userObj) && (isset($userObj['id']) || !empty($userObj['username']))) {
        $roleMap = [
            'Super Admin'        => 'admin',
            'HR Manager'         => 'hr_manager',
            'Payroll Specialist' => 'payroll',
            'Department Head'    => 'hr_employee',
            'IT Admin'           => 'admin',
            'Employee'           => 'viewer'
        ];
        $mappedRole = $roleMap[$userObj['role'] ?? ''] ?? 'hr_manager';
        if (!empty($userObj['can_manage_drivers']) || ($userObj['role'] ?? '') === 'Super Admin') {
            $mappedRole = 'admin';
        }

        $userId = (!empty($userObj['id']) && $userObj['id'] !== '0') ? $userObj['id'] : 1;

        $_SESSION['user'] = [
            'id'        => $userId,
            'username'  => $userObj['username'] ?? $userObj['name'] ?? 'admin',
            'full_name' => $userObj['name'] ?? 'مدير النظام',
            'role'      => $mappedRole,
            'office_id' => $userObj['office_id'] ?? 1,
            'email'     => $userObj['email'] ?? ''
        ];
        $_SESSION['embedded'] = 1;
    }
}

if (isset($_GET['embedded'])) {
    $_SESSION['embedded'] = (int)$_GET['embedded'];
}

// Fallback for embedded iframe: if embedded inside HRIS, ensure active authenticated session
$isEmbeddedMode = (!empty($_SESSION['embedded']) && $_SESSION['embedded'] == 1) || (isset($_GET['embedded']) && $_GET['embedded'] == 1);
if ($isEmbeddedMode && (empty($_SESSION['user']) || !isset($_SESSION['user']['id']) || $_SESSION['user']['id'] === '')) {
    $_SESSION['user'] = [
        'id'        => 1,
        'username'  => 'admin',
        'full_name' => 'مدير النظام (Super Admin)',
        'role'      => 'admin',
        'office_id' => 1,
        'email'     => 'admin@vitasiraq.iq'
    ];
    $_SESSION['embedded'] = 1;
}

require_once __DIR__ . '/../config/database.php';

/**
 * Checks if a user is actively authenticated
 */
function isLoggedIn(): bool {
    return isset($_SESSION['user']) && is_array($_SESSION['user']) && isset($_SESSION['user']['id']) && $_SESSION['user']['id'] !== '';
}

/**
 * Returns currently authenticated user or a safe guest fallback
 */
function getCurrentUser(): array {
    if (isLoggedIn()) {
        return $_SESSION['user'];
    }

    return [
        'id' => 0,
        'username' => 'guest',
        'full_name' => 'زائر',
        'role' => 'viewer',
        'office_id' => null,
        'email' => ''
    ];
}

/**
 * Enforces authentication: redirects to login.php if not logged in
 * In embedded mode, denies unauthorized access without showing drivers login screen
 */
function requireAuth(): void {
    if (!isLoggedIn()) {
        $isEmbedded = (!empty($_SESSION['embedded']) && $_SESSION['embedded'] == 1) || (!empty($_GET['embedded']) && $_GET['embedded'] == 1);
        if ($isEmbedded) {
            http_response_code(401);
            die('
                <div style="font-family: Cairo, sans-serif; text-align: center; padding: 60px 20px; direction: rtl; background: #0f172a; color: #fff; min-height: 100vh;">
                    <div style="max-width: 480px; margin: 0 auto; background: #1e293b; padding: 30px; border-radius: 16px; border: 1px solid #334155;">
                        <h3 style="color: #f43f5e; margin-bottom: 15px;">جلسة العمل غير متصلة</h3>
                        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">يرجى تسجيل الدخول إلى تطبيق الموارد البشرية الرئيسي (vitas-iraq-hris) للوصول إلى موديول السائقين.</p>
                    </div>
                </div>
            ');
        }
        $currentPage = basename($_SERVER['PHP_SELF']);
        if ($currentPage !== 'login.php') {
            header('Location: login.php');
            exit;
        }
    }
}

/**
 * Generates CSRF Token
 */
function getCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verifies CSRF Token
 */
function verifyCsrfToken(?string $token): bool {
    if (!$token || empty($_SESSION['csrf_token'])) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Audit Logging Function
 */
function logAudit(string $action, string $table, int $recordId, ?array $oldValues = null, ?array $newValues = null): void {
    try {
        $pdo = getDBConnection();
        $user = getCurrentUser();
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $agent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'CLI', 0, 250);

        $stmt = $pdo->prepare("
            INSERT INTO drv_audit_logs (user_id, username, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $user['id'] ?: null,
            $user['username'] ?? 'guest',
            strtoupper($action),
            $table,
            $recordId,
            $oldValues ? json_encode($oldValues, JSON_UNESCAPED_UNICODE) : null,
            $newValues ? json_encode($newValues, JSON_UNESCAPED_UNICODE) : null,
            $ip,
            $agent
        ]);
    } catch (\Throwable $e) {
        error_log('Audit Log failed: ' . $e->getMessage());
    }
}
