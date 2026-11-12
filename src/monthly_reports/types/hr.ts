export type Language = 'en' | 'ar';

export type EmploymentType = 'Office Job' | 'Field Job' | 'All';
export type ManagementTier = 'Non Management' | 'Middle Management' | 'Senior Management' | 'All';

export interface Employee {
  id: string;
  num: number;
  name: string;
  position: string;
  positionLevel1?: string;
  positionLevel2?: string;
  microfinPosition?: string;
  branchVsMO: string;
  hireDate: string | null;
  contractEnds: string | null;
  isNewHire: boolean;
  isTerminated: boolean;
  office: string;
  department: string;
  category: string;
  adminLine: string;
  gender: string;
  tier: string;
  cellular?: string;
  email?: string;
  dateOfBirth?: string | null;
  supervisor?: string;
  perfRating: number;
  annualBasicSalary: number;
  monthlyBasicSalary: number;
  annualAllowances: number;
  monthlyAllowances: number;
  citizenship: string;
}

export interface PayrollRecord {
  id: string;
  month: string; // YYYY-MM
  employeeName: string;
  office: string;
  department: string;
  position: string;
  basicSalary: number;
  phoneAllowance: number;
  incentives: number;
  transportation: number;
  bonus: number;
  familyAllowance: number;
  certificateAllowance: number;
  overtime: number;
  socialSecurity12: number;
  totalAllowances: number;
  totalIncentives: number;
  totalBonuses: number;
  grossSalary: number;
}

export interface TurnoverEvent {
  id: string;
  name: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  tenureYears: number;
  probPeriod: boolean;
  month: string; // YYYY-MM
  isNewHire: boolean;
  isTerminated: boolean;
  office: string;
  gender: string;
  category: string;
  tier: string;
  reason: string;
}

export interface StatusChange {
  id: string;
  office: string;
  name: string;
  oldPosition: string;
  changeDate: string;
  newPosition: string;
}

export interface GlobalSnapshot {
  id: string;
  month: string; // YYYY-MM
  office: string;
  fullOfficeName: string;
  maleOffice: number;
  femaleOffice: number;
  totalOffice: number;
  maleField: number;
  femaleField: number;
  totalField: number;
  securityGuards: number;
  maleLoanOfficers: number;
  femaleLoanOfficers: number;
  totalLoanOfficers: number;
  collectionOfficers: number;
  totalFemaleStaff: number;
  totalMaleStaff: number;
  staffHired: number;
  staffLeft: number;
  totalStaff: number;
}

export interface ValidationIssue {
  type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  field: string;
  description: string;
}

export interface HrMasterDataset {
  metadata: {
    generatedAt: string;
    organization: string;
    sourceWorkbooks: Array<{
      filename: string;
      records: number;
      type: string;
    }>;
    reportingPeriods: {
      payrollMonths: string[];
      latestMonth: string;
      activeHeadcount: number;
      currency: string;
    };
  };
  employees: Employee[];
  statusChanges: StatusChange[];
  turnoverEvents: TurnoverEvent[];
  payrollRecords: PayrollRecord[];
  globalSnapshots: GlobalSnapshot[];
  validationIssues: ValidationIssue[];
}

export interface HqWorkbookRecord {
  id: string;
  num: number;
  name: string;
  cellular: string;
  dateOfBirth: string;
  email: string;
  position: string;
  citizenship: string;
  secondCitizenship: string;
  supervisor: string;
  perfRating: string;
  perfRatingNum: number;
  periodInPosition: number;
  office: string;
  type: string;
  gender: string;
  hireDate: string;
  releaseDate: string;
  salary: number;
  monthlySalary: number;
  earnings2: number;
  adjust1: number;
  adjust2: number;
}

export interface RosterWorkbookRecord {
  id: string;
  num: number;
  name: string;
  position1: string;
  position2: string;
  microfinHeadcount: string;
  branchVsMO: string;
  hireDate: string;
  contractEnds: string;
  newHire: string;
  terminated: string;
  office: string;
  department: string;
  category: string;
  adminLine: string;
  gender: string;
  tier: string;
}

