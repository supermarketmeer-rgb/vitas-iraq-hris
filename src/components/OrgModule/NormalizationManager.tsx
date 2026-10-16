import React, { useState } from 'react';
import { NormalizationRule } from '../../types/hris';
import { Language, translations } from './translations';

interface NormalizationManagerProps {
  rules: NormalizationRule[];
  lang: Language;
  theme?: 'dark' | 'light';
  onRefresh: () => void;
}

export const NormalizationManager: React.FC<NormalizationManagerProps> = ({
  rules,
  lang,
  theme = 'dark',
  onRefresh
}) => {
  const t = translations[lang];
  const isArabic = lang === 'ar';
  const isDark = theme !== 'light';

  // Sandbox state
  const [testInput, setTestInput] = useState('Senior Loan Officer');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    rule_type: 'prefix' as 'prefix' | 'suffix' | 'alias' | 'regex',
    pattern: '',
    replacement: ''
  });
  const [loading, setLoading] = useState(false);

  // Client-side simulation of normalization for the sandbox
  const simulatedNormalizedTitle = React.useMemo(() => {
    if (!testInput.trim()) return '';
    let val = testInput.trim();

    // Custom alias check
    const aliasRule = rules.find(r => r.rule_type === 'alias' && r.is_active && r.pattern.toLowerCase() === val.toLowerCase());
    if (aliasRule) return aliasRule.replacement;

    // Prefixes
    const activePrefixes = [
      ...rules.filter(r => r.rule_type === 'prefix' && r.is_active).map(r => r.pattern),
      'Junior', 'Senior', 'Jr.', 'Sr.', 'Lead', 'Associate', 'Staff', 'Principal', 'Executive', 'مبتدئ', 'أول', 'رئيسي'
    ];

    for (const prefix of activePrefixes) {
      const regex = new RegExp(`^${prefix}(\\s+|-|\\.\\s*)`, 'i');
      if (regex.test(val)) {
        val = val.replace(regex, '').trim();
        break;
      }
    }

    // Suffixes
    const activeSuffixes = [
      ...rules.filter(r => r.rule_type === 'suffix' && r.is_active).map(r => r.pattern),
      'I', 'II', 'III', 'IV', 'Jr.', 'Sr.'
    ];

    for (const suffix of activeSuffixes) {
      const regex = new RegExp(`(\\s+|-|,\\s*)${suffix}$`, 'i');
      if (regex.test(val)) {
        val = val.replace(regex, '').trim();
        break;
      }
    }

    return val;
  }, [testInput, rules]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/normalization-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to create normalization rule');

      setIsModalOpen(false);
      setFormData({ rule_type: 'prefix', pattern: '', replacement: '' });
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(`/api/normalization-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete rule');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-[#111827] border-white/10 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400 text-xl">spellcheck</span>
            <h2 className="text-sm font-bold">{t.normalizationTitle}</h2>
          </div>
          <p className={`text-xs mt-0.5 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.normalizationSubtitle}
          </p>
        </div>
      </div>

      {/* Interactive Testing Sandbox */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-base">science</span>
          <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.testSandbox}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.testInput}</label>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="e.g. Senior Loan Officer / مسؤول ائتمان أول"
              className={`w-full px-3 py-2 rounded-xl border text-xs ${
                isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
              }`}
            />
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isArabic ? 'أمثلة سريعة:' : 'Quick samples:'}</span>
              <button
                onClick={() => setTestInput('Senior Loan Officer')}
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono cursor-pointer transition-colors ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-teal-400 border border-white/10' : 'text-indigo-600 bg-indigo-50 hover:underline'
                }`}
              >
                Senior Loan Officer
              </button>
              <button
                onClick={() => setTestInput('مسؤول ائتمان أول')}
                className={`text-[11px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-teal-400 border border-white/10' : 'text-indigo-600 bg-indigo-50 hover:underline'
                }`}
              >
                مسؤول ائتمان أول
              </button>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-center ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t.testResult}</span>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-base font-bold px-3 py-1 rounded-xl border ${
                isDark ? 'bg-[#111827] border-white/10 text-teal-400 shadow-md' : 'text-slate-900 bg-white border-slate-200 shadow-xs'
              }`}>
                {simulatedNormalizedTitle || '(Empty)'}
              </span>
            </div>
            <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isArabic
                ? 'سيتم تجميع كافة الموظفين المطابقين لهذا المسمى الموحد تحت نفس بطاقة الهيكل التنظيمي التفاعلي.'
                : 'All employees matching this normalized position in the same department will be counted on this single diagram card.'}
            </p>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#111827] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-base">tune</span>
            <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isArabic ? 'قواعد التوحيد النشطة' : 'Active Normalization Rules'}
            </h3>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>{t.addRule}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-[#0a0c10] text-slate-400 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="px-4 py-3">{t.ruleType}</th>
                <th className="px-4 py-3">{t.pattern}</th>
                <th className="px-4 py-3">{t.replacement}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {rules.map((rule) => (
                <tr key={rule.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}`}>
                  <td className="px-4 py-3 font-semibold uppercase text-[10px]">
                    <span className={`px-2 py-0.5 rounded font-mono ${
                      isDark ? 'bg-white/5 text-purple-300 border border-white/10' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {rule.rule_type}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    "{rule.pattern}"
                  </td>
                  <td className="px-4 py-3 font-mono text-teal-400">
                    {rule.replacement ? `"${rule.replacement}"` : <span className="italic text-slate-500">Strip / Remove</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title={t.delete}
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full border overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-100'
            }`}>
              <h3 className="font-bold text-sm">{t.addRule}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAddRule} className="p-6 space-y-4 text-xs">
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.ruleType}</label>
                <select
                  value={formData.rule_type}
                  onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as any })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'border-slate-200'
                  }`}
                >
                  <option value="prefix" className="bg-[#111827] text-white">{t.prefix}</option>
                  <option value="suffix" className="bg-[#111827] text-white">{t.suffix}</option>
                  <option value="alias" className="bg-[#111827] text-white">{t.alias}</option>
                  <option value="regex" className="bg-[#111827] text-white">{t.regex}</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.pattern}</label>
                <input
                  type="text"
                  required
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  placeholder="e.g. Senior or Jr."
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              {formData.rule_type === 'alias' && (
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.replacement}</label>
                  <input
                    type="text"
                    required
                    value={formData.replacement}
                    onChange={(e) => setFormData({ ...formData, replacement: e.target.value })}
                    placeholder="e.g. Loan Officer"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                    }`}
                  />
                </div>
              )}

              <div className={`pt-3 border-t flex items-center justify-end gap-2 ${
                isDark ? 'border-white/10' : 'border-slate-100'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                    isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>{loading ? t.loading : t.save}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
