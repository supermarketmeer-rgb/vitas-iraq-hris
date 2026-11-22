import React, { useState, useEffect, useMemo } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  PERFORMANCE_APPRAISAL_TEMPLATES, 
  PerformanceAppraisalTemplate,
  getFormattedAppraisalTitles 
} from '../../data/performanceAppraisalTemplates';
import { StatusBadge } from '../../components/performance_appraisal/StatusBadge';
import { SignaturePad } from '../../components/performance_appraisal/SignaturePad';
import { PerformanceAppraisalExcelSheet } from '../../components/performance_appraisal/PerformanceAppraisalExcelSheet';
import { api } from '../../api/client';
import { 
  Award, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Target,
  FileSpreadsheet,
  Check,
  TrendingUp,
  MessageSquare,
  PenTool,
  Save,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface EmployeeEvaluationProps {
  employee: any;
  onLogout?: () => void;
}

export const EmployeeEvaluation: React.FC<EmployeeEvaluationProps> = ({ employee }) => {
  const { theme, language } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';

  // Sub-navigation tab
  const [activeTab, setActiveTab] = useState<'criteria' | 'goals' | 'discussion' | 'signatures'>('criteria');

  // Excel Modal
  const [showExcelModal, setShowExcelModal] = useState(false);

  // Signature Pad Modal
  const [showSignPad, setShowSignPad] = useState(false);
  const [isSubmittingSign, setIsSubmittingSign] = useState(false);

  // Live state from DB
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appraisalRecord, setAppraisalRecord] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Determine current employee
  const currentEmp = employee || {};
  const empId = currentEmp.employeeId || currentEmp.employee_id || currentEmp.badgeNo || currentEmp.badge_no || currentEmp.id || '';

  // Determine official template based on job title
  const templateId = useMemo(() => {
    const title = String(currentEmp.jobTitle || currentEmp.position || currentEmp.position_ar || currentEmp.positionEn || '').toLowerCase();
    if (title.includes('نظافة') || title.includes('صيانة') || title.includes('cleaner') || title.includes('maintenance')) {
      return 'pa-maintenance-cleaner';
    }
    if (title.includes('حرس') || title.includes('أمن') || title.includes('security') || title.includes('guard') || title.includes('فريق') || title.includes('leader')) {
      return 'pa-team-leaders-guards';
    }
    return 'pa-staff';
  }, [currentEmp]);

  const currentTemplate: PerformanceAppraisalTemplate = useMemo(() => {
    return PERFORMANCE_APPRAISAL_TEMPLATES.find(t => t.id === templateId) || PERFORMANCE_APPRAISAL_TEMPLATES[1] || PERFORMANCE_APPRAISAL_TEMPLATES[0];
  }, [templateId]);

  const evaluationYear = 2026;
  const dynamicTitles = useMemo(() => {
    return getFormattedAppraisalTitles(currentTemplate, evaluationYear);
  }, [currentTemplate, evaluationYear]);

  // Scores state: key = `${secIdx}_${itemIdx}` => { emp: number, mgr: number }
  const [scores, setScores] = useState<Record<string, { emp: number; mgr: number }>>({});
  const [workflowStatus, setWorkflowStatus] = useState<string>('Self-Assessment Draft');
  const [achievements, setAchievements] = useState('');
  const [trainingGoals, setTrainingGoals] = useState('');
  const [discussionComment, setDiscussionComment] = useState('');
  const [discussionsList, setDiscussionsList] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any>({});
  const [contractDecision, setContractDecision] = useState<'renew' | 'terminate' | null>('renew');

  // Load appraisal record from DB
  const loadAppraisal = async () => {
    if (!empId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const res: any = await api.getAppraisals({ employee_id: empId }).catch(() => null);
      const list = Array.isArray(res) ? res : res?.data;
      if (Array.isArray(list) && list.length > 0) {
        const record = list[0];
        setAppraisalRecord(record);
        setWorkflowStatus(record.workflow_status || 'Self-Assessment Draft');

        // Parse scores
        const parsedScores = typeof record.scores === 'object' && record.scores !== null 
          ? record.scores 
          : (record.scores_json ? JSON.parse(record.scores_json) : {});
        
        // Ensure default scores exist if record has none
        if (Object.keys(parsedScores).length > 0) {
          setScores(parsedScores);
        } else {
          initDefaultScores();
        }

        if (record.strengths || record.recommendations) {
          setAchievements(record.strengths || record.recommendations || '');
        }
        if (record.areas_for_improvement) {
          setTrainingGoals(record.areas_for_improvement || '');
        }
        if (record.discussions_json || record.discussions) {
          const disc = Array.isArray(record.discussions) ? record.discussions : (record.discussions_json ? JSON.parse(record.discussions_json) : []);
          setDiscussionsList(disc || []);
        }
        if (record.signatures_json || record.signatures) {
          const sig = typeof record.signatures === 'object' ? record.signatures : (record.signatures_json ? JSON.parse(record.signatures_json) : {});
          setSignatures(sig || {});
        }
        if (record.contract_decision) {
          setContractDecision(record.contract_decision);
        }
      } else {
        // No record in DB yet - initialize defaults
        initDefaultScores();
      }
    } catch (err) {
      console.warn('Could not fetch remote appraisal, initializing defaults:', err);
      initDefaultScores();
    } finally {
      setIsLoading(false);
    }
  };

  const initDefaultScores = () => {
    const initial: Record<string, { emp: number; mgr: number }> = {};
    currentTemplate.sections.forEach((sec, sIdx) => {
      sec.items.forEach((item, iIdx) => {
        initial[`${sIdx}_${iIdx}`] = {
          emp: item.defaultEmpScore || 4,
          mgr: item.defaultMgrScore || 0
        };
      });
    });
    setScores(initial);
  };

  useEffect(() => {
    loadAppraisal();
  }, [empId, templateId]);

  // Handle score change
  const handleScoreChange = (sIdx: number, iIdx: number, val: number) => {
    const key = `${sIdx}_${iIdx}`;
    setScores(prev => ({
      ...prev,
      [key]: {
        emp: val,
        mgr: prev[key]?.mgr || 0
      }
    }));
  };

  // Compute live scores exactly matching official Excel formulas
  const { totalEmpScore, totalMgrScore, ratingLabel } = useMemo(() => {
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

    const effScore = overallMgr > 0 ? overallMgr : overallEmp;
    let label = isEn ? 'Meets Expectations' : 'بمستوى التوقعات';
    if (effScore >= 90) label = isEn ? 'Exceptional (4.5 - 5.0)' : 'استثنائي (4.5 - 5.0)';
    else if (effScore >= 80) label = isEn ? 'Exceeds Expectations (4.0 - 4.49)' : 'يفوق التوقعات (4.0 - 4.49)';
    else if (effScore >= 65) label = isEn ? 'Meets Expectations (3.25 - 3.99)' : 'بمستوى التوقعات (3.25 - 3.99)';
    else if (effScore >= 50) label = isEn ? 'Needs Improvement (2.5 - 3.24)' : 'بحاجة لتحسين (2.5 - 3.24)';
    else if (effScore > 0) label = isEn ? 'Unsatisfactory (< 2.5)' : 'غير مرضي (< 2.5)';

    return {
      totalEmpScore: Number(overallEmp.toFixed(1)),
      totalMgrScore: Number(overallMgr.toFixed(1)),
      ratingLabel: label
    };
  }, [currentTemplate, scores, isEn]);

  // Save / Submit Appraisal
  const handleSave = async (submitToSupervisor: boolean = false) => {
    if (!empId) {
      showToast(isEn ? 'Employee ID missing' : 'رقم الموظف غير محدد', 'error');
      return;
    }

    const nextStatus = submitToSupervisor 
      ? 'Pending Supervisor Assessment' 
      : (workflowStatus || 'Self-Assessment Draft');

    const payload = {
      id: appraisalRecord?.id,
      employee_id: String(empId),
      employee_name_ar: currentEmp.fullNameAr || currentEmp.fullName || currentEmp.name || '',
      employee_name_en: currentEmp.fullNameEn || currentEmp.full_name_en || '',
      job_title: currentEmp.jobTitle || currentEmp.position_ar || currentEmp.position || '',
      department: currentEmp.department || '',
      branch: currentEmp.branch || currentEmp.location || '',
      supervisor_name: currentEmp.supervisorName || currentEmp.supervisor_name || '',
      template_id: currentTemplate.id,
      template_name: currentTemplate.titleAr,
      workflow_status: nextStatus,
      self_score: totalEmpScore,
      supervisor_score: totalMgrScore > 0 ? totalMgrScore : null,
      final_score: totalMgrScore > 0 ? totalMgrScore : totalEmpScore,
      final_rating: ratingLabel,
      contract_decision: contractDecision || 'renew',
      scores_json: JSON.stringify(scores),
      recommendations: achievements,
      strengths: achievements,
      areas_for_improvement: trainingGoals,
      discussions_json: JSON.stringify(discussionsList),
      signatures_json: JSON.stringify(signatures),
      completed_at: nextStatus === 'Completed' ? new Date().toISOString() : null
    };

    try {
      setIsSaving(true);
      await api.saveAppraisal(payload);
      setWorkflowStatus(nextStatus);
      showToast(
        submitToSupervisor
          ? (isEn ? 'Self appraisal submitted to your line manager successfully!' : 'تم اعتماد وإرسال تقييمك الذاتي إلى المدير المباشر بنجاح!')
          : (isEn ? 'Self appraisal draft saved successfully.' : 'تم حفظ مسودة التقييم الذاتي بنجاح.')
      );
      await loadAppraisal();
    } catch (err: any) {
      console.error('Error saving appraisal:', err);
      showToast(isEn ? 'Failed to save appraisal' : 'فشل حفظ التقييم، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Discussion Comment
  const handleAddDiscussion = () => {
    if (!discussionComment.trim()) return;
    const newEntry = {
      id: Date.now(),
      sender: currentEmp.fullNameAr || currentEmp.fullName || currentEmp.name || 'الموظف',
      role: 'Employee',
      timestamp: new Date().toISOString(),
      message: discussionComment.trim()
    };
    const updated = [...discussionsList, newEntry];
    setDiscussionsList(updated);
    setDiscussionComment('');
    showToast(isEn ? 'Comment added to discussion' : 'تمت إضافة الملاحظة إلى جلسة المناقشة');
  };

  // Confirm Signature
  const handleConfirmSignature = async (payload: { typedName: string; signatureDrawing?: string }) => {
    const updatedSignatures = {
      ...signatures,
      employee: {
        name: payload.typedName,
        signed_at: new Date().toISOString(),
        drawing: payload.signatureDrawing || null,
        acknowledged: true
      }
    };
    setSignatures(updatedSignatures);
    setShowSignPad(false);

    try {
      setIsSubmittingSign(true);
      await api.saveAppraisal({
        id: appraisalRecord?.id,
        employee_id: String(empId),
        signatures_json: JSON.stringify(updatedSignatures)
      });
      showToast(isEn ? 'Electronic signature recorded successfully!' : 'تم توثيق توقيعك الإلكتروني بنجاح!');
    } catch (err) {
      showToast(isEn ? 'Signature saved locally' : 'تم حفظ التوقيع محلياً');
    } finally {
      setIsSubmittingSign(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-md md:max-w-xl mx-auto p-8 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {isEn ? 'Loading official performance appraisal...' : 'جاري تحميل نموذج التقييم الرسمي المعتمد...'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto p-3 sm:p-4 space-y-4 pb-24 animate-in fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
          toastMsg.type === 'error'
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
        }`}>
          {toastMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className={`p-4 rounded-3xl border shadow-sm relative overflow-hidden ${
        isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black leading-tight">
                  {isEn ? 'Official Performance Appraisal' : 'استمارة تقييم الأداء السنوي'}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/15 text-teal-400 border border-teal-500/30">
                  {dynamicTitles.fyTag}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn ? dynamicTitles.titleEn : dynamicTitles.titleAr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <StatusBadge status={workflowStatus} language={language} />
            <button
              type="button"
              onClick={() => setShowExcelModal(true)}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition-all shrink-0"
              title={isEn ? 'Preview official Excel sheet' : 'معاينة استمارة الإكسل الرسمية'}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isEn ? 'Excel Sheet' : 'استمارة الإكسل'}</span>
            </button>
          </div>
        </div>

        {/* Employee Summary Strip */}
        <div className={`mt-3 pt-3 border-t grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] ${
          isDark ? 'border-slate-800 text-slate-300' : 'border-slate-100 text-slate-600'
        }`}>
          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? 'Employee:' : 'الموظف:'}</span>
            <span className="font-bold text-slate-200">{currentEmp.fullNameAr || currentEmp.fullName || currentEmp.name || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? 'Badge / ID:' : 'الرقم الوظيفي:'}</span>
            <span className="font-mono font-bold text-teal-400">{currentEmp.badgeNo || currentEmp.employeeId || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? 'Position:' : 'الوظيفة:'}</span>
            <span className="font-semibold">{currentEmp.jobTitle || currentEmp.position || 'موظف'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isEn ? 'Branch:' : 'الفرع:'}</span>
            <span className="font-semibold">{currentEmp.branch || 'المقر الرئيسي'}</span>
          </div>
        </div>
      </div>

      {/* KPI Scores Highlight Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white shadow-xl relative overflow-hidden border border-teal-500/30">
        <div className="grid grid-cols-3 gap-2 divide-x divide-white/10 rtl:divide-x-reverse text-center">
          <div className="p-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-200 block">
              {isEn ? 'Self Score' : 'التقييم الذاتي'}
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono">{totalEmpScore}%</span>
            </div>
            <span className="text-[10px] text-teal-200 font-mono">
              {(totalEmpScore / 20).toFixed(2)} / 5.0
            </span>
          </div>

          <div className="p-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-200 block">
              {isEn ? 'Supervisor Score' : 'تقييم المشرف'}
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black font-mono">
                {totalMgrScore > 0 ? `${totalMgrScore}%` : '—'}
              </span>
            </div>
            <span className="text-[10px] text-amber-200 font-mono">
              {totalMgrScore > 0 ? `${(totalMgrScore / 20).toFixed(2)} / 5.0` : (isEn ? 'Under Review' : 'قيد المراجعة')}
            </span>
          </div>

          <div className="p-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200 block">
              {isEn ? 'Final Rating' : 'التقدير العام'}
            </span>
            <div className="mt-1">
              <span className="text-xs sm:text-sm font-black text-emerald-300 block line-clamp-2">
                {ratingLabel}
              </span>
            </div>
            <span className="text-[10px] text-emerald-200">
              {isEn ? 'Official Scale' : 'المقياس المعتمد'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className={`p-1.5 rounded-2xl border flex items-center justify-between gap-1 text-xs font-bold ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setActiveTab('criteria')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'criteria'
              ? 'bg-teal-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span className="truncate">{isEn ? 'Criteria' : 'المعايير'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('goals')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'goals'
              ? 'bg-teal-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="truncate">{isEn ? 'Goals & Dev' : 'الإنجازات'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discussion')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
            activeTab === 'discussion'
              ? 'bg-teal-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="truncate">{isEn ? 'Discussion' : 'المناقشة'}</span>
          {discussionsList.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
              {discussionsList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('signatures')}
          className={`flex-1 py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'signatures'
              ? 'bg-teal-600 text-white shadow-sm'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span className="truncate">{isEn ? 'Signature' : 'التوقيع'}</span>
          {signatures.employee?.signed_at && (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: OFFICIAL CRITERIA & RATING
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'criteria' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-bold text-slate-400">
              {isEn ? 'Scale: 1 (Unsatisfactory) to 5 (Exceptional)' : 'مقياس التقييم: 1 (غير مرضي) إلى 5 (استثنائي)'}
            </span>
            <span className="font-mono text-teal-400 font-bold">
              {currentTemplate.sections.reduce((acc, s) => acc + s.items.length, 0)} {isEn ? 'Items' : 'فقرة تقييم'}
            </span>
          </div>

          <div className="space-y-4">
            {currentTemplate.sections.map((section, sIdx) => (
              <div 
                key={sIdx} 
                className={`p-4 rounded-3xl border space-y-3 ${
                  isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {/* Section Header */}
                <div className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                  isDark ? 'bg-slate-900/90 border-slate-800 text-teal-300' : 'bg-slate-50 border-slate-200 text-teal-800'
                }`}>
                  <span className="font-bold text-xs">
                    {section.number || sIdx + 1}. {section.title}
                  </span>
                  {section.isLeadership && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {isEn ? 'Leadership' : 'محور القيادة'}
                    </span>
                  )}
                </div>

                {/* Section Items */}
                <div className="space-y-3 pt-1">
                  {section.items.map((item, iIdx) => {
                    const key = `${sIdx}_${iIdx}`;
                    const itemScore = scores[key] || { emp: item.defaultEmpScore || 4, mgr: item.defaultMgrScore || 0 };

                    return (
                      <div
                        key={iIdx}
                        className={`p-3 rounded-2xl border space-y-2 transition-colors ${
                          isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-teal-500/30' : 'bg-slate-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            <span className="font-mono text-teal-400 font-bold ml-1.5 rtl:ml-0 rtl:mr-1.5">{item.num}.</span>
                            {item.text}
                          </p>
                        </div>

                        {/* Rating Row */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/40">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-400">
                              {isEn ? 'Self:' : 'تقييمي:'}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => handleScoreChange(sIdx, iIdx, val)}
                                  className={`w-7 h-7 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                    itemScore.emp === val
                                      ? 'bg-teal-600 text-white shadow-md scale-105'
                                      : isDark
                                      ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                  }`}
                                >
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Supervisor Score Display (if available) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-amber-400 font-semibold">
                              {isEn ? 'Supervisor:' : 'المشرف:'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold ${
                              itemScore.mgr > 0 
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                                : 'bg-slate-800/60 text-slate-500 border border-slate-700/50'
                            }`}>
                              {itemScore.mgr > 0 ? itemScore.mgr : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: GOALS, ACCOMPLISHMENTS & TRAININGS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {/* Key Achievements */}
          <div className={`p-4 rounded-3xl border space-y-2 ${
            isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {isEn ? '1. Key Achievements Accomplished During This Year:' : '1. أبرز الإنجازات والمهام المكتملة بنجاح خلال الدورة التقييمية:'}
            </label>
            <textarea
              rows={3}
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder={isEn ? 'List specific accomplishments, projects, or milestones...' : 'اذكر الإنجازات والمشاريع التي تم إنجازها بنجاح...'}
              className={`w-full p-3 rounded-2xl border text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Training & Development Needs */}
          <div className={`p-4 rounded-3xl border space-y-2 ${
            isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <label className={`block text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {isEn ? '2. Requested Training Programs & Development Needs:' : '2. البرامج التدريبية ومجالات التطوير المقترحة للعام القادم:'}
            </label>
            <textarea
              rows={3}
              value={trainingGoals}
              onChange={(e) => setTrainingGoals(e.target.value)}
              placeholder={isEn ? 'List training courses or skills you wish to acquire...' : 'حدد الدورات أو المهارات التي تطلب الحصول عليها لتطوير أدائك...'}
              className={`w-full p-3 rounded-2xl border text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Default Goals Reference from Template */}
          {currentTemplate.defaultGoals && currentTemplate.defaultGoals.length > 0 && (
            <div className={`p-4 rounded-3xl border space-y-2.5 ${
              isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <h3 className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                <Target className="w-4 h-4" />
                <span>{isEn ? 'Target Goals & Weights (Reference)' : 'المستهدفات السنوية والأوزان المعتمدة'}</span>
              </h3>
              <div className="space-y-2">
                {currentTemplate.defaultGoals.map((g, idx) => (
                  <div key={idx} className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <span>{g.goal}</span>
                    <span className="font-mono font-bold text-teal-400 shrink-0">{g.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: DISCUSSION & GRIEVANCES
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'discussion' && (
        <div className={`p-4 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <h3 className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>{isEn ? 'Evaluation Discussion & Feedback Center' : 'جلسة مناقشة التقييم والملاحظات المتبادلة'}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isEn ? 'Share notes and discuss outcomes with your direct supervisor and HR.' : 'قناة رسمية لتدوين الملاحظات ومناقشة النتائج مع المشرف المباشر وقسم الموارد.'}
            </p>
          </div>

          {/* Discussions Feed */}
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {discussionsList.length === 0 ? (
              <div className={`p-6 rounded-2xl border text-center text-xs text-slate-400 ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {isEn ? 'No discussion entries recorded yet. Add your notes below.' : 'لم يتم تسجيل أي ملاحظات مناقشة بعد. يمكنك كتابة ملاحظتك أدناه.'}
              </div>
            ) : (
              discussionsList.map((disc, idx) => (
                <div key={idx} className={`p-3 rounded-2xl border text-xs space-y-1 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-teal-400">{disc.sender} ({disc.role || 'Member'})</span>
                    <span className="font-mono">{new Date(disc.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{disc.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Input */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <textarea
              rows={2}
              value={discussionComment}
              onChange={(e) => setDiscussionComment(e.target.value)}
              placeholder={isEn ? 'Write your comment or discussion note...' : 'اكتب ملاحظتك أو استفسارك هنا...'}
              className={`w-full p-2.5 rounded-2xl border text-xs resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="button"
              onClick={handleAddDiscussion}
              disabled={!discussionComment.trim()}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all ml-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isEn ? 'Add Note' : 'إضافة الملاحظة'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: ELECTRONIC SIGNATURES & ACKNOWLEDGMENT
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'signatures' && (
        <div className={`p-4 rounded-3xl border space-y-4 ${
          isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <h3 className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
              <PenTool className="w-4 h-4" />
              <span>{isEn ? 'Electronic Signatures & Workflow Approval' : 'التواقيع الإلكترونية ومراحل الاعتماد'}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isEn ? 'Official signatures verifying evaluation acknowledgment by all parties.' : 'توثيق رسمي لاعتماد التقييم من قبل الموظف، المشرف، وإدارة الموارد البشرية.'}
            </p>
          </div>

          {/* Signatures Cards */}
          <div className="space-y-3">
            {/* 1. Employee Signature */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              signatures.employee?.signed_at 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 block">{isEn ? '1. Employee Acknowledgment' : '1. إقرار وتوقيع الموظف'}</span>
                <span className="font-bold text-xs text-white">
                  {signatures.employee?.name || currentEmp.fullNameAr || currentEmp.name || 'الموظف'}
                </span>
                {signatures.employee?.signed_at ? (
                  <span className="text-[10px] text-emerald-400 block font-mono mt-0.5">
                    ✓ {isEn ? 'Signed at:' : 'تم التوقيع بتاريخ:'} {new Date(signatures.employee.signed_at).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 block mt-0.5">
                    {isEn ? 'Pending employee signature' : 'بانتظار توقيع الموظف'}
                  </span>
                )}
              </div>

              {!signatures.employee?.signed_at && (
                <button
                  type="button"
                  onClick={() => setShowSignPad(true)}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Sign Now' : 'توقيع الآن'}</span>
                </button>
              )}
            </div>

            {/* 2. Supervisor Signature */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              signatures.supervisor?.signed_at 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 block">{isEn ? '2. Direct Supervisor' : '2. المشرف المباشر'}</span>
                <span className="font-bold text-xs text-white">
                  {signatures.supervisor?.name || currentEmp.supervisorName || currentEmp.supervisor || (isEn ? 'Direct Supervisor' : 'المشرف المباشر')}
                </span>
                {signatures.supervisor?.signed_at ? (
                  <span className="text-[10px] text-emerald-400 block font-mono mt-0.5">
                    ✓ {isEn ? 'Signed at:' : 'تم التوقيع بتاريخ:'} {new Date(signatures.supervisor.signed_at).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isEn ? 'Pending supervisor assessment' : 'قيد انتظار تقييم المشرف'}
                  </span>
                )}
              </div>
            </div>

            {/* 3. HR Department Approval */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              signatures.hr?.signed_at 
                ? 'bg-emerald-500/10 border-emerald-500/30' 
                : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] text-slate-400 block">{isEn ? '3. HR Department Approval' : '3. اعتماد الموارد البشرية'}</span>
                <span className="font-bold text-xs text-white">
                  {signatures.hr?.name || (isEn ? 'HR Director' : 'مدير الموارد البشرية')}
                </span>
                {signatures.hr?.signed_at ? (
                  <span className="text-[10px] text-emerald-400 block font-mono mt-0.5">
                    ✓ {isEn ? 'Approved' : 'تم الاعتماد النهائي'}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {isEn ? 'Pending final cycle approval' : 'بانتظار الاعتماد الختامي للدورة'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Footer Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
          }`}
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Draft' : 'حفظ كمسودة')}</span>
        </button>

        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={isSaving}
          className="flex-1 py-3 px-4 rounded-2xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
        >
          <Send className="w-4 h-4" />
          <span>
            {workflowStatus === 'Pending Supervisor Assessment'
              ? (isEn ? 'Update Submission' : 'تحديث التقييم وإعادة الإرسال')
              : (isEn ? 'Submit to Line Manager' : 'اعتماد وإرسال التقييم للمشرف')}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: OFFICIAL EXCEL SHEET PREVIEW
          ───────────────────────────────────────────────────────────── */}
      {showExcelModal && (
        <PerformanceAppraisalExcelSheet
          initialTemplateId={currentTemplate.id}
          selectedEmployee={currentEmp}
          employees={[]}
          evaluationYear={evaluationYear}
          initialScores={scores}
          initialGoals={currentTemplate.defaultGoals}
          initialTrainings={currentTemplate.defaultTrainings}
          initialContractDecision={contractDecision}
          initialRecommendations={achievements}
          onScoresChange={(newScores) => setScores(newScores)}
          language={language}
          onClose={() => setShowExcelModal(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: SIGNATURE PAD
          ───────────────────────────────────────────────────────────── */}
      {showSignPad && (
        <SignaturePad
          expectedName={currentEmp.fullNameAr || currentEmp.fullName || currentEmp.name || 'الموظف'}
          language={language}
          actionLabel={isEn ? 'Confirm Electronic Signature' : 'تأكيد التوقيع الإلكتروني'}
          onConfirm={handleConfirmSignature}
          onCancel={() => setShowSignPad(false)}
          submitting={isSubmittingSign}
        />
      )}
    </div>
  );
};
