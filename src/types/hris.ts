export interface Department {
  id: number;
  code: string;
  name: string;
  name_ar: string;
  name_en?: string;
  manager_name: string;
  manager_location_status?: 'in_country' | 'abroad';
  description?: string;
  status: 'active' | 'inactive' | 'Active' | 'Inactive';
  offices_count?: number;
  active_employees_count?: number;
  positions_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Office {
  id: number | string;
  department_id?: number | string;
  department_name?: string;
  department_name_ar?: string;
  name: string;
  name_ar: string;
  name_en?: string;
  code?: string;
  city: string;
  country: string;
  address: string;
  status: 'active' | 'inactive' | 'Active' | 'Inactive';
  active_employees_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface JobPosition {
  id: number;
  department_id?: number | null;
  department_name?: string;
  department_name_ar?: string;
  supervisor_position_id?: number | null;
  supervisor_title?: string;
  supervisor_title_ar?: string;
  title: string;
  title_ar: string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  code?: string;
  status: 'active' | 'inactive' | 'Active' | 'Inactive';
  active_employees_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: number | string;
  employee_id?: string;
  badge_no?: string;
  waid?: string;
  wa_id?: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  full_name_ar?: string;
  full_name_en?: string;
  email: string;
  department_id?: number | string;
  department?: string;
  department_name?: string;
  department_name_ar?: string;
  office_id?: number | string;
  office_name?: string;
  office_city?: string;
  branch?: string;
  job_position_id?: number;
  position?: string;
  position_ar?: string;
  position_en?: string;
  position_title?: string;
  raw_job_title?: string;
  supervisor_employee_id?: number | null;
  supervisor_name?: string;
  status: string;
  hire_date?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NormalizationRule {
  id: number;
  rule_type: 'prefix' | 'suffix' | 'alias' | 'regex';
  pattern: string;
  replacement: string;
  is_active: number;
  created_at?: string;
}

export interface OrgNode {
  id: string;
  type: 'top_management' | 'department' | 'offices' | 'position';
  title: string;
  title_ar?: string;
  subtitle?: string;
  department_id?: number;
  department_name?: string;
  manager_location_status?: 'in_country' | 'abroad';
  employee_count?: number;
  original_position_ids?: number[];
  supervisor_position_id?: number | null;
  metadata?: {
    offices_count?: number;
    offices_list?: Array<{ id: number | string; name: string; name_ar: string; city: string; employee_count: number }>;
    raw_titles_breakdown?: Record<string, number>;
    employees?: Array<{
      id: number | string;
      employee_number: string;
      name: string;
      name_ar?: string;
      raw_title: string;
      office_name: string;
      status: string;
    }>;
    manager_name?: string;
    manager_location_status?: 'in_country' | 'abroad';
    code?: string;
    has_circular_reference?: boolean;
    missing_supervisor?: boolean;
    conflict_notes?: string;
    reports_to?: string;
    reports_to_ar?: string;
  };
  co_managers?: OrgNode[];
  children: OrgNode[];
}

export interface IntegrityIssue {
  type: 'circular_loop' | 'missing_supervisor' | 'orphaned_position' | 'normalization_conflict' | 'unassigned_employee';
  severity: 'error' | 'warning' | 'info';
  message: string;
  message_ar: string;
  entity_type: string;
  entity_id: number | string;
  details?: any;
}

export interface AcceptanceTestResult {
  id: number;
  name: string;
  name_ar: string;
  passed: boolean;
  message: string;
  details?: any;
}

export interface AcceptanceTestReport {
  allPassed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  results: AcceptanceTestResult[];
  executedAt: string;
}
