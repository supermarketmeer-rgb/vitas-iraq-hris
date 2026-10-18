import React, { useState, useMemo, useEffect } from 'react';
import { Employee } from '../types';
import { api } from '../api/client';
import { useApp } from '../context/AppContext';

interface BatchContractDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedCount: number, excludedPermanentCount: number, autoExcludedNewCount: number) => void;
  language?: string;
  isDark?: boolean;
  employees?: Employee[];
}

export const BatchContractDatesModal: React.FC<BatchContractDatesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language = 'ar',
  isDark = true,
  employees: passedEmployees
}) => {
  const isAr = language === 'ar';
  const t = (ar: string, en: string) => (isAr ? ar : en);

  // AppContext bindings for direct React state update
  let appCtx: any = null;
  try {
    appCtx = useApp();
  } catch (e) {}
  const setContextEmployees = appCtx?.setEmployees;
  const refreshContextEmployees = appCtx?.refreshEmployees;
  const contextEmployees = appCtx?.employees;

  // Current year for default dates
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  // Loaded employees
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all_permanent' | 'selected' | 'excluded' | 'new_contracts'>('all_permanent');
  const [selectedDept, setSelectedDept] = useState('all');

  // Multi-select state: Set of employee IDs that are SELECTED for update
  // (All permanent contracts are selected by default; user unchecks to exclude for individual editing)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Helper to detect if contract is a new/probation contract
  const isNewContract = (emp: any): boolean => {
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
      term.includes('مؤقت') ||
      term.includes('temporary') ||
      term === 'عقد موظف جديد' ||
      term === 'new employee contract'
    );
  };

  // Helper to format contract type label
  const getContractTypeLabel = (emp: any): { label: string; isNew: boolean } => {
    const isNew = isNewContract(emp);
    if (isNew) {
      return {
        label: t('عقد موظف جديد (فترة تجربة)', 'New Employee Contract (Probation)'),
        isNew: true
      };
    }
    const rawTerm = emp.termOfContract || emp.term_of_contract || emp.contract_type || emp.contractType;
    return {
      label: rawTerm && rawTerm.trim() !== '' ? rawTerm : t('عقد دائمي (محدد المدة)', 'Permanent Contract (Fixed Term)'),
      isNew: false
    };
  };

  // Load employees from API, context, or localStorage
  useEffect(() => {
    if (!isOpen) return;

    const loadEmps = async () => {
      setIsLoading(true);
      try {
        let list: Employee[] = [];
        // 1. First priority: Fresh live data from MySQL API
        try {
          const apiEmps = await api.getEmployees();
          if (Array.isArray(apiEmps) && apiEmps.length > 0) {
            list = apiEmps;
          }
        } catch (err) {}

        // 2. Second priority: AppContext or props
        if (!list || list.length === 0) {
          if (contextEmployees && contextEmployees.length > 0) {
            list = contextEmployees;
          } else if (passedEmployees && passedEmployees.length > 0) {
            list = passedEmployees;
          }
        }

        // 3. Fallback: LocalStorage
        if (!list || list.length === 0) {
          const cached = localStorage.getItem('vitas_employees');
          if (cached) {
            try { list = JSON.parse(cached); } catch {}
          }
        }

        setAllEmployees(list);

        // Pre-select all PERMANENT contracts by default
        const initialSelected = new Set<string>();
        list.forEach(emp => {
          if (!isNewContract(emp)) {
            const id = String(emp.id ?? emp.employeeId ?? emp.badgeNo);
            initialSelected.add(id);
          }
        });
        setSelectedIds(initialSelected);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmps();
  }, [isOpen, passedEmployees, contextEmployees]);

  // Split employees into Permanent vs New
  const { permanentEmployees, newContractEmployees } = useMemo(() => {
    const permanent: Employee[] = [];
    const newCon: Employee[] = [];

    allEmployees.forEach(emp => {
      if (isNewContract(emp)) {
        newCon.push(emp);
      } else {
        permanent.push(emp);
      }
    });

    return { permanentEmployees: permanent, newContractEmployees: newCon };
  }, [allEmployees]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set<string>();
    allEmployees.forEach(e => {
      const d = e.department || e.department_ar;
      if (d && d.trim()) depts.add(d.trim());
    });
    return Array.from(depts);
  }, [allEmployees]);

  // Filtered list based on search, tab, and department
  const filteredList = useMemo(() => {
    let list: Employee[] = [];
    if (filterTab === 'new_contracts') {
      list = newContractEmployees;
    } else {
      list = permanentEmployees;
    }

    // Filter by tab
    if (filterTab === 'selected') {
      list = list.filter(emp => selectedIds.has(String(emp.id ?? emp.employeeId ?? emp.badgeNo)));
    } else if (filterTab === 'excluded') {
      list = list.filter(emp => !selectedIds.has(String(emp.id ?? emp.employeeId ?? emp.badgeNo)));
    }

    // Filter by department
    if (selectedDept !== 'all') {
      list = list.filter(e => (e.department || (e as any).department_ar) === selectedDept);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(e => {
        const anyE = e as any;
        const name = `${anyE.name || ''} ${anyE.name_ar || ''} ${anyE.name_en || ''} ${e.fullName || ''} ${anyE.fullNameAr || ''}`.toLowerCase();
        const badge = String(e.badgeNo || anyE.badge_no || e.employeeId || e.id || '').toLowerCase();
        const dept = String(e.department || anyE.department_ar || '').toLowerCase();
        const branch = String(e.branch || anyE.location || anyE.location_ar || '').toLowerCase();
        return name.includes(q) || badge.includes(q) || dept.includes(q) || branch.includes(q);
      });
    }

    return list;
  }, [filterTab, permanentEmployees, newContractEmployees, selectedIds, selectedDept, searchQuery]);

  // Selection handlers
  const handleToggleSelect = (empId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const handleSelectAllPermanent = () => {
    const all = new Set<string>();
    permanentEmployees.forEach(emp => {
      all.add(String(emp.id ?? emp.employeeId ?? emp.badgeNo));
    });
    setSelectedIds(all);
  };

  const handleDeselectAllPermanent = () => {
    setSelectedIds(new Set());
  };

  // Quick Preset Date Ranges
  const handleApplyPreset = (year: number) => {
    setStartDate(`${year}-01-01`);
    setEndDate(`${year}-12-31`);
  };

  // Submit Batch Update
  const handleApplyBatchUpdate = async () => {
    if (!startDate || !endDate) {
      alert(t('يرجى تحديد تاريخ بداية ونهاية العقد أولاً', 'Please select contract start and end dates'));
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      alert(t('تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية', 'Contract end date must be after start date'));
      return;
    }

    const countToUpdate = permanentEmployees.filter(emp => 
      selectedIds.has(String(emp.id ?? emp.employeeId ?? emp.badgeNo))
    ).length;

    if (countToUpdate === 0) {
      alert(t('لم يتم تحديد أي عقد دائمي للتعديل', 'No permanent contracts selected for update'));
      return;
    }

    setIsApplying(true);
    try {
      // 1. Update in-memory employee list
      const updatedList = allEmployees.map(emp => {
        const id = String(emp.id ?? emp.employeeId ?? emp.badgeNo);
        // Only update if permanent AND selected
        if (!isNewContract(emp) && selectedIds.has(id)) {
          return {
            ...emp,
            contractStartDate: startDate,
            contract_start_date: startDate,
            contractEndDate: endDate,
            contract_end_date: endDate
          };
        }
        return emp;
      });

      // 2. Immediately update internal state & AppContext React state so whole UI refreshes without reload
      setAllEmployees(updatedList);
      if (setContextEmployees) {
        setContextEmployees(updatedList);
      }

      // 3. Save to localStorage immediately
      try {
        localStorage.setItem('vitas_employees', JSON.stringify(updatedList));
      } catch (e) {
        console.warn('Failed to update vitas_employees in localStorage:', e);
      }

      // 4. Dispatch custom events for real-time synchronization across all tabs and open views
      try {
        window.dispatchEvent(new CustomEvent('vitas_employees_updated', { detail: updatedList }));
        window.dispatchEvent(new CustomEvent('vitas:data_refreshed', { detail: { table: 'employees' } }));
        window.dispatchEvent(new CustomEvent('vitas:force_refresh_employees', { detail: { employees: updatedList } }));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}

      // 5. Extract selected employee IDs and call atomic backend API
      const empsToSync = updatedList.filter(emp => {
        const id = String(emp.id ?? emp.employeeId ?? emp.badgeNo);
        return !isNewContract(emp) && selectedIds.has(id);
      });
      const idsForBackend = empsToSync.map(e => e.id ?? e.employeeId ?? e.badgeNo);

      try {
        await api.batchUpdateContractDates({
          employeeIds: idsForBackend,
          startDate,
          endDate
        });
      } catch (backendErr) {
        console.warn('Batch endpoint failed, updating employees individually:', backendErr);
        await Promise.allSettled(empsToSync.map(emp => api.updateEmployee(emp)));
      }

      // 6. Confirm database sync by fetching latest data from API
      try {
        const freshList = await api.getEmployees();
        if (Array.isArray(freshList) && freshList.length > 0) {
          setAllEmployees(freshList);
          if (setContextEmployees) {
            setContextEmployees(freshList);
          }
          try {
            localStorage.setItem('vitas_employees', JSON.stringify(freshList));
          } catch (e) {}
          window.dispatchEvent(new CustomEvent('vitas_employees_updated', { detail: freshList }));
          window.dispatchEvent(new CustomEvent('vitas:data_refreshed', { detail: { table: 'employees' } }));
          window.dispatchEvent(new CustomEvent('vitas:force_refresh_employees', { detail: { employees: freshList } }));
          window.dispatchEvent(new Event('storage'));
        }
      } catch (fetchErr) {}

      // 7. Refresh AppContext
      if (refreshContextEmployees) {
        await refreshContextEmployees().catch(() => {});
      }

      const excludedPermanentCount = permanentEmployees.length - countToUpdate;
      const autoExcludedNewCount = newContractEmployees.length;

      if (onSuccess) {
        onSuccess(countToUpdate, excludedPermanentCount, autoExcludedNewCount);
      }

      onClose();
    } catch (err: any) {
      console.error('Error applying batch contract dates update:', err);
      alert(t('حدث خطأ أثناء تعديل العقود', 'Error updating contract dates: ' + err.message));
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = permanentEmployees.filter(emp =>
    selectedIds.has(String(emp.id ?? emp.employeeId ?? emp.badgeNo))
  ).length;
  const excludedPermanentCount = permanentEmployees.length - selectedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark ? 'bg-[#0f172a] border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* =========================================================================
            1. MODAL HEADER
            ========================================================================= */}
        <div className={`p-5 border-b flex items-center justify-between gap-4 ${
          isDark ? 'border-white/10 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 shrink-0">
              <span className="material-symbols-outlined text-2xl">edit_calendar</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  {t('تعديل تواريخ العقود الدائمية دفعة واحدة', 'Batch Update Permanent Contract Dates')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  {t('العقود الدائمية فقط', 'Permanent Contracts Only')}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t(
                  'تعديل تاريخ بداية ونهاية العقود الدائمية بكبسة زر واحدة، مع استثناء العقود الجديدة تلقائياً وإمكانية استثناء أي موظف لتعديل عقده منفرداً.',
                  'Update contract start and end dates for all permanent staff in one click. Excludes new contracts automatically with multi-select individual exclusion.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              isDark ? 'border-white/10 hover:bg-white/10 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* =========================================================================
            2. DATE SETTINGS PANEL & PRESETS
            ========================================================================= */}
        <div className={`p-5 border-b space-y-4 ${
          isDark ? 'border-white/10 bg-[#0a0f1d]' : 'border-slate-200 bg-teal-50/40'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
              <span className="material-symbols-outlined text-base">date_range</span>
              <span>{t('تحديد التواريخ الجديدة للعقود الدائمية:', 'Set New Contract Period:')}</span>
            </span>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">{t('خيارات سريعة:', 'Presets:')}</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(currentYear)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  startDate === `${currentYear}-01-01` && endDate === `${currentYear}-12-31`
                    ? 'bg-teal-600 border-teal-500 text-white'
                    : isDark ? 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(`سنة ${currentYear}`, `Year ${currentYear}`)}
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(currentYear + 1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  startDate === `${currentYear + 1}-01-01` && endDate === `${currentYear + 1}-12-31`
                    ? 'bg-teal-600 border-teal-500 text-white'
                    : isDark ? 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t(`سنة ${currentYear + 1}`, `Year ${currentYear + 1}`)}
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  const nextYear = new Date(today);
                  nextYear.setFullYear(today.getFullYear() + 1);
                  setStartDate(today.toISOString().split('T')[0]);
                  setEndDate(nextYear.toISOString().split('T')[0]);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isDark ? 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {t('سنة كاملة من اليوم', '1 Year From Today')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                {t('تاريخ بداية العقد الجديد (Start Date):', 'New Contract Start Date:')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                {t('تاريخ نهاية العقد الجديد (End Date):', 'New Contract End Date:')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-xs'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Policy Exclusion Notice Banner */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <span className="material-symbols-outlined text-base shrink-0">verified_user</span>
              <span>
                {t(
                  `قاعدة السياسات المفعلة: تم حجب واستثناء ${newContractEmployees.length} عقد جديد/فترة تجربة تلقائياً لمنع التعديل الخاطئ.`,
                  `Active Policy Rule: ${newContractEmployees.length} new/probation contracts are automatically excluded to prevent accidental modification.`
                )}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 shrink-0">
              {t('مستثنى نظاماً', 'Auto Protected')}
            </span>
          </div>
        </div>

        {/* =========================================================================
            3. STATS & MULTI-SELECT FILTER BAR
            ========================================================================= */}
        <div className={`px-5 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Tabs for categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterTab('all_permanent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'all_permanent'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{t('كافة العقود الدائمية', 'All Permanent')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
                {permanentEmployees.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('selected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'selected'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{t('المحددة للتعديل', 'Selected')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
                {selectedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('excluded')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'excluded'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{t('مستثناة (تعديل منفرد)', 'Excluded (Manual)')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
                {excludedPermanentCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('new_contracts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'new_contracts'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : isDark ? 'text-slate-400 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{t('العقود الجديدة (مستثناة)', 'New Contracts')}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
                {newContractEmployees.length}
              </span>
            </button>
          </div>

          {/* Quick Select/Deselect buttons */}
          {filterTab !== 'new_contracts' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllPermanent}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isDark ? 'border-teal-500/40 text-teal-400 hover:bg-teal-500/10' : 'border-teal-600 text-teal-700 hover:bg-teal-50'
                }`}
              >
                {t('تحديد الكل', 'Select All')}
              </button>
              <button
                type="button"
                onClick={handleDeselectAllPermanent}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  isDark ? 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10' : 'border-rose-600 text-rose-700 hover:bg-rose-50'
                }`}
              >
                {t('إلغاء التحديد (استثناء الكل)', 'Deselect All')}
              </button>
            </div>
          )}
        </div>

        {/* =========================================================================
            4. SEARCH & DEPARTMENT FILTER BAR
            ========================================================================= */}
        <div className={`px-5 py-2.5 border-b flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDark ? 'border-white/10 bg-[#0a0f1d]/50' : 'border-slate-200 bg-white'
        }`}>
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder={t('بحث بالاسم، البادج، الفرع...', 'Search name, badge, branch...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full ps-8 pe-3 py-1.5 rounded-xl border text-xs outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            />
            <span className="material-symbols-outlined text-slate-400 absolute start-2 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
              search
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[11px] text-slate-400 shrink-0">{t('القسم:', 'Dept:')}</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className={`w-full sm:w-auto px-3 py-1.5 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">{t('كافة الأقسام', 'All Departments')}</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* =========================================================================
            5. EMPLOYEE CHECKLIST TABLE (MULTI-SELECT EXCLUSION LIST)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-4xl animate-spin text-teal-500">progress_activity</span>
              <span>{t('جارِ تحميل قائمة العقود والموظفين...', 'Loading contracts list...')}</span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-500">search_off</span>
              <p>{t('لا توجد عقود تطابق شروط البحث', 'No contracts match filter')}</p>
            </div>
          ) : (
            <div className={`rounded-2xl border overflow-hidden ${
              isDark ? 'border-white/10 bg-[#0a0f1d]' : 'border-slate-200 bg-white'
            }`}>
              <table className="w-full text-start text-xs border-collapse">
                <thead className={`sticky top-0 z-10 text-[11px] font-bold border-b ${
                  isDark ? 'bg-slate-900 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <tr>
                    <th className="p-3 text-center w-12">{t('تعديل؟', 'Select')}</th>
                    <th className="p-3 text-start">{t('الموظف والبادج', 'Employee & Badge')}</th>
                    <th className="p-3 text-start">{t('نوع العقد الحالي', 'Contract Type')}</th>
                    <th className="p-3 text-center">{t('التواريخ الحالية', 'Current Dates')}</th>
                    <th className="p-3 text-center">{t('التواريخ الجديدة المقترحة', 'Proposed Dates')}</th>
                    <th className="p-3 text-center">{t('الحالة المقررة', 'Action Status')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                  {filteredList.map(emp => {
                    const empId = String(emp.id ?? emp.employeeId ?? emp.badgeNo);
                    const isNew = isNewContract(emp);
                    const isSelected = selectedIds.has(empId);
                    const contractInfo = getContractTypeLabel(emp);

                    const curStart = emp.contractStartDate || emp.contract_start_date || emp.originalStartDate || emp.joinDate || '-';
                    const curEnd = emp.contractEndDate || emp.contract_end_date || '-';

                    return (
                      <tr
                        key={empId}
                        onClick={() => {
                          if (!isNew) handleToggleSelect(empId);
                        }}
                        className={`transition-colors ${
                          isNew 
                            ? isDark ? 'bg-amber-950/10 opacity-75' : 'bg-amber-50/50'
                            : isSelected
                              ? isDark ? 'bg-teal-950/20 hover:bg-teal-950/30' : 'bg-teal-50/60 hover:bg-teal-100/50'
                              : isDark ? 'bg-rose-950/15 hover:bg-rose-950/25' : 'bg-rose-50/50 hover:bg-rose-100/50'
                        } ${!isNew ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          {isNew ? (
                            <div className="flex items-center justify-center" title={t('مستثنى نظاماً لأنه عقد جديد/فترة تجربة', 'Protected new contract')}>
                              <span className="material-symbols-outlined text-amber-500 text-lg">lock</span>
                            </div>
                          ) : (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(empId)}
                              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                            />
                          )}
                        </td>

                        {/* Employee Name & Badge */}
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                              isNew 
                                ? 'bg-amber-500/20 text-amber-400'
                                : isSelected 
                                  ? 'bg-teal-500/20 text-teal-400' 
                                  : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {(emp.name || emp.name_ar || emp.fullName || 'V')[0]}
                            </div>
                            <div>
                              <span className="font-bold block text-xs">
                                {isAr ? (emp.name_ar || emp.fullNameAr || emp.name || emp.fullName) : (emp.name_en || emp.name || emp.fullName)}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="font-mono text-teal-500">VTS-{emp.badgeNo || emp.badge_no || empId}</span>
                                <span>•</span>
                                <span>{emp.department || emp.department_ar || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contract Type */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            isNew 
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                              : 'bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-teal-300'
                          }`}>
                            {contractInfo.label}
                          </span>
                        </td>

                        {/* Current Dates */}
                        <td className="p-3 text-center font-mono text-[11px]">
                          <span className="text-slate-400 block">{curStart}</span>
                          <span className="text-slate-500 text-[10px] block">➔ {curEnd}</span>
                        </td>

                        {/* Proposed Dates */}
                        <td className="p-3 text-center font-mono text-[11px]">
                          {isNew ? (
                            <span className="text-slate-500 text-[10px] italic">
                              {t('دون تغيير (مستثنى)', 'Unchanged (Protected)')}
                            </span>
                          ) : isSelected ? (
                            <div>
                              <span className="text-emerald-500 font-bold block">{startDate}</span>
                              <span className="text-emerald-400 text-[10px] block font-bold">➔ {endDate}</span>
                            </div>
                          ) : (
                            <span className="text-rose-500 text-[10px] italic">
                              {t('مستثنى (تعديل منفرد)', 'Excluded (Manual)')}
                            </span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-3 text-center">
                          {isNew ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              {t('عقد جديد (مستثنى)', 'New Contract (Locked)')}
                            </span>
                          ) : isSelected ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">check</span>
                              <span>{t('سيتم التعديل', 'Will Update')}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">close</span>
                              <span>{t('مستثنى (منفرد)', 'Excluded')}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =========================================================================
            6. MODAL FOOTER & CONFIRMATION ACTION
            ========================================================================= */}
        <div className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDark ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-2 text-xs">
            <span className="material-symbols-outlined text-teal-500 text-lg">info</span>
            <span>
              {t(
                `سيتم تعديل ${selectedCount} عقد دائمي بالتواريخ الجديدة (${startDate} إلى ${endDate})، واستثناء ${excludedPermanentCount} عقد دائمي للتعديل المنفرد.`,
                `Will update ${selectedCount} permanent contracts (${startDate} to ${endDate}), excluding ${excludedPermanentCount} for individual editing.`
              )}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isDark ? 'border-white/15 hover:bg-white/10 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {t('إلغاء', 'Cancel')}
            </button>

            <button
              type="button"
              onClick={handleApplyBatchUpdate}
              disabled={isApplying || selectedCount === 0}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2 cursor-pointer border-2 border-teal-400/30"
            >
              {isApplying ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  <span>{t('جارِ تطبيق التعديل...', 'Applying Updates...')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">task_alt</span>
                  <span>{t(`تطبيق التعديل على (${selectedCount}) عقد دائمي الآن`, `Apply Update to (${selectedCount}) Permanent Contracts`)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
