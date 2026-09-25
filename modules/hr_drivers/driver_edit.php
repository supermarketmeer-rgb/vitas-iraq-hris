<?php
/**
 * Edit Driver Profile (تعديل بيانات السائق)
 * Strict bilingual support, removed mother_name, added full_name_en
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('drivers_manage');

$pdo = getDBConnection();
$id = (int)($_GET['id'] ?? 0);
$isAr = isRtl();

$stmt = $pdo->prepare("SELECT * FROM drv_drivers WHERE id = ? AND deleted_at IS NULL");
$stmt->execute([$id]);
$driver = $stmt->fetch();

if (!$driver) {
    echo '<div class="card shadow-sm p-4 text-center my-4 border-warning">';
    echo '<div class="text-warning mb-3"><i class="fa-solid fa-triangle-exclamation fa-3x"></i></div>';
    echo '<h5 class="fw-bold">' . e($isAr ? 'السائق المطلوب غير موجود أو تم حذفه.' : 'The requested driver does not exist or has been deleted.') . '</h5>';
    echo '<div class="mt-3"><a href="drivers.php" class="btn btn-primary"><i class="fa-solid fa-arrow-left me-1"></i> ' . e(__('nav_drivers')) . '</a></div>';
    echo '</div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

// Quick status toggle
if (isset($_GET['action']) && $_GET['action'] === 'toggle_status') {
    $newStatus = ($driver['status'] === 'active') ? 'inactive' : 'active';
    $updateStatusStmt = $pdo->prepare("UPDATE drv_drivers SET status = ? WHERE id = ?");
    $updateStatusStmt->execute([$newStatus, $id]);
    logAudit('UPDATE_STATUS', 'drivers', $id, ['status' => $driver['status']], ['status' => $newStatus]);
    header("Location: drivers.php?msg=status_updated");
    exit;
}

$offices = getActiveOffices();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errors[] = $isAr ? 'رمز الأمان غير صالح.' : 'Invalid security token.';
    }

    $fullName = trim($_POST['full_name'] ?? '');
    $fullNameEn = trim($_POST['full_name_en'] ?? '');
    $fatherName = trim($_POST['father_name'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $nationalId = trim($_POST['national_id'] ?? '');
    $licenseNumber = trim($_POST['license_number'] ?? '');
    $licenseType = $_POST['license_type'] ?? 'عمومي';
    $licenseIssueDate = !empty($_POST['license_issue_date']) ? $_POST['license_issue_date'] : null;
    $licenseExpiryDate = !empty($_POST['license_expiry_date']) ? $_POST['license_expiry_date'] : null;
    $officeId = (int)($_POST['office_id'] ?? 0);
    $status = $_POST['status'] ?? 'active';
    $hireDate = !empty($_POST['hire_date']) ? $_POST['hire_date'] : $driver['hire_date'];
    $terminationDate = !empty($_POST['termination_date']) ? $_POST['termination_date'] : null;
    $notes = trim($_POST['notes'] ?? '');

    if (empty($fullName)) $errors[] = $isAr ? 'اسم السائق الكامل مطلوب' : 'Driver full name is required';
    if (empty($phone)) $errors[] = $isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    if (empty($nationalId)) $errors[] = $isAr ? 'رقم الهوية مطلوب' : 'National ID is required';
    if ($officeId <= 0) $errors[] = $isAr ? 'المكتب مطلوب' : 'Office is required';

    if (empty($errors)) {
        try {
            $updateStmt = $pdo->prepare("
                UPDATE drv_drivers SET
                    full_name = ?, full_name_en = ?, father_name = ?,
                    phone = ?, national_id = ?, license_number = ?, license_type = ?,
                    license_issue_date = ?, license_expiry_date = ?, office_id = ?,
                    status = ?, hire_date = ?, termination_date = ?, notes = ?
                WHERE id = ?
            ");
            $updateStmt->execute([
                $fullName, $fullNameEn ?: null, $fatherName,
                $phone, $nationalId, $licenseNumber, $licenseType,
                $licenseIssueDate, $licenseExpiryDate, $officeId,
                $status, $hireDate, $terminationDate, $notes, $id
            ]);

            logAudit('UPDATE', 'drivers', $id, [
                'full_name' => $driver['full_name'],
                'status' => $driver['status'],
                'office_id' => $driver['office_id']
            ], [
                'full_name' => $fullName,
                'full_name_en' => $fullNameEn,
                'status' => $status,
                'office_id' => $officeId
            ]);

            header("Location: driver_view.php?id={$id}&msg=updated");
            exit;
        } catch (\PDOException $e) {
            error_log('Update Driver Error: ' . $e->getMessage());
            $errors[] = $isAr ? 'تعذر تحديث بيانات السائق.' : 'Unable to update driver data.';
        }
    }
}

$displayName = $isAr ? $driver['full_name'] : ($driver['full_name_en'] ?: $driver['full_name']);
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1"><?= e(__('driver_edit')) ?>: <?= e($displayName) ?></h3>
        <span class="badge bg-secondary"><?= e($driver['employee_code']) ?> &bull; <?= e($driver['driver_number']) ?></span>
    </div>
    <a href="driver_view.php?id=<?= $id ?>" class="btn btn-outline-secondary">
        <i class="fa-solid <?= $isAr ? 'fa-arrow-right me-1' : 'fa-arrow-left me-1' ?>"></i> <?= e(__('action_back')) ?>
    </a>
</div>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger">
        <ul class="mb-0">
            <?php foreach ($errors as $err): ?>
                <li><?= e($err) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<div class="card shadow-sm">
    <div class="card-body p-4">
        <form method="POST" action="driver_edit.php?id=<?= $id ?>">
            <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">

            <h5 class="fw-bold text-primary mb-3 pb-2 border-bottom">
                <i class="fa-solid fa-id-card me-2"></i> <?= e(__('personal_info')) ?>
            </h5>

            <div class="row g-3 mb-4">
                <div class="col-md-4">
                    <label class="form-label fw-bold"><?= e(__('driver_name_ar')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="full_name" class="form-control" required value="<?= e($driver['full_name']) ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-bold"><?= e(__('driver_name_en')) ?></label>
                    <input type="text" name="full_name_en" class="form-control" value="<?= e($driver['full_name_en'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label"><?= e(__('father_name')) ?></label>
                    <input type="text" name="father_name" class="form-control" value="<?= e($driver['father_name'] ?? '') ?>">
                </div>
                <div class="col-md-6">
                    <label class="form-label fw-bold"><?= e(__('phone')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="phone" class="form-control" required value="<?= e($driver['phone']) ?>">
                </div>
                <div class="col-md-6">
                    <label class="form-label fw-bold"><?= e(__('national_id')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="national_id" class="form-control" required value="<?= e($driver['national_id']) ?>">
                </div>
            </div>

            <h5 class="fw-bold text-primary mb-3 pb-2 border-bottom">
                <i class="fa-solid fa-award me-2"></i> <?= e(__('license_info')) ?>
            </h5>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('license_number')) ?></label>
                    <input type="text" name="license_number" class="form-control" value="<?= e($driver['license_number']) ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('license_type')) ?></label>
                    <select name="license_type" class="form-select">
                        <option value="عمومي" <?= $driver['license_type'] === 'عمومي' ? 'selected' : '' ?>><?= e(__('lic_commercial')) ?></option>
                        <option value="خصوصي" <?= $driver['license_type'] === 'خصوصي' ? 'selected' : '' ?>><?= e(__('lic_private')) ?></option>
                        <option value="إنشائي" <?= $driver['license_type'] === 'إنشائي' ? 'selected' : '' ?>><?= e(__('lic_construction')) ?></option>
                        <option value="دولي" <?= $driver['license_type'] === 'دولي' ? 'selected' : '' ?>><?= e(__('lic_international')) ?></option>
                        <option value="أخرى" <?= $driver['license_type'] === 'أخرى' ? 'selected' : '' ?>><?= e(__('lic_other')) ?></option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label"><?= e(__('license_issue_date')) ?></label>
                    <input type="date" name="license_issue_date" class="form-control" value="<?= e($driver['license_issue_date'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label"><?= e(__('license_expiry_date')) ?></label>
                    <input type="date" name="license_expiry_date" class="form-control" value="<?= e($driver['license_expiry_date'] ?? '') ?>">
                </div>
            </div>

            <h5 class="fw-bold text-primary mb-3 pb-2 border-bottom">
                <i class="fa-solid fa-briefcase me-2"></i> <?= e(__('salary_info')) ?>
            </h5>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('office')) ?> <span class="text-danger">*</span></label>
                    <select name="office_id" class="form-select" required>
                        <option value="">-- <?= $isAr ? 'اختر المكتب' : 'Select Office' ?> --</option>
                        <?php foreach ($offices as $off): ?>
                            <option value="<?= $off['id'] ?>" <?= (int)$driver['office_id'] === (int)$off['id'] ? 'selected' : '' ?>>
                                <?= e($isAr ? $off['name_ar'] : $off['name_en']) ?> (<?= e($off['city']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('status')) ?></label>
                    <select name="status" class="form-select">
                        <option value="active" <?= $driver['status'] === 'active' ? 'selected' : '' ?>><?= e(__('status_active')) ?></option>
                        <option value="inactive" <?= $driver['status'] === 'inactive' ? 'selected' : '' ?>><?= e(__('status_inactive')) ?></option>
                        <?php if (!in_array($driver['status'], ['active', 'inactive'])): ?>
                            <option value="<?= e($driver['status']) ?>" selected><?= e(__('status_' . $driver['status'])) ?></option>
                        <?php endif; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('hire_date')) ?></label>
                    <input type="date" name="hire_date" class="form-control" value="<?= e($driver['hire_date']) ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('exit_date')) ?></label>
                    <input type="date" name="termination_date" class="form-control" value="<?= e($driver['termination_date'] ?? '') ?>">
                </div>
                <div class="col-md-12">
                    <label class="form-label"><?= e(__('notes')) ?></label>
                    <input type="text" name="notes" class="form-control" placeholder="<?= e(__('notes')) ?>" value="<?= e($driver['notes'] ?? '') ?>">
                </div>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-3 border-top">
                <a href="driver_view.php?id=<?= $id ?>" class="btn btn-light border px-4"><?= e(__('action_cancel')) ?></a>
                <button type="submit" class="btn btn-primary px-5 fw-bold">
                    <i class="fa-solid fa-save me-2"></i> <?= e(__('action_save')) ?>
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
