import React from 'react';
import { useApp } from '../../context/AppContext';

interface EmployeeDigitalFileProps {
  employee: any;
  onBack: () => void;
  onUploadForEmployee: (empId: string, catId?: string) => void;
  onViewDocument: (doc: any) => void;
  onArchiveDocument: (docId: string) => void;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const EmployeeDigitalFile: React.FC<EmployeeDigitalFileProps> = ({
  employee,
  onBack,
  onUploadForEmployee,
  onViewDocument,
  language,
  theme
}) => {
  const { t } = useApp();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const name = isAr
    ? (employee.full_name_ar || employee.fullName || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.full_name_en || 'موظف')
    : (employee.full_name_en || employee.fullNameEn || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.full_name_ar || 'Employee');
  const empCode = employee.employee_id || employee.employeeId || employee.badge_no || `EMP-${employee.id}`;
  const pos = employee.position_ar || employee.position || employee.position_en || employee.department || '';
  const dept = employee.department || employee.department_name || '';
  const branch = employee.branch || employee.branch_name || '';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition ${
          isDark ? 'bg-slate-900 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
        }`}
      >
        <span className="material-symbols-outlined text-base">{isAr ? 'arrow_forward' : 'arrow_back'}</span>
        <span>{t('العودة إلى قائمة الموظفين', 'Back to Employee List')}</span>
      </button>

      {/* Employee Header */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl shrink-0 ${
              isDark
                ? 'bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 text-teal-400'
                : 'bg-teal-50 border border-teal-200 text-teal-700'
            }`}>
              {name.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  isDark ? 'bg-teal-900/40 text-teal-300 border border-teal-500/30' : 'bg-teal-50 text-teal-700 border border-teal-200'
                }`}>
                  {empCode}
                </span>
                {dept && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                    isDark ? 'bg-slate-800 text-slate-300 border border-white/5' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {dept}
                  </span>
                )}
                {branch && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full ${
                    isDark ? 'bg-slate-800 text-slate-300 border border-white/5' : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {branch}
                  </span>
                )}
              </div>
              {pos && <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{pos}</p>}
            </div>
          </div>

          <button
            onClick={() => onUploadForEmployee(String(employee.id))}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl transition font-semibold text-xs shadow-md shadow-teal-600/20 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span>{t('رفع وثيقة جديدة', 'Upload New Document')}</span>
          </button>
        </div>
      </div>

      {/* Documents Section */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-500 text-lg">folder_shared</span>
          <span>{t('الملفات والوثائق المؤرشفة', 'Archived Files & Documents')}</span>
        </h3>
        <div className={`text-center py-12 rounded-2xl border ${isDark ? 'bg-slate-900/40 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
          <span className="material-symbols-outlined text-5xl mb-2 text-slate-400 block">folder_open</span>
          <p className="text-sm font-medium">{t('لا توجد وثائق مؤرشفة لهذا الموظف حالياً', 'No archived documents yet for this employee')}</p>
        </div>
      </div>
    </div>
  );
};
