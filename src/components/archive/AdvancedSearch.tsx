import React from 'react';
import { useApp } from '../../context/AppContext';

interface AdvancedSearchProps {
  onViewDocument: (doc: any) => void;
  onArchiveDocument: (docId: string) => void;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ language }) => {
  const { t } = useApp();
  
  return (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-6xl text-teal-400 mb-4">search</span>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('محرك البحث المتقدم', 'Advanced Search')}
      </h2>
      <p className="text-slate-400">
        {t('قيد التطوير...', 'Under development...')}
      </p>
    </div>
  );
};
