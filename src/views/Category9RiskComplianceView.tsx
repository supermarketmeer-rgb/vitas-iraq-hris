import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { UserRole } from '../types';
import { api } from '../api/client';

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
    t
  } = useApp();

  const isDark = theme === 'dark';

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
  const [newUserForm, setNewUserForm] = useState({
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
    level: 'full' as 'full' | 'read',
    notes: 'مسؤول عن إدخال وتحديث بيانات الموظفين الأساسية، العقود، والمستندات في قسم الموارد البشرية'
  });
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

  // Dynamically derive departments from Settings API & Employees table
  const [departmentsList, setDepartmentsList] = useState<{ id: string | number; name_ar: string; name_en: string }[]>([]);

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

  // Handler to create a new user account & grant permissions immediately
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.fullNameAr.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال اسم المستخدم والاسم الكامل بالعربية' : 'Please enter username and Arabic full name');
      return;
    }

    const cleanUsername = newUserForm.username.trim();
    const empCode = cleanUsername.toUpperCase().startsWith('VTS') ? cleanUsername.toUpperCase() : `VTS-${cleanUsername.toUpperCase()}`;
    
    try {
      // 1. Create employee in system
      await addEmployee({
        employeeId: empCode,
        badgeNo: empCode,
        fullNameAr: newUserForm.fullNameAr.trim(),
        fullNameEn: newUserForm.fullNameEn.trim() || newUserForm.fullNameAr.trim(),
        fullName: newUserForm.fullNameAr.trim(),
        name_ar: newUserForm.fullNameAr.trim(),
        name_en: newUserForm.fullNameEn.trim() || newUserForm.fullNameAr.trim(),
        jobTitle: newUserForm.jobTitle.trim(),
        position: newUserForm.jobTitle.trim(),
        department: newUserForm.department,
        branch: newUserForm.branch,
        location: newUserForm.branch,
        email: newUserForm.email.trim() || `${cleanUsername.toLowerCase()}@vitasiraq.iq`,
        phone: newUserForm.phone.trim() || '07700000000',
        hireDate: new Date().toISOString().split('T')[0],
        status: 'Active',
        employmentType: 'Full-Time',
        basicSalary: 950000
      });

      // 2. Save credentials for login
      try {
        const existingUsersRaw = localStorage.getItem('vitas_custom_users') || '{}';
        const existingUsers = JSON.parse(existingUsersRaw);
        existingUsers[cleanUsername.toLowerCase()] = {
          username: cleanUsername,
          password: newUserForm.password,
          name: newUserForm.fullNameAr.trim(),
          role: 'Employee',
          employeeId: empCode
        };
        localStorage.setItem('vitas_custom_users', JSON.stringify(existingUsers));
      } catch (err) {
        console.error(err);
      }

      // 3. Save delegated module permissions
      const updatedDelegations = {
        ...savedEmpDelegations,
        [empCode]: {
          employeeId: empCode,
          employeeName: newUserForm.fullNameAr.trim(),
          employeeNameEn: newUserForm.fullNameEn.trim() || newUserForm.fullNameAr.trim(),
          department: newUserForm.department,
          jobTitle: newUserForm.jobTitle.trim(),
          modules: newUserForm.modules,
          level: newUserForm.level,
          notes: newUserForm.notes,
          grantedBy: currentUser?.name || 'Super Admin',
          grantedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        }
      };
      setSavedEmpDelegations(updatedDelegations);
      localStorage.setItem('vitas_custom_employee_permissions', JSON.stringify(updatedDelegations));

      // 4. Select this user and feedback
      setSelectedEmpId(empCode);
      setIsAddUserModalOpen(false);
      setCustomEmpSavedToast(
        language === 'ar'
          ? `تم إنشاء حساب المستخدم (${newUserForm.fullNameAr}) وتفويض صلاحياته بنجاح!`
          : `User account (${newUserForm.fullNameEn || newUserForm.fullNameAr}) created with assigned permissions!`
      );
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

        {/* Quick Module Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {[
            { id: 'risk-governance', label: t('الحوكمة', 'Governance'), icon: 'balance' },
            { id: 'risk-audit-reports', label: t('التقارير', 'Reports'), icon: 'assessment' },
            { id: 'risk-assessment', label: t('المخاطر', 'Risks'), icon: 'warning' },
            { id: 'risk-policies', label: t('السياسات', 'Policies'), icon: 'policy' },
            { id: 'sec-roles-permissions', label: t('إدارة المستخدمين', 'User Management'), icon: 'manage_accounts' },
            { id: 'sec-audit-logs', label: t('سجل الأمان', 'Audit Logs'), icon: 'history' },
            { id: 'sec-general-settings', label: t('الأمان', 'Security'), icon: 'security' },
            { id: 'sec-api-keys', label: t('مفاتيح API', 'API Keys'), icon: 'key' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveModuleId(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                activeModuleId === tab.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
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
                <span>{t('Super Admin نشط', 'Super Admin Active')}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setNewUserForm({
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
                    notes: 'مخول بالعمل على الموديولات المحددة'
                  });
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
              {t(`إجمالي المستخدمين المخصصين: ${Object.keys(savedEmpDelegations).length} مستخدم (+ Super Admin دائم)`,
                 `Total Custom Users: ${Object.keys(savedEmpDelegations).length} (+ Permanent Super Admin)`)}
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

                  {/* 2. Custom Users Rows */}
                  {Object.entries(savedEmpDelegations).map(([empKey, d]: [string, any]) => {
                    const isCustomMatch =
                      empSearch.trim() === '' ||
                      (d.employeeName || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                      (d.employeeNameEn || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                      (d.employeeId || '').toLowerCase().includes(empSearch.toLowerCase());

                    if (!isCustomMatch) return null;
                    if (empDeptFilter !== 'all' && d.department !== empDeptFilter) return null;

                    // Module labels mapping
                    const moduleLabels: Record<string, string> = {
                      employees: t('الموظفون', 'Employees'),
                      attendance: t('الحضور', 'Attendance'),
                      payroll: t('الرواتب', 'Payroll'),
                      recruitment: t('التوظيف', 'Recruitment'),
                      reports: t('التقارير', 'Reports'),
                      risk: t('المخاطر', 'Risk'),
                      settings: t('الإعدادات', 'Settings'),
                      'cat-3-emp': t('الموظفون', 'Employees'),
                      'cat-4-leave': t('الحضور', 'Attendance'),
                      'cat-5-payroll': t('الرواتب', 'Payroll'),
                      'cat-6-recruit': t('التوظيف', 'Recruitment'),
                      'cat-7-perf': t('الأداء', 'Performance'),
                      'cat-8-assets': t('الأصول', 'Assets'),
                      'cat-9-archive': t('الأرشيف', 'Archive'),
                      'cat-9-risk': t('المخاطر', 'Risk'),
                      'cat-10-sys': t('التقارير', 'Reports'),
                      'cat-2-dash': t('لوحة القيادة', 'Dashboard'),
                      'cat-12-support': t('الدعم', 'Support'),
                    };

                    const activeModEntries = Object.entries(d.modules || {}).filter(([_, v]) => Boolean(v));

                    return (
                      <tr key={empKey} className="hover:bg-slate-500/5 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
                              <span className="material-symbols-outlined text-lg">person</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                                {language === 'ar' ? (d.employeeName || d.employeeNameEn) : (d.employeeNameEn || d.employeeName)}
                              </h4>
                              <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">
                                {d.employeeId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-[11px] inline-block">
                            {d.jobTitle || t('موظف موارد بشرية', 'HR Specialist')}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                            {d.department || t('الموارد البشرية', 'Human Resources')}
                          </p>
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {activeModEntries.length === 0 ? (
                              <span className="text-slate-400 text-[10px] italic">
                                {t('لا توجد موديولات مفعلة', 'No modules assigned')}
                              </span>
                            ) : (
                              activeModEntries.map(([mKey]) => (
                                <span
                                  key={mKey}
                                  className="px-2 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-[10px] font-bold flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[11px]">check</span>
                                  <span>{moduleLabels[mKey] || mKey}</span>
                                </span>
                              ))
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
                                setNewUserForm({
                                  username: d.employeeId,
                                  password: 'Password123!',
                                  fullNameAr: d.employeeName || '',
                                  fullNameEn: d.employeeNameEn || '',
                                  jobTitle: d.jobTitle || 'مدخل بيانات موارد بشرية',
                                  department: d.department || 'الموارد البشرية والشؤون الإدارية',
                                  branch: 'الإدارة العامة - بغداد',
                                  email: `${d.employeeId.toLowerCase()}@vitasiraq.iq`,
                                  phone: '07700000000',
                                  modules: d.modules || {},
                                  level: d.level || 'full',
                                  notes: d.notes || ''
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
                              onClick={() => {
                                const confirmMsg = language === 'ar'
                                  ? `هل أنت متأكد من حذف حساب وصلاحيات المستخدم (${d.employeeName})؟`
                                  : `Are you sure you want to delete user account (${d.employeeNameEn || d.employeeName})?`;

                                if (confirm(confirmMsg)) {
                                  const updated = { ...savedEmpDelegations };
                                  delete updated[empKey];
                                  setSavedEmpDelegations(updated);
                                  localStorage.setItem('vitas_custom_employee_permissions', JSON.stringify(updated));

                                  try {
                                    const cUsersRaw = localStorage.getItem('vitas_custom_users');
                                    if (cUsersRaw) {
                                      const cUsers = JSON.parse(cUsersRaw);
                                      delete cUsers[empKey.toLowerCase()];
                                      delete cUsers[d.employeeId.toLowerCase()];
                                      localStorage.setItem('vitas_custom_users', JSON.stringify(cUsers));
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }

                                  setCustomEmpSavedToast(
                                    language === 'ar' ? `تم حذف حساب المستخدم (${d.employeeName}) بنجاح.` : `User account (${d.employeeName}) deleted.`
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
          <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
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
              </div>

              {/* Section 2: Quick Presets */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[11px] font-bold text-slate-500 self-center">{t('قوالب سريعة:', 'Quick Presets:')}</span>
                <button
                  type="button"
                  onClick={() => setNewUserForm(prev => ({
                    ...prev,
                    jobTitle: 'مدخل بيانات الموارد البشرية',
                    modules: { employees: true, attendance: false, payroll: false, recruitment: false, risk: false, settings: false, reports: true }
                  }))}
                  className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold hover:bg-blue-500/20 transition-all cursor-pointer"
                >
                  📋 {t('مدخل بيانات الموارد البشرية', 'HR Data Entry')}
                </button>
                <button
                  type="button"
                  onClick={() => setNewUserForm(prev => ({
                    ...prev,
                    jobTitle: 'مسؤول رواتب وحضور',
                    modules: { employees: true, attendance: true, payroll: true, recruitment: false, risk: false, settings: false, reports: true }
                  }))}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/20 transition-all cursor-pointer"
                >
                  💰 {t('مسؤول رواتب وحضور', 'Payroll & Attendance Officer')}
                </button>
                <button
                  type="button"
                  onClick={() => setNewUserForm(prev => ({
                    ...prev,
                    jobTitle: 'مسؤول التوظيف',
                    modules: { employees: true, attendance: false, payroll: false, recruitment: true, risk: false, settings: false, reports: true }
                  }))}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-[11px] font-bold hover:bg-purple-500/20 transition-all cursor-pointer"
                >
                  🎯 {t('مسؤول التوظيف', 'Recruitment Officer')}
                </button>
              </div>

              {/* Section 3: Module Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <span className="material-symbols-outlined text-base">checklist</span>
                    <span>{t('2. الموديولات والصلاحيات الممنوحة (Tick ✓)', '2. Granted Module Permissions (Tick ✓)')}</span>
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserForm(prev => ({
                        ...prev,
                        modules: { employees: true, attendance: true, payroll: true, recruitment: true, risk: true, settings: true, reports: true }
                      }))}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold hover:bg-teal-500/20 cursor-pointer"
                    >
                      ✓ {t('تحديد الكل', 'Select All')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserForm(prev => ({
                        ...prev,
                        modules: { employees: false, attendance: false, payroll: false, recruitment: false, risk: false, settings: false, reports: false }
                      }))}
                      className="px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 text-[10px] font-bold hover:bg-slate-500/20 cursor-pointer"
                    >
                      ✗ {t('إلغاء الكل', 'Clear All')}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'employees', icon: 'group', nameAr: 'إدارة الموظفين والعقود', nameEn: 'Employee Data & Contracts', descAr: 'إدخال وتحديث البيانات الأساسية، العقود، والملفات', descEn: 'Employee master files & contracts' },
                    { key: 'attendance', icon: 'schedule', nameAr: 'الحضور والدوام والإجازات', nameEn: 'Leaves & Attendance', descAr: 'حركات الدوام، التايم شيت، والبصمات', descEn: 'Attendance, timesheets, and leave logs' },
                    { key: 'payroll', icon: 'payments', nameAr: 'الرواتب والتعويضات', nameEn: 'Payroll & Compensation', descAr: 'مسيرات الرواتب، قسائم الدفع، والبدلات', descEn: 'Payroll sheets, payslips, deductions' },
                    { key: 'recruitment', icon: 'work', nameAr: 'التوظيف والاستقطاب (ATS)', nameEn: 'Recruitment & ATS', descAr: 'إدارة الشواغر، المتقدمين، والمقابلات', descEn: 'Job openings and candidate pipeline' },
                    { key: 'reports', icon: 'assessment', nameAr: 'التقارير الديناميكية وتصدير البيانات', nameEn: 'Dynamic Reports & Export', descAr: 'استخراج وتصدير تقارير الموظفين والملفات', descEn: 'Custom reports & data export' },
                    { key: 'risk', icon: 'security', nameAr: 'المخاطر والامتثال والحوكمة', nameEn: 'Risk & Compliance', descAr: 'سجلات المخاطر وسياسات الامتثال', descEn: 'Risk registers and governance policies' },
                    { key: 'settings', icon: 'settings', nameAr: 'إعدادات النظام', nameEn: 'System Settings', descAr: 'إعدادات الأمان، المستخدمين، والنظام', descEn: 'Security, user and system settings' },
                  ].map(mod => {
                    const isChecked = Boolean((newUserForm.modules as any)[mod.key]);
                    return (
                      <label
                        key={mod.key}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          isChecked ? 'bg-teal-500/10 border-teal-500/50' : isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => setNewUserForm(prev => ({
                            ...prev,
                            modules: { ...prev.modules, [mod.key]: e.target.checked }
                          }))}
                          className="accent-teal-600 w-4 h-4 rounded cursor-pointer"
                        />
                        <span className={`material-symbols-outlined text-base ${isChecked ? 'text-teal-500' : 'text-slate-400'}`}>{mod.icon}</span>
                        <div>
                          <span className="font-bold text-xs block">{language === 'ar' ? mod.nameAr : mod.nameEn}</span>
                          <span className="text-[10px] text-slate-400">{language === 'ar' ? mod.descAr : mod.descEn}</span>
                        </div>
                      </label>
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

