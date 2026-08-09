import React from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORY_GROUPS } from '../data/categories';

export const Breadcrumb: React.FC = () => {
  const { activeModuleId, setActiveModuleId, setIsSearchOpen, language, t } = useApp();

  // Find parent category and current module from CATEGORY_GROUPS
  let currentCategory = CATEGORY_GROUPS.find(cat =>
    cat.modules.some(mod => mod.id === activeModuleId)
  );

  let currentModule = currentCategory?.modules.find(mod => mod.id === activeModuleId);

  // If not found directly, infer category from prefix
  if (!currentCategory) {
    if (activeModuleId.startsWith('auth-')) currentCategory = CATEGORY_GROUPS[0];
    else if (activeModuleId.startsWith('dash-')) currentCategory = CATEGORY_GROUPS[1];
    else if (activeModuleId.startsWith('emp-')) currentCategory = CATEGORY_GROUPS[2];
    else if (activeModuleId.startsWith('leave-')) currentCategory = CATEGORY_GROUPS[3];
    else if (activeModuleId.startsWith('payroll-')) currentCategory = CATEGORY_GROUPS[4];
    else if (activeModuleId.startsWith('recruit-')) currentCategory = CATEGORY_GROUPS[5];
    else if (activeModuleId.startsWith('perf-') || activeModuleId.startsWith('train-')) currentCategory = CATEGORY_GROUPS[6];
    else if (activeModuleId.startsWith('asset-') || activeModuleId.startsWith('doc-')) currentCategory = CATEGORY_GROUPS[7];
    else if (activeModuleId.startsWith('risk-') || activeModuleId.startsWith('sec-')) currentCategory = CATEGORY_GROUPS[8];
    else if (activeModuleId.startsWith('sys-')) currentCategory = CATEGORY_GROUPS[9];
    else if (activeModuleId.startsWith('supp-')) currentCategory = CATEGORY_GROUPS[10];

    currentModule = currentCategory?.modules.find(mod => mod.id === activeModuleId);
  }

  const categoryName = currentCategory ? (language === 'en' ? currentCategory.titleEn : currentCategory.title) : t('عام', 'General');
  const moduleName = currentModule ? (language === 'en' ? currentModule.titleEn : currentModule.title) : '';

  return (
    <nav 
      aria-label={t('مسار التنقل', 'Breadcrumb navigation')} 
      className="bg-[#0c0f17]/90 border-b border-white/10 px-4 sm:px-6 py-2.5 text-xs transition-colors"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left Side: Breadcrumb trail */}
        <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-slate-400 font-medium">
          {/* Home Step */}
          <li>
            <button
              onClick={() => setActiveModuleId('dash-overview')}
              className="flex items-center gap-1 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
              title={t('العودة للوحة التحكم الرئيسية', 'Return to Main Dashboard')}
            >
              <span className="material-symbols-outlined text-base text-teal-400">home</span>
              <span className="hidden xs:inline">{t('الرئيسية', 'Home')}</span>
            </button>
          </li>

          {/* Separator 1 */}
          <li className="text-slate-600 select-none flex items-center">
            <span className="material-symbols-outlined text-sm rtl:rotate-180">chevron_right</span>
          </li>

          {/* Category Step */}
          {currentCategory ? (
            <li>
              <button
                onClick={() => {
                  if (currentCategory?.modules[0]) {
                    setActiveModuleId(currentCategory.modules[0].id);
                  }
                }}
                className="flex items-center gap-1.5 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                title={`${t('الانتقال إلى', 'Go to')} ${categoryName}`}
              >
                <span className="material-symbols-outlined text-base text-teal-400/80">
                  {currentCategory.icon}
                </span>
                <span>{categoryName}</span>
              </button>
            </li>
          ) : (
            <li className="text-slate-300 font-bold">{t('عام', 'General')}</li>
          )}

          {/* Separator 2 */}
          {currentModule && (
            <li className="text-slate-600 select-none flex items-center">
              <span className="material-symbols-outlined text-sm rtl:rotate-180">chevron_right</span>
            </li>
          )}

          {/* Module Step */}
          {currentModule && (
            <li className="flex items-center gap-1.5 text-white font-bold bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg">
              <span className="material-symbols-outlined text-sm text-teal-400">
                {currentModule.icon}
              </span>
              <span className="truncate max-w-[180px] sm:max-w-xs">{moduleName}</span>
            </li>
          )}
        </ol>

        {/* Right Side: Quick Action & Shortcut Indicator */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 hover:border-teal-500/40 text-slate-400 hover:text-slate-200 transition-all"
            title={t('بحث شامل في النظام (Ctrl+K)', 'Global System Search (Ctrl+K)')}
          >
            <span className="material-symbols-outlined text-xs text-teal-400">search</span>
            <span>{t('بحث سريع', 'Quick Search')}</span>
            <kbd className="px-1 bg-white/10 rounded font-mono text-[10px] text-slate-300">Ctrl+K</kbd>
          </button>
          <button
            onClick={() => setActiveModuleId('dash-overview')}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-teal-500/40 text-slate-400 hover:text-slate-200 transition-all"
            title={t('الرئيسية (Ctrl+D)', 'Dashboard (Ctrl+D)')}
          >
            <kbd className="px-1 bg-white/10 rounded font-mono text-[10px] text-slate-300">Ctrl+D</kbd>
          </button>
        </div>
      </div>
    </nav>
  );
};
