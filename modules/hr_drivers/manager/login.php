<?php
/**
 * Office Manager Mobile Login Screen
 * Authenticates manager via Badge No (رقم الباج) and Password
 */
require_once __DIR__ . '/auth.php';

// If already logged in, redirect to dashboard
if (isManagerLoggedIn()) {
    header('Location: index.php');
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
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyManagerCsrf($token)) {
        $errorMsg = $isRtl ? 'رمز الأمان غير صالح. أعد المحاولة.' : 'Invalid security token. Please try again.';
    } else {
        $badgeNo  = trim($_POST['badge_no'] ?? '');
        $password = trim($_POST['password'] ?? '');

        if (empty($badgeNo) || empty($password)) {
            $errorMsg = $isRtl ? 'يرجى إدخال رقم الباج وكلمة المرور.' : 'Please enter your Badge No and password.';
        } else {
            $stmt = $pdo->prepare("
                SELECT * FROM drv_offices 
                WHERE (manager_badge_no = ? OR code = ?) AND is_active = 1 
                LIMIT 1
            ");
            $stmt->execute([$badgeNo, $badgeNo]);
            $office = $stmt->fetch();

            if ($office && !empty($office['manager_password_hash']) && password_verify($password, $office['manager_password_hash'])) {
                // Successful manager login
                $_SESSION['manager'] = [
                    'office_id'        => (int)$office['id'],
                    'office_code'      => $office['code'],
                    'office_name_ar'   => $office['name_ar'],
                    'office_name_en'   => $office['name_en'],
                    'city'             => $office['city'],
                    'manager_name'     => $office['manager_name'] ?: 'مدير المكتب',
                    'manager_name_en'  => $office['manager_name_en'] ?: ($office['manager_name'] ?: 'Office Manager'),
                    'manager_badge_no' => $office['manager_badge_no'] ?: $badgeNo,
                    'manager_email'    => $office['manager_email'] ?? ''
                ];

                header('Location: index.php');
                exit;
            } else {
                $errorMsg = $isRtl ? 'رقم الباج أو كلمة المرور غير صحيحة.' : 'Invalid Badge No or password.';
            }
        }
    }
}

// Fetch active offices with badges for quick demo helper
$demoOffices = $pdo->query("SELECT code, name_ar, name_en, manager_name, manager_badge_no FROM drv_offices WHERE manager_badge_no IS NOT NULL AND is_active = 1 ORDER BY id ASC LIMIT 4")->fetchAll();

$bgColor    = $isDark ? '#080e1e' : '#eef2f8';
$cardBg     = $isDark ? '#111d38' : '#ffffff';
$textColor  = $isDark ? '#f8fafc' : '#0f172a';
$borderColor= $isDark ? '#1e315b' : '#e2e8f0';
$inputBg    = $isDark ? '#0b1329' : '#ffffff';
$inputColor = $isDark ? '#ffffff' : '#0f172a';
?>
<!DOCTYPE html>
<html lang="<?= $currentLang ?>" dir="<?= $isRtl ? 'rtl' : 'ltr' ?>" data-bs-theme="<?= $currentTheme ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?= $isRtl ? 'دخول مدير المكتب' : 'Office Manager Login' ?></title>
    
    <?php if ($isRtl): ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css">
    <?php else: ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <?php endif; ?>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: <?= $isRtl ? "'Cairo', sans-serif" : "'Inter', sans-serif" ?>;
            background: <?= $bgColor ?>;
            color: <?= $textColor ?>;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            margin: 0;
        }
        .login-card {
            background: <?= $cardBg ?>;
            border: 1px solid <?= $borderColor ?>;
            border-radius: 20px;
            padding: 2rem 1.5rem;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        }
        .form-control {
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
            border-color: <?= $borderColor ?>;
            border-radius: 12px;
            padding: 0.75rem 1rem;
        }
        .btn-submit {
            border-radius: 12px;
            padding: 0.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            border: none;
        }
        .demo-chip {
            cursor: pointer;
            font-size: 0.8rem;
            padding: 0.4rem 0.65rem;
            border-radius: 10px;
            border: 1px solid <?= $borderColor ?>;
            background: <?= $inputBg ?>;
            color: <?= $textColor ?>;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin: 3px;
            transition: all 0.15s ease;
        }
        .demo-chip:hover {
            border-color: #2563eb;
            color: #2563eb;
        }
    </style>
