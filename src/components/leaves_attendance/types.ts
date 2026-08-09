export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export type UserRole = 'employee' | 'manager' | 'hr_admin' | 'system_admin';

export interface CurrentUser {
  id: number;
  employee_id: number;
  employee_number: string;
  name_ar: string;
  name_en: string;
  email: string;
  role: UserRole;
  role_name_ar: string;
  role_name_en: string;
  department_id: number;
  department_name_ar: string;
  department_name_en: string;
  branch_id: number;
  branch_name_ar: string;
  branch_name_en: string;
  position_ar: string;
  position_en: string;
  manager_id: number | null;
  manager_name_ar: string | null;
  manager_name_en: string | null;
  biometric_id: string;
  avatar_url?: string;
  permissions: string[];
}

export interface Department {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  manager_id: number | null;
  manager_name_ar?: string;
  manager_name_en?: string;
  active: boolean;
}

export interface Branch {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  city: string;
  is_headquarter: boolean;
  active: boolean;
}

export interface Position {
  id: number;
  code: string;
  title_ar: string;
  title_en: string;
  grade: string;
}

export interface Employee {
  id: number;
  employee_number: string;
  name_ar: string;
  name_en: string;
  email: string;
  phone: string;
  department_id: number;
  department_name_ar?: string;
  department_name_en?: string;
  branch_id: number;
  branch_name_ar?: string;
  branch_name_en?: string;
  position_id: number;
  position_ar?: string;
  position_en?: string;
  manager_id: number | null;
  manager_name_ar?: string;
  manager_name_en?: string;
  employment_status: 'active' | 'probation' | 'resigned' | 'suspended';
  hire_date: string;
  biometric_id: string;
  schedule_id: number;
  schedule_name_ar?: string;
  schedule_name_en?: string;
  active: boolean;
}

export type BiometricConnectionType = 'sql_server' | 'mysql' | 'api' | 'zkteco_tcp' | 'cloud_push';

export interface BiometricServerSettings {
  id: number;
  server_name: string;
  host: string;
  ip_address: string;
  port: number;
  db_name?: string;
  username?: string;
  password?: string;
  connection_type: BiometricConnectionType;
  is_active: boolean;
  auto_sync_enabled: boolean;
  auto_sync_interval_mins: number;
  last_sync_at: string | null;
  last_sync_status: 'success' | 'failed' | 'idle' | 'in_progress';
  last_sync_log: string | null;
  total_logs_fetched: number;
}

export interface BiometricTestResult {
  success: boolean;
  status: 'connected' | 'unreachable' | 'invalid_credentials' | 'db_error' | 'timeout';
  message_ar: string;
  message_en: string;
  latency_ms: number;
  device_info?: {
    model: string;
    firmware: string;
    serial_number: string;
    enrolled_users: number;
    log_count: number;
  };
}

export interface RawAttendanceLog {
  id: number;
  device_id: string;
  employee_biometric_id: string;
  employee_name_ar?: string;
  employee_name_en?: string;
  employee_number?: string;
  punch_datetime: string;
  punch_type: 'check_in' | 'check_out' | 'break_out' | 'break_in' | 'auto';
  verify_mode: 'fingerprint' | 'face' | 'card' | 'pin';
  sync_batch_id: string;
  is_processed: boolean;
  created_at: string;
}

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'late'
  | 'early_leave'
  | 'late_early_leave'
  | 'on_leave'
  | 'public_holiday'
  | 'weekend'
  | 'missing_punch'
  | 'excused';

