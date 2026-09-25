<?php
/**
 * Create / Calculate Payroll for a Driver
 * STRICT BUSINESS RULE: Only APPROVED trips within the specified month are included.
 * Anti-duplicate: Checks if driver already has a payroll for the month/year.
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('payroll_create');

$pdo = getDBConnection();
$offices = getActiveOffices();

$selectedOfficeId = !empty($_GET['office_id']) ? (int)$_GET['office_id'] : ($offices[0]['id'] ?? 1);
$selectedDriverId = !empty($_GET['driver_id']) ? (int)$_GET['driver_id'] : null;
$selectedMonth = !empty($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
$selectedYear = !empty($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');

$previewData = null;
$errors = [];

// Fetch active drivers for office
$drivers = getDriversByOffice($selectedOfficeId);

if ($selectedDriverId) {
    try {
        $previewData = calculateDriverPayroll($selectedDriverId, $selectedMonth, $selectedYear);
    } catch (\Exception $e) {
        $errors[] = $e->getMessage();
    }
}

// Handle Form Submission to save payroll
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errors[] = 'رمز الأمان CSRF غير صالح.';
    }

    $driverId = (int)($_POST['driver_id'] ?? 0);
    $month = (int)($_POST['month'] ?? 0);
    $year = (int)($_POST['year'] ?? 0);
    $additions = (float)($_POST['additions_amount'] ?? 0);
    $deductions = (float)($_POST['deductions_amount'] ?? 0);
    $advances = (float)($_POST['advances_amount'] ?? 0);
    $notes = trim($_POST['notes'] ?? '');

    if ($driverId <= 0 || $month <= 0 || $year <= 0) {
        $errors[] = 'يرجى اختيار السائق والشهر والسنة بشكل صحيح.';
    }

    // Check duplicate payroll
    if (empty($errors)) {
        $chk = $pdo->prepare("SELECT id, payroll_code FROM drv_payrolls WHERE driver_id = ? AND month = ? AND year = ?");
        $chk->execute([$driverId, $month, $year]);
        $existing = $chk->fetch();
        if ($existing) {
            $errors[] = "تنبيه منع التكرار: يوجد كشف راتب مسجل مسبقاً لهذا السائق لنفس الشهر ({$existing['payroll_code']}).";
        }
    }

    if (empty($errors)) {
        try {
            $calc = calculateDriverPayroll($driverId, $month, $year, $additions, $deductions, $advances);
            $driver = $calc['driver'];
            $payrollCode = sprintf('PAY-%04d%02d-%03d', $year, $month, $driverId);

            $pdo->beginTransaction();

            $insPayroll = $pdo->prepare("
                INSERT INTO drv_payrolls (
                    payroll_code, driver_id, office_id, month, year,
                    base_salary, approved_trips_count, approved_trips_amount,
                    transport_allowance, fuel_allowance, additions_amount,
                    deductions_amount, advances_amount, net_salary, status, notes, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, 'calculated', ?, ?
                )
            ");
            $insPayroll->execute([
                $payrollCode, $driverId, $driver['office_id'], $month, $year,
                $calc['base_salary'], $calc['approved_trips_count'], $calc['approved_trips_amount'],
                $calc['transport_allowance'], $calc['fuel_allowance'], $additions,
                $deductions, $advances, $calc['net_salary'], $notes, getCurrentUser()['id'] ?? null
            ]);
            $payrollId = (int)$pdo->lastInsertId();

            // Insert itemized trip details and lock to this payroll
            $insDetail = $pdo->prepare("
                INSERT INTO drv_payroll_trip_details (
                    payroll_id, driver_trip_id, trip_date, route_name,
                    departure_city, arrival_city, trip_rate, trip_count, total_amount
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $updTrip = $pdo->prepare("UPDATE drv_driver_trips SET payroll_id = ? WHERE id = ?");

            foreach ($calc['trips_details'] as $tripItem) {
                // Fetch route name
                $rName = $pdo->query("SELECT name FROM drv_trip_routes WHERE id = {$tripItem['route_id']}")->fetchColumn() ?: 'مسار رحلة';
                $insDetail->execute([
                    $payrollId, $tripItem['id'], $tripItem['trip_date'], $rName,
                    $tripItem['departure_city'], $tripItem['arrival_city'],
                    $tripItem['trip_rate'], $tripItem['trip_count'], $tripItem['total_amount']
                ]);
                $updTrip->execute([$payrollId, $tripItem['id']]);
            }

            $pdo->commit();
            logAudit('CREATE_PAYROLL', 'payrolls', $payrollId, null, ['code' => $payrollCode, 'net' => $calc['net_salary']]);

            header("Location: payroll_view.php?id={$payrollId}&msg=calculated");
            exit;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            error_log('Payroll creation error: ' . $e->getMessage());
            $errors[] = 'تعذر إنشاء كشف الراتب: ' . $e->getMessage();
        }
    }
}
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1">احتساب راتب سائق جديد</h3>
        <p class="text-muted mb-0">جلب الرحلات المعتمدة لشهر محدد واحتساب الصافي بموجب المعادلة الرسمية</p>
    </div>
    <a href="payroll.php" class="btn btn-outline-secondary">
        <i class="fa-solid fa-arrow-right me-1"></i> العودة لكشوفات الرواتب
    </a>
</div>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger alert-dismissible fade show">
        <h6 class="fw-bold mb-2"><i class="fa-solid fa-triangle-exclamation me-2"></i>تعذر الاحتساب للأسباب التالية:</h6>
        <ul class="mb-0">
            <?php foreach ($errors as $err): ?>
                <li><?= e($err) ?></li>
            <?php endforeach; ?>
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<!-- Selection Form -->
<div class="card shadow-sm mb-4">
    <div class="card-header bg-light fw-bold">
        <i class="fa-solid fa-user-check me-2 text-primary"></i>1. تحديد المكتب والسائق وفترة الراتب
    </div>
    <div class="card-body">
        <form method="GET" action="payroll_create.php" class="row g-3 align-items-end">
            <div class="col-md-3">
                <label class="form-label fw-bold">المكتب</label>
                <select name="office_id" class="form-select" onchange="this.form.submit()">
                    <?php foreach ($offices as $off): ?>
                        <option value="<?= $off['id'] ?>" <?= $selectedOfficeId === (int)$off['id'] ? 'selected' : '' ?>>
                            <?= e($off['name_ar']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-4">
                <label class="form-label fw-bold">السائق <span class="text-danger">*</span></label>
                <select name="driver_id" class="form-select" required onchange="this.form.submit()">
                    <option value="">-- اختر السائق لتوليد الكشف --</option>
                    <?php foreach ($drivers as $d): ?>
                        <option value="<?= $d['id'] ?>" <?= $selectedDriverId === (int)$d['id'] ? 'selected' : '' ?>>
                            <?= e($d['full_name']) ?> (<?= e($d['driver_number']) ?>)
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="col-md-2">
                <label class="form-label fw-bold">الشهر</label>
                <select name="month" class="form-select" onchange="this.form.submit()">
                    <?php for ($m = 1; $m <= 12; $m++): ?>
                        <option value="<?= $m ?>" <?= $selectedMonth === $m ? 'selected' : '' ?>>شهر <?= $m ?></option>
                    <?php endfor; ?>
                </select>
            </div>

            <div class="col-md-2">
                <label class="form-label fw-bold">السنة</label>
                <select name="year" class="form-select" onchange="this.form.submit()">
                    <?php for ($y = date('Y'); $y >= 2024; $y--): ?>
                        <option value="<?= $y ?>" <?= $selectedYear === $y ? 'selected' : '' ?>><?= $y ?></option>
                    <?php endfor; ?>
                </select>
            </div>

            <div class="col-md-1">
                <button type="submit" class="btn btn-primary w-100" title="تحميل البيانات">
                    <i class="fa-solid fa-arrows-rotate"></i>
                </button>
            </div>
        </form>
    </div>
</div>

<?php if ($previewData): ?>
    <form method="POST" action="payroll_create.php" id="payrollForm">
        <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
        <input type="hidden" name="office_id" value="<?= $selectedOfficeId ?>">
        <input type="hidden" name="driver_id" value="<?= $selectedDriverId ?>">
        <input type="hidden" name="month" value="<?= $selectedMonth ?>">
        <input type="hidden" name="year" value="<?= $selectedYear ?>">

        <div class="row g-4 mb-4">
            <!-- Salary Components -->
            <div class="col-lg-6">
                <div class="card shadow-sm h-100">
                    <div class="card-header fw-bold bg-light">
                        <i class="fa-solid fa-scale-balanced me-2 text-primary"></i>2. مكونات الراتب والمعادلة
                    </div>
                    <div class="card-body p-4">
                        <table class="table table-bordered align-middle">
                            <tr class="table-light">
                                <th class="w-50">الراتب الأساسي التعاقدي</th>
                                <td class="fw-bold text-dark fs-6"><?= formatMoney($previewData['base_salary']) ?></td>
                            </tr>
                            <tr>
                                <th>بدل النقل</th>
                                <td class="text-info fw-bold"><?= formatMoney($previewData['transport_allowance']) ?></td>
                            </tr>
                            <tr>
                                <th>بدل الوقود</th>
                                <td class="text-warning fw-bold"><?= formatMoney($previewData['fuel_allowance']) ?></td>
                            </tr>
                            <tr class="table-success">
                                <th>
                                    إجمالي الرحلات المعتمدة
                                    <div class="small text-muted fw-normal">(عدد: <?= $previewData['approved_trips_count'] ?> رحلة معتمدة فقط)</div>
                                </th>
                                <td class="fw-bold text-success fs-5"><?= formatMoney($previewData['approved_trips_amount']) ?></td>
                            </tr>
                            <tr>
                                <th>إضافات ومكافآت (<?= DEFAULT_CURRENCY ?>)</th>
                                <td>
                                    <input type="number" step="1000" name="additions_amount" id="additionsInput" class="form-control form-control-sm" value="0">
                                </td>
                            </tr>
                            <tr>
                                <th>خصومات وغياب (<?= DEFAULT_CURRENCY ?>)</th>
                                <td>
                                    <input type="number" step="1000" name="deductions_amount" id="deductionsInput" class="form-control form-control-sm" value="0">
                                </td>
                            </tr>
                            <tr>
                                <th>سلف مستردة (<?= DEFAULT_CURRENCY ?>)</th>
                                <td>
                                    <input type="number" step="1000" name="advances_amount" id="advancesInput" class="form-control form-control-sm" value="0">
                                </td>
                            </tr>
                            <tr class="table-primary">
                                <th class="fs-5">صافي الراتب المستحق</th>
                                <td class="fw-bold text-primary fs-4" id="netSalaryDisplay">
                                    <?= formatMoney($previewData['net_salary']) ?>
                                </td>
                            </tr>
                        </table>

                        <div class="mb-3">
                            <label class="form-label fw-bold">ملاحظات الكشف</label>
                            <input type="text" name="notes" class="form-control" placeholder="ملاحظات محاسبية إضافية...">
                        </div>

                        <div class="d-grid mt-4">
                            <button type="submit" class="btn btn-success btn-lg fw-bold">
                                <i class="fa-solid fa-floppy-disk me-2"></i> حفظ واحتساب كشف الراتب
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Itemized Approved Trips List contributing to this payroll -->
            <div class="col-lg-6">
                <div class="card shadow-sm h-100">
                    <div class="card-header bg-light d-flex justify-content-between align-items-center">
                        <span class="fw-bold"><i class="fa-solid fa-list-check me-2 text-success"></i>الرحلات المعتمدة المساهمة (<?= count($previewData['trips_details']) ?>)</span>
                        <span class="badge bg-success">Approved Only</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 480px; overflow-y: auto;">
                            <table class="table table-hover table-striped align-middle mb-0 small">
                                <thead class="sticky-top bg-light">
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>المدينة (من &rarr; إلى)</th>
                                        <th>السعر</th>
                                        <th>العدد</th>
                                        <th>الإجمالي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php if (empty($previewData['trips_details'])): ?>
                                        <tr>
                                            <td colspan="5" class="text-center py-4 text-muted">
                                                لا توجد رحلات معتمدة لهذا السائق خلال هذا الشهر.
                                                <div class="text-info mt-1 small">تأكد من اعتماد الرحلات أولاً من شاشة مراجعة الرحلات.</div>
                                            </td>
                                        </tr>
                                    <?php else: ?>
                                        <?php foreach ($previewData['trips_details'] as $t): ?>
                                            <tr>
                                                <td><?= formatDate($t['trip_date']) ?></td>
                                                <td><?= e($t['departure_city']) ?> &larr; <?= e($t['arrival_city']) ?></td>
                                                <td><?= formatMoney($t['trip_rate']) ?></td>
                                                <td><?= $t['trip_count'] ?></td>
                                                <td class="fw-bold text-success"><?= formatMoney($t['total_amount']) ?></td>
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
    </form>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        const base = <?= (float)$previewData['base_salary'] ?>;
        const transport = <?= (float)$previewData['transport_allowance'] ?>;
        const fuel = <?= (float)$previewData['fuel_allowance'] ?>;
        const trips = <?= (float)$previewData['approved_trips_amount'] ?>;

        const addInput = document.getElementById('additionsInput');
        const dedInput = document.getElementById('deductionsInput');
        const advInput = document.getElementById('advancesInput');
        const netDisplay = document.getElementById('netSalaryDisplay');

        function recalculate() {
            const additions = parseFloat(addInput.value) || 0;
            const deductions = parseFloat(dedInput.value) || 0;
            const advances = parseFloat(advInput.value) || 0;

            const net = Math.max(0, (base + transport + fuel + trips + additions) - (deductions + advances));
            netDisplay.textContent = new Intl.NumberFormat().format(net) + ' د.ع';
        }

        addInput.addEventListener('input', recalculate);
        dedInput.addEventListener('input', recalculate);
        advInput.addEventListener('input', recalculate);
    });
    </script>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
