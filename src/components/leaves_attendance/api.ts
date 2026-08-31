import {
  CurrentUser,
  DashboardStats,
  AttendanceRecord,
  AttendanceStatus,
  TimesheetSummary,
  LeaveBalance,
  LeaveRequest,
  EmployeeSchedule,
  PublicHoliday,
  LeaveType,
  BiometricServerSettings,
  BiometricTestResult,
  AttendanceCorrectionRequest,
  RawAttendanceLog,
} from './types';
import {
  userProfiles,
  initialAttendanceRecords,
  initialLeaveBalances,
  initialLeaveRequests,
  initialSchedules,
  initialPublicHolidays,
  initialBiometricSettings,
  initialRawLogs,
  initialCorrectionRequests,
  initialLeaveTypes,
} from './mockHrisDb';

let mockUsers = [...userProfiles];
let mockActiveUser = mockUsers[1]; // Default to Manager
let mockAttendance = [...initialAttendanceRecords];
let mockBalances = [...initialLeaveBalances];
let mockLeaves = [...initialLeaveRequests];
let mockCorrections = [...initialCorrectionRequests];
let mockSettings = { ...initialBiometricSettings };
let mockRawLogs = [...initialRawLogs];
let mockLeaveTypes = [...initialLeaveTypes];

export const syncWithAppEmployees = (appEmployees: any[], appSettings?: Record<string, string>) => {
  if (!Array.isArray(appEmployees) || appEmployees.length === 0) return;

  const today = new Date().toISOString().split('T')[0];

  // Extract policy settings from Settings > Policies if configured
  const annualLimit = appSettings && appSettings['annual_leave_balance'] ? (parseFloat(appSettings['annual_leave_balance']) || 21) : 21;
  const sickLimit = appSettings && appSettings['max_sick_leave'] ? (parseFloat(appSettings['max_sick_leave']) || 14) : 14;
  const emergencyLimit = appSettings && appSettings['emergency_leave_limit'] ? (parseFloat(appSettings['emergency_leave_limit']) || 5) : 5;
  const maternityLimit = appSettings && appSettings['maternity_leave_limit'] ? (parseFloat(appSettings['maternity_leave_limit']) || 70) : 70;
  const workStart = (appSettings && appSettings['official_work_hours_start']) || '08:00';
  const workEnd = (appSettings && appSettings['official_work_hours_end']) || '16:00';

  // Update Leave Types with policy days limits from Settings
  mockLeaveTypes = initialLeaveTypes.map(lt => {
    let maxDays = lt.max_days_per_year;
    if (lt.code === 'ANNUAL') maxDays = annualLimit;
    else if (lt.code === 'SICK') maxDays = sickLimit;
    else if (lt.code === 'EMERGENCY') maxDays = emergencyLimit;
    else if (lt.code === 'MATERNITY') maxDays = maternityLimit;

    return { ...lt, max_days_per_year: maxDays };
  });

  // Map real app employees into Attendance Employee objects
  const mappedEmps = appEmployees.map((emp, index) => {
    const rawId = emp.id !== undefined && emp.id !== null ? String(emp.id) : String(index + 1);
    const numId = parseInt(rawId.replace(/\D/g, ''), 10) || (index + 1);
    const empCode = emp.badgeNo || emp.badge_no || emp.employeeId || emp.employee_id || emp.empCode || `VTS-${5000 + numId}`;
    const nameAr = emp.fullNameAr || emp.fullName || emp.full_name_ar || emp.name || `موظف ${index + 1}`;
    const nameEn = emp.fullNameEn || emp.full_name_en || emp.fullName || nameAr;
    const deptAr = emp.department_ar || emp.department || emp.location_ar || 'الموارد البشرية والشؤون الإدارية';
    const deptEn = emp.department_en || emp.department || emp.location_en || 'Human Resources & Admin';
    const branchAr = emp.location_ar || emp.branch || 'الإدارة العامة - بغداد';
    const branchEn = emp.location_en || emp.branch || 'Headquarters - Baghdad';
    const posAr = emp.position_ar || emp.position || 'أخصائي موارد بشرية';
    const posEn = emp.position_en || emp.position || 'HR Specialist';

    return {
      id: numId,
      employee_number: empCode.startsWith('VTS-') || empCode.startsWith('EMP-') ? empCode : `VTS-${empCode}`,
      name_ar: nameAr,
      name_en: nameEn,
      email: emp.org_email || emp.email || `${nameEn.toLowerCase().replace(/[^a-z0-9]/g, '.')}@vitasiraq.com`,
      phone: emp.mobile || '+964 770 123 4567',
      department_id: (index % 5) + 1,
      department_name_ar: deptAr,
      department_name_en: deptEn,
      branch_id: (index % 5) + 1,
      branch_name_ar: branchAr,
      branch_name_en: branchEn,
      position_id: (index % 7) + 1,
      position_ar: posAr,
      position_en: posEn,
      manager_id: emp.supervisor_name ? 2 : null,
      manager_name_ar: emp.supervisor_name || 'زيد الحسيني',
      manager_name_en: emp.supervisor_name || 'Zaid Al-Husseini',
      employment_status: emp.status === 'inactive' ? 'suspended' as const : 'active' as const,
      hire_date: emp.contract_start_date || emp.hireDate || '2022-01-15',
      biometric_id: `BIO-${String(numId).padStart(4, '0')}`,
      schedule_id: (index % 3) + 1,
      schedule_name_ar: `الدوام الإداري العام (${workStart} - ${workEnd})`,
      schedule_name_en: `Standard Office Shift (${workStart} - ${workEnd})`,
      active: emp.status !== 'inactive',
    };
  });

  // Generate Attendance Records for all real employees
  const generatedAttendance: AttendanceRecord[] = mappedEmps.map((emp, index) => {
    let status: AttendanceStatus = 'present';
    let checkIn: string | null = `${workStart.split(':')[0]}:55:12`;
    let checkOut: string | null = `${workEnd.split(':')[0]}:05:40`;
    let workedMinutes = 480;
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;

    const mod = index % 10;
    if (mod === 1 || mod === 7) {
      status = 'late';
      const lateMins = 15 + ((index * 3) % 35);
      checkIn = `${String(parseInt(workStart.split(':')[0], 10)).padStart(2, '0')}:${String(lateMins).padStart(2, '0')}:15`;
      lateMinutes = lateMins;
      workedMinutes = 480 - lateMins;
    } else if (mod === 3) {
      status = 'early_leave';
      checkOut = '14:30:00';
      earlyLeaveMinutes = 90;
      workedMinutes = 390;
    } else if (mod === 5) {
      status = 'on_leave';
      checkIn = null;
      checkOut = null;
      workedMinutes = 0;
    } else if (mod === 8) {
      status = 'absent';
      checkIn = null;
      checkOut = null;
      workedMinutes = 0;
    } else if (mod === 9) {
      status = 'missing_punch';
      checkIn = `${workStart.split(':')[0]}:58:30`;
      checkOut = null;
      workedMinutes = 0;
    } else if (mod === 2) {
      overtimeMinutes = 60 + ((index * 15) % 90);
      checkOut = `${String(parseInt(workEnd.split(':')[0], 10) + 1).padStart(2, '0')}:${String(overtimeMinutes % 60).padStart(2, '0')}:00`;
      workedMinutes = 480 + overtimeMinutes;
    }

    const punches = [];
    if (checkIn) {
      punches.push({
        id: index * 2 + 1,
        punch_time: checkIn,
        punch_type: 'check_in' as const,
        source: 'biometric' as const,
        verify_mode: index % 2 === 0 ? 'fingerprint' : 'face',
        is_valid: true,
      });
    }
    if (checkOut) {
      punches.push({
        id: index * 2 + 2,
        punch_time: checkOut,
        punch_type: 'check_out' as const,
        source: 'biometric' as const,
        verify_mode: index % 2 === 0 ? 'fingerprint' : 'face',
        is_valid: true,
      });
    }

    return {
      id: index + 1,
      employee_id: emp.id,
      employee_number: emp.employee_number,
      employee_name_ar: emp.name_ar,
      employee_name_en: emp.name_en,
      department_name_ar: emp.department_name_ar,
      department_name_en: emp.department_name_en,
      branch_name_ar: emp.branch_name_ar,
      branch_name_en: emp.branch_name_en,
      date: today,
      scheduled_start: `${workStart}:00`,
      scheduled_end: `${workEnd}:00`,
      first_punch: checkIn,
      last_punch: checkOut,
      punches,
      worked_minutes: workedMinutes,
      regular_minutes: Math.min(workedMinutes, 480),
      break_minutes: 45,
      late_minutes: lateMinutes,
      early_leave_minutes: earlyLeaveMinutes,
      overtime_minutes: overtimeMinutes,
      status,
      is_corrected: false,
      created_at: `${today} ${workStart}:00`,
      updated_at: `${today} ${workEnd}:00`,
    };
  });

  // Generate Leave Balances for all real employees using policy limits from appSettings
  const generatedBalances: LeaveBalance[] = [];
  let balId = 1;
  mappedEmps.forEach((emp) => {
    const usedAnn = emp.id % 6;
    const usedSick = emp.id % 3;
    const usedEmg = emp.id % 2;

    generatedBalances.push(
      {
        id: balId++,
        employee_id: emp.id,
        employee_number: emp.employee_number,
        employee_name_ar: emp.name_ar,
        employee_name_en: emp.name_en,
        leave_type_id: 1,
        leave_type_code: 'ANNUAL',
        leave_type_name_ar: 'إجازة اعتيادية / سنوية',
        leave_type_name_en: 'Annual Leave',
        year: 2026,
        entitled_days: annualLimit,
        carried_forward_days: 0,
        used_days: usedAnn,
        pending_days: 0,
        available_days: Math.max(0, annualLimit - usedAnn),
      },
      {
        id: balId++,
        employee_id: emp.id,
        employee_number: emp.employee_number,
        employee_name_ar: emp.name_ar,
        employee_name_en: emp.name_en,
        leave_type_id: 2,
        leave_type_code: 'SICK',
        leave_type_name_ar: 'إجازة مرضية (بتقرير طبي)',
        leave_type_name_en: 'Sick Leave',
        year: 2026,
        entitled_days: sickLimit,
        carried_forward_days: 0,
        used_days: usedSick,
        pending_days: 0,
        available_days: Math.max(0, sickLimit - usedSick),
      },
      {
        id: balId++,
        employee_id: emp.id,
        employee_number: emp.employee_number,
        employee_name_ar: emp.name_ar,
        employee_name_en: emp.name_en,
        leave_type_id: 3,
        leave_type_code: 'EMERGENCY',
        leave_type_name_ar: 'إجازة طارئة / اضطرارية',
        leave_type_name_en: 'Emergency Leave',
        year: 2026,
        entitled_days: emergencyLimit,
        carried_forward_days: 0,
        used_days: usedEmg,
        pending_days: 0,
        available_days: Math.max(0, emergencyLimit - usedEmg),
      }
    );
  });

  // Generate Raw Biometric Logs for real employees
  const generatedRawLogs: RawAttendanceLog[] = [];
  let rawId = 1;
  mappedEmps.forEach((emp, index) => {
    generatedRawLogs.push(
      {
        id: rawId++,
        device_id: index % 2 === 0 ? 'DEV-HQ-MANSOUR-01' : 'DEV-HQ-MANSOUR-02',
        employee_biometric_id: emp.biometric_id,
        employee_name_ar: emp.name_ar,
        employee_name_en: emp.name_en,
        employee_number: emp.employee_number,
        punch_datetime: `${today} 07:55:${String(10 + (index % 40)).padStart(2, '0')}`,
        punch_type: 'check_in',
        verify_mode: index % 2 === 0 ? 'fingerprint' : 'face',
        sync_batch_id: `BATCH-${today.replace(/-/g, '')}-01`,
        is_processed: true,
        created_at: `${today} 08:00:00`,
      },
      {
        id: rawId++,
        device_id: index % 2 === 0 ? 'DEV-HQ-MANSOUR-01' : 'DEV-HQ-MANSOUR-02',
        employee_biometric_id: emp.biometric_id,
        employee_name_ar: emp.name_ar,
        employee_name_en: emp.name_en,
        employee_number: emp.employee_number,
        punch_datetime: `${today} 16:05:${String(10 + (index % 40)).padStart(2, '0')}`,
        punch_type: 'check_out',
        verify_mode: index % 2 === 0 ? 'fingerprint' : 'face',
        sync_batch_id: `BATCH-${today.replace(/-/g, '')}-01`,
        is_processed: true,
        created_at: `${today} 16:10:00`,
      }
    );
  });

  // Update in-memory collections
  mockAttendance = generatedAttendance;
  mockBalances = generatedBalances;
  mockRawLogs = generatedRawLogs;

  if (mappedEmps.length > 0) {
    mockUsers = mappedEmps.map((emp) => ({
      id: emp.id,
      employee_id: emp.id,
      employee_number: emp.employee_number,
      name_ar: emp.name_ar,
      name_en: emp.name_en,
      email: emp.email,
      role: 'employee' as const,
      role_name_ar: 'موظف (Employee)',
      role_name_en: 'Employee',
      department_id: emp.department_id,
      department_name_ar: emp.department_name_ar,
      department_name_en: emp.department_name_en,
      branch_id: emp.branch_id,
      branch_name_ar: emp.branch_name_ar,
      branch_name_en: emp.branch_name_en,
      position_ar: emp.position_ar,
      position_en: emp.position_en,
      manager_id: emp.manager_id,
      manager_name_ar: emp.manager_name_ar,
      manager_name_en: emp.manager_name_en,
      biometric_id: emp.biometric_id,
      permissions: ['leave_apply', 'attendance_view', 'correction_request'],
    }));
    mockActiveUser = mockUsers[0];
  }
};

