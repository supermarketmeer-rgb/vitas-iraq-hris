import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ARABIC_SYSTEM_GUIDE, ENGLISH_SYSTEM_GUIDE, GuideCategory, GuideModule } from '../data/systemModulesGuide';

interface SystemHelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemHelpGuideModal: React.FC<SystemHelpGuideModalProps> = ({ isOpen, onClose }) => {
  const { theme, language: appLanguage } = useApp();
  const [guideLang, setGuideLang] = useState<'ar' | 'en'>(appLanguage === 'en' ? 'en' : 'ar');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-1-auth');
  const contentContainerRef = useRef<HTMLDivElement>(null);

  // Sync guide language automatically whenever modal opens or appLanguage changes
  useEffect(() => {
    if (isOpen) {
      setGuideLang(appLanguage === 'en' ? 'en' : 'ar');
    }
  }, [isOpen, appLanguage]);

  const isAr = guideLang === 'ar';
  const isDark = theme === 'dark';

  const categories = useMemo(() => {
    return isAr ? ARABIC_SYSTEM_GUIDE : ENGLISH_SYSTEM_GUIDE;
  }, [isAr]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();

    return categories
      .map((cat) => {
        const catMatch = cat.title.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q);
        const matchedModules = cat.modules.filter((m) => {
          return (
            m.title.toLowerCase().includes(q) ||
            m.summary.toLowerCase().includes(q) ||
            m.functions.some((f) => f.toLowerCase().includes(q))
          );
        });

        if (catMatch || matchedModules.length > 0) {
          return {
            ...cat,
            modules: catMatch && matchedModules.length === 0 ? cat.modules : matchedModules,
          };
        }
        return null;
      })
      .filter((cat): cat is GuideCategory => cat !== null);
  }, [categories, searchQuery]);

  const totalModulesCount = useMemo(() => {
    return categories.reduce((acc, cat) => acc + cat.modules.length, 0);
  }, [categories]);

  const scrollToCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    const element = document.getElementById(`guide-cat-${catId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const direction = isAr ? 'rtl' : 'ltr';
    const mainTitle = isAr
      ? 'الدليل الشامل لفهرس ووظائف موديولات النظام'
      : 'System Modules Complete Index & Functional Guide';
    const subTitle = isAr
      ? 'فهرس توضيحي معتمد يوضح وظائف ومهام كافة موديولات وأقسام منظومة فيتاس العراق للموارد البشرية بالتفصيل.'
      : 'Official sequentially indexed reference explaining the features and functions of all VITAS Iraq HRMS modules.';
    const orgName = isAr ? 'منظومة فيتاس العراق للموارد البشرية' : 'VITAS IRAQ HRMS ENTERPRISE PORTAL';
    const totalCountText = isAr ? `${totalModulesCount} موديول مفهرس` : `${totalModulesCount} Indexed Modules`;
    const printDate = new Date().toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let categoriesHtml = '';
    categories.forEach((cat) => {
      let modulesHtml = '';
      cat.modules.forEach((mod) => {
        let fnsHtml = '';
        mod.functions.forEach((fn) => {
          fnsHtml += `<li style="margin-bottom: 4px; line-height: 1.5; color: #1e293b;"><span style="color: #0d9488; font-weight: bold; margin-${isAr ? 'left' : 'right'}: 6px;">•</span>${fn}</li>`;
        });

        modulesHtml += `
          <div style="margin-bottom: 16px; padding: 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 8px;">
              <div style="font-weight: 800; font-size: 13pt; color: #0f172a;">
                <span style="background: #0d9488; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-size: 10pt; font-family: monospace; margin-${isAr ? 'left' : 'right'}: 8px;">${mod.number}</span>
                ${mod.title}
              </div>
              <span style="font-size: 9pt; color: #64748b; font-weight: 600;">${isAr ? `${mod.functions.length} وظائف أساسية` : `${mod.functions.length} Core Functions`}</span>
            </div>
            <div style="font-size: 10pt; color: #0f766e; font-weight: 600; margin-bottom: 8px;">${mod.summary}</div>
            <ul style="list-style: none; padding-${isAr ? 'right' : 'left'}: 8px; margin: 0; font-size: 9.5pt;">
              ${fnsHtml}
            </ul>
          </div>
        `;
      });

      categoriesHtml += `
        <div style="margin-bottom: 28px; page-break-after: auto; page-break-inside: avoid;">
          <div style="display: flex; align-items: center; gap: 10px; background: #0f766e; color: #ffffff; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px;">
            <div style="background: #ffffff; color: #0f766e; font-weight: 800; font-size: 11pt; padding: 2px 10px; border-radius: 4px; font-family: monospace;">${cat.categoryNumber}</div>
            <div>
              <div style="font-size: 14pt; font-weight: 800;">${cat.title}</div>
              <div style="font-size: 9pt; opacity: 0.9;">${cat.description}</div>
            </div>
          </div>
          ${modulesHtml}
        </div>
      `;
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html dir="${direction}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="utf-8">
        <title>${mainTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: ${isAr ? "'Cairo', sans-serif" : "'Inter', sans-serif"};
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-banner {
            border-bottom: 2px solid #0d9488;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header-logo-title {
            font-size: 16pt;
            font-weight: 900;
            color: #0f172a;
          }
          .header-meta {
            text-align: ${isAr ? 'left' : 'right'};
            font-size: 9pt;
            color: #64748b;
          }
          .summary-card {
            background: #f0fdfa;
            border: 1px solid #5eead4;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 24px;
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <div style="font-size: 10pt; font-weight: 700; color: #0d9488; text-transform: uppercase;">${orgName}</div>
            <div class="header-logo-title">${mainTitle}</div>
          </div>
          <div class="header-meta">
            <div><strong>${printDate}</strong></div>
            <div><span style="background: #e6fffa; color: #047857; padding: 2px 6px; border-radius: 4px; border: 1px solid #6ee7b7; font-weight: bold;">${totalCountText}</span></div>
          </div>
        </div>

        <div class="summary-card">
          <p style="margin: 0; font-size: 10pt; color: #134e4a; font-weight: 600;">${subTitle}</p>
        </div>

        ${categoriesHtml}

        <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 8pt; color: #94a3b8;">
          ${orgName} • ${mainTitle} • ${printDate}
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 2000);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col w-screen h-screen bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className={`w-full h-full flex flex-col overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-[#0a0c10] text-white'
            : 'bg-white text-slate-900'
        }`}
      >
        {/* Top Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 ${
            isDark ? 'bg-[#06080d] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
                isDark
                  ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/20'
                  : 'bg-teal-600 text-white shadow-teal-600/25'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isAr
                    ? 'الدليل الشامل لفهرس ووظائف موديولات النظام'
                    : 'System Modules Complete Index & Functional Guide'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                    isDark
                      ? 'bg-teal-900/60 text-teal-300 border-teal-500/30'
                      : 'bg-teal-50 text-teal-700 border-teal-300'
                  }`}
                >
                  {isAr ? `${totalModulesCount} موديول مفهرس` : `${totalModulesCount} Indexed Modules`}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {isAr
                  ? 'فهرس توضيحي مرتب يوضح وظائف ومهام كافة موديولات وأقسام المنظومة بالتفصيل.'
                  : 'Comprehensive sequentially indexed reference explaining the features and functions of all modules.'}
              </p>
            </div>
          </div>

          {/* Top Actions: Language Switcher, Print, Close */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* Language Toggle */}
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 ${
                isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-300 shadow-xs'
              }`}
            >
              <button
                onClick={() => setGuideLang('ar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isAr
                    ? 'bg-teal-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => setGuideLang('en')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isAr
                    ? 'bg-teal-600 text-white shadow-sm'
                    : isDark
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>

            {/* Print / Export Button */}
            <button
              onClick={handlePrint}
              className={`p-2 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isDark
                  ? 'bg-[#0a0c10] border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
              }`}
              title={isAr ? 'طباعة الدليل' : 'Print Guide'}
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span className="hidden sm:inline">{isAr ? 'طباعة' : 'Print'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900'
              }`}
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Search Bar Strip */}
        <div
          className={`p-3 px-4 sm:px-6 border-b shrink-0 ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className="relative">
            <span
              className={`material-symbols-outlined absolute ${
                isAr ? 'right-3.5' : 'left-3.5'
              } top-2.5 text-teal-500 text-lg`}
            >
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? 'ابحث في أسماء الموديولات، الوظائف، أو المهام التفصيلية...'
                  : 'Search across module names, functions, or specific capabilities...'
              }
              className={`w-full rounded-xl ${
                isAr ? 'pr-11 pl-10' : 'pl-11 pr-10'
              } py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDark
                  ? 'bg-[#06080d] border border-white/10 text-slate-200 placeholder:text-slate-500'
                  : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className={`absolute ${
                  isAr ? 'left-3' : 'right-3'
                } top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
              >
                <span className="material-symbols-outlined text-base">cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Body: Two Columns (Left Index Sidebar + Right Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Index / Table of Contents Sidebar */}
          <div
            className={`w-64 sm:w-72 md:w-80 border-e overflow-y-auto p-3 shrink-0 hidden lg:block ${
              isDark ? 'bg-[#06080d] border-white/10' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-3 px-2">
              <span className="material-symbols-outlined text-teal-500 text-sm">format_list_numbered</span>
              <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAr ? 'فهرس الموديولات' : 'Modules Table of Contents'}
              </span>
            </div>

            <div className="space-y-1.5">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => scrollToCategory(cat.id)}
                    className={`w-full text-start p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-teal-600 text-white font-bold shadow-md'
                        : isDark
                        ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : isDark
                          ? 'bg-slate-800 text-teal-400'
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}
                    >
                      {cat.categoryNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate leading-tight">{cat.title}</p>
                      <p
                        className={`text-[10px] mt-0.5 truncate ${
                          isSelected ? 'text-teal-100' : isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {isAr ? `${cat.modules.length} موديول` : `${cat.modules.length} Modules`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Scrollable Content Area */}
          <div
            ref={contentContainerRef}
            className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8 ${
              isDark ? 'bg-[#0a0c10]' : 'bg-white'
            }`}
          >
            {filteredCategories.length === 0 ? (
              <div
                className={`text-center py-20 rounded-3xl border ${
                  isDark ? 'bg-slate-900/40 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <span className="material-symbols-outlined text-6xl mb-3 block text-slate-500">search_off</span>
                <p className="text-base font-bold">
                  {isAr ? 'لم يتم العثور على موديولات مطابقة للبحث' : 'No matching modules found'}
                </p>
                <p className="text-xs mt-1">
                  {isAr ? 'يرجى تجربة كلمات بحث أخرى.' : 'Please try different search keywords.'}
                </p>
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  id={`guide-cat-${cat.id}`}
                  className={`rounded-3xl border p-5 sm:p-6 transition-all ${
                    isDark
                      ? 'bg-[#06080d] border-white/10 shadow-xl'
                      : 'bg-slate-50/70 border-slate-200 shadow-sm'
                  }`}
                >
                  {/* Category Banner */}
                  <div className="flex items-center gap-3.5 pb-4 border-b border-teal-500/20 mb-6">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 shadow-md ${
                        isDark
                          ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/40 text-teal-300'
                          : 'bg-teal-600 text-white shadow-teal-600/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                            isDark ? 'bg-teal-950 text-teal-300 border border-teal-500/30' : 'bg-teal-100 text-teal-800'
                          }`}
                        >
                          {isAr ? `القسم ${cat.categoryNumber}` : `Category ${cat.categoryNumber}`}
                        </span>
                        <h3 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {cat.title}
                        </h3>
                      </div>
                      <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  {/* Modules Grid */}
                  <div className="grid grid-cols-1 gap-5">
                    {cat.modules.map((mod) => (
                      <div
                        key={mod.id}
                        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                          isDark
                            ? 'bg-[#0a0c10] border-white/10 hover:border-teal-500/40 text-white'
                            : 'bg-white border-slate-200 hover:border-teal-400 text-slate-900 shadow-xs'
                        }`}
                      >
                        {/* Module Title Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5 dark:border-white/5 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-200'
                              }`}
                            >
                              {mod.number}
                            </span>
                            <h4 className="font-bold text-sm sm:text-base leading-snug">
                              {mod.title}
                            </h4>
                          </div>
                          <span
                            className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full self-start sm:self-auto ${
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isAr ? `${mod.functions.length} وظائف أساسية` : `${mod.functions.length} Core Functions`}
                          </span>
                        </div>

                        {/* Summary */}
                        <p className={`text-xs font-medium mb-3.5 ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>
                          {mod.summary}
                        </p>

                        {/* Functions Bullet Points */}
                        <ul className="space-y-2 text-xs">
                          {mod.functions.map((fn, idx) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-2.5 leading-relaxed ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0"></span>
                              <span>{fn}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Footer Strip */}
        <div
          className={`p-3 sm:p-4 px-6 border-t flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs ${
            isDark ? 'bg-[#06080d] border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {isAr
                ? 'فهرس ودليل موحد لجميع موديولات منظومة فيتاس العراق للموارد البشرية'
                : 'Unified Index & Official Guide for VITAS Iraq HRMS Modules'}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-xl font-bold transition-all ${
              isDark
                ? 'bg-teal-600 hover:bg-teal-500 text-white'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-xs'
            }`}
          >
            {isAr ? 'إغلاق الدليل' : 'Close Guide'}
          </button>
        </div>
      </div>
    </div>
  );
};
