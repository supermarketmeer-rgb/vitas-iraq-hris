<?php
/**
 * Trip Timesheet Listing (سجل Timesheet الرحلات الفعلية)
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('trips_view');

$pdo = getDBConnection();

$dateFrom = $_GET['date_from'] ?? date('Y-m-01');
$dateTo = $_GET['date_to'] ?? date('Y-m-d');
$officeId = !empty($_GET['office_id']) ? (int)$_GET['office_id'] : null;
$driverId = !empty($_GET['driver_id']) ? (int)$_GET['driver_id'] : null;
$status = trim($_GET['status'] ?? '');
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = 15;
$offset = ($page - 1) * $limit;

// Build query
$where = ["1=1"];
$params = [];

if ($dateFrom) {
    $where[] = "dt.trip_date >= ?";
    $params[] = $dateFrom;
}
if ($dateTo) {
    $where[] = "dt.trip_date <= ?";
    $params[] = $dateTo;
}
if ($officeId) {
    $where[] = "dt.office_id = ?";
    $params[] = $officeId;
}
if ($driverId) {
    $where[] = "dt.driver_id = ?";
    $params[] = $driverId;
}
if ($status !== '') {
    $where[] = "dt.status = ?";
    $params[] = $status;
}

$whereClause = implode(" AND ", $where);

// Total count
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM drv_driver_trips dt WHERE {$whereClause}");
$countStmt->execute($params);
$totalRecords = (int)$countStmt->fetchColumn();
$totalPages = ceil($totalRecords / $limit);

// Fetch items
$query = "
    SELECT dt.*, d.full_name as driver_name, d.driver_number, o.name_ar as office_name,
           r.name as route_name, tt.name_ar as trip_type_name
    FROM drv_driver_trips dt
    JOIN drv_drivers d ON dt.driver_id = d.id
    JOIN drv_offices o ON dt.office_id = o.id
    JOIN drv_trip_routes r ON dt.route_id = r.id
    JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
    WHERE {$whereClause}
    ORDER BY dt.trip_date DESC, dt.departure_time DESC
    LIMIT {$limit} OFFSET {$offset}
";
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$trips = $stmt->fetchAll();

$offices = getActiveOffices();
$drivers = getDriversByOffice($officeId);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1">Timesheet الرحلات الفعلية</h3>
        <p class="text-muted mb-0">سجل الرحلات اليومية المنفذة، أوقات الانطلاق والوصول، والأسعار التاريخية المعتمدة</p>
    </div>
    <div class="d-flex gap-2">
        <a href="reports.php?type=trips&date_from=<?= $dateFrom ?>&date_to=<?= $dateTo ?>" class="btn btn-outline-secondary">
            <i class="fa-solid fa-file-excel me-1"></i> تصدير وطباعة
        </a>
        <a href="trip_approval.php" class="btn btn-warning text-dark">
            <i class="fa-solid fa-stamp me-1"></i> شاشة الاعتماد
        </a>
        <a href="trip_add.php" class="btn btn-primary">
            <i class="fa-solid fa-plus me-1"></i> تسجيل رحلة جديدة
        </a>
    </div>
</div>

<!-- Filter Bar -->
<div class="card mb-4 shadow-sm">
    <div class="card-body">
        <form method="GET" action="trips.php" class="row g-2 align-items-end">
            <div class="col-md-2">
                <label class="form-label small fw-bold">من تاريخ</label>
                <input type="date" name="date_from" class="form-control form-control-sm" value="<?= e($dateFrom) ?>">
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold">إلى تاريخ</label>
                <input type="date" name="date_to" class="form-control form-control-sm" value="<?= e($dateTo) ?>">
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold">المكتب</label>
                <select name="office_id" class="form-select form-select-sm" onchange="this.form.submit()">
                    <option value="">كافة المكاتب</option>
                    <?php foreach ($offices as $off): ?>
                        <option value="<?= $off['id'] ?>" <?= $officeId === (int)$off['id'] ? 'selected' : '' ?>>
                            <?= e($off['name_ar']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold">السائق</label>
                <select name="driver_id" class="form-select form-select-sm">
                    <option value="">كافة السائقين</option>
                    <?php foreach ($drivers as $drv): ?>
                        <option value="<?= $drv['id'] ?>" <?= $driverId === (int)$drv['id'] ? 'selected' : '' ?>>
                            <?= e($drv['full_name']) ?> (<?= e($drv['driver_number']) ?>)
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold">حالة الرحلة</label>
                <select name="status" class="form-select form-select-sm">
                    <option value="">كافة الحالات</option>
                    <option value="pending" <?= $status === 'pending' ? 'selected' : '' ?>>قيد المراجعة (Pending)</option>
                    <option value="approved" <?= $status === 'approved' ? 'selected' : '' ?>>معتمدة (Approved)</option>
                    <option value="rejected" <?= $status === 'rejected' ? 'selected' : '' ?>>مرفوضة (Rejected)</option>
                    <option value="draft" <?= $status === 'draft' ? 'selected' : '' ?>>مسودة (Draft)</option>
                    <option value="cancelled" <?= $status === 'cancelled' ? 'selected' : '' ?>>ملغاة (Cancelled)</option>
                </select>
            </div>
            <div class="col-md-1">
                <button type="submit" class="btn btn-primary btn-sm w-100">
                    <i class="fa-solid fa-filter"></i>
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Table -->
<div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="fa-solid fa-list-check me-2 text-primary"></i>سجلات Timesheet (إجمالي: <?= $totalRecords ?>)</span>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th>رقم السجل</th>
                        <th>التاريخ والوقت</th>
                        <th>المكتب</th>
                        <th>السائق</th>
                        <th>المسار ونوع الرحلة</th>
                        <th>سعر الرحلة</th>
                        <th>العدد</th>
                        <th>الإجمالي</th>
                        <th>الحالة</th>
                        <th class="text-center">إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($trips)): ?>
                        <tr>
                            <td colspan="10" class="text-center py-5 text-muted">لم يتم العثور على أي رحلات مسجلة في هذه الفترة.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($trips as $t): ?>
                            <tr>
                                <td class="fw-semibold text-primary"><?= e($t['trip_number']) ?></td>
                                <td>
                                    <div class="fw-bold"><?= formatDate($t['trip_date']) ?></div>
                                    <?php if (!empty($t['return_date']) && $t['return_date'] !== $t['trip_date']): ?>
                                        <div class="mt-1">
                                            <div class="small fw-bold" style="color: #4f46e5;">
                                                <i class="fa-solid fa-arrow-left me-1"></i>العودة: <?= formatDate($t['return_date']) ?>
                                            </div>
                                            <div class="small text-muted"><i class="fa-regular fa-clock me-1"></i><?= $t['departure_time'] ?> &rarr; <?= $t['arrival_time'] ?: '--' ?></div>
                                            <span class="badge mt-1" style="background:#ede9fe; color:#3730a3; border: 1px solid #c7d2fe;">
                                                <i class="fa-solid fa-calendar-days me-1"></i><?= $t['duty_days'] ?? 1 ?> أيام دوام
                                            </span>
                                        </div>
                                    <?php else: ?>
                                        <small class="text-muted"><i class="fa-regular fa-clock me-1"></i><?= $t['departure_time'] ?> &rarr; <?= $t['arrival_time'] ?: '--' ?></small>
                                    <?php endif; ?>
                                </td>
                                <td><span class="badge bg-secondary-subtle text-secondary"><?= e($t['office_name']) ?></span></td>
                                <td>
                                    <a href="driver_view.php?id=<?= $t['driver_id'] ?>" class="text-decoration-none fw-semibold">
                                        <?= e($t['driver_name']) ?>
                                    </a>
                                    <div class="small text-muted"><?= e($t['driver_number']) ?></div>
                                </td>
                                <td>
                                    <span class="d-block fw-semibold small"><?= e($t['departure_city']) ?> &larr; <?= e($t['arrival_city']) ?></span>
                                    <small class="text-muted"><?= e($t['route_name']) ?></small>
                                    <div><span class="badge bg-light text-dark border" style="font-size: 0.7rem;"><?= e($t['trip_type_name']) ?></span></div>
                                </td>
                                <td>
                                    <?= formatMoney($t['trip_rate']) ?>
                                    <?php if ($t['is_rate_manually_edited']): ?>
                                        <span class="badge bg-warning text-dark" title="سعر معدل يدوياً: <?= e($t['rate_edit_reason']) ?>">* معدل</span>
                                    <?php endif; ?>
                                </td>
                                <td><span class="badge bg-info-subtle text-info fs-6"><?= $t['trip_count'] ?></span></td>
                                <td class="fw-bold text-success"><?= formatMoney($t['total_amount']) ?></td>
                                <td><?= getTripStatusBadge($t['status']) ?></td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <?php if ($t['status'] === 'pending' && hasPermission('trips_approve')): ?>
                                            <a href="trip_approval.php?id=<?= $t['id'] ?>" class="btn btn-outline-success" title="مراجعة واعتماد">
                                                <i class="fa-solid fa-stamp"></i>
                                            </a>
                                        <?php endif; ?>
                                        <?php if ($t['status'] !== 'approved' && hasPermission('trips_edit')): ?>
                                            <a href="trip_add.php?edit_id=<?= $t['id'] ?>" class="btn btn-outline-primary" title="تعديل">
                                                <i class="fa-solid fa-pen"></i>
                                            </a>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Pagination -->
    <?php if ($totalPages > 1): ?>
        <div class="card-footer bg-white d-flex justify-content-between align-items-center">
            <span class="text-muted small">الصفحة <?= $page ?> من <?= $totalPages ?></span>
            <ul class="pagination pagination-sm mb-0">
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                    <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                        <a class="page-link" href="?page=<?= $i ?>&date_from=<?= $dateFrom ?>&date_to=<?= $dateTo ?>&office_id=<?= $officeId ?>&driver_id=<?= $driverId ?>&status=<?= $status ?>"><?= $i ?></a>
                    </li>
                <?php endfor; ?>
            </ul>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
