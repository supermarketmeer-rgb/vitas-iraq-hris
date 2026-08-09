import React, { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  History,
  RotateCcw,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Code2,
  GitCompare,
  X,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { CalculationRule, RuleVersion } from '../types.js';

interface RuleVersionHistorySidebarProps {
  rule: CalculationRule | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenComparator?: (ruleId: string) => void;
}

export const RuleVersionHistorySidebar: React.FC<RuleVersionHistorySidebarProps> = ({
  rule,
  isOpen,
  onClose,
  onOpenComparator,
}) => {
  const { lang, t, refreshData, showNotification } = useApp();

  const [previewVersion, setPreviewVersion] = useState<RuleVersion | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  if (!isOpen || !rule) return null;

  // Sort versions descending: latest version number first
  const sortedVersions = [...rule.versions].sort((a, b) => b.version_number - a.version_number);

  const handleRevertVersion = async (version: RuleVersion) => {
    if (version.id === rule.active_version_id) {
      showNotification(
        lang === 'ar'
          ? `الإصدار (${version.version_code}) هو الإصدار النشط حالياً بالفعل`
          : `Version ${version.version_code} is already the active version`,
        'info'
      );
      return;
    }

    const confirmMsg =
      lang === 'ar'
        ? `هل تريد استرجاع وتفعيل الإصدار السابق (${version.version_code}) للقاعدة (${rule.name_ar})؟`
        : `Revert and activate historical version ${version.version_code} for rule ${rule.name_en}?`;

    if (!confirm(confirmMsg)) return;

    setIsReverting(true);
    try {
      const res = await fetch(`/api/tax-module/rules/${rule.id}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: version.id }),
      }).then((r) => r.json());

      if (res.success) {
        showNotification(
          lang === 'ar'
            ? `تم استرجاع وتفعيل الإصدار (${version.version_code}) بنجاح`
            : `Successfully reverted to version ${version.version_code}`,
          'success'
        );
        refreshData();
      } else {
        showNotification(res.error || 'Revert failed', 'error');
      }
    } catch (err) {
      showNotification('Failed to revert version', 'error');
    } finally {
      setIsReverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl border-s border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {lang === 'ar' ? 'سجل إصدارات القاعدة' : 'Rule Version History'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {rule.code} • {lang === 'ar' ? rule.name_ar : rule.name_en}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rule Summary Badge */}
        <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">{lang === 'ar' ? 'الإصدار النشط حالياً:' : 'Active Version:'}</span>{' '}
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {rule.versions.find((v) => v.id === rule.active_version_id)?.version_code || 'v1.0'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">
              {rule.versions.length} {lang === 'ar' ? 'إصدارات مسجلة' : 'total versions'}
            </span>
            {onOpenComparator && (
              <button
                onClick={() => {
                  onClose();
                  onOpenComparator(rule.id);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 shadow-sm transition-all"
              >
                <GitCompare className="w-3 h-3" />
                <span>{lang === 'ar' ? 'مقارن الفروقات' : 'Full Diff'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Timeline Version List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="relative border-s-2 border-indigo-100 dark:border-slate-800 ms-3 space-y-6">
            {sortedVersions.map((version, index) => {
              const isActive = version.id === rule.active_version_id;

              return (
                <div key={version.id} className="relative ps-6 group">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -start-[11px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400'
                    }`}
                  >
                    {isActive ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <span className="text-[9px] font-bold">{version.version_number}</span>
                    )}
                  </div>

                  {/* Version Card */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {version.version_code}
                        </span>
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {lang === 'ar' ? 'النشط حالياً' : 'ACTIVE'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {lang === 'ar' ? 'مؤرشف' : 'HISTORICAL'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>{version.effective_from || '2026-01-01'}</span>
                      </div>
                    </div>

                    {/* Change Note */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 italic">
                      "{version.change_notes || (lang === 'ar' ? 'تحديث الصيغة والقواعد' : 'Standard formula definition')}"
                    </p>

                    {/* Formula / Query Code Block */}
                    <div className="bg-slate-950 text-emerald-400 p-2.5 rounded-xl text-xs font-mono mb-3 overflow-x-auto max-h-28 border border-slate-800">
                      <code>{version.formula_or_query || 'N/A'}</code>
                    </div>

                    {/* Actions: Revert & Preview */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => setPreviewVersion(version)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'معاينة الصيغة' : 'Preview Details'}</span>
                      </button>

                      {!isActive && (
                        <button
                          disabled={isReverting}
                          onClick={() => handleRevertVersion(version)}
                          className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                          title={lang === 'ar' ? 'استرجاع هذا الإصدار ليكون هو المعتمد' : 'Revert rule to this version'}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'استرجاع وتفعيل (Revert)' : 'Revert & Activate'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center text-xs text-slate-500">
          <span>
            {lang === 'ar'
              ? 'الاسترجاع يقوم بتحديث المحرك فوراً مع تسجيل عملية تدقيق في HR Bridge'
              : 'Reverting instantly updates engine and logs to HR audit table'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>

      {/* Preview Modal for selected historical version */}
      {previewVersion && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar'
                    ? `معاينة الإصدار (${previewVersion.version_code})`
                    : `Version Preview: ${previewVersion.version_code}`}
                </h4>
              </div>
              <button
                onClick={() => setPreviewVersion(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400 block">{lang === 'ar' ? 'تاريخ السريان:' : 'Effective From:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {previewVersion.effective_from || '2026-01-01'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{lang === 'ar' ? 'الحالة في هذا الإصدار:' : 'Status:'}</span>
                  <span
                    className={`font-bold ${
                      previewVersion.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {previewVersion.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">
                  {lang === 'ar' ? 'الصيغة أو استعلام SQL المطبق:' : 'Applied Formula or Query Expression:'}
                </label>
                <div className="p-3 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                  {previewVersion.formula_or_query}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 font-semibold">
                  {lang === 'ar' ? 'ملاحظات التغيير والاعتماد:' : 'Audit / Change Notes:'}
                </label>
                <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 italic">
                  {previewVersion.change_notes || 'Standard legal calculation update.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPreviewVersion(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close Preview'}
              </button>

              {previewVersion.id !== rule.active_version_id && (
                <button
                  onClick={() => {
                    const v = previewVersion;
                    setPreviewVersion(null);
                    handleRevertVersion(v);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'استرجاع وتفعيل الآن' : 'Revert & Activate Now'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
