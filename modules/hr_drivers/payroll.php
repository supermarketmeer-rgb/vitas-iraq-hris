<?php
/**
 * Driver Payroll Management (رواتب السائقين)
 * Lists generated payrolls, filtering by month, year, office, status.
 * Reopen & Approval workflows.
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('payroll_view');

$pdo = getDBConnection();
$currentUser = getCurrentUser();

$month = (int)($_GET['month'] ?? date('m'));
$year = (int)($_GET['year'] ?? date('Y'));
$officeId = !empty($_GET['office_id']) ? (int)$_GET['office_id'] : null;
$status = trim($_GET['status'] ?? '');

// Handle status updates (Approve / Mark as Paid / Reopen)
$msg = '';
$errMsg = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errMsg = 'رمز الأمان غير صالح.';
    } else {
        $payrollId = (int)($_POST['payroll_id'] ?? 0);
        $action = $_POST['action'] ?? '';

        $pStmt = $pdo->prepare("SELECT * FROM drv_payrolls WHERE id = ?");
        $pStmt->execute([$payrollId]);
        $currPayroll = $pStmt->fetch();

        if (!$currPayroll) {
            $errMsg = 'كشف الراتب غير موجود.';
        } elseif ($action === 'approve' && hasPermission('payroll_approve')) {
            $upd = $pdo->prepare("UPDATE drv_payrolls SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?");
            $upd->execute([$currentUser['id'], $payrollId]);
            logAudit('APPROVE_PAYROLL', 'payrolls', $payrollId, ['status' => $currPayroll['status']], ['status' => 'approved']);
            $msg = 'تم اعتماد كشف الراتب بنجاح.';
        } elseif ($action === 'pay' && hasPermission('payroll_approve')) {
            $upd = $pdo->prepare("UPDATE drv_payrolls SET status = 'paid' WHERE id = ?");
            $upd->execute([$payrollId]);
            logAudit('PAY_PAYROLL', 'payrolls', $payrollId, ['status' => $currPayroll['status']], ['status' => 'paid']);
            $msg = 'تم تأكيد صرف الراتب بنجاح.';
        } elseif ($action === 'reopen' && hasPermission('payroll_reopen')) {
            $reason = trim($_POST['reopen_reason'] ?? '');
            if (empty($reason)) {
                $errMsg = 'يرجى كتابة سبب إعادة فتح الكشف.';
            } else {
                $upd = $pdo->prepare("
                    UPDATE drv_payrolls SET
                        status = 'calculated',
                        reopened_by = ?,
                        reopened_at = NOW(),
                        reopen_reason = ?
                    WHERE id = ?
                ");
                $upd->execute([$currentUser['id'], $reason, $payrollId]);
                logAudit('REOPEN_PAYROLL', 'payrolls', $payrollId, ['status' => $currPayroll['status']], ['status' => 'calculated', 'reason' => $reason]);
                $msg = 'تمت إعادة فتح كشف الراتب للتعديل وإعادة الاحتساب.';
            }
        }
    }
}

// Build query
$where = ["1=1"];
$params = [];

if ($month > 0) {
    $where[] = "p.month = ?";
    $params[] = $month;
}
if ($year > 0) {
    $where[] = "p.year = ?";
    $params[] = $year;
}
if ($officeId) {
    $where[] = "p.office_id = ?";
    $params[] = $officeId;
}
if ($status !== '') {
    $where[] = "p.status = ?";
    $params[] = $status;
}

$whereClause = implode(" AND ", $where);

$query = "
    SELECT p.*, d.full_name as driver_name, d.driver_number, d.employee_code, o.name_ar as office_name
    FROM drv_payrolls p
    JOIN drv_drivers d ON p.driver_id = d.id
    JOIN drv_offices o ON p.office_id = o.id
    WHERE {$whereClause}
    ORDER BY p.id DESC
";
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$payrolls = $stmt->fetchAll();

// Totals
$totalNet = 0;
$totalTripsValue = 0;
foreach ($payrolls as $p) {
    $totalNet += (float)$p['net_salary'];
    $totalTripsValue += (float)$p['approved_trips_amount'];
}

$offices = getActiveOffices();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1">إدارة رواتب السائقين والمستحقات</h3>
        <p class="text-muted mb-0">احتساب الرواتب تلقائياً بناءً على الرحلات المعتمدة والبدلات والخصومات</p>
    </div>
    <div class="d-flex gap-2">
        <a href="reports.php?type=payroll&month=<?= $month ?>&year=<?= $year ?>" class="btn btn-outline-secondary">
            <i class="fa-solid fa-print me-1"></i> طباعة الكشف العام
        </a>
        <?php if (hasPermission('payroll_create')): ?>
            <a href="payroll_create.php" class="btn btn-primary">
                <i class="fa-solid fa-calculator me-1"></i> احتساب راتب جديد
            </a>
        <?php endif; ?>
    </div>
</div>

<?php if ($msg): ?>
    <div class="alert alert-success alert-dismissible fade show">
        <i class="fa-solid fa-circle-check me-2"></i><?= e($msg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<?php if ($errMsg): ?>
    <div class="alert alert-danger alert-dismissible fade show">
        <i class="fa-solid fa-triangle-exclamation me-2"></i><?= e($errMsg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<!-- Summary Cards for Current Selection -->
<div class="row g-3 mb-4">
    <div class="col-md-4">
        <div class="stat-card">
            <div class="stat-content">
                <span class="text-muted small fw-semibold d-block text-truncate">إجمالي الكشوفات المسجلة</span>
                <h4 class="stat-value fw-bold my-1"><?= count($payrolls) ?> كشف</h4>
                <span class="text-muted small d-block text-truncate">للفترة <?= $month ?> / <?= $year ?></span>
            </div>
            <div class="stat-icon bg-info-subtle text-info">
                <i class="fa-solid fa-users"></i>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="stat-card">
            <div class="stat-content">
                <span class="text-muted small fw-semibold d-block text-truncate">مستحقات الرحلات المعتمدة</span>
                <h4 class="stat-value stat-value-amount fw-bold my-1 text-success" title="<?= formatMoney($totalTripsValue) ?>"><?= formatMoney($totalTripsValue) ?></h4>
                <span class="text-muted small d-block text-truncate">المدرجة في الرواتب</span>
            </div>
            <div class="stat-icon bg-success-subtle text-success">
                <i class="fa-solid fa-route"></i>
            </div>
        </div>
    </div>
    <div class="col-md-4">
        <div class="stat-card">
            <div class="stat-content">
                <span class="text-muted small fw-semibold d-block text-truncate">صافي الرواتب الإجمالي</span>
                <h4 class="stat-value stat-value-amount fw-bold my-1 text-primary" title="<?= formatMoney($totalNet) ?>"><?= formatMoney($totalNet) ?></h4>
                <span class="text-muted small d-block text-truncate">شاملة البدلات والرحلات والخصومات</span>
            </div>
            <div class="stat-icon bg-primary-subtle text-primary">
                <i class="fa-solid fa-sack-dollar"></i>
            </div>
        </div>
    </div>
</div>

<!-- Filter Box -->
<div class="card mb-4 shadow-sm">
    <div class="card-body">
        <form method="GET" action="payroll.php" class="row g-2 align-items-end">
            <div class="col-md-2">
                <label class="form-label small fw-bold">الشهر</label>
                <select name="month" class="form-select form-select-sm">
                    <?php for ($m = 1; $m <= 12; $m++): ?>
                        <option value="<?= $m ?>" <?= $month === $m ? 'selected' : '' ?>>
                            شهر <?= $m ?> (<?= date('F', mktime(0,0,0,$m,10)) ?>)
                        </option>
                    <?php endfor; ?>
                </select>
            </div>
            <div class="col-md-2">
                <label class="form-label small fw-bold">السنة</label>
                <select name="year" class="form-select form-select-sm">
                    <?php for ($y = date('Y'); $y >= 2024; $y--): ?>
                        <option value="<?= $y ?>" <?= $year === $y ? 'selected' : '' ?>><?= $y ?></option>
                    <?php endfor; ?>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold">المكتب</label>
                <select name="office_id" class="form-select form-select-sm">
                    <option value="">كافة المكاتب</option>
                    <?php foreach ($offices as $off): ?>
                        <option value="<?= $off['id'] ?>" <?= $officeId === (int)$off['id'] ? 'selected' : '' ?>>
                            <?= e($off['name_ar']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-3">
                <label class="form-label small fw-bold">الحالة</label>
                <select name="status" class="form-select form-select-sm">
                    <option value="">كافة الحالات</option>
                    <option value="calculated" <?= $status === 'calculated' ? 'selected' : '' ?>>تم الاحتساب (Calculated)</option>
                    <option value="approved" <?= $status === 'approved' ? 'selected' : '' ?>>معتمد (Approved)</option>
                    <option value="paid" <?= $status === 'paid' ? 'selected' : '' ?>>مصروف (Paid)</option>
                </select>
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary btn-sm w-100">
                    <i class="fa-solid fa-filter me-1"></i> تصفية
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Payrolls Table -->
<div class="card shadow-sm">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th>رقم الكشف</th>
                        <th>السائق</th>
                        <th>المكتب</th>
                        <th>الشهر</th>
                        <th>الأساسي</th>
                        <th>الرحلات المعتمدة</th>
                        <th>البدلات</th>
                        <th>الخصومات/السلف</th>
                        <th>صافي الراتب</th>
                        <th>الحالة</th>
                        <th class="text-center">إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($payrolls)): ?>
                        <tr>
                            <td colspan="11" class="text-center py-5 text-muted">
                                لم يتم إصدار كشوفات رواتب لهذه الفترة. اضغط على <strong>احتساب راتب جديد</strong> للبدء.
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($payrolls as $p): ?>
                            <tr>
                                <td class="fw-bold text-primary"><?= e($p['payroll_code']) ?></td>
                                <td>
                                    <span class="fw-bold d-block"><?= e($p['driver_name']) ?></span>
                                    <small class="text-muted"><?= e($p['employee_code']) ?> (<?= e($p['driver_number']) ?>)</small>
                                </td>
                                <td><span class="badge bg-secondary-subtle text-secondary"><?= e($p['office_name']) ?></span></td>
                                <td><?= $p['month'] ?> / <?= $p['year'] ?></td>
                                <td><?= formatMoney($p['base_salary']) ?></td>
                                <td>
                                    <span class="fw-bold text-success"><?= formatMoney($p['approved_trips_amount']) ?></span>
                                    <span class="badge bg-light text-dark border small ms-1"><?= $p['approved_trips_count'] ?> رحلة</span>
                                </td>
                                <td class="text-info"><?= formatMoney($p['transport_allowance'] + $p['fuel_allowance'] + $p['additions_amount']) ?></td>
                                <td class="text-danger">- <?= formatMoney($p['deductions_amount'] + $p['advances_amount']) ?></td>
                                <td class="fw-bold text-primary fs-6"><?= formatMoney($p['net_salary']) ?></td>
                                <td><?= getPayrollStatusBadge($p['status']) ?></td>
                                <td class="text-center">
                                    <div class="btn-group btn-group-sm">
                                        <a href="payroll_view.php?id=<?= $p['id'] ?>" class="btn btn-outline-primary" title="عرض وتفاصيل الرحلات والطباعة">
                                            <i class="fa-solid fa-eye"></i> تفاصيل
                                        </a>

                                        <?php if ($p['status'] === 'calculated' && hasPermission('payroll_approve')): ?>
                                            <form method="POST" action="payroll.php" class="d-inline" onsubmit="return confirm('تأكيد اعتماد كشف الراتب نهائياً؟');">
                                                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                                <input type="hidden" name="action" value="approve">
                                                <input type="hidden" name="payroll_id" value="<?= $p['id'] ?>">
                                                <button type="submit" class="btn btn-outline-success" title="اعتماد">
                                                    <i class="fa-solid fa-check"></i>
                                                </button>
                                            </form>
                                        <?php endif; ?>

                                        <?php if ($p['status'] === 'approved' && hasPermission('payroll_reopen')): ?>
                                            <button class="btn btn-outline-warning" data-bs-toggle="modal" data-bs-target="#reopenModal<?= $p['id'] ?>" title="إلغاء الاعتماد / Reopen">
                                                <i class="fa-solid fa-lock-open"></i>
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>

                            <!-- Reopen Modal -->
                            <div class="modal fade" id="reopenModal<?= $p['id'] ?>" tabindex="-1">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <form method="POST" action="payroll.php">
                                            <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                            <input type="hidden" name="action" value="reopen">
                                            <input type="hidden" name="payroll_id" value="<?= $p['id'] ?>">

                                            <div class="modal-header bg-warning text-dark">
                                                <h5 class="modal-title fw-bold">إلغاء اعتماد الراتب (Reopen): <?= e($p['payroll_code']) ?></h5>
                                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <div class="alert alert-warning small">
                                                    <i class="fa-solid fa-triangle-exclamation me-1"></i>
                                                    تنبيه أمان: إعادة فتح كشف الراتب تسمح بتعديل الرحلات أو إعادة الحساب. سيتم تسجيل هذا الإجراء مع اسم المستخدم والتاريخ والسبب في Audit Log.
                                                </div>
                                                <div class="mb-3">
                                                    <label class="form-label fw-bold">سبب إعادة فتح الكشف <span class="text-danger">*</span></label>
                                                    <textarea name="reopen_reason" class="form-control" rows="3" required placeholder="اكتب سبب طلب إعادة الفتح (مثل: تصحيح رحلة سقطت سهواً، تعديل الخصم...)"></textarea>
                                                </div>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-light" data-bs-dismiss="modal">إلغاء</button>
                                                <button type="submit" class="btn btn-warning fw-bold">تأكيد إعادة الفتح</button>
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

<?php require_once __DIR__ . '/includes/footer.php'; ?>
