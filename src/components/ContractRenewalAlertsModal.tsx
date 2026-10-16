import React, { useState, useMemo } from 'react';
import { Employee } from '../types';

export interface ContractAlertItem {
  employee: Employee;
  isNewEmployee: boolean;
  contractTypeLabel: string;
  startDate: string;
  targetDate: string;
  targetDateObj: Date;
  daysRemaining: number;
  status: 'expired' | 'urgent_week' | 'soon_month' | 'future';
}

interface ContractRenewalAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onOpenContract: (employee: Employee) => void;
  language?: string;
  theme?: string;
}

export const ContractRenewalAlertsModal: React.FC<ContractRenewalAlertsModalProps> = ({
  isOpen,
  onClose,
  employees = [],
  onOpenContract,
  language = 'ar',
  theme = 'light'
}) => {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgent' | 'new_emp' | 'permanent' | 'month'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Helper to detect if contract is for a new employee (عقد موظف جديد / فترة تجربة)
  const isNewEmployeeContract = (emp: any): boolean => {
    const term = String(
      emp.termOfContract || 
      emp.term_of_contract || 
      emp.contract_type || 
      emp.contractType || 
      ''
    ).toLowerCase().trim();

    return (
      term.includes('جديد') || 
      term.includes('new') || 
      term.includes('تجربة') || 
      term.includes('probation') ||
      term === 'عقد موظف جديد' ||
      term === 'new employee contract'
    );
  };

  // Compute all contract alerts for employees
  const allAlertItems = useMemo<ContractAlertItem[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const items: ContractAlertItem[] = [];

    employees.forEach((emp: any) => {
      const isNew = isNewEmployeeContract(emp);
      
      const startRaw = emp.contractStartDate || emp.contract_start_date || emp.originalStartDate || emp.original_start_date || emp.joinDate;
      const endRaw = emp.contractEndDate || emp.contract_end_date;
      const probationRaw = emp.probationEndDate || emp.probation_end_date;

      let targetDateObj: Date | null = null;
      let targetDateStr = '';
      let startDateStr = '';

      if (startRaw) {
        const s = new Date(startRaw);
        if (!isNaN(s.getTime())) {
          startDateStr = s.toISOString().split('T')[0];
        }
      }

      if (isNew) {
        // New Employee Contract: Check 3 months probation period
        if (probationRaw) {
          const p = new Date(probationRaw);
          if (!isNaN(p.getTime())) {
            targetDateObj = p;
            targetDateStr = p.toISOString().split('T')[0];
          }
        } else if (startRaw) {
          const s = new Date(startRaw);
          if (!isNaN(s.getTime())) {
            // Add exactly 3 months for probation period
            const calcProbation = new Date(s);
            calcProbation.setMonth(calcProbation.getMonth() + 3);
            targetDateObj = calcProbation;
            targetDateStr = calcProbation.toISOString().split('T')[0];
          }
        }
      } else {
        // Permanent / Fixed-term Contract: Check end date
        if (endRaw) {
          const e = new Date(endRaw);
          if (!isNaN(e.getTime())) {
            targetDateObj = e;
            targetDateStr = e.toISOString().split('T')[0];
          }
        } else if (probationRaw) {
          const p = new Date(probationRaw);
          if (!isNaN(p.getTime())) {
            targetDateObj = p;
            targetDateStr = p.toISOString().split('T')[0];
          }
        }
      }

      if (!targetDateObj || isNaN(targetDateObj.getTime())) {
        return;
      }

      // Calculate days remaining from today at midnight
      const targetNormalized = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate());
      const diffMs = targetNormalized.getTime() - today.getTime();
      const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

      let status: 'expired' | 'urgent_week' | 'soon_month' | 'future' = 'future';
      if (daysRemaining < 0) {
        status = 'expired';
      } else if (daysRemaining <= 7) {
        status = 'urgent_week';
      } else if (daysRemaining <= 30) {
        status = 'soon_month';
      }

      // Only include contracts that are expired, due within a week, or due within 60 days
      if (daysRemaining <= 60) {
        items.push({
          employee: emp,
          isNewEmployee: isNew,
          contractTypeLabel: isNew 
            ? (language === 'ar' ? 'عقد موظف جديد (فترة تجربة 3 أشهر)' : 'New Employee (3-Month Probation)')
            : (emp.termOfContract || emp.term_of_contract || (language === 'ar' ? 'عقد دائمي' : 'Permanent Contract')),
          startDate: startDateStr || '—',
          targetDate: targetDateStr || '—',
          targetDateObj,
          daysRemaining,
          status
        });
      }
    });

    // Sort by days remaining (most urgent / expired first)
    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [employees, language]);

  // Urgent count (<= 7 days or already expired)
  const urgentCount = useMemo(() => {
    return allAlertItems.filter(item => item.daysRemaining <= 7).length;
  }, [allAlertItems]);

  const newEmpCount = useMemo(() => {
    return allAlertItems.filter(item => item.isNewEmployee).length;
  }, [allAlertItems]);

  const permanentCount = useMemo(() => {
    return allAlertItems.filter(item => !item.isNewEmployee).length;
  }, [allAlertItems]);

  // Filtered items based on search and active tab
  const filteredItems = useMemo(() => {
    return allAlertItems.filter(item => {
      // 1. Tab filter
      if (activeFilter === 'urgent' && item.daysRemaining > 7) return false;
      if (activeFilter === 'new_emp' && !item.isNewEmployee) return false;
      if (activeFilter === 'permanent' && item.isNewEmployee) return false;
      if (activeFilter === 'month' && (item.daysRemaining < 0 || item.daysRemaining > 30)) return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const emp = item.employee as any;
        const nameAr = String(emp.fullNameAr || emp.full_name_ar || emp.fullName || '').toLowerCase();
        const nameEn = String(emp.fullNameEn || emp.full_name_en || emp.fullName || '').toLowerCase();
        const code = String(emp.employeeId || emp.employee_id || emp.badgeNo || emp.badge_no || '').toLowerCase();
        const dept = String(emp.department || '').toLowerCase();
        const branch = String(emp.branch || emp.location_ar || emp.location_en || '').toLowerCase();
        const pos = String(emp.position || emp.jobTitle || emp.position_ar || '').toLowerCase();

        return (
          nameAr.includes(q) ||
          nameEn.includes(q) ||
          code.includes(q) ||
          dept.includes(q) ||
          branch.includes(q) ||
          pos.includes(q)
        );
      }

      return true;
    });
  }, [allAlertItems, activeFilter, searchQuery]);

  // Handle send evaluation
  const handleSendEvaluation = (emp: any) => {
    const empName = emp.fullNameAr || emp.full_name_ar || emp.fullName || emp.fullNameEn || 'الموظف';
    setToastMessage(
      language === 'ar'
        ? `تم إرسال نموذج تقييم فترة التجربة (3 أشهر) للموظف (${empName}) إلى المدير المباشر بنجاح.`
        : `3-month probation evaluation form for (${empName}) has been sent successfully.`
    );
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all ${
          isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Toast Alert Notification */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-5 py-3 text-sm font-bold flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{toastMessage}</span>
            </div>
            <button 
              onClick={() => setToastMessage(null)}
              className="text-white/80 hover:text-white p-1 rounded-lg"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className={`p-5 sm:p-6 border-b flex items-start justify-between gap-4 ${
          isDark ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/20 shrink-0">
              <span className="material-symbols-outlined text-2xl animate-bounce">notification_important</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black">
                  {language === 'ar' ? 'تنبيهات انتهاء العقود والتقييم' : 'Contract Renewal & Evaluation Alerts'}
                </h2>
                {urgentCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{urgentCount} {language === 'ar' ? 'عقد بحاجة لإجراء عاجل' : 'Urgent'}</span>
                  </span>
                )}
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'ar' 
                  ? 'متابعة الموظفين الذين تقترب عقودهم من الانتهاء (أسبوع قبل الانتهاء) أو انتهاء فترة تجربة الموظف الجديد (3 أشهر) لإرسال التقييم' 
                  : 'Track employees with contracts expiring within 1 week or completing 3-month probation period for evaluation'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-all ${
              isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
            title={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b ${
          isDark ? 'border-white/10 bg-slate-900/20' : 'border-slate-100 bg-slate-50/40'
        }`}>
          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
            isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">warning</span>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">{language === 'ar' ? 'حرجة (خلال أسبوع)' : 'Urgent (≤ 7 Days)'}</div>
              <div className="text-lg font-black text-rose-500">{urgentCount}</div>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
            isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">person_add</span>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">{language === 'ar' ? 'موظفين جدد (تقييم)' : 'New Probation'}</div>
              <div className="text-lg font-black text-teal-500">{newEmpCount}</div>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
            isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">history_edu</span>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">{language === 'ar' ? 'عقود دائمية (تجديد)' : 'Permanent Contracts'}</div>
              <div className="text-lg font-black text-indigo-500">{permanentCount}</div>
            </div>
          </div>

          <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
            isDark ? 'bg-slate-800/40 border-white/5' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">event_upcoming</span>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400">{language === 'ar' ? 'إجمالي التنبيهات' : 'Total Tracked'}</div>
              <div className="text-lg font-black text-amber-500">{allAlertItems.length}</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{language === 'ar' ? 'الكل' : 'All'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{allAlertItems.length}</span>
            </button>

            <button
              onClick={() => setActiveFilter('urgent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'urgent'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-xs">alarm</span>
              <span>{language === 'ar' ? 'خلال أسبوع (حرجة)' : 'Due in 7 Days'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${urgentCount > 0 ? 'bg-rose-500 text-white' : 'bg-black/20'}`}>
                {urgentCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('new_emp')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'new_emp'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-xs">person_add</span>
              <span>{language === 'ar' ? 'موظفين جدد (تقييم التجربة)' : 'New Probation'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{newEmpCount}</span>
            </button>

            <button
              onClick={() => setActiveFilter('permanent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'permanent'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-xs">history_edu</span>
              <span>{language === 'ar' ? 'عقود دائمية (تجديد)' : 'Permanent'}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">{permanentCount}</span>
            </button>

            <button
              onClick={() => setActiveFilter('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeFilter === 'month'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{language === 'ar' ? 'خلال شهر' : 'Within 30 Days'}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <span className={`material-symbols-outlined absolute ${language === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-sm text-slate-400`}>
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ar' ? 'بحث بالاسم أو الكود أو الفرع...' : 'Search employee or branch...'}
              className={`w-full ${language === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all ${
                isDark 
                  ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className={`absolute ${language === 'ar' ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600`}
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Alerts Table */}
        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {filteredItems.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border border-dashed my-4 ${
              isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50/50'
            }`}>
              <span className="material-symbols-outlined text-4xl text-emerald-500">task_alt</span>
              <h3 className="text-sm font-bold mt-2">
                {language === 'ar' ? 'لا توجد عقود مشمولة بالتنبيه حالياً وفق هذا التصنيف' : 'No contract alerts found for this filter'}
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {language === 'ar' ? 'جميع عقود الموظفين سارية ومحدثة ولا تتطلب إجراءات فورية.' : 'All employee contracts are active and do not require immediate action.'}
              </p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${
              isDark ? 'border-white/10' : 'border-slate-200 shadow-2xs'
            }`}>
              <table className={`w-full border-collapse text-xs ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
                <thead className="sticky top-0 z-10 shadow-xs">
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-[#1e293b] text-slate-200 border-white/10' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    <th className="p-3.5">{language === 'ar' ? 'الموظف' : 'Employee'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'القسم والفرع' : 'Department & Branch'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'نوع العقد والمرحلة' : 'Contract Type & Stage'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Target Expiry Date'}</th>
                    <th className="p-3.5">{language === 'ar' ? 'المدة المتبقية' : 'Remaining Time'}</th>
                    <th className="p-3.5 text-center">{language === 'ar' ? 'الإجراءات المطلوبة' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {filteredItems.map((item) => {
                    const emp = item.employee as any;
                    const nameAr = emp.fullNameAr || emp.full_name_ar || emp.fullName || '—';
                    const nameEn = emp.fullNameEn || emp.full_name_en || '';
                    const code = emp.employeeId || emp.employee_id || emp.badgeNo || emp.badge_no || `EMP-${emp.id}`;
                    const dept = emp.department || '—';
                    const branch = emp.branch || emp.location_ar || emp.location_en || '—';
                    const position = emp.position || emp.jobTitle || emp.position_ar || '—';

                    return (
                      <tr 
                        key={emp.id}
                        className={`transition-colors ${
                          item.daysRemaining <= 7 
                            ? isDark ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'bg-rose-50/50 hover:bg-rose-50'
                            : isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Employee Name & Code */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                              {emp.photoUrl || emp.photo ? (
                                <img src={emp.photoUrl || emp.photo} alt={nameAr} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <span>{(nameAr || nameEn).charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{nameAr}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {code}
                                </span>
                              </div>
                              {nameEn && (
                                <div className="text-[11px] text-slate-400 font-normal">{nameEn}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Department & Branch */}
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{position}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <span>{dept}</span>
                            <span>•</span>
                            <span className="font-bold text-teal-600 dark:text-teal-400">{branch}</span>
                          </div>
                        </td>

                        {/* Contract Type */}
                        <td className="p-3.5">
                          {item.isNewEmployee ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                              <span className="material-symbols-outlined text-xs">person_add</span>
                              <span>{language === 'ar' ? 'عقد جديد (فترة تجربة 3 أشهر)' : 'New Probation'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              <span className="material-symbols-outlined text-xs">verified</span>
                              <span>{item.contractTypeLabel}</span>
                            </span>
                          )}
                        </td>

                        {/* Target Expiry Date */}
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.targetDate}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.isNewEmployee 
                              ? (language === 'ar' ? 'نهاية الأشهر الثلاثة' : 'Probation End')
                              : (language === 'ar' ? 'نهاية سريان العقد' : 'Contract Expiry')}
                          </div>
                        </td>

                        {/* Days Remaining Status */}
                        <td className="p-3.5">
                          {item.daysRemaining < 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-500 text-white shadow-xs">
                              <span className="material-symbols-outlined text-xs">error</span>
                              <span>{language === 'ar' ? `منتهي منذ ${Math.abs(item.daysRemaining)} يوم` : `Expired ${Math.abs(item.daysRemaining)}d ago`}</span>
                            </span>
                          ) : item.daysRemaining === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-600 text-white animate-pulse shadow-xs">
                              <span className="material-symbols-outlined text-xs">alarm</span>
                              <span>{language === 'ar' ? 'ينتهي اليوم!' : 'Expires Today!'}</span>
                            </span>
                          ) : item.daysRemaining <= 7 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 animate-pulse">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              <span>{language === 'ar' ? `متبقي ${item.daysRemaining} أيام (عاجل)` : `${item.daysRemaining} days left (Urgent)`}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              <span>{language === 'ar' ? `متبقي ${item.daysRemaining} يوماً` : `${item.daysRemaining} days remaining`}</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Print / Preview Contract Button */}
                            <button
                              onClick={() => {
                                onClose();
                                onOpenContract(item.employee);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                              title={language === 'ar' ? 'معاينة وطباعة وثيقة العقد' : 'Preview & Print Contract'}
                            >
                              <span className="material-symbols-outlined text-xs">print</span>
                              <span>{language === 'ar' ? 'طباعة العقد' : 'Print Contract'}</span>
                            </button>

                            {/* Send Evaluation Button (ONLY for New Employee Probation) */}
                            {item.isNewEmployee && (
                              <button
                                onClick={() => handleSendEvaluation(item.employee)}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                                title={language === 'ar' ? 'إرسال نموذج تقييم فترة التجربة (3 أشهر) للمدير المباشر' : 'Send 3-Month Probation Evaluation'}
                              >
                                <span className="material-symbols-outlined text-xs">rate_review</span>
                                <span>{language === 'ar' ? 'إرسال التقييم' : 'Send Evaluation'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-white/10 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-teal-500">info</span>
            <span>
              {language === 'ar'
                ? 'يتم تنبيه إدارة الموارد البشرية قبل أسبوع من تاريخ انتهاء العقد الدائمي أو فترة التجربة (3 أشهر) للموظف الجديد.'
                : 'HR is notified 1 week prior to permanent contract expiration or 3-month probation completion.'}
            </span>
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
            }`}
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
