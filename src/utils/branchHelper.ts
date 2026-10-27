/**
 * Utility for localizing Branch and Office names across the application.
 * Ensures consistent, high-fidelity English and Arabic names for all Iraqi branches.
 */

export const BRANCH_NAMES_MAP: Record<string, { ar: string; en: string }> = {
  // Baghdad offices / branches
  'بغداد_المنصور': { ar: 'بغداد - المنصور', en: 'Baghdad - Mansour' },
  'بغداد - المنصور': { ar: 'بغداد - المنصور', en: 'Baghdad - Mansour' },
  'المنصور': { ar: 'المنصور', en: 'Mansour' },
  'Mansour': { ar: 'المنصور', en: 'Mansour' },

  'بغداد_الوحدة': { ar: 'بغداد - الوحدة', en: 'Baghdad - Wehda' },
  'بغداد - الوحدة': { ar: 'بغداد - الوحدة', en: 'Baghdad - Wehda' },
  'الوحدة': { ar: 'الوحدة', en: 'Wehda' },
  'Wehda': { ar: 'الوحدة', en: 'Wehda' },

  'بغداد_الكرادة': { ar: 'بغداد - الكرادة', en: 'Baghdad - Karrada' },
  'بغداد - الكرادة': { ar: 'بغداد - الكرادة', en: 'Baghdad - Karrada' },
  'الكرادة': { ar: 'الكرادة', en: 'Karrada' },
  'Karrada': { ar: 'الكرادة', en: 'Karrada' },

  'بغداد_الشعب': { ar: 'بغداد - الشعب', en: 'Baghdad - Shaab' },
  'بغداد - الشعب': { ar: 'بغداد - الشعب', en: 'Baghdad - Shaab' },
  'الشعب': { ar: 'الشعب', en: 'Shaab' },
  'Shaab': { ar: 'الشعب', en: 'Shaab' },

  'بغداد': { ar: 'بغداد', en: 'Baghdad' },
  'Baghdad': { ar: 'بغداد', en: 'Baghdad' },

  // Wasit / Kut
  'الكوت': { ar: 'الكوت', en: 'Kut' },
  'كوت': { ar: 'الكوت', en: 'Kut' },
  'Kut': { ar: 'الكوت', en: 'Kut' },
  'واسط': { ar: 'واسط', en: 'Wasit' },
  'Wasit': { ar: 'واسط', en: 'Wasit' },
  'فرع واسط': { ar: 'فرع واسط', en: 'Wasit Branch' },

  // Basra
  'البصرة': { ar: 'البصرة', en: 'Basra' },
  'بصرة': { ar: 'البصرة', en: 'Basra' },
  'Basra': { ar: 'البصرة', en: 'Basra' },
  'Bassrah': { ar: 'البصرة', en: 'Basra' },
  'البصرة_المدينة': { ar: 'البصرة - المدينة', en: 'Basra - Mudayna' },
  'Bassrah-Mudayna': { ar: 'البصرة - المدينة', en: 'Basra - Mudayna' },
  'فرع البصرة': { ar: 'فرع البصرة', en: 'Basra Branch' },
  'فرع البصرة - الجمهورية': { ar: 'فرع البصرة - الجمهورية', en: 'Basra - Republic Branch' },

  // Sulaymaniyah
  'السليمانية': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'سليمانية': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'Sulaymaniya': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'Sulaymaniyah': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'Slemani': { ar: 'السليمانية', en: 'Sulaymaniyah' },

  // Erbil
  'اربيل': { ar: 'أربيل', en: 'Erbil' },
  'أربيل': { ar: 'أربيل', en: 'Erbil' },
  'Erbil': { ar: 'أربيل', en: 'Erbil' },
  'هولير': { ar: 'أربيل', en: 'Erbil' },
  'Hawler': { ar: 'أربيل', en: 'Erbil' },

  // Najaf
  'النجف': { ar: 'النجف', en: 'Najaf' },
  'نجف': { ar: 'النجف', en: 'Najaf' },
  'Najaf': { ar: 'النجف', en: 'Najaf' },
  'فرع النجف': { ar: 'فرع النجف', en: 'Najaf Branch' },

  // Karbala
  'كربلاء': { ar: 'كربلاء', en: 'Karbala' },
  'كربلا': { ar: 'كربلاء', en: 'Karbala' },
  'Karbala': { ar: 'كربلاء', en: 'Karbala' },
  'Kerbala': { ar: 'كربلاء', en: 'Karbala' },
  'كربلاء_الهندية': { ar: 'كربلاء - الهندية', en: 'Karbala - Hindia' },
  'Hindia': { ar: 'كربلاء - الهندية', en: 'Karbala - Hindia' },

  // Babylon / Babil
  'بابل_الحلة': { ar: 'بابل - الحلة', en: 'Babylon - Hilla' },
  'بابل - الحلة': { ar: 'بابل - الحلة', en: 'Babylon - Hilla' },
  'الحلة': { ar: 'الحلة', en: 'Hilla' },
  'Hilla': { ar: 'بابل - الحلة', en: 'Babylon - Hilla' },
  'بابل_الهاشمية': { ar: 'بابل - الهاشمية', en: 'Babylon - Hashimiya' },
  'الهاشمية': { ar: 'الهاشمية', en: 'Hashimiya' },
  'Hashmiya': { ar: 'بابل - الهاشمية', en: 'Babylon - Hashimiya' },
  'بابل': { ar: 'بابل', en: 'Babylon' },
  'Babil': { ar: 'بابل', en: 'Babylon' },
  'Babylon': { ar: 'بابل', en: 'Babylon' },
  'فرع بابل': { ar: 'فرع بابل', en: 'Babylon Branch' },

  // Diwaniyah
  'الديوانية': { ar: 'الديوانية', en: 'Diwaniyah' },
  'ديوانية': { ar: 'الديوانية', en: 'Diwaniyah' },
  'Diwaniya': { ar: 'الديوانية', en: 'Diwaniyah' },
  'Diwaniyah': { ar: 'الديوانية', en: 'Diwaniyah' },
  'القادسية': { ar: 'القادسية', en: 'Qadisiyah' },
  'Qadisiyah': { ar: 'القادسية', en: 'Qadisiyah' },

  // Nasiriyah / Dhi Qar
  'الناصرية': { ar: 'الناصرية', en: 'Nasiriyah' },
  'ناصرية': { ar: 'الناصرية', en: 'Nasiriyah' },
  'Nassiriya': { ar: 'الناصرية', en: 'Nasiriyah' },
  'Nasiriyah': { ar: 'الناصرية', en: 'Nasiriyah' },
  'ذي قار': { ar: 'ذي قار', en: 'Dhi Qar' },
  'Dhi Qar': { ar: 'ذي قار', en: 'Dhi Qar' },

  // Maysan / Amarah
  'ميسان': { ar: 'ميسان', en: 'Maysan' },
  'Maysan': { ar: 'ميسان', en: 'Maysan' },
  'العمارة': { ar: 'العمارة', en: 'Amarah' },
  'Amarah': { ar: 'العمارة', en: 'Amarah' },

  // Kirkuk
  'كركوك': { ar: 'كركوك', en: 'Kirkuk' },
  'Kirkuk': { ar: 'كركوك', en: 'Kirkuk' },

  // Duhok
  'دهوك': { ar: 'دهوك', en: 'Duhok' },
  'Duhok': { ar: 'دهوك', en: 'Duhok' },
  'Dohuk': { ar: 'دهوك', en: 'Duhok' },

  // Mosul / Nineveh
  'الموصل': { ar: 'الموصل', en: 'Mosul' },
  'موصل': { ar: 'الموصل', en: 'Mosul' },
  'Mosul': { ar: 'الموصل', en: 'Mosul' },
  'نينوى': { ar: 'نينوى', en: 'Nineveh' },
  'Nineveh': { ar: 'نينوى', en: 'Nineveh' },

  // Anbar / Ramadi
  'الانبار': { ar: 'الأنبار', en: 'Anbar' },
  'الأنبار': { ar: 'الأنبار', en: 'Anbar' },
  'Anbar': { ar: 'الأنبار', en: 'Anbar' },
  'الرمادي': { ar: 'الرمادي', en: 'Ramadi' },
  'Ramadi': { ar: 'الرمادي', en: 'Ramadi' },

  // Muthanna / Samawa
  'المثنى': { ar: 'المثنى', en: 'Muthanna' },
  'Muthanna': { ar: 'المثنى', en: 'Muthanna' },
  'السماوة': { ar: 'السماوة', en: 'Samawa' },
  'Samawa': { ar: 'السماوة', en: 'Samawa' },

  // Diyala / Baquba
  'ديالى': { ar: 'ديالى', en: 'Diyala' },
  'Diyala': { ar: 'ديالى', en: 'Diyala' },
  'بعقوبة': { ar: 'بعقوبة', en: 'Baquba' },

  // Salahuddin
  'صلاح الدين': { ar: 'صلاح الدين', en: 'Salahuddin' },
  'Salahuddin': { ar: 'صلاح الدين', en: 'Salahuddin' },
  'تكريت': { ar: 'تكريت', en: 'Tikrit' },

  // Headquarters / General Management
  'المقر الرئيسي': { ar: 'المقر الرئيسي (الإدارة العامة)', en: 'Head Office (HQ)' },
  'الإدارة العامة': { ar: 'الإدارة العامة', en: 'General Management (HQ)' },
  'الادارة العامة': { ar: 'الإدارة العامة', en: 'General Management (HQ)' },
  'الإدارة العامة - بغداد': { ar: 'الإدارة العامة - بغداد', en: 'HQ - Baghdad' },
  'فرع الإدارة العامة': { ar: 'الإدارة العامة', en: 'General Management (HQ)' },
  'Head Office': { ar: 'المقر الرئيسي', en: 'Head Office (HQ)' },
  'HQ': { ar: 'المقر الرئيسي', en: 'Head Office (HQ)' }
};

