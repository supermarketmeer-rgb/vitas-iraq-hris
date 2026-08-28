import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { JobVacancy } from '../../types';
import { api } from '../../api/client';

const DEPT_MAP: Record<string, { ar: string; en: string }> = {
  'إدارة التمويل الأصغر والعمليات': { ar: 'إدارة التمويل الأصغر والعمليات', en: 'Microfinance & Operations' },
  'Microfinance & Operations': { ar: 'إدارة التمويل الأصغر والعمليات', en: 'Microfinance & Operations' },
  'القروض والائتمان': { ar: 'القروض والائتمان', en: 'Loans & Credit' },
  'Loans & Credit': { ar: 'القروض والائتمان', en: 'Loans & Credit' },
  'الاستحصال والتحصيل': { ar: 'الاستحصال والتحصيل', en: 'Collection & Recovery' },
  'Collection & Recovery': { ar: 'الاستحصال والتحصيل', en: 'Collection & Recovery' },
  'الموارد البشرية': { ar: 'الموارد البشرية', en: 'Human Resources' },
  'Human Resources': { ar: 'الموارد البشرية', en: 'Human Resources' },
  'التقنية والأنظمة': { ar: 'التقنية والأنظمة', en: 'IT & Systems' },
  'IT & Systems': { ar: 'التقنية والأنظمة', en: 'IT & Systems' },
  'المالية والمحاسبة': { ar: 'المالية والمحاسبة', en: 'Finance & Accounting' },
  'Finance & Accounting': { ar: 'المالية والمحاسبة', en: 'Finance & Accounting' },
  'العمليات': { ar: 'العمليات', en: 'Operations' },
  'Operations': { ar: 'العمليات', en: 'Operations' },
  'التسويق والمبيعات': { ar: 'التسويق والمبيعات', en: 'Marketing & Sales' },
  'Marketing & Sales': { ar: 'التسويق والمبيعات', en: 'Marketing & Sales' },
};

const BRANCH_MAP: Record<string, { ar: string; en: string }> = {
  'فرع بغداد - الكرادة': { ar: 'فرع بغداد - الكرادة', en: 'Baghdad - Karrada Branch' },
  'Baghdad - Karrada Branch': { ar: 'فرع بغداد - الكرادة', en: 'Baghdad - Karrada Branch' },
  'فرع بغداد - المنصور': { ar: 'فرع بغداد - المنصور', en: 'Baghdad - Mansour Branch' },
  'Baghdad - Mansour Branch': { ar: 'فرع بغداد - المنصور', en: 'Baghdad - Mansour Branch' },
  'فرع البصرة': { ar: 'فرع البصرة', en: 'Basra Branch' },
  'Basra Branch': { ar: 'فرع البصرة', en: 'Basra Branch' },
  'فرع البصرة - الجمهورية': { ar: 'فرع البصرة - الجمهورية', en: 'Basra - Republic Branch' },
  'Basra - Republic Branch': { ar: 'فرع البصرة - الجمهورية', en: 'Basra - Republic Branch' },
  'فرع ذي قار': { ar: 'فرع ذي قار', en: 'Dhi Qar Branch' },
  'Dhi Qar Branch': { ar: 'فرع ذي قار', en: 'Dhi Qar Branch' },
  'فرع ميسان': { ar: 'فرع ميسان', en: 'Maysan Branch' },
  'Maysan Branch': { ar: 'فرع ميسان', en: 'Maysan Branch' },
  'فرع المثنى': { ar: 'فرع المثنى', en: 'Muthanna Branch' },
  'Muthanna Branch': { ar: 'فرع المثنى', en: 'Muthanna Branch' },
  'فرع القادسية': { ar: 'فرع القادسية', en: 'Qadisiyah Branch' },
  'Qadisiyah Branch': { ar: 'فرع القادسية', en: 'Qadisiyah Branch' },
  'فرع ديالى': { ar: 'فرع ديالى', en: 'Diyala Branch' },
  'Diyala Branch': { ar: 'فرع ديالى', en: 'Diyala Branch' },
  'فرع صلاح الدين': { ar: 'فرع صلاح الدين', en: 'Salahuddin Branch' },
  'Salahuddin Branch': { ar: 'فرع صلاح الدين', en: 'Salahuddin Branch' },
  'فرع الأنبار': { ar: 'فرع الأنبار', en: 'Anbar Branch' },
  'Anbar Branch': { ar: 'فرع الأنبار', en: 'Anbar Branch' },
  'فرع كركوك': { ar: 'فرع كركوك', en: 'Kirkuk Branch' },
  'Kirkuk Branch': { ar: 'فرع كركوك', en: 'Kirkuk Branch' },
  'فرع نينوى': { ar: 'فرع نينوى', en: 'Nineveh Branch' },
  'Nineveh Branch': { ar: 'فرع نينوى', en: 'Nineveh Branch' },
  'فرع بابل': { ar: 'فرع بابل', en: 'Babil Branch' },
  'Babil Branch': { ar: 'فرع بابل', en: 'Babil Branch' },
  'فرع واسط': { ar: 'فرع واسط', en: 'Wasit Branch' },
  'Wasit Branch': { ar: 'فرع واسط', en: 'Wasit Branch' },
};

