import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CandidatePipeline } from '../components/recruitment/CandidatePipeline';
import { CandidateProfile } from '../components/recruitment/CandidateProfile';
import { JobOpenings } from '../components/recruitment/JobOpenings';
import { CandidatePortal } from '../components/recruitment/CandidatePortal';

export const Category6RecruitmentView: React.FC = () => {
  const { activeModuleId, t, theme, setActiveModuleId } = useApp();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const openCandidatePortal = () => {
    // Open the public candidate portal URL in a new tab
    const portalUrl = window.location.origin + '/apply';
    window.open(portalUrl, '_blank');
  };

  const openEmployeePortal = () => {
    // Open the public employee portal URL in a new tab
    const portalUrl = window.location.origin + '/portal';
    window.open(portalUrl, '_blank');
  };

  const getModuleTitle = () => {
    switch (activeModuleId) {
      case 'recruit-dash':
        return t('إدارة الوظائف الشاغرة', 'Job Openings Management');
      case 'recruit-ats':
        return t('خط أنابيب المرشحين', 'Candidate Pipeline');
      case 'recruit-candidate-profile':
        return t('ملف المرشح', 'Candidate Profile');
      case 'recruit-candidate-portal':
        return t('بوابة المتقدمين للوظائف', 'Candidate Portal');
      default:
        return t('التوظيف والاستقطاب', 'Recruitment & ATS');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-teal-400">work_history</span>
              <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-normal">
                RECRUITMENT & ATS
              </span>
            </div>
            <h1 className="text-2xl font-normal text-white text-white-force drop-shadow-sm">
              {getModuleTitle()}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {t('نظام استقطاب ذكي مرتبط بالبنية التحتية لمؤسسة فيتاس العراق', 'Smart recruitment system connected to VITAS Iraq HR infrastructure')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCandidatePortal}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all"
            >
              <span className="material-symbols-outlined text-sm">open_in_new</span>
              {t('فتح بوابة المتقدمين', 'Open Candidate Portal')}
            </button>
            <button
              onClick={openEmployeePortal}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all"
            >
              <span className="material-symbols-outlined text-sm">person_pin</span>
              {t('فتح بوابة الموظفين', 'Open Employee Portal')}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className={`p-6 rounded-2xl ${isDark ? 'bg-[#111827] border border-white/10 shadow-lg text-white' : 'bg-white border border-slate-200 shadow-sm text-slate-900'}`}>
        {activeModuleId === 'recruit-dash' && <JobOpenings />}
        {activeModuleId === 'recruit-ats' && <CandidatePipeline />}
        {activeModuleId === 'recruit-candidate-profile' && <CandidateProfile />}
        {activeModuleId === 'recruit-candidate-portal' && <CandidatePortal />}
        {!['recruit-dash', 'recruit-ats', 'recruit-candidate-profile', 'recruit-candidate-portal'].includes(activeModuleId) && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-600 mb-4">work_off</span>
            <p className="text-slate-400">{t('الرجاء اختيار وحدة من القائمة الجانبية', 'Please select a module from the sidebar')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
