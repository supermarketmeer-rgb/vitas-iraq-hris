import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User } from './types';
import { StorageService } from './services/storage';
import { IncentivesDashboardView } from './components/IncentivesDashboardView';
import { IncentivesLoanOfficersView } from './components/IncentivesLoanOfficersView';
import { IncentivesSupervisorsView } from './components/IncentivesSupervisorsView';
import { IncentivesEmployeesView } from './components/IncentivesEmployeesView';
import { IncentivesExcelImportView } from './components/IncentivesExcelImportView';
import { IncentivesCalculationWorkbenchView } from './components/IncentivesCalculationWorkbenchView';
import { IncentivesReportsView } from './components/IncentivesReportsView';
import { IncentivesAuditLogView } from './components/IncentivesAuditLogView';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Calculator,
  FileText,
  ShieldAlert,
  UserCheck,
  Calendar,
  Lock,
  Code2,
  Sparkles
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'loan_officers'
  | 'supervisors'
  | 'calculate'
  | 'import'
  | 'reports'
  | 'employees'
  | 'audit';

export const IncentivesModuleLegacyView: React.FC = () => {
  const { theme, language, t, employees: vitasEmployees, setActiveModuleId } = useApp();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  const [currentUser, setCurrentUser] = useState<User>(StorageService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activePeriod, setActivePeriod] = useState<string>('2026-10');

  const handleUserChange = (userId: string) => {
    const user = StorageService.getUsers().find((u) => u.id === userId);
    if (user) {
      StorageService.setCurrentUser(user);
      setCurrentUser(user);
    }
  };

  // Nav tabs for end-users (Payroll & Compensation) - Strictly Operational
  const navTabs: Array<{ id: ActiveTab; labelAr: string; labelEn: string; icon: string; badge?: string }> = [
    { id: 'dashboard', labelAr: 'لوحة المؤشرات', labelEn: 'Dashboard & KPIs', icon: 'space_dashboard' },
    { id: 'loan_officers', labelAr: 'حوافز مسؤولي القروض', labelEn: 'Loan Officers Incentives', icon: 'badge', badge: 'فردي' },
    { id: 'supervisors', labelAr: 'حوافز السوبرفايزرز والمشرفين', labelEn: 'Supervisors Entitlements', icon: 'shield_person', badge: 'معادلة الفريق' },
    { id: 'calculate', labelAr: 'منصة احتساب واعتماد المستحقات', labelEn: 'Calculation Workbench', icon: 'calculate' },
    { id: 'import', labelAr: 'استيراد بيانات النشاط (Excel)', labelEn: 'Excel Import', icon: 'table_chart' },
    { id: 'reports', labelAr: 'الكشوفات المالية والترحيل', labelEn: 'Reports & Export', icon: 'assessment' },
    { id: 'employees', labelAr: 'دليل الكادر الإقراضي', labelEn: 'Staff Directory', icon: 'group' },
    { id: 'audit', labelAr: 'سجل التدقيق المالي', labelEn: 'Audit Trail', icon: 'security' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-['Cairo',sans-serif]">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isEn ? 'Incentives & Compensation Module' : 'نظام احتساب حوافز ومستحقات النشاط الإقراضي'}
          </h1>
        </div>

        {/* Action Header Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-auto text-xs">
            {/* Period Selector */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-bold ${
                isDark ? 'bg-[#0f172a] border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span>فترة العمل:</span>
              <input
                type="month"
                value={activePeriod}
                onChange={(e) => setActivePeriod(e.target.value)}
                className="bg-transparent focus:outline-none font-bold text-teal-400 cursor-pointer"
              />
            </div>

            {/* Role Simulation Switcher */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold ${
                isDark ? 'bg-[#0f172a] border-white/10 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>المستخدم:</span>
              <select
                value={currentUser.id}
                onChange={(e) => handleUserChange(e.target.value)}
                className="bg-transparent focus:outline-none font-bold text-teal-400 cursor-pointer"
              >
                {StorageService.getUsers().map((u) => (
                  <option key={u.id} value={u.id} className={isDark ? 'bg-[#0a0c10] text-white' : 'bg-white text-slate-900'}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Developer link to Settings */}
            <button
              onClick={() => setActiveModuleId('sys-settings-security')}
              className="px-3 py-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="الانتقال إلى شاشة الإعدادات والأمان لتعديل المعادلات والمتغيرات التقنية (للمطور فقط)"
            >
              <Code2 className="w-3.5 h-3.5 text-purple-400" />
              <span>إعدادات المطور والمعادلات</span>
            </button>
          </div>
        </div>

      {/* Dynamic Sub-Navigation Tabs matching App Design */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 scale-[1.02]'
                  : isDark
                  ? 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{isEn ? tab.labelEn : tab.labelAr}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Active Tab Content View */}
      <div className="min-h-[500px]">
        {activeTab === 'dashboard' && (
          <IncentivesDashboardView
            onNavigate={(targetTab) => {
              if (targetTab === 'employees') setActiveTab('employees');
              else if (targetTab === 'import') setActiveTab('import');
              else if (targetTab === 'calculate') setActiveTab('calculate');
              else if (targetTab === 'reports') setActiveTab('reports');
              else if (targetTab === 'loan_officers') setActiveTab('loan_officers');
              else if (targetTab === 'supervisors') setActiveTab('supervisors');
              else setActiveTab('dashboard');
            }}
            period={activePeriod}
            isDark={isDark}
          />
        )}

        {/* Dedicated Separate Screen for Loan Officers */}
        {activeTab === 'loan_officers' && (
          <IncentivesLoanOfficersView
            period={activePeriod}
            onPeriodChange={setActivePeriod}
            isDark={isDark}
          />
        )}

        {/* Dedicated Separate Screen for Supervisors */}
        {activeTab === 'supervisors' && (
          <IncentivesSupervisorsView
            period={activePeriod}
            onPeriodChange={setActivePeriod}
            isDark={isDark}
          />
        )}

        {/* Calculation Workbench */}
        {activeTab === 'calculate' && (
          <IncentivesCalculationWorkbenchView
            period={activePeriod}
            onPeriodChange={setActivePeriod}
            onNavigateToReports={() => setActiveTab('reports')}
            isDark={isDark}
            vitasEmployees={vitasEmployees}
          />
        )}

        {/* Activity Excel Import */}
        {activeTab === 'import' && (
          <IncentivesExcelImportView
            onNavigateToCalculate={() => setActiveTab('calculate')}
            isDark={isDark}
          />
        )}

        {/* Reports & Payroll Export */}
        {activeTab === 'reports' && (
          <IncentivesReportsView
            defaultPeriod={activePeriod}
            isDark={isDark}
            vitasEmployees={vitasEmployees}
          />
        )}

        {/* Staff Directory */}
        {activeTab === 'employees' && (
          <IncentivesEmployeesView
            isDark={isDark}
            vitasEmployees={vitasEmployees}
          />
        )}

        {/* Financial Audit Trail */}
        {activeTab === 'audit' && (
          <IncentivesAuditLogView
            isDark={isDark}
          />
        )}
      </div>
    </div>
  );
};
