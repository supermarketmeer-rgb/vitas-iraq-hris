import React from 'react';
import { Filter, RotateCcw, Search, Check } from 'lucide-react';
import { FilterState, Language } from '../types/hr';
import { getAvailableOffices, getAvailableDepartments } from '../services/reportingEngine';

interface AdditionalFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  language: Language;
}

export const AdditionalFilters: React.FC<AdditionalFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  language
}) => {
  const isAr = language === 'ar';
  const offices = getAvailableOffices();
  const departments = getAvailableDepartments();

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'الفلاتر التفصيلية والبحث' : 'Operational & Demographic Filters'}
          </h3>
        </div>

        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{isAr ? 'إعادة ضبط' : 'Reset All'}</span>
        </button>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
        {/* Office / Branch */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'المكتب / الفرع' : 'Branch / Office'}
          </label>
          <select
            value={filters.office}
            onChange={(e) => onFilterChange({ office: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">{isAr ? 'كافة المكاتب (All)' : 'All Offices'}</option>
            {offices.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'القسم' : 'Department'}
          </label>
          <select
            value={filters.department}
            onChange={(e) => onFilterChange({ department: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">{isAr ? 'كافة الأقسام (All)' : 'All Departments'}</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Category (Office Job / Field Job) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'فئة العمل' : 'Category'}
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange({ category: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">{isAr ? 'الكل (مكتبي وميداني)' : 'All (Office & Field)'}</option>
            <option value="Office Job">{isAr ? 'موظف مكتبي (Office Job)' : 'Office Job'}</option>
            <option value="Field Job">{isAr ? 'موظف ميداني (Field Job)' : 'Field Job'}</option>
          </select>
        </div>

        {/* Management Tier */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'المستوى الإداري' : 'Management Tier'}
          </label>
          <select
            value={filters.tier}
            onChange={(e) => onFilterChange({ tier: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">{isAr ? 'كافة المستويات' : 'All Tiers'}</option>
            <option value="Non Management">{isAr ? 'كادر تشغيلي' : 'Non Management'}</option>
            <option value="Middle Management">{isAr ? 'إدارة وسطى' : 'Middle Management'}</option>
            <option value="Senior Management">{isAr ? 'إدارة عليا' : 'Senior Management'}</option>
          </select>
        </div>

        {/* Gender */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'الجنس' : 'Gender'}
          </label>
          <select
            value={filters.gender}
            onChange={(e) => onFilterChange({ gender: e.target.value })}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="All">{isAr ? 'الكل' : 'All'}</option>
            <option value="Male">{isAr ? 'ذكور' : 'Male'}</option>
            <option value="Female">{isAr ? 'إناث' : 'Female'}</option>
          </select>
        </div>

        {/* Live Search */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            {isAr ? 'بحث سريع' : 'Keyword Search'}
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 left-2.5 rtl:left-auto rtl:right-2.5" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
              placeholder={isAr ? 'اسم، مسمى، رقم...' : 'Name, title...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2.5 rtl:pl-2.5 rtl:pr-7 py-1.5 text-slate-900 dark:text-slate-100 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
