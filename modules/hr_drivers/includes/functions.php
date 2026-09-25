<?php
/**
 * Global Helper Functions & Business Logic
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/permissions.php';
require_once __DIR__ . '/lang.php';

function e(?string $string): string {
    return htmlspecialchars($string ?? '', ENT_QUOTES, 'UTF-8');
}

function formatMoney(float|int|string $amount, ?string $currency = null): string {
    $num = (float)$amount;
    if ($currency === null) {
        $currency = isRtl() ? 'د.ع' : 'IQD';
    }
    return number_format($num, 0, '.', ',') . ' ' . $currency;
}

function formatDate(?string $date): string {
    if (!$date) return '-';
    $time = strtotime($date);
    return date('Y-m-d', $time);
}

function formatDateTime(?string $datetime): string {
    if (!$datetime) return '-';
    $time = strtotime($datetime);
    return date('Y-m-d h:i A', $time);
}

/**
 * Get all active offices
 */
function getActiveOffices(): array {
    $pdo = getDBConnection();
    $stmt = $pdo->query("SELECT id, code, name_ar, name_en, city FROM drv_offices WHERE is_active = 1 ORDER BY id ASC");
    return $stmt->fetchAll();
}

/**
 * Get drivers filtered optionally by office
 */
function getDriversByOffice(?int $officeId = null): array {
    $pdo = getDBConnection();
    if ($officeId) {
        $stmt = $pdo->prepare("
            SELECT d.*, o.name_ar as office_name_ar 
            FROM drv_drivers d 
            JOIN drv_offices o ON d.office_id = o.id 
            WHERE d.deleted_at IS NULL AND d.office_id = ? AND d.status = 'active'
            ORDER BY d.full_name ASC
        ");
        $stmt->execute([$officeId]);
    } else {
        $stmt = $pdo->query("
            SELECT d.*, o.name_ar as office_name_ar 
            FROM drv_drivers d 
            JOIN drv_offices o ON d.office_id = o.id 
            WHERE d.deleted_at IS NULL AND d.status = 'active'
            ORDER BY d.full_name ASC
        ");
    }
    return $stmt->fetchAll();
}

/**
 * Check for duplicate trip in Timesheet:
 * Same Driver + Same Date + Same Route + Same Departure Time
 */
function checkTripDuplicate(int $driverId, string $tripDate, int $routeId, string $departureTime, ?int $excludeTripId = null): bool {
    $pdo = getDBConnection();
    $sql = "
        SELECT id FROM drv_driver_trips 
        WHERE driver_id = ? 
          AND trip_date = ? 
          AND route_id = ? 
          AND departure_time = ?
          AND status != 'cancelled'
    ";
    $params = [$driverId, $tripDate, $routeId, $departureTime];

    if ($excludeTripId) {
        $sql .= " AND id != ?";
        $params[] = $excludeTripId;
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (bool)$stmt->fetch();
}

/**
 * Calculate Payroll for a driver in a specific month & year
 * Formula:
 * Net = Base Salary + Transport Allowance + Fuel Allowance + Approved Trips Value + Additions - Deductions - Advances
 */
function calculateDriverPayroll(int $driverId, int $month, int $year, float $additions = 0.0, float $deductions = 0.0, float $advances = 0.0): array {
    $pdo = getDBConnection();

    // 1. Get driver base details
    $driverStmt = $pdo->prepare("SELECT * FROM drv_drivers WHERE id = ? AND deleted_at IS NULL");
    $driverStmt->execute([$driverId]);
    $driver = $driverStmt->fetch();

    if (!$driver) {
        throw new InvalidArgumentException("السائق غير موجود أو تم حذفه");
    }

    // 2. Fetch approved trips for this driver within month and year
    // Only Approved trips are included!
    $tripsStmt = $pdo->prepare("
        SELECT * FROM drv_driver_trips 
        WHERE driver_id = ? 
          AND MONTH(trip_date) = ? 
          AND YEAR(trip_date) = ? 
          AND status = 'approved'
        ORDER BY trip_date ASC
    ");
    $tripsStmt->execute([$driverId, $month, $year]);
    $approvedTrips = $tripsStmt->fetchAll();

    $tripsCount = count($approvedTrips);
    $tripsTotalAmount = 0.0;
    foreach ($approvedTrips as $t) {
        $tripsTotalAmount += (float)$t['total_amount'];
    }

    $baseSalary = (float)$driver['base_salary'];
    $transport = (float)$driver['transport_allowance'];
    $fuel = (float)$driver['fuel_allowance'];

    $netSalary = ($baseSalary + $transport + $fuel + $tripsTotalAmount + $additions) - ($deductions + $advances);

    return [
        'driver' => $driver,
        'month' => $month,
        'year' => $year,
        'base_salary' => $baseSalary,
        'transport_allowance' => $transport,
        'fuel_allowance' => $fuel,
        'approved_trips_count' => $tripsCount,
        'approved_trips_amount' => $tripsTotalAmount,
        'additions_amount' => $additions,
        'deductions_amount' => $deductions,
        'advances_amount' => $advances,
        'net_salary' => max(0.0, $netSalary),
        'trips_details' => $approvedTrips
    ];
}

/**
 * Status Badges
 */
function getDriverStatusBadge(string $status): string {
    $isAr = isRtl();
    $map = [
        'active' => ['success', $isAr ? 'فعال' : 'Active'],
        'inactive' => ['secondary', $isAr ? 'غير فعال' : 'Inactive'],
        'on_leave' => ['warning', $isAr ? 'إجازة' : 'On Leave'],
        'suspended' => ['danger', $isAr ? 'موقوف' : 'Suspended'],
        'transferred' => ['info', $isAr ? 'منقول' : 'Transferred'],
        'resigned' => ['dark', $isAr ? 'مستقيل' : 'Resigned']
    ];
    $item = $map[$status] ?? ['secondary', $status];
    return sprintf('<span class="badge bg-%s">%s</span>', $item[0], $item[1]);
}

function getTripStatusBadge(string $status): string {
    $isAr = isRtl();
    $map = [
        'draft' => ['secondary', $isAr ? 'مسودة' : 'Draft'],
        'pending' => ['warning text-dark', $isAr ? 'قيد المراجعة' : 'Pending'],
        'approved' => ['success', $isAr ? 'معتمدة' : 'Approved'],
        'rejected' => ['danger', $isAr ? 'مرفوضة' : 'Rejected'],
        'cancelled' => ['dark', $isAr ? 'ملغاة' : 'Cancelled']
    ];
    $item = $map[$status] ?? ['secondary', $status];
    return sprintf('<span class="badge bg-%s">%s</span>', $item[0], $item[1]);
}

function getPayrollStatusBadge(string $status): string {
    $isAr = isRtl();
    $map = [
        'draft' => ['secondary', $isAr ? 'مسودة' : 'Draft'],
        'calculated' => ['info', $isAr ? 'تم الاحتساب' : 'Calculated'],
        'approved' => ['primary', $isAr ? 'معتمد' : 'Approved'],
        'paid' => ['success', $isAr ? 'مصروف' : 'Paid']
    ];
    $item = $map[$status] ?? ['secondary', $status];
    return sprintf('<span class="badge bg-%s">%s</span>', $item[0], $item[1]);
}
