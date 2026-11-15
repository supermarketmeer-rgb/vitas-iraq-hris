import React, { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import reportRawData from '../../data/leaveBalanceReportData.json';
import { saveExcelWithSaveDialog } from '../../utils/payrollExcelHelper';
import { Language } from './types';

export interface LeaveBalanceRow {
  sn: number;
  empId: number;
  empStatus: string;
  employeeCode: string;
  branch: string;
  fullName: string;
  joinDate: string;
  currentBasicSalary: number;
  monthlyLeaveProvision: number;
  monthlyEndOfServiceBonus: number;
  openingBalance: number;
  yearlyDays: number;
  totalBalance: number;
  consumed: number;
  earnedDays: number;
  balanceTillToday: number;
  balanceTillEndOfYear: number;
}

interface LeaveBalanceReportViewProps {
  lang?: Language;
  onNavigate?: (tab: string) => void;
}

export const LeaveBalanceReportView: React.FC<LeaveBalanceReportViewProps> = ({
  lang = 'ar',
  onNavigate,
}) => {
  const isAr = lang === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortField, setSortField] = useState<keyof LeaveBalanceRow>('sn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);

  const initialRows: LeaveBalanceRow[] = useMemo(() => {
    return (reportRawData.rows || []) as LeaveBalanceRow[];
  }, []);

  // Distinct branches
  const branches = useMemo(() => {
    const set = new Set<string>();
    initialRows.forEach((r) => {
      if (r.branch) set.add(r.branch);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [initialRows]);

  // Distinct statuses
  const statuses = useMemo(() => {
    const set = new Set<string>();
    initialRows.forEach((r) => {
      if (r.empStatus) set.add(r.empStatus);
    });
    return Array.from(set);
  }, [initialRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return initialRows.filter((row) => {
      if (selectedBranch !== 'ALL' && row.branch !== selectedBranch) return false;
      if (selectedStatus !== 'ALL' && row.empStatus !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (row.fullName || '').toLowerCase().includes(q);
        const matchCode = (row.employeeCode || '').toLowerCase().includes(q);
        const matchId = String(row.empId || '').includes(q);
        const matchBranch = (row.branch || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchId && !matchBranch) return false;
      }
      return true;
    });
  }, [initialRows, selectedBranch, selectedStatus, searchQuery]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    const list = [...filteredRows];
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    return list;
  }, [filteredRows, sortField, sortOrder]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return sortedRows; // All
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedRows.length / pageSize);

  // Filtered Totals
  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        acc.currentBasicSalary += r.currentBasicSalary || 0;
        acc.monthlyLeaveProvision += r.monthlyLeaveProvision || 0;
        acc.monthlyEndOfServiceBonus += r.monthlyEndOfServiceBonus || 0;
        acc.openingBalance += r.openingBalance || 0;
        acc.yearlyDays += r.yearlyDays || 0;
        acc.totalBalance += r.totalBalance || 0;
        acc.consumed += r.consumed || 0;
        acc.earnedDays += r.earnedDays || 0;
        acc.balanceTillToday += r.balanceTillToday || 0;
        acc.balanceTillEndOfYear += r.balanceTillEndOfYear || 0;
        return acc;
      },
      {
        currentBasicSalary: 0,
        monthlyLeaveProvision: 0,
        monthlyEndOfServiceBonus: 0,
        openingBalance: 0,
        yearlyDays: 0,
        totalBalance: 0,
        consumed: 0,
        earnedDays: 0,
        balanceTillToday: 0,
        balanceTillEndOfYear: 0,
      }
    );
  }, [filteredRows]);

  const handleSort = (field: keyof LeaveBalanceRow) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export to Excel matching the exact design
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CHF - Vitas Iraq HRMS';
      wb.created = new Date();

      const ws = wb.addWorksheet('Leave Balance Report', {
        views: [{ state: 'frozen', xSplit: 5, ySplit: 6 }],
      });

      // Title rows
      ws.addRow(['CHF - Vitas Iraq']);
      ws.addRow(['Leave Balance Report']);
      ws.addRow([]);
      ws.addRow(['', '', '', '', '', 'Till: 2026-10-01']);
      ws.addRow([]);

      // Row 1 & 2 styles
      ws.getRow(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF0F172A' } };
      ws.getRow(2).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0284C7' } };
      ws.getRow(4).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };

      // Table Header Row
      const headers = [
        'SN',
        'Emp ID',
        'Emp Status',
        'Employee Code',
        'Full Name',
        'Join Date',
        'Current Basic salary',
        'Monthly Leave Provision',
        'Monthly End Of service Bonus',
        'Opening Balance',
        'Yearly Days',
        'Total Balance',
        'Consumed',
        'EarnedDays',
        'Balance Till Today',
        'Balance Till End Of Year',
      ];

      const headerRow = ws.addRow(headers);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0284C7' }, // Ocean blue header
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF0369A1' } },
          bottom: { style: 'medium', color: { argb: 'FF0369A1' } },
          left: { style: 'thin', color: { argb: 'FF38BDF8' } },
          right: { style: 'thin', color: { argb: 'FF38BDF8' } },
        };
      });

      // Data Rows
      sortedRows.forEach((r, idx) => {
        const row = ws.addRow([
          r.sn,
          r.empId,
          r.empStatus,
          r.employeeCode,
          r.fullName,
          r.joinDate,
          r.currentBasicSalary,
          r.monthlyLeaveProvision,
          r.monthlyEndOfServiceBonus,
          r.openingBalance,
          r.yearlyDays,
          r.totalBalance,
          r.consumed,
          r.earnedDays,
          r.balanceTillToday,
          r.balanceTillEndOfYear,
        ]);

        const isEven = idx % 2 === 1;
        const rowBg = isEven ? 'FFF8FAFC' : 'FFFFFFFF';

        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          // Alignment & format
          if (colNumber === 1 || colNumber === 2 || colNumber === 3) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber === 4 || colNumber === 5 || colNumber === 6) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else if (colNumber === 7 || colNumber === 8 || colNumber === 9) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '#,##0';
          } else {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '0.00';
            if (colNumber === 14 && typeof cell.value === 'number' && cell.value < 0) {
              cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFDC2626' } };
            }
          }
        });
      });

      // Total Row
      const startRowIdx = 7;
      const endRowIdx = 6 + sortedRows.length;
      const totalRow = ws.addRow([
        'Total:',
        sortedRows.length,
        '',
        '',
        '',
        '',
        { formula: `SUM(G${startRowIdx}:G${endRowIdx})` },
        { formula: `SUM(H${startRowIdx}:H${endRowIdx})` },
        { formula: `SUM(I${startRowIdx}:I${endRowIdx})` },
        { formula: `SUM(J${startRowIdx}:J${endRowIdx})` },
        { formula: `SUM(K${startRowIdx}:K${endRowIdx})` },
        { formula: `SUM(L${startRowIdx}:L${endRowIdx})` },
        { formula: `SUM(M${startRowIdx}:M${endRowIdx})` },
        { formula: `SUM(N${startRowIdx}:N${endRowIdx})` },
        { formula: `SUM(O${startRowIdx}:O${endRowIdx})` },
        { formula: `SUM(P${startRowIdx}:P${endRowIdx})` },
      ]);
      totalRow.height = 24;

      totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        };
        if (colNumber >= 7 && colNumber <= 9) {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else if (colNumber > 9) {
          cell.numFmt = '0.00';
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Auto-fit column widths
      ws.columns.forEach((col, idx) => {
        if (!col) return;
        if (idx === 0) col.width = 6;
        else if (idx === 1) col.width = 10;
        else if (idx === 2) col.width = 12;
        else if (idx === 3) col.width = 20;
        else if (idx === 4) col.width = 28;
        else if (idx === 5) col.width = 13;
        else if (idx === 6) col.width = 18;
        else if (idx === 7) col.width = 20;
        else if (idx === 8) col.width = 22;
        else col.width = 15;
      });

      await saveExcelWithSaveDialog(wb, `Leave_Balance_Report_2026-10-01.xlsx`);
    } catch (e: any) {
      console.error('Error exporting Excel:', e);
      alert(isAr ? `فشل تصدير الإكسل: ${e.message}` : `Export failed: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* ── Top Header & Actions ── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-sky-900 via-cyan-900 to-slate-900 text-white shadow-xl border border-sky-700/40">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-sky-500/20 border border-sky-400/30 text-sky-300 shadow-inner">
              <span className="material-symbols-outlined text-3xl">fact_check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-400/20 text-sky-200 border border-sky-400/30">
                  CHF - Vitas Iraq
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Till: 2026-10-01
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white mt-1">
                {isAr ? 'تقرير رصيد الإجازات ومكافأة نهاية الخدمة' : 'Leave Balance & End of Service Report'}
              </h1>
              <p className="text-xs text-sky-200/80 mt-1">
                {isAr
                  ? 'التقرير المعتمد لمؤسسة فيتاس العراق لاحتساب أرصدة الإجازات، المخصص الشهري، ومكافأة نهاية الخدمة لـ 351 موظفاً'
                  : 'Official CHF - Vitas Iraq staff leave balances, monthly provisions, and end-of-service bonuses'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">
                {isExporting ? 'hourglass_top' : 'download'}
              </span>
              <span>{isAr ? 'تصدير إكسل مطابق' : 'Export Excel'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>{isAr ? 'طباعة / PDF' : 'Print / PDF'}</span>
            </button>

            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('leave-earned')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                  <span>{isAr ? 'الإجازات المستحقة' : 'Earned Leaves'}</span>
                </button>

                <button
                  onClick={() => onNavigate('leave-dashboard')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">dashboard</span>
                  <span>{isAr ? 'لوحة التحكم' : 'Dashboard'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Employees */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isAr ? 'عدد الموظفين' : 'Employees'}
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
            {filteredRows.length} <span className="text-xs font-normal text-slate-400">/ {initialRows.length}</span>
          </span>
          <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-0.5 block">
            {isAr ? 'موظف في التقرير' : 'In report'}
          </span>
        </div>

        {/* Total Basic Salaries */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isAr ? 'إجمالي الرواتب الأساسية' : 'Total Basic Salary'}
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
            {Math.round(filteredTotals.currentBasicSalary).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">IQD</span>
        </div>

        {/* Monthly Leave Provision */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isAr ? 'مخصص الإجازات الشهري' : 'Leave Provision'}
          </span>
          <span className="text-xl font-black text-sky-600 dark:text-sky-400 mt-1 block">
            {Math.round(filteredTotals.monthlyLeaveProvision).toLocaleString()}
          </span>
          <span className="text-[10px] text-sky-500 font-medium mt-0.5 block">IQD</span>
        </div>

        {/* End of Service Bonus */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isAr ? 'مكافأة نهاية الخدمة' : 'End of Service Bonus'}
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {Math.round(filteredTotals.monthlyEndOfServiceBonus).toLocaleString()}
          </span>
          <span className="text-[10px] text-amber-500 font-medium mt-0.5 block">IQD</span>
        </div>

        {/* Balance Till Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isAr ? 'الرصيد حتى تاريخ اليوم' : 'Balance Till Today'}
          </span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {filteredTotals.balanceTillToday.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <span className="text-[10px] text-emerald-600/80 font-medium mt-0.5 block">
            {isAr ? 'يوم مستحق' : 'Days'}
          </span>
        </div>

        {/* Balance Till End Of Year */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {isAr ? 'الرصيد حتى نهاية السنة' : 'Balance End of Year'}
          </span>
          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
            {filteredTotals.balanceTillEndOfYear.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </span>
          <span className="text-[10px] text-indigo-600/80 font-medium mt-0.5 block">
            {isAr ? 'يوم لنهاية السنة' : 'Days projected'}
          </span>
        </div>
      </div>

      {/* ── Filters & Controls ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={isAr ? 'البحث بالاسم، المعرف، الكود، أو الفرع...' : 'Search by name, ID, code, branch...'}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Branch filter */}
          <div className="min-w-[170px]">
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">
                {isAr ? 'كافة الفروع والمكاتب' : 'All Branches'}
              </option>
              {branches.map((b) => (
                <option key={b} value={b} className="bg-white dark:bg-slate-900">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="min-w-[130px]">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">
                {isAr ? 'كافة الحالات' : 'All Statuses'}
              </option>
              {statuses.map((s) => (
                <option key={s} value={s} className="bg-white dark:bg-slate-900">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Page size */}
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span>{isAr ? 'عرض:' : 'Show:'}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="0">{isAr ? 'الكل (351)' : 'All (351)'}</option>
          </select>
        </div>
      </div>

      {/* ── Main Data Table ── */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right dir-rtl">
            <thead className="bg-[#0284c7] text-white font-bold text-[11px] uppercase tracking-wider select-none">
              <tr>
                <th
                  onClick={() => handleSort('sn')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  SN
                </th>
                <th
                  onClick={() => handleSort('empId')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Emp ID
                </th>
                <th
                  onClick={() => handleSort('empStatus')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Status
                </th>
                <th
                  onClick={() => handleSort('employeeCode')}
                  className="p-3 text-right cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Employee Code
                </th>
                <th
                  onClick={() => handleSort('fullName')}
                  className="p-3 text-right cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Full Name
                </th>
                <th
                  onClick={() => handleSort('joinDate')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Join Date
                </th>
                <th
                  onClick={() => handleSort('currentBasicSalary')}
                  className="p-3 text-right cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Basic Salary
                </th>
                <th
                  onClick={() => handleSort('monthlyLeaveProvision')}
                  className="p-3 text-right cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Monthly Provision
                </th>
                <th
                  onClick={() => handleSort('monthlyEndOfServiceBonus')}
                  className="p-3 text-right cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  End of Service
                </th>
                <th
                  onClick={() => handleSort('openingBalance')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Opening
                </th>
                <th
                  onClick={() => handleSort('yearlyDays')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Yearly
                </th>
                <th
                  onClick={() => handleSort('totalBalance')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Total Balance
                </th>
                <th
                  onClick={() => handleSort('consumed')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Consumed
                </th>
                <th
                  onClick={() => handleSort('earnedDays')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Earned Days
                </th>
                <th
                  onClick={() => handleSort('balanceTillToday')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  Till Today
                </th>
                <th
                  onClick={() => handleSort('balanceTillEndOfYear')}
                  className="p-3 text-center cursor-pointer hover:bg-sky-600 transition-colors"
                >
                  End of Year
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {paginatedRows.map((r, idx) => {
                const isEven = idx % 2 === 1;
                return (
                  <tr
                    key={r.sn}
                    className={`hover:bg-sky-50/60 dark:hover:bg-sky-950/30 transition-colors ${
                      isEven ? 'bg-slate-50/50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900/10'
                    }`}
                  >
                    <td className="p-2.5 text-center text-slate-500 font-sans text-xs">{r.sn}</td>
                    <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                      {r.empId}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        {r.empStatus}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-sans text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {r.employeeCode}
                    </td>
                    <td className="p-2.5 text-right font-sans font-bold text-slate-900 dark:text-white">
                      {r.fullName}
                    </td>
                    <td className="p-2.5 text-center text-slate-500 text-[11px]">{r.joinDate}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900 dark:text-slate-100">
                      {Math.round(r.currentBasicSalary).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-semibold text-sky-700 dark:text-sky-300">
                      {Math.round(r.monthlyLeaveProvision).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-right font-semibold text-amber-700 dark:text-amber-300">
                      {Math.round(r.monthlyEndOfServiceBonus).toLocaleString()}
                    </td>
                    <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">
                      {r.openingBalance.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">
                      {r.yearlyDays.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center font-bold text-slate-900 dark:text-white">
                      {r.totalBalance.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center text-rose-600 dark:text-rose-400 font-semibold">
                      {r.consumed > 0 ? `(${r.consumed.toFixed(2)})` : '0.00'}
                    </td>
                    <td
                      className={`p-2.5 text-center font-bold ${
                        r.earnedDays < 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {r.earnedDays.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
                      {r.balanceTillToday.toFixed(2)}
                    </td>
                    <td className="p-2.5 text-center font-black text-indigo-700 dark:text-indigo-400 bg-indigo-500/5">
                      {r.balanceTillEndOfYear.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Total Row */}
            <tfoot className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border-t-2 border-slate-300 dark:border-slate-700 font-mono text-xs">
              <tr>
                <td className="p-3 text-center" colSpan={6}>
                  <div className="flex items-center justify-between px-2 font-black font-sans">
                    <span>{isAr ? 'الإجمالي العام المعتمد (Total):' : 'Grand Total:'}</span>
                    <span className="text-slate-500">
                      {filteredRows.length} {isAr ? 'موظف' : 'employees'}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-right font-black text-slate-900 dark:text-white">
                  {Math.round(filteredTotals.currentBasicSalary).toLocaleString()}
                </td>
                <td className="p-3 text-right font-black text-sky-700 dark:text-sky-300">
                  {Math.round(filteredTotals.monthlyLeaveProvision).toLocaleString()}
                </td>
                <td className="p-3 text-right font-black text-amber-700 dark:text-amber-300">
                  {Math.round(filteredTotals.monthlyEndOfServiceBonus).toLocaleString()}
                </td>
                <td className="p-3 text-center text-slate-700 dark:text-slate-300">
                  {filteredTotals.openingBalance.toFixed(2)}
                </td>
                <td className="p-3 text-center text-slate-700 dark:text-slate-300">
                  {filteredTotals.yearlyDays.toFixed(2)}
                </td>
                <td className="p-3 text-center font-black text-slate-900 dark:text-white">
                  {filteredTotals.totalBalance.toFixed(2)}
                </td>
                <td className="p-3 text-center text-rose-600 dark:text-rose-400 font-black">
                  {filteredTotals.consumed.toFixed(2)}
                </td>
                <td className="p-3 text-center font-black text-slate-800 dark:text-slate-200">
                  {filteredTotals.earnedDays.toFixed(2)}
                </td>
                <td className="p-3 text-center font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                  {filteredTotals.balanceTillToday.toFixed(2)}
                </td>
                <td className="p-3 text-center font-black text-indigo-700 dark:text-indigo-400 bg-indigo-500/10">
                  {filteredTotals.balanceTillEndOfYear.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pageSize > 0 && totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              {isAr
                ? `عرض ${(currentPage - 1) * pageSize + 1} إلى ${Math.min(
                    currentPage * pageSize,
                    sortedRows.length
                  )} من أصل ${sortedRows.length} سجل`
                : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
                    currentPage * pageSize,
                    sortedRows.length
                  )} of ${sortedRows.length}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                {isAr ? 'السابق' : 'Previous'}
              </button>
              <span className="px-3 py-1 font-bold text-slate-800 dark:text-slate-200">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
              >
                {isAr ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
