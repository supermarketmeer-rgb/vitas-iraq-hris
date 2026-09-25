<?php
/**
 * Manager Logout
 */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

unset($_SESSION['manager']);
unset($_SESSION['manager_csrf']);

header('Location: login.php?msg=logged_out');
exit;
