<?php
/**
 * Permissions Matrix for Drivers, Trips & Payroll Module
 * Integrates with parent HR Roles:
 * - admin: Full system control
 * - hr_manager: Drivers, Trips, Approvals, Payrolls
 * - hr_employee: Trip timesheet entry, driver view
 * - payroll: Payroll generation, calculation, review
 * - viewer: Read-only access
 */

function hasPermission(string $permission): bool {
    $user = getCurrentUser();
    $role = $user['role'] ?? 'viewer';

    $permissionsMap = [
        'admin' => [
            'drivers_view', 'drivers_manage', 'drivers_delete',
            'routes_view', 'routes_manage',
            'trips_view', 'trips_create', 'trips_edit', 'trips_approve', 'trips_delete',
            'payroll_view', 'payroll_create', 'payroll_approve', 'payroll_reopen',
            'reports_view', 'reports_export',
            'offices_manage', 'audit_view'
        ],
        'hr_manager' => [
            'drivers_view', 'drivers_manage',
            'routes_view', 'routes_manage',
            'trips_view', 'trips_create', 'trips_edit', 'trips_approve',
            'payroll_view', 'payroll_create', 'payroll_approve', 'payroll_reopen',
            'reports_view', 'reports_export'
        ],
        'payroll' => [
            'drivers_view',
            'routes_view',
            'trips_view',
            'payroll_view', 'payroll_create', 'payroll_approve', 'payroll_reopen',
            'reports_view', 'reports_export'
        ],
        'hr_employee' => [
            'drivers_view',
            'routes_view',
            'trips_view', 'trips_create', 'trips_edit',
            'reports_view'
        ],
        'viewer' => [
            'drivers_view',
            'routes_view',
            'trips_view',
            'payroll_view',
            'reports_view'
        ]
    ];

    $allowed = $permissionsMap[$role] ?? [];
    return in_array($permission, $allowed, true);
}

function requirePermission(string $permission): void {
    if (!hasPermission($permission)) {
        http_response_code(403);
        die('
            <div style="font-family: Cairo, Tahoma, sans-serif; text-align: center; padding: 50px; direction: rtl;">
                <h2 style="color: #c0392b;">خطأ في الصلاحيات (403 Forbidden)</h2>
                <p>عفواً، لا تملك الصلاحية الكافية لتنفيذ هذا الإجراء أو الوصول إلى هذه الصفحة.</p>
                <a href="index.php" style="display: inline-block; padding: 10px 20px; background: #2980b9; color: white; text-decoration: none; border-radius: 6px;">العودة للرئيسية</a>
            </div>
        ');
    }
}
