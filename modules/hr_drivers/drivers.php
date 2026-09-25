<?php
/**
 * Drivers Management Page (إدارة السائقين)
 * Strict bilingual support (100% Arabic or 100% English)
 * Displays English driver name in English mode, Arabic in Arabic mode.
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('drivers_view');

$pdo = getDBConnection();
$isAr = isRtl();

// Filters & Pagination
$search = trim($_GET['search'] ?? '');
$officeId = !empty($_GET['office_id']) ? (int)$_GET['office_id'] : null;
$status = trim($_GET['status'] ?? '');
$page = max(1, (int)($_GET['page'] ?? 1));
$limit = 10;
$offset = ($page - 1) * $limit;

// Build Query
$where = ["d.deleted_at IS NULL"];
$params = [];

if ($search !== '') {
    $where[] = "(d.full_name LIKE ? OR d.full_name_en LIKE ? OR d.employee_code LIKE ? OR d.phone LIKE ? OR d.driver_number LIKE ?)";
    $term = "%{$search}%";
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
}

if ($officeId) {
    $where[] = "d.office_id = ?";
    $params[] = $officeId;
}

if ($status !== '') {
    $where[] = "d.status = ?";
    $params[] = $status;
}

$whereClause = implode(" AND ", $where);

// Count total
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM drv_drivers d WHERE {$whereClause}");
$countStmt->execute($params);
$totalRecords = (int)$countStmt->fetchColumn();
$totalPages = ceil($totalRecords / $limit);

// Fetch paginated
$query = "
    SELECT d.*, o.name_ar as office_name_ar, o.name_en as office_name_en 
    FROM drv_drivers d 
    JOIN drv_offices o ON d.office_id = o.id 
    WHERE {$whereClause} 
    ORDER BY d.id DESC 
    LIMIT {$limit} OFFSET {$offset}
";
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$drivers = $stmt->fetchAll();

$offices = getActiveOffices();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1"><?= e(__('drivers_title')) ?></h3>
        <p class="text-muted mb-0"><?= e(__('drivers_desc')) ?></p>
    </div>
    <div class="d-flex gap-2">
        <a href="reports.php?type=drivers" class="btn btn-outline-secondary">
            <i class="fa-solid fa-file-excel me-1"></i> <?= $isAr ? 'تصدير وطباعة' : 'Export & Print' ?>
        </a>
        <?php if (hasPermission('drivers_manage')): ?>
            <a href="driver_add.php" class="btn btn-primary d-flex align-items-center gap-2">
                <i class="fa-solid fa-user-plus"></i>
                <span><?= e(__('drivers_add')) ?></span>
            </a>
        <?php endif; ?>
    </div>
</div>

<!-- Filters Card -->
<div class="card mb-4">
    <div class="card-body">
        <form method="GET" action="drivers.php" class="row g-3 align-items-end">
            <div class="col-md-4">
                <label class="form-label small fw-bold"><?= e(__('action_search')) ?></label>
                <div class="input-group">
                    <span class="input-group-text"><i class="fa-solid fa-search"></i></span>
                    <input type="text" name="search" class="form-control" placeholder="<?= $isAr ? 'الاسم، الرقم الوظيفي، الهاتف...' : 'Name, Code, Phone...' ?>" value="<?= e($search) ?>">
                </div>
            </div>

            <div class="col-md-3">
                <label class="form-label small fw-bold"><?= e(__('filter_by_office')) ?></label>
                <select name="office_id" class="form-select">
                    <option value=""><?= e(__('action_all')) ?></option>
                    <?php foreach ($offices as $off): ?>
                        <option value="<?= $off['id'] ?>" <?= $officeId === (int)$off['id'] ? 'selected' : '' ?>>
                            <?= e($isAr ? $off['name_ar'] : $off['name_en']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-3">
                <label class="form-label small fw-bold"><?= e(__('filter_by_status')) ?></label>
                <select name="status" class="form-select">
                    <option value=""><?= e(__('action_all')) ?></option>
                    <option value="active" <?= $status === 'active' ? 'selected' : '' ?>><?= e(__('status_active')) ?></option>
                    <option value="inactive" <?= $status === 'inactive' ? 'selected' : '' ?>><?= e(__('status_inactive')) ?></option>
                    <option value="on_leave" <?= $status === 'on_leave' ? 'selected' : '' ?>><?= e(__('status_on_leave')) ?></option>
                    <option value="suspended" <?= $status === 'suspended' ? 'selected' : '' ?>><?= e(__('status_suspended')) ?></option>
                    <option value="transferred" <?= $status === 'transferred' ? 'selected' : '' ?>><?= e(__('status_transferred')) ?></option>
                    <option value="resigned" <?= $status === 'resigned' ? 'selected' : '' ?>><?= e(__('status_resigned')) ?></option>
                </select>
            </div>

            <div class="col-md-2 d-flex gap-2">
                <button type="submit" class="btn btn-primary w-100">
                    <i class="fa-solid fa-filter me-1"></i> <?= e(__('action_filter')) ?>
                </button>
                <a href="drivers.php" class="btn btn-light border" title="<?= $isAr ? 'إعادة ضبط' : 'Reset' ?>">
                    <i class="fa-solid fa-arrow-rotate-left"></i>
                </a>
            </div>
        </form>
    </div>
</div>

<!-- Drivers Table -->
<div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="fa-solid fa-users me-2 text-primary"></i><?= e(__('drivers_title')) ?> (<?= $totalRecords ?>)</span>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th><?= e(__('employee_code')) ?></th>
                        <th><?= e(__('driver_name')) ?></th>
                        <th><?= e(__('phone')) ?></th>
                        <th><?= e(__('office')) ?></th>
                        <th><?= e(__('license_number')) ?></th>
                        <th><?= e(__('base_salary')) ?></th>
                        <th><?= e(__('status')) ?></th>
                        <th class="text-center"><?= e(__('action_actions')) ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($drivers)): ?>
                        <tr>
                            <td colspan="8" class="text-center py-5 text-muted">
                                <i class="fa-solid fa-id-badge fs-2 mb-2 d-block text-secondary"></i>
                                <?= $isAr ? 'لم يتم العثور على أي سائقين وفق معايير البحث المحددة.' : 'No drivers found matching search criteria.' ?>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($drivers as $driver): 
                            $displayName = $isAr ? $driver['full_name'] : ($driver['full_name_en'] ?: $driver['full_name']);
                            $officeName = $isAr ? $driver['office_name_ar'] : $driver['office_name_en'];
                        ?>
                            <tr>
                                <td>
                                    <span class="fw-bold"><?= e($driver['employee_code']) ?></span>
                                    <span class="badge bg-light text-muted border d-block mt-1"><?= e($driver['driver_number']) ?></span>
                                </td>
                                <td>
                                    <a href="driver_view.php?id=<?= $driver['id'] ?>" class="fw-bold text-decoration-none text-primary">
                                        <?= e($displayName) ?>
                                    </a>
                                    <?php if ($driver['father_name']): ?>
                                        <div class="small text-muted"><?= e(__('father_name')) ?>: <?= e($driver['father_name']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td><?= e($driver['phone']) ?></td>
                                <td><span class="badge bg-secondary-subtle text-secondary"><?= e($officeName) ?></span></td>
                                <td>
                                    <div class="small fw-semibold"><?= e($driver['license_number']) ?></div>
                                    <span class="badge bg-light text-dark border"><?= e($driver['license_type']) ?></span>
                                </td>
                                <td class="fw-bold"><?= formatMoney($driver['base_salary']) ?></td>
                                <td><?= getDriverStatusBadge($driver['status']) ?></td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <a href="driver_view.php?id=<?= $driver['id'] ?>" class="btn btn-outline-info" title="<?= e(__('action_view')) ?>">
                                            <i class="fa-solid fa-eye"></i>
                                        </a>
                                        <?php if (hasPermission('drivers_manage')): ?>
                                            <a href="driver_edit.php?id=<?= $driver['id'] ?>" class="btn btn-outline-primary" title="<?= e(__('action_edit')) ?>">
                                                <i class="fa-solid fa-pen-to-square"></i>
                                            </a>
                                            <a href="driver_edit.php?action=toggle_status&id=<?= $driver['id'] ?>" class="btn btn-outline-warning" title="<?= e(__('status')) ?>">
                                                <i class="fa-solid fa-power-off"></i>
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
        <div class="card-footer d-flex justify-content-between align-items-center">
            <span class="text-muted small"><?= $isAr ? "الصفحة {$page} من {$totalPages}" : "Page {$page} of {$totalPages}" ?></span>
            <ul class="pagination pagination-sm mb-0">
                <?php for ($i = 1; $i <= $totalPages; $i++): ?>
                    <li class="page-item <?= $i === $page ? 'active' : '' ?>">
                        <a class="page-link" href="?page=<?= $i ?>&search=<?= urlencode($search) ?>&office_id=<?= $officeId ?>&status=<?= $status ?>"><?= $i ?></a>
                    </li>
                <?php endfor; ?>
            </ul>
        </div>
    <?php endif; ?>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
