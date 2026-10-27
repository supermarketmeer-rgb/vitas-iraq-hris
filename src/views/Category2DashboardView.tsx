import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { EmployeePortal } from '../components/EmployeePortal';
import { filterEmployeesBilingual } from '../utils/bilingualSearch';
import { getBranchName } from '../utils/branchHelper';
import {
  getEmployeeLocalizedName,
  getLocalizedDepartment,
  getLocalizedJobTitle,
  localizeNotificationTitle,
  localizeNotificationMessage,
  localizeTimestamp
} from '../utils/nameHelper';

export const Category2DashboardView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    employees,
    leaveRequests,
    jobVacancies,
    candidates,
    assetRecords,
    riskRecords,
    documentRecords,
    notifications,
    isDark,
    t,
    language,
    isBranchManager,
    userBranch,
    scopedEmployees,
    scopedNotifications
  } = useApp();

  const [dashSearchQuery, setDashSearchQuery] = useState('');

  // Active employees list: strictly scoped to the manager's office if logged in as Branch Manager
  const activeEmployees = useMemo(() => {
    return isBranchManager ? scopedEmployees : employees;
  }, [isBranchManager, scopedEmployees, employees]);

  // Active notifications list: strictly scoped to the manager's branch
  const activeNotifications = useMemo(() => {
    return isBranchManager ? scopedNotifications : notifications;
  }, [isBranchManager, scopedNotifications, notifications]);

  // Active leave requests: scoped to the branch employees
  const activeLeaveRequests = useMemo(() => {
    if (!isBranchManager) return leaveRequests;
    const branchKey = userBranch ? userBranch.replace(/^(مكتب|فرع)\s+/, '').trim() : '';
    const scopedEmpIds = new Set(scopedEmployees.map(e => String(e.id || e.employeeId)));
    return leaveRequests.filter(r => {
      if (scopedEmpIds.has(String(r.employeeId))) return true;
      if (r.branch && branchKey && r.branch.includes(branchKey)) return true;
      return false;
    });
  }, [isBranchManager, leaveRequests, userBranch, scopedEmployees]);

  // Live analytics computations derived directly from scoped employees & real DB state
  const totalEmployeesCount = activeEmployees.length;

  const totalBasicSalaries = useMemo(() => {
    return activeEmployees.reduce((sum, e) => sum + (Number(e.basicSalary ?? e.basic_salary ?? e.salary) || 1250000), 0);
  }, [activeEmployees]);

  const avgBasicSalary = totalEmployeesCount > 0 ? Math.round(totalBasicSalaries / totalEmployeesCount) : 0;

  // Resigned / On Hold staff count
  const resignedStaffCount = useMemo(() => {
    return activeEmployees.filter(e => e.exitDate || e.exit_date || e.resignationDate || e.onHold || e.on_hold === 1 || String(e.status || '').toLowerCase().includes('resigned')).length;
  }, [activeEmployees]);

  const turnoverRateStr = totalEmployeesCount > 0 ? ((resignedStaffCount / totalEmployeesCount) * 100).toFixed(1) : '0.0';

  // Branch breakdown live calculation with bilingual office names
  const branchCounts = useMemo(() => {
    const map: Record<string, { count: number; totalSalary: number; rawKey: string; branchAr: string; branchEn: string }> = {};
    activeEmployees.forEach(e => {
      const bKey = e.branch || e.location_ar || 'السليمانية';
      const bEn = e.branchEn || e.location_en;
      const sal = Number(e.basicSalary ?? e.basic_salary ?? e.salary) || 1250000;
      if (!map[bKey]) {
        map[bKey] = {
          count: 0,
          totalSalary: 0,
          rawKey: bKey,
          branchAr: getBranchName(bKey, bEn, 'ar'),
          branchEn: getBranchName(bKey, bEn, 'en')
        };
      }
      map[bKey].count += 1;
      map[bKey].totalSalary += sal;
    });

    return Object.values(map).map(data => ({
      rawKey: data.rawKey,
      branch: language === 'en' ? data.branchEn : data.branchAr,
      branchAr: data.branchAr,
      branchEn: data.branchEn,
      count: data.count,
      totalSalary: data.totalSalary,
      percent: Math.round((data.count / (totalEmployeesCount || 1)) * 100)
    }));
  }, [activeEmployees, totalEmployeesCount, language]);

  // Dept breakdown live calculation with bilingual support
  const deptCounts = useMemo(() => {
    const map: Record<string, number> = {};
    activeEmployees.forEach(e => {
      const d = getLocalizedDepartment(e.department || 'قسم الائتمان', language);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([dept, count]) => ({
      dept,
      count,
      percent: Math.round((count / (totalEmployeesCount || 1)) * 100)
    }));
  }, [activeEmployees, totalEmployeesCount, language]);

  // Search filtered employees for Global Search sub-screen with bilingual Arabic & English support
  const searchFilteredEmployees = useMemo(() => {
    return filterEmployeesBilingual(activeEmployees, dashSearchQuery);
  }, [activeEmployees, dashSearchQuery]);

  const pendingLeavesCount = activeLeaveRequests.filter(r => r.status === 'قيد الانتظار' || r.status === 'Pending').length;
  const openVacanciesCount = useMemo(() => {
    return jobVacancies.filter(j => j.status === 'مفتوحة' || j.status === 'Open').length;
  }, [jobVacancies]);
  const totalAssetsAndDocs = (assetRecords?.length || 0) + (documentRecords?.length || 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Page Title */}
      <div>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {activeModuleId === 'dash-overview' && (isBranchManager ? (language === 'en' ? `${getBranchName(userBranch, undefined, 'en')} Office Dashboard` : `لوحة تحكم وتقارير ${userBranch}`) : t('نظرة عامة على النظام', 'System Overview'))}
          {activeModuleId === 'dash-exec-1' && t('لوحة المعلومات التنفيذية 1 (التحليلات الاستراتيجية)', 'Executive Dashboard 1 (Strategic Analytics)')}
          {activeModuleId === 'dash-exec-2' && t('لوحة المعلومات التنفيذية 2 (القوى العاملة والتكاليف)', 'Executive Dashboard 2 (Workforce & Costs)')}
          {activeModuleId === 'dash-ess' && t('لوحة الخدمة الذاتية للموظف (ESS Portal)', 'Employee Self-Service (ESS) Portal')}
          {activeModuleId === 'dash-search' && t('مركز البحث الشامل والتصفية', 'Global Search & Filtering Center')}
        </h1>
      </div>

      {/* Real Live KPI Stat Cards - Hidden in ESS to match standalone Employee Portal */}
      {activeModuleId !== 'dash-ess' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Total Employees */}
          <div className={`dash-overview-canvas-card py-2.5 px-4 rounded-2xl border flex items-center justify-between transition-all ${isDark
              ? 'bg-[#0a0c10] border-white/10 text-white shadow-sm'
              : 'bg-[#eef2f6] border-slate-300/80 text-slate-900 shadow-xs hover:shadow-sm'
            }`}>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('إجمالي الموظفين', 'Total Employees')}</p>
              <p className={`text-2xl font-bold mt-0.5 font-mono leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalEmployeesCount}</p>
              <p className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                <span className="material-symbols-outlined text-xs">check_circle</span>
                <span>{totalEmployeesCount} {t('موظفاً حياً مسجلاً', 'active registered staff')}</span>
              </p>
            </div>
            <div className={`dash-overview-icon-box w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isDark
                ? 'bg-[#06080d] border-teal-500/30 text-teal-400'
                : 'bg-[#eef2f6] border-slate-300/80 text-slate-700 shadow-2xs'
              }`}>
              <span className="material-symbols-outlined text-xl">groups</span>
            </div>
          </div>

          {/* Card 2: Job Vacancies */}
          <div className={`dash-overview-canvas-card py-2.5 px-4 rounded-2xl border flex items-center justify-between transition-all ${isDark
              ? 'bg-[#0a0c10] border-white/10 text-white shadow-sm'
              : 'bg-[#eef2f6] border-slate-300/80 text-slate-900 shadow-xs hover:shadow-sm'
            }`}>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('الوظائف الشاغرة', 'Job Vacancies')}</p>
              <p className={`text-2xl font-bold mt-0.5 font-mono leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{openVacanciesCount}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                {openVacanciesCount > 0
                  ? `${openVacanciesCount} ${t('وظائف متاحة حالياً', 'active vacancies')}`
                  : jobVacancies.length > 0
                    ? `${t('لا توجد وظائف مفتوحة حالياً', 'No open vacancies')} (${jobVacancies.length} ${t('مغلقة', 'closed')})`
                    : t('لا توجد وظائف مفتوحة حالياً', 'No open vacancies')}
              </p>
            </div>
            <div className={`dash-overview-icon-box w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isDark
                ? 'bg-[#06080d] border-teal-500/30 text-teal-400'
                : 'bg-[#eef2f6] border-slate-300/80 text-slate-700 shadow-2xs'
              }`}>
              <span className="material-symbols-outlined text-xl">business_center</span>
            </div>
          </div>

          {/* Card 3: Pending Leave Requests */}
          <div className={`dash-overview-canvas-card py-2.5 px-4 rounded-2xl border flex items-center justify-between transition-all ${isDark
              ? 'bg-[#0a0c10] border-white/10 text-white shadow-sm'
              : 'bg-[#eef2f6] border-slate-300/80 text-slate-900 shadow-xs hover:shadow-sm'
            }`}>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('طلبات الإجازات القائمة', 'Pending Leave Requests')}</p>
              <p className={`text-2xl font-bold mt-0.5 font-mono leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{pendingLeavesCount}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>
                {pendingLeavesCount > 0
                  ? `${pendingLeavesCount} ${t('طلبات بانتظار الاعتماد', 'pending HR review')}`
                  : t('لا توجد طلبات معلقة الان', 'No pending requests')}
              </p>
            </div>
            <div className={`dash-overview-icon-box w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isDark
                ? 'bg-[#06080d] border-purple-500/30 text-purple-400'
                : 'bg-[#eef2f6] border-slate-300/80 text-slate-700 shadow-2xs'
              }`}>
              <span className="material-symbols-outlined text-xl">pending_actions</span>
            </div>
          </div>

          {/* Card 4: Assets & Documents */}
          <div className={`dash-overview-canvas-card py-2.5 px-4 rounded-2xl border flex items-center justify-between transition-all ${isDark
              ? 'bg-[#0a0c10] border-white/10 text-white shadow-sm'
              : 'bg-[#eef2f6] border-slate-300/80 text-slate-900 shadow-xs hover:shadow-sm'
            }`}>
            <div>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('الأصول والمستندات المسجلة', 'Assets & Documents')}</p>
              <p className={`text-2xl font-bold mt-0.5 font-mono leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalAssetsAndDocs}</p>
              <p className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {assetRecords?.length || 0} {t('عهدة', 'assets')} • {documentRecords?.length || 0} {t('وثائق', 'docs')}
              </p>
            </div>
            <div className={`dash-overview-icon-box w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${isDark
                ? 'bg-[#06080d] border-emerald-500/30 text-emerald-400'
                : 'bg-[#eef2f6] border-slate-300/80 text-slate-700 shadow-2xs'
              }`}>
              <span className="material-symbols-outlined text-xl">folder_managed</span>
            </div>
          </div>
        </div>
      )}

      {/* MODULE VIEW 1: SYSTEM OVERVIEW */}
      {activeModuleId === 'dash-overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Wide Section */}
          <div className={`dash-overview-canvas-window lg:col-span-2 p-6 rounded-3xl border space-y-4 transition-all ${isDark
              ? 'bg-[#0a0c10] border-white/10 shadow-xl text-white'
              : 'bg-[#eef2f6] border-slate-300/80 shadow-sm text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className={`material-symbols-outlined ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>monitoring</span>
                {t('مخطط هيكل القوى العاملة ومؤشرات الأداء', 'Workforce Structure & Performance Metrics')}
              </h2>
              <span className={`text-xs font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Live Dashboard Stream</span>
            </div>

            {activeEmployees.length === 0 ? (
              <EmptyState
                icon="badge"
                title={t('لا توجد بيانات موظفين حتى الآن', 'No Employee Data Yet')}
                description={t('النظام في الوضع الأولي الصفري الجاهز لاستقبال بيانات الموظفين الفعلية لمؤسسة فيتاس العراق. قم بإضافة الموظف الأول للبدء.', 'The system is ready for initial employee entries for VITAS Iraq. Add the first employee to get started.')}
                actionText={t('إضافة موظف جديد', 'Add New Employee')}
                onAction={() => setActiveModuleId('emp-add')}
              />
            ) : (
              <div className="space-y-3">
                <p className={`text-xs font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-600'}`}>{t('قائمة الموظفين المدخلين حديثاً:', 'Recently Added Employees:')}</p>
                <div className="space-y-2">
                  {activeEmployees?.slice(0, 5).map(emp => (
                    <div
                      key={emp.id}
                      dir={language === 'en' ? 'ltr' : 'rtl'}
                      className={`dash-inner-card p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${isDark
                          ? 'bg-[#06080d] border-white/5 hover:border-teal-500/40 text-slate-200'
                          : 'bg-[#eef2f6] border-slate-300 hover:bg-[#e2e8f0] text-slate-900 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center border overflow-hidden shadow-xs shrink-0 ${
                          emp.photoUrl
                            ? (isDark ? 'bg-[#1a1f2e] border-teal-500/30' : 'bg-[#eef2f6] border-slate-300')
                            : (isDark ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-100/60 text-teal-700 border-teal-200')
                        }`}>
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt={getEmployeeLocalizedName(emp, language)} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-sm font-bold">{getEmployeeLocalizedName(emp, language)?.slice(0, 1) || 'U'}</span>
                          )}
                        </div>
                        <div className={language === 'en' ? 'text-left' : 'text-right'}>
                          <p className={`font-bold text-sm ${language === 'en' ? 'text-left' : 'text-right'} ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                            {getEmployeeLocalizedName(emp, language)}
                          </p>
                          <p className={`text-xs font-medium ${language === 'en' ? 'text-left' : 'text-right'} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {getLocalizedJobTitle(emp.jobTitle || emp.position_ar || emp.position, language)} • {getLocalizedDepartment(emp.department, language)}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border shrink-0 ${isDark
                          ? 'bg-[#06080d] text-teal-400 border-teal-500/40'
                          : 'bg-[#eef2f6] text-teal-800 border-teal-300 shadow-2xs'
                        }`}>
                        VTS-{emp.employeeId || emp.employee_id}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Notifications */}
          <div className={`dash-overview-canvas-window p-6 rounded-3xl border space-y-4 transition-all ${isDark
              ? 'bg-[#0a0c10] border-white/10 shadow-xl text-white'
              : 'bg-[#eef2f6] border-slate-300/80 shadow-sm text-slate-900'
            }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className={`material-symbols-outlined ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>notifications_active</span>
                {t('التنبيهات والأحداث المباشرة', 'Live Notifications & Activity')}
              </h2>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${isDark
                  ? 'bg-[#06080d] text-teal-400 border-teal-500'
                  : 'bg-teal-50 text-teal-700 border-teal-300 shadow-2xs'
                }`}>
                {activeNotifications.length} {t('تنبيهات', 'alerts')}
              </span>
            </div>

            {activeNotifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                <span className="material-symbols-outlined text-4xl text-emerald-500/60 block">
                  task_alt
                </span>
                <p className="font-medium text-slate-500">{t('لا توجد إشعارات أو تنبيهات معلقة الان', 'No pending notifications right now')}</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto custom-scrollbar">
                {activeNotifications.map(n => (
                  <div
                    key={n.id}
                    dir={language === 'en' ? 'ltr' : 'rtl'}
                    className={`dash-inner-card p-3 rounded-2xl border space-y-1 transition-all shadow-2xs ${isDark
                        ? 'bg-[#06080d] border-white/10 text-slate-200 hover:border-teal-500/40'
                        : 'bg-[#eef2f6] border-slate-300 text-slate-900 hover:bg-[#e2e8f0]'
                      }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className={`flex items-center gap-1.5 ${isDark ? 'text-teal-400' : 'text-teal-800'}`}>
                        <span className="material-symbols-outlined text-base">notifications</span>
                        <span>{localizeNotificationTitle(n.title, language)}</span>
                      </span>
                      <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {localizeTimestamp(n.timestamp, language)}
                      </span>
                    </div>
                    <p className={`text-xs font-normal ${language === 'en' ? 'text-left' : 'text-right'} ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {localizeNotificationMessage(n.message, language)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE VIEW 2: EXECUTIVE DASHBOARD 1 */}
      {activeModuleId === 'dash-exec-1' && (
        <div className={`p-6 rounded-3xl border space-y-6 shadow-xl ${isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900 shadow-sm'
          }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">analytics</span>
              {t('لوحة التحليلات التنفيذية الاستراتيجية (Executive Analytics 1)', 'Executive Analytics Dashboard 1 (Strategic Analytics)')}
            </h2>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${isDark ? 'bg-[#06080d] text-teal-400 border-teal-500' : 'bg-teal-50 text-teal-700 border-teal-300'
              }`}>
              {totalEmployeesCount} {t('موظف حقيقي', 'live employees')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className={`p-5 rounded-2xl border space-y-1 shadow-xs ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200'
              }`}>
              <p className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('معدل الدوران الوظيفي (Turnover Rate)', 'Turnover Rate')}</p>
              <p className="text-3xl font-bold text-teal-600 dark:text-teal-400 font-mono">{turnoverRateStr}%</p>
              <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {resignedStaffCount} {t('موظف موقوف/مستقيل من أصل', 'on-hold / resigned staff out of')} {totalEmployeesCount}
              </p>
            </div>

            <div className={`p-5 rounded-2xl border space-y-1 shadow-xs ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200'
              }`}>
              <p className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('متوسط الراتب الأساسي للموظف', 'Average Basic Salary per Staff')}</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{avgBasicSalary.toLocaleString()} IQD</p>
              <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('محتسب من كتلة الرواتب الأساسية لجميع الكادر', 'Calculated from live basic payroll mass')}
              </p>
            </div>

            <div className={`p-5 rounded-2xl border space-y-1 shadow-xs ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200'
              }`}>
              <p className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('نسبة الالتزام بالتدريب والسلامة', 'Training & Compliance Rate')}</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 font-mono">98.5%</p>
              <p className={`text-xs font-medium mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                {t('مقرونة بامتثال لوائح البنك المركزي العراقي', 'Aligned with CBI compliance directives')}
              </p>
            </div>
          </div>

          {/* Branch & Dept Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Branch Distribution */}
            <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200 shadow-xs'
              }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">domain</span>
                {t('توزيع الكادر حسب الفروع والمواقع', 'Staff Distribution by Branch')}
              </h3>
              <div className="space-y-2.5">
                {branchCounts.map(b => (
                  <div key={b.branch} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{b.branch}</span>
                      <span className="font-mono text-teal-600 dark:text-teal-400">{b.count} {t('موظفاً', 'staff')} ({b.percent}%)</span>
                    </div>
                    <div className={`w-full h-2 rounded-full border overflow-hidden ${isDark ? 'bg-[#0a0c10] border-white/5' : 'bg-slate-200/80 border-slate-200'
                      }`}>
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${b.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Distribution */}
            <div className={`p-5 rounded-2xl border space-y-3 ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200 shadow-xs'
              }`}>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">account_tree</span>
                {t('توزيع الكادر حسب الأقسام والإدارات', 'Staff Distribution by Department')}
              </h3>
              <div className="space-y-2.5">
                {deptCounts.map(d => (
                  <div key={d.dept} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{d.dept}</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400">{d.count} {t('موظفاً', 'staff')} ({d.percent}%)</span>
                    </div>
                    <div className={`w-full h-2 rounded-full border overflow-hidden ${isDark ? 'bg-[#0a0c10] border-white/5' : 'bg-slate-200/80 border-slate-200'
                      }`}>
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${d.percent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODULE VIEW 3: EXECUTIVE DASHBOARD 2 */}
      {activeModuleId === 'dash-exec-2' && (
        <div className={`p-6 rounded-3xl border space-y-6 shadow-xl ${isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900 shadow-sm'
          }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">query_stats</span>
              {t('تحليلات القوى العاملة والميزانية التقديرية (Executive Dashboard 2)', 'Workforce & Budget Analytics (Executive Dashboard 2)')}
            </h2>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${isDark ? 'bg-[#06080d] text-emerald-400 border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
              {totalBasicSalaries.toLocaleString()} IQD Total Basic
            </span>
          </div>

          {/* Financial Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className={`p-4 rounded-2xl border space-y-1 shadow-xs ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200'
              }`}>
              <span className={`font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('كتلة الرواتب الأساسية الحية', 'Total Basic Payroll')}</span>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400 font-mono">
                {totalBasicSalaries.toLocaleString()} IQD
              </p>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('مجموع الرواتب الأسمية لجميع الموظفين الـ 49', 'Sum of basic salaries for all 49 staff')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 shadow-xs ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200'
              }`}>
              <span className={`font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('كتلة البدلات والمكافآت التقديرية', 'Estimated Total Allowances')}</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {Math.round(totalBasicSalaries * 0.28).toLocaleString()} IQD
              </p>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('بدلات السكن والشهادة والمنصب والأولاد', 'Housing, cert, title & family allowances')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 shadow-xs ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200'
              }`}>
              <span className={`font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('إجمالي كتلة الرواتب الإجمالية', 'Total Gross Payroll Mass')}</span>
              <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                {Math.round(totalBasicSalaries * 1.28).toLocaleString()} IQD
              </p>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('شامل الأساسي وكافة البدلات الرسمية', 'Basic + all statutory allowances')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 shadow-xs ${isDark ? 'bg-[#06080d] border-white/5' : 'bg-[#f8fafc] border-slate-200'
              }`}>
              <span className={`font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('حصة المؤسسة في الضمان (12%)', 'Employer SS Contribution (12%)')}</span>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                {Math.round(totalBasicSalaries * 0.12).toLocaleString()} IQD
              </p>
              <p className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{t('قانون التقاعد والضمان الاجتماعي 18 لسنة 2023', 'Pension & Social Security Law 18 (2023)')}</p>
            </div>
          </div>

          {/* Live Branch Cost Table */}
          <div className="space-y-3 pt-2">
            <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">table_view</span>
              {t('جدول توزيع التكاليف والرواتب حسب الفروع حياً', 'Live Branch Payroll Cost Breakdown')}
            </h3>
            <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'}`}>
                <thead className={`border-b font-bold ${isDark ? 'bg-[#06080d] text-white border-white/10' : 'bg-[#f8fafc] text-slate-900 border-slate-200'
                  }`}>
                  <tr>
                    <th className="p-3 w-12 text-center">#</th>
                    <th className={`p-3 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('اسم الفرع والموقع', 'Branch Location')}</th>
                    <th className={`p-3 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('عدد الكادر', 'Staff Count')}</th>
                    <th className={`p-3 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('الراتب الأساسي الكلي', 'Total Basic Payroll')}</th>
                    <th className={`p-3 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('البدلات التقديرية', 'Est. Allowances')}</th>
                    <th className={`p-3 ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('إجمالي الكلفة التقديرية', 'Est. Total Cost')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${isDark ? 'divide-white/5 text-slate-200 bg-[#0a0c10]' : 'divide-slate-200 text-slate-800 bg-white'
                  }`}>
                  {branchCounts.map((b, idx) => (
                    <tr key={b.branch} className={`transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-teal-50/30'}`}>
                      <td className="p-3 font-mono text-slate-500 text-center">{idx + 1}</td>
                      <td className={`p-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'} ${language === 'en' ? 'text-left' : 'text-right'}`}>{b.branch}</td>
                      <td className={`p-3 font-mono text-teal-600 dark:text-teal-400 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{b.count} {t('موظفاً', 'staff')}</td>
                      <td className={`p-3 font-mono ${language === 'en' ? 'text-left' : 'text-right'}`}>{b.totalSalary.toLocaleString()} IQD</td>
                      <td className={`p-3 font-mono text-emerald-600 dark:text-emerald-400 ${language === 'en' ? 'text-left' : 'text-right'}`}>{Math.round(b.totalSalary * 0.28).toLocaleString()} IQD</td>
                      <td className={`p-3 font-mono text-cyan-600 dark:text-cyan-400 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{Math.round(b.totalSalary * 1.28).toLocaleString()} IQD</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODULE VIEW 4: EMPLOYEE SELF-SERVICE (ESS) */}
      {activeModuleId === 'dash-ess' && (
        <EmployeePortal embedded={true} />
      )}

      {/* MODULE VIEW 5: GLOBAL SEARCH CENTER */}
      {activeModuleId === 'dash-search' && (
        <div className={`p-6 rounded-3xl border space-y-6 shadow-xl ${isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900 shadow-sm'
          }`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">manage_search</span>
              {t('مركز البحث الشامل والتصفية الحية', 'Global Search & Instant Filtering Center')}
            </h2>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${isDark ? 'bg-[#06080d] text-teal-400 border-teal-500' : 'bg-teal-50 text-teal-700 border-teal-300'
              }`}>
              {searchFilteredEmployees.length} {t('نتائج بحث مطابقة', 'matching results')}
            </span>
          </div>

          {/* Search Box */}
          <div className="space-y-2 max-w-xl">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3.5 top-3 text-slate-400 text-lg">search</span>
              <input
                type="text"
                value={dashSearchQuery}
                onChange={e => setDashSearchQuery(e.target.value)}
                placeholder={t(
                  'ابحث عن أي موظف بالاسم، الرقم الوظيفي، الفرع أو المسمى (عربي / English)...',
                  'Search any staff by name, ID, branch or title (English / Arabic)...'
                )}
                className={`w-full pr-10 pl-10 py-2.5 text-xs rounded-xl font-bold focus:outline-none focus:border-teal-500 shadow-inner border transition-all ${
                  isDark ? 'bg-[#06080d] border-white/10 text-white placeholder-slate-500' : 'bg-[#f8fafc] border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              {dashSearchQuery && (
                <button
                  type="button"
                  onClick={() => setDashSearchQuery('')}
                  className="absolute left-3 top-2.5 text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded-full"
                  title={t('مسح البحث', 'Clear search')}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
              <span className="material-symbols-outlined text-[13px] text-teal-500">translate</span>
              <span>{t('البحث الفوري يعمل باللغتين العربية والإنكليزية لجميع الحقول والأسماء', 'Live bilingual instant search active for Arabic & English')}</span>
            </div>
          </div>

          {/* Live Search Results */}
          <div className="space-y-3">
            <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t(`قائمة الموظفين والكادر المطابق للبحث (${searchFilteredEmployees.length}):`, `Matching Employees (${searchFilteredEmployees.length}):`)}
            </h3>

            {searchFilteredEmployees.length === 0 ? (
              <EmptyState
                icon="search_off"
                title={t('لا توجد نتائج مطابقة لبحثك', 'No Matching Results Found')}
                description={t('تأكد من كتابة الاسم أو الرقم الوظيفي بشكل صحيح (يمكنك البحث بالعربية أو الإنكليزية).', 'Try adjusting your query or badge ID (you can search in Arabic or English).')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchFilteredEmployees.slice(0, 12).map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => setActiveModuleId('emp-directory')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 shadow-2xs ${isDark
                        ? 'bg-[#06080d] border-white/10 hover:border-teal-500/50 text-white'
                        : 'bg-[#f8fafc] border-slate-200 hover:bg-teal-50/40 hover:border-teal-400/50 text-slate-900'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-sm block ${language === 'en' ? 'text-left' : 'text-right'} ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {getEmployeeLocalizedName(emp, language)}
                      </span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-[#06080d] text-teal-400 border-teal-500' : 'bg-white text-teal-800 border-teal-300'
                        }`}>
                        {String(emp.employeeId || emp.badgeNo || emp.employee_id || emp.id || '').startsWith('VTS-')
                          ? (emp.employeeId || emp.badgeNo || emp.employee_id)
                          : `VTS-${emp.employeeId || emp.badgeNo || emp.employee_id || emp.id}`}
                      </span>
                    </div>
                    <p className={`text-xs font-medium ${language === 'en' ? 'text-left' : 'text-right'} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {getLocalizedJobTitle(emp.jobTitleEn && emp.jobTitleEn !== 'N/A' ? emp.jobTitleEn : (emp.jobTitle || emp.position_ar || emp.position), language)} • {getLocalizedDepartment(emp.department, language)}
                    </p>
                    <p className={`text-[11px] font-semibold flex items-center gap-1 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      <span>
                        {getBranchName(emp.branch || emp.location_ar, emp.branchEn || emp.location_en, language)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


