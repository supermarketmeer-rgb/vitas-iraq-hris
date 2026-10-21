import React, { useState } from 'react';
import { Employee, EmployeeCategory, EmploymentStatus } from '../types';
import { StorageService } from '../services/storage';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Check,
  X,
  Building,
  UserCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface EmployeesViewProps {
  isDark?: boolean;
  vitasEmployees?: any[];
}

export const IncentivesEmployeesView: React.FC<EmployeesViewProps> = ({ isDark = false, vitasEmployees = [] }) => {
  const [employees, setEmployees] = useState<Employee[]>(StorageService.getEmployees());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formValues, setFormValues] = useState<Partial<Employee>>({
    category: 'Loan Officer',
    status: 'Active',
    effectiveFrom: new Date().toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const supervisors = employees.filter((e) => e.category === 'Loan Officer Supervisor');
  const offices = Array.from(new Set(employees.map((e) => e.office)));

  // Filtered List
  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOffice = selectedOffice === 'all' || emp.office === selectedOffice;
    const matchesCat = selectedCategory === 'all' || emp.category === selectedCategory;
    return matchesSearch && matchesOffice && matchesCat;
  });

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormValues({
      id: 'emp_' + Date.now(),
      employeeId: 'VTS-' + Math.floor(2000 + Math.random() * 8000),
      name: '',
      office: offices[0] || 'بغداد_الكرخ',
      jobTitle: 'مسؤول قروض وتمويل',
      category: 'Loan Officer',
      supervisorId: supervisors[0]?.employeeId || '',
      status: 'Active',
      effectiveFrom: new Date().toISOString().split('T')[0],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormValues({ ...emp });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.name || !formValues.name.trim()) {
      setFormError('اسم الموظف مطلوب');
      return;
    }
    if (!formValues.employeeId || !formValues.employeeId.trim()) {
      setFormError('رقم الموظف المؤسسي (Employee ID / Badge) مطلوب');
      return;
    }

    if (!editingEmployee) {
      const exists = employees.some((e) => e.employeeId === formValues.employeeId);
      if (exists) {
        setFormError('رقم الموظف المؤسسي مسجل مسبقاً لموظف آخر');
        return;
      }
    }

    const saved: Employee = {
      id: formValues.id || 'emp_' + Date.now(),
      employeeId: formValues.employeeId!.trim(),
      badgeNo: formValues.badgeNo ? formValues.badgeNo.trim() : undefined,
      waid: formValues.waid ? formValues.waid.trim() : undefined,
      name: formValues.name!.trim(),
      office: formValues.office || 'المكتب الرئيسي',
      jobTitle: formValues.jobTitle || 'موظف',
      category: formValues.category as EmployeeCategory,
      supervisorId: formValues.category === 'Loan Officer' ? formValues.supervisorId : undefined,
      status: (formValues.status as EmploymentStatus) || 'Active',
      effectiveFrom: formValues.effectiveFrom || new Date().toISOString().split('T')[0],
      effectiveTo: formValues.effectiveTo || undefined,
      phone: formValues.phone || undefined,
      email: formValues.email || undefined,
    };

    StorageService.saveEmployee(saved);
    setEmployees(StorageService.getEmployees());
    setIsModalOpen(false);
  };

  const handleDelete = (empId: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف الموظف "${name}"؟ لن يتم حذف المستحقات التاريخية المحسوبة مسبقاً.`)) {
      StorageService.deleteEmployee(empId);
      setEmployees(StorageService.getEmployees());
    }
  };

  // Sync from VITAS HR
  const handleSyncFromVitas = () => {
    if (!vitasEmployees || vitasEmployees.length === 0) {
      setSyncFeedback('لا توجد سجلات موظفين متاحة للمزامنة حالياً');
      setTimeout(() => setSyncFeedback(null), 3000);
      return;
    }

    const res = StorageService.syncFromVitasHR(vitasEmployees);
    setEmployees(StorageService.getEmployees());
    setSyncFeedback(`تمت المزامنة بنجاح: تم إضافة ${res.added} وتحديث ${res.updated} موظفاً من قاعدة بيانات فيتاس العراق.`);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400 text-lg">badge</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">
              LOAN OFFICERS & SUPERVISORS DIRECTORY
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            إدارة مسؤولي القروض والمشرفين
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            تحديد تصنيف مسؤولي القروض والمشرفين وربط كل مسؤول بمشرفه المباشر لاحتساب حوافز الفريق التراكمية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {vitasEmployees && vitasEmployees.length > 0 && (
            <button
              onClick={handleSyncFromVitas}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                isDark ? 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300'
              }`}
              title="سحب ومزامنة الموظفين ومسؤولي القروض من كادر فيتاس العراق"
            >
              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
              <span>مزامنة كادر فيتاس العراق ({vitasEmployees.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Message */}
      {syncFeedback && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
          <Check className="w-4 h-4" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      } flex flex-col md:flex-row gap-3 items-center justify-between text-xs`}>
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
          <input
            type="text"
            placeholder="بحث بالاسم، الرقم الوظيفي، أو المسمى..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pr-10 pl-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 transition-colors ${
              isDark ? 'bg-[#0f172a] border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Office Filter */}
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-400" />
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className={`rounded-xl border px-3 py-1.5 focus:outline-none focus:border-teal-500 font-medium ${
                isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="all">كافة الفروع والمواقع ({offices.length})</option>
              {offices.map((off) => (
                <option key={off} value={off}>
                  {off}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`rounded-xl border px-3 py-1.5 focus:outline-none focus:border-teal-500 font-medium ${
                isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="all">كافة الفئات</option>
              <option value="Loan Officer">مسؤولو القروض (Loan Officers)</option>
              <option value="Loan Officer Supervisor">مشرفو مسؤولي القروض (Supervisors)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className={`rounded-3xl border overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-right border-collapse">
            <thead className={`${isDark ? 'bg-[#06080d] text-slate-300 border-white/10' : 'bg-slate-50 text-slate-700 border-slate-200'} border-b font-bold`}>
              <tr>
                <th className="p-3.5">الرقم المؤسسي (ID)</th>
                <th className="p-3.5">رقم البادج (Badge)</th>
                <th className="p-3.5">معرف الحوافز (WAID)</th>
                <th className="p-3.5">اسم الموظف</th>
                <th className="p-3.5">الفرع / الموقع</th>
                <th className="p-3.5">المسمى الوظيفي</th>
                <th className="p-3.5">الفئة</th>
                <th className="p-3.5">المشرف المباشر</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-medium">
                    لا يوجد موظفون مطابقون لخيارات البحث
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const sup = emp.supervisorId ? employees.find((s) => s.employeeId === emp.supervisorId) : undefined;
                  const isLO = emp.category === 'Loan Officer';

                  return (
                    <tr key={emp.id} className={`${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'} transition-colors`}>
                      <td className="p-3.5 font-mono font-bold text-teal-400">
                        {emp.employeeId}
                      </td>
                      <td className="p-3.5 font-mono">
                        {emp.badgeNo ? (
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-slate-300">{emp.badgeNo}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono">
                        {emp.waid ? (
                          <span className="px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30 text-teal-300 font-bold">{emp.waid}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold">
                        <div>{emp.name}</div>
                        {emp.email && <div className="text-[10px] text-slate-400 font-mono">{emp.email}</div>}
                      </td>
                      <td className="p-3.5 flex items-center gap-1.5 pt-4">
                        <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                        <span>{emp.office}</span>
                      </td>
                      <td className="p-3.5 text-slate-300 dark:text-slate-300 text-slate-700">
                        {emp.jobTitle}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                            isLO
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}
                        >
                          {isLO ? 'مسؤول قروض' : 'مشرف مسؤولين'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {isLO ? (
                          sup ? (
                            <span className="text-teal-400 font-medium flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>{sup.name}</span>
                            </span>
                          ) : (
                            <span className="text-amber-500 text-[11px] font-medium">غير معين</span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[11px]">— (مشرف)</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
                            emp.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {emp.status === 'Active' ? 'نشط' : emp.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                            }`}
                            title="تعديل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.employeeId, emp.name)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-6 border-b ${isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد للموديول'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    تعيين المعرف والفرع ودور الإشراف في منظومة الحوافز
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">الرقم المؤسسي (Employee ID) *</label>
                  <input
                    type="text"
                    required
                    value={formValues.employeeId || ''}
                    onChange={(e) => setFormValues({ ...formValues, employeeId: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 font-mono font-bold ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    placeholder="مثال: VTS-5345"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">رقم البادج (Badge Number)</label>
                  <input
                    type="text"
                    value={formValues.badgeNo || ''}
                    onChange={(e) => setFormValues({ ...formValues, badgeNo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 font-mono ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    placeholder="مثال: B-5345"
                  />
                </div>

                <div>
                  <label className="block text-teal-300 mb-1 font-bold">
                    معرف الحوافز (WAID) <span className="text-[10px] text-teal-400 font-mono">(لتحميل الحوافز)</span>
                  </label>
                  <input
                    type="text"
                    value={formValues.waid || ''}
                    onChange={(e) => setFormValues({ ...formValues, waid: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border border-teal-500/30 focus:outline-none focus:border-teal-400 font-mono text-teal-300 font-bold ${
                      isDark ? 'bg-[#0f172a] text-teal-300' : 'bg-slate-50 border-slate-200 text-teal-800'
                    }`}
                    placeholder="مثال: WA-5345"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">اسم الموظف الكامل *</label>
                <input
                  type="text"
                  required
                  value={formValues.name || ''}
                  onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                    isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                  placeholder="اسم الموظف ثلاثياً"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">الفرع / المكتب</label>
                  <input
                    type="text"
                    value={formValues.office || ''}
                    onChange={(e) => setFormValues({ ...formValues, office: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    placeholder="مثال: بابل_الحلة"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">المسمى الوظيفي</label>
                  <input
                    type="text"
                    value={formValues.jobTitle || ''}
                    onChange={(e) => setFormValues({ ...formValues, jobTitle: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    placeholder="مسؤول قروض وتمويل"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">فئة الموظف</label>
                  <select
                    value={formValues.category || 'Loan Officer'}
                    onChange={(e) =>
                      setFormValues({
                        ...formValues,
                        category: e.target.value as EmployeeCategory,
                        supervisorId: e.target.value === 'Loan Officer Supervisor' ? undefined : formValues.supervisorId,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 font-bold ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Loan Officer">مسؤول قروض (Loan Officer)</option>
                    <option value="Loan Officer Supervisor">مشرف مسؤولي قروض (Supervisor)</option>
                  </select>
                </div>

                {formValues.category === 'Loan Officer' && (
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">المشرف المباشر</label>
                    <select
                      value={formValues.supervisorId || ''}
                      onChange={(e) => setFormValues({ ...formValues, supervisorId: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                        isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="">بدون مشرف مباشر</option>
                      {supervisors.map((s) => (
                        <option key={s.employeeId} value={s.employeeId}>
                          {s.name} ({s.office})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formValues.email || ''}
                    onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                    placeholder="email@vitasiraq.com"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">حالة الموظف</label>
                  <select
                    value={formValues.status || 'Active'}
                    onChange={(e) => setFormValues({ ...formValues, status: e.target.value as EmploymentStatus })}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:border-teal-500 font-bold ${
                      isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="Active">نشط (Active)</option>
                    <option value="On Leave">في إجازة (On Leave)</option>
                    <option value="Inactive">غير نشط (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${
                    isDark ? 'bg-white/10 hover:bg-white/15 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold shadow-lg shadow-teal-600/30 cursor-pointer"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
