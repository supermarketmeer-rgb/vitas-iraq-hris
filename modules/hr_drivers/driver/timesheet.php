<?php
/**
 * Driver Mobile App – Monthly Timesheet (Read-Only)
 * View and print personal timesheet with approval status and signature lines
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$driverId = (int)$driver['driver_id'];
$isAr = isRtl();

// Filter parameters
$selectedMonth = (int)($_GET['month'] ?? date('m'));
$selectedYear  = (int)($_GET['year'] ?? date('Y'));

// Month names
$months = $isAr
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Fetch all trips for this driver for the selected month/year
$tripsStmt = $pdo->prepare("
    SELECT dt.*, tr.name as route_name, tt.name_ar as type_ar, tt.name_en as type_en
    FROM drv_driver_trips dt
    LEFT JOIN drv_trip_routes tr ON dt.route_id = tr.id
    LEFT JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
    WHERE dt.driver_id = ? 
      AND MONTH(dt.trip_date) = ? 
      AND YEAR(dt.trip_date) = ?
    ORDER BY dt.trip_date ASC, dt.departure_time ASC
");
$tripsStmt->execute([$driverId, $selectedMonth, $selectedYear]);
$trips = $tripsStmt->fetchAll();

// Calculate stats
$tripStats = [
    'count'         => 0,
    'total'         => 0.0,
    'approved'      => 0,
    'approvedTotal' => 0.0,
    'pending'       => 0,
    'pendingTotal'  => 0.0,
];

foreach ($trips as $t) {
    $tripStats['count']++;
    $amt = (float)$t['total_amount'];
    $tripStats['total'] += $amt;
    if ($t['status'] === 'approved') {
        $tripStats['approved']++;
        $tripStats['approvedTotal'] += $amt;
    } elseif ($t['status'] === 'pending') {
        $tripStats['pending']++;
        $tripStats['pendingTotal'] += $amt;
    }
}
?>

<!-- Header Section (Screen only) -->
<div class="d-flex align-items-center justify-content-between mb-3 no-print">
    <div class="d-flex align-items-center gap-2">
        <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
            <i class="fa-solid fa-calendar-check"></i>
        </div>
        <div>
            <h6 class="fw-bold mb-0"><?= $isAr ? 'التايمشيت الشهري' : 'Monthly Timesheet' ?></h6>
            <div class="small text-muted"><?= $isAr ? 'كشف تفاصيل الرحلات والاعتمادات' : 'Detailed trip log & approval report' ?></div>
        </div>
    </div>
    <span class="readonly-chip">
        <i class="fa-solid fa-eye"></i> <?= $isAr ? 'عرض فقط' : 'Read Only' ?>
    </span>
</div>

<!-- Month / Year Selector (Screen only) -->
<div class="mobile-card mb-3 no-print">
    <form method="GET" action="timesheet.php" class="row g-2 align-items-center">
        <div class="col-7">
            <label class="form-label small fw-semibold mb-1"><?= $isAr ? 'الشهر' : 'Month' ?></label>
            <select name="month" class="form-select" onchange="this.form.submit()">
                <?php for ($m = 1; $m <= 12; $m++): ?>
                    <option value="<?= $m ?>" <?= ($selectedMonth === $m) ? 'selected' : '' ?>>
                        <?= $months[$m - 1] ?>
                    </option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-5">
            <label class="form-label small fw-semibold mb-1"><?= $isAr ? 'السنة' : 'Year' ?></label>
            <select name="year" class="form-select" onchange="this.form.submit()">
                <?php for ($y = (int)date('Y') + 1; $y >= (int)date('Y') - 3; $y--): ?>
                    <option value="<?= $y ?>" <?= ($selectedYear === $y) ? 'selected' : '' ?>><?= $y ?></option>
                <?php endfor; ?>
            </select>
        </div>
    </form>
</div>

<!-- Print-Only Official Header -->
<div class="print-only mb-4 text-center border-bottom pb-3">
    <h3 class="fw-bold mb-1"><?= $isAr ? 'كشف تايمشيت السائق الشهري' : 'Driver Monthly Timesheet Report' ?></h3>
    <div class="fs-6 text-muted">
        <?= $isAr ? 'المكتب: ' : 'Office: ' ?><strong><?= e($officeName) ?></strong> &bull; 
        <?= $isAr ? 'الشهر: ' : 'Period: ' ?><strong><?= $months[$selectedMonth - 1] ?> <?= $selectedYear ?></strong>
    </div>
</div>

<!-- Driver Info & Summary Card -->
<div class="mobile-card mb-3">
    <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom">
        <div>
            <div class="fw-bold fs-6"><?= e($driver['full_name']) ?></div>
            <div class="small text-muted">
                <?= $isAr ? 'رقم الباج:' : 'Badge No:' ?> 
                <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace"><?= e($driver['driver_number']) ?></span>
                &bull; <?= e($officeName) ?>
            </div>
        </div>
        <div class="text-end">
            <span class="badge bg-light text-dark border">
                <?= $months[$selectedMonth - 1] ?> <?= $selectedYear ?>
            </span>
        </div>
    </div>

    <!-- Summary Stats -->
    <div class="row g-2 mt-1">
        <div class="col-3 text-center">
            <div class="fw-bold text-dark fs-4"><?= $tripStats['count'] ?></div>
            <div class="small text-muted" style="font-size:0.72rem;"><?= $isAr ? 'إجمالي' : 'Total' ?></div>
        </div>
        <div class="col-3 text-center">
            <div class="fw-bold text-success fs-4"><?= $tripStats['approved'] ?></div>
            <div class="small text-muted" style="font-size:0.72rem;"><?= $isAr ? 'معتمدة' : 'Approved' ?></div>
        </div>
        <div class="col-3 text-center">
            <div class="fw-bold text-warning fs-4"><?= $tripStats['pending'] ?></div>
            <div class="small text-muted" style="font-size:0.72rem;"><?= $isAr ? 'معلقة' : 'Pending' ?></div>
        </div>
        <div class="col-3 text-center">
            <div class="fw-bold text-success" style="font-size: clamp(0.85rem,3.5vw,1.1rem);"><?= number_format($tripStats['approvedTotal']) ?></div>
            <div class="small text-muted" style="font-size:0.72rem;"><?= $isAr ? 'معتمد (د.ع)' : 'Approved (IQD)' ?></div>
        </div>
    </div>
</div>

<!-- Print Button (Screen only) -->
<?php if (!empty($trips)): ?>
<div class="no-print mb-3">
    <button onclick="window.print()" class="btn btn-outline-primary w-100 fw-bold py-2">
        <i class="fa-solid fa-print me-2"></i>
        <?= $isAr ? 'طباعة التايمشيت' : 'Print Timesheet' ?>
    </button>
</div>
<?php endif; ?>

<!-- Trips Table / Timesheet Body -->
<?php if (empty($trips)): ?>
    <div class="mobile-card text-center py-5">
        <i class="fa-solid fa-calendar-xmark fa-3x text-muted opacity-50 mb-3"></i>
        <div class="fw-bold fs-6 mb-1"><?= $isAr ? 'لا توجد رحلات مسجلة لهذا الشهر' : 'No trips recorded for this month' ?></div>
        <div class="small text-muted"><?= $months[$selectedMonth - 1] ?> <?= $selectedYear ?></div>
    </div>
<?php else: ?>

<!-- Scroll Hint for Mobile Screen -->
<div class="small text-muted mb-2 px-1 d-flex align-items-center justify-content-between no-print">
    <span><i class="fa-solid fa-arrows-left-right text-success me-1"></i><?= $isAr ? 'اسحب الجدول أفقياً للتمرير إلى آخر عمود' : 'Scroll horizontally to reach the last column' ?></span>
    <span class="badge bg-light text-muted border"><?= count($trips) ?> <?= $isAr ? 'سجل' : 'rows' ?></span>
</div>

<div class="mobile-card p-0 overflow-hidden timesheet-printable">
    <div class="timesheet-header px-3 py-2">
        <div class="fw-bold"><?= $isAr ? 'تفاصيل سجل الرحلات' : 'Trip Details Log' ?></div>
        <div class="small opacity-75"><?= count($trips) ?> <?= $isAr ? 'رحلة' : 'trips' ?></div>
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
                        <td class="small font-monospace"><?= !empty($t['departure_time']) ? e(substr($t['departure_time'], 0, 5)) : '-' ?></td>
                        <td class="small text-center"><?= (int)$t['trip_count'] ?></td>
                        <td class="small"><?= number_format((float)$t['trip_rate']) ?></td>
                        <td class="small fw-bold text-success"><?= number_format((float)$t['total_amount']) ?></td>
                        <td>
                            <?php if ($t['status'] === 'approved'): ?>
                                <span class="badge bg-success" style="font-size:0.68rem;">✓ <?= $isAr ? 'معتمد' : 'Appr' ?></span>
                            <?php elseif ($t['status'] === 'pending'): ?>
                                <span class="badge bg-warning text-dark" style="font-size:0.68rem;">⏳ <?= $isAr ? 'معلق' : 'Pend' ?></span>
                            <?php elseif ($t['status'] === 'rejected'): ?>
                                <span class="badge bg-danger" style="font-size:0.68rem;">✕ <?= $isAr ? 'مرفوض' : 'Rej' ?></span>
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
                <?php if ($tripStats['pending'] > 0): ?>
                <tr class="table-warning fw-semibold small">
                    <td colspan="4"><?= $isAr ? 'المعلق بانتظار الاعتماد' : 'Pending Approval' ?></td>
                    <td class="text-center"><?= $tripStats['pending'] ?></td>
                    <td>-</td>
                    <td colspan="2"><?= number_format($tripStats['pendingTotal']) ?> <?= $isAr ? 'د.ع' : 'IQD' ?></td>
                </tr>
                <?php endif; ?>
            </tfoot>
        </table>
    </div>
</div>

<!-- Official Signatures Section (Always visible in print) -->
<div class="print-signatures mt-4">
    <div style="display:flex; justify-content:space-between; gap:1.5rem; margin-top:2.5rem;">
        <!-- Driver Signature -->
        <div style="flex:1; text-align:center;">
            <div style="height:55px; border-bottom:2px solid #000; margin-bottom:8px;"></div>
            <div style="font-size:0.85rem; font-weight:700;"><?= $isAr ? 'توقيع السائق' : 'Driver Signature' ?></div>
            <div style="font-size:0.78rem; color:#444;"><?= e($driver['full_name']) ?></div>
            <div style="font-size:0.72rem; color:#666; font-family: monospace;"><?= e($driver['driver_number']) ?></div>
        </div>

        <!-- Office Manager Signature -->
        <div style="flex:1; text-align:center;">
            <div style="height:55px; border-bottom:2px solid #000; margin-bottom:8px;"></div>
            <div style="font-size:0.85rem; font-weight:700;"><?= $isAr ? 'توقيع مدير المكتب' : 'Office Manager Signature' ?></div>
            <div style="font-size:0.78rem; color:#444;"><?= e($officeName) ?></div>
        </div>

        <!-- Accounts / Authorized Signature -->
        <div style="flex:1; text-align:center;">
            <div style="height:55px; border-bottom:2px solid #000; margin-bottom:8px;"></div>
            <div style="font-size:0.85rem; font-weight:700;"><?= $isAr ? 'مصادقة الإدارة / الحسابات' : 'Authorized Approval' ?></div>
            <div style="font-size:0.78rem; color:#444;"><?= $isAr ? 'الموارد البشرية' : 'HR & Accounts' ?></div>
        </div>
    </div>

    <div style="text-align:center; margin-top:2rem; font-size:0.75rem; color:#666; border-top:1px solid #ccc; padding-top:0.6rem;">
        <?= $isAr ? 'تم استخراج هذا التايمشيت بواسطة بوابة السائق بتاريخ: ' : 'Extracted via Driver Portal on: ' ?><?= date('Y-m-d H:i') ?>
    </div>
</div>

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
    background: <?= $isDark ? '#1a3328' : '#f8fafc' ?> !important;
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
    background-color: <?= $isDark ? '#133526' : '#dcfce7' ?> !important;
    color: <?= $isDark ? '#86efac' : '#15803d' ?> !important;
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
    .timesheet-header { background: #15803d !important; color: #fff !important; }
}
</style>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
