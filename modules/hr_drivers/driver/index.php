<?php
/**
 * Driver Mobile App – Home Dashboard (Read-Only)
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$driverId = (int)$driver['driver_id'];
$isAr = isRtl();

// Current month & year
$month = (int)date('m');
$year  = (int)date('Y');

// Total trips this month for this driver
$monthStmt = $pdo->prepare("
    SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN total_amount ELSE 0 END), 0) as approved_total
    FROM drv_driver_trips
    WHERE driver_id = ? 
      AND MONTH(trip_date) = ? 
      AND YEAR(trip_date) = ?
");
$monthStmt->execute([$driverId, $month, $year]);
$stats = $monthStmt->fetch() ?: ['total_count' => 0, 'approved_count' => 0, 'pending_count' => 0, 'approved_total' => 0];

$totalCount    = (int)$stats['total_count'];
$approvedCount = (int)$stats['approved_count'];
$pendingCount  = (int)$stats['pending_count'];
$approvedTotal = (float)$stats['approved_total'];

// Recent 5 trips for this driver
$recentStmt = $pdo->prepare("
    SELECT dt.*, tr.name as route_name, tt.name_ar as type_ar, tt.name_en as type_en
    FROM drv_driver_trips dt
    LEFT JOIN drv_trip_routes tr ON dt.route_id = tr.id
    LEFT JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
    WHERE dt.driver_id = ?
    ORDER BY dt.trip_date DESC, dt.departure_time DESC
    LIMIT 5
");
$recentStmt->execute([$driverId]);
$recentTrips = $recentStmt->fetchAll();

// Month name
$months = $isAr
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];
$currentMonthName = $months[$month - 1];
?>

<!-- Driver Profile Header Card -->
<div class="mobile-card mb-3" style="background: var(--primary-gradient); color: #ffffff; border: none;">
    <div class="d-flex justify-content-between align-items-start mb-2">
        <div class="d-flex align-items-center gap-3">
            <div class="rounded-circle bg-white text-success d-flex align-items-center justify-content-center flex-shrink-0" style="width: 52px; height: 52px; font-size: 1.5rem;">
                <i class="fa-solid fa-user"></i>
            </div>
            <div>
                <div class="fw-bold fs-5 lh-sm"><?= e($driver['full_name']) ?></div>
                <div class="small opacity-75 mt-1">
                    <i class="fa-solid fa-id-card me-1"></i>
                    <?= $isAr ? 'رقم الباج:' : 'Badge No:' ?> 
                    <span class="fw-bold font-monospace"><?= e($driver['driver_number']) ?></span>
                </div>
                <div class="small opacity-75">
                    <i class="fa-solid fa-building me-1"></i>
                    <?= e($officeName) ?>
                </div>
            </div>
        </div>
        <div>
            <span class="badge bg-white text-success fw-bold px-2 py-1" style="font-size: 0.72rem;">
                <i class="fa-solid fa-eye me-1"></i><?= $isAr ? 'عرض فقط' : 'Read-Only' ?>
            </span>
        </div>
    </div>
</div>

<!-- Pending Approval Alert (if any) -->
<?php if ($pendingCount > 0): ?>
<div class="alert alert-warning border-warning-subtle d-flex align-items-center gap-3 py-2 px-3 rounded-3 mb-3" role="alert">
    <i class="fa-solid fa-clock-rotate-left fs-4 text-warning flex-shrink-0"></i>
    <div class="flex-grow-1 small">
        <div class="fw-bold"><?= $isAr ? 'رحلات بانتظار الاعتماد' : 'Trips Pending Approval' ?></div>
        <div><?= $isAr ? "لديك {$pendingCount} رحلة بانتظار اعتماد مدير المكتب." : "You have {$pendingCount} trip(s) awaiting office manager approval." ?></div>
    </div>
    <a href="trips.php?status=pending" class="btn btn-sm btn-warning text-dark fw-bold px-2 py-1 text-nowrap" style="font-size: 0.75rem;">
        <?= $isAr ? 'عرض' : 'View' ?>
    </a>
</div>
<?php endif; ?>

<!-- Monthly Stats (2x2 Grid) -->
<div class="row g-3 mb-3">
    <div class="col-6">
        <div class="mobile-card text-center h-100 mb-0">
            <div class="fs-1 fw-black text-primary"><?= $approvedCount ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? 'رحلة معتمدة هذا الشهر' : 'Approved This Month' ?></div>
            <div class="text-muted" style="font-size: 0.7rem;"><?= $currentMonthName ?> <?= $year ?></div>
        </div>
    </div>
    <div class="col-6">
        <div class="mobile-card text-center h-100 mb-0">
            <div class="fs-1 fw-black <?= $pendingCount > 0 ? 'text-warning' : 'text-success' ?>"><?= $pendingCount ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? 'بانتظار الاعتماد' : 'Pending Approval' ?></div>
            <div class="text-muted" style="font-size: 0.7rem;"><?= $isAr ? 'قيد المراجعة' : 'Under Review' ?></div>
        </div>
    </div>
    <div class="col-6">
        <div class="mobile-card text-center h-100 mb-0">
            <div class="fs-4 fw-bold text-success" style="font-size: clamp(0.85rem,3.5vw,1.15rem) !important;"><?= number_format($approvedTotal) ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? 'مستحقات الرحلات (د.ع)' : 'Trips Earnings (IQD)' ?></div>
            <div class="text-muted" style="font-size: 0.7rem;"><?= $isAr ? 'المعتمدة فقط' : 'Approved Only' ?></div>
        </div>
    </div>
    <div class="col-6">
        <div class="mobile-card text-center h-100 mb-0">
            <div class="fs-1 fw-black text-secondary"><?= $totalCount ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? 'إجمالي رحلات الشهر' : 'Total Month Trips' ?></div>
            <div class="text-muted" style="font-size: 0.7rem;"><?= $currentMonthName ?> <?= $year ?></div>
        </div>
    </div>
</div>

<!-- Quick Navigation Cards -->
<div class="mobile-card mb-3">
    <h6 class="fw-bold mb-3"><i class="fa-solid fa-compass text-primary me-2"></i><?= $isAr ? 'التنقل السريع' : 'Quick Access' ?></h6>
    <div class="row g-2">
        <div class="col-6">
            <a href="trips.php" class="btn btn-outline-primary w-100 py-3 text-center d-flex flex-column align-items-center justify-content-center text-decoration-none">
                <i class="fa-solid fa-route fs-4 mb-1"></i>
                <span class="fw-bold small"><?= $isAr ? 'جدول الرحلات' : 'My Trips' ?></span>
                <span class="text-muted" style="font-size: 0.7rem;"><?= $isAr ? 'المعتمدة والمعلقة' : 'Approved & Pending' ?></span>
            </a>
        </div>
        <div class="col-6">
            <a href="timesheet.php" class="btn btn-outline-primary w-100 py-3 text-center d-flex flex-column align-items-center justify-content-center text-decoration-none">
                <i class="fa-solid fa-calendar-check fs-4 mb-1"></i>
                <span class="fw-bold small"><?= $isAr ? 'التايمشيت الشهري' : 'Timesheet' ?></span>
                <span class="text-muted" style="font-size: 0.7rem;"><?= $isAr ? 'عرض وطباعة' : 'View & Print' ?></span>
            </a>
        </div>
    </div>
</div>

<!-- Recent Trips -->
<div class="mobile-card mb-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0">
            <i class="fa-solid fa-clock-rotate-left text-secondary me-2"></i>
            <?= $isAr ? 'آخر الرحلات' : 'Recent Trips' ?>
        </h6>
        <a href="trips.php" class="small text-primary text-decoration-none fw-semibold">
            <?= $isAr ? 'عرض الكل' : 'View All' ?> &rarr;
        </a>
    </div>

    <?php if (empty($recentTrips)): ?>
        <div class="text-center text-muted py-4">
            <i class="fa-solid fa-route fa-2x mb-2 text-muted opacity-50"></i>
            <div><?= $isAr ? 'لا توجد رحلات مسجلة لك حالياً' : 'No trips recorded yet' ?></div>
        </div>
    <?php else: ?>
        <div class="d-flex flex-column gap-2">
            <?php foreach ($recentTrips as $t): ?>
                <div class="p-2 border rounded-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-semibold small">
                            <?= e($t['departure_city']) ?> &rarr; <?= e($t['arrival_city']) ?>
                        </div>
                        <div class="text-muted" style="font-size: 0.72rem;">
                            <i class="fa-regular fa-calendar me-1"></i><?= e(date('d/m/Y', strtotime($t['trip_date']))) ?>
                            <?php if (!empty($t['departure_time'])): ?>
                                &bull; <i class="fa-regular fa-clock me-1"></i><?= e(substr($t['departure_time'], 0, 5)) ?>
                            <?php endif; ?>
                            &bull; <?= $t['trip_count'] ?> <?= $isAr ? 'رحلة' : 'trips' ?>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success small"><?= number_format((float)$t['total_amount']) ?> <span style="font-size:0.68rem;"><?= $isAr ? 'د.ع' : 'IQD' ?></span></div>
                        <div class="mt-1">
                            <?= getTripStatusBadge($t['status']) ?>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
