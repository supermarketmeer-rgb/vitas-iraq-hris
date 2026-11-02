import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { Employee } from '../types';
import { BatchContractDatesModal } from './BatchContractDatesModal';
import { BatchOfficeContractRoutingModal } from './routing/BatchOfficeContractRoutingModal';
import { ExchangeRateUpdateModal, ExchangeRateRecord } from './ExchangeRateUpdateModal';

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
  employees,
}) => {
  const isAr = language === 'ar';
  const t = propT || ((ar: string, en: string) => (isAr ? ar : en));

  // Active section tab for logical organization
  const [activeTab, setActiveTab] = useState<'all' | 'fx' | 'allowances' | 'leaves' | 'deductions' | 'schedule'>('all');

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

  // Modals state
  const [showBatchContractModal, setShowBatchContractModal] = useState(false);
  const [showBatchOfficeRoutingModal, setShowBatchOfficeRoutingModal] = useState(false);
  const [showFxModal, setShowFxModal] = useState(false);
  const [editingFxRecord, setEditingFxRecord] = useState<ExchangeRateRecord | null>(null);
  const [batchSuccessToast, setBatchSuccessToast] = useState<string | null>(null);

  // Quick Currency Converter widget on the screen
  const [quickUsdAmount, setQuickUsdAmount] = useState<string>('100');
  const [quickIqdAmount, setQuickIqdAmount] = useState<string>('131000');

  // Annual Leave Simulator State
  const [simulatedServiceYears, setSimulatedServiceYears] = useState<string>('7');

  // Active settings merged
  const appSettings = propAppSettings || internalSettings;
  const isSaving = propIsSaving !== undefined ? propIsSaving : internalIsSaving;

  // Active Exchange Rate
  const activeFxRate = useMemo(() => {
    const raw = parseFloat(appSettings.usd_to_iqd_rate || '1310');
    return isNaN(raw) || raw <= 0 ? 1310 : raw;
  }, [appSettings.usd_to_iqd_rate]);

  // Exchange Rates History List
  const fxHistory: ExchangeRateRecord[] = useMemo(() => {
    try {
      if (appSettings.usd_exchange_rates_history) {
        const parsed = JSON.parse(appSettings.usd_exchange_rates_history);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Default seeded records if none configured yet
    return [
      {
        id: 'fx-default-1',
        effectiveDate: '2026-01-01',
        rate: activeFxRate,
        rateType: 'company_standard',
        sourceNameAr: 'سعر المؤسسة المعتمد (فيتاس)',
        sourceNameEn: 'Vitas Corporate Official Rate',
        notes: 'السعر الرسمي المعتمد لصرف رواتب ومستحقات الموظفين والبدلات',
        updatedBy: 'الإدارة المالية',
        updatedAt: '2026-01-01 09:00',
        isActive: true,
      },
      {
        id: 'fx-default-2',
        effectiveDate: '2025-01-01',
        rate: 1320,
        rateType: 'official_cbi',
        sourceNameAr: 'البنك المركزي العراقي (CBI)',
        sourceNameEn: 'Central Bank of Iraq (CBI)',
        notes: 'سعر الصرف المعتمد للسنة المالية السابقة',
        updatedBy: 'الإدارة المالية',
        updatedAt: '2025-01-01 08:30',
        isActive: false,
      },
    ];
  }, [appSettings.usd_exchange_rates_history, activeFxRate]);

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
    }
    setInternalSettings(prev => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem('vitas_app_settings', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSaveAll = async () => {
    if (propOnSaveAll) {
      propOnSaveAll();
    } else {
      setInternalIsSaving(true);
      try {
        localStorage.setItem('vitas_app_settings', JSON.stringify(internalSettings));
        await api.updateAppSettingsBulk(internalSettings).catch(() => {});
        setSaveToast(t('تم حفظ جميع السياسات واللوائح بنجاح!', 'All policies and regulations saved successfully!'));
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

  // Handle Save / Add / Update Exchange Rate
  const handleSaveFxRecord = (record: ExchangeRateRecord) => {
    let updatedHistory: ExchangeRateRecord[];

    if (record.isActive) {
      // Mark all other records as inactive
      updatedHistory = fxHistory.map(r => ({ ...r, isActive: r.id === record.id ? true : false }));
      const exists = updatedHistory.some(r => r.id === record.id);
      if (exists) {
        updatedHistory = updatedHistory.map(r => (r.id === record.id ? record : r));
      } else {
        updatedHistory = [record, ...updatedHistory];
      }
      handleSettingChange('usd_to_iqd_rate', String(record.rate));
    } else {
      const exists = fxHistory.some(r => r.id === record.id);
      if (exists) {
        updatedHistory = fxHistory.map(r => (r.id === record.id ? record : r));
      } else {
        updatedHistory = [record, ...fxHistory];
      }
    }

    handleSettingChange('usd_exchange_rates_history', JSON.stringify(updatedHistory));
    setEditingFxRecord(null);
    setSaveToast(t('تم تحديث جدول سعر الصرف بنجاح!', 'Exchange rate table updated successfully!'));
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Set a specific historical record as active
  const handleSetActiveFx = (recordId: string) => {
    const target = fxHistory.find(r => r.id === recordId);
    if (!target) return;

    const updated = fxHistory.map(r => ({
      ...r,
      isActive: r.id === recordId,
    }));
    handleSettingChange('usd_to_iqd_rate', String(target.rate));
    handleSettingChange('usd_exchange_rates_history', JSON.stringify(updated));
    setSaveToast(t(`تم تفعيل سعر الصرف (1$ = ${target.rate.toLocaleString()} د.ع) كالسعر المعتمد!`, `Active exchange rate updated to $1 = ${target.rate.toLocaleString()} IQD!`));
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Delete an exchange rate record
  const handleDeleteFx = (recordId: string) => {
    const filtered = fxHistory.filter(r => r.id !== recordId);
    if (filtered.length === 0) return;
    // If deleted the active one, make the first one active
    if (!filtered.some(r => r.isActive)) {
      filtered[0].isActive = true;
      handleSettingChange('usd_to_iqd_rate', String(filtered[0].rate));
    }
    handleSettingChange('usd_exchange_rates_history', JSON.stringify(filtered));
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

  // Annual Leave Entitlement Calculation
  const tier1Days = parseFloat(appSettings.annual_leave_tier1_days || '21') || 21;
  const tier2Days = parseFloat(appSettings.annual_leave_tier2_days || '23') || 23;
  const tier3Days = parseFloat(appSettings.annual_leave_tier3_days || '25') || 25;
  const tier4Days = parseFloat(appSettings.annual_leave_tier4_days || '28') || 28;
  const tier4BonusStep = parseFloat(appSettings.annual_leave_tier4_bonus || '3') || 3;

  const calculateLeaveEntitlement = (years: number) => {
    if (years <= 0) {
      return { days: tier1Days, tierLabel: isAr ? 'أقل من سنة خدمة (الفئة الأولى)' : 'Tier 1 (< 1 yr)', bonus: 0 };
    }
    if (years <= 5) {
      return { days: tier1Days, tierLabel: isAr ? 'الفئة الأولى (من 1 إلى 5 سنوات)' : 'Tier 1 (1 to 5 yrs)', bonus: 0 };
    }
    if (years <= 10) {
      return { days: tier2Days, tierLabel: isAr ? 'الفئة الثانية (أكثر من 5 إلى 10 سنوات)' : 'Tier 2 (> 5 to 10 yrs)', bonus: 0 };
    }
    if (years <= 15) {
      return { days: tier3Days, tierLabel: isAr ? 'الفئة الثالثة (أكثر من 10 إلى 15 سنة)' : 'Tier 3 (> 10 to 15 yrs)', bonus: 0 };
    }
    const extraFiveYearBlocks = Math.floor((years - 16) / 5);
    const bonus = Math.max(0, extraFiveYearBlocks) * tier4BonusStep;
    const total = tier4Days + bonus;
    return {
      days: total,
      tierLabel: bonus > 0
        ? (isAr ? `الفئة الرابعة (${tier4Days} يوم أساسي + ${bonus} أيام إضافية)` : `Tier 4 (${tier4Days} base + ${bonus} bonus)`)
        : (isAr ? `الفئة الرابعة (أكثر من 15 سنة: ${tier4Days} يوماً)` : `Tier 4 (> 15 yrs: ${tier4Days} days)`),
      bonus,
    };
  };

  const simResult = calculateLeaveEntitlement(parseFloat(simulatedServiceYears) || 0);

  // Helper for converting amount between IQD and USD
  const renderCurrencyConversionHint = (amountStr: string, currency: string) => {
    const num = parseFloat(amountStr) || 0;
    if (num <= 0) return null;
    if (currency === 'USD') {
      const convertedIqd = Math.round(num * activeFxRate);
      return (
        <span className="text-[11px] text-black font-mono font-normal mt-1.5 block">
          ≈ {convertedIqd.toLocaleString()} {t('د.ع عراقي', 'IQD')} <span className="text-gray-600 font-normal">({t('سعر الصرف:', 'Rate:')} 1$ = {activeFxRate.toLocaleString()})</span>
        </span>
      );
    } else {
      const convertedUsd = (num / activeFxRate).toFixed(2);
      return (
        <span className="text-[11px] text-black font-mono font-normal mt-1.5 block">
          ≈ ${convertedUsd} USD <span className="text-gray-600 font-normal">({t('سعر الصرف:', 'Rate:')} 1$ = {activeFxRate.toLocaleString()})</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-6 bg-white text-black p-1 sm:p-2 animate-in fade-in duration-200" dir={isAr ? 'rtl' : 'ltr'}>
      {/* =========================================================================
          TOP BANNER: BATCH CONTRACT DATES & ROUTING QUICK TOOLS (WHITE THEME)
          ========================================================================= */}
      <div className="p-5 rounded-2xl bg-white border-2 border-gray-300 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-black flex items-center justify-center shrink-0 border-2 border-gray-300">
              <span className="material-symbols-outlined text-2xl text-black">edit_calendar</span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg  text-black font-bold">
                  {t('إدارة وتعديل تواريخ العقود الدائمية', 'Permanent Contract Dates Management')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-gray-100 text-black border border-gray-400">
                  {t('العقود الدائمية فقط', 'Permanent Contracts')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-normal bg-gray-100 text-black border border-gray-400">
                  {t('حماية العقود الجديدة', 'Protects New Contracts')}
                </span>
              </div>
              <p className="text-xs text-black mt-1 max-w-2xl leading-relaxed font-normal">
                {t(
                  'تعديل تواريخ بداية ونهاية العقود لجميع الموظفين ذوي العقود الدائمية دفعة واحدة، مع توجيه منفصل للعقود حسب كل مكتب وفرع.',
                  'Batch update start and end dates for all permanent staff, and route contracts strictly divided by respective office.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowBatchContractModal(true)}
              className="px-4 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-normal text-xs shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-black active:scale-95"
            >
              <span className="material-symbols-outlined text-lg text-white">event_repeat</span>
              <span>{t('تعديل تواريخ العقود الدائمية', 'Batch Update Dates')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBatchOfficeRoutingModal(true)}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-black font-normal text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 border-2 border-black active:scale-95"
            >
              <span className="material-symbols-outlined text-lg text-black">hub</span>
              <span>{t('توجيه العقود مقسمة حسب المكاتب', 'Route by Office')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Toasts */}
      {batchSuccessToast && (
        <div className="p-4 rounded-xl bg-white border-2 border-black text-black flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-normal shadow">
          <span className="material-symbols-outlined text-xl text-black shrink-0">task_alt</span>
          <span className="leading-relaxed">{batchSuccessToast}</span>
        </div>
      )}

      {saveToast && (
        <div className="p-4 rounded-xl bg-white border-2 border-black text-black flex items-center gap-3 animate-in fade-in slide-in-from-top-2 text-xs font-normal shadow">
          <span className="material-symbols-outlined text-xl text-black shrink-0">check_circle</span>
          <span>{saveToast}</span>
        </div>
      )}

      {/* =========================================================================
          HEADER BAR & SAVE BUTTON (WHITE THEME)
          ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b-2 border-gray-200 bg-white">
        <div>
          <h2 className="text-lg sm:text-xl  text-black flex items-center gap-2.5 font-bold">
            <span className="material-symbols-outlined text-black text-2xl">admin_panel_settings</span>
            <span>{t('لوحة السياسات التنظيمية واللوائح المعتمدة', 'Enterprise HR Policies & Governance Regulations')}</span>
          </h2>
          <p className="text-xs text-black mt-1 font-normal">
            {t(
              'إدارة وتخصيص سعر تصريف العملة، البدلات، لائحة الإجازات، الضمان والضرائب وساعات الدوام',
              'Manage exchange rates, allowances, leave entitlements, social security, and work hours'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-normal text-xs shadow transition-all flex items-center gap-2 cursor-pointer border border-black active:scale-95"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin text-white">sync</span>
                <span>{t('جاري الحفظ...', 'Saving...')}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm text-white">save</span>
                <span>{t('حفظ جميع التغييرات في السياسات', 'Save All Policies')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          LOGICAL SECTION NAVIGATION TABS (WHITE THEME)
          ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none bg-white">
        {[
          { id: 'all', icon: 'dashboard', labelAr: 'عرض جميع الأقسام', labelEn: 'All Policies' },
          { id: 'fx', icon: 'currency_exchange', labelAr: 'سعر التصريف والعملات والسنة المالية', labelEn: 'Exchange Rates & Fiscal Year' },
          { id: 'allowances', icon: 'family_restroom', labelAr: 'البدلات والمخصصات الرسمية', labelEn: 'Allowances' },
          { id: 'leaves', icon: 'event_available', labelAr: 'سياسات ولائحة الإجازات', labelEn: 'Leave Regulations' },
          { id: 'deductions', icon: 'payments', labelAr: 'الضمان الاجتماعي والضرائب', labelEn: 'Social Security & Tax' },
          { id: 'schedule', icon: 'schedule', labelAr: 'الدوام والعطلات الأسبوعية', labelEn: 'Work Schedule' },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-normal transition-all flex items-center gap-2 shrink-0 cursor-pointer border-2 ${
              activeTab === tab.id
                ? 'bg-black text-white border-black shadow'
                : 'bg-white text-black border-gray-300 hover:bg-gray-100 hover:border-black'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
            <span>{isAr ? tab.labelAr : tab.labelEn}</span>
          </button>
        ))}
      </div>

      {/* =========================================================================
          SECTION 1: USD / IQD EXCHANGE RATE & FISCAL YEAR SETTINGS (WHITE THEME)
          ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'fx') && (
        <div className="bg-white border-2 border-gray-300 p-5 sm:p-6 rounded-2xl space-y-5 shadow-sm text-black">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-black border-2 border-gray-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-black">currency_exchange</span>
              </div>
              <div>
                <h4 className="text-sm sm:text-base  text-black flex items-center gap-2 font-bold">
                  <span>{t('جدول وتحديث سعر تصريف الدولار مقابل الدينار العراقي (USD / IQD)', 'USD to IQD Exchange Rate Management')}</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-normal bg-gray-100 text-black border border-gray-400">
                    1 USD = {activeFxRate.toLocaleString()} IQD
                  </span>
                </h4>
                <p className="text-xs text-black mt-0.5 font-normal">
                  {t('السعر المعتمد في كافة حسابات الرواتب والبدلات والمخصصات المالية في النظام', 'Official enterprise rate used for salary calculations, allowances, and monetary policies')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingFxRecord(null);
                setShowFxModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-black hover:bg-gray-800 text-white font-normal text-xs shadow transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto border border-black"
            >
              <span className="material-symbols-outlined text-base text-white">add_circle</span>
              <span>{t('تحديث سعر الصرف / إضافة سجل جديد', 'Update Rate / Add Entry')}</span>
            </button>
          </div>

          {/* Quick Active Rate KPI & Currency Converter Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Active Rate Card */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal text-black">{t('سعر الصرف المعتمد حالياً', 'Active Official Rate')}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-black" />
                  <span>{t('نشط ومعتمد', 'Active')}</span>
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-normal font-mono text-black tracking-wider">
                  {activeFxRate.toLocaleString()}
                </span>
                <span className="text-xs font-normal text-black">{t('د.ع لكل 1 دولار', 'IQD / 1 USD')}</span>
              </div>
              <div className="text-[11px] text-black font-normal flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-black">verified</span>
                <span>{t('يطبق تلقائياً على كافة حقول المبالغ والبدلات', 'Applies automatically to all monetary fields')}</span>
              </div>
            </div>

            {/* Quick USD -> IQD Live Test */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <span className="text-xs font-normal text-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-black">calculate</span>
                <span>{t('تحويل سريع من الدولار إلى الدينار:', 'Quick USD to IQD Converter:')}</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 start-0 ps-2.5 flex items-center pointer-events-none text-black font-mono font-normal text-xs">$</span>
                  <input
                    type="number"
                    value={quickUsdAmount}
                    onChange={(e) => setQuickUsdAmount(e.target.value)}
                    className="w-full ps-7 pe-2 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-black font-mono font-normal text-xs focus:outline-none focus:border-black"
                  />
                </div>
                <span className="text-black font-normal text-sm">➔</span>
                <div className="flex-1 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-300 text-black font-mono font-normal text-xs text-center">
                  {Math.round((parseFloat(quickUsdAmount) || 0) * activeFxRate).toLocaleString()} {t('د.ع', 'IQD')}
                </div>
              </div>
            </div>

            {/* Quick IQD -> USD Live Test */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <span className="text-xs font-normal text-black flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-black">calculate</span>
                <span>{t('تحويل سريع من الدينار إلى الدولار:', 'Quick IQD to USD Converter:')}</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={quickIqdAmount}
                    onChange={(e) => setQuickIqdAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-black font-mono font-normal text-xs focus:outline-none focus:border-black text-center"
                  />
                </div>
                <span className="text-black font-normal text-sm">➔</span>
                <div className="flex-1 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-300 text-black font-mono font-normal text-xs text-center">
                  ${((parseFloat(quickIqdAmount) || 0) / activeFxRate).toFixed(2)} USD
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              FEATURE: FISCAL YEAR CONFIGURATION (بداية ونهاية السنة المالية)
              ========================================================================= */}
          <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-gray-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-black text-xl">event_available</span>
                <div>
                  <h5 className="text-xs sm:text-sm  text-black font-bold">
                    {t('إعدادات ودورة السنة المالية (بداية ونهاية السنة المالية)', 'Fiscal Year Configuration (Start & End Dates)')}
                  </h5>
                  <p className="text-[11px] text-gray-700 font-normal">
                    {t('تحديد موعد بداية السنة المالية الحالية ونهايتها المعتمدة لاحتساب فترات العمل والرواتب والموازنات', 'Set active fiscal year calendar cycle for payroll and budgeting')}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-normal bg-gray-100 text-black border-2 border-black self-start sm:self-auto">
                {t('السنة المالية المعتمدة:', 'Fiscal Year:')} {appSettings.current_fiscal_year || '2026'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Fiscal Year Start */}
              <div>
                <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-black">play_arrow</span>
                  <span>{t('تاريخ بداية السنة المالية', 'Fiscal Year Start Date')}</span>
                </label>
                <input
                  type="date"
                  value={appSettings.fiscal_year_start || '2026-01-01'}
                  onChange={(e) => handleSettingChange('fiscal_year_start', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="text-[10px] text-gray-600 mt-1 block font-normal">
                  {t('اليوم والشهر المعتمد لبداية الدورة المالية والحسابية', 'Standard start of fiscal & payroll calendar')}
                </span>
              </div>

              {/* Fiscal Year End */}
              <div>
                <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-black">stop</span>
                  <span>{t('تاريخ نهاية وإقفال السنة المالية', 'Fiscal Year End Date')}</span>
                </label>
                <input
                  type="date"
                  value={appSettings.fiscal_year_end || '2026-12-31'}
                  onChange={(e) => handleSettingChange('fiscal_year_end', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="text-[10px] text-gray-600 mt-1 block font-normal">
                  {t('تاريخ نهاية الدورة المحاسبية وإقفال القيود السنوية', 'Fiscal year closing and reporting cutoff')}
                </span>
              </div>

              {/* Current Fiscal Year */}
              <div>
                <label className="block text-[11px] text-black mb-1.5 font-normal flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-black">calendar_today</span>
                  <span>{t('السنة المالية الحالية (العام المالي)', 'Current Fiscal Year (YYYY)')}</span>
                </label>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  value={appSettings.current_fiscal_year || '2026'}
                  onChange={(e) => handleSettingChange('current_fiscal_year', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                />
                <span className="text-[10px] text-gray-600 mt-1 block text-center font-normal">
                  {t('تطبق على قيود الرواتب وأرصدة الإجازات للعام', 'Applies to active payroll periods & leave balances')}
                </span>
              </div>
            </div>
          </div>

          {/* Exchange Rates History Table */}
          <div className="overflow-x-auto rounded-xl border-2 border-gray-300 bg-white">
            <table className="w-full text-xs text-black text-start">
              <thead className="bg-gray-100 border-b-2 border-gray-300 text-black font-normal">
                <tr>
                  <th className="px-4 py-3 text-start">#</th>
                  <th className="px-4 py-3 text-start">{t('تاريخ النفاذ', 'Effective Date')}</th>
                  <th className="px-4 py-3 text-start">{t('سعر التصريف (1$ = د.ع)', 'Exchange Rate (1$ = IQD)')}</th>
                  <th className="px-4 py-3 text-start">{t('نوع ومصدر السعر', 'Source / Type')}</th>
                  <th className="px-4 py-3 text-start">{t('ملاحظات واستخدام السعر', 'Notes / Reference')}</th>
                  <th className="px-4 py-3 text-start">{t('تم التحديث بواسطة', 'Updated By')}</th>
                  <th className="px-4 py-3 text-center">{t('الحالة', 'Status')}</th>
                  <th className="px-4 py-3 text-center">{t('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fxHistory.map((item, index) => (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.isActive ? 'bg-gray-50 font-normal' : ''}`}>
                    <td className="px-4 py-3 font-mono font-normal text-black">{index + 1}</td>
                    <td className="px-4 py-3 font-mono text-black font-normal flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs text-black">calendar_today</span>
                      <span>{item.effectiveDate}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-normal text-black text-sm">
                      1 USD = {item.rate.toLocaleString()} IQD
                    </td>
                    <td className="px-4 py-3 font-normal text-black">
                      {isAr ? item.sourceNameAr : item.sourceNameEn}
                    </td>
                    <td className="px-4 py-3 text-black max-w-xs truncate" title={item.notes}>
                      {item.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-black text-[11px] font-normal">
                      {item.updatedBy || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border-2 border-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-black" />
                          <span>{t('نشط ومعتمد', 'Active')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-300">
                          {t('أرشيف', 'Historical')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!item.isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetActiveFx(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-gray-100 text-black text-[11px] font-normal transition-colors cursor-pointer border border-black"
                            title={t('تعيين هذا السعر كنشط ومعتمد حالياً', 'Set as Active Rate')}
                          >
                            {t('تفعيل', 'Set Active')}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingFxRecord(item);
                            setShowFxModal(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-white hover:bg-gray-100 text-black border border-gray-300 flex items-center justify-center transition-colors cursor-pointer"
                          title={t('تعديل', 'Edit')}
                        >
                          <span className="material-symbols-outlined text-sm text-black">edit</span>
                        </button>
                        {fxHistory.length > 1 && !item.isActive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteFx(item.id)}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-gray-100 text-black border border-gray-300 flex items-center justify-center transition-colors cursor-pointer"
                            title={t('حذف', 'Delete')}
                          >
                            <span className="material-symbols-outlined text-sm text-black">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: ALLOWANCES & STANDARD MONETARY POLICIES (WHITE THEME)
          ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'allowances') && (
        <div className="bg-white border-2 border-gray-300 p-5 sm:p-6 rounded-2xl space-y-5 shadow-sm text-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-black border-2 border-gray-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-black">family_restroom</span>
              </div>
              <div>
                <h4 className="text-sm sm:text-base  text-black flex items-center gap-2 font-bold">
                  <span>{t('مخصصات الزوجية والطفل والبدلات الرسمية (Allowances & Currencies)', 'Wife, Child & Standard Allowances')}</span>
                </h4>
                <p className="text-xs text-black mt-0.5 font-normal">
                  {t(
                    'يمكنك تحديد المبلغ واختيار العملة (دينار عراقي IQD أو دولار أمريكي USD) لكل حقل على حدة مع التحويل التلقائي',
                    'Set amount and choose currency (IQD or USD) per field with real-time automatic conversion'
                  )}
                </p>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-gray-100 border-2 border-gray-300 text-black text-xs font-mono font-normal flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-black">info</span>
              <span>1 USD = {activeFxRate.toLocaleString()} IQD</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Spouse Allowance */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-black font-normal flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-black">favorite</span>
                  <span>{t('مخصص الزوجية (بدل الزوجة)', 'Spouse Allowance')}</span>
                </label>
                {/* Currency Selector Pill */}
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleSettingChange('marriage_allowance_currency', 'IQD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.marriage_allowance_currency || 'USD') === 'IQD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    {t('د.ع IQD', 'IQD')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('marriage_allowance_currency', 'USD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.marriage_allowance_currency || 'USD') === 'USD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={appSettings.marriage_allowance_default || '10'}
                  onChange={(e) => handleSettingChange('marriage_allowance_default', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-black font-normal text-xs">
                  {(appSettings.marriage_allowance_currency || 'USD') === 'USD' ? '$' : t('د.ع', 'IQD')}
                </span>
              </div>
              {renderCurrencyConversionHint(
                appSettings.marriage_allowance_default || '10',
                appSettings.marriage_allowance_currency || 'USD'
              )}
            </div>

            {/* Child Allowance: Loan Officer / Senior Loan Officer ONLY */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-black font-normal flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-black">badge</span>
                    <span>{t('مخصص الطفل (Loan Officer / Senior Loan Officer)', 'Child Allowance (Loan Officer / Senior)')}</span>
                  </label>
                  <span className="inline-block mt-0.5 px-2 py-0.2 text-[9px] font-normal bg-gray-100 text-black rounded border border-gray-400">
                    {t('مسؤولو القروض فقط (5$)', 'Loan Officers Only (5$)')}
                  </span>
                </div>
                {/* Currency Selector Pill */}
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleSettingChange('child_allowance_loan_officer_currency', 'IQD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.child_allowance_loan_officer_currency || 'USD') === 'IQD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    {t('د.ع IQD', 'IQD')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('child_allowance_loan_officer_currency', 'USD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.child_allowance_loan_officer_currency || 'USD') === 'USD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={appSettings.child_allowance_loan_officer_default || '5'}
                  onChange={(e) => handleSettingChange('child_allowance_loan_officer_default', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-black font-normal text-xs">
                  {(appSettings.child_allowance_loan_officer_currency || 'USD') === 'USD' ? '$' : t('د.ع', 'IQD')}
                </span>
              </div>
              {renderCurrencyConversionHint(
                appSettings.child_allowance_loan_officer_default || '5',
                appSettings.child_allowance_loan_officer_currency || 'USD'
              )}
            </div>

            {/* Child Allowance: Other Employees / General Staff */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs text-black font-normal flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-black">child_care</span>
                    <span>{t('مخصص الطفل (الموظفون الآخرون)', 'Child Allowance (Other Employees)')}</span>
                  </label>
                  <span className="inline-block mt-0.5 px-2 py-0.2 text-[9px] font-normal bg-gray-100 text-black rounded border border-gray-400">
                    {t('كافة الموظفين الآخرين (4$)', 'All Other Employees (4$)')}
                  </span>
                </div>
                {/* Currency Selector Pill */}
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleSettingChange('child_allowance_currency', 'IQD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.child_allowance_currency || 'USD') === 'IQD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    {t('د.ع IQD', 'IQD')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('child_allowance_currency', 'USD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.child_allowance_currency || 'USD') === 'USD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={appSettings.child_allowance_default || '4'}
                  onChange={(e) => handleSettingChange('child_allowance_default', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-black font-normal text-xs">
                  {(appSettings.child_allowance_currency || 'USD') === 'USD' ? '$' : t('د.ع', 'IQD')}
                </span>
              </div>
              {renderCurrencyConversionHint(
                appSettings.child_allowance_default || '4',
                appSettings.child_allowance_currency || 'USD'
              )}
            </div>

            {/* Housing Allowance */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-black font-normal flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-black">home</span>
                  <span>{t('بدل السكن للمتزوجين (اختياري)', 'Housing Allowance')}</span>
                </label>
                {/* Currency Selector Pill */}
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleSettingChange('housing_allowance_currency', 'IQD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.housing_allowance_currency || 'IQD') === 'IQD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    {t('د.ع IQD', 'IQD')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('housing_allowance_currency', 'USD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      appSettings.housing_allowance_currency === 'USD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={appSettings.housing_allowance_default || '0'}
                  onChange={(e) => handleSettingChange('housing_allowance_default', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-black font-normal text-xs">
                  {appSettings.housing_allowance_currency === 'USD' ? '$' : t('د.ع', 'IQD')}
                </span>
              </div>
              {renderCurrencyConversionHint(
                appSettings.housing_allowance_default || '0',
                appSettings.housing_allowance_currency || 'IQD'
              )}
            </div>

            {/* Health & Life Insurance Deduction */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-black font-normal flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-black">health_and_safety</span>
                  <span>{t('بدل اقتطاع التأمين الصحي والحياة', 'Health & Life Insurance')}</span>
                </label>
                {/* Currency Selector Pill */}
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleSettingChange('insurance_deduction_currency', 'IQD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.insurance_deduction_currency || 'IQD') === 'IQD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    {t('د.ع IQD', 'IQD')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('insurance_deduction_currency', 'USD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      appSettings.insurance_deduction_currency === 'USD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={appSettings.insurance_deduction_default || '25000'}
                  onChange={(e) => handleSettingChange('insurance_deduction_default', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-black font-normal text-xs">
                  {appSettings.insurance_deduction_currency === 'USD' ? '$' : t('د.ع', 'IQD')}
                </span>
              </div>
              {renderCurrencyConversionHint(
                appSettings.insurance_deduction_default || '25000',
                appSettings.insurance_deduction_currency || 'IQD'
              )}
            </div>

            {/* Standard Transportation Allowance */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-black font-normal flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-black">directions_bus</span>
                  <span>{t('بدل النقل والمواصلات الافتراضي', 'Default Transport Allowance')}</span>
                </label>
                {/* Currency Selector Pill */}
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5 border border-gray-300">
                  <button
                    type="button"
                    onClick={() => handleSettingChange('transportation_allowance_currency', 'IQD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      (appSettings.transportation_allowance_currency || 'IQD') === 'IQD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    {t('د.ع IQD', 'IQD')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettingChange('transportation_allowance_currency', 'USD')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-normal transition-all cursor-pointer ${
                      appSettings.transportation_allowance_currency === 'USD'
                        ? 'bg-black text-white shadow-sm'
                        : 'text-black hover:bg-gray-200'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={appSettings.transportation_allowance_default || '100000'}
                  onChange={(e) => handleSettingChange('transportation_allowance_default', e.target.value)}
                  className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none text-black font-normal text-xs">
                  {appSettings.transportation_allowance_currency === 'USD' ? '$' : t('د.ع', 'IQD')}
                </span>
              </div>
              {renderCurrencyConversionHint(
                appSettings.transportation_allowance_default || '100000',
                appSettings.transportation_allowance_currency || 'IQD'
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: LEAVE POLICIES & SPECIAL LEAVE TYPES (WHITE THEME)
          ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'leaves') && (
        <div className="space-y-6 bg-white text-black">
          {/* Card A: Official Annual Leave Regulation according to Vitas Policy (from uploaded photo) */}
          <div className="bg-white border-2 border-gray-300 p-5 sm:p-6 rounded-2xl space-y-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b-2 border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100 text-black border-2 border-gray-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-black">verified_user</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base sm:text-lg  text-black font-bold">
                      {t('لائحة وقانون الإجازة الاعتيادية (حسب سياسة فيتاس العراق المعتمدة)', 'Official Annual Leave Policy (Vitas Iraq)')}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('أجر تام + تدرج سنوات الخدمة', 'Full Pay + Service Progression')}
                    </span>
                  </div>
                  <p className="text-xs text-black mt-1 max-w-3xl leading-relaxed font-normal">
                    {t(
                      'يستحق كل منتسب عن مدة عمله إجازة بأجر تام لمدة 21 يوماً عن كل سنة عمل ويضاف إليها المدة عن سنوات الخدمة في العمل بحسب الجدول القانوني.',
                      'Employees are entitled to 21 days fully paid leave per work year, with additional days added based on years of continuous service.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Official Table Layout Matching Image */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3">
              <div className="text-xs font-normal text-black flex items-center justify-between">
                <span>{t('جدول استحقاق أيام الإجازة الاعتيادية حسب سنوات الخدمة:', 'Annual Leave Entitlement by Years of Service:')}</span>
                <span className="text-[11px] font-normal text-black">
                  {t('القانون المعتمد في مؤسسة الإسكان التعاونية فيتاس العراق', 'Official Policy Table')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Bracket 1: 0 to 5 yrs */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-gray-300 text-center space-y-1">
                  <div className="text-[11px] font-normal text-black">
                    {t('0 < إلى <= 5 سنوات', '0 < to <= 5 years')}
                  </div>
                  <div className="text-2xl font-normal font-mono text-black">
                    {tier1Days} <span className="text-xs font-normal text-black">{t('يوم', 'days')}</span>
                  </div>
                  <div className="text-[10px] text-black font-normal">{t('الاستحقاق الأساسي', 'Base Tier')}</div>
                </div>

                {/* Bracket 2: 5 to 10 yrs */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-gray-300 text-center space-y-1">
                  <div className="text-[11px] font-normal text-black">
                    {t('5 < إلى <= 10 سنوات', '5 < to <= 10 years')}
                  </div>
                  <div className="text-2xl font-normal font-mono text-black">
                    {tier2Days} <span className="text-xs font-normal text-black">{t('يوم', 'days')}</span>
                  </div>
                  <div className="text-[10px] text-black font-normal">{t('خدمة 5 إلى 10 سنوات', 'Tier 2')}</div>
                </div>

                {/* Bracket 3: 10 to 15 yrs */}
                <div className="p-3.5 rounded-xl bg-white border-2 border-gray-300 text-center space-y-1">
                  <div className="text-[11px] font-normal text-black">
                    {t('10 < إلى <= 15 سنة', '10 < to <= 15 years')}
                  </div>
                  <div className="text-2xl font-normal font-mono text-black">
                    {tier3Days} <span className="text-xs font-normal text-black">{t('يوم', 'days')}</span>
                  </div>
                  <div className="text-[10px] text-black font-normal">{t('خدمة 10 إلى 15 سنة', 'Tier 3')}</div>
                </div>

                {/* Bracket 4: > 15 yrs */}
                <div className="p-3.5 rounded-xl bg-gray-50 border-2 border-black text-center space-y-1">
                  <div className="text-[11px] font-normal text-black">
                    {t('أكثر من 15 سنوات', 'More than 15 years')}
                  </div>
                  <div className="text-xl font-normal font-mono text-black">
                    {tier4Days} <span className="text-xs font-normal text-black">+{tier4BonusStep} {t('أيام', 'days')}</span>
                  </div>
                  <div className="text-[10px] text-black font-normal">{t('عن كل 5 سنوات إضافية', 'per each 5 extra yrs')}</div>
                </div>
              </div>

              {/* Policy Rules Callout */}
              <div className="p-3.5 rounded-xl bg-gray-50 border-2 border-gray-400 text-black text-xs space-y-1 leading-relaxed">
                <div className="font-normal flex items-center gap-1.5 text-black">
                  <span className="material-symbols-outlined text-sm text-black">assignment_late</span>
                  <span>{t('ضوابط التمتع والتدوير الإلزامي للإجازة السنوية:', 'Mandatory Annual Usage & Carryover Rules:')}</span>
                </div>
                <p className="text-[11px] text-black font-normal ps-4">
                  • {t(
                    'على كل منتسب التمتع بـ 14 يوم إجازة على الأقل خلال السنة.',
                    'Every employee must take at least 14 days of annual leave during the year.'
                  )}
                </p>
                <p className="text-[11px] text-black font-normal ps-4">
                  • {t(
                    'تقسم المدة المتبقية خلال مدة لا تتجاوز سنة العمل التالية وبالاتفاق بين المنتسب والمشرف المباشر مع تبليغ قسم الموارد البشرية.',
                    'The remaining duration is divided within a period not exceeding the following work year, by agreement between staff & direct supervisor with HR notification.'
                  )}
                </p>
              </div>
            </div>

            {/* Interactive Live Entitlement Simulator */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-normal text-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-black">calculate</span>
                  <span>{t('حاسبة الاستحقاق الفوري للإجازة الاعتيادية لأي موظف:', 'Live Service Years Entitlement Simulator:')}</span>
                </span>
                <span className="text-[11px] text-black font-normal">
                  {t('أدخل عدد سنوات خدمة الموظف للاطلاع الفوري على استحقاقه القانوني', 'Enter years to test automatic calculation')}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs text-black font-normal whitespace-nowrap">{t('سنوات خدمة الموظف:', 'Service Years:')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={simulatedServiceYears}
                    onChange={(e) => setSimulatedServiceYears(e.target.value)}
                    className="w-24 bg-white border-2 border-black rounded-xl px-3 py-2 text-xs text-black font-mono font-normal text-center focus:outline-none"
                  />
                  <span className="text-xs text-black font-normal">{t('سنة', 'yrs')}</span>
                </div>

                <div className="flex-1 p-2.5 rounded-xl bg-gray-100 border-2 border-gray-300 flex items-center justify-between">
                  <span className="text-xs font-normal text-black">{simResult.tierLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-black font-normal">{t('الاستحقاق:', 'Entitled:')}</span>
                    <span className="text-base font-normal font-mono text-white px-2.5 py-0.5 rounded-lg bg-black">
                      {simResult.days} {t('يوم بأجر تام', 'Days Full Pay')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customization of tier values for HR Admin */}
            <div className="pt-2">
              <h5 className="text-xs  text-black mb-2 font-bold">
                {t('تخصيص قيم فئات الإجازة الاعتيادية (إعدادات النظام):', 'Customize Base Tier Limits:')}
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[10px] text-black font-normal mb-1">{t('الفئة 1 (0-5 سنين)', 'Tier 1 (0-5 yrs)')}</label>
                  <input
                    type="number"
                    value={appSettings.annual_leave_tier1_days || '21'}
                    onChange={(e) => {
                      handleSettingChange('annual_leave_tier1_days', e.target.value);
                      handleSettingChange('annual_leave_balance', e.target.value);
                    }}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-black font-normal mb-1">{t('الفئة 2 (5-10 سنين)', 'Tier 2 (5-10 yrs)')}</label>
                  <input
                    type="number"
                    value={appSettings.annual_leave_tier2_days || '23'}
                    onChange={(e) => handleSettingChange('annual_leave_tier2_days', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-black font-normal mb-1">{t('الفئة 3 (10-15 سنة)', 'Tier 3 (10-15 yrs)')}</label>
                  <input
                    type="number"
                    value={appSettings.annual_leave_tier3_days || '25'}
                    onChange={(e) => handleSettingChange('annual_leave_tier3_days', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-black font-normal mb-1">{t('الفئة 4 (> 15 سنة أساسي)', 'Tier 4 (> 15 yrs)')}</label>
                  <input
                    type="number"
                    value={appSettings.annual_leave_tier4_days || '28'}
                    onChange={(e) => handleSettingChange('annual_leave_tier4_days', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-black font-normal mb-1">{t('إضافة كل 5 سنوات (+)', '+ per 5 yrs')}</label>
                  <input
                    type="number"
                    value={appSettings.annual_leave_tier4_bonus || '3'}
                    onChange={(e) => handleSettingChange('annual_leave_tier4_bonus', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Other Specific Leave Types Required */}
          <div className="bg-white border-2 border-gray-300 p-5 sm:p-6 rounded-2xl space-y-5 shadow-sm">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-200">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-black border-2 border-gray-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-black">event_available</span>
              </div>
              <div>
                <h4 className="text-sm sm:text-base  text-black flex items-center gap-2 font-bold">
                  <span>{t('أنواع وأرصدة الإجازات الرسمية المحددة', 'Designated Official Leave Types')}</span>
                </h4>
                <p className="text-xs text-black mt-0.5 font-normal">
                  {t(
                    'المرضية، الأمومة، إجازة الأب، الزواج، وفاة قريب مباشر وغير مباشر',
                    'Sick, Maternity, Paternity, Marriage, and Bereavement (Direct / Indirect Relatives)'
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Sick Leave */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">medical_services</span>
                      <span>{t('الإجازات المرضية', 'Sick Leave')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بأجر تام', 'Paid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('إجازة صحية للمنتسب عند المرض أو العمليات الجراحية، مشروطة بتقديم تقرير طبي رسمي معتمد.', 'Medical leave requiring an official medical report.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('الرصيد الأقصى سنوياً (أيام)', 'Max Days per Year')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.max_sick_leave || '30'}
                    onChange={(e) => handleSettingChange('max_sick_leave', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              {/* 2. Maternity Leave */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">pregnant_woman</span>
                      <span>{t('إجازة الأمومة ورعاية الطفل', 'Maternity Leave')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بأجر تام', 'Paid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('تستحقها المنتسبة عند ولادة طفلها بأجر كامل وفق قانون العمل العراقي، مع شهادة الولادة.', 'Maternity leave for female employees per Iraqi Labor Law.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('رصيد إجازة الأمومة (أيام)', 'Maternity Days Limit')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.maternity_leave_limit || '72'}
                    onChange={(e) => handleSettingChange('maternity_leave_limit', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              {/* 3. Paternity Leave (Upon Wife's Childbirth) */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">family_restroom</span>
                      <span>{t('إجازة الأب (عند ولادة زوجته)', 'Paternity Leave')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بأجر تام', 'Paid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('تمنح للموظف الأب عند ولادة زوجته لمساندة الأسرة ورعاية المولود الجديد (مع بيان الولادة).', 'Paid leave for father when his wife gives birth to support the family.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('رصيد إجازة الأب (أيام)', 'Paternity Days Limit')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.paternity_leave_limit || '3'}
                    onChange={(e) => handleSettingChange('paternity_leave_limit', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              {/* 4. Marriage Leave */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">celebration</span>
                      <span>{t('إجازة الزواج', 'Marriage Leave')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بأجر تام', 'Paid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('تمنح للمنتسب لمرة واحدة عند عقد قرانه وزواجه بأجر تام (مع إرفاق عقد الزواج الرسمي).', 'Granted once upon the employee marriage with official marriage certificate.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('رصيد إجازة الزواج (أيام)', 'Marriage Days Limit')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.marriage_leave_limit || '7'}
                    onChange={(e) => handleSettingChange('marriage_leave_limit', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              {/* 5. Direct Relative Bereavement Leave */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">sentiment_dissatisfied</span>
                      <span>{t('إجازة وفاة قريب مباشر (درجة أولى)', 'Direct Relative Bereavement')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بأجر تام', 'Paid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('عند وفاة: الأب، الأم، الزوج/الزوجة، الابن، الابنة، الأخ، الأخت (مع شهادة الوفاة).', 'Death of direct relative: Father, Mother, Spouse, Child, Brother, Sister.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('رصيد إجازة وفاة قريب مباشر (أيام)', 'Direct Relative Days')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.bereavement_direct_leave_limit || '3'}
                    onChange={(e) => handleSettingChange('bereavement_direct_leave_limit', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              {/* 6. Indirect Relative Bereavement Leave */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">diversity_1</span>
                      <span>{t('إجازة وفاة قريب غير مباشر (درجة ثانية)', 'Indirect Relative Bereavement')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بأجر تام', 'Paid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('عند وفاة: الجد، الجدة، العم، العمة، الخال، الخالة، الحمو، الحماة وأبناء الأخ/الأخت.', 'Death of secondary relative: Grandparent, Uncle, Aunt, In-laws, Nephews/Nieces.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('رصيد إجازة وفاة قريب غير مباشر (أيام)', 'Indirect Relative Days')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.bereavement_indirect_leave_limit || '2'}
                    onChange={(e) => handleSettingChange('bereavement_indirect_leave_limit', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              {/* 7. Emergency / Compassionate Leave */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">notification_important</span>
                      <span>{t('الإجازة الاضطرارية / الطارئة', 'Emergency Leave')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بأجر تام', 'Paid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('للظروف والحالات الطارئة القاهرة التي يتعرض لها المنتسب بصورة مفاجئة.', 'For urgent sudden personal emergencies requiring immediate absence.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('رصيد الإجازات الطارئة (أيام)', 'Emergency Days Limit')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.emergency_leave_limit || '3'}
                    onChange={(e) => handleSettingChange('emergency_leave_limit', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>

              {/* 8. Unpaid Leave */}
              <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-normal text-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-black">money_off</span>
                      <span>{t('إجازة بدون راتب', 'Unpaid Leave')}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-normal bg-gray-100 text-black border border-gray-400">
                      {t('بدون أجر', 'Unpaid')}
                    </span>
                  </div>
                  <p className="text-[11px] text-black font-normal leading-relaxed">
                    {t('إجازة استثنائية بدون راتب تستوجب موافقة مسبقة من الإدارة العامة والموارد البشرية.', 'Special unpaid leave subject to management and HR prior approval.')}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('الحد الأقصى للإجازة بدون راتب (أيام)', 'Unpaid Max Limit (Days)')}
                  </label>
                  <input
                    type="number"
                    value={appSettings.unpaid_leave_limit || '60'}
                    onChange={(e) => handleSettingChange('unpaid_leave_limit', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: SOCIAL SECURITY, STATUTORY DEDUCTIONS & TAX POLICIES (WHITE THEME)
          ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'deductions') && (
        <div className="bg-white border-2 border-gray-300 p-5 sm:p-6 rounded-2xl space-y-5 shadow-sm text-black">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-black border-2 border-gray-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-black">payments</span>
            </div>
            <div>
              <h4 className="text-sm sm:text-base  text-black flex items-center gap-2 font-bold">
                <span>{t('سياسات الضمان الاجتماعي والضريبة والتأمين', 'Social Security, Income Tax & Insurance Policies')}</span>
              </h4>
              <p className="text-xs text-black mt-0.5 font-normal">
                {t('نسب اقتطاع ومساهمات التقاعد والضمان الاجتماعي وضريبة الدخل الرسمية', 'Statutory employee and company contribution rates for social security & tax')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[11px] text-black mb-1.5 font-normal">
                {t('نسبة اقتطاع الضمان الاجتماعي (حصة الموظف %)', 'Social Security Rate (Employee %)')}
              </label>
              <input
                type="number"
                step="0.1"
                value={appSettings.social_security_rate_default || '5'}
                onChange={(e) => {
                  handleSettingChange('social_security_rate_default', e.target.value);
                  handleSettingChange('social_security_employee_share', e.target.value);
                }}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] text-black mb-1.5 font-normal">
                {t('حصة المؤسسة في الضمان الاجتماعي (%)', 'Company SS Share (%)')}
              </label>
              <input
                type="number"
                step="0.1"
                value={appSettings.social_security_company_share || '12'}
                onChange={(e) => handleSettingChange('social_security_company_share', e.target.value)}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] text-black mb-1.5 font-normal">
                {t('نسبة/طريقة ضريبة الدخل (اتركه فارغاً للشرائح القانونية)', 'Income Tax Method / Rate (%)')}
              </label>
              <input
                type="text"
                placeholder={t('تلقائي (حسب الشرائح القانونية 3% - 15%)', 'Automatic (Legal progressive brackets 3% - 15%)')}
                value={appSettings.income_tax_rate_default || ''}
                onChange={(e) => handleSettingChange('income_tax_rate_default', e.target.value)}
                className="w-full bg-white border-2 border-gray-300 rounded-xl px-4 py-2.5 text-xs text-black font-mono font-normal focus:outline-none focus:border-black"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: WORK SCHEDULE & WEEKEND POLICY (WHITE THEME)
          ========================================================================= */}
      {(activeTab === 'all' || activeTab === 'schedule') && (
        <div className="bg-white border-2 border-gray-300 p-5 sm:p-6 rounded-2xl space-y-5 shadow-sm text-black">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-gray-200">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-black border-2 border-gray-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-black">schedule</span>
            </div>
            <div>
              <h4 className="text-sm sm:text-base  text-black flex items-center gap-2 font-bold">
                <span>{t('سياسة الدوام وأيام العطلة الأسبوعية وساعات العمل', 'Work Schedule, Official Hours & Weekend Days')}</span>
              </h4>
              <p className="text-xs text-black mt-0.5 font-normal">
                {t('تحديد أيام العطلة الأسبوعية وساعات بداية ونهاية الدوام الرسمي ويوم الخميس', 'Configure weekend days, daily start and end hours for regular days and Thursdays')}
              </p>
            </div>
          </div>

          {/* Weekend checkboxes */}
          <div>
            <label className="block text-xs font-normal text-black mb-2.5">
              {t('أيام العطلة الأسبوعية المعتمدة للمؤسسة:', 'Enterprise Weekend Days:')}
            </label>
            <div className="flex flex-wrap gap-2.5">
              {[
                { key: 'friday', labelAr: 'الجمعة', labelEn: 'Friday' },
                { key: 'saturday', labelAr: 'السبت', labelEn: 'Saturday' },
                { key: 'sunday', labelAr: 'الأحد', labelEn: 'Sunday' },
                { key: 'monday', labelAr: 'الاثنين', labelEn: 'Monday' },
                { key: 'tuesday', labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
                { key: 'wednesday', labelAr: 'الأربعاء', labelEn: 'Wednesday' },
                { key: 'thursday', labelAr: 'الخميس', labelEn: 'Thursday' },
              ].map((day) => (
                <label
                  key={day.key}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-normal cursor-pointer transition-all ${
                    appSettings[`weekend_${day.key}`] === 'true'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white border-gray-300 text-black hover:bg-gray-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={appSettings[`weekend_${day.key}`] === 'true'}
                    onChange={(e) => handleSettingChange(`weekend_${day.key}`, e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 rounded border-gray-400 bg-white text-black focus:ring-black accent-black cursor-pointer"
                  />
                  <span>{isAr ? day.labelAr : day.labelEn}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Work Hours: Regular and Thursday */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t-2 border-gray-200">
            {/* Regular days Sun - Wed */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3">
              <h5 className="text-xs  text-black flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-sm text-black">calendar_view_week</span>
                <span>{t('ساعات الدوام الرسمية (الأحد - الأربعاء)', 'Official Work Hours (Sun - Wed)')}</span>
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('بداية الدوام', 'Start Time')}
                  </label>
                  <input
                    type="time"
                    value={appSettings.official_work_hours_start || '08:00'}
                    onChange={(e) => handleSettingChange('official_work_hours_start', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('نهاية الدوام', 'End Time')}
                  </label>
                  <input
                    type="time"
                    value={appSettings.official_work_hours_end || '16:00'}
                    onChange={(e) => handleSettingChange('official_work_hours_end', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>
            </div>

            {/* Thursday */}
            <div className="p-4 rounded-xl bg-white border-2 border-gray-300 space-y-3">
              <h5 className="text-xs  text-black flex items-center gap-2 font-bold">
                <span className="material-symbols-outlined text-sm text-black">today</span>
                <span>{t('ساعات الدوام يوم الخميس', 'Thursday Work Hours')}</span>
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('بداية الدوام (الخميس)', 'Thursday Start')}
                  </label>
                  <input
                    type="time"
                    value={appSettings.thursday_work_hours_start || '08:00'}
                    onChange={(e) => handleSettingChange('thursday_work_hours_start', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-black mb-1 font-normal">
                    {t('نهاية الدوام (الخميس)', 'Thursday End')}
                  </label>
                  <input
                    type="time"
                    value={appSettings.thursday_work_hours_end || '14:00'}
                    onChange={(e) => handleSettingChange('thursday_work_hours_end', e.target.value)}
                    className="w-full bg-white border-2 border-gray-300 rounded-xl px-3.5 py-2 text-xs text-black font-mono font-normal focus:outline-none focus:border-black text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* Exchange Rate Update Modal */}
      <ExchangeRateUpdateModal
        isOpen={showFxModal}
        onClose={() => {
          setShowFxModal(false);
          setEditingFxRecord(null);
        }}
        onSave={handleSaveFxRecord}
        language={language}
        t={t}
        initialData={editingFxRecord}
        currentActiveRate={activeFxRate}
      />

      {/* Batch Contract Dates Modal */}
      <BatchContractDatesModal
        isOpen={showBatchContractModal}
        onClose={() => setShowBatchContractModal(false)}
        onSuccess={handleBatchSuccess}
        language={language}
        isDark={false}
        employees={employees}
      />

      {/* Batch Office Contract Routing Modal */}
      <BatchOfficeContractRoutingModal
        isOpen={showBatchOfficeRoutingModal}
        onClose={() => setShowBatchOfficeRoutingModal(false)}
        employees={employees}
        language={language}
        theme="light"
        onSuccess={() => {
          setBatchSuccessToast(
            t(
              'تم إنجاز التوجيه الجماعي المنفصل للعقود لكافة المكاتب والفروع بنجاح.',
              'Batch separated contract routing to all offices completed successfully.'
            )
          );
          setTimeout(() => setBatchSuccessToast(null), 8000);
        }}
      />
    </div>
  );
};
