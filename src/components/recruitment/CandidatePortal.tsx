import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { JobVacancy, Candidate } from '../../types';
import { api } from '../../api/client';

// Console log at component mount
console.log('CandidatePortal component loaded');

export const CandidatePortal: React.FC = () => {
  const { jobVacancies, updateJobVacancy, addCandidate, candidates, t, language, theme, toggleTheme, toggleLanguage } = useApp();
  const isDark = theme === 'dark';

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState<JobVacancy | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submissionDetails, setSubmissionDetails] = useState<{
    fullName: string;
    jobTitle: string;
  } | null>(null);

  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateModalInfo, setDuplicateModalInfo] = useState<{
    fullName: string;
    jobTitle: string;
    phone: string;
  } | null>(null);

  const [lastSubmissionInfo, setLastSubmissionInfo] = useState<{
    fullName: string;
    phone: string;
    jobTitle: string;
  } | null>(null);

  // Settings data for positions/branches/departments
  const [positions, setPositions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Local state for job vacancies (for public portal)
  const [localJobVacancies, setLocalJobVacancies] = useState<JobVacancy[]>([]);
  const [liveCandidates, setLiveCandidates] = useState<Candidate[]>([]);

  // Helper for phone normalization
  const normalizePhone = (p: string) => {
    if (!p) return '';
    let digits = p.replace(/[^0-9]/g, '');
    if (digits.startsWith('964')) digits = digits.substring(3);
    if (digits.startsWith('0')) digits = digits.substring(1);
    return digits;
  };

  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const [posData, branchData, deptData, candData] = await Promise.all([
          api.getPositions().catch(() => []),
          api.getBranches().catch(() => []),
          api.getSettingsDepartments().catch(() => []),
          api.getCandidates().catch(() => [])
        ]);

        if (Array.isArray(posData)) setPositions(posData);
        if (Array.isArray(branchData)) setBranches(branchData);
        if (Array.isArray(deptData)) setDepartments(deptData);
        if (Array.isArray(candData)) setLiveCandidates(candData);
      } catch (error) {
        console.error('Error loading settings data in CandidatePortal:', error);
      }
    };

    // Load job vacancies directly from API for public portal
    const loadJobVacancies = async () => {
      try {
        console.log('Starting to load job vacancies...');
        const [vacData, candData] = await Promise.all([
          api.getJobVacancies().catch(() => []),
          api.getCandidates().catch(() => [])
        ]);

        console.log('API response - vacancies:', vacData, 'candidates:', candData);

        if (Array.isArray(vacData) && vacData.length > 0) {
          setLocalJobVacancies(vacData);
          console.log('Set local job vacancies:', vacData.length);
        } else {
          console.log('No vacancies from API, trying localStorage...');
          const saved = localStorage.getItem('vitas_job_vacancies');
          if (saved) {
            const localData = JSON.parse(saved);
            if (Array.isArray(localData)) {
              setLocalJobVacancies(localData);
              console.log('Loaded from localStorage:', localData.length);
            }
          }
        }
        if (Array.isArray(candData)) {
          setLiveCandidates(candData);
          console.log('Set live candidates:', candData.length);
        }
      } catch (error) {
        console.error('Error loading job vacancies for public portal:', error);
      }
    };

    loadSettingsData();
    loadJobVacancies();
    const interval = setInterval(loadJobVacancies, 4000);
    return () => clearInterval(interval);
  }, []);

  // Helper title & name resolver functions
  const getTitleName = (title: string) => {
    if (!title) return '';
    const match = positions.find(p =>
      p.name_ar === title ||
      p.name_en === title ||
      p.name === title ||
      String(p.id) === String(title) ||
      `pos-${p.id}` === title ||
      String(p.id) === String(title).replace('pos-', '')
    );
    if (match) {
      return match.name_ar || match.name || match.name_en || title;
    }
    return title;
  };

  const getDeptName = (dept: string) => {
    if (!dept) return '';
    const match = departments.find(d =>
      d.name_ar === dept || d.name_en === dept || d.name === dept || String(d.id) === String(dept)
    );
    if (match) {
      if (language === 'en') return match.name_en || match.name_ar || match.name || dept;
      return match.name_ar || match.name || match.name_en || dept;
    }
    return dept;
  };

  const getBranchName = (loc: string) => {
    if (!loc) return '';
    const match = branches.find(b =>
      b.name_ar === loc || b.name_en === loc || b.name === loc || String(b.id) === String(loc)
    );
    if (match) {
      if (language === 'en') return match.name_en || match.name_ar || match.name || loc;
      return match.name_ar || match.name || match.name_en || loc;
    }
    return loc;
  };

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    email: '',
    personalEmail: '',
    phone: '',
    nationalIdNumber: '',
    experienceYears: 2,
    notes: '',
    photoFile: null as File | null,
    resumeFile: null as File | null,
    photoUrl: '',
    resumeName: '',
    resumeUrl: ''
  });

  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const cleanStr = String(dateStr).split('T')[0].split(' ')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        return cleanStr;
      }
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return cleanStr;
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return String(dateStr).split('T')[0].split(' ')[0];
    }
  };

  // Synced Job Vacancies combining localJobVacancies + Settings positions
  const syncedJobVacancies: JobVacancy[] = React.useMemo(() => {
    const map = new Map<string, JobVacancy>();

    const defaultLocation = branches[0]?.name_ar || branches[0]?.name || 'بغداد_المنصور';
    const defaultDepartment = departments[0]?.name_ar || departments[0]?.name || 'قسم الائتمان';

    const allVacancies = [...localJobVacancies, ...(jobVacancies || [])];

    // 1. Add all job vacancies from local state + AppContext
    allVacancies.forEach(job => {
      if (job && job.id) {
        map.set(String(job.id), {
          ...job,
          location: job.location || defaultLocation,
          department: job.department || defaultDepartment
        });
      }
    });

    // 2. Combine with Settings positions
    if (positions.length > 0) {
      positions.forEach(p => {
        const posTitle = p.name_ar || p.name;
        const posId = `pos-${p.id}`;

        const existing = allVacancies.find(j =>
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
            location: existing.location || defaultLocation,
            department: existing.department || p.department || defaultDepartment
          });
        } else if (!map.has(posId)) {
          map.set(posId, {
            id: posId,
            title: posTitle,
            department: p.department || defaultDepartment,
            location: defaultLocation,
            type: 'دوام كامل',
            status: 'مغلقة',
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
  }, [positions, localJobVacancies, jobVacancies, branches, departments]);

  const isJobExpiredAtCutoff = (deadlineStr?: string): boolean => {
    if (!deadlineStr || !deadlineStr.trim()) return false;
    try {
      const cleanDate = deadlineStr.trim().split('T')[0].split(' ')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return false;

      const [year, month, day] = cleanDate.split('-').map(Number);
      const cutoffTime = new Date(year, month - 1, day, 16, 0, 0, 0);

      const now = new Date();
      return now.getTime() >= cutoffTime.getTime();
    } catch (e) {
      return false;
    }
  };

  // Filter jobs - ONLY show jobs with status 'مفتوحة' or 'Open' and not past 16:00 deadline cutoff
  const openVacancies = React.useMemo(() => {
    return syncedJobVacancies.filter(job => {
      const s = (job.status || '').trim();
      const isOpen = s === 'مفتوحة' || s === 'Open';
      if (!isOpen) return false;

      // Automatically hide jobs after 16:00 (4:00 PM) on deadline date
      if (job.deadline && isJobExpiredAtCutoff(job.deadline)) {
        return false;
      }
      return true;
    });
  }, [syncedJobVacancies]);

  // Filter by department & search term
  const uniqueDepartments = Array.from(new Set(openVacancies.map(j => getDeptName(j.department))));

  const filteredJobs = openVacancies.filter(job => {
    const titleStr = getTitleName(job.title).toLowerCase();
    const deptStr = getDeptName(job.department).toLowerCase();
    const locStr = getBranchName(job.location).toLowerCase();
    const searchStr = searchTerm.toLowerCase();

    const matchesSearch =
      titleStr.includes(searchStr) ||
      deptStr.includes(searchStr) ||
      locStr.includes(searchStr);

    const matchesDept = departmentFilter === 'all' || getDeptName(job.department) === departmentFilter;

    return matchesSearch && matchesDept;
  });

  const getJobCandidatesCount = (jobId: string) => {
    const activeCandidatesList = liveCandidates.length > 0 ? liveCandidates : (candidates || []);
    if (!activeCandidatesList || activeCandidatesList.length === 0) return 0;

    const selId = String(jobId || '');
    const cleanSelId = selId.replace('pos-', '');
    const matchedJob = syncedJobVacancies.find(j => String(j.id) === selId || String(j.id) === cleanSelId || String(j.id) === `pos-${cleanSelId}`);
    const jobTitleLower = (matchedJob?.title || '').toLowerCase().trim();

    return activeCandidatesList.filter(c => {
      if (!c) return false;
      const candJobId = String(c.appliedJobId || '');
      const candCleanJobId = candJobId.replace('pos-', '');

      if (candJobId === selId || candCleanJobId === cleanSelId) return true;

      if (jobTitleLower) {
        const candTitle = (c.jobTitle || '').toLowerCase().trim();
        const candTitleResolved = getTitleName(c.jobTitle).toLowerCase().trim();
        return candTitle === jobTitleLower || candTitleResolved === jobTitleLower;
      }

      return false;
    }).length;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const photoUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, photoFile: file, photoUrl }));
    }
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          resumeFile: file,
          resumeName: file.name,
          resumeUrl: dataUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitApplication = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedJob) return;

    setSubmitting(true);
    try {
      const resolvedJobTitle = getTitleName(selectedJob.title) || selectedJob.title;
      const currentNormPhone = normalizePhone(formData.phone);

      // Client-side check if candidate with same phone number already applied to this job
      const candidatesToCheck = liveCandidates.length > 0 ? liveCandidates : candidates;
      if (currentNormPhone) {
        const hasAlreadyApplied = candidatesToCheck.some(c => {
          const candNormPhone = normalizePhone(c.phone || '');
          if (!candNormPhone || candNormPhone !== currentNormPhone) return false;

          const sameJobId =
            c.appliedJobId && selectedJob.id && (
              c.appliedJobId === selectedJob.id ||
              String(c.appliedJobId) === String(selectedJob.id) ||
              `pos-${c.appliedJobId}` === String(selectedJob.id) ||
              String(c.appliedJobId) === `pos-${selectedJob.id}` ||
              String(c.appliedJobId).replace('pos-', '') === String(selectedJob.id).replace('pos-', '')
            );

          const sameJobTitle =
            c.jobTitle &&
            resolvedJobTitle &&
            (c.jobTitle.trim() === resolvedJobTitle.trim() ||
             c.jobTitle.toLowerCase().trim() === resolvedJobTitle.toLowerCase().trim() ||
             c.jobTitle.toLowerCase().trim().includes(resolvedJobTitle.toLowerCase().trim()) ||
             resolvedJobTitle.toLowerCase().trim().includes(c.jobTitle.toLowerCase().trim()));

          return sameJobId || sameJobTitle;
        });

        if (hasAlreadyApplied) {
          setSubmitting(false);
          setDuplicateModalInfo({
            fullName: formData.fullName || 'السيد/ة المتقدم/ة',
            jobTitle: resolvedJobTitle,
            phone: formData.phone
          });
          setShowDuplicateModal(true);
          return;
        }
      }

      // 1. Submit Candidate Info to ATS / Recruitment System
      await addCandidate({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        appliedJobId: selectedJob.id,
        jobTitle: resolvedJobTitle,
        stage: 'استلام الطلبات',
        rating: 5,
        notes: formData.notes,
        experienceYears: formData.experienceYears,
        photoUrl: formData.photoUrl || undefined,
        resumeUrl: formData.resumeUrl || formData.resumeName || undefined,
        resumeFile: formData.resumeFile || undefined,
        photoFile: formData.photoFile || undefined,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        maritalStatus: formData.maritalStatus,
        personalEmail: formData.personalEmail,
        nationalIdNumber: formData.nationalIdNumber
      });

      setSubmissionDetails({
        fullName: formData.fullName,
        jobTitle: resolvedJobTitle
      });

      setLastSubmissionInfo({
        fullName: formData.fullName,
        phone: formData.phone,
        jobTitle: resolvedJobTitle
      });

      // Send silent notification to backend if needed
      fetch('/api/notify/application-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          jobTitle: resolvedJobTitle
        })
      }).catch(err => console.log('Background dispatch processed:', err));

      setAppliedSuccess(true);
      setShowSuccessModal(true);
      setSelectedJob(null);
      setFormData({
        fullName: '',
        dateOfBirth: '',
        gender: '',
        maritalStatus: '',
        email: '',
        personalEmail: '',
        phone: '',
        nationalIdNumber: '',
        experienceYears: 2,
        notes: '',
        photoFile: null,
        resumeFile: null,
        photoUrl: '',
        resumeName: '',
        resumeUrl: ''
      });
    } catch (error: any) {
      console.error('Error submitting candidate application:', error);
      const errObj = error?.response?.data || error;
      const errText = String(errObj?.error || error?.message || error || '');
      if (errObj?.isDuplicate || errText.includes('لايمكن التقديم') || errText.includes('مسبقاً') || errText.includes('التقديم أكثر من مرة')) {
        const resolvedJobTitle = selectedJob ? (getTitleName(selectedJob.title) || selectedJob.title) : '';
        setDuplicateModalInfo({
          fullName: formData.fullName || 'السيد/ة المتقدم/ة',
          jobTitle: resolvedJobTitle,
          phone: formData.phone
        });
        setShowDuplicateModal(true);
      } else {
        alert(language === 'ar' ? 'حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.' : 'Error submitting application. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Public Top Navigation Bar - Brand + Theme & Language Switchers */}
      <div className={`p-4 sm:p-5 px-6 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-4 shadow-xl ${
        isDark ? 'bg-[#0a0c10]/95 border-white/10 backdrop-blur-md' : 'bg-white border-slate-200 shadow-md'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-2xl">work_history</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight font-['Inter',sans-serif]" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                VITAS<span className="text-teal-400">IRAQ</span>
              </span>
              <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                {t('بوابة التوظيف', 'Careers Portal')}
              </span>
            </div>
            <p className="text-[11px] font-medium" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('منظومة استقطاب الكفاءات والتقديم على الوظائف الشاغرة', 'Talent Acquisition & Career Opportunities')}
            </p>
          </div>
        </div>

        {/* Action Controls: Language & Theme Toggles */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switch Button */}
          <button
            onClick={toggleLanguage}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
              isDark 
                ? 'bg-[#1e293b] border-slate-700 text-white hover:bg-slate-700 hover:border-teal-400' 
                : 'bg-slate-100 border-slate-300 text-slate-900 hover:bg-slate-200'
            }`}
            title={language === 'ar' ? 'Switch to English' : 'التحويل إلى اللغة العربية'}
          >
            <span className="material-symbols-outlined text-base text-teal-400">translate</span>
            <span>{language === 'ar' ? 'English (EN)' : 'العربية (AR)'}</span>
          </button>

          {/* Theme Switch Button */}
          <button
            onClick={toggleTheme}
            className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
              isDark 
                ? 'bg-[#1e293b] border-slate-700 text-amber-300 hover:bg-slate-700 hover:border-amber-400' 
                : 'bg-slate-100 border-slate-300 text-indigo-700 hover:bg-slate-200'
            }`}
            title={isDark ? t('التحويل للوضع النهاري', 'Switch to Light Mode') : t('التحويل للوضع الليلي', 'Switch to Dark Mode')}
          >
            <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
            <span style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {isDark ? t('الوضع النهاري', 'Light Mode') : t('الوضع الليلي', 'Dark Mode')}
            </span>
          </button>
        </div>
      </div>

      {/* Top Banner / Header Bar */}
      <div className={`p-6 rounded-2xl border transition-all ${isDark ? 'bg-[#1e293b]/60 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {t('فرص العمل المفتوحة للتقديم', 'OPEN POSITIONS FOR APPLICATION')}
              </span>
            </div>
            <h2 className="text-xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {t('الوظائف الشاغرة المتاحة حالياً', 'Currently Available Job Openings')}
            </h2>
            <p className="text-xs font-normal mt-1" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
              {t('استعرض الوظائف وقدم طلبك للالتحاق بفريق مؤسسة فيتاس العراق', 'Explore vacancies and apply to join the VITAS Iraq team')}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border text-center ${isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-300 shadow-sm'}`}>
              <div className="text-lg font-bold text-teal-600 dark:text-teal-400 font-mono">{openVacancies.length}</div>
              <div className="text-[10px] font-bold" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('وظيفة مفتوحة', 'Open Jobs')}</div>
            </div>
            <div className={`px-4 py-2 rounded-xl border text-center ${isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-300 shadow-sm'}`}>
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono">{liveCandidates.length}</div>
              <div className="text-[10px] font-bold" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>{t('طلب مستلم', 'Applications')}</div>
            </div>
          </div>
        </div>

        {/* Filter Controls (Search + Dept) */}
        {openVacancies.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-300 dark:border-white/10">
            <div className="relative">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-500 text-lg">search</span>
              <input
                type="text"
                placeholder={t('البحث في الوظائف المفتوحة...', 'Search open positions...')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full pr-10 pl-4 py-2 text-xs font-bold rounded-xl outline-none border transition-all ${
                  isDark ? 'bg-[#0f172a] border-white/10 focus:border-teal-400' : 'bg-white border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            <div>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full px-3 py-2 text-xs font-bold rounded-xl outline-none border transition-all ${
                  isDark ? 'bg-[#0f172a] border-white/10 focus:border-teal-400' : 'bg-white border-slate-300 focus:border-teal-600'
                }`}
              >
                <option value="all">{t('جميع الأقسام والدوائر', 'All Departments')}</option>
                {uniqueDepartments.map((dept, idx) => (
                  <option key={idx} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Banner (Hidden as requested) */}
      {/*
      {appliedSuccess && lastSubmissionInfo && !showSuccessModal && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-4 animate-in fade-in duration-300 shadow-md">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-3xl text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">check_circle</span>
            <div>
              <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                {t('تم تقديم طلبك بنجاح وسُجل في قسم التوظيف!', 'Application Submitted Successfully!')}
              </div>
              <div className="text-xs font-normal mt-1 text-emerald-800 dark:text-emerald-300">
                {t(`المتقدم: ${lastSubmissionInfo.fullName} | الوظيفة: ${lastSubmissionInfo.jobTitle}`, `Applicant: ${lastSubmissionInfo.fullName} | Job: ${lastSubmissionInfo.jobTitle}`)}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowSuccessModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shrink-0 transition-all"
          >
            {t('عرض التفتيش والـتفاصيل', 'View Details')}
          </button>
        </div>
      )}
      */}

      {/* Open Job Cards Grid */}
      {filteredJobs.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-300 shadow-sm'}`}>
          <span className="material-symbols-outlined text-5xl text-slate-500 mb-3">work_off</span>
          <p className="font-bold text-sm" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
            {t('لا توجد وظائف مفتوحة للتقديم حالياً', 'No open vacancies available for application at the moment')}
          </p>
          <p className="text-xs mt-1 font-normal text-slate-500">
            {t('يرجى مراجعة الصفحة لاحقاً للاطلاع على الفرص الوظيفية المستجدة.', 'Please check back later for upcoming job opportunities.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredJobs.map(job => {
            const candidateCnt = getJobCandidatesCount(job.id);
            const titleDisplay = getTitleName(job.title) || job.title || t('وظيفة شاغرة', 'Job Opening');
            const deptDisplay = getDeptName(job.department) || job.department;
            const locDisplay = getBranchName(job.location) || job.location;
            const typeDisplay = job.type || 'Full-time';

            return (
              <div
                key={job.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-300 hover:shadow-xl ${
                  isDark ? 'bg-[#0f172a]/95 border-white/10 hover:border-teal-500/40' : 'bg-white border-slate-300 hover:border-teal-500/40 shadow-sm'
                }`}
              >
                <div>
                  {/* Card Header: Job Title & Open Badge */}
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <h3
                      className="text-lg font-bold leading-snug"
                      style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    >
                      {titleDisplay}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 shrink-0">
                      {t('مفتوحة', 'Open')}
                    </span>
                  </div>

                  {/* Meta Items List */}
                  <div className="space-y-2.5 text-xs font-normal mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-teal-600 dark:text-teal-400">domain</span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{deptDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-400">location_on</span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{locDisplay}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-purple-600 dark:text-purple-400">work</span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{typeDisplay}</span>
                    </div>
                  </div>

                  {/* Horizontal Divider */}
                  <div className="border-t border-slate-300 dark:border-white/10 my-3"></div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between text-xs font-bold mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-amber-500">group</span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{candidateCnt} {t('مرشح', 'candidates')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-indigo-500">timeline</span>
                      <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{job.experienceYears || 2} {t('سنوات خبرة', 'years exp')}</span>
                    </div>
                  </div>

                  {/* Deadline Box */}
                  {job.deadline && (
                    <div className={`flex items-center gap-2 text-xs font-bold mb-3 p-3 rounded-xl border ${
                      isDark ? 'bg-slate-800/80 border-white/10' : 'bg-slate-100 border-slate-300'
                    }`}>
                      <span className="material-symbols-outlined text-sm text-rose-600 dark:text-rose-400">event</span>
                      <span style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('آخر موعد للتقديم:', 'Deadline:')} {formatDateOnly(job.deadline)}</span>
                    </div>
                  )}

                  {/* Requirements Snippet */}
                  {job.requirements && (
                    <div className={`p-3.5 rounded-xl text-xs mb-3 border ${
                      isDark ? 'bg-slate-800/80 border-white/10' : 'bg-slate-100 border-slate-300'
                    }`}>
                      <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-1">
                        {t('المتطلبات والمهارات', 'REQUIREMENTS')}
                      </div>
                      <p className="whitespace-pre-line leading-relaxed text-[11px] font-normal" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>
                        {job.requirements}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="pt-3 border-t border-slate-300 dark:border-white/10">
                  <button
                    onClick={() => setSelectedJob(job)}
                    style={{ color: '#ffffff' }}
                    className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>{t('تقديم طلب الآن', 'Apply Now')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Application Form Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between mb-6 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
              <div>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('استمارة التقديم على وظيفة', 'Apply for Position')}
                </h3>
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                  {getTitleName(selectedJob.title) || selectedJob.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitApplication}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <span>{t('جاري التقديم...', 'Submitting...')}</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>{t('إرسال', 'Submit')}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitApplication} className="space-y-4 text-xs font-normal">
              {/* Personal Photo & Resume Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700">
                <div>
                  <label className="block font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الصورة الشخصية', 'Personal Photo')}:
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border flex items-center justify-center overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                      {formData.photoUrl ? (
                        <img src={formData.photoUrl} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-2xl text-slate-400">person</span>
                      )}
                    </div>
                    <label className="cursor-pointer py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">upload</span>
                      <span>{t('رفع الصورة', 'Upload Photo')}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('السيرة الذاتية (CV)', 'Resume / CV')}: *
                  </label>
                  <label className="cursor-pointer w-full p-2.5 rounded-xl border border-dashed border-teal-500 hover:border-teal-400 bg-teal-500/10 flex items-center justify-center gap-2 transition-all">
                    <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">description</span>
                    <span className="font-bold text-teal-700 dark:text-white">
                      {formData.resumeName || t('اختيار ملف السيرة الذاتية (PDF/DOC)', 'Select CV File (PDF/DOC)')}
                    </span>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Personal Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('الاسم الثلاثي الكامل', 'Full Name')}: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('أدخل اسمك الكامل كما في الهوية...', 'Enter your full name...')}
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('تاريخ الميلاد', 'Date of Birth')}:
                  </label>
                  <input
                    type="text"
                    placeholder="--/--/----"
                    value={formData.dateOfBirth}
                    onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
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
                    value={formData.gender}
                    onChange={e => setFormData({ ...formData, gender: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
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
                    value={formData.maritalStatus}
                    onChange={e => setFormData({ ...formData, maritalStatus: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  >
                    <option value="">{t('اختر الحالة', 'Select Status')}</option>
                    <option value="أعزب">{t('أعزب / عزباء', 'Single')}</option>
                    <option value="متزوج">{t('متزوج / متزوجة', 'Married')}</option>
                    <option value="مطلق">{t('مطلق / مطلقة', 'Divorced')}</option>
                    <option value="أرمل">{t('أرمل / أرملة', 'Widow')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('البريد الإلكتروني', 'Email Address')}: *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="example@domain.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('رقم الهاتف (الواتساب)', 'Phone / WhatsApp')}: *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="07700000000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('رقم البطاقة الوطنية / الهوية', 'National ID Number')}:
                  </label>
                  <input
                    type="text"
                    placeholder="199512345678"
                    value={formData.nationalIdNumber}
                    onChange={e => setFormData({ ...formData, nationalIdNumber: e.target.value })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('عدد سنوات الخبرة', 'Years of Experience')}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={formData.experienceYears}
                    onChange={e => setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                      isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('نبذة مختارة أو ملاحظات إضافية', 'Cover Letter / Additional Notes')}:
                </label>
                <textarea
                  rows={3}
                  placeholder={t('اكتب نبذة مختصرة عن مؤهلاتك وخبراتك الفنية...', 'Write a short summary of your qualifications...')}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all resize-none ${
                    isDark ? 'bg-[#1e293b] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submission Success Pop-up Modal */}
      {showSuccessModal && submissionDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all text-center relative animate-in zoom-in-95 duration-300 ${
            isDark ? 'bg-[#0f172a] border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 animate-bounce">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>

            <h3 className="text-xl font-bold mb-2 text-emerald-500 dark:text-emerald-400">
              {t('تم استلام طلبك بنجاح!', 'Application Submitted Successfully!')}
            </h3>

            <p className="text-xs text-slate-300 dark:text-slate-300 mb-6 leading-relaxed">
              {t(
                'تم تسجيل طلب التقديم بنجاح وحفظ بياناتك في قسم التوظيف لدى مؤسسة فيتاس العراق. سيقوم فريق الموارد البشرية بمراجعة ملفك والتواصل معك قريباً.',
                'Your job application has been successfully submitted to VITAS Iraq HR department. Our team will review your qualifications and contact you soon.'
              )}
            </p>

            <div className={`p-4 rounded-2xl border text-right mb-6 text-xs space-y-2.5 ${
              isDark ? 'bg-[#1e293b]/70 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/40">
                <span className="text-slate-400 font-normal">{t('اسم المتقدم:', 'Applicant Name:')}</span>
                <span className="font-bold">{submissionDetails.fullName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/40">
                <span className="text-slate-400 font-normal">{t('الوظيفة المتقدم عليها:', 'Job Title:')}</span>
                <span className="font-bold text-teal-400">{submissionDetails.jobTitle}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400 font-normal">{t('حالة الطلب:', 'Application Status:')}</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[10px]">
                  {t('مُستلَم - قيد الفحص والمراجعة', 'Received - Under Review')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('إغلاق', 'Close')}
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Application Warning Pop-up Modal */}
      {showDuplicateModal && duplicateModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl transition-all text-center relative animate-in zoom-in-95 duration-300 ${
            isDark ? 'bg-[#0f172a] border-amber-500/30 text-white' : 'bg-white border-amber-300 text-slate-900'
          }`}>
            <button
              onClick={() => setShowDuplicateModal(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-500 animate-bounce">
              <span className="material-symbols-outlined text-4xl">person_alert</span>
            </div>

            <h3 className="text-lg font-bold mb-2 text-amber-500 dark:text-amber-400">
              {t('لقد قدمت على هذه الوظيفة مسبقاً!', 'Already Applied for This Position!')}
            </h3>

            <p className="text-sm font-semibold text-slate-200 dark:text-slate-200 mb-6 leading-relaxed">
              {t(
                `السيد/ة ${duplicateModalInfo.fullName}، لايمكن التقديم لنفس الوظيفة اكثر من مرة واحدة. شكرا لتفهمك`,
                `Dear ${duplicateModalInfo.fullName}, you cannot apply for the same job more than once. Thank you for your understanding.`
              )}
            </p>

            <div className={`p-4 rounded-2xl border text-right mb-6 text-xs space-y-2.5 ${
              isDark ? 'bg-[#1e293b]/70 border-white/10' : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/40">
                <span className="text-slate-400 font-normal">{t('الوظيفة الشاغرة:', 'Applied Job:')}</span>
                <span className="font-bold text-amber-400">{duplicateModalInfo.jobTitle}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/40">
                <span className="text-slate-400 font-normal">{t('رقم الهاتف المسجل:', 'Registered Phone:')}</span>
                <span className="font-bold font-mono">{duplicateModalInfo.phone}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-400 font-normal">{t('تعليمات النظام:', 'System Rules:')}</span>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                  {t('يُسمح بتقديم طلب واحد فقط لكل وظيفة', 'One Application Allowed Per Position')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowDuplicateModal(false)}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('حسنًا، فهمت', 'OK, Got It')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};