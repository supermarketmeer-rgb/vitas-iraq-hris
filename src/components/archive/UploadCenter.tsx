import React from 'react';
import { useApp } from '../../context/AppContext';

interface UploadCenterProps {
  preselectedEmployeeId?: string;
  preselectedCategoryId?: string;
  onUploadSuccess: (doc: any) => void;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const UploadCenter: React.FC<UploadCenterProps> = ({ language }) => {
  const { t } = useApp();
  
  return (
    <div className="text-center py-12">
      <span className="material-symbols-outlined text-6xl text-teal-400 mb-4">cloud_upload</span>
      <h2 className="text-xl font-bold text-white mb-2">
        {t('مركز الرفع والمسح الذكي', 'Upload & OCR Center')}
      </h2>
      <p className="text-slate-400">
        {t('قيد التطوير...', 'Under development...')}
      </p>
    </div>
  );
};
