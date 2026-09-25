<?php
/**
 * Driver Payroll Detail & Official Voucher
 * Detailed breakdown, contributing trips itemized table, and printable voucher.
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('payroll_view');

$pdo = getDBConnection();
$payrollId = (int)($_GET['id'] ?? 0);

$stmt = $pdo->prepare("
    SELECT p.*, d.full_name as driver_name, d.employee_code, d.driver_number, d.phone as driver_phone,
           d.national_id, d.license_number, o.name_ar as office_name, o.city as office_city,
           u_app.full_name as approver_name, u_reopen.full_name as reopener_name
    FROM drv_payrolls p
    JOIN drv_drivers d ON p.driver_id = d.id
    JOIN drv_offices o ON p.office_id = o.id
    LEFT JOIN drv_users u_app ON p.approved_by = u_app.id
    LEFT JOIN drv_users u_reopen ON p.reopened_by = u_reopen.id
    WHERE p.id = ?
");
$stmt->execute([$payrollId]);
$payroll = $stmt->fetch();

if (!$payroll) {
    die('كشف الراتب غير موجود.');
}

// Fetch itemized trip details
$detailsStmt = $pdo->prepare("
    SELECT * FROM drv_payroll_trip_details
    WHERE payroll_id = ?
    ORDER BY trip_date ASC
");
$detailsStmt->execute([$payrollId]);
$tripItems = $detailsStmt->fetchAll();
?>

<div class="d-flex justify-content-between align-items-center mb-4 no-print">
    <div>
        <div class="d-flex align-items-center gap-2 mb-1">
            <h3 class="fw-bold mb-0">كشف راتب السائق: <?= e($payroll['driver_name']) ?></h3>
            <span class="badge bg-secondary"><?= e($payroll['payroll_code']) ?></span>
            <?= getPayrollStatusBadge($payroll['status']) ?>
        </div>
        <p class="text-muted mb-0">لشهر <?= $payroll['month'] ?> / <?= $payroll['year'] ?> • المكتب: <?= e($payroll['office_name']) ?></p>
    </div>
    <div class="d-flex gap-2">
        <a href="payroll.php" class="btn btn-outline-secondary">
            <i class="fa-solid fa-arrow-right me-1"></i> قائمة الرواتب
        </a>
        <button onclick="window.print()" class="btn btn-dark">
            <i class="fa-solid fa-print me-1"></i> طباعة كشف الراتب
        </button>
    </div>
</div>

<!-- Printable Voucher Area -->
<div class="card shadow-sm mb-4 border" id="printableVoucher">
    <div class="card-body p-4 p-md-5">
        <!-- Official Header for Print -->
        <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <div>
                <h4 class="fw-bold text-primary mb-1">المؤسسة - إدارة الموارد البشرية HR</h4>
                <div class="text-muted small">قسم الحركة والمركبات • كشف مستحقات وساعات السائقين</div>
            </div>
            <div class="text-end">
                <h5 class="fw-bold mb-0"><?= e($payroll['payroll_code']) ?></h5>
                <div class="small text-muted">تاريخ الإصدار: <?= formatDate($payroll['created_at']) ?></div>
            </div>
        </div>

        <!-- Driver Info Box -->
        <div class="bg-light p-3 rounded-3 mb-4 border">
            <div class="row g-3">
                <div class="col-md-4">
                    <span class="text-muted small d-block">اسم السائق الكامل:</span>
                    <span class="fw-bold fs-6"><?= e($payroll['driver_name']) ?></span>
                </div>
                <div class="col-md-2">
                    <span class="text-muted small d-block">الرقم الوظيفي:</span>
                    <span class="fw-bold"><?= e($payroll['employee_code']) ?></span>
                </div>
                <div class="col-md-2">
                    <span class="text-muted small d-block">رقم السائق:</span>
                    <span class="fw-bold"><?= e($payroll['driver_number']) ?></span>
                </div>
                <div class="col-md-2">
                    <span class="text-muted small d-block">المكتب / الفرع:</span>
                    <span class="fw-bold"><?= e($payroll['office_name']) ?></span>
                </div>
                <div class="col-md-2">
                    <span class="text-muted small d-block">فترة الاستحقاق:</span>
                    <span class="fw-bold text-primary"><?= $payroll['month'] ?> / <?= $payroll['year'] ?></span>
                </div>
            </div>
        </div>

        <!-- Salary Breakdown Grid -->
        <div class="row g-4 mb-4">
            <div class="col-md-6">
                <h6 class="fw-bold text-primary border-bottom pb-2 mb-3">
                    <i class="fa-solid fa-circle-plus me-1 text-success"></i> الاستحقاقات والإضافات
                </h6>
                <table class="table table-sm table-bordered">
                    <tr>
                        <td class="text-muted">الراتب الأساسي التعاقدي</td>
                        <td class="fw-bold text-end"><?= formatMoney($payroll['base_salary']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-muted">بدل النقل</td>
                        <td class="fw-bold text-end"><?= formatMoney($payroll['transport_allowance']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-muted">بدل الوقود</td>
                        <td class="fw-bold text-end"><?= formatMoney($payroll['fuel_allowance']) ?></td>
                    </tr>
                    <tr class="table-success">
                        <td class="fw-bold text-success">إجمالي أجور الرحلات المعتمدة (<?= $payroll['approved_trips_count'] ?> رحلة)</td>
                        <td class="fw-bold text-success text-end"><?= formatMoney($payroll['approved_trips_amount']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-muted">مكافآت وإضافات أخرى</td>
                        <td class="fw-bold text-end"><?= formatMoney($payroll['additions_amount']) ?></td>
                    </tr>
                    <tr class="table-light fw-bold">
                        <td>إجمالي الاستحقاقات الإجمالية</td>
                        <td class="text-end">
                            <?= formatMoney($payroll['base_salary'] + $payroll['transport_allowance'] + $payroll['fuel_allowance'] + $payroll['approved_trips_amount'] + $payroll['additions_amount']) ?>
                        </td>
                    </tr>
                </table>
            </div>

            <div class="col-md-6">
                <h6 class="fw-bold text-danger border-bottom pb-2 mb-3">
                    <i class="fa-solid fa-circle-minus me-1 text-danger"></i> الاستقطاعات والخصومات
                </h6>
                <table class="table table-sm table-bordered">
                    <tr>
                        <td class="text-muted">الخصومات والغياب</td>
                        <td class="fw-bold text-danger text-end">- <?= formatMoney($payroll['deductions_amount']) ?></td>
                    </tr>
                    <tr>
                        <td class="text-muted">السلف المستردة</td>
                        <td class="fw-bold text-danger text-end">- <?= formatMoney($payroll['advances_amount']) ?></td>
                    </tr>
                    <tr class="table-light fw-bold">
                        <td>إجمالي الاستقطاعات</td>
                        <td class="text-danger text-end">- <?= formatMoney($payroll['deductions_amount'] + $payroll['advances_amount']) ?></td>
                    </tr>
                </table>

                <div class="p-3 bg-primary-subtle text-primary rounded-3 text-center mt-4">
                    <span class="fw-semibold d-block">صافي الراتب المستحق للصرف</span>
                    <h2 class="fw-bold my-1 text-primary"><?= formatMoney($payroll['net_salary']) ?></h2>
                    <span class="small text-muted">المعادلة: (الأساسي + البدلات + الرحلات المعتمدة + الإضافات) - (الخصومات + السلف)</span>
                </div>
            </div>
        </div>

        <!-- Detailed Trips Contributing to this Payroll -->
        <h6 class="fw-bold text-dark border-bottom pb-2 mb-3">
            <i class="fa-solid fa-list-check me-2 text-primary"></i>تفاصيل الرحلات المعتمدة التي ساهمت في احتساب الراتب
        </h6>

        <div class="table-responsive mb-4">
            <table class="table table-bordered table-sm align-middle text-center">
                <thead class="table-light">
                    <tr>
                        <th>#</th>
                        <th>التاريخ</th>
                        <th>الرحلة والمسار</th>
                        <th>مدينة الانطلاق</th>
                        <th>مدينة الوصول</th>
                        <th>السعر المعتمد</th>
                        <th>العدد</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($tripItems)): ?>
                        <tr>
                            <td colspan="8" class="text-muted py-3">لا توجد رحلات مسجلة في هذا الكشف.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($tripItems as $idx => $t): ?>
                            <tr>
                                <td><?= $idx + 1 ?></td>
                                <td><?= formatDate($t['trip_date']) ?></td>
                                <td class="text-start fw-semibold"><?= e($t['route_name']) ?></td>
                                <td><?= e($t['departure_city']) ?></td>
                                <td><?= e($t['arrival_city']) ?></td>
                                <td><?= formatMoney($t['trip_rate']) ?></td>
                                <td><?= $t['trip_count'] ?></td>
                                <td class="fw-bold text-success text-end"><?= formatMoney($t['total_amount']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                        <tr class="table-success fw-bold">
                            <td colspan="7" class="text-start">إجمالي قيمة الرحلات المساهمة:</td>
                            <td class="text-end fs-6"><?= formatMoney($payroll['approved_trips_amount']) ?></td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>

        <!-- Audit & Signatures -->
        <div class="row g-4 pt-4 border-top mt-4">
            <div class="col-4 text-center">
                <span class="fw-bold small text-muted d-block mb-4">إعداد مسؤول الرواتب</span>
                <span class="border-bottom d-inline-block w-75 pb-1">المحاسب المعتمد</span>
            </div>
            <div class="col-4 text-center">
                <span class="fw-bold small text-muted d-block mb-4">اعتماد مدير الموارد البشرية</span>
                <span class="border-bottom d-inline-block w-75 pb-1"><?= e($payroll['approver_name'] ?: 'قيد الاعتماد') ?></span>
            </div>
            <div class="col-4 text-center">
                <span class="fw-bold small text-muted d-block mb-4">توقيع واستلام السائق</span>
                <span class="border-bottom d-inline-block w-75 pb-1"><?= e($payroll['driver_name']) ?></span>
            </div>
        </div>

        <?php if ($payroll['reopen_reason']): ?>
            <div class="alert alert-warning mt-4 small">
                <i class="fa-solid fa-clock-rotate-left me-1"></i>
                <strong>سجل إعادة الفتح:</strong> أعيد فتح هذا الكشف بواسطة <strong><?= e($payroll['reopener_name'] ?: 'المشرف') ?></strong> بتاريخ <?= formatDateTime($payroll['reopened_at']) ?>.
                السبب: <em><?= e($payroll['reopen_reason']) ?></em>
            </div>
        <?php endif; ?>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
