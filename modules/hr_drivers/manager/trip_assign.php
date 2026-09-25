<?php
/**
 * Office Manager Mobile App – Trip Assignment
 * Assigns a trip to a driver in this office, auto-approves and offers print
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$officeId = $manager['office_id'];
$isAr = isRtl();

$errors   = [];
$success  = false;
$newTrip  = null;

// Drivers for this office only
$driversStmt = $pdo->prepare("
    SELECT * FROM drv_drivers
    WHERE deleted_at IS NULL AND office_id = ? AND status = 'active'
    ORDER BY full_name ASC
");
$driversStmt->execute([$officeId]);
$officeDrivers = $driversStmt->fetchAll();

// Routes for this office only
$routesStmt = $pdo->prepare("
    SELECT tr.*, tt.name_ar as type_ar, tt.name_en as type_en
    FROM drv_trip_routes tr
    JOIN drv_trip_types tt ON tr.trip_type_id = tt.id
    WHERE tr.office_id = ? AND tr.is_active = 1
    ORDER BY tr.name ASC
");
$routesStmt->execute([$officeId]);
$officeRoutes = $routesStmt->fetchAll();

$defaultDriverId = (int)($_GET['driver_id'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyManagerCsrf($_POST['csrf_token'] ?? '')) {
        $errors[] = $isAr ? 'رمز الأمان غير صالح.' : 'Invalid security token.';
    }

    $driverId      = (int)($_POST['driver_id'] ?? 0);
    $routeId       = (int)($_POST['route_id'] ?? 0);
    $tripDate      = trim($_POST['trip_date'] ?? date('Y-m-d'));
    $returnDate    = !empty($_POST['return_date']) ? trim($_POST['return_date']) : null;
    $departureTime = trim($_POST['departure_time'] ?? '08:00');
    $arrivalTime   = !empty($_POST['arrival_time']) ? trim($_POST['arrival_time']) : null;
    $tripCount     = (float)($_POST['trip_count'] ?? 1);
    $manualRate    = (float)($_POST['trip_rate'] ?? 0);
    $notes         = trim($_POST['notes'] ?? '');
    $dutyDays      = 1;

    if ($returnDate && $tripDate) {
        if ($returnDate < $tripDate) {
            $errors[] = $isAr ? 'تاريخ العودة لا يمكن أن يكون قبل تاريخ الانطلاق' : 'Return date cannot be earlier than departure date';
        } else {
            $d1 = new DateTime($tripDate);
            $d2 = new DateTime($returnDate);
            $dutyDays = max(1, (int)$d1->diff($d2)->days + 1);
        }
    }

    if ($driverId <= 0) $errors[] = $isAr ? 'يرجى تحديد السائق' : 'Please select a driver';
    if ($routeId <= 0)  $errors[] = $isAr ? 'يرجى تحديد مسار الرحلة' : 'Please select a route';
    if (empty($tripDate)) $errors[] = $isAr ? 'تاريخ الرحلة مطلوب' : 'Trip date is required';
    if ($tripCount <= 0)  $errors[] = $isAr ? 'عدد الرحلات غير صالح' : 'Trip count must be positive';

    // Verify driver belongs to this office
    if ($driverId > 0) {
        $drvCheck = $pdo->prepare("SELECT id FROM drv_drivers WHERE id = ? AND office_id = ? AND deleted_at IS NULL");
        $drvCheck->execute([$driverId, $officeId]);
        if (!$drvCheck->fetch()) {
            $errors[] = $isAr ? 'السائق المحدد لا ينتمي لمكتبك' : 'Selected driver does not belong to your office';
        }
    }

    // Fetch route
    $route = null;
    if ($routeId > 0) {
        $rStmt = $pdo->prepare("SELECT * FROM drv_trip_routes WHERE id = ? AND office_id = ? AND is_active = 1");
        $rStmt->execute([$routeId, $officeId]);
        $route = $rStmt->fetch();
        if (!$route) $errors[] = $isAr ? 'مسار الرحلة غير صالح' : 'Invalid trip route';
    }

    // Duplicate check
    if (empty($errors)) {
        $isDup = checkTripDuplicate($driverId, $tripDate, $routeId, $departureTime);
        if ($isDup) {
            $errors[] = $isAr
                ? 'تحذير: رحلة مسجلة مسبقاً لنفس السائق في نفس التاريخ والمسار ووقت الانطلاق!'
                : 'Warning: Duplicate trip detected for this driver, date, route and departure time!';
        }
    }

    if (empty($errors) && $route) {
        $finalRate = $manualRate > 0 ? $manualRate : (float)$route['current_rate'];
        $totalAmount = $finalRate * $tripCount;
        $isRateEdited = ($manualRate > 0 && abs($manualRate - (float)$route['current_rate']) > 0.01) ? 1 : 0;

        $tripNumber = 'TRIP-' . date('Ym') . '-' . str_pad((string)random_int(100, 9999), 4, '0', STR_PAD_LEFT);

        try {
            $ins = $pdo->prepare("
                INSERT INTO drv_driver_trips (
                    trip_number, trip_date, return_date, duty_days, office_id, driver_id, route_id,
                    trip_type_id, departure_city, arrival_city,
                    departure_time, arrival_time, trip_count,
                    trip_rate, total_amount, is_rate_manually_edited,
                    status, reviewed_by, reviewed_at, notes, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    'approved', NULL, NOW(), ?, NULL
                )
            ");
            $ins->execute([
                $tripNumber, $tripDate, $returnDate, $dutyDays, $officeId, $driverId, $routeId,
                $route['trip_type_id'], $route['departure_city'], $route['arrival_city'],
                $departureTime, $arrivalTime, $tripCount,
                $finalRate, $totalAmount, $isRateEdited,
                $notes
            ]);
            $newTripId = (int)$pdo->lastInsertId();

            // Load the full trip for printing
            $tripStmt = $pdo->prepare("
                SELECT dt.*, d.full_name as driver_name, d.driver_number, d.phone as driver_phone,
                       d.license_number, d.license_type,
                       tr.name as route_name, tt.name_ar as trip_type_ar, tt.name_en as trip_type_en,
                       o.name_ar as office_name_ar, o.name_en as office_name_en
                FROM drv_driver_trips dt
                JOIN drv_drivers d ON dt.driver_id = d.id
                JOIN drv_trip_routes tr ON dt.route_id = tr.id
                JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
                JOIN drv_offices o ON dt.office_id = o.id
                WHERE dt.id = ?
            ");
            $tripStmt->execute([$newTripId]);
            $newTrip = $tripStmt->fetch();
            $success = true;
        } catch (\PDOException $e) {
            error_log('Trip assign error: ' . $e->getMessage());
            $errors[] = $isAr ? 'حدث خطأ في قاعدة البيانات أثناء حفظ الرحلة.' : 'Database error while saving trip.';
        }
    }
}

// For display after success, fetch driver details
$selectedDriver = null;
if ($success && $newTrip) {
    $drvStmt = $pdo->prepare("SELECT * FROM drv_drivers WHERE id = ?");
    $drvStmt->execute([$newTrip['driver_id']]);
    $selectedDriver = $drvStmt->fetch();
}
?>

<?php if ($success && $newTrip): ?>
<!-- ====== SUCCESS: Show Dispatch Voucher for Printing ====== -->
<div class="no-print mb-3 d-flex justify-content-between align-items-center">
    <button onclick="window.print()" class="btn btn-success fw-bold px-4">
        <i class="fa-solid fa-print me-2"></i>
        <?= $isAr ? 'طباعة قسيمة الإرسالية' : 'Print Dispatch Voucher' ?>
    </button>
    <a href="trip_assign.php" class="btn btn-outline-primary">
        <i class="fa-solid fa-plus me-1"></i>
        <?= $isAr ? 'رحلة جديدة' : 'New Trip' ?>
    </a>
</div>

<!-- Dispatch Voucher (print-optimized) -->
<div class="dispatch-voucher">
    <div class="voucher-header">
        <div class="voucher-title-ar">قسيمة إرسالية السائق</div>
        <div class="voucher-title-en">Driver Dispatch Voucher</div>
        <div class="voucher-ref">
            <strong><?= $isAr ? 'رقم الرحلة:' : 'Trip No:' ?></strong>
            <?= e($newTrip['trip_number']) ?>
        </div>
    </div>

    <div class="voucher-grid">
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'المكتب / الفرع' : 'Office / Branch' ?></span>
            <span class="voucher-value"><?= $isAr ? e($newTrip['office_name_ar']) : e($newTrip['office_name_en']) ?></span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'اسم السائق' : 'Driver Name' ?></span>
            <span class="voucher-value"><?= e($newTrip['driver_name']) ?></span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'رقم الباج' : 'Badge No' ?></span>
            <span class="voucher-value"><?= e($newTrip['driver_number']) ?></span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'رقم الرخصة' : 'License No' ?></span>
            <span class="voucher-value"><?= e($newTrip['license_number']) ?> (<?= e($newTrip['license_type']) ?>)</span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'تاريخ الرحلة' : 'Trip Date' ?></span>
            <span class="voucher-value">
                <?= e(formatDate($newTrip['trip_date'])) ?>
                <?php if (!empty($newTrip['return_date']) && $newTrip['return_date'] !== $newTrip['trip_date']): ?>
                    <span class="badge ms-1" style="background:#ede9fe; color:#3730a3; font-size:0.75rem;">
                        ← عودة: <?= e(formatDate($newTrip['return_date'])) ?> (<?= $newTrip['duty_days'] ?? 1 ?> أيام)
                    </span>
                <?php endif; ?>
            </span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'وقت الانطلاق' : 'Departure Time' ?></span>
            <span class="voucher-value"><?= e(substr($newTrip['departure_time'], 0, 5)) ?></span>
        </div>
        <?php if ($newTrip['arrival_time']): ?>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'وقت الوصول' : 'Arrival Time' ?></span>
            <span class="voucher-value"><?= e(substr($newTrip['arrival_time'], 0, 5)) ?></span>
        </div>
        <?php endif; ?>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'مسار الرحلة' : 'Route' ?></span>
            <span class="voucher-value"><?= e($newTrip['route_name']) ?></span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'من' : 'From' ?></span>
            <span class="voucher-value"><?= e($newTrip['departure_city']) ?></span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'إلى' : 'To' ?></span>
            <span class="voucher-value"><?= e($newTrip['arrival_city']) ?></span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'نوع الرحلة' : 'Trip Type' ?></span>
            <span class="voucher-value"><?= $isAr ? e($newTrip['trip_type_ar']) : e($newTrip['trip_type_en']) ?></span>
        </div>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'عدد الرحلات' : 'Trip Count' ?></span>
            <span class="voucher-value"><?= e($newTrip['trip_count']) ?></span>
        </div>
        <div class="voucher-row voucher-row-total">
            <span class="voucher-label"><?= $isAr ? 'سعر الرحلة' : 'Trip Rate' ?></span>
            <span class="voucher-value"><?= formatMoney($newTrip['trip_rate']) ?></span>
        </div>
        <div class="voucher-row voucher-row-total">
            <span class="voucher-label fw-bold fs-5"><?= $isAr ? 'الإجمالي المستحق' : 'Total Amount' ?></span>
            <span class="voucher-value fw-bold fs-5 text-primary"><?= formatMoney($newTrip['total_amount']) ?></span>
        </div>
        <?php if ($newTrip['notes']): ?>
        <div class="voucher-row">
            <span class="voucher-label"><?= $isAr ? 'ملاحظات' : 'Notes' ?></span>
            <span class="voucher-value"><?= e($newTrip['notes']) ?></span>
        </div>
        <?php endif; ?>
    </div>

    <!-- Status Badge -->
    <div class="voucher-status-row">
        <span class="voucher-approved-badge">
            <i class="fa-solid fa-circle-check me-1"></i>
            <?= $isAr ? 'معتمدة – مدير المكتب' : 'APPROVED – Office Manager' ?>
        </span>
        <span class="voucher-datetime"><?= date('Y-m-d H:i') ?></span>
    </div>

    <!-- Signatures -->
    <div class="voucher-signatures">
        <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label"><?= $isAr ? 'توقيع السائق' : 'Driver Signature' ?></div>
        </div>
        <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label"><?= $isAr ? 'توقيع مدير المكتب' : 'Office Manager Signature' ?></div>
            <div class="sig-name"><?= e($isAr ? $manager['manager_name'] : ($manager['manager_name_en'] ?: $manager['manager_name'])) ?></div>
        </div>
    </div>

    <div class="voucher-footer">
        <?= $isAr
            ? 'تُسلَّم هذه القسيمة للسائق بعد اعتمادها ليتم تقديمها عند المراجعة والتسوية.'
            : 'This voucher is issued to the driver after approval for submission during review and settlement.'
        ?>
    </div>
</div>

<style>
/* ===== Dispatch Voucher Styles ===== */
.dispatch-voucher {
    background: #fff;
    border: 2px solid #2563eb;
    border-radius: 16px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    font-family: <?= $isAr ? "'Cairo', sans-serif" : "'Inter', sans-serif" ?>;
    color: #0f172a;
}
.voucher-header {
    text-align: center;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 0.75rem;
    margin-bottom: 1rem;
}
.voucher-title-ar { font-size: 1.3rem; font-weight: 800; color: #1d4ed8; }
.voucher-title-en { font-size: 0.95rem; font-weight: 600; color: #64748b; }
.voucher-ref { font-size: 0.85rem; color: #475569; margin-top: 0.25rem; }
.voucher-grid { margin-bottom: 0.75rem; }
.voucher-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.35rem 0;
    border-bottom: 1px dashed #e2e8f0;
    gap: 0.5rem;
}
.voucher-row-total { background: #eff6ff; padding: 0.5rem 0.5rem; border-radius: 8px; margin-top: 0.25rem; }
.voucher-label { font-size: 0.83rem; color: #64748b; flex-shrink: 0; font-weight: 600; }
.voucher-value { font-size: 0.9rem; font-weight: 600; color: #0f172a; text-align: <?= $isAr ? 'left' : 'right' ?>; }
.voucher-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #dcfce7;
    border-radius: 10px;
    padding: 0.5rem 0.75rem;
    margin: 0.75rem 0;
}
.voucher-approved-badge {
    color: #15803d;
    font-weight: 700;
    font-size: 0.9rem;
}
.voucher-datetime { font-size: 0.78rem; color: #475569; }
.voucher-signatures {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
}
.sig-box {
    flex: 1;
    text-align: center;
}
.sig-line {
    height: 60px;
    border-bottom: 2px solid #334155;
    margin-bottom: 0.4rem;
}
.sig-label { font-size: 0.78rem; color: #475569; font-weight: 600; }
.sig-name  { font-size: 0.78rem; color: #1e293b; margin-top: 2px; }
.voucher-footer {
    text-align: center;
    font-size: 0.73rem;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 0.5rem;
    margin-top: 0.5rem;
}
@media print {
    body { padding: 0 !important; background: #fff !important; }
    .dispatch-voucher { border-radius: 0; border: 2px solid #000; }
    .voucher-approved-badge { color: #000 !important; }
}
</style>

<?php else: ?>
<!-- ====== FORM: Assign Trip ====== -->

<div class="d-flex align-items-center gap-2 mb-3">
    <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width:40px;height:40px;">
        <i class="fa-solid fa-route"></i>
    </div>
    <div>
        <h6 class="fw-bold mb-0"><?= $isAr ? 'تعيين رحلة جديدة' : 'Assign New Trip' ?></h6>
        <div class="small text-muted"><?= $isAr ? 'سيتم اعتماد الرحلة فور الحفظ' : 'Trip is auto-approved on save' ?></div>
    </div>
</div>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger border-0 rounded-3">
        <?php foreach ($errors as $err): ?>
            <div><i class="fa-solid fa-triangle-exclamation me-1"></i><?= e($err) ?></div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>

<?php if (empty($officeDrivers)): ?>
    <div class="alert alert-warning"><?= $isAr ? 'لا يوجد سائقون نشطون في مكتبك.' : 'No active drivers in your office.' ?></div>
<?php elseif (empty($officeRoutes)): ?>
    <div class="alert alert-warning"><?= $isAr ? 'لا توجد مسارات رحلات معرفة لمكتبك.' : 'No trip routes defined for your office.' ?></div>
<?php else: ?>

<form method="POST" id="assignForm">
    <input type="hidden" name="csrf_token" value="<?= getManagerCsrf() ?>">

    <div class="mobile-card mb-3">
        <h6 class="fw-semibold mb-3 text-primary">
            <i class="fa-solid fa-user me-1"></i>
            <?= $isAr ? 'بيانات السائق والتاريخ' : 'Driver & Date' ?>
        </h6>
        <!-- Driver -->
        <div class="mb-3">
            <label class="form-label fw-semibold"><?= $isAr ? 'السائق' : 'Driver' ?> <span class="text-danger">*</span></label>
            <select name="driver_id" id="driverSelect" class="form-select" required>
                <option value=""><?= $isAr ? '-- اختر السائق --' : '-- Select Driver --' ?></option>
                <?php foreach ($officeDrivers as $d): ?>
                    <option value="<?= $d['id'] ?>" <?= ($defaultDriverId === (int)$d['id']) ? 'selected' : '' ?>>
                        <?= e($d['full_name']) ?> (<?= e($d['driver_number']) ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- Date & Return Date -->
        <div class="row g-2 mb-3">
            <div class="col-6">
                <label class="form-label fw-semibold"><?= $isAr ? 'تاريخ الانطلاق' : 'Trip Date' ?> <span class="text-danger">*</span></label>
                <input type="date" name="trip_date" id="mTripDate" class="form-control" required value="<?= date('Y-m-d') ?>">
            </div>
            <div class="col-6">
                <label class="form-label fw-semibold" style="color:#4f46e5;"><?= $isAr ? 'تاريخ العودة (بصمة)' : 'Return Date' ?></label>
                <input type="date" name="return_date" id="mReturnDate" class="form-control" style="border-color:#6366f1;">
            </div>
            <div class="col-12" id="mMultiDayBanner" style="display:none;">
                <div class="alert alert-indigo border-0 mb-0 py-1 px-2 small" style="background:#ede9fe; color:#3730a3; border-radius:8px;">
                    <i class="fa-solid fa-calendar-days me-1"></i> احتساب الدوام: <strong id="mDutyDaysLabel">1</strong> يوم عمل رسمي
                </div>
            </div>
        </div>

        <!-- Times row -->
        <div class="row g-2 mb-3">
            <div class="col-6">
                <label class="form-label fw-semibold"><?= $isAr ? 'وقت الانطلاق' : 'Departure' ?> <span class="text-danger">*</span></label>
                <input type="time" name="departure_time" class="form-control" required value="08:00">
            </div>
            <div class="col-6">
                <label class="form-label fw-semibold"><?= $isAr ? 'وقت الوصول' : 'Arrival' ?></label>
                <input type="time" name="arrival_time" class="form-control">
            </div>
        </div>
    </div>

    <div class="mobile-card mb-3">
        <h6 class="fw-semibold mb-3 text-primary">
            <i class="fa-solid fa-map-pin me-1"></i>
            <?= $isAr ? 'المسار والتسعيرة' : 'Route & Rate' ?>
        </h6>

        <!-- Route -->
        <div class="mb-3">
            <label class="form-label fw-semibold"><?= $isAr ? 'مسار الرحلة' : 'Trip Route' ?> <span class="text-danger">*</span></label>
            <select name="route_id" id="routeSelect" class="form-select" required>
                <option value=""><?= $isAr ? '-- اختر المسار --' : '-- Select Route --' ?></option>
                <?php foreach ($officeRoutes as $r): ?>
                    <option value="<?= $r['id'] ?>" data-rate="<?= $r['current_rate'] ?>">
                        <?= e($r['name']) ?> | <?= e($r['departure_city']) ?> → <?= e($r['arrival_city']) ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <!-- Rate and Count row -->
        <div class="row g-2 mb-3">
            <div class="col-7">
                <label class="form-label fw-semibold"><?= $isAr ? 'سعر الرحلة (د.ع)' : 'Rate (IQD)' ?></label>
                <input type="number" name="trip_rate" id="tripRate" class="form-control fw-bold" step="500" min="0" value="0" placeholder="<?= $isAr ? 'يُجلب آلياً' : 'Auto-loaded' ?>">
            </div>
            <div class="col-5">
                <label class="form-label fw-semibold"><?= $isAr ? 'عدد الرحلات' : 'Count' ?></label>
                <input type="number" name="trip_count" id="tripCount" class="form-control" step="0.5" min="0.5" value="1" required>
            </div>
        </div>

        <!-- Total display -->
        <div class="p-3 rounded-3" style="background: linear-gradient(135deg, #eff6ff, #dbeafe);">
            <div class="text-center">
                <div class="small text-muted fw-semibold"><?= $isAr ? 'الإجمالي المستحق' : 'Total Amount' ?></div>
                <div class="fw-bold text-primary" id="totalDisplay" style="font-size: 1.5rem;">0 <?= $isAr ? 'د.ع' : 'IQD' ?></div>
            </div>
        </div>
    </div>

    <!-- Notes -->
    <div class="mobile-card mb-3">
        <label class="form-label fw-semibold"><?= $isAr ? 'ملاحظات' : 'Notes' ?></label>
        <textarea name="notes" class="form-control" rows="2" placeholder="<?= $isAr ? 'أي تفاصيل إضافية...' : 'Any additional details...' ?>"></textarea>
    </div>

    <!-- Approval notice -->
    <div class="alert alert-success border-0 d-flex align-items-center gap-2 mb-3" style="border-radius:14px;">
        <i class="fa-solid fa-circle-check fa-lg"></i>
        <div>
            <div class="fw-bold"><?= $isAr ? 'سيتم اعتماد الرحلة فوراً' : 'Trip will be immediately approved' ?></div>
            <div class="small"><?= $isAr ? 'بصفتك مدير المكتب، الرحلة تُعتمد تلقائياً عند الحفظ.' : 'As office manager, trips are auto-approved upon save.' ?></div>
        </div>
    </div>

    <div class="d-grid mb-4">
        <button type="submit" class="btn btn-primary btn-lg fw-bold py-3">
            <i class="fa-solid fa-circle-check me-2"></i>
            <?= $isAr ? 'حفظ واعتماد الرحلة' : 'Save & Approve Trip' ?>
        </button>
    </div>
</form>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const routeSelect = document.getElementById('routeSelect');
    const tripRate    = document.getElementById('tripRate');
    const tripCount   = document.getElementById('tripCount');
    const totalDisp   = document.getElementById('totalDisplay');
    const isAr        = <?= $isAr ? 'true' : 'false' ?>;
    const currency    = isAr ? 'د.ع' : 'IQD';

    function calcTotal() {
        const rate  = parseFloat(tripRate.value) || 0;
        const count = parseFloat(tripCount.value) || 1;
        const total = rate * count;
        totalDisp.textContent = new Intl.NumberFormat().format(total) + ' ' + currency;
    }

    routeSelect.addEventListener('change', function() {
        const sel = routeSelect.options[routeSelect.selectedIndex];
        const rate = sel.getAttribute('data-rate');
        if (rate) { tripRate.value = rate; calcTotal(); }
    });

    tripRate.addEventListener('input', calcTotal);
    tripCount.addEventListener('input', calcTotal);

    const mTripDate = document.getElementById('mTripDate');
    const mReturnDate = document.getElementById('mReturnDate');
    const mMultiDayBanner = document.getElementById('mMultiDayBanner');
    const mDutyDaysLabel = document.getElementById('mDutyDaysLabel');
    function updateMMultiDay() {
        if (!mTripDate || !mReturnDate || !mMultiDayBanner) return;
        if (mReturnDate.value && mTripDate.value && mReturnDate.value > mTripDate.value) {
            const d1 = new Date(mTripDate.value), d2 = new Date(mReturnDate.value);
            const diff = Math.round((d2 - d1) / 86400000) + 1;
            if (mDutyDaysLabel) mDutyDaysLabel.textContent = diff;
            mMultiDayBanner.style.display = 'block';
        } else {
            mMultiDayBanner.style.display = 'none';
        }
    }
    if (mReturnDate) mReturnDate.addEventListener('change', updateMMultiDay);
    if (mTripDate) mTripDate.addEventListener('change', updateMMultiDay);
});
</script>

<?php endif; ?>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
