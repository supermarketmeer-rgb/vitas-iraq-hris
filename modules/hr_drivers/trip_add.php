<?php
/**
 * Add / Edit Trip Timesheet Entry
 * Features: Dynamic Rate Fetching, Manual Rate Override Flag, Strict Duplicate Prevention
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('trips_create');

$pdo = getDBConnection();
$offices = getActiveOffices();

$editId = !empty($_GET['edit_id']) ? (int)$_GET['edit_id'] : null;
$tripData = null;

if ($editId) {
    $stmt = $pdo->prepare("SELECT * FROM drv_driver_trips WHERE id = ?");
    $stmt->execute([$editId]);
    $tripData = $stmt->fetch();
    if (!$tripData || $tripData['status'] === 'approved') {
        die('لا يمكن تعديل هذه الرحلة لأنها معتمدة أو غير موجودة.');
    }
}

$defaultOfficeId = $tripData['office_id'] ?? ($_GET['office_id'] ?? ($offices[0]['id'] ?? 1));
$defaultDriverId = $tripData['driver_id'] ?? ($_GET['driver_id'] ?? '');

$errors = [];
$warning = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errors[] = 'رمز الأمان CSRF غير صالح.';
    }

    $tripDate = $_POST['trip_date'] ?? date('Y-m-d');
    $returnDate = !empty($_POST['return_date']) ? $_POST['return_date'] : null;
    // Ensure return_date is not before trip_date
    if ($returnDate && $returnDate < $tripDate) {
        $returnDate = $tripDate;
    }
    // احتساب أيام الدوام بين الانطلاق والعودة
    $dutyDays = 1;
    if ($returnDate && $returnDate > $tripDate) {
        $dep = new \DateTime($tripDate);
        $ret = new \DateTime($returnDate);
        $diff = $dep->diff($ret);
        $dutyDays = max(1, (int)$diff->days + 1);
    }
    $officeId = (int)($_POST['office_id'] ?? 0);
    $driverId = (int)($_POST['driver_id'] ?? 0);
    $routeId = (int)($_POST['route_id'] ?? 0);
    $departureTime = $_POST['departure_time'] ?? '08:00';
    $arrivalTime = !empty($_POST['arrival_time']) ? $_POST['arrival_time'] : null;
    $tripCount = (float)($_POST['trip_count'] ?? 1);
    $manualRate = (float)($_POST['trip_rate'] ?? 0);
    $isRateEdited = isset($_POST['is_rate_manually_edited']) ? 1 : 0;
    $rateReason = trim($_POST['rate_edit_reason'] ?? '');
    $notes = trim($_POST['notes'] ?? '');
    $status = $_POST['status'] ?? 'pending';

    // Validation
    if ($officeId <= 0) $errors[] = 'يرجى تحديد المكتب';
    if ($driverId <= 0) $errors[] = 'يرجى تحديد السائق';
    if ($routeId <= 0) $errors[] = 'يرجى تحديد مسار الرحلة';
    if (empty($tripDate)) $errors[] = 'تاريخ الرحلة مطلوب';
    if (empty($departureTime)) $errors[] = 'وقت الانطلاق مطلوب';
    if ($tripCount <= 0) $errors[] = 'عدد الرحلات يجب أن يكون 1 أو أكثر';

    // Fetch Route details & base rate
    $routeStmt = $pdo->prepare("SELECT * FROM drv_trip_routes WHERE id = ?");
    $routeStmt->execute([$routeId]);
    $route = $routeStmt->fetch();

    if (!$route) {
        $errors[] = 'مسار الرحلة المحدد غير صالح';
    }

    // Check duplicate: Same driver + Same date + Same route + Same departure time
    if (empty($errors)) {
        $isDup = checkTripDuplicate($driverId, $tripDate, $routeId, $departureTime, $editId);
        if ($isDup) {
            $errors[] = 'تحذير منع التكرار: توجد رحلة مسجلة مسبقاً لنفس السائق في نفس التاريخ والمسار ووقت الانطلاق!';
        }
    }

    // Determine final rate to freeze in Timesheet
    $finalRate = $manualRate > 0 ? $manualRate : (float)$route['current_rate'];
    if ($manualRate > 0 && abs($manualRate - (float)$route['current_rate']) > 0.01) {
        $isRateEdited = 1;
    }
    $totalAmount = $finalRate * $tripCount;

    if (empty($errors)) {
        try {
            if ($editId) {
                $updateStmt = $pdo->prepare("
                    UPDATE drv_driver_trips SET
                        trip_date = ?, return_date = ?, duty_days = ?,
                        office_id = ?, driver_id = ?, route_id = ?,
                        trip_type_id = ?, departure_city = ?, arrival_city = ?,
                        departure_time = ?, arrival_time = ?, trip_count = ?,
                        trip_rate = ?, total_amount = ?, is_rate_manually_edited = ?,
                        rate_edit_reason = ?, status = ?, notes = ?
                    WHERE id = ?
                ");
                $updateStmt->execute([
                    $tripDate, $returnDate, $dutyDays,
                    $officeId, $driverId, $routeId,
                    $route['trip_type_id'], $route['departure_city'], $route['arrival_city'],
                    $departureTime, $arrivalTime, $tripCount,
                    $finalRate, $totalAmount, $isRateEdited,
                    $rateReason, $status, $notes, $editId
                ]);

                logAudit('UPDATE_TRIP', 'driver_trips', $editId, null, ['amount' => $totalAmount]);
                header("Location: trips.php?msg=updated");
                exit;
            } else {
                $tripNumber = 'TRIP-' . date('Ym') . '-' . str_pad((string)random_int(100, 9999), 4, '0', STR_PAD_LEFT);
                $insertStmt = $pdo->prepare("
                    INSERT INTO drv_driver_trips (
                        trip_number, trip_date, return_date, duty_days,
                        office_id, driver_id, route_id,
                        trip_type_id, departure_city, arrival_city, departure_time,
                        arrival_time, trip_count, trip_rate, total_amount,
                        is_rate_manually_edited, rate_edit_reason, status, notes, created_by
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?, ?
                    )
                ");
                $insertStmt->execute([
                    $tripNumber, $tripDate, $returnDate, $dutyDays,
                    $officeId, $driverId, $routeId,
                    $route['trip_type_id'], $route['departure_city'], $route['arrival_city'], $departureTime,
                    $arrivalTime, $tripCount, $finalRate, $totalAmount,
                    $isRateEdited, $rateReason, $status, $notes, getCurrentUser()['id'] ?? null
                ]);
                $newId = (int)$pdo->lastInsertId();
                logAudit('CREATE_TRIP', 'driver_trips', $newId, null, ['trip_number' => $tripNumber, 'amount' => $totalAmount]);
                header("Location: trips.php?msg=created");
                exit;
            }
        } catch (\PDOException $e) {
            error_log('Save Trip Error: ' . $e->getMessage());
            $errors[] = 'حدث خطأ في قاعدة البيانات أثناء حفظ سجل الرحلة.';
        }
    }
}

// Routes and Drivers for the selected office
$routes = $pdo->query("SELECT * FROM drv_trip_routes WHERE is_active = 1 ORDER BY office_id ASC, name ASC")->fetchAll();
$activeDrivers = $pdo->query("SELECT * FROM drv_drivers WHERE deleted_at IS NULL AND status = 'active' ORDER BY office_id ASC, full_name ASC")->fetchAll();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1"><?= $editId ? 'تعديل سجل رحلة' : 'تسجيل رحلة فعلية في Timesheet' ?></h3>
        <p class="text-muted mb-0">جلب سعر الرحلة آلياً مع التحقق الصارم من عدم تكرار الرحلات وتثبيت السعر تاريخياً</p>
    </div>
    <a href="trips.php" class="btn btn-outline-secondary">
        <i class="fa-solid fa-arrow-right me-1"></i> العودة لسجل الرحلات
    </a>
</div>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger alert-dismissible fade show">
        <h6 class="fw-bold mb-2"><i class="fa-solid fa-triangle-exclamation me-2"></i>تنبيه:</h6>
        <ul class="mb-0">
            <?php foreach ($errors as $err): ?>
                <li><?= e($err) ?></li>
            <?php endforeach; ?>
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<div class="card shadow-sm">
    <div class="card-body p-4">
        <form method="POST" action="trip_add.php<?= $editId ? '?edit_id=' . $editId : '' ?>" id="tripForm">
            <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">

            <div class="row g-3 mb-4">
                <!-- Date + Return Date (multi-day trips) -->
                <div class="col-md-3">
                    <label class="form-label fw-bold">تاريخ الانطلاق (الذهاب) <span class="text-danger">*</span></label>
                    <input type="date" name="trip_date" id="tripDate" class="form-control" required value="<?= e($tripData['trip_date'] ?? date('Y-m-d')) ?>">
                </div>

                <div class="col-md-3">
                    <label class="form-label fw-bold text-indigo" style="color:#4f46e5;">تاريخ العودة / بصمة الرجوع <span class="text-muted small">(اختياري)</span></label>
                    <input type="date" name="return_date" id="returnDate" class="form-control border-indigo"
                           style="border-color:#6366f1;" value="<?= e($tripData['return_date'] ?? '') ?>">
                    <small class="text-muted">في حال كانت العودة في اليوم التالي أو بعده (بصمة الرجوع)</small>
                </div>

                <!-- Multi-day duty banner (shown by JS) -->
                <div class="col-md-6" id="multiDayBanner" style="display:none;">
                    <div class="alert alert-indigo border-0 mb-0 p-2" style="background:#ede9fe;border-radius:10px;">
                        <div class="d-flex align-items-center gap-2 fw-bold text-indigo" style="color:#3730a3;">
                            <i class="fa-solid fa-calendar-days"></i>
                            <span>احتساب الدوام: <strong id="dutyDaysLabel">1</strong> يوم دوام رسمي (بصمة)</span>
                        </div>
                        <small class="text-muted">الفترة الكاملة بين الانطلاق والعودة تُعتبر دوام عمل</small>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <!-- Office -->
                <div class="col-md-3">
                    <label class="form-label fw-bold">المكتب <span class="text-danger">*</span></label>
                    <select name="office_id" id="officeSelect" class="form-select" required>
                        <option value="">-- اختر المكتب --</option>
                        <?php foreach ($offices as $off): ?>
                            <option value="<?= $off['id'] ?>" <?= ((int)($tripData['office_id'] ?? $defaultOfficeId) === (int)$off['id']) ? 'selected' : '' ?>>
                                <?= e($off['name_ar']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <!-- Driver (Filtered dynamically) -->
                <div class="col-md-6">
                    <label class="form-label fw-bold">السائق <span class="text-danger">*</span></label>
                    <select name="driver_id" id="driverSelect" class="form-select" required>
                        <option value="">-- اختر السائق --</option>
                        <?php foreach ($activeDrivers as $drv): ?>
                            <option value="<?= $drv['id'] ?>" data-office="<?= $drv['office_id'] ?>" <?= ((int)($tripData['driver_id'] ?? $defaultDriverId) === (int)$drv['id']) ? 'selected' : '' ?>>
                                <?= e($drv['full_name']) ?> (<?= e($drv['driver_number']) ?>) - <?= e($drv['license_type']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <!-- Route Selection & Rate Display -->
            <div class="row g-3 mb-4 p-3 bg-light rounded-3 border">
                <div class="col-md-8">
                    <label class="form-label fw-bold">مسار الرحلة الأساسي <span class="text-danger">*</span></label>
                    <select name="route_id" id="routeSelect" class="form-select" required>
                        <option value="">-- اختر مسار الرحلة المعرف --</option>
                        <?php foreach ($routes as $r): ?>
                            <option value="<?= $r['id'] ?>" data-office="<?= $r['office_id'] ?>" data-rate="<?= $r['current_rate'] ?>" <?= ((int)($tripData['route_id'] ?? 0) === (int)$r['id']) ? 'selected' : '' ?>>
                                <?= e($r['name']) ?> (<?= e($r['departure_city']) ?> &larr; <?= e($r['arrival_city']) ?>) - السعر: <?= formatMoney($r['current_rate']) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="col-md-4">
                    <label class="form-label fw-bold">سعر الرحلة المعتمد (<?= DEFAULT_CURRENCY ?>)</label>
                    <div class="input-group">
                        <input type="number" step="500" name="trip_rate" id="tripRate" class="form-control fw-bold text-success" required value="<?= e($tripData['trip_rate'] ?? '0') ?>">
                        <span class="input-group-text"><?= DEFAULT_CURRENCY ?></span>
                    </div>
                </div>

                <!-- Manual Rate Edit Reason -->
                <div class="col-md-12">
                    <div class="form-check form-switch mb-2">
                        <input class="form-check-input" type="checkbox" name="is_rate_manually_edited" id="editRateCheck" <?= !empty($tripData['is_rate_manually_edited']) ? 'checked' : '' ?>>
                        <label class="form-check-label small fw-semibold" for="editRateCheck">تعديل السعر يدوياً لحالة استثنائية (يتطلب سبب التعديل)</label>
                    </div>
                    <div id="rateReasonBox" style="display: <?= !empty($tripData['is_rate_manually_edited']) ? 'block' : 'none' ?>;">
                        <input type="text" name="rate_edit_reason" class="form-control form-control-sm" placeholder="اكتب سبب تعديل السعر (مثل: حمولة مضاعفة، ظروف جوية، مهمة طارئة...)" value="<?= e($tripData['rate_edit_reason'] ?? '') ?>">
                    </div>
                </div>
            </div>

            <!-- Times & Counts -->
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <label class="form-label fw-bold">وقت الانطلاق <span class="text-danger">*</span></label>
                    <input type="time" name="departure_time" id="departureTime" class="form-control" required value="<?= e($tripData['departure_time'] ?? '08:00') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label">وقت العودة / الوصول</label>
                    <input type="time" name="arrival_time" class="form-control" value="<?= e($tripData['arrival_time'] ?? '12:00') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">عدد الرحلات (التكرار)</label>
                    <input type="number" step="0.5" min="0.5" name="trip_count" id="tripCount" class="form-control" required value="<?= e($tripData['trip_count'] ?? '1') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold">الإجمالي المحسوب (<?= DEFAULT_CURRENCY ?>)</label>
                    <input type="text" id="totalDisplay" class="form-control fw-bold bg-white text-primary fs-5" readonly value="<?= formatMoney($tripData['total_amount'] ?? 0) ?>">
                </div>

                <div class="col-md-8">
                    <label class="form-label">ملاحظات الرحلة</label>
                    <input type="text" name="notes" class="form-control" placeholder="أي تفاصيل تخص الحمولة، الوفد، أو المسار..." value="<?= e($tripData['notes'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-bold">حالة السجل</label>
                    <select name="status" class="form-select">
                        <option value="pending" <?= ($tripData['status'] ?? '') === 'pending' ? 'selected' : '' ?>>قيد المراجعة (Pending) - للاعتماد</option>
                        <option value="draft" <?= ($tripData['status'] ?? '') === 'draft' ? 'selected' : '' ?>>مسودة (Draft)</option>
                    </select>
                </div>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-3 border-top">
                <a href="trips.php" class="btn btn-light border px-4">إلغاء</a>
                <button type="submit" class="btn btn-primary px-5 fw-bold">
                    <i class="fa-solid fa-save me-2"></i> حفظ في Timesheet
                </button>
            </div>
        </form>
    </div>
</div>

<script>
// Filter drivers & routes by selected office & calculate total
document.addEventListener('DOMContentLoaded', function() {
    const officeSelect = document.getElementById('officeSelect');
    const driverSelect = document.getElementById('driverSelect');
    const routeSelect = document.getElementById('routeSelect');
    const tripRate = document.getElementById('tripRate');
    const tripCount = document.getElementById('tripCount');
    const totalDisplay = document.getElementById('totalDisplay');
    const editRateCheck = document.getElementById('editRateCheck');
    const rateReasonBox = document.getElementById('rateReasonBox');

    function filterByOffice() {
        const offId = officeSelect.value;
        // Filter drivers
        Array.from(driverSelect.options).forEach(opt => {
            if (!opt.value) return;
            opt.style.display = (!offId || opt.getAttribute('data-office') === offId) ? '' : 'none';
        });
    }

    officeSelect.addEventListener('change', filterByOffice);

    // Auto load rate on route change
    routeSelect.addEventListener('change', function() {
        const selected = routeSelect.options[routeSelect.selectedIndex];
        if (selected && selected.getAttribute('data-rate')) {
            tripRate.value = selected.getAttribute('data-rate');
            calcTotal();
        }
    });

    function calcTotal() {
        const rate = parseFloat(tripRate.value) || 0;
        const count = parseFloat(tripCount.value) || 1;
        const total = rate * count;
        totalDisplay.value = new Intl.NumberFormat().format(total) + ' د.ع';
    }

    tripRate.addEventListener('input', calcTotal);
    tripCount.addEventListener('input', calcTotal);

    if (editRateCheck) {
        editRateCheck.addEventListener('change', function() {
            rateReasonBox.style.display = this.checked ? 'block' : 'none';
        });
    }

    // Multi-day return date logic
    const tripDate = document.getElementById('tripDate');
    const returnDate = document.getElementById('returnDate');
    const multiDayBanner = document.getElementById('multiDayBanner');
    const dutyDaysLabel = document.getElementById('dutyDaysLabel');

    function updateMultiDay() {
        if (!tripDate || !returnDate || !multiDayBanner) return;
        const dep = tripDate.value;
        const ret = returnDate.value;
        if (ret && dep && ret > dep) {
            const d1 = new Date(dep);
            const d2 = new Date(ret);
            const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
            if (dutyDaysLabel) dutyDaysLabel.textContent = diffDays;
            multiDayBanner.style.display = 'block';
        } else {
            multiDayBanner.style.display = 'none';
        }
    }

    if (returnDate) {
        returnDate.addEventListener('change', updateMultiDay);
    }
    if (tripDate) {
        tripDate.addEventListener('change', function() {
            if (returnDate && returnDate.value && returnDate.value < this.value) {
                returnDate.value = '';
            }
            updateMultiDay();
        });
    }
    updateMultiDay();
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