export interface AttendancePunch {
  id: number;
  punch_time: string;
  punch_type: 'check_in' | 'check_out' | 'break_out' | 'break_in' | 'unknown';
  source: 'biometric' | 'manual_correction' | 'admin_edit';
  verify_mode?: string;
  is_valid: boolean;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_number: string;
  employee_name_ar: string;
  employee_name_en: string;
  department_name_ar: string;
  department_name_en: string;
  branch_name_ar: string;
  branch_name_en: string;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  first_punch: string | null;
  last_punch: string | null;
  punches: AttendancePunch[];
  worked_minutes: number;
  regular_minutes: number;
  break_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  status: AttendanceStatus;
  notes?: string;
  is_corrected: boolean;
  correction_request_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimesheetSummary {
  id: number;
  employee_id: number;
  employee_number: string;
  employee_name_ar: string;
  employee_name_en: string;
  department_name_ar: string;
  department_name_en: string;
  branch_name_ar: string;
  branch_name_en: string;
  date_or_period: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  scheduled_hours: number;
  worked_hours: number;
  break_hours: number;
  regular_hours: number;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_hours: number;
  leave_hours: number;
  absent_hours: number;
  present_days?: number;
  absent_days?: number;
  leave_days?: number;
  status: 'normal' | 'overtime' | 'shortage' | 'approved';
  is_approved: boolean;
}

export interface LeaveType {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  is_paid: boolean;
  requires_approval: boolean;
  requires_attachment: boolean;
  max_days_per_year: number;
  allow_hourly_leave: boolean;
  deduct_from_balance: boolean;
  include_weekends: boolean;
  include_holidays: boolean;
  active: boolean;
  color_badge: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  employee_number?: string;
  employee_name_ar?: string;
  employee_name_en?: string;
  leave_type_id: number;
  leave_type_code: string;
  leave_type_name_ar: string;
  leave_type_name_en: string;
  year: number;
  entitled_days: number;
  carried_forward_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
}

export type LeaveRequestStatus =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'returned';

export interface LeaveRequestApprovalStage {
  id: number;
  stage_order: number;
  approver_id: number;
  approver_name_ar: string;
  approver_name_en: string;
  role_name_ar: string;
  role_name_en: string;
  action: 'pending' | 'approved' | 'rejected' | 'returned';
  comments?: string;
  action_at?: string | null;
}

export interface LeaveRequest {
  id: number;
  request_number: string;
  employee_id: number;
  employee_number: string;
  employee_name_ar: string;
  employee_name_en: string;
  department_name_ar: string;
  department_name_en: string;
  branch_name_ar: string;
  branch_name_en: string;
  leave_type_id: number;
  leave_type_code: string;
  leave_type_name_ar: string;
  leave_type_name_en: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  total_days: number;
  total_hours?: number;
  is_hourly: boolean;
  reason: string;
  attachment_url?: string;
  attachment_name?: string;
  is_emergency: boolean;
  contact_during_leave?: string;
  current_approver_id: number | null;
  current_approver_name_ar?: string;
  current_approver_name_en?: string;
  status: LeaveRequestStatus;
  manager_comment?: string;
  rejection_reason?: string;
  approval_history: LeaveRequestApprovalStage[];
  created_at: string;
  updated_at: string;
}

export type ScheduleType = 'fixed' | 'shift' | 'rotating' | 'flexible' | 'part_time';

export interface WorkDayConfig {
  day_of_week: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  day_name_ar: string;
  day_name_en: string;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  required_hours: number;
}

export interface EmployeeSchedule {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  schedule_type: ScheduleType;
  default_start_time: string;
  default_end_time: string;
  grace_period_minutes: number;
  early_leave_tolerance_minutes: number;
  break_duration_minutes: number;
  weekend_days: string[];
  days_config: WorkDayConfig[];
  is_default: boolean;
  active: boolean;
}

export interface PublicHoliday {
  id: number;
  name_ar: string;
  name_en: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_paid: boolean;
  recurring_yearly: boolean;
  active: boolean;
}

export interface AttendanceCorrectionRequest {
  id: number;
  request_number: string;
  employee_id: number;
  employee_number: string;
  employee_name_ar: string;
  employee_name_en: string;
  department_name_ar: string;
  department_name_en: string;
  attendance_record_id: number;
  date: string;
  original_in: string | null;
  original_out: string | null;
  requested_in: string;
  requested_out: string;
  reason: string;
  attachment_url?: string;
  approver_id: number;
  approver_name_ar: string;
  approver_name_en: string;
  status: 'pending' | 'approved' | 'rejected' | 'returned';
  rejection_reason?: string;
  manager_comment?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceProcessingRules {
  grace_period_minutes: number;
  early_leave_grace_minutes: number;
  overtime_min_minutes: number;
  missing_punch_penalty_hours: number;
  auto_deduct_break_if_unpunched: boolean;
  break_duration_minutes: number;
  half_day_hours_threshold: number;
  allow_multiple_punches: boolean;
  punch_pairing_strategy: 'first_last' | 'in_out_sequence';
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string | number;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface DashboardStats {
  today_date: string;
  total_employees: number;
  today_attendance: {
    present: number;
    absent: number;
    late: number;
    on_leave: number;
    missing_punch: number;
    early_leave: number;
  };
  leave_requests: {
    pending: number;
    approved_this_month: number;
    rejected_this_month: number;
  };
  my_attendance_today: {
    scheduled_start: string;
    scheduled_end: string;
    check_in: string | null;
    check_out: string | null;
    worked_hours: string;
    status: AttendanceStatus;
  };
  my_leave_balances: LeaveBalance[];
  manager_stats?: {
    pending_leave_approvals: number;
    pending_correction_approvals: number;
    team_total: number;
    team_present_today: number;
    team_absent_today: number;
    team_on_leave_today: number;
  };
}
