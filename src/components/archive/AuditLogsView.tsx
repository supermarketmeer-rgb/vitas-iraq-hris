import React from 'react';
import { useApp } from '../../context/AppContext';

interface AuditLogsViewProps {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ theme = 'light' }) => {
  const { t, theme: appTheme } = useApp();
  const isDark = (theme || appTheme) === 'dark';
  
  return (
    <div className={`text-center py-16 rounded-3xl border transition-all ${
      isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center ${
        isDark ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400' : 'bg-teal-50 border border-teal-200 text-teal-700'
      }`}>
        <span className="material-symbols-outlined text-4xl">security</span>
      </div>
      <h2 className="text-xl font-bold mb-2">
        {t('سجل التدقيق وتتبع العمليات (Audit Logs)', 'Audit Logs & RBAC Tracking')}
      </h2>
      <p className={`text-sm max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {t('تتبع كافة عمليات الرفع، الحذف، التعديل، والمشاهدة على الوثائق والمستندات بدقة متناهية.', 'Complete chronological tracking of all upload, edit, delete, and view operations.')}
      </p>
    </div>
  );
};
