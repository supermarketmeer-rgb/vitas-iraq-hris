import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Employee } from '../types';
import { BatchContractDatesModal } from './BatchContractDatesModal';

export interface PoliciesSectionProps {
  appSettings?: Record<string, string>;
  onSettingChange?: (key: string, value: string) => void;
  onSaveAll?: () => void;
  language?: string;
  t?: (ar: string, en: string) => string;
  isSaving?: boolean;
  employees?: Employee[];
}

export const PoliciesSection: React.FC<PoliciesSectionProps> = ({
  appSettings: propAppSettings,
  onSettingChange: propOnSettingChange,
  onSaveAll: propOnSaveAll,
  language = 'ar',
  t: propT,
  isSaving: propIsSaving,
  employees
}) => {
  const isAr = language === 'ar';
  const t = propT || ((ar: string, en: string) => (isAr ? ar : en));

  // Internal state for self-contained usage
  const [internalSettings, setInternalSettings] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('vitas_app_settings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [internalIsSaving, setInternalIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Batch Contract Dates Modal state
  const [showBatchContractModal, setShowBatchContractModal] = useState(false);
  const [batchSuccessToast, setBatchSuccessToast] = useState<string | null>(null);

  // Determine active settings
  const appSettings = propAppSettings || internalSettings;
  const isSaving = propIsSaving !== undefined ? propIsSaving : internalIsSaving;

  // Load from API if internal
  useEffect(() => {
    if (!propAppSettings) {
      api.getAppSettings().then((data: any) => {
        if (Array.isArray(data) && data.length > 0) {
          const map: Record<string, string> = {};
          data.forEach(item => {
            if (item && item.setting_key) map[item.setting_key] = item.setting_value || '';
          });
          setInternalSettings(prev => ({ ...prev, ...map }));
          try {
            localStorage.setItem('vitas_app_settings', JSON.stringify({ ...internalSettings, ...map }));
          } catch {}
        }
      }).catch(() => {});
    }
  }, [propAppSettings]);

  const handleSettingChange = (key: string, value: string) => {
    if (propOnSettingChange) {
      propOnSettingChange(key, value);
    } else {
      setInternalSettings(prev => {
        const next = { ...prev, [key]: value };
        try {
          localStorage.setItem('vitas_app_settings', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  };

  const handleSaveAll = async () => {
    if (propOnSaveAll) {
      propOnSaveAll();
    } else {
      setInternalIsSaving(true);
      try {
        localStorage.setItem('vitas_app_settings', JSON.stringify(internalSettings));
        await api.updateAppSettingsBulk(internalSettings).catch(() => {});
        setSaveToast(t('تم حفظ جميع السياسات والإعدادات بنجاح!', 'All policies and settings saved successfully!'));
        setTimeout(() => setSaveToast(null), 4000);
      } catch (err) {
        console.warn('Error saving settings to API, saved to localStorage:', err);
        setSaveToast(t('تم حفظ السياسات محلياً بنجاح!', 'Policies saved locally!'));
        setTimeout(() => setSaveToast(null), 4000);
      } finally {
        setInternalIsSaving(false);
      }
    }
  };

  const handleBatchSuccess = (updatedCount: number, excludedPermanentCount: number, autoExcludedNewCount: number) => {
    setBatchSuccessToast(
      t(
        `تم بنجاح تعديل تواريخ بداية ونهاية ${updatedCount} عقد دائمي، مع استثناء ${excludedPermanentCount} عقود دائمية للتعديل المنفرد، وحماية ${autoExcludedNewCount} عقد جديد تلقائياً.`,
        `Successfully updated dates for ${updatedCount} permanent contracts. Excluded ${excludedPermanentCount} permanent contracts for manual editing, and protected ${autoExcludedNewCount} new contracts.`
      )
    );
    setTimeout(() => setBatchSuccessToast(null), 6000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* =========================================================================
          FEATURE: BATCH CONTRACT DATES UPDATE PROMINENT ACTION CARD
          ========================================================================= */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-950/60 via-slate-900 to-emerald-950/50 border-2 border-teal-500/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/30 shrink-0 border border-teal-300/30">
              <span className="material-symbols-outlined text-2xl">edit_calendar</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {t('تعديل تواريخ العقود الدائمية بكبسة زر واحدة', 'Batch Update Permanent Contract Dates (One Click)')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {t('العقود الدائمية فقط', 'Permanent Contracts Only')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {t('يستثني العقود الجديدة', 'Excludes New Contracts')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {t(
                  'خاصية السياسات المتقدمة: تعديل تاريخ بداية ونهاية العقود لجميع الموظفين ذوي العقود الدائمية دفعة واحدة بكبسة زر، مع استثناء العقود الجديدة تلقائياً، وإمكانية اختيار واستثناء أي عقد دائمي لتعديل تواريخه بشكل منفرد.',
                  'Advanced Policy Tool: Update start and end dates for all permanent contracts in one click. Automatically excludes new/probation contracts with multi-select to exclude any staff for individual manual adjustment.'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBatchContractModal(true)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-black text-xs shadow-xl shadow-teal-600/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0 border-2 border-white/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">event_repeat</span>
            <span>{t('تعديل تواريخ العقود الدائمية (كبسة زر)', 'Batch Update Contract Dates')}</span>
          </button>
        </div>
      </div>

      {/* Success Toasts */}
      {batchSuccessToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-bold shadow-lg">
          <span className="material-symbols-outlined text-xl text-emerald-400 shrink-0">task_alt</span>
          <span className="leading-relaxed">{batchSuccessToast}</span>
        </div>
      )}

      {saveToast && (
        <div className="p-4 rounded-2xl bg-teal-500/15 border-2 border-teal-500/40 text-teal-300 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-bold shadow-lg">
          <span className="material-symbols-outlined text-xl text-teal-400 shrink-0">check_circle</span>
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header and Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-base sm:text-lg font-bold text-[#e2e8f0] flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400">settings_suggest</span>
          <span>{t('سياسات المؤسسة والبدلات الرسمية', 'Enterprise Policies & Standard Allowances')}</span>
        </h3>
        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto border border-teal-400/30"
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>{t('جاري الحفظ...', 'Saving...')}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">save</span>
              <span>{t('حفظ جميع إعدادات السياسات', 'Save All Policies')}</span>
            </>
          )}
        </button>
      </div>

      {/* Wife and Child Allowances */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 shadow-sm">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">family_restroom</span>
          <span>{t('مخصصات الزوجية والطفل (Family Allowances)', 'Wife & Child Allowances')}</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('مخصص الزوجية (بدل الزوجة) - د.ع', 'Spouse Allowance (IQD)')}
            </label>
            <input
              type="number"
              step="1000"
              value={appSettings.marriage_allowance_default || '50000'}
              onChange={(e) => handleSettingChange('marriage_allowance_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('مخصص الطفل (لكل طفل دون 18) - د.ع', 'Child Allowance per child < 18 (IQD)')}
            </label>
            <input
              type="number"
              step="1000"
              value={appSettings.child_allowance_default || '25000'}
              onChange={(e) => handleSettingChange('child_allowance_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('بدل السكن للمتزوجين (اختياري) - د.ع', 'Housing Allowance for Married (IQD)')}
            </label>
            <input
              type="number"
              step="1000"
              value={appSettings.housing_allowance_default || '0'}
              onChange={(e) => handleSettingChange('housing_allowance_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Statutory Deductions, Tax & Insurance Policies */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 shadow-sm">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400 text-sm">payments</span>
          <span>{t('سياسات الضمان الاجتماعي والضريبة والتأمين', 'Social Security, Income Tax & Insurance Policies')}</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('نسبة اقتطاع الضمان الاجتماعي (حصة الموظف %)', 'Social Security Rate (Employee %)')}
            </label>
            <input
              type="number"
              step="0.1"
              value={appSettings.social_security_rate_default || '5'}
              onChange={(e) => handleSettingChange('social_security_rate_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('بدل اقتطاع التأمين الصحي والحياة (د.ع)', 'Health & Life Insurance Deduction (IQD)')}
            </label>
            <input
              type="number"
              step="1000"
              value={appSettings.insurance_deduction_default || '25000'}
              onChange={(e) => handleSettingChange('insurance_deduction_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('نسبة/طريقة ضريبة الدخل (اتركه فارغاً للشرائح القانونية)', 'Income Tax Method / Rate (%)')}
            </label>
            <input
              type="text"
              placeholder={t('تلقائي (حسب الشرائح القانونية 3% - 15%)', 'Automatic (Legal progressive brackets 3% - 15%)')}
              value={appSettings.income_tax_rate_default || ''}
              onChange={(e) => handleSettingChange('income_tax_rate_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Leave Policy */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 shadow-sm">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">event_available</span>
          <span>{t('سياسة وأرصدة الإجازات السنوية (بالأيام)', 'Leave Policy Limits (Days)')}</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('رصيد الإجازة الاعتيادية', 'Annual Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.annual_leave_balance || '21'}
              onChange={(e) => handleSettingChange('annual_leave_balance', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('رصيد الإجازة المرضية الأقصى', 'Sick Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.max_sick_leave || '30'}
              onChange={(e) => handleSettingChange('max_sick_leave', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('رصيد إجازة الأمومة', 'Maternity Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.maternity_leave_limit || '72'}
              onChange={(e) => handleSettingChange('maternity_leave_limit', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('رصيد الإجازات الطارئة', 'Emergency Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.emergency_leave_limit || '3'}
              onChange={(e) => handleSettingChange('emergency_leave_limit', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Tax/Deductions Percentages */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 shadow-sm">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">account_balance</span>
          <span>{t('نسب الضمان الاجتماعي وحصص المساهمة (%)', 'Social Security Contribution Shares (%)')}</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('حصة المؤسسة في الضمان الاجتماعي (%)', 'Company SS Share (%)')}
            </label>
            <input
              type="number"
              step="0.1"
              value={appSettings.social_security_company_share || '12'}
              onChange={(e) => handleSettingChange('social_security_company_share', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
              {t('حصة الموظف في الضمان الاجتماعي (%)', 'Employee SS Share (%)')}
            </label>
            <input
              type="number"
              step="0.1"
              value={appSettings.social_security_employee_share || '5'}
              onChange={(e) => handleSettingChange('social_security_employee_share', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Weekend Selection */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4 shadow-sm">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">schedule</span>
          <span>{t('سياسة الدوام وأيام العطلة الأسبوعية', 'Work Schedule & Weekend Days')}</span>
        </h4>
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'friday', labelAr: 'الجمعة', labelEn: 'Friday' },
            { key: 'saturday', labelAr: 'السبت', labelEn: 'Saturday' },
            { key: 'sunday', labelAr: 'الأحد', labelEn: 'Sunday' },
            { key: 'monday', labelAr: 'الاثنين', labelEn: 'Monday' },
            { key: 'tuesday', labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
            { key: 'wednesday', labelAr: 'الأربعاء', labelEn: 'Wednesday' },
            { key: 'thursday', labelAr: 'الخميس', labelEn: 'Thursday' }
          ].map(day => (
            <label 
              key={day.key} 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                appSettings[`weekend_${day.key}`] === 'true'
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <input
                type="checkbox"
                checked={appSettings[`weekend_${day.key}`] === 'true'}
                onChange={(e) => handleSettingChange(`weekend_${day.key}`, e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500 accent-teal-600 cursor-pointer"
              />
              <span>{isAr ? day.labelAr : day.labelEn}</span>
            </label>
          ))}
        </div>

        {/* Official Work Hours */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h5 className="text-xs font-bold text-slate-300 mb-3">
            {t('ساعات الدوام الرسمية (الأحد - الأربعاء)', 'Official Work Hours (Sun - Wed)')}
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                {t('وقت بداية الدوام الرسمي', 'Official Work Start Time')}
              </label>
              <input
                type="time"
                value={appSettings.official_work_hours_start || '08:00'}
                onChange={(e) => handleSettingChange('official_work_hours_start', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                {t('وقت نهاية الدوام الرسمي', 'Official Work End Time')}
              </label>
              <input
                type="time"
                value={appSettings.official_work_hours_end || '16:00'}
                onChange={(e) => handleSettingChange('official_work_hours_end', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Thursday Work Hours */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h5 className="text-xs font-bold text-slate-300 mb-3">
            {t('ساعات الدوام يوم الخميس', 'Thursday Work Hours')}
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                {t('وقت بداية الدوام يوم الخميس', 'Thursday Work Start Time')}
              </label>
              <input
                type="time"
                value={appSettings.thursday_work_hours_start || '08:00'}
                onChange={(e) => handleSettingChange('thursday_work_hours_start', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                {t('وقت نهاية الدوام يوم الخميس', 'Thursday Work End Time')}
              </label>
              <input
                type="time"
                value={appSettings.thursday_work_hours_end || '14:00'}
                onChange={(e) => handleSettingChange('thursday_work_hours_end', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#e2e8f0] font-mono font-bold focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Batch Contract Dates Modal */}
      <BatchContractDatesModal
        isOpen={showBatchContractModal}
        onClose={() => setShowBatchContractModal(false)}
        onSuccess={handleBatchSuccess}
        language={language}
        isDark={true}
        employees={employees}
      />
    </div>
  );
};
