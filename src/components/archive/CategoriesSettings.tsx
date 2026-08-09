import React from 'react';
import { useApp } from '../../context/AppContext';

interface CategoriesSettingsProps {
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const CategoriesSettings: React.FC<CategoriesSettingsProps> = ({ language }) => {
  const { t } = useApp();
  
  return (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-6xl text-teal-400 mb-4">settings</span>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('التصنيفات وتثبيت النظام', 'Categories & System')}
      </h2>
      <p className="text-slate-400">
        {t('قيد التطوير...', 'Under development...')}
      </p>
    </div>
  );
};
