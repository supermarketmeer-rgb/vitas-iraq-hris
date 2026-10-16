import React, { useState, useMemo } from 'react';
import { Employee, Department, Office, JobPosition } from '../../types/hris';
import { Language, translations } from './translations';

interface EmployeesManagerProps {
  employees: Employee[];
  departments: Department[];
  offices: Office[];
  positions: JobPosition[];
  lang: Language;
  theme?: 'dark' | 'light';
  onRefresh: () => void;
}

export const EmployeesManager: React.FC<EmployeesManagerProps> = ({
  employees,
  departments,
  offices,
  positions,
  lang,
  theme = 'dark',
  onRefresh
}) => {
  const t = translations[lang];
  const isArabic = lang === 'ar';
  const isDark = theme !== 'light';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterOffice, setFilterOffice] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    first_name_ar: '',
    last_name_ar: '',
    email: '',
    department_id: departments[0]?.id || 1,
    office_id: offices[0]?.id || 1,
    job_position_id: positions[0]?.id || 1,
    raw_job_title: '',
    status: 'active' as 'active' | 'on_leave' | 'terminated' | 'suspended',
    hire_date: new Date().toISOString().split('T')[0]
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (filterDept !== 'all' && emp.department_id !== Number(filterDept)) return false;
      if (filterOffice !== 'all' && emp.office_id !== Number(filterOffice)) return false;
      if (filterStatus !== 'all' && emp.status !== filterStatus) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchesName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase().includes(term);
        const matchesNameAr = `${emp.first_name_ar || ''} ${emp.last_name_ar || ''}`.toLowerCase().includes(term);
        const matchesNumber = (emp.employee_number || '').toLowerCase().includes(term);
        const matchesRaw = (emp.raw_job_title || '').toLowerCase().includes(term);
        const matchesEmail = (emp.email || '').toLowerCase().includes(term);
        return matchesName || matchesNameAr || matchesNumber || matchesRaw || matchesEmail;
      }
      return true;
    });
  }, [employees, filterDept, filterOffice, filterStatus, searchTerm]);

  const openAddModal = () => {
    setEditingEmp(null);
    setFormData({
      first_name: '',
      last_name: '',
      first_name_ar: '',
      last_name_ar: '',
      email: '',
      department_id: departments[0]?.id || 1,
      office_id: offices[0]?.id || 1,
      job_position_id: positions[0]?.id || 1,
      raw_job_title: '',
      status: 'active',
      hire_date: new Date().toISOString().split('T')[0]
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFormData({
      first_name: emp.first_name,
      last_name: emp.last_name,
      first_name_ar: emp.first_name_ar || '',
      last_name_ar: emp.last_name_ar || '',
      email: emp.email,
      department_id: emp.department_id,
      office_id: emp.office_id,
      job_position_id: emp.job_position_id,
      raw_job_title: emp.raw_job_title,
      status: emp.status,
      hire_date: emp.hire_date || new Date().toISOString().split('T')[0]
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingEmp ? `/api/employees/${editingEmp.id}` : '/api/employees';
      const method = editingEmp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save employee');
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
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete employee');
        return;
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters & Actions Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isDark ? 'bg-[#111827] border-white/10 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-xl">group</span>
              <h2 className="text-sm font-bold">{t.tabEmployees}</h2>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isArabic ? `عرض ${filteredEmployees.length} من أصل ${employees.length} موظف فعلي في قاعدة البيانات.` : `Showing ${filteredEmployees.length} of ${employees.length} records in database.`}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>{t.addEmployee}</span>
          </button>
        </div>

        {/* Filter inputs */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t text-xs ${
          isDark ? 'border-white/10' : 'border-slate-100'
        }`}>
          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined text-slate-400 text-base absolute left-2.5 top-2">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isArabic ? 'بحث بالاسم، الرقم، المسمى...' : 'Search by name, ID, title...'}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border focus:outline-none ${
                isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'bg-slate-50 border-slate-200'
              }`}
            />
          </div>

          {/* Department filter */}
          <div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all" className="bg-[#111827] text-white">{isArabic ? 'كافة الأقسام' : 'All Departments'}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#111827] text-white">
                  {isArabic ? (d.name_ar || d.name) : d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Office filter */}
          <div>
            <select
              value={filterOffice}
              onChange={(e) => setFilterOffice(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all" className="bg-[#111827] text-white">{isArabic ? 'كافة الفروع والمكاتب' : 'All Physical Offices'}</option>
              {offices.map((o) => (
                <option key={o.id} value={o.id} className="bg-[#111827] text-white">
                  {isArabic ? (o.name_ar || o.name) : o.name} ({o.city})
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded-xl border focus:outline-none ${
                isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <option value="all" className="bg-[#111827] text-white">{isArabic ? 'كافة الحالات' : 'All Employment Statuses'}</option>
              <option value="active" className="bg-[#111827] text-white">{isArabic ? 'نشط' : 'Active Only'}</option>
              <option value="on_leave" className="bg-[#111827] text-white">{isArabic ? 'في إجازة' : 'On Leave'}</option>
              <option value="terminated" className="bg-[#111827] text-white">{isArabic ? 'منتهي الخدمة' : 'Terminated'}</option>
              <option value="suspended" className="bg-[#111827] text-white">{isArabic ? 'موقوف' : 'Suspended'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#111827] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="overflow-x-auto max-h-[600px]">
          <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            <thead className={`font-semibold uppercase text-[11px] border-b sticky top-0 z-10 ${
              isDark ? 'bg-[#0a0c10] text-slate-400 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}>
              <tr>
                <th className="px-4 py-3">{t.empNumber}</th>
                <th className="px-4 py-3">{isArabic ? 'اسم الموظف' : 'Employee Name'}</th>
                <th className="px-4 py-3">{t.rawTitle}</th>
                <th className="px-4 py-3">{t.assignedDepartment}</th>
                <th className="px-4 py-3">{t.assignedOffice}</th>
                <th className="px-4 py-3">{t.empStatus}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className={`transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'}`}>
                  <td className={`px-4 py-3 font-mono font-bold ${isDark ? 'text-teal-400' : 'text-slate-900'}`}>
                    {emp.employee_number || emp.id}
                  </td>
                  <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <div>
                      <span>{emp.first_name_ar ? `${emp.first_name_ar} ${emp.last_name_ar || ''}` : `${emp.first_name} ${emp.last_name}`}</span>
                      {emp.first_name && emp.first_name_ar && (
                        <span className="block text-[11px] text-slate-400 font-mono">
                          {emp.first_name} {emp.last_name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 font-bold ${isDark ? 'text-teal-300' : 'text-slate-800'}`}>
                    {emp.raw_job_title || emp.job_title || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] ${
                      isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-blue-700 bg-blue-50'
                    }`}>
                      <span className="material-symbols-outlined text-xs">corporate_fare</span>
                      {emp.department_name || emp.department || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-emerald-400 text-xs">location_on</span>
                      <span>{emp.office_name || emp.branch || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                      emp.status === 'active'
                        ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : emp.status === 'on_leave'
                        ? isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        : isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(emp)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-slate-400 hover:text-teal-400 hover:bg-white/10' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                        title={t.edit}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
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
          <div className={`rounded-2xl max-w-lg w-full border overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-100'
            }`}>
              <h3 className="font-bold text-sm">
                {editingEmp ? t.editEmployee : t.addEmployee}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.firstNameEn}</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. Ali"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.lastNameEn}</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="e.g. Hassan"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{isArabic ? 'الاسم الأول (بالعربي)' : 'First Name (Arabic)'}</label>
                  <input
                    type="text"
                    value={formData.first_name_ar}
                    onChange={(e) => setFormData({ ...formData, first_name_ar: e.target.value })}
                    placeholder="علي"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{isArabic ? 'اسم العائلة (بالعربي)' : 'Last Name (Arabic)'}</label>
                  <input
                    type="text"
                    value={formData.last_name_ar}
                    onChange={(e) => setFormData({ ...formData, last_name_ar: e.target.value })}
                    placeholder="حسن"
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.email}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ali.hassan@vitasiraq.com"
                  className={`w-full px-3 py-2 rounded-xl border font-mono ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Department assignment */}
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.assignedDepartment}</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => {
                    const newDeptId = parseInt(e.target.value, 10);
                    const matchingOff = offices.find(o => o.department_id === newDeptId) || offices[0];
                    const matchingPos = positions.find(p => p.department_id === newDeptId) || positions[0];
                    setFormData({
                      ...formData,
                      department_id: newDeptId,
                      office_id: matchingOff?.id || formData.office_id,
                      job_position_id: matchingPos?.id || formData.job_position_id
                    });
                  }}
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

              {/* Physical Office & Job Position in that department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.assignedOffice}</label>
                  <select
                    value={formData.office_id}
                    onChange={(e) => setFormData({ ...formData, office_id: parseInt(e.target.value, 10) })}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'border-slate-200'
                    }`}
                  >
                    {offices.map((off) => (
                      <option key={off.id} value={off.id} className="bg-[#111827] text-white">
                        {isArabic ? (off.name_ar || off.name) : off.name} ({off.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.assignedPosition}</label>
                  <select
                    value={formData.job_position_id}
                    onChange={(e) => {
                      const posId = parseInt(e.target.value, 10);
                      const selectedP = positions.find(p => p.id === posId);
                      setFormData({
                        ...formData,
                        job_position_id: posId,
                        raw_job_title: formData.raw_job_title || selectedP?.title || ''
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-xl border ${
                      isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'border-slate-200'
                    }`}
                  >
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id} className="bg-[#111827] text-white">
                        {isArabic ? (pos.title_ar || pos.title) : pos.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exact raw job title */}
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.rawTitle}</label>
                <input
                  type="text"
                  required
                  value={formData.raw_job_title}
                  onChange={(e) => setFormData({ ...formData, raw_job_title: e.target.value })}
                  placeholder="e.g. Senior Loan Officer / مسؤول ائتمان أول"
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white placeholder-slate-500 focus:border-teal-500' : 'border-slate-200'
                  }`}
                />
              </div>

              {/* Status */}
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.empStatus}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className={`w-full px-3 py-2 rounded-xl border ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white focus:border-teal-500' : 'border-slate-200'
                  }`}
                >
                  <option value="active" className="bg-[#111827] text-white">{t.statusActive}</option>
                  <option value="on_leave" className="bg-[#111827] text-white">{t.statusOnLeave}</option>
                  <option value="terminated" className="bg-[#111827] text-white">{t.statusTerminated}</option>
                  <option value="suspended" className="bg-[#111827] text-white">{t.statusSuspended}</option>
                </select>
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
