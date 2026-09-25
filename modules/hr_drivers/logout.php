<?php
/**
 * Logout Handler (تسجيل الخروج)
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

if (isLoggedIn()) {
    logAudit('LOGOUT', 'users', getCurrentUser()['id'] ?? 0);
    unset($_SESSION['user']);
}

// Preserve lang and theme preferences across logouts
$lang = $_SESSION['lang'] ?? 'ar';
$theme = $_SESSION['theme'] ?? 'light';

$_SESSION['lang'] = $lang;
$_SESSION['theme'] = $theme;

header('Location: login.php?msg=logged_out');
exit;
