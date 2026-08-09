export type RuleType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FORMULA' | 'SQL_QUERY' | 'PROGRESSIVE_TAX';

export type RuleStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';

export type VariableSourceType =
  | 'EMPLOYEE_PROFILE'
  | 'COMPANY_POLICY'
  | 'TAX_TABLE'
  | 'SQL_LOOKUP'
  | 'CALCULATED_AGGREGATE'
  | 'MANUAL_OVERRIDE';

export interface CalculationVariable {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  category: 'INPUT' | 'INTERMEDIATE' | 'OUTPUT' | 'SYSTEM';
  data_type: 'NUMBER' | 'PERCENTAGE' | 'BOOLEAN' | 'STRING' | 'CURRENCY';
  description_ar?: string;
  description_en?: string;
  is_system: boolean;
  default_value?: number | string | boolean;
  source_type?: VariableSourceType;
  source_mapping?: {
    table?: string;
    column?: string;
    lookup_key?: string;
    formula_expression?: string;
    parameter_code?: string;
    sql_query?: string;
    description?: string;
  };
  source_table?: string;
  source_column?: string;
  is_input?: boolean;
  status?: RuleStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CalculationParameter {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  value: number;
  unit?: string; // '%', 'IQD', 'USD', 'COUNT', etc.
  effective_from: string;
  effective_to?: string | null;
  description_ar?: string;
  description_en?: string;
  status: RuleStatus;
}

export interface TaxBracket {
  id: string;
  rule_version_id: string;
  bracket_order: number;
  name_ar: string;
  name_en: string;
  min_income: number;
  max_income: number | null; // null = unlimited
  tax_rate: number; // percentage (e.g. 3, 5, 10, 15)
  fixed_tax: number; // optional fixed amount for bracket
  effective_from: string;
  effective_to?: string | null;
  status: RuleStatus;
}

export interface RuleVersion {
  id: string;
  rule_id: string;
  version_number: number;
  version_code: string; // e.g. "v1.0", "v2.0"
  formula_or_query: string;
  parameters_json?: Record<string, any>;
  effective_from: string;
  effective_to?: string | null;
  status: RuleStatus;
  change_notes?: string;
  created_at: string;
  created_by?: string;
  activated_at?: string;
}

export interface CalculationRule {
  id: string;
  code: string; // e.g. "SS_EMPLOYEE_CONTRIB", "INCOME_TAX_PROGRESSIVE"
  category: 'SOCIAL_SECURITY' | 'INCOME_TAX' | 'GENERAL_PAYROLL' | 'EXEMPTION';
  name_ar: string;
  name_en: string;
  rule_type: RuleType;
  description_ar?: string;
  description_en?: string;
  execution_order: number;
  output_variable: string; // The variable populated by this rule
  dependencies: string[]; // List of variable codes or rule codes this rule depends on
  active_version_id?: string;
  versions: RuleVersion[];
  status: RuleStatus;
  effective_from: string;
  effective_to?: string | null;
}

export interface CalculationStepTrace {
  step_number: number;
  rule_code: string;
  rule_name_ar: string;
  rule_name_en: string;
  rule_type: RuleType;
  version_number: number;
  input_variables: Record<string, number | string>;
  formula_or_query: string;
  calculated_value: number;
  output_variable: string;
  bracket_details?: Array<{
    bracket_order: number;
    min_income: number;
    max_income: number | null;
    taxable_in_bracket: number;
    rate: number;
    tax_amount: number;
  }>;
  explanation_ar: string;
  explanation_en: string;
}

export interface PayrollCalculationSnapshot {
  id: string;
  employee_id: string;
  employee_name_ar: string;
  employee_name_en: string;
  employee_number: string;
  department_id: string;
  department_name: string;
  branch_id: string;
  branch_name: string;
  payroll_id?: string;
  payroll_period: string; // e.g. "2026-08"
  calculation_date: string;
  input_values: {
    basic_salary: number;
    allowances: Record<string, number>;
    total_allowances: number;
    gross_salary: number;
    dependents_count: number;
    is_resident: boolean;
    marital_status: 'SINGLE' | 'MARRIED' | 'MARRIED_WITH_DEPENDENTS';
    contract_type: 'PERMANENT' | 'TEMPORARY' | 'PART_TIME' | 'SPECIAL';
    custom_inputs?: Record<string, any>;
  };
  social_security_rule_version_id: string;
  tax_rule_version_id: string;
  calculation_result: {
    gross_salary: number;
    social_security_base: number;
    employee_social_security: number;
    employer_social_security: number;
    total_social_security: number;
    tax_exemptions: number;
    taxable_income: number;
    income_tax: number;
    total_deductions: number;
    net_salary: number;
    custom_outputs?: Record<string, number>;
  };
  step_traces: CalculationStepTrace[];
  created_at: string;
  created_by?: string;
  status: 'FINALIZED' | 'SIMULATION' | 'VOIDED';
}

export interface HREmployee {
  id: string;
  employee_number: string;
  name_ar: string;
  name_en: string;
  department_id: string;
  department_name_ar: string;
  department_name_en: string;
  branch_id: string;
  branch_name_ar: string;
  branch_name_en: string;
  position_ar: string;
  position_en: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  living_allowance: number;
  other_allowances: number;
  gross_salary: number;
  dependents_count: number;
  marital_status: 'SINGLE' | 'MARRIED' | 'MARRIED_WITH_DEPENDENTS';
  is_resident: boolean;
  contract_type: 'PERMANENT' | 'TEMPORARY' | 'PART_TIME' | 'SPECIAL';
  hire_date: string;
  is_active: boolean;
}

export interface Department {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  employee_count: number;
}

export interface Branch {
  id: string;
  name_ar: string;
  name_en: string;
  code: string;
  city: string;
}

export interface SimulationRequest {
  employee_id?: string;
  basic_salary: number;
  allowances: {
    housing?: number;
    transport?: number;
    living?: number;
    food?: number;
    other?: number;
  };
  dependents_count: number;
  marital_status: 'SINGLE' | 'MARRIED' | 'MARRIED_WITH_DEPENDENTS';
  is_resident: boolean;
  contract_type: 'PERMANENT' | 'TEMPORARY' | 'PART_TIME' | 'SPECIAL';
  calculation_date: string;
  custom_variables?: Record<string, number>;
  override_rule_versions?: Record<string, string>; // rule_code -> version_id
}

export interface SimulationResponse {
  success: boolean;
  calculation_date: string;
  summary: {
    basic_salary: number;
    total_allowances: number;
    gross_salary: number;
    social_security_base: number;
    employee_social_security: number;
    employer_social_security: number;
    total_social_security: number;
    tax_exemptions: number;
    taxable_income: number;
    income_tax: number;
    total_deductions: number;
    net_salary: number;
  };
  rules_applied: Array<{
    rule_code: string;
    rule_name_ar: string;
    rule_name_en: string;
    rule_type: RuleType;
    version_number: number;
    version_code: string;
    effective_from: string;
    effective_to?: string | null;
  }>;
  bracket_breakdown?: Array<{
    bracket_order: number;
    name_ar: string;
    name_en: string;
    min_income: number;
    max_income: number | null;
    taxable_amount: number;
    rate: number;
    tax_amount: number;
  }>;
  step_traces: CalculationStepTrace[];
  warnings?: string[];
}

// -------------------------------------------------------------
// Dependency Graph Analyzer Types
// -------------------------------------------------------------
export interface DependencyGraphNode {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: 'RULE' | 'INPUT_VAR' | 'INTERMEDIATE_VAR' | 'OUTPUT_VAR' | 'PARAMETER';
  level: number;
  dependencies: string[];
  dependents: string[];
  status?: RuleStatus;
  output_variable?: string;
  rule_type?: RuleType;
  execution_order?: number;
}

export interface DependencyGraphAnalysisResult {
  isValid: boolean;
  hasCycle: boolean;
  cyclePaths: string[][];
  missingVariables: Array<{
    rule_code: string;
    rule_name: string;
    missing_dependency: string;
  }>;
  orphanVariables: string[];
  topologicalOrder: string[];
  executionLevels: Array<{
    level: number;
    level_name: string;
    items: DependencyGraphNode[];
  }>;
  nodes: DependencyGraphNode[];
  edges: Array<{
    from: string;
    to: string;
    type: 'REQUIRES' | 'PRODUCES';
  }>;
  diagnostics: {
    total_rules: number;
    total_variables: number;
    total_parameters: number;
    total_edges: number;
    longest_path: number;
    max_dependency_depth: number;
  };
  errors: string[];
  warnings: string[];
}

// -------------------------------------------------------------
// Audit Logger Types
// -------------------------------------------------------------
export type AuditEventType =
  | 'RULE_CREATED'
  | 'RULE_UPDATED'
  | 'RULE_DELETED'
  | 'VERSION_CREATED'
  | 'VERSION_ACTIVATED'
  | 'VERSION_DEPRECATED'
  | 'VARIABLE_CREATED'
  | 'VARIABLE_UPDATED'
  | 'VARIABLE_MAPPING_CHANGED'
  | 'VARIABLE_DELETED'
  | 'PARAMETER_UPDATED'
  | 'TAX_BRACKET_UPDATED'
  | 'PRESET_APPLIED'
  | 'BULK_STATUS_CHANGE'
  | 'QUERY_VALIDATED'
  | 'DEPENDENCY_CHECK_FAILED'
  | 'PAYROLL_SNAPSHOT_GENERATED';

export interface AuditLogDiffItem {
  field: string;
  label_ar?: string;
  label_en?: string;
  old_value: any;
  new_value: any;
}

export interface AuditLogActor {
  user_id: string;
  name: string;
  email: string;
  role: string;
  ip_address: string;
}

export interface AuditLogRecord {
  id: string;
  event_id: string;
  timestamp: string;
  event_type: AuditEventType;
  actor: AuditLogActor;
  resource_type: 'RULE' | 'RULE_VERSION' | 'SYSTEM_VARIABLE' | 'PARAMETER' | 'TAX_BRACKET' | 'PRESET' | 'PAYROLL_SNAPSHOT';
  resource_id: string;
  rule_code?: string;
  summary_ar: string;
  summary_en: string;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  diff_summary: AuditLogDiffItem[];
  json_payload: string;
  checksum: string;
  bridge_sync_status: 'SYNCED_TO_HR_AUDIT_LOG' | 'PENDING_BRIDGE_SYNC' | 'FAILED';
  hr_audit_table_id?: string;
}

// -------------------------------------------------------------
// Safe SQL Query Validator Types
// -------------------------------------------------------------
export interface SqlQueryValidationResult {
  isValid: boolean;
  query: string;
  parsedTokens?: string[];
  allowedTablesUsed?: string[];
  allowedFunctionsUsed?: string[];
  parametersExtracted?: string[];
  securityViolations?: string[];
  astSummary?: {
    statementType: 'SELECT' | 'FORBIDDEN';
    targetTables: string[];
    hasWhereClause: boolean;
    hasParameters: boolean;
    estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  explanation: string;
  error?: string;
}

