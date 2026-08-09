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
    employees,
    jobVacancies,
    candidates,
    assetRecords,
    riskRecords,
    documentRecords
  } = useApp();

  const [query, setQuery] = useState('');

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
    <div className="fixed inset-0 z-50 bg-[#0a0c10]/80 backdrop-blur-md flex items-start justify-center pt-16 px-4 animate-in fade-in duration-200">
      <div 
        className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <span className="material-symbols-outlined text-teal-400 text-2xl">
            search
          </span>
          <input
            type="text"
            autoFocus
            placeholder={t('ابحث بالاسم، المعرّف، القسم، الوحدة، الوثائق، الأصول...', 'Search by name, ID, department, module, docs, assets...')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-slate-500 font-bold text-base focus:outline-none"
          />
          <button
            onClick={() => setIsSearchOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-xs font-bold transition-colors"
          >
            {t('إلغاء [ESC]', 'Cancel [ESC]')}
          </button>
        </div>

        {/* Quick Filter Tags */}
        <div className="px-4 py-2 bg-[#0a0c10]/60 border-b border-white/5 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-medium whitespace-nowrap">{t('اقتراحات سريعة:', 'Quick Suggestions:')}</span>
          {(language === 'en'
            ? ['Employees', 'Leave', 'Recruitment', 'Payroll', 'Assets', 'Risks', 'APIs']
            : ['الموظفين', 'الإجازات', 'التوظيف', 'الرواتب', 'الأصول', 'المخاطر', 'الواجهات API']
          ).map(tag => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="px-2.5 py-1 rounded-full bg-white/5 text-slate-300 hover:bg-teal-600 hover:text-white transition-colors whitespace-nowrap font-medium border border-white/5"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search Results Display Area */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {!query && (
            <div className="text-center py-10 text-slate-500">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">
                travel_explore
              </span>
              <p className="text-sm">{t('اكتب كلمة البحث للاستعلام المباشر عبر جميع وحدات وسجلات النظام', 'Type a search term to query directly across all system modules & records')}</p>
            </div>
          )}

          {query && matchedModules.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-teal-400 mb-2 flex items-center gap-1.5">
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
                    className="p-3 bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-teal-500/50 rounded-xl text-start transition-all group flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-teal-400 mt-0.5">
                      {m.icon}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-teal-400">
                        {language === 'en' ? m.titleEn : m.title}
                      </p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{m.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && matchedEmployees.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-teal-400 mb-2 flex items-center gap-1.5">
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
                    className="w-full p-2.5 bg-white/[0.02] hover:bg-white/5 rounded-xl flex items-center justify-between text-start text-xs border border-white/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-400 font-bold flex items-center justify-center">
                        {e.fullName?.slice(0, 1) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{e.fullName}</p>
                        <p className="text-[10px] text-slate-400">{e.jobTitle} • {e.department}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded text-teal-400">
                      {e.employeeId}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && matchedJobs.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-teal-400 mb-2 flex items-center gap-1.5">
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
                    className="w-full p-2.5 bg-white/[0.02] hover:bg-white/5 rounded-xl text-start text-xs flex items-center justify-between border border-white/5"
                  >
                    <div>
                      <p className="font-bold text-slate-200">{j.title}</p>
                      <p className="text-[10px] text-slate-400">{j.department} • {j.branch}</p>
                    </div>
                    <span className="text-[10px] bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded border border-teal-500/20">
                      {j.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && matchedCandidates.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-teal-400 mb-2 flex items-center gap-1.5">
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
                    className="w-full p-2.5 bg-white/[0.02] hover:bg-white/5 rounded-xl text-start text-xs flex items-center justify-between border border-white/5"
                  >
                    <div>
                      <p className="font-bold text-slate-200">{c.fullName}</p>
                      <p className="text-[10px] text-slate-400">{c.jobTitle}</p>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
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
              <div className="text-center py-12 text-slate-500">
                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">
                  search_off
                </span>
                <p className="text-sm font-bold text-slate-400">
                  {t(`لا توجد نتائج مطابقة لـ "${query}"`, `No matching results for "${query}"`)}
                </p>
                <p className="text-xs mt-1 text-slate-500">
                  {t('تأكد من كتابة مصطلح البحث بشكل صحيح أو جرب مصطلحاً آخر', 'Make sure the search term is spelled correctly or try another term')}
                </p>
              </div>
            )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0a0c10] border-t border-white/10 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{t('المحرك الشامل لبوابة فيتاس العراق', 'VITAS Iraq Portal Global Search Engine')}</span>
          <span className="font-mono">RTL Arabic / English Live Matching</span>
        </div>
      </div>
    </div>
  );
};
