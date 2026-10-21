import React, { useState, useEffect, useRef } from 'react';
import {
  PayrollLegalSettings,
  TaxBracketConfig,
  FullPayrollTaxResult,
  getDefaultLegalSettings,
  getDefaultTaxBrackets,
  calculateCombinedPayrollTaxAndSecurity,
  validateTaxBrackets
} from '../../utils/iraqPayrollTaxEngine';
import { CalculationTraceDetailsModal } from './CalculationTraceDetailsModal';

// Reusable Input Component with Live Real-time Thousand Separators
export interface FormattedAmountInputProps {
  value: number | null | undefined;
  onChange: (val: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export const FormattedAmountInput: React.FC<FormattedAmountInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  id
}) => {
  const formatWithCommas = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === '') return '';
    const clean = String(val).replace(/,/g, '').trim();
    if (clean === '' || isNaN(Number(clean))) return clean;
    const parts = clean.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const [displayVal, setDisplayVal] = useState<string>(() => formatWithCommas(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentNum = displayVal ? parseFloat(displayVal.replace(/,/g, '')) : null;
    const propNum = value !== null && value !== undefined && !isNaN(Number(value)) ? Number(value) : null;
    if (currentNum !== propNum) {
      setDisplayVal(formatWithCommas(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawVal = input.value;
    const cursorPos = input.selectionStart || 0;

    // Count commas before the cursor in raw input
    const commasBefore = (rawVal.slice(0, cursorPos).match(/,/g) || []).length;

    // Only allow digits and optional decimal point
    const digitsOnly = rawVal.replace(/,/g, '').replace(/[^\d.]/g, '');

    if (digitsOnly === '') {
      setDisplayVal('');
      onChange(null);
      return;
    }

    const formatted = formatWithCommas(digitsOnly);
    setDisplayVal(formatted);

    const parsed = parseFloat(digitsOnly);
    onChange(isNaN(parsed) ? null : parsed);

    // Calculate new cursor position preserving position relative to digits
    const digitsBefore = cursorPos - commasBefore;
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      let newCursor = 0;
      let counted = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] !== ',') counted++;
        if (counted === digitsBefore) {
          newCursor = i + 1;
          break;
        }
      }
      if (digitsBefore === 0) newCursor = 0;
      if (counted < digitsBefore) newCursor = formatted.length;
      inputRef.current.setSelectionRange(newCursor, newCursor);
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      id={id}
      value={displayVal}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={
        className ||
        'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 outline-none'
      }
    />
  );
};

interface IraqLegalTaxSettingsSectionProps {
  language?: 'ar' | 'en';
  onSettingsSaved?: (settings: PayrollLegalSettings) => void;
}