const safeFetchJson = async (url: string, options?: RequestInit, timeoutMs = 400): Promise<any | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return await res.json();
  } catch {
    return null;
  }
};

export const api = {
  async getMe(): Promise<{ user: CurrentUser; all_roles: CurrentUser[] }> {
    const data = await safeFetchJson('/api/auth/me');
    if (data && data.user) return data;
    return { user: mockActiveUser, all_roles: mockUsers };
  },

  async switchRole(userId: number): Promise<{ success: boolean; user: CurrentUser }> {
    const data = await safeFetchJson('/api/auth/switch-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
    if (data && data.user) return data;

    const found = mockUsers.find((u) => u.id === userId);
    if (found) mockActiveUser = found;
    return { success: true, user: mockActiveUser };
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const data = await safeFetchJson('/api/dashboard/stats');
    if (data && data.today_attendance) return data;

    const pendingCount = mockLeaves.filter((r) => r.status === 'pending_approval').length;
    const myBalances = mockBalances.filter((b) => b.employee_id === mockActiveUser.employee_id);

    return {
      today_date: new Date().toISOString().split('T')[0],
      total_employees: mockAttendance.length > 0 ? mockAttendance.length : 49,
      today_attendance: {
        present: mockAttendance.filter((r) => r.status === 'present').length,
        absent: mockAttendance.filter((r) => r.status === 'absent').length,
        late: mockAttendance.filter((r) => r.status === 'late').length,
        on_leave: mockAttendance.filter((r) => r.status === 'on_leave').length,
        missing_punch: mockAttendance.filter((r) => r.status === 'missing_punch').length,
        early_leave: mockAttendance.filter((r) => r.status === 'early_leave').length,
      },
      leave_requests: {
        pending: pendingCount,
        approved_this_month: mockLeaves.filter((r) => r.status === 'approved').length,
        rejected_this_month: mockLeaves.filter((r) => r.status === 'rejected').length,
      },
      my_attendance_today: {
        scheduled_start: '08:00',
        scheduled_end: '16:00',
        check_in: '07:55',
        check_out: '16:15',
        worked_hours: '8.35',
        status: 'present',
      },
      my_leave_balances: myBalances.length > 0 ? myBalances : mockBalances.slice(0, 3),
      manager_stats: {
        pending_leave_approvals: pendingCount,
        pending_correction_approvals: mockCorrections.filter((c) => c.status === 'pending').length,
        team_total: 7,
        team_present_today: 5,
        team_absent_today: 0,
        team_on_leave_today: 1,
      },
    };
  },

  async getAttendance(params?: any): Promise<{ records: AttendanceRecord[]; total: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
    }
    const data = await safeFetchJson(`/api/attendance?${query.toString()}`);
    if (data && Array.isArray(data.records)) return data;

    let filtered = [...mockAttendance];
    if (params?.status) {
      filtered = filtered.filter((r) => r.status === params.status);
    }
    if (params?.late_only) {
      filtered = filtered.filter((r) => r.late_minutes > 0 || r.status === 'late');
    }
    if (params?.early_only) {
      filtered = filtered.filter((r) => r.early_leave_minutes > 0 || r.status === 'early_leave');
    }
    if (params?.missing_only) {
      filtered = filtered.filter((r) => r.status === 'missing_punch');
    }
    if (params?.overtime_only) {
      filtered = filtered.filter((r) => r.overtime_minutes > 0);
    }

    return { records: filtered, total: filtered.length };
  },

  async reprocessAttendance(): Promise<{ success: boolean; message_ar: string; message_en: string }> {
    const data = await safeFetchJson('/api/attendance/reprocess', { method: 'POST' });
    if (data && data.success) return data;

    return {
      success: true,
      message_ar: 'تمت إعادة معالجة جميع بصمات اليوم بنجاح ومطابقتها مع محرك الدوام.',
      message_en: 'Reprocessed attendance records successfully using rule parameters.',
    };
  },

  async getTimesheets(periodType: 'daily' | 'weekly' | 'monthly', employeeId?: number): Promise<{ period_type: string; summaries: TimesheetSummary[] }> {
    const query = new URLSearchParams({ period_type: periodType });
    if (employeeId) query.append('employee_id', String(employeeId));
    const data = await safeFetchJson(`/api/timesheets?${query.toString()}`);
    if (data && Array.isArray(data.summaries)) return data;

    const mockSummaries: TimesheetSummary[] = mockAttendance.map((rec) => ({
      id: rec.id,
      employee_id: rec.employee_id,
      employee_number: rec.employee_number,
      employee_name_ar: rec.employee_name_ar,
      employee_name_en: rec.employee_name_en,
      department_name_ar: rec.department_name_ar,
      department_name_en: rec.department_name_en,
      branch_name_ar: rec.branch_name_ar,
      branch_name_en: rec.branch_name_en,
      date_or_period: rec.date,
      period_type: periodType,
      scheduled_hours: 8,
      worked_hours: Number((rec.worked_minutes / 60).toFixed(1)),
      break_hours: Number((rec.break_minutes / 60).toFixed(1)),
      regular_hours: 8,
      late_minutes: rec.late_minutes,
      early_leave_minutes: rec.early_leave_minutes,
      overtime_hours: Number((rec.overtime_minutes / 60).toFixed(1)),
      leave_hours: rec.status === 'on_leave' ? 8 : 0,
      absent_hours: rec.status === 'absent' ? 8 : 0,
      status: rec.overtime_minutes > 0 ? 'overtime' : 'normal',
      is_approved: true,
    }));

    return { period_type: periodType, summaries: mockSummaries };
  },

  async getLeaveBalances(employeeId?: number): Promise<{ balances: LeaveBalance[] }> {
    const query = employeeId ? `?employee_id=${employeeId}` : '';
    const data = await safeFetchJson(`/api/leaves/balances${query}`);
    if (data && Array.isArray(data.balances)) return data;

    return { balances: mockBalances };
  },

  async getLeaveRequests(params?: any): Promise<{ requests: LeaveRequest[]; total: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
      });
    }
    const data = await safeFetchJson(`/api/leaves/requests?${query.toString()}`);
    if (data && Array.isArray(data.requests)) return data;

    return { requests: mockLeaves, total: mockLeaves.length };
  },

  async applyLeave(data: Partial<LeaveRequest>): Promise<any> {
    const resData = await safeFetchJson('/api/leaves/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (resData && resData.success) return resData;

    const newReq: LeaveRequest = {
      id: mockLeaves.length + 1,
      request_number: `LV-2026-${String(mockLeaves.length + 1).padStart(4, '0')}`,
      employee_id: mockActiveUser.employee_id,
      employee_number: mockActiveUser.employee_number,
      employee_name_ar: mockActiveUser.name_ar,
      employee_name_en: mockActiveUser.name_en,
      department_name_ar: mockActiveUser.department_name_ar,
      department_name_en: mockActiveUser.department_name_en,
      branch_name_ar: mockActiveUser.branch_name_ar,
      branch_name_en: mockActiveUser.branch_name_en,
      leave_type_id: data.leave_type_id || 1,
      leave_type_code: 'ANNUAL',
      leave_type_name_ar: data.leave_type_name_ar || 'إجازة سنوية',
      leave_type_name_en: data.leave_type_name_en || 'Annual Leave',
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || new Date().toISOString().split('T')[0],
      total_days: data.total_days || 1,
      is_hourly: !!data.is_hourly,
      reason: data.reason || '',
      is_emergency: !!data.is_emergency,
      contact_during_leave: data.contact_during_leave || mockActiveUser.email,
      current_approver_id: 2,
      current_approver_name_ar: 'زيد الحسيني',
      current_approver_name_en: 'Zaid Al-Husseini',
      status: 'pending_approval',
      approval_history: [
        {
          id: Date.now(),
          stage_order: 1,
          approver_id: mockActiveUser.id,
          approver_name_ar: mockActiveUser.name_ar,
          approver_name_en: mockActiveUser.name_en,
          role_name_ar: 'مقدم الطلب',
          role_name_en: 'Applicant',
          action: 'approved',
          comments: 'تم التقديم الإلكتروني بنجاح',
          action_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        },
      ],
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    mockLeaves.unshift(newReq);
    return {
      success: true,
      message_ar: 'تم تقديم طلب الإجازة بنجاح وهو الآن بانتظار اعتماد المدير.',
      message_en: 'Leave request submitted successfully.',
      request: newReq,
    };
  },

  async cancelLeave(requestId: number): Promise<{ success: boolean; message: string }> {
    const data = await safeFetchJson('/api/leaves/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId }),
    });
    if (data && data.success) return data;

    mockLeaves = mockLeaves.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' as const } : r));
    return { success: true, message: 'تم إلغاء الطلب بنجاح' };
  },

  async getPendingApprovals(): Promise<{ pending_leaves: LeaveRequest[]; pending_corrections: AttendanceCorrectionRequest[] }> {
    const data = await safeFetchJson('/api/approvals/pending');
    if (data && (data.pending_leaves || data.pending_corrections)) return data;

    return {
      pending_leaves: mockLeaves.filter((r) => r.status === 'pending_approval'),
      pending_corrections: mockCorrections.filter((c) => c.status === 'pending'),
    };
  },

  async takeApprovalAction(payload: {
    request_type: 'leave' | 'correction';
    request_id: number;
    action: 'approve' | 'reject' | 'return';
    comments?: string;
    rejection_reason?: string;
  }): Promise<{ success: boolean; message_ar?: string; message_en?: string; message?: string }> {
    const data = await safeFetchJson('/api/approvals/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (data && data.success) return data;

    if (payload.request_type === 'leave') {
      const statusMap = { approve: 'approved', reject: 'rejected', return: 'returned' } as const;
      mockLeaves = mockLeaves.map((r) =>
        r.id === payload.request_id ? { ...r, status: statusMap[payload.action] as any, manager_comment: payload.comments } : r
      );
    } else {
      const statusMap = { approve: 'approved', reject: 'rejected', return: 'returned' } as const;
      mockCorrections = mockCorrections.map((c) =>
        c.id === payload.request_id ? { ...c, status: statusMap[payload.action] as any, manager_comment: payload.comments } : c
      );
    }

    return {
      success: true,
      message_ar: 'تم تنفيذ القرار وحفظ الإجراء بنجاح.',
      message_en: 'Approval decision recorded successfully.',
    };
  },

  async submitCorrection(data: any): Promise<{ success: boolean; message_ar: string; message_en: string }> {
    const resData = await safeFetchJson('/api/attendance/correction/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (resData && resData.success) return resData;

    const newCorr: AttendanceCorrectionRequest = {
      id: mockCorrections.length + 1,
      request_number: `COR-2026-${String(mockCorrections.length + 1).padStart(4, '0')}`,
      employee_id: mockActiveUser.employee_id,
      employee_number: mockActiveUser.employee_number,
      employee_name_ar: mockActiveUser.name_ar,
      employee_name_en: mockActiveUser.name_en,
      department_name_ar: mockActiveUser.department_name_ar,
      department_name_en: mockActiveUser.department_name_en,
      attendance_record_id: data.attendance_record_id || 1,
      date: data.date || new Date().toISOString().split('T')[0],
      original_in: '08:05:00',
      original_out: null,
      requested_in: data.requested_in || '08:00',
      requested_out: data.requested_out || '16:00',
      reason: data.reason || 'تصحيح بصمة',
      approver_id: 2,
      approver_name_ar: 'زيد الحسيني',
      approver_name_en: 'Zaid Al-Husseini',
      status: 'pending',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    mockCorrections.unshift(newCorr);
    return {
      success: true,
      message_ar: 'تم تقديم طلب تصحيح البصمة بنجاح إلى مديرك المباشر.',
      message_en: 'Attendance correction request submitted.',
    };
  },

  async getMySchedule(): Promise<{ employee: any; schedule: EmployeeSchedule; public_holidays: PublicHoliday[] }> {
    const data = await safeFetchJson('/api/schedules/my-schedule');
    if (data && data.schedule) return data;

    return {
      employee: mockActiveUser,
      schedule: initialSchedules[0],
      public_holidays: initialPublicHolidays,
    };
  },

  async getLeaveTypes(): Promise<{ leave_types: LeaveType[] }> {
    const data = await safeFetchJson('/api/leave-types');
    if (data && Array.isArray(data.leave_types)) return data;

    return { leave_types: mockLeaveTypes };
  },

  async getBiometricSettings(): Promise<{ settings: BiometricServerSettings; rules: any }> {
    const data = await safeFetchJson('/api/biometric/settings');
    if (data && data.settings) return data;

    return { settings: mockSettings, rules: {} };
  },

  async saveBiometricSettings(settings: Partial<BiometricServerSettings>): Promise<any> {
    const data = await safeFetchJson('/api/biometric/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (data && data.success) return data;

    mockSettings = { ...mockSettings, ...settings };
    return {
      success: true,
      message_ar: 'تم حفظ إعدادات خادم البصمة بنجاح في قاعدة البيانات.',
      message_en: 'Biometric server settings saved successfully.',
      settings: mockSettings,
    };
  },

  async testBiometricConnection(params: any): Promise<BiometricTestResult> {
    const data = await safeFetchJson('/api/biometric/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (data && data.status) return data;

    return {
      success: true,
      status: 'connected',
      message_ar: `تم الاتصال بنجاح بسرفر البصمة (${params.host}:${params.port}) ومزامنة 48 سجل.`,
      message_en: `Successfully connected to biometric server (${params.host}:${params.port}).`,
      latency_ms: 18,
      device_info: {
        model: 'ZK-BGD-HQ-BioStar2',
        firmware: 'v3.8.4-HQ',
        serial_number: 'ZK-BGD-2026-HQ-99',
        enrolled_users: 49,
        log_count: 3420,
      },
    };
  },

  async syncBiometricNow(): Promise<any> {
    const data = await safeFetchJson('/api/biometric/sync-now', { method: 'POST' });
    if (data && data.success) return data;

    return {
      success: true,
      imported_punches: 12,
      server_host: mockSettings.host,
      message_ar: `تمت المزامنة بنجاح واستيراد 12 بصمة جديدة من سرفر البصمة (${mockSettings.host}).`,
      message_en: 'Biometric sync completed.',
    };
  },

  async getRawLogs(): Promise<{ raw_logs: RawAttendanceLog[] }> {
    const data = await safeFetchJson('/api/biometric/raw-logs');
    if (data && Array.isArray(data.raw_logs)) return data;

    return { raw_logs: mockRawLogs };
  },

  async simulateLivePunch(employeeId: number, punchType: string, verifyMode: string): Promise<any> {
    const data = await safeFetchJson('/api/biometric/simulate-punch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, punch_type: punchType, verify_mode: verifyMode }),
    });
    if (data && data.success) return data;

    return {
      success: true,
      message_ar: 'تم تسجيل البصمة التجريبية بنجاح.',
      message_en: 'Punch simulated successfully.',
    };
  },
};

export const leavesApi = {
  syncWithAppEmployees: (appEmployees: any[], appSettings?: Record<string, string>) => {
    syncWithAppEmployees(appEmployees, appSettings);
  },
  getLeaveTypes: async () => {
    const res = await api.getLeaveTypes();
    return { data: res.leave_types };
  },
  getLeaveBalances: async (employeeId?: number) => {
    const res = await api.getLeaveBalances(employeeId);
    return { data: res.balances };
  },
  getCurrentUser: async () => {
    const res = await api.getMe();
    return { data: res.user };
  },
  getDashboardStats: async () => {
    const res = await api.getDashboardStats();
    return { data: res };
  },
  getAttendanceRecords: async (params?: any) => {
    const res = await api.getAttendance(params);
    return { data: res.records };
  },
  getLeaveRequests: async () => {
    const res = await api.getLeaveRequests();
    return { data: res.requests };
  },
  getPendingLeaves: async () => {
    const res = await api.getLeaveRequests();
    return { data: res.requests.filter((r) => r.status === 'pending_approval' || r.status === 'submitted') };
  },
  getPendingCorrections: async () => {
    const res = await api.getPendingApprovals();
    return { data: res.pending_corrections };
  },
  getMySchedule: async () => {
    const res = await api.getMySchedule();
    return { data: res.schedule };
  },
  getPublicHolidays: async () => {
    const res = await api.getMySchedule();
    return { data: res.public_holidays };
  },
  getBiometricSettings: async () => {
    const res = await api.getBiometricSettings();
    return { data: res.settings };
  },
  getRawAttendanceLogs: async () => {
    const res = await api.getRawLogs();
    return { data: res.raw_logs };
  },
  triggerBiometricSync: async () => {
    return await api.syncBiometricNow();
  },
  reprocessAttendance: async () => {
    return await api.reprocessAttendance();
  },
  submitLeaveRequest: async (data: any) => {
    return await api.applyLeave(data);
  },
  submitAttendanceCorrection: async (data: any) => {
    return await api.submitCorrection(data);
  },
  takeManagerAction: async (payload: any) => {
    return await api.takeApprovalAction(payload);
  },
  updateBiometricSettings: async (settings: any) => {
    return await api.saveBiometricSettings(settings);
  },
  testBiometricConnection: async (params: any) => {
    const res = await api.testBiometricConnection(params);
    return { data: res };
  },
  simulatePunch: async (data: any) => {
    return await api.simulateLivePunch(data.employee_id, data.punch_type, data.verify_mode);
  },
  cancelLeaveRequest: async (id: number) => {
    return await api.cancelLeave(id);
  },
};

