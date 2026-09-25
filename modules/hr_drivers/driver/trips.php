<?php
/**
 * Driver Mobile App – Trips List (Read-Only)
 * View completed (approved), pending, and all trips
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$driverId = (int)$driver['driver_id'];
$isAr = isRtl();

// Filter inputs
$statusFilter = trim($_GET['status'] ?? 'all');
$selectedMonth = isset($_GET['month']) && $_GET['month'] !== '' ? (int)$_GET['month'] : 0;
$selectedYear  = isset($_GET['year']) && $_GET['year'] !== '' ? (int)$_GET['year'] : (int)date('Y');

// Month names
$months = $isAr
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Base query
$sql = "
    SELECT dt.*, tr.name as route_name, tt.name_ar as type_ar, tt.name_en as type_en
    FROM drv_driver_trips dt
    LEFT JOIN drv_trip_routes tr ON dt.route_id = tr.id
    LEFT JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
    WHERE dt.driver_id = ?
";
$params = [$driverId];

if ($statusFilter !== 'all' && in_array($statusFilter, ['pending', 'approved', 'rejected', 'draft'], true)) {
    $sql .= " AND dt.status = ?";
    $params[] = $statusFilter;
}

if ($selectedMonth > 0) {
    $sql .= " AND MONTH(dt.trip_date) = ?";
    $params[] = $selectedMonth;
}

if ($selectedYear > 0) {
    $sql .= " AND YEAR(dt.trip_date) = ?";
    $params[] = $selectedYear;
}

$sql .= " ORDER BY dt.trip_date DESC, dt.departure_time DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$trips = $stmt->fetchAll();

// Counts for tabs (for badge indicators)
$countsStmt = $pdo->prepare("
    SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
    FROM drv_driver_trips
    WHERE driver_id = ?
");
$countsStmt->execute([$driverId]);
$tabCounts = $countsStmt->fetch() ?: ['total_count' => 0, 'approved_count' => 0, 'pending_count' => 0, 'rejected_count' => 0];

// Calculate totals for currently displayed list
$displayedTotalAmount = 0.0;
foreach ($trips as $t) {
    $displayedTotalAmount += (float)$t['total_amount'];
}
?>

<!-- Page Header -->
<div class="d-flex align-items-center justify-content-between mb-3">
    <div class="d-flex align-items-center gap-2">
        <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
            <i class="fa-solid fa-route"></i>
        </div>
        <div>
            <h6 class="fw-bold mb-0"><?= $isAr ? 'جدول الرحلات' : 'Trips Schedule' ?></h6>
            <div class="small text-muted"><?= $isAr ? 'سجل الرحلات المكتملة والمعلقة (عرض فقط)' : 'Completed & pending trips (Read-only)' ?></div>
        </div>
    </div>
    <span class="readonly-chip">
        <i class="fa-solid fa-shield-halved"></i> <?= $isAr ? 'للقراءة فقط' : 'Read Only' ?>
    </span>
</div>

<!-- Status Filter Tabs (Horizontal Scrollable) -->
<div class="mobile-card p-1 mb-3">
    <ul class="nav nav-pills nav-fill gap-1" id="tripTabs">
        <li class="nav-item">
            <a class="nav-link py-2 px-2 <?= ($statusFilter === 'all') ? 'active bg-primary' : 'text-muted' ?>" 
               href="trips.php?status=all<?= $selectedMonth ? '&month='.$selectedMonth : '' ?><?= $selectedYear ? '&year='.$selectedYear : '' ?>">
                <span class="small fw-bold"><?= $isAr ? 'الكل' : 'All' ?></span>
                <span class="badge bg-secondary-subtle text-dark ms-1"><?= (int)$tabCounts['total_count'] ?></span>
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link py-2 px-2 <?= ($statusFilter === 'approved') ? 'active bg-success' : 'text-muted' ?>" 
               href="trips.php?status=approved<?= $selectedMonth ? '&month='.$selectedMonth : '' ?><?= $selectedYear ? '&year='.$selectedYear : '' ?>">
                <span class="small fw-bold"><?= $isAr ? 'معتمدة' : 'Approved' ?></span>
                <span class="badge bg-success text-white ms-1"><?= (int)$tabCounts['approved_count'] ?></span>
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link py-2 px-2 <?= ($statusFilter === 'pending') ? 'active bg-warning text-dark' : 'text-muted' ?>" 
               href="trips.php?status=pending<?= $selectedMonth ? '&month='.$selectedMonth : '' ?><?= $selectedYear ? '&year='.$selectedYear : '' ?>">
                <span class="small fw-bold"><?= $isAr ? 'معلقة' : 'Pending' ?></span>
                <span class="badge bg-warning text-dark ms-1"><?= (int)$tabCounts['pending_count'] ?></span>
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link py-2 px-2 <?= ($statusFilter === 'rejected') ? 'active bg-danger' : 'text-muted' ?>" 
               href="trips.php?status=rejected<?= $selectedMonth ? '&month='.$selectedMonth : '' ?><?= $selectedYear ? '&year='.$selectedYear : '' ?>">
                <span class="small fw-bold"><?= $isAr ? 'مرفوضة' : 'Rejected' ?></span>
                <span class="badge bg-danger text-white ms-1"><?= (int)$tabCounts['rejected_count'] ?></span>
            </a>
        </li>
    </ul>
</div>

<!-- Month / Year Dropdown Filter -->
<div class="mobile-card mb-3 py-2 px-3">
    <form method="GET" action="trips.php" class="row g-2 align-items-center">
        <input type="hidden" name="status" value="<?= e($statusFilter) ?>">
        <div class="col-6">
            <select name="month" class="form-select form-select-sm" onchange="this.form.submit()">
                <option value="0"><?= $isAr ? 'كل الأشهر' : 'All Months' ?></option>
                <?php for ($m = 1; $m <= 12; $m++): ?>
                    <option value="<?= $m ?>" <?= ($selectedMonth === $m) ? 'selected' : '' ?>>
                        <?= $months[$m - 1] ?>
                    </option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-4">
            <select name="year" class="form-select form-select-sm" onchange="this.form.submit()">
                <?php for ($y = (int)date('Y') + 1; $y >= (int)date('Y') - 3; $y--): ?>
                    <option value="<?= $y ?>" <?= ($selectedYear === $y) ? 'selected' : '' ?>><?= $y ?></option>
                <?php endfor; ?>
            </select>
        </div>
        <div class="col-2 text-end">
            <a href="trips.php" class="btn btn-sm btn-outline-secondary w-100" title="<?= $isAr ? 'إعادة ضبط' : 'Reset' ?>">
                <i class="fa-solid fa-rotate-left"></i>
            </a>
        </div>
    </form>
</div>

<!-- Summary Row -->
<div class="d-flex justify-content-between align-items-center px-2 mb-2">
    <div class="small text-muted">
        <?= $isAr ? 'عدد النتائج:' : 'Showing:' ?> <span class="fw-bold text-dark"><?= count($trips) ?></span> <?= $isAr ? 'رحلة' : 'trips' ?>
    </div>
    <div class="small">
        <span class="text-muted"><?= $isAr ? 'المجموع:' : 'Total:' ?></span>
        <span class="fw-bold text-success font-monospace"><?= number_format($displayedTotalAmount) ?> <?= $isAr ? 'د.ع' : 'IQD' ?></span>
    </div>
</div>

<!-- Trips List -->
<?php if (empty($trips)): ?>
    <div class="mobile-card text-center py-5">
        <i class="fa-solid fa-route fa-3x text-muted opacity-50 mb-3"></i>
        <div class="fw-bold fs-6 mb-1"><?= $isAr ? 'لا توجد رحلات مطابقة' : 'No matching trips found' ?></div>
        <div class="small text-muted"><?= $isAr ? 'لم يتم العثور على أي رحلات وفق المعايير المحددة.' : 'No trips found for the selected filter.' ?></div>
    </div>
<?php else: ?>
    <div class="d-flex flex-column gap-2 mb-3">
        <?php foreach ($trips as $t): ?>
            <?php 
                $isApproved = ($t['status'] === 'approved');
                $isPending  = ($t['status'] === 'pending');
                $isRejected = ($t['status'] === 'rejected');
                $statusBorder = $isApproved ? 'border-success' : ($isPending ? 'border-warning' : ($isRejected ? 'border-danger' : 'border-secondary'));
            ?>
            <div class="mobile-card mb-0 border-start <?= $isRtl ? 'border-end border-start-0' : 'border-start' ?> border-3 <?= $statusBorder ?>">
                <!-- Top Row: Trip Number & Status Badge -->
                <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <div class="d-flex align-items-center gap-1">
                        <span class="badge bg-light text-secondary border font-monospace" style="font-size: 0.72rem;">
                            <?= e($t['trip_number'] ?: ('#' . $t['id'])) ?>
                        </span>
                        <?php if (!empty($t['type_ar'])): ?>
                            <span class="badge bg-info-subtle text-info-emphasis" style="font-size: 0.68rem;">
                                <?= e($isAr ? $t['type_ar'] : ($t['type_en'] ?: $t['type_ar'])) ?>
                            </span>
                        <?php endif; ?>
                    </div>
                    <div>
                        <?= getTripStatusBadge($t['status']) ?>
                    </div>
                </div>

                <!-- Destination & Route -->
                <div class="mb-2">
                    <div class="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                        <span><?= e($t['departure_city']) ?></span>
                        <i class="fa-solid fa-arrow-<?= $isAr ? 'left' : 'right' ?> text-primary small"></i>
                        <span><?= e($t['arrival_city']) ?></span>
                    </div>
                    <?php if (!empty($t['route_name'])): ?>
                        <div class="small text-muted mt-1">
                            <i class="fa-solid fa-map-pin me-1 text-secondary"></i><?= e($t['route_name']) ?>
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Trip Details (Date, Time, Count, Rate, Total) -->
                <div class="row g-2 bg-light-subtle p-2 rounded-2 mb-2" style="font-size: 0.82rem;">
                    <div class="col-6">
                        <span class="text-muted"><i class="fa-regular fa-calendar me-1"></i><?= $isAr ? 'التاريخ:' : 'Date:' ?></span>
                        <span class="fw-semibold font-monospace"><?= e(date('d/m/Y', strtotime($t['trip_date']))) ?></span>
                    </div>
                    <div class="col-6">
                        <span class="text-muted"><i class="fa-regular fa-clock me-1"></i><?= $isAr ? 'الانطلاق:' : 'Time:' ?></span>
                        <span class="fw-semibold font-monospace"><?= !empty($t['departure_time']) ? e(substr($t['departure_time'], 0, 5)) : '-' ?></span>
                    </div>
                    <div class="col-4">
                        <span class="text-muted"><?= $isAr ? 'العدد:' : 'Count:' ?></span>
                        <span class="fw-bold"><?= (int)$t['trip_count'] ?></span>
                    </div>
                    <div class="col-4">
                        <span class="text-muted"><?= $isAr ? 'السعر:' : 'Rate:' ?></span>
                        <span class="fw-semibold"><?= number_format((float)$t['trip_rate']) ?></span>
                    </div>
                    <div class="col-4 text-end">
                        <span class="text-muted"><?= $isAr ? 'الإجمالي:' : 'Total:' ?></span>
                        <span class="fw-bold text-success font-monospace"><?= number_format((float)$t['total_amount']) ?></span>
                    </div>
                </div>

                <!-- Approval / Review Notes (if available) -->
                <?php if (!empty($t['notes']) || !empty($t['reviewed_at'])): ?>
                    <div class="small text-muted pt-1 border-top" style="font-size: 0.74rem;">
                        <?php if (!empty($t['reviewed_at'])): ?>
                            <div>
                                <i class="fa-solid fa-check-double text-success me-1"></i>
                                <?= $isAr ? 'تاريخ المراجعة:' : 'Reviewed on:' ?> 
                                <span class="font-monospace"><?= e(date('d/m/Y H:i', strtotime($t['reviewed_at']))) ?></span>
                            </div>
                        <?php endif; ?>
                        <?php if (!empty($t['notes'])): ?>
                            <div class="mt-1 fst-italic">
                                <i class="fa-regular fa-comment-dots me-1"></i><?= e($t['notes']) ?>
                            </div>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