export interface GlobalWorkbookRecord {
  id: string;
  month: string;
  office: string;
  maleOffice: number;
  femaleOffice: number;
  totalOffice: number;
  maleField: number;
  femaleField: number;
  totalLineField: number;
  totalField: number;
  securityGuards: number;
  maleLoanOfficers: number;
  collectionOfficers: number;
  femaleLoanOfficers: number;
  femaleCollectionOfficers: number;
  totalLoanOfficers: number;
  totalFemaleStaff: number;
  totalCollectionStaff: number;
  staffHired: number;
  staffLeft: number;
  movedFromOtherBranch: number;
  movedToOtherBranch: number;
  totalStaff: number;
  differenceCheck: number;
}

export interface MicrofinWorkbookRecord {
  id: string;
  month: string;
  name: string;
  microfinPosition: string;
  branchVsMO: string;
  department: string;
  office: string;
  startDate: string;
  basicSalary: number;
  phoneAllowance: number;
  incentives: number;
  transportation: number;
  bonus: number;
  familyAllowance: number;
  certificateAllowance: number;
  overtime: number;
  socialSecurity12: number;
  grossSalary: number;
}

export type ReportCategory = 
  | 'WORKBOOKS'
  | 'EMPLOYEE' 
  | 'ATTENDANCE' 
  | 'PAYROLL' 
  | 'INCENTIVES' 
  | 'TURNOVER' 
  | 'MANAGEMENT';

export interface ColumnDefinition {
  key: string;
  headerEn: string;
  headerAr: string;
  type: 'string' | 'number' | 'currency' | 'date' | 'percent';
  align?: 'left' | 'center' | 'right';
  width?: number;
  sortable?: boolean;
}

export interface ReportDefinition {
  id: string;
  category: ReportCategory;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  supportLevel: 'FULL' | 'PARTIAL';
  supportNoteEn?: string;
  supportNoteAr?: string;
  dataSourceNote: string;
  columns: ColumnDefinition[];
  defaultColumns: string[];
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  kpis: string[]; // List of KPI IDs to compute
  recommendedCharts: Array<{
    type: 'bar' | 'column' | 'line' | 'pie' | 'donut' | 'area';
    titleEn: string;
    titleAr: string;
    xAxis: string;
    yAxis: string;
    groupField?: string;
  }>;
}

export interface FilterState {
  reportId: string;
  periodType: 'month' | 'quarter' | 'year' | 'ytd' | 'custom';
  selectedYear: string;
  selectedMonth: string; // YYYY-MM
  selectedQuarter: string; // Q1, Q2, Q3, Q4
  fromDate: string;
  toDate: string;
  office: string; // 'All' or specific office
  department: string; // 'All' or specific department
  category: string; // 'All' | 'Office Job' | 'Field Job'
  gender: string; // 'All' | 'Male' | 'Female'
  tier: string; // 'All' | 'Non Management' | ...
  searchQuery: string;
}

export interface KpiCardData {
  id: string;
  titleEn: string;
  titleAr: string;
  value: string | number;
  unit?: string;
  comparisonValue?: string | number;
  percentageChange?: number;
  trend: 'up' | 'down' | 'neutral';
  isPositive: boolean; // Note: e.g. increase in turnover is negative
  descriptionEn: string;
  descriptionAr: string;
}

export interface ChartConfigItem {
  id: string;
  type: 'bar' | 'column' | 'line' | 'area' | 'pie' | 'donut';
  titleEn: string;
  titleAr: string;
  xAxis: string;
  yAxis: string;
  groupField?: string;
  aggregation: 'sum' | 'count' | 'avg';
}

export interface MonthlySnapshotRecord {
  id: string;
  month: string;
  approvedAt: string;
  approvedBy: string;
  organization: string;
  totalHeadcount: number;
  totalPayroll: number;
  totalIncentives: number;
  turnoverRate: number;
  reportCount: number;
  notes: string;
  isLocked: boolean;
}

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: string;
  reportId: string;
  selectedColumns: string[];
  filters: Partial<FilterState>;
  charts: ChartConfigItem[];
}
