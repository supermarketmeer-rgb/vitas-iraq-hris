/**
 * Organizational Dictionary & Localization Helpers
 * Provides bidirectional translation for Departments and Job Titles across VITAS Iraq HRMS.
 */

export const DICT_EN: Record<string, string> = {
  // Departments
  'قسم الائتمان': 'Credit',
  'الائتمان': 'Credit',
  'قسم الاتئمان': 'Credit',
  'Credit': 'Credit',
  'الامتثال': 'Compliance',
  'قسم الامتثال': 'Compliance',
  'الحسابات': 'Accounts',
  'قسم الحسابات': 'Accounts',
  'الخزينة': 'Treasury',
  'قسم الخزينة': 'Treasury',
  'الموارد البشرية': 'Human Resources',
  'قسم الموارد البشرية': 'Human Resources',
  'الموارد البشرية والشؤون الإدارية': 'Human Resources & Administration',
  'إدارة التمويل الأصغر والعمليات': 'Microfinance & Operations',
  'المعلوماتية والاتصالات': 'IT & Communications',
  'تكنولوجيا المعلومات': 'Information Technology',
  'قسم تقنية المعلومات': 'Information Technology',
  'تكنولوجيا المعلوماات': 'Information Technology',
  'IT': 'Information Technology',
  'المالية والمحاسبة': 'Finance & Accounting',
  'قسم المالية والمحاسبة': 'Finance & Accounting',
  'القسم المالي': 'Finance Department',
  'المخاطر والامتثال': 'Risk & Compliance',
  'المخاطر والامتثال والتدقيق': 'Risk, Compliance & Audit',
  'الأمن': 'Security',
  'قسم الأمن': 'Security',
  'العمليات': 'Operations',
  'الشؤون القانونية': 'Legal Affairs',
  'المشتريات والتسهيلات': 'Procurement & Facilities',
  'المبيعات والتسويق': 'Sales & Marketing',
  'التسويق والمبيعات': 'Marketing & Sales',
  'الاستحصال والتحصيل': 'Collection & Recovery',

  // Job Titles
  'مسؤول مكافحة غسل الأموال': 'AML Officer',
  'محاسب': 'Accountant',
  'مدير الحسابات': 'Accounts Manager',
  'مسؤول الحسابات': 'Accounts Officer',
  'مسؤول إدارة النقد': 'Cash Management Officer',
  'محلل امتثال': 'Compliance Analyst',
  'مدير الامتثال': 'Compliance Manager',
  'مسؤول الامتثال': 'Compliance Officer',
  'محلل ائتمان': 'Credit Analyst',
  'مساعد ائتمان': 'Credit Assistant',
  'منسق الائتمان': 'Credit Coordinator',
  'مسؤول توثيق الائتمان': 'Credit Documentation Officer',
  'مدير الائتمان': 'Credit Manager',
  'مسؤول ائتمان': 'Credit Officer',
  'محاسب مالي': 'Financial Accountant',
  'مسؤول الموارد البشرية': 'HR Officer',
  'مدير الموارد البشرية': 'HR Manager',
  'مسؤول قروض': 'Loan Officer',
  'مشرف مسؤولي القروض': 'Loan Officer Supervisor',
  'مدير المكتب': 'Office Manager',
  'مدير مكتب': 'Office Manager',
  'مدير الفرع': 'Branch Manager',
  'مسؤول شؤون الموظفين': 'Personnel Officer',
  'موظف استقبال': 'Receptionist',
  'مسؤول التوظيف': 'Recruitment Officer',
  'محاسب الخزينة': 'Treasury Accountant',
  'مدير الخزينة': 'Treasury Manager',
  'مسؤول الخزينة': 'Treasury Officer',
  'عامل صيانه وسائق': 'Maintenance Worker & Driver',
  'عامل صيانة وسائق': 'Maintenance Worker & Driver',
  'نائب منسق اقليمي': 'Regional Deputy Coordinator',
  'نائب منسق إقليمي': 'Regional Deputy Coordinator',
  'مساعد ائتمان القروض الصغيره': 'Microfinance Loan Assistant',
  'مساعد ائتمان القروض الصغيرة': 'Microfinance Loan Assistant',
  'مسؤول قروض محصل': 'Collector Loan Officer',
  'عمال نظافة': 'Cleaners',
  'عامل نظافة': 'Cleaner',
  'محاسب رئيسي': 'Chief Accountant',
  'مسؤول تقنية المعلومات': 'IT Officer',
  'مسؤول الامتثال والمخاطر': 'Risk & Compliance Officer',
  'حارس وصيانة': 'Guard & Maintenance',
  'حارس أمن': 'Security Guard',
  'أمين صندوق': 'Teller',
  'صراف': 'Teller',
  'موظف صندوق': 'Teller',
  'cleaner/tea person': 'cleaner/tea person',
  'loan officer': 'Loan Officer',
  'teller': 'Teller',
  'office manager': 'Office Manager'
};

