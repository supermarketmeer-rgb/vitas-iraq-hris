import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Candidate, JobVacancy, CommitteeScore, CommitteeMember, InterviewCommittee, InterviewEvaluationRecord } from '../../types';
import { api } from '../../api/client';
import { SearchableComboBox } from '../SearchableComboBox';
import { getCandidateDisplayName, transliterateEnglishNameToArabic } from '../../utils/nameHelper';

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
    addDocumentRecord,
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

  // Form state for adding candidate (matching CandidatePortal fields)
  const [newCandidate, setNewCandidate] = useState({
    fullName: '',
    fullNameAr: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    email: '',
    personalEmail: '',
    phone: '',
    nationalIdNumber: '',
    jobOpeningId: '',
    experience: 2,
    rating: 5,
    stage: 'استلام الطلبات' as Candidate['stage'],
    notes: '',
    photoFile: null as File | null,
    resumeFile: null as File | null,
    photoUrl: '',
    resumeName: '',
    resumeUrl: ''
  });

  const handleCandidatePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const photoUrl = URL.createObjectURL(file);
      setNewCandidate(prev => ({ ...prev, photoFile: file, photoUrl }));
    }
  };

  const handleCandidateResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setNewCandidate(prev => ({
          ...prev,
          resumeFile: file,
          resumeName: file.name,
          resumeUrl: dataUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

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
      const rawAvg = total / c.committeeScores.length;
      return Number.isInteger(rawAvg) ? rawAvg : Number(rawAvg.toFixed(1));
    }
    if (c.finalScore && Number(c.finalScore) > 0) {
      const fs = Number(c.finalScore);
      return Number.isInteger(fs) ? fs : Number(fs.toFixed(1));
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
    const rawAvg = committeeScoresList.length > 0 ? (total / committeeScoresList.length) : 0;
    const avgScore = Number.isInteger(rawAvg) ? rawAvg : Number(rawAvg.toFixed(1));

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
    dob: '',
    photoUrl: ''
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

  // ─── Interview Committee & Electronic Evaluation Workflow State ─────────
  const openVacancies = React.useMemo(() => {
    return syncedJobVacancies.filter(j => j.status === 'مفتوحة' || j.status === 'Open' || !j.status);
  }, [syncedJobVacancies]);
  const hasOpenJobs = openVacancies.length > 0;

  const [interviewCommittees, setInterviewCommittees] = useState<InterviewCommittee[]>(() => {
    try {
      const saved = localStorage.getItem('vitas_interview_committees');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [archivedEvaluations, setArchivedEvaluations] = useState<InterviewEvaluationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vitas_archived_evaluations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vitas_interview_committees', JSON.stringify(interviewCommittees));
    } catch {}
  }, [interviewCommittees]);

  useEffect(() => {
    try {
      localStorage.setItem('vitas_archived_evaluations', JSON.stringify(archivedEvaluations));
    } catch {}
  }, [archivedEvaluations]);

  // Sync committees & evaluations with server on mount
  useEffect(() => {
    const fetchCommitteesData = async () => {
      try {
        const [commRes, evalRes] = await Promise.all([
          api.getCommittees().catch(() => []),
          api.getCommitteeEvaluations().catch(() => [])
        ]);
        if (Array.isArray(commRes) && commRes.length > 0) {
          setInterviewCommittees(prev => {
            const map = new Map<string, InterviewCommittee>();
            prev.forEach(c => map.set(c.id, c));
            commRes.forEach(c => map.set(c.id, c));
            return Array.from(map.values());
          });
        }
        if (Array.isArray(evalRes) && evalRes.length > 0) {
          setArchivedEvaluations(prev => {
            const map = new Map<string, InterviewEvaluationRecord>();
            prev.forEach(e => map.set(e.id, e));
            evalRes.forEach(e => map.set(e.id, e));
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn('Could not sync committees from server:', e);
      }
    };
    fetchCommitteesData();
  }, []);

  // Committee Formation Modal State
  const [showCommitteeModal, setShowCommitteeModal] = useState(false);
  const [committeeJobId, setCommitteeJobId] = useState<string>('');
  const [committeeInterviewDate, setCommitteeInterviewDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [committeeInterviewTime, setCommitteeInterviewTime] = useState<string>('10:00');
  const [committeeInterviewLocation, setCommitteeInterviewLocation] = useState<string>('مقر شركة فيتاس العراق - بغداد المنصور / قاعة اللجان الرئيسية');
  const [committeeMembersList, setCommitteeMembersList] = useState<CommitteeMember[]>([]);
  const [committeeCandidatesList, setCommitteeCandidatesList] = useState<Array<{ id: string; fullName: string; phone?: string; email?: string }>>([]);

  // Member search input & auto-matched employee
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [matchedEmployee, setMatchedEmployee] = useState<any | null>(null);
  const [selectedMemberRole, setSelectedMemberRole] = useState<'رئيس اللجنة' | 'عضو لجنة' | 'مقرر اللجنة'>('عضو لجنة');
  const [isSendingCommitteeInvites, setIsSendingCommitteeInvites] = useState(false);
  const [showInviteSentSuccessModal, setShowInviteSentSuccessModal] = useState(false);
  const [lastSentCommittee, setLastSentCommittee] = useState<InterviewCommittee | null>(null);
  const [copiedLinkMemberId, setCopiedLinkMemberId] = useState<string | null>(null);

  // Allow early access preview override for HR recruiter testing before scheduled interview date
  const [allowEarlyAccessOverride, setAllowEarlyAccessOverride] = useState<boolean>(false);

  // Electronic Interview Evaluation Form Modal (تطبيق الموظف)
  const [showEvaluationFormModal, setShowEvaluationFormModal] = useState(false);
  const [activeEvaluationCandidate, setActiveEvaluationCandidate] = useState<Candidate | null>(null);
  const [activeEvaluationMember, setActiveEvaluationMember] = useState<CommitteeMember | null>(null);
  const [activeEvaluationCommitteeId, setActiveEvaluationCommitteeId] = useState<string>('');
  const [criteriaScores, setCriteriaScores] = useState({
    appearance: 14,      // Max 15
    qualification: 18,   // Max 20
    experience: 22,      // Max 25
    technical: 18,       // Max 20
    communication: 18    // Max 20
  });
  const [evaluationRecommendation, setEvaluationRecommendation] = useState<'موصى بقبوله للتعيين' | 'اجتياز للمقابلة النهائية' | 'قائمة الاحتياط' | 'مرفوض'>('موصى بقبوله للتعيين');
  const [evaluationNotes, setEvaluationNotes] = useState<string>('المرشح يتمتع بكفاءة ممتازة ومؤهلات تتوافق تماماً مع متطلبات الوظيفة. لديه لباقة وسرعة بديهة واستجابة مهنية عالية.');
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);
  const [showEvaluationSuccessModal, setShowEvaluationSuccessModal] = useState(false);
  const [lastSavedEvaluation, setLastSavedEvaluation] = useState<InterviewEvaluationRecord | null>(null);

  // Archived Evaluations Modal
  const [showArchivedEvaluationsModal, setShowArchivedEvaluationsModal] = useState(false);
  const [selectedEvaluationDetail, setSelectedEvaluationDetail] = useState<InterviewEvaluationRecord | null>(null);

  // Helper to fetch all candidates in screening applying for a specific job
  const getCandidatesForJobInScreening = (jobId: string) => {
    const targetJob = syncedJobVacancies.find(j => String(j.id) === String(jobId));
    return candidates.filter(c => {
      const inScreening = normalizeStage(c.stage) === 'فرز المتقدمين';
      const matchesJob = String(c.appliedJobId) === String(jobId) || (targetJob && (c.jobTitle === targetJob.title || getTitleName(c.jobTitle) === getTitleName(targetJob.title)));
      return inScreening && matchesJob;
    });
  };

  // Auto-search employee by Employee ID or Badge No or Name
  useEffect(() => {
    const q = memberSearchQuery.trim().toLowerCase();
    if (!q) {
      setMatchedEmployee(null);
      return;
    }
    const founds = employees.filter(emp => {
      const empId = String(emp.employeeId || emp.employee_id || emp.id || '').toLowerCase();
      const badge = String(emp.badgeNo || emp.badge_no || '').toLowerCase();
      const nameAr = String(emp.fullNameAr || emp.full_name_ar || '').toLowerCase();
      const nameEn = String(emp.fullName || emp.full_name_en || '').toLowerCase();
      return empId === q || badge === q || empId.includes(q) || badge.includes(q) || nameAr.includes(q) || nameEn.includes(q);
    });
    if (founds.length > 0) {
      const exact = founds.find(e => {
        const eid = String(e.employeeId || e.employee_id || e.id || '').toLowerCase();
        const b = String(e.badgeNo || e.badge_no || '').toLowerCase();
        return eid === q || b === q;
      });
      setMatchedEmployee(exact || founds[0]);
    } else {
      setMatchedEmployee(null);
    }
  }, [memberSearchQuery, employees]);

  // Support opening direct evaluation link from URL on mobile/browser
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const isEvalView = params.get('view') === 'eval' || params.get('eval') === '1';
      const cid = params.get('cid');
      const memberEmpId = params.get('m');
      const candId = params.get('cand');

      if (isEvalView && (memberEmpId || cid)) {
        const comm = interviewCommittees.find(c => c.id === cid) || lastSentCommittee;
        const member = comm?.members?.find(m => m.employeeId === memberEmpId || m.id === memberEmpId) || 
                       committeeMembersList.find(m => m.employeeId === memberEmpId || m.id === memberEmpId);
        const cand = candidates.find(c => c.id === candId);

        if (member) {
          handleOpenEvaluationFormInApp(member, cand);
        }
      }
    } catch {}
  }, [interviewCommittees, committeeMembersList, candidates]);

  const handleOpenCommitteeModalForStage = (candidatesInStage: Candidate[]) => {
    if (!hasOpenJobs) {
      alert('لا يمكن إضافة لجنة المقابلات لعدم وجود وظائف مفتوحة حالياً في النظام.');
      return;
    }
    let targetJob = openVacancies[0];
    if (selectedJobId !== 'all') {
      const found = openVacancies.find(j => String(j.id) === String(selectedJobId));
      if (found) targetJob = found;
    } else if (candidatesInStage.length > 0) {
      const firstCand = candidatesInStage[0];
      const found = openVacancies.find(j => String(j.id) === String(firstCand.appliedJobId) || j.title === firstCand.jobTitle);
      if (found) targetJob = found;
    }

    const selJobId = targetJob ? String(targetJob.id) : (openVacancies[0] ? String(openVacancies[0].id) : '');
    setCommitteeJobId(selJobId);

    // Get all candidates applying for this job in screening stage
    const relatedCands = getCandidatesForJobInScreening(selJobId);
    const candsToUse = relatedCands.length > 0 ? relatedCands : candidatesInStage;
    const cands = candsToUse.map(c => ({
      id: c.id,
      fullName: getCandidateDisplayName(c, language),
      phone: c.phone,
      email: c.email
    }));
    setCommitteeCandidatesList(cands);

    const existing = interviewCommittees.find(comm => String(comm.jobId) === selJobId);
    if (existing && existing.members && existing.members.length > 0) {
      setCommitteeMembersList(existing.members);
      setCommitteeInterviewDate(existing.interviewDate || committeeInterviewDate);
      setCommitteeInterviewTime(existing.interviewTime || '10:00');
      setCommitteeInterviewLocation(existing.interviewLocation || committeeInterviewLocation);
    } else {
      setCommitteeMembersList([]);
    }

    setMemberSearchQuery('');
    setMatchedEmployee(null);
    setShowCommitteeModal(true);
  };

  const handleOpenCommitteeModalForCandidate = (cand: Candidate) => {
    if (!hasOpenJobs) {
      alert('لا يمكن إضافة لجنة المقابلات لعدم وجود وظائف مفتوحة حالياً في النظام.');
      return;
    }
    const targetJob = openVacancies.find(j => String(j.id) === String(cand.appliedJobId) || j.title === cand.jobTitle) || openVacancies[0];
    const selJobId = targetJob ? String(targetJob.id) : '';
    setCommitteeJobId(selJobId);

    // Get all candidates applying for this same job in screening stage
    const relatedCands = getCandidatesForJobInScreening(selJobId);
    const candsToUse = relatedCands.length > 0 ? relatedCands : [cand];
    setCommitteeCandidatesList(candsToUse.map(c => ({
      id: c.id,
      fullName: getCandidateDisplayName(c, language),
      phone: c.phone,
      email: c.email
    })));

    const existing = interviewCommittees.find(comm => String(comm.jobId) === selJobId);
    if (existing && existing.members && existing.members.length > 0) {
      setCommitteeMembersList(existing.members);
      setCommitteeInterviewDate(existing.interviewDate || committeeInterviewDate);
      setCommitteeInterviewTime(existing.interviewTime || '10:00');
      setCommitteeInterviewLocation(existing.interviewLocation || committeeInterviewLocation);
    } else {
      setCommitteeMembersList([]);
    }

    setMemberSearchQuery('');
    setMatchedEmployee(null);
    setShowCommitteeModal(true);
  };

  const handleAddMemberToCommittee = () => {
    if (!matchedEmployee) {
      alert('يرجى كتابة آيدي الموظف أو رقم الباج لاختيار الموظف أولاً.');
      return;
    }

    const empId = matchedEmployee.employeeId || matchedEmployee.employee_id || matchedEmployee.id;
    const badgeNo = matchedEmployee.badgeNo || matchedEmployee.badge_no || '---';
    const fullName = matchedEmployee.fullNameAr || matchedEmployee.fullName || matchedEmployee.full_name_ar || 'موظف فيتاس';
    const jobTitle = matchedEmployee.jobTitle || matchedEmployee.position_ar || matchedEmployee.position || 'موظف';
    const officeName = matchedEmployee.branch || matchedEmployee.location || 'المقر الرئيسي';

    if (committeeMembersList.some(m => String(m.employeeId) === String(empId))) {
      alert('هذا الموظف مضاف بالفعل في تشكيل اللجنة الحالي.');
      return;
    }

    const newMember: CommitteeMember = {
      id: `MEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: String(empId),
      badgeNo: String(badgeNo),
      fullName: String(fullName),
      jobTitle: String(jobTitle),
      officeName: String(officeName),
      email: matchedEmployee.email || matchedEmployee.work_email || '',
      phone: matchedEmployee.phone || matchedEmployee.mobile || '',
      role: selectedMemberRole,
      status: 'invitation_sent',
      evaluationFormUrl: ''
    };

    setCommitteeMembersList(prev => [...prev, newMember]);
    setMemberSearchQuery('');
    setMatchedEmployee(null);
  };

  const handleRemoveMemberFromCommittee = (index: number) => {
    setCommitteeMembersList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendCommitteeInvites = async () => {
    if (!committeeJobId) {
      alert('يرجى اختيار الوظيفة المعنية في مرحلة الفرز.');
      return;
    }
    if (committeeMembersList.length === 0) {
      alert('يرجى إضافة عضو واحد على الأقل في لجنة المقابلات.');
      return;
    }

    setIsSendingCommitteeInvites(true);
    const targetJob = syncedJobVacancies.find(j => String(j.id) === String(committeeJobId));
    const targetJobTitle = targetJob ? getTitleName(targetJob.title) || targetJob.title : 'وظيفة شاغرة';
    const newCommitteeId = `COMM-${Date.now()}`;

    // Generate direct evaluation link for each member (تطبيق الموظف)
    const updatedMembers: CommitteeMember[] = committeeMembersList.map(m => {
      const firstCandId = committeeCandidatesList[0]?.id || '';
      const formUrl = `${window.location.origin}/?module=recruitment&view=eval&cid=${newCommitteeId}&m=${encodeURIComponent(m.employeeId)}&cand=${firstCandId}`;
      return {
        ...m,
        status: 'invitation_sent',
        evaluationFormUrl: formUrl
      };
    });

    const committeeData: InterviewCommittee = {
      id: newCommitteeId,
      jobId: String(committeeJobId),
      jobTitle: targetJobTitle,
      department: targetJob?.department || 'إدارة العمليات والائتمان',
      branch: targetJob?.location || 'بغداد المنصور',
      interviewDate: committeeInterviewDate,
      interviewTime: committeeInterviewTime,
      interviewLocation: committeeInterviewLocation,
      createdBy: 'مسؤول التوظيف',
      members: updatedMembers,
      candidates: committeeCandidatesList,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    try {
      await api.notifyCommittee(committeeData).catch(() => {});

      setInterviewCommittees(prev => {
        const filtered = prev.filter(c => String(c.jobId) !== String(committeeJobId));
        return [committeeData, ...filtered];
      });

      setCommitteeMembersList(updatedMembers);
      setLastSentCommittee(committeeData);

      addNotification({
        title: 'تم إرسال دعوات لجنة المقابلات',
        message: `تم إرسال دعوات رسميّة عبر Outlook وتطبيق الموظفين لأعضاء اللجنة (${updatedMembers.map(m => m.fullName).join('، ')}) لمقابلة وظيفة (${targetJobTitle}).`,
        type: 'success'
      });

      setShowInviteSentSuccessModal(true);
    } catch (err: any) {
      console.error('Error sending committee invites:', err);
      alert('حدث خطأ أثناء إرسال الدعوات: ' + err.message);
    } finally {
      setIsSendingCommitteeInvites(false);
    }
  };

  const handleConfirmMemberParticipation = (memberId: string) => {
    const updated = committeeMembersList.map(m => {
      if (m.id === memberId || m.employeeId === memberId) {
        return {
          ...m,
          status: 'confirmed' as const,
          confirmedAt: new Date().toISOString()
        };
      }
      return m;
    });

    setCommitteeMembersList(updated);

    setInterviewCommittees(prev => prev.map(c => {
      const hasMember = c.members.some(m => m.id === memberId || m.employeeId === memberId);
      if (hasMember) {
        return {
          ...c,
          members: c.members.map(m => (m.id === memberId || m.employeeId === memberId) ? { ...m, status: 'confirmed' as const, confirmedAt: new Date().toISOString() } : m)
        };
      }
      return c;
    }));

    const member = committeeMembersList.find(m => m.id === memberId || m.employeeId === memberId);
    addNotification({
      title: 'تأكيد مشاركة في اللجنة',
      message: `أكّد عضو اللجنة (${member?.fullName || 'الموظف'}) مشاركته في المقابلة. تم إرسال رابط فورم التقييم الإلكتروني لتطبيق الموظف.`,
      type: 'info'
    });
  };

  const handleCopyFormLink = (url: string, memberId: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url);
    }
    setCopiedLinkMemberId(memberId);
    setTimeout(() => setCopiedLinkMemberId(null), 3000);
  };

  const handleSwitchCandidateInEvaluation = (cand: Candidate, member?: CommitteeMember) => {
    const evaluator = member || activeEvaluationMember;
    setActiveEvaluationCandidate(cand);
    if (!evaluator) return;

    // Check if evaluator already evaluated this candidate
    const existing = archivedEvaluations.find(e => 
      e.candidateId === cand.id && 
      (e.evaluatorId === evaluator.employeeId || e.evaluatorBadge === evaluator.badgeNo)
    );

    if (existing) {
      setCriteriaScores(existing.criteriaScores || {
        appearance: 14, qualification: 18, experience: 22, technical: 18, communication: 18
      });
      setEvaluationRecommendation((existing.recommendation as any) || 'موصى بقبوله للتعيين');
      setEvaluationNotes(existing.notes || '');
    } else {
      setCriteriaScores({
        appearance: 14, qualification: 18, experience: 22, technical: 18, communication: 18
      });
      setEvaluationRecommendation('موصى بقبوله للتعيين');
      const jobName = getTitleName(cand.jobTitle) || cand.jobTitle;
      setEvaluationNotes(`المرشح (${getCandidateDisplayName(cand, language)}) يتمتع بكفاءة ممتازة ومؤهلات تتوافق تماماً مع متطلبات الوظيفة (${jobName}).`);
    }
  };

  const handleOpenEvaluationFormInApp = (member: CommitteeMember, cand?: Candidate) => {
    const targetComm = interviewCommittees.find(c => 
      c.id === activeEvaluationCommitteeId || 
      c.members?.some(m => m.id === member.id || m.employeeId === member.employeeId)
    ) || lastSentCommittee;

    const candsForComm = candidates.filter(c => 
      committeeCandidatesList.some(cl => String(cl.id) === String(c.id)) ||
      (targetComm?.jobId && String(c.appliedJobId) === String(targetComm.jobId) && normalizeStage(c.stage) === 'فرز المتقدمين')
    );

    const candidateToEval = cand || candsForComm[0] || screeningCandidate || (candidates.find(c => committeeCandidatesList.some(cl => cl.id === c.id)) || candidates[0]);

    setActiveEvaluationMember(member);
    setActiveEvaluationCandidate(candidateToEval || null);
    setActiveEvaluationCommitteeId(targetComm?.id || lastSentCommittee?.id || 'COMM-001');

    if (candidateToEval) {
      handleSwitchCandidateInEvaluation(candidateToEval, member);
    }
    setShowEvaluationFormModal(true);
  };

  const handleSubmitEvaluationToRecruiter = async () => {
    if (!activeEvaluationMember || !activeEvaluationCandidate) return;

    setIsSubmittingEvaluation(true);
    const totalScore = criteriaScores.appearance + criteriaScores.qualification + criteriaScores.experience + criteriaScores.technical + criteriaScores.communication;

    const evalRecord: InterviewEvaluationRecord = {
      id: `EVAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      committeeId: activeEvaluationCommitteeId || 'COMM-001',
      candidateId: activeEvaluationCandidate.id,
      candidateName: getCandidateDisplayName(activeEvaluationCandidate, language),
      jobTitle: getTitleName(activeEvaluationCandidate.jobTitle) || activeEvaluationCandidate.jobTitle,
      evaluatorId: activeEvaluationMember.employeeId,
      evaluatorBadge: activeEvaluationMember.badgeNo,
      evaluatorName: activeEvaluationMember.fullName,
      evaluatorJobTitle: activeEvaluationMember.jobTitle,
      evaluatorOffice: activeEvaluationMember.officeName,
      criteriaScores: { ...criteriaScores },
      totalScore,
      recommendation: evaluationRecommendation,
      notes: evaluationNotes,
      submittedTo: 'مسؤول التوظيف',
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };

    try {
      await api.submitCommitteeEvaluation({
        ...evalRecord,
        candidateName: evalRecord.candidateName
      }).catch(() => {});

      const existingScores = Array.isArray(activeEvaluationCandidate.committeeScores) ? [...activeEvaluationCandidate.committeeScores] : [];
      const filteredScores = existingScores.filter(s => s.fullName !== activeEvaluationMember.fullName);
      filteredScores.push({
        officeName: activeEvaluationMember.officeName,
        fullName: activeEvaluationMember.fullName,
        jobTitle: activeEvaluationMember.jobTitle,
        score: totalScore
      });

      const totalSum = filteredScores.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
      const avg = filteredScores.length > 0 ? Math.round(totalSum / filteredScores.length) : totalScore;

      updateCandidate(activeEvaluationCandidate.id, {
        committeeScores: filteredScores,
        finalScore: avg,
        rating: avg >= 80 ? 5 : avg >= 60 ? 4 : 3,
        committeeOpinion: `${evaluationRecommendation} - ملاحظات: ${evaluationNotes.slice(0, 100)}`
      });

      // Update archivedEvaluations: replace if exists, or prepend
      setArchivedEvaluations(prev => {
        const withoutThis = prev.filter(e => !(e.candidateId === activeEvaluationCandidate.id && (e.evaluatorId === activeEvaluationMember.employeeId || e.evaluatorBadge === activeEvaluationMember.badgeNo)));
        return [evalRecord, ...withoutThis];
      });
      setLastSavedEvaluation(evalRecord);

      // Check if all committee candidates have been evaluated by this member
      const sessionCands = candidates.filter(c => 
        committeeCandidatesList.some(cl => String(cl.id) === String(c.id)) ||
        (activeEvaluationCommitteeId && String(c.appliedJobId) === String(committeeJobId) && normalizeStage(c.stage) === 'فرز المتقدمين')
      );
      const allEvaluatedByMember = sessionCands.length > 0 && sessionCands.every(c => 
        c.id === activeEvaluationCandidate.id || 
        archivedEvaluations.some(e => e.candidateId === c.id && (e.evaluatorId === activeEvaluationMember.employeeId || e.evaluatorBadge === activeEvaluationMember.badgeNo))
      );

      if (allEvaluatedByMember) {
        setCommitteeMembersList(prev => prev.map(m => {
          if (m.id === activeEvaluationMember.id || m.employeeId === activeEvaluationMember.employeeId) {
            return {
              ...m,
              status: 'evaluation_submitted',
              submittedAt: new Date().toISOString(),
              totalScore
            };
          }
          return m;
        }));
      }

      addNotification({
        title: 'تم استلام استمارة تقييم مقابلة من عضو اللجنة',
        message: `قام عضو اللجنة (${activeEvaluationMember.fullName} - ${activeEvaluationMember.jobTitle}) بإعادة إرسال استمارة تقييم المقابلة للمرشح (${evalRecord.candidateName}) بدرجة (${totalScore}/100) وتوصية: ${evaluationRecommendation}. تم توثيق وحفظ الفورم بالأرشيف الدائم.`,
        type: 'success'
      });

      setShowEvaluationFormModal(false);
      setShowEvaluationSuccessModal(true);
    } catch (err: any) {
      console.error('Error submitting evaluation:', err);
      alert('حدث خطأ أثناء إرسال استمارة المقابلة: ' + err.message);
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  const handleRejectCandidate = (candidate: Candidate) => {
    const jobTitle = getTitleName(candidate.jobTitle) || candidate.jobTitle;
    const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '964' + cleanPhone.substring(1) : (cleanPhone.startsWith('964') ? cleanPhone : '964' + cleanPhone);

    const rejectionMsg = `السيد/ة ${candidate.fullName}\n.\nنعتذر عن عدم اختيارك لوظيفة (${jobTitle}) بسبب عدم توفر متطلبات العمل لديك حالياً.\nنتمنى لك التوفيق والنجاح في مسيرتك المهنية.\nمؤسسة فيتاس العراق - قسم الموارد البشرية`;

    if (candidate.phone) {
      const encodedMsg = encodeURIComponent(rejectionMsg);
      const waAppUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMsg}`;
      const waWebUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`;
      try {
        const link = document.createElement('a');
        link.href = waAppUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error('Error launching WhatsApp for rejection:', e);
      }

      setTimeout(() => {
        window.open(waWebUrl, '_blank');
      }, 200);
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
      dob: candidate.dateOfBirth || '',
      photoUrl: candidate.photoUrl || ''
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
        photoUrl: directoryForm.photoUrl || activeCandidateForDirectory.photoUrl || '',
        photo_url: directoryForm.photoUrl || activeCandidateForDirectory.photoUrl || '',
        photo: directoryForm.photoUrl || activeCandidateForDirectory.photoUrl || '',
        status: 'Active'
      });

      updateCandidate(activeCandidateForDirectory.id, {
        stage: 'إدخال البيانات في دليل الموظفين',
        addedToDirectory: true,
        employeeId: finalEmpCode
      });

      // Automatically archive Electronic CV & Committee Evaluation Report to Employee Documents
      try {
        const committeeScores = Array.isArray(activeCandidateForDirectory.committeeScores) ? activeCandidateForDirectory.committeeScores : [];
        const totalScore = committeeScores.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
        const rawAvg = committeeScores.length > 0 ? (totalScore / committeeScores.length) : (activeCandidateForDirectory.finalScore || 0);
        const avgScore = Number.isInteger(rawAvg) ? rawAvg : Number(rawAvg.toFixed(1));

        const evaluatorsHtml = committeeScores.length > 0 ? `
          <div style="margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #ffffff;">
            <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 13px; font-weight: bold;">تقييمات أعضاء لجنة التعيين (${committeeScores.length} أعضاء):</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: right;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 6px 8px;">#</th>
                  <th style="padding: 6px 8px;">اسم المقيم</th>
                  <th style="padding: 6px 8px;">المنصب / العنوان الوظيفي</th>
                  <th style="padding: 6px 8px;">المكتب / القسم</th>
                  <th style="padding: 6px 8px; text-align: center;">درجة التقييم</th>
                </tr>
              </thead>
              <tbody>
                ${committeeScores.map((ev, i) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 6px 8px;">${i + 1}</td>
                    <td style="padding: 6px 8px; font-weight: bold;">${ev.fullName || 'مقيم'}</td>
                    <td style="padding: 6px 8px;">${ev.jobTitle || '-'}</td>
                    <td style="padding: 6px 8px;">${ev.officeName || '-'}</td>
                    <td style="padding: 6px 8px; text-align: center; font-weight: bold; color: #0d9488;">${ev.score} / 100</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background: #f1f5f9; font-weight: bold;">
                  <td colspan="4" style="padding: 8px; text-align: right;">معدل التقييم الإجمالي للجنة:</td>
                  <td style="padding: 8px; text-align: center; color: #0d9488; font-size: 14px;">${avgScore} / 100</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ` : '<p style="font-size: 12px; color: #64748b;">لا توجد تقييمات لجنة مسجلة.</p>';

        const electronicCvHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>السيرة الذاتية الإلكترونية وتقرير تقييم التعيين - ${directoryForm.fullNameAr}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; direction: rtl; color: #0f172a; line-height: 1.6; padding: 20px; background: #ffffff; }
    .header { border-bottom: 3px solid #0d9488; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: bold; color: #0f172a; margin: 0; }
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
    <h1 class="title">السيرة الذاتية الإلكترونية وتقرير تقييم التعيين</h1>
    <div class="subtitle">الموظف: ${directoryForm.fullNameAr} (${finalEmpCode}) | الوظيفة: ${directoryForm.jobTitle}</div>
    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">مؤسسة فيتاس العراق - قسم الموارد البشرية والتوظيف | تاريخ التوثيق: ${new Date().toLocaleDateString('ar-IQ')}</div>
  </div>
  <div class="info-grid">
    <div><span class="info-label">الاسم الكامل: </span><span class="info-value">${directoryForm.fullNameAr}</span></div>
    <div><span class="info-label">المسمى الوظيفي: </span><span class="info-value">${directoryForm.jobTitle}</span></div>
    <div><span class="info-label">القسم والفرع: </span><span class="info-value">${directoryForm.department} • ${directoryForm.branch}</span></div>
    <div><span class="info-label">رمز الموظف (ID): </span><span class="info-value font-mono">${finalEmpCode}</span></div>
    <div><span class="info-label">البريد الإلكتروني: </span><span class="info-value">${directoryForm.email || 'غير محدد'}</span></div>
    <div><span class="info-label">رقم الهاتف: </span><span class="info-value">${directoryForm.phone || 'غير محدد'}</span></div>
    <div><span class="info-label">سنوات الخبرة: </span><span class="info-value">${activeCandidateForDirectory.experienceYears || 0} سنوات</span></div>
    <div><span class="info-label">تاريخ المباشرة: </span><span class="info-value">${directoryForm.joinDate}</span></div>
    <div><span class="info-label">الراتب الأساسي: </span><span class="info-value">${Number(directoryForm.basicSalary).toLocaleString()} د.ع</span></div>
    <div><span class="info-label">تاريخ الميلاد: </span><span class="info-value">${directoryForm.dob || 'غير محدد'}</span></div>
  </div>
  
  <div class="section">
    <div class="section-title">تقرير وتقييمات أعضاء لجنة التعيين</div>
    ${evaluatorsHtml}
  </div>

  ${activeCandidateForDirectory.notes ? `
    <div class="section">
      <div class="section-title">ملاحظات التقديم والمقابلة</div>
      <p style="font-size: 12px; margin: 0;">${activeCandidateForDirectory.notes}</p>
    </div>
  ` : ''}

  <div class="footer">مؤسسة فيتاس العراق لتمويل المشاريع الصغرى والعمليات - أرشيف ملفات الموظفين الرسمية (Employee Documents)</div>
</body>
</html>`;

        if (typeof addDocumentRecord === 'function') {
          addDocumentRecord({
            docNumber: `DOC-CV-${finalEmpCode}`,
            title: `السيرة الذاتية الإلكترونية وتقرير تقييم اللجنة - ${directoryForm.fullNameAr}`,
            type: 'شهادة',
            department: directoryForm.department || 'الموارد البشرية',
            uploadedBy: 'نظام الاستقطاب والتعيين (ATS Pipeline)',
            fileSize: '320 KB',
            category: 'وثائق التعيين والسير الذاتية',
            employeeId: finalEmpCode,
            employeeName: directoryForm.fullNameAr,
            contentHtml: electronicCvHtml
          });
        }
      } catch (docErr) {
        console.warn('Error archiving candidate electronic CV document:', docErr);
      }

      // Add notification for employee directory entry
      addNotification({
        title: 'تم إضافة الموظف وأرشفة مستنداته بنجاح',
        message: `تمت إضافة ${directoryForm.fullNameAr} إلى دليل الموظفين وحفظ السيرة الذاتية وتقرير اللجنة في مستندات الموظف (Documents).`,
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
    const candidate = candidates.find(c => c.id === candidateId);
    const candidateName = candidate ? getCandidateDisplayName(candidate, language) : '';
    const confirmPrompt = language === 'en'
      ? `Are you sure you want to delete candidate (${candidateName})? An exclusion message will be sent to the applicant via WhatsApp.`
      : `هل أنت متأكد من حذف هذا المرشح (${candidateName})؟ سيتم إرسال رسالة استبعاد واعتذار للمتقدم عبر الواتساب.`;

    if (confirm(confirmPrompt)) {
      if (candidate) {
        const jobTitle = getTitleName(candidate.jobTitle) || candidate.jobTitle || 'الوظيفة';
        const cleanPhone = (candidate.phone || '').replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.startsWith('0') ? '964' + cleanPhone.substring(1) : (cleanPhone.startsWith('964') ? cleanPhone : '964' + cleanPhone);

        const rejectionMsg = `السيد/ة ${candidate.fullName || candidate.fullNameAr}\n.\nنعتذر عن عدم اختيارك لوظيفة (${jobTitle}) بسبب عدم توفر متطلبات العمل لديك حالياً.\nنتمنى لك التوفيق والنجاح في مسيرتك المهنية.\nمؤسسة فيتاس العراق - قسم الموارد البشرية`;

        if (candidate.phone) {
          const encodedMsg = encodeURIComponent(rejectionMsg);
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

          setTimeout(() => {
            window.open(waWebUrl, '_blank');
          }, 200);
        }

        fetch('/api/notify/rejection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: candidate.fullName || candidate.fullNameAr,
            email: candidate.email,
            phone: candidate.phone,
            jobTitle
          })
        }).catch(err => console.log('Silent rejection dispatch processed:', err));

        addNotification({
          title: 'تم حذف المرشح وإرسال إشعار الاستبعاد',
          message: `تم حذف المرشح ${candidate.fullName || candidate.fullNameAr} وإرسال رسالة اعتذار واستبعاد عبر الواتساب`,
          type: 'alert'
        });
      }

      deleteCandidate(candidateId);
    }
  };

  const handleAddCandidateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const selectedPos = allActivePositions.find(p => p.id === newCandidate.jobOpeningId);
    const jobTitleValue = selectedPos ? (language === 'en' ? selectedPos.titleEn : selectedPos.titleAr) : newCandidate.jobOpeningId;
    
    const resolvedArabicName = newCandidate.fullNameAr?.trim() || transliterateEnglishNameToArabic(newCandidate.fullName || '') || newCandidate.fullName || 'مرشح جديد';
    const resolvedEnglishName = newCandidate.fullName?.trim() || newCandidate.fullNameAr || 'New Candidate';
    
    let safeDobString = newCandidate.dateOfBirth?.trim() || '';
    if (safeDobString.includes('/')) {
      const parts = safeDobString.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          safeDobString = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
          safeDobString = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
      }
    }

    await addCandidate({
      fullName: resolvedArabicName,
      fullNameAr: resolvedArabicName,
      fullNameEn: resolvedEnglishName,
      email: newCandidate.email,
      personalEmail: newCandidate.personalEmail || newCandidate.email,
      phone: newCandidate.phone,
      appliedJobId: newCandidate.jobOpeningId,
      jobTitle: jobTitleValue,
      experienceYears: newCandidate.experience,
      rating: newCandidate.rating || 5,
      stage: newCandidate.stage || 'استلام الطلبات',
      notes: newCandidate.notes,
      photoUrl: newCandidate.photoUrl || undefined,
      resumeUrl: newCandidate.resumeUrl || newCandidate.resumeName || undefined,
      resumeFile: newCandidate.resumeFile || undefined,
      photoFile: newCandidate.photoFile || undefined,
      dateOfBirth: safeDobString || newCandidate.dateOfBirth,
      gender: newCandidate.gender,
      maritalStatus: newCandidate.maritalStatus,
      nationalIdNumber: newCandidate.nationalIdNumber
    });

    setShowAddCandidateModal(false);
    setNewCandidate({
      fullName: '',
      fullNameAr: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      email: '',
      personalEmail: '',
      phone: '',
      nationalIdNumber: '',
      jobOpeningId: '',
      experience: 2,
      rating: 5,
      stage: 'استلام الطلبات',
      notes: '',
      photoFile: null,
      resumeFile: null,
      photoUrl: '',
      resumeName: '',
      resumeUrl: ''
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

              {/* Committee Formation & Archive buttons strictly when applicants are present in Screening stage */}
              {normalizeStage(stage) === 'فرز المتقدمين' && (groupedCandidates[stage]?.length || 0) > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={!hasOpenJobs}
                    onClick={() => handleOpenCommitteeModalForStage(groupedCandidates[stage])}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                      hasOpenJobs
                        ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white shadow-purple-500/25 hover:scale-[1.02]'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-75'
                    }`}
                    title={
                      hasOpenJobs
                        ? 'تشكيل لجنة المقابلات وإرسال الدعوات عبر أوتلوك وتطبيق الموظفين'
                        : 'زر إضافة لجنة غير ممكن لعدم وجود وظائف مفتوحة حالياً'
                    }
                  >
                    <span className="material-symbols-outlined text-base">group_add</span>
                    <span>إضافة لجنة المقابلات</span>
                    {!hasOpenJobs && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        معطل: لا توجد وظائف مفتوحة
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowArchivedEvaluationsModal(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    }`}
                    title="سجل استمارات تقييم المقابلات المؤرشفة للرجوع إليها في أي وقت"
                  >
                    <span className="material-symbols-outlined text-sm text-teal-500">folder_open</span>
                    <span>أرشيف التقييمات ({archivedEvaluations.length})</span>
                  </button>
                </div>
              )}
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
                        {normalizedCurrentStage === 'فرز المتقدمين' && (
                          <button
                            type="button"
                            disabled={!hasOpenJobs}
                            onClick={() => handleOpenCommitteeModalForCandidate(candidate)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm border ${
                              hasOpenJobs
                                ? 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border-purple-500/40'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60'
                            }`}
                            title={hasOpenJobs ? "تشكيل أو إدارة لجنة المقابلة لهذا المتقدم" : "معطل: لا توجد وظائف مفتوحة"}
                          >
                            <span className="material-symbols-outlined text-[12px] text-purple-600 dark:text-purple-400">group_add</span>
                            <span>لجنة المقابلات</span>
                          </button>
                        )}
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

            {/* Candidate Photo & Sync Preview */}
            <div className="flex items-center gap-3.5 p-3 mb-4 rounded-xl bg-teal-500/10 border border-teal-500/30">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-teal-500 shadow-md shrink-0 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                {activeCandidateForDirectory.photoUrl ? (
                  <img
                    src={activeCandidateForDirectory.photoUrl.startsWith('/uploads/') && typeof window !== 'undefined' ? `${window.location.origin}${activeCandidateForDirectory.photoUrl}` : activeCandidateForDirectory.photoUrl}
                    alt={activeCandidateForDirectory.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-teal-600 dark:text-teal-400">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold truncate" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {activeCandidateForDirectory.fullName}
                </h4>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-bold truncate">
                  {activeCandidateForDirectory.jobTitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-emerald-500">check_circle</span>
                  {activeCandidateForDirectory.photoUrl ? 'سيتم حفظ الصورة الشخصية ونقلها تلقائياً إلى سجل وملف الموظف' : 'لم يتم إرفاق صورة شخصية مسبقاً في طلب التقديم'}
                </p>
              </div>
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

      {/* Add Candidate Modal - Fully Matching Candidate Portal */}
      {showAddCandidateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Top Modal Header: Action Buttons (Submit & Cancel), No X */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 sticky top-0 z-20 ${
              isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-xl sm:text-2xl">person_add</span>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إضافة مرشح جديد (تقديم مباشر على وظيفة)', 'Add New Candidate (Direct Application)')}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCandidateModal(false)}
                  className={`px-4 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isDark 
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' 
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-sm'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>

                <button
                  type="submit"
                  form="add-candidate-pipeline-form"
                  className="px-5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  <span>{t('إضافة المرشح', 'Add Candidate')}</span>
                </button>
              </div>
            </div>

            <form id="add-candidate-pipeline-form" onSubmit={handleAddCandidateSubmit} className="p-4 sm:p-6 space-y-4 text-xs font-normal">
              {/* Personal Photo & Resume Upload (Matching Candidate Portal) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
                <div>
                  <label className="block font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الصورة الشخصية', 'Personal Photo')}:
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                      {newCandidate.photoUrl ? (
                        <img src={newCandidate.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-2xl text-slate-400">person</span>
                      )}
                    </div>
                    <label className="cursor-pointer py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">upload</span>
                      <span>{t('رفع الصورة', 'Upload Photo')}</span>
                      <input type="file" accept="image/*" onChange={handleCandidatePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('السيرة الذاتية (CV)', 'Resume / CV')}:
                  </label>
                  <label className="cursor-pointer w-full p-2.5 rounded-xl border border-dashed border-teal-500 hover:border-teal-400 bg-teal-500/10 flex items-center justify-center gap-2 transition-all">
                    <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">description</span>
                    <span className="font-bold text-teal-700 dark:text-white">
                      {newCandidate.resumeName || t('اختيار ملف السيرة الذاتية (PDF/DOC)', 'Select CV File (PDF/DOC)')}
                    </span>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleCandidateResumeUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Names Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الاسم باللغة العربية', 'Full Name in Arabic (الاسم بالعربي)')}: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('أدخل الاسم الكامل باللغة العربية...', 'Enter full name in Arabic...')}
                    value={newCandidate.fullNameAr}
                    onChange={e => setNewCandidate({ ...newCandidate, fullNameAr: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الاسم باللغة الإنجليزية', 'English Full Name')}:
                  </label>
                  <input
                    type="text"
                    placeholder={t('أدخل الاسم باللغة الإنجليزية...', 'Enter English name...')}
                    value={newCandidate.fullName}
                    onChange={e => setNewCandidate({ ...newCandidate, fullName: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('تاريخ الميلاد', 'Date of Birth')}:
                  </label>
                  <input
                    type="text"
                    placeholder="--/--/----"
                    value={newCandidate.dateOfBirth}
                    onChange={e => setNewCandidate({ ...newCandidate, dateOfBirth: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الجنس', 'Gender')}:
                  </label>
                  <select
                    value={newCandidate.gender}
                    onChange={e => setNewCandidate({ ...newCandidate, gender: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  >
                    <option value="">{t('اختر الجنس', 'Select Gender')}</option>
                    <option value="ذكر">{t('ذكر', 'Male')}</option>
                    <option value="أنثى">{t('أنثى', 'Female')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الحالة الاجتماعية', 'Marital Status')}:
                  </label>
                  <select
                    value={newCandidate.maritalStatus}
                    onChange={e => setNewCandidate({ ...newCandidate, maritalStatus: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  >
                    <option value="">{t('اختر الحالة الاجتماعية', 'Select Status')}</option>
                    <option value="أعزب/عزباء">{t('أعزب/عزباء', 'Single')}</option>
                    <option value="متزوج/متزوجة">{t('متزوج/متزوجة', 'Married')}</option>
                    <option value="مطلق/مطلقة">{t('مطلق/مطلقة', 'Divorced')}</option>
                    <option value="أرمل/أرملة">{t('أرمل/أرملة', 'Widowed')}</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('رقم الهاتف / الواتساب', 'Phone / WhatsApp')}: *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="07XXXXXXXXX"
                    value={newCandidate.phone}
                    onChange={e => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('البريد الإلكتروني', 'Email')}: *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="applicant@example.com"
                    value={newCandidate.email}
                    onChange={e => setNewCandidate({ ...newCandidate, email: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('رقم الهوية الوطنية / الموحدة', 'National ID Number')}:
                  </label>
                  <input
                    type="text"
                    placeholder="19XXXXXXXXXX"
                    value={newCandidate.nationalIdNumber}
                    onChange={e => setNewCandidate({ ...newCandidate, nationalIdNumber: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>
              </div>

              {/* Job, Stage & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الوظيفة / المسمى الوظيفي', 'Applied Position')}: *
                  </label>
                  <select
                    required
                    value={newCandidate.jobOpeningId}
                    onChange={e => setNewCandidate({ ...newCandidate, jobOpeningId: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
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
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('المرحلة الأولية', 'Initial Stage')}:
                  </label>
                  <select
                    value={newCandidate.stage}
                    onChange={e => setNewCandidate({ ...newCandidate, stage: e.target.value as Candidate['stage'] })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  >
                    {kanbanStages.map(stage => (
                      <option key={stage} value={stage}>{getStageTitle(stage)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('سنوات الخبرة العملية', 'Experience Years')}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newCandidate.experience}
                    onChange={e => setNewCandidate({ ...newCandidate, experience: parseInt(e.target.value) || 0 })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('ملاحظات أو نبذة مختصرة', 'Cover Letter / Additional Notes')}:
                </label>
                <textarea
                  rows={3}
                  placeholder={t('اكتب نبذة مختصرة عن مؤهلات المرشح أو ملاحظات التقديم...', 'Write candidate notes or summary...')}
                  value={newCandidate.notes}
                  onChange={e => setNewCandidate({ ...newCandidate, notes: e.target.value })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none transition-all resize-none ${
                    isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
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
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-300">
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

            {/* Modal Top Actions (حفظ وإلغاء أعلى النافذة) */}
            <div className="flex gap-3 mb-4 pb-3 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveCandidateForCommitteeScores(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-950 font-normal text-xs transition-colors"
                style={{ color: '#000000' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCommitteeScores}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-normal text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined text-base">save</span>
                حفظ وتأكيد تقييمات اللجنة
              </button>
            </div>

            {/* Live Average Banner */}
            {(() => {
              const total = committeeScoresList.reduce((sum, item) => sum + (Number(item.score) || 0), 0);
              const rawAvg = committeeScoresList.length > 0 ? (total / committeeScoresList.length) : 0;
              const formattedAvg = Number.isInteger(rawAvg) ? rawAvg : Number(rawAvg.toFixed(1));
              return (
                <div className="p-4 rounded-xl mb-5 bg-amber-400/20 border border-amber-500/40 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-normal" style={{ color: '#000000' }}>معدل التقييم الإجمالي للجنة:</div>
                    <div className="text-2xl font-normal flex items-baseline gap-1 mt-0.5" style={{ color: '#000000' }}>
                      <span style={{ color: '#000000' }}>
                        {formattedAvg}
                      </span>
                      <span className="text-xs font-normal" style={{ color: '#000000' }}>/ 100</span>
                    </div>
                  </div>

                  <div className="px-3.5 py-1.5 rounded-lg bg-amber-500/30 text-black border border-amber-500/50 text-xs font-normal" style={{ color: '#000000' }}>
                    عدد المقيمين: {committeeScoresList.length} أعضاء
                  </div>
                </div>
              );
            })()}

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

      {/* ─── 1. Interview Committee Formation Modal ────────────────────── */}
      {showCommitteeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all my-auto ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-2xl">group_add</span>
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>تشكيل وإدارة لجنة المقابلات</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                      مرحلة الفرز
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    إضافة أعضاء اللجنة بالآيدي أو الباج وإرسال الدعوات الرسمية عبر Outlook وتطبيق الموظفين
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommitteeModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Job Vacancy & Screening Candidates Context */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-purple-500">work</span>
                      الوظيفة الشاغرة المستهدفة (المفتوحة حالياً):
                    </label>
                    <select
                      value={committeeJobId}
                      onChange={e => {
                        const newJobId = e.target.value;
                        setCommitteeJobId(newJobId);
                        const relCands = getCandidatesForJobInScreening(newJobId);
                        setCommitteeCandidatesList(relCands.map(c => ({
                          id: c.id,
                          fullName: getCandidateDisplayName(c, language),
                          phone: c.phone,
                          email: c.email
                        })));
                        const existing = interviewCommittees.find(comm => String(comm.jobId) === newJobId);
                        if (existing && existing.members && existing.members.length > 0) {
                          setCommitteeMembersList(existing.members);
                          setCommitteeInterviewDate(existing.interviewDate || committeeInterviewDate);
                          setCommitteeInterviewTime(existing.interviewTime || '10:00');
                          setCommitteeInterviewLocation(existing.interviewLocation || committeeInterviewLocation);
                        }
                      }}
                      disabled={!hasOpenJobs}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 text-white focus:border-purple-500' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-purple-600'
                      }`}
                    >
                      {openVacancies.map(j => (
                        <option key={j.id} value={j.id}>
                          {getTitleName(j.title) || j.title} — {j.department} ({j.location})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!hasOpenJobs && (
                    <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      زر إضافة لجنة غير ممكن لعدم وجود وظائف مفتوحة حالياً.
                    </div>
                  )}
                </div>

                {/* Candidates in Screening Info */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-teal-500">person_search</span>
                    <span>المتقدمون في منطقة الفرز المجدولون للمقابلة ({committeeCandidatesList.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {committeeCandidatesList.map(cand => (
                      <span
                        key={cand.id}
                        className={`text-xs px-3 py-1 rounded-lg border flex items-center gap-1.5 font-bold ${
                          isDark ? 'bg-slate-800/80 border-slate-700 text-teal-300' : 'bg-white border-slate-200 text-teal-800 shadow-sm'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xs text-teal-500">person</span>
                        <span>{cand.fullName}</span>
                        {cand.phone && <span className="text-[10px] text-slate-400 font-normal">({cand.phone})</span>}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interview Schedule Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                      📅 تاريخ المقابلة:
                    </label>
                    <input
                      type="date"
                      value={committeeInterviewDate}
                      onChange={e => setCommitteeInterviewDate(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                      ⏰ توقيت المقابلة:
                    </label>
                    <input
                      type="time"
                      value={committeeInterviewTime}
                      onChange={e => setCommitteeInterviewTime(e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                      📍 قاعة / مكان المقابلة:
                    </label>
                    <input
                      type="text"
                      value={committeeInterviewLocation}
                      onChange={e => setCommitteeInterviewLocation(e.target.value)}
                      placeholder="قاعة الاجتماعات الرئيسية / أونلاين عبر Teams"
                      className={`w-full px-3 py-1.5 rounded-lg border text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* ── Committee Member Instant Search & 5-Fields Auto-Fill ── */}
              <div className={`p-5 rounded-xl border space-y-4 ${
                isDark ? 'bg-slate-900/40 border-purple-500/20' : 'bg-purple-50/40 border-purple-200'
              }`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <span className="material-symbols-outlined text-base">badge</span>
                    <span>إضافة أعضاء اللجنة (يكفي كتابة آيدي الموظف أو رقم الباج)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    بحث فوري في قاعدة بيانات الموظفين ({employees.length} موظف)
                  </span>
                </div>

                {/* Live Search Input */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                    search
                  </span>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder="اكتب آيدي الموظف (مثال: VTS-1001) أو رقم الباج أو اسم الموظف..."
                    className={`w-full pr-10 pl-4 py-2.5 rounded-xl text-xs font-medium border transition-all ${
                      isDark 
                        ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-purple-600 shadow-sm'
                    }`}
                  />
                  {memberSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMemberSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Instant 5-Fields Card When Matched */}
                {matchedEmployee ? (
                  <div className="p-4 rounded-xl border border-teal-500/60 bg-teal-500/10 space-y-3 transition-all animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-lg">verified</span>
                        <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                          تم العثور على الموظف ومطابقة بياناته تلقائياً
                        </span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-800 dark:text-teal-200 font-mono font-bold">
                        {matchedEmployee.employeeId || matchedEmployee.employee_id || matchedEmployee.id}
                      </span>
                    </div>

                    {/* The EXACT 5 Requested Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
                      {/* 1. المكتب */}
                      <div className={`p-2.5 rounded-xl border ${
                        isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-teal-500">apartment</span>
                          <span>المكتب / الفرع</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {matchedEmployee.branch || matchedEmployee.location || 'المقر الرئيسي'}
                        </div>
                      </div>

                      {/* 2. آيدي الموظف */}
                      <div className={`p-2.5 rounded-xl border ${
                        isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-teal-500">pin</span>
                          <span>آيدي الموظف</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white font-mono truncate">
                          {matchedEmployee.employeeId || matchedEmployee.employee_id || matchedEmployee.id}
                        </div>
                      </div>

                      {/* 3. باج الموظف */}
                      <div className={`p-2.5 rounded-xl border ${
                        isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-teal-500">badge</span>
                          <span>باج الموظف</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white font-mono truncate">
                          {matchedEmployee.badgeNo || matchedEmployee.badge_no || '---'}
                        </div>
                      </div>

                      {/* 4. اسم الموظف */}
                      <div className={`p-2.5 rounded-xl border ${
                        isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-teal-500">person</span>
                          <span>اسم الموظف</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {matchedEmployee.fullNameAr || matchedEmployee.fullName || matchedEmployee.full_name_ar}
                        </div>
                      </div>

                      {/* 5. عنوانه الوظيفي */}
                      <div className={`p-2.5 rounded-xl border ${
                        isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                      }`}>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-teal-500">work</span>
                          <span>عنوانه الوظيفي</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {matchedEmployee.jobTitle || matchedEmployee.position_ar || matchedEmployee.position || 'موظف'}
                        </div>
                      </div>
                    </div>

                    {/* Member Role & Add Button */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          دور العضو في اللجنة:
                        </label>
                        <select
                          value={selectedMemberRole}
                          onChange={e => setSelectedMemberRole(e.target.value as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="رئيس اللجنة">رئيس اللجنة (Committee Chair)</option>
                          <option value="عضو لجنة">عضو لجنة (Committee Member)</option>
                          <option value="مقرر اللجنة">مقرر اللجنة (Committee Secretary)</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMemberToCommittee}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
                      >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        <span>إضافة لتشكيل اللجنة</span>
                      </button>
                    </div>
                  </div>
                ) : memberSearchQuery.trim() ? (
                  <div className="p-3.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 text-center text-xs text-amber-600 dark:text-amber-400">
                    لم يتم العثور على موظف يطابق الرقم أو الاسم المدخل. يرجى التأكد من صحة رقم الآيدي أو رقم الباج.
                  </div>
                ) : null}
              </div>

              {/* ── Table / Cards of Formed Committee Members ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-purple-500">groups</span>
                    <span>أعضاء اللجنة المضافون ({committeeMembersList.length}):</span>
                  </h4>
                  {committeeMembersList.length > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      يتم إرسال الدعوة ورابط فورم المقابلة لكل عضو مسجل أدناه
                    </span>
                  )}
                </div>

                {committeeMembersList.length === 0 ? (
                  <div className={`p-8 rounded-xl border border-dashed text-center space-y-2 ${
                    isDark ? 'border-slate-800 bg-slate-900/20' : 'border-slate-300 bg-slate-50'
                  }`}>
                    <span className="material-symbols-outlined text-3xl text-slate-400">group_off</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      لم تتم إضافة أعضاء للجنة حتى الآن. استخدم حقل البحث أعلاه بكتابة آيدي أو باج الموظف.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {committeeMembersList.map((member, idx) => (
                      <div
                        key={member.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          {/* Member Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {member.fullName}
                                </h5>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  member.role === 'رئيس اللجنة' 
                                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                }`}>
                                  {member.role}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                                <span>💼 {member.jobTitle}</span>
                                <span>• 🏢 {member.officeName}</span>
                                <span className="font-mono">🆔 {member.employeeId}</span>
                                <span className="font-mono">🪪 باج: {member.badgeNo}</span>
                              </div>
                            </div>
                          </div>

                          {/* Member Status & Direct Interactive Actions */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Status Badge */}
                            {member.status === 'invitation_sent' && (
                              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">mail</span>
                                <span>تم إرسال الدعوة</span>
                              </span>
                            )}
                            {member.status === 'confirmed' && (
                              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                <span>أكّد المشاركة</span>
                              </span>
                            )}
                            {member.status === 'evaluation_submitted' && (
                              <span className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">assignment_turned_in</span>
                                <span>أكمل التقييم</span>
                              </span>
                            )}

                            {/* Date Lock Indicator */}
                            {Boolean(committeeInterviewDate && new Date().toISOString().split('T')[0] < committeeInterviewDate && !allowEarlyAccessOverride) ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1" title="الفورم يفتح لأعضاء اللجنة يوم المقابلة حصراً">
                                <span className="material-symbols-outlined text-xs">lock</span>
                                <span>يفتح يوم المقابلة ({committeeInterviewDate})</span>
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">lock_open</span>
                                <span>متاح للتقييم اليوم</span>
                              </span>
                            )}

                            {/* Candidate Evaluation Count by this Member */}
                            {(() => {
                              const evalsCount = archivedEvaluations.filter(e => (e.evaluatorId === member.employeeId || e.evaluatorBadge === member.badgeNo) && committeeCandidatesList.some(cl => cl.id === e.candidateId)).length;
                              if (evalsCount > 0) {
                                return (
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-xs">how_to_reg</span>
                                    <span>قيّم ({evalsCount} من {committeeCandidatesList.length || 1})</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}

                            {/* Simulation: Member confirms participation */}
                            {member.status === 'invitation_sent' && (
                              <button
                                type="button"
                                onClick={() => handleConfirmMemberParticipation(member.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                                title="محاكاة تأكيد العضو على المشاركة عبر تطبيق الموظف أو البريد"
                              >
                                <span className="material-symbols-outlined text-xs">done_all</span>
                                <span>تأكيد المشاركة</span>
                              </button>
                            )}

                            {/* Direct Form Link & Open Form in App button */}
                            {(member.status === 'confirmed' || member.status === 'invitation_sent' || member.status === 'evaluation_submitted') && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleCopyFormLink(member.evaluationFormUrl || `${window.location.origin}/?module=recruitment&view=eval&cid=${committeeJobId}&m=${encodeURIComponent(member.employeeId)}`, member.id)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
                                  title="نسخ رابط استمارة التقييم الخاصة بالعضو لإرسالها لموبايله"
                                >
                                  <span className="material-symbols-outlined text-xs">content_copy</span>
                                  <span>{copiedLinkMemberId === member.id ? 'تم النسخ!' : 'نسخ رابط الفورم'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEvaluationFormInApp(member)}
                                  className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm"
                                  title="فتح استمارة المقابلات الإلكترونية لتطبيق الموظف"
                                >
                                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                                  <span>فتح الفورم بالتطبيق</span>
                                </button>
                              </>
                            )}

                            {/* Remove button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveMemberFromCommittee(idx)}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 p-1 rounded-lg transition-colors"
                              title="إزالة العضو"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>

                        {/* Direct Form Link Banner */}
                        {member.evaluationFormUrl && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                              <span className="material-symbols-outlined text-xs text-indigo-500">smartphone</span>
                              <span className="font-semibold shrink-0">رابط الاستمارة (موبايل العضو):</span>
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate dir-ltr">
                                {member.evaluationFormUrl}
                              </span>
                            </div>
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 shrink-0 font-medium">
                              يفتح يوم المقابلة ({committeeInterviewDate}) لتقييم المتقدمين ({committeeCandidatesList.length})
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setShowCommitteeModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                إغلاق
              </button>

              <button
                type="button"
                disabled={isSendingCommitteeInvites || committeeMembersList.length === 0 || !hasOpenJobs}
                onClick={handleSendCommitteeInvites}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                  isSendingCommitteeInvites || committeeMembersList.length === 0 || !hasOpenJobs
                    ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white shadow-purple-500/25 hover:scale-[1.02]'
                }`}
              >
                {isSendingCommitteeInvites ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                    <span>جارٍ إرسال الدعوات عبر Outlook والتطبيق...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">send</span>
                    <span>إرسال الدعوات الرسمية عبر Outlook وتطبيق الموظفين</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Invitation Sent Preview Modal (Outlook & Mobile App) ──────── */}
      {showInviteSentSuccessModal && lastSentCommittee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-auto ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-4xl">check_circle</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">تم إرسال الدعوات الرسمية بنجاح!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  تم إرسال الإشعارات وتفاصيل المقابلة عبر Outlook وتطبيق الموظفين لأعضاء اللجنة المحددين
                </p>
              </div>

              {/* Outlook Email Preview Card */}
              <div className={`text-right p-4 rounded-xl border text-xs space-y-2.5 ${
                isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <span className="material-symbols-outlined text-sm">mail</span>
                    معاينة رسالة Microsoft Outlook 365:
                  </span>
                  <span className="text-[10px] text-slate-400">Sent via Exchange Server</span>
                </div>
                <div className="space-y-1">
                  <div><strong>الموضوع:</strong> [دعوة رسمية] المشاركة في لجنة مقابلات وظيفة ({lastSentCommittee.jobTitle})</div>
                  <div><strong>إلى:</strong> {lastSentCommittee.members.map(m => m.fullName).join('، ')}</div>
                  <div><strong>المكان والموعد:</strong> {lastSentCommittee.interviewLocation} — {lastSentCommittee.interviewDate} ({lastSentCommittee.interviewTime})</div>
                  <div className="pt-2 text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800">
                    نظراً لكفاءتكم وخبرتكم، يرجى حضور مقابلة المتقدمين في منطقة الفرز للوظيفة المذكورة أعلاه. عند تأكيدكم المشاركة، سيصلكم رابط فورم المقابلة الإلكتروني لاستخدامه عبر تطبيق الموظف وإعادة إرساله بالدرجات لمسؤول التوظيف.
                  </div>
                </div>
              </div>

              {/* Direct Form Links for Members with Copy Buttons */}
              <div className="text-right space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  روابط فتح فورم المقابلات في تطبيق الموظف (تم إنشاؤها وإرسالها للأعضاء):
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lastSentCommittee.members.map(member => (
                    <div
                      key={member.id}
                      className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">{member.fullName} ({member.role})</div>
                        <div className="text-[10px] text-slate-400 truncate dir-ltr">{member.evaluationFormUrl}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyFormLink(member.evaluationFormUrl || '', member.id)}
                          className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold"
                        >
                          {copiedLinkMemberId === member.id ? 'تم النسخ!' : 'نسخ الرابط'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowInviteSentSuccessModal(false);
                            handleConfirmMemberParticipation(member.id);
                            handleOpenEvaluationFormInApp(member);
                          }}
                          className="px-2.5 py-1 rounded bg-teal-600 text-white text-[11px] font-bold hover:bg-teal-500"
                        >
                          تجربة الفورم
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteSentSuccessModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md"
                >
                  حسناً، فهمت
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. Electronic Interview Evaluation Form Modal (تطبيق الموظف) ───── */}
      {showEvaluationFormModal && activeEvaluationMember && activeEvaluationCandidate && (() => {
        const activeComm = interviewCommittees.find(c => 
          c.id === activeEvaluationCommitteeId || 
          c.members?.some(m => m.id === activeEvaluationMember.id || m.employeeId === activeEvaluationMember.employeeId)
        ) || lastSentCommittee;

        const scheduledDate = activeComm?.interviewDate || committeeInterviewDate;
        const todayDateStr = new Date().toISOString().split('T')[0];
        const isDateLocked = !allowEarlyAccessOverride && Boolean(scheduledDate && todayDateStr < scheduledDate);

        // Fetch candidates for this interview session
        const candidatesForSession = candidates.filter(c => 
          committeeCandidatesList.some(cl => String(cl.id) === String(c.id)) ||
          (activeComm?.jobId && String(c.appliedJobId) === String(activeComm.jobId) && normalizeStage(c.stage) === 'فرز المتقدمين')
        );
        const sessionCandidates = candidatesForSession.length > 0 
          ? candidatesForSession 
          : [activeEvaluationCandidate];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className={`w-full max-w-3xl max-h-[94vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden my-auto ${
              isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}>
              {/* App Mockup Top Header */}
              <div className="bg-gradient-to-r from-teal-700 via-indigo-700 to-purple-800 text-white p-4 shrink-0 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-2xl">smartphone</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold">
                        VITAS EMPLOYEE APP
                      </span>
                      <span className="text-xs text-white/80">تطبيق الموظف</span>
                    </div>
                    <h3 className="text-sm font-bold mt-0.5">استمارة تقييم المقابلة الشخصية الإلكترونية</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEvaluationFormModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Locked Screen if Date has not arrived yet */}
              {isDateLocked ? (
                <div className="p-8 text-center space-y-6 overflow-y-auto flex-1">
                  <div className="relative inline-block mx-auto">
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
                      <span className="material-symbols-outlined text-5xl">lock_clock</span>
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                    </span>
                  </div>

                  <div className="space-y-2 max-w-lg mx-auto">
                    <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 inline-block">
                      مقفلة وفقاً لضوابط حوكمة المقابلات
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      استمارة التقييم تفتح يوم المقابلة فقط
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      عزيزي عضو اللجنة <strong>({activeEvaluationMember.fullName})</strong>، تماشياً مع سياسة التوظيف المعتمدة، يتم تفعيل استمارة التقييم الإلكترونية في صباح يوم المقابلة المحدد أدناه لضمان النزاهة والتقييم المباشر للمتقدمين أثناء المقابلة.
                    </p>
                  </div>

                  {/* Interview Schedule Details */}
                  <div className={`p-4 rounded-2xl border text-right text-xs space-y-3 max-w-lg mx-auto ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-sm'
                  }`}>
                    <div className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <span className="material-symbols-outlined text-sm">event</span>
                      <span>تفاصيل جلسة المقابلة المجدولة:</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">📅 تاريخ المقابلة المحدد:</span>
                        <strong className="text-sm text-purple-600 dark:text-purple-400 font-mono">{scheduledDate}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">⏰ توقيت المقابلة:</span>
                        <strong className="text-sm font-mono">{activeComm?.interviewTime || committeeInterviewTime || '10:00 صباحاً'}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block">💼 الوظيفة:</span>
                        <strong>{activeComm?.jobTitle || 'وظيفة معنية'}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block">📍 مكان المقابلة:</span>
                        <span>{activeComm?.interviewLocation || committeeInterviewLocation}</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-1.5">👥 المتقدمون للمقابلة ({sessionCandidates.length} متقدمين):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {sessionCandidates.map(c => (
                            <span key={c.id} className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">person</span>
                              <span>{getCandidateDisplayName(c, language)}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recruiter Testing Override Button */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 max-w-lg mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-amber-500">info</span>
                      <span>تاريخ اليوم: {todayDateStr}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAllowEarlyAccessOverride(true)}
                      className="px-4 py-2 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/40 text-purple-700 dark:text-purple-300 font-bold flex items-center gap-1.5 transition-all"
                      title="صلاحية مسؤول التوظيف لمعاينة وتجربة الاستمارة قبل تاريخ المقابلة"
                    >
                      <span className="material-symbols-outlined text-sm">lock_open</span>
                      <span>فتح الاستمارة للمعاينة والتجربة (مسؤول التوظيف)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Unlocked Form Body */
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Evaluator 5 Fields Summary Card */}
                  <div className={`p-4 rounded-xl border space-y-2.5 ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">badge</span>
                      <span>بيانات عضو اللجنة المقيم (الموظف المستخدم للفورم):</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <span className="text-[10px] text-slate-500 block">🏢 المكتب</span>
                        <strong className="truncate block">{activeEvaluationMember.officeName}</strong>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <span className="text-[10px] text-slate-500 block">🆔 آيدي الموظف</span>
                        <strong className="truncate block font-mono">{activeEvaluationMember.employeeId}</strong>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <span className="text-[10px] text-slate-500 block">🪪 باج الموظف</span>
                        <strong className="truncate block font-mono">{activeEvaluationMember.badgeNo}</strong>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <span className="text-[10px] text-slate-500 block">👤 اسم الموظف</span>
                        <strong className="truncate block">{activeEvaluationMember.fullName}</strong>
                      </div>
                      <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <span className="text-[10px] text-slate-500 block">💼 عنوانه الوظيفي</span>
                        <strong className="truncate block">{activeEvaluationMember.jobTitle}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Candidate Selection Tabs (كل متقدم لديه استمارة تقييم منفصلة باسمه) */}
                  <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                    isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50/60 border-purple-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">groups</span>
                        <span>المتقدمون للمقابلة لهذه الوظيفة ({sessionCandidates.length} متقدمين):</span>
                      </span>
                      <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold">
                        لكل متقدم استمارة تقييم مستقلة باسمه
                      </span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {sessionCandidates.map((cand, idx) => {
                        const isSelected = activeEvaluationCandidate.id === cand.id;
                        const existingEval = archivedEvaluations.find(e => 
                          e.candidateId === cand.id && 
                          (e.evaluatorId === activeEvaluationMember.employeeId || e.evaluatorBadge === activeEvaluationMember.badgeNo)
                        );

                        return (
                          <button
                            key={cand.id}
                            type="button"
                            onClick={() => handleSwitchCandidateInEvaluation(cand)}
                            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-400/50'
                                : isDark
                                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full bg-white/20 text-center text-[10px] flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <span>{getCandidateDisplayName(cand, language)}</span>
                            {existingEval ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5 ${
                                isSelected ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40'
                              }`}>
                                <span className="material-symbols-outlined text-[10px]">check</span>
                                <span>{existingEval.totalScore}/100</span>
                              </span>
                            ) : (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                isSelected ? 'bg-amber-300 text-slate-900' : 'bg-amber-500/20 text-amber-600 border border-amber-500/40'
                              }`}>
                                بانتظار التقييم
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Candidate Header */}
                  <div className={`p-3 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
                    isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-500 block">الاستمارة الحالية مخصصة لتقييم المتقدم:</span>
                      <strong className="text-sm text-teal-600 dark:text-teal-400">
                        {getCandidateDisplayName(activeEvaluationCandidate, language)}
                      </strong>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>💼 {getTitleName(activeEvaluationCandidate.jobTitle) || activeEvaluationCandidate.jobTitle}</span>
                      {activeEvaluationCandidate.phone && <span>📞 {activeEvaluationCandidate.phone}</span>}
                      {activeEvaluationCandidate.email && <span>✉️ {activeEvaluationCandidate.email}</span>}
                    </div>
                  </div>

                  {/* ── The 5 Evaluation Criteria & Scores (Total 100) ── */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-teal-500">grading</span>
                        <span>محاور التقييم ومعايير المقابلة الخمسة (المجموع الكلي: 100 درجة):</span>
                      </h4>

                      {/* Live Total Score Indicator */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">الدرجة النهائية:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                          (criteriaScores.appearance + criteriaScores.qualification + criteriaScores.experience + criteriaScores.technical + criteriaScores.communication) >= 80
                            ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500/40'
                            : (criteriaScores.appearance + criteriaScores.qualification + criteriaScores.experience + criteriaScores.technical + criteriaScores.communication) >= 60
                              ? 'bg-amber-500/20 text-amber-600 border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-600 border-rose-500/40'
                        }`}>
                          {criteriaScores.appearance + criteriaScores.qualification + criteriaScores.experience + criteriaScores.technical + criteriaScores.communication} / 100
                        </span>
                      </div>
                    </div>

                    {/* Criterion 1 */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white">1. المظهر العام واللباقة والاتزان المهني</strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            الهندام، الحضور، الثقة بالنفس، الانضباط في لغة الجسد والتعبير
                          </span>
                        </div>
                        <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {criteriaScores.appearance} / 15
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="15"
                        value={criteriaScores.appearance}
                        onChange={e => setCriteriaScores(prev => ({ ...prev, appearance: Number(e.target.value) }))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>

                    {/* Criterion 2 */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white">2. المؤهل الأكاديمي والمعرفة الأساسية بالوظيفة</strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            ملاءمة التخصص العلمي، المعرفة بقوانين التمويل الأصغر والعمل المصرفي
                          </span>
                        </div>
                        <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {criteriaScores.qualification} / 20
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={criteriaScores.qualification}
                        onChange={e => setCriteriaScores(prev => ({ ...prev, qualification: Number(e.target.value) }))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>

                    {/* Criterion 3 */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white">3. الخبرات العملية السابقة وسجل الإنجازات</strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            السنوات الفعلية في مناصب مشابهة، قصص النجاح في التعامل مع العملاء
                          </span>
                        </div>
                        <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {criteriaScores.experience} / 25
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        value={criteriaScores.experience}
                        onChange={e => setCriteriaScores(prev => ({ ...prev, experience: Number(e.target.value) }))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>

                    {/* Criterion 4 */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white">4. الكفاءة التقنية والتخصصية وسرعة حل المشكلات</strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            استخدام برامج الحاسوب والأنظمة البنكية، المنطقية والقدرة على التفكير التحليلي
                          </span>
                        </div>
                        <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {criteriaScores.technical} / 20
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={criteriaScores.technical}
                        onChange={e => setCriteriaScores(prev => ({ ...prev, technical: Number(e.target.value) }))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>

                    {/* Criterion 5 */}
                    <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-900 dark:text-white">5. مهارات التواصل وسرعة الاستجابة والذكاء التفاعلي</strong>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            الإقناع، التفاوض، الإصغاء الجيد والهدوء تحت ضغط الأسئلة
                          </span>
                        </div>
                        <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {criteriaScores.communication} / 20
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={criteriaScores.communication}
                        onChange={e => setCriteriaScores(prev => ({ ...prev, communication: Number(e.target.value) }))}
                        className="w-full accent-teal-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Recommendation Radio Options */}
                  <div className="space-y-2 text-xs">
                    <label className="font-bold text-slate-700 dark:text-slate-200 block">
                      التوصية المهنية النهائية للجنة:
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { val: 'موصى بقبوله للتعيين', label: 'قبول وتعيين', icon: 'check_circle' },
                        { val: 'اجتياز للمقابلة النهائية', label: 'مقابلة ثانية', icon: 'trending_up' },
                        { val: 'قائمة الاحتياط', label: 'قائمة الاحتياط', icon: 'pause_circle' },
                        { val: 'مرفوض', label: 'اعتذار / مرفوض', icon: 'cancel' }
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setEvaluationRecommendation(item.val as any)}
                          className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                            evaluationRecommendation === item.val
                              ? 'border-teal-500 bg-teal-500/20 text-teal-700 dark:text-teal-300 shadow-sm'
                              : isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">{item.icon}</span>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Notes */}
                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-700 dark:text-slate-200 block">
                      ملاحظات المقابلة ونقاط القوة وجوانب التطوير:
                    </label>
                    <textarea
                      rows={3}
                      value={evaluationNotes}
                      onChange={e => setEvaluationNotes(e.target.value)}
                      placeholder="اكتب ملاحظاتك وتوصياتك التفصيلية هنا ليطلع عليها مسؤول التوظيف..."
                      className={`w-full p-3 rounded-xl border text-xs leading-relaxed ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Modal Actions Footer */}
              <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${
                isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
              }`}>
                <button
                  type="button"
                  onClick={() => setShowEvaluationFormModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800"
                >
                  {isDateLocked ? 'إغلاق' : 'إلغاء'}
                </button>

                {!isDateLocked && (
                  <button
                    type="button"
                    disabled={isSubmittingEvaluation}
                    onClick={handleSubmitEvaluationToRecruiter}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-500/25 transition-all hover:scale-[1.02]"
                  >
                    {isSubmittingEvaluation ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                        <span>جارٍ الإرسال والأرشفة...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">send_and_archive</span>
                        <span>إرسال استمارة تقييم ({getCandidateDisplayName(activeEvaluationCandidate, language)}) لمسؤول التوظيف</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── 4. Evaluation Received & Archived Confirmation Modal ───────── */}
      {showEvaluationSuccessModal && lastSavedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 text-center space-y-4 my-auto ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-500 mx-auto flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-4xl">task_alt</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">تم استلام تقييم المقابلة وأرشفته بنجاح!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تم إرسال استمارة المقابلة إلى مسؤول التوظيف وتحديث درجات المرشح في شاشة الفرز تلقائياً
              </p>
            </div>

            <div className={`p-4 rounded-xl border text-right text-xs space-y-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">المرشح:</span>
                <strong>{lastSavedEvaluation.candidateName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الوظيفة:</span>
                <span>{lastSavedEvaluation.jobTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">عضو اللجنة المقيم:</span>
                <span>{lastSavedEvaluation.evaluatorName} ({lastSavedEvaluation.evaluatorJobTitle})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المكتب:</span>
                <span>{lastSavedEvaluation.evaluatorOffice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">الدرجة النهائية:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 font-mono text-sm">{lastSavedEvaluation.totalScore} / 100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">التوصية:</span>
                <strong className="text-purple-600 dark:text-purple-400">{lastSavedEvaluation.recommendation}</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400">
                <span>رقم الأرشفة المرجعي:</span>
                <span className="font-mono">{lastSavedEvaluation.id}</span>
              </div>
            </div>

            {/* If there are other candidates in this committee session that activeEvaluationMember has not evaluated yet */}
            {(() => {
              if (!activeEvaluationMember) return null;
              const sessionCands = candidates.filter(c => 
                committeeCandidatesList.some(cl => String(cl.id) === String(c.id)) ||
                (activeEvaluationCommitteeId && String(c.appliedJobId) === String(committeeJobId) && normalizeStage(c.stage) === 'فرز المتقدمين')
              );
              const unevaluated = sessionCands.filter(c => 
                c.id !== lastSavedEvaluation.candidateId && 
                !archivedEvaluations.some(e => e.candidateId === c.id && (e.evaluatorId === activeEvaluationMember.employeeId || e.evaluatorBadge === activeEvaluationMember.badgeNo))
              );

              if (unevaluated.length > 0) {
                const nextCand = unevaluated[0];
                return (
                  <div className={`p-3 rounded-xl border text-right space-y-2 ${
                    isDark ? 'bg-purple-950/20 border-purple-500/30' : 'bg-purple-50/70 border-purple-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">person_pin</span>
                        <span>متبقي ({unevaluated.length}) متقدم لهذه الوظيفة بانتظار تقييمك:</span>
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {getCandidateDisplayName(nextCand, language)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEvaluationSuccessModal(false);
                        handleSwitchCandidateInEvaluation(nextCand);
                        setShowEvaluationFormModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
                    >
                      <span>الشروع في تقييم ({getCandidateDisplayName(nextCand, language)}) الآن</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                );
              }
              return (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-center">
                  🎉 أحسنت! تم إكمال تقييم جميع المتقدمين المخصصين لهذه اللجنة بنجاح.
                </div>
              );
            })()}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedEvaluationDetail(lastSavedEvaluation);
                  setShowArchivedEvaluationsModal(true);
                  setShowEvaluationSuccessModal(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-teal-500/50 bg-teal-500/10 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>استعراض وطباعة الاستمارة</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEvaluationSuccessModal(false)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold"
              >
                إغلاق والعودة للفرز
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. Archived Evaluations Modal (الرجوع إليه بأي وقت) ───────── */}
      {showArchivedEvaluationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden my-auto ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">folder_special</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold">أرشيف استمارات تقييم المقابلات الدائم</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    الرجوع إلى جميع استمارات التقييم المرسلة من أعضاء لجان المقابلات في أي وقت
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowArchivedEvaluationsModal(false);
                  setSelectedEvaluationDetail(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {selectedEvaluationDetail ? (
                /* Single Archived Evaluation Detailed Printable View */
                <div className={`p-6 rounded-2xl border space-y-5 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-md'
                }`}>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedEvaluationDetail(null)}
                      className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      <span>العودة لقائمة الأرشيف</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">print</span>
                      <span>طباعة الاستمارة PDF</span>
                    </button>
                  </div>

                  {/* Header of the Form */}
                  <div className="text-center space-y-1">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      شركة فيتاس العراق للتمويل الأصغر — قسم الموارد البشرية
                    </h4>
                    <p className="text-xs text-slate-500">
                      استمارة تقييم مقابلة عمل رسمية ومؤرشفة إلكترونياً
                    </p>
                    <span className="text-[10px] font-mono text-slate-400">
                      رقم الأرشفة: {selectedEvaluationDetail.id} • تاريخ التقديم: {new Date(selectedEvaluationDetail.submittedAt).toLocaleString('ar-IQ')}
                    </span>
                  </div>

                  {/* 5 Evaluator Fields */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block">🏢 المكتب</span>
                      <strong>{selectedEvaluationDetail.evaluatorOffice}</strong>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block">🆔 آيدي الموظف</span>
                      <strong className="font-mono">{selectedEvaluationDetail.evaluatorId}</strong>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block">🪪 باج الموظف</span>
                      <strong className="font-mono">{selectedEvaluationDetail.evaluatorBadge}</strong>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block">👤 اسم الموظف</span>
                      <strong>{selectedEvaluationDetail.evaluatorName}</strong>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 block">💼 عنوانه الوظيفي</span>
                      <strong>{selectedEvaluationDetail.evaluatorJobTitle}</strong>
                    </div>
                  </div>

                  {/* Candidate Info */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 block">المرشح المقابل:</span>
                      <strong className="text-sm">{selectedEvaluationDetail.candidateName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">الوظيفة المتقدم لها:</span>
                      <strong>{selectedEvaluationDetail.jobTitle}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">مرسل إلى:</span>
                      <strong>{selectedEvaluationDetail.submittedTo}</strong>
                    </div>
                  </div>

                  {/* Score Breakdown Table */}
                  <div className="space-y-2 text-xs">
                    <h5 className="font-bold">تفاصيل الدرجات الممنوحة للمحاور:</h5>
                    <div className={`rounded-xl border overflow-hidden ${
                      isDark ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <table className="w-full text-right text-xs">
                        <thead className={isDark ? 'bg-slate-800' : 'bg-slate-100'}>
                          <tr>
                            <th className="p-2.5">المحور</th>
                            <th className="p-2.5 text-center">الحد الأقصى</th>
                            <th className="p-2.5 text-center">الدرجة الممنوحة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          <tr>
                            <td className="p-2.5">1. المظهر العام واللباقة والاتزان المهني</td>
                            <td className="p-2.5 text-center font-mono">15</td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                              {selectedEvaluationDetail.criteriaScores?.appearance || 0}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5">2. المؤهل الأكاديمي والمعرفة الأساسية بالوظيفة</td>
                            <td className="p-2.5 text-center font-mono">20</td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                              {selectedEvaluationDetail.criteriaScores?.qualification || 0}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5">3. الخبرات العملية السابقة وسجل الإنجازات</td>
                            <td className="p-2.5 text-center font-mono">25</td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                              {selectedEvaluationDetail.criteriaScores?.experience || 0}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5">4. الكفاءة التقنية والتخصصية وحل المشكلات</td>
                            <td className="p-2.5 text-center font-mono">20</td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                              {selectedEvaluationDetail.criteriaScores?.technical || 0}
                            </td>
                          </tr>
                          <tr>
                            <td className="p-2.5">5. مهارات التواصل وسرعة الاستجابة والذكاء التفاعلي</td>
                            <td className="p-2.5 text-center font-mono">20</td>
                            <td className="p-2.5 text-center font-mono font-bold text-teal-600 dark:text-teal-400">
                              {selectedEvaluationDetail.criteriaScores?.communication || 0}
                            </td>
                          </tr>
                          <tr className={isDark ? 'bg-slate-800/80 font-bold' : 'bg-slate-100 font-bold'}>
                            <td className="p-2.5">المجموع الكلي النهائي</td>
                            <td className="p-2.5 text-center font-mono">100</td>
                            <td className="p-2.5 text-center font-mono text-sm text-purple-600 dark:text-purple-400">
                              {selectedEvaluationDetail.totalScore} / 100
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recommendation & Notes */}
                  <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                    isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div>
                      <span className="text-slate-400 block text-[10px]">التوصية النهائية:</span>
                      <strong className="text-sm text-emerald-600 dark:text-emerald-400">
                        {selectedEvaluationDetail.recommendation}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ملاحظات عضو اللجنة:</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                        {selectedEvaluationDetail.notes || 'لا توجد ملاحظات إضافية.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* List of Archived Evaluations */
                archivedEvaluations.length === 0 ? (
                  <div className="p-10 text-center space-y-2 text-slate-400">
                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                    <p className="text-xs">لا توجد استمارات تقييم مؤرشفة حتى الآن.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {archivedEvaluations.map(record => (
                      <div
                        key={record.id}
                        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all hover:border-teal-500/50 ${
                          isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-slate-900 dark:text-white truncate">
                              {record.candidateName}
                            </strong>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold">
                              {record.jobTitle}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold">
                              {record.recommendation}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                            <span>👤 المقيم: {record.evaluatorName} ({record.evaluatorJobTitle})</span>
                            <span>• 🏢 {record.evaluatorOffice}</span>
                            <span>• 📅 {new Date(record.submittedAt).toLocaleDateString('ar-IQ')}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-center">
                            <span className="text-[10px] text-slate-400 block">الدرجة</span>
                            <span className="font-bold text-sm font-mono text-teal-600 dark:text-teal-400">
                              {record.totalScore} / 100
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedEvaluationDetail(record)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span>عرض الاستمارة</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
