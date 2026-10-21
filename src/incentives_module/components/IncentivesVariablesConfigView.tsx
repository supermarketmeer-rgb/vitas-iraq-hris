import React, { useState } from 'react';
import { VariableDefinition, VariableDataType } from '../types';
import { StorageService } from '../services/storage';
import { Sliders, Save, RotateCcw, Check, Info } from 'lucide-react';

interface VariablesConfigViewProps {
  isDark?: boolean;
}

export const IncentivesVariablesConfigView: React.FC<VariablesConfigViewProps> = ({ isDark = false }) => {
  const [variables, setVariables] = useState<VariableDefinition[]>(StorageService.getVariables());
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpdateField = (
    index: number,
    field: keyof VariableDefinition,
    value: any
  ) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
    setSaveSuccess(false);
  };

  const handleSaveAll = () => {
    StorageService.saveVariables(variables);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToDefault = () => {
    if (confirm('هل أنت متأكد من استعادة التسميات والتوصيفات الافتراضية للمتغيرات العشرة؟')) {
      StorageService.resetToFactoryDefaults();
      setVariables(StorageService.getVariables());
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">tune</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              10 DYNAMIC CALCULATION VARIABLES
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            إعداد وتخصيص المتغيرات العشرة
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            تخصيص أسماء وأكواد ووحدات قياس وأنواع بيانات متغيرات الاحتساب المالي دون تعديل الكود المصدري
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefault}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>تم حفظ التعديلات</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
        isDark ? 'bg-teal-950/30 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-800'
      }`}>
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">ملاحظة تقنية:</span> تُستخدم الأكواد البرمجية (مثل{' '}
          <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded border border-teal-500/30 font-bold">Variable01</code>{' '}
          إلى{' '}
          <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded border border-teal-500/30 font-bold">Variable10</code>)
          كمدخلات في محرك المعادلات الرياضية ومطابقة أعمدة ملفات الإكسل المستوردة تلقائياً.
        </div>
      </div>

      {/* Variables Table */}
      <div className={`rounded-3xl border overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead className={`${isDark ? 'bg-[#06080d] text-slate-300 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200'} border-b font-bold`}>
              <tr>
                <th className="p-3.5 w-12 text-center">#</th>
                <th className="p-3.5 w-32">رمز المتغير (Code)</th>
                <th className="p-3.5">التسمية العربية (الواجهات والتقارير)</th>
                <th className="p-3.5">التسمية الإنجليزية</th>
                <th className="p-3.5 w-32">نوع البيانات</th>
                <th className="p-3.5 w-28">وحدة القياس</th>
                <th className="p-3.5">وصف المؤشر والاحتساب</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
              {variables.map((v, idx) => (
                <tr key={v.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}>
                  <td className="p-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                  <td className="p-3.5 font-mono font-bold text-teal-400">{v.code}</td>
                  <td className="p-3.5">
                    <input
                      type="text"
                      value={v.nameAr}
                      onChange={(e) => handleUpdateField(idx, 'nameAr', e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 font-bold ${
                        isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </td>
                  <td className="p-3.5">
                    <input
                      type="text"
                      value={v.nameEn}
                      onChange={(e) => handleUpdateField(idx, 'nameEn', e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 font-medium ${
                        isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </td>
                  <td className="p-3.5">
                    <select
                      value={v.dataType}
                      onChange={(e) => handleUpdateField(idx, 'dataType', e.target.value as VariableDataType)}
                      className={`w-full px-2 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 font-medium ${
                        isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="integer">عدد صحيح (integer)</option>
                      <option value="currency">مبلغ مالي (currency)</option>
                      <option value="percentage">نسبة مئوية (percentage)</option>
                      <option value="number">رقم عشري (number)</option>
                    </select>
                  </td>
                  <td className="p-3.5">
                    <input
                      type="text"
                      value={v.unit}
                      onChange={(e) => handleUpdateField(idx, 'unit', e.target.value)}
                      className={`w-full px-2 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 text-center font-bold ${
                        isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                  </td>
                  <td className="p-3.5">
                    <input
                      type="text"
                      value={v.description}
                      onChange={(e) => handleUpdateField(idx, 'description', e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-xl border focus:outline-none focus:border-teal-500 text-slate-300 dark:text-slate-300 text-slate-700 ${
                        isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
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