export const IraqLegalTaxSettingsSection: React.FC<IraqLegalTaxSettingsSectionProps> = ({
  language = 'ar',
  onSettingsSaved
}) => {
  const isAr = language === 'ar';

  // Sub-tabs
  type LegalSubTab = 'social_security' | 'income_tax' | 'allowances' | 'brackets' | 'taxable_rules' | 'audit_versions' | 'tester';
  const [activeTab, setActiveTab] = useState<LegalSubTab>('social_security');

  // State
  const [settings, setSettings] = useState<PayrollLegalSettings>(getDefaultLegalSettings());
  const [brackets, setBrackets] = useState<TaxBracketConfig[]>(getDefaultTaxBrackets());
  const [allVersions, setAllVersions] = useState<PayrollLegalSettings[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Bracket Editing & Modal State
  const [editingBracket, setEditingBracket] = useState<TaxBracketConfig | null>(null);
  const [isBracketModalOpen, setIsBracketModalOpen] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[]; warnings: string[] } | null>(null);

  // New Version Modal State
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState<boolean>(false);
  const [newVersionForm, setNewVersionForm] = useState({
    version_code: '',
    version_name: '',
    effective_from: new Date().toISOString().substring(0, 10),
    legal_reference: '',
    notes: '',
    set_as_active: true
  });

  // Test Benchmark & Preview Modal State
  const [testEmployee, setTestEmployee] = useState({
    id: 'BENCHMARK_EMP',
    full_name_ar: 'علي حسن العراقي (سيناريو الاختبار)',
    basic_salary: 750000,
    marital_status: 'married',
    children_count: 4,
    spouse_has_income: false,
    is_ss_tax_exempt: false,
    allowances: {
      housing: 0,
      transport: 0,
      living: 0,
      food: 0,
      overtime: 0,
      bonus: 0
    }
  });
  const [testCalculationResult, setTestCalculationResult] = useState<FullPayrollTaxResult | null>(null);
  const [isTraceModalOpen, setIsTraceModalOpen] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setSaveToast({ message, type });
    setTimeout(() => setSaveToast(null), 4500);
  };

  // Load Data from Server
  const loadLegalData = async () => {
    try {
      setLoading(true);

      const [settingsRes, bracketsRes, logsRes] = await Promise.all([
        fetch('/api/tax-module/legal-settings').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/tax-module/tax-brackets').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/tax-module/audit-logs').then(r => r.ok ? r.json() : []).catch(() => [])
      ]);

      if (settingsRes?.active) {
        setSettings(settingsRes.active);
      }
      if (Array.isArray(settingsRes?.all_versions)) {
        setAllVersions(settingsRes.all_versions);
      }
      if (Array.isArray(bracketsRes) && bracketsRes.length > 0) {
        setBrackets(bracketsRes.map(b => ({
          ...b,
          min_income: Number(b.min_income),
          max_income: b.max_income !== null && b.max_income !== undefined ? Number(b.max_income) : null,
          tax_rate: Number(b.tax_rate),
          fixed_tax: Number(b.fixed_tax || 0),
          bracket_order: Number(b.bracket_order)
        })));
      }
      if (Array.isArray(logsRes)) {
        setAuditLogs(logsRes);
      }
    } catch (e) {
      console.error('Failed to load legal tax settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLegalData();
  }, []);

  // Recalculate benchmark test whenever settings or brackets change
  useEffect(() => {
    try {
      const res = calculateCombinedPayrollTaxAndSecurity(testEmployee, settings, brackets);
      setTestCalculationResult(res);
    } catch (err) {
      console.warn('Could not calculate benchmark preview:', err);
    }
  }, [settings, brackets, testEmployee]);

  // Save Legal Settings
  const handleSaveLegalSettings = async () => {
    setIsSaving(true);
    try {
      const targetId = settings.id || 'legal_set_2026_01';
      const res = await fetch(`/api/tax-module/legal-settings/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update legal settings');
      }

      showToast(isAr ? 'تم حفظ وتحديث الإعدادات القانونية بنجاح ومزامنتها مع النظام!' : 'Legal settings updated and synchronized successfully!');
      if (onSettingsSaved) onSettingsSaved(settings);
      loadLegalData();
    } catch (err: any) {
      showToast(err.message || 'Error saving settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Create New Version
  const handleCreateNewVersion = async () => {
    if (!newVersionForm.version_code || !newVersionForm.version_name) {
      showToast(isAr ? 'يرجى إدخال رمز واسم الإصدار الجديد' : 'Please provide version code and name', 'warning');
      return;
    }

    try {
      const payload = {
        ...settings,
        version_code: newVersionForm.version_code,
        version_name: newVersionForm.version_name,
        effective_from: newVersionForm.effective_from,
        legal_reference: newVersionForm.legal_reference || settings.legal_reference,
        notes: newVersionForm.notes || settings.notes,
        status: newVersionForm.set_as_active ? 'ACTIVE' : 'DRAFT'
      };

      const res = await fetch('/api/tax-module/legal-settings/new-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create new version');

      setIsNewVersionModalOpen(false);
      showToast(isAr ? 'تم إنشاء وحفظ الإصدار القانوني الجديد بنجاح مع حماية السجلات التاريخية!' : 'New legal version created successfully!');
      loadLegalData();
    } catch (err: any) {
      showToast(err.message || 'Error creating version', 'error');
    }
  };

  // Validate Brackets
  const handleValidateBrackets = () => {
    const val = validateTaxBrackets(brackets);
    setValidationResult(val);
    if (val.isValid) {
      showToast(isAr ? 'الشرائح الضريبية متناسقة ومستمرة تماماً ولا توجد فجوات أو تداخلات!' : 'Tax brackets are valid with 0 gaps or overlaps!', 'success');
    } else {
      showToast(isAr ? `توجد مشكلات في الشرائح الضريبية: ${val.errors[0]}` : val.errors[0], 'error');
    }
  };

  // Save/Update Bracket
  const handleSaveBracket = async (bracketToSave: TaxBracketConfig) => {
    try {
      const isNew = !brackets.some(b => b.id === bracketToSave.id);
      let res;
      if (isNew) {
        res = await fetch('/api/tax-module/tax-brackets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bracketToSave)
        });
      } else {
        res = await fetch(`/api/tax-module/tax-brackets/${bracketToSave.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bracketToSave)
        });
      }

      if (!res.ok) throw new Error('Failed to save bracket');

      showToast(isAr ? 'تم حفظ الشريحة الضريبية بنجاح' : 'Tax bracket saved successfully');
      setIsBracketModalOpen(false);
      setEditingBracket(null);
      loadLegalData();
    } catch (err: any) {
      showToast(err.message || 'Error saving bracket', 'error');
    }
  };

  // Delete Bracket
  const handleDeleteBracket = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الشريحة الضريبية؟' : 'Are you sure you want to delete this bracket?')) return;
    try {
      const res = await fetch(`/api/tax-module/tax-brackets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bracket');
      showToast(isAr ? 'تم حذف الشريحة الضريبية' : 'Tax bracket deleted');
      loadLegalData();
    } catch (err: any) {
      showToast(err.message || 'Error deleting bracket', 'error');
    }
  };

  const tabsConfig: Array<{ id: LegalSubTab; labelAr: string; labelEn: string; icon: string }> = [
    { id: 'social_security', labelAr: 'إعدادات الضمان الاجتماعي', labelEn: 'Social Security Settings', icon: 'shield_person' },
    { id: 'income_tax', labelAr: 'إعدادات ضريبة الدخل', labelEn: 'Income Tax Settings', icon: 'receipt_long' },
    { id: 'allowances', labelAr: 'السماحات الشخصية والعائلية', labelEn: 'Personal & Family Allowances', icon: 'family_restroom' },
    { id: 'brackets', labelAr: 'شرائح الضريبة', labelEn: 'Tax Brackets', icon: 'stairs' },
    { id: 'taxable_rules', labelAr: 'قواعد الدخل والخصومات', labelEn: 'Taxable Rules & Components', icon: 'account_tree' },
    { id: 'audit_versions', labelAr: 'سجل التعديلات والإصدارات', labelEn: 'Audit Log & Versions', icon: 'history' },
    { id: 'tester', labelAr: 'سيناريو الاختبار والمحاكي', labelEn: 'Live Tester & Benchmark', icon: 'calculate' },
  ];

  return (
    <div className="space-y-6">

      {/* Main Banner Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-900 via-emerald-950 to-slate-900 text-white shadow-xl border border-teal-500/20 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner shrink-0">
              <span className="material-symbols-outlined text-3xl">policy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-wide">
                  {isAr ? 'إعدادات الضمان الاجتماعي وضريبة الدخل — العراق' : 'Social Security & Income Tax Settings — Iraq'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                  {settings.version_code} ({settings.status === 'ACTIVE' ? (isAr ? 'معتمد نشط' : 'Active') : settings.status})
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-1 max-w-2xl">
                {isAr
                  ? 'محرك حسابي ديناميكي مركزي للقطاع الخاص في العراق، يعتمد بنسبة 100% على هذه الإعدادات والشرائح بدون أي نسب ثابتة داخل الكود البرمجي (قانون 18 لسنة 2023 وقانون 113).'
                  : 'Central dynamic calculation engine for Iraq private sector, strictly deriving all deductions from these legal parameters with zero hardcoded rates.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setIsNewVersionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-950/70 hover:bg-teal-900 border border-teal-400/40 text-xs font-bold text-teal-100 flex items-center gap-1.5 transition shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">bookmark_add</span>
              <span>{isAr ? 'إنشاء إصدار جديد' : 'New Version'}</span>
            </button>
            <button
              onClick={handleSaveLegalSettings}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center gap-2 transition shadow-lg disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              <span>{isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ كافة الإعدادات' : 'Save All Settings')}</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Nav */}
        <div className="mt-6 pt-4 border-t border-teal-500/20 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {tabsConfig.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/40 border border-teal-300 ring-2 ring-teal-400/40 scale-[1.02]'
                    : 'bg-teal-900/40 text-teal-100/80 hover:bg-teal-900/70 hover:text-white border border-teal-500/20'
                }`}
              >
                <span className={`material-symbols-outlined text-sm ${isActive ? 'text-teal-100' : 'text-teal-300'}`}>{tab.icon}</span>
                <span className={isActive ? 'text-white font-extrabold' : ''}>{isAr ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toast Notification */}
      {saveToast && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-lg animate-in slide-in-from-top-2 duration-200 border ${
          saveToast.type === 'error'
            ? 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/60 dark:text-red-200 dark:border-red-800'
            : saveToast.type === 'warning'
            ? 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800'
            : 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
        }`}>
          <span className="material-symbols-outlined text-base">
            {saveToast.type === 'error' ? 'error' : saveToast.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <span>{saveToast.message}</span>
        </div>
      )}

      {/* TAB 1: SOCIAL SECURITY SETTINGS */}
      {activeTab === 'social_security' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">shield_person</span>
                <span>{isAr ? 'إعدادات الضمان الاجتماعي للقطاع الخاص (قانون رقم 18 لسنة 2023)' : 'Social Security Settings (Law 18 of 2023)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr
                  ? 'تحديد نسب الاستقطاع لحصة الموظف ومساهمة الشركة، ونسبة الأجر الخاضع، والحدود القانونية العليا والدنيا.'
                  : 'Define employee deduction and employer contribution rates, insured salary ratio, and legal ceilings.'}
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-700">
              قانون 18 نافذ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* employee_rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'نسبة استقطاع الموظف (employee_rate)' : 'Employee Contribution Rate'}</span>
                <span className="text-teal-600 dark:text-teal-400 font-mono font-bold">%</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.ss_employee_rate}
                onChange={(e) => setSettings({ ...settings, ss_employee_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'الافتراضي المقر: 5.0% تُستقطع من راتب الموظف' : 'Statutory default: 5.0%'}</p>
            </div>

            {/* employer_rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'نسبة مساهمة المؤسسة (employer_rate)' : 'Employer Contribution Rate'}</span>
                <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">%</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={settings.ss_employer_rate}
                onChange={(e) => setSettings({ ...settings, ss_employer_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'الافتراضي المقر: 12.0% تتحملها الشركة ولا تخصم من الموظف' : 'Statutory default: 12.0%'}</p>
            </div>

            {/* insured_salary_rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'نسبة الراتب الخاضعة للضمان (insured_salary_rate)' : 'Insured Salary Rate'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">%</span>
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="100"
                value={settings.ss_insured_salary_rate}
                onChange={(e) => setSettings({ ...settings, ss_insured_salary_rate: parseFloat(e.target.value) || 100 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'نسبة الأجر المعتمدة لاحتساب الاشتراك (100% قياسي)' : 'Percentage of wage subject to SS (default 100%)'}</p>
            </div>

            {/* minimum_insured_salary */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'حد أدنى للأجر الخاضع للضمان (اختياري)' : 'Minimum Insured Salary (Optional)'}</span>
                <span className="text-slate-400 font-mono text-[11px]">د.ع</span>
              </label>
              <FormattedAmountInput
                placeholder={isAr ? 'غير محدد' : 'None'}
                value={settings.ss_minimum_insured_salary}
                onChange={(val) => setSettings({ ...settings, ss_minimum_insured_salary: val })}
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'الحد الأدنى للأجر المقبول قانوناً (350,000 د.ع)' : 'Statutory floor (e.g. 350,000 IQD)'}</p>
            </div>

            {/* maximum_insured_salary */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'حد أعلى للأجر الخاضع للضمان (سقف اختياري)' : 'Maximum Insured Salary (Cap - Optional)'}</span>
                <span className="text-slate-400 font-mono text-[11px]">د.ع</span>
              </label>
              <FormattedAmountInput
                placeholder={isAr ? 'غير محدد (مفتوح)' : 'Unlimited'}
                value={settings.ss_maximum_insured_salary}
                onChange={(val) => setSettings({ ...settings, ss_maximum_insured_salary: val })}
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'السقف الأعلى الخاضع للاستقطاع (5,000,000 د.ع أو فارغ)' : 'Statutory ceiling (e.g. 5,000,000 IQD)'}</p>
            </div>

            {/* effective_from & to */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'تاريخ بدء تطبيق الإعدادات (effective_from)' : 'Effective From Date'}
              </label>
              <input
                type="date"
                value={settings.effective_from ? settings.effective_from.substring(0, 10) : ''}
                onChange={(e) => setSettings({ ...settings, effective_from: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'تاريخ سريان هذا الإصدار القانوني' : 'Effective date of this version'}</p>
            </div>
          </div>

          {/* Eligible Salary Components for Social Security */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400">check_box</span>
                <span>{isAr ? 'مكونات الأجر الخاضعة لاشتراك الضمان الاجتماعي (Eligible Salary Components)' : 'Eligible Wage Components for Social Security'}</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'حدد بنود الأجر والبدلات التي تدخل ضمن وعاء الضمان وفق اللوائح المعتمدة للشركة:'
                  : 'Select wage and allowance components included in the social security contribution base:'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {[
                { id: 'basic_salary', labelAr: 'الراتب الاسمي (الأساسي)', labelEn: 'Basic Salary' },
                { id: 'housing', labelAr: 'مخصصات السكن', labelEn: 'Housing Allowance' },
                { id: 'transport', labelAr: 'مخصصات النقل', labelEn: 'Transportation' },
                { id: 'living', labelAr: 'مخصصات المعيشة', labelEn: 'Living Allowance' },
                { id: 'food', labelAr: 'مخصصات الطعام والوجبات', labelEn: 'Food Allowance' },
                { id: 'family', labelAr: 'مخصصات الزوجية والأطفال', labelEn: 'Family Allowance' },
                { id: 'bonus', labelAr: 'المكافآت والحوافز الثابتة', labelEn: 'Fixed Bonuses' },
                { id: 'other_allowance', labelAr: 'أي مخصصات أخرى ثابتة', labelEn: 'Other Fixed Allowances' },
              ].map((comp) => {
                const isChecked = (settings.ss_eligible_components || []).includes(comp.id);
                return (
                  <label
                    key={comp.id}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs transition ${
                      isChecked
                        ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-950 dark:text-teal-100 font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const current = settings.ss_eligible_components || [];
                        const updated = e.target.checked
                          ? [...current, comp.id]
                          : current.filter(c => c !== comp.id);
                        setSettings({ ...settings, ss_eligible_components: updated });
                      }}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <span>{isAr ? comp.labelAr : comp.labelEn}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INCOME TAX SETTINGS */}
      {activeTab === 'income_tax' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">receipt_long</span>
                <span>{isAr ? 'إعدادات وقواعد ضريبة الدخل (قانون رقم 113 لسنة 1982 وتعديلاته)' : 'Income Tax Engine Settings (Law 113 of 1982)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr ? 'دورية الاحتساب، قواعد التقريب، طريقة تحديد الوعاء الضريبي، والمرجع التشريعي.' : 'Payroll period frequency, rounding method, taxable income determination.'}
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700">
              قانون 113 نافذ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* tax_payroll_periods_per_year */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'عدد فترات مسير الرواتب بالسنة' : 'Payroll Periods Per Year'}
              </label>
              <input
                type="number"
                min="1"
                max="52"
                value={settings.tax_payroll_periods_per_year}
                onChange={(e) => setSettings({ ...settings, tax_payroll_periods_per_year: parseInt(e.target.value) || 12 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'الافتراضي: 12 شهر (رواتب شهرية)' : 'Default: 12 months'}</p>
            </div>

            {/* tax_rounding_method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'طريقة تقريب الاستقطاع الضريبي' : 'Tax Rounding Method'}
              </label>
              <select
                value={settings.tax_rounding_method}
                onChange={(e) => setSettings({ ...settings, tax_rounding_method: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="NEAREST_1000">{isAr ? 'لأقرب 1,000 دينار (المعتاد في العراق)' : 'Nearest 1,000 IQD'}</option>
                <option value="NEAREST_100">{isAr ? 'لأقرب 100 دينار' : 'Nearest 100 IQD'}</option>
                <option value="NEAREST_1">{isAr ? 'لأقرب دينار واحد' : 'Nearest 1 IQD'}</option>
                <option value="NONE">{isAr ? 'بدون تقريب (كسور عشرية دقيقة)' : 'No Rounding (Exact Float)'}</option>
              </select>
              <p className="text-[11px] text-slate-400">{isAr ? 'المعتمد في القطاع المصرفي والمالي العراقي' : 'Used for payroll payout'}</p>
            </div>

            {/* tax_taxable_income_method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'طريقة تحديد الدخل الخاضع للضريبة' : 'Taxable Income Method'}
              </label>
              <select
                value={settings.tax_taxable_income_method}
                onChange={(e) => setSettings({ ...settings, tax_taxable_income_method: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="ANNUAL_STANDARD">{isAr ? 'سنوي قياسي: (الدخل الشهري × 12 - السماحات) ÷ 12' : 'Annual Standard'}</option>
                <option value="CUMULATIVE_YTD">{isAr ? 'تراكمي منذ بداية السنة الضريبية (YTD Cumulative)' : 'Cumulative Year-to-Date'}</option>
              </select>
              <p className="text-[11px] text-slate-400">{isAr ? 'يتوافق مع المادة 12 و13 من قانون ضريبة الدخل 113' : 'Standard tax baseline'}</p>
            </div>
          </div>

          {/* Legal Reference & Documentation */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-amber-500">menu_book</span>
                <span>{isAr ? 'المرجع والسند القانوني الموثق' : 'Legal Reference & Legislation Source'}</span>
              </label>
              <input
                type="text"
                value={settings.legal_reference || ''}
                onChange={(e) => setSettings({ ...settings, legal_reference: e.target.value })}
                placeholder={isAr ? 'اكتب نص القانون أو القرار الوزاري المنظم...' : 'e.g. Law 18 of 2023, Law 113 of 1982'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'ملاحظات وتوجيهات الحسابات والتدقيق' : 'Calculation & Audit Notes'}
              </label>
              <textarea
                rows={3}
                value={settings.notes || ''}
                onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
                placeholder={isAr ? 'أي ملاحظات تشغيلية أو توجيهات لموظف الموارد البشرية والرواتب...' : 'Operational notes for payroll officer...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERSONAL & FAMILY ALLOWANCES */}
      {activeTab === 'allowances' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">family_restroom</span>
                <span>{isAr ? 'السماحات الشخصية والعائلية والخصومات المقبولة ضريبياً' : 'Personal & Family Tax Allowances (Law 113)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr
                  ? 'قيم السماحات السنوية وشروط استحقاق سماح الزوجة وسقف عدد الأطفال، وخصم قسط الضمان من الوعاء.'
                  : 'Annual tax exemption allowances, spouse income condition, child limits, and deductible insurance.'}
              </p>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-700">
              سماحات سنوية بالدينار
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* personal_allowance */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'السماح الشخصي السنوي للمكلف' : 'Personal Annual Allowance'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">د.ع</span>
              </label>
              <FormattedAmountInput
                value={settings.tax_personal_allowance}
                onChange={(val) => setSettings({ ...settings, tax_personal_allowance: val || 0 })}
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'الافتراضي القانوني: 2,500,000 د.ع سنوياً' : 'Statutory default: 2,500,000 IQD'}</p>
            </div>

            {/* spouse_allowance */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'سماح الزوجة السنوي' : 'Spouse Annual Allowance'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">د.ع</span>
              </label>
              <FormattedAmountInput
                value={settings.tax_spouse_allowance}
                onChange={(val) => setSettings({ ...settings, tax_spouse_allowance: val || 0 })}
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'الافتراضي القانوني: 2,000,000 د.ع سنوياً' : 'Statutory default: 2,000,000 IQD'}</p>
            </div>

            {/* child_allowance */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'سماح الطفل الواحد السنوي' : 'Per Child Annual Allowance'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">د.ع</span>
              </label>
              <FormattedAmountInput
                value={settings.tax_child_allowance}
                onChange={(val) => setSettings({ ...settings, tax_child_allowance: val || 0 })}
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'الافتراضي القانوني: 200,000 د.ع لكل طفل سنوياً' : 'Statutory default: 200,000 IQD'}</p>
            </div>

            {/* eligible_children_limit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'الحد الأقصى لعدد الأطفال المستحقين للسماح' : 'Eligible Children Limit (Cap)'}
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={settings.tax_eligible_children_limit}
                onChange={(e) => setSettings({ ...settings, tax_eligible_children_limit: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'المقر قانوناً: 4 أطفال كحد أقصى' : 'Statutory limit: 4 children max'}</p>
            </div>

            {/* other_allowed_deductions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isAr ? 'السماحات أو الخصومات الأخرى المسموح بها' : 'Other Lawful Deductions'}</span>
                <span className="text-slate-400 font-mono text-[11px]">د.ع</span>
              </label>
              <FormattedAmountInput
                value={settings.tax_other_allowed_deductions}
                onChange={(val) => setSettings({ ...settings, tax_other_allowed_deductions: val || 0 })}
              />
              <p className="text-[11px] text-slate-400">{isAr ? 'أي إعفاءات خاصة ينص عليها القانون' : 'Other legally permitted deductions'}</p>
            </div>
          </div>

          {/* Legal Conditions Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* spouse_income_condition */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
              <input
                type="checkbox"
                id="spouse_income_condition"
                checked={settings.tax_spouse_income_condition}
                onChange={(e) => setSettings({ ...settings, tax_spouse_income_condition: e.target.checked })}
                className="mt-1 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <label htmlFor="spouse_income_condition" className="cursor-pointer text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  {isAr ? 'اشتراط عدم وجود دخل مستقل للزوجة لمنح السماح (spouse_income_condition)' : 'Spouse must have no independent income'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 block">
                  {isAr
                    ? 'بموجب القانون العراقي، إذا كانت الزوجة موظفة أو لديها دخل مستقل، يُحجب سماح الزوجة عن الزوج.'
                    : 'Under Iraqi tax regulations, working spouse is not eligible for husband tax allowance.'}
                </span>
              </label>
            </div>

            {/* employee_insurance_tax_deductible */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3">
              <input
                type="checkbox"
                id="employee_insurance_tax_deductible"
                checked={settings.tax_employee_insurance_deductible}
                onChange={(e) => setSettings({ ...settings, tax_employee_insurance_deductible: e.target.checked })}
                className="mt-1 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <label htmlFor="employee_insurance_tax_deductible" className="cursor-pointer text-xs">
                <span className="font-bold text-slate-900 dark:text-white block">
                  {isAr ? 'خصم استقطاع ضمان الموظف من الوعاء الضريبي (Tax Deductible Insurance)' : 'Deduct employee SS from taxable base'}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 block">
                  {isAr
                    ? 'تعتبر أقساط الضمان الاجتماعي المستقطعة من الموظف نفقة مقبولة تُخصم من الدخل الخاضع للضريبة.'
                    : 'Employee social security contribution is legally deducted before applying progressive brackets.'}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TAX BRACKETS TABLE */}
      {activeTab === 'brackets' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">stairs</span>
                <span>{isAr ? 'جدول شرائح ضريبة الدخل التصاعدية' : 'Progressive Tax Brackets Table'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr ? 'إدارة الشرائح والحدود والنسب ونطاقات الدخل والتحقق من سلامة الترتيب وعدم وجود فجوات أو تداخلات.' : 'Manage tiers, thresholds, rates and check gap/overlap continuity.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleValidateBrackets}
                className="px-3.5 py-2 rounded-xl border border-teal-500/30 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>{isAr ? 'إعادة ترتيب الشرائح والتحقق منها' : 'Validate & Check Gaps'}</span>
              </button>
              <button
                onClick={() => {
                  setEditingBracket({
                    id: `brk_${Date.now()}`,
                    bracket_order: brackets.length + 1,
                    name_ar: `الشريحة الجديدة (${brackets.length + 1})`,
                    name_en: `New Bracket (${brackets.length + 1})`,
                    min_income: brackets.length > 0 ? (brackets[brackets.length - 1].max_income || 1000000) : 0,
                    max_income: null,
                    tax_rate: 15.0,
                    fixed_tax: 0,
                    calculation_method: 'PROGRESSIVE_TIER',
                    legal_reference: 'قانون ضريبة الدخل 113',
                    status: 'ACTIVE'
                  });
                  setIsBracketModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>{isAr ? 'إضافة شريحة جديدة' : 'Add Bracket'}</span>
              </button>
            </div>
          </div>

          {/* Validation Banner if errors or warnings exist */}
          {validationResult && (
            <div className={`p-4 rounded-2xl border text-xs ${
              validationResult.isValid
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
            }`}>
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <span className="material-symbols-outlined text-base">
                  {validationResult.isValid ? 'check_circle' : 'warning'}
                </span>
                <span>{validationResult.isValid ? (isAr ? 'التحقق سليم: لا توجد فجوات أو تداخلات بين الشرائح' : 'Brackets are continuous and valid') : (isAr ? 'تنبيه: تم رصد مشكلات في الشرائح' : 'Brackets Validation Errors')}</span>
              </div>
              {validationResult.errors.map((err, idx) => (
                <div key={idx} className="ms-6 text-red-700 dark:text-red-300">• {err}</div>
              ))}
              {validationResult.warnings.map((warn, idx) => (
                <div key={idx} className="ms-6 text-amber-700 dark:text-amber-300">• {warn}</div>
              ))}
            </div>
          )}

          {/* Brackets Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="px-4 py-3 text-start">#</th>
                  <th className="px-4 py-3 text-start">{isAr ? 'اسم الشريحة' : 'Bracket Name'}</th>
                  <th className="px-4 py-3 text-start">{isAr ? 'الحد الأدنى (د.ع)' : 'Min Income'}</th>
                  <th className="px-4 py-3 text-start">{isAr ? 'الحد الأعلى (د.ع)' : 'Max Income'}</th>
                  <th className="px-4 py-3 text-center">{isAr ? 'نسبة الضريبة' : 'Tax Rate'}</th>
                  <th className="px-4 py-3 text-start">{isAr ? 'المرجع القانوني' : 'Legal Reference'}</th>
                  <th className="px-4 py-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {brackets.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-bold text-teal-700 dark:text-teal-400">
                      {b.bracket_order}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {isAr ? b.name_ar : b.name_en}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {b.min_income.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {b.max_income !== null ? b.max_income.toLocaleString() : <span className="text-teal-600 dark:text-teal-400 font-sans font-bold">{isAr ? 'ما زاد عن ذلك (مفتوحة)' : 'Unlimited Above'}</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-red-600 dark:text-red-400">
                      {b.tax_rate}%
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {b.legal_reference || 'قانون 113'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === 'ACTIVE'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end space-x-1 rtl:space-x-reverse">
                      <button
                        onClick={() => {
                          setEditingBracket({ ...b });
                          setIsBracketModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-300 text-[11px] font-bold transition"
                      >
                        {isAr ? 'تعديل' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleDeleteBracket(b.id)}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 text-[11px] font-bold transition"
                      >
                        {isAr ? 'حذف' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: TAXABLE RULES & COMPONENTS */}
      {activeTab === 'taxable_rules' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">account_tree</span>
              <span>{isAr ? 'قواعد الدخل والخصومات الخاضعة لضريبة الدخل' : 'Taxable Income Rules & Wage Components'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAr
                ? 'تحديد أي مكونات الأجر والبدلات تخضع لضريبة الدخل، وأيها معفاة قانوناً (لا تفترض أن الراتب الاسمي وحده هو الدخل الضريبي).'
                : 'Configure taxable vs exempt wage components in accordance with statutory guidelines.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { id: 'basic_salary', labelAr: 'الراتب الاسمي (الأساسي)', labelEn: 'Basic Salary', noteAr: 'خاضع للضريبة كأصل الدخل' },
              { id: 'housing', labelAr: 'مخصصات السكن', labelEn: 'Housing Allowance', noteAr: 'خاضعة للضريبة' },
              { id: 'transport', labelAr: 'مخصصات النقل والوقود', labelEn: 'Transportation', noteAr: 'خاضعة للضريبة' },
              { id: 'living', labelAr: 'مخصصات المعيشة وغلاء الأسعار', labelEn: 'Living Allowance', noteAr: 'خاضعة للضريبة' },
              { id: 'food', labelAr: 'مخصصات الطعام والضيافة', labelEn: 'Food Allowance', noteAr: 'خاضعة للضريبة' },
              { id: 'overtime', labelAr: 'أجور ساعات العمل الإضافي', labelEn: 'Overtime Earnings', noteAr: 'خاضعة للضريبة كدخل إضافي' },
              { id: 'bonus', labelAr: 'المكافآت السنوية والمقطوعة', labelEn: 'Bonuses & Incentives', noteAr: 'خاضعة للضريبة' },
              { id: 'other_allowance', labelAr: 'البدلات والمخصصات الأخرى', labelEn: 'Other Allowances', noteAr: 'خاضعة للضريبة' },
            ].map((comp) => {
              const isChecked = (settings.tax_eligible_components || []).includes(comp.id);
              return (
                <div
                  key={comp.id}
                  className={`p-4 rounded-2xl border flex items-start gap-3 transition ${
                    isChecked
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-teal-300 dark:border-teal-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`tax_${comp.id}`}
                    checked={isChecked}
                    onChange={(e) => {
                      const current = settings.tax_eligible_components || [];
                      const updated = e.target.checked
                        ? [...current, comp.id]
                        : current.filter(c => c !== comp.id);
                      setSettings({ ...settings, tax_eligible_components: updated });
                    }}
                    className="mt-1 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                  />
                  <label htmlFor={`tax_${comp.id}`} className="cursor-pointer text-xs space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white block">{isAr ? comp.labelAr : comp.labelEn}</span>
                    <span className="text-slate-400 text-[11px] block">{comp.noteAr}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOGS & LEGAL VERSIONS */}
      {activeTab === 'audit_versions' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">history</span>
                <span>{isAr ? 'سجل التعديلات والإصدارات القانونية والتدقيق' : 'Audit Logs & Legal Settings Versions'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr
                  ? 'حماية كشوف الرواتب التاريخية، تتبع المستخدمين المخولين بالتعديل، وتسجيل القيمة السابقة والجديدة وسبب التغيير.'
                  : 'Immutable version protection for finalized payroll runs, audit tracking, previous vs new values.'}
              </p>
            </div>

            <button
              onClick={() => setIsNewVersionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">bookmark_add</span>
              <span>{isAr ? 'إنشاء إصدار قانوني جديد' : 'Create New Legal Version'}</span>
            </button>
          </div>

          {/* Versions Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'إصدارات القواعد القانونية المسجلة في النظام:' : 'Saved Legal Setting Versions:'}
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="px-4 py-2.5 text-start">{isAr ? 'رمز الإصدار' : 'Version Code'}</th>
                    <th className="px-4 py-2.5 text-start">{isAr ? 'اسم الإصدار والوصف' : 'Version Name'}</th>
                    <th className="px-4 py-2.5 text-start">{isAr ? 'ساري من تاريخ' : 'Effective From'}</th>
                    <th className="px-4 py-2.5 text-center">{isAr ? 'نسبة الضمان (موظف / شركة)' : 'SS Rates'}</th>
                    <th className="px-4 py-2.5 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-2.5 text-start">{isAr ? 'المعتمد بواسطة' : 'Approved By'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allVersions.map((v) => (
                    <tr key={v.id || v.version_code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">{v.version_code}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{v.version_name}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600 dark:text-slate-400">{v.effective_from ? v.effective_from.substring(0, 10) : '-'}</td>
                      <td className="px-4 py-2.5 text-center font-mono">{v.ss_employee_rate}% / {v.ss_employer_rate}%</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{v.approved_by || 'HR Director'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="space-y-3 pt-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? 'سجل العمليات والتدقيق (Audit Logs):' : 'Recent Audit Activity:'}
            </h4>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-60 overflow-y-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-start">{isAr ? 'الوقت والتاريخ' : 'Timestamp'}</th>
                    <th className="px-4 py-2 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                    <th className="px-4 py-2 text-start">{isAr ? 'الإجراء' : 'Action'}</th>
                    <th className="px-4 py-2 text-start">{isAr ? 'ملخص التغيير' : 'Summary'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-slate-400 font-sans">
                        {isAr ? 'لا توجد سجلات تدقيق سابقة' : 'No audit records yet'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 text-slate-500">{log.timestamp ? new Date(log.timestamp).toLocaleString('ar-IQ') : '-'}</td>
                        <td className="px-4 py-2 font-bold text-teal-700 dark:text-teal-400 font-sans">{log.user}</td>
                        <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{log.action}</td>
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-sans">{log.summary_ar || log.summary_en || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: LIVE BENCHMARK TESTER & SANDBOX */}
      {activeTab === 'tester' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">calculate</span>
                <span>{isAr ? 'سيناريو الاختبار للموظف ومحاكي القواعد (Section 6 Benchmark)' : 'Live Benchmark & Employee Simulator'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr
                  ? 'اختبار فوري لسيناريو الموظف بالبيانات المحددة في برومبت التطوير للتحقق من دقة الضمان وضريبة الدخل.'
                  : 'Live simulation verifying benchmarks from Section 6 with full 18 line items and calculation trace.'}
              </p>
            </div>

            <button
              onClick={() => setIsTraceModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">receipt_long</span>
              <span>{isAr ? 'عرض تفاصيل الاحتساب (18 عنصراً) والمعادلة' : 'Show 18 Items & Formula Trace'}</span>
            </button>
          </div>

          {/* Test Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{isAr ? 'الراتب الاسمي الشهري (د.ع)' : 'Monthly Basic Salary'}</label>
              <FormattedAmountInput
                value={testEmployee.basic_salary}
                onChange={(val) => setTestEmployee({ ...testEmployee, basic_salary: val || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{isAr ? 'الحالة الاجتماعية' : 'Marital Status'}</label>
              <select
                value={testEmployee.marital_status}
                onChange={(e) => setTestEmployee({ ...testEmployee, marital_status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
              >
                <option value="married">{isAr ? 'متزوج' : 'Married'}</option>
                <option value="single">{isAr ? 'أعزب' : 'Single'}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{isAr ? 'عدد الأطفال' : 'Children Count'}</label>
              <input
                type="number"
                min="0"
                max="10"
                value={testEmployee.children_count}
                onChange={(e) => setTestEmployee({ ...testEmployee, children_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{isAr ? 'حالة دخل الزوجة' : 'Spouse Income'}</label>
              <select
                value={testEmployee.spouse_has_income ? 'working' : 'non_working'}
                onChange={(e) => setTestEmployee({ ...testEmployee, spouse_has_income: e.target.value === 'working' })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
              >
                <option value="non_working">{isAr ? 'لا تتقاضى راتباً (مستحقة للسماح)' : 'Non-working (Eligible)'}</option>
                <option value="working">{isAr ? 'تتقاضى راتباً/دخل مستقل (غير مستحقة)' : 'Working (Ineligible)'}</option>
              </select>
            </div>
          </div>

          {/* Benchmark Results Preview Cards */}
          {testCalculationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                  <div className="text-[11px] text-teal-800 dark:text-teal-300 font-bold">{isAr ? 'استقطاع الموظف للضمان (5%)' : 'Employee SS (5%)'}</div>
                  <div className="text-lg font-black text-teal-950 dark:text-white mt-0.5">
                    {testCalculationResult.item_5_employee_ss_amount.toLocaleString()} <span className="text-[10px] font-normal">د.ع</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                    {testCalculationResult.item_5_employee_ss_amount === 37500 && testEmployee.basic_salary === 750000 ? '✅ يطابق 37,500 د.ع المحددة بالبرومبت' : ''}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <div className="text-[11px] text-blue-800 dark:text-blue-300 font-bold">{isAr ? 'مساهمة المؤسسة (12%)' : 'Employer SS (12%)'}</div>
                  <div className="text-lg font-black text-blue-950 dark:text-white mt-0.5">
                    {testCalculationResult.item_6_employer_ss_amount.toLocaleString()} <span className="text-[10px] font-normal">د.ع</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                    {testCalculationResult.item_6_employer_ss_amount === 90000 && testEmployee.basic_salary === 750000 ? '✅ يطابق 90,000 د.ع المحددة بالبرومبت' : ''}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-bold">{isAr ? 'مجموع الضمان الشهري' : 'Total SS Monthly'}</div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {testCalculationResult.social_security.total_insurance.toLocaleString()} <span className="text-[10px] font-normal">د.ع</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                    {testCalculationResult.social_security.total_insurance === 127500 && testEmployee.basic_salary === 750000 ? '✅ يطابق 127,500 د.ع المحددة بالبرومبت' : ''}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">{isAr ? 'الصافي قبل الضريبة' : 'Net Before Tax'}</div>
                  <div className="text-lg font-black text-emerald-950 dark:text-white mt-0.5">
                    {testCalculationResult.social_security.net_salary_before_tax.toLocaleString()} <span className="text-[10px] font-normal">د.ع</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                    {testCalculationResult.social_security.net_salary_before_tax === 712500 && testEmployee.basic_salary === 750000 ? '✅ يطابق 712,500 د.ع المحددة بالبرومبت' : ''}
                  </div>
                </div>
              </div>

              {/* Tax Output Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {isAr ? 'ضريبة الدخل المحتسبة ديناميكياً من الشرائح والسماحات:' : 'Dynamic Income Tax Result:'}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    الوعاء الضريبي: {testCalculationResult.item_12_taxable_income_base.toLocaleString()} د.ع | الضريبة السنوية: {testCalculationResult.item_15_annual_tax.toLocaleString()} د.ع | الاستقطاع الشهري: {testCalculationResult.item_16_monthly_tax.toLocaleString()} د.ع
                  </div>
                </div>
                <button
                  onClick={() => setIsTraceModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/60 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold flex items-center gap-1.5 transition text-xs"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>{isAr ? 'معاينة تفاصيل الاحتساب الـ 18' : 'Preview 18 Items'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD / EDIT TAX BRACKET */}
      {isBracketModalOpen && editingBracket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {editingBracket.id.startsWith('brk_') ? (isAr ? 'تعديل الشريحة الضريبية' : 'Edit Tax Bracket') : (isAr ? 'إضافة شريحة جديدة' : 'Add Tax Bracket')}
              </h3>
              <button onClick={() => setIsBracketModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'رقم ترتيب الشريحة' : 'Tier Order'}</label>
                  <input
                    type="number"
                    value={editingBracket.bracket_order}
                    onChange={(e) => setEditingBracket({ ...editingBracket, bracket_order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'نسبة الضريبة (%)' : 'Tax Rate (%)'}</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingBracket.tax_rate}
                    onChange={(e) => setEditingBracket({ ...editingBracket, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'اسم الشريحة (عربي)' : 'Name (Arabic)'}</label>
                <input
                  type="text"
                  value={editingBracket.name_ar}
                  onChange={(e) => setEditingBracket({ ...editingBracket, name_ar: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'الحد الأدنى للدخل (د.ع)' : 'Min Income'}</label>
                  <FormattedAmountInput
                    value={editingBracket.min_income}
                    onChange={(val) => setEditingBracket({ ...editingBracket, min_income: val || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'الحد الأعلى للدخل (أو فارغ)' : 'Max Income (Null for unbounded)'}</label>
                  <FormattedAmountInput
                    placeholder={isAr ? 'مفتوحة (ما زاد عن ذلك)' : 'Unlimited'}
                    value={editingBracket.max_income}
                    onChange={(val) => setEditingBracket({ ...editingBracket, max_income: val })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'المرجع القانوني أو السند' : 'Legal Reference'}</label>
                <input
                  type="text"
                  value={editingBracket.legal_reference || ''}
                  onChange={(e) => setEditingBracket({ ...editingBracket, legal_reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'الحالة' : 'Status'}</label>
                <select
                  value={editingBracket.status}
                  onChange={(e) => setEditingBracket({ ...editingBracket, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="ACTIVE">{isAr ? 'نشطة (ACTIVE)' : 'Active'}</option>
                  <option value="INACTIVE">{isAr ? 'معطلة (INACTIVE)' : 'Inactive'}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsBracketModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={() => handleSaveBracket(editingBracket)}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
              >
                {isAr ? 'حفظ الشريحة' : 'Save Bracket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE NEW LEGAL SETTINGS VERSION */}
      {isNewVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'إنشاء إصدار قانوني جديد (Legal Versioning)' : 'Create New Legal Settings Version'}
              </h3>
              <button onClick={() => setIsNewVersionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200">
              {isAr
                ? 'ملاحظة: إنشاء إصدار جديد يحافظ على كشوف الرواتب التاريخية دون تغيير، وتطبق التعديلات على الرواتب الجديدة فقط من تاريخ السريان.'
                : 'Note: Creating a new version preserves past payroll snapshots, applying changes only forward.'}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'رمز الإصدار (Code)' : 'Version Code'}</label>
                <input
                  type="text"
                  placeholder="e.g. v2026.2 أو v2027.1"
                  value={newVersionForm.version_code}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, version_code: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'اسم ومسمى الإصدار' : 'Version Name'}</label>
                <input
                  type="text"
                  placeholder="e.g. التعديل التشريعي لنسب الضمان الاجتماعي 2026"
                  value={newVersionForm.version_name}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, version_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'تاريخ بدء النفاذ' : 'Effective From Date'}</label>
                <input
                  type="date"
                  value={newVersionForm.effective_from}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, effective_from: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">{isAr ? 'المرجع القانوني المنظم' : 'Legislation Reference'}</label>
                <input
                  type="text"
                  placeholder="e.g. قرار مجلس الوزراء رقم ..."
                  value={newVersionForm.legal_reference}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, legal_reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="set_as_active"
                  checked={newVersionForm.set_as_active}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, set_as_active: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="set_as_active" className="cursor-pointer font-bold text-slate-800 dark:text-slate-200">
                  {isAr ? 'تعيين هذا الإصدار كإصدار نشط حالياً للمسيرات القادمة' : 'Set as currently active version'}
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsNewVersionModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleCreateNewVersion}
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm"
              >
                {isAr ? 'اعتماد الإصدار الجديد' : 'Save Version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CALCULATION DETAILS & FORMULA TRACE (THE 18 ITEMS MODAL) */}
      <CalculationTraceDetailsModal
        isOpen={isTraceModalOpen}
        onClose={() => setIsTraceModalOpen(false)}
        result={testCalculationResult}
        employeeName={testEmployee.full_name_ar}
        employeeCode={testEmployee.id}
        lang={language}
      />

    </div>
  );
};
