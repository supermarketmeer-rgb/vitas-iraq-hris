<?php
/**
 * Driver Mobile Portal – Login Screen
 * Authenticates drivers via Badge No (driver_number) and Password
 */
require_once __DIR__ . '/auth.php';

if (isDriverLoggedIn()) {
    header('Location: index.php');
    exit;
}

// Language toggle
if (isset($_GET['lang']) && in_array($_GET['lang'], ['ar', 'en'], true)) {
    $_SESSION['lang'] = $_GET['lang'];
    $rem = $_GET; unset($rem['lang']);
    header('Location: login.php' . (!empty($rem) ? '?' . http_build_query($rem) : ''));
    exit;
}
// Theme toggle
if (isset($_GET['theme']) && in_array($_GET['theme'], ['light', 'dark'], true)) {
    $_SESSION['theme'] = $_GET['theme'];
    $rem = $_GET; unset($rem['theme']);
    header('Location: login.php' . (!empty($rem) ? '?' . http_build_query($rem) : ''));
    exit;
}

$currentLang  = getCurrentLang();
$currentTheme = $_SESSION['theme'] ?? 'light';
$isRtl        = isRtl();
$isDark       = ($currentTheme === 'dark');
$nextLang     = $isRtl ? 'en' : 'ar';
$nextTheme    = $isDark ? 'light' : 'dark';

$langParams = $_GET; $langParams['lang']   = $nextLang;  $langToggleUrl  = '?' . http_build_query($langParams);
$themeParams = $_GET; $themeParams['theme'] = $nextTheme; $themeToggleUrl = '?' . http_build_query($themeParams);

$errorMsg = '';
$pdo = getDBConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyDriverCsrf($_POST['csrf_token'] ?? '')) {
        $errorMsg = $isRtl ? 'رمز الأمان غير صالح. أعد المحاولة.' : 'Invalid security token. Please try again.';
    } else {
        $badgeNo  = trim($_POST['badge_no'] ?? '');
        $password = trim($_POST['password'] ?? '');

        if (empty($badgeNo) || empty($password)) {
            $errorMsg = $isRtl ? 'يرجى إدخال رقم الباج وكلمة المرور.' : 'Please enter your Badge No and password.';
        } else {
            $stmt = $pdo->prepare("
                SELECT d.*, o.name_ar as office_name_ar, o.name_en as office_name_en
                FROM drv_drivers d
                JOIN drv_offices o ON d.office_id = o.id
                WHERE d.driver_number = ? AND d.deleted_at IS NULL
                LIMIT 1
            ");
            $stmt->execute([$badgeNo]);
            $driver = $stmt->fetch();

            if ($driver && !empty($driver['driver_password_hash']) && password_verify($password, $driver['driver_password_hash'])) {
                $_SESSION['driver_portal'] = [
                    'driver_id'      => (int)$driver['id'],
                    'driver_number'  => $driver['driver_number'],
                    'full_name'      => $driver['full_name'],
                    'phone'          => $driver['phone'],
                    'office_id'      => (int)$driver['office_id'],
                    'office_name_ar' => $driver['office_name_ar'],
                    'office_name_en' => $driver['office_name_en'],
                    'status'         => $driver['status'],
                    'license_type'   => $driver['license_type'],
                    'hire_date'      => $driver['hire_date'],
                ];
                header('Location: index.php');
                exit;
            } else {
                $errorMsg = $isRtl ? 'رقم الباج أو كلمة المرور غير صحيحة.' : 'Invalid Badge No or password.';
            }
        }
    }
}

// Fetch demo drivers
$demoDrivers = $pdo->query("SELECT driver_number, full_name, office_id FROM drv_drivers WHERE deleted_at IS NULL AND status = 'active' ORDER BY id ASC LIMIT 4")->fetchAll();

