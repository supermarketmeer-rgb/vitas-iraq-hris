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

  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase();
    return (
      emp.first_name?.toLowerCase().includes(searchLower) ||
      emp.last_name?.toLowerCase().includes(searchLower) ||
      emp.employee_id?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            {t('قائمة الموظفين', 'Employee List')}
          </h2>
          <p className="text-sm text-slate-400">
            {t(`عدد الموظفين: ${filteredEmployees.length}`, `Total Employees: ${filteredEmployees.length}`)}
          </p>
        </div>
        <button
          onClick={onAddEmployee}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-xl transition font-semibold text-sm shadow-lg shadow-teal-600/25"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          <span>{t('إضافة موظف', 'Add Employee')}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className={`material-symbols-outlined absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 text-slate-500`}>
          search
        </span>
        <input
          type="text"
          placeholder={t('بحث عن موظف...', 'Search employees...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full bg-[#0a0c10] border border-white/10 rounded-xl ${isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500/60 transition-colors placeholder:text-slate-600`}
        />
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee) => (
          <div
            key={employee.id}
            onClick={() => onSelectEmployee(employee)}
            className="glass-panel bg-[#111827] border border-white/10 rounded-2xl p-5 hover:border-teal-500/30 transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-lg">
                {employee.first_name?.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white text-sm truncate">
                  {isAr 
                    ? `${employee.first_name} ${employee.last_name}`
                    : `${employee.first_name} ${employee.last_name}`
                  }
                </h3>
                <p className="text-xs text-slate-400 truncate">{employee.employee_id}</p>
                <p className="text-xs text-slate-500 truncate">{employee.position}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${
                employee.status === 'Active' 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {isAr ? (employee.status === 'Active' ? 'نشط' : employee.status) : employee.status}
              </span>
              <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-400 transition-colors">
                arrow_forward
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">
            person_search
          </span>
          <p className="text-slate-400">
            {t('لا يوجد موظفين', 'No employees found')}
          </p>
        </div>
      )}
    </div>
  );
};
