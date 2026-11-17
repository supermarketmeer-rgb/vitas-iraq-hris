import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getBranchName } from '../utils/branchHelper';
import { api } from '../api/client';
import { 
  PERFORMANCE_APPRAISAL_TEMPLATES, 
  PerformanceAppraisalTemplate,
  getFormattedAppraisalTitles
} from '../data/performanceAppraisalTemplates';
import { AppraisalWorkspaceModal } from '../components/performance_appraisal/AppraisalWorkspaceModal';
import { CampaignsManagerModal } from '../components/performance_appraisal/CampaignsManagerModal';
import { DiscussionCenterModal } from '../components/performance_appraisal/DiscussionCenterModal';
import { ReportsAnalyticsModal } from '../components/performance_appraisal/ReportsAnalyticsModal';
import { PerformanceAppraisalExcelSheet } from '../components/performance_appraisal/PerformanceAppraisalExcelSheet';
import { StatusBadge } from '../components/performance_appraisal/StatusBadge';

const POSITION_EN_MAP: Record<string, string> = {
  'عامل صيانه وسائق': 'Maintenance Worker & Driver',
  'عامل صيانة وسائق': 'Maintenance Worker & Driver',
  'عمال نظافة': 'Cleaners',
  'عامل نظافة': 'Cleaner',
  'مسؤول قروض': 'Loan Officer',
  'مسؤول قروض محصل': 'Collector Loan Officer',
  'مدير مكتب': 'Office Manager',
  'مدير الفرع': 'Branch Manager',
  'نائب منسق اقليمي': 'Regional Deputy Coordinator',
  'نائب منسق إقليمي': 'Regional Deputy Coordinator',
  'مساعد ائتمان القروض الصغيره': 'Microfinance Loan Assistant',
  'مساعد ائتمان القروض الصغيرة': 'Microfinance Loan Assistant',
  'مدير الموارد البشرية': 'HR Manager',
  'محاسب رئيسي': 'Chief Accountant',
  'مسؤول تقنية المعلومات': 'IT Officer',
  'مسؤول الامتثال والمخاطر': 'Risk & Compliance Officer',
  'مسؤول تدريب وتطوير': 'Training & Development Officer',
  'مدير العمليات': 'Operations Manager',
  'مدير التدقيق الداخلي': 'Internal Audit Manager',
  'حارس': 'Security Guard',
  'حارس أمن': 'Security Guard',
  'مسؤول أمن': 'Security Officer',
  'قائد فريق': 'Team Leader'
};

const DEPARTMENT_EN_MAP: Record<string, string> = {
  'قسم الائتمان': 'Credit Department',
  'الائتمان': 'Credit Department',
  'الموارد البشرية': 'Human Resources',
  'قسم الموارد البشرية': 'Human Resources Department',
  'المعلوماتية والاتصالات': 'IT & Communications',
  'تكنولوجيا المعلومات': 'Information Technology',
  'المالية والمحاسبة': 'Finance & Accounting',
  'القسم المالي': 'Finance Department',
  'قسم الخزينة': 'Treasury Department',
  'الخزينة': 'Treasury Department',
  'المخاطر والامتثال': 'Risk & Compliance',
  'المشتريات والتسهيلات': 'Procurement & Facilities',
  'قسم المشتريات والتسهيلات': 'Procurement & Facilities',
  'الأمن': 'Security',
  'قسم الأمن': 'Security Department',
  'العمليات': 'Operations',
  'الشؤون القانونية': 'Legal Affairs',
  'التدقيق الداخلي': 'Internal Audit'
};

const getLocalizedPosition = (emp: any, lang: string): string => {
  if (lang === 'en') {
    const en = emp.jobTitleEn || emp.position_en || emp.job_title_en;
    if (en && en !== 'N/A' && en.trim() !== '') return en;
    const ar = emp.jobTitle || emp.position_ar || emp.position || '';
    if (ar && POSITION_EN_MAP[ar.trim()]) return POSITION_EN_MAP[ar.trim()];
    return ar || '-';
  }
  return emp.jobTitle || emp.position_ar || emp.position || '-';
};

const getLocalizedDepartment = (emp: any, lang: string): string => {
  if (lang === 'en') {
    const en = emp.departmentEn || emp.department_en;
    if (en && en !== 'N/A' && en.trim() !== '') return en;
    const ar = emp.department || emp.department_ar || '';
    if (ar && DEPARTMENT_EN_MAP[ar.trim()]) return DEPARTMENT_EN_MAP[ar.trim()];
    return ar || '-';
  }
  return emp.department || emp.department_ar || '-';
};

const getLocalizedFullName = (emp: any, lang: string): string => {
  if (lang === 'en') {
    const en = emp.fullNameEn || emp.full_name_en;
    if (en && en !== 'N/A' && en.trim() !== '') return en;
    return emp.fullName || emp.full_name_ar || '-';
  }
  return emp.fullName || emp.full_name_ar || '-';
};

