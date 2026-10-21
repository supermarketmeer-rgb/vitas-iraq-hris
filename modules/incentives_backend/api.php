<?php
/**
 * Standalone Incentives Management System - Integration REST API
 * Provides endpoints for future HRMS payroll & employee synchronization
 */

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/FormulaEngine.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

// Health check endpoint (Public)
if ($action === 'health') {
    sendJsonResponse([
        'status'    => 'ok',
        'system'    => 'Standalone Incentives Management System',
        'database'  => DB_NAME,
        'timestamp' => date('c'),
    ]);
}

// All other endpoints require HR API Bearer Token
authenticateHrRequest();
$pdo = getDbConnection();

switch ($action) {
    /**
     * 1. GET Entitlements for Payroll Sync
     * GET /api.php?action=get_entitlements&period=YYYY-MM&status=Approved
     */
    case 'get_entitlements':
        $period = $_GET['period'] ?? date('Y-m');
        $statusFilter = $_GET['status'] ?? null;

        $sql = "SELECT id, period, employee_id, employee_name, office, incentives, transportation, bonus, total_entitlements, status, calculated_at 
                FROM ims_lo_entitlements WHERE period = :period";
        $params = [':period' => $period];

        if ($statusFilter) {
            $sql .= " AND status = :status";
            $params[':status'] = $statusFilter;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $loRecords = $stmt->fetchAll();

        // Supervisors
        $sqlSup = "SELECT id, period, supervisor_id, supervisor_name, office, supervised_officers_count, qualified_officers_count, average_repayment_rate, incentives, transportation, bonus, total_entitlements, status 
                   FROM ims_supervisor_entitlements WHERE period = :period";
        if ($statusFilter) {
            $sqlSup .= " AND status = :status";
        }
        $stmtSup = $pdo->prepare($sqlSup);
        $stmtSup->execute($params);
        $supRecords = $stmtSup->fetchAll();

        // Calculate Totals
        $totalInc = array_sum(array_column($loRecords, 'incentives')) + array_sum(array_column($supRecords, 'incentives'));
        $totalTrans = array_sum(array_column($loRecords, 'transportation')) + array_sum(array_column($supRecords, 'transportation'));
        $totalBonus = array_sum(array_column($loRecords, 'bonus')) + array_sum(array_column($supRecords, 'bonus'));
        $grandTotal = $totalInc + $totalTrans + $totalBonus;

        sendJsonResponse([
            'success' => true,
            'period'  => $period,
            'counts'  => [
                'loanOfficers' => count($loRecords),
                'supervisors'  => count($supRecords),
            ],
            'totals'  => [
                'totalIncentives'     => round($totalInc, 2),
                'totalTransportation' => round($totalTrans, 2),
                'totalBonus'          => round($totalBonus, 2),
                'grandTotal'          => round($grandTotal, 2),
                'currency'            => 'SAR',
            ],
            'loanOfficers' => $loRecords,
            'supervisors'  => $supRecords,
        ]);
        break;

    /**
     * 2. POST Sync Employees from HR System
     * POST /api.php?action=sync_employees
     */
    case 'sync_employees':
        $body = file_get_contents('php://input');
        $payload = json_decode($body, true);

        if (!isset($payload['employees']) || !is_array($payload['employees'])) {
            sendJsonResponse(['success' => false, 'error' => 'حقل employees مطلوب ويجب أن يكون مصفوفة'], 400);
        }

        $upsertStmt = $pdo->prepare("
            INSERT INTO ims_employees (id, employee_id, name, office, job_title, category, supervisor_id, status, effective_from, effective_to)
            VALUES (:id, :employee_id, :name, :office, :job_title, :category, :supervisor_id, :status, :effective_from, :effective_to)
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                office = VALUES(office),
                job_title = VALUES(job_title),
                category = VALUES(category),
                supervisor_id = VALUES(supervisor_id),
                status = VALUES(status),
                effective_from = VALUES(effective_from),
                effective_to = VALUES(effective_to)
        ");

        $syncedCount = 0;
        foreach ($payload['employees'] as $emp) {
            if (empty($emp['employeeId']) || empty($emp['name'])) continue;
            
            $upsertStmt->execute([
                ':id'             => 'emp_' . md5($emp['employeeId']),
                ':employee_id'    => $emp['employeeId'],
                ':name'           => $emp['name'],
                ':office'         => $emp['office'] ?? 'المكتب الرئيسي',
                ':job_title'      => $emp['jobTitle'] ?? 'مسؤول قروض',
                ':category'       => $emp['category'] ?? 'Loan Officer',
                ':supervisor_id'  => $emp['supervisorId'] ?? null,
                ':status'         => $emp['status'] ?? 'Active',
                ':effective_from' => $emp['effectiveFrom'] ?? date('Y-m-d'),
                ':effective_to'   => $emp['effectiveTo'] ?? null,
            ]);
            $syncedCount++;
        }

        sendJsonResponse([
            'success'     => true,
            'message'     => "تمت مزامنة {$syncedCount} موظف بنجاح",
            'syncedCount' => $syncedCount,
        ]);
        break;

    /**
     * 3. GET Current Period Calculation Status
     * GET /api.php?action=get_status&period=YYYY-MM
     */
    case 'get_status':
        $period = $_GET['period'] ?? date('Y-m');
        $stmt = $pdo->prepare("SELECT * FROM ims_period_summaries WHERE period = :period");
        $stmt->execute([':period' => $period]);
        $summary = $stmt->fetch();

        sendJsonResponse([
            'success' => true,
            'period'  => $period,
            'summary' => $summary ?: ['period' => $period, 'status' => 'Draft', 'message' => 'لم يتم الاحتساب بعد'],
        ]);
        break;

    default:
        sendJsonResponse([
            'success' => false,
            'error'   => "الإجراء '$action' غير معروف. الإجراءات المتاحة: health, get_entitlements, sync_employees, get_status",
        ], 400);
        break;
}
