import React from 'react';
import { useApp } from '../../context/AppContext';

interface ExpiryManagementProps {
  onViewDocument: (doc: any) => void;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const ExpiryManagement: React.FC<ExpiryManagementProps> = ({ language }) => {
  const { t } = useApp();
  
  return (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-6xl text-teal-400 mb-4">event_available</span>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('إدارة الانتهاء والتنبيهات', 'Expiry Management')}
      </h2>
      <p className="text-slate-400">
        {t('قيد التطوير...', 'Under development...')}
      </p>
    </div>
  );
};
