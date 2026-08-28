import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Candidate, JobVacancy, CommitteeScore } from '../../types';
import { api } from '../../api/client';
import { SearchableComboBox } from '../SearchableComboBox';
import { getCandidateDisplayName } from '../../utils/nameHelper';

export const CandidatePipeline: React.FC = () => {
  const { 
    candidates, 
    jobVacancies, 
    employees,
    updateCandidateStage, 
    updateCandidate,
    deleteCandidate, 
    addCandidate, 
    updateJobVacancy, 
    addEmployee,
    deleteEmployee,
    setActiveModuleId,
    addNotification,
    t, 
    language, 
    theme 
  } = useApp();

  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeWorkflowFilter, setActiveWorkflowFilter] = useState<string>('all');
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showFilledJobs, setShowFilledJobs] = useState(false);

  // Settings Data
  const [positions, setPositions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positionStatuses, setPositionStatuses] = useState<Record<string, JobVacancy['status']>>(() => {
    try {
      const saved = localStorage.getItem('vitas_position_statuses');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vitas_position_statuses', JSON.stringify(positionStatuses));
    } catch {}
  }, [positionStatuses]);

  // Active candidate state for modals
  const [screeningCandidate, setScreeningCandidate] = useState<Candidate | null>(null);
  const [activeCandidateForInterview, setActiveCandidateForInterview] = useState<{ candidate: Candidate; type: 'first' | 'final' } | null>(null);
  const [activeCandidateForEvaluation, setActiveCandidateForEvaluation] = useState<Candidate | null>(null);
  const [activeCandidateForDirectory, setActiveCandidateForDirectory] = useState<Candidate | null>(null);
  const [directorySuccessInfo, setDirectorySuccessInfo] = useState<{ empId: string; empName: string } | null>(null);
  const [cvModalCandidate, setCvModalCandidate] = useState<Candidate | null>(null);

  const isDark = theme === 'dark';

  // Load Settings Data dynamically (Positions, Branches, Departments)
  const loadSettingsData = async () => {
    try {
      const [positionsData, branchesData, departmentsData] = await Promise.all([
        api.getPositions().catch(() => []),
        api.getBranches().catch(() => []),
        api.getDepartments().catch(() => [])
      ]);
      setPositions(Array.isArray(positionsData) ? positionsData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
    } catch (error) {
      console.error('Error loading settings data in Pipeline:', error);
    }
  };

  useEffect(() => {
    loadSettingsData();
    const interval = setInterval(loadSettingsData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getTitleName = (title: string) => {
    if (!title) return '';
    const match = positions.find(p =>
      p.name_ar === title || p.name_en === title || p.name === title || String(p.id) === String(title)
    );
    if (match) {
      if (language === 'en') return match.name_en || match.name_ar || match.name || title;
      return match.name_ar || match.name || match.name_en || title;
    }
    return title;
  };

  // Form state for adding candidate
  const [newCandidate, setNewCandidate] = useState({
    fullName: '',
    email: '',
    phone: '',
    jobOpeningId: '',
    experience: 2,
    rating: 5,
    stage: 'استلام الطلبات' as Candidate['stage'],
    notes: ''
  });

  // Committee evaluation form state - Updated to match user requirements
  const [evalForm, setEvalForm] = useState({
    officeName: '', // اسم المكتب للمشترك بالتقييم
    evaluatorName: '', // اسم المقيم
    jobTitle: '', // عنوانه الوظيفي
    finalScore: 85, // الدرجة النهائية Score
    opinion: '',
    decisionReason: ''
  });

  // Interview scheduling form state
  const [interviewForm, setInterviewForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: 'مقر الشركة - بغداد المنصور / قاعة الاجتماعات الرئيسية',
    notes: ''
  });

  // Committee Evaluators modal state
  const [activeCandidateForCommitteeScores, setActiveCandidateForCommitteeScores] = useState<Candidate | null>(null);
  const [committeeScoresList, setCommitteeScoresList] = useState<CommitteeScore[]>([]);
  const [newEvaluator, setNewEvaluator] = useState<CommitteeScore>({
    fullName: '',
    jobTitle: '',
    officeName: '',
    score: 85
  });

  const getCandidateAverageScore = (c: Candidate): number => {
    if (!c) return 0;
    if (c.committeeScores && Array.isArray(c.committeeScores) && c.committeeScores.length > 0) {
      const total = c.committeeScores.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
      return Math.round(total / c.committeeScores.length);
    }
    if (c.finalScore && Number(c.finalScore) > 0) {
      return Number(c.finalScore);
    }
    return 0;
  };

  const openCommitteeScoresModal = (candidate: Candidate) => {
    setActiveCandidateForCommitteeScores(candidate);
    setCommitteeScoresList(Array.isArray(candidate.committeeScores) ? candidate.committeeScores : []);
    setNewEvaluator({
      fullName: '',
      jobTitle: '',
      officeName: '',
      score: 85
    });
  };

  const handleAddEvaluator = () => {
    if (!newEvaluator.fullName.trim()) {
      alert('يُرجى كتابة اسم المقيم الكامل');
      return;
    }
    setCommitteeScoresList(prev => [...prev, { ...newEvaluator }]);
    setNewEvaluator({
      fullName: '',
      jobTitle: '',
      officeName: '',
      score: 85
    });
  };

  const handleRemoveEvaluator = (index: number) => {
    setCommitteeScoresList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveCommitteeScores = () => {
    if (!activeCandidateForCommitteeScores) return;
    const total = committeeScoresList.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
    const avgScore = committeeScoresList.length > 0 ? Math.round(total / committeeScoresList.length) : 0;

    updateCandidate(activeCandidateForCommitteeScores.id, {
      committeeScores: committeeScoresList,
      finalScore: avgScore
    });

    addNotification({
      title: 'تم حفظ تقييمات اللجنة',
      message: `تم حفظ تقييمات لجنة التعيين للمرشح ${activeCandidateForCommitteeScores.fullName} بمعدل (${avgScore}/100)`,
      type: 'success'
    });

    setActiveCandidateForCommitteeScores(null);
  };

  // Employee Directory entry form state (strictly candidate submitted data only)
  const [directoryForm, setDirectoryForm] = useState({
    fullNameAr: '',
    fullNameEn: '',
    email: '',
    personalEmail: '',
    phone: '',
    emergencyPhone: '',
    jobTitle: '',
    department: '',
    branch: '',
    joinDate: new Date().toISOString().split('T')[0],
    empCode: '',
    badgeNo: '',
    basicSalary: 0,
    transportationFixed: 0,
    fixedBonus: 0,
    phoneAllowance: 0,
    certificateAllowance: 0,
    gender: '',
    maritalStatus: '',
    dob: ''
  });

  // The Exact 6 Workflow Stages + Rejected (Committee Evaluation merged into First Interview)
  const kanbanStages: Candidate['stage'][] = [
    'استلام الطلبات',
    'فرز المتقدمين',
    'مقابلة اولى',
    'مقابلة نهائية اختيارية',
    'تعيين',
    'إدخال البيانات في دليل الموظفين',
    'مرفوض'
  ];

  // Helper function to normalize any legacy stage string into the 6-step workflow
  const normalizeStage = (stage: string): Candidate['stage'] => {
    if (!stage) return 'استلام الطلبات';
    const s = String(stage).trim();
    if (s === 'Applied' || s === 'تم التقديم' || s === 'استلام الطلبات') return 'استلام الطلبات';
    if (s === 'Initial Screening' || s === 'الفحص المبدئي' || s === 'فرز المتقدمين' || s === 'Screening') return 'فرز المتقدمين';
    // Committee Evaluation is now merged into First Interview
    if (s === 'Committee Evaluation' || s === 'تقييم لجنة التقييم' || s === 'تقييم المتقدمين من قبل لجنة التقييم' || s.includes('لجنة') || s.includes('تقييم')) return 'مقابلة اولى';
    if (s === 'First Interview' || s === 'مقابلة اولى' || s === 'المقابلة' || s === 'Interview') return 'مقابلة اولى';
    if (s === 'Optional Final Interview' || s === 'مقابلة نهائية اختيارية' || s === 'Job Offer' || s === 'العرض الوظيفي' || s.includes('نهائية')) return 'مقابلة نهائية اختيارية';
    if (s === 'Hired' || s === 'تم التعيين' || s === 'تعيين') return 'تعيين';
    if (s.includes('دليل') || s.includes('Directory') || s.includes('ادخال') || s.includes('إدخال')) return 'إدخال البيانات في دليل الموظفين';
    if (s === 'Rejected' || s === 'مرفوض') return 'مرفوض';
    return 'استلام الطلبات';
  };

  const getStageTitle = (stage: Candidate['stage']) => {
    const norm = normalizeStage(stage);
    switch (norm) {
      case 'استلام الطلبات':
        return t('1. استلام الطلبات', '1. Applications Received');
      case 'فرز المتقدمين':
        return t('2. فرز المتقدمين', '2. Candidate Screening');
      case 'مقابلة اولى':
        return t('3. مقابلة أولى (مع تقييم اللجنة)', '3. First Interview (with Committee Evaluation)');
      case 'مقابلة نهائية اختيارية':
        return t('4. مقابلة نهائية اختيارية', '4. Optional Final Interview');
      case 'تعيين':
        return t('5. تعيين / قبول نهائي', '5. Hired / Acceptance');
      case 'إدخال البيانات في دليل الموظفين':
        return t('6. إدخال البيانات في Employee Directory', '6. Employee Directory Entry');
      case 'مرفوض':
        return t('مرفوض', 'Rejected');
      default:
        return stage;
    }
  };

  const getStageColor = (stage: Candidate['stage']) => {
    const norm = normalizeStage(stage);
    switch (norm) {
      case 'استلام الطلبات':
        return 'bg-teal-600';
      case 'فرز المتقدمين':
        return 'bg-purple-500';
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

  // Dynamically combine jobVacancies from AppContext & Settings positions
  const syncedJobVacancies: JobVacancy[] = React.useMemo(() => {
    const map = new Map<string, JobVacancy>();

    // 1. Add all job vacancies from AppContext (database / state)
    jobVacancies.forEach(job => {
      if (job && job.id) {
        map.set(String(job.id), {
          ...job,
          location: job.location || 'بغداد_المنصور',
          department: job.department || 'إدارة التمويل الأصغر والعمليات'
        });
      }
    });

    // 2. Combine with Settings positions
    if (positions.length > 0) {
      positions.forEach(p => {
        const posTitle = p.name_ar || p.name;
        const posId = `pos-${p.id}`;

        const existing = jobVacancies.find(j => 
          j.id === posId ||
          String(j.id) === String(p.id) ||
          j.title === posTitle || 
          j.title === p.name_ar ||
          j.title === p.name_en || 
          j.title === p.name
        );

        if (existing) {
          map.set(String(existing.id), {
            ...existing,
            title: posTitle,
            location: existing.location || 'بغداد_المنصور',
            department: existing.department || p.department || 'إدارة التمويل الأصغر والعمليات'
          });
        } else if (!map.has(posId)) {
          map.set(posId, {
            id: posId,
            title: posTitle,
            department: p.department || 'إدارة التمويل الأصغر والعمليات',
            location: 'بغداد_المنصور',
            type: 'دوام كامل',
            status: positionStatuses[posId] || 'مفتوحة',
            experienceYears: 2,
            requirements: '',
            deadline: '',
            createdDate: p.created_at || new Date().toISOString(),
            candidatesCount: 0
          });
        }
      });
    }

    return Array.from(map.values());
  }, [positions, jobVacancies, positionStatuses]);

  const allActivePositions = syncedJobVacancies.map(j => ({
    id: j.id,
    titleAr: j.title,
    titleEn: getTitleName(j.title)
  }));

  const getSelectedJobDisplayName = () => {
    if (selectedJobId === 'all') {
      return t('جميع الوظائف والمسميات', 'All Jobs & Positions');
    }
    const selectedPos = allActivePositions.find(p => p.id === selectedJobId);
    return selectedPos ? (language === 'ar' ? selectedPos.titleAr : selectedPos.titleEn) : '';
  };

  const validCandidates = candidates;

  const filteredCandidates = selectedJobId === 'all' 
    ? validCandidates 
    : validCandidates.filter(c => {
        if (!c) return false;
        const selId = String(selectedJobId);
        const candJobId = String(c.appliedJobId || '');
        if (candJobId === selId || candJobId === `pos-${selId}` || `pos-${candJobId}` === selId) return true;
        
        const matchedJob = syncedJobVacancies.find(j => String(j.id) === selId);
        if (matchedJob) {
          const matchTitle = (matchedJob.title || '').toLowerCase();
          const candTitle = (c.jobTitle || '').toLowerCase();
          const resolvedCandTitle = getTitleName(c.jobTitle).toLowerCase();
          const resolvedMatchTitle = getTitleName(matchedJob.title).toLowerCase();
          return candTitle === matchTitle || 
                 resolvedCandTitle === resolvedMatchTitle ||
                 candTitle.includes(matchTitle) ||
                 matchTitle.includes(candTitle);
        }
        return false;
      });

  const searchFilteredCandidates = filteredCandidates.filter(c => {
    if (activeWorkflowFilter !== 'all' && normalizeStage(c.stage) !== activeWorkflowFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (c.fullName || '').toLowerCase().includes(q);
    const emailMatch = (c.email || '').toLowerCase().includes(q);
    const phoneMatch = (c.phone || '').toLowerCase().includes(q);
    const titleMatch = (c.jobTitle || '').toLowerCase().includes(q) || getTitleName(c.jobTitle).toLowerCase().includes(q);
    const notesMatch = (c.notes || '').toLowerCase().includes(q);
    return nameMatch || emailMatch || phoneMatch || titleMatch || notesMatch;
  });

  const filledJobs = jobVacancies.filter(job => 
    candidates.some(c => c.appliedJobId === job.id && (normalizeStage(c.stage) === 'تعيين' || c.addedToDirectory))
  );

  // Group candidates strictly by the 8 normalized kanban workflow columns
  const groupedCandidates = kanbanStages.reduce((acc, stage) => {
    acc[stage] = searchFilteredCandidates.filter(c => normalizeStage(c.stage) === stage);
    return acc;
  }, {} as Record<Candidate['stage'], Candidate[]>);

  // Filter stages to render: When a specific workflow filter is active, keep that stage section fixed on screen even when candidate count reaches 0!
  const stagesToRender = kanbanStages.filter(stage => {
    if (activeWorkflowFilter !== 'all') {
      return normalizeStage(stage) === activeWorkflowFilter;
    }
    return (groupedCandidates[stage]?.length || 0) > 0;
  });

  const handleRejectCandidate = (candidate: Candidate) => {
    const jobTitle = getTitleName(candidate.jobTitle) || candidate.jobTitle;
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

    addNotification({
      title: 'تم رفض المرشح وإرسال الإشعار',
      message: `تم رفض المرشح ${candidate.fullName} وإرسال إشعار لعدم توفر متطلبات العمل`,
      type: 'alert'
    });

    updateCandidateStage(candidate.id, 'مرفوض');
  };

  const handleStageChange = (candidateId: string, newStage: Candidate['stage']) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const normNewStage = normalizeStage(newStage);
    const normCurrentStage = normalizeStage(candidate.stage);

    // Rejection Check ("مرفوض" / "Rejected")
    if (normNewStage === 'مرفوض') {
      handleRejectCandidate(candidate);
      return;
    }

    // Stage 2: Screening Check ("هل المتقدم سيتم تقييمه ؟")
    if (normNewStage === 'فرز المتقدمين') {
      setScreeningCandidate(candidate);
      return;
    }

    // Stage 3 (First Interview - separate committee evaluation)
    if (normNewStage === 'مقابلة اولى') {
      setActiveCandidateForInterview({ candidate, type: 'first' });
      setInterviewForm({
        date: candidate.interviewDate || '',
        time: candidate.interviewTime || '',
        location: candidate.interviewLocation || '',
        notes: ''
      });
    }
    // Stage 5 (Optional Final Interview)
    else if (normNewStage === 'مقابلة نهائية اختيارية') {
      setActiveCandidateForInterview({ candidate, type: 'final' });
      setInterviewForm({
        date: candidate.secondInterviewDate || '',
        time: candidate.secondInterviewTime || '',
        location: candidate.secondInterviewLocation || '',
        notes: ''
      });
    }
    // Stage 7 (Employee Directory entry)
    else if (normNewStage === 'إدخال البيانات في دليل الموظفين') {
      openDirectoryModalForCandidate(candidate);
    }
    else {
      updateCandidateStage(candidateId, newStage);
    }
  };

  // Handle Screening Confirmation (YES / NO)
  const handleConfirmScreening = (candidate: Candidate, isYes: boolean) => {
    if (isYes) {
      updateCandidateStage(candidate.id, 'فرز المتقدمين');
      setActiveWorkflowFilter('فرز المتقدمين');
      setScreeningCandidate(null);
      // Add notification for approved candidate
      addNotification({
        title: 'تم قبول المرشح للفرز',
        message: `تم قبول المرشح ${candidate.fullName} لمرحلة فرز المتقدمين`,
        type: 'success'
      });
    } else {
      handleRejectCandidate(candidate);
      setScreeningCandidate(null);
    }
  };

  // Open Employee Directory modal pre-filled with candidate information + fresh default Employee ID
  const openDirectoryModalForCandidate = (candidate: Candidate) => {
    const matchedJob = syncedJobVacancies.find(j => (j.id === candidate.appliedJobId || j.title === candidate.jobTitle));
    
    // Generate a fresh unique Employee ID if missing or dummy '1'
    const defaultEmpCode = (candidate.employeeId && candidate.employeeId.length > 2 && candidate.employeeId !== '1')
      ? candidate.employeeId
      : `VTS-${Math.floor(1000 + Math.random() * 9000)}`;

    setDirectoryForm({
      fullNameAr: getCandidateDisplayName(candidate, 'ar') || '',
      fullNameEn: getCandidateDisplayName(candidate, 'en') || '',
      email: candidate.email || candidate.personalEmail || '',
      personalEmail: candidate.personalEmail || candidate.email || '',
      phone: candidate.phone || '',
      emergencyPhone: '',
      jobTitle: candidate.jobTitle || getTitleName(candidate.jobTitle) || '',
      department: matchedJob?.department || candidate.department || '',
      branch: matchedJob?.location || candidate.officeName || candidate.branch || '',
      joinDate: new Date().toISOString().split('T')[0],
      empCode: defaultEmpCode,
      badgeNo: '',
      basicSalary: 0,
      transportationFixed: 0,
      fixedBonus: 0,
      phoneAllowance: 0,
      certificateAllowance: 0,
      gender: candidate.gender || 'ذكر',
      maritalStatus: candidate.maritalStatus || 'أعزب',
      dob: candidate.dateOfBirth || ''
    });
    setActiveCandidateForDirectory(candidate);
  };

  // Helper to get top 3 evaluated candidates for a job vacancy (sorted by average evaluation score descending)
  const getTop3CandidatesForJob = (jobIdOrTitle: string | number) => {
    if (!jobIdOrTitle) return [];
    const targetStr = String(jobIdOrTitle).trim();

    const candidatesForJob = candidates.filter(c => {
      if (!c) return false;
      const cJobId = String(c.appliedJobId || '').trim();
      if (cJobId === targetStr || cJobId === `pos-${targetStr}` || `pos-${cJobId}` === targetStr) return true;

      const matchedJob = syncedJobVacancies.find(j => String(j.id) === targetStr || j.title === targetStr);
      if (matchedJob) {
        const matchTitle = (matchedJob.title || '').toLowerCase().trim();
        const candTitle = (c.jobTitle || '').toLowerCase().trim();
        return candTitle === matchTitle || candTitle.includes(matchTitle) || matchTitle.includes(candTitle);
      }
      return (c.jobTitle || '').toLowerCase().trim() === targetStr.toLowerCase();
    });

    return candidatesForJob
      .filter(c => normalizeStage(c.stage) !== 'مرفوض' && getCandidateAverageScore(c) > 0)
      .sort((a, b) => getCandidateAverageScore(b) - getCandidateAverageScore(a))
      .slice(0, 3);
  };

  // Handle cancellation of hiring by accepted candidate (declines offer & deletes employee record completely from directory)
  const handleCancelCandidateHiring = async (candidate: Candidate) => {
    if (window.confirm(`هل أنت تأكد من إلغاء تعيين المرشح (${candidate.fullName}) بناءً على طلبه؟\nسيتم حذف بياناته تماماً من دليل الموظفين (Employee Directory) وإتاحة المجال للمرشحين الاحتياطيين.`)) {
      
      // Delete associated employee record from Employee Directory / Database if exists
      const targetEmp = employees.find(e => 
        (candidate.employeeId && String(e.employeeId) === String(candidate.employeeId)) ||
        (candidate.fullName && e.fullName === candidate.fullName) ||
        (candidate.email && e.email === candidate.email && e.email !== 'N/A' && !e.email.startsWith('no-email-')) ||
        (candidate.phone && e.phone === candidate.phone && e.phone !== 'N/A')
      );

      if (targetEmp) {
        try {
          await deleteEmployee(String(targetEmp.id));
        } catch (err) {
          console.error('Error deleting employee on hiring cancellation:', err);
        }
      }

      updateCandidate(candidate.id, {
        stage: 'مرفوض',
        addedToDirectory: false,
        notes: ((candidate.notes || '') + ' [تم إلغاء التعيين وحذف البيانات من دليل الموظفين]').trim()
      });

      addNotification({
        title: 'تم إلغاء التعيين وحذف الموظف',
        message: `تم إلغاء تعيين ${candidate.fullName} وحذف بياناته تماماً من دليل الموظفين.`,
        type: 'warning'
      });
    }
  };

  // Save Interview Scheduling (without Committee Evaluation - separate modal)
  const handleSaveInterview = () => {
    if (!activeCandidateForInterview) return;
    const { candidate, type } = activeCandidateForInterview;
    if (type === 'first') {
      // Save only interview scheduling data
      updateCandidate(candidate.id, {
        interviewDate: interviewForm.date,
        interviewTime: interviewForm.time,
        interviewLocation: interviewForm.location,
        notes: interviewForm.notes,
        stage: 'مقابلة اولى'
      });

      // Send WhatsApp message with interview details
      const jobTitle = getTitleName(candidate.jobTitle) || candidate.jobTitle;
      const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '964' + cleanPhone.substring(1) : (cleanPhone.startsWith('964') ? cleanPhone : '964' + cleanPhone);
      
      // Format date for better readability
      const selectedDate = interviewForm.date || new Date().toISOString().split('T')[0];
      const selectedTime = interviewForm.time || '10:00';
      const selectedLocation = interviewForm.location || 'مقر الشركة - بغداد المنصور / قاعة الاجتماعات الرئيسية';

      const dateObj = new Date(selectedDate);
      const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('ar-EG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : selectedDate;
      
      const interviewMsg = `السيد/ة ${candidate.fullName}،\n\nنود إعلامك بأن طلب التقديم الخاص بك على وظيفة (${jobTitle}) قد تمت مراجعته بنجاح.\n\nتم تحديد موعد المقابلة الابتدائية كالتالي:\n📅 التاريخ: ${formattedDate}\n⏰ الوقت: ${selectedTime}\n📍 المكان: ${selectedLocation}\n\n${interviewForm.notes ? `ملاحظات: ${interviewForm.notes}\n\n` : ''}يرجى الحضور في الموعد المحدد مع إحضار السيرة الذاتية الأصلية.\n\nمؤسسة فيتاس العراق - الموارد البشرية`;

      if (candidate.phone) {
        const encodedMsg = encodeURIComponent(interviewMsg);
        const waAppUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMsg}`;
        const waWebUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;
        
        try {
          const link = document.createElement('a');
          link.href = waAppUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.error('Error launching WhatsApp Desktop application:', e);
        }

        // Open universal WhatsApp link to ensure text is pre-filled
        setTimeout(() => {
          window.open(waWebUrl, '_blank');
        }, 200);
      } else {
        alert(`تم تحديد موعد المقابلة للمرشح ${candidate.fullName} بنجاح.`);
      }
      // Add notification for first interview scheduled
      addNotification({
        title: 'تم جدولة المقابلة الابتدائية',
        message: `تم جدولة مقابلة ابتدائية للمرشح ${candidate.fullName}`,
        type: 'success'
      });
    } else {
      updateCandidate(candidate.id, {
        secondInterviewDate: interviewForm.date,
        secondInterviewTime: interviewForm.time,
        secondInterviewLocation: interviewForm.location,
        secondInterviewNotes: interviewForm.notes,
        stage: 'مقابلة نهائية اختيارية'
      });

      // Send WhatsApp message for final interview
      const jobTitle = getTitleName(candidate.jobTitle) || candidate.jobTitle;
      const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '964' + cleanPhone.substring(1) : (cleanPhone.startsWith('964') ? cleanPhone : '964' + cleanPhone);
      
      const selectedDate = interviewForm.date || new Date().toISOString().split('T')[0];
      const selectedTime = interviewForm.time || '11:30';
      const selectedLocation = interviewForm.location || 'مقر الشركة - بغداد المنصور / مكتب الإدارة العامة';

      const dateObj = new Date(selectedDate);
      const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('ar-EG', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) : selectedDate;
      
      const finalInterviewMsg = `السيد/ة ${candidate.fullName}،\n\nنود إعلامك بأنك قد اجتزت المقابلة الابتدائية بنجاح لوظيفة (${jobTitle}).\n\nتم تحديد موعد المقابلة النهائية كالتالي:\n📅 التاريخ: ${formattedDate}\n⏰ الوقت: ${selectedTime}\n📍 المكان: ${selectedLocation}\n\n${interviewForm.notes ? `ملاحظات: ${interviewForm.notes}\n\n` : ''}يرجى الحضور في الموعد المحدد مع إحضار جميع المستندات المطلوبة.\n\nمؤسسة فيتاس العراق - الموارد البشرية`;

      if (candidate.phone) {
        const encodedMsg = encodeURIComponent(finalInterviewMsg);
        const waAppUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMsg}`;
        const waWebUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;
        
        try {
          const link = document.createElement('a');
          link.href = waAppUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (e) {
          console.error('Error launching WhatsApp Desktop application:', e);
        }

        // Open universal WhatsApp link to ensure text is pre-filled
        setTimeout(() => {
          window.open(waWebUrl, '_blank');
        }, 200);
      } else {
        alert(`تم تحديد موعد المقابلة النهائية للمرشح ${candidate.fullName} بنجاح.`);
      }
      // Add notification for final interview scheduled
      addNotification({
        title: 'تم جدولة المقابلة النهائية',
        message: `تم جدولة مقابلة نهائية للمرشح ${candidate.fullName}`,
        type: 'success'
      });
    }
    setActiveCandidateForInterview(null);
  };

  // Printable CV Logic for Pipeline (In-page iframe print - zero window.open / zero about:blank)
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
    <div><span class="info-label">الاسم الكامل: </span><span class="info-value">${targetCandidate.fullName}</span></div>
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

  // Save Employee Directory entry & sync candidate
  const handleSaveDirectoryEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCandidateForDirectory) return;

    try {
      const finalEmpCode = directoryForm.empCode || `VTS-${Math.floor(1000 + Math.random() * 9000)}`;

      await addEmployee({
        employeeId: finalEmpCode,
        badgeNo: directoryForm.badgeNo || '',
        fullName: directoryForm.fullNameAr,
        fullNameEn: directoryForm.fullNameEn || directoryForm.fullNameAr,
        email: directoryForm.email,
        personalEmail: directoryForm.personalEmail,
        phone: directoryForm.phone,
        emergencyPhone: directoryForm.emergencyPhone,
        department: directoryForm.department,
        jobTitle: directoryForm.jobTitle,
        branch: directoryForm.branch,
        joinDate: directoryForm.joinDate,
        originalStartDate: directoryForm.joinDate,
        contractStartDate: directoryForm.joinDate,
        salary: Number(directoryForm.basicSalary) + Number(directoryForm.transportationFixed) + Number(directoryForm.fixedBonus),
        basicSalary: Number(directoryForm.basicSalary),
        transportationFixed: Number(directoryForm.transportationFixed),
        fixedBonus: Number(directoryForm.fixedBonus),
        phoneAllowance: Number(directoryForm.phoneAllowance),
        certificateAllowance: Number(directoryForm.certificateAllowance),
        dob: directoryForm.dob,
        gender: (directoryForm.gender === 'أنثى' || directoryForm.gender === 'female' ? 'أنثى' : 'ذكر') as any,
        maritalStatus: (directoryForm.maritalStatus || 'أعزب') as any,
        status: 'Active'
      });

      updateCandidate(activeCandidateForDirectory.id, {
        stage: 'إدخال البيانات في دليل الموظفين',
        addedToDirectory: true,
        employeeId: finalEmpCode
      });

      // Add notification for employee directory entry
      addNotification({
        title: 'تم إضافة الموظف بنجاح',
        message: `تم إضافة ${directoryForm.fullNameAr} إلى دليل الموظفين بنجاح`,
        type: 'success'
      });

      setDirectorySuccessInfo({
        empId: directoryForm.empCode,
        empName: directoryForm.fullNameAr
      });
      setActiveCandidateForDirectory(null);
    } catch (error) {
      console.error('Error adding employee from candidate pipeline:', error);
      alert('حدث خطأ أثناء إدخال بيانات الموظف إلى الدليل.');
    }
  };

  const handleJobStatusChange = async (jobId: string, newStatus: JobVacancy['status']) => {
    try {
      if (jobId.startsWith('pos-')) {
        const positionId = jobId.replace('pos-', '');
        const position = positions.find(p => String(p.id) === positionId);
        const posTitle = position ? (position.name_ar || position.name) : jobId;
        
        await updateJobVacancy(jobId, {
          title: posTitle,
          status: newStatus,
          department: position?.department || 'إدارة التمويل الأصغر والعمليات',
          location: 'بغداد_المنصور'
        });
        setPositionStatuses(prev => ({ ...prev, [jobId]: newStatus }));
      } else {
        await updateJobVacancy(jobId, { status: newStatus });
      }
      setRefreshKey(prev => prev + 1);
      alert(t(`تم تغيير حالة الوظيفة إلى (${newStatus}) بنجاح وتحديثها في بوابات التقديم (Candidate Portal).`, `Job status updated to (${newStatus}) successfully and synced to Candidate Portal.`));
    } catch (error) {
      console.error('Error updating job status:', error);
      alert(t('حدث خطأ أثناء تحديث حالة الوظيفة', 'Error updating job status'));
    }
  };

  const handleDeleteCandidate = (candidateId: string) => {
    if (confirm(t('هل أنت متأكد من حذف هذا المرشح؟', 'Are you sure you want to delete this candidate?'))) {
      deleteCandidate(candidateId);
    }
  };

  const handleAddCandidateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPos = allActivePositions.find(p => p.id === newCandidate.jobOpeningId);
    const jobTitleValue = selectedPos ? (language === 'en' ? selectedPos.titleEn : selectedPos.titleAr) : newCandidate.jobOpeningId;
    
    addCandidate({
      fullName: newCandidate.fullName,
      email: newCandidate.email,
      phone: newCandidate.phone,
      appliedJobId: newCandidate.jobOpeningId,
      jobTitle: jobTitleValue,
      experienceYears: newCandidate.experience,
      rating: newCandidate.rating,
      stage: newCandidate.stage,
      notes: newCandidate.notes
    });

    setShowAddCandidateModal(false);
    setNewCandidate({
      fullName: '',
      email: '',
      phone: '',
      jobOpeningId: '',
      experience: 2,
      rating: 5,
      stage: 'استلام الطلبات',
      notes: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">alt_route</span>
            {t('خط سير توظيف المرشحين (Workflow ATS)', 'ATS Candidate Recruitment Pipeline')}
          </h2>
          <p className="text-sm font-normal mt-1" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
            {t('إدارة المرشحين عبر مراحل التوظيف الـ 7 المزامنة مع الإعدادات ودليل الموظفين', 'Manage candidates through the 7 recruitment workflow stages synced with Employee Directory')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Candidate Search Field */}
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('البحث عن مرشح (الاسم، البريد، الهاتف)...', 'Search candidate (name, email, phone)...')}
              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
              className={`w-full pr-9 pl-8 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                isDark 
                  ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-400' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500 shadow-sm'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all"
                title={t('مسح البحث', 'Clear Search')}
              >
                <span className="material-symbols-outlined text-sm">cancel</span>
              </button>
            )}
          </div>

          {/* Job Filter */}
          <div className="w-64">
            <SearchableComboBox
              options={[
                { id: 'all', name_ar: t('جميع الوظائف والمسميات', 'All Jobs & Positions'), name_en: t('جميع الوظائف والمسميات', 'All Jobs & Positions') },
                ...allActivePositions.map(pos => ({
                  id: pos.id,
                  name_ar: pos.titleAr,
                  name_en: pos.titleEn
                }))
              ]}
              value={getSelectedJobDisplayName()}
              onChange={(value, option) => {
                if (option && option.id === 'all') {
                  setSelectedJobId('all');
                } else if (option) {
                  setSelectedJobId(option.id);
                }
              }}
              placeholder={t('تصفية حسب الوظيفة...', 'Filter by job...')}
              language={language}
              className="w-full"
            />
          </div>

          {/* Job Status Change */}
          {selectedJobId !== 'all' && (
            <div className="flex items-center gap-2">
              <div className="w-40">
                <select
                  key={`${selectedJobId}-${refreshKey}`}
                  value={syncedJobVacancies.find(j => j.id === selectedJobId)?.status || 'مفتوحة'}
                  onChange={(e) => handleJobStatusChange(selectedJobId, e.target.value as JobVacancy['status'])}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                    isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                  }`}
                >
                  <option value="مفتوحة">{t('مفتوحة', 'Open')}</option>
                  <option value="مغلقة">{t('مغلقة', 'Closed')}</option>
                  <option value="مسودة">{t('مسودة', 'Draft')}</option>
                </select>
              </div>
            </div>
          )}

          {/* Toggle Filled Jobs */}
          <button
            onClick={() => setShowFilledJobs(!showFilledJobs)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              showFilledJobs 
                ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25' 
                : isDark 
                  ? 'bg-[#1e293b] border border-slate-700 text-slate-200 hover:bg-[#334155]'
                  : 'bg-white border border-slate-300 text-slate-900 hover:bg-slate-100 shadow-sm'
            }`}
          >
            {t('إظهار الوظائف المملوءة', 'Show Filled Jobs')}
          </button>

          <button
            onClick={() => setShowAddCandidateModal(true)}
            style={{ color: '#ffffff' }}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            {t('إضافة مرشح', 'Add Candidate')}
          </button>
        </div>
      </div>

      {/* 7-Step Interactive Workflow Connected Stepper Bar with Pressed Active Styling */}
      <div className={`p-5 rounded-2xl border shadow-sm ${
        isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-300 shadow-md text-slate-900'
      }`}>
        <div className={`flex items-center justify-between mb-4 border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-xl">alt_route</span>
            <span className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {t('مسار عمل التوظيف الإلكتروني (6 مراحل متسلسلة)', 'Recruitment 6-Step Sequential Workflow Scenario')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveWorkflowFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeWorkflowFilter === 'all' 
                  ? 'bg-teal-600 text-white shadow-md' 
                  : isDark ? 'bg-white/10 text-slate-300 hover:bg-white/20' : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              }`}
            >
              {t('عرض جميع المراحل', 'Show All Stages')} ({validCandidates.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { id: 'استلام الطلبات', num: '1', title: 'استلام الطلبات', icon: 'inbox', count: groupedCandidates['استلام الطلبات']?.length || 0 },
            { id: 'فرز المتقدمين', num: '2', title: 'فرز المتقدمين', icon: 'filter_alt', count: groupedCandidates['فرز المتقدمين']?.length || 0 },
            { id: 'مقابلة اولى', num: '3', title: 'مقابلة أولى', icon: 'groups', count: groupedCandidates['مقابلة اولى']?.length || 0 },
            { id: 'مقابلة نهائية اختيارية', num: '4', title: 'مقابلة نهائية اختيارية', icon: 'verified_user', count: groupedCandidates['مقابلة نهائية اختيارية']?.length || 0 },
            { id: 'تعيين', num: '5', title: 'تعيين / قبول نهائي', icon: 'badge', count: groupedCandidates['تعيين']?.length || 0 },
            { id: 'إدخال البيانات في دليل الموظفين', num: '6', title: 'إدخال بيانات الموظف', icon: 'contact_page', count: groupedCandidates['إدخال البيانات في دليل الموظفين']?.length || 0 }
          ].map((step) => {
            const isActive = activeWorkflowFilter === step.id;
            const hasCandidates = step.count > 0;
            const isPressed = isActive || hasCandidates;

            return (
              <div
                key={step.id}
                onClick={() => setActiveWorkflowFilter(isActive ? 'all' : step.id)}
                className={`cursor-pointer p-3 rounded-xl transition-all flex flex-col justify-between select-none ${
                  isPressed
                    ? isDark
                      ? 'bg-slate-900 border-2 border-teal-500 text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] translate-y-[2px] font-bold'
                      : 'bg-slate-50 border-2 border-teal-600 text-slate-900 shadow-md translate-y-[1px] font-bold'
                    : isDark 
                      ? 'bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200' 
                      : 'bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    isPressed ? 'bg-teal-500 text-slate-950 font-black' : isDark ? 'bg-white/10 text-white' : 'bg-slate-800 text-white'
                  }`}>
                    {step.num}
                  </span>
                  <span className={`material-symbols-outlined text-lg ${
                    isPressed ? (isDark ? 'text-teal-400' : 'text-slate-900') : (isDark ? 'text-teal-400' : 'text-teal-600')
                  }`}>
                    {step.icon}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold truncate" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {step.title}
                  </div>
                  <div className={`text-[11px] font-bold mt-1 ${
                    isDark ? (isPressed ? 'text-teal-300' : 'text-teal-400') : (isPressed ? 'text-slate-800' : 'text-slate-600')
                  }`}>
                    {step.count} {t('مرشح', 'candidates')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Cards Rendered Vertically (Stack Layout - ONLY Stages With Applicants) */}
      <div className="space-y-6 pb-6">
        {stagesToRender.map(stage => (
          <div 
            key={stage} 
            className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-[#111827] border-white/10 shadow-lg text-white' : 'bg-white border-slate-300 shadow-md text-slate-900'
            }`}
          >
            {/* Stage Title Section */}
            <div className={`flex items-center justify-between mb-4 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full ${getStageColor(stage)} shadow-sm`}></div>
                <h3 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {getStageTitle(stage)}
                </h3>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${
                  isDark ? 'bg-slate-800 text-teal-400 border border-slate-700' : 'bg-slate-100 text-slate-900 border border-slate-300'
                }`}>
                  {groupedCandidates[stage]?.length || 0} {t('مرشح متقدم', 'candidates')}
                </span>
              </div>
            </div>

            {/* Applicant Cards Grid (3 Cards Per Row on Desktop Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupedCandidates[stage]?.map(candidate => {
                // Always show all candidates in their respective workflow stages without hiding any applicants
                const job = jobVacancies.find(j => j.id === candidate.appliedJobId);
                const displayJobTitle = getTitleName(job?.title || candidate.jobTitle) || candidate.jobTitle;
                const normalizedCurrentStage = normalizeStage(candidate.stage);

                const top3ForThisJob = getTop3CandidatesForJob(candidate.appliedJobId || candidate.jobTitle);
                const rankIndex = top3ForThisJob.findIndex(c => String(c.id) === String(candidate.id));
                const rank = rankIndex !== -1 ? rankIndex + 1 : 0;

                return (
                  <div
                    key={candidate.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700/80 hover:border-teal-500/50 text-white shadow-md' 
                        : 'bg-slate-50 border-slate-300 hover:border-teal-500/50 text-slate-900 shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Candidate Personal Photo / Avatar */}
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${
                          isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-200 border-slate-300 shadow-sm'
                        }`}>
                          {candidate.photoUrl ? (
                            <img
                              src={candidate.photoUrl.startsWith('/uploads/') && typeof window !== 'undefined' ? `${window.location.origin}${candidate.photoUrl}` : candidate.photoUrl}
                              alt={getCandidateDisplayName(candidate, language)}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                              }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-2xl text-slate-400">person</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold break-words" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                            {getCandidateDisplayName(candidate, language)}
                          </h4>
                          <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-0.5 flex items-center gap-1 truncate">
                            <span className="material-symbols-outlined text-xs shrink-0">work</span>
                            <span className="truncate">{displayJobTitle}</span>
                          </p>
                        </div>
                      </div>

                      {/* Committee Evaluations Button & Score Circle Badge at Top Right (Solid Black Font, Normal Weight) */}
                      <div className="flex flex-col items-center shrink-0 gap-1.5">
                        <button
                          type="button"
                          onClick={() => openCommitteeScoresModal(candidate)}
                          className="px-2.5 py-1 rounded-lg bg-amber-400/30 hover:bg-amber-400/50 border border-amber-500/60 text-[11px] font-normal flex items-center gap-1 transition-all shadow-sm"
                          style={{ color: '#000000' }}
                          title="انقر لإضافة وتعديل تقييمات أعضاء لجنة التعيين"
                        >
                          <span className="material-symbols-outlined text-xs text-amber-600 dark:text-amber-400">how_to_reg</span>
                          <span style={{ color: '#000000' }} className="font-normal">تقييم اللجنة</span>
                        </button>

                        <div 
                          onClick={() => openCommitteeScoresModal(candidate)}
                          className={`w-11 h-11 rounded-full border-2 cursor-pointer flex flex-col items-center justify-center transition-all hover:scale-105 shadow-md ${
                            getCandidateAverageScore(candidate) >= 80 
                              ? 'border-emerald-600 bg-emerald-500/20' 
                              : getCandidateAverageScore(candidate) >= 60 
                                ? 'border-amber-600 bg-amber-500/20' 
                                : getCandidateAverageScore(candidate) > 0 
                                  ? 'border-rose-600 bg-rose-500/20' 
                                  : 'border-slate-500/50 bg-slate-500/10'
                          }`}
                          style={{ color: '#000000' }}
                          title={`معدل تقييم اللجنة: ${getCandidateAverageScore(candidate)}/100`}
                        >
                          <span className="text-xs font-normal leading-none" style={{ color: '#000000' }}>{getCandidateAverageScore(candidate)}</span>
                          <span className="text-[8px] font-normal mt-0.5" style={{ color: '#000000' }}>/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 mb-3" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                      <div className="flex items-center gap-1.5 font-bold truncate">
                        <span className="material-symbols-outlined text-xs text-teal-600 dark:text-teal-400">email</span>
                        <span className="truncate">{candidate.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-xs text-indigo-500">phone</span>
                        <span>{candidate.phone || '07700000000'}</span>
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
                          : 'bg-white border-teal-600/30 hover:border-teal-600 hover:bg-teal-50/50 shadow-sm'
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

                    {/* Top 3 Evaluation Rank Badge (Only after evaluation when score > 0) */}
                    {rank > 0 && getCandidateAverageScore(candidate) > 0 && (
                      <div className={`mb-2 p-2 rounded-lg border text-xs font-bold flex items-center justify-between shadow-sm ${
                        rank === 1 
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-300'
                          : rank === 2
                            ? 'bg-slate-500/15 border-slate-500/40 text-slate-800 dark:text-slate-200'
                            : 'bg-orange-500/15 border-orange-500/40 text-orange-800 dark:text-orange-300'
                      }`}>
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm">{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>
                          <span className="truncate">{rank === 1 ? 'المركز #1 (المقبول الرئيسي)' : rank === 2 ? 'المركز #2 (الاحتياطي الأول)' : 'المركز #3 (الاحتياطي الثاني)'}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/20 shrink-0">{getCandidateAverageScore(candidate)}/100</span>
                      </div>
                    )}

                    {/* Stage Specific Badges & Action Buttons */}
                    {candidate.committeeOpinion && (
                      <div className="mb-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-bold">
                        <span className="material-symbols-outlined text-xs align-middle ml-1">rate_review</span>
                        رأي اللجنة: {candidate.committeeOpinion}
                      </div>
                    )}

                    {candidate.interviewDate && (
                      <div className="mb-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-800 dark:text-indigo-300 font-bold">
                        <span className="material-symbols-outlined text-xs align-middle ml-1">event</span>
                        مقابلة: {String(candidate.interviewDate).split('T')[0]} ({candidate.interviewTime || '10:00'})
                      </div>
                    )}

                    {/* Special Hiring & Offer Cancellation Buttons for Stage 5 & Stage 6 */}
                    {(normalizedCurrentStage === 'تعيين' || normalizedCurrentStage === 'إدخال البيانات في دليل الموظفين') && (
                      <div className="space-y-1.5 mb-2">
                        {rank === 1 || candidate.addedToDirectory ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCancelCandidateHiring(candidate)}
                              className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                              title="انقر في حال طلب المقبول اعتذاراً أو إلغاء تعيينه لإتاحة الوظيفة للمرشحين الاحتياطيين"
                            >
                              <span className="material-symbols-outlined text-xs text-amber-500">person_cancel</span>
                              إلغاء التعيين / اعتذار المقبول ⚠️
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDirectoryModalForCandidate(candidate)}
                            className="w-full py-1.5 px-3 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                            title="تعيين هذا المرشح كبديل وإدخال بياناته في دليل الموظفين"
                          >
                            <span className="material-symbols-outlined text-xs">person_add</span>
                            تعيين كبديل (إدخال البيانات في الدليل) ➕
                          </button>
                        )}
                      </div>
                    )}

                    {normalizedCurrentStage === 'مرفوض' && (
                      <button
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all mb-2"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        {t('حذف الطلب', 'Delete Application')}
                      </button>
                    )}

                    <select
                      value={normalizedCurrentStage}
                      onChange={(e) => handleStageChange(candidate.id, e.target.value as Candidate['stage'])}
                      style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                      className={`w-full text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none border ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {kanbanStages.map(s => (
                        <option key={s} value={s}>{getStageTitle(s)}</option>
                      ))}
                    </select>

                    <div className={`flex items-center justify-between mt-3 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                      <button
                        onClick={() => handleDeleteCandidate(candidate.id)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                        {t('حذف', 'Delete')}
                      </button>
                      <div className="text-xs font-bold flex items-center gap-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                        <span className="material-symbols-outlined text-xs text-indigo-500">workspace_premium</span>
                        <span>{candidate.experienceYears} {t('سنوات خبرة', 'yrs exp')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {stagesToRender.length === 0 && (
          <div className={`p-12 text-center rounded-2xl border ${
            isDark ? 'bg-[#111827] border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-900 shadow-md'
          }`}>
            <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">folder_off</span>
            <h3 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {t('لا يوجد متقدمين في هذه المرحلة حالياً', 'No candidates found in this stage currently')}
            </h3>
            <p className="text-xs font-normal mt-1 text-slate-500">
              {t('انقر على "عرض جميع المراحل" أعلاه لمشاهدة جميع المتقدمين المسجلين.', 'Click "Show All Stages" above to view all registered applicants.')}
            </p>
          </div>
        )}
      </div>

      {/* Stage 2: Screening Check Modal ("هل المتقدم سيتم تقييمه ؟") */}
      {screeningCandidate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-md shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                <span className="material-symbols-outlined text-purple-500">filter_alt</span>
                فرز المتقدم: {screeningCandidate.fullName}
              </h3>
              <button onClick={() => setScreeningCandidate(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl">help</span>
              </div>

              <p className="text-base font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                هل المتقدم سيتم تقييمه ؟
              </p>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                عند اختيار <strong>"نعم"</strong> سينتقل المتقدم إلى مرحلة المقابلة الابتدائية دون إرسال رسالة واتساب (سيتم الإرسال عند تحديد موعد المقابلة).<br/>
                وعند اختيار <strong>"لا"</strong> سيتم استبعاد المتقدم وإرسال رسالة اعتذار عبر الواتساب لعدم توفر المؤهلات.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleConfirmScreening(screeningCandidate, true)}
                  className="py-3 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>نعم (متابعة الفرز)</span>
                </button>

                <button
                  onClick={() => handleConfirmScreening(screeningCandidate, false)}
                  className="py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  <span>لا (استبعاد واعتذار)</span>
                </button>
              </div>
            </div>
          </div>
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
            <div className="flex-1 overflow-y-auto p-6 space-y-6" id="printable-cv-pipeline-area">
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
                    المتقدم: {cvModalCandidate.fullName} | الوظيفة: {cvModalCandidate.jobTitle}
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
                        id="cv-modal-iframe"
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

      {/* Stage 3 & 4: Interview Scheduling Modal (with Committee Evaluation for First Interview) */}
      {activeCandidateForInterview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-lg shadow-2xl ${
            isDark ? 'bg-[#0f172a] border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                <span className="material-symbols-outlined text-indigo-500">event</span>
                {activeCandidateForInterview.type === 'first' ? 'جدولة المقابلة الابتدائية (سيتم إرسال واتساب)' : 'جدولة المقابلة النهائية الاختيارية'}: {activeCandidateForInterview.candidate.fullName}
              </h3>
              <button onClick={() => setActiveCandidateForInterview(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              {/* Interview Scheduling Section */}
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  معلومات المقابلة
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>تاريخ المقابلة:</label>
                    <input
                      type="date"
                      value={interviewForm.date}
                      onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                      style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                      className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>وقت المقابلة:</label>
                    <input
                      type="time"
                      value={interviewForm.time}
                      onChange={(e) => setInterviewForm({ ...interviewForm, time: e.target.value })}
                      style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                      className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>مكان المقابلة / الرابط الإلكتروني:</label>
                  <input
                    type="text"
                    value={interviewForm.location}
                    onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                    placeholder="مثال: مقر الشركة - بغداد المنصور / قاعة الاجتماعات الرئيسية"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>ملاحظات إجراء المقابلة:</label>
                  <textarea
                    rows={2}
                    value={interviewForm.notes}
                    onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                    placeholder="أدخل أي ملاحظات خاصة بالمقابلة..."
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border resize-none ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setActiveCandidateForInterview(null)}
                  className="flex-1 py-2 rounded-xl border bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveInterview}
                  className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  حفظ وإرسال دعوة واتساب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Committee Evaluation Modal (Internal - for interview time) */}
      {activeCandidateForEvaluation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-lg shadow-2xl ${
            isDark ? 'bg-[#0f172a] border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                <span className="material-symbols-outlined text-amber-500">rate_review</span>
                نموذج تقييم المقابلة: {activeCandidateForEvaluation.fullName}
              </h3>
              <button onClick={() => setActiveCandidateForEvaluation(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h4 className="font-bold text-amber-700 dark:text-amber-300 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">rate_review</span>
                  نموذج المسؤولين عن المقابلة
                </h4>
                
                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>اسم المكتب للمشترك بالتقييم:</label>
                  <input
                    type="text"
                    value={evalForm.officeName}
                    onChange={(e) => setEvalForm({ ...evalForm, officeName: e.target.value })}
                    placeholder="مثال: مكتب التقييم المركزي"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>اسم المقيم:</label>
                  <input
                    type="text"
                    value={evalForm.evaluatorName}
                    onChange={(e) => setEvalForm({ ...evalForm, evaluatorName: e.target.value })}
                    placeholder="اسم المقيم المسؤول"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>العنوان الوظيفي للمقيم:</label>
                  <input
                    type="text"
                    value={evalForm.jobTitle}
                    onChange={(e) => setEvalForm({ ...evalForm, jobTitle: e.target.value })}
                    placeholder="مثال: مدير الموارد البشرية"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>الدرجة النهائية (Score):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={evalForm.finalScore}
                    onChange={(e) => setEvalForm({ ...evalForm, finalScore: parseInt(e.target.value) || 0 })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>رأي لجنة التقييم:</label>
                  <input
                    type="text"
                    value={evalForm.opinion}
                    onChange={(e) => setEvalForm({ ...evalForm, opinion: e.target.value })}
                    placeholder="مثال: يمتلك مؤهلات ممتازة للوظيفة مع خبرة عملية متميزة..."
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>مبررات القرار والملاحظات الفنية:</label>
                  <textarea
                    rows={2}
                    value={evalForm.decisionReason}
                    onChange={(e) => setEvalForm({ ...evalForm, decisionReason: e.target.value })}
                    placeholder="تفاصيل التقييم من قبل أعضاء لجنة التقييم..."
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border resize-none ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  onClick={() => setActiveCandidateForEvaluation(null)}
                  className="flex-1 py-2 rounded-xl border bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    updateCandidate(activeCandidateForEvaluation.id, {
                      officeName: evalForm.officeName,
                      evaluatorName: evalForm.evaluatorName,
                      evaluatorJobTitle: evalForm.jobTitle,
                      finalScore: evalForm.finalScore,
                      committeeOpinion: evalForm.opinion,
                      decisionReason: evalForm.decisionReason
                    });
                    addNotification({
                      title: 'تم حفظ التقييم',
                      message: `تم حفظ تقييم المقابلة للمرشح ${activeCandidateForEvaluation.fullName}`,
                      type: 'success'
                    });
                    setActiveCandidateForEvaluation(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  حفظ التقييم
                </button>
                <button
                  onClick={() => {
                    // Print evaluation form
                    const printContent = `
                      <html dir="rtl" lang="ar">
                      <head>
                        <meta charset="utf-8">
                        <title>نموذج تقييم المقابلة - ${activeCandidateForEvaluation.fullName}</title>
                        <style>
                          @page { size: A4; margin: 15mm; }
                          body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #0f172a; line-height: 1.6; padding: 20px; background: #ffffff; }
                          .header { border-bottom: 3px solid #f59e0b; padding-bottom: 15px; margin-bottom: 20px; }
                          .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
                          .subtitle { font-size: 14px; font-weight: bold; color: #f59e0b; margin-top: 4px; }
                          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #cbd5e1; margin-bottom: 20px; font-size: 13px; }
                          .info-label { font-weight: bold; color: #475569; }
                          .info-value { font-weight: bold; color: #0f172a; }
                          .section { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 16px; background: #ffffff; }
                          .section-title { font-size: 14px; font-weight: bold; color: #f59e0b; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
                          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1 class="title">نموذج تقييم المقابلة</h1>
                          <p class="subtitle">مؤسسة فيتاس العراق - الموارد البشرية</p>
                        </div>
                        
                        <div class="info-grid">
                          <div><span class="info-label">اسم المرشح:</span> <span class="info-value">${activeCandidateForEvaluation.fullName}</span></div>
                          <div><span class="info-label">الوظيفة المقدمة:</span> <span class="info-value">${activeCandidateForEvaluation.jobTitle}</span></div>
                          <div><span class="info-label">تاريخ المقابلة:</span> <span class="info-value">${activeCandidateForEvaluation.interviewDate || '-'}</span></div>
                          <div><span class="info-label">وقت المقابلة:</span> <span class="info-value">${activeCandidateForEvaluation.interviewTime || '-'}</span></div>
                        </div>

                        <div class="section">
                          <h3 class="section-title">معلومات التقييم</h3>
                          <div class="info-grid">
                            <div><span class="info-label">اسم المكتب:</span> <span class="info-value">${evalForm.officeName || '-'}</span></div>
                            <div><span class="info-label">اسم المقيم:</span> <span class="info-value">${evalForm.evaluatorName || '-'}</span></div>
                            <div><span class="info-label">العنوان الوظيفي:</span> <span class="info-value">${evalForm.jobTitle || '-'}</span></div>
                            <div><span class="info-label">الدرجة النهائية:</span> <span class="info-value">${evalForm.finalScore || 0} / 100</span></div>
                          </div>
                        </div>

                        <div class="section">
                          <h3 class="section-title">رأي لجنة التقييم</h3>
                          <p>${evalForm.opinion || 'لا يوجد'}</p>
                        </div>

                        <div class="section">
                          <h3 class="section-title">مبررات القرار والملاحظات الفنية</h3>
                          <p>${evalForm.decisionReason || 'لا يوجد'}</p>
                        </div>

                        <div class="footer">
                          <p>تم إصدار هذا النموذج بتاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
                          <p>مؤسسة فيتاس العراق - إدارة الموارد البشرية</p>
                        </div>
                      </body>
                      </html>
                    `;
                    
                    const printFrame = document.createElement('iframe');
                    printFrame.style.display = 'none';
                    document.body.appendChild(printFrame);
                    
                    const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
                    if (doc) {
                      doc.open();
                      doc.write(printContent);
                      doc.close();
                      
                      setTimeout(() => {
                        try {
                          printFrame.contentWindow?.focus();
                          printFrame.contentWindow?.print();
                        } catch (e) {
                          console.warn('Print iframe execution failed:', e);
                        }
                      }, 300);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  طباعة النموذج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage 7: Employee Directory Basic Data Entry Modal */}
      {activeCandidateForDirectory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 text-teal-600 dark:text-teal-400">
                  <span className="material-symbols-outlined">contact_page</span>
                  إدخال البيانات الأساسية في دليل الموظفين (Employee Directory)
                </h3>
                <p className="text-xs font-bold mt-0.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  بعد القبول الكامل للمرشح ({activeCandidateForDirectory.fullName})، يُرجى استكمال البيانات لبدء إصدار العقد المناسب.
                </p>
              </div>
              <button onClick={() => setActiveCandidateForDirectory(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveDirectoryEntry} className="space-y-4 text-xs font-bold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>الاسم الكامل (بالعربية): *</label>
                  <input
                    type="text"
                    required
                    value={directoryForm.fullNameAr}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, fullNameAr: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>الاسم الكامل (بالإنكليزية):</label>
                  <input
                    type="text"
                    value={directoryForm.fullNameEn}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, fullNameEn: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>رمز الموظف (Employee ID): *</label>
                  <input
                    type="text"
                    required
                    value={directoryForm.empCode}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, empCode: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>رقم البادج (Badge No):</label>
                  <input
                    type="text"
                    value={directoryForm.badgeNo}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, badgeNo: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>البريد الإلكتروني المؤسسي:</label>
                  <input
                    type="email"
                    value={directoryForm.email}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, email: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>رقم الهاتف الأساسي:</label>
                  <input
                    type="tel"
                    value={directoryForm.phone}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, phone: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>المسمى الوظيفي: *</label>
                  <input
                    type="text"
                    required
                    value={directoryForm.jobTitle}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, jobTitle: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>القسم / الإدارة:</label>
                  <input
                    type="text"
                    value={directoryForm.department}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, department: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>الفرع / موقع العمل:</label>
                  <input
                    type="text"
                    value={directoryForm.branch}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, branch: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>تاريخ المباشرة / التعيين:</label>
                  <input
                    type="date"
                    value={directoryForm.joinDate}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, joinDate: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>الراتب الاسمي الأساسي (IQD):</label>
                  <input
                    type="number"
                    value={directoryForm.basicSalary || ''}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, basicSalary: Number(e.target.value) || 0 })}
                    placeholder="أدخل الراتب الاسمي"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>مخصصات النقل المقطوعة (IQD):</label>
                  <input
                    type="number"
                    value={directoryForm.transportationFixed || ''}
                    onChange={(e) => setDirectoryForm({ ...directoryForm, transportationFixed: Number(e.target.value) || 0 })}
                    placeholder="أدخل مخصصات النقل"
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-white text-xs font-bold">
                <span className="material-symbols-outlined text-sm align-middle ml-1">info</span>
                عند الضغط على حفظ وإدخال البيانات، سيتم تسجيل الموظف فوراً في **Employee Directory** بجميع تفاصيله الأساسية، وسيصبح جاهزاً للبدء بإصدار العقد المناسب في قسم الموارد البشرية.
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveCandidateForDirectory(null)}
                  className="flex-1 py-2.5 rounded-xl border bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white font-bold shadow-lg"
                >
                  حفظ وإدخال البيانات إلى دليل الموظفين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Directory Entry Success Toast / Navigation Confirmation */}
      {directorySuccessInfo && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-md text-center shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-emerald-500/40 text-white' : 'bg-white border-emerald-500/40 text-slate-900'
          }`}>
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-500 mb-1">
              تم إدخال البيانات بنجاح!
            </h3>
            <p className="text-xs font-bold mb-4" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
              تم تسجيل الموظف الجديد ({directorySuccessInfo.empName}) برقم الوظيفي ({directorySuccessInfo.empId}) في **Employee Directory**. يمكنك الآن الانتقال مباشرة لإصدار وتجهيز العقد.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setDirectorySuccessInfo(null);
                  setActiveModuleId('emp-directory');
                }}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                الانتقال إلى دليل الموظفين / إدارة العقود فوراً
              </button>
              <button
                onClick={() => setDirectorySuccessInfo(null)}
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-300 text-xs font-bold"
              >
                البقاء في صفحة التوظيف (Candidate Pipeline)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-md shadow-2xl ${
            isDark ? 'bg-[#0f172a] border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
              <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إضافة مرشح جديد', 'Add New Candidate')}
              </h3>
              <button
                onClick={() => setShowAddCandidateModal(false)}
                className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCandidateSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('الاسم الكامل', 'Full Name')}: *</label>
                <input
                  type="text"
                  required
                  value={newCandidate.fullName}
                  onChange={(e) => setNewCandidate({ ...newCandidate, fullName: e.target.value })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('البريد الإلكتروني', 'Email')}: *</label>
                <input
                  type="email"
                  required
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('رقم الهاتف', 'Phone')}:</label>
                <input
                  type="tel"
                  value={newCandidate.phone}
                  onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('الوظيفة / المسمى الوظيفي', 'Applied Position')}: *</label>
                <select
                  required
                  value={newCandidate.jobOpeningId}
                  onChange={(e) => setNewCandidate({ ...newCandidate, jobOpeningId: e.target.value })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  <option value="">{t('اختر الوظيفة أو المسمى', 'Select Position')}</option>
                  {allActivePositions.map(pos => (
                    <option key={pos.id} value={pos.id}>
                      {language === 'en' ? pos.titleEn : pos.titleAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('المرحلة الأولية', 'Initial Stage')}:</label>
                <select
                  value={newCandidate.stage}
                  onChange={(e) => setNewCandidate({ ...newCandidate, stage: e.target.value as Candidate['stage'] })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  {kanbanStages.map(stage => (
                    <option key={stage} value={stage}>{getStageTitle(stage)}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  {t('إضافة المرشح', 'Add Candidate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attached CV Document Preview Modal (Matching Candidate Profile exactly) */}
      {cvModalCandidate && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border overflow-hidden ${
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
                    handlePrintCv(cvModalCandidate);
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
              {/* Document Header Card */}
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
                    المتقدم: {cvModalCandidate.fullName} | الوظيفة: {cvModalCandidate.jobTitle}
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
                        id="cv-modal-iframe"
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

      {/* Committee Evaluators Modal */}
      {activeCandidateForCommitteeScores && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border bg-white border-slate-300 text-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">how_to_reg</span>
                </div>
                <div>
                  <h3 className="text-base font-normal flex items-center gap-2" style={{ color: '#000000' }}>
                    تقييمات لجنة التعيين: {activeCandidateForCommitteeScores.fullName}
                  </h3>
                  <p className="text-xs font-normal" style={{ color: '#000000' }}>
                    الوظيفة المقدمة: {activeCandidateForCommitteeScores.jobTitle}
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveCandidateForCommitteeScores(null)} className="text-slate-500 hover:text-slate-950">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Live Average Banner */}
            <div className="p-4 rounded-xl mb-5 bg-amber-400/20 border border-amber-500/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-normal" style={{ color: '#000000' }}>معدل التقييم الإجمالي للجنة:</div>
                <div className="text-2xl font-normal flex items-baseline gap-1 mt-0.5" style={{ color: '#000000' }}>
                  <span style={{ color: '#000000' }}>
                    {committeeScoresList.length > 0
                      ? Math.round(committeeScoresList.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / committeeScoresList.length)
                      : 0}
                  </span>
                  <span className="text-xs font-normal" style={{ color: '#000000' }}>/ 100</span>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-lg bg-amber-500/30 text-black border border-amber-500/50 text-xs font-normal" style={{ color: '#000000' }}>
                عدد المقيمين: {committeeScoresList.length} أعضاء
              </div>
            </div>

            {/* Add New Evaluator Form */}
            <div className="p-4 rounded-xl mb-5 border bg-slate-50 border-slate-300 space-y-3">
              <h4 className="text-xs font-normal flex items-center gap-1.5" style={{ color: '#000000' }}>
                <span className="material-symbols-outlined text-sm">person_add</span>
                إضافة مقيم جديد إلى القائمة:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-normal">
                <div>
                  <label className="block mb-1 font-normal" style={{ color: '#000000' }}>اسم المقيم الكامل: *</label>
                  <input
                    type="text"
                    value={newEvaluator.fullName}
                    onChange={(e) => setNewEvaluator({ ...newEvaluator, fullName: e.target.value })}
                    placeholder="مثال: د. مصطفى علي"
                    style={{ color: '#000000' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-black font-normal placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-normal" style={{ color: '#000000' }}>منصب المقيم / العنوان الوظيفي: *</label>
                  <input
                    type="text"
                    value={newEvaluator.jobTitle}
                    onChange={(e) => setNewEvaluator({ ...newEvaluator, jobTitle: e.target.value })}
                    placeholder="مثال: مسؤول قسم الموارد البشرية"
                    style={{ color: '#000000' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-black font-normal placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-normal" style={{ color: '#000000' }}>اسم المكتب / القسم (اختياري):</label>
                  <input
                    type="text"
                    value={newEvaluator.officeName}
                    onChange={(e) => setNewEvaluator({ ...newEvaluator, officeName: e.target.value })}
                    placeholder="مثال: الإدارة العامة / التقييم"
                    style={{ color: '#000000' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-black font-normal placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block mb-1 font-normal" style={{ color: '#000000' }}>درجة التقييم (من 100): *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newEvaluator.score}
                    onChange={(e) => setNewEvaluator({ ...newEvaluator, score: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                    style={{ color: '#000000' }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-black font-normal placeholder-slate-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddEvaluator}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-normal flex items-center justify-center gap-1.5 shadow-md transition-all mt-2"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                إضافة المقيم إلى اللجنة
              </button>
            </div>

            {/* Added Evaluators List */}
            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-normal" style={{ color: '#000000' }}>أعضاء اللجنة الجاري تقييمهم ({committeeScoresList.length}):</h4>
              {committeeScoresList.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl font-normal text-xs" style={{ color: '#000000' }}>
                  لم يتم إضافة أي مقيم بعد. استخدم النموذج أعلاه لإضافة أعضاء اللجنة ودرجاتهم.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {committeeScoresList.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-600/20 text-slate-950 font-normal flex items-center justify-center text-xs shrink-0" style={{ color: '#000000' }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-normal" style={{ color: '#000000' }}>
                            {item.fullName || 'مقيم بدون اسم'}
                          </div>
                          <div className="text-[11px] font-normal flex items-center gap-2" style={{ color: '#000000' }}>
                            <span>{item.jobTitle || 'منصب غير محدد'}</span>
                            {item.officeName && <span>• {item.officeName}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="px-3.5 py-1 rounded-full bg-amber-400/30 text-black font-normal text-xs border border-amber-500/50" style={{ color: '#000000' }}>
                          {item.score} / 100
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEvaluator(idx)}
                          className="text-rose-600 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="حذف المقيم"
                        >
                          <span className="material-symbols-outlined text-base font-normal">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-300">
              <button
                onClick={() => setActiveCandidateForCommitteeScores(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-slate-100 text-slate-950 font-normal text-xs"
                style={{ color: '#000000' }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveCommitteeScores}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-normal text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-base">save</span>
                حفظ وتأكيد تقييمات اللجنة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