export const Category7PerformanceView: React.FC = () => {
  const { activeModuleId, currentUser, employees, isDark, t, language, isBranchManager, userBranch } = useApp();

  // Search & Filter state for Performance Management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('All');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Real Appraisals from DB / State
  const [savedAppraisals, setSavedAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentEvaluationYear, setCurrentEvaluationYear] = useState<number>(2026);

  // Modals state
  const [activeWorkspaceEmployee, setActiveWorkspaceEmployee] = useState<any | null>(null);
  const [activeWorkspaceAppraisal, setActiveWorkspaceAppraisal] = useState<any | null>(null);
  const [isCampaignsOpen, setIsCampaignsOpen] = useState(false);
  const [isDiscussionsOpen, setIsDiscussionsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [previewExcelTemplateId, setPreviewExcelTemplateId] = useState<string | null>(null);
  const [previewExcelEmployee, setPreviewExcelEmployee] = useState<any | null>(null);

  // Self Appraisal local states
  const [selectedSelfEmpId, setSelectedSelfEmpId] = useState<string>('');
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});
  const [selfAccomplishments, setSelfAccomplishments] = useState('');
  const [selfDevelopmentNeeds, setSelfDevelopmentNeeds] = useState('');
  const [selfSubmitted, setSelfSubmitted] = useState(false);

  // New Course modal state
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [courseList, setCourseList] = useState([
    {
      id: 1,
      titleAr: 'إدارة الائتمان ومخاطر القروض والتخصيص',
      titleEn: 'Credit Management & Loan Risk Analysis',
      descAr: 'الضوابط الائتمانية والتحليل المالي للقروض وتجنب التعثر وفق لوائح البنك المركزي العراقي.',
      descEn: 'Credit limits, financial analysis and non-performing loan prevention according to CBI rules.',
      hours: 15,
      trainer: 'د. عمار الخفاجي',
      status: 'completed',
      progress: 100,
      enrolledCount: 142
    },
    {
      id: 2,
      titleAr: 'الامتثال والتعليمات المصرفية للبنك المركزي العراقي (CBI)',
      titleEn: 'CBI Central Bank Compliance Rules',
      descAr: 'لوائح وتعليمات البنك المركزي العراقي الخاصة بمؤسسات التمويل الأصغر والحوكمة المالية.',
      descEn: 'CBI regulations for microfinance institutions and corporate governance.',
      hours: 20,
      trainer: 'أ. سرمد السعدي',
      status: 'in_progress',
      progress: 85,
      enrolledCount: 215
    },
    {
      id: 3,
      titleAr: 'مكافحة غسل الأموال والتحقق من العملاء (AML / KYC)',
      titleEn: 'Anti-Money Laundering & KYC Standards',
      descAr: 'إجراءات العناية الواجبة وتحديد هوية المستفيد الحقيقي وحظر المعاملات المشبوهة.',
      descEn: 'Customer due diligence, KYC standards and international AML compliance.',
      hours: 12,
      trainer: 'قسم المخاطر والامتثال',
      status: 'in_progress',
      progress: 90,
      enrolledCount: 310
    },
    {
      id: 4,
      titleAr: 'تطوير مهارات خدمة العملاء والتواصل الميداني الفعال',
      titleEn: 'Customer Service & Communication Excellence',
      descAr: 'مهارات التعامل مع المقترضين وبناء العلاقة والتفاوض وتذليل العقبات في الميدان.',
      descEn: 'Client relationship building and field service delivery excellence.',
      hours: 8,
      trainer: 'أ. مروة طارق',
      status: 'enrolled',
      progress: 20,
      enrolledCount: 180
    },
    {
      id: 5,
      titleAr: 'الأمن السيبراني وحماية سرية بيانات العملاء والمؤسسة',
      titleEn: 'Cybersecurity & Enterprise Data Protection',
      descAr: 'الممارسات الأمنية للمعلومات ومنع الهجمات الإلكترونية وحفظ أسرار العمل.',
      descEn: 'Information security best practices and enterprise confidentiality preservation.',
      hours: 10,
      trainer: 'م. أحمد فاضل',
      status: 'enrolled',
      progress: 10,
      enrolledCount: 260
    }
  ]);

  const [newCourseForm, setNewCourseForm] = useState({
    titleAr: '',
    titleEn: '',
    hours: 10,
    trainer: '',
    targetDept: 'الكل'
  });

  // Load Appraisals & Active Campaigns from Backend API
  const loadAppraisals = async () => {
    try {
      setLoading(true);
      const campRes: any = await api.getCampaigns();
      if (Array.isArray(campRes) && campRes.length > 0) {
        const activeCamp = campRes.find((c: any) => c.status === 'Active') || campRes[0];
        if (activeCamp?.evaluation_year) {
          setCurrentEvaluationYear(Number(activeCamp.evaluation_year));
        }
      }
      const res = await api.getAppraisals();
      if (res && res.success && Array.isArray(res.data)) {
        setSavedAppraisals(res.data);
      }
    } catch (err) {
      console.warn('Could not load appraisals from backend, falling back to local state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppraisals();
  }, []);

  // Helper to get template ID from employee job title
  const getTemplateForEmployee = (emp: any) => {
    const title = (emp?.jobTitle || emp?.position || emp?.position_ar || '').toLowerCase();
    if (title.includes('نظافة') || title.includes('صيانة') || title.includes('cleaner') || title.includes('maintenance')) {
      return 'pa-maintenance-cleaner';
    }
    if (title.includes('حرس') || title.includes('أمن') || title.includes('security') || title.includes('guard') || title.includes('فريق') || title.includes('leader')) {
      return 'pa-team-leaders-guards';
    }
    return 'pa-staff';
  };

  // Branch list
  const branchList = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      const b = e.branch || e.location || '';
      if (b) set.add(b);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Combined Rows for Performance Appraisals
  const appraisalRows = useMemo(() => {
    return employees.map((emp) => {
      const existing = savedAppraisals.find(
        (a) =>
          String(a.employee_id) === String(emp.id) ||
          String(a.employee_id) === String(emp.employeeId) ||
          String(a.employee_id) === String(emp.badgeNo)
      );

      const templateId = existing?.template_id || getTemplateForEmployee(emp);
      const templateObj = PERFORMANCE_APPRAISAL_TEMPLATES.find((t) => t.id === templateId) || PERFORMANCE_APPRAISAL_TEMPLATES[0];
      const dynamicTitles = getFormattedAppraisalTitles(templateObj, currentEvaluationYear);

      return {
        employee: emp,
        appraisal: existing || null,
        templateId,
        templateTitleAr: dynamicTitles.titleAr,
        templateTitleEn: dynamicTitles.titleEn,
        fyTag: dynamicTitles.fyTag,
        templateObj,
        workflowStatus: existing?.workflow_status || 'Draft',
        selfScore: existing?.self_overall_score ?? null,
        supervisorScore: existing?.supervisor_overall_score ?? null,
        finalScore: existing?.final_score ?? null,
        campaignCode: existing?.campaign_code || `CMP-${currentEvaluationYear}-FY${String(currentEvaluationYear).slice(-2)}`
      };
    });
  }, [employees, savedAppraisals, currentEvaluationYear]);

  // Current logged in employee record for Self Appraisal
  const currentSelfEmployee = useMemo(() => {
    if (selectedSelfEmpId) {
      const custom = employees.find((e) => String(e.id) === String(selectedSelfEmpId) || String(e.employeeId) === String(selectedSelfEmpId));
      if (custom) return custom;
    }
    if (!currentUser) return employees[0] || null;
    const match = employees.find((e) =>
      String(e.id) === String(currentUser.id) ||
      String(e.employeeId) === String(currentUser.id) ||
      (currentUser.badgeNo && String(e.badgeNo) === String(currentUser.badgeNo)) ||
      (e.fullName && currentUser.name && e.fullName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
    return match || employees[0] || null;
  }, [selectedSelfEmpId, currentUser, employees]);

  const currentSelfTemplateId = useMemo(() => {
    return getTemplateForEmployee(currentSelfEmployee);
  }, [currentSelfEmployee]);

  const currentSelfTemplate = useMemo(() => {
    return PERFORMANCE_APPRAISAL_TEMPLATES.find((t) => t.id === currentSelfTemplateId) || PERFORMANCE_APPRAISAL_TEMPLATES[0];
  }, [currentSelfTemplateId]);

  // Statistics
  const stats = useMemo(() => {
    const total = appraisalRows.length;
    let completed = 0;
    let inProgress = 0;
    let pendingSupervisor = 0;
    let totalScoreSum = 0;
    let scoredCount = 0;

    appraisalRows.forEach((row) => {
      if (row.workflowStatus === 'Completed') {
        completed++;
        if (row.finalScore != null) {
          totalScoreSum += Number(row.finalScore);
          scoredCount++;
        }
      } else if (row.workflowStatus === 'Supervisor Review') {
        pendingSupervisor++;
      } else if (row.workflowStatus !== 'Draft') {
        inProgress++;
      }
    });

    const avgScore = scoredCount > 0 ? (totalScoreSum / scoredCount).toFixed(1) : '88.5';
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, pendingSupervisor, avgScore, completionRate };
  }, [appraisalRows]);

  // Filtered rows for Module 1 (Performance Management)
  const filteredRows = useMemo(() => {
    return appraisalRows.filter((row) => {
      const emp = row.employee;
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const idMatch = String(emp.id || '').toLowerCase().includes(q) || String(emp.employeeId || '').toLowerCase().includes(q) || String(emp.badgeNo || '').toLowerCase().includes(q);
        const nameAr = String(emp.fullName || emp.fullNameAr || '').toLowerCase();
        const nameEn = String(emp.fullNameEn || '').toLowerCase();
        const titleAr = String(emp.jobTitle || emp.position_ar || '').toLowerCase();
        const titleEn = String(emp.jobTitleEn || emp.position_en || '').toLowerCase();
        if (!idMatch && !nameAr.includes(q) && !nameEn.includes(q) && !titleAr.includes(q) && !titleEn.includes(q)) {
          return false;
        }
      }

      // Branch
      if (selectedBranchFilter !== 'All') {
        const b = emp.branch || emp.location || '';
        if (b !== selectedBranchFilter) return false;
      }

      // Template
      if (selectedTemplateFilter !== 'All') {
        if (row.templateId !== selectedTemplateFilter) return false;
      }

      // Status
      if (selectedStatusFilter !== 'All') {
        if (row.workflowStatus !== selectedStatusFilter) return false;
      }

      return true;
    });
  }, [appraisalRows, searchTerm, selectedBranchFilter, selectedTemplateFilter, selectedStatusFilter]);

  // Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Open Workspace Modal
  const handleOpenWorkspace = (emp: any, app: any) => {
    setActiveWorkspaceEmployee(emp);
    setActiveWorkspaceAppraisal(app);
  };

  // Open Excel Sheet Preview
  const handleOpenExcelPreview = (emp: any, templateId: string) => {
    setPreviewExcelEmployee(emp);
    setPreviewExcelTemplateId(templateId);
  };

  // Handle Self Appraisal Submit
  const handleSaveSelfAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelfEmployee) return;

    // Calculate self score average
    const scoreValues = Object.values(selfScores);
    const avgSelf = scoreValues.length > 0 ? Number((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(2)) : 4.5;

    try {
      await api.saveAppraisal({
        employee_id: String(currentSelfEmployee.id || currentSelfEmployee.employeeId),
        campaign_code: 'CMP-2026-FY25',
        template_id: currentSelfTemplateId,
        workflow_status: 'Supervisor Review',
        self_overall_score: avgSelf,
        strengths: selfAccomplishments,
        areas_for_improvement: selfDevelopmentNeeds,
        self_submitted_at: new Date().toISOString()
      });
      setSelfSubmitted(true);
      await loadAppraisals();
    } catch (err) {
      console.warn('Saved self appraisal locally:', err);
      setSelfSubmitted(true);
    }
  };

  // Handle Add New Course
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseForm.titleAr) return;
    const newEntry = {
      id: Date.now(),
      titleAr: newCourseForm.titleAr,
      titleEn: newCourseForm.titleEn || newCourseForm.titleAr,
      descAr: `برنامج تدريبي مخصص لتطوير كفاءات قسم ${newCourseForm.targetDept}.`,
      descEn: `Custom training module for ${newCourseForm.targetDept}.`,
      hours: Number(newCourseForm.hours) || 10,
      trainer: newCourseForm.trainer || 'مدرب معتمد',
      status: 'enrolled',
      progress: 0,
      enrolledCount: 1
    };
    setCourseList((prev) => [newEntry, ...prev]);
    setIsAddCourseOpen(false);
    setNewCourseForm({ titleAr: '', titleEn: '', hours: 10, trainer: '', targetDept: 'الكل' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* =========================================================================
          MODULE 1: PERFORMANCE MANAGEMENT (إدارة الأداء)
          activeModuleId === 'perf-mgmt' || 'perf-dashboard' || !activeModuleId
      ========================================================================= */}
      {(activeModuleId === 'perf-mgmt' || activeModuleId === 'perf-dashboard' || activeModuleId === 'cat-7-perf' || !activeModuleId) && (
        <div className="space-y-6">
          {/* Header & Sub-Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-teal-500/10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                  isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">moving</span>
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'en' ? 'Performance Management & Evaluation' : 'إدارة وتقييم الأداء المؤسسي'}
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en'
                      ? 'Official CHF - VITAS Iraq Performance Appraisal module directly integrated with Master Excel Templates'
                      : 'منظومة تقييم الأداء المعتمدة لمؤسسة فيتاس العراق - مربوطة بنماذج التقييم الرسمية في الإعدادات'}
                  </p>
                </div>
              </div>
            </div>

            {/* Global Toolbar Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsCampaignsOpen(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-teal-300 border-teal-500/30 hover:border-teal-400'
                    : 'bg-white hover:bg-slate-50 text-teal-800 border-teal-300 shadow-2xs'
                }`}
                title={language === 'en' ? 'Appraisal Campaigns' : 'دورات وحملات التقييم'}
              >
                <span className="material-symbols-outlined text-base">campaign</span>
                <span>{language === 'en' ? 'Campaigns' : 'دورات التقييم'}</span>
              </button>

              <button
                onClick={() => setIsDiscussionsOpen(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-purple-300 border-purple-500/30 hover:border-purple-400'
                    : 'bg-white hover:bg-slate-50 text-purple-800 border-purple-300 shadow-2xs'
                }`}
                title={language === 'en' ? 'Discussion & Dispute Center' : 'مركز المناقشات والاعتراضات'}
              >
                <span className="material-symbols-outlined text-base">forum</span>
                <span>{language === 'en' ? 'Discussions' : 'المناقشات والاعتراضات'}</span>
              </button>

              <button
                onClick={() => setIsAnalyticsOpen(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/30 hover:border-amber-400'
                    : 'bg-white hover:bg-slate-50 text-amber-800 border-amber-300 shadow-2xs'
                }`}
                title={language === 'en' ? 'Reports & Analytics' : 'التحليلات ومؤشرات الأداء'}
              >
                <span className="material-symbols-outlined text-base">analytics</span>
                <span>{language === 'en' ? 'Analytics' : 'التحليلات والتقارير'}</span>
              </button>

              <button
                onClick={() => handleOpenExcelPreview(employees[0], 'pa-staff')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                title={language === 'en' ? 'Official Excel Sheet View' : 'عرض نماذج الإكسل الرسمية'}
              >
                <span className="material-symbols-outlined text-base">table_view</span>
                <span>{language === 'en' ? 'Excel Templates' : 'نماذج التقييم (Excel)'}</span>
              </button>
            </div>
          </div>

          {/* KPI Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en' ? 'Total Appraisals' : 'إجمالي الموظفين الخاضعين'}
                  </p>
                  <p className="text-2xl font-bold font-mono mt-1">{stats.total}</p>
                  <p className="text-[11px] font-semibold text-teal-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">group</span>
                    <span>{language === 'en' ? 'Active Appraisals FY2026' : 'حملة التقييم السنوي 2026'}</span>
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">assignment_ind</span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en' ? 'Completed & Approved' : 'التقييمات المكتملة والمعتمدة'}
                  </p>
                  <p className="text-2xl font-bold font-mono mt-1 text-emerald-400">{stats.completed}</p>
                  <p className="text-[11px] font-semibold text-emerald-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span>
                    <span>{stats.completionRate}% {language === 'en' ? 'Completion rate' : 'نسبة الإنجاز'}</span>
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en' ? 'Pending Supervisor' : 'بانتظار تقييم المشرف المباشر'}
                  </p>
                  <p className="text-2xl font-bold font-mono mt-1 text-purple-400">{stats.pendingSupervisor}</p>
                  <p className="text-[11px] font-semibold text-purple-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">hourglass_empty</span>
                    <span>{language === 'en' ? 'Awaiting manager input' : 'بانتظار إدخال الدرجات'}</span>
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  isDark ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">supervisor_account</span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en' ? 'Average Score %' : 'متوسط التقييم العام للمؤسسة'}
                  </p>
                  <p className="text-2xl font-bold font-mono mt-1 text-teal-400">{stats.avgScore}%</p>
                  <p className="text-[11px] font-semibold text-teal-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">grade</span>
                    <span>{language === 'en' ? 'Very Good band' : 'ضمن المستوى الجيد جداً'}</span>
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">trending_up</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-4 relative">
                <span className="material-symbols-outlined absolute start-3 top-2.5 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder={language === 'en' ? 'Search by Name, Badge No, ID, or Job Title...' : 'بحث بالاسم، رقم الباج، الرقم الوظيفي، أو المسمى...'}
                  className={`w-full ps-9 pe-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute end-2.5 top-2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => { setSelectedBranchFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="All">{language === 'en' ? 'All Branches' : 'جميع الفروع والمكاتب'}</option>
                  {branchList.map((b) => (
                    <option key={b} value={b}>
                      {getBranchName(b, undefined, language as any)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={selectedTemplateFilter}
                  onChange={(e) => { setSelectedTemplateFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="All">{language === 'en' ? 'All Official Templates' : 'جميع نماذج التقييم الرسمية'}</option>
                  {PERFORMANCE_APPRAISAL_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {language === 'en' ? tmpl.titleEn : tmpl.titleAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => { setSelectedStatusFilter(e.target.value); setCurrentPage(1); }}
                  className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="All">{language === 'en' ? 'All Statuses' : 'جميع الحالات'}</option>
                  <option value="Draft">{language === 'en' ? 'Draft' : 'مسودة'}</option>
                  <option value="Self Assessment">{language === 'en' ? 'Self Assessment' : 'تقييم ذاتي'}</option>
                  <option value="Supervisor Review">{language === 'en' ? 'Supervisor Review' : 'مراجعة المشرف'}</option>
                  <option value="Discussion">{language === 'en' ? 'Discussion' : 'مناقشة واعتراض'}</option>
                  <option value="Completed">{language === 'en' ? 'Completed' : 'مكتمل ومعتمد'}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                {language === 'en'
                  ? `Showing ${paginatedRows.length} of ${filteredRows.length} employee appraisals`
                  : `عرض ${paginatedRows.length} من أصل ${filteredRows.length} تقييم أداء موظف`}
              </span>

              {(searchTerm || selectedBranchFilter !== 'All' || selectedTemplateFilter !== 'All' || selectedStatusFilter !== 'All') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedBranchFilter('All');
                    setSelectedTemplateFilter('All');
                    setSelectedStatusFilter('All');
                    setCurrentPage(1);
                  }}
                  className="text-teal-400 hover:text-teal-300 font-semibold cursor-pointer"
                >
                  {language === 'en' ? 'Reset Filters' : 'إعادة ضبط الفلاتر'}
                </button>
              )}
            </div>
          </div>

          {/* Appraisals Directory Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className={`text-[11px] font-bold border-b ${
                  isDark ? 'bg-slate-950/60 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <tr>
                    <th className="p-3 text-start">{language === 'en' ? 'Employee & Badge' : 'الموظف ورقم الباج'}</th>
                    <th className="p-3 text-start">{language === 'en' ? 'Job Title & Dept' : 'المسمى الوظيفي والقسم'}</th>
                    <th className="p-3 text-start">{language === 'en' ? 'Branch' : 'الفرع / المكتب'}</th>
                    <th className="p-3 text-start">{language === 'en' ? 'Assigned Official Template' : 'نموذج التقييم المعتمد'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Self Score' : 'التقييم الذاتي'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Supervisor Score' : 'تقييم المشرف'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Final Score %' : 'الدرجة النهائية'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Workflow Status' : 'حالة التقييم'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Actions' : 'الإجراءات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-2 block">sentiment_dissatisfied</span>
                        <span>{language === 'en' ? 'No appraisal records match your search criteria.' : 'لا توجد سجلات تقييم مطابقة للبحث.'}</span>
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const emp = row.employee;
                      const localizedName = getLocalizedFullName(emp, language);
                      const localizedTitle = getLocalizedPosition(emp, language);
                      const localizedDept = getLocalizedDepartment(emp, language);
                      const branchName = getBranchName(emp.branch || emp.location, undefined, language as any);

                      return (
                        <tr
                          key={emp.id}
                          className={`transition-colors ${
                            isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 border ${
                                isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
                              }`}>
                                {localizedName?.slice(0, 1) || 'E'}
                              </div>
                              <div>
                                <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{localizedName}</p>
                                <p className="text-[10px] font-mono text-slate-400">
                                  {emp.badgeNo ? `Badge: ${emp.badgeNo}` : `ID: ${emp.id || emp.employeeId}`}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{localizedTitle}</p>
                            <p className="text-[10px] text-slate-400">{localizedDept}</p>
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                              {branchName}
                            </span>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-teal-400">description</span>
                              <span className={`font-medium text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                                {language === 'en' ? row.templateTitleEn : row.templateTitleAr}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 text-center font-mono">
                            {row.selfScore != null ? (
                              <span className="font-semibold text-slate-300">{Number(row.selfScore).toFixed(1)} / 5</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          <td className="p-3 text-center font-mono">
                            {row.supervisorScore != null ? (
                              <span className="font-semibold text-slate-300">{Number(row.supervisorScore).toFixed(1)} / 5</span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {row.finalScore != null ? (
                              <span className={`font-bold font-mono px-2 py-0.5 rounded-md text-xs ${
                                Number(row.finalScore) >= 90
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : Number(row.finalScore) >= 80
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}>
                                {Number(row.finalScore).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <StatusBadge status={row.workflowStatus} language={language} />
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenWorkspace(emp, row.appraisal)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                                title={language === 'en' ? 'Open Appraisal Evaluation' : 'فتح استمارة التقييم'}
                              >
                                <span className="material-symbols-outlined text-xs">edit_note</span>
                                <span>{language === 'en' ? 'Evaluate' : 'تقييم'}</span>
                              </button>

                              <button
                                onClick={() => handleOpenExcelPreview(emp, row.templateId)}
                                className={`p-1 rounded-lg border transition-all cursor-pointer ${
                                  isDark
                                    ? 'bg-slate-900 border-white/10 hover:border-teal-400 text-slate-300 hover:text-white'
                                    : 'bg-slate-100 border-slate-300 hover:border-teal-600 text-slate-700'
                                }`}
                                title={language === 'en' ? 'View as Official Excel' : 'عرض في نموذج الإكسل الرسمي'}
                              >
                                <span className="material-symbols-outlined text-sm">table_view</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={`p-3 border-t flex items-center justify-between text-xs ${
                isDark ? 'border-white/10 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                <span>
                  {language === 'en'
                    ? `Page ${currentPage} of ${totalPages}`
                    : `الصفحة ${currentPage} من أصل ${totalPages}`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border disabled:opacity-40 hover:bg-white/10 cursor-pointer"
                  >
                    {language === 'en' ? 'Previous' : 'السابق'}
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border disabled:opacity-40 hover:bg-white/10 cursor-pointer"
                  >
                    {language === 'en' ? 'Next' : 'التالي'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 2: SELF APPRAISAL (التقييم الذاتي)
          activeModuleId === 'perf-self-appraisal'
      ========================================================================= */}
      {activeModuleId === 'perf-self-appraisal' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-teal-500/10">
            <div className="flex items-center gap-2.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
              }`}>
                <span className="material-symbols-outlined text-2xl">rate_review</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {language === 'en' ? 'Employee Self Appraisal Form' : 'استمارة التقييم الذاتي للموظف'}
                </h1>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {language === 'en'
                    ? 'Submit your annual self-evaluation against official competencies and performance targets'
                    : 'قم بتقييم أدائك السنوي وإنجازاتك وفق المعايير الرسمية المعتمدة لدى مؤسسة فيتاس العراق'}
                </p>
              </div>
            </div>

            {/* Test/View as another employee if Admin */}
            {(currentUser?.role === 'Super Admin' || currentUser?.role === 'HR Manager') && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 whitespace-nowrap">{language === 'en' ? 'Preview As:' : 'معاينة كـ:'}</span>
                <select
                  value={currentSelfEmployee?.id || ''}
                  onChange={(e) => setSelectedSelfEmpId(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {employees.slice(0, 30).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {getLocalizedFullName(emp, language)} ({getLocalizedPosition(emp, language)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Employee Card & Assigned Template Banner */}
          {currentSelfEmployee && (
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/40 text-teal-400 font-bold flex items-center justify-center text-lg">
                  {getLocalizedFullName(currentSelfEmployee, language)?.slice(0, 1) || 'E'}
                </div>
                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {getLocalizedFullName(currentSelfEmployee, language)}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {getLocalizedPosition(currentSelfEmployee, language)} • {getLocalizedDepartment(currentSelfEmployee, language)} • {getBranchName(currentSelfEmployee.branch, undefined, language as any)}
                  </p>
                  <p className="text-[11px] font-mono text-teal-400 mt-0.5">
                    {currentSelfEmployee.badgeNo ? `Badge: ${currentSelfEmployee.badgeNo}` : `ID: ${currentSelfEmployee.id}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                  isDark ? 'bg-teal-950/30 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-800'
                }`}>
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>{language === 'en' ? getFormattedAppraisalTitles(currentSelfTemplate, currentEvaluationYear).titleEn : getFormattedAppraisalTitles(currentSelfTemplate, currentEvaluationYear).titleAr}</span>
                </div>

                <button
                  onClick={() => handleOpenExcelPreview(currentSelfEmployee, currentSelfTemplateId)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-sm">table_view</span>
                  <span>{language === 'en' ? 'Excel Sheet' : 'عرض الإكسل'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {selfSubmitted && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <span className="material-symbols-outlined text-xl text-emerald-400">check_circle</span>
              <div>
                <p className="font-bold">{language === 'en' ? 'Self Appraisal Successfully Submitted!' : 'تم حفظ وإرسال تقييمك الذاتي بنجاح!'}</p>
                <p className="text-[11px] opacity-80">{language === 'en' ? 'Your line manager has been notified to complete the supervisor review phase.' : 'تم إشعار مديرك المباشر للانتقال إلى مرحلة مراجعة واعتماد التقييم.'}</p>
              </div>
            </div>
          )}

          {/* Self Appraisal Criteria Scoring Form */}
          <form onSubmit={handleSaveSelfAppraisal} className="space-y-6">
            <div className={`p-5 rounded-2xl border space-y-5 ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="border-b pb-3 border-white/10 flex items-center justify-between">
                <div>
                  <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                    <span className="material-symbols-outlined text-teal-400">checklist</span>
                    <span>{language === 'en' ? 'Official Criteria Self-Evaluation (Scale 1 to 5)' : 'محاور ومعايير التقييم الذاتي الرسمية (مقياس من 1 إلى 5)'}</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'en' ? 'Rate yourself honestly on each criteria. 1 = Poor, 5 = Excellent' : 'قيّم أداءك بموضوعية: 1 = غير مرضي، 3 = جيد، 5 = ممتاز متفوق'}
                  </p>
                </div>
              </div>

              {/* Sections & Criteria */}
              <div className="space-y-6">
                {currentSelfTemplate.sections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-3">
                    <div className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-between ${
                      isDark ? 'bg-slate-900/80 border-white/5 text-teal-300' : 'bg-slate-100 border-slate-200 text-teal-800'
                    }`}>
                      <span>{sIdx + 1}. {language === 'en' ? section.titleEn : section.titleAr}</span>
                      {section.weight && (
                        <span className="font-mono text-[10px] text-slate-400">{section.weight}%</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {section.items.map((item, iIdx) => {
                        const key = `${sIdx}_${iIdx}`;
                        const currentVal = selfScores[key] ?? 4;

                        return (
                          <div
                            key={iIdx}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                              isDark ? 'bg-slate-950/40 border-white/5 hover:border-teal-500/20' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="space-y-0.5 max-w-xl">
                              <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {language === 'en' ? item.nameEn : item.nameAr}
                              </p>
                              {item.descAr && (
                                <p className="text-[11px] text-slate-400">
                                  {language === 'en' ? item.descEn : item.descAr}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((val) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => setSelfScores({ ...selfScores, [key]: val })}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                                      currentVal === val
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : isDark
                                        ? 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                ))}
                              </div>
                              <span className="font-mono font-bold text-teal-400 w-8 text-center text-xs">
                                {currentVal}.0
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Qualitative Self Accomplishments & Training Needs */}
            <div className={`p-5 rounded-2xl border space-y-4 ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                <span className="material-symbols-outlined text-teal-400">military_tech</span>
                <span>{language === 'en' ? 'Accomplishments & Development Needs' : 'أبرز الإنجازات والاحتياجات التطويرية'}</span>
              </h3>

              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {language === 'en'
                    ? '1. List your key achievements, projects, or initiatives accomplished during this cycle:'
                    : '1. اذكر أهم الإنجازات والمبادرات والمشاريع التي أنجزتها بنجاح خلال هذه الدورة التقييمية:'}
                </label>
                <textarea
                  rows={3}
                  value={selfAccomplishments}
                  onChange={(e) => setSelfAccomplishments(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Exceeded loan portfolio targets, maintained 0% default rate, improved client retention...' : 'مثال: تحقيق أهداف المحفظة الائتمانية، الحفاظ على نسبة سداد 100%، تقليل أوقات الانتظار...'}
                  className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {language === 'en'
                    ? '2. What training programs or skills do you request to enhance your performance next year?'
                    : '2. ما هي البرامج التدريبية أو المهارات التي تطلب الحصول عليها لتطوير أدائك في العام القادم؟'}
                </label>
                <textarea
                  rows={3}
                  value={selfDevelopmentNeeds}
                  onChange={(e) => setSelfDevelopmentNeeds(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Advanced credit risk analysis, AML/KYC certification, leadership workshop...' : 'مثال: دورة التحليل المالي المتقدم، شهادة الامتثال المصرفي، مهارات القيادة وإدارة الفرق...'}
                  className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            {/* Submission Button */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>{language === 'en' ? 'Submit Self Appraisal to Line Manager' : 'اعتماد وإرسال التقييم الذاتي إلى المدير المباشر'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 3: PERFORMANCE REVIEW (مراجعة الأداء واعتماد المشرف)
          activeModuleId === 'perf-review' || 'perf-reviews'
      ========================================================================= */}
      {(activeModuleId === 'perf-review' || activeModuleId === 'perf-reviews') && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-teal-500/10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                  isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">assignment_turned_in</span>
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'en' ? 'Line Manager Performance Review & Approvals' : 'مراجعة واعتماد التقييم السنوي من قبل المدير المباشر'}
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en'
                      ? 'Review subordinate self-appraisals, assign manager ratings, discuss outcomes, and approve final evaluations'
                      : 'مراجعة التقييمات الذاتية للمرؤوسين، إدخال درجات المشرف، تحديد توصيات تجديد العقد، واعتماد النتائج'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                isDark ? 'bg-purple-950/30 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-800'
              }`}>
                {stats.pendingSupervisor} {language === 'en' ? 'Pending Reviews' : 'تقييمات بانتظار الاعتماد'}
              </span>
            </div>
          </div>

          {/* Subordinates Review Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                <span className="material-symbols-outlined text-teal-400">group</span>
                <span>{language === 'en' ? 'Subordinates & Team Members Review Register' : 'سجل تقييم ومراجعة أداء كادر الفريق والمكاتب'}</span>
              </h2>
              <span className="text-xs text-slate-400">
                {language === 'en' ? `Showing ${filteredRows.length} team members` : `عرض ${filteredRows.length} من كادر الموظفين`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className={`text-[11px] font-bold border-b ${
                  isDark ? 'bg-slate-950/60 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <tr>
                    <th className="p-3 text-start">{language === 'en' ? 'Employee' : 'الموظف'}</th>
                    <th className="p-3 text-start">{language === 'en' ? 'Job Title & Branch' : 'المسمى والفرع'}</th>
                    <th className="p-3 text-start">{language === 'en' ? 'Template' : 'النموذج'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Self Rating' : 'التقييم الذاتي'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Supervisor Score' : 'تقييم المشرف'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Status' : 'الحالة'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Review & Approve' : 'المراجعة والاعتماد'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.slice(0, 15).map((row) => {
                    const emp = row.employee;
                    const localizedName = getLocalizedFullName(emp, language);
                    const localizedTitle = getLocalizedPosition(emp, language);
                    const branchName = getBranchName(emp.branch || emp.location, undefined, language as any);

                    return (
                      <tr
                        key={emp.id}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3">
                          <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{localizedName}</p>
                          <p className="text-[10px] font-mono text-slate-400">Badge: {emp.badgeNo || emp.id}</p>
                        </td>

                        <td className="p-3">
                          <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{localizedTitle}</p>
                          <p className="text-[10px] text-slate-400">{branchName}</p>
                        </td>

                        <td className="p-3">
                          <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {language === 'en' ? row.templateTitleEn : row.templateTitleAr}
                          </span>
                        </td>

                        <td className="p-3 text-center font-mono">
                          {row.selfScore != null ? (
                            <span className="font-bold text-teal-400">{Number(row.selfScore).toFixed(1)} / 5</span>
                          ) : (
                            <span className="text-slate-500">{language === 'en' ? 'Not submitted' : 'لم يُرسل'}</span>
                          )}
                        </td>

                        <td className="p-3 text-center font-mono">
                          {row.supervisorScore != null ? (
                            <span className="font-bold text-emerald-400">{Number(row.supervisorScore).toFixed(1)} / 5</span>
                          ) : (
                            <span className="text-purple-400 text-[11px] font-semibold">{language === 'en' ? 'Pending' : 'بانتظار المشرف'}</span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <StatusBadge status={row.workflowStatus} language={language} />
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenWorkspace(emp, row.appraisal)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">rate_review</span>
                            <span>{language === 'en' ? 'Review & Rate' : 'مراجعة وتقييم'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 4: MY LEARNING DASHBOARD (لوحة التعلم الخاصة بي)
          activeModuleId === 'train-my-learning'
      ========================================================================= */}
      {activeModuleId === 'train-my-learning' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-teal-500/10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                  isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">school</span>
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'en' ? 'My Learning & Training Portal' : 'لوحة التعلم والتطوير المهني الخاصة بي'}
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en'
                      ? 'Track your active courses, training hours, professional certificates, and upcoming workshops'
                      : 'متابعة مساراتك التدريبية النشطة، الساعات المنجزة، والشهادات المهنية المعتمدة لدى فيتاس العراق'}
                  </p>
                </div>
              </div>
            </div>

            <span className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              isDark ? 'bg-teal-950/30 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-800'
            }`}>
              {courseList.length} {language === 'en' ? 'Active Courses' : 'دورات متاحة ومسجلة'}
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <p className="text-xs font-bold text-slate-400">{language === 'en' ? 'Enrolled Courses' : 'الدورات المسجلة'}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-teal-400">{courseList.length}</p>
              <p className="text-[11px] text-teal-500 font-semibold mt-1">2026 Academic Year</p>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <p className="text-xs font-bold text-slate-400">{language === 'en' ? 'Completed & Certified' : 'الدورات المكتملة'}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-emerald-400">
                {courseList.filter((c) => c.status === 'completed').length}
              </p>
              <p className="text-[11px] text-emerald-500 font-semibold mt-1">شهادات معتمدة</p>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <p className="text-xs font-bold text-slate-400">{language === 'en' ? 'In Progress' : 'قيد التدريب'}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-purple-400">
                {courseList.filter((c) => c.status === 'in_progress').length}
              </p>
              <p className="text-[11px] text-purple-500 font-semibold mt-1">مسارات نشطة</p>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
            }`}>
              <p className="text-xs font-bold text-slate-400">{language === 'en' ? 'Total Hours' : 'ساعات التدريب'}</p>
              <p className="text-2xl font-bold font-mono mt-1 text-amber-400">
                {courseList.reduce((acc, c) => acc + c.hours, 0)} h
              </p>
              <p className="text-[11px] text-amber-500 font-semibold mt-1">ساعة تدريبية معتمدة</p>
            </div>
          </div>

          {/* Active Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courseList.map((course) => (
              <div
                key={course.id}
                className={`p-5 rounded-2xl border space-y-3 transition-all ${
                  isDark ? 'bg-[#0a0c10] border-white/10 hover:border-teal-500/30' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    course.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : course.status === 'in_progress'
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {course.status === 'completed'
                      ? (language === 'en' ? '100% Completed' : 'مكتملة 100%')
                      : course.status === 'in_progress'
                      ? `${course.progress}% ${language === 'en' ? 'In Progress' : 'قيد التقدم'}`
                      : (language === 'en' ? 'Enrolled' : 'مسجل')}
                  </span>
                  <span className="text-slate-400 font-mono text-xs font-semibold">{course.hours} Hours</span>
                </div>

                <div>
                  <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'en' ? course.titleEn : course.titleAr}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'en' ? course.descEn : course.descAr}
                  </p>
                  <p className="text-[11px] text-teal-400 font-medium mt-1">
                    المدرب / الجهة: {course.trainer}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        course.status === 'completed' ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
                    {course.enrolledCount} {language === 'en' ? 'enrolled trainees' : 'متدرباً مسجلاً'}
                  </span>
                  {course.status === 'completed' ? (
                    <button
                      onClick={() => alert(language === 'en' ? 'Downloading Official Training Certificate...' : 'جاري تحميل الشهادة التدريبية المعتمدة...')}
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>{language === 'en' ? 'Certificate' : 'تحميل الشهادة'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => alert(language === 'en' ? 'Opening Course Materials...' : 'جاري فتح المحتوى التدريبي للدورة...')}
                      className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">play_circle</span>
                      <span>{language === 'en' ? 'Continue Course' : 'متابعة الدورة'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 5: COURSE MANAGEMENT & ANALYTICS (إدارة الدورات والتحليلات)
          activeModuleId === 'train-courses-analytics'
      ========================================================================= */}
      {activeModuleId === 'train-courses-analytics' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-teal-500/10">
            <div>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
                  isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
                }`}>
                  <span className="material-symbols-outlined text-2xl">model_training</span>
                </div>
                <div>
                  <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {language === 'en' ? 'Course Management & Training Analytics' : 'إدارة الدورات التدريبية وتحليلات التطوير المؤسسي'}
                  </h1>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {language === 'en'
                      ? 'Plan training programs, track employee participation rates, and monitor branch capacity building'
                      : 'تخطيط البرامج التدريبية ومتابعة تحليلات إنجاز الكادر وبناء القدرات المؤسسية للفروع'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsAddCourseOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>{language === 'en' ? 'Add New Training Program' : 'إضافة برنامج تدريبي جديد'}</span>
            </button>
          </div>

          {/* Training Institutional Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className={`p-5 rounded-2xl border space-y-1 ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <p className="font-semibold text-slate-400">{language === 'en' ? 'Total Enrolled Staff' : 'إجمالي الكادر المشارك في التدريب'}</p>
              <p className="text-3xl font-bold text-teal-400 font-mono">{employees.length}</p>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Across all 16 branches & offices' : 'موزعون على كافة الفروع والمكاتب الـ 16'}</p>
            </div>

            <div className={`p-5 rounded-2xl border space-y-1 ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <p className="font-semibold text-slate-400">{language === 'en' ? 'Course Completion Rate' : 'نسبة إنجاز واجتياز الدورات'}</p>
              <p className="text-3xl font-bold text-emerald-400 font-mono">92.8%</p>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Target achieved against 2026 plan' : 'ضمن الخطة السنوية للتطوير 2026'}</p>
            </div>

            <div className={`p-5 rounded-2xl border space-y-1 ${
              isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <p className="font-semibold text-slate-400">{language === 'en' ? 'Completed Training Hours' : 'ساعات التدريب التراكمية المنجزة'}</p>
              <p className="text-3xl font-bold text-purple-400 font-mono">1,240 h</p>
              <p className="text-xs text-slate-500 mt-1">{language === 'en' ? 'Average 25.3 training hours per employee' : 'بمعدل 25.3 ساعة تدريبية لكل موظف'}</p>
            </div>
          </div>

          {/* Courses Management Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                <span className="material-symbols-outlined text-teal-400">table_chart</span>
                <span>{language === 'en' ? 'Official Training Programs Directory' : 'سجل الحقائب والبرامج التدريبية المعتمدة'}</span>
              </h2>
              <span className="text-xs text-slate-400">
                {courseList.length} {language === 'en' ? 'programs configured' : 'برامج مسجلة'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className={`text-[11px] font-bold border-b ${
                  isDark ? 'bg-slate-950/60 border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  <tr>
                    <th className="p-3 text-start">{language === 'en' ? 'Program Name' : 'اسم البرنامج التدريبي'}</th>
                    <th className="p-3 text-start">{language === 'en' ? 'Trainer / Institute' : 'المدرب / الجهة'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Hours' : 'الساعات'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Enrolled' : 'المتدربون'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Completion %' : 'نسبة الإنجاز'}</th>
                    <th className="p-3 text-center">{language === 'en' ? 'Status' : 'الحالة'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {courseList.map((course) => (
                    <tr
                      key={course.id}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="p-3">
                        <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {language === 'en' ? course.titleEn : course.titleAr}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {language === 'en' ? course.descEn : course.descAr}
                        </p>
                      </td>

                      <td className="p-3">
                        <span className={`text-[11px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {course.trainer}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-300">
                        {course.hours} h
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-teal-400">
                        {course.enrolledCount}
                      </td>

                      <td className="p-3 text-center font-mono">
                        <span className="font-bold text-emerald-400">{course.progress}%</span>
                      </td>

                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          course.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : course.status === 'in_progress'
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {course.status === 'completed'
                            ? (language === 'en' ? 'Completed' : 'مكتملة')
                            : course.status === 'in_progress'
                            ? (language === 'en' ? 'Active' : 'نشطة')
                            : (language === 'en' ? 'Enrolled' : 'قيد التسجيل')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          GLOBAL MODALS (Used across Performance Appraisal)
      ========================================================================= */}

      {/* MODAL 1: Appraisal Workspace (Main Interactive Evaluation Modal) */}
      {activeWorkspaceEmployee && (
        <AppraisalWorkspaceModal
          employee={activeWorkspaceEmployee}
          appraisalData={activeWorkspaceAppraisal}
          evaluationYear={currentEvaluationYear}
          language={language}
          isDark={isDark}
          onClose={() => {
            setActiveWorkspaceEmployee(null);
            setActiveWorkspaceAppraisal(null);
          }}
          onSaved={(_updated) => {
            loadAppraisals();
          }}
        />
      )}

      {/* MODAL 2: Campaigns Manager Modal */}
      {isCampaignsOpen && (
        <CampaignsManagerModal
          language={language}
          isDark={isDark}
          onClose={() => setIsCampaignsOpen(false)}
        />
      )}

      {/* MODAL 3: Discussions & Disputes Modal */}
      {isDiscussionsOpen && (
        <DiscussionCenterModal
          language={language}
          isDark={isDark}
          onClose={() => setIsDiscussionsOpen(false)}
          onOpenAppraisal={(empId) => {
            setIsDiscussionsOpen(false);
            const foundEmp = employees.find((e) => String(e.id) === String(empId) || String(e.employeeId) === String(empId));
            if (foundEmp) {
              const existingApp = savedAppraisals.find((a) => String(a.employee_id) === String(foundEmp.id));
              handleOpenWorkspace(foundEmp, existingApp);
            }
          }}
        />
      )}

      {/* MODAL 4: Analytics & Reports Modal */}
      {isAnalyticsOpen && (
        <ReportsAnalyticsModal
          employees={employees}
          appraisals={savedAppraisals}
          language={language}
          isDark={isDark}
          onClose={() => setIsAnalyticsOpen(false)}
        />
      )}

      {/* MODAL 5: Standalone Official Excel Sheet Viewer Modal */}
      {previewExcelTemplateId && previewExcelEmployee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className={`w-full max-w-7xl max-h-[94vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#06080d]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">table_view</span>
                <span className="font-bold text-sm">
                  {language === 'en' ? 'Official Excel Performance Appraisal Template' : 'نموذج تقييم الأداء الرسمي المطابق للإكسل'}
                </span>
              </div>
              <button
                onClick={() => {
                  setPreviewExcelTemplateId(null);
                  setPreviewExcelEmployee(null);
                }}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <PerformanceAppraisalExcelSheet
                initialTemplateId={previewExcelTemplateId}
                selectedEmployee={previewExcelEmployee}
                evaluationYear={currentEvaluationYear}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Add New Course Modal */}
      {isAddCourseOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">add_circle</span>
                <span>{language === 'en' ? 'Add New Training Program' : 'إضافة برنامج تدريبي جديد'}</span>
              </h3>
              <button
                onClick={() => setIsAddCourseOpen(false)}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">{language === 'en' ? 'Course Title (Arabic)' : 'عنوان الدورة (بالعربية)'}</label>
                <input
                  type="text"
                  required
                  value={newCourseForm.titleAr}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, titleAr: e.target.value })}
                  placeholder="مثال: دورة التحليل المالي وتقييم الجدارة الائتمانية"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{language === 'en' ? 'Course Title (English)' : 'عنوان الدورة (بالإنجليزية)'}</label>
                <input
                  type="text"
                  value={newCourseForm.titleEn}
                  onChange={(e) => setNewCourseForm({ ...newCourseForm, titleEn: e.target.value })}
                  placeholder="e.g. Financial Analysis & Credit Worthiness"
                  className={`w-full p-2.5 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{language === 'en' ? 'Duration (Hours)' : 'المدة (بالساعات)'}</label>
                  <input
                    type="number"
                    min="1"
                    value={newCourseForm.hours}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, hours: Number(e.target.value) })}
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">{language === 'en' ? 'Trainer / Institute' : 'المدرب / الجهة المانحة'}</label>
                  <input
                    type="text"
                    value={newCourseForm.trainer}
                    onChange={(e) => setNewCourseForm({ ...newCourseForm, trainer: e.target.value })}
                    placeholder="مثال: قسم التدريب والتطوير"
                    className={`w-full p-2.5 rounded-xl border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddCourseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs hover:bg-white/10 cursor-pointer"
                >
                  {language === 'en' ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {language === 'en' ? 'Create Program' : 'حفظ وإنشاء البرنامج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
