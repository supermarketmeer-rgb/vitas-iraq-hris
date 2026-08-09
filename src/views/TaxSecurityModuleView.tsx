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

const InnerTaxView: React.FC = () => {
  const { activeTab, setActiveTab, loading, lang, theme } = useApp();
  const isEn = lang === 'en';
  const isDark = theme === 'dark';

  const tabs: Array<{ id: any; labelAr: string; labelEn: string; icon: string }> = [
    { id: 'dashboard', labelAr: 'لوحة التحكم والمؤشرات', labelEn: 'Dashboard & KPIs', icon: 'dashboard' },
    { id: 'social_security', labelAr: 'الضمان الاجتماعي (قانون 18)', labelEn: 'Social Security (Law 18)', icon: 'shield_person' },
    { id: 'income_tax', labelAr: 'ضريبة الدخل (قانون 113)', labelEn: 'Income Tax (Law 113)', icon: 'receipt_long' },
    { id: 'calculation_rules', labelAr: 'قواعد ومحرك الحسابات', labelEn: 'Rules Engine', icon: 'account_tree' },
    { id: 'simulator', labelAr: 'محاكي التقديرات وتتبع الخطوات', labelEn: 'Simulator & Trace', icon: 'calculate' },
    { id: 'reports', labelAr: 'التقارير والمطابقات', labelEn: 'Reports & Audits', icon: 'summarize' },
    { id: 'php_architecture', labelAr: 'بنية PHP ومولد الكود', labelEn: 'PHP Generator', icon: 'code' },
    { id: 'settings', labelAr: 'الشرائح والمتغيرات', labelEn: 'Settings & Variables', icon: 'tune' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner matching VITAS HRMS Styling */}
      <div className={`p-6 rounded-3xl ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 border-teal-500/20 text-white'
          : 'bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 border-teal-600 text-white shadow-xl'
      } border shadow-2xl relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
              isDark ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20' : 'bg-teal-600/80 border border-teal-400/30'
            }`}>
              <span className="material-symbols-outlined text-white text-3xl">policy</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-wide">
                  {isEn ? 'Social Security & Income Tax Engine' : 'محرك الضمان الاجتماعي وضريبة الدخل'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-900/60 text-teal-200 border border-teal-400/30 text-[11px] font-mono font-bold">
                  MySQL XAMPP Live
                </span>
              </div>
              <p className="text-teal-100 text-xs mt-1">
                {isEn
                  ? 'Rules engine for Iraqi Social Security (Law 18 of 2023) and Progressive Income Tax (Law 113) fully integrated with HR & Payroll'
                  : 'نظام إدارة وقواعد الضمان الاجتماعي (قانون 18 لسنة 2023) وضريبة الدخل التصاعدية (قانون 113) المتكامل مع سجلات الموظفين والرواتب'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto font-mono text-xs">
            <div className="px-3.5 py-2 rounded-xl bg-teal-900/60 border border-teal-400/30 flex items-center gap-2 text-teal-100 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>vitasiraq_hris_db: {isEn ? 'Connected' : 'متصل'}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Sub-Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-teal-500/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-teal-900 font-bold shadow-lg scale-[1.02]'
                    : 'bg-teal-900/40 text-teal-100 hover:bg-teal-900/70 hover:text-white border border-teal-500/30'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{isEn ? tab.labelEn : tab.labelAr}</span>
              </button>
            );
          })}
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
            {activeTab === 'calculation_rules' && <CalculationRulesView />}
            {activeTab === 'simulator' && <RuleSimulatorView />}
            {activeTab === 'reports' && <ReportsView />}
            {activeTab === 'settings' && <SettingsView />}
            {activeTab === 'php_architecture' && <PhpArchitectureView />}
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
