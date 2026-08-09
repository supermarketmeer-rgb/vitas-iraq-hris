import React from 'react';
import { useApp } from '../../context/AppContext';

interface WorkflowManagerProps {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ language }) => {
  const { t } = useApp();
  
  return (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-6xl text-teal-400 mb-4">account_tree</span>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('مسارات العمل والـ n8n', 'Workflows & n8n')}
      </h2>
      <p className="text-slate-400">
        {t('قيد التطوير...', 'Under development...')}
      </p>
    </div>
  );
};
