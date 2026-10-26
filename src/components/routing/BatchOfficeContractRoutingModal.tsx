import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Employee } from '../../types';

interface BatchOfficeContractRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees?: Employee[];
  language?: string;
  theme?: string;
  onSuccess?: (result: any) => void;
}

interface OfficeGroup {
  branchName: string;
  branchId: string;
  employees: Employee[];
  manager: any | null;
  isSelected: boolean;
  isExpanded: boolean;
  status: 'idle' | 'sending' | 'success' | 'failed';
  resultInfo?: string;
}

export const BatchOfficeContractRoutingModal: React.FC<BatchOfficeContractRoutingModalProps> = ({
  isOpen,
  onClose,
  employees: propEmployees,
  language = 'ar',
  theme = 'dark',
  onSuccess
}) => {
  const { employees: ctxEmployees, currentUser, t } = useApp();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const employeeSource = propEmployees && propEmployees.length > 0 ? propEmployees : ctxEmployees;

  // Options State
  const [sendToMode, setSendToMode] = useState<'manager_and_employees' | 'manager_only' | 'employees_only'>('manager_and_employees');
  const [channel, setChannel] = useState<'both' | 'email' | 'app'>('both');
  const [subjectTemplate, setSubjectTemplate] = useState('[فيتاس العراق] توجيه عقود العمل الرسمية المعتمدة - {office}');
  const [messageTemplate, setMessageTemplate] = useState('تحية طيبة،\nنرفق لكم حزمة عقود العمل المعتمدة رسمياً الخاصة بكادر ({office}) للمراجعة وتوثيق الاستلام بموجب تعليمات الإدارة العامة.');
  const [searchQuery, setSearchQuery] = useState('');

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [batchSummary, setBatchSummary] = useState<any | null>(null);

  // Group employees by Branch/Office
  const [officeGroups, setOfficeGroups] = useState<OfficeGroup[]>([]);

  useEffect(() => {
    if (!isOpen || !employeeSource || employeeSource.length === 0) return;

    // Filter active employees with contract data
    const activeEmps = employeeSource.filter((e: any) => {
      const status = String(e.status || '').toLowerCase().trim();
      return status !== 'terminated' && status !== 'مفصول';
    });

    // Group by branch
    const map = new Map<string, Employee[]>();
    activeEmps.forEach((emp: any) => {
      const branchRaw = String(emp.branch || emp.location_ar || emp.department || 'المكتب الرئيسي').trim();
      const branchKey = branchRaw || 'المكتب الرئيسي';
      if (!map.has(branchKey)) {
        map.set(branchKey, []);
      }
      map.get(branchKey)!.push(emp);
    });

    const groups: OfficeGroup[] = Array.from(map.entries()).map(([branchName, emps]) => {
      // Find Office Manager
      const mgr = emps.find((e: any) => {
        const pos = String(e.position_ar || e.position || e.jobTitle || '').toLowerCase();
        const posEn = String(e.position_en || e.jobTitleEn || '').toLowerCase();
        return (
          pos.includes('مدير المكتب') ||
          pos.includes('مدير فرع') ||
          pos.includes('مدير مكتب') ||
          posEn.includes('branch manager') ||
          posEn.includes('office manager')
        );
      }) || null;

      return {
        branchName,
        branchId: branchName.replace(/\s+/g, '_'),
        employees: emps,
        manager: mgr,
        isSelected: true,
        isExpanded: false,
        status: 'idle'
      };
    });

    // Sort by employee count descending
    groups.sort((a, b) => b.employees.length - a.employees.length);

    setOfficeGroups(groups);
    setBatchSummary(null);
    setProgressPercent(0);
    setIsProcessing(false);
  }, [isOpen, employeeSource]);

  if (!isOpen) return null;

  // Toggle office selection
  const toggleOfficeSelect = (branchName: string) => {
    setOfficeGroups(prev =>
      prev.map(g => (g.branchName === branchName ? { ...g, isSelected: !g.isSelected } : g))
    );
  };

  // Toggle select all
  const toggleSelectAll = (select: boolean) => {
    setOfficeGroups(prev => prev.map(g => ({ ...g, isSelected: select })));
  };

  // Toggle office accordion
  const toggleOfficeAccordion = (branchName: string) => {
    setOfficeGroups(prev =>
      prev.map(g => (g.branchName === branchName ? { ...g, isExpanded: !g.isExpanded } : g))
    );
  };

  // Filtered offices based on search
  const filteredOffices = officeGroups.filter(g =>
    g.branchName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const selectedOffices = officeGroups.filter(g => g.isSelected);
  const totalSelectedContracts = selectedOffices.reduce((acc, g) => acc + g.employees.length, 0);

  // Execute Batch Routing by Office
  const handleExecuteBatchRouting = async () => {
    if (selectedOffices.length === 0) {
      alert(isAr ? 'يرجى تحديد مكتب واحد على الأقل للمتابعة.' : 'Please select at least one office.');
      return;
    }

    const confirmMsg = isAr
      ? `هل أنت متأكد من بدء التوجيه الجماعي المنفصل لـ (${selectedOffices.length}) مكتب بعدد إجمالي (${totalSelectedContracts}) عقد؟\nسيتم فصل عقود كل مكتب وإرسالها لمدير وموظفي الفرع المعني فقط.`
      : `Are you sure you want to dispatch separated contract packages to ${selectedOffices.length} offices (${totalSelectedContracts} contracts)?`;

    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    setProgressPercent(5);

    try {
      // Build office packages payload
      const officePackages = selectedOffices.map(g => ({
        branchName: g.branchName,
        branchId: g.branchId,
        manager: g.manager
          ? {
              id: String(g.manager.id),
              employee_id: g.manager.employee_id || g.manager.employeeId,
              name_ar: g.manager.full_name_ar || g.manager.fullName,
              email: g.manager.org_email || g.manager.email,
              position_ar: g.manager.position_ar || g.manager.jobTitle,
              branch: g.branchName,
              recipient_type: 'office_manager'
            }
          : null,
        sendTo: sendToMode,
        employees: g.employees.map(e => ({
          id: String(e.id),
          employee_id: e.employee_id || e.employeeId,
          badge_no: e.badge_no || e.badgeNo,
          full_name_ar: e.full_name_ar || e.fullName,
          email: e.org_email || e.email,
          position_ar: e.position_ar || e.jobTitle,
          branch: g.branchName,
          basicSalary: e.basicSalary || (e as any).salary
        }))
      }));

      // Call dedicated batch endpoint
      const response = await fetch('/api/routing/batch-by-office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officePackages,
          channelRequested: channel,
          subjectTemplate,
          messageTemplate,
          currentUser: {
            id: currentUser?.id || 'admin',
            name: currentUser?.name || 'مسؤول الموارد البشرية'
          }
        })
      });

      const data = await response.json();
      setProgressPercent(100);

      if (data.success) {
        // Update per-office status
        setOfficeGroups(prev =>
          prev.map(g => {
            const foundPkg = data.packages?.find((p: any) => p.officeName === g.branchName);
            if (foundPkg) {
              return {
                ...g,
                status: 'success',
                resultInfo: isAr
                  ? `تم التسليم: ${foundPkg.recipientsCount} مستلم (${foundPkg.hasManager ? 'مدير الفرع معتمد' : 'كادر الفرع'})`
                  : `Delivered: ${foundPkg.recipientsCount} recipients`
              };
            }
            return g;
          })
        );

        setBatchSummary(data);
        if (onSuccess) onSuccess(data);
      } else {
        alert(data.error || 'Batch routing failed');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred during batch routing');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        className={`w-full max-w-5xl rounded-3xl shadow-2xl border flex flex-col max-h-[94vh] overflow-hidden transition-all ${
          isDark
            ? 'bg-[#0f172a] border-white/10 text-white shadow-teal-950/40'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 shrink-0">
              <span className="material-symbols-outlined text-2xl">hub</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg">
                  {t('التوجيه الجماعي لعقود العمل مقسمة حسب المكاتب', 'Batch Contract Routing Grouped by Office')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
                  {officeGroups.length} {t('مكاتب وفروع', 'Offices')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {totalSelectedContracts} {t('عقد محدد للإرسال', 'Selected Contracts')}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {t(
                  'فصل عقود كل مكتب بشكل مستقل وإرسالها لمدير وموظفي ذلك المكتب المعني فقط لحماية الخصوصية ومنع تداخل الملفات',
                  'Isolates contracts by branch and dispatches each package strictly to its respective Office Manager and local staff'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Progress Bar (Visible while sending) */}
          {isProcessing && (
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-teal-400">
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base animate-spin">sync</span>
                  <span>{t('جاري فصل العقود والتوجيه الإلكتروني لكافة المكاتب...', 'Routing separated packages by office...')}</span>
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-teal-950/40 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Summary Banner */}
          {batchSummary && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-300 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-xl text-emerald-400">check_circle</span>
                <span>
                  {t(
                    `تم إنجاز التوجيه بنجاح لـ (${batchSummary.processedOfficesCount}) مكتب، بإجمالي (${batchSummary.totalContracts}) عقد عمل رسمي.`,
                    `Successfully dispatched packages to ${batchSummary.processedOfficesCount} offices (${batchSummary.totalContracts} contracts).`
                  )}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                {t(
                  'تم إرسال الإشعارات وحفظ سجلات التسليم في سجل التدقيق المركزي (Delivery Audit Trail).',
                  'Audit records and delivery logs have been recorded centrally.'
                )}
              </p>
            </div>
          )}

          {/* 1. Dispatch Strategy & Target Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Strategy 1: Manager + Employees */}
            <button
              type="button"
              onClick={() => setSendToMode('manager_and_employees')}
              className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                sendToMode === 'manager_and_employees'
                  ? 'bg-teal-600/15 border-teal-500 text-teal-300 shadow-md shadow-teal-600/10'
                  : isDark
                  ? 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-teal-400 text-lg">supervisor_account</span>
                <span className="text-xs font-bold text-white">{t('مدير المكتب + موظفي الفرع', 'Manager & Staff')}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold mr-auto">
                  {t('الموصى به', 'Recommended')}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-80">
                {t(
                  'تسليم حزمة العقود لمدير كل مكتب، مع إرسال كل عقد مباشرة للموظف الخاص به عبر التطبيق.',
                  'Delivers office bundle to branch manager, plus individual contract to each staff member.'
                )}
              </p>
            </button>

            {/* Strategy 2: Manager Only */}
            <button
              type="button"
              onClick={() => setSendToMode('manager_only')}
              className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                sendToMode === 'manager_only'
                  ? 'bg-teal-600/15 border-teal-500 text-teal-300 shadow-md shadow-teal-600/10'
                  : isDark
                  ? 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-teal-400 text-lg">manage_accounts</span>
                <span className="text-xs font-bold text-white">{t('مدير كل مكتب فقط', 'Office Manager Only')}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-80">
                {t(
                  'توجيه حزمة عقود موظفي كل فرع إلى مدير ذلك الفرع فقط للمراجعة الإدارية والأرشفة الموقعية.',
                  'Routes contracts package strictly to branch managers for local review and physical filing.'
                )}
              </p>
            </button>

            {/* Strategy 3: Employees Only */}
            <button
              type="button"
              onClick={() => setSendToMode('employees_only')}
              className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                sendToMode === 'employees_only'
                  ? 'bg-teal-600/15 border-teal-500 text-teal-300 shadow-md shadow-teal-600/10'
                  : isDark
                  ? 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-white/20'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-teal-400 text-lg">group</span>
                <span className="text-xs font-bold text-white">{t('موظفي كل مكتب مباشرة', 'Direct Staff Only')}</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-80">
                {t(
                  'إرسال العقد لكل موظف على حدة في مكتبه عبر حسابه وتطبيقه دون إشراك مدير المكتب.',
                  'Direct digital delivery to individual employees through ESS portal without notifying manager.'
                )}
              </p>
            </button>
          </div>

          {/* 2. Channel & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            {/* Delivery Channel Radio */}
            <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 text-xs">
              <span className="text-slate-400 px-2 font-bold">{t('قناة الإرسال:', 'Channel:')}</span>
              {[
                { id: 'both', label: t('تطبيق الموظف + البريد', 'Both (App + M365)'), icon: 'all_inbox' },
                { id: 'app', label: t('تطبيق الموظف فقط', 'App Only'), icon: 'smartphone' },
                { id: 'email', label: t('البريد المؤسسي فقط', 'Email Only'), icon: 'mail' }
              ].map(ch => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id as any)}
                  className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    channel === ch.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{ch.icon}</span>
                  <span>{ch.label}</span>
                </button>
              ))}
            </div>

            {/* Office Filter & Select All */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('بحث عن مكتب أو فرع...', 'Search office...')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-xs border outline-none font-bold ${
                  isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => toggleSelectAll(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold transition cursor-pointer"
              >
                {t('تحديد الكل', 'Select All')}
              </button>
              <button
                type="button"
                onClick={() => toggleSelectAll(false)}
                className="px-2.5 py-1.5 rounded-xl text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold transition cursor-pointer"
              >
                {t('إلغاء التحديد', 'Deselect All')}
              </button>
            </div>
          </div>

          {/* 3. Offices Breakdown Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>{t('قائمة المكاتب المفروزة وجاهزية الإرسال:', 'Separated Office Packages:')}</span>
              <span>
                {selectedOffices.length} {t('مكتب محدد', 'selected offices')} • {totalSelectedContracts} {t('عقد عمل', 'contracts')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOffices.map(group => {
                const isSelected = group.isSelected;
                return (
                  <div
                    key={group.branchName}
                    className={`rounded-2xl border transition-all ${
                      isSelected
                        ? isDark
                          ? 'bg-slate-900/80 border-teal-500/40 shadow-sm'
                          : 'bg-white border-teal-500/50 shadow-md'
                        : isDark
                        ? 'bg-slate-900/20 border-white/5 opacity-60'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    }`}
                  >
                    {/* Office Card Header */}
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOfficeSelect(group.branchName)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-600 focus:ring-teal-500 accent-teal-600 cursor-pointer"
                        />
                        <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center shrink-0 font-bold">
                          <span className="material-symbols-outlined text-lg">location_city</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs sm:text-sm text-white">{group.branchName}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300">
                              {group.employees.length} {t('عقد', 'contracts')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-xs text-amber-400">badge</span>
                            <span>{t('مدير المكتب:', 'Manager:')}</span>
                            <span className="font-bold text-slate-200">
                              {group.manager?.full_name_ar || group.manager?.fullName || t('غير محدد (سيتم التوجيه للكادر مباشرة)', 'Not assigned')}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Status / Accordion toggle */}
                      <div className="flex items-center gap-2">
                        {group.status === 'success' && (
                          <span className="material-symbols-outlined text-emerald-400 text-lg" title="تم الإرسال">
                            check_circle
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleOfficeAccordion(group.branchName)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                          title={t('عرض قائمة الموظفين', 'Toggle employee list')}
                        >
                          <span className="material-symbols-outlined text-base">
                            {group.isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Result info if sent */}
                    {group.resultInfo && (
                      <div className="px-3.5 pb-2 text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">task_alt</span>
                        <span>{group.resultInfo}</span>
                      </div>
                    )}

                    {/* Expanded Employee Accordion */}
                    {group.isExpanded && (
                      <div className="p-3 border-t border-white/5 bg-black/20 rounded-b-2xl max-h-48 overflow-y-auto space-y-1.5 text-xs">
                        <div className="text-[10px] font-bold text-slate-400 mb-1">
                          {t('عقود الموظفين المشمولة بهذا المكتب:', 'Contracts included in this office package:')}
                        </div>
                        {group.employees.map(emp => (
                          <div
                            key={emp.id}
                            className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between gap-2 text-[11px]"
                          >
                            <span className="font-bold text-white truncate max-w-[160px]">
                              {emp.full_name_ar || emp.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {emp.employee_id || emp.employeeId || emp.badge_no}
                            </span>
                            <span className="text-[10px] text-teal-400 truncate max-w-[120px]">
                              {emp.position_ar || emp.jobTitle || '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Subject and Notice Customization */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {t('عنوان التوجيه المعتمد (يدعم متغير {office}):', 'Subject Template (supports {office}):')}
              </label>
              <input
                type="text"
                value={subjectTemplate}
                onChange={e => setSubjectTemplate(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold border outline-none ${
                  isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {t('نص الخطاب والإشعار الرسمي:', 'Official Notice Text:')}
              </label>
              <textarea
                rows={2}
                value={messageTemplate}
                onChange={e => setMessageTemplate(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold border outline-none resize-none ${
                  isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="text-xs text-slate-400">
            <span>{selectedOffices.length} {t('مكتب مفصول', 'isolated offices')}</span> •{' '}
            <span className="font-bold text-teal-400">{totalSelectedContracts} {t('عقد عمل', 'contracts')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t('إلغاء', 'Cancel')}
            </button>

            <button
              type="button"
              onClick={handleExecuteBatchRouting}
              disabled={isProcessing || selectedOffices.length === 0}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-lg transition cursor-pointer ${
                isProcessing || selectedOffices.length === 0
                  ? 'bg-slate-600 opacity-60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-95 shadow-teal-600/30'
              }`}
            >
              {isProcessing ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                  <span>{t('جاري الفصل والتوجيه...', 'Processing & Routing...')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>
                    {t(
                      `بدء إرسال العقود مقسمة (${selectedOffices.length} مكتب)`,
                      `Dispatch Separated Packages (${selectedOffices.length} Offices)`
                    )}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
