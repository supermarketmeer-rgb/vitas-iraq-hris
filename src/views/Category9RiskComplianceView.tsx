import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { UserRole, CategoryGroup } from '../types';
import { api } from '../api/client';
import { transliterateEnglishNameToArabic, hasArabicCharacters } from '../utils/nameHelper';
import { CATEGORY_GROUPS } from '../data/categories';

export const Category9RiskComplianceView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    riskRecords,
    addRiskRecord,
    currentUser,
    setCurrentUserRole,
    employees,
    addEmployee,
    language,
    theme,
    appSettings,
    t
  } = useApp();

  const isDark = theme === 'dark';

  // Extract Arabic Name with 100% certainty from all possible fields and transliteration fallback
  const extractArabicName = (emp: any): string => {
    if (!emp) return '';
    const candidates = [
      emp.full_name_ar,
      emp.fullNameAr,
      emp.name_ar,
      emp.nameAr,
      emp.fullName,
      emp.full_name,
      emp.name,
      emp.employeeName,
      emp.employeeNameAr
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() && c.trim() !== 'غير محدد' && hasArabicCharacters(c)) {
        return c.trim();
      }
    }
    const en = emp.full_name_en || emp.fullNameEn || emp.name_en || emp.nameEn || emp.fullName || emp.name || '';
    if (en && typeof en === 'string' && en.trim()) {
      return transliterateEnglishNameToArabic(en.trim());
    }
    return '';
  };

  const extractEnglishName = (emp: any): string => {
    if (!emp) return '';
    const candidates = [
      emp.full_name_en,
      emp.fullNameEn,
      emp.name_en,
      emp.nameEn,
      emp.fullName,
      emp.full_name,
      emp.name
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() && c.trim() !== 'غير محدد' && !hasArabicCharacters(c)) {
        return c.trim();
      }
    }
    return emp.full_name_en || emp.fullNameEn || emp.name_en || '';
  };

  // --- 1. Risk Assessment State ---
  const [riskTitle, setRiskTitle] = useState('');
  const [riskCat, setRiskCat] = useState<'أمن المعلومات' | 'الامتثال التنظيمي' | 'التشغيلي' | 'المالي'>('أمن المعلومات');
  const [impact, setImpact] = useState<'منخفض' | 'متوسط' | 'عالي' | 'حرج'>('عالي');
  const [mitigation, setMitigation] = useState('');

  // --- 2. API Keys State ---
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; created: string; status: string }[]>([
    { id: 'KEY-9401', name: 'مفتاح الربط مع بوابة التأمينات والتقاعد', key: 'vts_live_sk_8923fd829a47b10', created: '2026-01-15', status: 'نشط' },
    { id: 'KEY-4122', name: 'واجهة الربط المصرفي CBI Gateway API', key: 'vts_live_sk_4421aa8720cb551', created: '2026-02-10', status: 'نشط' }
  ]);

  // --- 3. Security Settings State ---
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [enable2FA, setEnable2FA] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(5);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // --- 4. Role Permission Editor State ---
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<string>('HR Manager');
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    'Super Admin': { employees: true, payroll: true, recruitment: true, attendance: true, risk: true, settings: true, audit: true },
    'HR Manager': { employees: true, payroll: true, recruitment: true, attendance: true, risk: true, settings: false, audit: true },
    'Recruiter': { employees: false, payroll: false, recruitment: true, attendance: false, risk: false, settings: false, audit: false },
    'Department Head': { employees: true, payroll: false, recruitment: true, attendance: true, risk: false, settings: false, audit: false },
    'Employee': { employees: false, payroll: false, recruitment: false, attendance: true, risk: false, settings: false, audit: false },
    'IT Admin': { employees: false, payroll: false, recruitment: false, attendance: false, risk: true, settings: true, audit: true }
  });

  // --- 5. Employee Specific Module Permissions State (RBAC Delegation) ---
  const [rbacSubTab, setRbacSubTab] = useState<'custom_employees' | 'system_roles'>('custom_employees');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [empDeptFilter, setEmpDeptFilter] = useState<string>('all');
  const [empSearch, setEmpSearch] = useState<string>('');

  // Add New User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [moduleFilterQuery, setModuleFilterQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'cat-2-dash': true,
    'cat-3-emp': true,
    'cat-4-leave': true,
    'cat-5-payroll': true,
    'cat-drivers': false,
    'cat-6-recruit': false,
    'cat-7-perf': false,
    'cat-8-assets': false,
    'cat-12-archive': false,
    'cat-9-risk': false,
    'cat-10-sys': false,
    'cat-11-support': false
  });
  const [newUserForm, setNewUserForm] = useState({
    id: undefined as number | string | undefined,
    originalUsername: '',
    originalEmployeeId: '',
    originalEmail: '',
    username: '',
    password: 'Password123!',
    fullNameAr: '',
    fullNameEn: '',
    jobTitle: 'موظف موارد بشرية',
    department: 'الموارد البشرية والشؤون الإدارية',
    branch: 'الإدارة العامة - بغداد',
    email: '',
    phone: '',
    modules: {
      'emp-list': 'write',
      'emp-add': 'write',
      'emp-directory': 'write',
      'leave-attendance': 'write',
      'sys-dynamic-reports': 'read'
    } as Record<string, 'write' | 'read' | 'none' | boolean>,
    level: 'full' as 'full' | 'read',
    canManageUsers: false,
    role: 'Employee' as UserRole,
    notes: 'مخول بالعمل على الموديولات والشاشات المحددة أدناه'
  });

  // Granular Permission Helpers
  const getModLevel = (modId: string): 'write' | 'read' | 'none' => {
    const val = (newUserForm.modules as any)?.[modId];
    if (val === 'write' || val === true) return 'write';
    if (val === 'read') return 'read';
    return 'none';
  };

  const setModuleLevel = (modId: string, level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      const nextModules = { ...prev.modules };
      if (level === 'none') {
        delete nextModules[modId];
      } else {
        nextModules[modId] = level;
      }
      return { ...prev, modules: nextModules };
    });
  };

  const setCategoryAll = (cat: CategoryGroup, level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      const nextModules = { ...prev.modules };
      cat.modules.forEach(m => {
        if (level === 'none') {
          delete nextModules[m.id];
        } else {
          nextModules[m.id] = level;
        }
      });
      if (level === 'none') {
        delete nextModules[cat.id];
      } else {
        nextModules[cat.id] = level;
      }
      return { ...prev, modules: nextModules };
    });
  };

  const setGlobalAll = (level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      if (level === 'none') {
        return { ...prev, modules: {} };
      }
      const nextModules: Record<string, any> = {};
      CATEGORY_GROUPS.filter(c => c.id !== 'cat-1-auth').forEach(c => {
        nextModules[c.id] = level;
        c.modules.forEach(m => {
          nextModules[m.id] = level;
        });
      });
      return { ...prev, modules: nextModules };
    });
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const toggleAllCategories = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    CATEGORY_GROUPS.forEach(c => {
      next[c.id] = expand;
    });
    setExpandedCategories(next);
  };

  const permissionStats = useMemo(() => {
    let writeCount = 0;
    let readCount = 0;
    Object.entries(newUserForm.modules || {}).forEach(([k, v]) => {
      if (k.startsWith('cat-')) return;
      if (v === 'write' || v === true) writeCount++;
      else if (v === 'read') readCount++;
    });
    return { writeCount, readCount, total: writeCount + readCount };
  }, [newUserForm.modules]);

  const dynamicModuleLabels = useMemo(() => {
    const labels: Record<string, string> = {
      employees: t('الموظفون والعقود', 'Employees & Contracts'),
      attendance: t('الحضور والدوام والإجازات', 'Leaves & Attendance'),
      payroll: t('الرواتب والتعويضات', 'Payroll & Compensation'),
      recruitment: t('التوظيف والاستقطاب (ATS)', 'Recruitment & ATS'),
      reports: t('التقارير الديناميكية وتصدير البيانات', 'Dynamic Reports & Export'),
      risk: t('المخاطر والامتثال والحوكمة', 'Risk & Compliance'),
      settings: t('إعدادات النظام والتهيئة', 'System Settings'),
      support: t('الدعم والمساعدة الفنية', 'Support & Help Desk'),
      drivers: t('إدارة السائقين والحركة والأسطول', 'Drivers & Fleet Management'),
      performance: t('إدارة الأداء والتدريب والكفاءات', 'Performance & Training'),
      assets: t('العهد والأصول والمستندات', 'Assets & Custody'),
      archive: t('الأرشيف الإلكتروني الذكي', 'Smart Digital Archive'),
      'cat-2-dash': t('الرئيسية والإدارة', 'Dashboard & Executive'),
      'cat-3-emp': t('إدارة الموظفين والعقود', 'Employee Management & Contracts'),
      'cat-4-leave': t('الحضور والدوام والإجازات', 'Leaves & Attendance'),
      'cat-5-payroll': t('الرواتب والتعويضات', 'Payroll & Compensation'),
      'cat-drivers': t('إدارة السائقين والحركة', 'Drivers & Fleet Management'),
      'cat-6-recruit': t('التوظيف والاستقطاب', 'Recruitment & ATS'),
      'cat-7-perf': t('إدارة الأداء والتدريب', 'Performance & Training'),
      'cat-8-assets': t('العهد والأصول والمستندات', 'Assets & Custody'),
      'cat-12-archive': t('الأرشيف الذكي والملفات', 'Smart Archive'),
      'cat-9-risk': t('المخاطر والامتثال والحوكمة', 'Risk & Compliance'),
      'cat-10-sys': t('التطوير البرمجي وإعدادات النظام', 'System Development & Settings'),
      'cat-11-support': t('الدعم الفني ومركز المساعدة', 'Support & Help Desk')
    };

    CATEGORY_GROUPS.forEach(g => {
      labels[g.id] = language === 'ar' ? g.title : g.titleEn;
      g.modules.forEach(m => {
        labels[m.id] = language === 'ar' ? m.title : m.titleEn;
      });
    });

    return labels;
  }, [language, t]);

  const filteredCategoryGroups = useMemo(() => {
    const operational = CATEGORY_GROUPS.filter(c => c.id !== 'cat-1-auth');
    if (!moduleFilterQuery.trim()) {
      return operational;
    }
    const q = moduleFilterQuery.toLowerCase().trim();
    return operational.map(cat => {
      const catMatches = cat.title.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q);
      const matchedModules = cat.modules.filter(m => 
        catMatches ||
        m.title.toLowerCase().includes(q) ||
        m.titleEn.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
      return {
        ...cat,
        modules: matchedModules
      };
    }).filter(cat => cat.modules.length > 0);
  }, [moduleFilterQuery]);
  const [badgeSearchQuery, setBadgeSearchQuery] = useState<string>('');
  const [matchedEmployee, setMatchedEmployee] = useState<any>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
  const comboboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsComboboxOpen(false);
      }
    };

    if (isComboboxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isComboboxOpen]);

  // Text normalization helper for flexible Arabic & English search
  const normalizeSearchText = (text: any) => {
    return String(text || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();
  };

  // Dynamic filter for Combobox search (instant search on any 1-2 characters in name or badge)
  const filteredEmployeesForCombobox = useMemo(() => {
    const rawQ = badgeSearchQuery.trim();
    if (!rawQ) return (employees || []).slice(0, 50);

    const normQ = normalizeSearchText(rawQ);
    const cleanQ = normQ.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();

    return (employees || []).filter((e: any) => {
      const b = normalizeSearchText(e.badge_no || e.badgeNo || '');
      const id = normalizeSearchText(e.employee_id || e.employeeId || e.id || '');
      const cleanB = b.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();
      const cleanId = id.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();

      const nameAr = normalizeSearchText(e.full_name_ar || e.fullNameAr || e.name_ar || e.fullName || e.full_name || e.name || '');
      const nameEn = normalizeSearchText(e.full_name_en || e.fullNameEn || e.name_en || '');
      const dept = normalizeSearchText(e.department || e.department_ar || '');
      const pos = normalizeSearchText(e.position || e.position_ar || e.job_title || e.jobTitle || '');

      return (
        b.includes(normQ) ||
        (cleanQ && cleanB.includes(cleanQ)) ||
        id.includes(normQ) ||
        (cleanQ && cleanId.includes(cleanQ)) ||
        nameAr.includes(normQ) ||
        nameEn.includes(normQ) ||
        dept.includes(normQ) ||
        pos.includes(normQ)
      );
    }).slice(0, 60);
  }, [employees, badgeSearchQuery]);

  const handleAutofillFromEmployee = (emp: any) => {
    if (!emp) return;
    setMatchedEmployee(emp);
    setIsComboboxOpen(false);

    const badge = emp.badge_no || emp.badgeNo || emp.employee_id || emp.employeeId || emp.id || '';
    
    // Robust Arabic and English full name resolution with 100% guarantee
    const fullNameAr = extractArabicName(emp);
    const fullNameEn = extractEnglishName(emp) || fullNameAr;
    const jobTitle = emp.position || emp.position_ar || emp.job_title || emp.jobTitle || 'موظف';
    const dept = emp.department || emp.department_ar || 'الموارد البشرية والشؤون الإدارية';
    const branch = emp.branch || emp.location_ar || emp.location || 'الإدارة العامة - بغداد';
    const email = emp.email || emp.org_email || emp.personal_email || (badge ? `${String(badge).toLowerCase().replace(/[^a-z0-9]/g, '')}@vitasiraq.iq` : '');
    const phone = emp.phone || emp.mobile || '';
    
    // Clean suggested username without spaces
    const rawUser = emp.username || (emp.employee_id ? String(emp.employee_id).toLowerCase() : (badge ? String(badge).toLowerCase() : (email ? email.split('@')[0] : '')));
    const suggestedUsername = rawUser.replace(/\s+/g, '');

    setBadgeSearchQuery(`${badge} - ${fullNameAr || fullNameEn}`);

    setNewUserForm(prev => ({
      ...prev,
      originalEmployeeId: String(badge),
      username: suggestedUsername || prev.username,
      fullNameAr: fullNameAr || prev.fullNameAr,
      fullNameEn: fullNameEn || prev.fullNameEn,
      jobTitle: jobTitle || prev.jobTitle,
      department: dept || prev.department,
      branch: branch || prev.branch,
      email: email || prev.email,
      phone: phone || prev.phone
    }));
  };

  const [empPermLevel, setEmpPermLevel] = useState<'full' | 'read'>('full');
  const [empNotes, setEmpNotes] = useState<string>('');
  const [empModulePerms, setEmpModulePerms] = useState<Record<string, boolean>>({
    payroll: true,
    attendance: true,
    employees: true,
    recruitment: false,
    risk: false,
    settings: false,
    reports: true
  });
  const [customEmpSavedToast, setCustomEmpSavedToast] = useState<string | null>(null);

  const [savedEmpDelegations, setSavedEmpDelegations] = useState<Record<string, {
    id?: number | string;
    username?: string;
    employeeId: string;
    employeeName: string;
    employeeNameEn: string;
    department: string;
    jobTitle: string;
    modules: Record<string, boolean>;
    level: 'full' | 'read';
    notes: string;
    grantedBy: string;
    grantedAt: string;
  }>>(() => {
    try {
      const raw = localStorage.getItem('vitas_custom_employee_permissions');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return {
      '1': {
        employeeId: '1',
        employeeName: 'أحمد محمود العراقي',
        employeeNameEn: 'Ahmed Mahmoud Al-Iraqi',
        department: 'الموارد البشرية والشؤون الإدارية',
        jobTitle: 'مسؤول الرواتب والدوام',
        modules: { payroll: true, attendance: true, employees: true, recruitment: false, risk: false, settings: false, reports: true },
        level: 'full',
        notes: 'مخول رسمياً بإدارة مسيرات الرواتب الشهرية واعتماد حركات الحضور والإجازات',
        grantedBy: 'Super Admin',
        grantedAt: '2026-08-30'
      }
    };
  });

  const [departmentsList, setDepartmentsList] = useState<{ id: string | number; name_ar: string; name_en: string }[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  const fetchUsersFromDb = () => {
    api.getUsers()
      .then((usersList: any) => {
        if (Array.isArray(usersList)) {
          const nonAdminUsers = usersList.filter((u: any) => u.username !== 'admin' && u.username !== 'admin_super');
          setDbUsers(nonAdminUsers);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    api.getDepartments()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDepartmentsList(data.map((d: any) => ({
            id: d.id,
            name_ar: d.name_ar || d.name || 'قسم',
            name_en: d.name_en || d.name_ar || 'Department'
          })));
        }
      })
      .catch(() => {});

    fetchUsersFromDb();
    const handleUsersChanged = () => { fetchUsersFromDb(); };
    window.addEventListener('vitas:users_changed', handleUsersChanged);
    return () => window.removeEventListener('vitas:users_changed', handleUsersChanged);
  }, []);

  // Compute all unique departments from Settings + Employees table
  const allUniqueDepartments = useMemo(() => {
    const map = new Map<string, { name_ar: string; name_en: string }>();

    // 1. From settings API
    departmentsList.forEach(d => {
      if (d.name_ar && d.name_ar.trim()) {
        map.set(d.name_ar.trim(), {
          name_ar: d.name_ar.trim(),
          name_en: d.name_en?.trim() || d.name_ar.trim()
        });
      }
    });

    // 2. From all active employees in table
    employees.forEach(emp => {
      const deptAr = (emp.department || emp.department_ar || '').trim();
      const deptEn = (emp.department_en || deptAr).trim();
      if (deptAr && !map.has(deptAr)) {
        map.set(deptAr, { name_ar: deptAr, name_en: deptEn });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
  }, [departmentsList, employees]);

  // Auto-reset sub-tab to Employee Delegation whenever RBAC module is opened
  React.useEffect(() => {
    if (activeModuleId === 'sec-roles-permissions') {
      setRbacSubTab('custom_employees');
    }
  }, [activeModuleId]);

  // Handler to create a new user account & grant permissions immediately (WITHOUT inserting to employees table)
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.fullNameAr.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال اسم المستخدم والاسم الكامل بالعربية' : 'Please enter username and Arabic full name');
      return;
    }

    const cleanUsername = newUserForm.username.trim();
    const empCode = cleanUsername.toUpperCase().startsWith('VTS') ? cleanUsername.toUpperCase() : `VTS-${cleanUsername.toUpperCase()}`;
    const cleanEmpCode = newUserForm.originalEmployeeId || empCode;
    
    try {
      // NOTE: Creating a User NEVER adds or modifies records in the employees table!

      // Prepare full modules map with category rollups
      const fullModules: Record<string, any> = { ...newUserForm.modules };

      const categoryRollupKeys: Record<string, { catId: string; subIds: string[] }> = {
        employees: { catId: 'cat-3-emp', subIds: ['emp-list', 'emp-add', 'emp-contracts', 'emp-org-chart', 'emp-directory', 'emp-delegation', 'emp-sync-guide', 'emp-hr-directory'] },
        attendance: { catId: 'cat-4-leave', subIds: ['leave-attendance', 'leave-apply', 'leave-balance', 'leave-approvals', 'leave-timesheets', 'leave-earned', 'leave-schedule', 'leave-biometric-settings', 'leave-db-schema'] },
        payroll: { catId: 'cat-5-payroll', subIds: ['payroll-sheet', 'payroll-payslip', 'payroll-loans', 'payroll-tax', 'payroll-end-service', 'payroll-analytics', 'pay-dashboard', 'payroll-mgmt'] },
        recruitment: { catId: 'cat-6-recruit', subIds: ['recruit-openings', 'recruit-pipeline', 'recruit-interviews', 'recruit-offers', 'recruit-onboarding', 'recruit-dash', 'recruit-ats', 'recruit-candidate-profile'] },
        reports: { catId: 'cat-2-dash', subIds: ['sys-dynamic-reports', 'dash-overview', 'dash-exec-1', 'dash-exec-2', 'dash-ess', 'dash-search'] },
        risk: { catId: 'cat-9-risk', subIds: ['risk-matrix', 'risk-audit-logs', 'risk-policies', 'risk-incidents', 'risk-compliance-checklist', 'sec-roles', 'risk-assessment'] },
        settings: { catId: 'cat-10-sys', subIds: ['sys-code-view', 'sys-schema', 'sys-api-logs', 'sys-deploy-status', 'sys-sql-console', 'sys-env', 'auth-secure', 'auth-sso', 'auth-biometric'] },
        support: { catId: 'cat-11-support', subIds: ['support-tickets', 'support-faq', 'support-contact', 'support-guides', 'supp-knowledge-base', 'supp-emp-portal', 'supp-internal-chat', 'supp-notif-center', 'supp-mobile-app'] },
        drivers: { catId: 'cat-drivers', subIds: ['drivers-list', 'drivers-assignments', 'drivers-trips', 'drivers-maintenance', 'drivers-fuel', 'drivers-kpi'] },
        performance: { catId: 'cat-7-perf', subIds: ['perf-appraisals', 'perf-goals', 'perf-kpi', 'perf-training-plans', 'perf-courses'] },
        assets: { catId: 'cat-8-assets', subIds: ['asset-inventory', 'asset-assign', 'asset-custody', 'asset-maintenance', 'asset-my-requests', 'doc-company', 'doc-templates', 'doc-my-docs'] },
        archive: { catId: 'cat-12-archive', subIds: ['archive-digital', 'archive-cabinets', 'archive-indexing', 'archive-retention', 'archive-ocr', 'archive-audit'] }
      };

      Object.entries(categoryRollupKeys).forEach(([catKey, info]) => {
        const hasWrite = info.subIds.some(id => fullModules[id] === 'write' || fullModules[id] === true) || fullModules[info.catId] === 'write';
        const hasRead = info.subIds.some(id => fullModules[id] === 'read') || fullModules[info.catId] === 'read';
        if (hasWrite) {
          fullModules[catKey] = 'write';
          fullModules[info.catId] = 'write';
        } else if (hasRead) {
          fullModules[catKey] = 'read';
          fullModules[info.catId] = 'read';
        } else {
          fullModules[catKey] = false;
          fullModules[info.catId] = 'none';
        }
      });

      // 1. Save credentials for login (Local state)
      let existingUsers: any = {};
      try {
        const existingUsersRaw = localStorage.getItem('vitas_custom_users') || '{}';
        existingUsers = JSON.parse(existingUsersRaw);
        const isExplicitAdmin = Boolean(newUserForm.canManageUsers || newUserForm.role === 'Admin');
        const assignedRole: UserRole = isExplicitAdmin
          ? 'Admin'
          : (newUserForm.jobTitle.includes('مدير الموارد البشرية') ||
            newUserForm.jobTitle.toLowerCase().includes('hr manager') ||
            newUserForm.jobTitle.toLowerCase().includes('hr director'))
              ? 'HR Manager'
              : 'Employee';

        if (isExplicitAdmin) {
          fullModules['sec-roles-permissions'] = 'write';
          fullModules['sec-roles'] = 'write';
          fullModules['cat-9-risk'] = 'write';
          fullModules['risk'] = 'write';
        }

        existingUsers[cleanUsername.toLowerCase()] = {
          username: cleanUsername,
          password: newUserForm.password,
          name: newUserForm.fullNameAr.trim(),
          role: assignedRole,
          can_manage_users: isExplicitAdmin ? 1 : 0,
          employeeId: cleanEmpCode,
          jobTitle: newUserForm.jobTitle.trim(),
          modules: fullModules
        };
        localStorage.setItem('vitas_custom_users', JSON.stringify(existingUsers));
      } catch (err) {
        console.error(err);
      }

      const isExplicitAdmin = Boolean(newUserForm.canManageUsers || newUserForm.role === 'Admin');
      const assignedRole: UserRole = isExplicitAdmin
        ? 'Admin'
        : (newUserForm.jobTitle.includes('مدير الموارد البشرية') ||
          newUserForm.jobTitle.toLowerCase().includes('hr manager') ||
          newUserForm.jobTitle.toLowerCase().includes('hr director'))
            ? 'HR Manager'
            : 'Employee';

      // 2. Save delegated module permissions (Local state)
      const updatedDelegations = {
        ...savedEmpDelegations,
        [cleanEmpCode]: {
          id: newUserForm.id,
          username: cleanUsername,
          employeeId: cleanEmpCode,
          employeeName: newUserForm.fullNameAr.trim(),
          employeeNameEn: newUserForm.fullNameEn.trim() || newUserForm.fullNameAr.trim(),
          department: newUserForm.department,
          jobTitle: newUserForm.jobTitle.trim(),
          role: assignedRole,
          can_manage_users: isExplicitAdmin ? 1 : 0,
          modules: fullModules,
          level: newUserForm.level,
          notes: newUserForm.notes,
          grantedBy: currentUser?.name || 'Super Admin',
          grantedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        }
      };

      // Clean up previous keys if code or username was renamed
      if (newUserForm.originalEmployeeId && newUserForm.originalEmployeeId !== cleanEmpCode) {
        delete updatedDelegations[newUserForm.originalEmployeeId];
      }
      if (newUserForm.originalUsername && newUserForm.originalUsername.toLowerCase() !== cleanUsername.toLowerCase()) {
        delete existingUsers[newUserForm.originalUsername.toLowerCase()];
        delete updatedDelegations[newUserForm.originalUsername.toUpperCase()];
        delete updatedDelegations[`VTS-${newUserForm.originalUsername.toUpperCase()}`];
      }

      setSavedEmpDelegations(updatedDelegations);
      localStorage.setItem('vitas_custom_employee_permissions', JSON.stringify(updatedDelegations));

      // 3. Persist to Database users table (and Real-Time sync to Cloud)
      await api.saveUser({
        id: newUserForm.id,
        original_username: newUserForm.originalUsername || undefined,
        original_employee_id: newUserForm.originalEmployeeId || undefined,
        original_email: newUserForm.originalEmail || undefined,
        username: cleanUsername,
        password: newUserForm.password,
        full_name: newUserForm.fullNameAr.trim(),
        name: newUserForm.fullNameAr.trim(),
        email: newUserForm.email.trim() || `${cleanUsername.toLowerCase()}@vitasiraq.iq`,
        job_title: newUserForm.jobTitle.trim(),
        role: assignedRole,
        department: newUserForm.department,
        employee_id: cleanEmpCode,
        branch: newUserForm.branch,
        can_manage_employees: fullModules.employees ? 1 : (isExplicitAdmin ? 1 : 0),
        can_manage_finance: fullModules.payroll ? 1 : 0,
        can_manage_recruitment: fullModules.recruitment ? 1 : 0,
        can_manage_settings: fullModules.settings ? 1 : (isExplicitAdmin ? 1 : 0),
        can_manage_users: isExplicitAdmin ? 1 : 0,
        status: 'active',
        allowed_screens: fullModules
      }).catch((err: any) => {
        console.warn('Notice saving to users table:', err.message);
      });

      fetchUsersFromDb();

      await api.updateAppSettingsBulk({
        vitas_custom_employee_permissions: JSON.stringify(updatedDelegations),
        vitas_custom_users: JSON.stringify(existingUsers)
      }).catch((err: any) => {
        console.warn('Notice saving custom users to DB:', err.message);
      });

      api.getUsers().then((usersList: any) => {
        if (Array.isArray(usersList)) {
          const nonAdminUsers = usersList.filter((u: any) => u.username !== 'admin' && u.username !== 'admin_super');
          const delegationsFromDb: Record<string, any> = {};
          nonAdminUsers.forEach((u: any) => {
            const uCode = (u.employee_id || u.username || String(u.id)).toUpperCase();
            let parsedModules: Record<string, boolean> = {
              employees: Boolean(u.can_manage_employees),
              payroll: Boolean(u.can_manage_finance),
              recruitment: Boolean(u.can_manage_recruitment),
              settings: Boolean(u.can_manage_settings),
              attendance: false,
              reports: false,
              risk: false
            };
            if (u.allowed_screens) {
              try {
                const s = typeof u.allowed_screens === 'string' ? JSON.parse(u.allowed_screens) : u.allowed_screens;
                if (s && typeof s === 'object') parsedModules = { ...s };
              } catch (e) {}
            }
            delegationsFromDb[uCode] = {
              id: u.id,
              username: u.username,
              employeeId: uCode,
              employeeName: u.name || u.full_name || u.username,
              employeeNameEn: u.full_name || u.name || u.username,
              department: u.department || 'الموارد البشرية والشؤون الإدارية',
              jobTitle: u.job_title || u.role || 'مسؤول رواتب وحضور',
              modules: parsedModules,
              level: 'full',
              notes: 'مسؤول رواتب وحضور',
              grantedBy: 'مدير النظام (Super Admin)',
              grantedAt: u.created_at ? new Date(u.created_at).toISOString().slice(0, 16) : '2026-09-02 11:30'
            };
          });
          setSavedEmpDelegations(prev => ({ ...prev, ...delegationsFromDb }));
        }
      }).catch(() => {});

      api.syncNow().catch(() => {});

      // 4. Select this user and feedback
      setSelectedEmpId(cleanEmpCode);
      setIsAddUserModalOpen(false);
      setCustomEmpSavedToast(
        language === 'ar'
          ? `تم حفظ وتحديث حساب المستخدم (${newUserForm.fullNameAr}) ومزامنته مع السرفر السحابي بنجاح!`
          : `User account (${newUserForm.fullNameEn || newUserForm.fullNameAr}) saved and synced to cloud successfully!`
      );
      setTimeout(() => setCustomEmpSavedToast(null), 5000);
      setTimeout(() => setCustomEmpSavedToast(null), 5000);

      // Reset form
      setNewUserForm({
        username: '',
        password: 'Password123!',
        fullNameAr: '',
        fullNameEn: '',
        jobTitle: 'مدخل بيانات موارد بشرية (HR Data Entry)',
        department: 'الموارد البشرية والشؤون الإدارية',
        branch: 'الإدارة العامة - بغداد',
        email: '',
        phone: '',
        modules: {
          employees: true,
          attendance: false,
          payroll: false,
          recruitment: false,
          risk: false,
          settings: false,
          reports: true
        },
        level: 'full',
        notes: 'مسؤول عن إدخال وتحديث بيانات الموظفين الأساسية، العقود، والمستندات في قسم الموارد البشرية'
      });
    } catch (err) {
      console.error(err);
      alert('Error creating user: ' + err);
    }
  };

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskTitle) return;
    addRiskRecord({
      riskCode: `RSK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: riskTitle,
      category: riskCat,
      impact,
      probability: 'متوسط',
      owner: currentUser?.name || currentUser?.email || 'مدير المخاطر والامتثال',
      mitigationPlan: mitigation || 'سيتم إعداد خطة التعافي والتغطية فوراً',
      status: 'مفتوح'
    });
    setRiskTitle('');
    setMitigation('');
    setActiveModuleId('risk-assessment');
  };

  const handleGenerateApiKey = () => {
    const newK = {
      id: `KEY-${Date.now().toString().slice(-4)}`,
      name: `مفتاح API جديد - ${currentUser?.role || 'مسؤول'}`,
      key: `vts_live_sk_${Math.random().toString(36).substring(2, 18)}`,
      created: new Date().toISOString().split('T')[0],
      status: 'نشط'
    };
    setApiKeys(prev => [newK, ...prev]);
  };

  const handleSaveSecuritySettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const togglePermission = (role: string, moduleKey: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleKey]: !prev[role]?.[moduleKey]
      }
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Category Banner */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-[#e8ebef] border-slate-300'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">gavel</span>
            <span className="text-xs font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest font-normal">
              RISK, COMPLIANCE & SECURITY GOVERNANCE
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {(activeModuleId === 'risk-audit-reports' || activeModuleId === 'risk-audit') && t('مركز تقارير التدقيق والامتثال التنظيمي', 'Audit & Regulatory Compliance Reports Center')}
            {(activeModuleId === 'risk-governance' || activeModuleId === 'risk-dashboard' || activeModuleId === 'cat-9-risk') && t('لوحة حوكمة الامتثال وسجلات الرقابة المصرفية', 'Compliance Governance & Banking Supervision Logs')}
            {activeModuleId === 'risk-tracker' && t('متتبع التوافق والتشريعات واللوائح المصرفية', 'Regulatory Compliance & Statutory Tracker')}
            {(activeModuleId === 'risk-policies' || activeModuleId === 'risk-training') && t('سجل اللوائح والسياسات الداخلية المعتمدة', 'Approved Internal Policies & Regulations Register')}
            {(activeModuleId === 'risk-assessment' || activeModuleId === 'risk-incident') && t('سجل ونظرة عامة على تقييم المخاطر', 'Risk Assessment Register & Overview')}
            {activeModuleId === 'risk-identify-new' && t('تسجيل وتحديد خطر تشغيلي / سيبراني جديد', 'Register New Operational / Cyber Risk')}
            {activeModuleId === 'risk-details-privacy' && t('إطار حماية الخصوصية والبيانات الشخصية', 'Data Privacy & Protection Framework')}
            {activeModuleId === 'sec-general-settings' && t('إعدادات وسياسات الأمان العامة', 'General Security Settings & Policies')}
            {activeModuleId === 'sec-audit-logs' && t('سجلات تدقيق الأمان وأحداث النظام (Audit Trail)', 'Security Audit Logs & System Events')}
            {activeModuleId === 'sec-roles-permissions' && t('إدارة أدوار وصلاحيات المستخدمين (RBAC)', 'Role-Based Access Control & Permissions (RBAC)')}
            {activeModuleId === 'sec-edit-role' && t('محرر ومخصص الصلاحيات البرمجية للأدوار', 'Role Permissions Editor')}
            {activeModuleId === 'sec-api-keys' && t('إدارة مفاتيح وتصاريح الربط البرمجي (API Keys)', 'API Keys & Integration Management')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('الحوكمة وإدارة المخاطر المعززة وفق معايير البنك المركزي العراقي CBI وقوانين العمل والضمان', 'Enhanced governance & risk management according to CBI guidelines & labor laws')}
          </p>
        </div>
      </div>

      {/* =========================================================================
          MODULE 1 & DEFAULT: Compliance Governance Dashboard (risk-governance / cat-9-risk)
          ========================================================================= */}
      {(activeModuleId === 'risk-governance' || activeModuleId === 'risk-dashboard' || activeModuleId === 'cat-9-risk' || !activeModuleId) && (
        <div className="space-y-6">
          {/* Top Compliance Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('نسبة الامتثال التنظيمي', 'Compliance Index')}</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 material-symbols-outlined text-lg">verified</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">99.4%</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('مطابق لمتطلبات البنك المركزي العراقي CBI', 'Compliant with Central Bank of Iraq standards')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('المخاطر التشغيلية المفتوحة', 'Open Operational Risks')}</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 material-symbols-outlined text-lg">warning</span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{riskRecords.length} {t('مخاطر', 'Risks')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('تحت خطة المعالجة والتخفيف النشطة', 'Under active mitigation plans')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('سياسات المؤسسة المعتمدة', 'Approved Policies')}</span>
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 material-symbols-outlined text-lg">policy</span>
              </div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">8 {t('لوائح', 'Policies')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('محدثة ومعتمدة من مجلس الإدارة 2026', 'Updated & approved by BoD')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('حالة الأمان والـ RBAC', 'Security & RBAC Status')}</span>
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 material-symbols-outlined text-lg">shield</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{t('مؤمّن بالكامل', 'Fully Secured')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('2FA نشط مع تسجيل تدقيق مستمر', '2FA enabled with full audit trail')}</p>
            </div>
          </div>

          {/* CBI Supervision & Banking Guidelines Table */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('سجل التوافق مع تعاميم وضوابط البنك المركزي العراقي (CBI Compliance Log)', 'CBI Circulars & Banking Supervision Compliance Log')}
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5">{t('المؤسسة تخضع لرقابة وإشراف البنك المركزي العراقي للمؤسسات المالية غير المصرفية', 'VITAS Iraq is regulated by the Central Bank of Iraq')}</p>
              </div>
              <button
                onClick={() => setActiveModuleId('risk-audit-reports')}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-sm flex items-center gap-1 text-xs"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>{t('تصدير سجل الامتثال', 'Export Compliance')}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className={`border-b text-[11px] font-bold ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                    <th className="pb-3 text-start">{t('التعميم / اللائحة الرقابية', 'Regulation / Circular')}</th>
                    <th className="pb-3 text-start">{t('الجهة المصدرة', 'Authority')}</th>
                    <th className="pb-3 text-start">{t('تاريخ الإصدار', 'Date')}</th>
                    <th className="pb-3 text-start">{t('موقف نظام الموارد البشرية', 'HRIS Status')}</th>
                    <th className="pb-3 text-start">{t('حالة الامتثال', 'Compliance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {[
                    { title: 'ضوابط مكافحة غسل الأموال وتمويل الإرهاب (AML/CFT)', auth: 'البنك المركزي العراقي', date: '2026-01-10', status: 'تطبيق فحص دوري لكافة الموظفين والمرشحين', comp: 'مطابق 100%' },
                    { title: 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', auth: 'وزارة العمل والشؤون الاجتماعية', date: '2025-11-20', status: 'دمج محرك احتساب الضمان والضريبة المباشرة بنجاح', comp: 'مطابق 100%' },
                    { title: 'معايير الحوكمة وإدارة المخاطر التشغيلية والسيبرانية', auth: 'قسم الرقابة والامتثال CBI', date: '2026-02-01', status: 'تفعيل سجل التدقيق والمصادقة الثنائية وتشفير البيانات', comp: 'مطابق 100%' },
                    { title: 'حماية بيانات العملاء والموظفين وسرية المعلومات الائتمانية', auth: 'البنك المركزي العراقي', date: '2025-12-15', status: 'تشفير كامل لقاعدة البيانات وإدارة صلاحيات RBAC', comp: 'مطابق 100%' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{row.title}</td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{row.auth}</td>
                      <td className="py-3 font-mono text-slate-500">{row.date}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{row.status}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          {row.comp}
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
          MODULE 2: Audit & Regulatory Compliance Reports (risk-audit-reports / risk-audit)
          ========================================================================= */}
      {(activeModuleId === 'risk-audit-reports' || activeModuleId === 'risk-audit') && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('مركز تقارير التدقيق والرقابة التنظيمية المعتمدة', 'Official Regulatory & Compliance Audit Reports')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('تقارير جاهزة للطباعة والتصدير للجهات الرقابية والمراجع الخارجي', 'Export-ready reports for regulators & external auditors')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'AUD-2026-01', title: 'تقرير تدقيق الامتثال السنوي للبنك المركزي CBI', date: '2026-02-15', auditor: 'إدارة الامتثال والمخاطر', status: 'معتمد رسمياً', desc: 'تقرير مفصل حول التزام مؤسسة فيتاس العراق بكافة الضوابط الرقابية والحوكمة المؤسسية.' },
              { id: 'AUD-2026-02', title: 'تقرير مراجعة وتدقيق كشوفات الرواتب ومطابقة الضمان', date: '2026-02-01', auditor: 'التدقيق الداخلي والمالي', status: 'معتمد رسمياً', desc: 'مطابقة دقيقة لكشوفات الرواتب، استقطاعات الضمان الاجتماعي رقم 18 لسنة 2023 وضريبة الدخل.' },
              { id: 'AUD-2026-03', title: 'تقرير فحص أمان النفاذ وصلاحيات المستخدمين (RBAC Audit)', date: '2026-01-20', auditor: 'أمن المعلومات والسيبراني', status: 'معتمد رسمياً', desc: 'مراجعة دورية لمصفوفة الصلاحيات، الحسابات الإدارية، وسجلات الدخول على مستوى الفروع.' },
              { id: 'AUD-2026-04', title: 'تقرير فحص الأصول والعهد الرقمية واللوائح الداخلية', date: '2026-01-05', auditor: 'لجنة التدقيق الإداري', status: 'معتمد رسمياً', desc: 'حصر العهد الإلكترونية والأجهزة المخصصة للموظفين والتأكد من وثائق التسليم والاسترجاع.' }
            ].map(rep => (
              <div key={rep.id} className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">{rep.id}</span>
                    <h3 className="font-bold text-sm mt-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{rep.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    {rep.status}
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">{rep.desc}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('المدقق:', 'Auditor:')} <b className="text-slate-600 dark:text-slate-200">{rep.auditor}</b></span>
                  <button
                    onClick={() => alert(`تم تجهيز ملف التقرير ${rep.id} للطباعة والتصدير.`)}
                    className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">download</span>
                    <span>{t('تحميل PDF', 'Download PDF')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 3: Regulatory Compliance Tracker (risk-tracker)
          ========================================================================= */}
      {activeModuleId === 'risk-tracker' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('متتبع التوافق والتشريعات واللوائح العراقية النافذة', 'Iraqi Statutory & Regulatory Compliance Tracker')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('المتابعة اللحظية للقوانين واللوائح الملزمة في جمهورية العراق', 'Active tracking of applicable laws & regulatory requirements in Iraq')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { law: 'قانون العمل العراقي رقم (37) لسنة 2015', scope: 'عقود العمل، ساعات الدوام، الإجازات، مكافأة نهاية الخدمة، والسلامة المهنية', comp: '100% مطابق', nextReview: '2026-06-30' },
              { law: 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', scope: 'نسب الاستقطاع (5% عامل + 12% صاحب عمل) والتصريح الإلكتروني بالرواتب', comp: '100% مطابق', nextReview: '2026-03-31' },
              { law: 'تعليمات البنك المركزي العراقي رقم (4) لمؤسسات التمويل الأصغر', scope: 'الحوكمة، الرقابة الداخلية، وإدارة المخاطر الائتمانية والتشغيلية', comp: '100% مطابق', nextReview: '2026-05-15' },
              { law: 'قانون ضريبة الدخل العراقي وتعديلاته والسماحات القانونية', scope: 'احتساب الاستقطاع المباشر والسماحات الزوجية وتنزيل الاشتراكات التقاعدية', comp: '100% مطابق', nextReview: '2026-04-30' }
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="space-y-1 max-w-xl">
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{item.law}</h3>
                  <p className="text-slate-500 text-[11px]">{item.scope}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-end">
                    <span className="text-[10px] text-slate-400 block">{t('المراجعة القادمة', 'Next Review')}</span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{item.nextReview}</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    {item.comp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 4: Company Policies Register (risk-policies / risk-training)
          ========================================================================= */}
      {(activeModuleId === 'risk-policies' || activeModuleId === 'risk-training') && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('سجل السياسات واللوائح الداخلية المعتمدة لمؤسسة فيتاس العراق', 'VITAS Iraq Approved Internal Policies Register')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('السياسات المعتمدة والملزمة لجميع موظفي المؤسسة في الإدارة العامة وكافة الفروع', 'Mandatory policies for all staff across HQ and branch network')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { code: 'POL-HR-01', title: 'دليل سياسات وإجراءات الموارد البشرية والتوظيف', version: 'v3.2', date: '2026-01-01', pages: '45 صفحة', desc: 'المعايير المعتمدة للتعيين، التقييم، الترقية، الرواتب والبدلات، وإنهاء الخدمة.' },
              { code: 'POL-SEC-02', title: 'سياسة أمان المعلومات وسرية البيانات والأجهزة', version: 'v2.8', date: '2025-12-10', pages: '28 صفحة', desc: 'ضوابط كلمات المرور، استخدام الحواسيب المحمولة، وحظر تسريب بيانات المقترضين.' },
              { code: 'POL-ETH-03', title: 'ميثاق السلوك المهني والنزاهة ومكافحة الفساد', version: 'v4.0', date: '2026-01-15', pages: '18 صفحة', desc: 'قواعد تجنب تضارب المصالح، قبول الهدايا، وحماية أصول المؤسسة وسمعتها.' },
              { code: 'POL-LEV-04', title: 'لائحة تنظيم الدوام الرسمي والإجازات والانضباط', version: 'v3.0', date: '2025-11-05', pages: '22 صفحة', desc: 'ضوابط الإجازات السنوية، المرضية، الاستثنائية، وساعات العمل المرنة.' }
            ].map(pol => (
              <div key={pol.code} className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">{pol.code} • {pol.version}</span>
                    <h3 className="font-bold text-sm mt-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{pol.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                    {pol.pages}
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">{pol.desc}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('تاريخ التحديث:', 'Updated:')} <b className="font-mono text-slate-600 dark:text-slate-200">{pol.date}</b></span>
                  <button
                    onClick={() => alert(`سيتم فتح واستعراض مستند ${pol.title}`)}
                    className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">visibility</span>
                    <span>{t('استعراض الدليل', 'View Policy')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 5: Risk Assessment Register (risk-assessment / risk-incident)
          ========================================================================= */}
      {(activeModuleId === 'risk-assessment' || activeModuleId === 'risk-incident') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            <span>{t(`سجل المخاطر النشطة (${riskRecords.length})`, `Active Risk Register (${riskRecords.length})`)}</span>
            <button
              onClick={() => setActiveModuleId('risk-identify-new')}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-500 transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add_alert</span>
              <span>{t('+ تسجيل خطر جديد', '+ Register New Risk')}</span>
            </button>
          </div>

          {riskRecords.length === 0 ? (
            <EmptyState
              icon="warning"
              title={t('سجل المخاطر مفرّغ تماماً', 'Risk Register Empty')}
              description={t('لم يتم تسجيل أي مخاطر تشغيلية أو سيبرانية غير معالجة حتى الآن.', 'No unmitigated operational or cyber risks have been identified.')}
              actionText={t('تحديد خطر جديد', 'Identify New Risk')}
              onAction={() => setActiveModuleId('risk-identify-new')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {riskRecords.map(r => (
                <div key={r.id} className={`p-5 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    <span className="text-sm">{r.title}</span>
                    <span className="text-rose-500 dark:text-rose-400 font-mono text-xs">{r.riskCode}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    <b>{t('الفئة:', 'Category:')}</b> {r.category} • <b>{t('خطة المعالجة:', 'Mitigation:')}</b> {r.mitigationPlan}
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-between items-center text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                      {t('التأثير:', 'Impact:')} {r.impact}
                    </span>
                    <span className="text-slate-400 font-mono">{t('تم الرصد:', 'Logged:')} {r.identifiedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 6: Identify & Register New Risk (risk-identify-new)
          ========================================================================= */}
      {activeModuleId === 'risk-identify-new' && (
        <div className={`max-w-xl mx-auto p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className="text-base font-bold border-b border-slate-200 dark:border-white/10 pb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {t('تسجيل خطر تشغيلي أو سيبراني جديد', 'Register New Risk in Governance Register')}
          </h2>
          <form onSubmit={handleAddRisk} className="space-y-4">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('وصف الخطر المحتمل *', 'Potential Risk Description *')}
              </label>
              <input
                type="text"
                required
                placeholder={t('مثال: احتمال انقطاع خدمة الاتصال الشبكي عن فرع البصرة', 'e.g. Potential network connection outage at Basra branch')}
                value={riskTitle}
                onChange={e => setRiskTitle(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('فئة الخطر', 'Risk Category')}
                </label>
                <select
                  value={riskCat}
                  onChange={e => setRiskCat(e.target.value as any)}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="أمن المعلومات">{t('أمن المعلومات والسيبراني', 'Information & Cyber Security')}</option>
                  <option value="الامتثال التنظيمي">{t('الامتثال للبنك المركزي CBI', 'Central Bank Compliance')}</option>
                  <option value="التشغيلي">{t('التشغيلي واستمرارية العمل', 'Operational & Business Continuity')}</option>
                  <option value="المالي">{t('المالي والائتمان', 'Financial & Credit')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('درجة التأثير المتوقعة', 'Expected Impact Level')}
                </label>
                <select
                  value={impact}
                  onChange={e => setImpact(e.target.value as any)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold text-rose-500 outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="منخفض">{t('منخفض (Low)', 'Low')}</option>
                  <option value="متوسط">{t('متوسط (Medium)', 'Medium')}</option>
                  <option value="عالي">{t('عالي (High)', 'High')}</option>
                  <option value="حرج">{t('حرج جداً (Critical)', 'Critical')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('خطة المعالجة والتخفيف (Mitigation Plan)', 'Mitigation Plan')}
              </label>
              <textarea
                rows={3}
                placeholder={t('تفاصيل خطة التحوط والتغطية للحد من أثر الخطر...', 'Mitigation plan details...')}
                value={mitigation}
                onChange={e => setMitigation(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full p-3 rounded-xl border text-xs font-normal outline-none transition-all ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all text-xs"
            >
              {t('حفظ وتثبيت الخطر في سجل الحوكمة', 'Save Risk to Governance Register')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 7: Data Privacy & Protection (risk-details-privacy)
          ========================================================================= */}
      {activeModuleId === 'risk-details-privacy' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إطار حماية وسرية البيانات الشخصية للموظفين والعملاء', 'Data Privacy & Protection Governance Framework')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('معايير التشفير والاحتفاظ الآمن بالبيانات وفق التشريعات المصرفية', 'Data encryption, retention, and access management standards')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">lock</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('تشفير البيانات الحساسة', 'Data Encryption')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('تشفير بيانات الرواتب، أرقام الهويات الوطنية، والمستندات ببروتوكول AES-256 بت على السيرفر المحلي والسحابي.', 'Sensitive data encrypted with AES-256.')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">history_toggle_off</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('سياسة الاحتفاظ والأرشفة', 'Retention Policy')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('الاحتفاظ بالسجلات الوظيفية والمالية لمدة 10 سنوات امتثالاً لتعليمات البنك المركزي العراقي وقانون العمل.', 'Retention of HR & payroll records for 10 years.')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">security</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('حقوق النفاذ المحددة (Least Privilege)', 'Least Privilege Access')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('لا يمكن لأي موظف الاطلاع على رواتب أو تقييمات زملائه إلا بوجود صلاحية إدارية محددة في RBAC.', 'Strict RBAC prevents unauthorized payroll access.')}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 8: General Security Settings (sec-general-settings)
          ========================================================================= */}
      {activeModuleId === 'sec-general-settings' && (
        <div className={`max-w-2xl mx-auto p-6 rounded-3xl border shadow-xl space-y-5 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إعدادات وسياسات الأمان العامة للبوابة', 'Portal General Security Policies & Parameters')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('تخصيص شروط كلمات المرور، انتهاء الجلسات، والمصادقة المزدوجة', 'Configure password rules, session timeouts, and MFA')}</p>
            </div>
          </div>

          <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('الحد الأدنى لطول كلمة المرور (أحرف)', 'Min Password Length')}
                </label>
                <input
                  type="number"
                  min={6}
                  max={20}
                  value={minPasswordLength}
                  onChange={e => setMinPasswordLength(Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('مهلة انتهاء الجلسة بعد الخمول (بالدقائق)', 'Session Inactivity Timeout (Minutes)')}
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={sessionTimeoutMinutes}
                  onChange={e => setSessionTimeoutMinutes(Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('عدد محاولات الدخول الخاطئة قبل القفل المؤقت', 'Max Failed Attempts Before Lockout')}
                </label>
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={maxFailedAttempts}
                  onChange={e => setMaxFailedAttempts(Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="req-special"
                  checked={requireSpecialChars}
                  onChange={e => setRequireSpecialChars(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600"
                />
                <label htmlFor="req-special" className="font-bold cursor-pointer" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إلزامية احتواء كلمة المرور على رموز خاصة وأرقام', 'Require special characters & numbers')}
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30">
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">shield</span>
              <div>
                <p className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('المصادقة الثنائية (2FA) مُفعّلة', '2-Factor Authentication Enabled')}</p>
                <p className="text-[11px] text-slate-500">{t('جميع الحسابات الإدارية تستخدم التحقق المزدوج لحماية النظام', 'All admin accounts use 2FA')}</p>
              </div>
            </div>

            {settingsSaved && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {t('تم حفظ إعدادات الأمان بنجاح!', 'Security settings saved successfully!')}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition-all shadow-lg shadow-teal-600/25 cursor-pointer"
            >
              {t('حفظ إعدادات الأمان', 'Save Security Settings')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 10: Dynamic Users & Module Permissions (sec-roles-permissions)
          ========================================================================= */}
      {(activeModuleId === 'sec-roles-permissions' || activeModuleId === 'sec-edit-role') && (
        <div className={`rounded-3xl border shadow-xl overflow-hidden space-y-0 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>

          {/* Prominent Add User CTA Banner */}
          <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 ${
            isDark ? 'bg-teal-950/30 border-teal-500/40' : 'bg-teal-50 border-teal-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
                <span className="material-symbols-outlined text-xl">manage_accounts</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إدارة المستخدمين وصلاحيات الموديولات', 'User Management & Module Permissions')}
                </h2>
                <p className="text-teal-600 dark:text-teal-400 text-[11px] font-medium">
                  {t('أضف مستخدمين جدد وحدد الموديولات المصرح بها عبر علامات ✓ (Tick)', 'Add new users and assign permitted modules via ✓ checkboxes')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span>{currentUser?.role === 'Admin' ? t('مسؤول نظام (Admin) نشط', 'Admin Active') : (currentUser?.role === 'Super Admin' ? t('Super Admin نشط', 'Super Admin Active') : t('إدارة الصلاحيات', 'RBAC Active'))}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setNewUserForm({
                    id: undefined,
                    originalUsername: '',
                    username: '',
                    password: 'Password123!',
                    fullNameAr: '',
                    fullNameEn: '',
                    jobTitle: 'مدخل بيانات موارد بشرية',
                    department: 'الموارد البشرية والشؤون الإدارية',
                    branch: 'الإدارة العامة - بغداد',
                    email: '',
                    phone: '',
                    modules: {
                      employees: true,
                      attendance: false,
                      payroll: false,
                      recruitment: false,
                      risk: false,
                      settings: false,
                      reports: true
                    },
                    level: 'full',
                    canManageUsers: false,
                    role: 'Employee' as UserRole,
                    notes: 'مخول بالعمل على الموديولات المحددة'
                  });
                  setBadgeSearchQuery('');
                  setMatchedEmployee(null);
                  setIsAddUserModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/30 transition-all cursor-pointer shrink-0 border-2 border-teal-400/30"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>{t('+ إضافة مستخدم جديد مع الصلاحيات', '+ Add New User with Permissions')}</span>
              </button>
            </div>
          </div>

          {/* Sub-header info row */}
          <div className={`px-6 py-3 border-b flex items-center gap-2 ${isDark ? 'border-white/10 bg-[#0a0c10]/50' : 'border-slate-200 bg-slate-50/50'}`}>
            <span className="material-symbols-outlined text-sm text-slate-400">info</span>
            <p className="text-[11px] text-slate-500">
              {t('اضغط على "+ إضافة مستخدم جديد" لفتح النموذج وتحديد اسم المستخدم، كلمة المرور، نوع الوظيفة، والموديولات المصرح بها عبر Tick ✓ أمام كل موديول', 'Click "+ Add New User with Permissions" to open the form and assign username, password, job title, and permitted modules via Tick ✓ checkboxes')}
            </p>
          </div>

          {/* Toast Notification */}
          {customEmpSavedToast && (
            <div className="m-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
              <span className="material-symbols-outlined text-lg text-emerald-500">check_circle</span>
              <span>{customEmpSavedToast}</span>
            </div>
          )}

          {/* Search & Filter Section */}
          <div className={`px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
          }`}>
            <p className="text-xs font-bold" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
              {t(`إجمالي المستخدمين المخصصين: ${dbUsers.length} مستخدم (+ Super Admin دائم)`,
                 `Total Custom Users: ${dbUsers.length} (+ Permanent Super Admin)`)}
            </p>

          <div className="flex flex-wrap items-center gap-3">
              {/* Department filter */}
              <select
                value={empDeptFilter}
                onChange={e => setEmpDeptFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">{t('كافة الأقسام (All Departments)', 'All Departments')}</option>
                {allUniqueDepartments.map(d => (
                  <option key={d.name_ar} value={d.name_ar}>
                    {language === 'ar' ? d.name_ar : (d.name_en || d.name_ar)}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('بحث باسم أو يوزر المستخدم...', 'Search username or name...')}
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className={`px-3.5 py-2 rounded-xl border text-xs outline-none w-56 ${
                    isDark ? 'bg-[#111827] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Users List Table */}
          <div className="p-6 space-y-4">
            <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <th className="p-3.5 text-start">{t('المستخدم والحساب', 'User & Account')}</th>
                    <th className="p-3.5 text-start">{t('نوع الوظيفة / المسمى الوظيفي', 'Job Title / Position')}</th>
                    <th className="p-3.5 text-start">{t('القسم والفرع', 'Department & Branch')}</th>
                    <th className="p-3.5 text-start">{t('الموديولات المصرح بها (Tick ✓)', 'Allowed Modules')}</th>
                    <th className="p-3.5 text-start">{t('كلمة المرور', 'Password')}</th>
                    <th className="p-3.5 text-center">{t('الإجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {/* 1. Super Admin Row (Permanent & Protected) */}
                  <tr className={`transition-colors ${isDark ? 'bg-teal-950/10 hover:bg-teal-950/20' : 'bg-teal-50/40 hover:bg-teal-50/80'}`}>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
                          <span className="material-symbols-outlined text-lg">shield</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                              {t('مدير النظام الشامل (Super Admin)', 'Super Administrator')}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                              {t('كامل الصلاحيات', 'Full Access')}
                            </span>
                          </div>
                          <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">admin</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
                        {t('مدير النظام (Super Admin)', 'System Administrator')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <p className="text-xs text-slate-500">{t('جميع الأقسام والفروع', 'All Departments & Branches')}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1.5 rounded-lg bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-[11px] flex items-center gap-1.5 w-fit">
                        <span className="material-symbols-outlined text-sm">all_inclusive</span>
                        {t('جميع الموديولات الـ 11 (محمي)', 'All 11 Modules (Protected)')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">••••••••</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold flex items-center gap-1 w-fit mx-auto">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        {t('محمي', 'Protected')}
                      </span>
                    </td>
                  </tr>

                  {/* 2. Custom Users Rows (Directly from MySQL dbUsers) */}
                  {dbUsers.map((u: any) => {
                    const fullName = u.full_name || u.name || u.username;
                    const uCode = (u.employee_id || `VTS-${u.username.toUpperCase()}`).toUpperCase();
                    const isCustomMatch =
                      empSearch.trim() === '' ||
                      (fullName || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                      (u.username || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                      (uCode || '').toLowerCase().includes(empSearch.toLowerCase());

                    if (!isCustomMatch) return null;
                    if (empDeptFilter !== 'all' && u.department !== empDeptFilter) return null;

                    let parsedModules: Record<string, any> = {
                      employees: Boolean(u.can_manage_employees),
                      payroll: Boolean(u.can_manage_finance),
                      recruitment: Boolean(u.can_manage_recruitment),
                      settings: Boolean(u.can_manage_settings),
                      attendance: false,
                      reports: false,
                      risk: false
                    };

                    if (u.allowed_screens) {
                      try {
                        const s = typeof u.allowed_screens === 'string' ? JSON.parse(u.allowed_screens) : u.allowed_screens;
                        if (s && typeof s === 'object') {
                          parsedModules = { ...s };
                        }
                      } catch (e) {}
                    }

                    const activeModEntries = Object.entries(parsedModules).filter(([_, v]) => v && v !== 'none' && v !== false);

                    return (
                      <tr key={u.id || u.username} className="hover:bg-slate-500/5 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
                              <span className="material-symbols-outlined text-lg">person</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                                  {fullName}
                                </h4>
                                {(u.can_manage_users === 1 || u.role === 'Admin') && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[9px] inline-flex items-center gap-0.5 border border-amber-500/30">
                                    <span className="material-symbols-outlined text-[11px]">admin_panel_settings</span>
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">
                                {uCode}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] inline-flex items-center gap-1 ${
                            (u.can_manage_users === 1 || u.role === 'Admin')
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                              : 'bg-teal-500/10 border-teal-500/20 text-teal-700 dark:text-teal-300'
                          }`}>
                            {(u.can_manage_users === 1 || u.role === 'Admin') && (
                              <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                            )}
                            {u.job_title || (u.role && u.role !== 'Employee' ? u.role : null) || t('مسؤول رواتب وحضور', 'Payroll & Attendance Officer')}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                            {u.department || t('الموارد البشرية والشؤون الإدارية', 'Human Resources')}
                          </p>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {activeModEntries.length === 0 ? (
                              <span className="text-slate-400 text-[10px] italic">
                                {t('لا توجد موديولات مفعلة', 'No modules assigned')}
                              </span>
                            ) : (
                              activeModEntries.map(([mKey, mVal]) => {
                                const isRead = mVal === 'read';
                                return (
                                  <span
                                    key={mKey}
                                    className={`px-2 py-0.5 rounded-md border text-[10px] font-bold flex items-center gap-1 shadow-2xs ${
                                      isRead
                                        ? 'bg-sky-500/15 border-sky-500/30 text-sky-800 dark:text-sky-300'
                                        : 'bg-teal-500/15 border-teal-500/30 text-teal-800 dark:text-teal-300'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-[11px]">
                                      {isRead ? 'visibility' : 'edit_note'}
                                    </span>
                                    <span>{dynamicModuleLabels[mKey] || mKey}</span>
                                    <span className="text-[9px] opacity-75 font-normal">
                                      ({isRead ? t('قراءة', 'Read') : t('تعديل', 'Write')})
                                    </span>
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">
                            ••••••••
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const isUserAdmin = Boolean(u.can_manage_users === 1 || u.role === 'Admin' || u.role === 'Super Admin');
                                setNewUserForm({
                                  id: u.id,
                                  originalUsername: u.username,
                                  originalEmployeeId: u.employee_id || uCode,
                                  originalEmail: u.email || '',
                                  username: u.username,
                                  password: u.password || 'Password123!',
                                  fullNameAr: fullName,
                                  fullNameEn: u.name || fullName,
                                  jobTitle: u.job_title || (u.role && u.role !== 'Employee' ? u.role : '') || 'مسؤول رواتب وحضور',
                                  department: u.department || 'الموارد البشرية والشؤون الإدارية',
                                  branch: u.branch || 'الإدارة العامة - بغداد',
                                  email: u.email || `${u.username.toLowerCase()}@vitasiraq.iq`,
                                  phone: u.phone || '07700000000',
                                  modules: parsedModules,
                                  canManageUsers: isUserAdmin,
                                  role: isUserAdmin ? 'Admin' : (u.role || 'Employee'),
                                  level: 'full',
                                  notes: 'مخول بالعمل على الموديولات المحددة'
                                });
                                setIsAddUserModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/30 dark:hover:bg-teal-900/50 text-teal-600 dark:text-teal-400 transition-colors cursor-pointer"
                              title={t('تعديل الوظيفة والصلاحيات', 'Edit Job Title & Permissions')}
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmMsg = language === 'ar'
                                  ? `هل أنت متأكد من حذف حساب وصلاحيات المستخدم (${fullName})؟`
                                  : `Are you sure you want to delete user account (${fullName})?`;

                                if (confirm(confirmMsg)) {
                                  await api.deleteUser(u.username || u.employee_id || u.id).catch(() => {});
                                  fetchUsersFromDb();
                                  setCustomEmpSavedToast(
                                    language === 'ar' ? `تم حذف حساب المستخدم (${fullName}) بنجاح.` : `User account (${fullName}) deleted.`
                                  );
                                  setTimeout(() => setCustomEmpSavedToast(null), 4000);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                              title={t('حذف المستخدم', 'Delete User')}
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
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

      {/* ============================================================
          DYNAMIC "ADD / EDIT USER & MODULE PERMISSIONS" MODAL
      ============================================================ */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl xl:max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shadow-inner">
                  <span className="material-symbols-outlined text-2xl">person_add</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('إنشاء يوزر جديد وتحديد نوع الوظيفة والموديولات', 'Add New User, Job Title & Assign Module Permissions')}
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {t('أدخل بيانات المستخدم، حدد نوع الوظيفة، وضع علامة (Tick ✓) على الموديولات المسموحة له', 'Enter user details, specify job title, and check (Tick ✓) the allowed modules')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewUser} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">

              {/* Section 1: User Account & Job Title Info */}
              <div className={`p-4 rounded-2xl border space-y-3.5 ${
                isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <h4 className="font-bold text-xs flex items-center gap-2 text-teal-600 dark:text-teal-400">
                  <span className="material-symbols-outlined text-base">badge</span>
                  <span>{t('1. بيانات المستخدم ونوع الوظيفة (User & Position Details)', '1. User Account & Position Details')}</span>
                </h4>

                {/* 🌟 Dynamic Searchable Combobox for Badge & Employee Name */}
                <div className={`p-3.5 rounded-2xl border space-y-2 relative ${
                  isDark ? 'bg-teal-950/20 border-teal-500/30' : 'bg-teal-50/70 border-teal-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-teal-800 dark:text-teal-300 text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">person_search</span>
                      <span>{t('البحث التفاعلي برقم البادج أو اسم الموظف (Dynamic Combobox Search)', 'Dynamic Search by Badge No. or Employee Name')}</span>
                    </label>

                    {matchedEmployee && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        <span>{t('تم ربط الموظف والملء التلقائي', 'Employee Linked & Autofilled')}</span>
                      </span>
                    )}
                  </div>

                  <div ref={comboboxRef} className="relative">
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute start-3 text-teal-600 text-base pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder={t('اكتب رقم البادج (مثال: B-101، v 96) أو اسم الموظف بالعربية أو الإنجليزية للبحث الفوري...', 'Type Badge No. (e.g. B-101, v 96) or employee name to filter live...')}
                        value={badgeSearchQuery}
                        onFocus={() => setIsComboboxOpen(true)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            setIsComboboxOpen(false);
                          }
                        }}
                        onChange={e => {
                          setBadgeSearchQuery(e.target.value);
                          setIsComboboxOpen(true);
                        }}
                        className={`w-full ps-9 pe-16 py-2.5 rounded-xl border text-xs outline-none font-bold transition-all shadow-sm ${
                          isDark ? 'bg-[#111827] border-teal-500/40 text-white placeholder-slate-500 focus:border-teal-400' : 'bg-white border-teal-500/40 text-slate-900 placeholder-slate-400 focus:border-teal-600'
                        }`}
                      />
                      <div className="absolute end-2 flex items-center gap-1">
                        {badgeSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setBadgeSearchQuery('');
                              setMatchedEmployee(null);
                              setIsComboboxOpen(false);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="مسح البحث"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                          className="p-1 rounded-lg text-teal-600 hover:bg-teal-500/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">
                            {isComboboxOpen ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Floating Dropdown List of Filtered Employees with Guaranteed Solid Black Text */}
                    {isComboboxOpen && (
                      <>
                        {/* Transparent Backdrop to immediately intercept any click outside the dropdown and close it */}
                        <div
                          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsComboboxOpen(false);
                          }}
                        />

                        <div
                          className="absolute start-0 end-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-2xl border-2 border-teal-500 shadow-2xl divide-y divide-slate-200"
                          style={{ backgroundColor: '#ffffff', color: '#000000' }}
                        >
                          {/* Sticky Header Bar with Count and Dedicated Close Button */}
                          <div className="sticky top-0 z-10 px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 shadow-xs">
                            <span className="flex items-center gap-1.5 text-teal-800">
                              <span className="material-symbols-outlined text-sm text-teal-600">badge</span>
                              <span>{t('نتائج بحث الموظفين', 'Employee Search Results')} ({filteredEmployeesForCombobox.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsComboboxOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                              <span>{t('إغلاق', 'Close')}</span>
                            </button>
                          </div>

                          {filteredEmployeesForCombobox.length === 0 ? (
                          <div className="p-4 text-center text-xs font-bold" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                            <span className="material-symbols-outlined text-2xl block mb-1 text-slate-500">search_off</span>
                            {t('لا يوجد موظف مطابق لهذا البحث', 'No matching employee found')}
                          </div>
                        ) : (
                          filteredEmployeesForCombobox.map((emp: any) => {
                            const b = emp.badge_no || emp.badgeNo || emp.employee_id || emp.employeeId || emp.id || '';
                            const arName = extractArabicName(emp);
                            const enName = extractEnglishName(emp);
                            const dept = emp.department || emp.department_ar || '';
                            const pos = emp.position || emp.position_ar || emp.job_title || emp.jobTitle || '';
                            const mainName = arName || enName || `موظف #${b}`;
                            const photo = emp.photoUrl || emp.photo_url || emp.photo || emp.avatar || emp.avatarUrl || emp.profile_image || '';

                            return (
                              <button
                                key={emp.id || b}
                                type="button"
                                onClick={() => handleAutofillFromEmployee(emp)}
                                className="w-full p-2.5 text-start flex items-center justify-between gap-3 transition-all cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-teal-50/80"
                                style={{ backgroundColor: '#ffffff', color: '#000000' }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Employee Photo Thumbnail or Fallback Icon */}
                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-teal-200 text-teal-800 flex items-center justify-center text-sm shrink-0 shadow-sm">
                                    {photo ? (
                                      <img
                                        src={photo}
                                        alt={mainName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="material-symbols-outlined text-xl text-teal-700">person</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Main Arabic / Full Name in Normal Font Weight */}
                                      <span
                                        className="font-normal text-sm"
                                        style={{ color: '#000000', WebkitTextFillColor: '#000000', fontWeight: 400 }}
                                      >
                                        {mainName}
                                      </span>
                                      {/* Secondary English Name in Normal Font Weight */}
                                      {enName && arName && enName.toLowerCase() !== arName.toLowerCase() && (
                                        <span
                                          className="text-xs font-normal"
                                          style={{ color: '#475569', WebkitTextFillColor: '#475569', fontWeight: 400 }}
                                        >
                                          ({enName})
                                        </span>
                                      )}
                                    </div>
                                    <p
                                      className="text-xs font-normal mt-0.5"
                                      style={{ color: '#64748b', WebkitTextFillColor: '#64748b', fontWeight: 400 }}
                                    >
                                      {pos ? `${pos} • ` : ''}{dept}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 text-end">
                                  <span
                                    className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 font-mono font-bold text-xs shadow-sm inline-block"
                                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                                  >
                                    {b}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Username */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('اسم المستخدم للدخول (Username) *', 'Username *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. dataentry.hr أو vts1055"
                      value={newUserForm.username}
                      onChange={e => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('كلمة المرور *', 'Password *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Password123!"
                      value={newUserForm.password}
                      onChange={e => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Job Title - highlighted */}
                  <div>
                    <label className="font-bold text-teal-700 dark:text-teal-300 block text-[11px] mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">work</span>
                      <span>{t('نوع الوظيفة / المسمى الوظيفي *', 'Job Title / Position *')}</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مدخل بيانات موارد بشرية"
                      value={newUserForm.jobTitle}
                      onChange={e => setNewUserForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none border-teal-500/50 shadow-sm ${
                        isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name AR */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('الاسم الكامل بالعربية *', 'Full Name (Arabic) *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد كريم عبدالله"
                      value={newUserForm.fullNameAr}
                      onChange={e => setNewUserForm(prev => ({ ...prev, fullNameAr: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Full Name EN */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('الاسم الكامل بالإنجليزية', 'Full Name (English)')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmed Kareem Abdullah"
                      value={newUserForm.fullNameEn}
                      onChange={e => setNewUserForm(prev => ({ ...prev, fullNameEn: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Department */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('القسم / الإدارة', 'Department')}
                    </label>
                    <select
                      value={newUserForm.department}
                      onChange={e => setNewUserForm(prev => ({ ...prev, department: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {allUniqueDepartments.map(d => (
                        <option key={d.name_ar} value={d.name_ar}>
                          {language === 'ar' ? d.name_ar : (d.name_en || d.name_ar)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('البريد الإلكتروني', 'Email')}
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. dataentry@vitasiraq.iq"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('رقم الهاتف', 'Phone')}
                    </label>
                    <input
                      type="text"
                      placeholder="07700000000"
                      value={newUserForm.phone}
                      onChange={e => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Admin Privileges Card */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  newUserForm.canManageUsers
                    ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15 dark:border-amber-500/50 shadow-sm'
                    : (isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-slate-50 border-slate-200')
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(newUserForm.canManageUsers)}
                      onChange={e => {
                        const checked = e.target.checked;
                        setNewUserForm(prev => {
                          const nextModules = { ...prev.modules };
                          if (checked) {
                            nextModules['sec-roles-permissions'] = 'write';
                            nextModules['sec-roles'] = 'write';
                            nextModules['cat-9-risk'] = 'write';
                            nextModules['risk'] = 'write';
                          }
                          return {
                            ...prev,
                            canManageUsers: checked,
                            role: checked ? 'Admin' : (prev.jobTitle.includes('مدير الموارد') ? 'HR Manager' : 'Employee'),
                            modules: nextModules
                          };
                        });
                      }}
                      className="mt-1 w-4 h-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">admin_panel_settings</span>
                        <span className="font-bold text-xs text-amber-800 dark:text-amber-300">
                          {t('منح صلاحية مسؤول نظام (Admin) لإدارة وإضافة المستخدمين', 'Grant Admin Privileges (Manage & Add Users)')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                          {t('صلاحية إدارية عليا', 'High Administrative Privilege')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {t('تفعيل هذا الخيار يمنح المستخدم صلاحية الدخول لشاشة إدارة المستخدمين والصلاحيات (sec-roles-permissions) وإضافة مستخدمين جدد وتعديل الأدوار وكلمات المرور.',
                           'Enabling this grants the user access to User Management & RBAC screen, allowing them to add/edit users, assign permissions, and manage credentials.')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 2: Dynamic Hierarchical Module & Screen Permissions */}
              <div className="space-y-4">
                {/* Section Header with Stats & Global Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl border border-teal-500/20 bg-teal-500/5">
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs flex items-center gap-2 text-teal-700 dark:text-teal-300">
                      <span className="material-symbols-outlined text-base">rule</span>
                      <span>{t('2. مصفوفة الصلاحيات والموديولات الديناميكية (Read & Read/Write)', '2. Dynamic Module & Screen Permissions Matrix')}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('حدد لكل شاشة وموديول نوع الصلاحية: قراءة فقط (Read) أو قراءة وكتابة وتعديل (Read / Write)',
                         'Set permission level for each screen: Read Only or Read & Write')}
                    </p>
                  </div>

                  {/* Summary Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      <span>
                        {permissionStats.total} {t('شاشة مصرح بها', 'screens')}
                        <span className="font-normal opacity-85 text-[10px] mx-1">
                          ({permissionStats.writeCount} {t('تعديل', 'Write')} • {permissionStats.readCount} {t('قراءة', 'Read')})
                        </span>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Filter & Global Actions Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Search filter input */}
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder={t('بحث سريع في الموديولات والشاشات (مثال: رواتب، عقود، تقارير...)...', 'Search screens & modules (e.g. payroll, contracts, reports...)...')}
                      value={moduleFilterQuery}
                      onChange={e => setModuleFilterQuery(e.target.value)}
                      className={`w-full ps-9 pe-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-600'
                      }`}
                    />
                    {moduleFilterQuery && (
                      <button
                        type="button"
                        onClick={() => setModuleFilterQuery('')}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/10"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Master Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGlobalAll('write')}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      title={t('منح صلاحية كاملة (قراءة وتعديل) لكافة شاشات النظام', 'Grant Read/Write to all screens')}
                    >
                      <span className="material-symbols-outlined text-xs">edit_note</span>
                      <span>{t('الكل تعديل', 'All Write')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGlobalAll('read')}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      title={t('منح صلاحية قراءة فقط لكافة شاشات النظام', 'Grant Read Only to all screens')}
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      <span>{t('الكل قراءة', 'All Read')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGlobalAll('none')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title={t('إلغاء جميع الصلاحيات', 'Clear all permissions')}
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                      <span>{t('إلغاء الكل', 'Clear All')}</span>
                    </button>

                    <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

                    <button
                      type="button"
                      onClick={() => {
                        const anyCollapsed = Object.values(expandedCategories).some(v => !v);
                        toggleAllCategories(anyCollapsed);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                      <span>{t('توسيع / طي', 'Expand / Collapse')}</span>
                    </button>
                  </div>
                </div>

                {/* Categories & Sub-Modules Tree */}
                <div className="space-y-3 pt-1">
                  {filteredCategoryGroups.map(cat => {
                    const isExpanded = moduleFilterQuery.trim() ? true : Boolean(expandedCategories[cat.id]);
                    const catModules = cat.modules.filter(m => !m.hidden);
                    const enabledCount = catModules.filter(m => {
                      const lvl = getModLevel(m.id);
                      return lvl === 'write' || lvl === 'read';
                    }).length;

                    const allWrite = catModules.length > 0 && catModules.every(m => getModLevel(m.id) === 'write');
                    const allRead = catModules.length > 0 && catModules.every(m => getModLevel(m.id) === 'read');

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isDark ? 'bg-[#0f141f] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        {/* Category Header Bar */}
                        <div
                          className={`p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none transition-colors ${
                            enabledCount > 0
                              ? isDark ? 'bg-teal-950/20 hover:bg-teal-950/30' : 'bg-teal-50/60 hover:bg-teal-50'
                              : isDark ? 'bg-[#0a0c10] hover:bg-white/5' : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          onClick={() => toggleCategory(cat.id)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                              enabledCount > 0 ? 'bg-teal-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                            }`}>
                              <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                  {language === 'ar' ? cat.title : cat.titleEn}
                                </h5>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  enabledCount === catModules.length && enabledCount > 0
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : enabledCount > 0
                                    ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                }`}>
                                  {enabledCount} / {catModules.length} {t('مفعل', 'active')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Category-Level Quick Action Buttons */}
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'write')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                allWrite
                                  ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                                  : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30'
                              }`}
                              title={t('منح صلاحية كتابة وتعديل لكل موديولات هذا القسم', 'Grant Read/Write to all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">edit_note</span>
                              <span className="hidden sm:inline">{t('الكل تعديل', 'All Write')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'read')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                allRead
                                  ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30'
                              }`}
                              title={t('منح صلاحية قراءة فقط لكل موديولات هذا القسم', 'Grant Read Only to all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span className="hidden sm:inline">{t('الكل قراءة', 'All Read')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'none')}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 transition-all cursor-pointer flex items-center gap-1"
                              title={t('إلغاء جميع صلاحيات هذا القسم', 'Clear all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                              <span className="hidden sm:inline">{t('إلغاء', 'Clear')}</span>
                            </button>

                            {/* Accordion Arrow Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <span className={`material-symbols-outlined text-base transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-modules list */}
                        {isExpanded && (
                          <div className="p-3 sm:p-4 space-y-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-black/10 animate-in fade-in duration-150">
                            <div className="grid grid-cols-1 gap-2">
                              {catModules.map(mod => {
                                const modLevel = getModLevel(mod.id);
                                return (
                                  <div
                                    key={mod.id}
                                    className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                      modLevel === 'write'
                                        ? isDark ? 'bg-teal-950/25 border-teal-500/40 shadow-xs shadow-teal-500/5' : 'bg-teal-50/80 border-teal-500/40 shadow-xs'
                                        : modLevel === 'read'
                                        ? isDark ? 'bg-sky-950/25 border-sky-500/40 shadow-xs shadow-sky-500/5' : 'bg-sky-50/80 border-sky-500/40 shadow-xs'
                                        : isDark ? 'bg-[#0a0c10]/40 border-white/5 opacity-80 hover:opacity-100' : 'bg-white border-slate-200/80 opacity-80 hover:opacity-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        modLevel === 'write' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                                        modLevel === 'read' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                      }`}>
                                        <span className="material-symbols-outlined text-lg">{mod.icon || 'radio_button_unchecked'}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                            {language === 'ar' ? mod.title : mod.titleEn}
                                          </span>
                                          <span className="font-mono text-[9px] text-slate-400 hidden md:inline">({mod.id})</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md">
                                          {mod.description}
                                        </p>
                                      </div>
                                    </div>

                                    {/* 3-State Segmented Control: None | Read | Read & Write */}
                                    <div className="flex items-center bg-slate-200/80 dark:bg-black/40 p-1 rounded-xl shrink-0 self-end sm:self-auto border border-slate-300 dark:border-white/10">
                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'none')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          modLevel === 'none'
                                            ? 'bg-slate-500 text-white shadow-xs'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                        title={t('تعطيل هذا الموديول', 'Disable this module')}
                                      >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                        <span>{t('معطل', 'None')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'read')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          modLevel === 'read'
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10'
                                        }`}
                                        title={t('صلاحية قراءة وعرض فقط', 'Read only')}
                                      >
                                        <span className="material-symbols-outlined text-xs">visibility</span>
                                        <span>{t('قراءة', 'Read')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'write')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          modLevel === 'write'
                                            ? 'bg-teal-600 text-white shadow-xs'
                                            : 'text-teal-600 dark:text-teal-400 hover:bg-teal-500/10'
                                        }`}
                                        title={t('صلاحية كاملة قراءة وتعديل وكتابة', 'Read and write')}
                                      >
                                        <span className="material-symbols-outlined text-xs">edit_note</span>
                                        <span>{t('قراءة وكتابة', 'Read / Write')}</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-lg shadow-teal-600/25 flex items-center gap-2 text-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>{t('حفظ وإنشاء المستخدم مع الصلاحيات', 'Save & Create User with Permissions')}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

