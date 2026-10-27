import React from 'react';
import { AppProvider, useApp } from '../tax_module/context/AppContext';
import { DashboardView } from '../tax_module/components/DashboardView';
import { SocialSecurityView } from '../tax_module/components/SocialSecurityView';
import { IncomeTaxView } from '../tax_module/components/IncomeTaxView';
import { CalculationRulesView } from '../tax_module/components/CalculationRulesView';
import { RuleSimulatorView } from '../tax_module/components/RuleSimulatorView';
import { ReportsView } from '../tax_module/components/ReportsView';
import { SettingsView } from '../tax_module/components/SettingsView';
import { PhpArchitectureView } from '../tax_module/components/PhpArchitectureView';
import { SnapshotModal } from '../tax_module/components/SnapshotModal';
import { RuleModal } from '../tax_module/components/RuleModal';

import { useApp as useRootApp } from '../context/AppContext';

const SuperAdminLockedNotice: React.FC = () => {
  return (
    <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center max-w-xl mx-auto my-12 space-y-4">
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <span className="material-symbols-outlined text-4xl">lock</span>
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
        صلاحية حصرية للسوبر آدمن (Super Admin Exclusive)
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        تم إلغاء وصول المستخدمين العاديين ومسؤولي الموارد البشرية إلى معادلات الاحتساب وقواعد الرواتب وواجهات الربط (API). أي تعديل مستقبلي في القواعد والشرائح والـ API يكون حصراً من قبل السوبر آدمن.
      </p>
      <div className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
        Access Restricted: Role 'Super Admin' Required
      </div>
    </div>
  );
};

const InnerTaxView: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    loading,
    lang,
    theme,
    activeDepartmentId,
    setActiveDepartmentId,
    activeBranchId,
    setActiveBranchId,
    departments,
    branches,
    t
  } = useApp();
  const { currentUser } = useRootApp();
  const isEn = lang === 'en';
  const isDark = theme === 'dark';

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  // Base operational tabs available to HR / General Users
  const baseTabs: Array<{ id: any; labelAr: string; labelEn: string; icon: string }> = [
    { id: 'dashboard', labelAr: 'لوحة التحكم والمؤشرات', labelEn: 'Dashboard & KPIs', icon: 'dashboard' },
    { id: 'social_security', labelAr: 'الضمان الاجتماعي (قانون 18)', labelEn: 'Social Security (Law 18)', icon: 'shield_person' },
    { id: 'income_tax', labelAr: 'ضريبة الدخل (قانون 113)', labelEn: 'Income Tax (Law 113)', icon: 'receipt_long' },
    { id: 'simulator', labelAr: 'محاكي التقديرات وتتبع الخطوات', labelEn: 'Simulator & Trace', icon: 'calculate' },
    { id: 'reports', labelAr: 'التقارير والمطابقات', labelEn: 'Reports & Audits', icon: 'summarize' },
  ];

  // Exclusive tabs for Super Admin ONLY (Rules, Formulas, Parameters, API Generator)
  const superAdminTabs: Array<{ id: any; labelAr: string; labelEn: string; icon: string; isSuperAdminOnly?: boolean }> = [
    { id: 'calculation_rules', labelAr: 'قواعد ومحرك المعادلات (Super Admin)', labelEn: 'Rules Engine (Super Admin)', icon: 'account_tree', isSuperAdminOnly: true },
    { id: 'settings', labelAr: 'الشرائح والمتغيرات (Super Admin)', labelEn: 'Settings & Formulas (Super Admin)', icon: 'tune', isSuperAdminOnly: true },
    { id: 'php_architecture', labelAr: 'بنية API ومولد الكود (Super Admin)', labelEn: 'API & PHP Generator (Super Admin)', icon: 'code', isSuperAdminOnly: true },
  ];

  const tabs = isSuperAdmin ? [...baseTabs, ...superAdminTabs] : baseTabs;

  // Auto-redirect if a non-super-admin is somehow on a protected technical tab
  React.useEffect(() => {
    if (!isSuperAdmin && ['calculation_rules', 'settings', 'php_architecture'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [isSuperAdmin, activeTab, setActiveTab]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isEn ? 'Social Security & Income Tax Engine' : 'محرك الضمان الاجتماعي وضريبة الدخل'}
          </h1>
        </div>

        {/* Filters and Dashboard & KPI button placed on the same line as screen title */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-sm">domain</span>
            <select
              value={activeDepartmentId}
              onChange={(e) => setActiveDepartmentId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">{t('all_departments')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="dark:bg-slate-900">
                  {lang === 'ar' ? d.name_ar : d.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-sm">filter_alt</span>
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">{t('all_branches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {lang === 'ar' ? b.name_ar : b.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Dashboard & KPI button */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all duration-200"
          >
            <span className="material-symbols-outlined text-sm">dashboard</span>
            <span>{isEn ? 'Dashboard & KPI' : 'لوحة المؤشرات (Dashboard & KPI)'}</span>
          </button>
        </div>
      </div>

      {/* Main Active Tab Content View */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className={`p-12 rounded-3xl ${
            isDark ? 'bg-slate-900/60 border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm'
          } border flex flex-col items-center justify-center gap-3`}>
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-500 border-t-transparent"></div>
            <span className="text-xs font-medium font-mono">
              {isEn
                ? 'Fetching statutory rules & parameters from MySQL vitasiraq_hris_db...'
                : 'جارٍ جلب وتطبيق قواعد الضمان والضريبة من MySQL vitasiraq_hris_db...'}
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'social_security' && <SocialSecurityView />}
            {activeTab === 'income_tax' && <IncomeTaxView />}
            {activeTab === 'simulator' && <RuleSimulatorView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'calculation_rules' && (isSuperAdmin ? <CalculationRulesView /> : <SuperAdminLockedNotice />)}
            {activeTab === 'settings' && (isSuperAdmin ? <SettingsView /> : <SuperAdminLockedNotice />)}
            {activeTab === 'php_architecture' && (isSuperAdmin ? <PhpArchitectureView /> : <SuperAdminLockedNotice />)}
          </>
        )}
      </div>

      {/* Modals & Overlays */}
      <SnapshotModal />
      <RuleModal />
    </div>
  );
};

export const TaxSecurityModuleView: React.FC = () => {
  return (
    <AppProvider>
      <InnerTaxView />
    </AppProvider>
  );
};
