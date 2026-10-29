/**
 * Types for Excel Incentives Extraction Module
 */

export interface EmployeePayoutRecord {
  /** Row sequence number # */
  index: number;
  /** Employee ID (extracted or cross-referenced, never fabricated) */
  employeeId: string;
  /** Office or branch name */
  office: string;
  /** Employee full name */
  employeeName: string;
  /** Job title (e.g. Loan Officer, Loan Officer Supervisor, Credit Coordinator) */
  jobTitle: string;
  /** Final Incentives amount (evaluated from Excel, null if missing/corrupt) */
  incentives: number | null;
  /** Final Transportation amount (evaluated from Excel, null if missing/corrupt) */
  transportation: number | null;
  /** Final Bonus amount (evaluated from Excel, null if missing/corrupt) */
  bonus: number | null;
  /** Currency designation (e.g. 'IQD') */
  currency: string;
  /** Source worksheet name */
  sourceSheet: string;
  /** Original row number in worksheet (1-indexed) */
  sourceRowNumber: number;
  /** Any row-level warnings (e.g. missing formula cache, ID cross-referenced) */
  warnings?: string[];
  /** Flag if zero was an explicit financial value */
  hasZeroValue?: boolean;
  /** Cross-referenced HRIS employee fields */
  matchedEmployeeId?: string | number;
  matchedEmployeeName?: string;
  matchedBadgeNo?: string;
  matchedWaid?: string;
  matchedDepartment?: string;
  matchedBranch?: string;
  isMatched?: boolean;
}

export interface SheetColumnMapping {
  employeeIdCol: number | null;
  officeCol: number | null;
  employeeNameCol: number | null;
  jobTitleCol: number | null;
  incentivesCol: number | null;
  transportationCol: number | null;
  bonusCol: number | null;
  headerRowIndex: number;
  headers: Record<number, string>;
}

export interface SheetEvaluationScore {
  sheetName: string;
  isLikelyPayout: boolean;
  score: number;
  matchReasons: string[];
  columnsFound: {
    hasIncentives: boolean;
    hasTransportation: boolean;
    hasBonus: boolean;
    hasEmployeeName: boolean;
    hasEmployeeId: boolean;
    hasOffice: boolean;
    hasJobTitle: boolean;
  };
  totalDataRows: number;
  mapping: SheetColumnMapping;
}

export interface WorkbookInspectionResult {
  fileName: string;
  fileSize: number;
  sheetNames: string[];
  selectedSheetName: string;
  sheetScores: SheetEvaluationScore[];
  columnMapping: SheetColumnMapping;
  detectedCurrency: string;
  records: EmployeePayoutRecord[];
  summary: PayoutSummary;
  auditMetrics: {
    totalFormulaCellsEvaluated: number;
    staleOrMissingFormulaCells: number;
    crossSheetIdMatches: number;
    zeroAmountValuesCount: number;
    skippedSubtotalRows: number;
  };
  warnings: string[];
  errors: string[];
}

export interface PayoutSummary {
  totalEmployees: number;
  totalIncentives: number;
  totalTransportation: number;
  totalBonus: number;
  grandTotal: number;
  currency: string;
  officesCount: number;
  jobTitlesCount: number;
  validZeroAmountsCount: number;
}

export type SortField =
  | 'index'
  | 'employeeId'
  | 'office'
  | 'employeeName'
  | 'jobTitle'
  | 'incentives'
  | 'transportation'
  | 'bonus';

export type SortDirection = 'asc' | 'desc';
