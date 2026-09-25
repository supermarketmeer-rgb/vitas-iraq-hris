<?php
/**
 * Office Manager Mobile App – Dashboard (Home)
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$officeId = $manager['office_id'];

// Drivers in this office
$driversStmt = $pdo->prepare("
    SELECT d.*, o.name_ar as office_name_ar
    FROM drv_drivers d
    JOIN drv_offices o ON d.office_id = o.id
    WHERE d.deleted_at IS NULL AND d.office_id = ?
    ORDER BY d.status ASC, d.full_name ASC
");
$driversStmt->execute([$officeId]);
$drivers = $driversStmt->fetchAll();
$activeCount = 0;
foreach ($drivers as $d) { if ($d['status'] === 'active') $activeCount++; }

// Pending trips this office
$pendingStmt = $pdo->prepare("
    SELECT COUNT(*) as cnt FROM drv_driver_trips
    WHERE office_id = ? AND status = 'pending'
");
$pendingStmt->execute([$officeId]);
$pendingCount = (int)$pendingStmt->fetchColumn();

// This month approved trips
$month = (int)date('m');
$year  = (int)date('Y');
$monthStmt = $pdo->prepare("
    SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as total
    FROM drv_driver_trips
    WHERE office_id = ? AND status = 'approved'
      AND MONTH(trip_date) = ? AND YEAR(trip_date) = ?
");
$monthStmt->execute([$officeId, $month, $year]);
$monthRow = $monthStmt->fetch();
$monthTripsCount = (int)$monthRow['cnt'];
$monthTripsTotal = (float)$monthRow['total'];

// Recent trips (last 5)
$recentStmt = $pdo->prepare("
    SELECT dt.*, d.full_name as driver_name, d.driver_number,
           tr.name as route_name
    FROM drv_driver_trips dt
    JOIN drv_drivers d ON dt.driver_id = d.id
    JOIN drv_trip_routes tr ON dt.route_id = tr.id
    WHERE dt.office_id = ?
    ORDER BY dt.created_at DESC
    LIMIT 5
");
$recentStmt->execute([$officeId]);
$recentTrips = $recentStmt->fetchAll();

$isAr = isRtl();
?>

<!-- Office Summary Cards -->
<div class="row g-3 mb-4">
    <div class="col-6">
        <div class="mobile-card text-center">
            <div class="fs-1 fw-black text-primary"><?= $activeCount ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? 'سائق نشط' : 'Active Drivers' ?></div>
        </div>
    </div>
    <div class="col-6">
        <div class="mobile-card text-center">
            <div class="fs-1 fw-black <?= $pendingCount > 0 ? 'text-warning' : 'text-success' ?>"><?= $pendingCount ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? 'رحلة بانتظار الاعتماد' : 'Trips Pending' ?></div>
        </div>
    </div>
    <div class="col-6">
        <div class="mobile-card text-center">
            <div class="fs-4 fw-bold text-success" style="font-size: clamp(0.85rem,3.5vw,1.15rem) !important;"><?= number_format($monthTripsTotal) ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? ('قيمة رحلات ' . $year . '/' . $month) : ('Trips Value ' . $month . '/' . $year) ?></div>
        </div>
    </div>
    <div class="col-6">
        <div class="mobile-card text-center">
            <div class="fs-1 fw-black text-info"><?= $monthTripsCount ?></div>
            <div class="small text-muted fw-semibold"><?= $isAr ? 'رحلة معتمدة الشهر' : 'Approved This Month' ?></div>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<div class="mobile-card mb-3">
    <h6 class="fw-bold mb-3"><i class="fa-solid fa-bolt text-warning me-2"></i><?= $isAr ? 'إجراءات سريعة' : 'Quick Actions' ?></h6>
    <div class="d-grid gap-2">
        <a href="trip_assign.php" class="btn btn-primary fw-bold py-3">
            <i class="fa-solid fa-route me-2"></i>
            <?= $isAr ? 'تعيين رحلة جديدة للسائق' : 'Assign New Trip to Driver' ?>
        </a>
        <a href="timesheet.php" class="btn btn-outline-primary fw-bold py-2">
            <i class="fa-solid fa-calendar-days me-2"></i>
            <?= $isAr ? 'عرض وطباعة التايمشيت' : 'View & Print Timesheet' ?>
        </a>
    </div>
</div>

<!-- Drivers List -->
<div class="mobile-card mb-3">
    <h6 class="fw-bold mb-3"><i class="fa-solid fa-users text-primary me-2"></i>
        <?= $isAr ? 'سائقو المكتب' : 'Office Drivers' ?> 
        <span class="badge bg-primary ms-1"><?= count($drivers) ?></span>
    </h6>
    <?php if (empty($drivers)): ?>
        <p class="text-muted text-center py-3"><?= $isAr ? 'لا يوجد سائقون مسجلون في هذا المكتب' : 'No drivers registered for this office' ?></p>
    <?php else: ?>
        <?php foreach ($drivers as $d): ?>
            <div class="d-flex align-items-center gap-3 py-2 border-bottom">
                <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                     style="width:40px;height:40px;background:<?= $d['status'] === 'active' ? '#dbeafe' : '#f1f5f9' ?>;">
                    <i class="fa-solid fa-id-badge" style="color:<?= $d['status'] === 'active' ? '#2563eb' : '#94a3b8' ?>;"></i>
                </div>
                <div class="flex-grow-1 min-width-0">
                    <div class="fw-semibold text-truncate"><?= e($d['full_name']) ?></div>
                    <div class="small text-muted"><?= e($d['driver_number']) ?> &bull; <?= $isAr ? $d['license_type'] : $d['license_type'] ?></div>
                </div>
                <div class="flex-shrink-0">
                    <?= getDriverStatusBadge($d['status']) ?>
                </div>
                <div>
                    <a href="trip_assign.php?driver_id=<?= $d['id'] ?>" class="btn btn-sm btn-outline-primary rounded-pill px-2 py-1" style="font-size:0.75rem;">
                        <i class="fa-solid fa-plus"></i>
                    </a>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>

<!-- Recent Trips -->
<?php if (!empty($recentTrips)): ?>
<div class="mobile-card">
    <h6 class="fw-bold mb-3"><i class="fa-solid fa-clock-rotate-left text-secondary me-2"></i>
        <?= $isAr ? 'آخر الرحلات المسجلة' : 'Recent Trips' ?>
    </h6>
    <?php foreach ($recentTrips as $t): ?>
        <div class="d-flex justify-content-between align-items-start py-2 border-bottom">
            <div>
                <div class="fw-semibold small"><?= e($t['driver_name']) ?></div>
                <div class="text-muted" style="font-size:0.78rem;"><?= e($t['route_name']) ?></div>
                <div class="text-muted" style="font-size:0.78rem;"><?= e($t['trip_date']) ?></div>
            </div>
            <div class="text-end">
                <?= getTripStatusBadge($t['status']) ?>
                <div class="small fw-bold text-success mt-1"><?= formatMoney($t['total_amount']) ?></div>
            </div>
        </div>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
