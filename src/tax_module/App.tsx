import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { SocialSecurityView } from './components/SocialSecurityView.js';
import { IncomeTaxView } from './components/IncomeTaxView.js';
import { CalculationRulesView } from './components/CalculationRulesView.js';
import { RuleSimulatorView } from './components/RuleSimulatorView.js';
import { ReportsView } from './components/ReportsView.js';
import { SettingsView } from './components/SettingsView.js';
import { PhpArchitectureView } from './components/PhpArchitectureView.js';
import { SnapshotModal } from './components/SnapshotModal.js';
import { RuleModal } from './components/RuleModal.js';
import { ShieldCheck } from 'lucide-react';

const MainContent: React.FC = () => {
  const { activeTab, loading, lang, activePeriod } = useApp();

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navbar */}
      <Navbar />

      {/* Main Workspace Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Dark Enterprise Sidebar */}
        <Sidebar />

        {/* Dynamic Views Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50/70 dark:bg-slate-950/90">
          <div className="max-w-7xl mx-auto space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3">
                <div className="animate-spin rounded-full h-9 w-9 border-2 border-indigo-600 border-t-transparent"></div>
                <span className="text-xs font-medium">
                  {lang === 'ar' ? 'جارٍ تحميل محرك القواعد والبيانات...' : 'Loading rules engine & HR snapshot data...'}
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
        </main>
      </div>

      {/* Professional Polish Bottom Status Bar */}
      <footer className="h-9 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-700 dark:text-slate-300">
              {lang === 'ar' ? 'متصل بقاعدة بيانات MySQL 8.0' : 'Connected to MySQL 8.0 (XAMPP / Production)'}
            </span>
          </div>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
          <div className="hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>{lang === 'ar' ? 'خدمات HRMS موصولة' : 'HR Core Services Mapped'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>{lang === 'ar' ? `فترة العمل النشطة: ${activePeriod}` : `Active Period: ${activePeriod}`}</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            v2.4.0-PRO
          </span>
        </div>
      </footer>

      {/* Modals & Overlays */}
      <SnapshotModal />
      <RuleModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

