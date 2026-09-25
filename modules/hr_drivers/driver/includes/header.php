<?php
/**
 * Driver Mobile App Header Layout
 * Responsive Mobile-First Design with Dark/Light Mode, Bilingual AR/EN, PWA Viewport
 * Theme Accent: Emerald Green (#16a34a)
 */
require_once __DIR__ . '/../auth.php';
requireDriverAuth();

// Language toggle
if (isset($_GET['lang']) && in_array($_GET['lang'], ['ar', 'en'], true)) {
    $_SESSION['lang'] = $_GET['lang'];
    $remainingParams = $_GET;
    unset($remainingParams['lang']);
    $cleanPath = strtok($_SERVER['REQUEST_URI'], '?');
    $redirectUrl = $cleanPath . (!empty($remainingParams) ? '?' . http_build_query($remainingParams) : '');
    header('Location: ' . $redirectUrl);
    exit;
}

// Dark/Light Theme toggle
if (isset($_GET['theme']) && in_array($_GET['theme'], ['light', 'dark'], true)) {
    $_SESSION['theme'] = $_GET['theme'];
    $remainingParams = $_GET;
    unset($remainingParams['theme']);
    $cleanPath = strtok($_SERVER['REQUEST_URI'], '?');
    $redirectUrl = $cleanPath . (!empty($remainingParams) ? '?' . http_build_query($remainingParams) : '');
    header('Location: ' . $redirectUrl);
    exit;
}

header('Content-Type: text/html; charset=UTF-8');

$driver       = getCurrentDriverPortal();
$currentLang  = getCurrentLang();
$currentTheme = $_SESSION['theme'] ?? 'light';
$isRtl        = isRtl();
$isDark       = ($currentTheme === 'dark');
$currentPage  = basename($_SERVER['PHP_SELF']);

$nextLang  = $isRtl ? 'en' : 'ar';
$nextTheme = $isDark ? 'light' : 'dark';

// Build toggle URLs preserving current query params
$langParams = $_GET;
$langParams['lang'] = $nextLang;
$langToggleUrl = '?' . http_build_query($langParams);

$themeParams = $_GET;
$themeParams['theme'] = $nextTheme;
$themeToggleUrl = '?' . http_build_query($themeParams);

// Colors for driver mobile app (Green theme)
$bgColor     = $isDark ? '#0b1612' : '#f4f8f6';
$textColor   = $isDark ? '#f1f5f9' : '#0f172a';
$cardBg      = $isDark ? '#13231d' : '#ffffff';
$cardBorder  = $isDark ? '#1c382e' : '#e2e8f0';
$appBarBg    = $isDark ? '#0e1c17' : '#ffffff';
$navBg       = $isDark ? '#0e1c17' : '#ffffff';
$inputBg     = $isDark ? '#0b1612' : '#ffffff';
$inputColor  = $isDark ? '#f1f5f9' : '#0f172a';

