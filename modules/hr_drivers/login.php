<?php
/**
 * Login Screen (شاشة تسجيل الدخول)
 * Authenticates against `drv_users` table and enforces role-based permissions.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/lang.php';
require_once __DIR__ . '/includes/functions.php';

// If already logged in, redirect to dashboard
if (isLoggedIn()) {
    header('Location: dashboard.php');
    exit;
}

// Handle language toggle on login page
if (isset($_GET['lang']) && in_array($_GET['lang'], ['ar', 'en'], true)) {
    $_SESSION['lang'] = $_GET['lang'];
    $remainingParams = $_GET;
    unset($remainingParams['lang']);
    $redirectUrl = 'login.php' . (!empty($remainingParams) ? '?' . http_build_query($remainingParams) : '');
    header('Location: ' . $redirectUrl);
    exit;
}

// Handle theme toggle on login page
if (isset($_GET['theme']) && in_array($_GET['theme'], ['light', 'dark'], true)) {
    $_SESSION['theme'] = $_GET['theme'];
    $remainingParams = $_GET;
    unset($remainingParams['theme']);
    $redirectUrl = 'login.php' . (!empty($remainingParams) ? '?' . http_build_query($remainingParams) : '');
    header('Location: ' . $redirectUrl);
    exit;
}

$currentLang  = getCurrentLang();
$currentTheme = $_SESSION['theme'] ?? 'light';
$isRtl        = isRtl();
$isDark       = ($currentTheme === 'dark');
$nextLang     = $isRtl ? 'en' : 'ar';
$nextTheme    = $isDark ? 'light' : 'dark';

$langParams = $_GET;
$langParams['lang'] = $nextLang;
$langToggleUrl = '?' . http_build_query($langParams);

$themeParams = $_GET;
$themeParams['theme'] = $nextTheme;
$themeToggleUrl = '?' . http_build_query($themeParams);

$errorMsg = '';
$infoMsg = '';

if (isset($_GET['msg']) && $_GET['msg'] === 'logged_out') {
    $infoMsg = __('logged_out_msg');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errorMsg = $isRtl ? 'رمز الأمان غير صالح.' : 'Invalid security token.';
    } else {
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';

        if (empty($username) || empty($password)) {
            $errorMsg = $isRtl ? 'يرجى إدخال اسم المستخدم وكلمة المرور.' : 'Please enter username and password.';
        } else {
            try {
                $pdo = getDBConnection();
                $stmt = $pdo->prepare("SELECT * FROM drv_users WHERE username = ? AND is_active = 1 LIMIT 1");
                $stmt->execute([$username]);
                $user = $stmt->fetch();

                if ($user && password_verify($password, $user['password_hash'])) {
                    // Update last login timestamp
                    $upd = $pdo->prepare("UPDATE drv_users SET last_login = NOW() WHERE id = ?");
                    $upd->execute([$user['id']]);

                    // Store user session
                    $_SESSION['user'] = [
                        'id' => (int)$user['id'],
                        'username' => $user['username'],
                        'full_name' => $user['full_name'],
                        'role' => $user['role'],
                        'office_id' => $user['office_id'] ? (int)$user['office_id'] : null,
                        'email' => $user['email']
                    ];

                    logAudit('LOGIN', 'users', $user['id'], null, ['role' => $user['role']]);

                    header('Location: dashboard.php');
                    exit;
                } else {
                    $errorMsg = __('login_error');
                }
            } catch (\PDOException $e) {
                error_log('Login Error: ' . $e->getMessage());
                $errorMsg = $isRtl ? 'حدث خطأ في الاتصال بالنظام.' : 'System connection error.';
            }
        }
    }
}

// Styling colors
$bgColor     = $isDark ? '#0f172a' : '#f1f5f9';
$textColor   = $isDark ? '#e2e8f0' : '#1e293b';
$cardBg      = $isDark ? '#1e293b' : '#ffffff';
$cardBorder  = $isDark ? '#334155' : '#e2e8f0';
$inputBg     = $isDark ? '#0f172a' : '#ffffff';
$inputColor  = $isDark ? '#e2e8f0' : '#1e293b';
?>
<!DOCTYPE html>
<html lang="<?= $currentLang ?>" dir="<?= $isRtl ? 'rtl' : 'ltr' ?>" data-bs-theme="<?= $currentTheme ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(__('login')) ?> - <?= e(__('app_name')) ?></title>

    <!-- Bootstrap 5 CSS -->
    <?php if ($isRtl): ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css">
    <?php else: ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <?php endif; ?>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <style>
        html { font-size: 14.5px; }
        body {
            font-family: <?= $isRtl ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif" ?>;
            background-color: <?= $bgColor ?>;
            color: <?= $textColor ?>;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .login-card {
            background-color: <?= $cardBg ?>;
            border: 1px solid <?= $cardBorder ?>;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,<?= $isDark ? '0.5' : '0.08' ?>);
            width: 100%;
            max-width: 440px;
            padding: 2.2rem;
        }
        .form-control {
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
            border-color: <?= $cardBorder ?>;
            padding: 0.65rem 0.9rem;
            font-size: 0.92rem;
            text-align: start;
        }
        .form-control:focus {
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
            border-color: #38bdf8;
            box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
        }
        .top-controls {
            position: absolute;
            top: 20px;
            <?= $isRtl ? 'left: 20px;' : 'right: 20px;' ?>
            display: flex;
            gap: 10px;
        }
        .icon-btn {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid <?= $cardBorder ?>;
            background-color: <?= $cardBg ?>;
            color: <?= $textColor ?>;
            text-decoration: none;
            font-size: 1.1rem;
            transition: all 0.2s ease;
        }
        .icon-btn:hover {
            border-color: #38bdf8;
            color: #38bdf8;
            transform: translateY(-2px);
        }
        .demo-chip {
            cursor: pointer;
            padding: 5px 10px;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 600;
            border: 1px solid <?= $cardBorder ?>;
            background-color: <?= $isDark ? '#0f172a' : '#f8fafc' ?>;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 6px;
            transition: all 0.15s ease;
        }
        .demo-chip:hover {
            border-color: #38bdf8;
            background-color: <?= $isDark ? '#1e293b' : '#e0f2fe' ?>;
            color: #0284c7;
        }
    </style>
</head>
<body>

<!-- Language & Theme Top-corner controls -->
<div class="top-controls">
    <a href="<?= e($themeToggleUrl) ?>" class="icon-btn" title="<?= e($isDark ? __('theme_light') : __('theme_dark')) ?>">
        <?php if ($isDark): ?>
            <i class="fa-solid fa-sun text-warning"></i>
        <?php else: ?>
            <i class="fa-solid fa-moon text-primary"></i>
        <?php endif; ?>
    </a>
    <a href="<?= e($langToggleUrl) ?>" class="icon-btn" title="<?= e(__('lang_switch')) ?>">
        <i class="fa-solid fa-globe text-info"></i>
    </a>
</div>

<div class="login-card">
    
    <!-- Brand Header -->
    <div class="text-center mb-4">
        <div class="d-inline-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle mb-3" style="width: 64px; height: 64px;">
            <i class="fa-solid fa-truck fs-2"></i>
        </div>
        <h4 class="fw-bold mb-1"><?= e(__('app_name')) ?></h4>
        <p class="text-muted small mb-0"><?= e(__('login_welcome')) ?></p>
    </div>

    <!-- Alert Messages -->
    <?php if ($errorMsg): ?>
        <div class="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3">
            <i class="fa-solid fa-circle-exclamation fs-6"></i>
            <span><?= e($errorMsg) ?></span>
        </div>
    <?php endif; ?>

    <?php if ($infoMsg): ?>
        <div class="alert alert-success py-2 small d-flex align-items-center gap-2 mb-3">
            <i class="fa-solid fa-circle-check fs-6"></i>
            <span><?= e($infoMsg) ?></span>
        </div>
    <?php endif; ?>

    <!-- Login Form -->
    <form method="POST" action="login.php">
        <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">

        <div class="mb-3">
            <label class="form-label fw-bold small"><?= e(__('username')) ?></label>
            <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="fa-solid fa-user"></i></span>
                <input type="text" name="username" id="login_username" class="form-control border-start-0" required placeholder="admin" autofocus>
            </div>
        </div>

        <div class="mb-4">
            <label class="form-label fw-bold small"><?= e(__('password')) ?></label>
            <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="fa-solid fa-lock"></i></span>
                <input type="password" name="password" id="login_password" class="form-control border-start-0" required placeholder="••••••••">
            </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm">
            <i class="fa-solid fa-right-to-bracket"></i>
            <span><?= e(__('login_btn')) ?></span>
        </button>
    </form>

    <!-- Role-based Demo Quick-fill -->
    <div class="mt-4 pt-3 border-top">
        <span class="d-block small text-muted fw-bold mb-2"><?= e(__('demo_accounts')) ?></span>
        <div class="d-flex flex-wrap gap-1">
            <span class="demo-chip" onclick="fillCreds('admin', 'admin123')">
                <i class="fa-solid fa-user-shield text-danger"></i>
                <span>admin (<?= e(__('role_admin')) ?>)</span>
            </span>
            <span class="demo-chip" onclick="fillCreds('hrmanager', 'admin123')">
                <i class="fa-solid fa-user-tie text-primary"></i>
                <span>hrmanager (<?= e(__('role_hr_manager')) ?>)</span>
            </span>
            <span class="demo-chip" onclick="fillCreds('payroll_officer', 'admin123')">
                <i class="fa-solid fa-file-invoice-dollar text-success"></i>
                <span>payroll_officer (<?= e(__('role_payroll')) ?>)</span>
            </span>
            <span class="demo-chip" onclick="fillCreds('hr_emp', 'admin123')">
                <i class="fa-solid fa-user-pen text-warning"></i>
                <span>hr_emp (<?= e(__('role_hr_employee')) ?>)</span>
            </span>
        </div>
        <small class="text-muted d-block mt-1"><?= $isRtl ? 'كلمة المرور لجميع الحسابات: admin123' : 'Password for all accounts: admin123' ?></small>
    </div>

</div>

<script>
function fillCreds(u, p) {
    document.getElementById('login_username').value = u;
    document.getElementById('login_password').value = p;
}
</script>

</body>
</html>
