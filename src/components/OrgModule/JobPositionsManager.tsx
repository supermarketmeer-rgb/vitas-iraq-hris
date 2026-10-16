import React, { useState } from 'react';
import { JobPosition, Department } from '../../types/hris';
import { Language, translations } from './translations';

interface JobPositionsManagerProps {
  positions: JobPosition[];
  departments: Department[];
  lang: Language;
  theme?: 'dark' | 'light';
  onRefresh: () => void;
}

export const JobPositionsManager: React.FC<JobPositionsManagerProps> = ({
  positions,
  departments,
  lang,
  theme = 'dark',
  onRefresh
}) => {
  const t = translations[lang];
  const isArabic = lang === 'ar';
  const isDark = theme !== 'light';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<JobPosition | null>(null);
  const [formData, setFormData] = useState({
    department_id: departments[0]?.id || 1,
    supervisor_position_id: '' as string | number,
    title: '',
    title_ar: '',
    code: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setEditingPos(null);
    setFormData({
      department_id: departments[0]?.id || 1,
      supervisor_position_id: '',
      title: '',
      title_ar: '',
      code: ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pos: JobPosition) => {
    setEditingPos(pos);
    setFormData({
      department_id: pos.department_id,
      supervisor_position_id: pos.supervisor_position_id ?? '',
      title: pos.title,
      title_ar: pos.title_ar,
      code: pos.code
    });
    setError(null);
    setIsModalOpen(true);
  };

  // Check for circular reporting loop when choosing supervisor
  const wouldCauseCircularLoop = (candidateSupervisorId: number | null, posId: number | null): boolean => {
    if (!candidateSupervisorId || !posId) return false;
    if (candidateSupervisorId === posId) return true;

    // Follow the chain upwards from candidateSupervisorId to see if it reaches posId
    const visited = new Set<number>();
    let currentId: number | null = candidateSupervisorId;

    while (currentId !== null) {
      if (currentId === posId) return true;
      if (visited.has(currentId)) break; // existing loop
      visited.add(currentId);

      const parentPos = positions.find(p => p.id === currentId);
      currentId = parentPos?.supervisor_position_id ?? null;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supId = formData.supervisor_position_id === '' ? null : Number(formData.supervisor_position_id);

    // Client-side circular dependency validation check
    if (editingPos && wouldCauseCircularLoop(supId, editingPos.id)) {
      setError(isArabic
        ? 'لا يمكن تعيين هذا المشرف لأنه سينشئ حلقة تبعية دائرية غير مقبولة (A → B → A).'
        : 'Cannot assign this supervisor: it would create a circular reporting loop (A → B → A).');
      setLoading(false);
      return;
    }

    try {
      const url = editingPos ? `/api/job-positions/${editingPos.id}` : '/api/job-positions';
      const method = editingPos ? 'PUT' : 'POST';

      const payload = {
        department_id: formData.department_id,
        supervisor_position_id: supId,
        title: formData.title,
        title_ar: formData.title_ar,
        code: formData.code
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save job position');
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(`/api/job-positions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete job position');
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const availableSupervisors = positions.filter(
    p => p.department_id === formData.department_id && (!editingPos || p.id !== editingPos.id)
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${
        isDark ? 'bg-[#111827] border-white/10 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-xl">badge</span>
            <h2 className="text-sm font-bold">{t.tabPositions}</h2>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isArabic ? 'إدارة المسميات الوظيفية، تسلسل الإشراف الإداري وربطها بالأقسام المعتمدة.' : 'Job positions define the reporting hierarchy within departments.'}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>{t.addPosition}</span>
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#111827] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <thead className={`font-semibold uppercase text-[11px] border-b ${
              isDark ? 'bg-[#0a0c10] text-slate-400 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="px-4 py-3">{t.positionCode}</th>
                <th className="px-4 py-3">{t.positionTitleEn}</th>
                <th className="px-4 py-3">{t.positionTitleAr}</th>
                <th className="px-4 py-3">{t.assignedDepartment}</th>
                <th className="px-4 py-3">{t.supervisorSelect}</th>
                <th className="px-4 py-3">{t.activeEmployees}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {positions.map((pos) => (
                <tr key={pos.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}`}>
                  <td className={`px-4 py-3 font-mono font-bold ${isDark ? 'text-teal-400' : 'text-slate-900'}`}>
                    {pos.code || `POS-${pos.id}`}
                  </td>
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-400 text-sm">badge</span>
                      <span>{pos.title}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-bold font-sans ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {pos.title_ar}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                      isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-blue-700 bg-blue-50'
                    }`}>
                      <span className="material-symbols-outlined text-xs">corporate_fare</span>
                      {pos.department_name || departments.find(d => d.id === pos.department_id)?.name_ar || pos.department_id}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {pos.supervisor_title ? (
                      <span className="font-semibold text-teal-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">subdirectory_arrow_right</span>
                        {pos.supervisor_title}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">
                        {t.noneRoot}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full font-mono text-[11px] ${
                      isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-100 text-slate-800'
                    }`}>
                      <span className="material-symbols-outlined text-xs">group</span>
                      {pos.active_employees_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(pos)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-teal-400 hover:bg-white/10' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title={t.edit}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(pos.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={t.delete}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-2xl max-w-md w-full border overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-100'
            }`}>
              <h3 className="font-bold text-sm">
                {editingPos ? t.editPosition : t.addPosition}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl flex items-start gap-2">
                  <span className="material-symbols-outlined text-rose-400 text-base shrink-0 mt-0.5">warning</span>
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.assignedDepartment}</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({
                    ...formData,
                    department_id: parseInt(e.target.value, 10),
                    supervisor_position_id: '' // reset supervisor if dept changed
                  })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'border-slate-200'
                  }`}
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id} className="bg-[#111827] text-white">
                      {isArabic ? (dept.name_ar || dept.name) : dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.supervisorSelect}</label>
                <select
                  value={formData.supervisor_position_id}
                  onChange={(e) => setFormData({ ...formData, supervisor_position_id: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'border-slate-200'
                  }`}
                >
                  <option value="" className="bg-[#111827] text-white">{t.noneRoot}</option>
                  {availableSupervisors.map((p) => {
                    const wouldLoop = editingPos ? wouldCauseCircularLoop(p.id, editingPos.id) : false;
                    return (
                      <option key={p.id} value={p.id} disabled={wouldLoop} className="bg-[#111827] text-white">
                        {isArabic ? (p.title_ar || p.title) : p.title} ({p.code}) {wouldLoop ? '(Circular Loop Disabled)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isArabic
                    ? 'المسميات التي ليس لها مشرف إداري ترتبط مباشرة بعقدة المكاتب المجمعة للقسم.'
                    : 'Positions with no supervisor display directly under the consolidated Offices node.'}
                </p>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.positionCode}</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. POS-CORP-ANL"
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.positionTitleEn}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Loan Officer"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.positionTitleAr}</label>
                <input
                  type="text"
                  value={formData.title_ar}
                  onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                  placeholder="مثال: مسؤول قروض"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

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
