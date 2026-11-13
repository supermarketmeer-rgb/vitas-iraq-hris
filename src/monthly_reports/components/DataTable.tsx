import React, { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Columns3, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Check
} from 'lucide-react';
import { ReportDefinition, Language } from '../types/hr';
import { formatCurrencyIQD, formatNumber, formatPercent } from '../services/reportingEngine';

interface DataTableProps {
  report: ReportDefinition;
  data: any[];
  selectedColumns: string[];
  onToggleColumn: (colKey: string) => void;
  onResetColumns: () => void;
  language: Language;
}

export const DataTable: React.FC<DataTableProps> = ({
  report,
  data,
  selectedColumns,
  onToggleColumn,
  onResetColumns,
  language
}) => {
  const isAr = language === 'ar';
  const [sortKey, setSortKey] = useState<string>(report.defaultSort?.key || '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(report.defaultSort?.direction || 'asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  // Active column definitions
  const activeColumns = useMemo(() => {
    return selectedColumns
      .map(key => report.columns.find(c => c.key === key))
      .filter(Boolean) as typeof report.columns;
  }, [report, selectedColumns]);

  // Handle column sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [data, sortKey, sortDir]);

  // Pagination calculation
  const totalRecords = sortedData.length;
  const effectivePageSize = pageSize === -1 ? totalRecords : pageSize;
  const totalPages = Math.ceil(totalRecords / (effectivePageSize || 1)) || 1;
  const paginatedData = useMemo(() => {
    if (pageSize === -1) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Summary Totals Row
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    activeColumns.forEach(col => {
      if (col.type === 'currency' || col.type === 'number') {
        const sum = data.reduce((acc, row) => {
          const raw = row[col.key];
          const num = typeof raw === 'number' ? raw : (parseFloat(String(raw).replace(/[^0-9.-]/g, '')) || 0);
          return acc + (isNaN(num) ? 0 : num);
        }, 0);
        totals[col.key] = sum;
      }
    });
    return totals;
  }, [data, activeColumns]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden flex flex-col">
      
      {/* Table Toolbar */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        
        {/* Left: Record count */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {isAr ? 'نتائج التقرير:' : 'Report Records:'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400">
            {formatNumber(totalRecords)} {isAr ? 'سجل' : 'rows'}
          </span>
        </div>

        {/* Right: Controls & Column Selector */}
        <div className="flex items-center gap-2.5">
          
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <span className="hidden sm:inline">{isAr ? 'عرض:' : 'Show:'}</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="-1">{isAr ? 'الكل (All)' : 'All'}</option>
            </select>
          </div>

          {/* Show / Hide Columns Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            >
              <Columns3 className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAr ? 'الأعمدة' : 'Columns'}</span>
              <span className="text-[10px] px-1.5 rounded-full bg-slate-200 dark:bg-slate-700 font-mono">
                {activeColumns.length}
              </span>
            </button>

            {isColumnDropdownOpen && (
              <div className="absolute z-30 top-full mt-1 right-0 rtl:right-auto rtl:left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-2.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {isAr ? 'إظهار / إخفاء الأعمدة' : 'Customize Columns'}
                  </span>
                  <button
                    onClick={onResetColumns}
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    {isAr ? 'استعادة الافتراضي' : 'Reset'}
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                  {report.columns.map(col => {
                    const isChecked = selectedColumns.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleColumn(col.key)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">
                          {col.headerEn}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Main Table Viewport */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left rtl:text-right border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700/80 font-semibold select-none">
              {activeColumns.map((col, idx) => {
                const isSorted = sortKey === col.key;
                const isNumeric = col.type === 'currency' || col.type === 'number' || col.type === 'percent';
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{ minWidth: col.width || 120 }}
                    className={`px-3.5 py-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors whitespace-nowrap ${
                      isNumeric ? 'text-right rtl:text-right' : 'text-left rtl:text-right'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 ${isNumeric ? 'justify-end' : 'justify-start'}`}>
                      <span>{col.headerEn}</span>
                      <span className="text-slate-400">
                        {isSorted ? (
                          sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {paginatedData.map((row, rowIdx) => {
              const isZebra = rowIdx % 2 === 1;
              return (
                <tr
                  key={row.id || rowIdx}
                  className={`hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-colors ${
                    isZebra ? 'bg-slate-50/40 dark:bg-slate-800/20' : ''
                  }`}
                >
                  {activeColumns.map((col) => {
                    const rawVal = row[col.key];
                    const isNumeric = col.type === 'currency' || col.type === 'number' || col.type === 'percent';

                    let formattedVal = rawVal;
                    if (col.type === 'currency') {
                      formattedVal = formatCurrencyIQD(rawVal);
                    } else if (col.type === 'number') {
                      formattedVal = formatNumber(rawVal);
                    } else if (col.type === 'percent') {
                      formattedVal = typeof rawVal === 'number' ? formatPercent(rawVal) : rawVal;
                    } else if (col.type === 'date' && rawVal) {
                      formattedVal = String(rawVal).substring(0, 10);
                    }

                    return (
                      <td
                        key={col.key}
                        className={`px-3.5 py-2.5 whitespace-nowrap text-slate-800 dark:text-slate-200 ${
                          isNumeric ? 'text-right font-mono tabular-nums font-medium' : ''
                        }`}
                      >
                        {formattedVal !== undefined && formattedVal !== null && formattedVal !== '' ? (
                          formattedVal
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {paginatedData.length === 0 && (
              <tr>
                <td colSpan={activeColumns.length} className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <div className="max-w-sm mx-auto space-y-1">
                    <p className="font-semibold text-sm">{isAr ? 'لا توجد بيانات مطابقة' : 'No Matching Records Found'}</p>
                    <p className="text-xs">{isAr ? 'يرجى تجربة تعديل الفلاتر أو مسح كلمات البحث' : 'Try adjusting your filters or clearing search criteria.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>

          {/* Grand Totals Summary Row */}
          {paginatedData.length > 0 && Object.keys(columnTotals).length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100">
                {activeColumns.map((col, idx) => {
                  const hasTotal = columnTotals[col.key] !== undefined;
                  const isNumeric = col.type === 'currency' || col.type === 'number';

                  if (idx === 0) {
                    return (
                      <td key={col.key} className="px-3.5 py-3 whitespace-nowrap uppercase tracking-wider text-xs">
                        {isAr ? 'الإجمالي العام' : 'Grand Total'}
                      </td>
                    );
                  }

                  if (hasTotal) {
                    return (
                      <td key={col.key} className="px-3.5 py-3 whitespace-nowrap text-right font-mono tabular-nums text-xs font-bold text-teal-700 dark:text-teal-400">
                        {col.type === 'currency' ? formatCurrencyIQD(columnTotals[col.key]) : formatNumber(columnTotals[col.key])}
                      </td>
                    );
                  }

                  return <td key={col.key} className="px-3.5 py-3"></td>;
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          {isAr ? (
            <span>
              عرض الصفحة <span className="font-semibold font-mono text-slate-900 dark:text-white">{currentPage}</span> من <span className="font-semibold font-mono text-slate-900 dark:text-white">{totalPages}</span>
            </span>
          ) : (
            <span>
              Showing Page <span className="font-semibold font-mono text-slate-900 dark:text-white">{currentPage}</span> of <span className="font-semibold font-mono text-slate-900 dark:text-white">{totalPages}</span>
            </span>
          )}
        </div>

        {/* Prev / Next controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
          </button>

          <span className="px-2 font-mono font-medium">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
};
