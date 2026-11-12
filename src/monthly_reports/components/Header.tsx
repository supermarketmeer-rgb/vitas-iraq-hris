import React from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  Camera,
  Layers,
  BookmarkCheck
} from 'lucide-react';
import { Language } from '../types/hr';

interface HeaderProps {
  language: Language;
  reportingPeriod: string;
  onExportExcel: () => void;
  onPrintPreview: () => void;
  onOpenDataQuality: () => void;
  onOpenSnapshots: () => void;
  onOpenTemplates: () => void;
  onOpenComparison: () => void;
  isExportingExcel: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  reportingPeriod,
  onExportExcel,
  onPrintPreview,
  onOpenDataQuality,
  onOpenSnapshots,
  onOpenTemplates,
  onOpenComparison,
  isExportingExcel
}) => {
  const isAr = language === 'ar';
  const today = new Date().toLocaleDateString(isAr ? 'ar-IQ' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center gap-3">

          {/* Center Metadata Strip */}
          <div className="flex items-center gap-5 text-xs text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30 px-3.5 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800/60 mr-auto">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
              <span>{isAr ? 'الفترة:' : 'Period:'}</span>
              <span className="font-semibold text-teal-900 dark:text-teal-100 font-mono">{reportingPeriod}</span>
            </div>
            <span className="text-teal-300 dark:text-teal-700">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
              <span>{isAr ? 'التاريخ:' : 'Date:'}</span>
              <span className="font-medium text-teal-800 dark:text-teal-200">{today}</span>
            </div>
            <span className="text-teal-300 dark:text-teal-700">|</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
              <span>{isAr ? 'المصنفات:' : 'Sources:'}</span>
              <span className="font-semibold text-teal-900 dark:text-teal-100">5 Workbooks</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">

            {/* Monthly Snapshot Archive */}
            <button
              onClick={onOpenSnapshots}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
              title={isAr ? 'اعتماد وحفظ نسخة الشهر' : 'Monthly Snapshots & Freeze'}
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{isAr ? 'نسخة الشهر' : 'Snapshot'}</span>
            </button>

            {/* Period Comparison */}
            <button
              onClick={onOpenComparison}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              title={isAr ? 'مقارنة الفترات' : 'Compare Periods'}
            >
              <Layers className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>{isAr ? 'المقارنة' : 'Compare'}</span>
            </button>

            {/* Data Quality Monitor */}
            <button
              onClick={onOpenDataQuality}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              title={isAr ? 'تدقيق جودة البيانات' : 'Data Quality Monitor'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{isAr ? 'التدقيق' : 'Audit'}</span>
            </button>

            {/* Templates */}
            <button
              onClick={onOpenTemplates}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              title={isAr ? 'القوالب المحفوظة' : 'Report Templates'}
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAr ? 'القوالب' : 'Templates'}</span>
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            {/* Print / PDF Button */}
            <button
              onClick={onPrintPreview}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>{isAr ? 'طباعة / PDF' : 'PDF / Print'}</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={onExportExcel}
              disabled={isExportingExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير Excel' : 'Export Excel')}</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
