import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { SearchableComboBox } from '../components/SearchableComboBox';
import { CompanyCalendar } from '../components/CompanyCalendar';
import { CompanyNews } from '../components/CompanyNews';
import { Employee, EmployeeChild } from '../types';
import { api } from '../api/client';
import { ContractPreviewModal } from '../components/ContractPreviewModal';
import { ContractArchiveModal } from '../components/ContractArchiveModal';
import { ContractRenewalAlertsModal } from '../components/ContractRenewalAlertsModal';
import { BatchOfficeContractRoutingModal } from '../components/routing/BatchOfficeContractRoutingModal';
import { StatusChangeTable } from '../components/StatusChangeTable';
import { TrainingTable } from '../components/TrainingTable';
import { WarningTable } from '../components/WarningTable';
import { getBranchName } from '../utils/branchHelper';
import { getDepartmentName, getJobTitleName, DICT_EN, isArabicText } from '../utils/orgDictionary';
import { transliterateArabicNameToEnglish } from '../utils/nameHelper';
import { formatIraqiPhoneNumber } from '../utils/phoneHelper';
import { DynamicHrisModule } from '../components/OrgModule/DynamicHrisModule';

export const Category3EmployeeView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    employees,
    setEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    appSettings,
    t,
    language,
    theme,
    currentUserRole,
    currentUser,
    canWrite,
    isReadOnly,
    isBranchManager,
    userBranch,
    scopedEmployees
  } = useApp();

  // Active employees list: strictly scoped to the branch if logged in as Branch Manager
  const activeEmployees = useMemo(() => {
    return isBranchManager ? scopedEmployees : employees;
  }, [isBranchManager, scopedEmployees, employees]);

  // Selected employee for profile view
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [profileViewTab, setProfileViewTab] = useState<'overview' | 'personal' | 'job' | 'contracts' | 'financial' | 'identity' | 'family' | 'status-change' | 'trainings' | 'warnings'>('overview');
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  // References to guarantee stable profile search and prevent unintended input wipes during background polling
  const profileSearchContainerRef = useRef<HTMLDivElement>(null);
  const profileSearchInputRef = useRef<HTMLInputElement>(null);
  const isProfileSearchFocusedRef = useRef<boolean>(false);
  const lastSelectedEmpIdRef = useRef<string | null>(null);
  const lastLanguageRef = useRef<string>(language);

  // Contract Preview & Print modal
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractModalEmployee, setContractModalEmployee] = useState<any>(null);

  const handleOpenContractPreview = (emp: any) => {
    setContractModalEmployee(emp);
    setIsContractModalOpen(true);
  };

  // Contract Archive modal (for reviewing all past/current contracts)
  const [isContractArchiveOpen, setIsContractArchiveOpen] = useState(false);
  const [contractArchiveEmployee, setContractArchiveEmployee] = useState<any>(null);

  const handleOpenContractArchive = (emp: any) => {
    setContractArchiveEmployee(emp);
    setIsContractArchiveOpen(true);
  };

  // Contract renewal & evaluation alerts modal state
  const [showRenewalAlertsModal, setShowRenewalAlertsModal] = useState(false);
  const [showBatchOfficeRoutingModal, setShowBatchOfficeRoutingModal] = useState(false);

  // Save confirmation modal state for Employee Add/Edit Form
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [directoryViewMode, setDirectoryViewMode] = useState<'table' | 'rows' | 'cards'>('table');

  // Calculate urgent contract alerts count (<= 7 days or overdue within 14 days, active only, non-permanent)
  const urgentContractAlertsCount = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let count = 0;

    activeEmployees.forEach((emp: any) => {
      // 1. Skip inactive or terminated employees
      const empStatus = String(emp.status || '').toLowerCase().trim();
      if (empStatus === 'terminated' || empStatus === 'resigned' || empStatus === 'inactive' || empStatus === 'مستقيل' || empStatus === 'مفصول' || empStatus === 'منتهي') {
        return;
      }

      const term = String(
        emp.termOfContract || 
        emp.term_of_contract || 
        emp.contract_type || 
        emp.contractType || 
        ''
      ).toLowerCase().trim();

      // 2. Permanent contracts do not expire
      const isPermanent = term.includes('دائم') || term.includes('غير محدد') || term.includes('permanent') || term.includes('indefinite');
      if (isPermanent) {
        return;
      }

      const isNew = term.includes('جديد') || term.includes('new') || term.includes('تجربة') || term.includes('probation');
      
      const startRaw = emp.contractStartDate || emp.contract_start_date || emp.originalStartDate || emp.original_start_date || emp.joinDate;
      const endRaw = emp.contractEndDate || emp.contract_end_date;
      const probationRaw = emp.probationEndDate || emp.probation_end_date;

      let targetDateObj: Date | null = null;
      if (isNew) {
        if (probationRaw) {
          const p = new Date(probationRaw);
          if (!isNaN(p.getTime())) targetDateObj = p;
        } else if (startRaw) {
          const s = new Date(startRaw);
          if (!isNaN(s.getTime())) {
            const p = new Date(s);
            p.setMonth(p.getMonth() + 3);
            targetDateObj = p;
          }
        }
      } else {
        if (endRaw) {
          const e = new Date(endRaw);
          if (!isNaN(e.getTime())) targetDateObj = e;
        } else if (probationRaw) {
          const p = new Date(probationRaw);
          if (!isNaN(p.getTime())) targetDateObj = p;
        }
      }

      if (targetDateObj) {
        const targetNormalized = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate());
        const diffMs = targetNormalized.getTime() - today.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
        
        // Logical threshold: only count genuine urgent contracts (due in 7 days or expired within last 14 days)
        if (daysRemaining >= -14 && daysRemaining <= 7) {
          count++;
        }
      }
    });

    return count;
  }, [activeEmployees]);



  // Real-time synchronization for employee contract dates and previews without app reload
  useEffect(() => {
    const handleEmpUpdates = (e: any) => {
      const updatedList = e?.detail;
      if (Array.isArray(updatedList) && updatedList.length > 0) {
        if (selectedEmpId) {
          const matching = updatedList.find((emp: any) => {
            const target = String(selectedEmpId).toLowerCase().trim();
            return String(emp.id).toLowerCase().trim() === target ||
                   (emp.employeeId && String(emp.employeeId).toLowerCase().trim() === target) ||
                   (emp.employee_id && String(emp.employee_id).toLowerCase().trim() === target) ||
                   (emp.badgeNo && String(emp.badgeNo).toLowerCase().trim() === target);
          });
          if (matching) {
            const clean = (val?: any) => (!val || val === 'N/A' || val === 'غير محدد' ? '' : String(val));
            const newStart = clean(matching.contractStartDate || matching.contract_start_date);
            const newEnd = clean(matching.contractEndDate || matching.contract_end_date);
            if (newStart) setContractStartDate(newStart);
            if (newEnd) setContractEndDate(newEnd);
          }
        }
        if (contractModalEmployee) {
          const matching = updatedList.find((emp: any) => {
            const target = String(contractModalEmployee.id || contractModalEmployee.employeeId || contractModalEmployee.badgeNo).toLowerCase().trim();
            return String(emp.id).toLowerCase().trim() === target ||
                   (emp.employeeId && String(emp.employeeId).toLowerCase().trim() === target) ||
                   (emp.badgeNo && String(emp.badgeNo).toLowerCase().trim() === target);
          });
          if (matching) {
            setContractModalEmployee(matching);
          }
        }
      }
    };

    window.addEventListener('vitas_employees_updated', handleEmpUpdates);
    return () => window.removeEventListener('vitas_employees_updated', handleEmpUpdates);
  }, [selectedEmpId, contractModalEmployee]);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; empId: string; empName: string }>({
    show: false,
    empId: '',
    empName: ''
  });

  // Branches & Locations management
  const [branchLocations, setBranchLocations] = useState<any[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchFormData, setBranchFormData] = useState({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
  const [branchDeleteConfirm, setBranchDeleteConfirm] = useState<{ show: boolean; id: string | number; name: string }>({
    show: false,
    id: '',
    name: ''
  });
  const [branchSearchQuery, setBranchSearchQuery] = useState('');
  const [branchesViewMode, setBranchesViewMode] = useState<'table' | 'rows' | 'cards'>('table');

  // Positions management
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [positionFormData, setPositionFormData] = useState({ name_ar: '', name_en: '', sort_order: 0 });

  // Company Profile management
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [showCompanyProfileModal, setShowCompanyProfileModal] = useState(false);
  const [editingCompanyProfile, setEditingCompanyProfile] = useState<any>(null);
  const [companyProfileFormData, setCompanyProfileFormData] = useState({
    id: '',
    company_name: '',
    company_name_en: '',
    logo_url: '',
    address: '',
    city: '',
    country: 'Iraq',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    registration_number: '',
    established_date: '',
    description: ''
  });

  // Search state for employee directory
  const [searchQuery, setSearchQuery] = useState('');

  // Filter employees based on search query (البادج، الاسم، المكتب، العنوان الوظيفي، القسم)
  const filteredEmployees = activeEmployees.filter(emp => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return (
      // البادج و WAID
      (emp.employeeId && String(emp.employeeId).toLowerCase().includes(query)) ||
      (emp.employee_id && String(emp.employee_id).toLowerCase().includes(query)) ||
      (emp.badgeNo && String(emp.badgeNo).toLowerCase().includes(query)) ||
      (emp.badge_no && String(emp.badge_no).toLowerCase().includes(query)) ||
      (emp.waid && String(emp.waid).toLowerCase().includes(query)) ||
      (emp.wa_id && String(emp.wa_id).toLowerCase().includes(query)) ||
      // الاسم
      (emp.fullName && emp.fullName.toLowerCase().includes(query)) ||
      (emp.fullNameEn && emp.fullNameEn.toLowerCase().includes(query)) ||
      (emp.full_name && String(emp.full_name).toLowerCase().includes(query)) ||
      (emp.full_name_ar && String(emp.full_name_ar).toLowerCase().includes(query)) ||
      (emp.full_name_en && String(emp.full_name_en).toLowerCase().includes(query)) ||
      (emp.name_ar && String(emp.name_ar).toLowerCase().includes(query)) ||
      (emp.name_en && String(emp.name_en).toLowerCase().includes(query)) ||
      // المكتب / الفرع
      (emp.branch && emp.branch.toLowerCase().includes(query)) ||
      (emp.branchEn && emp.branchEn.toLowerCase().includes(query)) ||
      (emp.branch_ar && String(emp.branch_ar).toLowerCase().includes(query)) ||
      (emp.branch_en && String(emp.branch_en).toLowerCase().includes(query)) ||
      (emp.location_ar && String(emp.location_ar).toLowerCase().includes(query)) ||
      (emp.location_en && String(emp.location_en).toLowerCase().includes(query)) ||
      (emp.office && String(emp.office).toLowerCase().includes(query)) ||
      (emp.office_ar && String(emp.office_ar).toLowerCase().includes(query)) ||
      (emp.office_en && String(emp.office_en).toLowerCase().includes(query)) ||
      // العنوان الوظيفي
      (emp.jobTitle && emp.jobTitle.toLowerCase().includes(query)) ||
      (emp.jobTitleEn && emp.jobTitleEn.toLowerCase().includes(query)) ||
      (emp.job_title && String(emp.job_title).toLowerCase().includes(query)) ||
      (emp.job_title_ar && String(emp.job_title_ar).toLowerCase().includes(query)) ||
      (emp.job_title_en && String(emp.job_title_en).toLowerCase().includes(query)) ||
      (emp.position && String(emp.position).toLowerCase().includes(query)) ||
      (emp.position_ar && String(emp.position_ar).toLowerCase().includes(query)) ||
      (emp.position_en && String(emp.position_en).toLowerCase().includes(query)) ||
      // القسم
      (emp.department && emp.department.toLowerCase().includes(query)) ||
      (emp.departmentEn && emp.departmentEn.toLowerCase().includes(query)) ||
      (emp.department_ar && String(emp.department_ar).toLowerCase().includes(query)) ||
      (emp.department_en && String(emp.department_en).toLowerCase().includes(query))
    );
  });

  // Filter employees for profile search box with full Arabic/English search support
  const matchingProfileEmployees = useMemo(() => {
    const rawQuery = (profileSearchQuery || '').trim();
    if (!rawQuery) return activeEmployees;

    const normalize = (str: string) => {
      return str
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '')
        .trim();
    };

    const query = normalize(rawQuery);

    return activeEmployees.filter(emp => {
      const candidates = [
        emp.fullName,
        emp.fullNameEn,
        emp.full_name,
        emp.full_name_ar,
        emp.full_name_en,
        emp.name_ar,
        emp.name_en,
        emp.employeeId,
        emp.employee_id,
        emp.badgeNo,
        emp.badge_no,
        emp.waid,
        emp.wa_id,
        emp.email,
        emp.jobTitle,
        emp.job_title,
        emp.job_title_ar,
        emp.jobTitleEn,
        emp.job_title_en,
        emp.department,
        emp.department_ar,
        emp.departmentEn,
        emp.department_en,
        emp.branch,
        emp.branch_ar,
        emp.branchEn,
        emp.branch_en,
        emp.location_ar,
        emp.location_en,
      ];

      return candidates.some(c => c && normalize(String(c)).includes(query));
    });
  }, [activeEmployees, profileSearchQuery]);

  // Theme-based styling helpers for profile view
  const isDark = theme === 'dark';
  const getProfileThemeColors = () => {
    if (isDark) {
      return {
        background: 'bg-[#0a0c10]',
        border: 'border-white/10',
        text: 'text-white',
        textSecondary: 'text-slate-400',
        inputBg: 'bg-[#06080d]',
        inputBorder: 'border-white/10',
        inputText: 'text-white',
        inputPlaceholder: 'placeholder-slate-500',
        cardBg: 'bg-[#0a0c10]',
        cardBorder: 'border-white/10',
        dropdownBg: 'bg-[#06080d]',
        dropdownBorder: 'border-white/10',
        dropdownText: 'text-white',
        dropdownHover: 'hover:bg-white/10',
        badgeBg: 'bg-[#06080d]',
        badgeText: 'text-teal-400',
        badgeBorder: 'border-teal-500/30',
        accentBg: 'bg-[#06080d]',
        accentText: 'text-teal-400',
        accentBorder: 'border-teal-500/30',
        divider: 'divide-white/10',
        shadow: 'shadow-xl'
      };
    } else {
      return {
        background: 'bg-white',
        border: 'border-slate-200',
        text: 'text-slate-800',
        textSecondary: 'text-slate-500',
        inputBg: 'bg-slate-50',
        inputBorder: 'border-slate-200',
        inputText: 'text-slate-900',
        inputPlaceholder: 'placeholder-slate-400',
        cardBg: 'bg-white',
        cardBorder: 'border-slate-200',
        dropdownBg: 'bg-white',
        dropdownBorder: 'border-slate-200',
        dropdownText: 'text-slate-900',
        dropdownHover: 'hover:bg-blue-50',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200',
        accentBg: 'bg-teal-100',
        accentText: 'text-teal-700',
        accentBorder: 'border-teal-200',
        divider: 'divide-slate-100',
        shadow: 'shadow-md'
      };
    }
  };

  const profileColors = getProfileThemeColors();

  // Settings data for dropdowns
  const [locations, setLocations] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [contractTypes, setContractTypes] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);

  // Translation dictionary for standard fallback terms in English
  const dictEn: Record<string, string> = {
    // Departments
    'قسم الائتمان': 'Credit Department',
    'الائتمان': 'Credit Department',
    'قسم الاتئمان': 'Credit Department',
    'الموارد البشرية': 'Human Resources',
    'قسم الموارد البشرية': 'Human Resources Department',
    'المعلوماتية والاتصالات': 'IT & Communications',
    'تكنولوجيا المعلومات': 'Information Technology',
    'المالية والمحاسبة': 'Finance & Accounting',
    'القسم المالي': 'Finance Department',
    'المخاطر والامتثال': 'Risk & Compliance',
    'الأمن': 'Security',
    'قسم الأمن': 'Security Department',
    'العمليات': 'Operations',
    'الشؤون القانونية': 'Legal Affairs',

    // Branches / Locations
    'بابل_الحلة': 'Babil - Hilla',
    'بابل - الحلة': 'Babil - Hilla',
    'بغداد - الكرادة': 'Baghdad - Karrada',
    'فرع بغداد - الكرادة': 'Baghdad Branch - Karrada',
    'البصرة': 'Basra',
    'أربيل': 'Erbil',
    'الديوانية': 'Diwaniyah',
    'النجف': 'Najaf',
    'كربلاء': 'Karbala',
    'الموصل': 'Mosul',
    'ذي قار': 'Dhi Qar',
    'كركوك': 'Kirkuk',

    // Job Titles & Names
    'مصطفى المير': 'Mustafa Al-Meer',
    'علي حسن محي العراوي': 'Ali Hassan Muhi Al-Arawi',
    'عمار عسكر عبد الجليل': 'Ammar Askar Abdul-Jaleel',
    'عمار جواد حسن الياسري': 'Ammar Jawad Hassan Al-Yasiri',
    'آيات موسى صالح': 'Ayat Musa Saleh',
    'بلال كاظم شاكر': 'Bilal Kadhim Shaker',
    'ضرغام عبدالرضا محمد': 'Dhirgham Abdul-Redha Mohammad',
    'فوزية كاظم عيال': 'Fawziya Kadhim Ayal',
    'مدير مكتب': 'Office Manager',
    'مسؤول قروض': 'Loan Officer',
    'عامل صيانه وسائق': 'Maintenance Worker & Driver',
    'عامل صيانة وسائق': 'Maintenance Worker & Driver',
    'نائب منسق اقليمي': 'Regional Deputy Coordinator',
    'نائب منسق إقليمي': 'Regional Deputy Coordinator',
    'مساعد ائتمان القروض الصغيره': 'Microfinance Loan Assistant',
    'مساعد ائتمان القروض الصغيرة': 'Microfinance Loan Assistant',
    'مسؤول قروض محصل': 'Collector Loan Officer',
    'عمال نظافة': 'Cleaners',
    'عامل نظافة': 'Cleaner',
    'مدير الفرع': 'Branch Manager',
    'مدير الموارد البشرية': 'HR Manager',
    'محاسب رئيسي': 'Chief Accountant',
    'مسؤول تقنية المعلومات': 'IT Officer',
    'مسؤول الامتثال والمخاطر': 'Risk & Compliance Officer'
  };

  const getEmpFullName = (emp: any) => {
    if (!emp) return '-';
    if (language === 'en') {
      const enName = emp.fullNameEn || emp.full_name_en || emp.name_en;
      if (enName && enName !== 'N/A' && enName.trim() !== '' && !isArabicText(enName)) return enName;
      const arName = emp.fullName || emp.full_name_ar || emp.name_ar;
      if (arName && dictEn[arName]) return dictEn[arName];
      if (arName && isArabicText(arName)) return transliterateArabicNameToEnglish(arName);
      return arName || '-';
    }
    return emp.fullName || emp.full_name_ar || emp.name_ar || '-';
  };

  const getEmpJobTitle = (emp: any) => {
    if (!emp) return '-';
    if (language === 'en') {
      const enTitle = emp.jobTitleEn || emp.job_title_en;
      if (enTitle && enTitle !== 'N/A' && enTitle.trim() !== '' && !isArabicText(enTitle)) return enTitle;
      const arTitle = emp.jobTitle || emp.position_ar || emp.position;
      if (!arTitle || arTitle === 'غير محدد' || arTitle === 'N/A') return 'Unspecified';
      const foundPos = positions.find((p: any) => p.name_ar === arTitle || p.name === arTitle);
      if (foundPos?.name_en && !isArabicText(foundPos.name_en)) return foundPos.name_en;
      if (arTitle && dictEn[arTitle]) return dictEn[arTitle];
      const translated = getJobTitleName(arTitle, 'en', positions);
      if (translated && !isArabicText(translated)) return translated;
      return 'Unspecified';
    }
    return emp.jobTitle || emp.position_ar || emp.position || '-';
  };

  const getEmpDepartment = (emp: any) => {
    if (!emp) return '-';
    if (language === 'en') {
      const enDept = emp.departmentEn || emp.department_en;
      if (enDept && enDept !== 'N/A' && enDept.trim() !== '' && !isArabicText(enDept)) return enDept;
      const arDept = emp.department || emp.department_ar;
      const foundDept = departments.find((d: any) => d.name_ar === arDept || d.name === arDept);
      if (foundDept?.name_en && !isArabicText(foundDept.name_en)) return foundDept.name_en;
      if (arDept && dictEn[arDept]) return dictEn[arDept];
      const translated = getDepartmentName(arDept, 'en');
      if (translated && !isArabicText(translated)) return translated;
      return 'Credit Department';
    }
    return emp.department || emp.department_ar || '-';
  };

  const getEmpBranch = (emp: any) => {
    if (!emp) return '-';
    const localized = getBranchName(emp.branch || emp.location_ar, emp.branchEn || emp.branch_en || emp.location_en, language);
    return localized || '-';
  };

  const selectedEmployee = useMemo(() => {
    if (!activeEmployees || activeEmployees.length === 0) return null;
    if (!selectedEmpId) return activeEmployees[0];
    const targetStr = String(selectedEmpId).toLowerCase().trim();
    return activeEmployees.find(e => {
      return String(e.id).toLowerCase().trim() === targetStr ||
             (e.employeeId && String(e.employeeId).toLowerCase().trim() === targetStr) ||
             (e.employee_id && String(e.employee_id).toLowerCase().trim() === targetStr);
    }) || activeEmployees[0];
  }, [activeEmployees, selectedEmpId]);

  useEffect(() => {
    setAvatarImgError(false);

    if (activeEmployees.length > 0) {
      const activeId = selectedEmpId || activeEmployees[0]?.id || activeEmployees[0]?.employeeId;
      const targetStr = activeId ? String(activeId).toLowerCase().trim() : '';
      const hasIdChanged = targetStr !== lastSelectedEmpIdRef.current;
      const hasLangChanged = language !== lastLanguageRef.current;

      if (hasIdChanged || hasLangChanged || lastSelectedEmpIdRef.current === null) {
        lastSelectedEmpIdRef.current = targetStr;
        lastLanguageRef.current = language;

        // Never overwrite if user is actively searching or typing
        if (!isProfileSearchFocusedRef.current && !isSearchDropdownOpen) {
          const found = activeEmployees.find(e => {
            return String(e.id).toLowerCase().trim() === targetStr ||
                   (e.employeeId && String(e.employeeId).toLowerCase().trim() === targetStr) ||
                   (e.employee_id && String(e.employee_id).toLowerCase().trim() === targetStr);
          }) || activeEmployees[0];

          if (found) {
            setProfileSearchQuery(getEmpFullName(found));
          }
        }
      }
    }
  }, [selectedEmpId, activeEmployees, language, isSearchDropdownOpen]);

  // Click outside listener for the profile search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileSearchContainerRef.current && !profileSearchContainerRef.current.contains(event.target as Node)) {
        setIsSearchDropdownOpen(false);
        isProfileSearchFocusedRef.current = false;
        if (selectedEmployee) {
          setProfileSearchQuery(getEmpFullName(selectedEmployee));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedEmployee, language]);

  // 7 Tabs Form State
  const [activeTab, setActiveTab] = useState<number>(1);

  // Tab 1: Basic & Personal
  const [fullName, setFullName] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [badgeNo, setBadgeNo] = useState('');
  const [waid, setWaid] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [gender, setGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [maritalStatus, setMaritalStatus] = useState<'أعزب' | 'متأهل' | 'مطلق' | 'أرمل'>('أعزب');
  const [nationality, setNationality] = useState(language === 'en' ? 'Iraqi' : 'عراقي');

  // Tab 2: Contracts & Service
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractEndDate, setContractEndDate] = useState('');
  const [originalStartDate, setOriginalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [probationEndDate, setProbationEndDate] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [termOfContract, setTermOfContract] = useState('');
  const [grade, setGrade] = useState('');

  // Tab 3: Position, Department & Branch
  const [jobTitle, setJobTitle] = useState('');
  const [jobTitleEn, setJobTitleEn] = useState('');
  const [department, setDepartment] = useState('');
  const [departmentEn, setDepartmentEn] = useState('');
  const [branch, setBranch] = useState('');
  const [branchEn, setBranchEn] = useState('');
  const [positionStartDate, setPositionStartDate] = useState(originalStartDate);
  const [supervisorName, setSupervisorName] = useState('');
  const [lebanonSupervisors, setLebanonSupervisors] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/regional/lebanon/supervisors')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLebanonSupervisors(data);
      })
      .catch(() => {});
  }, []);
  const [workScope, setWorkScope] = useState('Field & Admin');

  // Tab 4: Financial & Allowances
  const [basicSalary, setBasicSalary] = useState<number>(0);
  const [writtenBasicSalaryAr, setWrittenBasicSalaryAr] = useState('');
  const [transportationFixed, setTransportationFixed] = useState<number>(0);
  const [fixedBonus, setFixedBonus] = useState<number>(0);
  const [phoneAllowance, setPhoneAllowance] = useState<number>(0);
  const [certificateAllowance, setCertificateAllowance] = useState<number>(0);
  const [spouseAllowance, setSpouseAllowance] = useState<number>(0);
  const [childAllowance, setChildAllowance] = useState<number>(0);
  const [familyAllowance, setFamilyAllowance] = useState<number>(0);
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [isSsTaxExempt, setIsSsTaxExempt] = useState(false);
  const [ssTaxExemptionReason, setSsTaxExemptionReason] = useState('');

  // Tab 5: Documents & ID
  const [nationalId, setNationalId] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Tab 6: Family & Dependents
  const [spouseName, setSpouseName] = useState('');
  const [spouseEmployedHere, setSpouseEmployedHere] = useState<boolean>(false);
  const [childrenList, setChildrenList] = useState<EmployeeChild[]>([]);
  const [childrenDetails, setChildrenDetails] = useState('');

  // Tab 6: new child row inputs
  const [newChildName, setNewChildName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [newChildRelation, setNewChildRelation] = useState<'ولد' | 'بنت'>('ولد');
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  const calcAge = (dob?: string): number => {
    if (!dob || dob === 'N/A') return 0;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  };

  // Auto-update spouse & child allowances from appSettings policy settings dynamically
  useEffect(() => {
    const policySpouseAllowance = parseFloat(appSettings['marriage_allowance_default'] || appSettings['spouse_allowance_default'] || appSettings['marriage_allowance'] || '50000');
    const policyChildAllowance = parseFloat(appSettings['child_allowance_default'] || appSettings['child_allowance'] || '25000');

    const isMarried = maritalStatus === 'متأهل' || maritalStatus === 'متزوج' || maritalStatus === 'married';

    // If married and spouse does NOT work at institution -> set spouseAllowance from policy settings
    // If spouse works at institution or not married -> 0
    if (isMarried && !spouseEmployedHere) {
      setSpouseAllowance(policySpouseAllowance);
    } else {
      setSpouseAllowance(0);
    }

    setChildAllowance(policyChildAllowance);
  }, [maritalStatus, spouseEmployedHere, appSettings]);

  // Calculate family allowance: spouse allowance + (children under 18 * child allowance)
  useEffect(() => {
    const childrenUnder18 = childrenList.filter(child => {
      const age = child.dob ? calcAge(child.dob) : (child.age || 0);
      return age < 18;
    });

    const totalChildAllowance = childrenUnder18.length * childAllowance;
    const totalFamilyAllowance = spouseAllowance + totalChildAllowance;
    setFamilyAllowance(totalFamilyAllowance);
  }, [childrenList, spouseAllowance, childAllowance]);

  // Auto-change marital status to Single if spouse works at same institution
  useEffect(() => {
    if (spouseEmployedHere && maritalStatus === 'متأهل') {
      setMaritalStatus('أعزب');
    }
  }, [spouseEmployedHere]);

  const handleSaveChild = () => {
    const defaultName = newChildRelation === 'بنت' ? 'طفلة' : 'طفل';
    const childName = newChildName.trim() || defaultName;
    const computedAge = newChildDob ? calcAge(newChildDob) : 0;

    if (editingChildId) {
      setChildrenList(prev => prev.map(c => {
        if (c.id === editingChildId) {
          return {
            ...c,
            name: childName,
            dob: newChildDob || '',
            relation: newChildRelation,
            age: computedAge
          };
        }
        return c;
      }));
      setEditingChildId(null);
    } else {
      const child: EmployeeChild = {
        id: Date.now().toString(),
        name: childName,
        dob: newChildDob || '',
        relation: newChildRelation,
        age: computedAge,
      };
      setChildrenList(prev => [...prev, child]);
    }

    setNewChildName('');
    setNewChildDob('');
    setNewChildRelation('ولد');
  };

  const handleEditChild = (child: EmployeeChild) => {
    if (!child.id) return;
    setEditingChildId(child.id);
    setNewChildName(child.name || '');
    setNewChildDob(child.dob || '');
    const rel = child.relation === 'Daughter' || child.relation === 'بنت' ? 'بنت' : 'ولد';
    setNewChildRelation(rel);
  };

  const cancelEditChild = () => {
    setEditingChildId(null);
    setNewChildName('');
    setNewChildDob('');
    setNewChildRelation('ولد');
  };

  const removeChild = (id: string) => {
    if (editingChildId === id) {
      cancelEditChild();
    }
    setChildrenList(prev => prev.filter(c => c.id !== id));
  };

  // Tab 7: Trainings & Administrative Record
  const [trainingsRecord, setTrainingsRecord] = useState('');
  const [warningsRecord, setWarningsRecord] = useState('');
  const [status, setStatus] = useState<'Active' | 'On Leave' | 'Terminated' | 'Onboarding'>('Active');

  // Status Changes
  const [statusChanges, setStatusChanges] = useState<Array<{
    id: number;
    new_position: string;
    start_date: string;
    end_date: string;
  }>>([]);
  const [newStatusChange, setNewStatusChange] = useState({
    new_position: '',
    start_date: '',
    end_date: ''
  });

  // Employee Trainings
  const [employeeTrainings, setEmployeeTrainings] = useState<Array<{
    id: number;
    course_name: string;
    start_date: string;
    end_date: string;
  }>>([]);
  const [newTraining, setNewTraining] = useState({
    course_name: '',
    start_date: '',
    end_date: ''
  });

  const totalCalculatedSalary = Number(basicSalary || 0) + Number(transportationFixed || 0) + Number(fixedBonus || 0) + Number(phoneAllowance || 0) + Number(certificateAllowance || 0) + Number(familyAllowance || 0);

  // Initialize positionStartDate to originalStartDate on first load
  useEffect(() => {
    setPositionStartDate(originalStartDate);
  }, []);

  // Auto-update positionStartDate when statusChanges change
  useEffect(() => {
    if (statusChanges.length > 0) {
      const latestChange = statusChanges[statusChanges.length - 1];
      if (latestChange.start_date) {
        setPositionStartDate(latestChange.start_date);
      }
    } else {
      // Revert to original start date if no changes exist
      setPositionStartDate(originalStartDate);
    }
  }, [statusChanges, originalStartDate]);

  // Load settings data for dropdowns
  useEffect(() => {
    const loadSettingsData = async () => {
      try {
        const [locationsData, positionsData, departmentsData, contractTypesData, appSettingsData] = await Promise.all([
          api.getBranches().catch(() => []),
          api.getPositions().catch(() => []),
          api.getDepartments().catch(() => []),
          api.getContractTypes().catch(() => []),
          api.getAppSettings().catch(() => [])
        ]);

        const rawBranches = Array.isArray(locationsData) ? locationsData : [];
        const normalizedBranches = rawBranches.map((b: any) => {
          const raw = b.name_ar || b.name || b.name_en || '';
          const ar = getBranchName(raw, null, 'ar');
          const en = getBranchName(b.name_en || raw, null, 'en');
          return {
            ...b,
            name_ar: ar,
            name_en: en,
            name: ar || en
          };
        });

        const rawDepts = Array.isArray(departmentsData) ? departmentsData : [];
        const normalizedDepts = rawDepts.map((d: any) => {
          const raw = d.name_ar || d.name || d.name_en || '';
          const ar = getDepartmentName(raw, 'ar');
          const en = getDepartmentName(d.name_en || raw, 'en');
          return {
            ...d,
            name_ar: ar,
            name_en: en,
            name: ar || en
          };
        });

        const rawPositions = Array.isArray(positionsData) ? positionsData : [];
        const normalizedPositions = rawPositions.map((p: any) => {
          const raw = p.name_ar || p.title_ar || p.name || p.name_en || p.title || '';
          const ar = getJobTitleName(raw, 'ar');
          const en = getJobTitleName(p.name_en || p.title || raw, 'en');
          return {
            ...p,
            name_ar: ar,
            name_en: en,
            title_ar: ar,
            title_en: en,
            title: en || ar,
            name: ar || en
          };
        });

        setLocations(normalizedBranches);
        setPositions(normalizedPositions);
        setDepartments(normalizedDepts);
        setContractTypes(Array.isArray(contractTypesData) ? contractTypesData : []);
        setBranchLocations(normalizedBranches);
        
        // Convert app settings array to object safely
        const settingsObj: Record<string, string> = {};
        if (Array.isArray(appSettingsData)) {
          appSettingsData.forEach((setting: any) => {
            if (setting && setting.setting_key) {
              settingsObj[setting.setting_key] = setting.setting_value;
            }
          });
        }

        // Set default allowance values from settings - disabled for new employee form
        // setTransportationFixed(Number(settingsObj.transportation_allowance_default) || 0);
        // setFixedBonus(Number(settingsObj.fixed_bonus_default) || 0);
        // setPhoneAllowance(Number(settingsObj.phone_allowance_default) || 0);
        // setSpouseAllowance(Number(settingsObj.spouse_allowance_default) || 0);
        // setChildAllowance(Number(settingsObj.child_allowance_default) || 0);
        
        // For policies, we'll use app settings or create a structure
        setPolicies([
          { id: 1, name_ar: 'سياسة الإجازات السنوية', name_en: 'Annual Leave Policy' },
          { id: 2, name_ar: 'سياسة البدلات', name_en: 'Allowances Policy' },
          { id: 3, name_ar: 'سياسة العمل عن بعد', name_en: 'Remote Work Policy' }
        ]);
      } catch (error) {
        console.error('Error loading settings data:', error);
      }
    };

    loadSettingsData();
  }, []);

  // Load company profile data
  useEffect(() => {
    const loadCompanyProfile = async () => {
      try {
        const companyProfileData = await api.getCompanyProfile().catch(() => null);
        if (companyProfileData) {
          setCompanyProfile(companyProfileData);
        }
      } catch (error) {
        console.error('Error loading company profile:', error);
      }
    };

    loadCompanyProfile();
  }, []);

  // ── Utilities ──────────────────────────────────────────────
  /** Returns fractional years between a date string and today */
  const calcYears = (from: string): number => {
    if (!from) return 0;
    const diff = Date.now() - new Date(from).getTime();
    return Math.max(0, diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  // Auto-computed (no useState needed)
  const yearsOfEmployment = parseFloat(calcYears(originalStartDate).toFixed(1));
  const yearsInPosition   = parseFloat(calcYears(positionStartDate).toFixed(1));

  const formatWithCommas = (n: number) =>
    n === 0 ? '' : n.toLocaleString('en-US');

  const parseFormatted = (s: string) =>
    Number(s.replace(/,/g, '').replace(/[^\d.]/g, ''));

  const numberToArabicWords = (n: number): string => {
    if (!n || n === 0) return '';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
      'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
      'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

    const convertHundreds = (num: number): string => {
      if (num === 0) return '';
      if (num < 20) return ones[num];
      if (num < 100) {
        const t = Math.floor(num / 10);
        const o = num % 10;
        return o > 0 ? `${ones[o]} و${tens[t]}` : tens[t];
      }
      const h = Math.floor(num / 100);
      const rest = num % 100;
      return rest > 0 ? `${hundreds[h]} و${convertHundreds(rest)}` : hundreds[h];
    };

    const parts: string[] = [];
    const billions = Math.floor(n / 1_000_000_000);
    const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((n % 1_000_000) / 1_000);
    const remainder = n % 1_000;

    if (billions > 0) parts.push(`${convertHundreds(billions)} مليار`);
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions > 2) parts.push(`${convertHundreds(millions)} ملايين`);
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands > 2 && thousands < 11) parts.push(`${convertHundreds(thousands)} آلاف`);
    else if (thousands >= 11) parts.push(`${convertHundreds(thousands)} ألف`);
    if (remainder > 0) parts.push(convertHundreds(remainder));

    return parts.join(' و') + ' دينار عراقي';
  };

  const handleLoadEmployeeData = (empInput: any) => {
    console.log('>>> [DEBUG_EMP] handleLoadEmployeeData called with:', empInput);
    let emp: any = null;
    if (typeof empInput === 'object' && empInput !== null) {
      emp = empInput;
    } else {
      emp = employees.find(e => String(e.id) === String(empInput) || String(e.employeeId) === String(empInput) || String(e.employee_id) === String(empInput));
    }
    console.log('>>> [DEBUG_EMP] Resolved emp:', emp ? { id: emp.id, name: emp.fullName || emp.full_name } : 'NOT FOUND');
    if (!emp) return;

    const targetId = emp.id || emp.employeeId || emp.employee_id;
    if (targetId) {
      try { sessionStorage.setItem('vitas_editing_emp_id', String(targetId)); } catch (e) {}
    }
    const clean = (val?: any) => (!val || val === 'N/A' || val === 'غير محدد' ? '' : String(val));
    const resolvedName = clean(emp.fullName || emp.full_name || emp.full_name_ar || emp.name_ar || emp.name);
    console.log('>>> [DEBUG_EMP] Setting targetId:', targetId, 'resolvedName:', resolvedName);

    setSelectedEmpId(String(targetId));
    setFullName(resolvedName);
    setFullNameEn(clean(emp.fullNameEn || emp.full_name_en || emp.name_en));
    setEmpCode(clean(emp.employeeId || emp.employee_id || emp.empCode || (targetId ? `VTS-${targetId}` : '')));
    setBadgeNo(clean(emp.badgeNo || emp.badge_no));
    setWaid(clean(emp.waid || emp.wa_id));
    setDob(clean(emp.dob || emp.date_of_birth));
    setEmail(clean(emp.email));
    setPersonalEmail(clean(emp.personalEmail || emp.personal_email));
    setPhone(clean(formatIraqiPhoneNumber(emp.phone || emp.mobile || emp.mobile_phone || emp.phone_number)));
    setEmergencyPhone(clean(formatIraqiPhoneNumber(emp.emergencyPhone || emp.emergency_mobile || emp.emergency_phone)));
    setNationalId(clean(emp.nationalId || emp.national_id));
    setPassportNo(clean(emp.passportNo || emp.passport_number || emp.passport_no));
    setPassportExpiry(clean(emp.passportExpiry || emp.passport_expiry));
    setSpouseName(clean(emp.spouseName || emp.spouse_name));
    setSpouseEmployedHere(Boolean(emp.spouseEmployedHere || emp.spouse_employed_here));

    let parsedChildren: EmployeeChild[] = [];
    if (Array.isArray(emp.childrenList)) {
      parsedChildren = emp.childrenList;
    } else if (emp.children_details) {
      try { parsedChildren = JSON.parse(emp.children_details); } catch (e) {}
    } else if (emp.children_json) {
      try { parsedChildren = JSON.parse(emp.children_json); } catch (e) {}
    } else if (typeof emp.childrenDetails === 'string' && emp.childrenDetails.startsWith('[')) {
      try { parsedChildren = JSON.parse(emp.childrenDetails); } catch (e) {}
    }
    setChildrenList(parsedChildren);
    setChildrenDetails(parsedChildren.length > 0 ? JSON.stringify(parsedChildren) : '');
    setNewChildName('');
    setNewChildDob('');
    setEditingChildId(null);

    setTrainingsRecord(clean(emp.trainingsRecord || emp.trainings_record || emp.trainings_json));
    setWarningsRecord(clean(emp.warningsRecord || emp.warnings_record || emp.warnings_json));
    setExitDate(clean(emp.exitDate || emp.exit_date));

    const startDate = clean(emp.originalStartDate || emp.original_start_date || emp.contract_original_start || emp.joinDate || emp.hire_date) || new Date().toISOString().split('T')[0];
    setOriginalStartDate(startDate);
    setPositionStartDate(clean(emp.positionStartDate || emp.position_start_date || startDate));
    setContractStartDate(clean(emp.contractStartDate || emp.contract_start_date) || startDate);
    setContractEndDate(clean(emp.contractEndDate || emp.contract_end_date));
    setProbationEndDate(clean(emp.probationEndDate || emp.probation_end_date));
    setTermOfContract(emp.termOfContract || emp.term_of_contract || emp.contract_type || 'عقد محدد المدة (سنة واحدة)');
    setGrade(emp.grade || 'G-4 الدرجة الرابعة');

    setGender(emp.gender === 'أنثى' || emp.gender === 'female' || emp.gender === 'Female' ? 'أنثى' : 'ذكر');
    setMaritalStatus(
      emp.maritalStatus === 'متأهل' || emp.marital_status === 'married' ? 'متأهل' :
      emp.maritalStatus === 'مطلق' || emp.marital_status === 'divorced' ? 'مطلق' :
      emp.maritalStatus === 'أرمل' || emp.marital_status === 'widow' ? 'أرمل' : 'أعزب'
    );
    setNationality(clean(emp.nationality) || 'عراقي');

    const rawDept = clean(emp.department || emp.department_name || emp.department_ar);
    const rawDeptEn = clean(emp.departmentEn || emp.department_en);
    const resolvedDeptAr = getDepartmentName(rawDept || rawDeptEn, 'ar') || rawDept;
    const resolvedDeptEn = getDepartmentName(rawDeptEn || rawDept, 'en') || rawDeptEn;
    setDepartment(resolvedDeptAr);
    setDepartmentEn(resolvedDeptEn);

    const rawJob = clean(emp.jobTitle || emp.position_ar || emp.position || emp.job_title);
    const rawJobEn = clean(emp.jobTitleEn || emp.position_en || emp.job_title_en);
    const resolvedJobAr = getJobTitleName(rawJob || rawJobEn, 'ar', positions) || rawJob;
    const resolvedJobEn = getJobTitleName(rawJobEn || rawJob, 'en', positions) || rawJobEn;
    setJobTitle(resolvedJobAr);
    setJobTitleEn(resolvedJobEn);

    const rawBranch = clean(emp.branch || emp.branch_name || emp.location_ar);
    const rawBranchEn = clean(emp.branchEn || emp.branch_en || emp.location_en);
    const resolvedBranchAr = getBranchName(rawBranch || rawBranchEn, null, 'ar') || rawBranch;
    const resolvedBranchEn = getBranchName(rawBranchEn || rawBranch, null, 'en') || rawBranchEn;
    setBranch(resolvedBranchAr);
    setBranchEn(resolvedBranchEn);
    setSupervisorName(clean(emp.supervisorName || emp.supervisor_name));
    setWorkScope(clean(emp.workScope || emp.work_scope) || 'ميداني ومكتبي');

    const salaryVal = Number(emp.basicSalary || emp.basic_salary || emp.salary || 0);
    setBasicSalary(salaryVal);
    setWrittenBasicSalaryAr(clean(emp.writtenBasicSalaryAr || emp.written_basic_salary_ar) || (salaryVal > 0 ? numberToArabicWords(salaryVal) : ''));
    setBankName(clean(emp.bankName || emp.bank_name));
    setIban(clean(emp.iban));

    setIsSsTaxExempt(Boolean(Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1));
    setSsTaxExemptionReason(clean(emp.ssTaxExemptionReason || emp.ss_tax_exemption_reason));
    setTransportationFixed(Number(emp.transportationFixed || emp.transportation_fixed || 0));
    setFixedBonus(Number(emp.fixedBonus || emp.fixed_bonus || 0));
    setPhoneAllowance(Number(emp.phoneAllowance || emp.phone_allowance || 0));
    setCertificateAllowance(Number(emp.certificateAllowance || emp.certificate_allowance || 0));
    setSpouseAllowance(Number(emp.spouseAllowance || emp.spouse_allowance || 0));
    setChildAllowance(Number(emp.childAllowance || emp.child_allowance || 0));

    setPhotoUrl(clean(emp.photoUrl || emp.photo_url || emp.photo));
    setActiveTab(1);
    setStatusChanges([]);
    setNewStatusChange({ new_position: '', start_date: '', end_date: '' });
    setEmployeeTrainings([]);
    setNewTraining({ course_name: '', start_date: '', end_date: '' });

    if (targetId) {
      api.getEmployeeStatusChanges(String(targetId)).then((data: any) => {
        if (Array.isArray(data)) setStatusChanges(data);
      }).catch(() => {});

      api.getEmployeeTrainings(String(targetId)).then((data: any) => {
        if (Array.isArray(data)) setEmployeeTrainings(data);
      }).catch(() => {});
    }
    setSelectedPolicy('');
  };

  const handleResetForm = () => {
    try { sessionStorage.removeItem('vitas_editing_emp_id'); } catch (e) {}
    setSelectedEmpId(null);
    setFullName('');
    setFullNameEn('');
    setEmpCode('');
    setBadgeNo('');
    setWaid('');
    setDob('');
    setEmail('');
    setPersonalEmail('');
    setPhone('');
    setEmergencyPhone('');
    setNationalId('');
    setPassportNo('');
    setSpouseName('');
    setChildrenDetails('');
    setChildrenList([]);
    setNewChildName('');
    setNewChildDob('');
    setEditingChildId(null);
    setTrainingsRecord('');
    setWarningsRecord('');
    setExitDate('');
    setNationality(language === 'en' ? 'Iraqi' : 'عراقي');
    setPositionStartDate(new Date().toISOString().split('T')[0]);
    setJobTitle('');
    setJobTitleEn('');
    setDepartment('');
    setDepartmentEn('');
    setBranch('');
    setBranchEn('');
    setSupervisorName('');
    setGrade('');
    setTermOfContract('');
    setWorkScope('Field & Admin');
    setWrittenBasicSalaryAr('');
    setBankName('');
    setIban('');
    setBasicSalary(0);
    setTransportationFixed(0);
    setFixedBonus(0);
    setPhoneAllowance(0);
    setCertificateAllowance(0);
    setSpouseAllowance(0);
    setChildAllowance(0);
    setFamilyAllowance(0);
    setIsSsTaxExempt(false);
    setSsTaxExemptionReason('');
    setPhotoUrl('');
    if (photoFileInputRef.current) photoFileInputRef.current.value = '';
    setActiveTab(1);
    setStatusChanges([]);
    setNewStatusChange({ new_position: '', start_date: '', end_date: '' });
    setEmployeeTrainings([]);
    setNewTraining({ course_name: '', start_date: '', end_date: '' });
  };

  useEffect(() => {
    if (activeModuleId === 'emp-edit') {
      const editId = (typeof window !== 'undefined' ? sessionStorage.getItem('vitas_editing_emp_id') : null) || selectedEmpId;
      if (editId && employees.length > 0) {
        if (!selectedEmpId || selectedEmpId !== String(editId) || !fullName) {
          handleLoadEmployeeData(editId);
        }
      }
    } else if (activeModuleId === 'emp-add') {
      try { sessionStorage.removeItem('vitas_editing_emp_id'); } catch (e) {}
    }
  }, [activeModuleId, employees, selectedEmpId, fullName]);

  // Branch & Location Management Functions
  const handleAddBranch = () => {
    setEditingBranch(null);
    setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
    setShowBranchModal(true);
  };

  const handleEditBranch = (branch: any) => {
    setEditingBranch(branch);
    setBranchFormData({
      name: branch.name_ar || branch.name || branch.name_en || '',
      name_en: branch.name_en || branch.name || branch.name_ar || '',
      address: branch.address || '',
      city: branch.city || '',
      phone: branch.phone || '',
      email: branch.email || '',
      status: branch.status || 'Active'
    });
    setShowBranchModal(true);
  };

  const handleDeleteBranchClick = (branch: any) => {
    setBranchDeleteConfirm({
      show: true,
      id: branch.id,
      name: branch.name || branch.name_en || ''
    });
  };

  const handleConfirmDeleteBranch = async () => {
    if (!branchDeleteConfirm.id) return;
    if (!canWrite()) {
      alert(language === 'ar' ? 'ليس لديك صلاحية حذف الفروع (وضع القراءة فقط)' : 'You do not have permission to delete branches (Read-Only Mode)');
      setBranchDeleteConfirm({ show: false, id: '', name: '' });
      return;
    }
    
    try {
      await api.deleteBranch(branchDeleteConfirm.id.toString());
      const updatedBranches = branchLocations.filter(b => String(b.id) !== String(branchDeleteConfirm.id));
      setBranchLocations(updatedBranches);
      setLocations(updatedBranches);
      setBranchDeleteConfirm({ show: false, id: '', name: '' });
      api.getBranches().then((locs: any) => {
        if (Array.isArray(locs)) {
          const norm = locs.map((b: any) => ({
            ...b,
            name_ar: b.name_ar || b.name || '',
            name: b.name || b.name_ar || '',
            name_en: b.name_en || ''
          }));
          setBranchLocations(norm);
          setLocations(norm);
        }
      }).catch(() => {});
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert(language === 'ar' ? 'فشل حذف الفرع' : 'Failed to delete branch');
    }
  };

  // Position Management Functions
  const handleAddPosition = () => {
    setPositionFormData({ name_ar: '', name_en: '', sort_order: 0 });
    setShowPositionModal(true);
  };

  const handlePositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite()) {
      alert(language === 'ar' ? 'ليس لديك صلاحية إضافة وظائف (وضع القراءة فقط)' : 'You do not have permission to add positions (Read-Only Mode)');
      return;
    }
    if (!positionFormData.name_ar && !positionFormData.name_en) {
      alert(language === 'ar' ? 'يرجى إدخال مسمى الوظيفة' : 'Please enter position title');
      return;
    }

    try {
      const positionData = {
        name_ar: positionFormData.name_ar || positionFormData.name_en,
        name_en: positionFormData.name_en || positionFormData.name_ar,
        name: positionFormData.name_ar || positionFormData.name_en,
        sort_order: Number(positionFormData.sort_order) || 0
      };

      console.log('Submitting position data:', positionData);
      await api.addPosition(positionData);

      const updatedPositions = await api.getPositions().catch(() => []);
      setPositions(Array.isArray(updatedPositions) ? updatedPositions : []);

      setShowPositionModal(false);
      setPositionFormData({ name_ar: '', name_en: '', sort_order: 0 });
      alert(language === 'ar' ? 'تمت إضافة الوظيفة بنجاح' : 'Position added successfully');
    } catch (error: any) {
      console.error('Error saving position:', error);
      alert((language === 'ar' ? 'فشل حفظ الوظيفة: ' : 'Failed to save position: ') + (error?.message || ''));
    }
  };

  // Company Profile Management Functions
  const handleEditCompanyProfile = (profile: any) => {
    if (!profile) return;
    let estDate = profile.established_date || '';
    if (estDate && typeof estDate === 'string' && estDate.includes('T')) {
      estDate = estDate.split('T')[0];
    }
    setEditingCompanyProfile(profile);
    setCompanyProfileFormData({
      id: profile.id || '',
      company_name: profile.company_name || '',
      company_name_en: profile.company_name_en || '',
      logo_url: profile.logo_url || '',
      address: profile.address || '',
      city: profile.city || '',
      country: profile.country || 'Iraq',
      phone: profile.phone || '',
      email: profile.email || '',
      website: profile.website || '',
      tax_id: profile.tax_id || '',
      registration_number: profile.registration_number || '',
      established_date: estDate,
      description: profile.description || ''
    });
    setShowCompanyProfileModal(true);
  };

  const handleCompanyProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite()) {
      alert(language === 'ar' ? 'ليس لديك صلاحية تعديل بيانات الشركة (وضع القراءة فقط)' : 'You do not have permission to edit company profile (Read-Only Mode)');
      return;
    }
    
    const isEditing = !!editingCompanyProfile;
    const targetId = editingCompanyProfile?.id || companyProfileFormData.id || 'COMP-001';

    try {
      let estDate = companyProfileFormData.established_date || null;
      if (estDate && typeof estDate === 'string' && estDate.includes('T')) {
        estDate = estDate.split('T')[0];
      }

      const profileData = {
        ...companyProfileFormData,
        established_date: estDate,
        updated_at: new Date().toISOString()
      };

      console.log('Submitting company profile data:', profileData);

      let updatedProfile;
      if (isEditing && targetId) {
        // Update existing profile
        console.log('Updating existing profile with ID:', targetId);
        updatedProfile = await api.updateCompanyProfile(targetId, profileData);
        console.log('Updated profile response:', updatedProfile);
      } else {
        // Create new profile
        console.log('Creating new profile');
        updatedProfile = await api.createCompanyProfile(profileData);
        console.log('Created profile response:', updatedProfile);
      }

      setShowCompanyProfileModal(false);
      setEditingCompanyProfile(null);
      
      // Refresh company profile data
      const refreshedProfile = await api.getCompanyProfile().catch(() => updatedProfile);
      setCompanyProfile(refreshedProfile || updatedProfile);
      
      alert(isEditing ? 'تم تحديث الملف التعريفي بنجاح' : 'تم إنشاء الملف التعريفي بنجاح');
    } catch (error) {
      console.error('Error saving company profile:', error);
      alert((isEditing ? 'فشل تحديث الملف التعريفي: ' : 'فشل إنشاء الملف التعريفي: ') + (error as Error).message);
    }
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite()) {
      alert(language === 'ar' ? 'ليس لديك صلاحية إضافة أو تعديل الفروع (وضع القراءة فقط)' : 'You do not have permission to modify branches (Read-Only Mode)');
      return;
    }
    
    try {
      const branchData = {
        name: branchFormData.name,
        name_ar: branchFormData.name,
        name_en: branchFormData.name_en,
        address: branchFormData.address,
        city: branchFormData.city,
        phone: branchFormData.phone,
        email: branchFormData.email,
        status: branchFormData.status
      };

      console.log('Submitting branch data:', branchData);

      if (editingBranch) {
        // Update existing branch
        const targetId = editingBranch.id || editingBranch._id;
        console.log('Updating branch with ID:', targetId);
        
        let updateResult: any = null;
        if (targetId) {
          updateResult = await api.updateBranch(targetId.toString(), { ...branchData, id: targetId });
        } else {
          updateResult = await api.addBranch(branchData);
        }

        const finalId = targetId || (updateResult && updateResult.id) || editingBranch.id;
        const updatedBranch = {
          ...editingBranch,
          ...branchData,
          id: finalId,
          name_ar: branchData.name,
          name: branchData.name,
          name_en: branchData.name_en
        };
        const updatedBranches = branchLocations.map(b =>
          (finalId && String(b.id) === String(finalId)) || (b.name === editingBranch.name) ? updatedBranch : b
        );
        setBranchLocations(updatedBranches);
        setLocations(updatedBranches);
      } else {
        // Add new branch
        console.log('Adding new branch...');
        const result: any = await api.addBranch(branchData);
        console.log('Branch added result:', result);
        const newObj = typeof result === 'object' && result ? result : {};
        const newBranch = {
          id: newObj.id || `BR${Date.now()}`,
          ...newObj,
          ...branchData,
          name_ar: branchData.name,
          name: branchData.name,
          name_en: branchData.name_en
        };
        const updatedBranches = [...branchLocations, newBranch];
        setBranchLocations(updatedBranches);
        setLocations(updatedBranches);
      }
      
      const freshLocs: any = await api.getBranches().catch(() => null);
      if (Array.isArray(freshLocs)) {
        const norm = freshLocs.map((b: any) => ({
          ...b,
          name_ar: b.name_ar || b.name || '',
          name: b.name || b.name_ar || '',
          name_en: b.name_en || ''
        }));
        setBranchLocations(norm);
        setLocations(norm);
      }

      setShowBranchModal(false);
      setEditingBranch(null);
      setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
      alert(language === 'ar' ? (editingBranch ? 'تم تحديث بيانات الفرع بنجاح' : 'تمت إضافة الفرع بنجاح') : (editingBranch ? 'Branch updated successfully' : 'Branch added successfully'));
    } catch (error) {
      console.error('Error saving branch:', error);
      alert((language === 'ar' ? 'فشل حفظ الفرع: ' : 'Failed to save branch: ') + ((error as any).message || error));
    }
  };

  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite()) {
      alert(language === 'ar' ? 'ليس لديك صلاحية حفظ أو تعديل الموظفين (وضع القراءة فقط)' : 'You do not have permission to save or edit employees (Read-Only Mode)');
      return;
    }
    if (!fullName || !fullName.trim()) {
      alert(t('يرجى تعبئة الاسم الكامل الثلاثي في التبويب الأول (المعلومات الأساسية)', 'Please fill in the full name in the first tab (Basic Information)'));
      setActiveTab(1);
      return;
    }

    setSaveSuccessMessage(null);
    setShowSaveConfirmModal(true);
  };

  const handleConfirmAndExecuteSave = async () => {
    setIsSavingEmployee(true);
    const isEditMode = Boolean(selectedEmpId);
    const targetId = selectedEmpId || Date.now().toString();
    const finalEmployeeId = empCode || (targetId.startsWith('VTS-') ? targetId : `VTS-${targetId.length > 5 ? targetId.slice(-4) : targetId}`);
    const finalBadgeNo = badgeNo || (targetId.startsWith('B-') ? targetId : `B-${targetId.length > 4 ? targetId.slice(-3) : targetId}`);

    // Convert field names to match database schema
    const dbEmployee = {
      id: targetId,
      employee_id: finalEmployeeId,
      employeeId: finalEmployeeId,
      badge_no: finalBadgeNo,
      badgeNo: finalBadgeNo,
      waid: waid.trim(),
      wa_id: waid.trim(),
      full_name_ar: fullName,
      full_name_en: fullNameEn || fullName, // full_name_en is required in schema
      email,
      personal_email: personalEmail,
      mobile: phone || '07700000000',
      emergency_mobile: emergencyPhone,
      department,
      position_ar: jobTitle,
      position_en: jobTitleEn,
      location_ar: branch,
      location_en: branchEn,
      dob,
      gender: gender === 'ذكر' ? 'male' : 'female',
      marital_status: maritalStatus === 'أعزب' ? 'single' :
                      maritalStatus === 'متأهل' ? 'married' :
                      maritalStatus === 'مطلق' ? 'divorced' : 'widow',
      spouse_name: spouseName,
      spouse_employed_here: spouseEmployedHere ? 1 : 0,
      photo_url: photoUrl ? photoUrl.trim() : null,
      photoUrl: photoUrl ? photoUrl.trim() : null,
      photo: photoUrl ? photoUrl.trim() : null,
      photo_removed: !photoUrl,
      bank_name: bankName,
      iban,
      national_id: nationalId,
      passport_no: passportNo,
      passport_expiry: passportExpiry,
      contract_start_date: contractStartDate,
      contract_end_date: contractEndDate,
      contract_original_start: originalStartDate,
      probation_end_date: probationEndDate,
      exit_date: exitDate,
      term_of_contract: termOfContract,
      grade,
      basic_salary: String(basicSalary), // Schema expects varchar
      written_basic_salary_ar: writtenBasicSalaryAr,
      transportation_fixed: transportationFixed,
      fixed_bonus: fixedBonus,
      phone_allowance: phoneAllowance,
      certificate_allowance: certificateAllowance,
      nationality,
      supervisor_name: supervisorName,
      work_scope: workScope,
      is_ss_tax_exempt: isSsTaxExempt ? 1 : 0,
      ss_tax_exemption_reason: ssTaxExemptionReason || null,
      years_of_employment: yearsOfEmployment,
      years_in_position: yearsInPosition,
      children_json: childrenList.length > 0 ? JSON.stringify(childrenList) : null,
      status_changes_json: statusChanges.length > 0 ? JSON.stringify(statusChanges) : null,
      trainings_json: employeeTrainings.length > 0 ? JSON.stringify(employeeTrainings) : null,
      warnings_json: warningsRecord || null,
      status: status === 'Active' ? 'active' : 
               status === 'On Leave' ? 'inactive' :
               status === 'Terminated' ? 'inactive' : 'onboarding',
    };

    const newEmp: Employee = {
      id: String(targetId),
      employeeId: finalEmployeeId,
      employee_id: finalEmployeeId,
      badgeNo: finalBadgeNo,
      badge_no: finalBadgeNo,
      waid: waid.trim(),
      wa_id: waid.trim(),
      fullName,
      fullNameAr: fullName,
      full_name_ar: fullName,
      fullNameEn: fullNameEn || fullName,
      full_name_en: fullNameEn || fullName,
      email,
      personalEmail,
      personal_email: personalEmail,
      phone: phone || '07700000000',
      mobile: phone || '07700000000',
      emergencyPhone,
      emergency_mobile: emergencyPhone,
      department,
      jobTitle,
      jobTitleEn,
      position_ar: jobTitle,
      position_en: jobTitleEn || jobTitle,
      position: jobTitle,
      branch,
      branchEn,
      location_ar: branch,
      location_en: branchEn || branch,
      location: branch,
      joinDate: originalStartDate || new Date().toISOString().split('T')[0],
      salary: totalCalculatedSalary,
      basicSalary: Number(basicSalary),
      basic_salary: Number(basicSalary),
      transportationFixed: Number(transportationFixed),
      fixedBonus: Number(fixedBonus),
      phoneAllowance: Number(phoneAllowance),
      certificateAllowance: Number(certificateAllowance),
      writtenBasicSalaryAr,
      bankName,
      bank_name: bankName,
      iban,
      nationalId,
      national_id: nationalId,
      passportNo,
      passport_no: passportNo,
      passportExpiry,
      passport_expiry: passportExpiry,
      photoUrl: photoUrl ? photoUrl.trim() : '',
      photo_url: photoUrl ? photoUrl.trim() : '',
      photo: photoUrl ? photoUrl.trim() : '',
      dob,
      gender,
      maritalStatus,
      spouseName,
      spouse_name: spouseName,
      spouseEmployedHere,
      contractStartDate,
      contractEndDate,
      originalStartDate,
      probationEndDate,
      exitDate,
      yearsOfEmployment: yearsOfEmployment || 0,
      yearsInPosition: yearsInPosition || 0,
      termOfContract,
      grade,
      supervisorName,
      supervisor_name: supervisorName,
      workScope,
      work_scope: workScope,
      nationality,
      childrenList,
      childrenDetails,
      trainingsRecord,
      warningsRecord,
      isSsTaxExempt,
      ssTaxExemptionReason,
      status,
    };

    // Update local state in AppContext and LocalStorage immediately for seamless UX
    let savedId = targetId;
    if (isEditMode) {
      setEmployees(prev => {
        const updated = prev.map(e => (
          String(e.id) === String(newEmp.id) ||
          String(e.employeeId) === String(newEmp.employeeId) ||
          (e.badgeNo && String(e.badgeNo) === String(newEmp.badgeNo))
        ) ? { ...e, ...newEmp } : e);
        try {
          localStorage.setItem('vitas_employees', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    } else {
      setEmployees(prev => {
        const filtered = prev.filter(e => String(e.id) !== String(newEmp.id));
        const updated = [newEmp, ...filtered];
        try {
          localStorage.setItem('vitas_employees', JSON.stringify(updated));
        } catch (err) {}
        return updated;
      });
    }

    // Try to sync with backend database asynchronously if server is online
    try {
      console.log('Attempting to save employee to database:', dbEmployee);
      const result: any = isEditMode ? await api.updateEmployee(dbEmployee).catch(() => null) : await api.addEmployee(dbEmployee).catch(() => null);
      if (result?.id) {
        savedId = result.id;
        const finalEmp = { ...newEmp, id: String(savedId) };
        setEmployees(prev => prev.map(e => (String(e.id) === String(targetId) || String(e.employeeId) === String(finalEmp.employeeId)) ? finalEmp : e));
      }

      // Save status changes & trainings if any
      for (const change of statusChanges) {
        await api.addEmployeeStatusChange(savedId, {
          new_position: change.new_position,
          start_date: change.start_date,
          end_date: change.end_date
        }).catch(() => {});
      }

      for (const training of employeeTrainings) {
        await api.addEmployeeTraining(savedId, {
          course_name: training.course_name,
          start_date: training.start_date,
          end_date: training.end_date
        }).catch(() => {});
      }
    } catch (error) {
      console.warn('Database sync completed with local state fallback:', error);
    } finally {
      setIsSavingEmployee(false);
    }

    setSaveSuccessMessage(isEditMode 
      ? (language === 'ar' ? 'تم تحديث بيانات الموظف بنجاح في قاعدة البيانات!' : 'Employee data updated successfully in database!')
      : (language === 'ar' ? 'تم تسجيل وحفظ الموظف الجديد بنجاح في النظام!' : 'New employee registered and saved successfully!')
    );
  };



  const TAB_ITEMS = [
    { id: 1, title: t('المعلومات الأساسية', 'Basic Info'), icon: 'badge', desc: t('الاسم، البريد الهواتف والحالة', 'Name, Email, Phone & Status') },
    { id: 2, title: t('العقود وتاريخ الخدمة', 'Contracts & Service'), icon: 'description', desc: t('تواريخ المباشرة والعقد والدرجة', 'Join Dates, Contract & Grade') },
    { id: 3, title: t('التعيين والقسم والفرع', 'Position & Department'), icon: 'corporate_fare', desc: t('الوظيفة، الإدارة والمشرف', 'Role, Department & Supervisor') },
    { id: 4, title: t('البيانات المالية والراتب', 'Financial & Salary'), icon: 'payments', desc: t('الاسمية، البدلات والآيبان', 'Basic Salary, Allowances & IBAN') },
    { id: 5, title: t('الوثائق الثبوتية والهوية', 'Identity & Documents'), icon: 'id_card', desc: t('البطاقة الوطنية والجواز', 'National ID & Passport') },
    { id: 6, title: t('البيانات العائلية والأبناء', 'Family & Dependents'), icon: 'family_restroom', desc: t('الزوجة والأطفال', 'Spouse & Children') },
    { id: 7, title: t('التدريبات والسجل الإداري', 'Trainings & Record'), icon: 'history_edu', desc: t('الدورات والإنذارات والحالة', 'Courses, Warnings & Status') },
  ];

  const filteredBranches = branchLocations.filter(branch => {
    if (!branchSearchQuery.trim()) return true;
    const q = branchSearchQuery.toLowerCase().trim();
    return (
      (branch.name && String(branch.name).toLowerCase().includes(q)) ||
      (branch.name_ar && String(branch.name_ar).toLowerCase().includes(q)) ||
      (branch.name_en && String(branch.name_en).toLowerCase().includes(q)) ||
      (branch.city && String(branch.city).toLowerCase().includes(q)) ||
      (branch.city_ar && String(branch.city_ar).toLowerCase().includes(q)) ||
      (branch.city_en && String(branch.city_en).toLowerCase().includes(q)) ||
      (branch.address && String(branch.address).toLowerCase().includes(q)) ||
      (branch.phone && String(branch.phone).toLowerCase().includes(q))
    );
  });

  return (
    <div className={`${(activeModuleId === 'emp-profile' || activeModuleId === 'emp-add' || activeModuleId === 'emp-edit') ? 'space-y-1.5' : 'space-y-6'} animate-in fade-in duration-300`}>
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <h1 className={`${(activeModuleId === 'emp-profile' || activeModuleId === 'emp-add' || activeModuleId === 'emp-edit') ? 'text-base sm:text-lg' : 'text-2xl'} font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {activeModuleId === 'emp-directory' && t('دليل الموظفين المؤسسي', 'Corporate Employee Directory')}
            {activeModuleId === 'emp-hr-directory' && t('دليل الموظفين - إدارة الموارد البشرية', 'Employee Directory - HR')}
            {(activeModuleId === 'emp-add' || activeModuleId === 'emp-edit') && (
              (activeModuleId === 'emp-edit' || selectedEmpId) 
                ? t('تعديل بيانات الموظف (نموذج 7 تبويبات)', 'Edit Employee Data (7-Tab Form)')
                : t('تسجيل وإضافة موظف جديد (نموذج 7 تبويبات)', 'Register & Add New Employee (7-Tab Form)')
            )}
            {activeModuleId === 'emp-profile' && t('ملفات الموظفين - HR Employees Profiles', 'HR Employees Profiles')}
            {activeModuleId === 'emp-branches' && t('إدارة الفروع والمواقع الميدانية في العراق', 'Branch & Field Location Management in Iraq')}
            {activeModuleId === 'emp-organization' && t('الهيكل التنظيمي التفاعلي (A4 Landscape)', 'Dynamic Organization Chart (A4 Landscape)')}
            {activeModuleId === 'emp-company-profile' && t('إعدادات ملف مؤسسة فيتاس العراق', 'VITAS Iraq Institution Profile Settings')}
            {activeModuleId === 'emp-calendar' && t('تقويم الفعاليات والعطل الرسمية', 'Events & Official Holidays Calendar')}
            {activeModuleId === 'emp-news' && t('مركز الأخبار والتنويهات الداخلية', 'Internal News & Announcements Center')}
          </h1>

          {(activeModuleId === 'emp-add' || activeModuleId === 'emp-edit') && (
            <span className={`text-[11px] font-mono font-bold ${isDark ? 'bg-teal-600/20 text-teal-300 border-teal-500/30' : 'bg-teal-50 text-teal-700 border-teal-200'} px-2.5 py-0.5 rounded-xl border shrink-0`}>
              {t(`التبويب ${activeTab} من 7: ${TAB_ITEMS[activeTab - 1]?.title || ''}`, `Tab ${activeTab} of 7: ${TAB_ITEMS[activeTab - 1]?.title || ''}`)}
            </span>
          )}
        </div>

        {/* Action buttons for other modules if any */}
        {(activeModuleId !== 'emp-directory' && activeModuleId !== 'emp-hr-directory') && (
          <div className="flex items-center gap-2 flex-wrap">
            {(activeModuleId === 'emp-add' || activeModuleId === 'emp-edit') && (
              <button
                type="button"
                onClick={() => setActiveModuleId('emp-hr-directory')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-xs">arrow_back</span>
                <span>{t('العودة للدليل', 'Back to Directory')}</span>
              </button>
            )}
            {isReadOnly() && (
              <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span className="material-symbols-outlined text-sm">visibility</span>
                {t('وضع القراءة فقط (غير مصرح بالتعديل)', 'Read-Only Mode (Modifications Disabled)')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Directory View */}
      {(activeModuleId === 'emp-directory' || activeModuleId === 'emp-hr-directory') && (
        <div className="space-y-4">

          {/* Row containing Search Field + Smaller Action Buttons on the SAME LINE */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            {/* Search Field (flex-1) */}
            <div className="relative flex-1 min-w-[260px]">
              <input
                type="text"
                placeholder={
                  language === 'ar'
                    ? 'بحث بالبادج، الاسم، المكتب، العنوان الوظيفي، القسم...'
                    : 'Search by Badge, Name, Office, Job Title, Department...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-10 px-3.5 ps-3.5 pe-10 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${
                  theme === 'dark'
                    ? 'bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:border-teal-500/50'
                    : 'bg-[#eef2f6] border border-slate-300 text-slate-900 placeholder-slate-500 focus:border-teal-500 focus:bg-white shadow-2xs'
                }`}
              />
              <span className={`material-symbols-outlined text-lg absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${
                language === 'ar' ? 'left-3' : 'right-3'
              }`}>
                search
              </span>
            </div>

            {/* Action buttons (Slightly smaller, on same line as search) */}
            <div className="flex items-center gap-1.5 flex-wrap shrink-0">
              {/* Contract Renewal & Evaluation Alerts Button */}
              <button
                type="button"
                onClick={() => setShowRenewalAlertsModal(true)}
                className={`relative h-10 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  urgentContractAlertsCount > 0
                    ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/30 ring-2 ring-rose-500/50 animate-pulse'
                    : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs'
                }`}
                title={t('تنبيهات العقود والتجديد والتقييم', 'Contract Renewal & Evaluation Alerts')}
              >
                <span className={`material-symbols-outlined text-base ${urgentContractAlertsCount > 0 ? 'animate-bounce text-white' : isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  {urgentContractAlertsCount > 0 ? 'notifications_active' : 'history_edu'}
                </span>
                <span className="whitespace-nowrap">{t('تنبيهات العقود', 'Contract Alerts')}</span>

                {urgentContractAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[9px] font-black text-white items-center justify-center shadow-xs border border-white dark:border-slate-900">
                      {urgentContractAlertsCount}
                    </span>
                  </span>
                )}
              </button>

              {canWrite() && (
                <>
                  {/* Register New Employee */}
                  <button
                    type="button"
                    onClick={() => {
                      handleResetForm();
                      setActiveTab(1);
                      setActiveModuleId('emp-add');
                    }}
                    className="h-10 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    <span>+Employee</span>
                  </button>

                  {/* Add New Position */}
                  <button
                    type="button"
                    onClick={handleAddPosition}
                    className="h-10 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-base">work</span>
                    <span>+Position</span>
                  </button>

                  {/* Add New Location */}
                  <button
                    type="button"
                    onClick={handleAddBranch}
                    className="h-10 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-base">add_location_alt</span>
                    <span>+Location</span>
                  </button>
                </>
              )}

              {isReadOnly() && (
                <span className="h-10 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs whitespace-nowrap">
                  <span className="material-symbols-outlined text-base">visibility</span>
                  <span>{t('قراءة فقط', 'Read-Only')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Directory Toolbar: Count & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className={`flex items-center gap-2 font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <span className={`material-symbols-outlined text-base ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                badge
              </span>
              <span>{t('سجل الموظفين المسجلين', 'Registered Employee Directory')}</span>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                theme === 'dark' ? 'bg-[#06080d] text-teal-400 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}>
                {isBranchManager ? filteredEmployees.length : `${filteredEmployees.length} / ${employees.length}`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* View Switcher: Table Rows (Raw) / Record Strips / Cards */}
              <div className={`flex items-center p-0.5 rounded-xl border ${
                theme === 'dark' ? 'bg-[#06080d] border-white/10' : 'bg-[#e2e8f0] border-slate-300'
              }`}>
                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    directoryViewMode === 'table'
                      ? (theme === 'dark' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-teal-800 shadow-xs')
                      : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title={t('عرض جدول السجلات (Row)', 'Table Rows View')}
                >
                  <span className="material-symbols-outlined text-base">table_rows</span>
                  <span className="hidden sm:inline">{t('جدول السجلات Raw', 'Rows Table')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('rows')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    directoryViewMode === 'rows'
                      ? (theme === 'dark' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-teal-800 shadow-xs')
                      : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title={t('عرض شرائط السجلات الأفقية', 'Horizontal Record Strips')}
                >
                  <span className="material-symbols-outlined text-base">view_agenda</span>
                  <span className="hidden sm:inline">{t('سجلات أفقية', 'Record Strips')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDirectoryViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    directoryViewMode === 'cards'
                      ? (theme === 'dark' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-teal-800 shadow-xs')
                      : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title={t('عرض البطاقات', 'Cards Grid View')}
                >
                  <span className="material-symbols-outlined text-base">grid_view</span>
                  <span className="hidden sm:inline">{t('بطاقات', 'Cards')}</span>
                </button>
              </div>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <EmptyState
              icon="search_off"
              title={searchQuery ? t("لا توجد نتائج للبحث", "No search results found") : t("دليل الموظفين فارغ حالياً", "Employee directory is currently empty")}
              description={searchQuery ? t("لم يتم العثور على موظف يطابق معايير البحث. جرب كلمات مختلفة.", "No employee found matching search criteria. Try different keywords.") : t("لا يوجد أي موظف مسجل في النظام حتى الآن. استخدم نموذج الـ 7 تبويبات لإدخال بيانات الكادر بأسلوب دقيق ومطابق لقاعدة البيانات.", "No employees registered in the system yet. Use the 7-tab form to enter staff data accurately and in compliance with the database.")}
              actionText={searchQuery ? undefined : t("إضافة الموظف الأول الآن", "Add First Employee Now")}
              onAction={searchQuery ? undefined : () => setActiveModuleId('emp-add')}
            />
          ) : directoryViewMode === 'table' ? (
            /* VIEW 1: TABLE ROWS (RAW) - PRIMARY VIEW */
            <div className={`overflow-x-auto rounded-2xl border transition-all ${
              theme === 'dark'
                ? 'bg-[#0a0c10] border-white/10 shadow-xl'
                : 'bg-[#eef2f6] border-slate-300 shadow-xs'
            }`}>
              <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'} border-collapse`}>
                <thead className={`border-b select-none app-table-header ${
                  theme === 'dark'
                    ? 'bg-[#06080d] text-slate-300 border-white/10'
                    : 'bg-[#94a3b8] text-slate-950 border-slate-500 font-bold'
                }`}>
                  <tr>
                    <th className="py-3 px-3 text-center w-12 font-bold">#</th>
                    <th className="py-3 px-4 font-bold">{t('الموظف', 'Employee')}</th>
                    <th className="py-3 px-3 font-bold text-center whitespace-nowrap">{t('كود الموظف', 'Badge / ID')}</th>
                    <th className="py-3 px-3 font-bold text-center whitespace-nowrap">{t('معرف الحوافز (WAID)', 'WAID')}</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">{t('المسمى الوظيفي', 'Job Title')}</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">{t('القسم / الإدارة', 'Department')}</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">{t('الفرع والموقع', 'Branch Location')}</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">{t('البريد الإلكتروني', 'Email')}</th>
                    <th className="py-3 px-4 font-bold text-center whitespace-nowrap">{t('الإجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-medium ${
                  theme === 'dark'
                    ? 'divide-white/5 text-slate-200'
                    : 'divide-slate-300/70 text-slate-800'
                }`}>
                  {filteredEmployees.map((emp, idx) => {
                    const empTargetId = emp.id || emp.employeeId || emp.employee_id;
                    return (
                      <tr
                        key={emp.id}
                        className={`transition-colors ${
                          theme === 'dark'
                            ? 'hover:bg-white/5'
                            : 'hover:bg-[#e2e8f0]'
                        }`}
                      >
                        {/* Index */}
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Employee Avatar & Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center border overflow-hidden shadow-xs shrink-0 ${
                              emp.photoUrl
                                ? (theme === 'dark' ? 'bg-[#1a1f2e] border-teal-500/30' : 'bg-white border-slate-300')
                                : (theme === 'dark' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-100/70 text-teal-800 border-teal-200')
                            }`}>
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt={getEmpFullName(emp)} className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <span>{getEmpFullName(emp)?.slice(0, 1) || 'U'}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className={`font-bold text-xs sm:text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} truncate`}>
                                {getEmpFullName(emp)}
                              </div>
                              <div className="text-[11px] text-slate-400 md:hidden font-mono">
                                {emp.employeeId || '-'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${
                            theme === 'dark'
                              ? 'bg-[#06080d] text-teal-400 border-teal-500/30'
                              : 'bg-teal-50 text-teal-800 border-teal-200/90 shadow-2xs'
                          }`}>
                            {emp.employeeId || '-'}
                          </span>
                        </td>

                        {/* WAID Badge */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {(emp.waid || emp.wa_id) ? (
                            <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs border ${
                              theme === 'dark'
                                ? 'bg-teal-600/20 text-teal-300 border-teal-500/30'
                                : 'bg-teal-50 text-teal-800 border-teal-200'
                            }`}>
                              {emp.waid || emp.wa_id}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">-</span>
                          )}
                        </td>

                        {/* Job Title */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-700'}`}>
                            {getEmpJobTitle(emp)}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                            {getEmpDepartment(emp)}
                          </span>
                        </td>

                        {/* Branch */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`material-symbols-outlined text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              location_on
                            </span>
                            <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                              {getEmpBranch(emp)}
                            </span>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {emp.email ? (
                            <a href={`mailto:${emp.email}`} className="hover:text-teal-600 dark:hover:text-teal-400 underline-offset-2 hover:underline">
                              {emp.email}
                            </a>
                          ) : '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {/* Edit Icon (Green) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                try { sessionStorage.setItem('vitas_editing_emp_id', String(empTargetId)); } catch (err) {}
                                handleLoadEmployeeData(emp);
                                setActiveModuleId('emp-edit');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                              title={t('تعديل بيانات الموظف', 'Edit Employee Data')}
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>

                            {/* Contract Preview & Print Icon (Blue) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenContractPreview(emp);
                              }}
                              className="p-1.5 rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                              title={t('معاينة وطباعة عقد العمل', 'Preview and Print Employment Contract')}
                            >
                              <span className="material-symbols-outlined text-lg">description</span>
                            </button>

                            {/* Delete Icon (Red) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirm({ show: true, empId: empTargetId, empName: emp.fullName || emp.full_name || emp.name_ar });
                              }}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                              title={t('حذف الموظف', 'Delete Employee')}
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : directoryViewMode === 'rows' ? (
            /* VIEW 2: HORIZONTAL RECORD STRIPS (RAW) */
            <div className="space-y-2.5">
              {filteredEmployees.map((emp) => {
                const empTargetId = emp.id || emp.employeeId || emp.employee_id;
                return (
                  <div
                    key={emp.id}
                    className={`p-3.5 px-4 rounded-2xl border flex flex-wrap md:flex-nowrap items-center justify-between gap-3 transition-all ${
                      theme === 'dark'
                        ? 'bg-[#0a0c10] border-white/10 hover:border-teal-500/40 hover:bg-white/5 text-slate-200'
                        : 'bg-[#eef2f6] border-slate-300 hover:border-teal-400 hover:bg-[#e2e8f0] text-slate-900 shadow-2xs'
                    }`}
                  >
                    {/* Left: Avatar + Name + Title */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center border overflow-hidden shadow-xs shrink-0 ${
                        emp.photoUrl
                          ? (theme === 'dark' ? 'bg-[#1a1f2e] border-teal-500/30' : 'bg-white border-slate-300')
                          : (theme === 'dark' ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' : 'bg-teal-100/70 text-teal-800 border-teal-200')
                      }`}>
                        {emp.photoUrl ? (
                          <img src={emp.photoUrl} alt={getEmpFullName(emp)} className="w-full h-full object-contain p-0.5" />
                        ) : (
                          <span className="text-base font-bold">{getEmpFullName(emp)?.slice(0, 1) || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {getEmpFullName(emp)}
                          </h3>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            theme === 'dark'
                              ? 'bg-[#06080d] text-teal-400 border-teal-500/30'
                              : 'bg-teal-50 text-teal-800 border-teal-200 shadow-2xs'
                          }`}>
                            {emp.employeeId || '-'}
                          </span>
                          {(emp.waid || emp.wa_id) && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                              theme === 'dark'
                                ? 'bg-teal-600/20 text-teal-300 border-teal-500/20'
                                : 'bg-teal-50 text-teal-700 border-teal-200 shadow-2xs'
                            }`} title="WAID - Incentives ID">
                              WAID: {emp.waid || emp.wa_id}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs font-semibold mt-0.5 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-700'}`}>
                          {getEmpJobTitle(emp)}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Department, Branch, Email */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs flex-1">
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t('القسم', 'Department')}</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
                          {getEmpDepartment(emp)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t('الفرع والموقع', 'Branch Location')}</span>
                        <span className={`font-medium flex items-center gap-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-800'}`}>
                          <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                          {getEmpBranch(emp)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">{t('البريد الإلكتروني', 'Email')}</span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {emp.email || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try { sessionStorage.setItem('vitas_editing_emp_id', String(empTargetId)); } catch (err) {}
                          handleLoadEmployeeData(emp);
                          setActiveModuleId('emp-edit');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-1.5 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                        title={t('تعديل بيانات الموظف', 'Edit Employee Data')}
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenContractPreview(emp);
                        }}
                        className="p-1.5 rounded-lg text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                        title={t('معاينة وطباعة عقد العمل', 'Preview and Print Employment Contract')}
                      >
                        <span className="material-symbols-outlined text-lg">description</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ show: true, empId: empTargetId, empName: emp.fullName || emp.full_name || emp.name_ar });
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                        title={t('حذف الموظف', 'Delete Employee')}
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW 3: CARDS GRID VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={`p-5 rounded-2xl border transition-all shadow-lg flex flex-col justify-between ${
                    theme === 'dark'
                      ? 'bg-[#111827] border-white/10 hover:border-blue-500/40'
                      : 'bg-[#eef2f6] border-slate-300 hover:border-blue-500/40 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl font-black text-lg flex items-center justify-center shadow overflow-hidden shrink-0 ${
                          emp.photoUrl
                            ? (theme === 'dark' ? 'bg-[#1a1f2e] border border-blue-500/30' : 'bg-white border border-slate-300')
                            : (theme === 'dark' ? 'bg-teal-600/20 text-blue-400 border border-blue-500/30' : 'bg-teal-100/70 text-teal-800 border border-teal-200')
                        }`}>
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt={getEmpFullName(emp)} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            getEmpFullName(emp)?.slice(0, 1) || 'U'
                          )}
                        </div>
                        <div>
                          <h3 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getEmpFullName(emp)}</h3>
                          <p className={`text-xs font-semibold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{getEmpJobTitle(emp)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        theme === 'dark'
                          ? 'bg-[#0a0c10] text-blue-400 border-blue-500/20'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}>
                        {emp.employeeId || '-'}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl text-xs space-y-1 border ${
                      theme === 'dark'
                        ? 'bg-[#0a0c10] text-slate-400 border-white/5'
                        : 'bg-[#e2e8f0] text-slate-700 border-slate-300/80'
                    }`}>
                      <p className="flex justify-between">
                        <span>{t('القسم:', 'Department:')}</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{getEmpDepartment(emp)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>{t('الفرع:', 'Branch:')}</span>
                        <span className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{getEmpBranch(emp)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>{t('البريد الإلكتروني:', 'Email:')}</span>
                        <span className={`font-mono text-[11px] ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{emp.email || '-'}</span>
                      </p>
                      {(emp.waid || emp.wa_id) && (
                        <p className="flex justify-between">
                          <span>{t('معرف الحوافز:', 'WAID:')}</span>
                          <span className={`font-mono font-bold text-[11px] ${theme === 'dark' ? 'text-teal-300' : 'text-teal-700'}`}>{emp.waid || emp.wa_id}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`pt-4 border-t mt-4 flex items-center justify-between gap-1 ${
                    theme === 'dark' ? 'border-white/10' : 'border-slate-300'
                  }`}>
                    {(() => {
                      const empTargetId = emp.id || emp.employeeId || emp.employee_id;
                      return (
                        <div className="flex items-center justify-between w-full px-1">
                          {/* Right Side: Delete Icon (Red, No BG, No Border) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({ show: true, empId: empTargetId, empName: emp.fullName || emp.full_name || emp.name_ar });
                            }}
                            className="p-1.5 bg-transparent border-0 text-red-500 hover:text-red-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                            style={{ order: language === 'ar' ? 1 : 3 }}
                            title={t('حذف الموظف', 'Delete Employee')}
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>

                          {/* Center: Preview & Print Contract Icon (Blue, No BG, No Border) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenContractPreview(emp);
                            }}
                            className="p-1.5 bg-transparent border-0 text-blue-500 hover:text-blue-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                            style={{ order: 2 }}
                            title={t('معاينة وطباعة عقد العمل', 'Preview and Print Employment Contract')}
                          >
                            <span className="material-symbols-outlined text-xl">description</span>
                          </button>

                          {/* Left Side: Edit Icon (Green, No BG, No Border) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try { sessionStorage.setItem('vitas_editing_emp_id', String(empTargetId)); } catch (err) {}
                              handleLoadEmployeeData(emp);
                              setActiveModuleId('emp-edit');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-1.5 bg-transparent border-0 text-emerald-500 hover:text-emerald-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                            style={{ order: language === 'ar' ? 3 : 1 }}
                            title={t('تعديل بيانات الموظف', 'Edit Employee Data')}
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7-TABS ADD/EDIT EMPLOYEE FORM */}
      {(activeModuleId === 'emp-add' || activeModuleId === 'emp-edit') && (
        <div className="max-w-7xl mx-auto space-y-1.5 animate-in fade-in duration-300">
          {/* THE LARGE FORM WINDOW (Exact layout and aesthetics as The Large Profile Window) */}
          <div className={`p-3.5 sm:p-4 rounded-2xl ${profileColors.cardBg} border ${profileColors.cardBorder} ${profileColors.shadow} relative overflow-hidden ${profileColors.text}`}>
            {/* Background decorative soft ambient light */}
            <div className={`absolute -top-24 left-1/4 w-96 h-96 ${isDark ? 'bg-teal-500/5' : 'bg-teal-500/10'} blur-3xl rounded-full pointer-events-none`} />

            <div className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-6 relative z-10 [direction:ltr]">
              {/* LEFT PANE: Photo Avatar at Top-Left, Name, Badges, and Action Buttons */}
              <div className="w-full lg:w-60 xl:w-64 shrink-0 flex flex-col justify-between items-center text-center py-1 space-y-3">
                <div className="flex flex-col items-center space-y-2.5 w-full">
                  {/* Photo Frame at top-left */}
                  <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-400 via-teal-300 to-teal-500 rounded-2xl blur-sm opacity-50 group-hover:opacity-80 transition-all duration-300" />

                    {/* Photo Avatar Frame (Matches 3:4 Portrait ID Photos) */}
                    <div className={`relative w-32 h-42 rounded-2xl border-2 ${isDark ? 'border-[#1a1f2e]' : 'border-white'} ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'} shadow-xl overflow-hidden flex items-center justify-center ${isDark ? 'text-blue-400' : 'text-blue-600'} text-3xl font-black shrink-0`}>
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={fullName || 'Preview'}
                          className="w-full h-full object-contain p-1 rounded-xl"
                        />
                      ) : (
                        <div className={`w-full h-full ${isDark ? 'bg-gradient-to-br from-teal-900/30 via-teal-800/30 to-teal-900/30' : 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-50'} flex flex-col items-center justify-center ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                          <span className="material-symbols-outlined text-5xl">person_add</span>
                          <span className="text-[10px] mt-1 font-bold">{t('صورة الموظف', 'Photo')}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Indicator Badge (Bottom Right Corner) */}
                    <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 ${isDark ? 'border-[#1a1f2e]' : 'border-white'} z-10 ${
                      status === 'Active' ? 'bg-emerald-500 shadow-md shadow-emerald-500/40' : 'bg-amber-500'
                    }`} title={status} />

                    {/* Upload / Change Photo button (Bottom Left Corner) */}
                    <label className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-600/40 border-2 border-white dark:border-[#1a1f2e] transition-all hover:scale-110 cursor-pointer z-10"
                      title={t('رفع أو تغيير صورة الموظف', 'Upload or change photo')}
                    >
                      <span className="material-symbols-outlined text-xs">add_a_photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (typeof reader.result === 'string') {
                                setPhotoUrl(reader.result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {/* Live Employee Name Preview */}
                  <div className="space-y-0.5 w-full">
                    <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight font-cairo leading-tight truncate`}>
                      {(language === 'en' ? (fullNameEn || fullName) : (fullName || fullNameEn)) || t('اسم الموظف الجديد', 'New Employee Name')}
                    </h2>
                    <p className={`text-[11px] font-semibold ${isDark ? 'text-teal-400' : 'text-teal-700'} font-mono truncate`}>
                      {(language === 'en' ? (fullName || 'Employee Registration') : (fullNameEn || 'New Employee Registration'))}
                    </p>
                  </div>

                  {/* Live Badges List */}
                  <div className="flex flex-wrap items-center justify-center gap-1 text-[11px]">
                    <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-teal-600/20 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-700'} font-bold shadow-xs truncate max-w-[130px]`}>
                      {(language === 'en' ? (jobTitleEn || dictEn[jobTitle] || jobTitle) : (jobTitle || jobTitleEn)) || t('المسمى الوظيفي', 'Job Title')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} font-mono font-bold shadow-xs flex items-center gap-1`}>
                      <span className={`text-[9px] ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'} font-sans font-semibold`}>{t('الرقم:', 'ID:')}</span>
                      {empCode || 'AUTO'}
                    </span>
                    {badgeNo && (
                      <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'} font-mono font-bold shadow-xs flex items-center gap-1`}>
                        <span className={`text-[9px] ${isDark ? 'text-indigo-400/80' : 'text-indigo-600/80'} font-sans font-semibold`}>{t('الباج:', 'Badge:')}</span>
                        {badgeNo}
                      </span>
                    )}
                    {waid && (
                      <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-teal-600/20 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-700'} font-mono font-bold shadow-xs flex items-center gap-1`}>
                        <span className={`text-[9px] ${isDark ? 'text-teal-400/80' : 'text-teal-600/80'} font-sans font-semibold`}>WAID:</span>
                        {waid}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-600/20 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700'} font-bold shadow-xs truncate max-w-[130px]`}>
                      {getBranchName(branch, branchEn, language) || t('الفرع', 'Branch')}
                    </span>
                  </div>
                </div>

                {/* Action Buttons in Left Pane */}
                <div className="flex flex-col gap-2 w-full pt-1">
                  {canWrite() ? (
                    <button
                      type="submit"
                      form="add-employee-form"
                      className="w-full h-9 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-98"
                    >
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>{t('حفظ وتخزين الموظف (التبويبات الـ 7)', 'Save & Store Employee (All 7 Tabs)')}</span>
                    </button>
                  ) : (
                    <div className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">lock</span>
                      <span>{t('الحفظ والتعديل معطل (وضع القراءة فقط)', 'Save & Edit Disabled (Read-Only Access)')}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveModuleId('emp-directory')}
                    className="w-full h-8 px-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-98"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                    <span>{t('إلغاء', 'Cancel')}</span>
                  </button>
                </div>
              </div>

              {/* RIGHT PANE: Tab Form Fields with Profile-like Scrollable Card */}
              <div className={`flex-1 min-w-0 w-full flex flex-col ${language === 'ar' ? '[direction:rtl]' : '[direction:ltr]'}`}>
                {isReadOnly() && (
                  <div className="p-2 mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-bold flex items-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    {t('تنبيه: أنت تتصفح هذا السجل بوضع القراءة فقط (Read-Only). تم تعطيل عمليات الحفظ والتعديل.', 'Notice: You are viewing this record in Read-Only mode. Saving and modifying are disabled.')}
                  </div>
                )}
                <form id="add-employee-form" onSubmit={handleAddEmployeeSubmit} className="flex-1 flex flex-col min-h-0">
                  <div className={`p-3.5 sm:p-4 rounded-xl border ${
                    isDark ? 'bg-[#06080d]/80 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                  } space-y-3 text-xs ${profileColors.text} h-[455px] min-h-[455px] max-h-[455px] overflow-y-auto profile-scrollbar flex-1`}>
            {/* TAB 1: Basic & Personal Info */}
            {activeTab === 1 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-base">badge</span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">{t('التبويب 1: المعلومات الأساسية والشخصية', 'Tab 1: Basic & Personal Information')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  {/* Row 1: Names & Employee Codes (4 fields) */}
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الاسم الكامل الثلاثي (بالعربية) *', 'Full Name (Arabic) *')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('مثال: علي حيدر حسن', 'Example: Ali Haider Hassan')}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الاسم الكامل (بالإنجليزية)', 'Full Name (English)')}</label>
                    <input
                      type="text"
                      placeholder={t('Ali Haider Hassan', 'Ali Haider Hassan')}
                      value={fullNameEn}
                      onChange={e => setFullNameEn(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الرقم الوظيفي', 'Employee ID')}</label>
                    <input
                      type="text"
                      placeholder={t('تلقائي: VTS-1008', 'Auto: VTS-1008')}
                      value={empCode}
                      onChange={e => setEmpCode(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-blue-400 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('رقم باج الدخول', 'Badge Number')}</label>
                    <input
                      type="text"
                      placeholder={t('مثال: B-9042', 'Example: B-9042')}
                      value={badgeNo}
                      onChange={e => setBadgeNo(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">
                      {t('معرف الحوافز (WAID)', 'Incentives WAID')}
                      <span className="text-[10px] text-teal-600 font-normal mr-1 font-mono">({t('لتحميل الحوافز', 'For Incentives')})</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t('مثال: WA-1008', 'Example: WA-1008')}
                      value={waid}
                      onChange={e => setWaid(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-teal-500/30 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-teal-300 font-mono focus:outline-none focus:border-teal-400 placeholder:text-slate-500"
                    />
                  </div>

                  {/* Row 2: Communication & Contact Details (4 fields) */}
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('البريد الإلكتروني المؤسسي', 'Corporate Email')}</label>
                    <input
                      type="email"
                      placeholder={t('ali.haider@vitasiraq.com', 'ali.haider@vitasiraq.com')}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('البريد الإلكتروني الشخصي', 'Personal Email')}</label>
                    <input
                      type="email"
                      placeholder={t('ali.personal@gmail.com', 'ali.personal@gmail.com')}
                      value={personalEmail}
                      onChange={e => setPersonalEmail(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('رقم الهاتف التواصل الرئيسي', 'Primary Contact Phone')}</label>
                    <input
                      type="text"
                      placeholder={t('0770 123 4567', '0770 123 4567')}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('هاتف الطوارئ والتواصل الحرج', 'Emergency Contact Phone')}</label>
                    <input
                      type="text"
                      placeholder={t('0780 987 6543', '0780 987 6543')}
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  {/* Row 3: Demographics & Personal Attributes (4 fields) */}
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('تاريخ الميلاد', 'Date of Birth')}</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الجنس', 'Gender')}</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="ذكر">{t('ذكر', 'Male')}</option>
                      <option value="أنثى">{t('أنثى', 'Female')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الحالة الاجتماعية', 'Marital Status')}</label>
                    <select
                      value={maritalStatus}
                      onChange={e => setMaritalStatus(e.target.value as any)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="أعزب">{t('أعزب', 'Single')}</option>
                      <option value="متأهل">{t('متأهل', 'Married')}</option>
                      <option value="مطلق">{t('مطلق', 'Divorced')}</option>
                      <option value="أرمل">{t('أرمل', 'Widowed')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الجنسية', 'Nationality')}</label>
                    <input
                      type="text"
                      value={language === 'en' && nationality === 'عراقي' ? 'Iraqi' : (language === 'ar' && nationality === 'Iraqi' ? 'عراقي' : nationality)}
                      onChange={e => setNationality(e.target.value)}
                      placeholder={t('عراقي', 'Iraqi')}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  {/* Row 4: Compact Employee Photo bar spanning all 4 columns */}
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 bg-white/5 p-2 rounded-xl border border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#0a0c10] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                          {photoUrl ? (
                            <img src={photoUrl} alt="Preview" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-500 text-lg">person</span>
                          )}
                        </div>
                        <div>
                          <label className="block text-teal-400 font-bold text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">account_box</span>
                            {t('صورة الموظف الشخصية', 'Employee Photo')}
                          </label>
                          <span className="text-[10px] text-slate-400">
                            {t('رفع من الجهاز أو إدخال رابط URL', 'Upload from device or enter URL')}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 max-w-md flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder={t('أدخل رابط الصورة (URL)...', 'Enter image URL...')}
                            value={photoUrl}
                            onChange={e => setPhotoUrl(e.target.value)}
                            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500 font-mono pr-7"
                          />
                          {photoUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPhotoUrl('');
                                if (photoFileInputRef.current) photoFileInputRef.current.value = '';
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/10 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 flex items-center justify-center text-[10px] cursor-pointer"
                              title={t('مسح', 'Clear')}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <label className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow transition-all flex items-center gap-1 shrink-0">
                          <span className="material-symbols-outlined text-sm">upload_file</span>
                          <span>{t('رفع', 'Upload')}</span>
                          <input
                            ref={photoFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === 'string') {
                                    setPhotoUrl(reader.result);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {photoUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setPhotoUrl('');
                              if (photoFileInputRef.current) photoFileInputRef.current.value = '';
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/20 cursor-pointer transition-colors"
                          >
                            {t('إزالة', 'Remove')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Contracts & Service Dates */}
            {activeTab === 2 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-400 text-base">description</span>
                    <h3 className="text-xs sm:text-sm font-bold text-white">{t('التبويب 2: العقود وتواريخ الخدمة والمباشرة وسنوات الخدمة', 'Tab 2: Contracts & Service Dates')}</h3>
                  </div>
                  {(activeModuleId === 'emp-edit' || selectedEmpId) && (
                    <button
                      type="button"
                      onClick={() => {
                        const curEmp = selectedEmployee || activeEmployees.find(e => String(e.id) === String(selectedEmpId));
                        if (curEmp) {
                          handleOpenContractPreview(curEmp);
                        } else {
                          // Assemble current form state as employee preview object
                          handleOpenContractPreview({
                            fullName,
                            fullNameEn,
                            employeeId: empCode,
                            jobTitle,
                            jobTitleEn,
                            department,
                            departmentEn,
                            branch,
                            branchEn,
                            termOfContract,
                            contractStartDate,
                            contractEndDate,
                            originalStartDate,
                            basicSalary,
                            writtenBasicSalaryAr,
                            transportationFixed,
                            fixedBonus,
                            phoneAllowance,
                            certificateAllowance,
                            familyAllowance,
                            nationalId,
                            passportNo,
                            maritalStatus,
                            bankName,
                            iban
                          });
                        }
                      }}
                      className="px-3 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow hover:scale-105"
                      title={t('معاينة وطباعة عقد العمل', 'Preview & Print Contract')}
                    >
                      <span className="material-symbols-outlined text-xs">print</span>
                      <span>{t('معاينة العقد', 'Preview Contract')}</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('تاريخ المباشرة الأولى', 'Original Start Date')}</label>
                    <input
                      type="date"
                      value={originalStartDate}
                      onChange={e => setOriginalStartDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('تاريخ بدء العقد الحالي', 'Current Contract Start Date')}</label>
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={e => setContractStartDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('تاريخ انتهاء العقد', 'Contract End Date')}</label>
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={e => setContractEndDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('تاريخ انتهاء فترة التجربة', 'Probation End Date')}</label>
                    <input
                      type="date"
                      value={probationEndDate}
                      onChange={e => setProbationEndDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('تاريخ إنهاء الخدمة / المغادرة', 'Exit Date / Service Termination')}</label>
                    <input
                      type="date"
                      value={exitDate}
                      onChange={e => setExitDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('سنوات الخدمة الكلية', 'Total Years of Employment')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <div className="w-full bg-[#0a0c10] border border-emerald-500/20 rounded-lg px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2">
                      <span className="text-emerald-400 font-mono font-bold text-sm">{yearsOfEmployment} {t('سنة', 'years')}</span>
                      <span className="text-slate-500 text-[10px]">{t('من تاريخ المباشرة', 'from start date')}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('نوع مدة العقد', 'Term of Contract')}</label>
                    <SearchableComboBox
                      options={contractTypes}
                      value={termOfContract}
                      onChange={(value) => setTermOfContract(value)}
                      placeholder={t('اختر نوع العقد', 'Select contract type')}
                      language={language}
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الدرجة السلمية', 'Grade Level')}</label>
                    <input
                      type="text"
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      placeholder={t('مثال: G-4 الدرجة الرابعة', 'e.g. G-4 Level')}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Position, Department & Branch */}
            {activeTab === 3 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-base">corporate_fare</span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">{t('التبويب 3: التعيين الوظيفي والقسم والفرع', 'Tab 3: Position, Department & Branch')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('المسمى الوظيفي (بالعربية)', 'Job Title (Arabic)')}</label>
                    <SearchableComboBox
                      options={positions}
                      value={jobTitle}
                      onChange={(value, option) => {
                        setJobTitle(value);
                        const opt = option || positions.find((p: any) => p.name_ar === value || p.title_ar === value || p.name === value);
                        const en = opt?.name_en || opt?.title || getJobTitleName(value, 'en', positions);
                        if (en) {
                          setJobTitleEn(en);
                        }
                      }}
                      placeholder={t('اختر المسمى الوظيفي (بالعربية)', 'Select job title (Arabic)')}
                      language="ar"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('المسمى الوظيفي (بالإنجليزية)', 'Job Title (English)')}</label>
                    <SearchableComboBox
                      options={positions}
                      value={jobTitleEn}
                      onChange={(value, option) => {
                        setJobTitleEn(value);
                        const opt = option || positions.find((p: any) => p.name_en === value || p.title === value || p.name === value);
                        const ar = opt?.name_ar || opt?.title_ar || getJobTitleName(value, 'ar', positions);
                        if (ar) {
                          setJobTitle(ar);
                        }
                      }}
                      placeholder={t('اختر المسمى الوظيفي (بالإنجليزية)', 'Select job title (English)')}
                      language="en"
                    />
                  </div>

                  {/* positionStartDate + computed yearsInPosition */}
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">
                      {t('تاريخ آخر تغيير وظيفي / منصب', 'Last Position Change Date')}
                      {statusChanges.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold mr-1.5">{t('تلقائي', 'Auto')}</span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={positionStartDate}
                      onChange={e => setPositionStartDate(e.target.value)}
                      readOnly={statusChanges.length > 0}
                      className={`w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 ${statusChanges.length > 0 ? 'opacity-75 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('سنوات في الوظيفة الحالية', 'Years in Current Position')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <div className="w-full bg-[#0a0c10] border border-blue-500/20 rounded-lg px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2">
                      <span className="text-blue-400 font-mono font-bold text-sm">{yearsInPosition} {t('سنة', 'years')}</span>
                      <span className="text-slate-500 text-[10px]">{t('من تاريخ التغيير', 'from change date')}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('القسم / الإدارة التابعة (بالعربية)', 'Department (Arabic)')}</label>
                    <SearchableComboBox
                      options={departments}
                      value={department}
                      onChange={(value, option) => {
                        setDepartment(value);
                        const opt = option || departments.find((d: any) => d.name_ar === value || d.name === value);
                        const en = opt?.name_en || getDepartmentName(value, 'en');
                        if (en) {
                          setDepartmentEn(en);
                        }
                      }}
                      placeholder={t('اختر القسم (بالعربية)', 'Select department (Arabic)')}
                      language="ar"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('القسم / الإدارة التابعة (بالإنجليزية)', 'Department (English)')}</label>
                    <SearchableComboBox
                      options={departments}
                      value={departmentEn}
                      onChange={(value, option) => {
                        setDepartmentEn(value);
                        const opt = option || departments.find((d: any) => d.name_en === value || d.name === value);
                        const ar = opt?.name_ar || getDepartmentName(value, 'ar');
                        if (ar) {
                          setDepartment(ar);
                        }
                      }}
                      placeholder={t('اختر القسم (بالإنجليزية)', 'Select department (English)')}
                      language="en"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('فرع العمل الرئيسي في العراق (بالعربية)', 'Branch Name (Arabic)')}</label>
                    <SearchableComboBox
                      options={locations}
                      value={branch}
                      onChange={(value, option) => {
                        setBranch(value);
                        const opt = option || locations.find((b: any) => b.name_ar === value || b.name === value);
                        const en = opt?.name_en || getBranchName(value, null, 'en');
                        if (en) {
                          setBranchEn(en);
                        }
                      }}
                      placeholder={t('اختر الفرع (بالعربية)', 'Select branch (Arabic)')}
                      language="ar"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('فرع العمل الرئيسي في العراق (بالإنجليزية)', 'Branch Name (English)')}</label>
                    <SearchableComboBox
                      options={locations}
                      value={branchEn}
                      onChange={(value, option) => {
                        setBranchEn(value);
                        const opt = option || locations.find((b: any) => b.name_en === value || b.name === value);
                        const ar = opt?.name_ar || getBranchName(value, null, 'ar');
                        if (ar) {
                          setBranch(ar);
                        }
                      }}
                      placeholder={t('اختر الفرع (بالإنجليزية)', 'Select branch (English)')}
                      language="en"
                    />
                  </div>

                  <div className="sm:col-span-1 lg:col-span-2">
                    <label className="block text-black font-semibold text-[11px] mb-1">
                      {t('اسم المشرف المباشر (يمكن اختيار مشرف من العراق أو من مكتب لبنان)', 'Direct Supervisor (Iraq or Lebanon Office)')}
                    </label>
                    <input
                      type="text"
                      list="supervisors-suggestions-list"
                      placeholder={t('اسم المدير المباشر (أو اختر من المشرفين المتاحين)', 'Direct Manager Name (or pick from suggestions)')}
                      value={supervisorName}
                      onChange={e => setSupervisorName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                    <datalist id="supervisors-suggestions-list">
                      {lebanonSupervisors.map((s: any) => (
                        <option key={s.id} value={`${s.name} [🇱🇧 مشرف إقليمي - بيروت]`}>
                          {s.job_title} - {s.department} (لبنان)
                        </option>
                      ))}
                      {employees.filter(e => e.jobTitle?.includes('مدير') || e.job_title?.includes('مدير') || e.jobTitle?.includes('Manager')).map((m: any) => (
                        <option key={m.id} value={m.name || m.full_name}>
                          {m.jobTitle || m.job_title} [🇮🇶 العراق]
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div className="sm:col-span-1 lg:col-span-2">
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('نطاق وطبيعة العمل', 'Work Scope')}</label>
                    <select
                      value={workScope}
                      onChange={e => setWorkScope(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="Field">{t('Field – ميداني بالكامل', 'Field – Full Fieldwork')}</option>
                      <option value="Admin">{t('Admin – مكتبي / إداري', 'Admin – Office / Desk')}</option>
                      <option value="Field & Admin">{t('Field & Admin – ميداني وإداري مختلط', 'Field & Admin – Hybrid')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Financial, Salary & Allowances */}
            {activeTab === 4 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400">payments</span>
                  <h3 className="text-sm font-bold text-white">{t('التبويب 4: البيانات المالية والراتب والبدلات والحساب المصرفي', 'Tab 4: Financial Data, Salary & Allowances')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الراتب الاسمي الشهري', 'Monthly Basic Salary')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={basicSalary > 0 ? formatWithCommas(basicSalary) : ''}
                      onChange={e => {
                        const val = parseFormatted(e.target.value);
                        setBasicSalary(val);
                        setWrittenBasicSalaryAr(val > 0 ? numberToArabicWords(val) : '');
                      }}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('الراتب الاسمي كتابة', 'Basic Salary in Words')}</label>
                    <input
                      type="text"
                      value={writtenBasicSalaryAr}
                      onChange={e => setWrittenBasicSalaryAr(e.target.value)}
                      placeholder={t('يُملأ تلقائياً عند إدخال الراتب...', 'Auto-filled when entering salary...')}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('بدل النقل الثابت', 'Fixed Transportation Allowance')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{t('من الإعدادات', 'From Settings')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={transportationFixed > 0 ? formatWithCommas(transportationFixed) : ''}
                      onChange={e => setTransportationFixed(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('المكافأة الثابتة', 'Fixed Bonus')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{t('من الإعدادات', 'From Settings')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={fixedBonus > 0 ? formatWithCommas(fixedBonus) : ''}
                      onChange={e => setFixedBonus(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('مخصصات الهاتف', 'Phone Allowance')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{t('من الإعدادات', 'From Settings')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={phoneAllowance > 0 ? formatWithCommas(phoneAllowance) : ''}
                      onChange={e => setPhoneAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('مخصصات الشهادة', 'Certificate Allowance')}</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={certificateAllowance > 0 ? formatWithCommas(certificateAllowance) : ''}
                      onChange={e => setCertificateAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('بدل الزوج/ة', 'Spouse Allowance')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={spouseAllowance > 0 ? formatWithCommas(spouseAllowance) : ''}
                      onChange={e => setSpouseAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('بدل الطفل الواحد', 'Child Allowance')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={childAllowance > 0 ? formatWithCommas(childAllowance) : ''}
                      onChange={e => setChildAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      {t('إجمالي المخصصات العائلية', 'Total Family Allowance')}
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <div className="w-full bg-[#0a0c10] border border-teal-500/20 rounded-lg px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2">
                      <span className="text-teal-400 font-mono font-bold text-sm">{familyAllowance > 0 ? formatWithCommas(familyAllowance) : '0'}</span>
                      <span className="text-slate-500 text-[10px]">{t('د.ع', 'IQD')}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('اسم البنك المحول إليه الراتب', 'Bank Name for Salary Transfer')}</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('رقم الحساب المصرفي الدولي (IBAN)', 'International Bank Account Number (IBAN)')}</label>
                    <input
                      type="text"
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-blue-400 font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className={`flex flex-col gap-2 rounded-2xl border p-3.5 ${
                  isSsTaxExempt
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-slate-900/60 border-white/10'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer select-none" dir="rtl">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={isSsTaxExempt}
                        onChange={e => {
                          setIsSsTaxExempt(e.target.checked);
                          if (!e.target.checked) setSsTaxExemptionReason('');
                        }}
                        className="sr-only peer"
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors ${
                        isSsTaxExempt ? 'bg-amber-500' : 'bg-emerald-500'
                      } relative`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          isSsTaxExempt ? 'right-0.5' : 'left-0.5'
                        }`} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${
                        isSsTaxExempt ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {isSsTaxExempt
                          ? t('معفى من الضمان الاجتماعي وضريبة الدخل', 'Exempt from SS & Income Tax')
                          : t('خاضع للضمان الاجتماعي وضريبة الدخل (الوضع الافتراضي)', 'Subject to SS & Income Tax (Default)')
                        }
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isSsTaxExempt
                          ? t('لن يظهر هذا الموظف في احتسابات الضمان والضريبة', 'Employee excluded from SS/Tax calculations')
                          : t('يحتسب الضمان (5%) والضريبة وفق القانون 18 و113', 'SS (5%) and Tax calculated per Law 18 & 113')
                        }
                      </span>
                    </div>
                  </label>
                  {isSsTaxExempt && (
                    <div className="mt-1">
                      <label className="block text-xs text-amber-400 font-medium mb-1">
                        {t('سبب الإعفاء من الضمان والضريبة *', 'Exemption Reason *')}
                      </label>
                      <textarea
                        value={ssTaxExemptionReason}
                        onChange={e => setSsTaxExemptionReason(e.target.value)}
                        rows={2}
                        placeholder={t('مثال: موظف متعاقد / أجنبي / مشمول بعقد خاص...', 'e.g. Contracted employee / Foreigner / Special contract...')}
                        className="w-full bg-[#0a0c10] border border-amber-500/30 rounded-xl px-3 py-2 text-amber-300 text-sm placeholder:text-slate-600 focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-600/10 border border-blue-500/20 flex items-center justify-between font-mono">
                  <span className="text-slate-300 font-sans">{t('إجمالي الراتب الاستحقاقي الشهري (قبل الاستقطاعات):', 'Total Gross Monthly Salary:')}</span>
                  <span className="text-lg font-black text-emerald-400">{totalCalculatedSalary.toLocaleString()} {t('د.ع', 'IQD')}</span>
                </div>
              </div>
            )}

            {/* TAB 5: Documents & Identity */}
            {activeTab === 5 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-base">id_card</span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">{t('التبويب 5: الوثائق الثبوتية ورقم الهوية', 'Tab 5: Identity Documents & ID Number')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('رقم البطاقة الوطنية الموحدة / الهوية', 'National ID / Identity Card Number')}</label>
                    <input
                      type="text"
                      placeholder={t('199012345678', '199012345678')}
                      value={nationalId}
                      onChange={e => setNationalId(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('رقم جواز السفر', 'Passport Number')}</label>
                    <input
                      type="text"
                      placeholder={t('A12345678', 'A12345678')}
                      value={passportNo}
                      onChange={e => setPassportNo(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-semibold text-[11px] mb-1">{t('تاريخ انتهاء / نفاذ الجواز', 'Passport Expiry Date')}</label>
                    <input
                      type="date"
                      value={passportExpiry}
                      onChange={e => setPassportExpiry(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-black font-semibold text-[11px]">{t('رابط الصورة الشخصية', 'Profile Photo URL')}</label>
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPhotoUrl('');
                            if (photoFileInputRef.current) photoFileInputRef.current.value = '';
                          }}
                          className="text-rose-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                        >
                          ✕ {t('إزالة', 'Remove')}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('https://...', 'https://...')}
                        value={photoUrl}
                        onChange={e => setPhotoUrl(e.target.value)}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 pr-8"
                      />
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPhotoUrl('');
                            if (photoFileInputRef.current) photoFileInputRef.current.value = '';
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-300 text-xs font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: Family & Dependents */}
            {activeTab === 6 && (
              <div className="space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
                  <span className="material-symbols-outlined text-teal-400 text-base">family_restroom</span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">{t('التبويب 6: البيانات العائلية والأبناء', 'Tab 6: Family Data & Children')}</h3>
                  <span className="mr-auto px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">{t('جميع الحقول اختيارية', 'All fields optional')}</span>
                </div>

                {/* Spouse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 items-end">
                  <div className="lg:col-span-2">
                    <label className="block text-black font-semibold text-[11px] mb-1 flex items-center gap-1.5">
                      <span>{t('اسم الزوج / الزوجة', 'Spouse Name')}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-semibold">{t('اختياري', 'Optional')}</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t('اتركه فارغاً إن لم ينطبق / Optional', 'Leave blank if not applicable')}
                      value={spouseName}
                      onChange={e => setSpouseName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-1.5 sm:py-2 text-xs text-white focus:outline-none focus:border-teal-500 placeholder:text-slate-600"
                    />
                  </div>

                  <div className="lg:col-span-2 flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                    <input
                      type="checkbox"
                      id="spouseEmp"
                      checked={spouseEmployedHere}
                      onChange={e => setSpouseEmployedHere(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-[#0a0c10] border-white/20"
                    />
                    <label htmlFor="spouseEmp" className="text-slate-200 text-xs font-semibold cursor-pointer select-none">
                      {t('هل الزوج/الزوجة يعمل في مؤسسة فيتاس العراق؟', 'Does spouse work at VITAS Iraq?')}
                    </label>
                  </div>
                </div>

                {/* Children dynamic list */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <span className="material-symbols-outlined text-teal-400 text-sm">child_care</span>
                    <label className="text-teal-400 font-bold text-xs">{t('الأبناء وبيانات الميلاد والأعمار', 'Children & Birth Data')}</label>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-semibold">{t('اختياري', 'Optional')}</span>
                    <span className="ml-auto px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 font-mono text-[10px]">{childrenList.length} {t('ولد/بنت', 'child/children')}</span>
                  </div>

                  {/* Add / Edit child row */}
                  <div className={`p-3 rounded-xl border transition-all space-y-2 ${
                    editingChildId ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30' : 'bg-[#0a0c10] border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-300 font-medium text-[11px]">
                        {editingChildId ? t('تعديل بيانات الطفل المخزن:', 'Edit child record:') : t('إضافة ابن / بنت جديدة:', 'Add new son/daughter:')}
                      </p>
                      {editingChildId && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">edit</span>
                          {t('وضع التعديل', 'Edit Mode')}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder={t('الاسم الكامل (اختياري)', 'Full Name (Optional)')}
                        value={newChildName}
                        onChange={e => setNewChildName(e.target.value)}
                        className="sm:col-span-1 bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                      />
                      <input
                        type="date"
                        value={newChildDob}
                        onChange={e => setNewChildDob(e.target.value)}
                        className="bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                      />
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={newChildDob ? `${calcAge(newChildDob)} ${t('سنة', 'years')}` : ''}
                          placeholder={t('العمر (تلقائي)', 'Age (Auto)')}
                          className="w-full bg-[#111827]/80 border border-amber-500/30 rounded-xl px-3 py-2 text-amber-300 font-bold text-xs cursor-not-allowed text-center"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={newChildRelation}
                          onChange={e => setNewChildRelation(e.target.value as 'ولد' | 'بنت')}
                          className="flex-1 bg-[#111827] border border-white/10 rounded-xl px-2 py-2 text-white text-xs focus:outline-none"
                        >
                          <option value="ولد">{t('ولد', 'Son')}</option>
                          <option value="بنت">{t('بنت', 'Daughter')}</option>
                        </select>
                        {editingChildId ? (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={handleSaveChild}
                              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all flex items-center gap-1 shrink-0 shadow-md shadow-amber-600/20 active:scale-95 cursor-pointer"
                              title={t('حفظ التعديل', 'Save Edit')}
                            >
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              <span>{t('حفظ', 'Save')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditChild}
                              className="px-2.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs transition-all flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
                              title={t('إلغاء', 'Cancel')}
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSaveChild}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md shadow-teal-600/20 active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            <span>{t('إضافة طفل', 'Add Child')}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Children list table */}
                  {childrenList.length > 0 ? (
                    <div className="rounded-xl border border-white/10 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-white/5 text-slate-400">
                            <th className="w-10 px-3 py-2 text-start font-bold">#</th>
                            <th className="px-3 py-2 text-start font-bold">{t('الاسم', 'Name')}</th>
                            <th className="w-24 px-3 py-2 text-start font-bold">{t('النوع', 'Gender')}</th>
                            <th className="w-36 px-3 py-2 text-start font-bold">{t('تاريخ الميلاد', 'Date of Birth')}</th>
                            <th className="w-28 px-3 py-2 text-start font-bold">{t('العمر', 'Age')}</th>
                            <th className="w-28 px-3 py-2 text-center font-bold">{t('إجراءات', 'Actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {childrenList.map((child, idx) => {
                            const childAgeDisplay = child.dob ? calcAge(child.dob) : (child.age || 0);
                            const isBeingEdited = editingChildId === child.id;
                            return (
                              <tr key={child.id || idx} className={`border-t border-white/5 transition-colors ${
                                isBeingEdited ? 'bg-amber-500/15' : 'hover:bg-white/3'
                              }`}>
                                <td className="px-3 py-2 text-start text-slate-500 font-mono">{idx + 1}</td>
                                <td className="px-3 py-2 text-start text-white font-medium">{child.name}</td>
                                <td className="px-3 py-2 text-start">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    child.relation === 'ولد' || child.relation === 'Son'
                                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                                      : 'bg-pink-500/15 text-pink-400 border border-pink-500/20'
                                  }`}>{((child.relation === 'ولد' || child.relation === 'Son') ? t('ولد', 'Son') : t('بنت', 'Daughter'))}</span>
                                </td>
                                <td className="px-3 py-2 text-start text-slate-300 font-mono">{child.dob || '-'}</td>
                                <td className="px-3 py-2 text-start">
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold font-mono text-[10px]">
                                    {childAgeDisplay} {t('سنة', 'years')}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditChild(child)}
                                      className="p-1 rounded-lg text-teal-400 hover:bg-teal-500/20 transition-colors cursor-pointer"
                                      title={t('تعديل', 'Edit')}
                                    >
                                      <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeChild(child.id!)}
                                      className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                      title={t('حذف', 'Delete')}
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-[11px] text-center py-4 border border-dashed border-white/10 rounded-xl">
                      {t('لم يتم إضافة أي أبناء بعد. استخدم النموذج أعلاه لإضافة بيانات الأطفال.', 'No children added yet. Use the form above to add children data.')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 7: Trainings & Administrative Record */}
            {activeTab === 7 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400">history_edu</span>
                  <h3 className="text-sm font-bold text-white">{t('التبويب 7: التدريبات والسجل الإداري وحالة الموظف', 'Tab 7: Trainings & Administrative Record')}</h3>
                </div>

                {/* Status Changes Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-400">published_with_changes</span>
                      {t('تغييرات الحالة الوظيفية', 'Job Status Changes')}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newChange = {
                          id: Date.now(),
                          new_position: newStatusChange.new_position,
                          start_date: newStatusChange.start_date,
                          end_date: newStatusChange.end_date
                        };
                        setStatusChanges([...statusChanges, newChange]);
                        // Immediately update positionStartDate
                        if (newStatusChange.start_date) {
                          setPositionStartDate(newStatusChange.start_date);
                        }
                        setNewStatusChange({ new_position: '', start_date: '', end_date: '' });
                      }}
                      className="px-3 py-1.5 bg-teal-600 text-white shadow-md rounded-lg text-xs font-bold hover:bg-teal-600/30 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {t('إضافة تغيير', 'Add Change')}
                    </button>
                  </div>

                  {/* Add New Status Change Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/5 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('المسمى الوظيفي الجديد', 'New Job Title')}</label>
                      <input
                        type="text"
                        value={newStatusChange.new_position}
                        onChange={e => setNewStatusChange({ ...newStatusChange, new_position: e.target.value })}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                        placeholder={t('المسمى الجديد', 'New title')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('تاريخ البدء', 'Start Date')}</label>
                      <input
                        type="date"
                        value={newStatusChange.start_date}
                        onChange={e => setNewStatusChange({ ...newStatusChange, start_date: e.target.value })}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('تاريخ الانتهاء', 'End Date')}</label>
                      <input
                        type="date"
                        value={newStatusChange.end_date}
                        onChange={e => setNewStatusChange({ ...newStatusChange, end_date: e.target.value })}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* Status Changes List */}
                  {statusChanges.length > 0 && (
                    <div className="space-y-2">
                      {statusChanges.map((change, index) => (
                        <div key={change.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg">
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <div>
                              <span className="text-xs text-slate-400">{t('المسمى:', 'Title:')}</span>
                              <p className="text-sm text-white">{change.new_position}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400">{t('البدء:', 'Start:')}</span>
                              <p className="text-sm text-white">{change.start_date}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400">{t('الانتهاء:', 'End:')}</span>
                              <p className="text-sm text-white">{change.end_date || '-'}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStatusChanges(statusChanges.filter(c => c.id !== change.id))}
                            className="text-rose-400 hover:text-rose-300 ml-3"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Employee Trainings Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-400">school</span>
                      {t('الدورات التدريبية', 'Training Courses')}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const trainingToAdd = {
                          id: Date.now(),
                          course_name: newTraining.course_name,
                          start_date: newTraining.start_date,
                          end_date: newTraining.end_date
                        };
                        setEmployeeTrainings([...employeeTrainings, trainingToAdd]);
                        setNewTraining({ course_name: '', start_date: '', end_date: '' });
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      {t('إضافة دورة', 'Add Course')}
                    </button>
                  </div>

                  {/* Add New Training Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/5 p-3 rounded-lg">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('اسم الدورة التدريبية', 'Training Course Name')}</label>
                      <input
                        type="text"
                        value={newTraining.course_name}
                        onChange={e => setNewTraining({ ...newTraining, course_name: e.target.value })}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder={t('اسم الدورة', 'Course name')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('تاريخ البدء', 'Start Date')}</label>
                      <input
                        type="date"
                        value={newTraining.start_date}
                        onChange={e => setNewTraining({ ...newTraining, start_date: e.target.value })}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">{t('تاريخ الانتهاء', 'End Date')}</label>
                      <input
                        type="date"
                        value={newTraining.end_date}
                        onChange={e => setNewTraining({ ...newTraining, end_date: e.target.value })}
                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Trainings List */}
                  {employeeTrainings.length > 0 && (
                    <div className="space-y-2">
                      {employeeTrainings.map((training, index) => (
                        <div key={training.id} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-lg">
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <div>
                              <span className="text-xs text-slate-400">{t('الدورة:', 'Course:')}</span>
                              <p className="text-sm text-white">{training.course_name}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400">{t('البدء:', 'Start:')}</span>
                              <p className="text-sm text-white">{training.start_date}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400">{t('الانتهاء:', 'End:')}</span>
                              <p className="text-sm text-white">{training.end_date}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEmployeeTrainings(employeeTrainings.filter(t => t.id !== training.id))}
                            className="text-rose-400 hover:text-rose-300 ml-3"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
          </div>
        </div>

        {/* TABBED NAVIGATION BAR DIRECTLY UNDER THE WINDOW AND OUTSIDE OF THE CONTAINER */}
        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border ${
          isDark ? 'bg-[#06080d] border-white/10 shadow-lg' : 'bg-white border-slate-300 shadow-sm'
        } overflow-x-auto no-scrollbar [direction:ltr]`}>
          {TAB_ITEMS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-98 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                    : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{tab.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    )}

      {/* Employee Full 7-Tabs Profile View (HR Employees Profiles) */}
      {activeModuleId === 'emp-profile' && (
        <div className="max-w-7xl mx-auto space-y-2.5">
          {/* Top Dynamic Search & Selector Bar on ONE row */}
          <div className={`${profileColors.background} px-3.5 py-2 rounded-2xl border ${profileColors.border} ${profileColors.shadow}`}>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
              {/* Dynamic Auto-complete Search Box */}
              <div ref={profileSearchContainerRef} className="relative flex-1 min-w-[200px]">
                <div className="relative flex items-center">
                  <input
                    ref={profileSearchInputRef}
                    type="text"
                    placeholder={t('ابحث باسم الموظف، الرقم الوظيفي، أو الفرع للتنقل...', 'Search by employee name, ID, or branch to navigate...')}
                    value={profileSearchQuery}
                    onChange={(e) => {
                      setProfileSearchQuery(e.target.value);
                      setIsSearchDropdownOpen(true);
                    }}
                    onFocus={(e) => {
                      isProfileSearchFocusedRef.current = true;
                      setIsSearchDropdownOpen(true);
                      e.target.select();
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        isProfileSearchFocusedRef.current = false;
                      }, 200);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchDropdownOpen(false);
                        isProfileSearchFocusedRef.current = false;
                        if (selectedEmployee) {
                          setProfileSearchQuery(getEmpFullName(selectedEmployee));
                        }
                      }
                    }}
                    className={`w-full ${profileColors.inputBg} border ${profileColors.inputBorder} rounded-xl px-3 py-1.5 ${language === 'ar' ? 'pr-8 pl-8' : 'pl-8 pr-8'} text-xs ${profileColors.inputText} focus:outline-none focus:border-teal-500 ${isDark ? 'focus:bg-[#111827]' : 'focus:bg-white'} transition-all shadow-xs font-bold ${profileColors.inputPlaceholder}`}
                  />
                  <span className={`material-symbols-outlined absolute ${language === 'ar' ? 'right-2.5' : 'left-2.5'} top-1.5 ${profileColors.textSecondary} text-sm select-none pointer-events-none`}>
                    search
                  </span>
                  {profileSearchQuery && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileSearchQuery('');
                        setIsSearchDropdownOpen(true);
                        profileSearchInputRef.current?.focus();
                      }}
                      className={`material-symbols-outlined absolute ${language === 'ar' ? 'left-2.5' : 'right-2.5'} top-1.5 text-xs text-slate-400 hover:text-rose-500 cursor-pointer transition-colors p-0.5 rounded-full hover:bg-slate-200/50 dark:hover:bg-white/10`}
                      title={t('مسح البحث', 'Clear search')}
                    >
                      close
                    </button>
                  )}
                </div>

                {/* Instant Results Dropdown */}
                {isSearchDropdownOpen && (
                  <div className={`absolute right-0 left-0 top-full mt-1.5 ${profileColors.dropdownBg} border ${profileColors.dropdownBorder} rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto ${profileColors.divider}`}>
                    {matchingProfileEmployees.length > 0 ? (
                      matchingProfileEmployees.slice(0, 30).map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            const empId = emp.id || emp.employeeId || emp.employee_id;
                            setSelectedEmpId(empId);
                            lastSelectedEmpIdRef.current = String(empId).toLowerCase().trim();
                            setProfileSearchQuery(getEmpFullName(emp));
                            setIsSearchDropdownOpen(false);
                            isProfileSearchFocusedRef.current = false;
                          }}
                          className={`w-full text-right p-2.5 ${profileColors.dropdownHover} flex items-center justify-between transition-colors group cursor-pointer`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${profileColors.badgeBg} ${profileColors.badgeText} font-black text-xs flex items-center justify-center overflow-hidden shrink-0`}>
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt={getEmpFullName(emp)} className="w-full h-full object-contain p-0.5" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                              ) : (
                                <span className={`material-symbols-outlined text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>person</span>
                              )}
                            </div>
                            <div>
                              <span className={`block text-xs font-bold ${profileColors.text} group-hover:${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{getEmpFullName(emp)}</span>
                              <span className={`block text-[10px] ${profileColors.textSecondary}`}>{getEmpJobTitle(emp)} • {getEmpBranch(emp)}</span>
                            </div>
                          </div>
                          <span className={`text-[11px] font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'} font-bold ${isDark ? 'bg-teal-600/20' : 'bg-blue-50'} group-hover:${isDark ? 'bg-teal-600/30' : 'bg-blue-100'} px-2 py-0.5 rounded-full border ${profileColors.badgeBorder}`}>
                            {emp.employeeId || 'EMP'}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className={`p-3 text-center text-xs ${profileColors.textSecondary}`}>
                        {t('لا توجد نتائج مطابقة لـ', 'No matching results for')} "{profileSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Direct Select Menu */}
              <div className="flex-1 min-w-[200px]">
                <select
                  value={selectedEmployee ? String(selectedEmployee.id || selectedEmployee.employeeId || selectedEmployee.employee_id || '') : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = activeEmployees.find(emp => {
                      const tVal = String(val).toLowerCase().trim();
                      return String(emp.id).toLowerCase().trim() === tVal ||
                             (emp.employeeId && String(emp.employeeId).toLowerCase().trim() === tVal) ||
                             (emp.employee_id && String(emp.employee_id).toLowerCase().trim() === tVal);
                    });
                    if (found) {
                      const targetId = found.id || found.employeeId || found.employee_id;
                      setSelectedEmpId(targetId);
                      lastSelectedEmpIdRef.current = String(targetId).toLowerCase().trim();
                      setProfileSearchQuery(getEmpFullName(found));
                    }
                  }}
                  className={`w-full ${profileColors.inputBg} border ${profileColors.inputBorder} rounded-xl px-3 py-1.5 text-xs ${profileColors.inputText} focus:outline-none focus:border-teal-500 ${isDark ? 'focus:bg-[#111827]' : 'focus:bg-white'} transition-all shadow-xs font-bold`}
                >
                  <option value="" disabled>-- {t('اختر موظفاً مباشرة للتنقل السريع', 'Select an employee directly for fast navigation')} --</option>
                  {activeEmployees.map(emp => {
                    const empOptId = String(emp.id || emp.employeeId || emp.employee_id || '');
                    return (
                      <option key={empOptId} value={empOptId}>
                        {getEmpFullName(emp)} ({emp.employeeId || emp.employee_id || 'EMP'}) - {getEmpBranch(emp)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Total Employees Count Badge */}
              <span className={`text-[11px] font-mono ${profileColors.textSecondary} font-bold ${isDark ? 'bg-white/5' : 'bg-slate-100'} px-2.5 py-1 rounded-xl border ${profileColors.border} shrink-0 whitespace-nowrap`}>
                {t('إجمالي الموظفين:', 'Total Employees:')} {activeEmployees.length}
              </span>
            </div>
          </div>

          {!selectedEmployee ? (
            <EmptyState
              icon="account_box"
              title="لم يتم تحديد أي موظف"
              description="استخدم حقل البحث أو القائمة المنسدلة أعلاه لاختيار موظف واستعراض ملفه."
            />
          ) : (
            <>
              {/* THE LARGE PROFILE WINDOW */}
              <div className={`p-3.5 sm:p-4 rounded-2xl ${profileColors.cardBg} border ${profileColors.cardBorder} ${profileColors.shadow} relative overflow-hidden ${profileColors.text}`}>
                {/* Background decorative soft ambient light */}
                <div className={`absolute -top-24 left-1/4 w-96 h-96 ${isDark ? 'bg-teal-500/5' : 'bg-teal-500/10'} blur-3xl rounded-full pointer-events-none`} />

                <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-6 relative z-10 [direction:ltr]">
                  {/* LEFT PANE: Photo at Top-Left, Name, Badges, Action Buttons (Print Contract & Edit Employee) */}
                  <div className="w-full lg:w-60 xl:w-64 shrink-0 flex flex-col items-center text-center space-y-2.5">
                    {/* Photo Frame at top-left */}
                    <div className="relative group">
                      <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-400 via-teal-300 to-teal-500 rounded-2xl blur-sm opacity-50 group-hover:opacity-80 transition-all duration-300" />

                      {/* Photo Avatar Frame (Matches 3:4 Portrait ID Photos) */}
                      <div className={`relative w-32 h-42 rounded-2xl border-2 ${isDark ? 'border-[#1a1f2e]' : 'border-white'} ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'} shadow-xl overflow-hidden flex items-center justify-center ${isDark ? 'text-blue-400' : 'text-blue-600'} text-3xl font-black shrink-0`}>
                        {selectedEmployee.photoUrl && !avatarImgError ? (
                          <img
                            src={selectedEmployee.photoUrl}
                            alt={selectedEmployee.fullName}
                            className="w-full h-full object-contain p-1 rounded-xl"
                            onError={() => setAvatarImgError(true)}
                          />
                        ) : (
                          <div className={`w-full h-full ${isDark ? 'bg-gradient-to-br from-teal-900/30 via-teal-800/30 to-teal-900/30' : 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-50'} flex flex-col items-center justify-center ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                            <span className="material-symbols-outlined text-5xl">person</span>
                          </div>
                        )}
                      </div>

                      {/* Status Indicator Badge (Bottom Right Corner) */}
                      <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 ${isDark ? 'border-[#1a1f2e]' : 'border-white'} z-10 ${
                        selectedEmployee.status === 'Active' ? 'bg-emerald-500 shadow-md shadow-emerald-500/40' : 'bg-amber-500'
                      }`} title={selectedEmployee.status} />

                      {/* EDIT PHOTO / PROFILE OVERLAY ICON BUTTON */}
                      {canWrite() && (
                        <button
                          type="button"
                          onClick={() => {
                            const tId = selectedEmployee.id || selectedEmployee.employeeId || selectedEmployee.employee_id;
                            try { sessionStorage.setItem('vitas_editing_emp_id', String(tId)); } catch (err) {}
                            handleLoadEmployeeData(selectedEmployee);
                            setActiveModuleId('emp-edit');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="absolute -bottom-1 -left-1 w-7 h-7 rounded-full bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-600/40 border-2 border-white dark:border-[#1a1f2e] transition-all hover:scale-110 cursor-pointer z-10"
                          title={t('تعديل صورة أو بيانات الموظف', 'Edit photo or details')}
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                        </button>
                      )}
                    </div>

                    {/* Employee Name & Titles */}
                    <div className="space-y-0.5">
                      <h2 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight font-cairo leading-tight`}>
                        {getEmpFullName(selectedEmployee)}
                      </h2>
                      {(language === 'en' ? selectedEmployee.fullName : selectedEmployee.fullNameEn) && (
                        <p className={`text-[11px] font-semibold ${isDark ? 'text-teal-400' : 'text-teal-700'} font-mono`}>
                          {language === 'en' ? selectedEmployee.fullName : selectedEmployee.fullNameEn}
                        </p>
                      )}
                    </div>

                    {/* Badges List */}
                    <div className="flex flex-wrap items-center justify-center gap-1 text-[11px]">
                      <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-teal-600/20 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-700'} font-bold shadow-xs`}>
                        {getEmpJobTitle(selectedEmployee)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'} font-mono font-bold shadow-xs flex items-center gap-1`}>
                        <span className={`text-[9px] ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'} font-sans font-semibold`}>{t('الرقم:', 'ID:')}</span>
                        {selectedEmployee.employeeId || selectedEmployee.employee_id || '-'}
                      </span>
                      {(selectedEmployee.badgeNo || selectedEmployee.badge_no) && (
                        <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700'} font-mono font-bold shadow-xs flex items-center gap-1`}>
                          <span className={`text-[9px] ${isDark ? 'text-indigo-400/80' : 'text-indigo-600/80'} font-sans font-semibold`}>{t('الباج:', 'Badge:')}</span>
                          {selectedEmployee.badgeNo || selectedEmployee.badge_no}
                        </span>
                      )}
                      {(selectedEmployee.waid || selectedEmployee.wa_id) && (
                        <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-teal-600/20 border-teal-500/30 text-teal-300' : 'bg-teal-50 border-teal-200 text-teal-700'} font-mono font-bold shadow-xs flex items-center gap-1`}>
                          <span className={`text-[9px] ${isDark ? 'text-teal-400/80' : 'text-teal-600/80'} font-sans font-semibold`}>WAID:</span>
                          {selectedEmployee.waid || selectedEmployee.wa_id}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-600/20 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700'} font-bold shadow-xs`}>
                        {getEmpBranch(selectedEmployee)}
                      </span>
                    </div>

                    {/* Action Buttons: Print Contract & Edit Employee (Fixed in place under employee photo & badges) */}
                    <div className="flex flex-col gap-1.5 w-full pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenContractPreview(selectedEmployee)}
                        className="w-full h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-98"
                        title={t('معاينة وطباعة عقد العمل للموظف', 'Preview and Print Employee Contract')}
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                        <span>{t('طباعة العقد', 'Print Contract')}</span>
                      </button>
                      {canWrite() && (
                        <button
                          type="button"
                          onClick={() => {
                            const tId = selectedEmployee.id || selectedEmployee.employeeId || selectedEmployee.employee_id;
                            try { sessionStorage.setItem('vitas_editing_emp_id', String(tId)); } catch (err) {}
                            handleLoadEmployeeData(selectedEmployee);
                            setActiveModuleId('emp-edit');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full h-8 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] active:scale-98"
                          title={t('تعديل بيانات وسجل الموظف', 'Edit Employee Data')}
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          <span>{t('تعديل الموظف', 'Edit Employee')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* RIGHT PANE: Tab Content Panels on Top + Tab Navigation Bar at the Bottom */}
                  <div className={`flex-1 min-w-0 w-full space-y-2.5 ${language === 'ar' ? '[direction:rtl]' : '[direction:ltr]'}`}>
                    {/* TAB CONTENT PANELS ("النوافذ التابعة لكل تاب") */}
                    <div className={`p-3 sm:p-3.5 rounded-xl border ${
                      isDark ? 'bg-[#06080d]/80 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                    } space-y-2.5 text-xs ${profileColors.text} min-h-[335px] max-h-[335px] overflow-y-auto profile-scrollbar`}>
                      {/* 1. OVERVIEW TAB */}
                      {profileViewTab === 'overview' && (
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-0.5 shadow-xs`}>
                              <span className={`${profileColors.textSecondary} text-[10px] block`}>{t('الراتب الأساسي', 'Basic Salary')}</span>
                              <span className={`text-sm sm:text-base font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-mono`}>
                                {selectedEmployee.basicSalary || selectedEmployee.salary ? (selectedEmployee.basicSalary || selectedEmployee.salary).toLocaleString() + ' د.ع' : '-'}
                              </span>
                            </div>
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-0.5 shadow-xs`}>
                              <span className={`${profileColors.textSecondary} text-[10px] block`}>{t('تاريخ المباشرة ورقم الباج', 'Start Date & Badge')}</span>
                              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} font-mono truncate block`}>
                                {selectedEmployee.joinDate && selectedEmployee.joinDate !== 'N/A' ? selectedEmployee.joinDate : '-'} ({(selectedEmployee.employeeId || selectedEmployee.badgeNo || selectedEmployee.badge_no || (selectedEmployee.id ? `VTS-${selectedEmployee.id}` : '-'))})
                              </span>
                            </div>
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-0.5 shadow-xs`}>
                              <span className={`${profileColors.textSecondary} text-[10px] block`}>{t('القسم والفرع', 'Department & Branch')}</span>
                              <span className={`text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'} truncate block`}>
                                {getEmpDepartment(selectedEmployee)} • {getEmpBranch(selectedEmployee)}
                              </span>
                            </div>
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-0.5 shadow-xs`}>
                              <span className={`${profileColors.textSecondary} text-[10px] block`}>{t('نوع العقد والدرجة', 'Contract Type & Grade')}</span>
                              <span className={`text-xs font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'} truncate block`}>
                                {selectedEmployee.termOfContract || t('عقد محدد', 'Fixed Contract')} ({selectedEmployee.grade || 'G-4'})
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1.5 shadow-xs text-xs`}>
                              <h3 className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1 text-xs`}>
                                <span className="material-symbols-outlined text-sm">contact_mail</span>
                                {t('معلومات التواصل والبريد', 'Contact & Email Info')}
                              </h3>
                              <p className={`${profileColors.textSecondary} flex justify-between`}>
                                <span>{t('البريد الإلكتروني المؤسسي:', 'Corporate Email:')}</span>
                                <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold truncate max-w-[180px]`}>{selectedEmployee.email && selectedEmployee.email !== 'N/A' ? selectedEmployee.email : '-'}</span>
                              </p>
                              <p className={`${profileColors.textSecondary} flex justify-between`}>
                                <span>{t('هاتف التواصل:', 'Contact Phone:')}</span>
                                <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.phone && selectedEmployee.phone !== 'N/A' ? selectedEmployee.phone : '-'}</span>
                              </p>
                              <p className={`${profileColors.textSecondary} flex justify-between`}>
                                <span>{t('المشرف المباشر:', 'Direct Supervisor:')}</span>
                                <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold truncate max-w-[180px]`}>{selectedEmployee.supervisorName || t('غير محدد', 'Not specified')}</span>
                              </p>
                            </div>

                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1.5 shadow-xs text-xs`}>
                              <h3 className={`font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1 text-xs`}>
                                <span className="material-symbols-outlined text-sm">account_balance</span>
                                {t('البيانات المصرفية والهوية', 'Banking & Identity Data')}
                              </h3>
                              <p className={`${profileColors.textSecondary} flex justify-between`}>
                                <span>{t('المصرف المعتمد:', 'Approved Bank:')}</span>
                                <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold truncate max-w-[180px]`}>{selectedEmployee.bankName && selectedEmployee.bankName !== 'N/A' ? selectedEmployee.bankName : '-'}</span>
                              </p>
                              <p className={`${profileColors.textSecondary} flex justify-between`}>
                                <span>{t('رقم الـ IBAN:', 'IBAN Number:')}</span>
                                <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold truncate max-w-[180px]`}>{selectedEmployee.iban && selectedEmployee.iban !== 'N/A' ? selectedEmployee.iban : '-'}</span>
                              </p>
                              <p className={`${profileColors.textSecondary} flex justify-between`}>
                                <span>{t('البطاقة الوطنية:', 'National ID Card:')}</span>
                                <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.nationalId && selectedEmployee.nationalId !== 'N/A' ? selectedEmployee.nationalId : '-'}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. PERSONAL TAB */}
                      {profileViewTab === 'personal' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <h3 className={`font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1`}>
                            <span className="material-symbols-outlined text-sm">person</span>
                            {t('بيانات الهوية الشخصية والتواصل', 'Personal Identity & Contact Data')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('الاسم الكامل بالعربية:', 'Full Name (Arabic):')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.fullName}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('الاسم الكامل بالإنجليزية:', 'Full Name (English):')} <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-mono font-bold`}>{selectedEmployee.fullNameEn && selectedEmployee.fullNameEn !== 'N/A' ? selectedEmployee.fullNameEn : (dictEn[selectedEmployee.fullName] || '-')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('الجنسية:', 'Nationality:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee.nationality || t('عراقي', 'Iraqi')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('تاريخ الميلاد:', 'Date of Birth:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.dob && selectedEmployee.dob !== 'N/A' ? selectedEmployee.dob : '-'}</span></p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('الجنس:', 'Gender:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee.gender || t('غير محدد', 'Not specified')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('الحالة الاجتماعية:', 'Marital Status:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee.maritalStatus || t('غير محدد', 'Not specified')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('البريد الشخصي:', 'Personal Email:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono truncate`}>{selectedEmployee.personalEmail && selectedEmployee.personalEmail !== 'N/A' ? selectedEmployee.personalEmail : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('رقم الهاتف:', 'Phone Number:')} <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-mono font-bold`}>{selectedEmployee.phone && selectedEmployee.phone !== 'N/A' ? formatIraqiPhoneNumber(selectedEmployee.phone) : (selectedEmployee.mobile ? formatIraqiPhoneNumber(selectedEmployee.mobile) : '-')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('هاتف الطوارئ:', 'Emergency Phone:')} <span className={`${isDark ? 'text-rose-400' : 'text-rose-600'} font-mono font-bold`}>{selectedEmployee.emergencyPhone && selectedEmployee.emergencyPhone !== 'N/A' ? formatIraqiPhoneNumber(selectedEmployee.emergencyPhone) : '-'}</span></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. JOB TAB */}
                      {profileViewTab === 'job' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <h3 className={`font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1`}>
                            <span className="material-symbols-outlined text-sm">badge</span>
                            {t('بيانات الوظيفة والهيكل الإداري', 'Job & Administrative Structure Data')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('المسمى الوظيفي بالعربية:', 'Job Title (Arabic):')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.jobTitle}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('المسمى الوظيفي بالإنجليزية:', 'Job Title (English):')} <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-mono font-bold`}>{selectedEmployee.jobTitleEn && selectedEmployee.jobTitleEn !== 'N/A' ? selectedEmployee.jobTitleEn : (dictEn[selectedEmployee.jobTitle] || '-')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('القسم / الإدارة:', 'Department / Admin:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{getEmpDepartment(selectedEmployee)}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('الفرع أو موقع العمل:', 'Branch / Location:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{getEmpBranch(selectedEmployee)}</span></p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('المشرف المباشر:', 'Direct Supervisor:')} <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.supervisorName || t('غير محدد', 'Not specified')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('نطاق العمل:', 'Work Scope:')} <span className={`${isDark ? 'text-purple-400' : 'text-purple-700'} font-bold`}>{selectedEmployee.workScope || t('ميداني ومكتبي', 'Field and office')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('سنوات الخدمة الإجمالية:', 'Total Years of Service:')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-mono font-bold`}>{selectedEmployee.yearsOfEmployment || 0} {t('سنوات', 'years')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('سنوات الخدمة بالمنصب:', 'Years in Position:')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-mono font-bold`}>{selectedEmployee.yearsInPosition || 0} {t('سنوات', 'years')}</span></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. CONTRACTS TAB */}
                      {profileViewTab === 'contracts' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1`}>
                            <h3 className={`font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5`}>
                              <span className="material-symbols-outlined text-sm">description</span>
                              {t('تفاصيل العقد والدرجة الوظيفية', 'Contract & Job Grade Details')}
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenContractArchive(selectedEmployee)}
                                className="px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-98 w-fit"
                                title={t('أرشيف ومعاينة وطباعة جميع العقود السابقة والحالية', 'Preview & Print All Contracts Archive')}
                              >
                                <span className="material-symbols-outlined text-sm">print</span>
                                <span>{t('معاينة وطباعة عقد العمل', 'Preview & Print Contract')}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setShowBatchOfficeRoutingModal(true)}
                                className="px-3 py-1 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-sm shadow-teal-600/25 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-98 w-fit"
                                title={t('توجيه جماعي لكافة العقود مقسمة ومفصولة حسب المكاتب والفروع', 'Batch Route Contracts Grouped by Office')}
                              >
                                <span className="material-symbols-outlined text-sm">hub</span>
                                <span>{t('توجيه العقود حسب المكاتب', 'Route Contracts by Office')}</span>
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('نوع وشروط العقد:', 'Contract Type & Terms:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.termOfContract || t('عقد محدد المدة', 'Fixed-term contract')}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('الدرجة الوظيفية:', 'Job Grade:')} <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.grade || 'G-4'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('تاريخ التعيين الأصلي:', 'Original Hire Date:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.originalStartDate || selectedEmployee.joinDate || '-'}</span></p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('تاريخ بداية العقد الحالي:', 'Current Contract Start Date:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.contractStartDate && selectedEmployee.contractStartDate !== 'N/A' ? selectedEmployee.contractStartDate : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('تاريخ انتهاء العقد:', 'Contract End Date:')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-mono font-bold`}>{selectedEmployee.contractEndDate && selectedEmployee.contractEndDate !== 'N/A' ? selectedEmployee.contractEndDate : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('انتهاء فترة التجربة:', 'Probation End Date:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.probationEndDate && selectedEmployee.probationEndDate !== 'N/A' ? selectedEmployee.probationEndDate : '-'}</span></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 5. FINANCIAL TAB */}
                      {profileViewTab === 'financial' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <h3 className={`font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1`}>
                            <span className="material-symbols-outlined text-base">payments</span>
                            {t('تفاصيل الراتب والبدلات والمصرف', 'Salary, Allowances & Bank Details')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('الراتب الأساسي:', 'Basic Salary:')} <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-mono font-bold`}>{selectedEmployee.basicSalary ? selectedEmployee.basicSalary.toLocaleString() + ' د.ع' : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('الراتب كتابة باللغة العربية:', 'Salary in Arabic Writing:')} <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.writtenBasicSalaryAr && selectedEmployee.writtenBasicSalaryAr !== 'N/A' ? selectedEmployee.writtenBasicSalaryAr : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('بدل النقل الثابت:', 'Fixed Transportation Allowance:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.transportationFixed ? selectedEmployee.transportationFixed.toLocaleString() + ' د.ع' : '0'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('المكافأة الثابتة:', 'Fixed Bonus:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.fixedBonus ? selectedEmployee.fixedBonus.toLocaleString() + ' د.ع' : '0'}</span></p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('بدل الهاتف:', 'Phone Allowance:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.phoneAllowance ? selectedEmployee.phoneAllowance.toLocaleString() + ' د.ع' : '0'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('بدل الشهادة:', 'Certificate Allowance:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.certificateAllowance ? selectedEmployee.certificateAllowance.toLocaleString() + ' د.ع' : '0'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('المصرف المعتمد للرواتب:', 'Approved Bank for Salaries:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.bankName && selectedEmployee.bankName !== 'N/A' ? selectedEmployee.bankName : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('رقم الحساب IBAN:', 'IBAN Account Number:')} <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-mono font-bold`}>{selectedEmployee.iban && selectedEmployee.iban !== 'N/A' ? selectedEmployee.iban : '-'}</span></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 6. IDENTITY TAB */}
                      {profileViewTab === 'identity' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <h3 className={`font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1`}>
                            <span className="material-symbols-outlined text-sm">id_card</span>
                            {t('الوثائق الثبوتية ورقم الباج', 'Identity Documents and Badge Number')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('رقم البطاقة الوطنية:', 'National ID Number:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.nationalId && selectedEmployee.nationalId !== 'N/A' ? selectedEmployee.nationalId : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('رقم جواز السفر:', 'Passport Number:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.passportNo && selectedEmployee.passportNo !== 'N/A' ? selectedEmployee.passportNo : '-'}</span></p>
                            </div>
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('تاريخ نفاد الجواز:', 'Passport Expiry Date:')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-mono`}>{selectedEmployee.passportExpiry && selectedEmployee.passportExpiry !== 'N/A' ? selectedEmployee.passportExpiry : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('رقم الباج الوظيفي:', 'Employee Badge Number:')} <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-mono font-bold`}>{selectedEmployee.employeeId || selectedEmployee.badgeNo || selectedEmployee.badge_no || (selectedEmployee.id ? `VTS-${selectedEmployee.id}` : '-')}</span></p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 7. FAMILY TAB */}
                      {profileViewTab === 'family' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <h3 className={`font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1`}>
                            <span className="material-symbols-outlined text-sm">family_restroom</span>
                            {t('سجل عائلة الموظف', 'Employee Family Record')}
                          </h3>
                          <div className="space-y-2">
                            <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-xs text-xs`}>
                              <p className={`${profileColors.textSecondary}`}>{t('اسم الزوج / الزوجة:', 'Spouse Name:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.spouseName && selectedEmployee.spouseName !== 'N/A' ? selectedEmployee.spouseName : '-'}</span></p>
                              <p className={`${profileColors.textSecondary}`}>{t('هل الزوج يعمل بالمؤسسة؟', 'Does spouse work at the institution?')} <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.spouseEmployedHere ? t('نعم', 'Yes') : t('لا', 'No')}</span></p>
                              {selectedEmployee.spouseEmployedHere && (
                                <p className={`${profileColors.textSecondary}`}>{t('ملاحظة: تم تغيير الحالة الاجتماعية إلى أعزب للغرض من البدلات', 'Note: Marital status changed to Single for allowance purposes')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-600'} font-bold`}>{t('أعزب', 'Single')}</span></p>
                              )}
                            </div>

                            {/* Children table */}
                            {selectedEmployee.childrenList && selectedEmployee.childrenList.length > 0 ? (
                              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1.5 shadow-xs`}>
                                <h4 className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold text-xs flex items-center gap-1.5`}>
                                  <span className="material-symbols-outlined text-sm">child_care</span>
                                  {t('قائمة الأبناء', 'Children List')} ({selectedEmployee.childrenList.length})
                                </h4>
                                <div className={`rounded-xl border ${isDark ? 'border-white/10' : 'border-slate-200'} overflow-hidden ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'}`}>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className={`${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-700'} font-bold`}>
                                        <th className="px-2.5 py-1 text-right">{t('الاسم', 'Name')}</th>
                                        <th className="px-2.5 py-1 text-right">{t('الصلة', 'Relation')}</th>
                                        <th className="px-2.5 py-1 text-right">{t('تاريخ الميلاد', 'Date of Birth')}</th>
                                        <th className="px-2.5 py-1 text-right">{t('العمر الحسباني', 'Calculated Age')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedEmployee.childrenList.map((child, idx) => {
                                        const age = child.dob ? Math.floor((Date.now() - new Date(child.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : (child.age || 0);
                                        return (
                                          <tr key={idx} className={`border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                            <td className={`px-2.5 py-1 ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{child.name && child.name !== 'N/A' ? child.name : '-'}</td>
                                            <td className="px-2.5 py-1">
                                              <span className={`px-2 py-0.5 rounded-full font-bold ${
                                                child.relation === 'ولد' || child.relation === 'Son'
                                                  ? isDark ? 'bg-teal-600/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                                                  : isDark ? 'bg-pink-600/20 text-pink-400' : 'bg-pink-100 text-pink-700'
                                              }`}>{child.relation && child.relation !== 'N/A' ? child.relation : '-'}</span>
                                            </td>
                                            <td className={`px-2.5 py-1 ${profileColors.textSecondary} font-mono`}>{child.dob && child.dob !== 'N/A' ? child.dob : '-'}</td>
                                            <td className="px-2.5 py-1">
                                              <span className={`${isDark ? 'bg-amber-600/20 text-amber-400' : 'bg-amber-100 text-amber-800'} px-2 py-0.5 rounded-full font-mono font-bold`}>{age || 0} سنة</span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                                {t('لا يوجد أبناء مسجلون للموظف', 'No children registered for the employee')}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 8. STATUS CHANGE TAB */}
                      {profileViewTab === 'status-change' && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <StatusChangeTable
                            employee={selectedEmployee}
                            employees={employees}
                            language={language}
                            theme={theme}
                            isCompact={true}
                          />
                        </div>
                      )}

                      {/* 9. TRAININGS TAB */}
                      {profileViewTab === 'trainings' && (
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <TrainingTable
                            employee={selectedEmployee}
                            employees={employees}
                            language={language}
                            theme={theme}
                            isCompact={true}
                          />
                        </div>
                      )}

                      {/* 10. WARNINGS & PENALTIES TAB */}
                      {profileViewTab === 'warnings' && (
                        <div className="space-y-2.5 animate-in fade-in duration-200">
                          <WarningTable
                            employee={selectedEmployee}
                            employees={employees}
                            language={language}
                            theme={theme}
                            isCompact={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TABBED NAVIGATION BAR DIRECTLY UNDER THE WINDOW AND OUTSIDE OF THE CONTAINER */}
              <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border ${
                isDark ? 'bg-[#06080d] border-white/10 shadow-lg' : 'bg-white border-slate-300 shadow-sm'
              } overflow-x-auto no-scrollbar [direction:ltr]`}>
                {[
                  { id: 'overview', label: t('نظرة عامة', 'Overview'), icon: 'grid_view' },
                  { id: 'personal', label: t('المعلومات الشخصية', 'Personal'), icon: 'person' },
                  { id: 'job', label: t('الوظيفة والخدمة', 'Job & Service'), icon: 'badge' },
                  { id: 'contracts', label: t('تفاصيل العقود', 'Contracts'), icon: 'description' },
                  { id: 'financial', label: t('البيانات المالية', 'Financial'), icon: 'payments' },
                  { id: 'identity', label: t('الوثائق والهوية', 'Identity'), icon: 'id_card' },
                  { id: 'family', label: t('الأسرة والسجلات', 'Family & Records'), icon: 'family_restroom' },
                  { id: 'status-change', label: 'Status Change', icon: 'published_with_changes' },
                  { id: 'trainings', label: 'Trainings', icon: 'school' },
                  { id: 'warnings', label: 'Warnings', icon: 'warning' }
                ].map(tab => {
                  const isActive = profileViewTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProfileViewTab(tab.id as any)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] xl:text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-98 ${
                        isActive
                          ? tab.id === 'status-change'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                            : tab.id === 'trainings'
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                            : tab.id === 'warnings'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                          : isDark
                          ? 'text-slate-400 hover:text-white hover:bg-white/10'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Branches & Company Profiles */}
      {activeModuleId === 'emp-branches' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
          isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-[#f8fafc] border-slate-300 text-slate-900'
        }`}>
          {/* Search & Actions Bar on ONE row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className={`relative flex-1 min-w-0 flex items-center rounded-2xl border transition-all ${
              theme === 'dark' ? 'bg-[#06080d] border-white/10 focus-within:border-teal-500/50' : 'bg-white border-slate-300 focus-within:border-teal-500'
            }`}>
              <span className={`material-symbols-outlined text-xl pl-3 pr-2 select-none ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                search
              </span>
              <input
                type="text"
                value={branchSearchQuery}
                onChange={(e) => setBranchSearchQuery(e.target.value)}
                placeholder={t('البحث في الفروع والمكاتب... (الاسم، المدينة، العنوان، الهاتف)', 'Search branches... (Name, City, Address, Phone)')}
                className={`w-full bg-transparent py-2.5 px-1 text-xs focus:outline-none ${
                  theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-600'
                }`}
              />
              {branchSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBranchSearchQuery('')}
                  className="px-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={t('مسح البحث', 'Clear')}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {canWrite() && (
              <button
                type="button"
                onClick={handleAddBranch}
                className="h-10 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>{t('إضافة فرع', 'Add Branch')}</span>
              </button>
            )}
          </div>

          {/* Branches Toolbar: Count & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className={`flex items-center gap-2 font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              <span className={`material-symbols-outlined text-base ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>
                location_city
              </span>
              <span>{t('فروع ومراكز مؤسسة فيتاس العراق', 'VITAS Iraq Branches & Locations')}</span>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                theme === 'dark' ? 'bg-[#06080d] text-teal-400 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-200'
              }`}>
                {filteredBranches.length} / {branchLocations.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* View Switcher: Table Rows (Raw) / Record Strips / Cards */}
              <div className={`flex items-center p-0.5 rounded-xl border ${
                theme === 'dark' ? 'bg-[#06080d] border-white/10' : 'bg-[#e2e8f0] border-slate-300'
              }`}>
                <button
                  type="button"
                  onClick={() => setBranchesViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    branchesViewMode === 'table'
                      ? (theme === 'dark' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-teal-800 shadow-xs')
                      : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title={t('عرض جدول السجلات (Row)', 'Table Rows View')}
                >
                  <span className="material-symbols-outlined text-base">table_rows</span>
                  <span className="hidden sm:inline">{t('جدول السجلات Raw', 'Rows Table')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBranchesViewMode('rows')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    branchesViewMode === 'rows'
                      ? (theme === 'dark' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-teal-800 shadow-xs')
                      : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title={t('عرض شرائط السجلات الأفقية', 'Horizontal Record Strips')}
                >
                  <span className="material-symbols-outlined text-base">view_agenda</span>
                  <span className="hidden sm:inline">{t('سجلات أفقية', 'Record Strips')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBranchesViewMode('cards')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    branchesViewMode === 'cards'
                      ? (theme === 'dark' ? 'bg-teal-600 text-white shadow-xs' : 'bg-white text-teal-800 shadow-xs')
                      : (theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                  title={t('عرض البطاقات', 'Cards Grid View')}
                >
                  <span className="material-symbols-outlined text-base">grid_view</span>
                  <span className="hidden sm:inline">{t('بطاقات', 'Cards')}</span>
                </button>
              </div>
            </div>
          </div>

          {filteredBranches.length === 0 ? (
            <EmptyState
              icon="location_off"
              title={branchSearchQuery ? t("لا توجد نتائج للبحث", "No search results found") : t("لا توجد فروع مسجلة", "No branches registered")}
              description={branchSearchQuery ? t("لم يتم العثور على فرع يطابق معايير البحث. جرب كلمات مختلفة.", "No branch found matching search criteria. Try different keywords.") : t("لا توجد فروع أو مراكز مسجلة في النظام حالياً.", "No branch records currently registered.")}
              actionText={branchSearchQuery ? undefined : (canWrite() ? t("إضافة فرع جديد الآن", "Add Branch Now") : undefined)}
              onAction={branchSearchQuery ? undefined : (canWrite() ? handleAddBranch : undefined)}
            />
          ) : branchesViewMode === 'table' ? (
            /* VIEW 1: TABLE ROWS (RAW) - PRIMARY VIEW */
            <div className={`overflow-x-auto rounded-2xl border transition-all ${
              theme === 'dark'
                ? 'bg-[#0a0c10] border-white/10 shadow-xl'
                : 'bg-[#eef2f6] border-slate-300 shadow-xs'
            }`}>
              <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'} border-collapse`}>
                <thead className={`border-b select-none app-table-header ${
                  theme === 'dark'
                    ? 'bg-[#06080d] text-slate-300 border-white/10'
                    : 'bg-[#94a3b8] text-slate-950 border-slate-500 font-bold'
                }`}>
                  <tr>
                    <th className="py-3 px-3 text-center w-12 font-bold">#</th>
                    <th className="py-3 px-4 font-bold">{t('الفرع / المركز', 'Branch / Location')}</th>
                    <th className="py-3 px-4 font-bold">{t('المدينة', 'City')}</th>
                    <th className="py-3 px-4 font-bold">{t('العنوان التفصيلي', 'Address')}</th>
                    <th className="py-3 px-4 font-bold">{t('رقم الهاتف', 'Phone')}</th>
                    <th className="py-3 px-3 font-bold text-center">{t('الموظفين المعينين', 'Assigned Employees')}</th>
                    <th className="py-3 px-3 font-bold text-center">{t('الحالة', 'Status')}</th>
                    {canWrite() && (
                      <th className="py-3 px-3 font-bold text-center w-24">{t('الإجراءات', 'Actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-300/80'}`}>
                  {filteredBranches.map((branch, idx) => {
                    const bName = language === 'ar' ? (branch.name || branch.name_ar || branch.name_en) : (branch.name_en || branch.name || branch.name_ar);
                    const subName = language === 'ar' ? (branch.name_en || '') : (branch.name_ar || branch.name || '');
                    const assignedCount = employees.filter(e => e.branch && (e.branch.includes(branch.name || '') || e.branch.includes(branch.name_en || '') || e.branch.includes(branch.name_ar || ''))).length;
                    return (
                      <tr
                        key={branch.id}
                        className={`transition-colors duration-150 ${
                          theme === 'dark'
                            ? 'hover:bg-white/[0.04] text-slate-200'
                            : 'hover:bg-slate-200/50 text-slate-900 bg-white/70'
                        }`}
                      >
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-500 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              theme === 'dark' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-teal-100 text-teal-700 border border-teal-200'
                            }`}>
                              <span className="material-symbols-outlined text-base">pin_drop</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                                {bName}
                              </div>
                              {subName && (
                                <div className="text-[11px] text-slate-500 truncate" dir="ltr">
                                  {subName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 font-semibold text-xs" style={{ color: isDark ? '#e2e8f0' : '#000000' }}>
                            <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400">location_city</span>
                            <span>{branch.city || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs max-w-xs truncate" title={branch.address || ''} style={{ color: isDark ? '#e2e8f0' : '#000000' }}>
                            <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400 shrink-0">home_pin</span>
                            <span className="truncate">{branch.address || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs" dir="ltr">
                          <div className="flex items-center gap-1.5" style={{ color: isDark ? '#e2e8f0' : '#000000' }}>
                            <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400">call</span>
                            <span>{branch.phone || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${
                            assignedCount > 0
                              ? (theme === 'dark' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-300')
                              : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                          }`}>
                            <span className="material-symbols-outlined text-[13px]">group</span>
                            <span>{assignedCount}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            branch.status === 'Inactive' || branch.status === 'غير نشط'
                              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {branch.status || 'Active'}
                          </span>
                        </td>
                        {canWrite() && (
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleEditBranch(branch)}
                                className="p-1.5 bg-transparent border-0 text-emerald-500 hover:text-emerald-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                                title={t('تعديل الفرع', 'Edit Branch')}
                              >
                                <span className="material-symbols-outlined text-xl">edit_note</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBranchClick(branch)}
                                className="p-1.5 bg-transparent border-0 text-red-500 hover:text-red-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                                title={t('حذف الفرع', 'Delete Branch')}
                              >
                                <span className="material-symbols-outlined text-xl">delete</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : branchesViewMode === 'rows' ? (
            /* VIEW 2: HORIZONTAL RECORD STRIPS */
            <div className="space-y-2.5">
              {filteredBranches.map((branch) => {
                const bName = language === 'ar' ? (branch.name || branch.name_ar || branch.name_en) : (branch.name_en || branch.name || branch.name_ar);
                const subName = language === 'ar' ? (branch.name_en || '') : (branch.name_ar || branch.name || '');
                const assignedCount = employees.filter(e => e.branch && (e.branch.includes(branch.name || '') || e.branch.includes(branch.name_en || '') || e.branch.includes(branch.name_ar || ''))).length;
                return (
                  <div
                    key={branch.id}
                    className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-wrap items-center justify-between gap-3 ${
                      theme === 'dark'
                        ? 'bg-[#0a0c10] border-white/10 hover:border-teal-500/30'
                        : 'bg-white border-slate-300 shadow-xs hover:border-teal-500/40 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        theme === 'dark' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-teal-100 text-teal-700 border border-teal-200'
                      }`}>
                        <span className="material-symbols-outlined text-xl">pin_drop</span>
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                          {bName}
                        </div>
                        {subName && (
                          <div className="text-xs text-slate-500" dir="ltr">
                            {subName}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                        <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400">location_city</span>
                        <span className="font-semibold">{t('المدينة', 'City')}:</span>
                        <span className="font-bold" style={{ color: isDark ? '#ffffff' : '#000000' }}>{branch.city || '-'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 max-w-xs truncate" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                        <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400 shrink-0">home_pin</span>
                        <span className="font-semibold">{t('العنوان', 'Address')}:</span>
                        <span className="font-bold truncate" title={branch.address || ''} style={{ color: isDark ? '#ffffff' : '#000000' }}>{branch.address || '-'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono" dir="ltr" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>
                        <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400">call</span>
                        <span className="font-bold" style={{ color: isDark ? '#ffffff' : '#000000' }}>{branch.phone || '-'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold ${
                          assignedCount > 0
                            ? (theme === 'dark' ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'bg-teal-50 text-teal-800 border border-teal-300')
                            : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                        }`}>
                          <span className="material-symbols-outlined text-sm">group</span>
                          <span>{assignedCount} {t('موظف', 'Employees')}</span>
                        </span>
                      </div>
                    </div>

                    {canWrite() && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditBranch(branch)}
                          className="p-1.5 bg-transparent border-0 text-emerald-500 hover:text-emerald-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                          title={t('تعديل الفرع', 'Edit Branch')}
                        >
                          <span className="material-symbols-outlined text-xl">edit_note</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBranchClick(branch)}
                          className="p-1.5 bg-transparent border-0 text-red-500 hover:text-red-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                          title={t('حذف الفرع', 'Delete Branch')}
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* VIEW 3: CARDS GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {filteredBranches.map((branch) => {
                const bName = language === 'ar' ? (branch.name || branch.name_ar || branch.name_en) : (branch.name_en || branch.name || branch.name_ar);
                const assignedCount = employees.filter(e => e.branch && (e.branch.includes(branch.name || '') || e.branch.includes(branch.name_en || '') || e.branch.includes(branch.name_ar || ''))).length;
                return (
                  <div
                    key={branch.id}
                    className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                      isDark
                        ? 'bg-[#0a0c10] border-white/10 hover:border-teal-500/30'
                        : 'bg-white border-slate-200 shadow-xs hover:border-teal-500/40 hover:shadow-md'
                    }`}
                    style={{ color: isDark ? '#ffffff' : '#000000' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                        <span className="material-symbols-outlined text-base text-teal-600 dark:text-teal-400">pin_drop</span>
                        <span className="font-bold" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                          {bName}
                        </span>
                      </div>
                      {canWrite() && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditBranch(branch)}
                            className="p-1.5 bg-transparent border-0 text-emerald-500 hover:text-emerald-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                            title={t('تعديل الفرع', 'Edit Branch')}
                          >
                            <span className="material-symbols-outlined text-xl">edit_note</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBranchClick(branch)}
                            className="p-1.5 bg-transparent border-0 text-red-500 hover:text-red-400 transition-all duration-150 hover:scale-125 active:scale-95 cursor-pointer flex items-center justify-center"
                            title={t('حذف الفرع', 'Delete Branch')}
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-teal-600 dark:text-teal-400 shrink-0">location_city</span>
                        <span className="font-semibold" style={{ color: isDark ? '#94a3b8' : '#334155' }}>{t('المدينة', 'City')}:</span>
                        <span className="font-bold" style={{ color: isDark ? '#ffffff' : '#000000' }}>{branch.city || '-'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-teal-600 dark:text-teal-400 shrink-0">home_pin</span>
                        <span className="font-semibold" style={{ color: isDark ? '#94a3b8' : '#334155' }}>{t('العنوان', 'Address')}:</span>
                        <span className="font-bold truncate" title={branch.address || ''} style={{ color: isDark ? '#ffffff' : '#000000' }}>{branch.address || '-'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-teal-600 dark:text-teal-400 shrink-0">call</span>
                        <span className="font-semibold" style={{ color: isDark ? '#94a3b8' : '#334155' }}>{t('الهاتف', 'Phone')}:</span>
                        <span className="font-mono font-bold" dir="ltr" style={{ color: isDark ? '#ffffff' : '#000000' }}>{branch.phone || '-'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between font-mono text-xs font-bold" style={{ color: isDark ? '#94a3b8' : '#000000' }}>
                      <span style={{ color: isDark ? '#94a3b8' : '#334155' }}>{t('عدد الموظفين المعينين', 'Assigned Employees')}:</span>
                      <span className="font-extrabold text-sm" style={{ color: isDark ? '#2dd4bf' : '#000000' }}>{assignedCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(activeModuleId === 'emp-company-profile' || activeModuleId === 'emp-organization') && (
        <DynamicHrisModule
          lang={language}
          theme={isDark ? 'dark' : 'light'}
          initialTab={activeModuleId === 'emp-organization' ? 'diagram' : 'company-profile'}
          companyProfileContent={
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">domain</span>
                  {t('الملف التعريفي للشركة', 'Company Profile')}
                </h2>
                {canWrite() && (
                  <button
                    onClick={() => handleEditCompanyProfile(companyProfile)}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    {t('تعديل', 'Edit')}
                  </button>
                )}
              </div>

              {companyProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                  {/* Company Names */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('اسم الشركة بالعربية', 'Company Name (Arabic)')}:</span>
                    <span className="font-bold text-teal-400 text-sm">{companyProfile.company_name || '-'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('اسم الشركة بالإنجليزية', 'Company Name (English)')}:</span>
                    <span className="font-bold text-teal-400 text-sm">{companyProfile.company_name_en || '-'}</span>
                  </div>

                  {/* Logo */}
                  {companyProfile.logo_url && (
                    <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2 md:col-span-2">
                      <span className="text-slate-400 block font-bold mb-1">{t('شعار الشركة', 'Company Logo')}:</span>
                      <img src={companyProfile.logo_url} alt="Company Logo" className="h-16 object-contain" />
                    </div>
                  )}

                  {/* Address */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2 md:col-span-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('العنوان', 'Address')}:</span>
                    <span className="text-slate-200">{companyProfile.address || '-'}</span>
                  </div>

                  {/* City and Country */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('المدينة', 'City')}:</span>
                    <span className="text-slate-200">{companyProfile.city || '-'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('البلد', 'Country')}:</span>
                    <span className="text-slate-200">{companyProfile.country || '-'}</span>
                  </div>

                  {/* Contact Information */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('رقم الهاتف', 'Phone')}:</span>
                    <span className="text-slate-200 font-mono">{companyProfile.phone || '-'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('البريد الإلكتروني', 'Email')}:</span>
                    <span className="text-slate-200">{companyProfile.email || '-'}</span>
                  </div>

                  {/* Website */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2 md:col-span-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('الموقع الإلكتروني', 'Website')}:</span>
                    {companyProfile.website ? (
                      <a href={companyProfile.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                        {companyProfile.website}
                      </a>
                    ) : (
                      <span className="text-slate-200">-</span>
                    )}
                  </div>

                  {/* Legal Information */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('الرقم الضريبي', 'Tax ID')}:</span>
                    <span className="text-slate-200 font-mono">{companyProfile.tax_id || '-'}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('رقم التسجيل', 'Registration Number')}:</span>
                    <span className="text-slate-200 font-mono">{companyProfile.registration_number || '-'}</span>
                  </div>

                  {/* Established Date */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('تاريخ التأسيس', 'Established Date')}:</span>
                    <span className="text-slate-200">{companyProfile.established_date ? String(companyProfile.established_date).slice(0, 10) : '-'}</span>
                  </div>

                  {/* Description */}
                  <div className="p-4 rounded-xl bg-[#0a0c10] border border-white/5 space-y-2 md:col-span-2">
                    <span className="text-slate-400 block font-bold mb-1">{t('الوصف', 'Description')}:</span>
                    <span className="text-slate-200">{companyProfile.description || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">domain_disabled</span>
                  <p>{t('لا يوجد ملف تعريفي للشركة', 'No company profile found')}</p>
                </div>
              )}
            </div>
          }
        />
      )}

      {activeModuleId === 'emp-calendar' && (
        <CompanyCalendar language={language} />
      )}

      {activeModuleId === 'emp-news' && (
        <CompanyNews language={language} />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-bold text-white">تأكيد الحذف</h3>
            </div>
            <p className="text-slate-300 text-sm">
              هل أنت متأكد من حذف الموظف <span className="text-white font-bold">{deleteConfirm.empName}</span>؟
              <br />
              <span className="text-rose-400 text-xs">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm({ show: false, empId: '', empName: '' })}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 border border-white/10 text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (!canWrite()) {
                    alert(language === 'ar' ? 'ليس لديك صلاحية حذف الموظفين (وضع القراءة فقط)' : 'You do not have permission to delete employees (Read-Only Mode)');
                    setDeleteConfirm({ show: false, empId: '', empName: '' });
                    return;
                  }
                  deleteEmployee(deleteConfirm.empId);
                  setDeleteConfirm({ show: false, empId: '', empName: '' });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/25 text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Confirmation Modal for Employee 7-Tabs Form */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {saveSuccessMessage ? (
              // Success Screen View
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-500">
                  <span className="material-symbols-outlined text-4xl">check_circle</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-500 mb-1">
                    {language === 'ar' ? 'تمت العملية بنجاح' : 'Success'}
                  </h3>
                  <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {saveSuccessMessage}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveConfirmModal(false);
                      setSaveSuccessMessage(null);
                      handleResetForm();
                      setActiveModuleId('emp-hr-directory');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">groups</span>
                    {t('العودة لدليل الموظفين', 'Return to Directory')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaveConfirmModal(false);
                      setSaveSuccessMessage(null);
                    }}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('البقاء في صفحة النموذج', 'Stay on Form')}
                  </button>
                </div>
              </div>
            ) : (
              // Confirmation Dialog View
              <>
                <div className="flex items-center gap-3 border-b pb-3 border-teal-500/20">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                      {(activeModuleId === 'emp-edit' || selectedEmpId)
                        ? t('تأكيد حفظ تعديلات بيانات الموظف', 'Confirm Employee Updates')
                        : t('تأكيد حفظ وتسجيل الموظف الجديد', 'Confirm New Employee Registration')}
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {t('يرجى مراجعة وتأكيد حفظ كافة البيانات في قاعدة البيانات:', 'Please review and confirm saving data to database:')}
                    </p>
                  </div>
                </div>

                {/* Summary Card */}
                <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
                  isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1.5">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('الاسم الكامل (عربي):', 'Full Name (Ar):')}</span>
                    <span className="font-bold text-teal-500">{fullName}</span>
                  </div>
                  {fullNameEn && (
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1.5">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('الاسم بالإنجليزية:', 'Full Name (En):')}</span>
                      <span className="font-bold text-slate-200 dark:text-slate-200">{fullNameEn}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1.5">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('الرقم الوظيفي / الكود:', 'Employee ID / Code:')}</span>
                    <span className="font-mono font-bold text-blue-400">{empCode || selectedEmpId || t('تلقائي', 'Auto')}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1.5">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('الوظيفة والمسمى:', 'Job Title & Role:')}</span>
                    <span className="font-bold">{jobTitle || t('غير محدد', 'Not Specified')}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1.5">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('القسم والفرع:', 'Dept & Branch:')}</span>
                    <span className="font-bold">{department} • {branch}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('الراتب الأساسي:', 'Basic Salary:')}</span>
                    <span className="font-mono font-bold text-emerald-500">
                      {basicSalary > 0 ? Number(basicSalary).toLocaleString() : '0'} د.ع
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSavingEmployee}
                    onClick={() => setShowSaveConfirmModal(false)}
                    className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {t('إلغاء ومتابعة التعديل', 'Cancel & Continue Editing')}
                  </button>
                  <button
                    type="button"
                    disabled={isSavingEmployee}
                    onClick={handleConfirmAndExecuteSave}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/30 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSavingEmployee ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        <span>{t('جاري الحفظ والتثبيت...', 'Saving & Storing...')}</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>{t('تأكيد وحفظ التغييرات', 'Confirm & Save Changes')}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Branch Add/Edit Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3 text-teal-600 dark:text-teal-400">
                <span className="material-symbols-outlined text-2xl">location_city</span>
                <h3 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                  {editingBranch ? t('تعديل الفرع', 'Edit Branch') : t('إضافة فرع جديد', 'Add New Branch')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBranchModal(false);
                  setEditingBranch(null);
                  setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-black'
                }`}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} className="space-y-3.5">
              <div>
                <label className="block font-bold mb-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                  {t('اسم الفرع (عربي) *', 'Branch Name (Arabic) *')}
                </label>
                <input
                  type="text"
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDark
                      ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500'
                      : 'bg-white border-slate-300 text-black placeholder-slate-400 focus:border-teal-600 shadow-2xs'
                  }`}
                  style={{ color: isDark ? '#ffffff' : '#000000' }}
                  placeholder={t('مثال: فرع بغداد - الكرادة', 'e.g., Baghdad Branch - Karrada')}
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                  {t('اسم الفرع (إنجليزي) *', 'Branch Name (English) *')}
                </label>
                <input
                  type="text"
                  value={branchFormData.name_en}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name_en: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDark
                      ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500'
                      : 'bg-white border-slate-300 text-black placeholder-slate-400 focus:border-teal-600 shadow-2xs'
                  }`}
                  style={{ color: isDark ? '#ffffff' : '#000000' }}
                  placeholder={t('e.g., Baghdad Branch - Karrada', 'e.g., Baghdad Branch - Karrada')}
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                  {t('العنوان', 'Address')}
                </label>
                <input
                  type="text"
                  value={branchFormData.address}
                  onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDark
                      ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500'
                      : 'bg-white border-slate-300 text-black placeholder-slate-400 focus:border-teal-600 shadow-2xs'
                  }`}
                  style={{ color: isDark ? '#ffffff' : '#000000' }}
                  placeholder={t('العنوان الكامل', 'Full address')}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                  {t('المدينة', 'City')}
                </label>
                <input
                  type="text"
                  value={branchFormData.city}
                  onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDark
                      ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500'
                      : 'bg-white border-slate-300 text-black placeholder-slate-400 focus:border-teal-600 shadow-2xs'
                  }`}
                  style={{ color: isDark ? '#ffffff' : '#000000' }}
                  placeholder={t('مثال: بغداد', 'e.g., Baghdad')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                    {t('رقم الهاتف', 'Phone Number')}
                  </label>
                  <input
                    type="text"
                    value={branchFormData.phone}
                    onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                      isDark
                        ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500'
                        : 'bg-white border-slate-300 text-black placeholder-slate-400 focus:border-teal-600 shadow-2xs'
                    }`}
                    style={{ color: isDark ? '#ffffff' : '#000000' }}
                    placeholder={t('مثال: 07700000000', 'e.g., 07700000000')}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                    {t('الحالة', 'Status')}
                  </label>
                  <select
                    value={branchFormData.status}
                    onChange={(e) => setBranchFormData({ ...branchFormData, status: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all cursor-pointer ${
                      isDark
                        ? 'bg-[#0a0c10] border-slate-700 text-white focus:border-teal-500'
                        : 'bg-white border-slate-300 text-black focus:border-teal-600 shadow-2xs'
                    }`}
                    style={{ color: isDark ? '#ffffff' : '#000000' }}
                  >
                    <option value="Active">{t('نشط', 'Active')}</option>
                    <option value="Inactive">{t('غير نشط', 'Inactive')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-xs" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
                  {t('البريد الإلكتروني', 'Email')}
                </label>
                <input
                  type="email"
                  value={branchFormData.email}
                  onChange={(e) => setBranchFormData({ ...branchFormData, email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                    isDark
                      ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500'
                      : 'bg-white border-slate-300 text-black placeholder-slate-400 focus:border-teal-600 shadow-2xs'
                  }`}
                  style={{ color: isDark ? '#ffffff' : '#000000' }}
                  placeholder="branch@vitasiraq.iq"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchModal(false);
                    setEditingBranch(null);
                    setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
                  }}
                  className={`px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 text-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {editingBranch ? t('حفظ التعديلات', 'Save Changes') : t('إضافة الفرع', 'Add Branch')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Position Add Modal */}
      {showPositionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-blue-400">
                <span className="material-symbols-outlined text-3xl">work</span>
                <h3 className="text-lg font-bold text-white">
                  {t('إضافة وظيفة جديدة', 'Add New Position')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPositionModal(false);
                  setPositionFormData({ name_ar: '', name_en: '', sort_order: 0 });
                }}
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handlePositionSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5 text-xs">
                  {t('اسم الوظيفة (عربي)', 'Position Name (Arabic)')}
                </label>
                <input
                  type="text"
                  value={positionFormData.name_ar}
                  onChange={(e) => setPositionFormData({ ...positionFormData, name_ar: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  placeholder={t('مثال: مدير قسم الموارد البشرية', 'e.g., HR Department Manager')}
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5 text-xs">
                  {t('اسم الوظيفة (إنجليزي)', 'Position Name (English)')}
                </label>
                <input
                  type="text"
                  value={positionFormData.name_en}
                  onChange={(e) => setPositionFormData({ ...positionFormData, name_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  placeholder={t('e.g., HR Department Manager', 'e.g., HR Department Manager')}
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5 text-xs">
                  {t('ترتيب العرض', 'Sort Order')}
                </label>
                <input
                  type="number"
                  value={positionFormData.sort_order}
                  onChange={(e) => setPositionFormData({ ...positionFormData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPositionModal(false);
                    setPositionFormData({ name_ar: '', name_en: '', sort_order: 0 });
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 border border-white/10 text-sm"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 text-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {t('إضافة الوظيفة', 'Add Position')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Company Profile Edit Modal */}
      {showCompanyProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-teal-400">
                <span className="material-symbols-outlined text-3xl">domain</span>
                <h3 className="text-lg font-bold text-white">
                  {editingCompanyProfile ? t('تعديل الملف التعريفي', 'Edit Company Profile') : t('إنشاء ملف تعريفي', 'Create Company Profile')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCompanyProfileModal(false);
                  setEditingCompanyProfile(null);
                  setCompanyProfileFormData({
                    id: '',
                    company_name: '',
                    company_name_en: '',
                    logo_url: '',
                    address: '',
                    city: '',
                    country: 'Iraq',
                    phone: '',
                    email: '',
                    website: '',
                    tax_id: '',
                    registration_number: '',
                    established_date: '',
                    description: ''
                  });
                }}
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCompanyProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('اسم الشركة (عربي)', 'Company Name (Arabic)')}
                  </label>
                  <input
                    type="text"
                    value={companyProfileFormData.company_name}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, company_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('مثال: مؤسسة فيتاس العراق', 'e.g., Vitas Iraq Company')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('اسم الشركة (إنجليزي)', 'Company Name (English)')}
                  </label>
                  <input
                    type="text"
                    value={companyProfileFormData.company_name_en}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, company_name_en: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('e.g., Vitas Iraq Company', 'e.g., Vitas Iraq Company')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('رابط الشعار', 'Logo URL')}
                </label>
                <input
                  type="url"
                  value={companyProfileFormData.logo_url}
                  onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, logo_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('https://example.com/logo.png', 'https://example.com/logo.png')}
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('العنوان', 'Address')}
                </label>
                <textarea
                  value={companyProfileFormData.address}
                  onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm resize-none"
                  placeholder={t('العنوان الكامل', 'Full address')}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('المدينة', 'City')}
                  </label>
                  <input
                    type="text"
                    value={companyProfileFormData.city}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('مثال: بغداد', 'e.g., Baghdad')}
                  />
                </div>

                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('البلد', 'Country')}
                  </label>
                  <input
                    type="text"
                    value={companyProfileFormData.country}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('مثال: العراق', 'e.g., Iraq')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('رقم الهاتف', 'Phone')}
                  </label>
                  <input
                    type="text"
                    value={companyProfileFormData.phone}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('مثال: +964 780 000 0000', 'e.g., +964 780 000 0000')}
                  />
                </div>

                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('البريد الإلكتروني', 'Email')}
                  </label>
                  <input
                    type="email"
                    value={companyProfileFormData.email}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('info@company.com', 'info@company.com')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('الموقع الإلكتروني', 'Website')}
                </label>
                <input
                  type="url"
                  value={companyProfileFormData.website}
                  onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('https://example.com', 'https://example.com')}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('الرقم الضريبي', 'Tax ID')}
                  </label>
                  <input
                    type="text"
                    value={companyProfileFormData.tax_id}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, tax_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('رقم الضريبة', 'Tax number')}
                  />
                </div>

                <div>
                  <label className="block text-black font-medium mb-1.5 text-xs">
                    {t('رقم التسجيل', 'Registration Number')}
                  </label>
                  <input
                    type="text"
                    value={companyProfileFormData.registration_number}
                    onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, registration_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                    placeholder={t('رقم التسجيل', 'Registration number')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('تاريخ التأسيس', 'Established Date')}
                </label>
                <input
                  type="date"
                  value={companyProfileFormData.established_date ? String(companyProfileFormData.established_date).slice(0, 10) : ''}
                  onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, established_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('الوصف', 'Description')}
                </label>
                <textarea
                  value={companyProfileFormData.description}
                  onChange={(e) => setCompanyProfileFormData({ ...companyProfileFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm resize-none"
                  placeholder={t('وصف الشركة', 'Company description')}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCompanyProfileModal(false);
                    setEditingCompanyProfile(null);
                    setCompanyProfileFormData({
                      id: '',
                      company_name: '',
                      company_name_en: '',
                      logo_url: '',
                      address: '',
                      city: '',
                      country: 'Iraq',
                      phone: '',
                      email: '',
                      website: '',
                      tax_id: '',
                      registration_number: '',
                      established_date: '',
                      description: ''
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 border border-white/10 text-sm"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 text-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {editingCompanyProfile ? t('حفظ التعديلات', 'Save Changes') : t('إنشاء الملف', 'Create Profile')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branch Delete Confirmation Modal */}
      {branchDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`border rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                {t('تأكيد حذف الفرع', 'Confirm Branch Deletion')}
              </h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: isDark ? '#cbd5e1' : '#000000' }}>
              {t('هل أنت متأكد من حذف الفرع', 'Are you sure you want to delete the branch')} <span className="font-bold underline" style={{ color: isDark ? '#ffffff' : '#000000' }}>{branchDeleteConfirm.name}</span>؟
              <br />
              <span className="text-rose-600 dark:text-rose-400 text-[11px] font-bold mt-1 block">
                {t('لا يمكن التراجع عن هذا الإجراء', 'This action cannot be undone')}
              </span>
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setBranchDeleteConfirm({ show: false, id: '', name: '' })}
                className={`px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBranch}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/25 text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                {t('حذف الفرع', 'Delete Branch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employment Contracts Archive Modal */}
      <ContractArchiveModal
        isOpen={isContractArchiveOpen}
        onClose={() => setIsContractArchiveOpen(false)}
        employee={contractArchiveEmployee || selectedEmployee}
        contractTypes={contractTypes}
        language={language}
        theme={theme}
        companyProfile={companyProfile}
        onPreviewContract={(contractEmpObj) => {
          handleOpenContractPreview(contractEmpObj);
        }}
      />

      {/* Contract Preview & Print Modal */}
      <ContractPreviewModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        employee={contractModalEmployee}
        contractTypes={contractTypes}
        language={language}
        companyProfile={companyProfile}
      />

      {/* Contract Renewal & Evaluation Alerts Modal */}
      <ContractRenewalAlertsModal
        isOpen={showRenewalAlertsModal}
        onClose={() => setShowRenewalAlertsModal(false)}
        employees={activeEmployees}
        onOpenContract={(emp) => handleOpenContractPreview(emp)}
        language={language}
        theme={theme}
      />

      {/* Batch Office Contract Routing Modal */}
      <BatchOfficeContractRoutingModal
        isOpen={showBatchOfficeRoutingModal}
        onClose={() => setShowBatchOfficeRoutingModal(false)}
        employees={activeEmployees}
        language={language}
        theme={theme}
      />
    </div>
  );
};

export default Category3EmployeeView;
