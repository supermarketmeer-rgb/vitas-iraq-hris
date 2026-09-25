import { UserProfile } from '../types';

export interface UserEffectivePermissions {
  isSuperAdmin: boolean;
  hasExplicitPerms?: boolean;
  employees: boolean;
  attendance: boolean;
  payroll: boolean;
  recruitment: boolean;
  reports: boolean;
  performance: boolean;
  assets: boolean;
  archive: boolean;
  drivers: boolean;
  risk: boolean;
  settings: boolean;
  support: boolean;
  rawModules?: Record<string, any>;
}

export type PermissionAccessLevel = 'write' | 'read' | 'none';

/**
 * Resolves the accurate effective permissions for the current user across all sources:
 * 1. Super Admin role bypass
 * 2. Fine-grained modulePermissions on UserProfile
 * 3. vitas_custom_employee_permissions in localStorage
 * 4. vitas_custom_users in localStorage
 * 5. can_manage_* flags from database
 * 6. Role-based fallback defaults
 */
export function getUserEffectivePermissions(
  currentUser: UserProfile | null,
  currentRole: string
): UserEffectivePermissions {
  const isSuperAdmin = currentRole === 'Super Admin' || currentUser?.role === 'Super Admin';

  if (isSuperAdmin) {
    return {
      isSuperAdmin: true,
      employees: true,
      attendance: true,
      payroll: true,
      recruitment: true,
      reports: true,
      performance: true,
      assets: true,
      archive: true,
      drivers: true,
      risk: true,
      settings: true,
      support: true,
      rawModules: {}
    };
  }

  // 1. Start with modulePermissions if directly present on currentUser
  let perms: Record<string, any> = { ...(currentUser?.modulePermissions || {}) };

  // Also check if allowed_screens was passed from server or profile
  if ((currentUser as any)?.allowed_screens) {
    try {
      const parsed = typeof (currentUser as any).allowed_screens === 'string'
        ? JSON.parse((currentUser as any).allowed_screens)
        : (currentUser as any).allowed_screens;
      if (parsed && typeof parsed === 'object') {
        perms = { ...perms, ...parsed };
      }
    } catch (e) {}
  }

  // 2. Check local delegation stores if available in browser
  if (typeof window !== 'undefined' && currentUser) {
    try {
      const raw = localStorage.getItem('vitas_custom_employee_permissions');
      if (raw) {
        const map = JSON.parse(raw);
        const userKey = String(currentUser.id || currentUser.employeeId || '').toUpperCase();
        const cleanEmpId = userKey.replace(/[^A-Z0-9]/g, '');
        const cleanUser = String(currentUser.name || currentUser.email || '').toLowerCase();

        const match = map[userKey] || Object.entries(map).find(([k, v]: any) => {
          const pEmpId = String(v?.employeeId || k || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const pName = String(v?.employeeName || '').toLowerCase();
          const pNameEn = String(v?.employeeNameEn || '').toLowerCase();
          const pUsername = String(v?.username || '').toLowerCase();
          return (
            (cleanEmpId && (pEmpId === cleanEmpId || cleanEmpId.includes(pEmpId) || pEmpId.includes(cleanEmpId))) ||
            (pUsername && cleanUser.includes(pUsername)) ||
            (pName && cleanUser.includes(pName)) ||
            (pNameEn && cleanUser.includes(pNameEn))
          );
        })?.[1];

        if (match && match.modules) {
          perms = { ...match.modules, ...perms };
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const rawUsers = localStorage.getItem('vitas_custom_users');
      if (rawUsers && currentUser) {
        const usersMap = JSON.parse(rawUsers);
        const uMatch = Object.values(usersMap).find((u: any) => 
          (u?.username && String(currentUser.email || currentUser.name || '').toLowerCase().includes(String(u.username).toLowerCase())) ||
          (u?.employeeId && String(u.employeeId).toUpperCase() === String(currentUser.employeeId || '').toUpperCase())
        );
        if (uMatch && (uMatch as any).modules) {
          perms = { ...(uMatch as any).modules, ...perms };
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const rawDbUsers = localStorage.getItem('vitas_db_users');
      if (rawDbUsers && currentUser) {
        const dbUsersList = JSON.parse(rawDbUsers);
        if (Array.isArray(dbUsersList)) {
          const curEmail = String(currentUser.email || '').toLowerCase();
          const curUser = String(currentUser.name || '').toLowerCase();
          const curEmpId = String(currentUser.employeeId || currentUser.id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

          const uMatch = dbUsersList.find((u: any) => {
            const uEmail = String(u.email || '').toLowerCase();
            const uName = String(u.full_name || u.name || '').toLowerCase();
            const uUsername = String(u.username || '').toLowerCase();
            const uEmp = String(u.employee_id || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            return (
              (uEmail && (uEmail === curEmail || curEmail.includes(uEmail))) ||
              (uUsername && (uUsername === curUser || curUser.includes(uUsername))) ||
              (uName && (uName === curUser || curUser.includes(uName))) ||
              (curEmpId && uEmp === curEmpId) ||
              (curEmail.includes('hr') && (uUsername === 'hrmanager' || uEmail.includes('hrmanager'))) ||
              (curUser.includes('hr') && (uUsername === 'hrmanager' || uEmail.includes('hrmanager')))
            );
          });

          if (uMatch && uMatch.allowed_screens) {
            try {
              const parsed = typeof uMatch.allowed_screens === 'string'
                ? JSON.parse(uMatch.allowed_screens)
                : uMatch.allowed_screens;
              if (parsed && typeof parsed === 'object') {
                perms = { ...parsed, ...perms };
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 3. Check can_manage_* flags
  const hasCanManageFlags = currentUser && (
    currentUser.can_manage_employees !== undefined ||
    currentUser.can_manage_finance !== undefined ||
    currentUser.can_manage_recruitment !== undefined ||
    currentUser.can_manage_settings !== undefined
  );

  const isAdminRole = currentRole === 'Admin' || 
    currentUser?.role === 'Admin' || 
    currentUser?.can_manage_users === 1;

  const isHRManagerRole = currentRole === 'HR Manager' || 
    currentUser?.role === 'HR Manager' || 
    currentRole === 'مدير الموارد البشرية' ||
    (currentUser?.department && String(currentUser.department).includes('الموارد البشرية') && !['Employee', 'Recruiter'].includes(currentRole)) ||
    (currentUser?.name && String(currentUser.name).includes('مدير الموارد البشرية'));

  const isRecruiterRole = currentRole === 'Recruiter';
  const isDeptHeadRole = currentRole === 'Department Head';
  const isITAdminRole = currentRole === 'IT Admin';
  const isEmployeeRole = currentRole === 'Employee';

  const hasExplicitPerms = Object.keys(perms).length > 0;

  const isAnyActive = (keys: string[]) => {
    return keys.some(k => perms[k] === 'write' || perms[k] === 'read' || perms[k] === true);
  };

  const hasActivePrefix = (prefix: string) => {
    return Object.entries(perms).some(([k, v]) => k.startsWith(prefix) && (v === 'write' || v === 'read' || v === true));
  };

  return {
    isSuperAdmin: false,
    hasExplicitPerms,
    rawModules: perms,
    employees: hasExplicitPerms 
      ? Boolean(isAnyActive(['employees', 'cat-3-emp']) || hasActivePrefix('emp-')) 
      : (hasCanManageFlags ? Boolean(currentUser?.can_manage_employees) : (isHRManagerRole || isDeptHeadRole)),
    
    attendance: hasExplicitPerms 
      ? Boolean(isAnyActive(['attendance', 'cat-4-leave']) || hasActivePrefix('leave-')) 
      : (isHRManagerRole || isDeptHeadRole || isEmployeeRole),
    
    payroll: hasExplicitPerms 
      ? Boolean(isAnyActive(['payroll', 'cat-5-payroll']) || hasActivePrefix('payroll-') || hasActivePrefix('pay-')) 
      : (hasCanManageFlags ? Boolean(currentUser?.can_manage_finance) : false),
    
    recruitment: hasExplicitPerms 
      ? Boolean(isAnyActive(['recruitment', 'cat-6-recruit']) || hasActivePrefix('recruit-')) 
      : (hasCanManageFlags ? Boolean(currentUser?.can_manage_recruitment) : isRecruiterRole),
    
    reports: hasExplicitPerms 
      ? Boolean(isAnyActive(['reports', 'cat-2-dash', 'dashboard', 'sys-dynamic-reports']) || hasActivePrefix('dash-')) 
      : (isHRManagerRole || isITAdminRole),
    
    performance: hasExplicitPerms 
      ? Boolean(isAnyActive(['performance', 'cat-7-perf']) || hasActivePrefix('perf-') || perms.recruitment) 
      : false,
    
    assets: hasExplicitPerms 
      ? Boolean(isAnyActive(['assets', 'cat-8-assets']) || hasActivePrefix('asset-') || hasActivePrefix('doc-')) 
      : false,
    
    archive: hasExplicitPerms 
      ? Boolean(isAnyActive(['archive', 'cat-12-archive', 'cat-9-archive']) || hasActivePrefix('archive-')) 
      : false,
    
    drivers: hasExplicitPerms 
      ? Boolean(isAnyActive(['drivers', 'cat-drivers']) || hasActivePrefix('drivers-')) 
      : isITAdminRole,
    
    risk: hasExplicitPerms 
      ? Boolean(isAnyActive(['risk', 'cat-9-risk']) || hasActivePrefix('risk-') || hasActivePrefix('sec-') || isAdminRole) 
      : (isAdminRole || isITAdminRole),
    
    settings: hasExplicitPerms 
      ? Boolean(isAnyActive(['settings', 'cat-10-sys']) || Object.entries(perms).some(([k, v]) => k.startsWith('sys-') && k !== 'sys-dynamic-reports' && (v === 'write' || v === 'read' || v === true))) 
      : (hasCanManageFlags ? Boolean(currentUser?.can_manage_settings) : isITAdminRole),
    
    support: hasExplicitPerms 
      ? Boolean(isAnyActive(['support', 'cat-11-support', 'cat-12-support']) || hasActivePrefix('supp-') || hasActivePrefix('support-')) 
      : true
  };
}

/**
 * Checks whether a specific module inside a category is permitted for the user.
 */
export function isModuleAuthorized(
  catId: string,
  moduleId: string,
  perms: UserEffectivePermissions,
  currentRole: string
): boolean {
  if (perms.isSuperAdmin) return true;

  // Admin users are always authorized to manage user roles and permissions
  if ((currentRole === 'Admin' || currentRole === 'Super Admin') && (moduleId === 'sec-roles-permissions' || moduleId === 'sec-edit-role')) {
    return true;
  }

  // Category 1: Authentication & Security (login/demo screens) is NEVER shown to regular operational users
  if (catId === 'cat-1-auth' || moduleId.startsWith('auth-')) {
    return false;
  }

  // 1. Direct sub-module level check if explicitly defined in rawModules
  if (perms.rawModules && moduleId in perms.rawModules) {
    const val = perms.rawModules[moduleId];
    if (val === 'write' || val === 'read' || val === true) return true;
    if (val === 'none' || val === false) return false;
  }

  // 2. When explicit granular permissions are configured for this user:
  // Must respect granular sub-modules selection! Never grant unselected screens.
  if (perms.hasExplicitPerms && perms.rawModules) {
    const { resolvedCatId, aliases } = resolveCategoryAndAlias(moduleId, catId);

    // Find all known submodules belonging to this category:
    const siblingModuleIds = Object.entries(MODULE_CATEGORY_MAP)
      .filter(([_, info]) => info.catId === resolvedCatId)
      .map(([mId]) => mId);

    // Did the admin explicitly configure granular sub-modules for this category?
    const hasGranularSubmodules = siblingModuleIds.some(sId => sId in perms.rawModules!);

    if (hasGranularSubmodules) {
      // Since granular sub-modules are configured for this category and this specific moduleId
      // is NOT active in rawModules, it was NOT granted!
      return false;
    }

    // Otherwise, if no granular submodules were ever defined for this category in rawModules (legacy whole-category assignment):
    // Check if the entire category alias was explicitly granted
    const isCategoryExplicitlyGranted = aliases.some(alias => {
      const v = perms.rawModules![alias];
      return v === 'write' || v === 'read' || v === true;
    });

    if (isCategoryExplicitlyGranted) {
      return true;
    }

    return false;
  }

  // 4. Default / Role-based Fallbacks (Only for users without custom explicit permissions)
  // Category 1: Authentication & Security (developer/server only)
  if (catId === 'cat-1-auth') {
    return perms.settings;
  }

  // Category 2: Dashboard & Executive
  if (catId === 'cat-2-dash') {
    if (moduleId === 'sys-dynamic-reports') return perms.reports || perms.employees || perms.payroll;
    if (moduleId === 'dash-exec-1' || moduleId === 'dash-exec-2') return perms.employees || perms.payroll;
    return true; // dash-overview, dash-ess, dash-search are general for default fallback
  }

  // Category 3: Employee Management
  if (catId === 'cat-3-emp') {
    return perms.employees;
  }

  // Category 4: Leaves & Attendance
  if (catId === 'cat-4-leave') {
    if (moduleId === 'leave-biometric-settings' || moduleId === 'leave-db-schema') {
      return perms.settings;
    }
    if (currentRole === 'Employee') {
      return ['dash-ess', 'leave-attendance', 'leave-apply', 'leave-timesheets', 'leave-earned', 'leave-schedule'].includes(moduleId);
    }
    return perms.attendance || (currentRole === 'HR Manager');
  }

  // Category 5: Payroll & Compensation
  if (catId === 'cat-5-payroll') {
    if (currentRole === 'Employee' && !perms.payroll) {
      return moduleId === 'payroll-payslip';
    }
    return perms.payroll;
  }

  // Drivers Management
  if (catId === 'cat-drivers') {
    return perms.drivers;
  }

  // Category 6: Recruitment & ATS
  if (catId === 'cat-6-recruit') {
    return perms.recruitment;
  }

  // Category 7: Performance & Training
  if (catId === 'cat-7-perf') {
    return perms.performance;
  }

  // Category 8: Assets & Documents
  if (catId === 'cat-8-assets') {
    if (currentRole === 'Employee' && !perms.assets) {
      return moduleId === 'asset-my-requests' || moduleId === 'doc-my-docs';
    }
    return perms.assets;
  }

  // Category 12: Smart Archive
  if (catId === 'cat-12-archive' || catId === 'cat-9-archive') {
    return perms.archive;
  }

  // Category 9: Risk & Compliance
  if (catId === 'cat-9-risk') {
    if (moduleId.startsWith('sec-')) {
      return perms.settings;
    }
    return perms.risk;
  }

  // Category 10: System Development & Developer Tools
  if (catId === 'cat-10-sys') {
    return perms.settings;
  }

  // Category 11: Support & Help Desk
  if (catId === 'cat-11-support' || catId === 'cat-12-support') {
    return perms.support;
  }

  return false;
}

/**
 * Maps module IDs to their canonical category ID and friendly alias.
 */
export const MODULE_CATEGORY_MAP: Record<string, { catId: string; alias: string }> = {
  // Category 1: auth
  'auth-secure': { catId: 'cat-1-auth', alias: 'settings' },
  'auth-sso': { catId: 'cat-1-auth', alias: 'settings' },
  'auth-biometric': { catId: 'cat-1-auth', alias: 'settings' },

  // Category 2: dashboard / reports
  'dash-overview': { catId: 'cat-2-dash', alias: 'reports' },
  'dash-exec-1': { catId: 'cat-2-dash', alias: 'reports' },
  'dash-exec-2': { catId: 'cat-2-dash', alias: 'reports' },
  'dash-ess': { catId: 'cat-2-dash', alias: 'reports' },
  'dash-search': { catId: 'cat-2-dash', alias: 'reports' },
  'sys-dynamic-reports': { catId: 'cat-2-dash', alias: 'reports' },

  // Category 3: employees
  'emp-directory': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-hr-directory': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-list': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-add': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-contracts': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-org-chart': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-delegation': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-sync-guide': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-profile': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-branches': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-company-profile': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-calendar': { catId: 'cat-3-emp', alias: 'employees' },
  'emp-news': { catId: 'cat-3-emp', alias: 'employees' },

  // Category 4: leaves / attendance
  'leave-attendance': { catId: 'cat-4-leave', alias: 'attendance' },
  'leave-apply': { catId: 'cat-4-leave', alias: 'attendance' },
  'leave-balance': { catId: 'cat-4-leave', alias: 'attendance' },
  'leave-approvals': { catId: 'cat-4-leave', alias: 'attendance' },
  'leave-timesheets': { catId: 'cat-4-leave', alias: 'attendance' },
  'leave-earned': { catId: 'cat-4-leave', alias: 'attendance' },
  'leave-schedule': { catId: 'cat-4-leave', alias: 'attendance' },
  'leave-biometric-settings': { catId: 'cat-4-leave', alias: 'settings' },
  'leave-db-schema': { catId: 'cat-4-leave', alias: 'settings' },

  // Category 5: payroll
  'payroll-sheet': { catId: 'cat-5-payroll', alias: 'payroll' },
  'payroll-payslip': { catId: 'cat-5-payroll', alias: 'payroll' },
  'payroll-loans': { catId: 'cat-5-payroll', alias: 'payroll' },
  'payroll-tax': { catId: 'cat-5-payroll', alias: 'payroll' },
  'payroll-end-service': { catId: 'cat-5-payroll', alias: 'payroll' },
  'payroll-analytics': { catId: 'cat-5-payroll', alias: 'payroll' },
  'pay-dashboard': { catId: 'cat-5-payroll', alias: 'payroll' },
  'payroll-mgmt': { catId: 'cat-5-payroll', alias: 'payroll' },

  // Category Drivers
  'drivers-list': { catId: 'cat-drivers', alias: 'drivers' },
  'drivers-assignments': { catId: 'cat-drivers', alias: 'drivers' },
  'drivers-trips': { catId: 'cat-drivers', alias: 'drivers' },
  'drivers-maintenance': { catId: 'cat-drivers', alias: 'drivers' },
  'drivers-fuel': { catId: 'cat-drivers', alias: 'drivers' },
  'drivers-kpi': { catId: 'cat-drivers', alias: 'drivers' },

  // Category 6: recruitment
  'recruit-openings': { catId: 'cat-6-recruit', alias: 'recruitment' },
  'recruit-pipeline': { catId: 'cat-6-recruit', alias: 'recruitment' },
  'recruit-interviews': { catId: 'cat-6-recruit', alias: 'recruitment' },
  'recruit-offers': { catId: 'cat-6-recruit', alias: 'recruitment' },
  'recruit-onboarding': { catId: 'cat-6-recruit', alias: 'recruitment' },
  'recruit-dash': { catId: 'cat-6-recruit', alias: 'recruitment' },
  'recruit-ats': { catId: 'cat-6-recruit', alias: 'recruitment' },
  'recruit-candidate-profile': { catId: 'cat-6-recruit', alias: 'recruitment' },

  // Category 7: performance
  'perf-appraisals': { catId: 'cat-7-perf', alias: 'performance' },
  'perf-goals': { catId: 'cat-7-perf', alias: 'performance' },
  'perf-kpi': { catId: 'cat-7-perf', alias: 'performance' },
  'perf-training-plans': { catId: 'cat-7-perf', alias: 'performance' },
  'perf-courses': { catId: 'cat-7-perf', alias: 'performance' },

  // Category 8: assets
  'asset-inventory': { catId: 'cat-8-assets', alias: 'assets' },
  'asset-assign': { catId: 'cat-8-assets', alias: 'assets' },
  'asset-custody': { catId: 'cat-8-assets', alias: 'assets' },
  'asset-maintenance': { catId: 'cat-8-assets', alias: 'assets' },
  'asset-my-requests': { catId: 'cat-8-assets', alias: 'assets' },
  'doc-company': { catId: 'cat-8-assets', alias: 'assets' },
  'doc-templates': { catId: 'cat-8-assets', alias: 'assets' },
  'doc-my-docs': { catId: 'cat-8-assets', alias: 'assets' },

  // Category 9: risk
  'risk-matrix': { catId: 'cat-9-risk', alias: 'risk' },
  'risk-audit-logs': { catId: 'cat-9-risk', alias: 'risk' },
  'risk-policies': { catId: 'cat-9-risk', alias: 'risk' },
  'risk-incidents': { catId: 'cat-9-risk', alias: 'risk' },
  'risk-compliance-checklist': { catId: 'cat-9-risk', alias: 'risk' },
  'sec-roles': { catId: 'cat-9-risk', alias: 'risk' },
  'sec-roles-permissions': { catId: 'cat-9-risk', alias: 'risk' },
  'risk-assessment': { catId: 'cat-9-risk', alias: 'risk' },

  // Category 10: system
  'sys-code-view': { catId: 'cat-10-sys', alias: 'settings' },
  'sys-schema': { catId: 'cat-10-sys', alias: 'settings' },
  'sys-api-logs': { catId: 'cat-10-sys', alias: 'settings' },
  'sys-deploy-status': { catId: 'cat-10-sys', alias: 'settings' },
  'sys-sql-console': { catId: 'cat-10-sys', alias: 'settings' },
  'sys-env': { catId: 'cat-10-sys', alias: 'settings' },

  // Category 11: support
  'support-tickets': { catId: 'cat-11-support', alias: 'support' },
  'support-faq': { catId: 'cat-11-support', alias: 'support' },
  'support-contact': { catId: 'cat-11-support', alias: 'support' },
  'support-guides': { catId: 'cat-11-support', alias: 'support' },
  'supp-knowledge-base': { catId: 'cat-11-support', alias: 'support' },
  'supp-emp-portal': { catId: 'cat-11-support', alias: 'support' },
  'supp-internal-chat': { catId: 'cat-11-support', alias: 'support' },
  'supp-notif-center': { catId: 'cat-11-support', alias: 'support' },
  'supp-mobile-app': { catId: 'cat-11-support', alias: 'support' },

  // Category 12: archive
  'archive-digital': { catId: 'cat-12-archive', alias: 'archive' },
  'archive-cabinets': { catId: 'cat-12-archive', alias: 'archive' },
  'archive-indexing': { catId: 'cat-12-archive', alias: 'archive' },
  'archive-retention': { catId: 'cat-12-archive', alias: 'archive' },
  'archive-ocr': { catId: 'cat-12-archive', alias: 'archive' },
  'archive-audit': { catId: 'cat-12-archive', alias: 'archive' },
};

export const CATEGORY_ALIASES: Record<string, string[]> = {
  'cat-1-auth': ['cat-1-auth', 'auth', 'settings'],
  'cat-2-dash': ['cat-2-dash', 'reports', 'dashboard'],
  'cat-3-emp': ['cat-3-emp', 'employees'],
  'cat-4-leave': ['cat-4-leave', 'attendance'],
  'cat-5-payroll': ['cat-5-payroll', 'payroll'],
  'cat-drivers': ['cat-drivers', 'drivers'],
  'cat-6-recruit': ['cat-6-recruit', 'recruitment'],
  'cat-7-perf': ['cat-7-perf', 'performance'],
  'cat-8-assets': ['cat-8-assets', 'assets'],
  'cat-9-risk': ['cat-9-risk', 'risk'],
  'cat-10-sys': ['cat-10-sys', 'settings'],
  'cat-11-support': ['cat-11-support', 'cat-12-support', 'support'],
  'cat-12-support': ['cat-11-support', 'cat-12-support', 'support'],
  'cat-12-archive': ['cat-12-archive', 'cat-9-archive', 'archive'],
  'cat-9-archive': ['cat-12-archive', 'cat-9-archive', 'archive'],
};

/**
 * Resolves category id and aliases for any moduleId or catId.
 */
export function resolveCategoryAndAlias(moduleId: string, catId?: string): { resolvedCatId: string; aliases: string[] } {
  if (catId && CATEGORY_ALIASES[catId]) {
    return { resolvedCatId: catId, aliases: CATEGORY_ALIASES[catId] };
  }
  if (moduleId && MODULE_CATEGORY_MAP[moduleId]) {
    const info = MODULE_CATEGORY_MAP[moduleId];
    return { resolvedCatId: info.catId, aliases: CATEGORY_ALIASES[info.catId] || [info.catId, info.alias] };
  }

  // Prefix fallback
  if (moduleId.startsWith('emp-')) return { resolvedCatId: 'cat-3-emp', aliases: ['cat-3-emp', 'employees'] };
  if (moduleId.startsWith('leave-')) return { resolvedCatId: 'cat-4-leave', aliases: ['cat-4-leave', 'attendance'] };
  if (moduleId.startsWith('payroll-') || moduleId.startsWith('pay-')) return { resolvedCatId: 'cat-5-payroll', aliases: ['cat-5-payroll', 'payroll'] };
  if (moduleId.startsWith('recruit-')) return { resolvedCatId: 'cat-6-recruit', aliases: ['cat-6-recruit', 'recruitment'] };
  if (moduleId.startsWith('dash-')) return { resolvedCatId: 'cat-2-dash', aliases: ['cat-2-dash', 'reports', 'dashboard'] };
  if (moduleId.startsWith('perf-')) return { resolvedCatId: 'cat-7-perf', aliases: ['cat-7-perf', 'performance'] };
  if (moduleId.startsWith('asset-') || moduleId.startsWith('doc-')) return { resolvedCatId: 'cat-8-assets', aliases: ['cat-8-assets', 'assets'] };
  if (moduleId.startsWith('risk-') || moduleId.startsWith('sec-')) return { resolvedCatId: 'cat-9-risk', aliases: ['cat-9-risk', 'risk'] };
  if (moduleId.startsWith('sys-') || moduleId.startsWith('auth-')) return { resolvedCatId: 'cat-10-sys', aliases: ['cat-10-sys', 'settings'] };
  if (moduleId.startsWith('supp-') || moduleId.startsWith('support-')) return { resolvedCatId: 'cat-11-support', aliases: ['cat-11-support', 'support'] };
  if (moduleId.startsWith('archive-')) return { resolvedCatId: 'cat-12-archive', aliases: ['cat-12-archive', 'archive'] };
  if (moduleId.startsWith('drivers-')) return { resolvedCatId: 'cat-drivers', aliases: ['cat-drivers', 'drivers'] };

  const fallbackCat = catId || 'cat-2-dash';
  return { resolvedCatId: fallbackCat, aliases: CATEGORY_ALIASES[fallbackCat] || [fallbackCat] };
}

/**
 * Returns granular access level ('write' | 'read' | 'none') for any module.
 */
export function getModuleAccessLevel(
  catId: string,
  moduleId: string,
  perms: UserEffectivePermissions,
  currentRole: string
): PermissionAccessLevel {
  if (perms.isSuperAdmin) return 'write';

  // Admin users have full write access to user roles & permissions
  if ((currentRole === 'Admin' || currentRole === 'Super Admin') && (moduleId === 'sec-roles-permissions' || moduleId === 'sec-edit-role')) {
    return 'write';
  }

  const { resolvedCatId, aliases } = resolveCategoryAndAlias(moduleId, catId);

  // 1. Direct sub-module level check if defined in rawModules
  if (perms.rawModules && moduleId && moduleId in perms.rawModules) {
    const val = perms.rawModules[moduleId];
    if (val === 'write' || val === true) return 'write';
    if (val === 'read') return 'read';
    if (val === 'none' || val === false) return 'none';
  }

  // 2. Direct category check in rawModules using all aliases (e.g. 'cat-3-emp' or 'employees')
  if (perms.rawModules) {
    for (const key of aliases) {
      if (key in perms.rawModules) {
        const val = perms.rawModules[key];
        if (val === 'write' || val === true) return 'write';
        if (val === 'read') return 'read';
        if (val === 'none' || val === false) return 'none';
      }
    }
  }

  // 3. Authorization check
  const authorized = isModuleAuthorized(resolvedCatId, moduleId, perms, currentRole);
  if (!authorized) return 'none';

  // 4. If explicit permissions are configured for the user:
  if (perms.hasExplicitPerms && perms.rawModules) {
    // Check if any alias has 'read'
    const hasRead = aliases.some(a => perms.rawModules![a] === 'read') ||
      (moduleId && perms.rawModules[moduleId] === 'read');
    if (hasRead) return 'read';

    const hasWrite = aliases.some(a => perms.rawModules![a] === 'write' || perms.rawModules![a] === true) ||
      (moduleId && (perms.rawModules[moduleId] === 'write' || perms.rawModules[moduleId] === true));
    if (hasWrite) return 'write';

    // When custom permissions are explicitly granted and no write was marked, keep safe as read
    return 'read';
  }

  // 5. Default Role-based fallbacks (for users without custom explicit permissions)
  const isHRManagerRole = currentRole === 'HR Manager' || 
    perms.employees ||
    currentRole === 'مدير الموارد البشرية';
  const isITAdminRole = currentRole === 'IT Admin';
  const isRecruiterRole = currentRole === 'Recruiter';

  if (resolvedCatId === 'cat-3-emp') {
    return isHRManagerRole ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-4-leave') {
    return isHRManagerRole ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-5-payroll') {
    return (perms.payroll && isHRManagerRole) ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-6-recruit') {
    return (isHRManagerRole || isRecruiterRole) ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-7-perf') {
    return isHRManagerRole ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-8-assets') {
    return (isHRManagerRole || isITAdminRole) ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-9-risk') {
    return isITAdminRole ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-10-sys') {
    return isITAdminRole ? 'write' : 'read';
  }
  if (resolvedCatId === 'cat-drivers') {
    return isITAdminRole ? 'write' : 'read';
  }

  return 'read';
}

/**
 * Global helper: Checks if a user has write permission for a module/category.
 */
export function canUserWrite(
  moduleId: string,
  currentUser: UserProfile | null,
  currentRole: string
): boolean {
  if (!currentUser) return false;
  const perms = getUserEffectivePermissions(currentUser, currentRole);
  const level = getModuleAccessLevel('', moduleId, perms, currentRole);
  return level === 'write';
}

/**
 * Global helper: Checks if a user has read-only permission for a module/category.
 */
export function isUserReadOnly(
  moduleId: string,
  currentUser: UserProfile | null,
  currentRole: string
): boolean {
  if (!currentUser) return true;
  const perms = getUserEffectivePermissions(currentUser, currentRole);
  const level = getModuleAccessLevel('', moduleId, perms, currentRole);
  return level === 'read';
}

