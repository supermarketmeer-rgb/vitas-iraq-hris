import React from 'react';
import { useApp } from '../../context/AppContext';

interface WorkflowManagerProps {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({ theme = 'light' }) => {
  const { t, theme: appTheme } = useApp();
  const isDark = (theme || appTheme) === 'dark';
  
  return (
    <div className={`text-center py-16 rounded-3xl border transition-all ${
      isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center ${
        isDark ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400' : 'bg-teal-50 border border-teal-200 text-teal-700'
      }`}>
        <span className="material-symbols-outlined text-4xl">account_tree</span>
      </div>
      <h2 className="text-xl font-bold mb-2">
        {t('مسارات العمل وأتمتة n8n', 'Workflows & n8n Automation')}
      </h2>
      <p className={`text-sm max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {t('ربط وتكامل دورات الاعتماد، التوقيع الرقمي، وسير عمل المستندات مع محرك n8n.', 'Integrate document approvals, digital signatures, and workflow automation with n8n.')}
      </p>
    </div>
  );
};