$driverName = $driver['full_name'];
$officeName = $isRtl ? $driver['office_name_ar'] : ($driver['office_name_en'] ?: $driver['office_name_ar']);
?>
<!DOCTYPE html>
<html lang="<?= $currentLang ?>" dir="<?= $isRtl ? 'rtl' : 'ltr' ?>" data-bs-theme="<?= $currentTheme ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="theme-color" content="<?= $isDark ? '#0b1612' : '#16a34a' ?>">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title><?= e($driverName) ?> &bull; <?= $isRtl ? 'بوابة السائق' : 'Driver Portal' ?></title>

    <!-- Bootstrap 5 CSS -->
    <?php if ($isRtl): ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css">
    <?php else: ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <?php endif; ?>

    <!-- FontAwesome 6 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <style>
        :root {
            --app-bg: <?= $bgColor ?>;
            --app-text: <?= $textColor ?>;
            --app-card: <?= $cardBg ?>;
            --app-border: <?= $cardBorder ?>;
            --app-bar-bg: <?= $appBarBg ?>;
            --app-nav-bg: <?= $navBg ?>;
            --primary-accent: #16a34a;
            --primary-accent-hover: #15803d;
            --primary-gradient: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
        }

        body {
            font-family: <?= $isRtl ? "'Cairo', sans-serif" : "'Inter', sans-serif" ?>;
            background-color: var(--app-bg);
            color: var(--app-text);
            margin: 0;
            padding: 0;
            padding-bottom: 85px; /* space for bottom nav */
            min-height: 100vh;
            -webkit-tap-highlight-color: transparent;
        }

        /* Override primary button with driver green */
        .btn-primary {
            background: var(--primary-gradient) !important;
            border-color: var(--primary-accent) !important;
            color: #ffffff !important;
        }
        .btn-primary:hover, .btn-primary:focus, .btn-primary:active {
            background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important;
            border-color: #15803d !important;
            color: #ffffff !important;
        }
        .btn-outline-primary {
            color: var(--primary-accent) !important;
            border-color: var(--primary-accent) !important;
        }
        .btn-outline-primary:hover, .btn-outline-primary:focus, .btn-outline-primary:active {
            background-color: var(--primary-accent) !important;
            color: #ffffff !important;
        }
        .text-primary {
            color: var(--primary-accent) !important;
        }
        .bg-primary {
            background-color: var(--primary-accent) !important;
        }
        .border-primary {
            border-color: var(--primary-accent) !important;
        }

        /* Mobile App Bar */
        .mobile-appbar {
            background-color: var(--app-bar-bg);
            border-bottom: 1px solid var(--app-border);
            padding: 0.75rem 1rem;
            position: sticky;
            top: 0;
            z-index: 1020;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        /* Card Container */
        .mobile-card {
            background-color: var(--app-card);
            border: 1px solid var(--app-border);
            border-radius: 16px;
            padding: 1.15rem;
            margin-bottom: 1rem;
            box-shadow: 0 3px 12px rgba(0, 0, 0, 0.04);
            transition: transform 0.15s ease;
        }

        /* Form Inputs for Touch */
        .form-control, .form-select {
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
            border-color: var(--app-border);
            border-radius: 12px;
            padding: 0.7rem 0.95rem;
            font-size: 0.95rem;
        }
        .form-control:focus, .form-select:focus {
            border-color: var(--primary-accent);
            box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
        }

        /* Bottom Mobile Navigation */
        .mobile-bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background-color: var(--app-nav-bg);
            border-top: 1px solid var(--app-border);
            display: flex;
            justify-content: space-around;
            align-items: center;
            padding: 0.5rem 0.25rem 0.75rem 0.25rem;
            z-index: 1030;
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
        }
        .nav-item-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: #64748b;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.25rem 0.6rem;
            border-radius: 12px;
            transition: all 0.2s ease;
            position: relative;
        }
        .nav-item-btn i {
            font-size: 1.25rem;
            margin-bottom: 3px;
            transition: transform 0.2s ease;
        }
        .nav-item-btn.active {
            color: var(--primary-accent);
        }
        .nav-item-btn.active i {
            transform: scale(1.15);
        }

        /* Status Badge Pills */
        .badge-pill-custom {
            border-radius: 20px;
            padding: 0.4rem 0.85rem;
            font-weight: 600;
        }

        /* Readonly Badge Pill */
        .readonly-chip {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(22, 163, 74, 0.12);
            color: #16a34a;
            font-size: 0.72rem;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 12px;
        }

        /* Print Media Styles */
        @media print {
            .mobile-appbar, .mobile-bottom-nav, .no-print {
                display: none !important;
            }
            body {
                background: #ffffff !important;
                color: #000000 !important;
                padding: 0 !important;
            }
            .mobile-card {
                box-shadow: none !important;
                border: 1px solid #ccc !important;
            }
        }
    </style>
</head>
<body>

<!-- Mobile Top App Bar -->
<header class="mobile-appbar">
    <div class="container-fluid d-flex justify-content-between align-items-center px-1">
        <div class="d-flex align-items-center gap-2">
            <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width: 38px; height: 38px;">
                <i class="fa-solid fa-id-badge fs-6"></i>
            </div>
            <div>
                <div class="fw-bold fs-6 lh-1"><?= e($driverName) ?></div>
                <div class="small text-muted" style="font-size: 0.75rem;">
                    <?= e($officeName) ?> &bull; 
                    <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace"><?= e($driver['driver_number']) ?></span>
                </div>
            </div>
        </div>

        <div class="d-flex align-items-center gap-2">
            <!-- Theme Toggle -->
            <a href="<?= e($themeToggleUrl) ?>" class="btn btn-sm btn-light border rounded-circle p-0 d-flex align-items-center justify-content-center" style="width: 34px; height: 34px;" title="<?= e($isDark ? __('theme_light') : __('theme_dark')) ?>">
                <?php if ($isDark): ?>
                    <i class="fa-solid fa-sun text-warning"></i>
                <?php else: ?>
                    <i class="fa-solid fa-moon text-success"></i>
                <?php endif; ?>
            </a>

            <!-- Language Switcher -->
            <a href="<?= e($langToggleUrl) ?>" class="btn btn-sm btn-light border rounded-circle p-0 d-flex align-items-center justify-content-center" style="width: 34px; height: 34px;" title="<?= e(__('lang_switch')) ?>">
                <i class="fa-solid fa-globe text-info"></i>
            </a>

            <!-- Profile -->
            <a href="profile.php" class="btn btn-sm btn-light border rounded-circle p-0 d-flex align-items-center justify-content-center" style="width: 34px; height: 34px;">
                <i class="fa-solid fa-user-circle text-secondary"></i>
            </a>
        </div>
    </div>
</header>

<main class="container py-3" style="max-width: 600px;">
