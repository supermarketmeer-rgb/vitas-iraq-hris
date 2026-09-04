import React from 'react';
import { useApp } from '../../context/AppContext';

interface CategoriesSettingsProps {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const CategoriesSettings: React.FC<CategoriesSettingsProps> = ({ theme = 'light' }) => {
  const { t, theme: appTheme } = useApp();
  const isDark = (theme || appTheme) === 'dark';
  
  return (
    <div className={`text-center py-16 rounded-3xl border transition-all ${
      isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      <div className={`w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center ${
        isDark ? 'bg-teal-500/10 border border-teal-500/30 text-teal-400' : 'bg-teal-50 border border-teal-200 text-teal-700'
      }`}>
        <span className="material-symbols-outlined text-4xl">settings</span>
      </div>
      <h2 className="text-xl font-bold mb-2">
        {t('إدارة التصنيفات وإعدادات الأرشفة', 'Categories & Archival Configuration')}
      </h2>
      <p className={`text-sm max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        {t('تهيئة شجرة تصنيفات المستندات، قواعد الصلاحيات، ومحددات أنواع الملفات المسموحة.', 'Configure document taxonomy, permission rules, and file type validation policies.')}
      </p>
    </div>
  );
};
