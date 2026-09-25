import React, { useState } from 'react';
import { Language, LeaveBalance, LeaveRequest } from './types';
import { translations } from './translations';
import { leavesApi } from './api';

interface LeaveDirectoryViewProps {
  requests: LeaveRequest[];
  balances?: LeaveBalance[];
  lang: Language;
  onOpenApply: () => void;
  onViewDetails: (request: LeaveRequest) => void;
  onCancelRequest: (id: number) => void;
  onExportExcel: () => void;
  onUpdateBalance?: (balanceId: number, updates: Partial<LeaveBalance>) => Promise<void> | void;
  onNavigateToEarned?: () => void;
}

export const LeaveDirectoryView: React.FC<LeaveDirectoryViewProps> = ({
  requests,
  balances = [],
  lang,
  onOpenApply,
  onViewDetails,
  onExportExcel,
  onUpdateBalance,
  onNavigateToEarned,
}) => {
  const t = translations[lang];
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState<'balances' | 'requests'>('balances');

  // Search & Filter state for Requests
  const [reqSearchTerm, setReqSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [reqPage, setReqPage] = useState(1);
  const pageSize = 8;

  // Search & Filter state for Balances
  const [balSearchTerm, setBalSearchTerm] = useState('');
  const [balTypeFilter, setBalTypeFilter] = useState('all');
  const [balPage, setBalPage] = useState(1);

  // Inline editing state for Curry Forward (carried_forward_days)
  const [editingBalanceId, setEditingBalanceId] = useState<number | null>(null);
  const [editCurryValue, setEditCurryValue] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Local overrides map in case prop updates asynchronously
  const [localBalances, setLocalBalances] = useState<LeaveBalance[]>(balances);

  React.useEffect(() => {
    setLocalBalances(balances);
  }, [balances]);

  // Handle saving individual employee Curry Forward
  const handleSaveCurry = async (balance: LeaveBalance) => {
    const parsed = Math.max(0, parseInt(editCurryValue, 10) || 0);
    const newAvailable = Math.max(0, balance.entitled_days + parsed - balance.used_days - balance.pending_days);

    // Update locally immediately
    setLocalBalances((prev) =>
      prev.map((b) => (b.id === balance.id ? { ...b, carried_forward_days: parsed, available_days: newAvailable } : b))
    );

    // Save to localStorage so EarnedLeavesView picks it up instantly
    try {
      const stored = localStorage.getItem('vitas_emp_curry_forward');
      const overrides = stored ? JSON.parse(stored) : {};
      if (balance.employee_number) {
        overrides[balance.employee_number] = parsed;
      }
      overrides[String(balance.employee_id)] = parsed;
      localStorage.setItem('vitas_emp_curry_forward', JSON.stringify(overrides));
    } catch (e) {
      console.error('Failed to update localStorage curry forward:', e);
    }

    // Call API / parent updater
    try {
      if (onUpdateBalance) {
        await onUpdateBalance(balance.id, {
          carried_forward_days: parsed,
          available_days: newAvailable,
        });
      } else {
        await leavesApi.updateLeaveBalance(balance.id, {
          carried_forward_days: parsed,
          available_days: newAvailable,
        });
      }
    } catch (e) {
      console.error('Failed to update balance via API:', e);
    }

    setEditingBalanceId(null);
    setSaveSuccessMsg(
      isAr
        ? `تم تحديث رصيد Curry Forward للموظف (${balance.employee_name_ar || balance.employee_name_en}) بنجاح إلى ${parsed} يوم.`
        : `Updated Curry Forward for (${balance.employee_name_en || balance.employee_name_ar}) to ${parsed} days.`
    );
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Filter Leave Requests
  const filteredRequests = requests.filter((r) => {
    if (reqSearchTerm) {
      const q = reqSearchTerm.toLowerCase();
      const matchNum = r.request_number.toLowerCase().includes(q);
      const matchName =
        r.employee_name_ar.toLowerCase().includes(q) || r.employee_name_en.toLowerCase().includes(q);
      const matchType =
        r.leave_type_name_ar.toLowerCase().includes(q) || r.leave_type_name_en.toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchType) return false;
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (deptFilter !== 'all') {
      if (!r.department_name_ar.includes(deptFilter) && !r.department_name_en.includes(deptFilter)) return false;
    }
    return true;
  });

  const totalReqPages = Math.ceil(filteredRequests.length / pageSize) || 1;
  const paginatedRequests = filteredRequests.slice((reqPage - 1) * pageSize, reqPage * pageSize);

  // Filter Leave Balances
  const filteredBalances = localBalances.filter((b) => {
    if (balSearchTerm) {
      const q = balSearchTerm.toLowerCase();
      const matchNum = (b.employee_number || '').toLowerCase().includes(q);
      const matchName =
        (b.employee_name_ar || '').toLowerCase().includes(q) ||
        (b.employee_name_en || '').toLowerCase().includes(q);
      if (!matchNum && !matchName) return false;
    }
    if (balTypeFilter !== 'all' && b.leave_type_code !== balTypeFilter) return false;
    return true;
  });

  const totalBalPages = Math.ceil(filteredBalances.length / pageSize) || 1;
  const paginatedBalances = filteredBalances.slice((balPage - 1) * pageSize, balPage * pageSize);

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            {t.leave_status_approved}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            {t.leave_status_rejected}
          </span>
        );
      case 'returned':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            {t.leave_status_returned}
          </span>
        );
      case 'submitted':
      case 'pending_approval':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            {t.leave_status_pending}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {isAr ? 'جدول الإجازات وأرصدة الموظفين' : 'Leave Directory & Balances'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/20">
              {isAr ? 'يتضمن Curry Forward المخصص' : 'Custom Curry Forward Included'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            {isAr
              ? 'إدارة سجل طلبات الإجازات وجدول أرصدة الموظفين بما في ذلك مستحقات السنوات الماضية المرحّلة (Curry Forward)'
              : 'Manage leave requests and employee balance tables including custom carry-forward entitlements'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onNavigateToEarned && (
            <button
              onClick={onNavigateToEarned}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 border border-teal-300 dark:border-teal-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={isAr ? 'الانتقال إلى شاشة الإجازات المستحقة والاحتساب المالي' : 'Go to Earned Leaves module'}
            >
              <span className="material-symbols-outlined text-sm">calculate</span>
              <span>{isAr ? 'شاشة الإجازات المستحقة' : 'Earned Leaves'}</span>
            </button>
          )}

          <button
            onClick={onOpenApply}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 active:scale-95 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">edit_calendar</span>
            <span>{t.apply_leave_title}</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">table_chart</span>
            <span>{t.export_excel}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('balances')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'balances'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">account_balance_wallet</span>
          <span>{isAr ? 'جدول أرصدة الإجازات و Curry Forward' : 'Leave Balances & Curry Forward'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'balances' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {filteredBalances.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-base">history_edu</span>
          <span>{isAr ? 'سجل طلبات الإجازات' : 'Leave Requests Directory'}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {filteredRequests.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LEAVE BALANCES & CURRY FORWARD TABLE                               */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          {/* Curry Forward Explanatory Notice */}
          <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-slate-800 dark:text-slate-200">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl mt-0.5">
                info
              </span>
              <div className="text-xs space-y-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 text-sm">
                  {isAr ? 'مستحقات الإجازات من السنوات الماضية (Curry Forward)' : 'Carry Forward Entitlements'}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isAr
                    ? 'نظراً لأن رصيد السنوات السابقة (Curry Forward) يختلف من موظف لآخر بحسب استهلاكهم للإجازات وتاريخ خدمتهم، تم تخصيص هذا الحقل مباشرة في جدول أرصدة الإجازات. يمكنك النقر على رقم الرصيد المرحّل لأي موظف لتعديله فورياً، وسيتم تحديث استحقاقاته المالية في شاشة الإجازات المستحقة تلقائياً.'
                    : 'Because carry forward leave balances vary from employee to employee based on their past leave consumption, Curry Forward is tracked per employee directly in this table. Click any carry-forward number to edit inline.'}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar for Balances */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
              <input
                type="text"
                placeholder={isAr ? 'البحث بالاسم أو الرقم الوظيفي...' : 'Search employee name or ID...'}
                value={balSearchTerm}
                onChange={(e) => {
                  setBalSearchTerm(e.target.value);
                  setBalPage(1);
                }}
                className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <select
                value={balTypeFilter}
                onChange={(e) => {
                  setBalTypeFilter(e.target.value);
                  setBalPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">{isAr ? 'جميع أنواع الإجازات' : 'All Leave Types'}</option>
                <option value="ANNUAL">{isAr ? 'الإجازة الاعتيادية (Annual Leave - Curry Forward)' : 'Annual Leave'}</option>
                <option value="SICK">{isAr ? 'الإجازة المرضية (Sick Leave)' : 'Sick Leave'}</option>
                <option value="CASUAL">{isAr ? 'الإجازة العارضة / الطارئة (Casual Leave)' : 'Casual Leave'}</option>
              </select>
            </div>
          </div>

          {/* Balances Table */}
          <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-[#0a0c10] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                  <tr>
                    <th className="px-3.5 py-3 text-start">#</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'الموظف' : 'Employee'}</th>
                    <th className="px-3.5 py-3 text-start">{isAr ? 'نوع الإجازة' : 'Leave Type'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'السنة' : 'Year'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'الاستحقاق السنوي' : 'Annual Entitled'}</th>
                    <th className="px-3.5 py-3 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5">
                      <div className="flex items-center justify-center gap-1">
                        <span>{isAr ? 'Curry Forward (السنوات الماضية)' : 'Curry Forward'}</span>
                        <span className="text-[9px] px-1 rounded bg-emerald-200 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 font-bold">+</span>
                      </div>
                    </th>
                    <th className="px-3.5 py-3 text-center text-amber-700 dark:text-amber-400">{isAr ? 'المستهلك' : 'Used'}</th>
                    <th className="px-3.5 py-3 text-center text-slate-500">{isAr ? 'قيد الانتظار' : 'Pending'}</th>
                    <th className="px-3.5 py-3 text-center text-teal-800 dark:text-teal-300 font-bold">{isAr ? 'الرصيد المتاح' : 'Available'}</th>
                    <th className="px-3.5 py-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {paginatedBalances.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        {isAr ? 'لا توجد سجلات أرصدة مطابقة' : 'No balance records found'}
                      </td>
                    </tr>
                  ) : (
                    paginatedBalances.map((bal, idx) => (
                      <tr key={bal.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-3.5 py-3 font-mono text-slate-500 text-[11px]">
                          {(balPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {isAr ? bal.employee_name_ar : bal.employee_name_en}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {bal.employee_number || `#${bal.employee_id}`}
                          </div>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200">
                            {isAr ? bal.leave_type_name_ar : bal.leave_type_name_en}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                          {bal.year}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono font-bold text-teal-700 dark:text-teal-300">
                          {bal.entitled_days} {isAr ? 'يوم' : 'd'}
                        </td>

                        {/* Curry Forward (Inline Editable per employee) */}
                        <td className="px-3.5 py-3 text-center bg-emerald-50/40 dark:bg-emerald-500/5">
                          {editingBalanceId === bal.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={90}
                                value={editCurryValue}
                                onChange={(e) => setEditCurryValue(e.target.value)}
                                className="w-16 bg-white dark:bg-black/50 border-2 border-emerald-500 rounded px-1.5 py-0.5 text-center font-mono text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveCurry(bal)}
                                className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                                title={isAr ? 'حفظ رصيد Curry Forward' : 'Save'}
                              >
                                <span className="material-symbols-outlined text-base">check</span>
                              </button>
                              <button
                                onClick={() => setEditingBalanceId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                title={isAr ? 'إلغاء' : 'Cancel'}
                              >
                                <span className="material-symbols-outlined text-base">close</span>
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingBalanceId(bal.id);
                                setEditCurryValue(String(bal.carried_forward_days || 0));
                              }}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono font-bold cursor-pointer hover:bg-emerald-200/80 dark:hover:bg-emerald-500/20 transition-all shadow-sm"
                              title={isAr ? 'انقر لتعديل رصيد Curry Forward لهذا الموظف' : 'Click to edit Curry Forward'}
                            >
                              <span>{bal.carried_forward_days || 0}</span>
                              <span className="text-[10px]">{isAr ? 'يوم' : 'd'}</span>
                              <span className="material-symbols-outlined text-xs opacity-60 group-hover:opacity-100">edit</span>
                            </div>
                          )}
                        </td>

                        <td className="px-3.5 py-3 text-center font-mono font-semibold text-amber-700 dark:text-amber-400">
                          {bal.used_days} {isAr ? 'يوم' : 'd'}
                        </td>
                        <td className="px-3.5 py-3 text-center font-mono text-slate-500 dark:text-slate-400">
                          {bal.pending_days}
                        </td>

                        {/* Available Balance */}
                        <td className="px-3.5 py-3 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-200 border border-teal-300 dark:border-teal-500/30 font-mono font-bold">
                            {bal.available_days} {isAr ? 'يوم' : 'd'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-center">
                          <button
                            onClick={() => {
                              setEditingBalanceId(bal.id);
                              setEditCurryValue(String(bal.carried_forward_days || 0));
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                            title={isAr ? 'تعديل رصيد التدوير (Curry Forward)' : 'Edit Curry Forward'}
                          >
                            <span className="material-symbols-outlined text-xs">edit_calendar</span>
                            <span>{isAr ? 'تعديل Curry' : 'Edit Curry'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Balances */}
            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs bg-slate-50 dark:bg-[#0a0c10]">
              <span className="text-slate-500">
                {t.total_records} {filteredBalances.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBalPage((p) => Math.max(1, p - 1))}
                  disabled={balPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  {isAr ? 'السابق' : 'Previous'}
                </button>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {balPage} {t.of} {totalBalPages}
                </span>
                <button
                  onClick={() => setBalPage((p) => Math.min(totalBalPages, p + 1))}
                  disabled={balPage === totalBalPages}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  {isAr ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LEAVE REQUESTS DIRECTORY                                            */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Filter Bar for Requests */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
              <input
                type="text"
                placeholder={t.search_placeholder}
                value={reqSearchTerm}
                onChange={(e) => {
                  setReqSearchTerm(e.target.value);
                  setReqPage(1);
                }}
                className="w-full pr-9 pl-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setReqPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">{t.filter_all_statuses}</option>
                <option value="pending_approval">{t.leave_status_pending}</option>
                <option value="approved">{t.leave_status_approved}</option>
                <option value="rejected">{t.leave_status_rejected}</option>
                <option value="returned">{t.leave_status_returned}</option>
              </select>
            </div>

            <div>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setReqPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-white/15 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">{t.filter_all_departments}</option>
                <option value="تكنولوجيا المعلومات">تكنولوجيا المعلومات (IT)</option>
                <option value="الموارد البشرية">الموارد البشرية (HR)</option>
                <option value="العمليات">العمليات والفروع (Operations)</option>
                <option value="المالية">المالية والحسابات (Finance)</option>
              </select>
            </div>
          </div>

          {/* Directory Requests Table */}
          <div className="rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-[#0a0c10] border-b border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="px-3.5 py-3 text-start">{t.req_number}</th>
                    <th className="px-3.5 py-3 text-start">{t.col_emp_name}</th>
                    <th className="px-3.5 py-3 text-start">{t.col_dept}</th>
                    <th className="px-3.5 py-3 text-start">{t.leave_type_select}</th>
                    <th className="px-3.5 py-3 text-start">{t.start_date}</th>
                    <th className="px-3.5 py-3 text-start">{t.end_date}</th>
                    <th className="px-3.5 py-3 text-start">{t.calculated_days}</th>
                    <th className="px-3.5 py-3 text-start">{t.col_status}</th>
                    <th className="px-3.5 py-3 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {paginatedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        {t.no_records_found}
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {req.request_number}
                        </td>
                        <td className="px-3.5 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {isAr ? req.employee_name_ar : req.employee_name_en}
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 dark:text-slate-400">
                          {isAr ? req.department_name_ar : req.department_name_en}
                        </td>
                        <td className="px-3.5 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {isAr ? req.leave_type_name_ar : req.leave_type_name_en}
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-400">{req.start_date}</td>
                        <td className="px-3.5 py-3 font-mono text-slate-600 dark:text-slate-400">{req.end_date}</td>
                        <td className="px-3.5 py-3 font-bold text-teal-700 dark:text-teal-400">
                          {req.total_days} {t.days_unit}
                        </td>
                        <td className="px-3.5 py-3">{getStatusBadge(req.status)}</td>
                        <td className="px-3.5 py-3 text-center">
                          <button
                            onClick={() => onViewDetails(req)}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-[11px] font-bold cursor-pointer"
                          >
                            {t.view_details}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Requests */}
            <div className="p-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs bg-slate-50 dark:bg-[#0a0c10]">
              <span className="text-slate-500">
                {t.total_records} {filteredRequests.length}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReqPage((p) => Math.max(1, p - 1))}
                  disabled={reqPage === 1}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  {isAr ? 'السابق' : 'Previous'}
                </button>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {reqPage} {t.of} {totalReqPages}
                </span>
                <button
                  onClick={() => setReqPage((p) => Math.min(totalReqPages, p + 1))}
                  disabled={reqPage === totalReqPages}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                >
                  {isAr ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
