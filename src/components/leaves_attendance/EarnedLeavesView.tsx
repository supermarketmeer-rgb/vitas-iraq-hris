import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { AttendanceRecord, Language, LeaveBalance, LeaveRequest } from './types';
import { leavesApi } from './api';

interface EarnedLeavesViewProps {
  employees: any[];
  attendanceRecords: AttendanceRecord[];
  leaveBalances: LeaveBalance[];
  leaveRequests: LeaveRequest[];
  appSettings: Record<string, string>;
  lang: Language;
  onUpdateAppSettings?: (key: string, value: string) => void;
  onNavigate?: (tab: string) => void;
}

interface EmployeeEarnedLeaveRow {
  employeeId: number;
  employeeNumber: string;
  nameAr: string;
  nameEn: string;
  departmentAr: string;
  departmentEn: string;
  branchAr: string;
  branchEn: string;
  positionAr: string;
  positionEn: string;
  basicSalary: number;
  dailyBasicSalary: number;
  curryForward: number;
  annualLeave: number;
  takenLeaves: number;
  lateMinutes: number;
  lateHours: number;
  lateDeductionDays: number;
  earnedLeaveDays: number;
  earnedLeaveAmount: number;
  attendanceLateRecords: AttendanceRecord[];
}

export const EarnedLeavesView: React.FC<EarnedLeavesViewProps> = ({
  employees = [],
  attendanceRecords = [],
  leaveBalances = [],
  leaveRequests = [],
  appSettings = {},
  lang,
  onUpdateAppSettings,
  onNavigate,
}) => {
  const isAr = lang === 'ar';
  const safeAppSettings = appSettings || {};

  // Configurable parameters
  const defaultWorkHours = (() => {
    try {
      if (safeAppSettings['working_hours_per_day']) {
        return parseFloat(safeAppSettings['working_hours_per_day']) || 8;
      }
      const start = safeAppSettings['official_work_hours_start'] || '08:00';
      const end = safeAppSettings['official_work_hours_end'] || '16:00';
      const startH = parseInt((start || '08:00').split(':')[0], 10) || 8;
      const endH = parseInt((end || '16:00').split(':')[0], 10) || 16;
      const diff = endH - startH;
      return diff > 0 ? diff : 8;
    } catch {
      return 8;
    }
  })();

  const [workHoursPerDay, setWorkHoursPerDay] = useState<number>(defaultWorkHours);
  const [dayDivisor, setDayDivisor] = useState<number>(30); // Standard 30-day labor law basis

  // Global settings values
  const globalAnnualLeave = parseFloat(safeAppSettings['annual_leave_balance'] || '21') || 21;

  // Local overrides for curry forward per employee if adjusted manually
  const [customCurryOverrides, setCustomCurryOverrides] = useState<Record<string, number>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('vitas_emp_curry_forward');
        return stored ? JSON.parse(stored) : {};
      }
    } catch {
      // ignore
    }
    return {};
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [sortField, setSortField] = useState<'earnedLeaveDays' | 'earnedLeaveAmount' | 'name' | 'lateMinutes'>('earnedLeaveDays');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal inspection
  const [selectedRowForModal, setSelectedRowForModal] = useState<EmployeeEarnedLeaveRow | null>(null);

  // Quick edit mode
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editCurryValue, setEditCurryValue] = useState<string>('');

  // Extract Departments and Branches for filter dropdowns
  const departments = useMemo(() => {
    const set = new Set<string>();
    (employees || []).forEach(emp => {
      if (!emp) return;
      const d = isAr ? (emp.department_ar || emp.department || '') : (emp.department_en || emp.department || '');
      if (d) set.add(d);
    });
    return Array.from(set);
  }, [employees, isAr]);

  const branches = useMemo(() => {
    const set = new Set<string>();
    (employees || []).forEach(emp => {
      if (!emp) return;
      const b = isAr ? (emp.branch || emp.location_ar || '') : (emp.branch_en || emp.location_en || '');
      if (b) set.add(b);
    });
    return Array.from(set);
  }, [employees, isAr]);

  // Compute earned leaves for all employees
  const computedData: EmployeeEarnedLeaveRow[] = useMemo(() => {
    return (employees || []).map((emp, index) => {
      if (!emp) {
        return {
          employeeId: index + 1,
          employeeNumber: `EMP-${index + 1}`,
          nameAr: `موظف ${index + 1}`,
          nameEn: `Employee ${index + 1}`,
          departmentAr: 'الموارد البشرية',
          departmentEn: 'Human Resources',
          branchAr: 'الإدارة العامة',
          branchEn: 'Headquarters',
          positionAr: 'موظف',
          positionEn: 'Staff',
          basicSalary: 1000000,
          dailyBasicSalary: 33333.33,
          curryForward: 0,
          annualLeave: 21,
          takenLeaves: 0,
          lateMinutes: 0,
          lateHours: 0,
          lateDeductionDays: 0,
          earnedLeaveDays: 21,
          earnedLeaveAmount: 700000,
          attendanceLateRecords: [],
        };
      }

      const rawId = emp.id !== undefined && emp.id !== null ? String(emp.id) : String(index + 1);
      const empNumber = String(emp.employeeId || emp.employee_id || emp.id || `EMP-${index + 1}`).trim();
      const numId = parseInt(rawId.replace(/\D/g, ''), 10) || (index + 1);

      const nameAr = emp.fullNameAr || emp.fullName || emp.full_name_ar || emp.name || `موظف ${index + 1}`;
      const nameEn = emp.fullNameEn || emp.full_name_en || emp.fullName || nameAr;
      const deptAr = emp.department_ar || emp.department || 'الموارد البشرية';
      const deptEn = emp.department_en || emp.departmentEn || 'Human Resources';
      const branchAr = emp.location_ar || emp.branch || 'الإدارة العامة - بغداد';
      const branchEn = emp.branch_en || emp.branchEn || 'Headquarters - Baghdad';
      const posAr = emp.position_ar || emp.position || emp.jobTitle || 'موظف';
      const posEn = emp.position_en || emp.positionEn || emp.jobTitleEn || 'Staff';

      // Basic Salary
      const basicSalary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
      const dailyBasicSalary = basicSalary / (dayDivisor > 0 ? dayDivisor : 30);

      // Annual Leave Balance lookup
      const annualBalance = (leaveBalances || []).find(b => {
        if (!b) return false;
        const matchId = (b.employee_id === numId || (b.employee_number && b.employee_number === empNumber));
        const typeCode = (b.leave_type_code || '').toUpperCase();
        const typeAr = b.leave_type_name_ar || '';
        const typeEn = (b.leave_type_name_en || '').toLowerCase();
        const isAnnual = typeCode === 'ANNUAL' || typeAr.includes('اعتيادية') || typeEn.includes('annual');
        return matchId && isAnnual;
      });

      // Curry Forward:
      // Individual employee entitlement from Leave Balances table (carried_forward_days)
      let curryForward = 0;
      if (customCurryOverrides[empNumber] !== undefined) {
        curryForward = customCurryOverrides[empNumber];
      } else if (annualBalance && annualBalance.carried_forward_days !== undefined) {
        curryForward = annualBalance.carried_forward_days;
      } else if (emp.curry_forward !== undefined && emp.curry_forward !== null && emp.curry_forward !== '') {
        curryForward = Number(emp.curry_forward);
      } else if (emp.carry_forward !== undefined && emp.carry_forward !== null && emp.carry_forward !== '') {
        curryForward = Number(emp.carry_forward);
      }

      // Annual Leave entitlement
      const annualLeave = annualBalance?.entitled_days ?? globalAnnualLeave;

      // Taken Leaves (used days)
      let takenLeaves = annualBalance?.used_days ?? 0;
      if (takenLeaves === 0 && (leaveRequests || []).length > 0) {
        // Compute from approved leave requests
        const empApprovedRequests = (leaveRequests || []).filter(r =>
          r && (r.employee_id === numId || (r.employee_number && r.employee_number === empNumber)) &&
          (r.status === 'approved' || (r.status as any) === 'موافق عليه')
        );
        takenLeaves = empApprovedRequests.reduce((sum, r) => sum + (r.total_days || 0), 0);
      }

      // Late time from Attendance module
      // Find all records matching this employee
      const empAttendance = (attendanceRecords || []).filter(r =>
        r && (
          r.employee_id === numId ||
          (r.employee_number && r.employee_number === empNumber) ||
          (r.employee_name_ar && nameAr && r.employee_name_ar === nameAr)
        )
      );

      const lateMinutes = empAttendance.reduce((sum, r) => sum + (r.late_minutes || 0), 0);
      const lateHours = lateMinutes / 60;
      const lateRecords = empAttendance.filter(r => (r.late_minutes || 0) > 0);

      // Formula 1:
      // late time in attendance module / (عدد ساعات الدوام)
      const hoursPerDay = workHoursPerDay > 0 ? workHoursPerDay : 8;
      const lateDeductionDays = lateHours / hoursPerDay;

      // number of earned leave days = Curry forward + Annual leave - taken leaves - (late time / work hours)
      const rawEarnedDays = curryForward + annualLeave - takenLeaves - lateDeductionDays;
      const earnedLeaveDays = Number(rawEarnedDays.toFixed(2));

      // Formula 2:
      // Earned Leave Amount = (number of earned leave days) * amount of one day of basic salary
      const rawEarnedAmount = earnedLeaveDays * dailyBasicSalary;
      const earnedLeaveAmount = Math.round(rawEarnedAmount);

      return {
        employeeId: numId,
        employeeNumber: empNumber,
        nameAr,
        nameEn,
        departmentAr: deptAr,
        departmentEn: deptEn,
        branchAr,
        branchEn,
        positionAr: posAr,
        positionEn: posEn,
        basicSalary,
        dailyBasicSalary: Number(dailyBasicSalary.toFixed(2)),
        curryForward,
        annualLeave,
        takenLeaves,
        lateMinutes,
        lateHours: Number(lateHours.toFixed(2)),
        lateDeductionDays: Number(lateDeductionDays.toFixed(3)),
        earnedLeaveDays,
        earnedLeaveAmount,
        attendanceLateRecords: lateRecords,
      };
    });
  }, [
    employees,
    attendanceRecords,
    leaveBalances,
    leaveRequests,
    globalAnnualLeave,
    customCurryOverrides,
    workHoursPerDay,
    dayDivisor,
  ]);

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    return computedData
      .filter(row => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = row.nameAr.toLowerCase().includes(q) || row.nameEn.toLowerCase().includes(q);
          const matchNumber = row.employeeNumber.toLowerCase().includes(q);
          const matchDept = row.departmentAr.toLowerCase().includes(q) || row.departmentEn.toLowerCase().includes(q);
          if (!matchName && !matchNumber && !matchDept) return false;
        }

        if (selectedDept !== 'ALL') {
          const dept = isAr ? row.departmentAr : row.departmentEn;
          if (dept !== selectedDept) return false;
        }

        if (selectedBranch !== 'ALL') {
          const branch = isAr ? row.branchAr : row.branchEn;
          if (branch !== selectedBranch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === 'name') {
          valA = isAr ? a.nameAr : a.nameEn;
          valB = isAr ? b.nameAr : b.nameEn;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [computedData, searchQuery, selectedDept, selectedBranch, sortField, sortDirection, isAr]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const totalEmployees = filteredData.length;
    const totalEarnedDays = Number(filteredData.reduce((s, r) => s + r.earnedLeaveDays, 0).toFixed(1));
    const totalEarnedAmount = filteredData.reduce((s, r) => s + r.earnedLeaveAmount, 0);
    const totalLateHours = Number(filteredData.reduce((s, r) => s + r.lateHours, 0).toFixed(1));
    const totalDeductionDays = Number(filteredData.reduce((s, r) => s + r.lateDeductionDays, 0).toFixed(2));
    const avgEarnedDays = totalEmployees > 0 ? Number((totalEarnedDays / totalEmployees).toFixed(1)) : 0;

    return {
      totalEmployees,
      totalEarnedDays,
      totalEarnedAmount,
      totalLateHours,
      totalDeductionDays,
      avgEarnedDays,
    };
  }, [filteredData]);

  // Save inline curry forward edit and persist to leave balances table
  const handleSaveCurryOverride = async (empNumber: string) => {
    const parsed = parseFloat(editCurryValue);
    if (!isNaN(parsed) && parsed >= 0) {
      setCustomCurryOverrides(prev => ({
        ...prev,
        [empNumber]: parsed,
      }));
      // Persist to leave balance record in table
      const bal = (leaveBalances || []).find(b =>
        b &&
        (b.employee_number === empNumber) &&
        (b.leave_type_code === 'ANNUAL' || (b.leave_type_name_ar && b.leave_type_name_ar.includes('اعتيادية')))
      );
      if (bal) {
        try {
          await leavesApi.updateLeaveBalance(bal.id, { carried_forward_days: parsed });
        } catch (e) {
          console.warn('Could not update leave balance', e);
        }
      }
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('vitas_emp_curry_forward') || '{}';
          const parsedObj = JSON.parse(stored);
          parsedObj[empNumber] = parsed;
          localStorage.setItem('vitas_emp_curry_forward', JSON.stringify(parsedObj));
        }
      } catch (e) {
        console.warn(e);
      }
    }
    setEditingEmpId(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredData.map((row, idx) => ({
      '#': idx + 1,
      [isAr ? 'الرقم الوظيفي' : 'Employee ID']: row.employeeNumber,
      [isAr ? 'اسم الموظف' : 'Employee Name']: isAr ? row.nameAr : row.nameEn,
      [isAr ? 'القسم' : 'Department']: isAr ? row.departmentAr : row.departmentEn,
      [isAr ? 'الفرع' : 'Branch']: isAr ? row.branchAr : row.branchEn,
      [isAr ? 'الراتب الأساسي (د.ع)' : 'Basic Salary (IQD)']: row.basicSalary,
      [isAr ? 'أجر اليوم الواحد (د.ع)' : 'Daily Rate (IQD)']: row.dailyBasicSalary,
      [isAr ? 'الرصيد المرحل (Curry Forward)' : 'Curry Forward (Days)']: row.curryForward,
      [isAr ? 'الإجازة الاعتيادية (أيام)' : 'Annual Leave (Days)']: row.annualLeave,
      [isAr ? 'الإجازات المأخوذة (أيام)' : 'Taken Leaves (Days)']: row.takenLeaves,
      [isAr ? 'ساعات التأخير (ساعة)' : 'Late Hours (Hrs)']: row.lateHours,
      [isAr ? 'خصم التأخير (أيام)' : 'Late Deduction (Days)']: row.lateDeductionDays,
      [isAr ? 'أيام الإجازات المستحقة' : 'Earned Leave Days']: row.earnedLeaveDays,
      [isAr ? 'المبلغ المستحق (د.ع)' : 'Earned Amount (IQD)']: row.earnedLeaveAmount,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'الإجازات المستحقة' : 'Earned Leaves');
    const filename = `Earned_Leaves_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-white dark:bg-gradient-to-r dark:from-emerald-950 dark:via-teal-900 dark:to-slate-900 border border-slate-200 dark:border-teal-500/20 shadow-sm dark:shadow-2xl">
        <div className="hidden dark:block absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="hidden dark:block absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 text-teal-600 dark:text-teal-300 shadow-sm">
                <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{isAr ? 'شاشة الإجازات المستحقة' : 'Earned Leaves Calculation'}</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30 font-semibold">
                    {isAr ? 'احتساب مالي ونظامي' : 'Financial & Entitlement'}
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {isAr 
                    ? 'احتساب أرصدة الإجازات المستحقة ومبالغها المالية وفق رصيد Curry Forward الفردي لكل موظف وساعات الدوام والراتب الأساسي'
                    : 'Calculate earned leave days & financial amounts based on each employee Curry Forward, attendance hours, and basic salary'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-600/30 dark:hover:bg-teal-600/50 border border-teal-600 dark:border-teal-500/40 dark:text-teal-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-teal-500/20"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>{isAr ? 'تصدير إكسل' : 'Export Excel'}</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('leave-dashboard')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:border-white/20 dark:text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">dashboard</span>
                <span>{isAr ? 'لوحة تحكم الإجازات' : 'Leave Dashboard'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Formula Explainer Card */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-teal-500/20 shadow-sm dark:backdrop-blur-md">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">calculate</span>
              <span>{isAr ? 'معادلة عدد أيام الإجازة المستحقة' : 'Earned Leave Days Formula'}</span>
            </div>
            <div className="font-mono text-xs md:text-sm text-slate-900 dark:text-emerald-200 bg-white dark:bg-emerald-950/40 p-3 rounded-xl border border-slate-300 dark:border-emerald-500/20 leading-relaxed dir-ltr text-left shadow-inner font-bold">
              Earned Days = Curry Forward + Annual Leave - Taken Leaves - (Late Time ÷ {workHoursPerDay} hrs)
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 font-medium">
              {isAr
                ? `رصيد الموظف المدور من جدول الإجازات (Curry Forward) + الاعتيادية (${globalAnnualLeave}) - الإجازات المأخوذة - (ساعات التأخير ÷ ${workHoursPerDay} ساعات دوام)`
                : `Employee Curry forward (from leaves table) + Annual (${globalAnnualLeave}) - Taken leaves - (Late hours ÷ ${workHoursPerDay} work hours)`}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-teal-500/20 shadow-sm dark:backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-700 dark:text-teal-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-base">payments</span>
              <span>{isAr ? 'معادلة المستحق المالي للإجازات' : 'Earned Leave Amount Formula'}</span>
            </div>
            <div className="font-mono text-xs md:text-sm text-slate-900 dark:text-amber-200 bg-white dark:bg-amber-950/40 p-3 rounded-xl border border-slate-300 dark:border-amber-500/20 leading-relaxed dir-ltr text-left shadow-inner font-bold">
              Earned Amount = Earned Days × (Basic Salary ÷ {dayDivisor} days)
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 font-medium">
              {isAr
                ? `أيام الإجازة المستحقة مضروبة في أجر اليوم الواحد من الراتب الأساسي (مقسوماً على ${dayDivisor} يوماً)`
                : `Earned leave days multiplied by daily rate (Basic Salary divided by ${dayDivisor} days)`}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAr ? 'إجمالي الموظفين المشمولين' : 'Total Employees'}
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {stats.totalEmployees}
            </div>
            <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-0.5">
              {isAr ? 'موظف في القائمة الحالية' : 'Employees listed'}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400">
            <span className="material-symbols-outlined text-2xl">badge</span>
          </div>
        </div>

        {/* Total Earned Days */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAr ? 'إجمالي أيام الإجازات المستحقة' : 'Total Earned Days'}
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.totalEarnedDays.toLocaleString()} <span className="text-sm font-normal text-slate-600 dark:text-slate-300">{isAr ? 'يوم' : 'days'}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? `متوسط: ${stats.avgEarnedDays} يوم/موظف` : `Avg: ${stats.avgEarnedDays} days/emp`}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <span className="material-symbols-outlined text-2xl">event_available</span>
          </div>
        </div>

        {/* Total Earned Amount */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAr ? 'إجمالي المستحقات المالية' : 'Total Financial Amount'}
            </div>
            <div className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {stats.totalEarnedAmount.toLocaleString()} <span className="text-xs font-normal text-slate-600 dark:text-slate-300">{isAr ? 'د.ع' : 'IQD'}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'المقابل المالي للأرصدة المستحقة' : 'Financial payout equivalence'}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
            <span className="material-symbols-outlined text-2xl">monetization_on</span>
          </div>
        </div>

        {/* Total Late Deduction */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isAr ? 'أثر التأخير المخصوم' : 'Late Time Deductions'}
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {stats.totalDeductionDays} <span className="text-sm font-normal text-slate-600 dark:text-slate-300">{isAr ? 'يوم' : 'days'}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? `من إجمالي ${stats.totalLateHours} ساعة تأخير` : `From ${stats.totalLateHours} late hours`}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400">
            <span className="material-symbols-outlined text-2xl">schedule</span>
          </div>
        </div>
      </div>

      {/* Control Bar & Parameters */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'البحث بالاسم أو الرقم الوظيفي أو القسم...' : 'Search by name, employee ID, or department...'}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Department Filter */}
          <div className="min-w-[180px]">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{isAr ? 'كافة الأقسام' : 'All Departments'}</option>
              {departments.map((dept, idx) => (
                <option key={idx} value={dept} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{dept}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="min-w-[180px]">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{isAr ? 'كافة الفروع' : 'All Branches'}</option>
              {branches.map((branch, idx) => (
                <option key={idx} value={branch} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{branch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Calculation Parameters Settings Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-6">
            {/* Work hours per day setting */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400">timelapse</span>
                <span>{isAr ? 'عدد ساعات الدوام اليومي:' : 'Daily Work Hours:'}</span>
              </span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="4"
                  max="12"
                  step="0.5"
                  value={workHoursPerDay}
                  onChange={(e) => setWorkHoursPerDay(parseFloat(e.target.value) || 8)}
                  className="w-16 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-center font-bold text-teal-700 dark:text-teal-300 focus:outline-none focus:border-teal-500"
                />
                <span className="text-slate-600 dark:text-slate-400">{isAr ? 'ساعة' : 'hrs'}</span>
              </div>
            </div>

            {/* Daily rate salary divisor */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-sm text-amber-600 dark:text-amber-400">calendar_month</span>
                <span>{isAr ? 'قاسم احتساب أجر اليوم:' : 'Daily Rate Divisor:'}</span>
              </span>
              <select
                value={dayDivisor}
                onChange={(e) => setDayDivisor(parseInt(e.target.value, 10) || 30)}
                className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 font-bold text-amber-700 dark:text-amber-300 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="30" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{isAr ? '30 يوماً (المعيار العراقي)' : '30 Days (Standard)'}</option>
                <option value="26" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{isAr ? '26 يوماً (أيام العمل الفعلية)' : '26 Working Days'}</option>
                <option value="22" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{isAr ? '22 يوماً (عطلة الجمعة والسبت)' : '22 Working Days'}</option>
              </select>
            </div>

            {/* Curry Forward Source Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                <span className="material-symbols-outlined text-sm text-emerald-600 dark:text-emerald-400">history</span>
                <span>{isAr ? 'مصدر رصيد التدوير (Curry Forward):' : 'Curry Forward Source:'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                {isAr ? 'جدول أرصدة الإجازات (مخصص لكل موظف)' : 'Leave Balances Table (Per Employee)'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-teal-600 dark:text-teal-400">info</span>
            <span>{isAr ? 'يتم التحديث المالي فورياً عند تعديل أي معيار' : 'Calculations update in real-time'}</span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl dark:shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right dir-rtl">
            <thead className="bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="p-4 text-center">#</th>
                <th
                  onClick={() => {
                    setSortField('name');
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="p-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{isAr ? 'الموظف' : 'Employee'}</span>
                    {sortField === 'name' && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">{isAr ? 'الراتب الأساسي' : 'Basic Salary'}</th>
                <th className="p-4 text-center">{isAr ? 'أجر اليوم الواحد' : 'Daily Rate'}</th>
                <th className="p-4 text-center text-emerald-700 dark:text-emerald-400">
                  <div className="flex items-center justify-center gap-1">
                    <span>{isAr ? 'الرصيد المرحل (Curry)' : 'Curry Forward'}</span>
                    <span className="text-[9px] px-1 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">+</span>
                  </div>
                </th>
                <th className="p-4 text-center text-teal-700 dark:text-teal-400">
                  <div className="flex items-center justify-center gap-1">
                    <span>{isAr ? 'الاعتيادية (Annual)' : 'Annual Leave'}</span>
                    <span className="text-[9px] px-1 rounded bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300">+</span>
                  </div>
                </th>
                <th className="p-4 text-center text-amber-700 dark:text-amber-400">
                  <div className="flex items-center justify-center gap-1">
                    <span>{isAr ? 'المأخوذة (Taken)' : 'Taken Leaves'}</span>
                    <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">-</span>
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('lateMinutes');
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="p-4 text-center text-rose-700 dark:text-rose-400 cursor-pointer hover:text-rose-600 dark:hover:text-rose-300 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{isAr ? 'خصم التأخير (Late)' : 'Late Deduction'}</span>
                    <span className="text-[9px] px-1 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300">-</span>
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('earnedLeaveDays');
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="p-4 text-center text-teal-950 dark:text-white cursor-pointer hover:text-teal-700 dark:hover:text-teal-300 transition-colors bg-teal-50 dark:bg-teal-500/10"
                >
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <span>{isAr ? 'أيام الاستحقاق (Earned)' : 'Earned Days'}</span>
                    {sortField === 'earnedLeaveDays' && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortField('earnedLeaveAmount');
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                  }}
                  className="p-4 text-center text-amber-900 dark:text-amber-300 cursor-pointer hover:text-amber-700 dark:hover:text-amber-200 transition-colors bg-amber-50 dark:bg-amber-500/10"
                >
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <span>{isAr ? 'المبلغ المستحق (د.ع)' : 'Earned Amount (IQD)'}</span>
                    {sortField === 'earnedLeaveAmount' && (
                      <span className="material-symbols-outlined text-xs">
                        {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="p-4 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-400 dark:text-slate-600 block">
                      search_off
                    </span>
                    <span>{isAr ? 'لا توجد بيانات مطابقة لمعايير البحث' : 'No matching records found'}</span>
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr
                    key={row.employeeNumber}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="p-4 text-center text-slate-500 dark:text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    {/* Employee info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-xs">
                          {(isAr ? row.nameAr : row.nameEn).charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors">
                            {isAr ? row.nameAr : row.nameEn}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{row.employeeNumber}</span>
                            <span>•</span>
                            <span>{isAr ? row.departmentAr : row.departmentEn}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Basic Salary */}
                    <td className="p-4 text-center font-mono font-medium text-slate-800 dark:text-slate-200">
                      {row.basicSalary.toLocaleString()}
                    </td>

                    {/* Daily Basic Salary */}
                    <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-400">
                      {row.dailyBasicSalary.toLocaleString()}
                    </td>

                    {/* Curry Forward (Editable inline) */}
                    <td className="p-4 text-center">
                      {editingEmpId === row.employeeNumber ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            value={editCurryValue}
                            onChange={(e) => setEditCurryValue(e.target.value)}
                            className="w-14 bg-white dark:bg-black/40 border-2 border-emerald-500 rounded px-1.5 py-0.5 text-center font-mono text-xs text-slate-900 dark:text-white shadow-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCurryOverride(row.employeeNumber)}
                            className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">check</span>
                          </button>
                          <button
                            onClick={() => setEditingEmpId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingEmpId(row.employeeNumber);
                            setEditCurryValue(String(row.curryForward));
                          }}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all"
                          title={isAr ? 'انقر لتعديل الرصيد المرحل لهذا الموظف' : 'Click to adjust curry forward'}
                        >
                          <span>{row.curryForward}</span>
                          <span className="material-symbols-outlined text-[11px] opacity-60 group-hover:opacity-100">edit</span>
                        </div>
                      )}
                    </td>

                    {/* Annual Leave */}
                    <td className="p-4 text-center font-mono font-bold text-teal-700 dark:text-teal-300">
                      {row.annualLeave}
                    </td>

                    {/* Taken Leaves */}
                    <td className="p-4 text-center font-mono font-bold text-amber-700 dark:text-amber-300">
                      {row.takenLeaves}
                    </td>

                    {/* Late Deduction */}
                    <td className="p-4 text-center">
                      <div className="font-mono text-rose-600 dark:text-rose-300 font-bold">
                        {row.lateDeductionDays > 0 ? `-${row.lateDeductionDays}` : '0'}
                      </div>
                      {row.lateMinutes > 0 && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          ({row.lateMinutes} {isAr ? 'دقيقة' : 'm'} = {row.lateHours} {isAr ? 'س' : 'h'})
                        </div>
                      )}
                    </td>

                    {/* Net Earned Leave Days */}
                    <td className="p-4 text-center bg-teal-50/50 dark:bg-teal-500/5">
                      <div className={`inline-block px-3 py-1 rounded-xl font-mono font-black text-sm ${row.earnedLeaveDays >= 0
                          ? 'bg-teal-100 dark:bg-teal-500/20 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-500/30'
                          : 'bg-rose-100 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30'
                        }`}>
                        {row.earnedLeaveDays} <span className="text-[10px] font-normal">{isAr ? 'يوم' : 'days'}</span>
                      </div>
                    </td>

                    {/* Earned Financial Amount */}
                    <td className="p-4 text-center bg-amber-50/50 dark:bg-amber-500/5">
                      <div className="font-mono font-black text-amber-800 dark:text-amber-300 text-sm">
                        {row.earnedLeaveAmount.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400/70 font-semibold mt-0.5">
                        {isAr ? 'دينار عراقي' : 'IQD'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedRowForModal(row)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-teal-50 dark:hover:bg-teal-500/20 border border-slate-200 dark:border-white/10 hover:border-teal-300 dark:hover:border-teal-500/30 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-all mx-auto cursor-pointer"
                        title={isAr ? 'معاينة تفاصيل وبيان العملية الحسابية' : 'View calculation statement'}
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>{isAr ? 'البيان' : 'Details'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-Employee Calculation Detail Modal */}
      {selectedRowForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-teal-500/30 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative overflow-hidden text-slate-900 dark:text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-300">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isAr ? 'بيان احتساب الإجازات المستحقة' : 'Earned Leaves Calculation Statement'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {isAr ? selectedRowForModal.nameAr : selectedRowForModal.nameEn} ({selectedRowForModal.employeeNumber})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRowForModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Step-by-Step Mathematical Proof */}
            <div className="space-y-4">
              {/* Step 1: Base Equation */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">functions</span>
                  <span>{isAr ? 'أولاً: احتساب عدد أيام الإجازة المستحقة' : 'Step 1: Earned Days Calculation'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'Curry Forward' : 'Curry Forward'}</div>
                    <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">+{selectedRowForModal.curryForward}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'Annual Leave' : 'Annual Leave'}</div>
                    <div className="font-mono font-bold text-teal-700 dark:text-teal-400 text-sm">+{selectedRowForModal.annualLeave}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'Taken Leaves' : 'Taken Leaves'}</div>
                    <div className="font-mono font-bold text-amber-700 dark:text-amber-400 text-sm">-{selectedRowForModal.takenLeaves}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'خصم التأخير' : 'Late Deduction'}</div>
                    <div className="font-mono font-bold text-rose-700 dark:text-rose-400 text-sm">-{selectedRowForModal.lateDeductionDays}</div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-800 dark:text-slate-300 font-mono bg-white dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-white/5 dir-ltr text-left">
                  Earned Days = {selectedRowForModal.curryForward} + {selectedRowForModal.annualLeave} - {selectedRowForModal.takenLeaves} - ({selectedRowForModal.lateHours}h ÷ {workHoursPerDay}h)
                  <br />
                  <strong className="text-teal-700 dark:text-teal-300">= {selectedRowForModal.earnedLeaveDays} days</strong>
                </div>
              </div>

              {/* Step 2: Financial Conversion */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-3">
                <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">payments</span>
                  <span>{isAr ? 'ثانياً: التحويل المالي للمستحقات' : 'Step 2: Financial Valuation'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'الراتب الأساسي' : 'Basic Salary'}</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{selectedRowForModal.basicSalary.toLocaleString()} IQD</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <div className="text-[10px] text-slate-600 dark:text-slate-400 mb-1">{isAr ? `أجر اليوم الواحد (÷ ${dayDivisor})` : `Daily Rate (÷ ${dayDivisor})`}</div>
                    <div className="font-mono font-bold text-amber-700 dark:text-amber-300 text-sm">{selectedRowForModal.dailyBasicSalary.toLocaleString()} IQD</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <div className="text-[10px] text-amber-800 dark:text-amber-400 mb-1 font-bold">{isAr ? 'المستحق المالي الكلي' : 'Total Amount'}</div>
                    <div className="font-mono font-black text-amber-800 dark:text-amber-300 text-sm">{selectedRowForModal.earnedLeaveAmount.toLocaleString()} IQD</div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-800 dark:text-slate-300 font-mono bg-white dark:bg-black/30 p-3 rounded-xl border border-slate-200 dark:border-white/5 dir-ltr text-left">
                  Earned Amount = {selectedRowForModal.earnedLeaveDays} days × {selectedRowForModal.dailyBasicSalary.toLocaleString()} IQD
                  <br />
                  <strong className="text-amber-700 dark:text-amber-300">= {selectedRowForModal.earnedLeaveAmount.toLocaleString()} IQD</strong>
                </div>
              </div>

              {/* Late Attendance Records if any */}
              {selectedRowForModal.attendanceLateRecords.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 space-y-2">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">history_toggle_off</span>
                    <span>{isAr ? 'سجلات التأخير المخصومة من الحضور' : 'Late Punch Attendance Logs'}</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
                    {selectedRowForModal.attendanceLateRecords.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
                        <span className="font-mono text-slate-700 dark:text-slate-300">{att.date}</span>
                        <span className="text-rose-700 dark:text-rose-300 font-bold font-mono">+{att.late_minutes} {isAr ? 'دقيقة تأخير' : 'mins late'}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">({att.first_punch || '--:--'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedRowForModal(null)}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg"
              >
                {isAr ? 'إغلاق البيان' : 'Close Statement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
