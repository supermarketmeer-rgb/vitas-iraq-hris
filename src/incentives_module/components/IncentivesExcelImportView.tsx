import React, { useState } from 'react';
import { ExcelService, ParsedSheetData } from '../services/excelService';
import { StorageService } from '../services/storage';
import { ImportBatch, ImportedVariableRow } from '../types';
import {
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Eye,
  Layers,
  Sparkles
} from 'lucide-react';

interface ExcelImportViewProps {
  onNavigateToCalculate?: () => void;
  isDark?: boolean;
}

export const IncentivesExcelImportView: React.FC<ExcelImportViewProps> = ({
  onNavigateToCalculate,
  isDark = false,
}) => {
  const variables = StorageService.getVariables();
  const employees = StorageService.getEmployees();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSheetData | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [period, setPeriod] = useState<string>('2026-10');
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>(StorageService.getImportBatches());

  // Handle File Selection
  const handleFileUpload = async (uploadedFile: File) => {
    setIsProcessing(true);
    setFile(uploadedFile);
    try {
      const data = await ExcelService.parseExcelFile(uploadedFile);
      setParsedData(data);
      setActiveSheet(data.activeSheet);

      const suggested = ExcelService.autoSuggestMappings(data.headers, variables);
      setColumnMappings(suggested);
      setCurrentStep(2);
    } catch (err: any) {
      alert(`خطأ في قراءة ملف الإكسل: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Built-in Microfinance Excel Sample
  const handleLoadSample = () => {
    const mockHeaders = [
      'Employee_ID',
      'Employee_Name',
      'Branch_Office',
      'Disbursed_Loans_Count',
      'Disbursed_Amount_IQD',
      'Repayment_Rate_Pct',
      'Active_Clients_Count',
      'PAR30_Risk_Pct',
      'Field_Visits_Count',
      'New_Acquisitions',
      'Quality_Score_100',
      'Actual_Days_Worked',
      'Excellence_Index',
    ];

    const mockRows = employees
      .filter((e) => e.category === 'Loan Officer')
      .map((emp, i) => ({
        Employee_ID: emp.employeeId,
        Employee_Name: emp.name,
        Branch_Office: emp.office,
        Disbursed_Loans_Count: 20 + ((i * 3) % 15),
        Disbursed_Amount_IQD: 22000000 + (i * 4500000),
        Repayment_Rate_Pct: (95.2 + ((i * 0.8) % 4)).toFixed(1),
        Active_Clients_Count: 85 + (i * 8),
        PAR30_Risk_Pct: (1.1 + ((i * 0.4) % 3)).toFixed(1),
        Field_Visits_Count: 18 + (i * 2),
        New_Acquisitions: 4 + (i % 6),
        Quality_Score_100: 90 + (i % 9),
        Actual_Days_Worked: 22,
        Excellence_Index: 3 + (i % 3),
      }));

    const mockData: ParsedSheetData = {
      sheetNames: ['Loan_Officers_Variables_Oct'],
      activeSheet: 'Loan_Officers_Variables_Oct',
      headers: mockHeaders,
      rows: mockRows,
      totalRows: mockRows.length,
    };

    setParsedData(mockData);
    setActiveSheet('Loan_Officers_Variables_Oct');

    const suggested = ExcelService.autoSuggestMappings(mockHeaders, variables);
    setColumnMappings(suggested);
    setCurrentStep(2);
  };

  // Download Standard Excel Template
  const handleDownloadTemplate = () => {
    ExcelService.downloadTemplate(variables);
  };

  // Build Normalized Rows with Validation
  const buildNormalizedRows = (): ImportedVariableRow[] => {
    if (!parsedData) return [];

    const empIdCol = columnMappings['employeeId'];
    const badgeNoCol = columnMappings['badgeNo'];
    const waidCol = columnMappings['waid'];
    const empNameCol = columnMappings['employeeName'];
    const officeCol = columnMappings['office'];

    return parsedData.rows.map((row, idx) => {
      const errors: string[] = [];
      const employeeId = empIdCol && row[empIdCol] ? String(row[empIdCol]).trim() : '';
      const badgeNo = badgeNoCol && row[badgeNoCol] ? String(row[badgeNoCol]).trim() : undefined;
      const waid = waidCol && row[waidCol] ? String(row[waidCol]).trim() : undefined;

      // Match employee by WAID, Employee ID, or Badge No!
      const matchedEmp = employees.find((e) =>
        (waid && (e.waid === waid || e.employeeId === waid)) ||
        (employeeId && (e.employeeId === employeeId || e.waid === employeeId || e.badgeNo === employeeId)) ||
        (badgeNo && (e.badgeNo === badgeNo || e.employeeId === badgeNo))
      );

      const effectiveEmpId = employeeId || matchedEmp?.employeeId || waid || badgeNo || '';
      if (!effectiveEmpId) {
        errors.push('لم يتم العثور على رقم الموظف أو معرف الحوافز (WAID) أو البادج');
      }

      const rowVars: Record<string, number> = {};
      variables.forEach((v) => {
        const mappedCol = columnMappings[v.code];
        if (mappedCol && row[mappedCol] !== undefined && row[mappedCol] !== '') {
          const num = parseFloat(String(row[mappedCol]).replace(/,/g, ''));
          rowVars[v.code] = isNaN(num) ? 0 : num;
        } else {
          rowVars[v.code] = v.defaultValue;
        }
      });

      return {
        employeeId: effectiveEmpId || `UNKNOWN_ROW_${idx + 1}`,
        badgeNo: badgeNo || matchedEmp?.badgeNo,
        waid: waid || matchedEmp?.waid,
        employeeName: empNameCol && row[empNameCol] ? String(row[empNameCol]) : (matchedEmp?.name || undefined),
        office: officeCol && row[officeCol] ? String(row[officeCol]) : (matchedEmp?.office || undefined),
        variables: rowVars,
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        originalRowIndex: idx + 2,
      };
    });
  };

  // Confirm and Save Import
  const handleSaveImport = () => {
    const normalized = buildNormalizedRows();
    const validRows = normalized.filter((r) => r.isValid).length;
    const errorRows = normalized.length - validRows;

    const newBatch: ImportBatch = {
      id: `batch_${period.replace('-', '_')}_${Date.now()}`,
      period,
      fileName: file ? file.name : 'نموذج_البيانات_التجريبية_فيتاس_العراق.xlsx',
      sheetName: activeSheet,
      totalRows: normalized.length,
      validRows,
      errorRows,
      importedBy: StorageService.getCurrentUser().name,
      importedAt: new Date().toISOString(),
      columnMappings,
      rows: normalized,
    };

    StorageService.saveImportBatch(newBatch);
    setImportBatches(StorageService.getImportBatches());
    setImportSuccess(`تم استيراد ${validRows} صف موظف بنجاح لفترة ${period}`);
    setCurrentStep(4);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">file_present</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              MONTHLY VARIABLES EXCEL IMPORTER
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            استيراد متغيرات الأداء الشهرية من Excel
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            معالج تفاعلي متعدد الخطوات: فحص الأعمدة، مطابقة المتغيرات العشرة، والتحقق من صحة أرقام الموظفين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Download className="w-4 h-4 text-teal-400" />
            <span>تحميل نموذج Excel الموحد</span>
          </button>
          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>تحميل عينة بيانات فيتاس التجريبية</span>
          </button>
        </div>
      </div>

      {/* Wizard Progress Bar */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      } flex items-center justify-between text-xs`}>
        {[
          { step: 1, label: '1. رفع الملف' },
          { step: 2, label: '2. معاينة الورقة' },
          { step: 3, label: '3. مطابقة الأعمدة' },
          { step: 4, label: '4. اعتماد الاستيراد' },
        ].map((s) => {
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <div key={s.step} className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                  isDone
                    ? 'bg-emerald-500 text-white'
                    : isActive
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                    : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? '✓' : s.step}
              </span>
              <span className={`font-bold hidden sm:inline ${isActive ? 'text-teal-400' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* STEP 1: Upload or Choose File */}
      {currentStep === 1 && (
        <div className={`p-10 rounded-3xl border-2 border-dashed ${
          isDark ? 'bg-[#0a0c10] border-white/10 hover:border-teal-500/50' : 'bg-white border-slate-300 hover:border-teal-500'
        } transition-all flex flex-col items-center justify-center text-center space-y-4`}>
          <div className="w-16 h-16 rounded-3xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base">اسحب وأفلت ملف Excel هنا أو انقر للتصفح</h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              يدعم ملفات بصيغة (.xlsx أو .xls أو .csv) بأي تسميات أعمدة باللغتين العربية والإنجليزية
            </p>
          </div>

          <label className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer">
            <span>اختر ملفاً من جهازك</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* STEP 2: Sheet Selection & Preview */}
      {currentStep === 2 && parsedData && (
        <div className="space-y-4">
          <div className={`p-5 rounded-3xl border ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs`}>
            <div className="flex items-center gap-3">
              <span className="font-bold">اختر فترة الاستحقاق:</span>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className={`px-3 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 font-mono font-bold ${
                  isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(1)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}
              >
                رجوع
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20"
              >
                <span>متابعة لمطابقة الأعمدة</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Raw Excel Data Preview */}
          <div className={`rounded-3xl border overflow-hidden ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between text-xs`}>
              <span className="font-bold">معاينة أول {Math.min(5, parsedData.rows.length)} صفوف من الملف</span>
              <span className="text-slate-400 font-mono">{parsedData.totalRows} صف متوفر</span>
            </div>
            <div className="overflow-x-auto text-xs max-h-60">
              <table className="w-full text-right border-collapse">
                <thead className={`${isDark ? 'bg-[#06080d] text-slate-300' : 'bg-slate-50 text-slate-700'} font-bold`}>
                  <tr>
                    {parsedData.headers.map((h) => (
                      <th key={h} className="p-3 border-b border-white/10 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                  {parsedData.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      {parsedData.headers.map((h) => (
                        <td key={h} className="p-3 font-mono whitespace-nowrap">
                          {String(row[h] !== undefined ? row[h] : '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Column Mapping & Verification */}
      {currentStep === 3 && parsedData && (
        <div className="space-y-4">
          <div className={`p-6 rounded-3xl border ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          } space-y-4`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-sm">مطابقة أعمدة Excel مع متغيرات النظام (10 Variables)</h3>
              <span className="text-xs text-slate-400">تم التعيين التلقائي للأعمدة المطابقة</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Employee ID */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#111827] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block font-bold text-teal-400 mb-1">الرقم المؤسسي (Employee ID) *</label>
                <select
                  value={columnMappings['employeeId'] || ''}
                  onChange={(e) => setColumnMappings({ ...columnMappings, employeeId: e.target.value })}
                  className={`w-full p-2 rounded-xl border focus:outline-none focus:border-teal-500 font-medium ${
                    isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">-- اختر العمود المخصص لرقم الموظف --</option>
                  {parsedData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* WAID (Incentives Loading ID) */}
              <div className={`p-4 rounded-2xl border border-teal-500/30 ${isDark ? 'bg-teal-950/20' : 'bg-teal-50/50'}`}>
                <label className="block font-bold text-teal-300 mb-1">
                  معرف الحوافز (WAID) <span className="text-[10px] text-teal-400 font-mono">(المستخدم لمطابقة الحوافز)</span>
                </label>
                <select
                  value={columnMappings['waid'] || ''}
                  onChange={(e) => setColumnMappings({ ...columnMappings, waid: e.target.value })}
                  className={`w-full p-2 rounded-xl border border-teal-500/40 focus:outline-none focus:border-teal-400 font-medium ${
                    isDark ? 'bg-[#0f172a] text-teal-300' : 'bg-white border-teal-300 text-teal-800'
                  }`}
                >
                  <option value="">-- اختر عمود معرف الحوافز WAID (إن وجد) --</option>
                  {parsedData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Badge Number */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#111827] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block font-bold text-slate-300 mb-1">رقم البادج (Badge Number)</label>
                <select
                  value={columnMappings['badgeNo'] || ''}
                  onChange={(e) => setColumnMappings({ ...columnMappings, badgeNo: e.target.value })}
                  className={`w-full p-2 rounded-xl border focus:outline-none focus:border-teal-500 font-medium ${
                    isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">-- اختر عمود رقم البادج (اختياري) --</option>
                  {parsedData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Employee Name */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#111827] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <label className="block font-bold text-slate-300 mb-1">اسم الموظف (اختياري)</label>
                <select
                  value={columnMappings['employeeName'] || ''}
                  onChange={(e) => setColumnMappings({ ...columnMappings, employeeName: e.target.value })}
                  className={`w-full p-2 rounded-xl border focus:outline-none focus:border-teal-500 font-medium ${
                    isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">-- اختر عمود الاسم إن وجد --</option>
                  {parsedData.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* 10 Variables */}
              {variables.map((v) => (
                <div key={v.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-[#111827] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="block font-bold text-slate-300 mb-1">
                    <span className="text-teal-400 font-mono">[{v.code}]</span> {v.nameAr} ({v.unit})
                  </label>
                  <select
                    value={columnMappings[v.code] || ''}
                    onChange={(e) => setColumnMappings({ ...columnMappings, [v.code]: e.target.value })}
                    className={`w-full p-2 rounded-xl border focus:outline-none focus:border-teal-500 font-medium ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">-- غير محدد (سيتم احتساب القيمة الافتراضية 0) --</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={() => setCurrentStep(2)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
              >
                رجوع
              </button>
              <button
                onClick={handleSaveImport}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>اعتماد وحفظ البيانات للفترة {period}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Success & Navigation */}
      {currentStep === 4 && (
        <div className={`p-8 rounded-3xl border text-center space-y-4 ${
          isDark ? 'bg-[#0a0c10] border-emerald-500/30 text-white' : 'bg-white border-emerald-300 text-slate-900 shadow-sm'
        }`}>
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-emerald-400">تم استيراد واعتماد المتغيرات بنجاح!</h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {importSuccess || `تمت معالجة وحفظ البيانات الشهرية لفترة ${period} بنجاح.`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold ${
                isDark ? 'bg-white/10 text-slate-300 hover:bg-white/15' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              استيراد ملف آخر
            </button>
            {onNavigateToCalculate && (
              <button
                onClick={onNavigateToCalculate}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 flex items-center gap-2 cursor-pointer"
              >
                <span>الانتقال لمنصة احتساب المستحقات</span>
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* History of Import Batches */}
      <div className={`rounded-3xl border overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between text-xs`}>
          <span className="font-bold">سجل الملفات والدفعات المستوردة مسبقاً</span>
          <span className="text-slate-400 font-mono">{importBatches.length} دفعات محفوظة</span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead className={`${isDark ? 'bg-[#06080d] text-slate-300' : 'bg-slate-50 text-slate-700'} font-bold`}>
              <tr>
                <th className="p-3.5">فترة الاستحقاق</th>
                <th className="p-3.5">اسم الملف المصدر</th>
                <th className="p-3.5 text-center">الصفوف الصالحة</th>
                <th className="p-3.5 text-center">الصفوف المعيبة</th>
                <th className="p-3.5">القائم بالاستيراد</th>
                <th className="p-3.5">تاريخ ووقت العملية</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
              {importBatches.map((b) => (
                <tr key={b.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                  <td className="p-3.5 font-mono font-bold text-teal-400">{b.period}</td>
                  <td className="p-3.5 font-medium">{b.fileName}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-emerald-400">{b.validRows}</td>
                  <td className="p-3.5 text-center font-mono font-bold text-rose-400">{b.errorRows}</td>
                  <td className="p-3.5 text-slate-300">{b.importedBy}</td>
                  <td className="p-3.5 text-slate-400 font-mono">
                    {new Date(b.importedAt).toLocaleString('ar-IQ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
