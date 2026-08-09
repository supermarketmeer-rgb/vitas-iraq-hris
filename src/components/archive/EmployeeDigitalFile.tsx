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
  language
}) => {
  const { t } = useApp();
  const isAr = language === 'ar';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition"
      >
        <span className="material-symbols-outlined">{isAr ? 'arrow_forward' : 'arrow_back'}</span>
        <span>{t('عودة', 'Back')}</span>
      </button>

      {/* Employee Header */}
      <div className="glass-panel bg-[#111827] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-2xl">
            {employee.first_name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {isAr 
                ? `${employee.first_name} ${employee.last_name}`
                : `${employee.first_name} ${employee.last_name}`
              }
            </h2>
            <p className="text-slate-400">{employee.employee_id}</p>
            <p className="text-sm text-slate-500">{employee.position}</p>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="glass-panel bg-[#111827] border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {t('الوثائق', 'Documents')}
        </h3>
        <div className="text-center py-8 text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2">folder_open</span>
          <p>{t('لا توجد وثائق حالياً', 'No documents yet')}</p>
        </div>
      </div>
    </div>
  );
};
