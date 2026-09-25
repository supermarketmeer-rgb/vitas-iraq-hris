<?php
/**
 * Trip Review & Approval Screen (مراجعة واعتماد الرحلات)
 * Allows HR Manager / Authorized user to approve or reject pending trips.
 * Records reviewer, datetime, and mandatory rejection reason.
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('trips_approve');

$pdo = getDBConnection();
$currentUser = getCurrentUser();

$successMsg = '';
$errorMsg = '';

// Handle Individual Action (Approve / Reject / Unapprove)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errorMsg = 'رمز الأمان CSRF غير صالح.';
    } else {
        $action = $_POST['action'] ?? '';
        $tripId = (int)($_POST['trip_id'] ?? 0);
        $reason = trim($_POST['rejection_reason'] ?? '');

        $tripStmt = $pdo->prepare("SELECT * FROM drv_driver_trips WHERE id = ?");
        $tripStmt->execute([$tripId]);
        $trip = $tripStmt->fetch();

        if (!$trip) {
            $errorMsg = 'الرحلة غير موجودة.';
        } elseif ($action === 'approve') {
            $upd = $pdo->prepare("
                UPDATE drv_driver_trips SET
                    status = 'approved',
                    reviewed_by = ?,
                    reviewed_at = NOW(),
                    rejection_reason = NULL
                WHERE id = ?
            ");
            $upd->execute([$currentUser['id'], $tripId]);
            logAudit('APPROVE_TRIP', 'driver_trips', $tripId, ['status' => $trip['status']], ['status' => 'approved']);
            $successMsg = "تم اعتماد الرحلة ({$trip['trip_number']}) بنجاح.";
        } elseif ($action === 'reject') {
            if (empty($reason)) {
                $errorMsg = 'يرجى كتابة سبب الرفض لتسجيله في النظام.';
            } else {
                $upd = $pdo->prepare("
                    UPDATE drv_driver_trips SET
                        status = 'rejected',
                        reviewed_by = ?,
                        reviewed_at = NOW(),
                        rejection_reason = ?
                    WHERE id = ?
                ");
                $upd->execute([$currentUser['id'], $reason, $tripId]);
                logAudit('REJECT_TRIP', 'driver_trips', $tripId, ['status' => $trip['status']], ['status' => 'rejected', 'reason' => $reason]);
                $successMsg = "تم رفض الرحلة ({$trip['trip_number']}) مع تسجيل سبب الرفض.";
            }
        } elseif ($action === 'reopen') {
            // Check if already in payroll
            if (!empty($trip['payroll_id'])) {
                $errorMsg = 'لا يمكن إلغاء اعتماد رحلة تم إدراجها ضمن كشف راتب معتمد مسبقاً.';
            } else {
                $upd = $pdo->prepare("
                    UPDATE drv_driver_trips SET
                        status = 'pending',
                        reviewed_by = NULL,
                        reviewed_at = NULL
                    WHERE id = ?
                ");
                $upd->execute([$tripId]);
                logAudit('REOPEN_TRIP', 'driver_trips', $tripId, ['status' => $trip['status']], ['status' => 'pending']);
                $successMsg = "تمت إعادة فتح الرحلة للمراجعة.";
            }
        }
    }
}

// Fetch Pending and Recently Reviewed Trips
$pendingTrips = $pdo->query("
    SELECT dt.*, d.full_name as driver_name, d.driver_number, o.name_ar as office_name,
           r.name as route_name, tt.name_ar as trip_type_name
    FROM drv_driver_trips dt
    JOIN drv_drivers d ON dt.driver_id = d.id
    JOIN drv_offices o ON dt.office_id = o.id
    JOIN drv_trip_routes r ON dt.route_id = r.id
    JOIN drv_trip_types tt ON dt.trip_type_id = tt.id
    WHERE dt.status = 'pending'
    ORDER BY dt.trip_date ASC, dt.created_at ASC
")->fetchAll();

$recentReviewed = $pdo->query("
    SELECT dt.*, d.full_name as driver_name, d.driver_number, o.name_ar as office_name,
           r.name as route_name, u.full_name as reviewer_name
    FROM drv_driver_trips dt
    JOIN drv_drivers d ON dt.driver_id = d.id
    JOIN drv_offices o ON dt.office_id = o.id
    JOIN drv_trip_routes r ON dt.route_id = r.id
    LEFT JOIN drv_users u ON dt.reviewed_by = u.id
    WHERE dt.status IN ('approved', 'rejected')
    ORDER BY dt.reviewed_at DESC
    LIMIT 10
")->fetchAll();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1">مراجعة واعتماد رحلات Timesheet</h3>
        <p class="text-muted mb-0">اعتماد الرحلات المستحقة للرواتب، أو رفضها مع بيان السبب الرسمي</p>
    </div>
    <span class="badge bg-warning text-dark fs-6 px-3 py-2">
        <i class="fa-solid fa-hourglass-start me-1"></i> بانتظار الاعتماد: <?= count($pendingTrips) ?>
    </span>
</div>

<?php if ($successMsg): ?>
    <div class="alert alert-success alert-dismissible fade show">
        <i class="fa-solid fa-circle-check me-2"></i><?= e($successMsg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<?php if ($errorMsg): ?>
    <div class="alert alert-danger alert-dismissible fade show">
        <i class="fa-solid fa-triangle-exclamation me-2"></i><?= e($errorMsg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<!-- Pending Approval Table -->
<div class="card shadow-sm mb-4">
    <div class="card-header bg-warning-subtle d-flex justify-content-between align-items-center">
        <span class="fw-bold text-dark"><i class="fa-solid fa-stamp me-2 text-warning"></i>الرحلات المعلقة المطلوب اعتمادها</span>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th>رقم الرحلة</th>
                        <th>تاريخ ووقت الرحلة</th>
                        <th>المكتب</th>
                        <th>السائق</th>
                        <th>المسار ونوع الرحلة</th>
                        <th>سعر الوحدة</th>
                        <th>العدد</th>
                        <th>الإجمالي</th>
                        <th class="text-center" style="width: 220px;">قرار الاعتماد</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($pendingTrips)): ?>
                        <tr>
                            <td colspan="9" class="text-center py-5 text-muted">
                                <i class="fa-solid fa-circle-check text-success fs-2 mb-2 d-block"></i>
                                لا توجد رحلات معلقة حالياً، عمل رائع!
                            </td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($pendingTrips as $t): ?>
                            <tr>
                                <td class="fw-bold text-primary"><?= e($t['trip_number']) ?></td>
                                <td>
                                    <div class="fw-bold"><?= formatDate($t['trip_date']) ?></div>
                                    <?php if (!empty($t['return_date']) && $t['return_date'] !== $t['trip_date']): ?>
                                        <div class="mt-1">
                                            <div class="small fw-bold" style="color: #4f46e5;">
                                                <i class="fa-solid fa-arrow-left me-1"></i>العودة: <?= formatDate($t['return_date']) ?>
                                            </div>
                                            <div class="small text-muted"><?= $t['departure_time'] ?></div>
                                            <span class="badge mt-1" style="background:#ede9fe; color:#3730a3; border: 1px solid #c7d2fe;">
                                                <i class="fa-solid fa-calendar-days me-1"></i><?= $t['duty_days'] ?? 1 ?> أيام دوام
                                            </span>
                                        </div>
                                    <?php else: ?>
                                        <small class="text-muted"><?= $t['departure_time'] ?></small>
                                    <?php endif; ?>
                                </td>
                                <td><span class="badge bg-secondary-subtle text-secondary"><?= e($t['office_name']) ?></span></td>
                                <td>
                                    <span class="fw-bold"><?= e($t['driver_name']) ?></span>
                                    <div class="small text-muted"><?= e($t['driver_number']) ?></div>
                                </td>
                                <td>
                                    <span class="d-block fw-semibold small"><?= e($t['departure_city']) ?> &larr; <?= e($t['arrival_city']) ?></span>
                                    <small class="text-muted"><?= e($t['route_name']) ?></small>
                                    <?php if ($t['notes']): ?>
                                        <div class="small text-info"><i class="fa-regular fa-comment-dots me-1"></i><?= e($t['notes']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?= formatMoney($t['trip_rate']) ?>
                                    <?php if ($t['is_rate_manually_edited']): ?>
                                        <div class="badge bg-warning text-dark">* سعر معدل يدوياً: <?= e($t['rate_edit_reason']) ?></div>
                                    <?php endif; ?>
                                </td>
                                <td><span class="badge bg-info text-white fs-6"><?= $t['trip_count'] ?></span></td>
                                <td class="fw-bold text-success fs-6"><?= formatMoney($t['total_amount']) ?></td>
                                <td class="text-center">
                                    <div class="d-flex justify-content-center gap-2">
                                        <!-- Quick Approve Form -->
                                        <form method="POST" action="trip_approval.php" onsubmit="return confirm('هل أنت متأكد من اعتماد هذه الرحلة؟');">
                                            <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                            <input type="hidden" name="action" value="approve">
                                            <input type="hidden" name="trip_id" value="<?= $t['id'] ?>">
                                            <button type="submit" class="btn btn-sm btn-success fw-bold">
                                                <i class="fa-solid fa-check me-1"></i> اعتماد
                                            </button>
                                        </form>

                                        <!-- Reject Trigger Modal -->
                                        <button class="btn btn-sm btn-outline-danger" data-bs-toggle="modal" data-bs-target="#rejectModal<?= $t['id'] ?>">
                                            <i class="fa-solid fa-xmark me-1"></i> رفض
                                        </button>
                                    </div>
                                </td>
                            </tr>

                            <!-- Rejection Reason Modal -->
                            <div class="modal fade" id="rejectModal<?= $t['id'] ?>" tabindex="-1">
                                <div class="modal-dialog">
                                    <div class="modal-content">
                                        <form method="POST" action="trip_approval.php">
                                            <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                            <input type="hidden" name="action" value="reject">
                                            <input type="hidden" name="trip_id" value="<?= $t['id'] ?>">

                                            <div class="modal-header bg-danger text-white">
                                                <h5 class="modal-title fw-bold">تسجيل رفض الرحلة: <?= e($t['trip_number']) ?></h5>
                                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                                            </div>
                                            <div class="modal-body">
                                                <p class="text-muted small">
                                                    السائق: <strong><?= e($t['driver_name']) ?></strong> | القيمة: <strong><?= formatMoney($t['total_amount']) ?></strong>
                                                </p>
                                                <div class="mb-3">
                                                    <label class="form-label fw-bold">سبب الرفض الرسمي <span class="text-danger">*</span></label>
                                                    <textarea name="rejection_reason" class="form-control" rows="3" required placeholder="مثال: عدم وجود إذن حركة رسمي، المسار غير مسجل لدى الإدارة، تكرار مسار..."></textarea>
                                                </div>
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-light" data-bs-dismiss="modal">تراجع</button>
                                                <button type="submit" class="btn btn-danger fw-bold">تأكيد الرفض</button>
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

<!-- Recently Reviewed Trips -->
<div class="card shadow-sm">
    <div class="card-header fw-bold">
        <i class="fa-solid fa-clock-rotate-left me-2 text-primary"></i>آخر القرارات المتخذة (المعتمدة والمرفوضة)
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 small">
                <thead>
                    <tr>
                        <th>رقم الرحلة</th>
                        <th>تاريخ الرحلة</th>
                        <th>السائق والمكتب</th>
                        <th>المسار</th>
                        <th>القيمة</th>
                        <th>الحالة</th>
                        <th>المراجع ووقت المراجعة</th>
                        <th>الملاحظات / سبب الرفض</th>
                        <th>إجراء</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recentReviewed as $r): ?>
                        <tr>
                            <td class="fw-bold"><?= e($r['trip_number']) ?></td>
                            <td>
                                <div><?= formatDate($r['trip_date']) ?></div>
                                <?php if (!empty($r['return_date']) && $r['return_date'] !== $r['trip_date']): ?>
                                    <span class="badge" style="background:#ede9fe; color:#3730a3; font-size: 0.72rem; border: 1px solid #c7d2fe;">
                                        العودة: <?= formatDate($r['return_date']) ?> (<?= $r['duty_days'] ?? 1 ?> أيام)
                                    </span>
                                <?php endif; ?>
                            </td>
                            <td><?= e($r['driver_name']) ?> (<?= e($r['office_name']) ?>)</td>
                            <td><?= e($r['route_name']) ?></td>
                            <td class="fw-bold"><?= formatMoney($r['total_amount']) ?></td>
                            <td><?= getTripStatusBadge($r['status']) ?></td>
                            <td>
                                <div><?= e($r['reviewer_name'] ?: 'النظام') ?></div>
                                <span class="text-muted" style="font-size: 0.75rem;"><?= formatDateTime($r['reviewed_at']) ?></span>
                            </td>
                            <td>
                                <?php if ($r['status'] === 'rejected'): ?>
                                    <span class="text-danger fw-semibold"><i class="fa-solid fa-circle-exclamation me-1"></i><?= e($r['rejection_reason']) ?></span>
                                <?php else: ?>
                                    <span class="text-muted">-</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <form method="POST" action="trip_approval.php" onsubmit="return confirm('إلغاء الاعتماد وإعادة الرحلة للمراجعة؟');">
                                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                    <input type="hidden" name="action" value="reopen">
                                    <input type="hidden" name="trip_id" value="<?= $r['id'] ?>">
                                    <button type="submit" class="btn btn-sm btn-outline-warning" title="إلغاء الاعتماد / إعادة فتح">
                                        <i class="fa-solid fa-undo"></i>
                                    </button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
