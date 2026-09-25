<?php
/**
 * Driver Mobile App – Profile & Change Password
 * Read-only driver info + password update form
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$driverId = (int)$driver['driver_id'];
$isAr = isRtl();

$errors  = [];
$success = '';

// Load fresh driver details
$stmt = $pdo->prepare("
    SELECT d.*, o.name_ar as office_name_ar, o.name_en as office_name_en, o.city as office_city
    FROM drv_drivers d
    LEFT JOIN drv_offices o ON d.office_id = o.id
    WHERE d.id = ?
");
$stmt->execute([$driverId]);
$driverDetails = $stmt->fetch();

if (!$driverDetails) {
    echo '<div class="alert alert-danger">Driver not found.</div>';
    require_once __DIR__ . '/includes/footer.php';
    exit;
}

// Handle Change Password Form
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyDriverCsrf($_POST['csrf_token'] ?? '')) {
        $errors[] = $isAr ? 'رمز الأمان غير صالح، يرجى إعادة المحاولة.' : 'Invalid security token, please try again.';
    }

    $currentPwd = $_POST['current_password'] ?? '';
    $newPwd     = $_POST['new_password'] ?? '';
    $confirmPwd = $_POST['confirm_password'] ?? '';

    if (empty($currentPwd)) {
        $errors[] = $isAr ? 'يرجى إدخال كلمة المرور الحالية.' : 'Please enter your current password.';
    }
    if (strlen($newPwd) < 4) {
        $errors[] = $isAr ? 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل.' : 'New password must be at least 4 characters.';
    }
    if ($newPwd !== $confirmPwd) {
        $errors[] = $isAr ? 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' : 'New password and confirmation do not match.';
    }

    if (empty($errors)) {
        // Verify current password against database
        $pwdStmt = $pdo->prepare("SELECT driver_password_hash FROM drv_drivers WHERE id = ?");
        $pwdStmt->execute([$driverId]);
        $hashRow = $pwdStmt->fetch();

        if (!$hashRow || !password_verify($currentPwd, $hashRow['driver_password_hash'])) {
            $errors[] = $isAr ? 'كلمة المرور الحالية غير صحيحة.' : 'Current password is incorrect.';
        } else {
            $newHash = password_hash($newPwd, PASSWORD_DEFAULT);
            $upd = $pdo->prepare("UPDATE drv_drivers SET driver_password_hash = ? WHERE id = ?");
            $upd->execute([$newHash, $driverId]);
            $success = $isAr ? 'تم تغيير كلمة المرور بنجاح!' : 'Password updated successfully!';
        }
    }
}
?>

<!-- Profile Hero Card -->
<div class="mobile-card mb-3" style="background: var(--primary-gradient); color: #fff; border: none;">
    <div class="d-flex align-items-center gap-3">
        <div class="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0"
             style="width: 58px; height: 58px;">
            <i class="fa-solid fa-id-badge fa-2x text-success"></i>
        </div>
        <div>
            <div class="fw-bold fs-5"><?= e($driverDetails['full_name']) ?></div>
            <div class="small opacity-75">
                <i class="fa-solid fa-building me-1"></i>
                <?= e($isAr ? $driverDetails['office_name_ar'] : ($driverDetails['office_name_en'] ?: $driverDetails['office_name_ar'])) ?>
            </div>
            <div class="mt-1 d-flex align-items-center gap-2">
                <span class="badge bg-white text-success fw-bold font-monospace"><?= e($driverDetails['driver_number']) ?></span>
                <?= getDriverStatusBadge($driverDetails['status']) ?>
            </div>
        </div>
    </div>
</div>

<!-- Alerts -->
<?php if (!empty($errors)): ?>
    <div class="alert alert-danger py-2 px-3 rounded-3 mb-3 small">
        <ul class="mb-0 ps-3">
            <?php foreach ($errors as $e): ?>
                <li><?= e($e) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
<?php endif; ?>

<?php if ($success): ?>
    <div class="alert alert-success py-2 px-3 rounded-3 mb-3 small d-flex align-items-center gap-2">
        <i class="fa-solid fa-circle-check text-success"></i>
        <div><?= e($success) ?></div>
    </div>
<?php endif; ?>

<!-- Driver Info (Read Only) -->
<div class="mobile-card mb-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold mb-0 text-primary">
            <i class="fa-solid fa-circle-info me-1"></i>
            <?= $isAr ? 'بيانات السائق' : 'Driver Details' ?>
        </h6>
        <span class="readonly-chip">
            <i class="fa-solid fa-lock"></i> <?= $isAr ? 'للقراءة فقط' : 'Read-only' ?>
        </span>
    </div>

    <div class="row g-0">
        <div class="col-12 py-2 border-bottom d-flex justify-content-between">
            <span class="small text-muted"><?= $isAr ? 'رقم الباج (Badge No)' : 'Badge Number' ?></span>
            <span class="fw-bold font-monospace"><?= e($driverDetails['driver_number']) ?></span>
        </div>
        <div class="col-12 py-2 border-bottom d-flex justify-content-between">
            <span class="small text-muted"><?= $isAr ? 'الاسم الكامل' : 'Full Name' ?></span>
            <span class="fw-semibold"><?= e($driverDetails['full_name']) ?></span>
        </div>
        <div class="col-12 py-2 border-bottom d-flex justify-content-between">
            <span class="small text-muted"><?= $isAr ? 'المكتب التابع له' : 'Assigned Office' ?></span>
            <span class="fw-semibold"><?= e($isAr ? $driverDetails['office_name_ar'] : ($driverDetails['office_name_en'] ?: $driverDetails['office_name_ar'])) ?></span>
        </div>
        <?php if (!empty($driverDetails['phone'])): ?>
        <div class="col-12 py-2 border-bottom d-flex justify-content-between">
            <span class="small text-muted"><?= $isAr ? 'رقم الهاتف' : 'Phone' ?></span>
            <span class="fw-semibold font-monospace" dir="ltr"><?= e($driverDetails['phone']) ?></span>
        </div>
        <?php endif; ?>
        <?php if (!empty($driverDetails['license_number'])): ?>
        <div class="col-12 py-2 border-bottom d-flex justify-content-between">
            <span class="small text-muted"><?= $isAr ? 'رقم إجازة السوق' : 'License No.' ?></span>
            <span class="fw-semibold font-monospace"><?= e($driverDetails['license_number']) ?></span>
        </div>
        <?php endif; ?>
        <?php if (!empty($driverDetails['license_type'])): ?>
        <div class="col-12 py-2 border-bottom d-flex justify-content-between">
            <span class="small text-muted"><?= $isAr ? 'فئة الإجازة' : 'License Type' ?></span>
            <span class="fw-semibold"><?= e($driverDetails['license_type']) ?></span>
        </div>
        <?php endif; ?>
        <?php if (!empty($driverDetails['hire_date'])): ?>
        <div class="col-12 py-2 border-bottom d-flex justify-content-between">
            <span class="small text-muted"><?= $isAr ? 'تاريخ المباشرة' : 'Hire Date' ?></span>
            <span class="fw-semibold font-monospace"><?= e(date('d/m/Y', strtotime($driverDetails['hire_date']))) ?></span>
        </div>
        <?php endif; ?>
        <div class="col-12 py-2 d-flex justify-content-between align-items-center">
            <span class="small text-muted"><?= $isAr ? 'الحالة' : 'Status' ?></span>
            <span><?= getDriverStatusBadge($driverDetails['status']) ?></span>
        </div>
    </div>
</div>

<!-- Change Password Card -->
<div class="mobile-card mb-3">
    <h6 class="fw-bold mb-3 text-primary">
        <i class="fa-solid fa-key me-1"></i>
        <?= $isAr ? 'تغيير كلمة المرور' : 'Change Password' ?>
    </h6>

    <form method="POST" action="profile.php">
        <input type="hidden" name="csrf_token" value="<?= e(getDriverCsrf()) ?>">

        <div class="mb-3">
            <label class="form-label small fw-semibold"><?= $isAr ? 'كلمة المرور الحالية' : 'Current Password' ?></label>
            <div class="input-group">
                <span class="input-group-text"><i class="fa-solid fa-lock text-muted"></i></span>
                <input type="password" name="current_password" class="form-control" required autocomplete="current-password" placeholder="••••">
            </div>
        </div>

        <div class="mb-3">
            <label class="form-label small fw-semibold"><?= $isAr ? 'كلمة المرور الجديدة' : 'New Password' ?></label>
            <div class="input-group">
                <span class="input-group-text"><i class="fa-solid fa-lock-open text-muted"></i></span>
                <input type="password" name="new_password" class="form-control" minlength="4" required autocomplete="new-password" placeholder="••••">
            </div>
            <div class="form-text small"><?= $isAr ? 'يجب أن لا تقل عن 4 خانات.' : 'Minimum 4 characters.' ?></div>
        </div>

        <div class="mb-3">
            <label class="form-label small fw-semibold"><?= $isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password' ?></label>
            <div class="input-group">
                <span class="input-group-text"><i class="fa-solid fa-circle-check text-muted"></i></span>
                <input type="password" name="confirm_password" class="form-control" minlength="4" required autocomplete="new-password" placeholder="••••">
            </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 fw-bold py-2">
            <i class="fa-solid fa-floppy-disk me-1"></i>
            <?= $isAr ? 'حفظ كلمة المرور الجديدة' : 'Save New Password' ?>
        </button>
    </form>
</div>

<!-- Logout Button -->
<div class="mobile-card text-center mb-3">
    <a href="logout.php" class="btn btn-outline-danger w-100 fw-bold py-2">
        <i class="fa-solid fa-arrow-right-from-bracket me-1"></i>
        <?= $isAr ? 'تسجيل الخروج من الحساب' : 'Sign Out' ?>
    </a>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
