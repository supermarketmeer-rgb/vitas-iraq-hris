import React from 'react';
import { useApp, NavTab } from '../context/AppContext.js';
import {
  LayoutDashboard,
  Shield,
  Percent,
  Sliders,
  Sparkles,
  FileText,
  Settings,
  Code2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, lang, t, rules } = useApp();

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    subLabel?: string;
  }> = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: LayoutDashboard,
    },
    {
      id: 'social_security',
      label: t('social_security'),
      icon: Shield,
      subLabel: lang === 'ar' ? 'الاستقطاع والمساهمة' : 'Contributions',
    },
    {
      id: 'income_tax',
      label: t('income_tax'),
      icon: Percent,
      subLabel: lang === 'ar' ? 'الشرائح والإعفاءات' : 'Tax Brackets',
    },
    {
      id: 'calculation_rules',
      label: t('calculation_rules'),
      icon: Sliders,
      badge: rules.length,
    },
    {
      id: 'simulator',
      label: t('rule_simulator'),
      icon: Sparkles,
    },
    {
      id: 'reports',
      label: t('reports'),
      icon: FileText,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: Settings,
    },
    {
      id: 'php_architecture',
      label: t('php_architecture'),
      icon: Code2,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-e border-slate-800 select-none">
      <div className="flex flex-col min-h-0">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-sm truncate">
              {lang === 'ar' ? 'الضمان وضريبة الدخل' : 'Social & Tax Module'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              {lang === 'ar' ? 'موديول الموارد البشرية' : 'HR Core Extension'}
            </div>
          </div>
        </div>

        {/* Navigation Category Label */}
        <div className="px-5 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {lang === 'ar' ? 'القائمة الرئيسية للموديول' : 'Module Navigation'}
        </div>

        {/* Navigation Links */}
        <nav className="px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <div className="text-start truncate">
                    <div className="truncate">{item.label}</div>
                    {item.subLabel && !isActive && (
                      <div className="text-[9px] text-slate-400 truncate opacity-80">{item.subLabel}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold ${
                        isActive
                          ? 'bg-indigo-700 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {lang === 'ar' ? (
                    <ChevronLeft className={`w-3.5 h-3.5 opacity-40 ${isActive ? 'text-white opacity-80' : ''}`} />
                  ) : (
                    <ChevronRight className={`w-3.5 h-3.5 opacity-40 ${isActive ? 'text-white opacity-80' : ''}`} />
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Dynamic Engine Callout & User Footer */}
      <div className="shrink-0">
        <div className="mx-3 mb-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px]">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'ar' ? 'قواعد ديناميكية 100%' : '100% Dynamic Engine'}</span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400">
            {lang === 'ar'
              ? 'تدار كافة النسب والشرائح عبر قاعدة البيانات دون أي قيم ثابتة في الكود.'
              : 'All rates and tiers load dynamically from database tables.'}
          </p>
        </div>

        {/* Bottom User Bar */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
            HR
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {lang === 'ar' ? 'مدير الرواتب والضرائب' : 'Payroll & Tax Admin'}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{lang === 'ar' ? 'متصل بنظام HRMS' : 'HRMS Connected'}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

