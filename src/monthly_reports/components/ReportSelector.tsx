import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { REPORT_CATALOG } from '../data/reportCatalog';
import { ReportDefinition, Language, ReportCategory } from '../types/hr';

interface ReportSelectorProps {
  selectedReport: ReportDefinition;
  onSelectReport: (report: ReportDefinition) => void;
  language: Language;
}

export const ReportSelector: React.FC<ReportSelectorProps> = ({
  selectedReport,
  onSelectReport,
  language
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'ALL'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAr = language === 'ar';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories: Array<{ id: ReportCategory | 'ALL'; labelEn: string; labelAr: string }> = [
    { id: 'ALL', labelEn: 'All Reports', labelAr: 'كافة التقارير' },
    { id: 'WORKBOOKS', labelEn: 'Attached Workbooks', labelAr: 'مصنفات الإكسل المرفقة' },
    { id: 'MANAGEMENT', labelEn: 'Management', labelAr: 'تقارير الإدارة' },
    { id: 'EMPLOYEE', labelEn: 'Employees', labelAr: 'الموظفون' },
    { id: 'PAYROLL', labelEn: 'Payroll', labelAr: 'الرواتب والأجور' },
    { id: 'INCENTIVES', labelEn: 'Incentives', labelAr: 'الحوافز والمكافآت' },
    { id: 'TURNOVER', labelEn: 'Turnover', labelAr: 'دوران الكادر' },
    { id: 'ATTENDANCE', labelEn: 'Attendance', labelAr: 'الدوام والحضور' }
  ];

  const filteredReports = REPORT_CATALOG.filter(r => {
    if (categoryFilter !== 'ALL' && r.category !== categoryFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.titleEn.toLowerCase().includes(q) ||
      r.titleAr.toLowerCase().includes(q) ||
      r.descriptionEn.toLowerCase().includes(q) ||
      r.descriptionAr.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Active Report Banner / Trigger */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-400 dark:hover:border-teal-600 rounded-xl p-3.5 shadow-2xs cursor-pointer transition-all flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                selectedReport.category === 'WORKBOOKS'
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}>
                {selectedReport.category === 'WORKBOOKS' 
                  ? (isAr ? 'مصنف إكسل مطابق' : 'Exact Workbook')
                  : selectedReport.category}
              </span>
              {selectedReport.supportLevel === 'PARTIAL' && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {isAr ? 'مدعوم جزئياً' : 'Partially Supported'}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
              {isAr ? selectedReport.titleAr : selectedReport.titleEn}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-2xl">
              {isAr ? selectedReport.descriptionAr : selectedReport.descriptionEn}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-block text-xs font-medium text-slate-400 dark:text-slate-500">
            {isAr ? 'انقر لتغيير التقرير' : 'Change Report'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>

      {/* Dropdown ComboBox Overlay */}
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 max-h-[520px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-100">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'ابحث عن اسم التقرير، الكلمات المفتاحية...' : 'Search reports by name or keyword...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === c.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {isAr ? c.labelAr : c.labelEn}
              </button>
            ))}
          </div>

          {/* Reports List */}
          <div className="overflow-y-auto space-y-1.5 max-h-[360px] custom-scrollbar pr-1">
            {filteredReports.map((report) => {
              const isSelected = report.id === selectedReport.id;
              return (
                <div
                  key={report.id}
                  onClick={() => {
                    onSelectReport(report);
                    setIsOpen(false);
                  }}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        report.category === 'WORKBOOKS'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {report.category === 'WORKBOOKS' ? (isAr ? 'مصنف مطابق' : 'Workbook') : report.category}
                      </span>
                      {report.supportLevel === 'PARTIAL' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">
                          {isAr ? 'جزئي' : 'Partial'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {isAr ? report.titleAr : report.titleEn}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {isAr ? report.descriptionAr : report.descriptionEn}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {filteredReports.length === 0 && (
              <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">
                {isAr ? 'لا توجد تقارير مطابقة لبحثك' : 'No reports found matching your query'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
