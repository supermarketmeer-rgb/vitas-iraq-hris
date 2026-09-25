<?php
/**
 * Dashboard View (لوحة التحكم)
 * Strict bilingual support (100% Arabic or 100% English)
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('trips_view');

$pdo = getDBConnection();
$isAr = isRtl();

// Fetch summary metrics
$totalDrivers = (int)$pdo->query("SELECT COUNT(*) FROM drv_drivers WHERE deleted_at IS NULL")->fetchColumn();
$activeDrivers = (int)$pdo->query("SELECT COUNT(*) FROM drv_drivers WHERE deleted_at IS NULL AND status = 'active'")->fetchColumn();
$totalOffices = (int)$pdo->query("SELECT COUNT(*) FROM drv_offices WHERE is_active = 1")->fetchColumn();

$today = date('Y-m-d');
$currentMonth = (int)date('m');
$currentYear = (int)date('Y');

$tripsToday = (int)$pdo->query("SELECT COUNT(*) FROM drv_driver_trips WHERE trip_date = '$today' AND status != 'cancelled'")->fetchColumn();
$pendingTrips = (int)$pdo->query("SELECT COUNT(*) FROM drv_driver_trips WHERE status = 'pending'")->fetchColumn();
$approvedTripsThisMonth = (int)$pdo->query("SELECT COUNT(*) FROM drv_driver_trips WHERE status = 'approved' AND MONTH(trip_date) = $currentMonth AND YEAR(trip_date) = $currentYear")->fetchColumn();

$monthTripsValue = (float)$pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM drv_driver_trips WHERE status = 'approved' AND MONTH(trip_date) = $currentMonth AND YEAR(trip_date) = $currentYear")->fetchColumn();
$monthPayrollTotal = (float)$pdo->query("SELECT COALESCE(SUM(net_salary), 0) FROM drv_payrolls WHERE month = $currentMonth AND year = $currentYear")->fetchColumn();

// Trips by Office
$tripsByOffice = $pdo->query("
    SELECT o.name_ar, o.name_en, COUNT(dt.id) as trip_count, COALESCE(SUM(dt.total_amount), 0) as total_value
    FROM drv_offices o
    LEFT JOIN drv_driver_trips dt ON o.id = dt.office_id AND dt.status = 'approved'
    WHERE o.is_active = 1
    GROUP BY o.id, o.name_ar, o.name_en
    ORDER BY trip_count DESC
")->fetchAll();

// Top Drivers this month
$topDrivers = $pdo->query("
    SELECT d.id, d.full_name, d.full_name_en, d.driver_number, o.name_ar as office_name_ar, o.name_en as office_name_en, COUNT(dt.id) as trip_count, COALESCE(SUM(dt.total_amount), 0) as total_earnings
    FROM drv_drivers d
    JOIN drv_offices o ON d.office_id = o.id
    LEFT JOIN drv_driver_trips dt ON d.id = dt.driver_id AND dt.status = 'approved' AND MONTH(dt.trip_date) = $currentMonth AND YEAR(dt.trip_date) = $currentYear
    WHERE d.deleted_at IS NULL
    GROUP BY d.id, d.full_name, d.full_name_en, d.driver_number, o.name_ar, o.name_en
    ORDER BY trip_count DESC
    LIMIT 5
")->fetchAll();

// Recent Pending Trips awaiting approval
$recentPending = $pdo->query("
    SELECT dt.*, d.full_name as driver_name_ar, d.full_name_en as driver_name_en, 
           o.name_ar as office_name_ar, o.name_en as office_name_en, r.name as route_name
    FROM drv_driver_trips dt
    JOIN drv_drivers d ON dt.driver_id = d.id
    JOIN drv_offices o ON dt.office_id = o.id
    JOIN drv_trip_routes r ON dt.route_id = r.id
    WHERE dt.status = 'pending'
    ORDER BY dt.trip_date DESC, dt.created_at DESC
    LIMIT 6
")->fetchAll();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1"><?= e(__('dashboard_title')) ?></h3>
        <p class="text-muted mb-0"><?= e(__('dashboard_desc')) ?><?= date('m/Y') ?></p>
    </div>
    <div class="d-flex gap-2">
        <a href="trip_add.php" class="btn btn-primary d-flex align-items-center gap-2">
            <i class="fa-solid fa-plus"></i>
            <span><?= e(__('new_trip_timesheet')) ?></span>
        </a>
        <a href="trip_approval.php" class="btn btn-warning text-dark d-flex align-items-center gap-2">
            <i class="fa-solid fa-stamp"></i>
            <span><?= e(__('review_pending_trips')) ?> (<?= $pendingTrips ?>)</span>
        </a>
    </div>
</div>

<!-- Key Stat Cards -->
<div class="row g-3 mb-4">
    <div class="col-xl-3 col-md-6">
        <div class="stat-card">
            <div class="stat-content">
                <span class="text-muted small fw-semibold d-block text-truncate"><?= e(__('total_drivers')) ?></span>
                <h3 class="stat-value fw-bold my-1"><?= number_format($totalDrivers) ?></h3>
                <span class="badge bg-success-subtle text-success"><?= $activeDrivers ?> <?= e(__('active_drivers_count')) ?></span>
            </div>
            <div class="stat-icon bg-primary-subtle text-primary">
                <i class="fa-solid fa-id-card"></i>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6">
        <div class="stat-card">
            <div class="stat-content">
                <span class="text-muted small fw-semibold d-block text-truncate"><?= e(__('pending_trips')) ?></span>
                <h3 class="stat-value fw-bold my-1 text-warning"><?= number_format($pendingTrips) ?></h3>
                <span class="text-muted small d-block text-truncate"><?= e(__('pending_trips_desc')) ?></span>
            </div>
            <div class="stat-icon bg-warning-subtle text-warning">
                <i class="fa-solid fa-hourglass-half"></i>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6">
        <div class="stat-card">
            <div class="stat-content">
                <span class="text-muted small fw-semibold d-block text-truncate"><?= e(__('month_trips_value')) ?></span>
                <h3 class="stat-value stat-value-amount fw-bold my-1 text-success" title="<?= formatMoney($monthTripsValue) ?>"><?= formatMoney($monthTripsValue) ?></h3>
                <span class="badge bg-info-subtle text-info"><?= $approvedTripsThisMonth ?> <?= e(__('month_trips_approved')) ?></span>
            </div>
            <div class="stat-icon bg-success-subtle text-success">
                <i class="fa-solid fa-money-bill-wave"></i>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6">
        <div class="stat-card">
            <div class="stat-content">
                <span class="text-muted small fw-semibold d-block text-truncate"><?= e(__('month_payroll_total')) ?></span>
                <h3 class="stat-value stat-value-amount fw-bold my-1 text-primary" title="<?= formatMoney($monthPayrollTotal) ?>"><?= formatMoney($monthPayrollTotal) ?></h3>
                <span class="text-muted small d-block text-truncate"><?= e(__('month_payroll_desc')) ?></span>
            </div>
            <div class="stat-icon bg-primary-subtle text-primary">
                <i class="fa-solid fa-file-invoice-dollar"></i>
            </div>
        </div>
    </div>
</div>

<div class="row g-4 mb-4">
    <!-- Pending Approval List -->
    <div class="col-lg-8">
        <div class="card h-100 shadow-sm">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span><i class="fa-solid fa-clipboard-check text-warning me-2"></i><?= e(__('recent_pending_trips')) ?></span>
                <a href="trip_approval.php" class="btn btn-sm btn-outline-primary"><?= e(__('action_view_all')) ?></a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th><?= e(__('trip_number')) ?></th>
                                <th><?= e(__('trip_date')) ?></th>
                                <th><?= e(__('driver_name')) ?></th>
                                <th><?= e(__('route')) ?></th>
                                <th><?= e(__('total_amount')) ?></th>
                                <th><?= e(__('status')) ?></th>
                                <th><?= e(__('action_actions')) ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($recentPending)): ?>
                                <tr>
                                    <td colspan="7" class="text-center py-4 text-muted">
                                        <i class="fa-solid fa-check-circle text-success fs-3 mb-2 d-block"></i>
                                        <?= e(__('no_pending_trips')) ?>
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($recentPending as $trip): 
                                    $driverName = $isAr ? $trip['driver_name_ar'] : ($trip['driver_name_en'] ?: $trip['driver_name_ar']);
                                ?>
                                    <tr>
                                        <td><span class="fw-semibold text-primary font-monospace"><?= e($trip['trip_number']) ?></span></td>
                                        <td><?= formatDate($trip['trip_date']) ?></td>
                                        <td class="fw-bold"><?= e($driverName) ?></td>
                                        <td>
                                            <span class="d-block small fw-semibold"><?= e($trip['departure_city']) ?> &rarr; <?= e($trip['arrival_city']) ?></span>
                                            <span class="text-muted small"><?= e($trip['route_name']) ?></span>
                                        </td>
                                        <td class="fw-bold"><?= formatMoney($trip['total_amount']) ?></td>
                                        <td><?= getTripStatusBadge($trip['status']) ?></td>
                                        <td>
                                            <a href="trip_approval.php?id=<?= $trip['id'] ?>" class="btn btn-sm btn-outline-success">
                                                <?= e(__('action_review')) ?>
                                            </a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Trips by Office Breakdown -->
    <div class="col-lg-4">
        <div class="card h-100 shadow-sm">
            <div class="card-header">
                <i class="fa-solid fa-building me-2 text-primary"></i><?= e(__('trips_by_office')) ?>
            </div>
            <div class="card-body">
                <ul class="list-group list-group-flush">
                    <?php foreach ($tripsByOffice as $office): 
                        $officeName = $isAr ? $office['name_ar'] : $office['name_en'];
                    ?>
                        <li class="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                            <div>
                                <h6 class="mb-0 fw-bold"><?= e($officeName) ?></h6>
                                <span class="small text-muted"><?= formatMoney($office['total_value']) ?></span>
                            </div>
                            <span class="badge bg-primary rounded-pill fs-6"><?= $office['trip_count'] ?> <?= $isAr ? 'رحلة' : 'Trips' ?></span>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Top Drivers This Month -->
<div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="fa-solid fa-trophy text-warning me-2"></i><?= e(__('top_drivers_month')) ?></span>
        <a href="reports.php?type=drivers_summary" class="btn btn-sm btn-outline-secondary"><?= $isAr ? 'تقرير نشاط السائقين' : 'Drivers Summary Report' ?></a>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th><?= e(__('driver_name')) ?></th>
                        <th><?= e(__('driver_number')) ?></th>
                        <th><?= e(__('office')) ?></th>
                        <th><?= e(__('month_trips_approved')) ?></th>
                        <th><?= e(__('month_trips_value')) ?></th>
                        <th><?= e(__('action_actions')) ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($topDrivers as $d): 
                        $driverName = $isAr ? $d['full_name'] : ($d['full_name_en'] ?: $d['full_name']);
                        $officeName = $isAr ? $d['office_name_ar'] : $d['office_name_en'];
                    ?>
                        <tr>
                            <td class="fw-bold"><?= e($driverName) ?></td>
                            <td><span class="badge bg-light text-dark border font-monospace"><?= e($d['driver_number']) ?></span></td>
                            <td><?= e($officeName) ?></td>
                            <td><span class="badge bg-success fs-6"><?= $d['trip_count'] ?></span></td>
                            <td class="fw-bold text-success"><?= formatMoney($d['total_earnings']) ?></td>
                            <td>
                                <a href="driver_view.php?id=<?= $d['id'] ?>" class="btn btn-sm btn-outline-primary">
                                    <?= e(__('action_view')) ?>
                                </a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
