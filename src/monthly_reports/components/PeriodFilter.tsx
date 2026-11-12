import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { FilterState, Language } from '../types/hr';
import { getAvailableMonths } from '../services/reportingEngine';

interface PeriodFilterProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  language: Language;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  filters,
  onFilterChange,
  language
}) => {
  const isAr = language === 'ar';
  const availableMonths = getAvailableMonths();

  const presets = [
    { id: 'month', labelEn: 'This Month (Oct 2026)', labelAr: 'الشهر الحالي (تشرين الأول 2026)', month: '2026-10' },
    { id: 'prev_month', labelEn: 'Previous Month (Sep 2026)', labelAr: 'الشهر السابق (أيلول 2026)', month: '2026-09' },
    { id: 'q3', labelEn: 'Q3 2026', labelAr: 'الربع الثالث 2026', month: '2026-09' },
    { id: 'q2', labelEn: 'Q2 2026', labelAr: 'الربع الثاني 2026', month: '2026-06' },
    { id: 'ytd', labelEn: 'Year to Date 2026', labelAr: 'منذ بداية عام 2026', month: '2026-10' },
    { id: 'prev_year', labelEn: 'FY 2025', labelAr: 'السنة المالية 2025', month: '2025-10' },
    { id: 'custom', labelEn: 'Custom Range', labelAr: 'فترة مخصصة', month: filters.selectedMonth }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'تحديد الفترة الزمنية للتقرير' : 'Reporting Period & Date Filters'}
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {filters.selectedMonth}
        </span>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {presets.map((preset) => {
          const isActive = filters.selectedMonth === preset.month && filters.periodType === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => {
                onFilterChange({
                  periodType: preset.id as any,
                  selectedMonth: preset.month
                });
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 dark:bg-teal-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {isAr ? preset.labelAr : preset.labelEn}
            </button>
          );
        })}
      </div>

      {/* Selectors Grid: Month, Year, Custom Dates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
        {/* Month Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'الشهر المالي' : 'Fiscal Month'}
          </label>
          <select
            value={filters.selectedMonth}
            onChange={(e) => onFilterChange({ selectedMonth: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m} {m === '2026-10' ? (isAr ? '(الأحدث - تشرين 2026)' : '(Latest)') : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'السنة المالية' : 'Fiscal Year'}
          </label>
          <select
            value={filters.selectedYear}
            onChange={(e) => {
              const yr = e.target.value;
              onFilterChange({ 
                selectedYear: yr,
                selectedMonth: `${yr}-10`
              });
            }}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="2026">FY 2026</option>
            <option value="2025">FY 2025</option>
            <option value="2024">FY 2024</option>
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'من تاريخ' : 'From Date'}
          </label>
          <input
            type="date"
            value={filters.fromDate}
            onChange={(e) => onFilterChange({ fromDate: e.target.value, periodType: 'custom' })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'إلى تاريخ' : 'To Date'}
          </label>
          <input
            type="date"
            value={filters.toDate}
            onChange={(e) => onFilterChange({ toDate: e.target.value, periodType: 'custom' })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>
    </div>
  );
};
