import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { SearchableComboBox } from '../components/SearchableComboBox';
import { CompanyCalendar } from '../components/CompanyCalendar';
import { CompanyNews } from '../components/CompanyNews';
import { Employee, EmployeeChild } from '../types';
import { api } from '../api/client';

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
    currentUser
  } = useApp();

  // Selected employee for profile view
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [profileViewTab, setProfileViewTab] = useState<'overview' | 'personal' | 'job' | 'contracts' | 'financial' | 'identity' | 'family'>('overview');
  const [profileSearchQuery, setProfileSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);

  useEffect(() => {
    setAvatarImgError(false);
  }, [selectedEmpId]);

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
  const [branchDeleteConfirm, setBranchDeleteConfirm] = useState<{ show: boolean; id: number; name: string }>({
    show: false,
    id: 0,
    name: ''
  });

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

  // Filter employees based on search query
  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(query) ||
      emp.fullNameEn?.toLowerCase().includes(query) ||
      emp.employeeId?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.jobTitle?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.branch?.toLowerCase().includes(query)
    );
  });

  // Filter employees for profile search box
  const matchingProfileEmployees = employees.filter(emp => {
    if (!profileSearchQuery.trim()) return true;
    const query = profileSearchQuery.toLowerCase();
    return (
      emp.fullName?.toLowerCase().includes(query) ||
      emp.fullNameEn?.toLowerCase().includes(query) ||
      emp.employeeId?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.jobTitle?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.branch?.toLowerCase().includes(query)
    );
  });

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
      if (enName && enName !== 'N/A' && enName.trim() !== '') return enName;
      const arName = emp.fullName || emp.full_name_ar || emp.name_ar;
      if (arName && dictEn[arName]) return dictEn[arName];
      return arName || '-';
    }
    return emp.fullName || emp.full_name_ar || emp.name_ar || '-';
  };

  const getEmpJobTitle = (emp: any) => {
    if (!emp) return '-';
    if (language === 'en') {
      const enTitle = emp.jobTitleEn || emp.job_title_en;
      if (enTitle && enTitle !== 'N/A' && enTitle.trim() !== '') return enTitle;
      const arTitle = emp.jobTitle || emp.position_ar || emp.position;
      const foundPos = positions.find((p: any) => p.name_ar === arTitle || p.name === arTitle);
      if (foundPos?.name_en) return foundPos.name_en;
      if (arTitle && dictEn[arTitle]) return dictEn[arTitle];
      return arTitle || '-';
    }
    return emp.jobTitle || emp.position_ar || emp.position || '-';
  };

  const getEmpDepartment = (emp: any) => {
    if (!emp) return '-';
    if (language === 'en') {
      const enDept = emp.departmentEn || emp.department_en;
      if (enDept && enDept !== 'N/A' && enDept.trim() !== '') return enDept;
      const arDept = emp.department || emp.department_ar;
      const foundDept = departments.find((d: any) => d.name_ar === arDept || d.name === arDept);
      if (foundDept?.name_en) return foundDept.name_en;
      if (arDept && dictEn[arDept]) return dictEn[arDept];
      return arDept || '-';
    }
    return emp.department || emp.department_ar || '-';
  };

  const getEmpBranch = (emp: any) => {
    if (!emp) return '-';
    if (language === 'en') {
      const enBranch = emp.branchEn || emp.branch_en || emp.location_en;
      if (enBranch && enBranch !== 'N/A' && enBranch.trim() !== '') return enBranch;
      const arBranch = emp.branch || emp.location_ar;
      const foundLoc = locations.find((l: any) => l.name_ar === arBranch || l.name === arBranch);
      if (foundLoc?.name_en) return foundLoc.name_en;
      if (arBranch && dictEn[arBranch]) return dictEn[arBranch];
      return arBranch || '-';
    }
    return emp.branch || emp.location_ar || '-';
  };

  // 7 Tabs Form State
  const [activeTab, setActiveTab] = useState<number>(1);

  // Tab 1: Basic & Personal
  const [fullName, setFullName] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [badgeNo, setBadgeNo] = useState('');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [personalEmail, setPersonalEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [gender, setGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [maritalStatus, setMaritalStatus] = useState<'أعزب' | 'متأهل' | 'مطلق' | 'أرمل'>('أعزب');
  const [nationality, setNationality] = useState('عراقي');

  // Tab 2: Contracts & Service
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractEndDate, setContractEndDate] = useState('');
  const [originalStartDate, setOriginalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [probationEndDate, setProbationEndDate] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [termOfContract, setTermOfContract] = useState('عقد محدد المدة (سنة واحدة)');
  const [grade, setGrade] = useState('G-4 الدرجة الرابعة');

  // Tab 3: Position, Department & Branch
  const [jobTitle, setJobTitle] = useState('مسؤول ائتمان أول');
  const [jobTitleEn, setJobTitleEn] = useState('Senior Credit Officer');
  const [department, setDepartment] = useState('إدارة التمويل الأصغر والعمليات');
  const [departmentEn, setDepartmentEn] = useState('Microfinance & Operations');
  const [branch, setBranch] = useState('فرع بغداد - الكرادة');
  const [branchEn, setBranchEn] = useState('Baghdad Branch - Karrada');
  const [positionStartDate, setPositionStartDate] = useState(originalStartDate);
  const [supervisorName, setSupervisorName] = useState('أحمد جاسم المحمداوي');
  const [workScope, setWorkScope] = useState('ميداني ومكتبي');

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
        const normalizedBranches = rawBranches.map((b: any) => ({
          ...b,
          name_ar: b.name_ar || b.name || '',
          name: b.name || b.name_ar || '',
          name_en: b.name_en || ''
        }));

        setLocations(normalizedBranches);
        setPositions(Array.isArray(positionsData) ? positionsData : []);
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
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

  const handleLoadEmployeeData = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    const clean = (val?: string) => (!val || val === 'N/A' || val === 'غير محدد' ? '' : val);

    setSelectedEmpId(empId);
    setFullName(clean(emp.fullName));
    setFullNameEn(clean(emp.fullNameEn));
    setEmpCode(clean(emp.employeeId) || clean(emp.employee_id) || clean(emp.empCode) || (emp.id ? `VTS-${emp.id}` : ''));
    setBadgeNo(clean(emp.badgeNo) || clean(emp.badge_no) || '');
    setDob(clean(emp.dob));
    setEmail(clean(emp.email));
    setPersonalEmail(clean(emp.personalEmail));
    setPhone(clean(emp.phone));
    setEmergencyPhone(clean(emp.emergencyPhone));
    setNationalId(clean(emp.nationalId));
    setPassportNo(clean(emp.passportNo));
    setPassportExpiry(clean(emp.passportExpiry));
    setSpouseName(clean(emp.spouseName));
    setSpouseEmployedHere(emp.spouseEmployedHere || false);
    setChildrenDetails(emp.childrenList ? JSON.stringify(emp.childrenList) : '');
    setChildrenList(emp.childrenList || []);
    setNewChildName('');
    setNewChildDob('');
    setEditingChildId(null);
    setTrainingsRecord(clean(emp.trainingsRecord));
    setWarningsRecord(clean(emp.warningsRecord));
    setExitDate(clean(emp.exitDate));
    setPositionStartDate(clean(emp.joinDate) || new Date().toISOString().split('T')[0]);
    setBranchEn(clean(emp.branchEn));
    setPhotoUrl(clean(emp.photoUrl));
    setActiveTab(1);
    setStatusChanges([]);
    setNewStatusChange({ new_position: '', start_date: '', end_date: '' });
    setEmployeeTrainings([]);
    setNewTraining({ course_name: '', start_date: '', end_date: '' });

    // Set other fields
    setGender(emp.gender === 'ذكر' ? 'ذكر' : 'أنثى');
    setMaritalStatus(emp.maritalStatus === 'أعزب' ? 'أعزب' :
                     emp.maritalStatus === 'متأهل' ? 'متأهل' :
                     emp.maritalStatus === 'مطلق' ? 'مطلق' : 'أرمل');
    setNationality(emp.nationality || 'عراقي');
    setDepartment(emp.department || '');
    setJobTitle(emp.jobTitle || '');
    setJobTitleEn(emp.jobTitleEn || '');
    setBranch(emp.branch || '');
    setBranchEn(emp.branchEn || '');
    setSupervisorName(emp.supervisorName || '');
    setWorkScope(emp.workScope || '');
    setBasicSalary(emp.salary || emp.basicSalary || 0);
    setWrittenBasicSalaryAr(emp.writtenBasicSalaryAr || '');
    setBankName(emp.bankName || '');
    setIban(emp.iban || '');
    setIsSsTaxExempt(Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1);
    setSsTaxExemptionReason(emp.ssTaxExemptionReason || emp.ss_tax_exemption_reason || '');
    setTransportationFixed(emp.transportationFixed || 0);
    setFixedBonus(emp.fixedBonus || 0);
    setPhoneAllowance(emp.phoneAllowance || 0);
    setCertificateAllowance(emp.certificateAllowance || 0);
    setSpouseAllowance(emp.spouseAllowance || 0);
    setChildAllowance(emp.childAllowance || 0);
    setContractStartDate(emp.contractStartDate || '');
    setContractEndDate(emp.contractEndDate || '');
    setOriginalStartDate(emp.originalStartDate || '');
    setProbationEndDate(emp.probationEndDate || '');
    setTermOfContract(emp.termOfContract || '');
    setGrade(emp.grade || '');
    setSelectedPolicy('');
  };

  const handleResetForm = () => {
    setSelectedEmpId(null);
    setFullName('');
    setFullNameEn('');
    setEmpCode('');
    setBadgeNo('');
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
    setPositionStartDate(new Date().toISOString().split('T')[0]);
    setBranchEn('');
    setPhotoUrl('');
    setActiveTab(1);
    setStatusChanges([]);
    setNewStatusChange({ new_position: '', start_date: '', end_date: '' });
    setEmployeeTrainings([]);
    setNewTraining({ course_name: '', start_date: '', end_date: '' });
  };

  // Branch & Location Management Functions
  const handleAddBranch = () => {
    setEditingBranch(null);
    setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
    setShowBranchModal(true);
  };

  const handleEditBranch = (branch: any) => {
    setEditingBranch(branch);
    setBranchFormData({
      name: branch.name || '',
      name_en: branch.name_en || '',
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
    
    try {
      await api.deleteBranch(branchDeleteConfirm.id.toString());
      const updatedBranches = branchLocations.filter(b => b.id !== branchDeleteConfirm.id);
      setBranchLocations(updatedBranches);
      setLocations(updatedBranches);
      setBranchDeleteConfirm({ show: false, id: 0, name: '' });
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('فشل حذف الفرع');
    }
  };

  // Position Management Functions
  const handleAddPosition = () => {
    setPositionFormData({ name_ar: '', name_en: '', sort_order: 0 });
    setShowPositionModal(true);
  };

  const handlePositionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    
    try {
      const branchData = {
        name: branchFormData.name,
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
        console.log('Updating branch with ID:', editingBranch.id);
        await api.updateBranch(editingBranch.id.toString(), branchData);
        const updatedBranches = branchLocations.map(b =>
          b.id === editingBranch.id
            ? { ...b, ...branchData, name_ar: branchData.name, name: branchData.name }
            : b
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
          ...newObj,
          ...branchData,
          name_ar: branchData.name,
          name: branchData.name
        };
        const updatedBranches = [...branchLocations, newBranch];
        setBranchLocations(updatedBranches);
        setLocations(updatedBranches);
      }
      
      setShowBranchModal(false);
      setEditingBranch(null);
      setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
    } catch (error) {
      console.error('Error saving branch:', error);
      alert('فشل حفظ الفرع: ' + (error as any).message);
    }
  };

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) {
      alert(t('يرجى تعبئة الاسم الكامل الثلاثي في التبويب الأول (المعلومات الأساسية)', 'Please fill in the full name in the first tab (Basic Information)'));
      setActiveTab(1);
      return;
    }

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
      photo_url: photoUrl,
      photoUrl: photoUrl,
      photo: photoUrl,
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
      photoUrl,
      photo_url: photoUrl,
      photo: photoUrl,
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
    }

    alert(isEditMode 
      ? (language === 'ar' ? 'تم تحديث بيانات الموظف بنجاح!' : 'Employee data updated successfully!')
      : (language === 'ar' ? 'تم حفظ الموظف الجديد بنجاح في النظام!' : 'New employee saved successfully!')
    );
    handleResetForm();
    setActiveModuleId('emp-hr-directory');
  };

  const selectedEmployee = employees.find(e => String(e.id) === String(selectedEmpId)) || employees[0];

  const TAB_ITEMS = [
    { id: 1, title: t('المعلومات الأساسية', 'Basic Info'), icon: 'badge', desc: t('الاسم، البريد الهواتف والحالة', 'Name, Email, Phone & Status') },
    { id: 2, title: t('العقود وتاريخ الخدمة', 'Contracts & Service'), icon: 'description', desc: t('تواريخ المباشرة والعقد والدرجة', 'Join Dates, Contract & Grade') },
    { id: 3, title: t('التعيين والقسم والفرع', 'Position & Department'), icon: 'corporate_fare', desc: t('الوظيفة، الإدارة والمشرف', 'Role, Department & Supervisor') },
    { id: 4, title: t('البيانات المالية والراتب', 'Financial & Salary'), icon: 'payments', desc: t('الاسمية، البدلات والآيبان', 'Basic Salary, Allowances & IBAN') },
    { id: 5, title: t('الوثائق الثبوتية والهوية', 'Identity & Documents'), icon: 'id_card', desc: t('البطاقة الوطنية والجواز', 'National ID & Passport') },
    { id: 6, title: t('البيانات العائلية والأبناء', 'Family & Dependents'), icon: 'family_restroom', desc: t('الزوجة والأطفال', 'Spouse & Children') },
    { id: 7, title: t('التدريبات والسجل الإداري', 'Trainings & Record'), icon: 'history_edu', desc: t('الدورات والإنذارات والحالة', 'Courses, Warnings & Status') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="dark-banner p-6 rounded-3xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400">group</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">
              EMPLOYEE MANAGEMENT SYSTEM
            </span>
          </div>
          <h1 className="text-2xl font-black text-white text-white-force drop-shadow-sm">
            {activeModuleId === 'emp-directory' && t('دليل الموظفين المؤسسي', 'Corporate Employee Directory')}
            {activeModuleId === 'emp-hr-directory' && t('دليل الموظفين الشامل - إدارة الموارد البشرية', 'Comprehensive Employee Directory - HR')}
            {activeModuleId === 'emp-add' && t('تسجيل وإضافة موظف جديد (نموذج 7 تبويبات)', 'Register & Add New Employee (7-Tab Form)')}
            {activeModuleId === 'emp-profile' && t('ملفات الموظفين - HR Employees Profiles', 'HR Employees Profiles')}
            {activeModuleId === 'emp-branches' && t('إدارة الفروع والمواقع الميدانية في العراق', 'Branch & Field Location Management in Iraq')}
            {activeModuleId === 'emp-company-profile' && t('إعدادات ملف مؤسسة فيتاس العراق', 'VITAS Iraq Institution Profile Settings')}
            {activeModuleId === 'emp-calendar' && t('تقويم الفعاليات والعطل الرسمية', 'Events & Official Holidays Calendar')}
            {activeModuleId === 'emp-news' && t('مركز الأخبار والتنويهات الداخلية', 'Internal News & Announcements Center')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('إدارة كاملة للبيانات الوظيفية وسجلات العاملين بفرص خالية من البيانات الافتراضية', 'Comprehensive management of employee records and workforce data')}
          </p>
        </div>

        {(activeModuleId === 'emp-directory' || activeModuleId === 'emp-hr-directory') && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                handleResetForm();
                setActiveTab(1);
                setActiveModuleId('emp-add');
              }}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">person_add</span>
              {t('تسجيل موظف جديد', 'Register New Employee')}
            </button>

            <button
              onClick={handleAddPosition}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">work</span>
              {t('إضافة وظيفة جديدة', 'Add New Position')}
            </button>

            <button
              onClick={handleAddBranch}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add_location_alt</span>
              {t('إضافة Location جديد', 'Add New Location')}
            </button>
          </div>
        )}
      </div>

      {/* Directory View */}
      {(activeModuleId === 'emp-directory' || activeModuleId === 'emp-hr-directory') && (
        <div className="space-y-4">
          {/* Search Field */}
          <div className="relative">
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث عن موظف...' : 'Search employee...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-4 py-3 pr-12 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                theme === 'dark'
                  ? 'bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50'
                  : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
              }`}
            />
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          </div>

          <div className={`flex items-center justify-between text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            <span>{t('سجل الموظفين المسجلين', 'Registered Employee Directory')} ({filteredEmployees.length}/{employees.length})</span>
            <span className="text-slate-400 font-mono">{t('حقول قاعدة البيانات hrms_pro_db', 'hrms_pro_db database fields')}</span>
          </div>

          {filteredEmployees.length === 0 ? (
            <EmptyState
              icon="search_off"
              title={searchQuery ? t("لا توجد نتائج للبحث", "No search results found") : t("دليل الموظفين فارغ حالياً", "Employee directory is currently empty")}
              description={searchQuery ? t("لم يتم العثور على موظف يطابق معايير البحث. جرب كلمات مختلفة.", "No employee found matching search criteria. Try different keywords.") : t("لا يوجد أي موظف مسجل في النظام حتى الآن. استخدم نموذج الـ 7 تبويبات لإدخال بيانات الكادر بأسلوب دقيق ومطابق لقاعدة البيانات.", "No employees registered in the system yet. Use the 7-tab form to enter staff data accurately and in compliance with the database.")}
              actionText={searchQuery ? undefined : t("إضافة الموظف الأول الآن", "Add First Employee Now")}
              onAction={searchQuery ? undefined : () => setActiveModuleId('emp-add')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  className={`p-5 rounded-2xl border transition-all shadow-lg flex flex-col justify-between ${
                    theme === 'dark'
                      ? 'bg-[#111827] border-white/10 hover:border-blue-500/40'
                      : 'bg-white border-slate-200 hover:border-blue-500/40 shadow-slate-200/50'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl font-black text-lg flex items-center justify-center shadow overflow-hidden shrink-0 ${
                          theme === 'dark'
                            ? 'bg-teal-600/20 text-blue-400 border border-blue-500/30'
                            : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                          {emp.photoUrl ? (
                            <img src={emp.photoUrl} alt={getEmpFullName(emp)} className="w-full h-full object-cover" />
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
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {emp.employeeId || '-'}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl text-xs space-y-1 border ${
                      theme === 'dark'
                        ? 'bg-[#0a0c10] text-slate-400 border-white/5'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
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
                    </div>
                  </div>

                  <div className={`pt-4 border-t mt-4 flex items-center justify-between gap-1 ${
                    theme === 'dark' ? 'border-white/10' : 'border-slate-200'
                  }`}>
                    <button
                      onClick={() => {
                        setSelectedEmpId(emp.id);
                        setActiveModuleId('emp-profile');
                      }}
                      className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      {t('السجل الشامل', 'Full Profile')}
                    </button>

                    <button
                      onClick={() => {
                        handleLoadEmployeeData(emp.id);
                        setActiveModuleId('emp-add');
                      }}
                      className="text-xs font-bold text-teal-500 hover:text-teal-600 flex items-center gap-1 shrink-0 cursor-pointer"
                      title={t('تعديل بيانات الموظف', 'Edit Employee Data')}
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      {t('تعديل', 'Edit')}
                    </button>

                    <button
                      onClick={() => setDeleteConfirm({ show: true, empId: emp.id, empName: emp.fullName })}
                      className="text-xs text-rose-500 hover:text-rose-600 p-1 shrink-0 cursor-pointer"
                      title={t('حذف الموظف', 'Delete Employee')}
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 7-TABS ADD EMPLOYEE FORM */}
      {activeModuleId === 'emp-add' && (
        <div className="max-w-4xl mx-auto p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-2xl space-y-6">
          <div className="border-b border-white/10 pb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">
                  {selectedEmpId ? 'edit' : 'person_add'}
                </span>
                {selectedEmpId 
                  ? t('نموذج تعديل بيانات الموظف الشامل (7 تبويبات رئيسية)', 'Comprehensive Employee Edit Form (7 Main Tabs)') 
                  : t('نموذج إضافة موظف جديد الشامل (7 تبويبات رئيسية)', 'Comprehensive New Employee Add Form (7 Main Tabs)')}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('مطابق تماماً لمواصفات جدول employees في قاعدة البيانات hrms_pro_db', 'Fully compliant with employees table specifications in hrms_pro_db database')}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold font-mono">
              {t(`التبويب ${activeTab} من 7`, `Tab ${activeTab} of 7`)}
            </span>
          </div>

          {/* Tab Navigation Header (7 Tabs Stepper) */}
          <div className="space-y-3">
            {/* Progress bar line */}
            <div className="w-full bg-[#0a0c10] rounded-full h-1.5 overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-teal-500 to-teal-600 h-full transition-all duration-300 ease-out"
                style={{ width: `${(activeTab / 7) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {TAB_ITEMS.map(tab => {
                const isActive = activeTab === tab.id;
                const isCompleted = tab.id < activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`p-3 rounded-2xl text-right transition-all flex flex-col justify-between h-24 border ${
                      isActive
                        ? 'bg-gradient-to-br from-teal-600 to-teal-800 border-teal-400 text-white shadow-xl shadow-teal-600/30 scale-[1.02] z-10'
                        : isCompleted
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                        : 'bg-[#0a0c10] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs transition-all ${
                        isActive
                          ? 'bg-white text-teal-700 shadow-md scale-110'
                          : isCompleted
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-white/10 text-slate-400'
                      }`}>
                        {isCompleted ? '✓' : tab.id}
                      </span>
                      <span className={`material-symbols-outlined text-base ${isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {tab.icon}
                      </span>
                    </div>
                    <div>
                      <span className={`block text-[11px] font-bold leading-tight truncate ${isActive ? 'text-white' : ''}`}>{tab.title}</span>
                      <span className={`block text-[9px] truncate mt-0.5 ${isActive ? 'text-white/90 font-medium' : 'opacity-70'}`}>{tab.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content Body */}
          <form onSubmit={handleAddEmployeeSubmit} className="space-y-6 text-xs">
            {/* TAB 1: Basic & Personal Info */}
            {activeTab === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400">badge</span>
                  <h3 className="text-sm font-bold text-white">{t('التبويب 1: المعلومات الأساسية والشخصية', 'Tab 1: Basic & Personal Information')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-black font-medium mb-1">{t('الاسم الكامل الثلاثي (بالعربية) *', 'Full Name (Arabic) *')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('مثال: علي حيدر حسن', 'Example: Ali Haider Hassan')}
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('الاسم الكامل (بالإنجليزية)', 'Full Name (English)')}</label>
                    <input
                      type="text"
                      placeholder={t('Ali Haider Hassan', 'Ali Haider Hassan')}
                      value={fullNameEn}
                      onChange={e => setFullNameEn(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('الرقم الوظيفي', 'Employee ID')}</label>
                    <input
                      type="text"
                      placeholder={t('تلقائي: VTS-1008', 'Auto: VTS-1008')}
                      value={empCode}
                      onChange={e => setEmpCode(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-blue-400 font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('رقم باج الدخول', 'Badge Number')}</label>
                    <input
                      type="text"
                      placeholder={t('مثال: B-9042', 'Example: B-9042')}
                      value={badgeNo}
                      onChange={e => setBadgeNo(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('البريد الإلكتروني المؤسسي', 'Corporate Email')}</label>
                    <input
                      type="email"
                      placeholder={t('ali.haider@vitasiraq.com', 'ali.haider@vitasiraq.com')}
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('البريد الإلكتروني الشخصي', 'Personal Email')}</label>
                    <input
                      type="email"
                      placeholder={t('ali.personal@gmail.com', 'ali.personal@gmail.com')}
                      value={personalEmail}
                      onChange={e => setPersonalEmail(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('رقم الهاتف التواصل الرئيسي', 'Primary Contact Phone')}</label>
                    <input
                      type="text"
                      placeholder={t('0770 123 4567', '0770 123 4567')}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('هاتف الطوارئ والتواصل الحرج', 'Emergency Contact Phone')}</label>
                    <input
                      type="text"
                      placeholder={t('0780 987 6543', '0780 987 6543')}
                      value={emergencyPhone}
                      onChange={e => setEmergencyPhone(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('تاريخ الميلاد', 'Date of Birth')}</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={e => setDob(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('الجنس', 'Gender')}</label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    >
                      <option value="ذكر">{t('ذكر', 'Male')}</option>
                      <option value="أنثى">{t('أنثى', 'Female')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('الحالة الاجتماعية', 'Marital Status')}</label>
                    <select
                      value={maritalStatus}
                      onChange={e => setMaritalStatus(e.target.value as any)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    >
                      <option value="أعزب">{t('أعزب', 'Single')}</option>
                      <option value="متأهل">{t('متأهل', 'Married')}</option>
                      <option value="مطلق">{t('مطلق', 'Divorced')}</option>
                      <option value="أرمل">{t('أرمل', 'Widowed')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('الجنسية', 'Nationality')}</label>
                    <input
                      type="text"
                      value={nationality}
                      onChange={e => setNationality(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3 bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-teal-400 font-bold text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">account_box</span>
                        {t('صورة الموظف الشخصية', 'Employee Photo')}
                      </label>
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                        >
                          {t('إزالة الصورة ✕', 'Remove Photo ✕')}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Photo preview */}
                      <div className="w-16 h-16 rounded-2xl bg-[#0a0c10] border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {photoUrl ? (
                          <img src={photoUrl} alt="Employee Preview" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-slate-600 text-2xl">person</span>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder={t('أدخل رابط الصورة (URL) أو ارفع صورة...', 'Enter image URL or upload image...')}
                            value={photoUrl}
                            onChange={e => setPhotoUrl(e.target.value)}
                            className="flex-1 bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                          />
                          <label className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow transition-all flex items-center gap-1 shrink-0">
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            <span>{t('رفع صورة', 'Upload Photo')}</span>
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
                        <p className="text-[11px] text-slate-400">
                          {t('يمكن رفع صورة مباشرة من الجهاز أو لصق رابط صورة. (يتم حفظ الصورة بصيغة DataURL في السجل).', 'Upload photo directly from device or paste image URL (saved as DataURL).')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Contracts & Service Dates */}
            {activeTab === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400">description</span>
                  <h3 className="text-sm font-bold text-white">{t('التبويب 2: العقود وتواريخ الخدمة والمباشرة وسنوات الخدمة', 'Tab 2: Contracts & Service Dates')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-black font-medium mb-1">{t('تاريخ المباشرة الأولى', 'Original Start Date')}</label>
                    <input
                      type="date"
                      value={originalStartDate}
                      onChange={e => setOriginalStartDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('تاريخ بدء العقد الحالي', 'Current Contract Start Date')}</label>
                    <input
                      type="date"
                      value={contractStartDate}
                      onChange={e => setContractStartDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('تاريخ انتهاء العقد', 'Contract End Date')}</label>
                    <input
                      type="date"
                      value={contractEndDate}
                      onChange={e => setContractEndDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('تاريخ انتهاء فترة التجربة', 'Probation End Date')}</label>
                    <input
                      type="date"
                      value={probationEndDate}
                      onChange={e => setProbationEndDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('تاريخ إنهاء الخدمة / المغادرة', 'Exit Date / Service Termination')}</label>
                    <input
                      type="date"
                      value={exitDate}
                      onChange={e => setExitDate(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      {t('سنوات الخدمة الكلية', 'Total Years of Employment')}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-700/30">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <div className="w-full bg-[#0a0c10] border border-emerald-500/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-emerald-400 font-mono font-bold text-lg">{yearsOfEmployment}</span>
                      <span className="text-slate-500 text-[11px]">{t('سنة — مند تاريخ المباشرة الأولى', 'years — from original start date')}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{t('يُحتسب تلقائياً من حقل "تاريخ المباشرة الأولى" أعلاه', 'Automatically calculated from the "Original Start Date" field above')}</p>
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('نوع مدة العقد', 'Term of Contract')}</label>
                    <SearchableComboBox
                      options={contractTypes}
                      value={termOfContract}
                      onChange={(value) => setTermOfContract(value)}
                      placeholder="اختر نوع العقد"
                      language={language}
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('الدرجة السلمية', 'Grade Level')}</label>
                    <input
                      type="text"
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      placeholder={t('مثال: G-4 الدرجة الرابعة', 'Example: G-4 Fourth Grade')}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Position, Department & Branch */}
            {activeTab === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400">corporate_fare</span>
                  <h3 className="text-sm font-bold text-white">{t('التبويب 3: التعيين الوظيفي والقسم والفرع', 'Tab 3: Position, Department & Branch')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-black font-medium mb-1">{t('المسمى الوظيفي (بالعربية)', 'Job Title (Arabic)')}</label>
                    <SearchableComboBox
                      options={positions}
                      value={jobTitle}
                      onChange={(value, option) => {
                        setJobTitle(value);
                        if (option) {
                          setJobTitleEn(option.name_en || '');
                        }
                      }}
                      placeholder={t('اختر المسمى الوظيفي (بالعربية)', 'Select job title (Arabic)')}
                      language="ar"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('المسمى الوظيفي (بالإنجليزية)', 'Job Title (English)')}</label>
                    <SearchableComboBox
                      options={positions}
                      value={jobTitleEn}
                      onChange={(value, option) => {
                        setJobTitleEn(value);
                        if (option) {
                          setJobTitle(option.name_ar || option.name || '');
                        }
                      }}
                      placeholder={t('اختر المسمى الوظيفي (بالإنجليزية)', 'Select job title (English)')}
                      language="en"
                    />
                  </div>

                  {/* positionStartDate + computed yearsInPosition */}
                  <div>
                    <label className="block text-black font-medium mb-1">
                      {t('تاريخ آخر تغيير وظيفي / منصب', 'Last Position Change Date')}
                      {statusChanges.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-900/40 text-teal-400 border border-teal-700/30 mr-2">{t('تلقائي من التغييرات', 'Auto from changes')}</span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={positionStartDate}
                      onChange={e => setPositionStartDate(e.target.value)}
                      readOnly={statusChanges.length > 0}
                      className={`w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500/60 ${statusChanges.length > 0 ? 'opacity-75 cursor-not-allowed' : ''}`}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {statusChanges.length > 0 
                        ? t('يُحدد تلقائياً من تاريخ بدء آخر تغيير وظيفي في التبويب 7', 'Auto selected from start date of last position change in Tab 7') 
                        : t('تاريخ آخر تغيير للوظيفة أو المسمى أو القسم — يبدأ منه احتساب Years in Position', 'Date of last change of job, title or department')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      {t('سنوات في الوظيفة الحالية', 'Years in Current Position')}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-700/30">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <div className="w-full bg-[#0a0c10] border border-blue-500/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-blue-400 font-mono font-bold text-lg">{yearsInPosition}</span>
                      <span className="text-slate-500 text-[11px]">{t('سنة — من تاريخ آخر تغيير وظيفي', 'Years — from last position change date')}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1">{t('يُحتسب تلقائياً من حقل "تاريخ آخر تغيير وظيفي" أعلاه', 'Calculated automatically from last position change date above')}</p>
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('القسم / الإدارة التابعة (بالعربية)', 'Department (Arabic)')}</label>
                    <SearchableComboBox
                      options={departments}
                      value={department}
                      onChange={(value, option) => {
                        setDepartment(value);
                        if (option) {
                          setDepartmentEn(option.name_en);
                        }
                      }}
                      placeholder={t('اختر القسم', 'Select department')}
                      language={language}
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('القسم / الإدارة التابعة (بالإنجليزية)', 'Department (English)')}</label>
                    <SearchableComboBox
                      options={departments}
                      value={departmentEn}
                      onChange={(value, option) => {
                        setDepartmentEn(value);
                        if (option) {
                          setDepartment(option.name_ar);
                        }
                      }}
                      placeholder={t('Select department', 'اختر القسم')}
                      language={language}
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('فرع العمل الرئيسي في العراق (بالعربية)', 'Branch Name (Arabic)')}</label>
                    <SearchableComboBox
                      options={locations}
                      value={branch}
                      onChange={(value, option) => {
                        setBranch(value);
                        if (option) {
                          setBranchEn(option.name_en);
                        }
                      }}
                      placeholder={t('اختر الفرع', 'Select branch')}
                      language={language}
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('فرع العمل الرئيسي في العراق (بالإنجليزية)', 'Branch Name (English)')}</label>
                    <SearchableComboBox
                      options={locations}
                      value={branchEn}
                      onChange={(value, option) => {
                        setBranchEn(value);
                        if (option) {
                          setBranch(option.name_ar);
                        }
                      }}
                      placeholder={t('Select branch', 'اختر الفرع')}
                      language={language}
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('اسم المشرف المباشر', 'Direct Supervisor Name')}</label>
                    <input
                      type="text"
                      placeholder={t('اسم المدير المباشر', 'Direct Manager Name')}
                      value={supervisorName}
                      onChange={e => setSupervisorName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('نطاق وطبيعة العمل', 'Work Scope')}</label>
                    <select
                      value={workScope}
                      onChange={e => setWorkScope(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    >
                      <option value="Field">{t('Field – ميداني بالكامل', 'Field – Full Fieldwork')}</option>
                      <option value="Admin">{t('Admin – مكتبي / إداري', 'Admin – Office / Desk')}</option>
                      <option value="Field & Admin">{t('Field & Admin – ميداني وإداري مختلط', 'Field & Admin – Hybrid')}</option>
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {t('Field = ميداني | Admin = مكتبي | Field & Admin = مختلط', 'Field = Fieldwork | Admin = Office | Field & Admin = Hybrid')}
                    </p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-black font-medium mb-1">{t('الراتب الاسمي الشهري', 'Monthly Basic Salary')}</label>
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
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('الراتب الاسمي كتابة (بالعربية) — يُولَّد تلقائياً', 'Basic Salary in Writing (Arabic) — Auto-generated')}</label>
                    <input
                      type="text"
                      value={writtenBasicSalaryAr}
                      onChange={e => setWrittenBasicSalaryAr(e.target.value)}
                      placeholder={t('يُملأ تلقائياً عند إدخال الراتب...', 'Auto-filled when entering salary...')}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-amber-300 focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      {t('بدل النقل الثابت', 'Fixed Transportation Allowance')}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-700/30">{t('من الإعدادات', 'From Settings')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={transportationFixed > 0 ? formatWithCommas(transportationFixed) : ''}
                      onChange={e => setTransportationFixed(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      {t('المكافأة الثابتة', 'Fixed Bonus')}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-700/30">{t('من الإعدادات', 'From Settings')}</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={fixedBonus > 0 ? formatWithCommas(fixedBonus) : ''}
                      onChange={e => setFixedBonus(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      مخصصات الهاتف (Phone Allowance)
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-400 border border-blue-700/30">من الإعدادات</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={phoneAllowance > 0 ? formatWithCommas(phoneAllowance) : ''}
                      onChange={e => setPhoneAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">مخصصات الشهادة (Certificate Allowance)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={certificateAllowance > 0 ? formatWithCommas(certificateAllowance) : ''}
                      onChange={e => setCertificateAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      بدل الزوج/ة (Spouse Allowance)
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-900/40 text-teal-400 border border-teal-700/30">تلقائي من السياسات</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={spouseAllowance > 0 ? formatWithCommas(spouseAllowance) : ''}
                      onChange={e => setSpouseAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      بدل الطفل الواحد (Child Allowance)
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-900/40 text-teal-400 border border-teal-700/30">تلقائي من السياسات</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={childAllowance > 0 ? formatWithCommas(childAllowance) : ''}
                      onChange={e => setChildAllowance(parseFormatted(e.target.value))}
                      placeholder="0"
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1 flex items-center gap-1.5">
                      {t('إجمالي المخصصات العائلية', 'Total Family Allowance')}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-900/40 text-teal-400 border border-teal-700/30">{t('تلقائي', 'Auto')}</span>
                    </label>
                    <div className="w-full bg-[#0a0c10] border border-teal-500/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <span className="text-teal-400 font-mono font-bold text-lg">{familyAllowance > 0 ? formatWithCommas(familyAllowance) : '0'}</span>
                      <span className="text-slate-500 text-[11px]">د.ع — زوجة + (أطفال دون 18 سنة × بدل الطفل)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('اسم البنك المحول إليه الراتب', 'Bank Name for Salary Transfer')}</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-black font-medium mb-1">رقم الحساب المصرفي الدولي (IBAN)</label>
                    <input
                      type="text"
                      value={iban}
                      onChange={e => setIban(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-blue-400 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-rose-400 text-sm">shield_person</span>
                    {t('تقدير الاستقطاعات القانونية والصافي (الضمان الاجتماعي + الضريبة + التأمين)', 'Statutory Deductions & Net Estimation')}
                  </h4>
                  {/* SS/Tax Exemption Checkbox */}
                  <div className={`flex flex-col gap-2 rounded-xl border p-3 ${
                    isSsTaxExempt
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-emerald-500/10 border-emerald-500/20'
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
                      <div>
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-slate-400 block text-[10px]">{t('الضمان الاجتماعي (5%)', 'Social Security (5%)')}</span>
                      <span className={`font-bold ${isSsTaxExempt ? 'text-slate-500 line-through' : 'text-rose-400'}`}>
                        {isSsTaxExempt ? '0' : '-' + Math.round((basicSalary || 0) * 0.05).toLocaleString()} د.ع
                        {isSsTaxExempt && <span className="mr-1 text-amber-400 no-underline" style={{textDecoration:'none'}}> (معفى)</span>}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-slate-400 block text-[10px]">{t('ضريبة الدخل (الشرائح)', 'Income Tax (Brackets)')}</span>
                      {isSsTaxExempt ? (
                        <span className="font-bold text-slate-500">0 د.ع <span className="text-amber-400">(معفى)</span></span>
                      ) : (
                        <span className="text-rose-400 font-bold">
                          -{(() => {
                            const ss = Math.round((basicSalary || 0) * 0.05);
                            const ex = maritalStatus === 'أعزب' ? 208333 : (375000 + (childrenList.length * 16667));
                            const tb = Math.max(0, totalCalculatedSalary - ss - ex);
                            if (tb <= 0) return 0;
                            let b1 = Math.min(tb, 250000) * 0.03;
                            let b2 = tb > 250000 ? Math.min(tb - 250000, 250000) * 0.05 : 0;
                            let b3 = tb > 500000 ? Math.min(tb - 500000, 500000) * 0.10 : 0;
                            let b4 = tb > 1000000 ? (tb - 1000000) * 0.15 : 0;
                            return Math.round(b1 + b2 + b3 + b4);
                          })().toLocaleString()} د.ع
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-slate-400 block text-[10px]">{t('التأمين الصحي والحياة', 'Health Insurance')}</span>
                      <span className="text-rose-400 font-bold">-25,000 د.ع</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                      <span className="text-emerald-400 block text-[10px] font-bold">{t('صافي الراتب المتوقع', 'Estimated Net Salary')}</span>
                      <span className="text-emerald-400 font-black">
                        {(() => {
                          if (isSsTaxExempt) return totalCalculatedSalary.toLocaleString();
                          const ss = Math.round((basicSalary || 0) * 0.05);
                          const ins = 25000;
                          const ex = maritalStatus === 'أعزب' ? 208333 : (375000 + (childrenList.length * 16667));
                          const tb = Math.max(0, totalCalculatedSalary - ss - ex);
                          let tax = 0;
                          if (tb > 0) {
                            let b1 = Math.min(tb, 250000) * 0.03;
                            let b2 = tb > 250000 ? Math.min(tb - 250000, 250000) * 0.05 : 0;
                            let b3 = tb > 500000 ? Math.min(tb - 500000, 500000) * 0.10 : 0;
                            let b4 = tb > 1000000 ? (tb - 1000000) * 0.15 : 0;
                            tax = Math.round(b1 + b2 + b3 + b4);
                          }
                          const net = Math.max(0, totalCalculatedSalary - (ss + tax + ins));
                          return net.toLocaleString();
                        })()} د.ع
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-teal-600/10 border border-blue-500/20 flex items-center justify-between font-mono">
                  <span className="text-slate-300 font-sans">{t('إجمالي الراتب الاستحقاقي الشهري (قبل الاستقطاعات):', 'Total Gross Monthly Salary:')}</span>
                  <span className="text-lg font-black text-emerald-400">{totalCalculatedSalary.toLocaleString()} د.ع</span>
                </div>
              </div>
            )}

            {/* TAB 5: Documents & Identity */}
            {activeTab === 5 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400">id_card</span>
                  <h3 className="text-sm font-bold text-white">{t('التبويب 5: الوثائق الثبوتية ورقم الهوية', 'Tab 5: Identity Documents & ID Number')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-black font-medium mb-1">{t('رقم البطاقة الوطنية الموحدة / الهوية', 'National ID / Identity Card Number')}</label>
                    <input
                      type="text"
                      placeholder={t('199012345678', '199012345678')}
                      value={nationalId}
                      onChange={e => setNationalId(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('رقم جواز السفر', 'Passport Number')}</label>
                    <input
                      type="text"
                      placeholder={t('A12345678', 'A12345678')}
                      value={passportNo}
                      onChange={e => setPassportNo(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('تاريخ انتهاء / نفاذ الجواز', 'Passport Expiry Date')}</label>
                    <input
                      type="date"
                      value={passportExpiry}
                      onChange={e => setPassportExpiry(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-black font-medium mb-1">{t('رابط الصورة الشخصية', 'Profile Photo URL')}</label>
                    <input
                      type="text"
                      placeholder={t('https://...', 'https://...')}
                      value={photoUrl}
                      onChange={e => setPhotoUrl(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: Family & Dependents */}
            {activeTab === 6 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <span className="material-symbols-outlined text-blue-400">family_restroom</span>
                  <h3 className="text-sm font-bold text-white">{t('التبويب 6: البيانات العائلية والأبناء', 'Tab 6: Family Data & Children')}</h3>
                  <span className="mr-auto px-2.5 py-0.5 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-400 text-[10px] font-bold">{t('جميع الحقول اختيارية', 'All fields optional')}</span>
                </div>

                {/* Spouse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium mb-1 flex items-center gap-1.5">
                      <span className="text-slate-400">{t('اسم الزوج / الزوجة', 'Spouse Name')}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500 border border-slate-600/30">{t('اختياري', 'Optional')}</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t('اتركه فارغاً إن لم ينطبق / Optional', 'Leave blank if not applicable')}
                      value={spouseName}
                      onChange={e => setSpouseName(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="spouseEmp"
                      checked={spouseEmployedHere}
                      onChange={e => setSpouseEmployedHere(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[#0a0c10] border-white/20"
                    />
                    <label htmlFor="spouseEmp" className="text-slate-300 font-medium cursor-pointer">
                      {t('هل الزوج/الزوجة يعمل في مؤسسة فيتاس العراق؟', 'Does spouse work at VITAS Iraq?')}
                    </label>
                  </div>
                </div>

                {/* Children dynamic list */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <span className="material-symbols-outlined text-teal-400 text-sm">child_care</span>
                    <label className="text-teal-400 font-bold text-xs">{t('الأبناء وبيانات الميلاد والأعمار', 'Children & Birth Data')}</label>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500 border border-slate-600/30">{t('اختياري', 'Optional')}</span>
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
                          <option value="ولد">{t('ولد (Son)', 'Son')}</option>
                          <option value="بنت">{t('بنت (Daughter)', 'Daughter')}</option>
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
                                  }`}>{child.relation}</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-black font-medium mb-1">{t('حالة الموظف عند الإدخال', 'Employee Status at Entry')}</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                    >
                      <option value="Active">نشط ومباشر (Active)</option>
                      <option value="Onboarding">قيد التهيئة والتعيين (Onboarding)</option>
                      <option value="On Leave">في إجازة رسمية (On Leave)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-black font-medium mb-1">{t('ملاحظات HR والإنذارات السابقة (إن وجدت)', 'HR Notes & Previous Warnings (if any)')}</label>
                    <textarea
                      rows={3}
                      placeholder={t('اكتب أية ملاحظات إدارية أو تنبيهات سابقة...', 'Write any administrative notes or previous warnings...')}
                      value={warningsRecord}
                      onChange={e => setWarningsRecord(e.target.value)}
                      className="w-full bg-[#0a0c10] border border-white/10 rounded-xl p-3 text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status Changes Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-400">published_with_changes</span>
                      تغييرات الحالة الوظيفية
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
                      className="px-3 py-1.5 bg-teal-600/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-teal-600/30 flex items-center gap-1"
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
                              <span className="text-xs text-slate-400">البدء:</span>
                              <p className="text-sm text-white">{training.start_date}</p>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400">الانتهاء:</span>
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

            {/* Footer Form Controls (Previous, Next, Submit) */}
            <div className="pt-4 flex items-center justify-between border-t border-white/10">
              <div className="flex items-center gap-2">
                {activeTab > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab - 1)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 border border-white/10 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    {t('التبويب السابق', 'Previous Tab')}
                  </button>
                )}

                {activeTab < 7 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab + 1)}
                    className="px-5 py-2.5 rounded-xl bg-teal-600/20 text-blue-400 border border-blue-500/30 font-bold hover:bg-teal-600/30 flex items-center gap-1"
                  >
                    {t('التبويب التالي', 'Next Tab')}
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModuleId('emp-directory')}
                  className="px-4 py-2.5 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 border border-white/10"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {t('حفظ وتخزين الموظف (التبويبات الـ 7)', 'Save & Store Employee (All 7 Tabs)')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Employee Full 7-Tabs Profile View (HR Employees Profiles) */}
      {activeModuleId === 'emp-profile' && (
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Dynamic Search & Selector Bar (Replaces static name buttons) */}
          <div className={`${profileColors.background} p-4 rounded-2xl border ${profileColors.border} ${profileColors.shadow} space-y-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`text-xs font-bold ${profileColors.text} flex items-center gap-1.5`}>
                <span className={`material-symbols-outlined ${isDark ? 'text-blue-400' : 'text-blue-600'} text-base`}>search</span>
                البحث والتنقل الديناميكي بين الموظفين (HR Employees Profiles)
              </span>
              <span className={`text-[11px] font-mono ${profileColors.textSecondary} font-bold ${isDark ? 'bg-white/5' : 'bg-slate-100'} px-2 py-0.5 rounded-full border ${profileColors.border}`}>
                {t('إجمالي الموظفين:', 'Total Employees:')} {employees.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Dynamic Auto-complete Search Box */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('ابحث باسم الموظف، الرقم الوظيفي، أو الفرع للتنقل...', 'Search by employee name, ID, or branch to navigate...')}
                  value={profileSearchQuery}
                  onChange={(e) => {
                    setProfileSearchQuery(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  className={`w-full ${profileColors.inputBg} border ${profileColors.inputBorder} rounded-xl px-3.5 py-2.5 pr-10 text-xs ${profileColors.inputText} focus:outline-none focus:border-blue-500 ${isDark ? 'focus:bg-[#111827]' : 'focus:bg-white'} transition-all shadow-sm font-bold ${profileColors.inputPlaceholder}`}
                />
                <span className={`material-symbols-outlined absolute right-3 top-2.5 ${profileColors.textSecondary} text-sm`}>
                  search
                </span>

                {/* Instant Results Dropdown */}
                {isSearchDropdownOpen && profileSearchQuery.trim() !== '' && (
                  <div className={`absolute right-0 left-0 top-full mt-1.5 ${profileColors.dropdownBg} border ${profileColors.dropdownBorder} rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto ${profileColors.divider}`}>
                    {matchingProfileEmployees.length > 0 ? (
                      matchingProfileEmployees.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setSelectedEmpId(emp.id);
                            setProfileSearchQuery(getEmpFullName(emp));
                            setIsSearchDropdownOpen(false);
                          }}
                          className={`w-full text-right p-2.5 ${profileColors.dropdownHover} flex items-center justify-between transition-colors group`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${profileColors.badgeBg} ${profileColors.badgeText} font-black text-xs flex items-center justify-center overflow-hidden shrink-0`}>
                              {emp.photoUrl ? (
                                <img src={emp.photoUrl} alt={getEmpFullName(emp)} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
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
              <div>
                <select
                  value={selectedEmployee?.id || ''}
                  onChange={(e) => {
                    const found = employees.find(emp => emp.id === e.target.value);
                    if (found) {
                      setSelectedEmpId(found.id);
                      setProfileSearchQuery(getEmpFullName(found));
                    }
                  }}
                  className={`w-full ${profileColors.inputBg} border ${profileColors.inputBorder} rounded-xl px-3.5 py-2.5 text-xs ${profileColors.inputText} focus:outline-none focus:border-blue-500 ${isDark ? 'focus:bg-[#111827]' : 'focus:bg-white'} transition-all shadow-sm font-bold`}
                >
                  <option value="" disabled>-- {t('اختر موظفاً مباشرة للتنقل السريع', 'Select an employee directly for fast navigation')} --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {getEmpFullName(emp)} ({emp.employeeId || 'EMP'}) - {getEmpBranch(emp)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedEmployee ? (
            <EmptyState
              icon="account_box"
              title="لم يتم تحديد أي موظف"
              description="استخدم حقل البحث أو القائمة المنسدلة أعلاه لاختيار موظف واستعراض ملفه."
            />
          ) : (
            <div className="space-y-6">
              {/* CENTERED HERO CARD */}
              <section className={`flex flex-col items-center justify-center text-center p-8 rounded-3xl ${profileColors.cardBg} border ${profileColors.cardBorder} ${profileColors.shadow} relative overflow-hidden ${profileColors.text}`}>
                {/* Background decorative soft ambient light */}
                <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 ${isDark ? 'bg-blue-500/5' : 'bg-blue-500/10'} blur-3xl rounded-full pointer-events-none`} />

                {/* Avatar with Ring & Status Badge & Edit Photo Overlay Icon */}
                <div className="relative group mb-5">
                  <div className="absolute -inset-2 bg-gradient-to-r from-teal-400 via-teal-300 to-teal-500 rounded-full blur-md opacity-50 group-hover:opacity-80 transition-all duration-500" />

                  {/* Photo Avatar */}
                  <div className={`relative w-36 h-36 rounded-full border-4 ${isDark ? 'border-[#1a1f2e]' : 'border-white'} ${isDark ? 'bg-[#1a1f2e]' : 'bg-slate-100'} shadow-2xl overflow-hidden flex items-center justify-center ${isDark ? 'text-blue-400' : 'text-blue-600'} text-4xl font-black shrink-0`}>
                    {selectedEmployee.photoUrl && !avatarImgError ? (
                      <img
                        src={selectedEmployee.photoUrl}
                        alt={selectedEmployee.fullName}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarImgError(true)}
                      />
                    ) : (
                      <div className={`w-full h-full ${isDark ? 'bg-gradient-to-br from-teal-900/30 via-teal-800/30 to-teal-900/30' : 'bg-gradient-to-br from-teal-50 via-teal-100 to-teal-50'} flex flex-col items-center justify-center ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                        <span className="material-symbols-outlined text-6xl">person</span>
                      </div>
                    )}
                  </div>

                  {/* Status Indicator Badge (Bottom Right) */}
                  <span className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 ${isDark ? 'border-[#1a1f2e]' : 'border-white'} z-10 ${
                    selectedEmployee.status === 'Active' ? 'bg-emerald-500 shadow-md shadow-emerald-500/40' : 'bg-amber-500'
                  }`} title={selectedEmployee.status} />

                  {/* EDIT PHOTO / PROFILE OVERLAY ICON BUTTON (Only for HR / Admin) */}
                  {currentUserRole !== 'Employee' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleLoadEmployeeData(selectedEmployee.id);
                        setActiveModuleId('emp-add');
                      }}
                      className="absolute bottom-1 left-1 w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white border-2 border-white shadow-xl flex items-center justify-center z-20 transition-all hover:scale-110 active:scale-95 group/edit"
                      title="تعديل بيانات وصورة الموظف / Edit Employee Profile"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                  )}
                </div>

                {/* Employee Title & Badges Row */}
                <div className="space-y-3 max-w-xl">
                  <h1 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-wide font-cairo`}>
                    {getEmpFullName(selectedEmployee)}
                  </h1>
                  {(language === 'en' ? selectedEmployee.fullName : selectedEmployee.fullNameEn) && (
                    <p className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'} font-mono`}>
                      {language === 'en' ? selectedEmployee.fullName : selectedEmployee.fullNameEn}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
                    <span className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-teal-600/20 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200/80 text-blue-700'} font-bold shadow-sm`}>
                      {getEmpJobTitle(selectedEmployee)}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200/80 text-emerald-700'} font-mono font-bold shadow-sm flex items-center gap-1.5`}>
                      <span className={`text-[10px] ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'} font-sans font-semibold`}>{t('الرقم الوظيفي:', 'Emp ID:')}</span>
                      {selectedEmployee.employeeId || selectedEmployee.employee_id || '-'}
                    </span>
                    {(selectedEmployee.badgeNo || selectedEmployee.badge_no) && (
                      <span className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200/80 text-indigo-700'} font-mono font-bold shadow-sm flex items-center gap-1.5`}>
                        <span className={`text-[10px] ${isDark ? 'text-indigo-400/80' : 'text-indigo-600/80'} font-sans font-semibold`}>{t('الباج:', 'Badge:')}</span>
                        {selectedEmployee.badgeNo || selectedEmployee.badge_no}
                      </span>
                    )}
                    <span className={`px-4 py-1.5 rounded-full ${isDark ? 'bg-purple-600/20 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200/80 text-purple-700'} font-bold shadow-sm`}>
                      {getEmpBranch(selectedEmployee)}
                    </span>
                  </div>
                </div>
              </section>

              {/* TABBED NAVIGATION BAR */}
              <nav className="flex justify-center sticky top-20 z-30">
                <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl ${isDark ? 'bg-[#1a1f2e]/95 backdrop-blur-xl border-white/10' : 'bg-white/95 backdrop-blur-xl border-slate-200'} shadow-xl overflow-x-auto no-scrollbar max-w-full`}>
                  {[
                    { id: 'overview', label: t('نظرة عامة', 'Overview'), icon: 'grid_view' },
                    { id: 'personal', label: t('المعلومات الشخصية', 'Personal'), icon: 'person' },
                    { id: 'job', label: t('الوظيفة والخدمة', 'Job & Service'), icon: 'badge' },
                    { id: 'contracts', label: t('تفاصيل العقود', 'Contracts'), icon: 'description' },
                    { id: 'financial', label: t('البيانات المالية', 'Financial'), icon: 'payments' },
                    { id: 'identity', label: t('الوثائق والهوية', 'Identity'), icon: 'id_card' },
                    { id: 'family', label: t('الأسرة والسجلات', 'Family & Records'), icon: 'family_restroom' }
                  ].map(tab => {
                    const isActive = profileViewTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setProfileViewTab(tab.id as any)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                          isActive
                            ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 scale-[1.02]'
                            : isDark
                            ? 'text-slate-400 hover:text-white hover:bg-white/10'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* TAB CONTENT PANELS */}
              <div className={`p-6 rounded-3xl ${profileColors.cardBg} border ${profileColors.cardBorder} ${profileColors.shadow} space-y-6 text-xs ${profileColors.text}`}>
                {/* 1. OVERVIEW TAB */}
                {profileViewTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-sm`}>
                        <span className={`${profileColors.textSecondary} text-[11px] block`}>{t('صافي الراتب الإجمالي', 'Total Net Salary')}</span>
                        <span className={`text-lg font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-mono`}>
                          {selectedEmployee.salary ? selectedEmployee.salary.toLocaleString() + ' د.ع' : '-'}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-sm`}>
                        <span className={`${profileColors.textSecondary} text-[11px] block`}>{t('تاريخ المباشرة ورقم الباج', 'Start Date and Badge Number')}</span>
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>
                          {selectedEmployee.joinDate && selectedEmployee.joinDate !== 'N/A' ? selectedEmployee.joinDate : '-'} ({(selectedEmployee.employeeId || selectedEmployee.badgeNo || selectedEmployee.badge_no || (selectedEmployee.id ? `VTS-${selectedEmployee.id}` : '-'))})
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-sm`}>
                        <span className={`${profileColors.textSecondary} text-[11px] block`}>{t('القسم والفرع', 'Department and Branch')}</span>
                        <span className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'} truncate block`}>
                          {getEmpDepartment(selectedEmployee)} • {getEmpBranch(selectedEmployee)}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-1 shadow-sm`}>
                        <span className={`${profileColors.textSecondary} text-[11px] block`}>{t('نوع العقد والدرجة', 'Contract Type and Grade')}</span>
                        <span className={`text-sm font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'} truncate block`}>
                          {selectedEmployee.termOfContract || t('عقد محدد', 'Fixed Contract')} ({selectedEmployee.grade || 'G-4'})
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-3 shadow-sm`}>
                        <h3 className={`font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                          <span className="material-symbols-outlined text-sm">contact_mail</span>
                          {t('معلومات التواصل والبريد', 'Contact & Email Info')}
                        </h3>
                        <p className={`${profileColors.textSecondary} flex justify-between`}>
                          <span>{t('البريد الإلكتروني المؤسسي:', 'Corporate Email:')}</span>
                          <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.email && selectedEmployee.email !== 'N/A' ? selectedEmployee.email : '-'}</span>
                        </p>
                        <p className={`${profileColors.textSecondary} flex justify-between`}>
                          <span>{t('هاتف التواصل:', 'Contact Phone:')}</span>
                          <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.phone && selectedEmployee.phone !== 'N/A' ? selectedEmployee.phone : '-'}</span>
                        </p>
                        <p className={`${profileColors.textSecondary} flex justify-between`}>
                          <span>{t('المشرف المباشر:', 'Direct Supervisor:')}</span>
                          <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.supervisorName || t('غير محدد', 'Not specified')}</span>
                        </p>
                      </div>

                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-3 shadow-sm`}>
                        <h3 className={`font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'} flex items-center gap-1.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                          <span className="material-symbols-outlined text-sm">account_balance</span>
                          {t('البيانات المصرفية والهوية', 'Banking & Identity Data')}
                        </h3>
                        <p className={`${profileColors.textSecondary} flex justify-between`}>
                          <span>{t('المصرف المعتمد:', 'Approved Bank:')}</span>
                          <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.bankName && selectedEmployee.bankName !== 'N/A' ? selectedEmployee.bankName : '-'}</span>
                        </p>
                        <p className={`${profileColors.textSecondary} flex justify-between`}>
                          <span>{t('رقم الـ IBAN:', 'IBAN Number:')}</span>
                          <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.iban && selectedEmployee.iban !== 'N/A' ? selectedEmployee.iban : '-'}</span>
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
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                      <span className="material-symbols-outlined text-base">person</span>
                      {t('بيانات الهوية الشخصية والتواصل', 'Personal Identity & Contact Data')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('الاسم الكامل بالعربية:', 'Full Name (Arabic):')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.fullName}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('الاسم الكامل بالإنجليزية:', 'Full Name (English):')} <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-mono font-bold`}>{selectedEmployee.fullNameEn && selectedEmployee.fullNameEn !== 'N/A' ? selectedEmployee.fullNameEn : (dictEn[selectedEmployee.fullName] || '-')}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('الجنسية:', 'Nationality:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee.nationality || t('عراقي', 'Iraqi')}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('تاريخ الميلاد:', 'Date of Birth:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.dob && selectedEmployee.dob !== 'N/A' ? selectedEmployee.dob : '-'}</span></p>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('الجنس:', 'Gender:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee.gender || t('غير محدد', 'Not specified')}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('الحالة الاجتماعية:', 'Marital Status:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee.maritalStatus || t('غير محدد', 'Not specified')}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('البريد الشخصي:', 'Personal Email:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.personalEmail && selectedEmployee.personalEmail !== 'N/A' ? selectedEmployee.personalEmail : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('هاتف الطوارئ:', 'Emergency Phone:')} <span className={`${isDark ? 'text-rose-400' : 'text-rose-600'} font-mono font-bold`}>{selectedEmployee.emergencyPhone && selectedEmployee.emergencyPhone !== 'N/A' ? selectedEmployee.emergencyPhone : '-'}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. JOB TAB */}
                {profileViewTab === 'job' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                      <span className="material-symbols-outlined text-base">badge</span>
                      {t('بيانات الوظيفة والهيكل الإداري', 'Job & Administrative Structure Data')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('المسمى الوظيفي بالعربية:', 'Job Title (Arabic):')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.jobTitle}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('المسمى الوظيفي بالإنجليزية:', 'Job Title (English):')} <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-mono font-bold`}>{selectedEmployee.jobTitleEn && selectedEmployee.jobTitleEn !== 'N/A' ? selectedEmployee.jobTitleEn : (dictEn[selectedEmployee.jobTitle] || '-')}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('القسم / الإدارة:', 'Department / Admin:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{getEmpDepartment(selectedEmployee)}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('الفرع أو موقع العمل:', 'Branch / Location:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'}`}>{getEmpBranch(selectedEmployee)}</span></p>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
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
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                      <span className="material-symbols-outlined text-base">description</span>
                      {t('تفاصيل العقد والدرجة الوظيفية', 'Contract & Job Grade Details')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('نوع وشروط العقد:', 'Contract Type & Terms:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.termOfContract || t('عقد محدد المدة', 'Fixed-term contract')}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('الدرجة الوظيفية:', 'Job Grade:')} <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.grade || 'G-4'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('تاريخ التعيين الأصلي:', 'Original Hire Date:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.originalStartDate || selectedEmployee.joinDate || '-'}</span></p>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('تاريخ بداية العقد الحالي:', 'Current Contract Start Date:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.contractStartDate && selectedEmployee.contractStartDate !== 'N/A' ? selectedEmployee.contractStartDate : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('تاريخ انتهاء العقد:', 'Contract End Date:')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-mono font-bold`}>{selectedEmployee.contractEndDate && selectedEmployee.contractEndDate !== 'N/A' ? selectedEmployee.contractEndDate : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('انتهاء فترة التجربة:', 'Probation End Date:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.probationEndDate && selectedEmployee.probationEndDate !== 'N/A' ? selectedEmployee.probationEndDate : '-'}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. FINANCIAL TAB */}
                {profileViewTab === 'financial' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                      <span className="material-symbols-outlined text-base">payments</span>
                      {t('تفاصيل الراتب والبدلات والمصرف', 'Salary, Allowances & Bank Details')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('الراتب الأساسي:', 'Basic Salary:')} <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-mono font-bold`}>{selectedEmployee.basicSalary ? selectedEmployee.basicSalary.toLocaleString() + ' د.ع' : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('الراتب كتابة باللغة العربية:', 'Salary in Arabic Writing:')} <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.writtenBasicSalaryAr && selectedEmployee.writtenBasicSalaryAr !== 'N/A' ? selectedEmployee.writtenBasicSalaryAr : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('بدل النقل الثابت:', 'Fixed Transportation Allowance:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.transportationFixed ? selectedEmployee.transportationFixed.toLocaleString() + ' د.ع' : '0'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('المكافأة الثابتة:', 'Fixed Bonus:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{selectedEmployee.fixedBonus ? selectedEmployee.fixedBonus.toLocaleString() + ' د.ع' : '0'}</span></p>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
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
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                      <span className="material-symbols-outlined text-base">id_card</span>
                      {t('الوثائق الثبوتية ورقم الباج', 'Identity Documents and Badge Number')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('رقم البطاقة الوطنية:', 'National ID Number:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.nationalId && selectedEmployee.nationalId !== 'N/A' ? selectedEmployee.nationalId : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('رقم جواز السفر:', 'Passport Number:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono font-bold`}>{selectedEmployee.passportNo && selectedEmployee.passportNo !== 'N/A' ? selectedEmployee.passportNo : '-'}</span></p>
                      </div>
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('تاريخ نفاد الجواز:', 'Passport Expiry Date:')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-700'} font-mono`}>{selectedEmployee.passportExpiry && selectedEmployee.passportExpiry !== 'N/A' ? selectedEmployee.passportExpiry : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('رقم الباج الوظيفي:', 'Employee Badge Number:')} <span className={`${isDark ? 'text-blue-400' : 'text-blue-700'} font-mono font-bold`}>{selectedEmployee.employeeId || selectedEmployee.badgeNo || selectedEmployee.badge_no || (selectedEmployee.id ? `VTS-${selectedEmployee.id}` : '-')}</span></p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. FAMILY TAB */}
                {profileViewTab === 'family' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className={`font-bold text-sm ${isDark ? 'text-blue-400' : 'text-blue-700'} flex items-center gap-2 border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-2`}>
                      <span className="material-symbols-outlined text-base">family_restroom</span>
                      {t('سجل عائلة الموظف، التدريب والإنذارات', 'Employee Family Record, Training & Warnings')}
                    </h3>
                    <div className="space-y-4">
                      <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-2 shadow-sm`}>
                        <p className={`${profileColors.textSecondary}`}>{t('اسم الزوج / الزوجة:', 'Spouse Name:')} <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-bold`}>{selectedEmployee.spouseName && selectedEmployee.spouseName !== 'N/A' ? selectedEmployee.spouseName : '-'}</span></p>
                        <p className={`${profileColors.textSecondary}`}>{t('هل الزوج يعمل بالمؤسسة؟', 'Does spouse work at the institution?')} <span className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold`}>{selectedEmployee.spouseEmployedHere ? t('نعم', 'Yes') : t('لا', 'No')}</span></p>
                        {selectedEmployee.spouseEmployedHere && (
                          <p className={`${profileColors.textSecondary}`}>{t('ملاحظة: تم تغيير الحالة الاجتماعية إلى أعزب للغرض من البدلات', 'Note: Marital status changed to Single for allowance purposes')} <span className={`${isDark ? 'text-amber-400' : 'text-amber-600'} font-bold`}>{t('أعزب', 'Single')}</span></p>
                        )}
                      </div>

                      {/* Children table */}
                      {selectedEmployee.childrenList && selectedEmployee.childrenList.length > 0 ? (
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} space-y-3 shadow-sm`}>
                          <h4 className={`${isDark ? 'text-teal-400' : 'text-teal-700'} font-bold text-xs flex items-center gap-1.5`}>
                            <span className="material-symbols-outlined text-sm">child_care</span>
                            {t('قائمة الأبناء', 'Children List')} ({selectedEmployee.childrenList.length})
                          </h4>
                          <div className={`rounded-xl border ${isDark ? 'border-white/10' : 'border-slate-200'} overflow-hidden ${isDark ? 'bg-[#1a1f2e]' : 'bg-white'}`}>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className={`${isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-700'} font-bold`}>
                                  <th className="px-3 py-2 text-right">{t('الاسم', 'Name')}</th>
                                  <th className="px-3 py-2 text-right">{t('الصلة', 'Relation')}</th>
                                  <th className="px-3 py-2 text-right">{t('تاريخ الميلاد', 'Date of Birth')}</th>
                                  <th className="px-3 py-2 text-right">{t('العمر الحسباني', 'Calculated Age')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedEmployee.childrenList.map((child, idx) => {
                                  const age = child.dob ? Math.floor((Date.now() - new Date(child.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : (child.age || 0);
                                  return (
                                    <tr key={idx} className={`border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                      <td className={`px-3 py-2 ${isDark ? 'text-white' : 'text-slate-900'} font-medium`}>{child.name && child.name !== 'N/A' ? child.name : '-'}</td>
                                      <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                                          child.relation === 'ولد' || child.relation === 'Son'
                                            ? isDark ? 'bg-teal-600/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                                            : isDark ? 'bg-pink-600/20 text-pink-400' : 'bg-pink-100 text-pink-700'
                                        }`}>{child.relation && child.relation !== 'N/A' ? child.relation : '-'}</span>
                                      </td>
                                      <td className={`px-3 py-2 ${profileColors.textSecondary} font-mono`}>{child.dob && child.dob !== 'N/A' ? child.dob : '-'}</td>
                                      <td className="px-3 py-2">
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
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs">
                          {t('لا يوجد أبناء مسجلون للموظف', 'No children registered for the employee')}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                          <span className="text-teal-700 font-bold block mb-1">{t('سجل الدورات التدريبية:', 'Training Courses Record:')}</span>
                          <p className="text-slate-700">{selectedEmployee.trainingsRecord || t('لا يوجد سجل دورات مسجل', 'No training courses recorded')}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 shadow-sm">
                          <span className="text-rose-600 font-bold block mb-1">{t('سجل التنبيهات والإنذارات:', 'Warnings and Alerts Record:')}</span>
                          <p className="text-slate-700">{selectedEmployee.warningsRecord || t('لا يوجد سجل عقوبات أو إنذارات', 'No penalties or warnings recorded')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branches & Company Profiles */}
      {activeModuleId === 'emp-branches' && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">location_city</span>
              فروع ومراكز مؤسسة فيتاس العراق
            </h2>
            <button
              onClick={handleAddBranch}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              {t('إضافة فرع', 'Add Branch')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {branchLocations.length > 0 ? (
              branchLocations.map((branch) => (
                <div key={branch.id} className="p-4 rounded-2xl bg-[#0a0c10] border border-white/5 space-y-2 group relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-bold">
                      <span className="material-symbols-outlined text-base">pin_drop</span>
                      {language === 'ar' ? branch.name : branch.name_en}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditBranch(branch)}
                        className="p-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600 text-blue-400 hover:text-white transition-all"
                        title={t('تعديل', 'Edit')}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBranchClick(branch)}
                        className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-all"
                        title={t('حذف', 'Delete')}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-400">الحالة: نشط ومربوط بـ VPN الشبكة الرئيسية</p>
                  <p className="text-slate-500 font-mono text-[10px]">
                    {t('عدد الموظفين المعينين', 'Assigned Employees')}: {employees.filter(e => e.branch.includes(branch.name || branch.name_en)).length}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">location_off</span>
                <p>{t('لا توجد فروع مسجلة', 'No branches registered')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeModuleId === 'emp-company-profile' && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">domain</span>
              {t('الملف التعريفي للشركة', 'Company Profile')}
            </h2>
            <button
              onClick={() => handleEditCompanyProfile(companyProfile)}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              {t('تعديل', 'Edit')}
            </button>
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
                <span className="text-slate-200">{companyProfile.established_date || '-'}</span>
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

      {/* Branch Add/Edit Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-teal-400">
                <span className="material-symbols-outlined text-3xl">location_city</span>
                <h3 className="text-lg font-bold text-white">
                  {editingBranch ? t('تعديل الفرع', 'Edit Branch') : t('إضافة فرع جديد', 'Add New Branch')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowBranchModal(false);
                  setEditingBranch(null);
                  setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
                }}
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('اسم الفرع (عربي)', 'Branch Name (Arabic)')}
                </label>
                <input
                  type="text"
                  value={branchFormData.name}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('مثال: فرع بغداد - الكرادة', 'e.g., Baghdad Branch - Karrada')}
                  required
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('اسم الفرع (إنجليزي)', 'Branch Name (English)')}
                </label>
                <input
                  type="text"
                  value={branchFormData.name_en}
                  onChange={(e) => setBranchFormData({ ...branchFormData, name_en: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('e.g., Baghdad Branch - Karrada', 'e.g., Baghdad Branch - Karrada')}
                  required
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('العنوان', 'Address')}
                </label>
                <input
                  type="text"
                  value={branchFormData.address}
                  onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('العنوان الكامل', 'Full address')}
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('المدينة', 'City')}
                </label>
                <input
                  type="text"
                  value={branchFormData.city}
                  onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('مثال: بغداد', 'e.g., Baghdad')}
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('رقم الهاتف', 'Phone Number')}
                </label>
                <input
                  type="text"
                  value={branchFormData.phone}
                  onChange={(e) => setBranchFormData({ ...branchFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('مثال: 07700000000', 'e.g., 07700000000')}
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('البريد الإلكتروني', 'Email')}
                </label>
                <input
                  type="email"
                  value={branchFormData.email}
                  onChange={(e) => setBranchFormData({ ...branchFormData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                  placeholder={t('branch@vitas.iq', 'branch@vitas.iq')}
                />
              </div>

              <div>
                <label className="block text-black font-medium mb-1.5 text-xs">
                  {t('الحالة', 'Status')}
                </label>
                <select
                  value={branchFormData.status}
                  onChange={(e) => setBranchFormData({ ...branchFormData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0a0c10] border border-white/10 text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all text-sm"
                >
                  <option value="Active">{t('نشط', 'Active')}</option>
                  <option value="Inactive">{t('غير نشط', 'Inactive')}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchModal(false);
                    setEditingBranch(null);
                    setBranchFormData({ name: '', name_en: '', address: '', city: '', phone: '', email: '', status: 'Active' });
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
                  value={companyProfileFormData.established_date}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-lg font-bold text-white">{t('تأكيد حذف الفرع', 'Confirm Branch Deletion')}</h3>
            </div>
            <p className="text-slate-300 text-sm">
              {t('هل أنت متأكد من حذف الفرع', 'Are you sure you want to delete the branch')} <span className="text-white font-bold">{branchDeleteConfirm.name}</span>؟
              <br />
              <span className="text-rose-400 text-xs">{t('لا يمكن التراجع عن هذا الإجراء', 'This action cannot be undone')}</span>
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setBranchDeleteConfirm({ show: false, id: 0, name: '' })}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 font-bold hover:bg-white/10 border border-white/10 text-sm"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmDeleteBranch}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-lg shadow-rose-600/25 text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                {t('حذف', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
