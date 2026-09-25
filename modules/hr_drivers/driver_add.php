<?php
/**
 * Add New Driver (إضافة سائق جديد)
 * Strict bilingual support, removed mother_name, added full_name_en
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('drivers_manage');

$pdo = getDBConnection();
$offices = getActiveOffices();
$errors = [];
$success = false;
$isAr = isRtl();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errors[] = $isAr ? 'رمز الأمان غير صالح. يرجى إعادة المحاولة.' : 'Invalid security token. Please try again.';
    }

    $employeeCode = trim($_POST['employee_code'] ?? '');
    $driverNumber = trim($_POST['driver_number'] ?? '');
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
    $hireDate = !empty($_POST['hire_date']) ? $_POST['hire_date'] : date('Y-m-d');
    $terminationDate = !empty($_POST['termination_date']) ? $_POST['termination_date'] : null;
    $notes = trim($_POST['notes'] ?? '');

    // Validation
    if (empty($employeeCode)) $errors[] = $isAr ? 'الرقم الوظيفي مطلوب' : 'Employee code is required';
    if (empty($driverNumber)) $errors[] = $isAr ? 'رقم السائق مطلوب' : 'Driver number is required';
    if (empty($fullName)) $errors[] = $isAr ? 'اسم السائق الكامل مطلوب' : 'Driver full name is required';
    if (empty($phone)) $errors[] = $isAr ? 'رقم الهاتف مطلوب' : 'Phone number is required';
    if (empty($nationalId)) $errors[] = $isAr ? 'رقم الهوية / البطاقة الوطنية مطلوب' : 'National ID is required';
    if (empty($licenseNumber)) $errors[] = $isAr ? 'رقم رخصة القيادة مطلوب' : 'License number is required';
    if ($officeId <= 0) $errors[] = $isAr ? 'يرجى تحديد المكتب التابع له السائق' : 'Please select an office for the driver';

    // Duplicate check
    if (empty($errors)) {
        $checkStmt = $pdo->prepare("SELECT id FROM drv_drivers WHERE (employee_code = ? OR driver_number = ?) AND deleted_at IS NULL");
        $checkStmt->execute([$employeeCode, $driverNumber]);
        if ($checkStmt->fetch()) {
            $errors[] = $isAr ? 'الرقم الوظيفي أو رقم السائق مستخدم بالفعل لسائق آخر.' : 'Employee code or driver number is already in use.';
        }
    }

    // Insert
    if (empty($errors)) {
        try {
            $insertStmt = $pdo->prepare("
                INSERT INTO drv_drivers (
                    employee_code, driver_number, full_name, full_name_en, father_name,
                    phone, national_id, license_number, license_type, license_issue_date, license_expiry_date,
                    office_id, status, hire_date, termination_date, notes, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?
                )
            ");
            $user = getCurrentUser();
            $insertStmt->execute([
                $employeeCode, $driverNumber, $fullName, $fullNameEn ?: null, $fatherName,
                $phone, $nationalId, $licenseNumber, $licenseType, $licenseIssueDate, $licenseExpiryDate,
                $officeId, $status, $hireDate, $terminationDate, $notes, $user['id'] ?? null
            ]);

            $newId = (int)$pdo->lastInsertId();
            logAudit('CREATE', 'drivers', $newId, null, [
                'full_name' => $fullName,
                'full_name_en' => $fullNameEn,
                'employee_code' => $employeeCode,
                'office_id' => $officeId
            ]);

            header("Location: driver_view.php?id={$newId}&msg=created");
            exit;
        } catch (\PDOException $e) {
            error_log('Insert Driver Error: ' . $e->getMessage());
            $errors[] = $isAr ? 'حدث خطأ أثناء حفظ بيانات السائق.' : 'An error occurred while saving driver data.';
        }
    }
}
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1"><?= e(__('drivers_add')) ?></h3>
        <p class="text-muted mb-0"><?= e(__('personal_info')) ?> &bull; <?= e(__('license_info')) ?> &bull; <?= e(__('salary_info')) ?></p>
    </div>
    <a href="drivers.php" class="btn btn-outline-secondary">
        <i class="fa-solid <?= $isAr ? 'fa-arrow-right me-1' : 'fa-arrow-left me-1' ?>"></i> <?= e(__('action_back')) ?>
    </a>
</div>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <h6 class="fw-bold mb-2"><i class="fa-solid fa-triangle-exclamation me-2"></i><?= $isAr ? 'تعذر حفظ البيانات للأسباب التالية:' : 'Unable to save data due to the following reasons:' ?></h6>
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
        <form method="POST" action="driver_add.php">
            <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">

            <h5 class="fw-bold text-primary mb-3 pb-2 border-bottom">
                <i class="fa-solid fa-id-card me-2"></i> <?= e(__('personal_info')) ?>
            </h5>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('employee_code')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="employee_code" class="form-control" required placeholder="EMP-1010" value="<?= e($_POST['employee_code'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('driver_number')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="driver_number" class="form-control" required placeholder="DRV-08" value="<?= e($_POST['driver_number'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('driver_name_ar')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="full_name" class="form-control" required placeholder="الاسم الرباعي واللقب" value="<?= e($_POST['full_name'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('driver_name_en')) ?></label>
                    <input type="text" name="full_name_en" class="form-control" placeholder="Full English Name" value="<?= e($_POST['full_name_en'] ?? '') ?>">
                </div>

                <div class="col-md-4">
                    <label class="form-label"><?= e(__('father_name')) ?></label>
                    <input type="text" name="father_name" class="form-control" placeholder="<?= e(__('father_name')) ?>" value="<?= e($_POST['father_name'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-bold"><?= e(__('phone')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="phone" class="form-control" required placeholder="07XXXXXXXXX" value="<?= e($_POST['phone'] ?? '') ?>">
                </div>
                <div class="col-md-4">
                    <label class="form-label fw-bold"><?= e(__('national_id')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="national_id" class="form-control" required placeholder="19XXXXXXXXX" value="<?= e($_POST['national_id'] ?? '') ?>">
                </div>
            </div>

            <h5 class="fw-bold text-primary mb-3 pb-2 border-bottom">
                <i class="fa-solid fa-award me-2"></i> <?= e(__('license_info')) ?>
            </h5>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('license_number')) ?> <span class="text-danger">*</span></label>
                    <input type="text" name="license_number" class="form-control" required placeholder="LIC-BGW-1234" value="<?= e($_POST['license_number'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('license_type')) ?></label>
                    <select name="license_type" class="form-select">
                        <option value="عمومي"><?= e(__('lic_commercial')) ?></option>
                        <option value="خصوصي"><?= e(__('lic_private')) ?></option>
                        <option value="إنشائي"><?= e(__('lic_construction')) ?></option>
                        <option value="دولي"><?= e(__('lic_international')) ?></option>
                        <option value="أخرى"><?= e(__('lic_other')) ?></option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label"><?= e(__('license_issue_date')) ?></label>
                    <input type="date" name="license_issue_date" class="form-control" value="<?= e($_POST['license_issue_date'] ?? '') ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label"><?= e(__('license_expiry_date')) ?></label>
                    <input type="date" name="license_expiry_date" class="form-control" value="<?= e($_POST['license_expiry_date'] ?? '') ?>">
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
                            <option value="<?= $off['id'] ?>" <?= (int)($_POST['office_id'] ?? 0) === (int)$off['id'] ? 'selected' : '' ?>>
                                <?= e($isAr ? $off['name_ar'] : $off['name_en']) ?> (<?= e($off['city']) ?>)
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('status')) ?></label>
                    <select name="status" class="form-select">
                        <option value="active" <?= ($_POST['status'] ?? 'active') === 'active' ? 'selected' : '' ?>><?= e(__('status_active')) ?></option>
                        <option value="inactive" <?= ($_POST['status'] ?? '') === 'inactive' ? 'selected' : '' ?>><?= e(__('status_inactive')) ?></option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('hire_date')) ?></label>
                    <input type="date" name="hire_date" class="form-control" value="<?= e($_POST['hire_date'] ?? date('Y-m-d')) ?>">
                </div>
                <div class="col-md-3">
                    <label class="form-label fw-bold"><?= e(__('exit_date')) ?></label>
                    <input type="date" name="termination_date" class="form-control" value="<?= e($_POST['termination_date'] ?? '') ?>">
                </div>
                <div class="col-md-12">
                    <label class="form-label"><?= e(__('notes')) ?></label>
                    <input type="text" name="notes" class="form-control" placeholder="<?= e(__('notes')) ?>" value="<?= e($_POST['notes'] ?? '') ?>">
                </div>
            </div>

            <div class="d-flex justify-content-end gap-2 pt-3 border-top">
                <a href="drivers.php" class="btn btn-light border px-4"><?= e(__('action_cancel')) ?></a>
                <button type="submit" class="btn btn-primary px-5 fw-bold">
                    <i class="fa-solid fa-check me-2"></i> <?= e(__('action_save')) ?>
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
