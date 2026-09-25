<?php
/**
 * Driver Mobile Portal – Authentication & Session Helper
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/functions.php';

/**
 * Checks if a Driver is currently logged in
 */
function isDriverLoggedIn(): bool {
    return isset($_SESSION['driver_portal']) 
        && is_array($_SESSION['driver_portal']) 
        && !empty($_SESSION['driver_portal']['driver_id']);
}

/**
 * Guard that requires an active Driver session
 */
function requireDriverAuth(): void {
    if (!isDriverLoggedIn()) {
        $currentPage = basename($_SERVER['PHP_SELF']);
        if ($currentPage !== 'login.php') {
            header('Location: login.php');
            exit;
        }
    }
}

/**
 * Returns current logged-in driver data
 */
function getCurrentDriverPortal(): array {
    if (isDriverLoggedIn()) {
        return $_SESSION['driver_portal'];
    }
    return [
        'driver_id'     => 0,
        'driver_number' => '',
        'full_name'     => '',
        'phone'         => '',
        'office_id'     => 0,
        'office_name_ar'=> '',
        'office_name_en'=> '',
        'status'        => '',
        'license_type'  => '',
        'hire_date'     => '',
    ];
}

/**
 * CSRF protection for driver forms
 */
function getDriverCsrf(): string {
    if (empty($_SESSION['driver_csrf'])) {
        $_SESSION['driver_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['driver_csrf'];
}

function verifyDriverCsrf(?string $token): bool {
    if (empty($token) || empty($_SESSION['driver_csrf'])) {
        return false;
    }
    return hash_equals($_SESSION['driver_csrf'], $token);
}
