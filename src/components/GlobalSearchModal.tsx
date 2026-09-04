import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CATEGORY_GROUPS } from '../data/categories';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    setActiveModuleId,
    language,
    t,
    theme,
    employees,
    jobVacancies,
    candidates,
    assetRecords,
    riskRecords,
    documentRecords
  } = useApp();

  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const isDark = theme === 'dark';

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  // Search Results Compilation
  const matchedModules = CATEGORY_GROUPS.flatMap(c =>
    c.modules.filter(m =>
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      m.titleEn.toLowerCase().includes(query.toLowerCase()) ||
      m.description.toLowerCase().includes(query.toLowerCase())
    )
  );

  const matchedEmployees = employees.filter(e =>
    e.fullName.includes(query) ||
    e.employeeId.toLowerCase().includes(query.toLowerCase()) ||
    e.department.includes(query)
  );

  const matchedJobs = jobVacancies.filter(j =>
    j.title.includes(query) ||
    j.department.includes(query)
  );

  const matchedCandidates = candidates.filter(c =>
    c.fullName.includes(query) ||
    c.jobTitle.includes(query)
  );

  const matchedAssets = assetRecords.filter(a =>
    a.name.includes(query) ||
    a.assetTag.toLowerCase().includes(query.toLowerCase())
  );

  const matchedDocuments = documentRecords.filter(d =>
    d.title.includes(query) ||
    d.type.includes(query)
  );

  const matchedRisks = riskRecords.filter(r =>
    r.title.includes(query) ||
    r.riskCode.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-start justify-center pt-16 px-4 animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-2xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[80vh] transition-colors ${
          isDark 
            ? 'bg-[#111827] border-white/10 text-slate-200' 
            : 'bg-white border-slate-300 text-slate-900 shadow-slate-500/20'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className={`p-4 border-b flex items-center gap-3 ${
          isDark ? 'border-white/10 bg-[#0a0c10]/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">
            search
          </span>
          <input
            type="text"
            autoFocus
            placeholder={query || isFocused ? '' : t('ابحث بالاسم، المعرّف، القسم، الوحدة، الوثائق، الأصول...', 'Search by name, ID, department, module, docs, assets...')}
            value={query}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={e => setQuery(e.target.value)}
            className={`w-full bg-transparent font-bold text-base focus:outline-none ${
              isDark 
                ? 'text-white placeholder-slate-400' 
                : 'text-slate-900 placeholder-slate-500'
            }`}
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isDark 
                ? 'text-slate-300 hover:text-white hover:bg-white/10' 
                : 'text-slate-800 hover:text-slate-900 hover:bg-slate-200 bg-slate-100 border border-slate-300'
            }`}
          >
            {t('إلغاء [ESC]', 'Cancel [ESC]')}
          </button>
        </div>

        {/* Quick Filter Tags */}
        <div className={`px-4 py-2.5 border-b flex items-center gap-2 overflow-x-auto text-xs ${
          isDark ? 'bg-[#0a0c10]/60 border-white/5' : 'bg-slate-100/80 border-slate-200'
        }`}>
          <span className={`font-bold whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-800'}`}>
            {t('اقتراحات سريعة:', 'Quick Suggestions:')}
          </span>
          {(language === 'en'
            ? ['Employees', 'Leave', 'Recruitment', 'Payroll', 'Assets', 'Risks', 'APIs']
            : ['الموظفين', 'الإجازات', 'التوظيف', 'الرواتب', 'الأصول', 'المخاطر', 'الواجهات API']
          ).map(tag => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className={`global-search-pill px-3 py-1 rounded-full text-xs font-extrabold transition-all whitespace-nowrap border ${
                isDark
                  ? 'bg-white/5 text-slate-200 hover:bg-teal-600 hover:text-white border-white/10'
                  : 'bg-slate-200/90 text-slate-900 hover:bg-teal-600 hover:text-white border-slate-400/50 shadow-sm'
              }`}
              style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search Results Display Area */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {!query && (
            <div className={`text-center py-10 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
              <span className="material-symbols-outlined text-4xl mb-2 text-teal-600 dark:text-teal-400">
                travel_explore
              </span>
              <p className="text-sm font-bold">
                {t('اكتب كلمة البحث للاستعلام المباشر عبر جميع وحدات وسجلات النظام', 'Type a search term to query directly across all system modules & records')}
              </p>
            </div>
          )}

          {query && matchedModules.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">grid_view</span>
                {t('الوحدات والأقسام في النظام', 'System Modules & Categories')} ({matchedModules.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {matchedModules.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveModuleId(m.id);
                      setIsSearchOpen(false);
                    }}
                    className={`global-search-result-card p-3 rounded-xl text-start transition-all group flex items-start gap-3 border ${
                      isDark
                        ? 'bg-white/[0.02] hover:bg-white/10 border-white/10'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-teal-500 shadow-sm'
                    }`}
                  >
                    <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 mt-0.5">
                      {m.icon}
                    </span>
                    <div>
                      <p 
                        className="text-xs font-extrabold"
                        style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                      >
                        {language === 'en' ? m.titleEn : m.title}
                      </p>
                      <p 
                        className="text-[10px] font-medium line-clamp-1"
                        style={{ color: isDark ? '#94a3b8' : '#334155' }}
                      >
                        {m.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && matchedEmployees.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">badge</span>
                {t('نتائج الموظفين', 'Employee Results')} ({matchedEmployees.length})
              </h3>
              <div className="space-y-1.5">
                {matchedEmployees.map(e => (
                  <button
                    key={e.id}
                    onClick={() => {
                      setActiveModuleId('emp-profile');
                      setIsSearchOpen(false);
                    }}
                    className={`global-search-result-card w-full p-2.5 rounded-xl flex items-center justify-between text-start text-xs border ${
                      isDark
                        ? 'bg-white/[0.02] hover:bg-white/10 border-white/10'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-teal-500 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-black flex items-center justify-center border border-teal-300 dark:border-teal-500/30">
                        {e.fullName?.slice(0, 1) || 'U'}
                      </div>
                      <div>
                        <p 
                          className="font-extrabold text-sm"
                          style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                        >
                          {e.fullName}
                        </p>
                        <p 
                          className="text-[11px] font-medium"
                          style={{ color: isDark ? '#94a3b8' : '#334155' }}
                        >
                          {e.jobTitle} • {e.department}
                        </p>
                      </div>
                    </div>
                    <span 
                      className="font-mono text-[11px] px-2 py-0.5 rounded font-bold border"
                      style={{ 
                        backgroundColor: isDark ? 'rgba(13, 148, 136, 0.2)' : '#e6fffa', 
                        color: isDark ? '#2dd4bf' : '#0f766e',
                        borderColor: isDark ? 'rgba(45, 212, 191, 0.3)' : '#99f6e4'
                      }}
                    >
                      {e.employeeId}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && matchedJobs.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">work</span>
                {t('الوظائف الشاغرة', 'Job Vacancies')} ({matchedJobs.length})
              </h3>
              <div className="space-y-1">
                {matchedJobs.map(j => (
                  <button
                    key={j.id}
                    onClick={() => {
                      setActiveModuleId('recruit-dash');
                      setIsSearchOpen(false);
                    }}
                    className={`global-search-result-card w-full p-2.5 rounded-xl text-start text-xs flex items-center justify-between border ${
                      isDark
                        ? 'bg-white/[0.02] hover:bg-white/10 border-white/10'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-teal-500 shadow-sm'
                    }`}
                  >
                    <div>
                      <p 
                        className="font-extrabold"
                        style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                      >
                        {j.title}
                      </p>
                      <p 
                        className="text-[10px] font-medium"
                        style={{ color: isDark ? '#94a3b8' : '#334155' }}
                      >
                        {j.department} • {j.branch}
                      </p>
                    </div>
                    <span className="text-[10px] bg-teal-600 text-white font-bold shadow-sm px-2 py-0.5 rounded">
                      {j.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && matchedCandidates.length > 0 && (
            <div>
              <h3 className="text-xs font-extrabold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">person_search</span>
                {t('المرشحون للتوظيف', 'Job Candidates')} ({matchedCandidates.length})
              </h3>
              <div className="space-y-1">
                {matchedCandidates.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveModuleId('recruit-ats');
                      setIsSearchOpen(false);
                    }}
                    className={`global-search-result-card w-full p-2.5 rounded-xl text-start text-xs flex items-center justify-between border ${
                      isDark
                        ? 'bg-white/[0.02] hover:bg-white/10 border-white/10'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-300 hover:border-teal-500 shadow-sm'
                    }`}
                  >
                    <div>
                      <p 
                        className="font-extrabold"
                        style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                      >
                        {c.fullName}
                      </p>
                      <p 
                        className="text-[10px] font-medium"
                        style={{ color: isDark ? '#94a3b8' : '#334155' }}
                      >
                        {c.jobTitle}
                      </p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                      {c.stage}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query &&
            matchedModules.length === 0 &&
            matchedEmployees.length === 0 &&
            matchedJobs.length === 0 &&
            matchedCandidates.length === 0 &&
            matchedAssets.length === 0 &&
            matchedDocuments.length === 0 &&
            matchedRisks.length === 0 && (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">
                  search_off
                </span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {t(`لا توجد نتائج مطابقة لـ "${query}"`, `No matching results for "${query}"`)}
                </p>
                <p className="text-xs mt-1 text-slate-700 dark:text-slate-400 font-medium">
                  {t('تأكد من كتابة مصطلح البحث بشكل صحيح أو جرب مصطلحاً آخر', 'Make sure the search term is spelled correctly or try another term')}
                </p>
              </div>
            )}
        </div>

        {/* Modal Footer */}
        <div className={`p-3 border-t text-[11px] font-bold flex items-center justify-between ${
          isDark 
            ? 'bg-[#0a0c10] border-white/10 text-slate-400' 
            : 'bg-slate-100 border-slate-300 text-slate-800'
        }`}>
          <span>{t('المحرك الشامل لبوابة فيتاس العراق', 'VITAS Iraq Portal Global Search Engine')}</span>
          <span className="font-mono font-bold">RTL Arabic / English Live Matching</span>
        </div>
      </div>
    </div>
  );
};
