import React, { useState } from 'react';
import { Department } from '../../types/hris';
import { Language, translations } from './translations';

interface DepartmentsManagerProps {
  departments: Department[];
  lang: Language;
  theme?: 'dark' | 'light';
  onRefresh: () => void;
}

export const DepartmentsManager: React.FC<DepartmentsManagerProps> = ({
  departments,
  lang,
  theme = 'dark',
  onRefresh
}) => {
  const t = translations[lang];
  const isArabic = lang === 'ar';
  const isDark = theme !== 'light';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    manager_name: '',
    description: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      manager_name: '',
      description: ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      name_ar: dept.name_ar,
      manager_name: dept.manager_name,
      description: dept.description || ''
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save department');
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
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete department');
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${
        isDark ? 'bg-[#111827] border-white/10 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-xl">corporate_fare</span>
            <h2 className="text-sm font-bold">{t.tabDepartments}</h2>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isArabic ? 'ترتبط الأقسام مباشرة بالإدارة العليا وتشرف على الفروع والمكاتب التابعة لها.' : 'Departments directly report to Top Management and supervise assigned physical offices.'}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>{t.addDepartment}</span>
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
                <th className="px-4 py-3">{t.code}</th>
                <th className="px-4 py-3">{t.deptNameEn}</th>
                <th className="px-4 py-3">{t.deptNameAr}</th>
                <th className="px-4 py-3">{t.manager}</th>
                <th className="px-4 py-3">{t.offices}</th>
                <th className="px-4 py-3">{t.activeEmployees}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {departments.map((dept) => (
                <tr key={dept.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}`}>
                  <td className={`px-4 py-3 font-mono font-bold ${isDark ? 'text-teal-400' : 'text-slate-900'}`}>
                    {dept.code || `DEP-${dept.id}`}
                  </td>
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-400 text-sm">corporate_fare</span>
                      <span>{dept.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-bold font-sans ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {dept.name_ar}
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {dept.manager_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full font-mono text-[11px] ${
                      isDark ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-teal-50 text-teal-700'
                    }`}>
                      <span className="material-symbols-outlined text-xs">location_city</span>
                      {dept.offices_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full font-mono text-[11px] ${
                      isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-slate-100 text-slate-800'
                    }`}>
                      <span className="material-symbols-outlined text-xs">group</span>
                      {dept.active_employees_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(dept)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-teal-400 hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title={t.edit}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
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
                {editingDept ? t.editDepartment : t.addDepartment}
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
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.deptCode}</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. DEP-OPS"
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.deptNameEn}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Operations & Risk"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.deptNameAr}</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="مثال: العمليات والائتمان"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.deptManager}</label>
                <input
                  type="text"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  placeholder="اسم مدير القسم"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.deptDesc}</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
