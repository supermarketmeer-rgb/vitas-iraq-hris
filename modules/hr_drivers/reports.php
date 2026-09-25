<?php
/**
 * Reports & Analytics Module (التقارير والإحصائيات وتصدير البيانات)
 * Supports:
 * - Driver Trips Report by Period
 * - Office Trips Report
 * - Monthly Payroll Summary Report
 * - Top Active Drivers Report
 * - Cost Comparison Across Offices
 * - Direct Print & CSV/Excel Export
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('reports_view');

$pdo = getDBConnection();
$offices = getActiveOffices();

$reportType = $_GET['type'] ?? 'trips';
$dateFrom = $_GET['date_from'] ?? date('Y-m-01');
$dateTo = $_GET['date_to'] ?? date('Y-m-d');
$officeId = !empty($_GET['office_id']) ? (int)$_GET['office_id'] : null;
$month = (int)($_GET['month'] ?? date('m'));
$year = (int)($_GET['year'] ?? date('Y'));
$export = $_GET['export'] ?? '';

// CSV Export Handler
if ($export === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=report_' . $reportType . '_' . date('Ymd_His') . '.csv');
    // Output BOM for Arabic UTF-8 Excel compatibility
    echo "\xEF\xBB\xBF";
    $output = fopen('php://output', 'w');

    if ($reportType === 'trips') {
        fputcsv($output, ['رقم الرحلة', 'تاريخ الانطلاق', 'تاريخ العودة', 'أيام الدوام', 'المكتب', 'السائق', 'المسار', 'النوع', 'السعر', 'العدد', 'الإجمالي', 'الحالة']);
        $sql = "
            SELECT dt.trip_number, dt.trip_date, COALESCE(dt.return_date, dt.trip_date), dt.duty_days, o.name_ar, d.full_name, r.name, tt.name_ar as type_name,
                   dt.trip_rate, dt.trip_count, dt.total_amount, dt.status
            FROM drv_driver_trips dt
            JOIN drv_offices o ON dt.office_id = o.id
            JOIN drv_drivers d ON dt.driver_id = d.id
            JOIN drv_trip_routes r ON dt.route_id = r.id
            JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
            WHERE dt.trip_date BETWEEN ? AND ? " . ($officeId ? "AND dt.office_id = $officeId" : "") . "
            ORDER BY dt.trip_date DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$dateFrom, $dateTo]);
        while ($row = $stmt->fetch(\PDO::FETCH_NUM)) {
            fputcsv($output, $row);
        }
    } elseif ($reportType === 'payroll') {
        fputcsv($output, ['كود الكشف', 'الشهر', 'السنة', 'المكتب', 'السائق', 'الأساسي', 'الرحلات المعتمدة', 'البدلات', 'الخصومات', 'صافي الراتب', 'الحالة']);
        $sql = "
            SELECT p.payroll_code, p.month, p.year, o.name_ar, d.full_name,
                   p.base_salary, p.approved_trips_amount,
                   (p.transport_allowance + p.fuel_allowance + p.additions_amount),
                   (p.deductions_amount + p.advances_amount), p.net_salary, p.status
            FROM drv_payrolls p
            JOIN drv_offices o ON p.office_id = o.id
            JOIN drv_drivers d ON p.driver_id = d.id
            WHERE p.month = ? AND p.year = ? " . ($officeId ? "AND p.office_id = $officeId" : "") . "
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$month, $year]);
        while ($row = $stmt->fetch(\PDO::FETCH_NUM)) {
            fputcsv($output, $row);
        }
    }
    fclose($output);
    exit;
}

// Data fetching based on reportType
$tripsData = [];
$payrollData = [];
$topDrivers = [];
$officeComparison = [];

if ($reportType === 'trips') {
    $where = ["dt.trip_date BETWEEN ? AND ?"];
    $params = [$dateFrom, $dateTo];
    if ($officeId) {
        $where[] = "dt.office_id = ?";
        $params[] = $officeId;
    }
    $whereClause = implode(" AND ", $where);

    $stmt = $pdo->prepare("
        SELECT dt.*, o.name_ar as office_name, d.full_name as driver_name, d.driver_number,
               r.name as route_name, tt.name_ar as trip_type_name
        FROM drv_driver_trips dt
        JOIN drv_offices o ON dt.office_id = o.id
        JOIN drv_drivers d ON dt.driver_id = d.id
        JOIN drv_trip_routes r ON dt.route_id = r.id
        JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
        WHERE {$whereClause}
        ORDER BY dt.trip_date DESC
    ");
    $stmt->execute($params);
    $tripsData = $stmt->fetchAll();
} elseif ($reportType === 'payroll') {
    $where = ["p.month = ?", "p.year = ?"];
    $params = [$month, $year];
    if ($officeId) {
        $where[] = "p.office_id = ?";
        $params[] = $officeId;
    }
    $whereClause = implode(" AND ", $where);

    $stmt = $pdo->prepare("
        SELECT p.*, o.name_ar as office_name, d.full_name as driver_name, d.employee_code, d.driver_number
        FROM drv_payrolls p
        JOIN drv_offices o ON p.office_id = o.id
        JOIN drv_drivers d ON p.driver_id = d.id
        WHERE {$whereClause}
        ORDER BY p.office_id ASC, d.full_name ASC
    ");
    $stmt->execute($params);
    $payrollData = $stmt->fetchAll();
} elseif ($reportType === 'top_drivers') {
    $stmt = $pdo->prepare("
        SELECT d.full_name, d.driver_number, o.name_ar as office_name,
               COUNT(dt.id) as total_trips,
               SUM(dt.trip_count) as total_count,
               SUM(dt.total_amount) as total_revenue
        FROM drv_driver_trips dt
        JOIN drv_drivers d ON dt.driver_id = d.id
        JOIN drv_offices o ON dt.office_id = o.id
        WHERE dt.status = 'approved' AND dt.trip_date BETWEEN ? AND ?
        GROUP BY dt.driver_id
        ORDER BY total_revenue DESC
        LIMIT 10
    ");
    $stmt->execute([$dateFrom, $dateTo]);
    $topDrivers = $stmt->fetchAll();
} elseif ($reportType === 'office_cost') {
    $stmt = $pdo->prepare("
        SELECT o.name_ar as office_name, o.city,
               COUNT(dt.id) as trips_count,
               COALESCE(SUM(dt.total_amount), 0) as total_trips_cost,
               COALESCE(AVG(dt.trip_rate), 0) as avg_trip_rate
        FROM drv_offices o
        LEFT JOIN drv_driver_trips dt ON o.id = dt.office_id AND dt.status = 'approved' AND dt.trip_date BETWEEN ? AND ?
        GROUP BY o.id
        ORDER BY total_trips_cost DESC
    ");
    $stmt->execute([$dateFrom, $dateTo]);
    $officeComparison = $stmt->fetchAll();
}
?>

<div class="d-flex justify-content-between align-items-center mb-4 no-print">
    <div>
        <h3 class="fw-bold mb-1">التقارير والتحليلات الشاملة</h3>
        <p class="text-muted mb-0">توليد تقارير الرحلات والمكاتب والرواتب، التصدير إلى Excel/CSV والطباعة المباشرة</p>
    </div>
    <div class="d-flex gap-2">
        <button onclick="window.print()" class="btn btn-dark">
            <i class="fa-solid fa-print me-1"></i> طباعة التقرير
        </button>
        <?php
        $exportParams = $_GET;
        $exportParams['export'] = 'csv';
        $exportUrl = 'reports.php?' . http_build_query($exportParams);
        ?>
        <a href="<?= e($exportUrl) ?>" class="btn btn-success">
            <i class="fa-solid fa-file-excel me-1"></i> تصدير Excel / CSV
        </a>
    </div>
</div>

<!-- Report Navigation Tabs -->
<ul class="nav nav-pills mb-4 gap-2 no-print">
    <li class="nav-item">
        <a class="nav-link <?= $reportType === 'trips' ? 'active' : '' ?>" href="reports.php?type=trips">
            <i class="fa-solid fa-route me-1"></i> تقرير رحلات السائقين
        </a>
    </li>
    <li class="nav-item">
        <a class="nav-link <?= $reportType === 'payroll' ? 'active' : '' ?>" href="reports.php?type=payroll">
            <i class="fa-solid fa-receipt me-1"></i> تقرير الرواتب الشهرية
        </a>
    </li>
    <li class="nav-item">
        <a class="nav-link <?= $reportType === 'top_drivers' ? 'active' : '' ?>" href="reports.php?type=top_drivers">
            <i class="fa-solid fa-trophy me-1"></i> السائقين الأكثر نشاطاً
        </a>
    </li>
    <li class="nav-item">
        <a class="nav-link <?= $reportType === 'office_cost' ? 'active' : '' ?>" href="reports.php?type=office_cost">
            <i class="fa-solid fa-chart-pie me-1"></i> مقارنة تكاليف المكاتب
        </a>
    </li>
</ul>

<!-- Filter Bar -->
<div class="card mb-4 shadow-sm no-print">
    <div class="card-body">
        <form method="GET" action="reports.php" class="row g-2 align-items-end">
            <input type="hidden" name="type" value="<?= e($reportType) ?>">

            <?php if (in_array($reportType, ['trips', 'top_drivers', 'office_cost'])): ?>
                <div class="col-md-3">
                    <label class="form-label small fw-bold">من تاريخ</label>
                    <input type="date" name="date_from" class="form-control form-control-sm" value="<?= e($dateFrom) ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold">إلى تاريخ</label>
                    <input type="date" name="date_to" class="form-control form-control-sm" value="<?= e($dateTo) ?>">
                </div>
            <?php else: ?>
                <div class="col-md-3">
                    <label class="form-label small fw-bold">الشهر</label>
                    <select name="month" class="form-select form-select-sm">
                        <?php for ($m = 1; $m <= 12; $m++): ?>
                            <option value="<?= $m ?>" <?= $month === $m ? 'selected' : '' ?>>شهر <?= $m ?></option>
                        <?php endfor; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small fw-bold">السنة</label>
                    <select name="year" class="form-select form-select-sm">
                        <?php for ($y = date('Y'); $y >= 2024; $y--): ?>
                            <option value="<?= $y ?>" <?= $year === $y ? 'selected' : '' ?>><?= $y ?></option>
                        <?php endfor; ?>
                    </select>
                </div>
            <?php endif; ?>

            <?php if ($reportType !== 'office_cost'): ?>
                <div class="col-md-4">
                    <label class="form-label small fw-bold">تحديد المكتب</label>
                    <select name="office_id" class="form-select form-select-sm">
                        <option value="">كافة المكاتب والفروع</option>
                        <?php foreach ($offices as $off): ?>
                            <option value="<?= $off['id'] ?>" <?= $officeId === (int)$off['id'] ? 'selected' : '' ?>>
                                <?= e($off['name_ar']) ?> (<?= e($off['city']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
            <?php endif; ?>

            <div class="col-md-2">
                <button type="submit" class="btn btn-primary btn-sm w-100 fw-bold">
                    <i class="fa-solid fa-filter me-1"></i> تطبيق الفلتر
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Print Header -->
<div class="d-none d-print-block mb-4 text-center border-bottom pb-3">
    <h3 class="fw-bold">نظام الموارد البشرية - موديول السائقين والرحلات والرواتب</h3>
    <h4>
        <?php
        if ($reportType === 'trips') echo "تقرير الرحلات المنفذة للفترة من {$dateFrom} إلى {$dateTo}";
        elseif ($reportType === 'payroll') echo "كشف الرواتب المعتمدة لشهر {$month} / {$year}";
        elseif ($reportType === 'top_drivers') echo "تقرير السائقين الأكثر نشاطاً وإيراداً";
        elseif ($reportType === 'office_cost') echo "تقرير مقارنة تكاليف الرحلات بين المكاتب";
        ?>
    </h4>
    <div class="small text-muted">تاريخ الطباعة: <?= date('Y-m-d H:i') ?> • تم الإنشاء بواسطة: <?= e(getCurrentUser()['full_name'] ?? 'النظام') ?></div>
</div>

<!-- Content by Type -->
<?php if ($reportType === 'trips'): ?>
    <div class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold">نتائج الرحلات (<?= count($tripsData) ?> رحلة)</span>
            <?php
            $sum = array_sum(array_column($tripsData, 'total_amount'));
            ?>
            <span class="fw-bold text-success">إجمالي القيمة: <?= formatMoney($sum) ?></span>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover table-striped align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>رقم الرحلة</th>
                            <th>التاريخ والوقت</th>
                            <th>المكتب</th>
                            <th>السائق</th>
                            <th>المسار</th>
                            <th>النوع</th>
                            <th>السعر المعتمد</th>
                            <th>العدد</th>
                            <th>الإجمالي</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($tripsData)): ?>
                            <tr><td colspan="10" class="text-center py-4 text-muted">لا توجد رحلات مطابقة للمعايير المحددة.</td></tr>
                        <?php else: ?>
                            <?php foreach ($tripsData as $t): ?>
                                <tr>
                                    <td class="fw-bold text-primary"><?= e($t['trip_number']) ?></td>
                                    <td>
                                        <div><?= formatDate($t['trip_date']) ?> <small class="text-muted"><?= $t['departure_time'] ?></small></div>
                                        <?php if (!empty($t['return_date']) && $t['return_date'] !== $t['trip_date']): ?>
                                            <span class="badge" style="background:#ede9fe; color:#3730a3; font-size:0.7rem;">
                                                ← عودة: <?= formatDate($t['return_date']) ?> (<?= $t['duty_days'] ?? 1 ?> أيام)
                                            </span>
                                        <?php endif; ?>
                                    </td>
                                    <td><?= e($t['office_name']) ?></td>
                                    <td><?= e($t['driver_name']) ?> (<?= e($t['driver_number']) ?>)</td>
                                    <td><?= e($t['departure_city']) ?> &larr; <?= e($t['arrival_city']) ?></td>
                                    <td><span class="badge bg-light text-dark border"><?= e($t['trip_type_name']) ?></span></td>
                                    <td><?= formatMoney($t['trip_rate']) ?></td>
                                    <td><?= $t['trip_count'] ?></td>
                                    <td class="fw-bold text-success"><?= formatMoney($t['total_amount']) ?></td>
                                    <td><?= getTripStatusBadge($t['status']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

<?php elseif ($reportType === 'payroll'): ?>
    <div class="card shadow-sm">
        <div class="card-header d-flex justify-content-between align-items-center">
            <span class="fw-bold">كشف رواتب شهر <?= $month ?> / <?= $year ?></span>
            <?php
            $sumNet = array_sum(array_column($payrollData, 'net_salary'));
            $sumTrips = array_sum(array_column($payrollData, 'approved_trips_amount'));
            ?>
            <span class="fw-bold text-primary">إجمالي الصافي المطلوب صرفه: <?= formatMoney($sumNet) ?></span>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover table-bordered align-middle mb-0 text-center">
                    <thead class="table-light">
                        <tr>
                            <th>رقم الكشف</th>
                            <th>السائق</th>
                            <th>المكتب</th>
                            <th>الأساسي</th>
                            <th>بدل نقل/وقود</th>
                            <th>الرحلات المعتمدة</th>
                            <th>إضافات</th>
                            <th>خصومات/سلف</th>
                            <th>صافي الراتب</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($payrollData)): ?>
                            <tr><td colspan="10" class="text-center py-4 text-muted">لا توجد كشوفات رواتب صادرة لهذا الشهر.</td></tr>
                        <?php else: ?>
                            <?php foreach ($payrollData as $p): ?>
                                <tr>
                                    <td class="fw-bold text-primary"><?= e($p['payroll_code']) ?></td>
                                    <td class="text-start"><?= e($p['driver_name']) ?> (<?= e($p['driver_number']) ?>)</td>
                                    <td><?= e($p['office_name']) ?></td>
                                    <td><?= formatMoney($p['base_salary']) ?></td>
                                    <td><?= formatMoney($p['transport_allowance'] + $p['fuel_allowance']) ?></td>
                                    <td class="fw-bold text-success"><?= formatMoney($p['approved_trips_amount']) ?> (<?= $p['approved_trips_count'] ?>)</td>
                                    <td><?= formatMoney($p['additions_amount']) ?></td>
                                    <td class="text-danger">- <?= formatMoney($p['deductions_amount'] + $p['advances_amount']) ?></td>
                                    <td class="fw-bold text-dark fs-6"><?= formatMoney($p['net_salary']) ?></td>
                                    <td><?= getPayrollStatusBadge($p['status']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

<?php elseif ($reportType === 'top_drivers'): ?>
    <div class="card shadow-sm">
        <div class="card-header fw-bold">
            <i class="fa-solid fa-ranking-star me-2 text-warning"></i>أفضل السائقين من حيث عدد الرحلات المعتمدة والإيرادات
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>المرتبة</th>
                            <th>السائق</th>
                            <th>المكتب</th>
                            <th>عدد السجلات</th>
                            <th>إجمالي الرحلات الفعلية</th>
                            <th>إجمالي المستحقات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($topDrivers)): ?>
                            <tr><td colspan="6" class="text-center py-4 text-muted">لا توجد بيانات للفترة المحددة.</td></tr>
                        <?php else: ?>
                            <?php foreach ($topDrivers as $idx => $td): ?>
                                <tr>
                                    <td>
                                        <span class="badge bg-<?= $idx === 0 ? 'warning' : ($idx === 1 ? 'secondary' : ($idx === 2 ? 'bronze' : 'light text-dark border')) ?> fs-6">
                                            #<?= $idx + 1 ?>
                                        </span>
                                    </td>
                                    <td class="fw-bold text-primary"><?= e($td['full_name']) ?> (<?= e($td['driver_number']) ?>)</td>
                                    <td><?= e($td['office_name']) ?></td>
                                    <td><?= $td['total_trips'] ?> سجل</td>
                                    <td><span class="badge bg-info-subtle text-info fs-6"><?= $td['total_count'] ?> رحلة</span></td>
                                    <td class="fw-bold text-success fs-6"><?= formatMoney($td['total_revenue']) ?></td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

<?php elseif ($reportType === 'office_cost'): ?>
    <div class="card shadow-sm">
        <div class="card-header fw-bold">
            <i class="fa-solid fa-building-columns me-2 text-primary"></i>مقارنة أداء وتكاليف الرحلات بين الفروع والمكاتب
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>المكتب</th>
                            <th>المدينة</th>
                            <th>عدد الرحلات المعتمدة</th>
                            <th>متوسط سعر الرحلة</th>
                            <th>إجمالي تكلفة الرحلات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($officeComparison as $oc): ?>
                            <tr>
                                <td class="fw-bold text-primary"><?= e($oc['office_name']) ?></td>
                                <td><?= e($oc['city']) ?></td>
                                <td><span class="badge bg-secondary-subtle text-secondary fs-6"><?= $oc['trips_count'] ?> رحلة</span></td>
                                <td><?= formatMoney($oc['avg_trip_rate']) ?></td>
                                <td class="fw-bold text-success fs-6"><?= formatMoney($oc['total_trips_cost']) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
<?php endif; ?>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
