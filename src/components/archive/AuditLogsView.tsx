import React from 'react';
import { useApp } from '../../context/AppContext';

interface AuditLogsViewProps {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ language }) => {
  const { t } = useApp();
  
  return (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-6xl text-teal-400 mb-4">security</span>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('سجل التدقيق والصلاحيات', 'Audit Logs & RBAC')}
      </h2>
      <p className="text-slate-400">
        {t('قيد التطوير...', 'Under development...')}
      </p>
    </div>
  );
};
