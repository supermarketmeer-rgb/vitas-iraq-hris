import React, { useState, useMemo, useEffect } from 'react';
import { 
  PERFORMANCE_APPRAISAL_TEMPLATES, 
  PerformanceAppraisalTemplate 
} from '../../data/performanceAppraisalTemplates';
import { PerformanceAppraisalExcelSheet } from './PerformanceAppraisalExcelSheet';
import { StatusBadge } from './StatusBadge';
import { SignaturePad } from './SignaturePad';
import { api } from '../../api/client';

interface AppraisalWorkspaceModalProps {
  appraisalData?: any;
  employee: any;
  language?: string;
  isDark?: boolean;
  onClose: () => void;
  onSaved?: (updatedAppraisal: any) => void;
}

export const AppraisalWorkspaceModal: React.FC<AppraisalWorkspaceModalProps> = ({
  appraisalData,
  employee,
  language = 'ar',
  isDark = true,
  onClose,
  onSaved,
}) => {
  // Determine default template based on job title / category
  const defaultTemplateId = useMemo(() => {
    if (appraisalData?.template_id) return appraisalData.template_id;
    const title = (employee?.jobTitle || employee?.position || employee?.position_ar || '').toLowerCase();
    if (title.includes('نظافة') || title.includes('صيانة') || title.includes('cleaner') || title.includes('maintenance')) {
      return 'pa-maintenance-cleaner';
    }
    if (title.includes('حرس') || title.includes('أمن') || title.includes('security') || title.includes('guard') || title.includes('فريق') || title.includes('leader')) {
      return 'pa-team-leaders-guards';
    }
    return 'pa-staff';
  }, [employee, appraisalData]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplateId);
  const [viewMode, setViewMode] = useState<'interactive' | 'excel_sheet'>('interactive');
  const [activeTab, setActiveTab] = useState<'criteria' | 'goals_trainings' | 'signatures' | 'discussion'>('criteria');

  // Template object
  const currentTemplate = useMemo(() => {
    return PERFORMANCE_APPRAISAL_TEMPLATES.find(t => t.id === selectedTemplateId) || PERFORMANCE_APPRAISAL_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Scores state: key = `${secIdx}_${itemIdx}` => { emp: number, mgr: number }
  const [scores, setScores] = useState<Record<string, { emp: number; mgr: number }>>(
    appraisalData?.scores || appraisalData?.scores_json ? (typeof appraisalData.scores_json === 'string' ? JSON.parse(appraisalData.scores_json) : (appraisalData.scores || {})) : {}
  );

  // Contract decision
  const [contractDecision, setContractDecision] = useState<'renew' | 'terminate'>(
    appraisalData?.contract_decision || 'renew'
  );

  // Goals
  const [goals, setGoals] = useState<Array<{ goal: string; weight: number; party: string }>>(
    appraisalData?.goals || (appraisalData?.goals_json ? (typeof appraisalData.goals_json === 'string' ? JSON.parse(appraisalData.goals_json) : appraisalData.goals) : [
      { goal: '', weight: 0, party: 'الموظف:' },
      { goal: '', weight: 0, party: 'المشرف المباشر:' },
      { goal: '', weight: 0, party: 'الموظف:' },
      { goal: '', weight: 0, party: 'المشرف المباشر:' }
    ])
  );

  // Trainings
  const [trainings, setTrainings] = useState<Array<{ title: string; type: string; party: string }>>(
    appraisalData?.trainings || (appraisalData?.trainings_json ? (typeof appraisalData.trainings_json === 'string' ? JSON.parse(appraisalData.trainings_json) : appraisalData.trainings) : [
      { title: '', type: 'له علاقة بالعمل', party: 'الموظف:' },
      { title: '', type: 'له علاقة بالمهارات', party: 'المشرف المباشر:' },
      { title: '', type: 'له علاقة بالمسار الوظيفي', party: 'الموظف:' },
      { title: '', type: 'له علاقة بالعمل', party: 'المشرف المباشر:' }
    ])
  );

  // Recommendations and comments
  const [recommendations, setRecommendations] = useState<string>(appraisalData?.recommendations || '');
  const [selfComments, setSelfComments] = useState<string>(appraisalData?.self_comments || '');
  const [workflowStatus, setWorkflowStatus] = useState<string>(appraisalData?.workflow_status || 'In Progress');

  // Signatures
  const [signatures, setSignatures] = useState<any>(
    appraisalData?.signatures || (appraisalData?.signatures_json ? (typeof appraisalData.signatures_json === 'string' ? JSON.parse(appraisalData.signatures_json) : appraisalData.signatures) : {})
  );

  // Signature modal state
  const [signingRole, setSigningRole] = useState<'employee' | 'supervisor' | 'hr' | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Score updater
  const updateScore = (secIdx: number, itemIdx: number, role: 'emp' | 'mgr', val: number) => {
    const key = `${secIdx}_${itemIdx}`;
    setScores(prev => ({
      ...prev,
      [key]: {
        emp: role === 'emp' ? val : (prev[key]?.emp || 0),
        mgr: role === 'mgr' ? val : (prev[key]?.mgr || 0)
      }
    }));
  };

  // Compute live scores exactly matching Excel formulas
  const { totalEmpScore, totalMgrScore, finalOverallRating } = useMemo(() => {
    const secResults: Array<{ avgEmp: number; avgMgr: number; pctEmp: number; pctMgr: number; count: number }> = [];

    currentTemplate.sections.forEach((sec, sIdx) => {
      let sumEmp = 0;
      let sumMgr = 0;
      let count = sec.items.length;

      sec.items.forEach((_, iIdx) => {
        const sc = scores[`${sIdx}_${iIdx}`] || { emp: 0, mgr: 0 };
        sumEmp += Number(sc.emp || 0);
        sumMgr += Number(sc.mgr || 0);
      });

      const avgEmp = count > 0 ? sumEmp / count : 0;
      const avgMgr = count > 0 ? sumMgr / count : 0;
      const pctEmp = (avgEmp / 5) * 100;
      const pctMgr = (avgMgr / 5) * 100;
      secResults.push({ avgEmp, avgMgr, pctEmp, pctMgr, count });
    });

    let overallMgr = 0;
    let overallEmp = 0;

    if (currentTemplate.scoringType === 'cleaner') {
      const s0 = secResults[0] || { pctEmp: 0, pctMgr: 0 };
      overallEmp = s0.pctEmp;
      overallMgr = s0.pctMgr;
    } else if (currentTemplate.scoringType === 'team_leaders') {
      const s0 = secResults[0] || { pctEmp: 0, pctMgr: 0 };
      const s1 = secResults[1] || { pctEmp: 0, pctMgr: 0 };
      if (s1.pctMgr > 0) {
        overallMgr = (s0.pctMgr + s1.pctMgr) / 2;
        overallEmp = (s0.pctEmp + s1.pctEmp) / 2;
      } else {
        overallMgr = s0.pctMgr;
        overallEmp = s0.pctEmp;
      }
    } else {
      const coreSecs = secResults.slice(0, 7);
      const coreMgrAvg = coreSecs.reduce((acc, s) => acc + s.pctMgr, 0) / (coreSecs.length || 1);
      const coreEmpAvg = coreSecs.reduce((acc, s) => acc + s.pctEmp, 0) / (coreSecs.length || 1);
      const leadSec = secResults[7];
      if (leadSec && leadSec.pctMgr > 0) {
        overallMgr = (coreSecs.reduce((acc, s) => acc + s.pctMgr, 0) + leadSec.pctMgr) / 8;
        overallEmp = (coreSecs.reduce((acc, s) => acc + s.pctEmp, 0) + leadSec.pctEmp) / 8;
      } else {
        overallMgr = coreMgrAvg;
        overallEmp = coreEmpAvg;
      }
    }

    return {
      totalEmpScore: overallEmp,
      totalMgrScore: overallMgr,
      finalOverallRating: overallMgr > 0 ? (overallMgr / 20).toFixed(2) : '0.00'
    };
  }, [currentTemplate, scores]);

  // Handle saving appraisal
  const handleSaveAppraisal = async (newStatus?: string) => {
    setIsSaving(true);
    setToastMessage(null);
    const finalStatus = newStatus || workflowStatus;

    const payload = {
      id: appraisalData?.id,
      campaign_id: appraisalData?.campaign_id || 1,
      employee_id: String(employee.id || employee.employeeId),
      employee_name_ar: employee.fullName || employee.fullNameAr || employee.name,
      employee_name_en: employee.fullNameEn || employee.name_en || '',
      job_title: employee.jobTitle || employee.position || '',
      department: employee.department || '',
      branch: employee.branch || employee.location || '',
      supervisor_name: employee.supervisorName || employee.supervisor_name || '',
      template_id: selectedTemplateId,
      template_name: currentTemplate.titleAr,
      workflow_status: finalStatus,
      self_score: totalEmpScore,
      supervisor_score: totalMgrScore,
      final_score: totalMgrScore,
      final_rating: finalOverallRating,
      contract_decision: contractDecision,
      scores,
      goals,
      trainings,
      recommendations,
      self_comments: selfComments,
      signatures
    };

    try {
      const res: any = await api.saveAppraisal(payload);
      setWorkflowStatus(finalStatus);
      setToastMessage(language === 'ar' ? 'تم حفظ التقييم بنجاح في قاعدة البيانات!' : 'Appraisal saved successfully!');
      if (onSaved) {
        onSaved({ ...payload, id: res?.id || appraisalData?.id });
      }
    } catch (err: any) {
      console.error('Error saving appraisal:', err);
      // Fallback local save in localStorage
      try {
        const localAppraisals = JSON.parse(localStorage.getItem('vitas_appraisals') || '[]');
        const updated = [payload, ...localAppraisals.filter((a: any) => String(a.employee_id) !== String(payload.employee_id))];
        localStorage.setItem('vitas_appraisals', JSON.stringify(updated));
        setWorkflowStatus(finalStatus);
        setToastMessage(language === 'ar' ? 'تم الحفظ محلياً بنجاح' : 'Saved locally');
        if (onSaved) onSaved(payload);
      } catch (e) {}
    } finally {
      setIsSaving(false);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Handle signature confirmation
  const handleConfirmSignature = (payload: { typedName: string; signatureDrawing?: string }) => {
    if (!signingRole) return;
    const now = new Date().toISOString();
    const newSignatures = {
      ...signatures,
      [signingRole]: {
        typedName: payload.typedName,
        signatureDrawing: payload.signatureDrawing,
        signedAt: now
      }
    };
    setSignatures(newSignatures);
    setSigningRole(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className={`w-full max-w-6xl max-h-[92vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header Bar */}
        <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${
          isDark ? 'bg-[#06080d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold shrink-0">
              <span className="material-symbols-outlined text-xl">rate_review</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-white dark:text-white">
                  {employee?.fullName || employee?.fullNameAr || employee?.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                  {employee?.employeeId || employee?.badgeNo || 'VTS'}
                </span>
                <StatusBadge status={workflowStatus} language={language} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {employee?.jobTitle || employee?.position} • {employee?.branch || employee?.location}
              </p>
            </div>
          </div>

          {/* Quick Actions & View Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle: Interactive Form vs Full Excel Sheet */}
            <div className="p-1 rounded-xl bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('interactive')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'interactive'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">dashboard_customize</span>
                <span>{language === 'ar' ? 'واجهة التقييم' : 'Interactive'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('excel_sheet')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'excel_sheet'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                <span>{language === 'ar' ? 'تصميم شيت الإكسل' : 'Excel Sheet'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {viewMode === 'excel_sheet' ? (
            /* Direct Excel-Matching Sheet View */
            <div>
              <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs">
                <span className="text-teal-300 font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">info</span>
                  {language === 'ar' 
                    ? 'أنت تتصفح النموذج بتصميمه الأصلي المطابق تماماً لملف الإكسل المؤسسي.' 
                    : 'Viewing the exact layout matching the official Excel appraisal sheet.'}
                </span>
                <span className="text-teal-400 font-mono font-bold">{currentTemplate.filename}</span>
              </div>
              <PerformanceAppraisalExcelSheet 
                employees={[employee]}
                language={language}
              />
            </div>
          ) : (
            /* Interactive HRIS-Styled View */
            <div className="space-y-6">
              {/* Template Picker & Score Overview Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Template Selector Box */}
                <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">assignment</span>
                      {language === 'ar' ? 'نموذج التقييم المعتمد (مرتبط بصفحة الإعدادات Templates):' : 'Appraisal Template (Linked to Settings Templates):'}
                    </span>
                    <a
                      href={currentTemplate.downloadUrl}
                      download={currentTemplate.filename}
                      className="text-[11px] font-bold text-teal-500 hover:text-teal-400 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>{language === 'ar' ? 'تنزيل الإكسل الأصلي' : 'Download Original Excel'}</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PERFORMANCE_APPRAISAL_TEMPLATES.map((tmpl) => {
                      const isSelected = tmpl.id === selectedTemplateId;
                      return (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(tmpl.id)}
                          className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-500/10 border-teal-500 ring-2 ring-teal-500/20 text-teal-400 font-bold'
                              : 'bg-white dark:bg-[#06080d] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-[11px] font-bold truncate">{tmpl.titleAr}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">{tmpl.defaultYear}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Score Summary Box */}
                <div className="lg:col-span-4 p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 via-blue-500/5 to-purple-500/10 border border-teal-500/20 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-400">{language === 'ar' ? 'الدرجة النهائية المحسوبة' : 'Calculated Final Score'}</span>
                  <div className="flex items-baseline gap-2 my-2">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">
                      {totalMgrScore.toFixed(1)}%
                    </span>
                    <span className="text-xs font-bold text-purple-400 font-mono">
                      ({finalOverallRating} / 5.0)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span>{language === 'ar' ? 'تقييم الموظف الذاتي: ' : 'Self Rating: '} <strong className="text-blue-400 font-mono">{totalEmpScore.toFixed(1)}%</strong></span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                      {Number(finalOverallRating) >= 4.5 ? 'أستثنائي' : Number(finalOverallRating) >= 3.8 ? 'فوق التوقعات' : Number(finalOverallRating) >= 3.0 ? 'بمستوى التوقعات' : 'اقل من المتوقع'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs for Workspace */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveTab('criteria')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'criteria'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">checklist</span>
                  <span>{language === 'ar' ? 'معايير وكفاءات التقييم' : 'Evaluation Criteria'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('goals_trainings')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'goals_trainings'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">flag</span>
                  <span>{language === 'ar' ? 'الأهداف والدورات التدريبية' : 'Goals & Trainings'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('signatures')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'signatures'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">draw</span>
                  <span>{language === 'ar' ? 'التوصية والتواقيع الإلكترونية' : 'Signatures & Recommendation'}</span>
                </button>
              </div>

              {/* TAB 1: CRITERIA EVALUATION */}
              {activeTab === 'criteria' && (
                <div className="space-y-4">
                  {currentTemplate.sections.map((sec, secIdx) => (
                    <div key={secIdx} className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/[0.01]">
                      {/* Section Title Bar */}
                      <div className="px-4 py-3 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center font-mono">
                            {sec.number}
                          </span>
                          <span>{sec.title}</span>
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-500">
                          {sec.items.length} {language === 'ar' ? 'معايير' : 'criteria'}
                        </span>
                      </div>

                      {/* Criteria Rows */}
                      <div className="divide-y divide-slate-200 dark:divide-white/5">
                        {sec.items.map((item, itemIdx) => {
                          const sc = scores[`${secIdx}_${itemIdx}`] || { emp: 0, mgr: 0 };
                          return (
                            <div key={itemIdx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <span className="font-mono text-slate-400 text-xs font-bold shrink-0 mt-0.5">
                                  {item.num}.
                                </span>
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                  {item.text}
                                </p>
                              </div>

                              {/* Rating Selectors */}
                              <div className="flex items-center gap-4 shrink-0">
                                {/* Employee self rating */}
                                <div className="text-center">
                                  <span className="block text-[9px] text-slate-400 font-bold mb-0.5">
                                    {language === 'ar' ? 'التقييم الذاتي' : 'Self'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((val) => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => updateScore(secIdx, itemIdx, 'emp', val)}
                                        className={`w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                          sc.emp === val
                                            ? 'bg-blue-600 text-white font-mono shadow-xs'
                                            : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Supervisor rating */}
                                <div className="text-center border-s ps-3 border-slate-200 dark:border-white/10">
                                  <span className="block text-[9px] text-teal-400 font-bold mb-0.5">
                                    {language === 'ar' ? 'تقييم المشرف' : 'Supervisor'}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((val) => (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => updateScore(secIdx, itemIdx, 'mgr', val)}
                                        className={`w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer ${
                                          sc.mgr === val
                                            ? 'bg-teal-600 text-white font-mono shadow-xs scale-105'
                                            : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: GOALS & TRAININGS */}
              {activeTab === 'goals_trainings' && (
                <div className="space-y-6">
                  {/* Goals Table */}
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="px-4 py-3 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-400 text-sm">flag</span>
                        <span>{language === 'ar' ? 'أهداف السنة القادمة' : 'Next Year Objectives'}</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {language === 'ar' ? 'إجمالي الوزن: ' : 'Total Weight: '}
                        <strong className="text-teal-400">{goals.reduce((acc, g) => acc + (Number(g.weight) || 0), 0)}%</strong>
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-white/5">
                      {goals.map((g, gIdx) => (
                        <div key={gIdx} className="p-3.5 flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 w-28 shrink-0">{g.party}</span>
                          <input
                            type="text"
                            value={g.goal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGoals(prev => prev.map((item, idx) => idx === gIdx ? { ...item, goal: val } : item));
                            }}
                            placeholder={language === 'ar' ? 'صياغة الهدف المحدد...' : 'Objective description...'}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#06080d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                          />
                          <div className="flex items-center gap-1 shrink-0 w-24">
                            <input
                              type="number"
                              value={g.weight || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setGoals(prev => prev.map((item, idx) => idx === gIdx ? { ...item, weight: val } : item));
                              }}
                              placeholder="الوزن %"
                              className="w-16 px-2 py-1.5 rounded-xl bg-white dark:bg-[#06080d] border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-center text-slate-900 dark:text-white outline-none"
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trainings Table */}
                  <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="px-4 py-3 bg-slate-100 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-400 text-sm">school</span>
                        <span>{language === 'ar' ? 'الدورات والتدريبات المقترحة' : 'Recommended Training Programs'}</span>
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200 dark:divide-white/5">
                      {trainings.map((t, tIdx) => (
                        <div key={tIdx} className="p-3.5 flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500 w-28 shrink-0">{t.party}</span>
                          <input
                            type="text"
                            value={t.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTrainings(prev => prev.map((item, idx) => idx === tIdx ? { ...item, title: val } : item));
                            }}
                            placeholder={language === 'ar' ? 'عنوان الدورة أو البرنامج التدريبي...' : 'Training course title...'}
                            className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-[#06080d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500"
                          />
                          <select
                            value={t.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTrainings(prev => prev.map((item, idx) => idx === tIdx ? { ...item, type: val } : item));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#06080d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none cursor-pointer"
                          >
                            <option value="له علاقة بالعمل">له علاقة بالعمل</option>
                            <option value="له علاقة بالمهارات">له علاقة بالمهارات</option>
                            <option value="له علاقة بالمسار الوظيفي">له علاقة بالمسار الوظيفي</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SIGNATURES & RECOMMENDATIONS */}
              {activeTab === 'signatures' && (
                <div className="space-y-6">
                  {/* Contract Recommendation Option */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-black text-emerald-400">
                        {language === 'ar' ? 'توصية العقد الرسمية بعد التقييم' : 'Contract Renewal Recommendation'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {language === 'ar' ? 'حدد توصية المشرف المباشر والإدارة بشأن عقد الموظف:' : 'Select supervisor and management recommendation:'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <input
                          type="radio"
                          name="contractDecisionModal"
                          checked={contractDecision === 'renew'}
                          onChange={() => setContractDecision('renew')}
                          className="w-4 h-4 text-emerald-500"
                        />
                        <span className="text-xs font-bold text-emerald-400">✅ {language === 'ar' ? 'تجديد العقد' : 'Renew Contract'}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <input
                          type="radio"
                          name="contractDecisionModal"
                          checked={contractDecision === 'terminate'}
                          onChange={() => setContractDecision('terminate')}
                          className="w-4 h-4 text-rose-500"
                        />
                        <span className="text-xs font-bold text-rose-400">⚠️ {language === 'ar' ? 'إنهاء خدمات' : 'Terminate Services'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Recommendations Textareas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {language === 'ar' ? 'رأي وتوصيات المشرف المباشر:' : 'Supervisor Remarks & Recommendations:'}
                      </label>
                      <textarea
                        value={recommendations}
                        onChange={(e) => setRecommendations(e.target.value)}
                        rows={4}
                        placeholder={language === 'ar' ? 'اكتب ملاحظات وتوصيات المسؤول المباشر حول نقاط القوة وفرص التطوير...' : 'Enter supervisor review comments...'}
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#06080d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500 resize-y"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {language === 'ar' ? 'ملاحظات وإنجازات الموظف الذاتية:' : 'Employee Self-Assessment Remarks:'}
                      </label>
                      <textarea
                        value={selfComments}
                        onChange={(e) => setSelfComments(e.target.value)}
                        rows={4}
                        placeholder={language === 'ar' ? 'اكتب أبرز إنجازاتك خلال العام والتحديات التي تم تجاوزها...' : 'Enter your key accomplishments...'}
                        className="w-full p-3 rounded-xl bg-white dark:bg-[#06080d] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white outline-none focus:border-teal-500 resize-y"
                      />
                    </div>
                  </div>

                  {/* Electronic Signatures Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Employee Signature */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{language === 'ar' ? 'توقيع الموظف' : 'Employee Sign'}</span>
                        {signatures.employee ? (
                          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>{language === 'ar' ? 'موقّع' : 'Signed'}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-bold">{language === 'ar' ? 'بانتظار التوقيع' : 'Pending'}</span>
                        )}
                      </div>
                      <div className="min-h-[50px] flex items-center justify-center p-2 rounded-xl bg-white dark:bg-[#06080d] border border-dashed border-slate-300 dark:border-white/15">
                        {signatures.employee?.signatureDrawing ? (
                          <img src={signatures.employee.signatureDrawing} alt="Signature" className="max-h-12 object-contain" />
                        ) : signatures.employee?.typedName ? (
                          <span className="font-bold text-xs text-teal-400">{signatures.employee.typedName}</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">{language === 'ar' ? 'لا يوجد توقيع بعد' : 'No signature yet'}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSigningRole('employee')}
                        className="w-full py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        {signatures.employee ? (language === 'ar' ? 'تحديث التوقيع' : 'Update Signature') : (language === 'ar' ? 'توقيع الموظف الآن' : 'Sign Now')}
                      </button>
                    </div>

                    {/* Supervisor Signature */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{language === 'ar' ? 'توقيع المشرف' : 'Supervisor Sign'}</span>
                        {signatures.supervisor ? (
                          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>{language === 'ar' ? 'موقّع' : 'Signed'}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-bold">{language === 'ar' ? 'بانتظار التوقيع' : 'Pending'}</span>
                        )}
                      </div>
                      <div className="min-h-[50px] flex items-center justify-center p-2 rounded-xl bg-white dark:bg-[#06080d] border border-dashed border-slate-300 dark:border-white/15">
                        {signatures.supervisor?.signatureDrawing ? (
                          <img src={signatures.supervisor.signatureDrawing} alt="Signature" className="max-h-12 object-contain" />
                        ) : signatures.supervisor?.typedName ? (
                          <span className="font-bold text-xs text-teal-400">{signatures.supervisor.typedName}</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">{language === 'ar' ? 'لا يوجد توقيع بعد' : 'No signature yet'}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSigningRole('supervisor')}
                        className="w-full py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        {signatures.supervisor ? (language === 'ar' ? 'تحديث التوقيع' : 'Update Signature') : (language === 'ar' ? 'توقيع المشرف الآن' : 'Sign Now')}
                      </button>
                    </div>

                    {/* HR Approval */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{language === 'ar' ? 'مصادقة HR' : 'HR Approval'}</span>
                        {signatures.hr ? (
                          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            <span>{language === 'ar' ? 'معتمد' : 'Approved'}</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 text-[10px] font-bold">{language === 'ar' ? 'بانتظار الاعتماد' : 'Pending'}</span>
                        )}
                      </div>
                      <div className="min-h-[50px] flex items-center justify-center p-2 rounded-xl bg-white dark:bg-[#06080d] border border-dashed border-slate-300 dark:border-white/15">
                        {signatures.hr?.signatureDrawing ? (
                          <img src={signatures.hr.signatureDrawing} alt="Signature" className="max-h-12 object-contain" />
                        ) : signatures.hr?.typedName ? (
                          <span className="font-bold text-xs text-teal-400">{signatures.hr.typedName}</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">{language === 'ar' ? 'بانتظار مصادقة HR' : 'Awaiting HR'}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSigningRole('hr')}
                        className="w-full py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
                      >
                        {signatures.hr ? (language === 'ar' ? 'تحديث الاعتماد' : 'Update Approval') : (language === 'ar' ? 'اعتماد الموارد البشرية' : 'Approve by HR')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions Bar */}
        <div className={`px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 ${
          isDark ? 'bg-[#06080d] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveAppraisal('In Progress')}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              <span>{isSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ كمسودة' : 'Save Draft')}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveAppraisal('Completed')}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">verified</span>
              <span>{language === 'ar' ? 'اعتماد التقييم نهائياً' : 'Approve & Finalize'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>{language === 'ar' ? 'طباعة / PDF' : 'Print / PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>

      {/* Signature Popup Modal */}
      {signingRole && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <SignaturePad
              expectedName={
                signingRole === 'employee'
                  ? (employee?.fullName || employee?.name || '')
                  : signingRole === 'supervisor'
                  ? (employee?.supervisorName || employee?.supervisor_name || 'المشرف المباشر')
                  : 'قسم الموارد البشرية - Vitas Iraq'
              }
              language={language}
              actionLabel={
                signingRole === 'employee'
                  ? (language === 'ar' ? 'تأكيد توقيع الموظف' : 'Confirm Employee Signature')
                  : signingRole === 'supervisor'
                  ? (language === 'ar' ? 'تأكيد توقيع المشرف' : 'Confirm Supervisor Signature')
                  : (language === 'ar' ? 'تأكيد مصادقة الموارد البشرية' : 'Confirm HR Approval')
              }
              onConfirm={handleConfirmSignature}
              onCancel={() => setSigningRole(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

