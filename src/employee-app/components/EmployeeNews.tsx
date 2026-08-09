import React from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { CompanyNews } from '../../components/CompanyNews';

interface EmployeeNewsProps {
  employee: any;
  onLogout: () => void;
}

export const EmployeeNews: React.FC<EmployeeNewsProps> = () => {
  const { theme } = useEmployeeContext();
  const isDark = theme === 'dark';

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">newspaper</span>
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              أخبار وإعلانات فيتاس
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              تابع أحدث التعميمات والأحداث الرسمية
            </p>
          </div>
        </div>
      </div>

      {/* Company News Container */}
      <div className={`p-4 rounded-3xl border shadow-md ${
        isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <CompanyNews language="ar" isReadOnly={true} />
      </div>
    </div>
  );
};
