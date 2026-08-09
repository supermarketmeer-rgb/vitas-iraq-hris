import React from 'react';
import { useApp } from '../../context/AppContext';

interface DocumentViewModalProps {
  document: any;
  onClose: () => void;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
}

export const DocumentViewModal: React.FC<DocumentViewModalProps> = ({ document, onClose, language }) => {
  const { t } = useApp();
  const isAr = language === 'ar';
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{document.title || 'Document'}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </div>
        <div className="p-8 text-center text-slate-400">
          <span className="material-symbols-outlined text-6xl mb-4">description</span>
          <p>{t('عرض الوثيقة', 'Document View')}</p>
        </div>
      </div>
    </div>
  );
};
