<?php
/**
 * Driver Detailed Profile, Trips History, and Payroll Summary
 * Strict bilingual support, removed mother_name, added full_name_en
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('drivers_view');

$pdo = getDBConnection();
$id = (int)($_GET['id'] ?? 0);
$isAr = isRtl();

$stmt = $pdo->prepare("
    SELECT d.*, o.name_ar as office_name_ar, o.name_en as office_name_en, o.city as office_city 
    FROM drv_drivers d 
    JOIN drv_offices o ON d.office_id = o.id 
    WHERE d.id = ? AND d.deleted_at IS NULL
");
$stmt->execute([$id]);
$driver = $stmt->fetch();

if (!$driver) {
    echo '<div class="card shadow-sm p-4 text-center my-4 border-warning">';
    echo '<div class="text-warning mb-3"><i class="fa-solid fa-triangle-exclamation fa-3x"></i></div>';
    echo '<h5 class="fw-bold">' . e($isAr ? 'السائق المطلوب غير متوفر.' : 'The requested driver was not found.') . '</h5>';
    echo '<div class="mt-3"><a href="drivers.php" class="btn btn-primary"><i class="fa-solid fa-arrow-left me-1"></i> ' . e(__('nav_drivers')) . '</a></div>';
    echo '</div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

$displayName = $isAr ? $driver['full_name'] : ($driver['full_name_en'] ?: $driver['full_name']);
$officeName = $isAr ? $driver['office_name_ar'] : $driver['office_name_en'];

// Fetch trips history
$tripsStmt = $pdo->prepare("
    SELECT dt.*, r.name as route_name, tt.name_ar as trip_type_name_ar, tt.name_en as trip_type_name_en
    FROM drv_driver_trips dt
    JOIN drv_trip_routes r ON dt.route_id = r.id
    JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
    WHERE dt.driver_id = ?
    ORDER BY dt.trip_date DESC, dt.departure_time DESC
    LIMIT 20
");
$tripsStmt->execute([$id]);
$trips = $tripsStmt->fetchAll();

// Fetch payroll history
$payrollStmt = $pdo->prepare("
    SELECT * FROM drv_payrolls
    WHERE driver_id = ?
    ORDER BY year DESC, month DESC
");
$payrollStmt->execute([$id]);
$payrolls = $payrollStmt->fetchAll();

// Aggregate stats
$totalTrips = (int)$pdo->query("SELECT COUNT(*) FROM drv_driver_trips WHERE driver_id = $id AND status = 'approved'")->fetchColumn();
$totalEarnings = (float)$pdo->query("SELECT COALESCE(SUM(total_amount), 0) FROM drv_driver_trips WHERE driver_id = $id AND status = 'approved'")->fetchColumn();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <div class="d-flex align-items-center gap-2 mb-1">
            <h3 class="fw-bold mb-0"><?= e($displayName) ?></h3>
            <span class="badge bg-primary fs-6"><?= e($driver['employee_code']) ?></span>
            <?= getDriverStatusBadge($driver['status']) ?>
        </div>
        <p class="text-muted mb-0">
            <?= e(__('office')) ?>: <?= e($officeName) ?> &bull; 
            <?= e(__('phone')) ?>: <?= e($driver['phone']) ?> &bull; 
            <?= e(__('driver_number')) ?>: <?= e($driver['driver_number']) ?>
        </p>
    </div>
    <div class="d-flex gap-2">
        <a href="drivers.php" class="btn btn-outline-secondary">
            <i class="fa-solid <?= $isAr ? 'fa-arrow-right me-1' : 'fa-arrow-left me-1' ?>"></i> <?= e(__('nav_drivers')) ?>
        </a>
        <?php if (hasPermission('drivers_manage')): ?>
            <a href="driver_edit.php?id=<?= $id ?>" class="btn btn-primary">
                <i class="fa-solid fa-pen-to-square me-1"></i> <?= e(__('driver_edit')) ?>
            </a>
        <?php endif; ?>
    </div>
</div>

<div class="row g-4 mb-4">
    <!-- Driver Info Card -->
    <div class="col-lg-4">
        <div class="card mb-4 shadow-sm">
            <div class="card-header bg-primary text-white fw-bold">
                <i class="fa-solid fa-id-card me-2"></i> <?= e(__('personal_info')) ?>
            </div>
            <div class="card-body">
                <ul class="list-group list-group-flush small">
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('driver_name_ar')) ?>:</span>
                        <span class="fw-bold"><?= e($driver['full_name']) ?></span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('driver_name_en')) ?>:</span>
                        <span class="fw-bold"><?= e($driver['full_name_en'] ?: '-') ?></span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('father_name')) ?>:</span>
                        <span class="fw-bold"><?= e($driver['father_name'] ?: '-') ?></span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('national_id')) ?>:</span>
                        <span class="fw-bold"><?= e($driver['national_id']) ?></span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('license_number')) ?>:</span>
                        <span class="fw-bold"><?= e($driver['license_number']) ?> (<?= e($driver['license_type']) ?>)</span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('license_expiry_date')) ?>:</span>
                        <span><?= formatDate($driver['license_issue_date']) ?> &rarr; <?= formatDate($driver['license_expiry_date']) ?></span>
                    </li>
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('hire_date')) ?>:</span>
                        <span><?= formatDate($driver['hire_date']) ?></span>
                    </li>
                    <?php if (!empty($driver['termination_date'])): ?>
                    <li class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted"><?= e(__('exit_date')) ?>:</span>
                        <span class="text-danger fw-bold"><?= formatDate($driver['termination_date']) ?></span>
                    </li>
                    <?php endif; ?>
                </ul>

                <hr>

                <h6 class="fw-bold text-dark mb-2"><i class="fa-solid fa-coins text-warning me-2"></i><?= e(__('salary_info')) ?></h6>
                <div class="bg-light p-3 rounded-3">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted small"><?= e(__('base_salary')) ?>:</span>
                        <span class="fw-bold"><?= formatMoney($driver['base_salary']) ?></span>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted small"><?= e(__('transport_allowance')) ?>:</span>
                        <span class="fw-bold text-info"><?= formatMoney($driver['transport_allowance']) ?></span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span class="text-muted small"><?= e(__('fuel_allowance')) ?>:</span>
                        <span class="fw-bold text-warning"><?= formatMoney($driver['fuel_allowance']) ?></span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Quick Summary Card -->
        <div class="card shadow-sm">
            <div class="card-body text-center p-4">
                <div class="stat-icon bg-success-subtle text-success mx-auto mb-2" style="width: 60px; height: 60px;">
                    <i class="fa-solid fa-road fs-3"></i>
                </div>
                <h4 class="fw-bold mb-0"><?= $totalTrips ?> <?= e(__('month_trips_approved')) ?></h4>
                <p class="text-muted small"><?= e(__('month_trips_value')) ?></p>
                <h5 class="fw-bold text-success"><?= formatMoney($totalEarnings) ?></h5>
            </div>
        </div>
    </div>

    <!-- Trips & Timesheet Tabs -->
    <div class="col-lg-8">
        <div class="card shadow-sm mb-4">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span class="fw-bold"><i class="fa-solid fa-clock-rotate-left me-2 text-primary"></i><?= e(__('nav_trips')) ?></span>
                <a href="trip_add.php?driver_id=<?= $id ?>" class="btn btn-sm btn-primary">
                    <i class="fa-solid fa-plus me-1"></i> <?= e(__('new_trip_timesheet')) ?>
                </a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th><?= e(__('trip_date')) ?></th>
                                <th><?= e(__('route')) ?></th>
                                <th><?= e(__('trip_type')) ?></th>
                                <th><?= e(__('rate')) ?></th>
                                <th><?= e(__('trip_count_col')) ?></th>
                                <th><?= e(__('total_amount')) ?></th>
                                <th><?= e(__('status')) ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($trips)): ?>
                                <tr>
                                    <td colspan="7" class="text-center py-4 text-muted">
                                        <?= $isAr ? 'لا توجد رحلات مسجلة لهذا السائق حتى الآن.' : 'No trips recorded for this driver yet.' ?>
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($trips as $t): 
                                    $tripTypeName = $isAr ? $t['trip_type_name_ar'] : $t['trip_type_name_en'];
                                ?>
                                    <tr>
                                        <td>
                                            <span class="fw-bold"><?= formatDate($t['trip_date']) ?></span>
                                            <?php if (!empty($t['return_date']) && $t['return_date'] !== $t['trip_date']): ?>
                                                <div class="small fw-bold" style="color: #4f46e5;">
                                                    &larr; <?= formatDate($t['return_date']) ?> (<?= $t['duty_days'] ?? 1 ?> أيام)
                                                </div>
                                            <?php endif; ?>
                                            <div class="small text-muted"><?= $t['departure_time'] ?></div>
                                        </td>
                                        <td>
                                            <span class="d-block fw-semibold small"><?= e($t['departure_city']) ?> &rarr; <?= e($t['arrival_city']) ?></span>
                                            <span class="small text-muted"><?= e($t['route_name']) ?></span>
                                        </td>
                                        <td><span class="badge bg-light text-dark border"><?= e($tripTypeName) ?></span></td>
                                        <td><?= formatMoney($t['trip_rate']) ?></td>
                                        <td><?= $t['trip_count'] ?></td>
                                        <td class="fw-bold text-success"><?= formatMoney($t['total_amount']) ?></td>
                                        <td><?= getTripStatusBadge($t['status']) ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Payroll History -->
        <div class="card shadow-sm">
            <div class="card-header fw-bold">
                <i class="fa-solid fa-receipt me-2 text-success"></i><?= e(__('nav_payroll')) ?>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead>
                            <tr>
                                <th><?= $isAr ? 'كود الكشف' : 'Payroll Code' ?></th>
                                <th><?= $isAr ? 'الشهر / السنة' : 'Month / Year' ?></th>
                                <th><?= e(__('base_salary')) ?></th>
                                <th><?= e(__('month_trips_value')) ?></th>
                                <th><?= $isAr ? 'صافي الراتب' : 'Net Salary' ?></th>
                                <th><?= e(__('status')) ?></th>
                                <th><?= e(__('action_view')) ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($payrolls)): ?>
                                <tr>
                                    <td colspan="7" class="text-center py-4 text-muted">
                                        <?= $isAr ? 'لم يتم إصدار كشوفات رواتب بعد.' : 'No payrolls generated yet.' ?>
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($payrolls as $p): ?>
                                    <tr>
                                        <td class="fw-semibold text-primary"><?= e($p['payroll_code']) ?></td>
                                        <td><?= $p['month'] ?> / <?= $p['year'] ?></td>
                                        <td><?= formatMoney($p['base_salary']) ?></td>
                                        <td><?= formatMoney($p['approved_trips_amount']) ?></td>
                                        <td class="fw-bold text-dark"><?= formatMoney($p['net_salary']) ?></td>
                                        <td><?= getPayrollStatusBadge($p['status']) ?></td>
                                        <td>
                                            <a href="payroll_view.php?id=<?= $p['id'] ?>" class="btn btn-sm btn-outline-info">
                                                <i class="fa-solid fa-file-lines"></i>
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
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
