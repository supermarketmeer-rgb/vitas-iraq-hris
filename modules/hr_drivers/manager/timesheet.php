<?php
/**
 * Office Manager Mobile App – Driver Timesheet
 * View and print driver timesheet with signature lines
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$officeId = $manager['office_id'];
$isAr = isRtl();

// Drivers for this office
$driversStmt = $pdo->prepare("
    SELECT * FROM drv_drivers
    WHERE deleted_at IS NULL AND office_id = ?
    ORDER BY full_name ASC
");
$driversStmt->execute([$officeId]);
$officeDrivers = $driversStmt->fetchAll();

// Filters
$selectedDriverId = (int)($_GET['driver_id'] ?? 0);
$selectedMonth    = (int)($_GET['month'] ?? date('m'));
$selectedYear     = (int)($_GET['year'] ?? date('Y'));

// Validate driver belongs to this office
$selectedDriver = null;
if ($selectedDriverId > 0) {
    foreach ($officeDrivers as $d) {
        if ((int)$d['id'] === $selectedDriverId) { $selectedDriver = $d; break; }
    }
    if (!$selectedDriver) { $selectedDriverId = 0; }
}

// Fetch trips
$trips = [];
$tripStats = ['count' => 0, 'total' => 0.0, 'approved' => 0, 'approvedTotal' => 0.0];

if ($selectedDriverId > 0) {
    $tripsStmt = $pdo->prepare("
        SELECT dt.*, tr.name as route_name, tt.name_ar as type_ar, tt.name_en as type_en
        FROM drv_driver_trips dt
        JOIN drv_trip_routes tr ON dt.route_id = tr.id
        JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
        WHERE dt.driver_id = ? AND dt.office_id = ?
          AND MONTH(dt.trip_date) = ? AND YEAR(dt.trip_date) = ?
        ORDER BY dt.trip_date ASC, dt.departure_time ASC
    ");
    $tripsStmt->execute([$selectedDriverId, $officeId, $selectedMonth, $selectedYear]);
    $trips = $tripsStmt->fetchAll();

    foreach ($trips as $t) {
        $tripStats['count']++;
        $tripStats['total'] += (float)$t['total_amount'];
        if ($t['status'] === 'approved') {
            $tripStats['approved']++;
            $tripStats['approvedTotal'] += (float)$t['total_amount'];
        }
    }
}

// Build month/year options
$months = $isAr
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];
?>

<div class="d-flex align-items-center gap-2 mb-3">
    <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
        <i class="fa-solid fa-calendar-days"></i>
    </div>
    <div>
        <h6 class="fw-bold mb-0"><?= $isAr ? 'تايمشيت السائق' : 'Driver Timesheet' ?></h6>
        <div class="small text-muted"><?= $isAr ? 'عرض وطباعة سجل الرحلات الشهري' : 'View and print monthly trip record' ?></div>
    </div>
</div>

<!-- Filter Form -->
<div class="mobile-card mb-3 no-print">
    <form method="GET" id="filterForm">
        <div class="mb-3">
            <label class="form-label fw-semibold"><?= $isAr ? 'اختر السائق' : 'Select Driver' ?></label>
            <select name="driver_id" class="form-select" onchange="this.form.submit()">
                <option value=""><?= $isAr ? '-- اختر السائق --' : '-- Select Driver --' ?></option>
                <?php foreach ($officeDrivers as $d): ?>
                    <option value="<?= $d['id'] ?>" <?= ($selectedDriverId === (int)$d['id']) ? 'selected' : '' ?>>
                        <?= e($d['full_name']) ?> (<?= e($d['driver_number']) ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </div>
        <?php if ($selectedDriverId > 0): ?>
        <div class="row g-2">
            <div class="col-7">
                <label class="form-label fw-semibold"><?= $isAr ? 'الشهر' : 'Month' ?></label>
                <select name="month" class="form-select">
                    <?php for ($m = 1; $m <= 12; $m++): ?>
                        <option value="<?= $m ?>" <?= ($selectedMonth === $m) ? 'selected' : '' ?>>
                            <?= $months[$m-1] ?>
                        </option>
                    <?php endfor; ?>
                </select>
            </div>
            <div class="col-5">
                <label class="form-label fw-semibold"><?= $isAr ? 'السنة' : 'Year' ?></label>
                <select name="year" class="form-select">
                    <?php for ($y = date('Y') - 2; $y <= date('Y') + 1; $y++): ?>
                        <option value="<?= $y ?>" <?= ($selectedYear === $y) ? 'selected' : '' ?>><?= $y ?></option>
                    <?php endfor; ?>
                </select>
            </div>
        </div>
        <div class="d-grid mt-2">
            <button type="submit" class="btn btn-primary">
                <i class="fa-solid fa-magnifying-glass me-1"></i>
                <?= $isAr ? 'عرض التايمشيت' : 'View Timesheet' ?>
            </button>
        </div>
        <?php endif; ?>
    </form>
</div>

<?php if ($selectedDriverId > 0 && $selectedDriver): ?>

<!-- Print Header (visible only when printing) -->
<div class="print-only" style="display:none;">
    <div style="text-align:center; border-bottom:2px solid #000; padding-bottom:12px; margin-bottom:16px;">
        <div style="font-size:1.4rem; font-weight:800;"><?= $isAr ? 'تايمشيت رحلات السائق' : 'Driver Trip Timesheet' ?></div>
        <div style="font-size:0.9rem; color:#555; margin-top:4px;">
            <?= $isAr
                ? (e($selectedDriver['full_name']) . ' | رقم الباج: ' . e($selectedDriver['driver_number']) . ' | ' . $months[$selectedMonth-1] . ' ' . $selectedYear)
                : (e($selectedDriver['full_name']) . ' | Badge: ' . e($selectedDriver['driver_number']) . ' | ' . $months[$selectedMonth-1] . ' ' . $selectedYear)
            ?>
        </div>
    </div>
</div>

<!-- Driver Header Card -->
<div class="mobile-card mb-3">
    <div class="d-flex align-items-center gap-3 mb-2">
        <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0" style="width:48px;height:48px;">
            <i class="fa-solid fa-id-badge fa-lg"></i>
        </div>
        <div>
            <div class="fw-bold fs-6"><?= e($selectedDriver['full_name']) ?></div>
            <div class="small text-muted"><?= e($selectedDriver['driver_number']) ?> &bull; <?= e($selectedDriver['license_number']) ?></div>
            <div class="small text-muted"><?= $months[$selectedMonth-1] ?> <?= $selectedYear ?></div>
        </div>
    </div>

    <!-- Summary Stats -->
    <div class="row g-2 mt-1">
        <div class="col-3 text-center">
            <div class="fw-bold text-primary fs-4"><?= $tripStats['count'] ?></div>
            <div class="small text-muted"><?= $isAr ? 'إجمالي' : 'Total' ?></div>
        </div>
        <div class="col-3 text-center">
            <div class="fw-bold text-success fs-4"><?= $tripStats['approved'] ?></div>
            <div class="small text-muted"><?= $isAr ? 'معتمدة' : 'Approved' ?></div>
        </div>
        <div class="col-6 text-center">
            <div class="fw-bold text-success" style="font-size: clamp(0.85rem,3.5vw,1.1rem);"><?= number_format($tripStats['approvedTotal']) ?></div>
            <div class="small text-muted"><?= $isAr ? 'قيمة معتمدة (د.ع)' : 'Approved Value (IQD)' ?></div>
        </div>
    </div>
</div>

<!-- Print Button -->
<?php if (!empty($trips)): ?>
<div class="no-print mb-3">
    <button onclick="window.print()" class="btn btn-outline-primary w-100 fw-bold py-2">
        <i class="fa-solid fa-print me-2"></i>
        <?= $isAr ? 'طباعة التايمشيت' : 'Print Timesheet' ?>
    </button>
</div>
<?php endif; ?>

<!-- Trips Table -->
<?php if (empty($trips)): ?>
    <div class="mobile-card text-center py-4">
        <i class="fa-solid fa-calendar-xmark fa-2x text-muted mb-3"></i>
        <div class="text-muted"><?= $isAr ? 'لا توجد رحلات مسجلة لهذا الشهر' : 'No trips recorded for this month' ?></div>
        <a href="trip_assign.php?driver_id=<?= $selectedDriverId ?>" class="btn btn-primary mt-3">
            <i class="fa-solid fa-plus me-1"></i>
            <?= $isAr ? 'تعيين رحلة' : 'Assign Trip' ?>
        </a>
    </div>
<?php else: ?>

<!-- Scroll Hint for Mobile Screen -->
<div class="small text-muted mb-2 px-1 d-flex align-items-center justify-content-between no-print">
    <span><i class="fa-solid fa-arrows-left-right text-primary me-1"></i><?= $isAr ? 'اسحب الجدول أفقياً للتمرير إلى آخر عمود' : 'Scroll horizontally to reach the last column' ?></span>
    <span class="badge bg-light text-muted border"><?= count($trips) ?> <?= $isAr ? 'سجل' : 'rows' ?></span>
</div>

<!-- Printable Timesheet -->
<div class="mobile-card p-0 overflow-hidden timesheet-printable">
    <div class="timesheet-header px-3 py-2">
        <div class="fw-bold"><?= $isAr ? 'تفاصيل الرحلات' : 'Trip Details' ?></div>
        <div class="small text-muted"><?= count($trips) ?> <?= $isAr ? 'رحلة' : 'trips' ?></div>
    </div>

    <div class="table-responsive timesheet-scrollable">
        <table class="table table-sm mb-0 timesheet-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th><?= $isAr ? 'التاريخ' : 'Date' ?></th>
                    <th><?= $isAr ? 'المسار' : 'Route' ?></th>
                    <th><?= $isAr ? 'انطلاق' : 'Dep.' ?></th>
                    <th><?= $isAr ? 'العدد' : 'Cnt' ?></th>
                    <th><?= $isAr ? 'السعر' : 'Rate' ?></th>
                    <th><?= $isAr ? 'الإجمالي' : 'Total' ?></th>
                    <th><?= $isAr ? 'الحالة' : 'Status' ?></th>
                </tr>
            </thead>
            <tbody>
                <?php $rowNum = 0; foreach ($trips as $t): $rowNum++; ?>
                    <tr class="<?= $t['status'] === 'approved' ? 'table-success' : ($t['status'] === 'pending' ? 'table-warning' : '') ?>">
                        <td class="text-muted small"><?= $rowNum ?></td>
                        <td class="small fw-semibold"><?= e(date('d/m/Y', strtotime($t['trip_date']))) ?></td>
                        <td class="small">
                            <span class="fw-semibold"><?= e($t['departure_city']) ?> &rarr; <?= e($t['arrival_city']) ?></span>
                            <?php if (!empty($t['route_name'])): ?>
                                <span class="text-muted ms-1" style="font-size:0.75rem;">(<?= e($t['route_name']) ?>)</span>
                            <?php endif; ?>
                        </td>
                        <td class="small font-monospace"><?= e(substr($t['departure_time'], 0, 5)) ?></td>
                        <td class="small text-center"><?= $t['trip_count'] ?></td>
                        <td class="small"><?= number_format((float)$t['trip_rate']) ?></td>
                        <td class="small fw-bold text-success"><?= number_format((float)$t['total_amount']) ?></td>
                        <td>
                            <?php if ($t['status'] === 'approved'): ?>
                                <span class="badge bg-success" style="font-size:0.68rem;">✓</span>
                            <?php elseif ($t['status'] === 'pending'): ?>
                                <span class="badge bg-warning text-dark" style="font-size:0.68rem;">⏳</span>
                            <?php else: ?>
                                <span class="badge bg-secondary" style="font-size:0.68rem;"><?= e($t['status']) ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
            <tfoot>
                <tr class="table-primary fw-bold">
                    <td colspan="4"><?= $isAr ? 'الإجمالي المعتمد' : 'Approved Total' ?></td>
                    <td class="text-center"><?= $tripStats['approved'] ?></td>
                    <td>-</td>
                    <td colspan="2"><?= number_format($tripStats['approvedTotal']) ?> <?= $isAr ? 'د.ع' : 'IQD' ?></td>
                </tr>
            </tfoot>
        </table>
    </div>
</div>

<!-- Signature Section (visible in print) -->
<div class="print-signatures mt-4">
    <div style="display:flex; gap:2rem; margin-top:2rem;">
        <div style="flex:1; text-align:center;">
            <div style="height:60px; border-bottom:2px solid #000; margin-bottom:8px;"></div>
            <div style="font-size:0.82rem; font-weight:600;"><?= $isAr ? 'توقيع السائق' : 'Driver Signature' ?></div>
            <div style="font-size:0.78rem; color:#555;"><?= e($selectedDriver['full_name']) ?></div>
        </div>
        <div style="flex:1; text-align:center;">
            <div style="height:60px; border-bottom:2px solid #000; margin-bottom:8px;"></div>
            <div style="font-size:0.82rem; font-weight:600;"><?= $isAr ? 'توقيع مدير المكتب' : 'Office Manager Signature' ?></div>
            <div style="font-size:0.78rem; color:#555;"><?= e($isAr ? $manager['manager_name'] : ($manager['manager_name_en'] ?: $manager['manager_name'])) ?></div>
        </div>
        <div style="flex:1; text-align:center;">
            <div style="height:60px; border-bottom:2px solid #000; margin-bottom:8px;"></div>
            <div style="font-size:0.82rem; font-weight:600;"><?= $isAr ? 'توقيع الجهة المختصة' : 'Authorized Signature' ?></div>
        </div>
    </div>
    <div style="text-align:center; margin-top:1rem; font-size:0.78rem; color:#888; border-top:1px solid #ccc; padding-top:0.5rem;">
        <?= $isAr ? 'طُبع بتاريخ: ' : 'Printed on: ' ?><?= date('Y-m-d H:i') ?>
    </div>
</div>

<?php endif; ?>
<?php endif; ?>

<style>
.timesheet-header {
    background: var(--primary-gradient);
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.timesheet-scrollable {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
    width: 100%;
}
.timesheet-table {
    font-size: 0.8rem;
    color: var(--app-text);
    min-width: 680px; /* guarantees all columns stay on one single line and table scrolls smoothly */
    width: 100%;
    margin-bottom: 0;
}
.timesheet-table thead th {
    background: <?= $isDark ? '#1a2744' : '#f8fafc' ?> !important;
    color: <?= $isDark ? '#e2e8f0' : '#475569' ?> !important;
    font-size: 0.74rem;
    padding: 0.55rem 0.5rem;
    white-space: nowrap !important;
    border-bottom: 1px solid var(--app-border);
}
.timesheet-table th,
.timesheet-table td {
    white-space: nowrap !important;
    vertical-align: middle;
    padding: 0.55rem 0.5rem;
}
.timesheet-table tbody tr.table-success td {
    background-color: <?= $isDark ? 'rgba(34, 197, 94, 0.15)' : '#dcfce7' ?> !important;
}
.timesheet-table tbody tr.table-warning td {
    background-color: <?= $isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3' ?> !important;
}
.timesheet-table tfoot tr.table-primary td {
    background-color: <?= $isDark ? '#1e3a8a' : '#dbeafe' ?> !important;
    color: <?= $isDark ? '#93c5fd' : '#1d4ed8' ?> !important;
}
.print-signatures { display: none; }
.print-only { display: none; }

@media print {
    body { padding: 0 !important; font-size: 11pt; }
    .no-print { display: none !important; }
    .mobile-card { box-shadow: none !important; border: 1px solid #ccc !important; border-radius: 0 !important; }
    .print-signatures { display: block !important; }
    .print-only { display: block !important; }
    .timesheet-scrollable { overflow: visible !important; }
    .timesheet-table { min-width: 100% !important; width: 100% !important; font-size: 8.5pt; }
    .timesheet-table th, .timesheet-table td { padding: 0.25rem 0.3rem !important; }
    .timesheet-header { background: #000 !important; color: #fff !important; }
}
</style>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
