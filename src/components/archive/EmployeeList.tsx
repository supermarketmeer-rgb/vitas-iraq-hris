import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface EmployeeListProps {
  onSelectEmployee: (employee: any) => void;
  onAddEmployee: () => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  onSelectEmployee,
  onAddEmployee,
  isAddModalOpen,
  setIsAddModalOpen,
  language,
  theme
}) => {
  const { employees, t } = useApp();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${emp.first_name || (emp as any).firstName || ''} ${emp.last_name || (emp as any).lastName || ''} ${(emp as any).full_name_ar || ''} ${(emp as any).full_name_en || ''} ${(emp as any).fullName || ''} ${(emp as any).fullNameEn || ''}`.toLowerCase();
    const empId = `${emp.employee_id || (emp as any).employeeId || (emp as any).badge_no || emp.id || ''}`.toLowerCase();
    const email = `${emp.email || ''}`.toLowerCase();
    const dept = `${emp.department || (emp as any).department_name || ''}`.toLowerCase();
    return fullName.includes(searchLower) || empId.includes(searchLower) || email.includes(searchLower) || dept.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {t('الملفات الإلكترونية وسجلات الموظفين', 'Employee Digital Files & Records')}
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {t(`إجمالي الموظفين المسجلين: ${filteredEmployees.length}`, `Total Registered Staff: ${filteredEmployees.length}`)}
          </p>
        </div>
        <button
          onClick={onAddEmployee}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl transition font-semibold text-sm shadow-md shadow-teal-600/20"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>{t('إضافة ملف موظف', 'Add Employee File')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className={`material-symbols-outlined absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          search
        </span>
        <input
          type="text"
          placeholder={t('بحث بالاسم، الرقم الوظيفي، القسم، أو البريد...', 'Search by name, employee ID, department, or email...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full rounded-2xl ${isAr ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            isDark
              ? 'bg-[#0a0c10] border border-white/10 text-slate-200 placeholder:text-slate-500'
              : 'bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 shadow-sm'
          }`}
        />
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee: any) => {
          const name = isAr
            ? (employee.full_name_ar || employee.fullName || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.full_name_en || 'موظف')
            : (employee.full_name_en || employee.fullNameEn || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.full_name_ar || 'Employee');
          const empCode = employee.employee_id || employee.employeeId || employee.badge_no || `EMP-${employee.id}`;
          const pos = employee.position_ar || employee.position || employee.position_en || employee.department || '';

          return (
            <div
              key={employee.id}
              onClick={() => onSelectEmployee(employee)}
              className={`rounded-2xl p-5 border transition-all duration-200 cursor-pointer group hover:scale-[1.01] ${
                isDark
                  ? 'bg-[#0a0c10] border-white/10 hover:border-teal-500/50 text-white shadow-lg'
                  : 'bg-white border-slate-200 hover:border-teal-500 shadow-sm text-slate-900'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                  isDark
                    ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-400'
                    : 'bg-teal-50 border border-teal-200 text-teal-700'
                }`}>
                  {name.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">
                    {name}
                  </h3>
                  <p className={`text-xs font-mono font-medium truncate mt-0.5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                    {empCode}
                  </p>
                  <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {pos}
                  </p>
                </div>
              </div>

              <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  employee.status === 'Active' || employee.status === 'نشط' || !employee.status
                    ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {isAr ? (employee.status === 'Active' || !employee.status ? 'نشط' : employee.status) : (employee.status || 'Active')}
                </span>
                <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-all">
                  arrow_forward
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <div className={`text-center py-16 rounded-3xl border ${isDark ? 'bg-[#0a0c10] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
          <span className="material-symbols-outlined text-6xl text-slate-500 mb-3 block">
            folder_off
          </span>
          <p className="font-medium">
            {t('لا توجد ملفات موظفين مطابقة للبحث', 'No employee files match the search criteria')}
          </p>
        </div>
      )}
    </div>
  );
};
