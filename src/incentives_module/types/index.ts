export type EmployeeCategory = 'Loan Officer' | 'Loan Officer Supervisor';

export type EmploymentStatus = 'Active' | 'On Leave' | 'Inactive';

export type CalculationPeriodStatus = 'Draft' | 'Calculated' | 'Under Review' | 'Approved' | 'Locked';

export type UserRole = 'admin' | 'specialist' | 'reviewer' | 'approver';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  office: string;
}

export interface Employee {
  id: string; // Internal unique ID
  employeeId: string; // Institutional / HR Employee ID (e.g. VTS-5666 or HR-LO-201)
  badgeNo?: string; // Badge Number (e.g. B-9042)
  waid?: string; // Work / Agency ID for incentives loading (e.g. WA-1008)
  name: string;
  office: string; // Branch / Office
  jobTitle: string;
  category: EmployeeCategory;
  supervisorId?: string; // Links Loan Officer to a Loan Officer Supervisor
  status: EmploymentStatus;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD or empty
  phone?: string;
  email?: string;
}

export type VariableDataType = 'number' | 'percentage' | 'currency' | 'integer';

export interface VariableDefinition {
  id: string; // e.g. "var_01"
  code: string; // e.g. "Variable01" or "LOANS_COUNT"
  nameAr: string; // Arabic label
  nameEn: string; // English label
  dataType: VariableDataType;
  unit: string; // e.g. "قرض", "د.ع", "%", "عميل"
  description: string;
  defaultValue: number;
  minValue?: number;
  maxValue?: number;
}

export interface ImportedVariableRow {
  employeeId: string;
  badgeNo?: string;
  waid?: string; // Matching by WAID for loading incentives
  employeeName?: string;
  office?: string;
  variables: Record<string, number>; // { Variable01: 45, Variable02: 250000, ... }
  isValid: boolean;
  errors?: string[];
  originalRowIndex?: number;
}

export interface ImportBatch {
  id: string;
  period: string; // YYYY-MM
  fileName: string;
  sheetName: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  importedBy: string;
  importedAt: string;
  columnMappings: Record<string, string>;
  rows: ImportedVariableRow[];
}

export type FormulaType = 'lo_incentives' | 'lo_transportation' | 'lo_bonus' | 'supervisor_incentives';

export interface FormulaDefinition {
  id: string;
  type: FormulaType;
  nameAr: string;
  nameEn: string;
  expression: string;
  description: string;
  version: number;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string;
  isActive: boolean;
  updatedBy: string;
  updatedAt: string;
  testCases?: Array<{
    name: string;
    inputs: Record<string, number>;
    expectedOutput: number;
  }>;
}

export interface CalculationBreakdownStep {
  step: string;
  formula: string;
  evaluatedExpression: string;
  result: number;
  note?: string;
}

export interface LoanOfficerEntitlement {
  id: string;
  batchId: string;
  period: string; // YYYY-MM
  employeeId: string; // Institutional ID
  badgeNo?: string;
  waid?: string; // WAID for incentives identification
  employeeName: string;
  office: string;
  supervisorId?: string;
  supervisorName?: string;
  
  // Input variables snapshot
  variablesSnapshot: Record<string, number>;

  // Calculated entitlement components
  incentives: number;
  transportation: number;
  bonus: number;
  totalEntitlements: number;

  // Formula version snapshot
  formulaVersionsUsed: {
    incentivesVersion: number;
    transportationVersion: number;
    bonusVersion: number;
  };

  breakdown: {
    incentivesSteps?: CalculationBreakdownStep[];
    transportationSteps?: CalculationBreakdownStep[];
    bonusSteps?: CalculationBreakdownStep[];
  };

  status: CalculationPeriodStatus;
  calculatedAt: string;
  calculatedBy: string;
  revision: number;
}

export interface SupervisorEntitlement {
  id: string;
  batchId: string;
  period: string; // YYYY-MM
  supervisorId: string; // Institutional ID
  badgeNo?: string;
  waid?: string;
  supervisorName: string;
  office: string;

  // Rollup of supervised loan officers
  supervisedOfficersCount: number;
  qualifiedOfficersCount: number;
  totalDisbursedAmount: number;
  totalDisbursedCount: number;
  averageRepaymentRate: number;
  totalTeamIncentives: number;
  averageTeamIncentives: number;
  supervisedOfficerIds: string[];

  // Supervisor Calculated Components
  incentives: number;
  transportation: number;
  bonus: number;
  totalEntitlements: number;

  formulaVersionUsed: number;
  formulaExpression: string;
  breakdownSteps: CalculationBreakdownStep[];

  status: CalculationPeriodStatus;
  calculatedAt: string;
  calculatedBy: string;
  revision: number;
}

export interface PeriodSummary {
  period: string; // YYYY-MM
  status: CalculationPeriodStatus;
  loCount: number;
  supervisorCount: number;
  totalIncentives: number;
  totalTransportation: number;
  totalBonus: number;
  grandTotal: number;
  lastCalculatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  lockedBy?: string;
  lockedAt?: string;
  recalculationNotes?: Array<{
    reason: string;
    requestedBy: string;
    timestamp: string;
    revision: number;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  category: 'AUTH' | 'EMPLOYEES' | 'VARIABLES' | 'FORMULAS' | 'IMPORT' | 'CALCULATION' | 'APPROVAL' | 'BACKUP' | 'HR_API';
  details: string;
  affectedEntityId?: string;
  ipAddress?: string;
  previousValue?: string;
  newValue?: string;
}

export interface AppSettings {
  institutionNameAr: string;
  institutionNameEn: string;
  currency: string;
  databaseName: string;
  enableStrictParCheck: boolean;
  minParThreshold: number;
  recalculationRequiresReason: boolean;
  hrApiToken: string;
  exportDateFormat: string;
}