const TYPE_MAP: Record<string, { ar: string; en: string }> = {
  'دوام كامل': { ar: 'دوام كامل', en: 'Full-time' },
  'Full-time': { ar: 'دوام كامل', en: 'Full-time' },
  'دوام جزئي': { ar: 'دوام جزئي', en: 'Part-time' },
  'Part-time': { ar: 'دوام كامل', en: 'Part-time' },
  'عقد': { ar: 'عقد', en: 'Contract' },
  'Contract': { ar: 'عقد', en: 'Contract' }
};

const STATUS_MAP: Record<string, { ar: string; en: string }> = {
  'مفتوحة': { ar: 'مفتوحة', en: 'Open' },
  'Open': { ar: 'مفتوحة', en: 'Open' },
  'مغلقة': { ar: 'مغلقة', en: 'Closed' },
  'Closed': { ar: 'مغلقة', en: 'Closed' }
};

export const JobOpenings: React.FC = () => {
  const { jobVacancies, addJobVacancy, updateJobVacancy, deleteJobVacancy, candidates, t, language, theme } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Closed' | 'مفتوحة' | 'مغلقة'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showEditJobModal, setShowEditJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<JobVacancy | null>(null);
  
  // Settings API Data
  const [positions, setPositions] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const isDark = theme === 'dark';

  // Load Settings Data dynamically (Positions, Branches/Locations, Departments)
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
      console.error('Error loading settings data in JobOpenings:', error);
    }
  };

  useEffect(() => {
    loadSettingsData();
    const interval = setInterval(loadSettingsData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic Branches / Locations from Settings
  const branchesList = branches.length > 0
    ? branches.map(b => ({
        id: b.id,
        ar: b.name_ar || b.name,
        en: b.name_en || b.name_ar || b.name
      }))
    : [
        { id: 1, ar: 'بغداد_المنصور', en: 'Mansour' },
        { id: 2, ar: 'البصرة', en: 'Bassrah' },
        { id: 3, ar: 'اربيل', en: 'Erbil' },
        { id: 4, ar: 'النجف', en: 'Najaf' },
        { id: 5, ar: 'كربلاء', en: 'Karbala' }
      ];

  // Dynamic Departments from Settings
  const departmentsList = departments.length > 0
    ? departments.map(d => ({
        id: d.id,
        ar: d.name_ar || d.name,
        en: d.name_en || d.name_ar || d.name
      }))
    : [
        { id: 1, ar: 'قسم الائتمان', en: 'Credit' },
        { id: 2, ar: 'تكنولوجيا المعلوماات', en: 'IT' },
        { id: 3, ar: 'الأمن', en: 'Security' },
        { id: 4, ar: 'المشتريات والتسهيلات', en: 'Procurement&Facilities' },
        { id: 5, ar: 'قسم الخزينة', en: 'Treasury' }
      ];

  // Helper localization functions
  const getBranchName = (val: string) => {
    if (!val) return '';
    const match = branches.find(b =>
      b.name_ar === val || b.name_en === val || b.name === val || String(b.id) === String(val)
    );
    if (match) {
      if (language === 'en') return match.name_en || match.name_ar || match.name || val;
      return match.name_ar || match.name || match.name_en || val;
    }
    return BRANCH_MAP[val]?.[language] || val;
  };

  const getDeptName = (val: string) => {
    if (!val) return '';
    const match = departments.find(d =>
      d.name_ar === val || d.name_en === val || d.name === val || String(d.id) === String(val)
    );
    if (match) {
      if (language === 'en') return match.name_en || match.name_ar || match.name || val;
      return match.name_ar || match.name || match.name_en || val;
    }
    return DEPT_MAP[val]?.[language] || val;
  };

  const getTypeName = (val: string) => TYPE_MAP[val]?.[language] || val;
  const getStatusName = (val: string) => STATUS_MAP[val]?.[language] || val;

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

  // Form state
  const [jobForm, setJobForm] = useState({
    title: '',
    department: 'قسم الائتمان',
    location: 'بغداد_المنصور',
    type: 'دوام كامل' as JobVacancy['type'],
    status: 'مفتوحة' as JobVacancy['status'],
    experienceYears: 2,
    requirements: '',
    deadline: ''
  });

  // Dynamic job titles list from Settings positions table
  const jobTitlesList = positions.length > 0 
    ? positions.map(p => ({
        id: p.id,
        nameAr: p.name_ar || p.name,
        nameEn: p.name_en || p.name_ar || p.name
      }))
    : [
        { id: 1, nameAr: 'مسؤول قروض', nameEn: 'loan officer' },
        { id: 2, nameAr: 'امين صندوق', nameEn: 'teller' }
      ];

  const jobTypesList = [
    { val: 'دوام كامل', ar: 'دوام كامل', en: 'Full-time' },
    { val: 'دوام جزئي', ar: 'دوام جزئي', en: 'Part-time' },
    { val: 'عقد', ar: 'عقد', en: 'Contract' }
  ];

  const jobStatusesList = [
    { val: 'مفتوحة', ar: 'مفتوحة', en: 'Open' },
    { val: 'مغلقة', ar: 'مغلقة', en: 'Closed' }
  ];

  // Dynamically combine jobVacancies from AppContext & Settings positions
  const syncedJobVacancies: JobVacancy[] = React.useMemo(() => {
    const map = new Map<string, JobVacancy>();

    const defaultLocation = branchesList[0]?.ar || 'بغداد_المنصور';
    const defaultDepartment = departmentsList[0]?.ar || 'قسم الائتمان';

    // 1. Add all explicit job vacancies from AppContext / DB
    jobVacancies.forEach(job => {
      if (job && job.id) {
        map.set(String(job.id), {
          ...job,
          location: job.location || defaultLocation,
          department: job.department || defaultDepartment
        });
      }
    });

    // 2. Map Settings positions
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
  }, [positions, jobVacancies, branchesList, departmentsList]);

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

  useEffect(() => {
    // Automatically close any open jobs past 16:00 (4:00 PM) deadline cutoff
    syncedJobVacancies.forEach(job => {
      if ((job.status === 'مفتوحة' || job.status === 'Open') && job.deadline && isJobExpiredAtCutoff(job.deadline)) {
        updateJobVacancy(job.id, { status: 'مغلقة' });
      }
    });
  }, [syncedJobVacancies]);

  const filteredJobs = syncedJobVacancies.filter(job => {
    // Status filter
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter || getStatusName(job.status) === getStatusName(statusFilter);
    if (!matchesStatus) return false;

    // Search query filter across title, department, location, requirements
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const titleAr = getTitleName(job.title).toLowerCase();
    const titleRaw = (job.title || '').toLowerCase();
    const dept = getDeptName(job.department).toLowerCase();
    const loc = getBranchName(job.location).toLowerCase();
    const req = (job.requirements || '').toLowerCase();

    return titleAr.includes(q) || titleRaw.includes(q) || dept.includes(q) || loc.includes(q) || req.includes(q);
  });

  const handleAddJob = (e: React.FormEvent) => {
    e.preventDefault();
    addJobVacancy({
      ...jobForm,
      deadline: formatDateOnly(jobForm.deadline)
    });
    setJobForm({
      title: '',
      department: departmentsList[0]?.ar || 'قسم الائتمان',
      location: branchesList[0]?.ar || 'بغداد_المنصور',
      type: 'دوام كامل',
      status: 'مفتوحة',
      experienceYears: 2,
      requirements: '',
      deadline: ''
    });
    setShowAddJobModal(false);
  };

  const handleEditJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingJob) {
      updateJobVacancy(editingJob.id, {
        ...jobForm,
        deadline: formatDateOnly(jobForm.deadline)
      });
      setShowEditJobModal(false);
      setEditingJob(null);
      setJobForm({
        title: '',
        department: departmentsList[0]?.ar || 'قسم الائتمان',
        location: branchesList[0]?.ar || 'بغداد_المنصور',
        type: 'دوام كامل',
        status: 'مفتوحة',
        experienceYears: 2,
        requirements: '',
        deadline: ''
      });
    }
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm(t('هل أنت متأكد من حذف هذه الوظيفة؟ سيتم حذف جميع المرشحين المرتبطين بها.', 'Are you sure you want to delete this job? All associated candidates will be deleted.'))) {
      deleteJobVacancy(jobId);
    }
  };

  const openEditModal = (job: JobVacancy) => {
    setEditingJob(job);
    
    // Find matching title in positions list or use saved title
    const matchedPos = positions.find(p => 
      p.name_ar === job.title || p.name_en === job.title || p.name === job.title
    );
    const resolvedTitle = matchedPos ? (matchedPos.name_ar || matchedPos.name) : job.title;

    setJobForm({
      title: resolvedTitle,
      department: job.department || departmentsList[0]?.ar || 'قسم الائتمان',
      location: job.location || branchesList[0]?.ar || 'بغداد_المنصور',
      type: (job.type || 'دوام كامل') as JobVacancy['type'],
      status: (job.status || 'مغلقة') as JobVacancy['status'],
      experienceYears: job.experienceYears || 0,
      requirements: job.requirements || '',
      deadline: formatDateOnly(job.deadline || '')
    });
    setShowEditJobModal(true);
  };

  const handleStatusChange = (jobId: string, newStatus: JobVacancy['status']) => {
    updateJobVacancy(jobId, { status: newStatus });
  };

  const getCandidatesCount = (jobId: string) => {
    if (!candidates || candidates.length === 0) return 0;

    const selId = String(jobId || '');
    const cleanSelId = selId.replace('pos-', '');
    const matchedJob = syncedJobVacancies.find(j => String(j.id) === selId || String(j.id) === cleanSelId || String(j.id) === `pos-${cleanSelId}`);
    const jobTitleLower = (matchedJob?.title || '').toLowerCase().trim();

    return candidates.filter(c => {
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

  const getStatusBadge = (status: JobVacancy['status']) => {
    const isClosed = status === 'Closed' || status === 'مغلقة';
    return (
      <div className={`px-3 py-1 rounded-full text-xs font-bold ${
        isClosed ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
      }`}>
        {getStatusName(status)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('إدارة الوظائف الشاغرة', 'Job Openings Management')}</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('إنشاء وإدارة الوظائف الشاغرة ومتابعة المتقدمين بالمواقع والمسميات المزامنة مع الإعدادات', 'Manage job openings synced with Settings locations and positions')}
          </p>
        </div>

        <button
          onClick={() => {
            setJobForm({
              title: jobTitlesList[0]?.nameAr || '',
              department: departmentsList[0]?.ar || 'قسم الائتمان',
              location: branchesList[0]?.ar || 'بغداد_المنصور',
              type: 'دوام كامل',
              status: 'مغلقة',
              experienceYears: 2,
              requirements: '',
              deadline: ''
            });
            setShowAddJobModal(false);
            setShowAddJobModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {t('إضافة وظيفة جديدة', 'Add New Job')}
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['all', 'مفتوحة', 'مغلقة'].map(filter => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25'
                  : isDark 
                    ? 'bg-[#1e293b] border border-slate-700 text-slate-300 hover:bg-[#334155]'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
            >
              {filter === 'all' ? t('الكل', 'All') : getStatusName(filter)}
            </button>
          ))}
        </div>

        {/* Dynamic Job Search Field */}
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('البحث عن وظيفة (المسمى، القسم، الموقع...)...', 'Search jobs (title, dept, location...)...')}
            className={`w-full pr-10 pl-8 py-2 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
              isDark 
                ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-sm'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
              title={t('مسح البحث', 'Clear Search')}
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Job Cards Grid (4 Cards Per Row on Desktop Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredJobs.map(job => {
          const candidatesCount = getCandidatesCount(job.id);
          const displayTitle = getTitleName(job.title);
          const displayDept = getDeptName(job.department);
          const displayLoc = getBranchName(job.location);
          const displayType = getTypeName(job.type);

          return (
            <div key={job.id} className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
              isDark 
                ? 'bg-[#111827] border-white/10 text-white hover:border-teal-500/40 shadow-lg' 
                : 'bg-white border-slate-200 text-slate-900 hover:border-teal-500/40 shadow-md'
            }`}>
              <div>
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-black mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{displayTitle}</h3>
                    <div className="space-y-1.5 text-xs font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-teal-600 dark:text-teal-400">business</span>
                        <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{displayDept}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-400">location_on</span>
                        <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{displayLoc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-purple-600 dark:text-purple-400">work</span>
                        <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{displayType}</span>
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <div className={`flex items-center justify-between mb-4 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>
                  <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                    <span className="material-symbols-outlined text-base text-amber-500">group</span>
                    <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{candidatesCount} {t('مرشح', 'candidates')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
                    <span className="material-symbols-outlined text-base text-indigo-500">timeline</span>
                    <span style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>{job.experienceYears} {t('سنوات خبرة', 'years exp')}</span>
                  </div>
                </div>

                {job.deadline && (
                  <div className={`flex items-center gap-2 text-xs font-bold mb-4 p-2.5 rounded-xl border ${
                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-300'
                  }`}>
                    <span className="material-symbols-outlined text-sm text-rose-600 dark:text-rose-400">event</span>
                    <span style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('آخر موعد للتقديم', 'Deadline')}: {formatDateOnly(job.deadline)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <select
                  value={(job.status === 'Open' || job.status === 'مفتوحة') ? 'مفتوحة' : 'مغلقة'}
                  onChange={(e) => handleStatusChange(job.id, e.target.value as JobVacancy['status'])}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-slate-200' 
                      : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="مفتوحة">{t('مفتوحة', 'Open')}</option>
                  <option value="مغلقة">{t('مغلقة', 'Closed')}</option>
                </select>

                <button
                  onClick={() => openEditModal(job)}
                  className={`p-2 rounded-xl border transition-all ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700' 
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title={t('تعديل الوظيفة', 'Edit Job')}
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className={`col-span-full py-12 text-center rounded-2xl border ${
            isDark ? 'bg-[#111827] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500 shadow-md'
          }`}>
            <span className="material-symbols-outlined text-6xl text-slate-500 mb-4">work_off</span>
            <p className="text-slate-500">{t('لا توجد وظائف شاغرة حالياً', 'No job openings available')}</p>
          </div>
        )}
      </div>

      {/* Add Job Modal - Fully Theme Aware (Light vs Dark) */}
      {showAddJobModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Top Modal Header with Action Buttons */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 sticky top-0 z-10 ${
              isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">work</span>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إضافة وظيفة جديدة', 'Add New Job')}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>

                <button
                  type="submit"
                  form="add-job-modal-form"
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">check</span>
                  <span>{t('إضافة الوظيفة', 'Add Job')}</span>
                </button>
              </div>
            </div>

            <form id="add-job-modal-form" onSubmit={handleAddJob} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('المسمى الوظيفي (المسميات المعرفة بالإعدادات)', 'Job Title (Positions in Settings)')}</label>
                <select
                  value={jobForm.title}
                  onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                >
                  <option value="">{t('اختر المسمى الوظيفي', 'Select Job Title')}</option>
                  {jobTitlesList.map(j => (
                    <option key={j.id} value={j.nameAr}>
                      {language === 'en' ? j.nameEn : j.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('القسم (الأقسام المعرفة بالإعدادات)', 'Department (Departments in Settings)')}</label>
                <select
                  value={jobForm.department}
                  onChange={(e) => setJobForm({...jobForm, department: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                >
                  {departmentsList.map(dept => (
                    <option key={dept.id || dept.ar} value={dept.ar}>
                      {language === 'en' ? dept.en : dept.ar}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('الفرع / الموقع (المواقع المعرفة بالإعدادات)', 'Branch / Location (Locations in Settings)')}</label>
                <select
                  value={jobForm.location}
                  onChange={(e) => setJobForm({...jobForm, location: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                >
                  {branchesList.map(branch => (
                    <option key={branch.id || branch.ar} value={branch.ar}>
                      {language === 'en' ? branch.en : branch.ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('نوع الوظيفة', 'Job Type')}</label>
                  <select
                    value={jobForm.type}
                    onChange={(e) => setJobForm({...jobForm, type: e.target.value as JobVacancy['type']})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  >
                    {jobTypesList.map(tItem => (
                      <option key={tItem.val} value={tItem.val}>
                        {language === 'en' ? tItem.en : tItem.ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('سنوات الخبرة المطلوبة', 'Required Experience')}</label>
                  <input
                    type="number"
                    value={jobForm.experienceYears}
                    onChange={(e) => setJobForm({...jobForm, experienceYears: parseInt(e.target.value) || 0})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('الحالة', 'Status')}</label>
                  <select
                    value={jobForm.status}
                    onChange={(e) => setJobForm({...jobForm, status: e.target.value as JobVacancy['status']})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  >
                    {jobStatusesList.map(sItem => (
                      <option key={sItem.val} value={sItem.val}>
                        {language === 'en' ? sItem.en : sItem.ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('آخر موعد للتقديم', 'Deadline')}</label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm({...jobForm, deadline: e.target.value})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('المتطلبات والمؤهلات', 'Requirements')}</label>
                <textarea
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({...jobForm, requirements: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  rows={3}
                  placeholder={t('اكتب المتطلبات والمؤهلات المطلوبة...', 'Write requirements...')}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Modal - Fully Theme Aware */}
      {showEditJobModal && editingJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Top Modal Header with Action Buttons */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 sticky top-0 z-10 ${
              isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">work</span>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('تعديل الوظيفة', 'Edit Job')}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditJobModal(false);
                    setEditingJob(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>

                <button
                  type="submit"
                  form="edit-job-modal-form"
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs">check</span>
                  <span>{t('حفظ التغييرات', 'Save Changes')}</span>
                </button>
              </div>
            </div>

            <form id="edit-job-modal-form" onSubmit={handleEditJob} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('المسمى الوظيفي', 'Job Title')}</label>
                <select
                  value={jobForm.title}
                  onChange={(e) => setJobForm({...jobForm, title: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                >
                  {jobTitlesList.map(j => (
                    <option key={j.id} value={j.nameAr}>
                      {language === 'en' ? j.nameEn : j.nameAr}
                    </option>
                  ))}
                  {jobForm.title && !jobTitlesList.some(j => j.nameAr === jobForm.title || j.nameEn === jobForm.title) && (
                    <option value={jobForm.title}>{jobForm.title}</option>
                  )}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('القسم', 'Department')}</label>
                <select
                  value={jobForm.department}
                  onChange={(e) => setJobForm({...jobForm, department: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                >
                  {departmentsList.map(dept => (
                    <option key={dept.id || dept.ar} value={dept.ar}>
                      {language === 'en' ? dept.en : dept.ar}
                    </option>
                  ))}
                  {jobForm.department && !departmentsList.some(d => d.ar === jobForm.department || d.en === jobForm.department) && (
                    <option value={jobForm.department}>{jobForm.department}</option>
                  )}
                </select>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('الفرع / الموقع', 'Branch / Location')}</label>
                <select
                  value={jobForm.location}
                  onChange={(e) => setJobForm({...jobForm, location: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  required
                >
                  {branchesList.map(branch => (
                    <option key={branch.id || branch.ar} value={branch.ar}>
                      {language === 'en' ? branch.en : branch.ar}
                    </option>
                  ))}
                  {jobForm.location && !branchesList.some(b => b.ar === jobForm.location || b.en === jobForm.location) && (
                    <option value={jobForm.location}>{jobForm.location}</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('نوع الوظيفة', 'Job Type')}</label>
                  <select
                    value={jobForm.type}
                    onChange={(e) => setJobForm({...jobForm, type: e.target.value as JobVacancy['type']})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  >
                    {jobTypesList.map(tItem => (
                      <option key={tItem.val} value={tItem.val}>
                        {language === 'en' ? tItem.en : tItem.ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('سنوات الخبرة المطلوبة', 'Required Experience')}</label>
                  <input
                    type="number"
                    value={jobForm.experienceYears}
                    onChange={(e) => setJobForm({...jobForm, experienceYears: parseInt(e.target.value) || 0})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('الحالة', 'Status')}</label>
                  <select
                    value={jobForm.status}
                    onChange={(e) => setJobForm({...jobForm, status: e.target.value as JobVacancy['status']})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  >
                    {jobStatusesList.map(sItem => (
                      <option key={sItem.val} value={sItem.val}>
                        {language === 'en' ? sItem.en : sItem.ar}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('آخر موعد للتقديم', 'Deadline')}</label>
                  <input
                    type="date"
                    value={jobForm.deadline}
                    onChange={(e) => setJobForm({...jobForm, deadline: e.target.value})}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all border ${
                      isDark 
                        ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('المتطلبات والمؤهلات', 'Requirements')}</label>
                <textarea
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm({...jobForm, requirements: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none border ${
                    isDark 
                      ? 'bg-[#1e293b] border-slate-700 text-white placeholder-slate-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                  rows={3}
                  placeholder={t('اكتب المتطلبات والمؤهلات المطلوبة...', 'Write requirements...')}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