// Theme colors
$bgGradient   = $isDark ? 'linear-gradient(160deg, #050d1f 0%, #0a1835 50%, #07132b 100%)' : 'linear-gradient(160deg, #e8f0ff 0%, #f4f6fb 50%, #eaf1ff 100%)';
$cardBg       = $isDark ? 'rgba(15,27,56,0.95)' : '#ffffff';
$textColor    = $isDark ? '#f1f5f9' : '#0f172a';
$borderColor  = $isDark ? '#1e315b' : '#e2e8f0';
$inputBg      = $isDark ? '#0b1329' : '#f8fafc';
$inputColor   = $isDark ? '#ffffff' : '#0f172a';
$mutedColor   = $isDark ? '#94a3b8' : '#64748b';
?>
<!DOCTYPE html>
<html lang="<?= $currentLang ?>" dir="<?= $isRtl ? 'rtl' : 'ltr' ?>" data-bs-theme="<?= $currentTheme ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="<?= $isDark ? '#050d1f' : '#16a34a' ?>">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title><?= $isRtl ? 'بوابة السائق' : 'Driver Portal' ?></title>

    <?php if ($isRtl): ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css">
    <?php else: ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <?php endif; ?>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        * { box-sizing: border-box; }
        body {
            font-family: <?= $isRtl ? "'Cairo', sans-serif" : "'Inter', sans-serif" ?>;
            background: <?= $bgGradient ?>;
            color: <?= $textColor ?>;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem 1rem;
            margin: 0;
        }
        .login-wrap { width: 100%; max-width: 420px; }

        /* Brand Icon */
        .brand-ring {
            width: 80px; height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1rem;
            box-shadow: 0 8px 24px rgba(22,163,74,0.35);
        }

        .login-card {
            background: <?= $cardBg ?>;
            border: 1px solid <?= $borderColor ?>;
            border-radius: 24px;
            padding: 2rem 1.5rem;
            box-shadow: 0 20px 60px rgba(0,0,0,<?= $isDark ? '0.4' : '0.08' ?>);
        }

        .form-control {
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
            border-color: <?= $borderColor ?>;
            border-radius: 12px;
            padding: 0.75rem 1rem;
            font-size: 1rem;
            transition: all 0.2s ease;
        }
        .form-control:focus {
            border-color: #16a34a;
            box-shadow: 0 0 0 3px rgba(22,163,74,0.18);
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
        }
        .input-group-text {
            background: <?= $inputBg ?>;
            border-color: <?= $borderColor ?>;
            border-radius: 12px 0 0 12px;
        }
        .btn-submit {
            border-radius: 14px;
            padding: 0.85rem;
            font-weight: 700;
            font-size: 1rem;
            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
            border: none;
            color: #fff;
            box-shadow: 0 4px 16px rgba(22,163,74,0.3);
            transition: all 0.2s ease;
        }
        .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,0.4); color:#fff; }

        .demo-chip {
            cursor: pointer;
            font-size: 0.78rem;
            padding: 0.35rem 0.6rem;
            border-radius: 10px;
            border: 1px solid <?= $borderColor ?>;
            background: <?= $inputBg ?>;
            color: <?= $textColor ?>;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin: 3px;
            transition: all 0.15s ease;
        }
        .demo-chip:hover { border-color: #16a34a; color: #16a34a; }

        .controls-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .ctrl-btn {
            width: 34px; height: 34px;
            border-radius: 50%;
            border: 1px solid <?= $borderColor ?>;
            background: <?= $inputBg ?>;
            color: <?= $textColor ?>;
            display: flex; align-items: center; justify-content: center;
            text-decoration: none;
            transition: all 0.15s;
            font-size: 0.85rem;
        }
        .ctrl-btn:hover { border-color: #16a34a; }

        .divider-text {
            text-align: center;
            position: relative;
            color: <?= $mutedColor ?>;
            font-size: 0.78rem;
            margin: 1rem 0 0.5rem;
        }
        .divider-text::before, .divider-text::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 38%;
            height: 1px;
            background: <?= $borderColor ?>;
        }
        .divider-text::before { left: 0; }
        .divider-text::after  { right: 0; }
    </style>
</head>
<body>
<div class="login-wrap">
    <!-- Brand Ring -->
    <div class="brand-ring">
        <i class="fa-solid fa-steering-wheel fa-2x text-white"></i>
    </div>

    <div class="login-card">
        <!-- Top Controls -->
        <div class="controls-bar">
            <a href="../login.php" class="small text-decoration-none" style="color:<?= $mutedColor ?>">
                <i class="fa-solid fa-arrow-<?= $isRtl ? 'right' : 'left' ?> me-1"></i>
                <?= $isRtl ? 'بوابة الإدارة' : 'Admin Portal' ?>
            </a>
            <div class="d-flex gap-2">
                <a href="<?= e($themeToggleUrl) ?>" class="ctrl-btn" title="Theme">
                    <i class="fa-solid <?= $isDark ? 'fa-sun text-warning' : 'fa-moon text-primary' ?>"></i>
                </a>
                <a href="<?= e($langToggleUrl) ?>" class="ctrl-btn" title="Language">
                    <i class="fa-solid fa-globe text-info"></i>
                </a>
            </div>
        </div>

        <!-- Heading -->
        <div class="text-center mb-4">
            <h4 class="fw-bold mb-1"><?= $isRtl ? 'بوابة السائق' : 'Driver Portal' ?></h4>
            <p class="small mb-0" style="color:<?= $mutedColor ?>">
                <?= $isRtl
                    ? 'سجّل دخولك برقم الباج لعرض رحلاتك وتايمشيتك'
                    : 'Sign in with your Badge No to view your trips & timesheet'
                ?>
            </p>
        </div>

        <?php if ($errorMsg): ?>
            <div class="alert alert-danger py-2 small border-0 rounded-3 mb-3">
                <i class="fa-solid fa-circle-exclamation me-1"></i> <?= e($errorMsg) ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="login.php">
            <input type="hidden" name="csrf_token" value="<?= getDriverCsrf() ?>">

            <!-- Badge No -->
            <div class="mb-3">
                <label class="form-label fw-semibold small"><?= $isRtl ? 'رقم الباج (Badge No)' : 'Badge No (Driver Number)' ?></label>
                <div class="input-group">
                    <span class="input-group-text border-end-0">
                        <i class="fa-solid fa-id-card" style="color:#16a34a;"></i>
                    </span>
                    <input type="text" name="badge_no" id="badgeInput" class="form-control border-start-0 font-monospace"
                           placeholder="DRV-01" required
                           value="<?= e($_POST['badge_no'] ?? '') ?>"
                           autocomplete="username" autocapitalize="none">
                </div>
            </div>

            <!-- Password -->
            <div class="mb-4">
                <label class="form-label fw-semibold small"><?= $isRtl ? 'كلمة المرور' : 'Password' ?></label>
                <div class="input-group">
                    <span class="input-group-text border-end-0">
                        <i class="fa-solid fa-lock" style="color:#16a34a;"></i>
                    </span>
                    <input type="password" name="password" id="passwordInput"
                           class="form-control border-start-0"
                           placeholder="••••••" required autocomplete="current-password">
                    <button type="button" class="btn border" style="background:<?= $inputBg ?>;border-color:<?= $borderColor ?>;" onclick="togglePwd()">
                        <i class="fa-solid fa-eye" id="eyeIcon" style="color:<?= $mutedColor ?>;"></i>
                    </button>
                </div>
            </div>

            <button type="submit" class="btn btn-submit w-100 mb-3">
                <i class="fa-solid fa-arrow-right-to-bracket me-2"></i>
                <?= $isRtl ? 'دخول' : 'Sign In' ?>
            </button>
        </form>

        <!-- Demo fast-fill -->
        <?php if (!empty($demoDrivers)): ?>
        <div class="divider-text"><?= $isRtl ? 'حسابات تجريبية (كلمة المرور: 1234)' : 'Demo accounts (Password: 1234)' ?></div>
        <div class="d-flex flex-wrap justify-content-center">
            <?php foreach ($demoDrivers as $d): ?>
                <button type="button" class="demo-chip" onclick="fillDemo('<?= e($d['driver_number']) ?>', '1234')">
                    <span class="badge fw-bold font-monospace" style="background:rgba(22,163,74,0.15);color:#16a34a;"><?= e($d['driver_number']) ?></span>
                    <span><?= e(explode(' ', $d['full_name'])[0] . ' ' . (explode(' ', $d['full_name'])[1] ?? '')) ?></span>
                </button>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
</div>

<script>
function fillDemo(badge, pass) {
    document.getElementById('badgeInput').value   = badge;
    document.getElementById('passwordInput').value = pass;
}
function togglePwd() {
    const inp  = document.getElementById('passwordInput');
    const icon = document.getElementById('eyeIcon');
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        inp.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
</script>
</body>
</html>
