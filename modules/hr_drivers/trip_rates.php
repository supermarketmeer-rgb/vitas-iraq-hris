<?php
/**
 * Trip Routes & Base Rates Settings (إعدادات الرحلات وأسعارها)
 * Preserves Historical Rates Guarantee
 * Strict bilingual support (100% Arabic or 100% English)
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('routes_view');

$pdo = getDBConnection();
$isAr = isRtl();
$offices = getActiveOffices();
$tripTypes = $pdo->query("SELECT * FROM drv_trip_types WHERE is_active = 1")->fetchAll();

$officeFilter = !empty($_GET['office_id']) ? (int)$_GET['office_id'] : null;
$errors = [];
$successMsg = '';

// Handle Adding or Updating Route & Rate
if ($_SERVER['REQUEST_METHOD'] === 'POST' && hasPermission('routes_manage')) {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errors[] = $isAr ? 'رمز CSRF غير صالح.' : 'Invalid security token.';
    }

    $action = $_POST['form_action'] ?? 'add';
    $routeCode = strtoupper(trim($_POST['route_code'] ?? ''));
    $officeId = (int)($_POST['office_id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $tripTypeId = (int)($_POST['trip_type_id'] ?? 0);
    $departureCity = trim($_POST['departure_city'] ?? '');
    $arrivalCity = trim($_POST['arrival_city'] ?? '');
    $pathway = trim($_POST['pathway'] ?? '');
    $rate = (float)($_POST['current_rate'] ?? 0);
    $currency = trim($_POST['currency'] ?? 'IQD');
    $isActive = isset($_POST['is_active']) ? 1 : 0;
    $notes = trim($_POST['notes'] ?? '');

    if (empty($routeCode)) $errors[] = $isAr ? 'رمز الرحلة مطلوب' : 'Route code is required';
    if ($officeId <= 0) $errors[] = $isAr ? 'المكتب مطلوب' : 'Office is required';
    if (empty($name)) $errors[] = $isAr ? 'اسم أو وصف الرحلة مطلوب' : 'Route description is required';
    if ($rate <= 0) $errors[] = $isAr ? 'سعر الرحلة يجب أن يكون أكبر من صفر' : 'Rate must be greater than zero';

    if (empty($errors)) {
        if ($action === 'add') {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO drv_trip_routes (
                        route_code, office_id, name, trip_type_id, departure_city,
                        arrival_city, pathway, current_rate, currency, is_active, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $routeCode, $officeId, $name, $tripTypeId, $departureCity,
                    $arrivalCity, $pathway, $rate, $currency, $isActive, $notes
                ]);
                $newId = (int)$pdo->lastInsertId();

                $hist = $pdo->prepare("INSERT INTO drv_trip_rates_history (route_id, old_rate, new_rate, effective_date, reason) VALUES (?, 0, ?, CURDATE(), 'Initial rate creation')");
                $hist->execute([$newId, $rate]);

                logAudit('CREATE_ROUTE', 'trip_routes', $newId, null, ['code' => $routeCode, 'rate' => $rate]);
                $successMsg = $isAr ? 'تمت إضافة مسار الرحلة وسعرها بنجاح!' : 'Trip route and rate added successfully!';
            } catch (\PDOException $e) {
                error_log($e->getMessage());
                $errors[] = $isAr ? 'رمز الرحلة مستخدم مسبقاً أو حدث خطأ في قاعدة البيانات.' : 'Route code already in use or database error occurred.';
            }
        } elseif ($action === 'edit') {
            $routeId = (int)$_POST['route_id'];
            $oldRoute = $pdo->query("SELECT * FROM drv_trip_routes WHERE id = $routeId")->fetch();
            if ($oldRoute) {
                $oldRate = (float)$oldRoute['current_rate'];
                $updateStmt = $pdo->prepare("
                    UPDATE drv_trip_routes SET
                        name = ?, trip_type_id = ?, departure_city = ?, arrival_city = ?,
                        pathway = ?, current_rate = ?, currency = ?, is_active = ?, notes = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([
                    $name, $tripTypeId, $departureCity, $arrivalCity,
                    $pathway, $rate, $currency, $isActive, $notes, $routeId
                ]);

                if ($oldRate !== $rate) {
                    $hist = $pdo->prepare("
                        INSERT INTO drv_trip_rates_history (route_id, old_rate, new_rate, effective_date, reason, changed_by)
                        VALUES (?, ?, ?, CURDATE(), 'Rate update via settings', ?)
                    ");
                    $hist->execute([$routeId, $oldRate, $rate, getCurrentUser()['id'] ?? null]);
                }

                logAudit('UPDATE_ROUTE', 'trip_routes', $routeId, ['rate' => $oldRate], ['rate' => $rate]);
                $successMsg = $isAr ? 'تم تحديث بيانات الرحلة وسعرها بنجاح مع الحفاظ على أسعار الرحلات التاريخية!' : 'Trip route and rate updated successfully with historical lock!';
            }
        }
    }
}

// Query routes
$sql = "
    SELECT r.*, o.name_ar as office_name_ar, o.name_en as office_name_en, 
           tt.name_ar as trip_type_name_ar, tt.name_en as trip_type_name_en
    FROM drv_trip_routes r
    JOIN drv_offices o ON r.office_id = o.id
    JOIN drv_trip_types tt ON r.trip_type_id = tt.id
";
$params = [];
if ($officeFilter) {
    $sql .= " WHERE r.office_id = ?";
    $params[] = $officeFilter;
}
$sql .= " ORDER BY r.office_id ASC, r.id DESC";

$routesStmt = $pdo->prepare($sql);
$routesStmt->execute($params);
$routes = $routesStmt->fetchAll();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1"><?= e(__('trip_rates_title')) ?></h3>
        <p class="text-muted mb-0"><?= e(__('trip_rates_desc')) ?></p>
    </div>
    <?php if (hasPermission('routes_manage')): ?>
        <button class="btn btn-primary d-flex align-items-center gap-2" data-bs-toggle="modal" data-bs-target="#addRouteModal">
            <i class="fa-solid fa-plus"></i>
            <span><?= e(__('trip_rates_add')) ?></span>
        </button>
    <?php endif; ?>
</div>

<?php if ($successMsg): ?>
    <div class="alert alert-success alert-dismissible fade show">
        <i class="fa-solid fa-circle-check me-2"></i><?= e($successMsg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger alert-dismissible fade show">
        <ul class="mb-0">
            <?php foreach ($errors as $err): ?>
                <li><?= e($err) ?></li>
            <?php endforeach; ?>
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<!-- Filter by Office -->
<div class="card mb-4">
    <div class="card-body py-3">
        <form method="GET" action="trip_rates.php" class="row g-2 align-items-center">
            <div class="col-auto">
                <span class="fw-bold small text-muted"><i class="fa-solid fa-filter me-1"></i><?= e(__('filter_by_office')) ?>:</span>
            </div>
            <div class="col-md-3">
                <select name="office_id" class="form-select form-select-sm" onchange="this.form.submit()">
                    <option value=""><?= e(__('action_all')) ?></option>
                    <?php foreach ($offices as $off): ?>
                        <option value="<?= $off['id'] ?>" <?= $officeFilter === (int)$off['id'] ? 'selected' : '' ?>>
                            <?= e($isAr ? $off['name_ar'] : $off['name_en']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <?php if ($officeFilter): ?>
                <div class="col-auto">
                    <a href="trip_rates.php" class="btn btn-sm btn-outline-secondary"><?= $isAr ? 'إلغاء التصفية' : 'Clear Filter' ?></a>
                </div>
            <?php endif; ?>
        </form>
    </div>
</div>

<!-- Routes Table -->
<div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="fa-solid fa-map-location-dot me-2 text-primary"></i><?= e(__('trip_rates_title')) ?> (<?= count($routes) ?>)</span>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th><?= e(__('route_code')) ?></th>
                        <th><?= e(__('office')) ?></th>
                        <th><?= e(__('route_name')) ?></th>
                        <th><?= e(__('trip_type')) ?></th>
                        <th><?= e(__('departure_city')) ?> &rarr; <?= e(__('arrival_city')) ?></th>
                        <th><?= e(__('current_rate')) ?></th>
                        <th><?= e(__('status')) ?></th>
                        <th class="text-center"><?= e(__('action_actions')) ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($routes)): ?>
                        <tr>
                            <td colspan="8" class="text-center py-5 text-muted">
                                <?= $isAr ? 'لم يتم تعريف أي مسارات رحلات حتى الآن.' : 'No trip routes defined yet.' ?>
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($routes as $r): 
                            $officeName = $isAr ? $r['office_name_ar'] : $r['office_name_en'];
                            $typeName = $isAr ? $r['trip_type_name_ar'] : $r['trip_type_name_en'];
                        ?>
                            <tr>
                                <td class="fw-bold font-monospace text-primary"><?= e($r['route_code']) ?></td>
                                <td><span class="badge bg-secondary-subtle text-secondary"><?= e($officeName) ?></span></td>
                                <td>
                                    <span class="fw-bold d-block text-dark"><?= e($r['name']) ?></span>
                                    <small class="text-muted"><?= e($r['pathway']) ?></small>
                                </td>
                                <td><span class="badge bg-light text-dark border"><?= e($typeName) ?></span></td>
                                <td><?= e($r['departure_city']) ?> &rarr; <?= e($r['arrival_city']) ?></td>
                                <td class="fw-bold text-success fs-6"><?= formatMoney($r['current_rate']) ?></td>
                                <td>
                                    <?= $r['is_active'] ? '<span class="badge bg-success">' . e(__('status_active')) . '</span>' : '<span class="badge bg-secondary">' . e(__('status_inactive')) . '</span>' ?>
                                </td>
                                <td class="text-center">
                                    <?php if (hasPermission('routes_manage')): ?>
                                        <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#editModal<?= $r['id'] ?>" title="<?= e(__('action_edit')) ?>">
                                            <i class="fa-solid fa-pen-to-square me-1"></i> <?= e(__('action_edit')) ?>
                                        </button>
                                    <?php endif; ?>
                                </td>
                            </tr>

                            <!-- Edit Modal for this route -->
                            <div class="modal fade" id="editModal<?= $r['id'] ?>" tabindex="-1">
                                <div class="modal-dialog modal-lg">
                                    <div class="modal-content">
                                        <form method="POST" action="trip_rates.php">
                                            <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                            <input type="hidden" name="form_action" value="edit">
                                            <input type="hidden" name="route_id" value="<?= $r['id'] ?>">

                                            <div class="modal-header">
                                                <h5 class="modal-title fw-bold"><?= e(__('trip_rates_edit')) ?>: <?= e($r['name']) ?></h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <div class="row g-3">
                                                    <div class="col-md-6">
                                                        <label class="form-label fw-bold"><?= e(__('route_name')) ?></label>
                                                        <input type="text" name="name" class="form-control" required value="<?= e($r['name']) ?>">
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label class="form-label fw-bold"><?= e(__('current_rate')) ?> (<?= e(__('currency_iqd')) ?>)</label>
                                                        <input type="number" step="500" name="current_rate" class="form-control" required value="<?= e($r['current_rate']) ?>">
                                                    </div>
                                                    <div class="col-md-4">
                                                        <label class="form-label"><?= e(__('departure_city')) ?></label>
                                                        <input type="text" name="departure_city" class="form-control" required value="<?= e($r['departure_city']) ?>">
                                                    </div>
                                                    <div class="col-md-4">
                                                        <label class="form-label"><?= e(__('arrival_city')) ?></label>
                                                        <input type="text" name="arrival_city" class="form-control" required value="<?= e($r['arrival_city']) ?>">
                                                    </div>
                                                    <div class="col-md-4">
                                                        <label class="form-label"><?= e(__('trip_type')) ?></label>
                                                        <select name="trip_type_id" class="form-select">
                                                            <?php foreach ($tripTypes as $tt): ?>
                                                                <option value="<?= $tt['id'] ?>" <?= (int)$r['trip_type_id'] === (int)$tt['id'] ? 'selected' : '' ?>>
                                                                    <?= e($isAr ? $tt['name_ar'] : $tt['name_en']) ?>
                                                                </option>
                                                            <?php endforeach; ?>
                                                        </select>
                                                    </div>
                                                    <div class="col-md-12">
                                                        <label class="form-label"><?= e(__('pathway')) ?></label>
                                                        <input type="text" name="pathway" class="form-control" value="<?= e($r['pathway']) ?>">
                                                    </div>
                                                    <div class="col-md-12">
                                                        <div class="form-check form-switch">
                                                            <input class="form-check-input" type="checkbox" name="is_active" id="activeSwitch<?= $r['id'] ?>" <?= $r['is_active'] ? 'checked' : '' ?>>
                                                            <label class="form-check-label" for="activeSwitch<?= $r['id'] ?>"><?= e(__('status_active')) ?></label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-light border" data-bs-dismiss="modal"><?= e(__('action_cancel')) ?></button>
                                                <button type="submit" class="btn btn-primary fw-bold"><?= e(__('action_save')) ?></button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal Add Route -->
<div class="modal fade" id="addRouteModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="POST" action="trip_rates.php">
                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                <input type="hidden" name="form_action" value="add">

                <div class="modal-header">
                    <h5 class="modal-title fw-bold"><i class="fa-solid fa-map-location-dot me-2 text-primary"></i><?= e(__('trip_rates_add')) ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('route_code')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="route_code" class="form-control" required placeholder="BGW-KRB-02">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('office')) ?> <span class="text-danger">*</span></label>
                            <select name="office_id" class="form-select" required>
                                <option value="">-- <?= $isAr ? 'اختر المكتب' : 'Select Office' ?> --</option>
                                <?php foreach ($offices as $off): ?>
                                    <option value="<?= $off['id'] ?>"><?= e($isAr ? $off['name_ar'] : $off['name_en']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('trip_type')) ?> <span class="text-danger">*</span></label>
                            <select name="trip_type_id" class="form-select" required>
                                <?php foreach ($tripTypes as $tt): ?>
                                    <option value="<?= $tt['id'] ?>"><?= e($isAr ? $tt['name_ar'] : $tt['name_en']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="col-md-8">
                            <label class="form-label fw-bold"><?= e(__('route_name')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="name" class="form-control" required placeholder="<?= $isAr ? 'بغداد → كربلاء المقدسة' : 'Baghdad → Karbala' ?>">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('current_rate')) ?> (<?= e(__('currency_iqd')) ?>) <span class="text-danger">*</span></label>
                            <input type="number" step="500" name="current_rate" class="form-control" required placeholder="50000">
                        </div>

                        <div class="col-md-6">
                            <label class="form-label"><?= e(__('departure_city')) ?></label>
                            <input type="text" name="departure_city" class="form-control" required placeholder="<?= $isAr ? 'بغداد' : 'Baghdad' ?>">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label"><?= e(__('arrival_city')) ?></label>
                            <input type="text" name="arrival_city" class="form-control" required placeholder="<?= $isAr ? 'كربلاء' : 'Karbala' ?>">
                        </div>

                        <div class="col-md-12">
                            <label class="form-label"><?= e(__('pathway')) ?></label>
                            <input type="text" name="pathway" class="form-control" placeholder="<?= e(__('pathway')) ?>">
                        </div>

                        <div class="col-md-12">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" name="is_active" id="newActiveSwitch" checked>
                                <label class="form-check-label fw-bold" for="newActiveSwitch"><?= e(__('status_active')) ?></label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-light border" data-bs-dismiss="modal"><?= e(__('action_cancel')) ?></button>
                    <button type="submit" class="btn btn-primary fw-bold"><?= e(__('action_save')) ?></button>
                </div>
            </form>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
