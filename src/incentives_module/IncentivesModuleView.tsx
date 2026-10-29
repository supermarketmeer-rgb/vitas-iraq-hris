import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { inspectAndExtractWorkbook, ALL_ROLES_SHEET_KEY } from './utils/excelExtractor';
import { exportExtractedDataToExcel } from './utils/excelExporter';
import { WorkbookInspectionResult, EmployeePayoutRecord, SortField, SortDirection } from './types/excelIncentives';
import { IncentivesModuleLegacyView } from './IncentivesModuleLegacyView';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Award,
  Car,
  Gift,
  Wallet,
  Link2,
  BadgeCheck,
  Send,
  History,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const IncentivesModuleView: React.FC = () => {
  const { theme, language, t, employees, setActiveModuleId } = useApp();
  const isDark = theme === 'dark';
  const isRTL = language === 'ar';

  // Toggle between New Modern Extraction Engine and Archived Legacy Screen
  const [showLegacyView, setShowLegacyView] = useState<boolean>(false);

  // Core Workbook State
  const [inspectionResult, setInspectionResult] = useState<WorkbookInspectionResult | null>(null);
  const [currentWorkbookBuffer, setCurrentWorkbookBuffer] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('LO-LOS Bouns-Incentive Dinar_Sep_26Fin.xlsx');
  const [selectedSheet, setSelectedSheet] = useState<string>(ALL_ROLES_SHEET_KEY);

  // Table Filtering, Sorting, & Pagination State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOffice, setSelectedOffice] = useState<string>('ALL');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('ALL');
  const [selectedMatchStatus, setSelectedMatchStatus] = useState<'ALL' | 'MATCHED' | 'UNMATCHED'>('ALL');
  const [sortField, setSortField] = useState<SortField>('index');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Payroll Sync State
  const [autoSyncToPayroll, setAutoSyncToPayroll] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Drag and drop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  /**
   * Helper: Cross-reference extracted Excel records with actual HRIS employees
   * Matches by:
   * 1. WAID (Incentives identifier)
   * 2. Badge No
   * 3. Employee ID
   * 4. Numeric digits match
   * 5. Full name transliterated match
   */
  const enrichRecordsWithHRIS = useCallback((rawRecords: EmployeePayoutRecord[]): EmployeePayoutRecord[] => {
    if (!employees || employees.length === 0) return rawRecords;

    const normalize = (text: string | null | undefined): string => {
      if (!text) return '';
      return String(text)
        .toLowerCase()
        .replace(/[\s\-_]+/g, ' ')
        .trim();
    };

    return rawRecords.map((record) => {
      const recIdClean = record.employeeId.trim();
      const recDigits = recIdClean.replace(/\D/g, '');
      const recNameClean = normalize(record.employeeName);

      // Search matching employee in HRIS active database
      const match = employees.find((emp) => {
        const empWaid = String(emp.waid || '').trim();
        const empBadge = String(emp.badgeNo || emp.badge_no || '').trim();
        const empId = String(emp.id || emp.employeeId || emp.employee_id || '').trim();
        const empNameAr = normalize(emp.fullName || emp.name_ar || emp.name);
        const empNameEn = normalize(emp.fullNameEn || emp.name_en);

        // 1. Direct WAID match (Specialized Incentives ID)
        if (empWaid && (empWaid === recIdClean || (recDigits && empWaid.replace(/\D/g, '') === recDigits))) {
          return true;
        }

        // 2. Direct Badge No match
        if (empBadge && (empBadge === recIdClean || (recDigits && empBadge.replace(/\D/g, '') === recDigits))) {
          return true;
        }

        // 3. Employee ID match
        if (empId && (empId === recIdClean || (recDigits && empId.replace(/\D/g, '') === recDigits))) {
          return true;
        }

        // 4. Name match (Arabic or English)
        if (recNameClean && (empNameAr.includes(recNameClean) || recNameClean.includes(empNameAr) || empNameEn.includes(recNameClean) || recNameClean.includes(empNameEn))) {
          return true;
        }

        return false;
      });

      if (match) {
        return {
          ...record,
          isMatched: true,
          matchedEmployeeId: match.id,
          matchedEmployeeName: match.fullName || match.name_ar || match.name || record.employeeName,
          matchedBadgeNo: match.badgeNo || match.badge_no || match.waid || record.employeeId,
          matchedWaid: match.waid || record.employeeId,
          matchedDepartment: match.department || match.department_ar || '',
          matchedBranch: match.branch || match.location_ar || record.office,
        };
      }

      return {
        ...record,
        isMatched: false,
      };
    });
  }, [employees]);

  /**
   * Automatically / Manually sync extracted incentives into the live Payroll system
   * Saves to `vitas_payroll_manual_adjustments` in localStorage and notifies `Category5PayrollView`
   */
  const syncToPayrollSystem = useCallback((recordsToSync: EmployeePayoutRecord[], isManual: boolean = false) => {
    try {
      const savedRaw = localStorage.getItem('vitas_payroll_manual_adjustments');
      const adjustments: Record<string, any> = savedRaw ? JSON.parse(savedRaw) : {};

      let syncedCount = 0;
      recordsToSync.forEach((rec) => {
        // Resolve target employee ID: preferably the linked HRIS employee ID, or direct record ID
        const targetId = String(rec.matchedEmployeeId || rec.employeeId);
        if (!targetId) return;

        adjustments[targetId] = {
          ...(adjustments[targetId] || {}),
          incentives: rec.incentives !== null ? rec.incentives : (adjustments[targetId]?.incentives || 0),
          transportation: rec.transportation !== null ? rec.transportation : (adjustments[targetId]?.transportation || 0),
          bonus: rec.bonus !== null ? rec.bonus : (adjustments[targetId]?.bonus || 0),
        };
        syncedCount++;
      });

      // Persist to localStorage
      localStorage.setItem('vitas_payroll_manual_adjustments', JSON.stringify(adjustments));

      // Dispatch custom sync event for Category5PayrollView real-time reaction
      window.dispatchEvent(new CustomEvent('vitas_payroll_adjustments_updated', { detail: adjustments }));

      const now = new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(now);

      if (isManual) {
        setSyncFeedback(
          language === 'ar'
            ? `تم ترحيل واعتماد مبالغ الحوافز والنقل والمكافآت بنجاح إلى مسير الرواتب لـ ${syncedCount} موظفاً!`
            : `Successfully synced incentives, transport & bonus for ${syncedCount} staff to live Payroll!`
        );
        setTimeout(() => setSyncFeedback(null), 6000);
      }
    } catch (err) {
      console.error('Failed to sync to payroll:', err);
    }
  }, [language]);

  /**
   * Process in-memory binary spreadsheet data
   */
  const processExcelData = useCallback(
    (buffer: ArrayBuffer | Uint8Array, fileName: string, targetSheet?: string) => {
      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const uint8Array = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        setCurrentWorkbookBuffer(uint8Array);
        setCurrentFileName(fileName);

        const activeSheetToUse = targetSheet || selectedSheet;
        const result = inspectAndExtractWorkbook(uint8Array, fileName, activeSheetToUse);

        // Cross-reference with HRIS employee table
        const enrichedRecords = enrichRecordsWithHRIS(result.records);
        const enrichedResult: WorkbookInspectionResult = {
          ...result,
          records: enrichedRecords,
        };

        setInspectionResult(enrichedResult);

        // Auto-sync to payroll if enabled
        if (autoSyncToPayroll && enrichedRecords.length > 0) {
          syncToPayrollSystem(enrichedRecords, false);
        }
      } catch (err: unknown) {
        console.error('Extraction error:', err);
        setErrorMessage(
          err instanceof Error
            ? err.message
            : language === 'ar'
            ? 'فشل في قراءة ملف الإكسل. يرجى التأكد من أنه ملف إكسل رسمي صالح.'
            : 'Failed to read the Excel file. Please ensure it is a valid Excel workbook.'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedSheet, enrichRecordsWithHRIS, autoSyncToPayroll, syncToPayrollSystem, language]
  );

  /**
   * Load the real default official workbook (LO-LOS Bouns-Incentive Dinar_Sep_26Fin.xlsx)
   */
  const handleLoadOfficialWorkbook = useCallback(async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/LO-LOS Bouns-Incentive Dinar_Sep_26Fin.xlsx');
      if (!response.ok) {
        throw new Error('Could not fetch the official workbook file');
      }
      const buffer = await response.arrayBuffer();
      processExcelData(buffer, 'LO-LOS Bouns-Incentive Dinar_Sep_26Fin.xlsx', selectedSheet);
    } catch (err) {
      console.warn('Failed to fetch official workbook from server:', err);
      setErrorMessage(
        language === 'ar'
          ? 'تعذر تحميل ملف الإكسل الافتراضي تلقائياً. يمكنك رفع ملف الإكسل الخاص بالفرع يدوياً عبر زر الرفع أدناه.'
          : 'Could not load the default workbook automatically. You can upload your branch Excel file manually.'
      );
      setIsProcessing(false);
    }
  }, [processExcelData, selectedSheet, language]);

  // Initial load on component mount
  useEffect(() => {
    handleLoadOfficialWorkbook();
  }, [handleLoadOfficialWorkbook]);

  /**
   * Handle user-uploaded Excel file from disk
   */
  const handleFileChange = (file: File) => {
    const isExcel =
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.xlsm') ||
      file.type.includes('spreadsheet') ||
      file.type.includes('excel');

    if (!isExcel) {
      alert(language === 'ar' ? 'يرجى اختيار ملف إكسل صالح (.xlsx أو .xls)' : 'Please upload a valid Excel spreadsheet (.xlsx or .xls)');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        processExcelData(e.target.result, file.name);
      } else {
        setErrorMessage(language === 'ar' ? 'تعذر قراءة ملف الإكسل المختار' : 'Unable to read the selected file as a binary spreadsheet.');
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setErrorMessage(language === 'ar' ? 'حدث خطأ أثناء قراءة الملف' : 'An error occurred while reading the file.');
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  /**
   * Handle switching worksheet inside the current workbook
   */
  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (currentWorkbookBuffer) {
      processExcelData(currentWorkbookBuffer, currentFileName, newSheet);
    }
  };

  /**
   * Export clean 7-column Excel
   */
  const handleExportCleanExcel = () => {
    if (!inspectionResult || inspectionResult.records.length === 0) return;
    const cleanFileName = `Vitas_Extracted_Incentives_${(inspectionResult.selectedSheetName || 'All').replace(/\s+/g, '_')}.xlsx`;
    exportExtractedDataToExcel(inspectionResult.records, cleanFileName);
  };

  // Distinct offices and job titles for filters
  const { offices, jobTitles, matchStats } = useMemo(() => {
    const officeCounts: Record<string, number> = {};
    const titleCounts: Record<string, number> = {};
    let matched = 0;
    let unmatched = 0;

    const records = inspectionResult?.records || [];
    records.forEach((r) => {
      if (r.office) officeCounts[r.office] = (officeCounts[r.office] || 0) + 1;
      if (r.jobTitle) titleCounts[r.jobTitle] = (titleCounts[r.jobTitle] || 0) + 1;
      if (r.isMatched) matched++;
      else unmatched++;
    });

    return {
      offices: Object.entries(officeCounts).sort((a, b) => a[0].localeCompare(b[0])),
      jobTitles: Object.entries(titleCounts).sort((a, b) => a[0].localeCompare(b[0])),
      matchStats: {
        matched,
        unmatched,
        total: records.length,
        percentage: records.length > 0 ? Math.round((matched / records.length) * 100) : 0,
      },
    };
  }, [inspectionResult]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    const records = inspectionResult?.records || [];
    const term = searchTerm.toLowerCase().trim();

    return records.filter((rec) => {
      if (term) {
        const idMatch = rec.employeeId.toLowerCase().includes(term);
        const nameMatch = rec.employeeName.toLowerCase().includes(term);
        const officeMatch = rec.office.toLowerCase().includes(term);
        const titleMatch = rec.jobTitle.toLowerCase().includes(term);
        const matchedNameMatch = (rec.matchedEmployeeName || '').toLowerCase().includes(term);
        const matchedBadgeMatch = (rec.matchedBadgeNo || '').toLowerCase().includes(term);
        if (!idMatch && !nameMatch && !officeMatch && !titleMatch && !matchedNameMatch && !matchedBadgeMatch) {
          return false;
        }
      }

      if (selectedOffice !== 'ALL' && rec.office !== selectedOffice) return false;
      if (selectedJobTitle !== 'ALL' && rec.jobTitle !== selectedJobTitle) return false;
      if (selectedMatchStatus === 'MATCHED' && !rec.isMatched) return false;
      if (selectedMatchStatus === 'UNMATCHED' && rec.isMatched) return false;

      return true;
    });
  }, [inspectionResult, searchTerm, selectedOffice, selectedJobTitle, selectedMatchStatus]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatIQD = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return '—';
    return Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // If user explicitly toggled to view the legacy archived screen
  if (showLegacyView) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold text-sm block">
                {language === 'ar' ? 'أرشيف المحرك القديم للحوافز (معطل ومحفوظ للرجوع إليه)' : 'Legacy Incentives Engine Archive (Preserved for Reference)'}
              </span>
              <span className="text-xs opacity-80">
                {language === 'ar' ? 'تم استبدال هذا المحرك بموديول استخراج الإكسل المالي المباشر والربط مع سجل الموظفين.' : 'Replaced by the direct Excel financial extraction & HRIS employee linking module.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLegacyView(false)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <span>{language === 'ar' ? '← العودة لموديول استخراج الإكسل المعتمد' : '← Back to Official Extraction Module'}</span>
          </button>
        </div>
        <IncentivesModuleLegacyView />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner & Control Header */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {language === 'ar' ? 'موديول استخراج واعتماد حوافز وبدلات الموظفين من الإكسل' : 'Excel Incentives & Allowances Extraction Module'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
                  {language === 'ar' ? 'معالجة مالية مباشرة دون معادلات يدوية' : 'Zero Drift Evaluated Payout'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  <span>{language === 'ar' ? 'مرتبط بسجل الموظفين' : 'HRIS Linked'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'ar'
                  ? 'استخراج دقيق وموثوق للحوافز (Incentives)، بدل النقل (Transportation)، والمكافآت (Bonus) مع الترحيل التلقائي لمسير الرواتب.'
                  : 'Direct formula extraction for Incentives, Transportation, and Bonus with live payroll synchronization.'}
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-end">
            {/* Sync to Payroll Button */}
            <button
              type="button"
              onClick={() => {
                if (inspectionResult?.records) {
                  syncToPayrollSystem(inspectionResult.records, true);
                }
              }}
              disabled={!inspectionResult || inspectionResult.records.length === 0}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all cursor-pointer disabled:opacity-50"
              title={language === 'ar' ? 'اعتماد وترحيل مبالغ الحوافز وبدل النقل والمكافآت مباشرة لمسير الرواتب' : 'Apply all extracted amounts directly to live payroll'}
            >
              <Send className="w-4 h-4" />
              <span>{language === 'ar' ? 'ترحيل واعتماد في مسير الرواتب' : 'Apply to Payroll'}</span>
            </button>

            {/* Go to Payroll View Button */}
            <button
              type="button"
              onClick={() => setActiveModuleId('payroll-mgmt')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              title={language === 'ar' ? 'فتح شاشة مسير الرواتب لمعاينة المبالغ المرحلة' : 'Open Payroll view to verify applied allowances'}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'معاينة مسير الرواتب' : 'View in Payroll'}</span>
            </button>

            {/* Export 7-Col Clean Excel */}
            <button
              type="button"
              onClick={handleExportCleanExcel}
              disabled={!inspectionResult || inspectionResult.records.length === 0}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title={language === 'ar' ? 'تصدير جدول الـ 7 أعمدة المعتمدة إلى إكسل نظيف' : 'Export clean 7-column spreadsheet'}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
            </button>

            {/* Toggle Archived Legacy Screen */}
            <button
              type="button"
              onClick={() => setShowLegacyView(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={language === 'ar' ? 'عرض أرشيف محرك الحوافز السابق (المعطل)' : 'View legacy incentives engine archive'}
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast Alert */}
        {syncFeedback && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{syncFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveModuleId('payroll-mgmt')}
              className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-500 cursor-pointer"
            >
              {language === 'ar' ? 'فتح مسير الرواتب الآن ←' : 'Open Payroll Now →'}
            </button>
          </div>
        )}
      </div>

      {/* KPI Metrics Summary Cards */}
      {inspectionResult?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Eligible Employees */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                {language === 'ar' ? 'الموظفون المستحقون' : 'Eligible Staff'}
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {inspectionResult.summary.totalEmployees.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-bold">{language === 'ar' ? 'موظف' : 'staff'}</span>
            </div>
            <div className="mt-2 text-[11px] font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {language === 'ar'
                  ? `${matchStats.matched} موظفاً مرتبطون بسجل النظام (${matchStats.percentage}%)`
                  : `${matchStats.matched} linked to HRIS (${matchStats.percentage}%)`}
              </span>
            </div>
          </div>

          {/* Card 2: Total Incentives */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                {language === 'ar' ? 'إجمالي الحوافز' : 'Total Incentives'}
              </span>
              <Award className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
              {formatIQD(inspectionResult.summary.totalIncentives)} <span className="text-xs font-sans">د.ع</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'معادلات الحوافز المقيمة من الإكسل' : 'Evaluated Excel formula cells'}
            </div>
          </div>

          {/* Card 3: Total Transportation */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                {language === 'ar' ? 'إجمالي بدل النقل' : 'Total Transportation'}
              </span>
              <Car className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400 truncate">
              {formatIQD(inspectionResult.summary.totalTransportation)} <span className="text-xs font-sans">د.ع</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'بدل التنقل المعتمد للموظفين' : 'Approved travel allowances'}
            </div>
          </div>

          {/* Card 4: Total Bonus */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider">
                {language === 'ar' ? 'إجمالي المكافآت' : 'Total Bonus'}
              </span>
              <Gift className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 truncate">
              {formatIQD(inspectionResult.summary.totalBonus)} <span className="text-xs font-sans">د.ع</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {language === 'ar' ? 'المكافآت التقديرية المحتسبة' : 'Calculated performance bonus'}
            </div>
          </div>

          {/* Card 5: Grand Total */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 dark:from-teal-950 dark:to-slate-950 border border-slate-800 dark:border-teal-500/30 text-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between text-slate-300 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                {language === 'ar' ? 'المجموع الشامل للمستحقات' : 'Grand Total Payout'}
              </span>
              <Wallet className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xl font-black font-mono text-teal-300 truncate">
              {formatIQD(inspectionResult.summary.grandTotal)} <span className="text-xs font-sans text-slate-300">د.ع</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-medium">
              <span>{language === 'ar' ? 'حوافز + نقل + بونص' : 'Incentives + Transport + Bonus'}</span>
              {lastSyncTime && (
                <span className="text-emerald-400 text-[10px]">✓ {lastSyncTime}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Zone & Worksheet Selection Bar */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* File Drag and Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
                fileInputRef.current.click();
              }
            }}
            className={`flex-1 border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-3.5 ${
              isDragging
                ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/10'
                : 'border-slate-300 dark:border-white/15 hover:border-teal-500 bg-slate-50/70 dark:bg-white/[0.02]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              accept=".xlsx,.xls,.xlsm"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md">
              {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
            </div>
            <div className="text-center sm:text-start flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                {currentFileName ? `${language === 'ar' ? 'الملف الحالي:' : 'Current File:'} ${currentFileName}` : (language === 'ar' ? 'اسحب وأفلت ملف إكسل الحوافز هنا' : 'Drag & drop incentives Excel file here')}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                {language === 'ar' ? 'يدعم ملفات .xlsx و .xls المعتمدة لمسؤولي ومشرفي القروض' : 'Supports LO, LOS, and Coordinator monthly spreadsheets'}
              </span>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 pointer-events-none"
            >
              {language === 'ar' ? 'تصفح الملفات' : 'Browse Files'}
            </button>
          </div>

          {/* Quick Reload Official Default File */}
          <button
            type="button"
            onClick={handleLoadOfficialWorkbook}
            disabled={isProcessing}
            className="px-4 py-3 rounded-xl border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs shrink-0"
            title={language === 'ar' ? 'إعادة تحميل ملف الحوافز الافتراضي المعتمد' : 'Reload official template spreadsheet'}
          >
            <RefreshCw className={`w-4 h-4 text-teal-600 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{language === 'ar' ? 'تحميل الملف الافتراضي' : 'Load Default Sheet'}</span>
          </button>
        </div>

        {/* Source Worksheet Selector Bar */}
        {inspectionResult && inspectionResult.sheetNames.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>{language === 'ar' ? 'ورقة العمل المصدر:' : 'Source Worksheet:'}</span>
              </span>
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value={ALL_ROLES_SHEET_KEY}>
                  ★ {language === 'ar' ? 'كافة الوظائف المجمعة (LO + LOS + CO + Collection)' : 'All Roles Consolidated (LO + LOS + CO + Collection)'}
                </option>
                {inspectionResult.sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                {inspectionResult.records.length} {language === 'ar' ? 'سجل مستخرج' : 'records extracted'}
              </span>
            </div>

            {/* Auto-Sync Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSyncToPayroll}
                onChange={(e) => setAutoSyncToPayroll(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'ar' ? 'تطبيق تلقائي ومباشر في مسير الرواتب عند الاستخراج' : 'Auto-sync to Payroll upon extraction'}
              </span>
            </label>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block mb-0.5">{language === 'ar' ? 'تنبيه في قراءة الملف' : 'File Reading Notice'}</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}
      </div>

      {/* Main Extracted Payout & HRIS Matching Table */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm space-y-0">
        {/* Table Filters & Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                placeholder={language === 'ar' ? 'بحث بالاسم، الرقم الوظيفي، WAID، الفرع...' : 'Search by name, ID, WAID, branch...'}
                className="w-full pl-3 pr-9 py-1.5 text-xs font-bold bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:border-teal-500"
              />
            </div>

            {/* Office Filter */}
            <select
              value={selectedOffice}
              onChange={(e) => { setSelectedOffice(e.target.value); setCurrentPage(1); }}
              className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'ar' ? 'جميع الفروع / المكاتب' : 'All Offices'}</option>
              {offices.map(([office, count]) => (
                <option key={office} value={office}>
                  {office} ({count})
                </option>
              ))}
            </select>

            {/* Job Title Filter */}
            <select
              value={selectedJobTitle}
              onChange={(e) => { setSelectedJobTitle(e.target.value); setCurrentPage(1); }}
              className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'ar' ? 'جميع المسميات الوظيفية' : 'All Job Titles'}</option>
              {jobTitles.map(([title, count]) => (
                <option key={title} value={title}>
                  {title} ({count})
                </option>
              ))}
            </select>

            {/* Linking Status Filter */}
            <select
              value={selectedMatchStatus}
              onChange={(e) => { setSelectedMatchStatus(e.target.value as any); setCurrentPage(1); }}
              className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="ALL">{language === 'ar' ? 'حالة الربط: الكل' : 'Linking: All'}</option>
              <option value="MATCHED">{language === 'ar' ? '✓ مرتبط بسجل الموظفين' : '✓ Linked to HRIS'}</option>
              <option value="UNMATCHED">{language === 'ar' ? '⚠ غير مرتبط' : '⚠ Unlinked'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">
              {language === 'ar'
                ? `عرض ${paginatedRecords.length} من أصل ${filteredRecords.length}`
                : `Showing ${paginatedRecords.length} of ${filteredRecords.length}`}
            </span>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 font-black">
                <th className="py-3 px-3 text-center w-12 cursor-pointer" onClick={() => handleSort('index')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    {sortField === 'index' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-start cursor-pointer w-32" onClick={() => handleSort('employeeId')}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ar' ? 'معرف الموظف (WAID)' : 'Employee ID'}</span>
                    {sortField === 'employeeId' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-start cursor-pointer w-36" onClick={() => handleSort('office')}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ar' ? 'المكتب / الفرع' : 'Office'}</span>
                    {sortField === 'office' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-start cursor-pointer min-w-[200px]" onClick={() => handleSort('employeeName')}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ar' ? 'اسم الموظف وسجل النظام' : 'Employee & HRIS Record'}</span>
                    {sortField === 'employeeName' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-start cursor-pointer w-44" onClick={() => handleSort('jobTitle')}>
                  <div className="flex items-center gap-1">
                    <span>{language === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}</span>
                    {sortField === 'jobTitle' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-end cursor-pointer w-32 text-emerald-700 dark:text-emerald-400" onClick={() => handleSort('incentives')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ar' ? 'الحافز (Incentives)' : 'Incentives'}</span>
                    {sortField === 'incentives' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-end cursor-pointer w-32 text-sky-700 dark:text-sky-400" onClick={() => handleSort('transportation')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ar' ? 'بدل النقل (Transport)' : 'Transport'}</span>
                    {sortField === 'transportation' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-end cursor-pointer w-32 text-amber-700 dark:text-amber-400" onClick={() => handleSort('bonus')}>
                  <div className="flex items-center justify-end gap-1">
                    <span>{language === 'ar' ? 'المكافأة (Bonus)' : 'Bonus'}</span>
                    {sortField === 'bonus' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600" /> : <ArrowDown className="w-3 h-3 text-teal-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-end w-32 font-black text-slate-900 dark:text-white">
                  <span>{language === 'ar' ? 'المجموع المستحق' : 'Total Payout'}</span>
                </th>
                <th className="py-3 px-3 text-center w-28">
                  <span>{language === 'ar' ? 'حالة البيرول' : 'Payroll Sync'}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-bold">
                    {language === 'ar' ? 'لا توجد سجلات مطابقة للبحث أو الفلتر المختار.' : 'No records match your search or filter.'}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => {
                  const totalRow = (rec.incentives || 0) + (rec.transportation || 0) + (rec.bonus || 0);
                  return (
                    <tr key={`${rec.sourceSheet}-${rec.sourceRowNumber}-${rec.employeeId}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {rec.index}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                          {rec.employeeId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {rec.office}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {rec.employeeName}
                          </span>
                          {rec.isMatched ? (
                            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold flex items-center gap-1 mt-0.5">
                              <BadgeCheck className="w-3 h-3 text-teal-600 shrink-0" />
                              <span>
                                {rec.matchedEmployeeName} ({rec.matchedBadgeNo})
                              </span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              {language === 'ar' ? 'معرف خارجي من الإكسل' : 'External Excel ID'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                        {rec.jobTitle}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {formatIQD(rec.incentives)}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-sky-700 dark:text-sky-400">
                        {formatIQD(rec.transportation)}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-amber-700 dark:text-amber-400">
                        {formatIQD(rec.bonus)}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-black text-slate-900 dark:text-white">
                        {formatIQD(totalRow)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{language === 'ar' ? 'مرحّل' : 'Synced'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 dark:text-slate-400">{language === 'ar' ? 'عدد الصفوف:' : 'Rows per page:'}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 font-bold">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-slate-800 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-40 cursor-pointer"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
