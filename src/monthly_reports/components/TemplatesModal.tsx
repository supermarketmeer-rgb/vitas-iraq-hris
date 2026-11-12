import React, { useState } from 'react';
import { BookmarkCheck, Plus, Check, Trash2, X, FolderKanban } from 'lucide-react';
import { Language, SavedTemplate, FilterState, ChartConfigItem } from '../types/hr';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  currentReportId: string;
  currentColumns: string[];
  currentFilters: FilterState;
  currentCharts: ChartConfigItem[];
  onLoadTemplate: (template: SavedTemplate) => void;
}

const STORAGE_KEY = 'vitas_hr_saved_templates';

const PREDEFINED_TEMPLATES: SavedTemplate[] = [
  {
    id: 'tpl-exec',
    name: 'Monthly HR Executive Summary (التقرير التنفيذي الشهري)',
    createdAt: '2026-11-01',
    reportId: 'mgmt_exec_summary',
    selectedColumns: ['metric', 'currentValue', 'previousValue', 'change', 'status'],
    filters: { office: 'All', department: 'All', category: 'All' },
    charts: [
      { id: 'c1', type: 'column', titleEn: 'Workforce by Office', titleAr: 'القوى العاملة حسب المكتب', xAxis: 'office', yAxis: 'totalStaff', aggregation: 'sum' }
    ]
  },
  {
    id: 'tpl-payroll',
    name: 'Monthly Payroll & Compensation (ملخص الرواتب والحوافز)',
    createdAt: '2026-11-01',
    reportId: 'pay_summary',
    selectedColumns: ['employeeName', 'office', 'basicSalary', 'incentives', 'transportation', 'bonus', 'socialSecurity12', 'grossSalary'],
    filters: { office: 'All', department: 'All' },
    charts: [
      { id: 'c2', type: 'column', titleEn: 'Gross Payroll by Office', titleAr: 'إجمالي الرواتب حسب المكتب', xAxis: 'office', yAxis: 'grossSalary', aggregation: 'sum' }
    ]
  },
  {
    id: 'tpl-movement',
    name: 'Turnover & Movement Report (حركة الموظفين والدوران)',
    createdAt: '2026-11-01',
    reportId: 'emp_resigned',
    selectedColumns: ['name', 'position', 'office', 'endDate', 'tenureYears', 'probPeriod', 'reason'],
    filters: { office: 'All' },
    charts: [
      { id: 'c3', type: 'pie', titleEn: 'Exit Reasons', titleAr: 'أسباب انتهاء الخدمة', xAxis: 'reason', yAxis: 'count', aggregation: 'count' }
    ]
  },
  {
    id: 'tpl-directory',
    name: 'Employee Master Directory (دليل الكادر وبيانات الاتصال)',
    createdAt: '2026-11-01',
    reportId: 'emp_directory',
    selectedColumns: ['name', 'position', 'office', 'cellular', 'email', 'supervisor', 'dateOfBirth'],
    filters: { office: 'All' },
    charts: []
  }
];

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  language,
  currentReportId,
  currentColumns,
  currentFilters,
  currentCharts,
  onLoadTemplate
}) => {
  const isAr = language === 'ar';
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return [...PREDEFINED_TEMPLATES, ...JSON.parse(raw)];
    } catch (e) {
      console.error(e);
    }
    return PREDEFINED_TEMPLATES;
  });

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    if (!templateName.trim()) return;
    const newTpl: SavedTemplate = {
      id: `custom-tpl-${Date.now()}`,
      name: templateName.trim(),
      createdAt: new Date().toISOString().split('T')[0],
      reportId: currentReportId,
      selectedColumns: currentColumns,
      filters: currentFilters,
      charts: currentCharts
    };

    const customOnly = templates.filter(t => !PREDEFINED_TEMPLATES.some(p => p.id === t.id));
    const updatedCustom = [newTpl, ...customOnly];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (e) {}

    setTemplates([...PREDEFINED_TEMPLATES, ...updatedCustom]);
    setTemplateName('');
  };

  const handleDelete = (id: string) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    const customOnly = updated.filter(t => !PREDEFINED_TEMPLATES.some(p => p.id === t.id));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customOnly));
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'قوالب التقارير المحفوظة (Report Templates)' : 'Saved Report Templates'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'حفظ واسترجاع إعدادات التقارير والأعمدة والفلاتر والرسوم البيانية' : 'Load and save customized layouts, column setups, and chart presets'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Save Current Layout */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
          <label className="block font-semibold text-slate-700 dark:text-slate-300">
            {isAr ? 'حفظ إعدادات التقرير الحالي كقالب جديد' : 'Save Current Workspace as Template'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={isAr ? 'أدخل اسم القالب...' : 'Template name (e.g. Monthly Branch Headcount)...'}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              onClick={handleSaveCurrent}
              className="px-3.5 py-1.5 font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'حفظ القالب' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* List of Templates */}
        <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1 text-xs">
          {templates.map((tpl) => {
            const isPredefined = PREDEFINED_TEMPLATES.some(p => p.id === tpl.id);
            return (
              <div
                key={tpl.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-900 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {tpl.name}
                    </span>
                    {isPredefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 font-semibold">
                        Predefined
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'التقرير:' : 'Report:'} <span className="font-mono">{tpl.reportId}</span> · {tpl.selectedColumns.length} columns · {tpl.charts.length} charts
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      onLoadTemplate(tpl);
                      onClose();
                    }}
                    className="px-3 py-1 font-semibold text-white bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    {isAr ? 'تحميل القالب' : 'Load'}
                  </button>

                  {!isPredefined && (
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
