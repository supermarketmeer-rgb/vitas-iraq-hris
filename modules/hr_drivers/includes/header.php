<?php
/**
 * Header layout with Bootstrap 5, RTL/LTR support, Dark/Light Mode, Navigation, and Role-based Auth
 * Strict bilingual separation (100% AR or 100% EN).
 */

// ── Session & Early Handlers (must run before any output) ──────────────────
require_once __DIR__ . '/functions.php';

$isEmbedded = (!empty($_SESSION['embedded']) && $_SESSION['embedded'] == 1) || (isset($_GET['embedded']) && $_GET['embedded'] == 1);
if (isset($_GET['embedded'])) {
    $_SESSION['embedded'] = (int)$_GET['embedded'];
    $isEmbedded = ($_SESSION['embedded'] == 1);
}

// Enforce authentication on all protected pages
requireAuth();

// Handle language toggle
if (isset($_GET['lang']) && in_array($_GET['lang'], ['ar', 'en'], true)) {
    $_SESSION['lang'] = $_GET['lang'];
    if (!$isEmbedded) {
        $remainingParams = $_GET;
        unset($remainingParams['lang']);
        $cleanPath = strtok($_SERVER['REQUEST_URI'], '?');
        $redirectUrl = $cleanPath . (!empty($remainingParams) ? '?' . http_build_query($remainingParams) : '');
        header('Location: ' . $redirectUrl);
        exit;
    }
}

// Handle dark/light mode toggle
if (isset($_GET['theme']) && in_array($_GET['theme'], ['light', 'dark'], true)) {
    $_SESSION['theme'] = $_GET['theme'];
    if (!$isEmbedded) {
        $remainingParams = $_GET;
        unset($remainingParams['theme']);
        $cleanPath = strtok($_SERVER['REQUEST_URI'], '?');
        $redirectUrl = $cleanPath . (!empty($remainingParams) ? '?' . http_build_query($remainingParams) : '');
        header('Location: ' . $redirectUrl);
        exit;
    }
}

// Send correct charset before HTML
header('Content-Type: text/html; charset=UTF-8');

$currentUser  = getCurrentUser();
$currentLang  = getCurrentLang();
$currentTheme = $_SESSION['theme'] ?? 'light';
$isRtl        = isRtl();
$isDark       = ($currentTheme === 'dark');
$currentPage  = basename($_SERVER['PHP_SELF']);

// Next-state helpers for toggles
$nextLang  = $isRtl  ? 'en'    : 'ar';
$nextTheme = $isDark ? 'light' : 'dark';

// Build toggle URLs preserving current query parameters
$langParams = $_GET;
$langParams['lang'] = $nextLang;
$langToggleUrl = '?' . http_build_query($langParams);

$themeParams = $_GET;
$themeParams['theme'] = $nextTheme;
$themeToggleUrl = '?' . http_build_query($themeParams);

// Dark / Light CSS Variables
$bgColor     = $isDark ? '#0f172a' : '#f8fafc';
$textColor   = $isDark ? '#e2e8f0' : '#1e293b';
$cardBg      = $isDark ? '#1e293b' : '#ffffff';
$cardBorder  = $isDark ? '#334155' : '#e2e8f0';
$sidebarBg   = $isDark ? '#1e293b' : '#ffffff';
$tableHeadBg = $isDark ? '#1e3a5f' : '#f1f5f9';
$tableHeadTx = $isDark ? '#93c5fd' : '#334155';
$inputBg     = $isDark ? '#0f172a' : '#ffffff';
$inputColor  = $isDark ? '#e2e8f0' : '#1e293b';