export const DICT_AR: Record<string, string> = {
  // Departments
  'credit': 'الائتمان',
  'credit department': 'قسم الائتمان',
  'compliance': 'الامتثال',
  'accounts': 'الحسابات',
  'accounting': 'الحسابات',
  'treasury': 'الخزينة',
  'human resources': 'الموارد البشرية',
  'human resources & administration': 'الموارد البشرية والشؤون الإدارية',
  'microfinance & operations': 'إدارة التمويل الأصغر والعمليات',
  'it & communications': 'المعلوماتية والاتصالات',
  'information technology': 'تكنولوجيا المعلومات',
  'it': 'تكنولوجيا المعلومات',
  'finance & accounting': 'المالية والمحاسبة',
  'finance department': 'القسم المالي',
  'risk & compliance': 'المخاطر والامتثال',
  'risk, compliance & audit': 'المخاطر والامتثال والتدقيق',
  'security': 'الأمن',
  'operations': 'العمليات',
  'legal affairs': 'الشؤون القانونية',
  'procurement & facilities': 'المشتريات والتسهيلات',
  'sales & marketing': 'المبيعات والتسويق',
  'marketing & sales': 'التسويق والمبيعات',
  'collection & recovery': 'الاستحصال والتحصيل',

  // Job Titles
  'aml officer': 'مسؤول مكافحة غسل الأموال',
  'accountant': 'محاسب',
  'accounts manager': 'مدير الحسابات',
  'accounts officer': 'مسؤول الحسابات',
  'cash management officer': 'مسؤول إدارة النقد',
  'compliance analyst': 'محلل امتثال',
  'compliance manager': 'مدير الامتثال',
  'compliance officer': 'مسؤول الامتثال',
  'credit analyst': 'محلل ائتمان',
  'credit assistant': 'مساعد ائتمان',
  'credit coordinator': 'منسق الائتمان',
  'credit documentation officer': 'مسؤول توثيق الائتمان',
  'credit manager': 'مدير الائتمان',
  'credit officer': 'مسؤول ائتمان',
  'financial accountant': 'محاسب مالي',
  'hr officer': 'مسؤول الموارد البشرية',
  'hr manager': 'مدير الموارد البشرية',
  'loan officer': 'مسؤول قروض',
  'loan officer supervisor': 'مشرف مسؤولي القروض',
  'office manager': 'مدير المكتب',
  'branch manager': 'مدير الفرع',
  'personnel officer': 'مسؤول شؤون الموظفين',
  'receptionist': 'موظف استقبال',
  'recruitment officer': 'مسؤول التوظيف',
  'treasury accountant': 'محاسب الخزينة',
  'treasury manager': 'مدير الخزينة',
  'treasury officer': 'مسؤول الخزينة',
  'maintenance worker & driver': 'عامل صيانة وسائق',
  'regional deputy coordinator': 'نائب منسق إقليمي',
  'microfinance loan assistant': 'مساعد ائتمان القروض الصغيرة',
  'collector loan officer': 'مسؤول قروض محصل',
  'cleaners': 'عمال نظافة',
  'cleaner': 'عامل نظافة',
  'cleaner/tea person': 'عامل نظافة / ضيافة',
  'chief accountant': 'محاسب رئيسي',
  'it officer': 'مسؤول تقنية المعلومات',
  'risk & compliance officer': 'مسؤول الامتثال والمخاطر',
  'guard & maintenance': 'حارس وصيانة',
  'guard&maintenance': 'حارس وصيانة',
  'security guard': 'حارس أمن',
  'se assistant': 'مساعد ائتمان القروض الصغيرة',
  'se deputy credit coordinator': 'نائب منسق ائتمان إقليمي',
  'collection officer': 'مسؤول قروض محصل',
  'teller': 'أمين صندوق'
};

export const isArabicText = (s?: any): boolean => {
  return typeof s === 'string' && /[\u0600-\u06FF]/.test(s);
};

export function getDepartmentName(dept?: string | null, targetLang: 'ar' | 'en' = 'ar'): string {
  if (!dept || dept === 'N/A' || dept === 'غير محدد') return '';
  const trimmed = dept.trim();

  if (targetLang === 'ar') {
    if (isArabicText(trimmed)) return trimmed;
    const lower = trimmed.toLowerCase();
    if (DICT_AR[lower]) return DICT_AR[lower];
    // Check DICT_EN values
    const match = Object.entries(DICT_EN).find(([k, v]) => v.toLowerCase() === lower);
    if (match) return match[0];
    return trimmed;
  } else {
    // Target is English
    if (!isArabicText(trimmed)) return trimmed;
    if (DICT_EN[trimmed]) return DICT_EN[trimmed];
    const match = Object.entries(DICT_AR).find(([k, v]) => v === trimmed);
    if (match) {
      // Capitalize
      return match[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return trimmed;
  }
}

export function getJobTitleName(
  title?: string | null, 
  targetLang: 'ar' | 'en' = 'ar', 
  positionsList?: any[]
): string {
  if (!title || title === 'N/A' || title === 'غير محدد') return '';
  const trimmed = title.trim();

  // 1. Try resolving through positionsList if provided
  if (Array.isArray(positionsList) && positionsList.length > 0) {
    const found = positionsList.find((p: any) => {
      const ar = (p.name_ar || p.title_ar || p.name || '').toLowerCase().trim();
      const en = (p.name_en || p.title_en || p.title || p.name || '').toLowerCase().trim();
      const t = trimmed.toLowerCase();
      return ar === t || en === t;
    });

    if (found) {
      if (targetLang === 'ar') {
        const ar = found.name_ar || found.title_ar || (isArabicText(found.name) ? found.name : '');
        if (ar) return ar;
      } else {
        const en = found.name_en || found.title_en || found.title || (!isArabicText(found.name) ? found.name : '');
        if (en && en !== 'N/A') return en;
      }
    }
  }

  // 2. Dictionary fallback
  if (targetLang === 'ar') {
    if (isArabicText(trimmed)) return trimmed;
    const lower = trimmed.toLowerCase();
    if (DICT_AR[lower]) return DICT_AR[lower];
    const match = Object.entries(DICT_EN).find(([k, v]) => v.toLowerCase() === lower);
    if (match) return match[0];
    return trimmed;
  } else {
    if (!isArabicText(trimmed)) return trimmed;
    if (DICT_EN[trimmed]) return DICT_EN[trimmed];
    const match = Object.entries(DICT_AR).find(([k, v]) => v === trimmed);
    if (match) {
      return match[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return trimmed;
  }
}