/**
 * Returns the localized name of a branch based on active language ('ar' or 'en').
 */
export function getBranchName(
  branch?: string | null,
  branchEn?: string | null,
  language: string = 'ar'
): string {
  if (!branch && !branchEn) {
    return language === 'en' ? 'Main Office' : 'المقر الرئيسي';
  }

  const raw = String(branch || branchEn || '').trim();
  const rawEn = String(branchEn || '').trim();

  if (language === 'en') {
    // 1. Direct dictionary match by raw (Arabic or English key)
    if (BRANCH_NAMES_MAP[raw]?.en) {
      return BRANCH_NAMES_MAP[raw].en;
    }
    // 2. Direct dictionary match by rawEn
    if (rawEn && BRANCH_NAMES_MAP[rawEn]?.en) {
      return BRANCH_NAMES_MAP[rawEn].en;
    }
    // 3. If rawEn is valid English (not 'N/A', not empty, and no Arabic script)
    if (rawEn && rawEn !== 'N/A' && rawEn !== 'null' && !/[\u0600-\u06FF]/.test(rawEn)) {
      return rawEn.replace(/_/g, ' ');
    }
    // 4. Try matching partial tokens in the map
    const match = Object.keys(BRANCH_NAMES_MAP).find(k => raw.includes(k) || k.includes(raw));
    if (match && BRANCH_NAMES_MAP[match]?.en) {
      return BRANCH_NAMES_MAP[match].en;
    }
    // 5. Clean up underscores
    return raw.replace(/_/g, ' ');
  } else {
    // Arabic
    if (BRANCH_NAMES_MAP[raw]?.ar) {
      return BRANCH_NAMES_MAP[raw].ar;
    }
    if (rawEn && BRANCH_NAMES_MAP[rawEn]?.ar) {
      return BRANCH_NAMES_MAP[rawEn].ar;
    }
    const match = Object.keys(BRANCH_NAMES_MAP).find(k => raw.includes(k) || k.includes(raw));
    if (match && BRANCH_NAMES_MAP[match]?.ar) {
      return BRANCH_NAMES_MAP[match].ar;
    }
    return raw.replace(/_/g, ' ');
  }
}

