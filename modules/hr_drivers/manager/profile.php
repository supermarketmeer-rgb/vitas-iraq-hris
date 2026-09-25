<?php
/**
 * Office Manager Mobile App – Profile & Change Password
 */
require_once __DIR__ . '/includes/header.php';

$pdo = getDBConnection();
$officeId = $manager['office_id'];
$isAr = isRtl();

$errors  = [];
$success = '';

// Load full office record
$officeStmt = $pdo->prepare("SELECT * FROM drv_offices WHERE id = ?");
$officeStmt->execute([$officeId]);
$office = $officeStmt->fetch();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyManagerCsrf($_POST['csrf_token'] ?? '')) {
        $errors[] = $isAr ? 'رمز الأمان غير صالح.' : 'Invalid security token.';
    }

    $currentPwd = $_POST['current_password'] ?? '';
    $newPwd     = $_POST['new_password'] ?? '';
    $confirmPwd = $_POST['confirm_password'] ?? '';

    if (empty($currentPwd)) {
        $errors[] = $isAr ? 'يرجى إدخال كلمة المرور الحالية.' : 'Please enter your current password.';
    }
    if (strlen($newPwd) < 6) {
        $errors[] = $isAr ? 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.' : 'New password must be at least 6 characters.';
    }
    if ($newPwd !== $confirmPwd) {
        $errors[] = $isAr ? 'كلمة المرور الجديدة وتأكيدها لا يتطابقان.' : 'New password and confirmation do not match.';
    }

    if (empty($errors)) {
        // Verify current password
        $hashStmt = $pdo->prepare("SELECT manager_password_hash FROM drv_offices WHERE id = ?");
        $hashStmt->execute([$officeId]);
        $hashRow = $hashStmt->fetch();

        if (!$hashRow || !password_verify($currentPwd, $hashRow['manager_password_hash'])) {
            $errors[] = $isAr ? 'كلمة المرور الحالية غير صحيحة.' : 'Current password is incorrect.';
        } else {
            $newHash = password_hash($newPwd, PASSWORD_DEFAULT);
            $updStmt = $pdo->prepare("UPDATE drv_offices SET manager_password_hash = ? WHERE id = ?");
            $updStmt->execute([$newHash, $officeId]);
            $success = $isAr ? 'تم تغيير كلمة المرور بنجاح.' : 'Password changed successfully.';
        }
    }
}
?>

<!-- Profile Header -->
<div class="mobile-card mb-3" style="background: var(--primary-gradient); color: #fff; border: none;">
    <div class="d-flex align-items-center gap-3">
        <div class="rounded-circle bg-white d-flex align-items-center justify-content-center flex-shrink-0"
             style="width:60px;height:60px;">
            <i class="fa-solid fa-building-shield fa-2x text-primary"></i>
        </div>
        <div>
            <div class="fw-bold fs-5"><?= e($isAr ? $office['name_ar'] : $office['name_en']) ?></div>
            <div style="opacity:0.85;"><?= e($isAr ? $manager['manager_name'] : ($manager['manager_name_en'] ?: $manager['manager_name'])) ?></div>
            <div class="mt-1">
                <span class="badge bg-white text-primary fw-bold font-monospace"><?= e($manager['manager_badge_no']) ?></span>
            </div>
        </div>
    </div>
</div>

<!-- Office Info Card -->
<div class="mobile-card mb-3">
    <h6 class="fw-bold mb-3 text-primary">
        <i class="fa-solid fa-circle-info me-1"></i>
        <?= $isAr ? 'معلومات المكتب' : 'Office Information' ?>
    </h6>

    <div class="row g-0">
        <div class="col-12 py-2 border-bottom">
            <div class="small text-muted"><?= $isAr ? 'رمز المكتب' : 'Office Code' ?></div>
            <div class="fw-semibold font-monospace"><?= e($office['code']) ?></div>
        </div>
        <div class="col-12 py-2 border-bottom">
            <div class="small text-muted"><?= $isAr ? 'المدينة / المحافظة' : 'City / Province' ?></div>
            <div class="fw-semibold"><?= e($office['city']) ?></div>
        </div>
        <?php if ($office['phone']): ?>
        <div class="col-12 py-2 border-bottom">
            <div class="small text-muted"><?= $isAr ? 'رقم هاتف المكتب' : 'Office Phone' ?></div>
            <div class="fw-semibold" dir="ltr"><?= e($office['phone']) ?></div>
        </div>
        <?php endif; ?>
        <?php if ($manager['manager_email']): ?>
        <div class="col-12 py-2">
            <div class="small text-muted"><?= $isAr ? 'البريد الإلكتروني' : 'Email' ?></div>
            <div class="fw-semibold" dir="ltr"><?= e($manager['manager_email']) ?></div>
        </div>
        <?php endif; ?>
    </div>
</div>

<!-- Change Password Card -->
<div class="mobile-card">
    <h6 class="fw-bold mb-3 text-warning">
        <i class="fa-solid fa-key me-1"></i>
        <?= $isAr ? 'تغيير كلمة المرور' : 'Change Password' ?>
    </h6>

    <?php if ($success): ?>
        <div class="alert alert-success border-0 rounded-3">
            <i class="fa-solid fa-circle-check me-1"></i><?= e($success) ?>
        </div>
    <?php endif; ?>

    <?php if (!empty($errors)): ?>
        <div class="alert alert-danger border-0 rounded-3">
            <?php foreach ($errors as $err): ?>
                <div><i class="fa-solid fa-triangle-exclamation me-1"></i><?= e($err) ?></div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>

    <form method="POST">
        <input type="hidden" name="csrf_token" value="<?= getManagerCsrf() ?>">

        <div class="mb-3">
            <label class="form-label fw-semibold"><?= $isAr ? 'كلمة المرور الحالية' : 'Current Password' ?></label>
            <div class="input-group">
                <input type="password" name="current_password" id="currentPwd" class="form-control" required autocomplete="current-password">
                <button type="button" class="btn btn-outline-secondary border" onclick="togglePwd('currentPwd', this)">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
        </div>

        <div class="mb-3">
            <label class="form-label fw-semibold"><?= $isAr ? 'كلمة المرور الجديدة' : 'New Password' ?></label>
            <div class="input-group">
                <input type="password" name="new_password" id="newPwd" class="form-control" required autocomplete="new-password" minlength="6">
                <button type="button" class="btn btn-outline-secondary border" onclick="togglePwd('newPwd', this)">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
            <div class="form-text"><?= $isAr ? 'على الأقل 6 أحرف' : 'At least 6 characters' ?></div>
        </div>

        <div class="mb-4">
            <label class="form-label fw-semibold"><?= $isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password' ?></label>
            <input type="password" name="confirm_password" class="form-control" required autocomplete="new-password" minlength="6">
        </div>

        <div class="d-grid">
            <button type="submit" class="btn btn-warning fw-bold py-3 text-dark">
                <i class="fa-solid fa-key me-2"></i>
                <?= $isAr ? 'تحديث كلمة المرور' : 'Update Password' ?>
            </button>
        </div>
    </form>
</div>

<!-- Logout Button -->
<div class="mt-3 d-grid">
    <a href="logout.php" class="btn btn-outline-danger fw-bold py-2">
        <i class="fa-solid fa-arrow-right-from-bracket me-2"></i>
        <?= $isAr ? 'تسجيل الخروج' : 'Sign Out' ?>
    </a>
</div>

<script>
function togglePwd(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
