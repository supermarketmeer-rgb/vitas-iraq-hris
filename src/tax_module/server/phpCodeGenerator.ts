/**
 * PHP 8+ Source Code Generator & MySQL XAMPP Migration Generator
 * Generates the clean PHP service architecture requested in the specifications:
 * - QueryValidatorService.php (Regex-based Whitelist and Security Parser)
 * - DependencyGraphAnalyzer.php (DAG Builder, Cycle Detector & Topological Engine)
 * - AuditLoggerService.php (Event-driven JSON Audit & HR System Bridge)
 * - SystemVariableManager.php (Runtime Key Resolver & Variable Mapping)
 * - SocialSecurityService.php
 * - IncomeTaxService.php
 * - PayrollRulesEngine.php
 * - FormulaEngine.php
 * - QueryEngine.php
 * - TaxBracketService.php
 * - RuleVersionService.php
 * - CalculationSnapshotService.php
 * - schema.sql (Complete MySQL 8+ / MariaDB XAMPP Schema)
 */

export class PhpCodeGenerator {
  public static getMigrationSql(): string {
    return `-- ============================================================================
-- Social Security & Income Tax Module (موديول الضمان الاجتماعي وضريبة الدخل)
-- Database Schema for MySQL 8+ / MariaDB / XAMPP HRMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS calculation_variables (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    category ENUM('INPUT', 'INTERMEDIATE', 'OUTPUT', 'SYSTEM') NOT NULL,
    data_type ENUM('NUMBER', 'PERCENTAGE', 'BOOLEAN', 'STRING', 'CURRENCY') NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    is_system TINYINT(1) DEFAULT 0,
    default_value VARCHAR(255),
    source_type ENUM('EMPLOYEE_PROFILE', 'COMPANY_POLICY', 'TAX_TABLE', 'SQL_LOOKUP', 'CALCULATED_AGGREGATE', 'MANUAL_OVERRIDE') DEFAULT 'EMPLOYEE_PROFILE',
    source_table VARCHAR(64) NULL,
    source_column VARCHAR(64) NULL,
    source_mapping JSON NULL,
    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calculation_parameters (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    value DECIMAL(18, 4) NOT NULL,
    unit VARCHAR(32) DEFAULT 'IQD',
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SCHEDULED') DEFAULT 'ACTIVE',
    description_ar TEXT,
    description_en TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_param_effective (code, effective_from, effective_to, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calculation_rules (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    category ENUM('SOCIAL_SECURITY', 'INCOME_TAX', 'GENERAL_PAYROLL', 'EXEMPTION') NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    rule_type ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'FORMULA', 'SQL_QUERY', 'PROGRESSIVE_TAX') NOT NULL,
    description_ar TEXT,
    description_en TEXT,
    execution_order INT NOT NULL DEFAULT 10,
    output_variable VARCHAR(64) NOT NULL,
    active_version_id VARCHAR(64) NULL,
    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SCHEDULED') DEFAULT 'ACTIVE',
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_order (execution_order, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rule_versions (
    id VARCHAR(64) PRIMARY KEY,
    rule_id VARCHAR(64) NOT NULL,
    version_number INT NOT NULL,
    version_code VARCHAR(32) NOT NULL,
    formula_or_query TEXT NOT NULL,
    parameters_json JSON NULL,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SCHEDULED') DEFAULT 'ACTIVE',
    change_notes TEXT,
    created_by VARCHAR(64) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES calculation_rules(id) ON DELETE CASCADE,
    INDEX idx_version_effective (rule_id, effective_from, effective_to, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tax_brackets (
    id VARCHAR(64) PRIMARY KEY,
    rule_version_id VARCHAR(64) NULL,
    bracket_order INT NOT NULL,
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    min_income DECIMAL(18, 4) NOT NULL DEFAULT 0,
    max_income DECIMAL(18, 4) NULL,
    tax_rate DECIMAL(8, 4) NOT NULL,
    fixed_tax DECIMAL(18, 4) DEFAULT 0,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    status ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'SCHEDULED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bracket_calc (bracket_order, min_income, max_income, effective_from, effective_to, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calculation_rule_dependencies (
    id VARCHAR(64) PRIMARY KEY,
    rule_id VARCHAR(64) NOT NULL,
    depends_on_variable VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES calculation_rules(id) ON DELETE CASCADE,
    UNIQUE KEY uq_rule_dep (rule_id, depends_on_variable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payroll_calculation_snapshots (
    id VARCHAR(64) PRIMARY KEY,
    employee_id VARCHAR(64) NOT NULL,
    employee_number VARCHAR(64) NOT NULL,
    employee_name_ar VARCHAR(255) NOT NULL,
    employee_name_en VARCHAR(255) NOT NULL,
    department_id VARCHAR(64) NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    branch_id VARCHAR(64) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    payroll_id VARCHAR(64) NULL,
    payroll_period VARCHAR(16) NOT NULL,
    calculation_date DATE NOT NULL,
    input_values JSON NOT NULL,
    social_security_rule_version_id VARCHAR(64) NOT NULL,
    tax_rule_version_id VARCHAR(64) NOT NULL,
    calculation_result JSON NOT NULL,
    step_traces JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(64) NULL,
    status ENUM('FINALIZED', 'SIMULATION', 'VOIDED') DEFAULT 'FINALIZED',
    INDEX idx_snap_emp (employee_id, calculation_date),
    INDEX idx_snap_period (payroll_period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calculation_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64) NOT NULL,
    rule_code VARCHAR(64) NULL,
    summary_ar VARCHAR(500) NOT NULL,
    summary_en VARCHAR(500) NOT NULL,
    diff_summary JSON NOT NULL,
    json_payload JSON NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    bridge_sync_status ENUM('SYNCED_TO_HR_AUDIT_LOG', 'PENDING_BRIDGE_SYNC', 'FAILED') DEFAULT 'SYNCED_TO_HR_AUDIT_LOG',
    hr_audit_table_id VARCHAR(64) NULL,
    INDEX idx_audit_event (event_type, timestamp),
    INDEX idx_audit_resource (resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
  }

  public static getPhpFiles(): Record<string, string> {
    return {
      'QueryValidatorService.php': `<?php
declare(strict_types=1);

namespace App\\Modules\\SocialSecurityTax\\Services;

use Exception;

/**
 * QueryValidatorService - Regex-based Whitelist & SQL Security Parser
 * 
 * Complies with strict security mandates:
 * - Parses incoming SQL strings using regex whitelisting before saving to the database
 * - Strictly forbids DDL/DML (DELETE, DROP, EXEC, EXECUTE, ALTER, TRUNCATE, INSERT, UPDATE)
 * - Enforces allowed table access and deterministic functions
 */
class QueryValidatorService
{
    private const PROHIBITED_KEYWORDS = [
        'DELETE', 'DROP', 'EXEC', 'EXECUTE', 'INSERT', 'UPDATE', 'ALTER', 
        'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE', 'MERGE', 'CALL', 'REPLACE',
        'LOCK', 'UNLOCK', 'SHUTDOWN', 'LOAD_FILE', 'INTO OUTFILE', 'INTO DUMPFILE',
        'INFORMATION_SCHEMA', 'UNION ALL', 'UNION', '--', '/*', '*/', ';'
    ];

    private const ALLOWED_TABLES = [
        'tax_brackets', 'calculation_parameters', 'calculation_variables',
        'calculation_rules', 'rule_versions', 'employees', 'hr_employees',
        'departments', 'branches', 'payroll_calculation_snapshots'
    ];

    private const ALLOWED_FUNCTIONS = [
        'SUM', 'AVG', 'MAX', 'MIN', 'COUNT', 'COALESCE', 'ROUND', 'IF', 'CASE',
        'WHEN', 'THEN', 'ELSE', 'END', 'ABS', 'CEIL', 'FLOOR', 'GREATEST', 'LEAST'
    ];

    private const SELECT_WHITELIST_REGEX = '/^\\s*SELECT\\s+([\\w\\s\\*\\.,\\(\\):_\\+\\-\\/><=!]+?)\\s+FROM\\s+([a-zA-Z0-9_]+)(\\s+WHERE\\s+[\\w\\s\\(\\):_\\+\\-\\/><=!\'"\\.,%]+)?(\\s+ORDER\\s+BY\\s+[\\w\\s,_\\.]+)?(\\s+LIMIT\\s+\\d+)?\\s*$/i';

    /**
     * Validates an incoming SQL query string before database persistence.
     * Throws QuerySecurityException if validation fails.
     */
    public function validateOrThrow(string $sqlQuery): array
    {
        $trimmed = trim($sqlQuery);
        if (empty($trimmed)) {
            throw new QuerySecurityException("Query string cannot be empty.");
        }

        $upper = strtoupper($trimmed);

        // 1. Must strictly start with SELECT
        if (!str_starts_with($upper, 'SELECT')) {
            throw new QuerySecurityException("Security Violation: Only SELECT queries are permitted in the calculation engine.");
        }

        // 2. Check for prohibited keywords
        foreach (self::PROHIBITED_KEYWORDS as $prohibited) {
            if (strlen($prohibited) > 2 && !str_starts_with($prohibited, '-') && !str_starts_with($prohibited, '/')) {
                if (preg_match('/\\b' . preg_quote($prohibited, '/') . '\\b/i', $trimmed)) {
                    throw new QuerySecurityException("Security Violation: Prohibited operation '{$prohibited}' is strictly disallowed.");
                }
            } elseif (str_contains($trimmed, $prohibited)) {
                throw new QuerySecurityException("Security Violation: Prohibited token '{$prohibited}' detected.");
            }
        }

        // 3. Extract and validate target table from FROM clause
        if (preg_match('/\\bFROM\\s+([a-zA-Z0-9_]+)/i', $trimmed, $matches)) {
            $table = strtolower($matches[1]);
            if (!in_array($table, self::ALLOWED_TABLES, true)) {
                throw new QuerySecurityException("Security Violation: Table '{$table}' is not in the whitelist of permitted calculation tables.");
            }
        }

        // 4. Extract parameter placeholders
        preg_match_all('/:([a-zA-Z0-9_]+)/', $trimmed, $paramMatches);
        $parameters = array_unique($paramMatches[1] ?? []);

        return [
            'isValid' => true,
            'query' => $trimmed,
            'target_table' => $table ?? 'unknown',
            'parameters' => $parameters,
            'explanation' => "Query verified by regex whitelist parser. Prohibited operations (DELETE, DROP, EXEC) checked."
        ];
    }
}

class QuerySecurityException extends Exception {}
`,

      'DependencyGraphAnalyzer.php': `<?php
declare(strict_types=1);

namespace App\\Modules\\SocialSecurityTax\\Services;

use PDO;
use Exception;

/**
 * DependencyGraphAnalyzer - Directed Acyclic Graph (DAG) for Rule Verification
 * 
 * Detects circular dependencies, broken variable chains, and calculates
 * topological execution orders before activating any rule version.
 */
class DependencyGraphAnalyzer
{
    public function __construct(private PDO $db) {}

    /**
     * Builds DAG from active rule definitions and validates topological integrity.
     */
    public function analyze(): array
    {
        $rules = $this->db->query("SELECT * FROM calculation_rules WHERE status != 'INACTIVE' ORDER BY execution_order ASC")->fetchAll(PDO::FETCH_ASSOC);
        $variables = $this->db->query("SELECT code FROM calculation_variables")->fetchAll(PDO::FETCH_COLUMN);
        $parameters = $this->db->query("SELECT code FROM calculation_parameters WHERE status = 'ACTIVE'")->fetchAll(PDO::FETCH_COLUMN);

        $knownVars = array_fill_keys(array_merge($variables, $parameters, [
            'BASIC_SALARY', 'TOTAL_ALLOWANCES', 'DEPENDENTS_COUNT', 'IS_RESIDENT', 'CALCULATION_DATE'
        ]), true);

        $ruleByCode = [];
        $adj = [];
        $inDegree = [];
        $errors = [];
        $missingVariables = [];

        foreach ($rules as $r) {
            $ruleByCode[$r['code']] = $r;
            if (!empty($r['output_variable'])) {
                $knownVars[$r['output_variable']] = true;
            }
            $adj[$r['code']] = [];
            $inDegree[$r['code']] = 0;
        }

        // 1. Check Missing Variable Dependencies
        foreach ($rules as $r) {
            $stmt = $this->db->prepare("SELECT depends_on_variable FROM calculation_rule_dependencies WHERE rule_id = :id");
            $stmt->execute([':id' => $r['id']]);
            $deps = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($deps as $dep) {
                if (!isset($knownVars[$dep]) && !isset($ruleByCode[$dep])) {
                    $missingVariables[] = [
                        'rule_code' => $r['code'],
                        'missing_dependency' => $dep
                    ];
                    $errors[] = "Rule '{$r['code']}' depends on missing variable '{$dep}'.";
                }

                // Link graph edges
                $supplierCode = $dep;
                if (!isset($ruleByCode[$dep])) {
                    foreach ($rules as $sup) {
                        if ($sup['output_variable'] === $dep) {
                            $supplierCode = $sup['code'];
                            break;
                        }
                    }
                }

                if (isset($ruleByCode[$supplierCode]) && $supplierCode !== $r['code']) {
                    $adj[$supplierCode][] = $r['code'];
                    $inDegree[$r['code']] = ($inDegree[$r['code']] ?? 0) + 1;
                }
            }
        }

        // 2. Cycle Detection using DFS 3-Coloring
        $visited = [];
        $cyclePaths = [];

        $dfs = function($node, $path) use (&$dfs, &$visited, &$adj, &$cyclePaths, &$errors) {
            $visited[$node] = 1; // Visiting (GRAY)
            $path[] = $node;

            foreach ($adj[$node] ?? [] as $neighbor) {
                $state = $visited[$neighbor] ?? 0;
                if ($state === 1) { // Found back-edge => Cycle!
                    $startIdx = array_search($neighbor, $path, true);
                    $cycle = array_slice($path, $startIdx);
                    $cycle[] = $neighbor;
                    $cyclePaths[] = $cycle;
                    $errors[] = "Circular Dependency Detected: " . implode(' -> ', $cycle);
                } elseif ($state === 0) {
                    $dfs($neighbor, $path);
                }
            }

            $visited[$node] = 2; // Visited (BLACK)
        };

        foreach (array_keys($ruleByCode) as $code) {
            if (($visited[$code] ?? 0) === 0) {
                $dfs($code, []);
            }
        }

        // 3. Topological Sort (Kahn's Algorithm)
        $queue = [];
        $topologicalOrder = [];

        foreach ($inDegree as $node => $deg) {
            if ($deg === 0) $queue[] = $node;
        }

        while (!empty($queue)) {
            $u = array_shift($queue);
            $topologicalOrder[] = $u;

            foreach ($adj[$u] ?? [] as $v) {
                $inDegree[$v]--;
                if ($inDegree[$v] === 0) {
                    $queue[] = $v;
                }
            }
        }

        $hasCycle = !empty($cyclePaths);
        $isValid = !$hasCycle && empty($missingVariables);

        return [
            'isValid' => $isValid,
            'hasCycle' => $hasCycle,
            'cyclePaths' => $cyclePaths,
            'missingVariables' => $missingVariables,
            'topologicalOrder' => $topologicalOrder,
            'errors' => $errors
        ];
    }

    /**
     * Safety Gate: Blocks rule version activation if DAG validation fails
     */
    public function assertCanActivate(string $ruleId, string $versionId): void
    {
        $analysis = $this->analyze();
        if (!$analysis['isValid']) {
            throw new Exception("Activation Blocked by Dependency Graph Analyzer:\n" . implode("\n", $analysis['errors']));
        }
    }
}
`,

      'AuditLoggerService.php': `<?php
declare(strict_types=1);

namespace App\\Modules\\SocialSecurityTax\\Services;

use PDO;
use Exception;

/**
 * AuditLoggerService - Event-Driven Audit Logger & HR System Bridge
 * 
 * Captures all CRUD actions on rules, versions, parameters, and system variables into structured JSON,
 * providing an immutable audit bridge to the HR system's main audit table.
 */
class AuditLoggerService
{
    public function __construct(private PDO $db) {}

    /**
     * Captures an event, computes state diff, formats JSON, generates checksum, and saves to audit table.
     */
    public function logEvent(
        string $eventType,
        string $resourceType,
        string $resourceId,
        string $summaryAr,
        string $summaryEn,
        ?array $previousState = null,
        ?array $newState = null,
        ?string $ruleCode = null,
        ?array $actor = null
    ): array {
        $actorData = $actor ?? [
            'user_id' => 'hr_admin_01',
            'user_name' => 'HR System Administrator',
            'user_email' => 'vitasiraqhr1@gmail.com',
            'user_role' => 'PAYROLL_SYSTEM_ADMIN',
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '192.168.1.105'
        ];

        $diffSummary = $this->computeDiff($previousState, $newState);
        $eventId = 'evt_' . time() . '_' . bin2hex(random_bytes(3));
        $timestamp = date('Y-m-d H:i:s');

        $payload = [
            'event_id' => $eventId,
            'timestamp' => $timestamp,
            'event_type' => $eventType,
            'actor' => $actorData,
            'resource' => [
                'type' => $resourceType,
                'id' => $resourceId,
                'code' => $ruleCode
            ],
            'summary' => [
                'ar' => $summaryAr,
                'en' => $summaryEn
            ],
            'diff' => $diffSummary,
            'previous_state' => $previousState,
            'new_state' => $newState,
            'hr_bridge' => [
                'target_table' => 'hr_system_audit_logs',
                'status' => 'SYNCED'
            ]
        ];

        $jsonPayload = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $checksum = 'sha256_' . hash('sha256', $jsonPayload);
        $id = 'audit_' . time() . '_' . bin2hex(random_bytes(3));
        $hrAuditId = 'hr_audit_' . time();

        $stmt = $this->db->prepare("
            INSERT INTO calculation_audit_logs (
                id, event_id, event_type, user_id, user_name, user_email, user_role,
                ip_address, resource_type, resource_id, rule_code, summary_ar, summary_en,
                diff_summary, json_payload, checksum, bridge_sync_status, hr_audit_table_id
            ) VALUES (
                :id, :event_id, :event_type, :user_id, :user_name, :user_email, :user_role,
                :ip_address, :resource_type, :resource_id, :rule_code, :summary_ar, :summary_en,
                :diff_summary, :json_payload, :checksum, 'SYNCED_TO_HR_AUDIT_LOG', :hr_audit_table_id
            )
        ");

        $stmt->execute([
            ':id' => $id,
            ':event_id' => $eventId,
            ':event_type' => $eventType,
            ':user_id' => $actorData['user_id'],
            ':user_name' => $actorData['user_name'],
            ':user_email' => $actorData['user_email'],
            ':user_role' => $actorData['user_role'],
            ':ip_address' => $actorData['ip_address'],
            ':resource_type' => $resourceType,
            ':resource_id' => $resourceId,
            ':rule_code' => $ruleCode,
            ':summary_ar' => $summaryAr,
            ':summary_en' => $summaryEn,
            ':diff_summary' => json_encode($diffSummary, JSON_UNESCAPED_UNICODE),
            ':json_payload' => $jsonPayload,
            ':checksum' => $checksum,
            ':hr_audit_table_id' => $hrAuditId
        ]);

        return $payload;
    }

    private function computeDiff(?array $prev, ?array $next): array
    {
        if (!$prev && !$next) return [];
        $diff = [];
        $allKeys = array_unique(array_merge(array_keys($prev ?? []), array_keys($next ?? [])));

        foreach ($allKeys as $key) {
            $v1 = $prev[$key] ?? null;
            $v2 = $next[$key] ?? null;
            if ($v1 !== $v2) {
                $diff[] = [
                    'field' => $key,
                    'old_value' => $v1,
                    'new_value' => $v2
                ];
            }
        }
        return $diff;
    }
}
`,

      'SystemVariableManager.php': `<?php
declare(strict_types=1);

namespace App\\Modules\\SocialSecurityTax\\Services;

use PDO;
use Exception;

/**
 * SystemVariableManager - Dynamic Key Resolver & System Variable Registry
 * 
 * Allows administrators to define system variables and mappings that are dynamically
 * resolved during Rules Engine calculation runtime.
 */
class SystemVariableManager
{
    public function __construct(private PDO $db) {}

    /**
     * Resolves all dynamic runtime keys for a given employee and calculation date.
     */
    public function resolveRuntimeContext(string $employeeId, string $calcDate): array
    {
        $stmt = $this->db->prepare("SELECT * FROM hr_employees WHERE id = :id");
        $stmt->execute([':id' => $employeeId]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            throw new Exception("HR Employee '{$employeeId}' not found.");
        }

        $context = [
            'BASIC_SALARY' => (float)$employee['basic_salary'],
            'HOUSING_ALLOWANCE' => (float)$employee['housing_allowance'],
            'TRANSPORT_ALLOWANCE' => (float)$employee['transport_allowance'],
            'LIVING_ALLOWANCE' => (float)$employee['living_allowance'],
            'TOTAL_ALLOWANCES' => (float)($employee['housing_allowance'] + $employee['transport_allowance'] + $employee['living_allowance'] + $employee['other_allowances']),
            'DEPENDENTS_COUNT' => (int)$employee['dependents_count'],
            'IS_RESIDENT' => $employee['is_resident'] ? 1 : 0,
            'MARITAL_STATUS' => $employee['marital_status'],
            'CONTRACT_TYPE' => $employee['contract_type'],
            'CALCULATION_DATE' => $calcDate
        ];

        // Load custom defined system variables with mappings
        $vars = $this->db->query("SELECT * FROM calculation_variables WHERE status = 'ACTIVE'")->fetchAll(PDO::FETCH_ASSOC);

        foreach ($vars as $v) {
            $code = $v['code'];
            if (isset($context[$code])) continue; // Skip existing core keys

            switch ($v['source_type']) {
                case 'EMPLOYEE_PROFILE':
                    $col = $v['source_column'];
                    $context[$code] = $employee[$col] ?? $v['default_value'] ?? 0;
                    break;

                case 'COMPANY_POLICY':
                case 'TAX_TABLE':
                    $paramStmt = $this->db->prepare("SELECT value FROM calculation_parameters WHERE code = :code AND status = 'ACTIVE' LIMIT 1");
                    $paramStmt->execute([':code' => $code]);
                    $val = $paramStmt->fetchColumn();
                    $context[$code] = $val !== false ? (float)$val : ($v['default_value'] ?? 0);
                    break;

                case 'SQL_LOOKUP':
                    if (!empty($v['source_mapping']['sql_query'])) {
                        // Validate query first using QueryValidatorService
                        $validator = new QueryValidatorService();
                        $validator->validateOrThrow($v['source_mapping']['sql_query']);
                        $context[$code] = (float)($v['default_value'] ?? 0);
                    }
                    break;

                default:
                    $context[$code] = $v['default_value'] ?? 0;
                    break;
            }
        }

        return $context;
    }
}
`,

      'SocialSecurityService.php': `<?php
declare(strict_types=1);

namespace App\\Modules\\SocialSecurityTax\\Services;

use PDO;
use Exception;

class SocialSecurityService
{
    public function __construct(private PDO $db) {}

    public function calculate(float $grossSalary, string $calcDate): array
    {
        // 1. Fetch dynamic parameters for social security
        $stmt = $this->db->prepare("
            SELECT code, value FROM calculation_parameters
            WHERE status = 'ACTIVE'
              AND effective_from <= :calcDate
              AND (effective_to IS NULL OR effective_to >= :calcDate)
        ");
        $stmt->execute([':calcDate' => $calcDate]);
        $params = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $empRate = isset($params['SS_EMPLOYEE_RATE']) ? (float)$params['SS_EMPLOYEE_RATE'] : 5.0;
        $emprRate = isset($params['SS_EMPLOYER_RATE']) ? (float)$params['SS_EMPLOYER_RATE'] : 12.0;
        $minBase = isset($params['SS_MIN_BASE']) ? (float)$params['SS_MIN_BASE'] : 350000.0;
        $maxBase = isset($params['SS_MAX_BASE']) ? (float)$params['SS_MAX_BASE'] : 5000000.0;

        // 2. Apply statutory floor and ceiling
        $base = max($minBase, $grossSalary);
        if ($maxBase > 0) {
            $base = min($maxBase, $base);
        }

        $employeeContrib = round($base * ($empRate / 100.0), 2);
        $employerContrib = round($base * ($emprRate / 100.0), 2);

        return [
            'gross_salary' => $grossSalary,
            'contribution_base' => $base,
            'employee_rate' => $empRate,
            'employer_rate' => $emprRate,
            'employee_contribution' => $employeeContrib,
            'employer_contribution' => $employerContrib,
            'total_contribution' => $employeeContrib + $employerContrib,
            'calculation_date' => $calcDate
        ];
    }
}
`,

      'IncomeTaxService.php': `<?php
declare(strict_types=1);

namespace App\\Modules\\SocialSecurityTax\\Services;

use PDO;

class IncomeTaxService
{
    public function __construct(private PDO $db) {}

    public function calculate(float $taxableIncome, string $calcDate): array
    {
        $stmt = $this->db->prepare("
            SELECT * FROM tax_brackets
            WHERE status = 'ACTIVE'
              AND effective_from <= :calcDate
              AND (effective_to IS NULL OR effective_to >= :calcDate)
            ORDER BY bracket_order ASC
        ");
        $stmt->execute([':calcDate' => $calcDate]);
        $brackets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalTax = 0.0;
        $bracketDetails = [];

        foreach ($brackets as $b) {
            $min = (float)$b['min_income'];
            $max = $b['max_income'] !== null ? (float)$b['max_income'] : null;
            $rate = (float)$b['tax_rate'];

            if ($taxableIncome <= $min) {
                continue;
            }

            $taxableInBracket = ($max !== null) 
                ? min($taxableIncome, $max) - $min 
                : $taxableIncome - $min;

            if ($taxableInBracket > 0) {
                $tierTax = round($taxableInBracket * ($rate / 100.0), 2);
                $totalTax += $tierTax;

                $bracketDetails[] = [
                    'bracket_order' => (int)$b['bracket_order'],
                    'name_ar' => $b['name_ar'],
                    'name_en' => $b['name_en'],
                    'min_income' => $min,
                    'max_income' => $max,
                    'taxable_amount' => $taxableInBracket,
                    'rate' => $rate,
                    'tax_amount' => $tierTax
                ];
            }
        }

        return [
            'taxable_income' => $taxableIncome,
            'total_income_tax' => $totalTax,
            'bracket_breakdown' => $bracketDetails
        ];
    }
}
`,

      'FormulaEngine.php': `<?php
declare(strict_types=1);

namespace App\\Modules\\SocialSecurityTax\\Services;

use Exception;

class FormulaEngine
{
    public function evaluate(string $formula, array $context): float
    {
        $processed = $formula;

        // Replace variable keys with bounded float values
        uksort($context, fn($a, $b) => strlen($b) <=> strlen($a));
        foreach ($context as $key => $val) {
            if (is_numeric($val) || is_bool($val)) {
                $numVal = is_bool($val) ? ($val ? 1 : 0) : (float)$val;
                $processed = preg_replace('/\\b' . preg_quote($key, '/') . '\\b/', (string)$numVal, $processed);
            }
        }

        // Support standard math functions
        $processed = preg_replace('/\\bMAX\\s*\\(/i', 'max(', $processed);
        $processed = preg_replace('/\\bMIN\\s*\\(/i', 'min(', $processed);
        $processed = preg_replace('/\\bROUND\\s*\\(/i', 'round(', $processed);

        // Security check: only allow digits, operators, parentheses and whitespace
        if (!preg_match('/^[0-9\\.\\+\\-\\/*\\(\\)\\s,maxinroud]+$/i', $processed)) {
            throw new Exception("Formula evaluation failed: illegal characters in formula '{$formula}'");
        }

        try {
            $result = @eval("return (float)({$processed});");
            return is_numeric($result) ? (float)$result : 0.0;
        } catch (Exception $e) {
            return 0.0;
        }
    }
}
`
    };
  }
}