// Role badge helper
$roleBadges = [
    'admin' => ['danger', __('role_admin')],
    'hr_manager' => ['primary', __('role_hr_manager')],
    'payroll' => ['success', __('role_payroll')],
    'hr_employee' => ['warning text-dark', __('role_hr_employee')],
    'viewer' => ['secondary', __('role_viewer')]
];
$userRole = $currentUser['role'] ?? 'viewer';
$roleBadgeInfo = $roleBadges[$userRole] ?? ['secondary', $userRole];
?>
<!DOCTYPE html>
<html lang="<?= $currentLang ?>" dir="<?= $isRtl ? 'rtl' : 'ltr' ?>" data-bs-theme="<?= $currentTheme ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= e(__('app_name')) ?> - <?= e(__('hr_system')) ?></title>

    <!-- Bootstrap 5 CSS (RTL / LTR) -->
    <?php if ($isRtl): ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css">
    <?php else: ?>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <?php endif; ?>

    <!-- Google Fonts (Cairo for AR & Plus Jakarta Sans for EN) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Font Awesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <style>
        :root {
            --hr-primary:      #1e3a8a;
            --hr-primary-dark: #0f172a;
            --hr-accent:       #0284c7;
            --hr-bg:           <?= $bgColor ?>;
            --hr-text:         <?= $textColor ?>;
            --hr-card-bg:      <?= $cardBg ?>;
            --hr-card-border:  <?= $cardBorder ?>;
        }

        /* Reduced global font size by one degree across entire application */
        html {
            font-size: 14.5px;
        }

        * { transition: background-color 0.2s ease, color 0.15s ease, border-color 0.15s ease; }

        body {
            font-family: <?= $isRtl ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif" ?>;
            background-color: var(--hr-bg);
            color: var(--hr-text);
            font-size: 0.93rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        /* ── Top Navbar ───────────────────────────────── */
        .navbar-brand {
            font-weight: 700;
            font-size: 1.15rem;
            letter-spacing: -0.2px;
        }

        /* ── Sidebar ──────────────────────────────────── */
        .sidebar-col .card {
            background-color: <?= $sidebarBg ?> !important;
            border-color: var(--hr-card-border) !important;
            border-radius: 14px;
        }
        .sidebar-nav .nav-link {
            font-weight: 600;
            font-size: 0.9rem;
            color: <?= $isDark ? '#94a3b8' : '#475569' ?>;
            padding: 0.6rem 0.9rem;
            border-radius: 8px;
            margin-bottom: 3px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s ease;
        }
        .sidebar-nav .nav-link i {
            width: 18px;
            text-align: center;
        }
        .sidebar-nav .nav-link:hover {
            background-color: <?= $isDark ? '#334155' : '#e2e8f0' ?>;
            color: #38bdf8;
        }
        .sidebar-nav .nav-link.active {
            background-color: var(--hr-primary);
            color: #ffffff !important;
            box-shadow: 0 3px 10px rgba(30, 58, 138, 0.35);
        }

        /* ── Sidebar Bottom Control Card (Single Line, Icons Only) ── */
        .sidebar-controls {
            margin-top: auto;
            padding-top: 12px;
            border-top: 1px solid var(--hr-card-border);
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .user-profile-badge {
            background-color: <?= $isDark ? '#0f172a' : '#f8fafc' ?>;
            border: 1px solid var(--hr-card-border);
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 0.82rem;
        }
        .sidebar-icon-row {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 10px;
        }
        .sidebar-icon-btn {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            border: 1px solid var(--hr-card-border);
            background-color: <?= $isDark ? '#0f172a' : '#f1f5f9' ?>;
            color: var(--hr-text);
            font-size: 1.1rem;
            transition: all 0.2s ease;
        }
        .sidebar-icon-btn:hover {
            background-color: <?= $isDark ? '#334155' : '#e2e8f0' ?>;
            border-color: #38bdf8;
            color: #38bdf8;
            transform: translateY(-2px);
            box-shadow: 0 3px 8px rgba(0,0,0,0.1);
        }
        .sidebar-icon-btn.btn-logout:hover {
            border-color: #ef4444;
            color: #ef4444;
            background-color: <?= $isDark ? '#450a0a' : '#fee2e2' ?>;
        }

        /* ── Cards & Tables Alignment ─────────────────── */
        .card {
            background-color: var(--hr-card-bg);
            border: 1px solid var(--hr-card-border);
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,<?= $isDark ? '0.35' : '0.05' ?>);
        }
        .card-header {
            background-color: var(--hr-card-bg);
            border-bottom: 1px solid var(--hr-card-border);
            padding: 0.85rem 1.15rem;
            font-weight: 700;
        }
        .table {
            color: var(--hr-text);
            text-align: start;
            font-size: 0.88rem;
        }
        .table thead th {
            background-color: <?= $tableHeadBg ?>;
            color: <?= $tableHeadTx ?>;
            font-weight: 700;
            border-bottom: 2px solid var(--hr-card-border);
            font-size: 0.85rem;
            text-align: start;
            padding: 0.65rem 0.85rem;
        }
        .table tbody td {
            text-align: start;
            vertical-align: middle;
            padding: 0.65rem 0.85rem;
        }
        .stat-card {
            border-radius: 12px;
            padding: 1rem 1.15rem;
            background-color: var(--hr-card-bg);
            border: 1px solid var(--hr-card-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            min-height: 110px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        }
        .stat-content {
            flex: 1;
            min-width: 0;
            overflow: hidden;
        }
        .stat-card h3,
        .stat-card h4,
        .stat-card .stat-value {
            font-size: 1.25rem !important;
            font-weight: 700;
            line-height: 1.25;
            letter-spacing: -0.3px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin: 0.25rem 0 !important;
        }
        .stat-card .stat-value-amount {
            font-size: 1.2rem !important;
            font-weight: 700;
            letter-spacing: -0.4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .stat-icon {
            width: 44px;
            height: 44px;
            flex-shrink: 0;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }

        /* ── Form Controls ────────────────────────────── */
        .form-control, .form-select {
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
            border-color: var(--hr-card-border);
            text-align: start;
            font-size: 0.88rem;
        }
        .form-control:focus, .form-select:focus {
            background-color: <?= $inputBg ?>;
            color: <?= $inputColor ?>;
            border-color: #38bdf8;
        }

        /* ── Print ────────────────────────────────────── */
        @media print {
            .no-print, .navbar, .sidebar-col { display: none !important; }
            .content-col { width: 100% !important; }
            body { background: #ffffff !important; }
        }
    </style>
</head>
<body>

<?php if (!$isEmbedded): ?>
<!-- ════════════════════════════════════════════
     Top Navigation Bar (Brand Only) - Standalone Only
════════════════════════════════════════════ -->
<header class="navbar navbar-expand-lg navbar-dark sticky-top no-print"
        style="background-color: <?= $isDark ? '#020617' : '#0f172a' ?> !important;">
    <div class="container-fluid px-4">
        <a class="navbar-brand d-flex align-items-center gap-2" href="index.php">
            <i class="fa-solid fa-truck text-info fs-4"></i>
            <span><?= e(__('app_name')) ?></span>
            <span class="badge bg-secondary" style="font-size:0.72rem;font-weight:normal;"><?= e(__('hr_system')) ?></span>
        </a>
    </div>
</header>
<?php endif; ?>

<div class="container-fluid <?= $isEmbedded ? 'p-0' : 'px-4 py-4' ?> flex-grow-1">
    <div class="row g-4 m-0">

        <?php if (!$isEmbedded): ?>
        <!-- ════════════════════════════════════════════
             Sidebar Navigation & Role-based Access (Standalone Only)
        ════════════════════════════════════════════ -->
        <aside class="col-lg-2 col-md-3 sidebar-col no-print">
            <div class="card p-3 shadow-sm border-0 sticky-top d-flex flex-column" style="top: 80px; min-height: calc(100vh - 110px);">
                
                <!-- Main Nav Links with Role-based Permission Checks -->
                <div class="sidebar-nav nav flex-column mb-3">

                    <a class="nav-link <?= in_array($currentPage, ['index.php', 'dashboard.php']) ? 'active' : '' ?>"
                       href="dashboard.php">
                        <i class="fa-solid fa-chart-pie"></i>
                        <span><?= e(__('nav_dashboard')) ?></span>
                    </a>

                    <?php if (hasPermission('drivers_view')): ?>
                        <a class="nav-link <?= $currentPage === 'offices.php' ? 'active' : '' ?>"
                           href="offices.php">
                            <i class="fa-solid fa-building"></i>
                            <span><?= e(__('nav_offices')) ?></span>
                        </a>

                        <a class="nav-link <?= str_starts_with($currentPage, 'driver') ? 'active' : '' ?>"
                           href="drivers.php">
                            <i class="fa-solid fa-id-card"></i>
                            <span><?= e(__('nav_drivers')) ?></span>
                        </a>
                    <?php endif; ?>

                    <?php if (hasPermission('routes_view')): ?>
                        <a class="nav-link <?= $currentPage === 'trip_rates.php' ? 'active' : '' ?>"
                           href="trip_rates.php">
                            <i class="fa-solid fa-map-location-dot"></i>
                            <span><?= e(__('nav_trip_rates')) ?></span>
                        </a>
                    <?php endif; ?>

                    <?php if (hasPermission('trips_view')): ?>
                        <a class="nav-link <?= in_array($currentPage, ['trips.php', 'trip_add.php', 'trip_edit.php']) ? 'active' : '' ?>"
                           href="trips.php">
                            <i class="fa-solid fa-clipboard-list"></i>
                            <span><?= e(__('nav_trips')) ?></span>
                        </a>
                    <?php endif; ?>

                    <!-- Trip Approvals: Only for roles with approval permission (admin, hr_manager) -->
                    <?php if (hasPermission('trips_approve')): ?>
                        <a class="nav-link <?= $currentPage === 'trip_approval.php' ? 'active' : '' ?>"
                           href="trip_approval.php">
                            <i class="fa-solid fa-circle-check"></i>
                            <span><?= e(__('nav_trip_approval')) ?></span>
                        </a>
                    <?php endif; ?>

                    <!-- Payroll: Only for roles with payroll permission (admin, hr_manager, payroll) -->
                    <?php if (hasPermission('payroll_view')): ?>
                        <a class="nav-link <?= str_starts_with($currentPage, 'payroll') ? 'active' : '' ?>"
                           href="payroll.php">
                            <i class="fa-solid fa-file-invoice-dollar"></i>
                            <span><?= e(__('nav_payroll')) ?></span>
                        </a>
                    <?php endif; ?>

                    <?php if (hasPermission('reports_view')): ?>
                        <a class="nav-link <?= $currentPage === 'reports.php' ? 'active' : '' ?>"
                           href="reports.php">
                            <i class="fa-solid fa-chart-line"></i>
                            <span><?= e(__('nav_reports')) ?></span>
                        </a>
                    <?php endif; ?>

                    <div class="border-top my-2 opacity-25"></div>
                    <div class="text-uppercase px-3 py-1 text-muted fw-bold" style="font-size:0.65rem; letter-spacing:0.5px;">
                        <?= $isRtl ? 'تطبيقات الموبايل' : 'Mobile Apps' ?>
                    </div>
                    <a class="nav-link" href="manager/" target="_blank">
                        <i class="fa-solid fa-mobile-screen-button text-primary"></i>
                        <span><?= e(__('nav_manager_portal')) ?></span>
                    </a>
                    <a class="nav-link" href="driver/" target="_blank">
                        <i class="fa-solid fa-id-badge text-success"></i>
                        <span><?= e(__('nav_driver_portal')) ?></span>
                    </a>

                </div>

                <!-- Bottom Sidebar Controls: User Info + (Theme, Language, Logout) on Single Line -->
                <div class="sidebar-controls">
                    
                    <!-- User Profile & Role Info -->
                    <div class="user-profile-badge d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-2 text-truncate">
                            <i class="fa-solid fa-user-circle text-primary fs-5"></i>
                            <div class="text-truncate">
                                <div class="fw-bold text-truncate" style="max-width: 90px;"><?= e($currentUser['username']) ?></div>
                            </div>
                        </div>
                        <span class="badge bg-<?= $roleBadgeInfo[0] ?> small font-monospace"><?= e($roleBadgeInfo[1]) ?></span>
                    </div>

                    <!-- Single Row Icons: Theme, Language, Logout -->
                    <div class="sidebar-icon-row">
                        
                        <!-- Theme Toggle (Icon Only) -->
                        <a href="<?= e($themeToggleUrl) ?>" class="sidebar-icon-btn" title="<?= e($isDark ? __('theme_light') : __('theme_dark')) ?>">
                            <?php if ($isDark): ?>
                                <i class="fa-solid fa-sun text-warning"></i>
                            <?php else: ?>
                                <i class="fa-solid fa-moon text-primary"></i>
                            <?php endif; ?>
                        </a>

                        <!-- Language Switcher (Icon Only) -->
                        <a href="<?= e($langToggleUrl) ?>" class="sidebar-icon-btn" title="<?= e(__('lang_switch')) ?>">
                            <i class="fa-solid fa-globe text-info"></i>
                        </a>

                        <!-- Logout (Icon Only) -->
                        <a href="logout.php" class="sidebar-icon-btn btn-logout" title="<?= e(__('logout')) ?>">
                            <i class="fa-solid fa-right-from-bracket text-danger"></i>
                        </a>

                    </div>

                </div>

            </div>
        </aside>
        <?php endif; ?>

        <!-- Main Content Area -->
        <main class="<?= $isEmbedded ? 'col-12 p-0' : 'col-lg-10 col-md-9' ?> content-col">

            <?php if ($isEmbedded): ?>
            <!-- ════════════════════════════════════════════
                 Embedded Internal Navigation Bar (No standalone sidebar)
            ════════════════════════════════════════════ -->
            <div class="card mb-3 border shadow-sm no-print" style="border-radius: 12px; background-color: <?= $cardBg ?>; border-color: <?= $cardBorder ?> !important;">
                <div class="card-body py-2 px-3">
                    <div class="d-flex align-items-center gap-2 overflow-auto" style="white-space: nowrap; scrollbar-width: thin;">
                        
                        <a href="dashboard.php?embedded=1" class="btn btn-sm <?= in_array($currentPage, ['index.php', 'dashboard.php']) ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                            <i class="fa-solid fa-chart-pie"></i>
                            <span><?= e(__('nav_dashboard')) ?></span>
                        </a>

                        <?php if (hasPermission('drivers_view')): ?>
                            <a href="offices.php?embedded=1" class="btn btn-sm <?= $currentPage === 'offices.php' ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                                <i class="fa-solid fa-building"></i>
                                <span><?= e(__('nav_offices')) ?></span>
                            </a>

                            <a href="drivers.php?embedded=1" class="btn btn-sm <?= (str_starts_with($currentPage, 'driver') && !in_array($currentPage, ['driver_portal', 'driver_timesheet'])) ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                                <i class="fa-solid fa-id-card"></i>
                                <span><?= e(__('nav_drivers')) ?></span>
                            </a>
                        <?php endif; ?>

                        <?php if (hasPermission('routes_view')): ?>
                            <a href="trip_rates.php?embedded=1" class="btn btn-sm <?= $currentPage === 'trip_rates.php' ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                                <i class="fa-solid fa-map-location-dot"></i>
                                <span><?= e(__('nav_trip_rates')) ?></span>
                            </a>
                        <?php endif; ?>

                        <?php if (hasPermission('trips_view')): ?>
                            <a href="trips.php?embedded=1" class="btn btn-sm <?= in_array($currentPage, ['trips.php', 'trip_add.php', 'trip_edit.php']) ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                                <i class="fa-solid fa-clipboard-list"></i>
                                <span><?= e(__('nav_trips')) ?></span>
                            </a>
                        <?php endif; ?>

                        <?php if (hasPermission('trips_approve')): ?>
                            <a href="trip_approval.php?embedded=1" class="btn btn-sm <?= $currentPage === 'trip_approval.php' ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                                <i class="fa-solid fa-circle-check"></i>
                                <span><?= e(__('nav_trip_approval')) ?></span>
                            </a>
                        <?php endif; ?>

                        <?php if (hasPermission('payroll_view')): ?>
                            <a href="payroll.php?embedded=1" class="btn btn-sm <?= str_starts_with($currentPage, 'payroll') ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                                <i class="fa-solid fa-file-invoice-dollar"></i>
                                <span><?= e(__('nav_payroll')) ?></span>
                            </a>
                        <?php endif; ?>

                        <?php if (hasPermission('reports_view')): ?>
                            <a href="reports.php?embedded=1" class="btn btn-sm <?= $currentPage === 'reports.php' ? 'btn-primary text-white shadow-sm' : ($isDark ? 'btn-outline-light text-slate-200' : 'btn-outline-secondary') ?> d-inline-flex align-items-center gap-2" style="border-radius: 8px; font-weight: 600; font-size: 0.85rem;">
                                <i class="fa-solid fa-chart-line"></i>
                                <span><?= e(__('nav_reports')) ?></span>
                            </a>
                        <?php endif; ?>

                    </div>
                </div>
            </div>

            <script>
                // ── SSO Session Persistence for embedded navigation ──────────────────
                // Store sso_user from URL into sessionStorage so it survives page navigation
                (function() {
                    var params = new URLSearchParams(window.location.search);
                    var ssoUser = params.get('sso_user');
                    if (ssoUser) {
                        try { sessionStorage.setItem('drv_sso_user', ssoUser); } catch(e) {}
                    }
                })();

                // Helper: append sso_user + embedded params to a URL string
                function appendSsoParams(href) {
                    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) {
                        return href;
                    }
                    var ssoUser = '';
                    try { ssoUser = sessionStorage.getItem('drv_sso_user') || ''; } catch(e) {}
                    var separator = href.includes('?') ? '&' : '?';
                    if (!href.includes('embedded=')) {
                        href = href + separator + 'embedded=1';
                        separator = '&';
                    }
                    if (ssoUser && !href.includes('sso_user=')) {
                        href = href + separator + 'sso_user=' + encodeURIComponent(ssoUser);
                    }
                    return href;
                }

                document.addEventListener('DOMContentLoaded', function() {
                    // Re-inject sso_user + embedded into all internal links
                    document.querySelectorAll('a[href]:not([target="_blank"])').forEach(function(a) {
                        var href = a.getAttribute('href');
                        var updated = appendSsoParams(href);
                        if (updated !== href) a.setAttribute('href', updated);
                    });

                    // Auto-attach embedded + sso_user to forms
                    document.querySelectorAll('form').forEach(function(form) {
                        if (!form.querySelector('input[name="embedded"]')) {
                            var h = document.createElement('input');
                            h.type = 'hidden'; h.name = 'embedded'; h.value = '1';
                            form.appendChild(h);
                        }
                        var ssoUser = '';
                        try { ssoUser = sessionStorage.getItem('drv_sso_user') || ''; } catch(e) {}
                        if (ssoUser && !form.querySelector('input[name="sso_user"]')) {
                            var hs = document.createElement('input');
                            hs.type = 'hidden'; hs.name = 'sso_user'; hs.value = ssoUser;
                            form.appendChild(hs);
                        }
                    });

                    // Notify parent host of current page path
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({
                            type: 'HR_DRIVERS_NAV',
                            page: '<?= $currentPage ?>',
                            query: window.location.search
                        }, '*');
                    }
                });

                // Listen for parent theme or language switch
                window.addEventListener('message', function(event) {
                    if (!event.data) return;
                    if (event.data.type === 'HR_SET_THEME') {
                        document.documentElement.setAttribute('data-bs-theme', event.data.theme);
                    }
                    // Parent can also push sso_user refresh
                    if (event.data.type === 'HR_SET_SSO' && event.data.sso_user) {
                        try { sessionStorage.setItem('drv_sso_user', event.data.sso_user); } catch(e) {}
                    }
                });
            </script>
            <?php endif; ?>
