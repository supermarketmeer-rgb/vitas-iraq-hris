import React from 'react';
import { 
  Building2, 
  FileSpreadsheet, 
  Printer, 
  Sparkles, 
  Calendar, 
  ShieldCheck, 
  Clock, 
  Globe2,
  Languages, 
  Moon, 
  Sun,
  Camera,
  Layers,
  BookmarkCheck,
  CheckCircle2
} from 'lucide-react';
import { Language } from '../types/hr';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isDark: boolean;
  onThemeToggle: () => void;
  reportingPeriod: string;
  onExportExcel: () => void;
  onPrintPreview: () => void;
  onOpenAiInsights: () => void;
  onOpenDataQuality: () => void;
  onOpenSnapshots: () => void;
  onOpenTemplates: () => void;
  onOpenComparison: () => void;
  isExportingExcel: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  isDark,
  onThemeToggle,
  reportingPeriod,
  onExportExcel,
  onPrintPreview,
  onOpenAiInsights,
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Brand & Organization Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Building2 className="w-6 h-6 text-teal-400 dark:text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {isAr ? 'مؤسسة فيتاس العراق' : 'VITAS Iraq'}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {isAr ? 'التمويل الأصغر' : 'Microfinance'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isAr ? 'نظام التقارير والتحليلات الشهرية للموارد البشرية' : 'HR Monthly Reports & Executive Analytics System'}
              </p>
            </div>
          </div>

          {/* Center Metadata Strip */}
          <div className="hidden sm:flex items-center gap-6 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
              <span>{isAr ? 'الفترة:' : 'Period:'}</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">{reportingPeriod}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'التاريخ:' : 'Date:'}</span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{today}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'المصنفات:' : 'Sources:'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">5 Workbooks</span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center flex-wrap gap-2">
            
            {/* AI Insights Button */}
            <button
              onClick={onOpenAiInsights}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 rounded-lg transition-colors border border-teal-200 dark:border-teal-800"
              title={isAr ? 'تحليلات الذكاء الاصطناعي للمدير العام' : 'Executive AI Management Insights'}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>{isAr ? 'رؤى الإدارة (AI)' : 'AI Insights'}</span>
            </button>

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

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

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

            {/* Language Switcher to English / Arabic */}
            <button
              onClick={() => onLanguageChange(isAr ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-teal-300 dark:hover:border-teal-600 transition-colors shadow-2xs group"
              title={isAr ? 'التبديل إلى اللغة الإنجليزية (Switch to English)' : 'التبديل إلى اللغة العربية (Switch to Arabic)'}
              aria-label={isAr ? 'Switch language to English' : 'التبديل إلى اللغة العربية'}
            >
              <Languages className="w-4 h-4 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isAr ? 'English' : 'العربية'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                {isAr ? 'EN' : 'عربي'}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
