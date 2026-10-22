import React, { useState } from 'react';
import { Office, Department } from '../../types/hris';
import { Language, translations } from './translations';

interface OfficesManagerProps {
  offices: Office[];
  departments: Department[];
  lang: Language;
  theme?: 'dark' | 'light';
  onRefresh: () => void;
}

export const OfficesManager: React.FC<OfficesManagerProps> = ({
  offices,
  departments,
  lang,
  theme = 'dark',
  onRefresh
}) => {
  const t = translations[lang];
  const isArabic = lang === 'ar';
  const isDark = theme !== 'light';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [formData, setFormData] = useState({
    department_id: departments[0]?.id || 1,
    name: '',
    name_ar: '',
    code: '',
    city: '',
    country: 'Iraq',
    address: '',
    transfer_employees: true
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setEditingOffice(null);
    setFormData({
      department_id: departments[0]?.id || 1,
      name: '',
      name_ar: '',
      code: '',
      city: '',
      country: 'Iraq',
      address: '',
      transfer_employees: true
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (office: Office) => {
    setEditingOffice(office);
    setFormData({
      department_id: office.department_id,
      name: office.name,
      name_ar: office.name_ar,
      code: office.code,
      city: office.city,
      country: office.country || 'Iraq',
      address: office.address || '',
      transfer_employees: true
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingOffice ? `/api/offices/${editingOffice.id}` : '/api/offices';
      const method = editingOffice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save office');
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(`/api/offices/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete office');
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Notice Banner */}
      <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
        isDark ? 'bg-teal-950/30 border-teal-500/20 text-teal-200' : 'bg-teal-50 border-teal-200 text-teal-900'
      }`}>
        <span className="material-symbols-outlined text-teal-400 text-xl shrink-0 mt-0.5">location_city</span>
        <div className="text-xs space-y-1">
          <p className="font-bold">
            {t.transferNotice}
          </p>
          <p className={`text-[11px] ${isDark ? 'text-teal-300/80' : 'text-teal-800'}`}>
            {isArabic
              ? 'يتم ربط كافة الفروع والمكاتب الميدانية بالأقسام المعنية، وتظهر مجمعة تلقائياً في الهيكل التنظيمي التفاعلي.'
              : 'Physical office records remain separate entities in the database. When viewed in the Organization Diagram, all offices assigned to a department are consolidated into one single "Offices" node.'}
          </p>
        </div>
      </div>

      {/* Header bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border ${
        isDark ? 'bg-[#111827] border-white/10 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-xl">location_on</span>
            <h2 className="text-sm font-bold">{t.tabOffices}</h2>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isArabic ? 'إدارة المكاتب والفروع الميدانية في مختلف محافظات العراق وتوزيع الأقسام عليها.' : 'Physical office locations and their departmental assignments.'}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span>{t.addOffice}</span>
        </button>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#111827] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <thead className={`font-semibold uppercase text-[11px] border-b app-table-header ${
              isDark ? 'bg-[#0a0c10] text-slate-300 border-white/10' : 'bg-[#94a3b8] text-slate-950 border-slate-500 font-bold'
            }`}>
              <tr>
                <th className="px-4 py-3">{t.officeCode}</th>
                <th className="px-4 py-3">{t.officeNameEn}</th>
                <th className="px-4 py-3">{t.officeNameAr}</th>
                <th className="px-4 py-3">{t.assignedDepartment}</th>
                <th className="px-4 py-3">{t.officeCity}</th>
                <th className="px-4 py-3">{t.activeEmployees}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {offices.map((office) => (
                <tr key={office.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}`}>
                  <td className={`px-4 py-3 font-mono font-bold ${isDark ? 'text-teal-400' : 'text-slate-900'}`}>
                    {office.code || office.id}
                  </td>
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-sm">location_city</span>
                      <span>{office.name}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-bold font-sans ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    {office.name_ar}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                      isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-blue-700 bg-blue-50'
                    }`}>
                      <span className="material-symbols-outlined text-xs">corporate_fare</span>
                      {office.department_name || departments.find(d => d.id === office.department_id)?.name_ar || office.department_id}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {office.city || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full font-mono text-[11px] ${
                      isDark ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-slate-100 text-slate-800'
                    }`}>
                      <span className="material-symbols-outlined text-xs">group</span>
                      {office.active_employees_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(office)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-teal-400 hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title={t.edit}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(office.id)}
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
                {editingOffice ? t.editOffice : t.addOffice}
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
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.assignedDepartment}</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
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
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.officeCode}</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. BR-BAGHDAD"
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.officeNameEn}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Baghdad Main Branch"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.officeNameAr}</label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="مثال: فرع بغداد الرئيسي"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.officeCity}</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="بغداد"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{isArabic ? 'البلد' : 'Country'}</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.officeAddress}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="العنوان التفصيلي"
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
