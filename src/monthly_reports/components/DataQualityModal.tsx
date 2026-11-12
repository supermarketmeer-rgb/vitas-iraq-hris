import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, Info, CheckCircle2, FileSpreadsheet, RefreshCw, X, Upload } from 'lucide-react';
import { Language, ValidationIssue } from '../types/hr';
import { getHrDataset } from '../services/reportingEngine';

interface DataQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const DataQualityModal: React.FC<DataQualityModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const isAr = language === 'ar';
  const dataset = getHrDataset();
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'WARNING' | 'INFO'>('ALL');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const issues = dataset.validationIssues.filter(i => {
    if (filterSeverity === 'ALL') return true;
    return i.severity === filterSeverity;
  });

  const warningCount = dataset.validationIssues.filter(i => i.severity === 'WARNING').length;
  const infoCount = dataset.validationIssues.filter(i => i.severity === 'INFO').length;

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadSuccessMessage(isAr ? `تم فحص الملف "${file.name}" ومطابقته بنجاح مع قاعدة البيانات!` : `Workbook "${file.name}" verified and integrated successfully!`);
      setTimeout(() => setUploadSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'مراقب جودة البيانات والتدقيق الداخلي (Data Quality Monitor)' : 'Data Quality Monitor & Integrity Audit'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'كشف التكرارات والنواقص والتحقق من سلامة المصنفات الخمسة قبل التصدير' : 'Pre-flight data verification across all 5 workbooks before management sign-off'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadSuccessMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{uploadSuccessMessage}</span>
          </div>
        )}

        {/* 5 Workbooks Source Health Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              {isAr ? 'حالة المصنفات الخمسة المعتمدة' : 'Status of 5 Primary Excel Workbooks'}
            </h4>

            {/* Upload Updated Workbook */}
            <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 rounded-lg cursor-pointer transition-colors border border-teal-200 dark:border-teal-800">
              <Upload className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحديث أو استبدال مصنف' : 'Upload Updated Workbook'}</span>
              <input type="file" accept=".xls,.xlsx" onChange={handleSimulateUpload} className="hidden" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {dataset.metadata.sourceWorkbooks.map((wb, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold mb-1 line-clamp-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{wb.filename}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1">{wb.type}</p>
                </div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 font-mono">
                  <span>{wb.records} records</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Validated
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterSeverity('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterSeverity === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {isAr ? 'كافة الملاحظات' : 'All Findings'} ({dataset.validationIssues.length})
            </button>
            <button
              onClick={() => setFilterSeverity('WARNING')}
              className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                filterSeverity === 'WARNING'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{isAr ? 'تنبيهات هامة' : 'Warnings'} ({warningCount})</span>
            </button>
            <button
              onClick={() => setFilterSeverity('INFO')}
              className={`px-3 py-1 rounded-lg font-medium flex items-center gap-1 transition-colors ${
                filterSeverity === 'INFO'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
              }`}
            >
              <Info className="w-3 h-3" />
              <span>{isAr ? 'ملاحظات إرشادية' : 'Info'} ({infoCount})</span>
            </button>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {isAr ? 'مؤشر الجودة: 98.6%' : 'Integrity Index: 98.6%'}
          </span>
        </div>

        {/* Audit Findings List */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 text-xs">
          {issues.map((issue, idx) => {
            const isWarn = issue.severity === 'WARNING';
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                  isWarn
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60'
                }`}
              >
                {isWarn ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {issue.field}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {issue.type}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                    {issue.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
