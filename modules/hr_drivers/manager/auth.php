<?php
/**
 * Office Manager Mobile App Authentication & Session Helper
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

/**
 * Checks if an Office Manager is currently logged in
 */
function isManagerLoggedIn(): bool {
    return isset($_SESSION['manager']) && is_array($_SESSION['manager']) && !empty($_SESSION['manager']['office_id']);
}

/**
 * Guard that requires an active Office Manager session
 */
function requireManagerAuth(): void {
    if (!isManagerLoggedIn()) {
        $currentPage = basename($_SERVER['PHP_SELF']);
        if ($currentPage !== 'login.php') {
            header('Location: login.php');
            exit;
        }
    }
}

/**
 * Returns current logged in manager data
 */
function getCurrentManager(): array {
    if (isManagerLoggedIn()) {
        return $_SESSION['manager'];
    }
    return [
        'office_id'        => 0,
        'office_code'      => '',
        'office_name_ar'   => '',
        'office_name_en'   => '',
        'city'             => '',
        'manager_name'     => '',
        'manager_name_en'  => '',
        'manager_badge_no' => '',
        'manager_email'    => ''
    ];
}

/**
 * CSRF protection for manager forms
 */
function getManagerCsrf(): string {
    if (empty($_SESSION['manager_csrf'])) {
        $_SESSION['manager_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['manager_csrf'];
}

function verifyManagerCsrf(?string $token): bool {
    if (empty($token) || empty($_SESSION['manager_csrf'])) {
        return false;
    }
    return hash_equals($_SESSION['manager_csrf'], $token);
}
