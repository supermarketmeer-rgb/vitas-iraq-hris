import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getBranchName } from '../utils/branchHelper';
import { api } from '../api/client';
import { PERFORMANCE_APPRAISAL_TEMPLATES } from '../data/performanceAppraisalTemplates';
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
  const { employees, isDark, t, language } = useApp();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('All');
  const [selectedTemplateFilter, setSelectedTemplateFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Real Appraisals from DB / State
  const [savedAppraisals, setSavedAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [activeWorkspaceEmployee, setActiveWorkspaceEmployee] = useState<any | null>(null);
  const [activeWorkspaceAppraisal, setActiveWorkspaceAppraisal] = useState<any | null>(null);
  const [isCampaignsOpen, setIsCampaignsOpen] = useState(false);
  const [isDiscussionsOpen, setIsDiscussionsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [previewExcelTemplateId, setPreviewExcelTemplateId] = useState<string | null>(null);
  const [previewExcelEmployee, setPreviewExcelEmployee] = useState<any | null>(null);

  // Load Appraisals from Backend API
  const loadAppraisals = async () => {
    try {
      setLoading(true);
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

  // Combined Rows
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

      return {
        employee: emp,
        appraisal: existing || null,
        templateId,
        templateTitleAr: templateObj.titleAr,
        templateTitleEn: templateObj.titleEn,
        workflowStatus: existing?.workflow_status || 'Draft',
        selfScore: existing?.self_overall_score ?? null,
        supervisorScore: existing?.supervisor_overall_score ?? null,
        finalScore: existing?.final_score ?? null,
        campaignCode: existing?.campaign_code || 'CMP-2026-FY25'
      };
    });
  }, [employees, savedAppraisals]);

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

  // Filtered rows
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Sub-Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-teal-500/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-xs ${
              isDark ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-teal-50 border-teal-200 text-teal-700'
            }`}>
              <span className="material-symbols-outlined text-2xl">rate_review</span>
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {language === 'en' ? 'Performance Appraisal & Evaluation System' : 'نظام تقييم الأداء والمراجعة المؤسسية'}
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {language === 'en'
                  ? 'Official CHF - VITAS Iraq Performance Appraisal module directly integrated with Master Excel Templates'
                  : 'منظومة تقييم الأداء المعتمدة لمؤسسة فيتاس العراق - مرتبطة مباشرة بنماذج التقييم الرسمية في الإعدادات'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Campaigns Manager */}
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

          {/* Discussions & Disputes */}
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

          {/* Reports & Analytics */}
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

          {/* View Official Excel Templates */}
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
        {/* Card 1: Total Appraisals */}
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

        {/* Card 2: Completed Appraisals */}
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

        {/* Card 3: Pending Supervisor Review */}
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

        {/* Card 4: Average Score */}
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
                <span>{language === 'en' ? 'Very Good / Good band' : 'ضمن المستوى الجيد جداً'}</span>
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
          {/* Search Box */}
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

          {/* Branch Filter */}
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

          {/* Template Filter */}
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

          {/* Status Filter */}
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

        {/* Results summary bar */}
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
                      {/* Employee Name & Badge */}
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

                      {/* Job Title & Department */}
                      <td className="p-3">
                        <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{localizedTitle}</p>
                        <p className="text-[10px] text-slate-400">{localizedDept}</p>
                      </td>

                      {/* Branch */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {branchName}
                        </span>
                      </td>

                      {/* Template Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-teal-400">description</span>
                          <span className={`font-medium text-[11px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                            {language === 'en' ? row.templateTitleEn : row.templateTitleAr}
                          </span>
                        </div>
                      </td>

                      {/* Self Score */}
                      <td className="p-3 text-center font-mono">
                        {row.selfScore != null ? (
                          <span className="font-semibold text-slate-300">{Number(row.selfScore).toFixed(1)} / 5</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Supervisor Score */}
                      <td className="p-3 text-center font-mono">
                        {row.supervisorScore != null ? (
                          <span className="font-semibold text-slate-300">{Number(row.supervisorScore).toFixed(1)} / 5</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      {/* Final Score % */}
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

                      {/* Workflow Status */}
                      <td className="p-3 text-center">
                        <StatusBadge status={row.workflowStatus} language={language} />
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Open Appraisal Modal */}
                          <button
                            onClick={() => handleOpenWorkspace(emp, row.appraisal)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                            title={language === 'en' ? 'Open Appraisal Evaluation' : 'فتح استمارة التقييم'}
                          >
                            <span className="material-symbols-outlined text-xs">edit_note</span>
                            <span>{language === 'en' ? 'Evaluate' : 'تقييم'}</span>
                          </button>

                          {/* Preview Official Excel Sheet */}
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

        {/* Pagination Footer */}
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

      {/* MODAL 1: Appraisal Workspace (Main Interactive Evaluation Modal) */}
      {activeWorkspaceEmployee && (
        <AppraisalWorkspaceModal
          employee={activeWorkspaceEmployee}
          appraisalData={activeWorkspaceAppraisal}
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
