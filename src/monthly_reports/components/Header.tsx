import React from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  ShieldCheck, 
  Camera,
  Layers,
  BookmarkCheck,
  BarChart3
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
  isDark?: boolean;
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
  isExportingExcel,
  isDark = false
}) => {
  const isAr = language === 'ar';

  return (
    <div>
      {/* Page Title — same style as other screens */}
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAr ? 'التقارير والتحليلات الشهرية' : 'Monthly Reports & Analytics'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {isAr
                ? `نظام التقارير التنفيذية الشهرية · الفترة: ${reportingPeriod}`
                : `HR Monthly Reporting & Executive Analytics System · Period: ${reportingPeriod}`}
            </p>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Monthly Snapshot Archive */}
        <button
          onClick={onOpenSnapshots}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs border border-emerald-700"
          title={isAr ? 'اعتماد وحفظ نسخة الشهر' : 'Monthly Snapshots & Freeze'}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{isAr ? 'نسخة الشهر' : 'Snapshot'}</span>
        </button>

        {/* Period Comparison */}
        <button
          onClick={onOpenComparison}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
          title={isAr ? 'مقارنة الفترات' : 'Compare Periods'}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isAr ? 'المقارنة' : 'Compare'}</span>
        </button>

        {/* Data Quality Monitor */}
        <button
          onClick={onOpenDataQuality}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors border border-amber-700"
          title={isAr ? 'تدقيق جودة البيانات' : 'Data Quality Monitor'}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isAr ? 'التدقيق' : 'Audit'}</span>
        </button>

        {/* Templates */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-700 hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-600"
          title={isAr ? 'القوالب المحفوظة' : 'Report Templates'}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>{isAr ? 'القوالب' : 'Templates'}</span>
        </button>

        <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-0.5" />

        {/* Print / PDF Button */}
        <button
          onClick={onPrintPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 shadow-xs"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>{isAr ? 'طباعة / PDF' : 'PDF / Print'}</span>
        </button>

        {/* Excel Export Button */}
        <button
          onClick={onExportExcel}
          disabled={isExportingExcel}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>{isExportingExcel ? (isAr ? 'جاري التصدير...' : 'Exporting...') : (isAr ? 'تصدير Excel' : 'Export Excel')}</span>
        </button>

      </div>
    </div>
  );
};