/**
 * Normalizes branch/office names for robust comparisons.
 * e.g., 'مكتب الحلة', 'فرع الحلة', 'الحلة', 'بابل - الحلة' all match 'حلة'.
 */
export function normalizeBranchKey(name?: string | null): string {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[_\-–—]/g, ' ')
    .replace(/\b(مكتب|فرع|محافظة|منطقة|ادارة|إدارة|office|branch)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks whether a user or role represents a Branch / Office Manager.
 */
export function isBranchManager(user?: any, role?: string): boolean {
  if (!user && !role) return false;
  const currentRole = String(role || user?.role || '').trim();
  const jobTitle = String(user?.job_title || user?.position || user?.jobTitle || '').trim();
  const name = String(user?.name || user?.full_name || '').trim();
  const username = String(user?.username || '').trim().toLowerCase();

  if (
    currentRole === 'Branch Manager' ||
    currentRole === 'مدير فرع' ||
    currentRole === 'مدير مكتب' ||
    currentRole.includes('مدير فرع') ||
    currentRole.includes('مدير مكتب') ||
    currentRole.toLowerCase().includes('branch manager') ||
    currentRole.toLowerCase().includes('office manager')
  ) {
    return true;
  }

  if (
    jobTitle.includes('مدير فرع') ||
    jobTitle.includes('مدير مكتب') ||
    jobTitle.toLowerCase().includes('branch manager') ||
    jobTitle.toLowerCase().includes('office manager')
  ) {
    return true;
  }

  if (
    username.includes('branchmanager') ||
    username.endsWith('_manager') ||
    username.startsWith('manager_')
  ) {
    return true;
  }

  if (
    (name.includes('مدير فرع') || name.includes('مدير مكتب') || name.toLowerCase().includes('branch manager')) &&
    !name.includes('مدير الموارد البشرية') &&
    !name.includes('مدير النظام')
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts the user's assigned branch / office name cleanly.
 */
export function getUserBranch(user?: any): string {
  if (!user) return '';
  return String(
    user.branch || 
    user.office_name || 
    user.officeName || 
    user.location_ar || 
    user.location || 
    user.branch_ar || 
    ''
  ).trim();
}

/**
 * Checks if an employee record matches a specific branch/office name.
 */
export function isEmployeeInBranch(emp: any, branchName: string): boolean {
  if (!branchName) return true;
  const targetKey = normalizeBranchKey(branchName);
  if (!targetKey) return true;

  const empBranch = emp.branch || emp.branch_ar || emp.location || emp.location_ar || emp.office_name || '';
  const empBranchEn = emp.branchEn || emp.branch_en || emp.location_en || '';

  const empKey = normalizeBranchKey(empBranch);
  const empKeyEn = normalizeBranchKey(empBranchEn);

  if (empKey && (empKey === targetKey || empKey.includes(targetKey) || targetKey.includes(empKey))) {
    return true;
  }
  if (empKeyEn && (empKeyEn === targetKey || empKeyEn.includes(targetKey) || targetKey.includes(empKeyEn))) {
    return true;
  }

  // Also check raw string inclusion for Arabic composite names like "مكتب الحلة" inside "الحلة"
  const rawTarget = String(branchName).trim();
  const rawEmpBranch = String(empBranch).trim();
  if (rawTarget && rawEmpBranch && (rawTarget.includes(rawEmpBranch) || rawEmpBranch.includes(rawTarget))) {
    return true;
  }

  return false;
}

/**
 * Filters an employee list for the current user.
 * If user is a Branch Manager, strictly scopes the list to their office employees.
 * Otherwise returns the original list.
 */
export function filterEmployeesForUser(employees: any[], user?: any, role?: string): any[] {
  if (!Array.isArray(employees)) return [];
  if (!isBranchManager(user, role)) return employees;

  const branch = getUserBranch(user);
  if (!branch) return employees;

  return employees.filter(emp => isEmployeeInBranch(emp, branch));
}

/**
 * Filters system notifications for a Branch Manager.
 * Ensures notifications pertaining to other branches are not mixed in,
 * while keeping branch-relevant alerts, employees' alerts, and general company announcements.
 */
export function filterNotificationsForUser(
  notifications: any[],
  user?: any,
  role?: string,
  scopedEmployees?: any[]
): any[] {
  if (!Array.isArray(notifications)) return [];
  if (!isBranchManager(user, role)) return notifications;

  const branch = getUserBranch(user);
  const branchKey = normalizeBranchKey(branch);
  const scopedEmpNames = Array.isArray(scopedEmployees)
    ? scopedEmployees.map(e => String(e.fullNameAr || e.fullName || e.name || e.full_name_ar || '').toLowerCase())
    : [];

  return notifications.filter(notif => {
    // 1. General system announcements / company news are kept
    if (notif.type === 'news' || notif.type === 'info') {
      const msg = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();
      // If it mentions a specific other branch, exclude it
      const otherBranches = ['بغداد', 'البصرة', 'النجف', 'الحلة', 'الكوت', 'كربلاء', 'السليمانية', 'أربيل', 'الموصل'];
      const mentionsOtherBranch = otherBranches.some(b => {
        const bKey = normalizeBranchKey(b);
        return bKey !== branchKey && msg.includes(bKey);
      });
      if (mentionsOtherBranch && !msg.includes(branchKey)) {
        return false;
      }
      return true;
    }

    const text = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();

    // 2. If mentions manager's branch
    if (branchKey && text.includes(branchKey)) {
      return true;
    }

    // 3. If mentions an employee from this manager's office
    if (scopedEmpNames.some(name => name.length > 2 && text.includes(name))) {
      return true;
    }

    // 4. Default: keep only if not mentioning another branch
    return false;
  });
}