</head>
<body>

<div class="login-card">
    <!-- Top Controls: Theme & Lang -->
    <div class="d-flex justify-content-between align-items-center mb-3">
        <a href="../login.php" class="small text-muted text-decoration-none">
            <i class="fa-solid fa-arrow-left me-1"></i> <?= $isRtl ? 'بوابة الإدارة المركزية' : 'Main Admin' ?>
        </a>
        <div class="d-flex gap-2">
            <a href="<?= e($themeToggleUrl) ?>" class="btn btn-sm btn-light border rounded-circle" style="width: 32px; height: 32px; padding: 0;">
                <i class="fa-solid <?= $isDark ? 'fa-sun text-warning' : 'fa-moon text-primary' ?> pt-1"></i>
            </a>
            <a href="<?= e($langToggleUrl) ?>" class="btn btn-sm btn-light border rounded-circle" style="width: 32px; height: 32px; padding: 0;">
                <i class="fa-solid fa-globe text-info pt-1"></i>
            </a>
        </div>
    </div>

    <!-- App Brand -->
    <div class="text-center mb-4">
        <div class="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-2" style="width: 64px; height: 64px;">
            <i class="fa-solid fa-id-badge fs-2"></i>
        </div>
        <h4 class="fw-bold mb-1"><?= $isRtl ? 'بوابة مدير المكتب' : 'Office Manager Portal' ?></h4>
        <p class="text-muted small mb-0"><?= $isRtl ? 'تسجيل الدخول برقم الباج لإدارة رحلات وتايمشيت السائقين' : 'Login using Badge No to dispatch trips & manage drivers' ?></p>
    </div>

    <?php if ($errorMsg): ?>
        <div class="alert alert-danger py-2 small mb-3">
            <i class="fa-solid fa-circle-exclamation me-1"></i> <?= e($errorMsg) ?>
        </div>
    <?php endif; ?>

    <form method="POST" action="login.php">
        <input type="hidden" name="csrf_token" value="<?= getManagerCsrf() ?>">

        <div class="mb-3">
            <label class="form-label fw-bold small"><?= $isRtl ? 'رقم باج المدير (Badge No)' : 'Manager Badge No' ?></label>
            <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0"><i class="fa-solid fa-id-badge text-primary"></i></span>
                <input type="text" name="badge_no" id="badgeInput" class="form-control border-start-0 font-monospace" placeholder="e.g. MGR-01" required value="<?= e($_POST['badge_no'] ?? '') ?>">
            </div>
        </div>

        <div class="mb-3">
            <label class="form-label fw-bold small"><?= $isRtl ? 'كلمة المرور' : 'Password' ?></label>
            <div class="input-group">
                <span class="input-group-text bg-transparent border-end-0"><i class="fa-solid fa-lock text-primary"></i></span>
                <input type="password" name="password" id="passwordInput" class="form-control border-start-0" placeholder="••••••••" required>
            </div>
        </div>

        <button type="submit" class="btn btn-primary btn-submit w-100 text-white mb-3">
            <i class="fa-solid fa-arrow-right-to-bracket me-2"></i> <?= $isRtl ? 'دخول مدير المكتب' : 'Manager Sign In' ?>
        </button>
    </form>

    <!-- Demo Fast Fill -->
    <div class="border-top pt-3 mt-2">
        <div class="text-muted small fw-bold mb-2">
            <i class="fa-solid fa-bolt text-warning me-1"></i> <?= $isRtl ? 'حسابات تجريبية للاختبار السريع (كلمة المرور: admin123):' : 'Demo Accounts (Default password: admin123):' ?>
        </div>
        <div class="d-flex flex-wrap">
            <?php foreach ($demoOffices as $off): ?>
                <button type="button" class="demo-chip" onclick="fillDemo('<?= e($off['manager_badge_no']) ?>', 'admin123')">
                    <span class="badge bg-primary-subtle text-primary font-monospace"><?= e($off['manager_badge_no']) ?></span>
                    <span><?= e($isRtl ? $off['name_ar'] : $off['name_en']) ?></span>
                </button>
            <?php endforeach; ?>
        </div>
    </div>
</div>

<script>
function fillDemo(badge, pass) {
    document.getElementById('badgeInput').value = badge;
    document.getElementById('passwordInput').value = pass;
}
</script>
</body>
</html>
