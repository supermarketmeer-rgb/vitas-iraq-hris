import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Candidate, CommitteeScore } from '../../types';
import { getCandidateDisplayName } from '../../utils/nameHelper';

export const CandidateProfile: React.FC = () => {
  const { candidates, jobVacancies, updateCandidateStage, deleteCandidate, t, language, theme } = useApp();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [cvModalCandidate, setCvModalCandidate] = useState<Candidate | null>(null);

  const isDark = theme === 'dark';

  // Interview form state
  const [interviewDetails, setInterviewDetails] = useState({
    date: '',
    time: '',
    location: '',
    notes: ''
  });

  // Committee evaluation form state
  const [committeeEvaluation, setCommitteeEvaluation] = useState({
    opinion: '',
    decisionReason: '',
    scores: [] as CommitteeScore[]
  });

  const handleReject = (candidate: Candidate) => {
    if (confirm(t(`هل أنت متأكد من رفض المرشح (${candidate.fullName})؟`, `Are you sure you want to reject candidate (${candidate.fullName})?`))) {
      const jobTitle = candidate.jobTitle || 'الوظيفة';
      const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '964' + cleanPhone.substring(1) : (cleanPhone.startsWith('964') ? cleanPhone : '964' + cleanPhone);

      const rejectionMsg = `السيد/ة ${candidate.fullName}\n.\nنعتذر عن عدم اختيارك لوظيفة (${jobTitle}) بسبب عدم توفر متطلبات العمل لديك حالياً.\nنتمنى لك التوفيق والنجاح في مسيرتك المهنية.\nمؤسسة فيتاس العراق - قسم الموارد البشرية`;

      if (candidate.phone) {
        const waAppUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(rejectionMsg)}`;
        try {
          const link = document.createElement('a');
          link.href = waAppUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.error('Error launching WhatsApp for rejection:', e);
        }
      }

      fetch('/api/notify/rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: candidate.fullName,
          email: candidate.email,
          phone: candidate.phone,
          jobTitle
        })
      }).catch(err => console.log('Silent rejection dispatch processed:', err));

      updateCandidateStage(candidate.id, language === 'en' ? 'Rejected' : 'مرفوض');
    }
  };

  const openInterviewModalFor = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setShowInterviewModal(true);
  };

  const openEvaluationModalFor = (candidate: Candidate) => {
    setActiveCandidate(candidate);
    setShowEvaluationModal(true);
  };

  const handleSendInterview = () => {
    if (activeCandidate) {
      updateCandidateStage(activeCandidate.id, language === 'en' ? 'Interview' : 'المقابلة');
      setShowInterviewModal(false);
      setInterviewDetails({ date: '', time: '', location: '', notes: '' });
    }
  };

  const handleSaveEvaluation = () => {
    if (activeCandidate) {
      setShowEvaluationModal(false);
    }
  };

  const handlePrintCv = (candidateToPrint?: Candidate) => {
    const targetCandidate = candidateToPrint || cvModalCandidate;
    if (!targetCandidate) return;

    const resolvedTitle = targetCandidate.jobTitle || '';
    const stageLabel = targetCandidate.stage || '';
    const printHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>السيرة الذاتية - ${targetCandidate.fullName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #0f172a; line-height: 1.6; padding: 20px; background: #ffffff; }
    .header { border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
    .subtitle { font-size: 14px; font-weight: bold; color: #0d9488; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #cbd5e1; margin-bottom: 20px; font-size: 13px; }
    .info-label { font-weight: bold; color: #475569; }
    .info-value { font-weight: bold; color: #0f172a; }
    .section { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 16px; background: #ffffff; }
    .section-title { font-size: 14px; font-weight: bold; color: #0d9488; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">${targetCandidate.fullName}</h1>
    <div class="subtitle">الوظيفة المتقدم عليها: ${resolvedTitle}</div>
    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">مؤسسة فيتاس العراق - قسم الموارد البشرية | تاريخ الطباعة: ${new Date().toLocaleDateString('ar-IQ')}</div>
  </div>
  <div class="info-grid">
    <div><span class="info-label">الاسم: </span><span class="info-value">${targetCandidate.fullName}</span></div>
    ${targetCandidate.fullNameAr ? `<div><span class="info-label">الاسم بالعربية: </span><span class="info-value">${targetCandidate.fullNameAr}</span></div>` : ''}
    <div><span class="info-label">الوظيفة: </span><span class="info-value">${resolvedTitle}</span></div>
    <div><span class="info-label">البريد الإلكتروني: </span><span class="info-value">${targetCandidate.email || 'غير محدد'}</span></div>
    <div><span class="info-label">رقم الهاتف: </span><span class="info-value">${targetCandidate.phone || 'غير محدد'}</span></div>
    <div><span class="info-label">سنوات الخبرة: </span><span class="info-value">${targetCandidate.experienceYears || 0} سنوات</span></div>
    <div><span class="info-label">المرحلة: </span><span class="info-value">${stageLabel}</span></div>
  </div>
  ${targetCandidate.notes ? `<div class="section"><div class="section-title">ملاحظات المتقدم</div><p>${targetCandidate.notes}</p></div>` : ''}
  ${targetCandidate.committeeOpinion ? `<div class="section" style="background:#f0fdf4;border-color:#86efac;"><div class="section-title" style="color:#166534;">تقييم لجنة التقييم</div><p>${targetCandidate.committeeOpinion}</p></div>` : ''}
  <div class="footer">مؤسسة فيتاس العراق لتمويل المشاريع الصغرى والعمليات - قسم التوظيف والاستقطاب (ATS HRMS System)</div>
</body>
</html>`;

    const existingFrame = document.getElementById('cv-print-universal-iframe');
    if (existingFrame) existingFrame.remove();

    const printFrame = document.createElement('iframe');
    printFrame.id = 'cv-print-universal-iframe';
    printFrame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!doc) { return; }

    doc.open();
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (e) {
        console.warn('Print iframe execution failed:', e);
      }
    }, 300);
  };



  const addCommitteeMember = () => {
    setCommitteeEvaluation({
      ...committeeEvaluation,
      scores: [...committeeEvaluation.scores, { officeName: '', fullName: '', jobTitle: '', score: 0 }]
    });
  };

  const updateCommitteeMember = (index: number, field: keyof CommitteeScore, value: string | number) => {
    const newScores = [...committeeEvaluation.scores];
    newScores[index] = { ...newScores[index], [field]: value };
    setCommitteeEvaluation({ ...committeeEvaluation, scores: newScores });
  };

  const removeCommitteeMember = (index: number) => {
    setCommitteeEvaluation({
      ...committeeEvaluation,
      scores: committeeEvaluation.scores.filter((_, i) => i !== index)
    });
  };

  const normalizeStage = (stage: string): Candidate['stage'] => {
    if (!stage) return 'استلام الطلبات';
    const s = String(stage).trim();
    if (s === 'Applied' || s === 'تم التقديم' || s === 'استلام الطلبات') return 'استلام الطلبات';
    if (s === 'Initial Screening' || s === 'الفحص المبدئي' || s === 'فرز المتقدمين' || s === 'Screening') return 'فرز المتقدمين';
    if (s === 'Committee Evaluation' || s === 'تقييم لجنة التقييم' || s.includes('لجنة') || s.includes('تقييم')) return 'تقييم المتقدمين من قبل لجنة التقييم';
    if (s === 'First Interview' || s === 'مقابلة اولى' || s === 'المقابلة' || s === 'Interview') return 'مقابلة اولى';
    if (s === 'Optional Final Interview' || s === 'مقابلة نهائية اختيارية' || s === 'Job Offer' || s === 'العرض الوظيفي' || s.includes('نهائية')) return 'مقابلة نهائية اختيارية';
    if (s === 'Hired' || s === 'تم التعيين' || s === 'تعيين') return 'تعيين';
    if (s.includes('دليل') || s.includes('Directory') || s.includes('ادخال') || s.includes('إدخال')) return 'إدخال البيانات في دليل الموظفين';
    if (s === 'Rejected' || s === 'مرفوض') return 'مرفوض';
    return 'استلام الطلبات';
  };

  const getStageColor = (stage: Candidate['stage']) => {
    const norm = normalizeStage(stage);
    switch (norm) {
      case 'استلام الطلبات':
        return 'bg-teal-600';
      case 'فرز المتقدمين':
        return 'bg-purple-500';
      case 'تقييم المتقدمين من قبل لجنة التقييم':
        return 'bg-amber-500';
      case 'مقابلة اولى':
        return 'bg-indigo-500';
      case 'مقابلة نهائية اختيارية':
        return 'bg-cyan-500';
      case 'تعيين':
        return 'bg-emerald-500';
      case 'إدخال البيانات في دليل الموظفين':
        return 'bg-teal-500';
      case 'مرفوض':
        return 'bg-rose-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStageTitle = (stage: Candidate['stage']) => {
    const norm = normalizeStage(stage);
    switch (norm) {
      case 'استلام الطلبات':
        return t('1. استلام الطلبات', '1. Applications Received');
      case 'فرز المتقدمين':
        return t('2. فرز المتقدمين', '2. Candidate Screening');
      case 'تقييم المتقدمين من قبل لجنة التقييم':
        return t('3. تقييم لجنة التقييم', '3. Committee Evaluation');
      case 'مقابلة اولى':
        return t('4. مقابلة أولى', '4. First Interview');
      case 'مقابلة نهائية اختيارية':
        return t('5. مقابلة نهائية اختيارية', '5. Optional Final Interview');
      case 'تعيين':
        return t('6. تعيين / قبول نهائي', '6. Hired / Acceptance');
      case 'إدخال البيانات في دليل الموظفين':
        return t('7. إدخال البيانات في Employee Directory', '7. Employee Directory Entry');
      case 'مرفوض':
        return t('مرفوض', 'Rejected');
      default:
        return stage;
    }
  };




  // Filter candidates by search term & stage
  const filteredCandidates = candidates.filter(candidate => {
    const nameMatch = (candidate.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const titleMatch = (candidate.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (candidate.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = (candidate.phone || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSearch = nameMatch || titleMatch || emailMatch || phoneMatch;
    const matchesStage = stageFilter === 'all' || normalizeStage(candidate.stage) === normalizeStage(stageFilter);

    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div 
        className={`p-6 rounded-2xl border transition-all ${
          isDark ? 'bg-[#111827] border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {t('سجلات وملفات المتقدمين', 'Candidate Profiles & Applications')}
            </h2>
            <p className="text-xs font-normal mt-1" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
              {t('إدارة طلبات التوظيف والتواصل المباشر مع استعراض وطباعة السيرة الذاتية (CV)', 'Manage candidate profiles with quick contact actions and printable CV preview')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div 
              className={`px-4 py-2 rounded-xl border text-center ${isDark ? 'bg-[#0f172a] border-white/10' : 'bg-slate-50 border-slate-200 shadow-xs'}`}
            >
              <div className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">{filteredCandidates.length}</div>
              <div className="text-[10px] font-normal" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('مرشح مسجل', 'Registered Candidates')}</div>
            </div>
          </div>
        </div>

        {/* Filter Controls (Search Bar - Combobox Hidden as requested) */}
        <div className="w-full mt-5 pt-4 border-t border-slate-200 dark:border-white/10">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 text-lg">search</span>
            <input
              type="text"
              placeholder={t('البحث عن مرشح (الاسم، الوظيفة، البريد، الهاتف)...', 'Search candidate (name, job, email, phone)...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                color: isDark ? '#ffffff' : '#0f172a'
              }}
              className={`w-full pr-10 pl-4 py-2 text-xs font-normal rounded-xl outline-none border transition-all ${
                isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400 text-white' : 'bg-slate-50 border-slate-300 focus:border-teal-600 text-slate-900 shadow-xs placeholder:text-slate-500'
              }`}
            />
          </div>

          {/* Preserved Stage Filter Combobox (Hidden visually via className="hidden" per user directive) */}
          <div className="hidden">
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
              className={`w-full px-3 py-2 text-xs font-bold rounded-xl outline-none border transition-all ${
                isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
              }`}
            >
              <option value="all">{t('جميع مراحل التوظيف الـ 7', 'All 7 Recruitment Stages')}</option>
              <option value="استلام الطلبات">{t('1. استلام الطلبات', '1. Applications Received')}</option>
              <option value="فرز المتقدمين">{t('2. فرز المتقدمين', '2. Candidate Screening')}</option>
              <option value="تقييم المتقدمين من قبل لجنة التقييم">{t('3. تقييم لجنة التقييم', '3. Committee Evaluation')}</option>
              <option value="مقابلة اولى">{t('4. مقابلة أولى', '4. First Interview')}</option>
              <option value="مقابلة نهائية اختيارية">{t('5. مقابلة نهائية اختيارية', '5. Optional Final Interview')}</option>
              <option value="تعيين">{t('6. تعيين / قبول نهائي', '6. Hired / Acceptance')}</option>
              <option value="إدخال البيانات في دليل الموظفين">{t('7. إدخال البيانات في Employee Directory', '7. Employee Directory Entry')}</option>
              <option value="مرفوض">{t('مرفوض', 'Rejected')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4-Columns Layout Grid (4 Candidate Profile Cards per row) */}
      {filteredCandidates.length === 0 ? (
        <div 
          className={`p-12 rounded-2xl border text-center ${
            isDark ? 'bg-[#111827] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          <span className="material-symbols-outlined text-6xl text-slate-500 mb-4">person_off</span>
          <p className="text-slate-900 dark:text-slate-300 font-bold">{t('لا يوجد مرشحين متاحين في البحث حالياً', 'No candidates available matching criteria')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredCandidates.map(candidate => {
            const appliedJob = jobVacancies.find(j => j.id === candidate.appliedJobId || j.id === `pos-${candidate.appliedJobId}`);
            const displayJobTitle = appliedJob?.title || candidate.jobTitle;
            const candidateDisplayName = getCandidateDisplayName(candidate, language);

            const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');
            const formattedPhone = cleanPhone.startsWith('0') ? '964' + cleanPhone.substring(1) : (cleanPhone.startsWith('964') ? cleanPhone : '964' + cleanPhone);
            const waUrl = candidate.phone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(`مرحباً ${candidateDisplayName}، نود التواصل معك بخصوص طلب التقديم لدى مؤسسة فيتاس العراق.`)}` : '';
            const mailtoUrl = candidate.email ? `mailto:${candidate.email}?subject=${encodeURIComponent(`مؤسسة فيتاس العراق - طلب التقديم على وظيفة ${displayJobTitle}`)}&body=${encodeURIComponent(`السيد/ة ${candidateDisplayName}،\n\nتحية طيبة،\nنود التواصل معكم بخصوص طلب التقديم على وظيفة ${displayJobTitle}.\n\nمع التقدير،\nقسم الموارد البشرية - فيتاس العراق`)}` : '';

            return (
              <div
                key={candidate.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:shadow-lg ${
                  isDark 
                    ? 'bg-[#111827] border-white/10 text-white hover:border-teal-500/40' 
                    : 'bg-white border-slate-200 text-slate-900 shadow-sm hover:border-teal-500/40'
                }`}
              >
                <div>
                  {/* Candidate Header: Photo & Name & Stage */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center overflow-hidden flex-shrink-0 ${
                      isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-slate-100 border-slate-200 shadow-xs'
                    }`}>
                      {candidate.photoUrl ? (
                        <img src={candidate.photoUrl} alt={candidateDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-3xl text-slate-500">account_circle</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h3 className="text-sm font-bold break-words" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                          {candidateDisplayName}
                        </h3>
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded-full ${getStageColor(candidate.stage)} text-white text-[10px] font-bold shadow-sm mb-1`}>
                        {getStageTitle(candidate.stage)}
                      </span>
                      <div className="flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400">
                        <span className="material-symbols-outlined text-xs">work</span>
                        <span className="truncate">{displayJobTitle}</span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Divider */}
                  <div className="border-t border-slate-300 dark:border-white/10 my-2.5"></div>

                  {/* Candidate Details */}
                  <div className="space-y-2 text-xs font-normal mb-3" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                    {appliedJob?.department && (
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-600 dark:text-blue-400">business</span>
                        <span className="truncate font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{appliedJob.department}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-purple-600 dark:text-purple-400">email</span>
                      <span className="truncate font-normal" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{candidate.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600 dark:text-emerald-400">phone</span>
                      <span className="font-normal" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{candidate.phone || '07700000000'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="material-symbols-outlined text-sm text-indigo-500">timeline</span>
                      <span className="font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{candidate.experienceYears} {t('سنوات خبرة', 'yrs exp')}</span>
                    </div>
                  </div>

                  {/* Clickable CV / Resume Rectangle Box (عرض وطباعة السيرة الذاتية) */}
                  <div
                    onClick={() => {
                      setCvModalCandidate(candidate);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 mb-3 flex items-center justify-between group ${
                      isDark
                        ? 'bg-[#0a0c10] border-teal-500/30 hover:border-teal-400 hover:bg-teal-950/20'
                        : 'bg-[#d8dce2] border-teal-600/30 hover:border-teal-600 hover:bg-[#cbd5e1] shadow-sm'
                    }`}
                    title={t('انقر لاستعراض وطباعة السيرة الذاتية (CV)', 'Click to view and print candidate CV')}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-lg">description</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate flex items-center gap-1" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                          <span>السيرة الذاتية (CV)</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-700 dark:text-white font-bold">PDF</span>
                        </div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 truncate">
                          انقر للعرض والطباعة 🖨️
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 opacity-80 group-hover:opacity-100 shrink-0">
                      <span className="material-symbols-outlined text-base">visibility</span>
                      <span className="material-symbols-outlined text-base">print</span>
                    </div>
                  </div>

                  {/* Candidate Notes */}
                  {candidate.notes && (
                    <div className={`p-2.5 rounded-xl text-xs mb-3 border ${
                      isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-[#d8dce2] border-slate-300'
                    }`}>
                      <h4 className="text-[10px] font-bold mb-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                        {t('ملاحظات:', 'Notes:')}
                      </h4>
                      <p className="text-[11px] font-normal line-clamp-2" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        {candidate.notes}
                      </p>
                    </div>
                  )}

                  {/* Committee Opinion */}
                  {candidate.committeeOpinion && (
                    <div className="p-2.5 rounded-xl text-xs mb-3 bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-white">
                      <div className="text-[10px] font-bold">{t('رأي اللجنة:', 'Committee Opinion:')}</div>
                      <p className="text-[11px] font-normal line-clamp-2 mt-0.5">{candidate.committeeOpinion}</p>
                    </div>
                  )}
                </div>

                {/* Contact Action Buttons ONLY (WhatsApp & Send Email) - Hidden as requested */}
                {/*
                <div className="pt-3 border-t border-slate-300 dark:border-white/10 grid grid-cols-2 gap-2">
                  {candidate.phone ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 px-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                      title={t('تواصل عبر الواتساب', 'Contact via WhatsApp')}
                    >
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span>WhatsApp</span>
                    </a>
                  ) : (
                    <button disabled className="py-2 px-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 font-normal text-xs flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">chat</span>
                      <span>WhatsApp</span>
                    </button>
                  )}

                  {candidate.email ? (
                    <a
                      href={mailtoUrl}
                      className="py-2 px-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm transition-all"
                      title={t('إرسال بريد إلكتروني', 'Send Email')}
                    >
                      <span className="material-symbols-outlined text-sm">mail</span>
                      <span>{t('إرسال إيميل', 'Send Email')}</span>
                    </a>
                  ) : (
                    <button disabled className="py-2 px-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 font-normal text-xs flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">mail</span>
                      <span>{t('إرسال إيميل', 'Send Email')}</span>
                    </button>
                  )}
                </div>
                */}
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Printable CV Viewer Modal */}
      {cvModalCandidate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Modal Top Action Bar (Single Combined 'عرض/طباعة' Button) */}
            <div className={`p-4 border-b flex items-center justify-between gap-3 ${isDark ? 'border-slate-800 bg-[#111827]' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">description</span>
                <div>
                  <h3 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    السيرة الذاتية المرفقة (Curriculum Vitae)
                  </h3>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">{cvModalCandidate.fullName} - {cvModalCandidate.jobTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                   handlePrintCv();
                  }}
                  className="py-2 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>عرض/طباعة</span>
                </button>

                <button
                  onClick={() => setCvModalCandidate(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Attached Original CV Document Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" id="printable-cv-area">
              {/* Document Header Card (No inner buttons per user instruction) */}
              <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-600/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center text-3xl shrink-0">
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-teal-600 dark:text-teal-400 mb-0.5">مستند السيرة الذاتية المرفق</div>
                  <h2 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {(() => {
                      const url = cvModalCandidate.resumeUrl || '';
                      if (url.startsWith('data:')) return `${cvModalCandidate.fullName}_CV.pdf`;
                      if (url.startsWith('/uploads/') || url.startsWith('http')) return url.split('/').pop() || `${cvModalCandidate.fullName}_CV.pdf`;
                      return url || `${cvModalCandidate.fullName}_CV.pdf`;
                    })()}
                  </h2>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">
                    المتقدم: {cvModalCandidate.fullName} {cvModalCandidate.fullNameAr ? `(${cvModalCandidate.fullNameAr})` : ''} | الوظيفة: {cvModalCandidate.jobTitle}
                  </p>
                </div>
              </div>

              {/* Embedded Document Viewer / Preview Frame */}
              {(() => {
                const rawUrl = cvModalCandidate.resumeUrl || '';
                const resolvedPdfUrl = rawUrl.startsWith('/uploads/') ? (typeof window !== 'undefined' ? `${window.location.origin}${rawUrl}` : rawUrl) : rawUrl;
                const hasValidDoc = resolvedPdfUrl && (
                  resolvedPdfUrl.startsWith('http') ||
                  resolvedPdfUrl.startsWith('blob:') ||
                  resolvedPdfUrl.startsWith('data:')
                );

                if (hasValidDoc) {
                  return (
                    <div className="rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-900 h-[550px]">
                      <iframe
                        id="cv-profile-modal-iframe"
                        src={resolvedPdfUrl}
                        title="Attached Resume Document"
                        className="w-full h-full border-none"
                      />
                    </div>
                  );
                }

                return (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40">
                    <span className="material-symbols-outlined text-6xl text-teal-600 dark:text-teal-400">picture_as_pdf</span>
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                        ملف السيرة الذاتية المرفق: {cvModalCandidate.resumeUrl || `${cvModalCandidate.fullName}_CV.pdf`}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        تم تقديم هذا المستند كملف سيرة ذاتية رسمي من قبل المتقدم لطلب التعيين.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {cvModalCandidate.committeeOpinion && (
                <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-800 dark:text-white space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">rate_review</span>
                    توصيات وتقييم لجنة التقييم
                  </h4>
                  <p className="leading-relaxed font-normal">
                    {cvModalCandidate.committeeOpinion}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showInterviewModal && activeCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-md shadow-2xl ${
            isDark ? 'bg-[#0f172a] border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('جدولة مقابلة', 'Schedule Interview')}
                </h3>
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-0.5">{activeCandidate.fullName}</p>
              </div>
              <button
                onClick={() => setShowInterviewModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('التاريخ', 'Date')}
                </label>
                <input
                  type="date"
                  value={interviewDetails.date}
                  onChange={(e) => setInterviewDetails({...interviewDetails, date: e.target.value})}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                    isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('الوقت', 'Time')}
                </label>
                <input
                  type="time"
                  value={interviewDetails.time}
                  onChange={(e) => setInterviewDetails({...interviewDetails, time: e.target.value})}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                    isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('المكان / الرابط', 'Location / Link')}
                </label>
                <input
                  type="text"
                  placeholder={t('مثال: القاعة الرئيسية أو رابط Google Meet', 'e.g. Main Hall or Google Meet link')}
                  value={interviewDetails.location}
                  onChange={(e) => setInterviewDetails({...interviewDetails, location: e.target.value})}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                    isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('ملاحظات', 'Notes')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('ملاحظات إضافية للمقبولين للمقابلة...', 'Additional notes for interview...')}
                  value={interviewDetails.notes}
                  onChange={(e) => setInterviewDetails({...interviewDetails, notes: e.target.value})}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border resize-none ${
                    isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowInterviewModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleSendInterview}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/20"
              >
                {t('إرسال وتثبيت', 'Send & Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Committee Evaluation Modal */}
      {showEvaluationModal && activeCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-lg shadow-2xl ${
            isDark ? 'bg-[#0f172a] border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('تقييم لجنة التقييم', 'Committee Evaluation')}
                </h3>
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-0.5">{activeCandidate.fullName}</p>
              </div>
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('درجات اعضاء لجنة التقييم', 'Committee Members Scores')}
                  </label>
                  <button
                    onClick={addCommitteeMember}
                    className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    {t('إضافة عضو', 'Add Member')}
                  </button>
                </div>

                <div className="space-y-3">
                  {committeeEvaluation.scores.map((member, index) => (
                    <div key={index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                            {t('اسم المكتب', 'Office Name')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('اسم المكتب التابع له', 'Office Name')}
                            value={member.officeName}
                            onChange={(e) => updateCommitteeMember(index, 'officeName', e.target.value)}
                            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                              isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                            {t('الاسم الكامل', 'Full Name')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('الاسم الكامل للمقيم', 'Full Name')}
                            value={member.fullName}
                            onChange={(e) => updateCommitteeMember(index, 'fullName', e.target.value)}
                            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                              isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                            {t('الوظيفة', 'Job Title')}
                          </label>
                          <input
                            type="text"
                            placeholder={t('المسمى الوظيفي', 'Job Title')}
                            value={member.jobTitle}
                            onChange={(e) => updateCommitteeMember(index, 'jobTitle', e.target.value)}
                            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                              isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                            {t('الدرجة / 100', 'Score / 100')}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              placeholder={t('الدرجة', 'Score')}
                              value={member.score || ''}
                              onChange={(e) => updateCommitteeMember(index, 'score', parseInt(e.target.value) || 0)}
                              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                                isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                            <button
                              onClick={() => removeCommitteeMember(index)}
                              className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('رأي وتوصيات اللجنة', 'Committee Opinion')}
                </label>
                <textarea
                  rows={3}
                  value={committeeEvaluation.opinion}
                  onChange={(e) => setCommitteeEvaluation({...committeeEvaluation, opinion: e.target.value})}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border resize-none ${
                    isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('مبررات القرار', 'Decision Reason')}
                </label>
                <textarea
                  rows={2}
                  value={committeeEvaluation.decisionReason}
                  onChange={(e) => setCommitteeEvaluation({...committeeEvaluation, decisionReason: e.target.value})}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 border resize-none ${
                    isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowEvaluationModal(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleSaveEvaluation}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/20"
              >
                {t('حفظ التقييم', 'Save Evaluation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
