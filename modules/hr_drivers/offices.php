<?php
/**
 * Offices & Branches Management Screen (شاشة المكاتب والفروع)
 * Displays regional offices, office managers, emails, phones, and driver counts
 * Fully bilingual (100% AR or 100% EN) with Add/Edit Office Modal
 */
require_once __DIR__ . '/includes/header.php';
requirePermission('drivers_view');

$pdo = getDBConnection();
$isAr = isRtl();
$errors = [];
$successMsg = '';

// Handle Add or Edit Office
if ($_SERVER['REQUEST_METHOD'] === 'POST' && hasPermission('drivers_manage')) {
    $token = $_POST['csrf_token'] ?? '';
    if (!verifyCsrfToken($token)) {
        $errors[] = $isAr ? 'رمز الأمان CSRF غير صالح.' : 'Invalid CSRF security token.';
    }

    $action = $_POST['form_action'] ?? 'add';
    $code = strtoupper(trim($_POST['code'] ?? ''));
    $nameAr = trim($_POST['name_ar'] ?? '');
    $nameEn = trim($_POST['name_en'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $managerName = trim($_POST['manager_name'] ?? '');
    $managerNameEn = trim($_POST['manager_name_en'] ?? '');
    $managerEmail = trim($_POST['manager_email'] ?? '');
    $managerBadgeNo = trim($_POST['manager_badge_no'] ?? '');
    $isActive = isset($_POST['is_active']) ? 1 : 0;

    if (empty($code)) $errors[] = $isAr ? 'كود المكتب مطلوب' : 'Office code is required';
    if (empty($nameAr)) $errors[] = $isAr ? 'اسم المكتب بالعربية مطلوب' : 'Office Arabic name is required';
    if (empty($nameEn)) $errors[] = $isAr ? 'اسم المكتب بالإنجليزية مطلوب' : 'Office English name is required';
    if (empty($city)) $errors[] = $isAr ? 'المدينة مطلوبة' : 'City is required';

    if (empty($errors)) {
        if ($action === 'add') {
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO drv_offices (code, name_ar, name_en, city, address, phone, manager_name, manager_name_en, manager_email, manager_badge_no, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$code, $nameAr, $nameEn, $city, $address, $phone, $managerName, $managerNameEn, $managerEmail, $managerBadgeNo, $isActive]);
                $newId = (int)$pdo->lastInsertId();
                logAudit('CREATE_OFFICE', 'offices', $newId, null, ['code' => $code, 'name_ar' => $nameAr]);
                $successMsg = $isAr ? 'تمت إضافة المكتب بنجاح!' : 'Office added successfully!';
            } catch (\PDOException $e) {
                error_log($e->getMessage());
                $errors[] = $isAr ? 'كود المكتب مستخدم مسبقاً أو حدث خطأ في الحفظ.' : 'Office code already exists or database error occurred.';
            }
        } elseif ($action === 'edit') {
            $officeId = (int)($_POST['office_id'] ?? 0);
            try {
                $stmt = $pdo->prepare("
                    UPDATE drv_offices SET 
                        code = ?, name_ar = ?, name_en = ?, city = ?, address = ?, phone = ?, 
                        manager_name = ?, manager_name_en = ?, manager_email = ?, manager_badge_no = ?, is_active = ?
                    WHERE id = ?
                ");
                $stmt->execute([$code, $nameAr, $nameEn, $city, $address, $phone, $managerName, $managerNameEn, $managerEmail, $managerBadgeNo, $isActive, $officeId]);
                logAudit('UPDATE_OFFICE', 'offices', $officeId, null, ['code' => $code]);
                $successMsg = $isAr ? 'تم تحديث بيانات المكتب بنجاح!' : 'Office updated successfully!';
            } catch (\PDOException $e) {
                error_log($e->getMessage());
                $errors[] = $isAr ? 'حدث خطأ أثناء تعديل بيانات المكتب.' : 'Error updating office data.';
            }
        }
    }
}

// Fetch all offices with active driver count
$sql = "
    SELECT o.*, COUNT(d.id) as drivers_count
    FROM drv_offices o
    LEFT JOIN drv_drivers d ON o.id = d.office_id AND d.deleted_at IS NULL AND d.status = 'active'
    GROUP BY o.id
    ORDER BY o.id ASC
";
$offices = $pdo->query($sql)->fetchAll();
?>

<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h3 class="fw-bold mb-1"><?= e(__('offices_title')) ?></h3>
        <p class="text-muted mb-0"><?= e(__('offices_desc')) ?></p>
    </div>
    <?php if (hasPermission('drivers_manage')): ?>
        <button class="btn btn-primary d-flex align-items-center gap-2" data-bs-toggle="modal" data-bs-target="#addOfficeModal">
            <i class="fa-solid fa-plus"></i>
            <span><?= e(__('office_add')) ?></span>
        </button>
    <?php endif; ?>
</div>

<?php if ($successMsg): ?>
    <div class="alert alert-success alert-dismissible fade show">
        <i class="fa-solid fa-circle-check me-2"></i><?= e($successMsg) ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<?php if (!empty($errors)): ?>
    <div class="alert alert-danger alert-dismissible fade show">
        <ul class="mb-0">
            <?php foreach ($errors as $err): ?>
                <li><?= e($err) ?></li>
            <?php endforeach; ?>
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
<?php endif; ?>

<!-- Offices Cards / Table -->
<div class="card shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center">
        <span><i class="fa-solid fa-building me-2 text-primary"></i><?= e(__('offices_title')) ?> (<?= count($offices) ?>)</span>
    </div>
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
                <thead>
                    <tr>
                        <th><?= e(__('office_code')) ?></th>
                        <th><?= e(__('office_name')) ?></th>
                        <th><?= e(__('city')) ?></th>
                        <th><?= e(__('manager_name')) ?></th>
                        <th><?= e(__('manager_badge_no')) ?></th>
                        <th><?= e(__('manager_email')) ?></th>
                        <th><?= e(__('phone')) ?></th>
                        <th><?= e(__('drivers_count')) ?></th>
                        <th><?= e(__('status')) ?></th>
                        <?php if (hasPermission('drivers_manage')): ?>
                            <th class="text-center"><?= e(__('action_actions')) ?></th>
                        <?php endif; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($offices as $off): 
                        $officeName = $isAr ? $off['name_ar'] : $off['name_en'];
                        $managerName = $isAr ? ($off['manager_name'] ?: '-') : ($off['manager_name_en'] ?: ($off['manager_name'] ?: '-'));
                    ?>
                        <tr>
                            <td>
                                <span class="badge bg-primary-subtle text-primary fw-bold font-monospace fs-6">
                                    <?= e($off['code']) ?>
                                </span>
                            </td>
                            <td>
                                <span class="fw-bold text-dark d-block"><?= e($officeName) ?></span>
                                <span class="small text-muted"><?= e($off['address'] ?: '-') ?></span>
                            </td>
                            <td><span class="badge bg-light text-dark border"><?= e($off['city']) ?></span></td>
                            <td>
                                <div class="fw-semibold">
                                    <i class="fa-solid fa-user-tie text-secondary me-1"></i>
                                    <?= e($managerName) ?>
                                </div>
                            </td>
                            <td>
                                <?php if (!empty($off['manager_badge_no'])): ?>
                                    <span class="badge bg-light text-dark border font-monospace">
                                        <i class="fa-solid fa-id-badge text-primary me-1"></i><?= e($off['manager_badge_no']) ?>
                                    </span>
                                <?php else: ?>
                                    <span class="text-muted small">-</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if ($off['manager_email']): ?>
                                    <div class="d-flex flex-column gap-1">
                                        <a href="mailto:<?= e($off['manager_email']) ?>" class="text-decoration-none small text-info">
                                            <i class="fa-solid fa-envelope me-1"></i><?= e($off['manager_email']) ?>
                                        </a>
                                        <button type="button" class="btn btn-sm btn-outline-primary email-req-btn text-nowrap"
                                                style="font-size: 0.72rem; padding: 2px 6px;"
                                                data-office-id="<?= $off['id'] ?>"
                                                data-office-name="<?= e($officeName) ?>"
                                                data-manager-name="<?= e($managerName) ?>"
                                                data-manager-badge="<?= e($off['manager_badge_no'] ?? '') ?>"
                                                data-manager-email="<?= e($off['manager_email']) ?>"
                                                data-drivers-count="<?= $off['drivers_count'] ?>"
                                                data-bs-toggle="modal" data-bs-target="#emailRequestModal">
                                            <i class="fa-solid fa-paper-plane me-1"></i> طلب التايمشيت والبيرول
                                        </button>
                                    </div>
                                <?php else: ?>
                                    <span class="text-muted small">-</span>
                                <?php endif; ?>
                            </td>
                            <td class="font-monospace small"><?= e($off['phone'] ?: '-') ?></td>
                            <td>
                                <a href="drivers.php?office_id=<?= $off['id'] ?>" class="badge bg-info-subtle text-info text-decoration-none fs-6">
                                    <i class="fa-solid fa-id-card me-1"></i> <?= $off['drivers_count'] ?> <?= e(__('active_drivers_count')) ?>
                                </a>
                            </td>
                            <td>
                                <?php if ($off['is_active']): ?>
                                    <span class="badge bg-success"><?= e(__('status_active')) ?></span>
                                <?php else: ?>
                                    <span class="badge bg-secondary"><?= e(__('status_inactive')) ?></span>
                                <?php endif; ?>
                            </td>
                            <?php if (hasPermission('drivers_manage')): ?>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-outline-primary edit-office-btn"
                                            data-id="<?= $off['id'] ?>"
                                            data-code="<?= e($off['code']) ?>"
                                            data-name-ar="<?= e($off['name_ar']) ?>"
                                            data-name-en="<?= e($off['name_en']) ?>"
                                            data-city="<?= e($off['city']) ?>"
                                            data-address="<?= e($off['address']) ?>"
                                            data-phone="<?= e($off['phone']) ?>"
                                            data-manager-name="<?= e($off['manager_name']) ?>"
                                            data-manager-name-en="<?= e($off['manager_name_en']) ?>"
                                            data-manager-email="<?= e($off['manager_email']) ?>"
                                            data-manager-badge-no="<?= e($off['manager_badge_no'] ?? '') ?>"
                                            data-is-active="<?= $off['is_active'] ?>"
                                            data-bs-toggle="modal" data-bs-target="#editOfficeModal">
                                        <i class="fa-solid fa-pen-to-square"></i>
                                    </button>
                                </td>
                            <?php endif; ?>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Modal: Add Office -->
<div class="modal fade" id="addOfficeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="POST" action="offices.php">
                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                <input type="hidden" name="form_action" value="add">
                
                <div class="modal-header">
                    <h5 class="modal-title fw-bold"><i class="fa-solid fa-building me-2 text-primary"></i><?= e(__('office_add')) ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('office_code')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="code" class="form-control" required placeholder="OFF-DHK">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('office_name_ar')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="name_ar" class="form-control" required placeholder="مكتب دهوك">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('office_name_en')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="name_en" class="form-control" required placeholder="Duhok Branch">
                        </div>

                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('city')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="city" class="form-control" required placeholder="دهوك">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label"><?= e(__('phone')) ?></label>
                            <input type="text" name="phone" class="form-control" placeholder="07XXXXXXXXX">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label"><?= e(__('address')) ?></label>
                            <input type="text" name="address" class="form-control" placeholder="<?= e(__('address')) ?>">
                        </div>

                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_name_ar')) ?></label>
                            <input type="text" name="manager_name" class="form-control" placeholder="اسم مدير المكتب بالعربية">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_name_en')) ?></label>
                            <input type="text" name="manager_name_en" class="form-control" placeholder="Manager English Name">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_badge_no')) ?></label>
                            <input type="text" name="manager_badge_no" class="form-control" placeholder="MGR-01">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_email')) ?></label>
                            <input type="email" name="manager_email" class="form-control" placeholder="manager@company.com">
                        </div>

                        <div class="col-12">
                            <div class="form-check form-switch mt-2">
                                <input class="form-check-input" type="checkbox" name="is_active" value="1" id="addOfficeActive" checked>
                                <label class="form-check-label fw-bold" for="addOfficeActive"><?= e(__('status_active')) ?></label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-light border" data-bs-dismiss="modal"><?= e(__('action_cancel')) ?></button>
                    <button type="submit" class="btn btn-primary px-4 fw-bold"><?= e(__('action_save')) ?></button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal: Edit Office -->
<div class="modal fade" id="editOfficeModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <form method="POST" action="offices.php">
                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                <input type="hidden" name="form_action" value="edit">
                <input type="hidden" name="office_id" id="edit_office_id">
                
                <div class="modal-header">
                    <h5 class="modal-title fw-bold"><i class="fa-solid fa-pen-to-square me-2 text-primary"></i><?= e(__('office_edit')) ?></h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('office_code')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="code" id="edit_code" class="form-control" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('office_name_ar')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="name_ar" id="edit_name_ar" class="form-control" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('office_name_en')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="name_en" id="edit_name_en" class="form-control" required>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label fw-bold"><?= e(__('city')) ?> <span class="text-danger">*</span></label>
                            <input type="text" name="city" id="edit_city" class="form-control" required>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label"><?= e(__('phone')) ?></label>
                            <input type="text" name="phone" id="edit_phone" class="form-control">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label"><?= e(__('address')) ?></label>
                            <input type="text" name="address" id="edit_address" class="form-control">
                        </div>

                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_name_ar')) ?></label>
                            <input type="text" name="manager_name" id="edit_manager_name" class="form-control">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_name_en')) ?></label>
                            <input type="text" name="manager_name_en" id="edit_manager_name_en" class="form-control">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_badge_no')) ?></label>
                            <input type="text" name="manager_badge_no" id="edit_manager_badge_no" class="form-control">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label fw-bold"><?= e(__('manager_email')) ?></label>
                            <input type="email" name="manager_email" id="edit_manager_email" class="form-control">
                        </div>

                        <div class="col-12">
                            <div class="form-check form-switch mt-2">
                                <input class="form-check-input" type="checkbox" name="is_active" value="1" id="edit_is_active">
                                <label class="form-check-label fw-bold" for="edit_is_active"><?= e(__('status_active')) ?></label>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-light border" data-bs-dismiss="modal"><?= e(__('action_cancel')) ?></button>
                    <button type="submit" class="btn btn-primary px-4 fw-bold"><?= e(__('action_save')) ?></button>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Modal: Request Timesheet & Payroll by Email -->
<div class="modal fade" id="emailRequestModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header bg-primary text-white">
                <h5 class="modal-title fw-bold">
                    <i class="fa-solid fa-paper-plane me-2"></i> طلب استكمال تايمشيت وبيرول السائقين
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
                <div class="alert alert-primary border-0 d-flex align-items-center gap-3 mb-4" style="background:#e0e7ff; color:#3730a3; border-radius:10px;">
                    <i class="fa-solid fa-circle-info fs-3"></i>
                    <div>
                        <div class="fw-bold">إشعار رسمي من الموارد البشرية إلى مدير المكتب / الفرع</div>
                        <small>إرسال طلب لمراجعة واعتماد جدول دوام السائقين (Timesheet) وتدقيق مسير الرواتب (Payroll) لإغلاق الشهر.</small>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">المكتب / الفرع</label>
                        <input type="text" id="email_modal_office" class="form-control bg-light" readonly>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold">شهر الاستحقاق</label>
                        <input type="month" id="email_modal_month" class="form-control fw-bold text-primary" value="<?= date('Y-m') ?>">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">مدير المكتب</label>
                        <input type="text" id="email_modal_manager" class="form-control bg-light" readonly>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">رقم الباج / الوظيفي</label>
                        <input type="text" id="email_modal_badge" class="form-control bg-light" readonly>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label small fw-bold">البريد الإلكتروني للمدير</label>
                        <input type="text" id="email_modal_to" class="form-control bg-light font-monospace" readonly>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label small fw-bold">عنوان الرسالة (Subject)</label>
                    <input type="text" id="email_modal_subject" class="form-control fw-semibold">
                </div>

                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <label class="form-label small fw-bold mb-0">نص الخطاب والبيانات (Message Body)</label>
                        <button type="button" class="btn btn-sm btn-outline-secondary py-0 px-2" id="copyEmailBodyBtn" style="font-size:0.75rem;">
                            <i class="fa-solid fa-copy me-1"></i> نسخ النص
                        </button>
                    </div>
                    <textarea id="email_modal_body" class="form-control font-monospace" rows="9" style="font-size: 0.85rem; line-height: 1.5;"></textarea>
                </div>
            </div>
            <div class="modal-footer bg-light">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">إغلاق</button>
                <a href="#" id="openMailClientBtn" class="btn btn-primary fw-bold px-4" target="_blank">
                    <i class="fa-solid fa-envelope-open-text me-2"></i> فتح في برنامج البريد (Outlook / Mail)
                </a>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const editBtns = document.querySelectorAll('.edit-office-btn');
    editBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('edit_office_id').value = this.dataset.id;
            document.getElementById('edit_code').value = this.dataset.code;
            document.getElementById('edit_name_ar').value = this.dataset.nameAr;
            document.getElementById('edit_name_en').value = this.dataset.nameEn;
            document.getElementById('edit_city').value = this.dataset.city;
            document.getElementById('edit_address').value = this.dataset.address;
            document.getElementById('edit_phone').value = this.dataset.phone;
            document.getElementById('edit_manager_name').value = this.dataset.managerName;
            document.getElementById('edit_manager_name_en').value = this.dataset.managerNameEn;
            document.getElementById('edit_manager_email').value = this.dataset.managerEmail;
            document.getElementById('edit_manager_badge_no').value = this.dataset.managerBadgeNo || '';
            document.getElementById('edit_is_active').checked = this.dataset.isActive == '1';
        });
    });

    // Email Request Modal Logic
    const emailReqBtns = document.querySelectorAll('.email-req-btn');
    const emailModalOffice = document.getElementById('email_modal_office');
    const emailModalMonth = document.getElementById('email_modal_month');
    const emailModalManager = document.getElementById('email_modal_manager');
    const emailModalBadge = document.getElementById('email_modal_badge');
    const emailModalTo = document.getElementById('email_modal_to');
    const emailModalSubject = document.getElementById('email_modal_subject');
    const emailModalBody = document.getElementById('email_modal_body');
    const openMailClientBtn = document.getElementById('openMailClientBtn');
    const copyEmailBodyBtn = document.getElementById('copyEmailBodyBtn');

    let currentOfficeData = {};

    function generateEmailText() {
        const offName = currentOfficeData.officeName || '';
        const mgrName = currentOfficeData.managerName || 'مدير المكتب';
        const mgrBadge = currentOfficeData.managerBadge || 'غير محدد';
        const mgrEmail = currentOfficeData.managerEmail || '';
        const driversCount = currentOfficeData.driversCount || '0';
        const month = emailModalMonth.value;

        const subject = `[إشعار عاجل - الموارد البشرية] طلب استكمال تايمشيت وبيرول السائقين - ${offName} (${month})`;
        const body = `السيد مدير المكتب المحترم: ${mgrName}
الرقم الوظيفي / باج رقم: ${mgrBadge}
المكتب / الفرع: ${offName}
البريد الإلكتروني: ${mgrEmail}

تحية طيبة وبعد،،،

نود إحاطتكم بضرورة استكمال ومطابقة جدول دوام وساعات رحلات السائقين (Driver Timesheet) وتدقيق مسير الرواتب والأجور الشهرية (Payroll) التابعة لمكتبكم لشهر (${month}).

📊 ملخص بيانات المكتب التشغيلية:
• عدد السائقين التابعين للفرع: ${driversCount} سائق

⚠️ تنبيه تنظيمي هام:
نظراً لأن أجور ومستحقات السائقين تحتسب حصراً بنظام الرحلات المنجزة والمعتمدة (وليسوا موظفين بعقود إجازات ثابتة)، يرجى مراجعة وتدقيق وإغلاق كافة السجلات المعلقة قبل تاريخ 25 من الشهر الجاري ليتسنى للموارد البشرية والمالية صرف الرواتب في موعدها المحدد دون تأخير.

بإمكانكم الدخول إلى النظام ومراجعة واعتماد الرحلات من خلال لوحة تحكم المكتب:
` + window.location.origin + `/modules/hr_drivers/manager/

وتفضلوا بقبول فائق الاحترام والتقدير،
قسم الموارد البشرية والرواتب - الإدارة العامة`;

        emailModalSubject.value = subject;
        emailModalBody.value = body;

        const mailtoHref = `mailto:${encodeURIComponent(mgrEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        openMailClientBtn.href = mailtoHref;
    }

    emailReqBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            currentOfficeData = {
                officeId: this.dataset.officeId,
                officeName: this.dataset.officeName,
                managerName: this.dataset.managerName,
                managerBadge: this.dataset.managerBadge,
                managerEmail: this.dataset.managerEmail,
                driversCount: this.dataset.driversCount
            };

            emailModalOffice.value = currentOfficeData.officeName;
            emailModalManager.value = currentOfficeData.managerName;
            emailModalBadge.value = currentOfficeData.managerBadge || '—';
            emailModalTo.value = currentOfficeData.managerEmail;

            generateEmailText();
        });
    });

    if (emailModalMonth) {
        emailModalMonth.addEventListener('change', generateEmailText);
    }

    if (copyEmailBodyBtn) {
        copyEmailBodyBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(emailModalBody.value).then(() => {
                const orig = this.innerHTML;
                this.innerHTML = '<i class="fa-solid fa-check text-success me-1"></i> تم النسخ!';
                setTimeout(() => { this.innerHTML = orig; }, 2000);
            });
        });
    }
});
</script>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
