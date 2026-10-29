import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ExecutiveDecision {
  id: string;
  type: 'leave' | 'hire' | 'bonus' | 'contract' | 'overtime' | 'termination' | 'budget';
  titleAr: string;
  titleEn: string;
  requesterName: string;
  requesterRole: string;
  requesterPhoto?: string;
  department: string;
  branch: string;
  date: string;
  priority: 'urgent' | 'high' | 'normal';
  detailsAr: string;
  detailsEn: string;
  amountOrDuration?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  decisionNote?: string;
  decisionDate?: string;
  policyCompliance: 'compliant' | 'exception_required' | 'requires_audit';
  impactSummaryAr: string;
  impactSummaryEn: string;
}

export interface BranchPerformance {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  governorate: string;
  managerName: string;
  managerPhone: string;
  headcount: number;
  activeToday: number;
  attendanceRate: number;
  monthlyPayrollIqd: number;
  budgetUtilizationPct: number;
  performanceScore: number;
  operationalStatus: 'optimal' | 'warning' | 'audit_pending';
  activeAlert?: string;
}

export interface ExecutiveDecree {
  id: string;
  number: string;
  year: number;
  titleAr: string;
  titleEn: string;
  category: 'organizational' | 'financial' | 'security' | 'promotions' | 'circular';
  priority: 'urgent' | 'normal' | 'confidential';
  date: string;
  issuedBy: string;
  targetAudienceAr: string;
  targetAudienceEn: string;
  contentAr: string;
  contentEn: string;
  acknowledgmentRate: number;
  status: 'active' | 'archived';
}

export interface StrategicKPIs {
  totalStaff: number;
  activeBranches: number;
  monthlyPayrollTotalIqd: number;
  pendingDecisionsCount: number;
  todayAttendancePct: number;
  turnoverRatePct: number;
  criticalVacancies: number;
  budgetAdherencePct: number;
  socialSecurityCompliancePct: number;
}

interface ExecutiveContextType {
  executiveUser: any;
  setExecutiveUser: (user: any) => void;
  isAuthenticated: boolean;
  loginAsGeneralManager: () => void;
  logout: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  language: 'ar' | 'en';
  toggleLanguage: () => void;
  t: (ar: string, en: string) => string;
  
  // Data
  kpis: StrategicKPIs;
  decisions: ExecutiveDecision[];
  branches: BranchPerformance[];
  decrees: ExecutiveDecree[];
  
  // Decision Actions
  approveDecision: (id: string, note?: string) => void;
  rejectDecision: (id: string, reason: string) => void;
  requestRevision: (id: string, comment: string) => void;
  
  // Decree Actions
  issueDecree: (decree: Omit<ExecutiveDecree, 'id' | 'acknowledgmentRate' | 'status'>) => void;
  
  // Emergency Actions
  triggerEmergencyAlert: (title: string, message: string) => void;
  emergencyAlert: { active: boolean; title: string; message: string; timestamp?: string } | null;
  clearEmergencyAlert: () => void;
}

const DEFAULT_KPIS: StrategicKPIs = {
  totalStaff: 1482,
  activeBranches: 16,
  monthlyPayrollTotalIqd: 1845250000,
  pendingDecisionsCount: 7,
  todayAttendancePct: 96.8,
  turnoverRatePct: 2.1,
  criticalVacancies: 3,
  budgetAdherencePct: 98.4,
  socialSecurityCompliancePct: 100
};

const INITIAL_DECISIONS: ExecutiveDecision[] = [
  {
    id: 'dec-001',
    type: 'leave',
    titleAr: 'طلب إجازة خارجية لمدير فرع البصرة',
    titleEn: 'Annual Leave Request - Basra Branch Manager',
    requesterName: 'أ. حيدر جاسم الموسوي',
    requesterRole: 'مدير فرع البصرة والمنطقة الجنوبية',
    department: 'إدارة الفروع الجنوبية',
    branch: 'البصرة - المركز',
    date: '2026-10-20',
    priority: 'urgent',
    detailsAr: 'طلب إجازة اعتيادية سنوية لمدة 14 يوماً لغرض السفر مع تفويض نائب مدير الفرع (م. كرار ناصر) بكافة الصلاحيات التشغيلية والإدارية.',
    detailsEn: 'Annual leave request for 14 days with official operational delegation to Deputy Manager Karrar Nasser.',
    amountOrDuration: '14 يوماً (15 Nov - 29 Nov 2026)',
    status: 'pending',
    policyCompliance: 'compliant',
    impactSummaryAr: 'تم التنسيق مع إدارة العمليات لضمان استمرارية نشاط الفرع وسقف الإقراض اليومي.',
    impactSummaryEn: 'Operations coordinated to ensure branch lending continuity.'
  },
  {
    id: 'dec-002',
    type: 'hire',
    titleAr: 'المصادقة على تعيين رئيس قسم العمليات المركزية',
    titleEn: 'Approval of Central Operations Department Head Hiring',
    requesterName: 'د. ياسمين خليل السامرائي',
    requesterRole: 'مديرة إدارة الموارد البشرية والتوظيف',
    department: 'الموارد البشرية والعمليات',
    branch: 'المقر العام - بغداد المنصور',
    date: '2026-10-19',
    priority: 'urgent',
    detailsAr: 'المرشح (م. عمر رعد طه) اجتاز المقابلات بنسبة 94% بخبرة 12 عاماً في المصارف العراقية ومؤسسات التمويل الأصغر. الراتب المقترح 3,200,000 د.ع ضمن سلم الدرجات القيادية.',
    detailsEn: 'Candidate Eng. Omar Raad Taha passed interviews with 94% score. Proposed salary 3.2M IQD within Grade A leadership band.',
    amountOrDuration: '3,200,000 د.ع شهرياً',
    status: 'pending',
    policyCompliance: 'compliant',
    impactSummaryAr: 'شغل موقع قيادي استراتيجي لرفع كفاءة تسوية المحافظ التمويلية في كافة الفروع.',
    impactSummaryEn: 'Strategic leadership role to elevate portfolio settlement efficiency.'
  },
  {
    id: 'dec-003',
    type: 'bonus',
    titleAr: 'مكافأة أداء استثنائية لكادر فرع أربيل',
    titleEn: 'Exceptional Performance Bonus - Erbil Branch Team',
    requesterName: 'أ. آزاد سيروان البرزنجي',
    requesterRole: 'المدير الإقليمي لكردستان العراق',
    department: 'إقليم كردستان',
    branch: 'أربيل',
    date: '2026-10-18',
    priority: 'high',
    detailsAr: 'تحقيق فرع أربيل نسبة 142% من المستهدف الربعي في برنامج تمويل المشاريع الريادية مع صفر تعثر ائتماني خلال الربع الثالث. إجمالي المكافأة المقترحة 8,500,000 د.ع توزع على 18 موظفاً.',
    detailsEn: 'Erbil branch exceeded Q3 microfinance targets by 142% with zero default. Proposed bonus: 8.5M IQD distributed among 18 staff.',
    amountOrDuration: '8,500,000 د.ع (إجمالي 18 موظفاً)',
    status: 'pending',
    policyCompliance: 'exception_required',
    impactSummaryAr: 'حافز تنافسي مباشر يتماشى مع خطة تحفيز الفروع المتميزة والمعتمدة من مجلس الإدارة.',
    impactSummaryEn: 'Direct performance incentive aligned with board-approved motivation scheme.'
  },
  {
    id: 'dec-004',
    type: 'contract',
    titleAr: 'تجديد عقود 8 مدراء أقسام مع علاوة أداء سنوية',
    titleEn: 'Contract Renewal for 8 Division Directors + Performance Step',
    requesterName: 'د. ياسمين خليل السامرائي',
    requesterRole: 'مديرة إدارة الموارد البشرية',
    department: 'المقر الرئيسي والفروع',
    branch: 'كافة الفروع والمقر',
    date: '2026-10-17',
    priority: 'high',
    detailsAr: 'انتهاء العقود السنوية لـ 8 من قيادات الإدارة الوسطى (تقنية المعلومات، التدقيق، الالتزام، إدارة المخاطر، وفروع الكرخ والرصافة). التوصية: تجديد لمدة سنتين مع زيادة دورية 5%.',
    detailsEn: 'Annual contracts expiring for 8 middle-management directors. Recommended: 2-year renewal with 5% annual increment.',
    amountOrDuration: 'تجديد لمدة سنتين (2026 - 2028)',
    status: 'pending',
    policyCompliance: 'compliant',
    impactSummaryAr: 'ضمان الاستقرار الإداري واستبقاء الكفاءات القيادية المصرفية في فيتاس العراق.',
    impactSummaryEn: 'Preserving leadership stability and retaining top banking talent.'
  },
  {
    id: 'dec-005',
    type: 'overtime',
    titleAr: 'استثناء صرف ساعات عمل إضافي طارئ لفريق السحابة والـ IT',
    titleEn: 'Emergency Overtime Exception - Cloud & IT Engineering',
    requesterName: 'م. سرمد فؤاد الجبوري',
    requesterRole: 'مدير البنية التحتية والتحول الرقمي',
    department: 'تكنولوجيا المعلومات والاتصالات',
    branch: 'المقر العام - بغداد',
    date: '2026-10-16',
    priority: 'normal',
    detailsAr: 'تنفيذ أعمال الصيانة الكبرى ونقل قاعدة بيانات الفروع إلى الخوادم السحابية الجديدة في عطلة نهاية الأسبوع (48 ساعة عمل ليلي متواصل لـ 6 مهندسين). تجاوز السقف الاعتيادي.',
    detailsEn: 'Major database server migration over weekend. 48 hours continuous night work for 6 engineers exceeding regular limit.',
    amountOrDuration: '2,880,000 د.ع (48 ساعة × 6 مهندسين)',
    status: 'pending',
    policyCompliance: 'exception_required',
    impactSummaryAr: 'إجراء تشغيلي حرج لتفادي أي توقف لمنظومة الإقراض وصرف الرواتب.',
    impactSummaryEn: 'Critical operational upgrade preventing lending/payroll service interruptions.'
  },
  {
    id: 'dec-006',
    type: 'termination',
    titleAr: 'تسوية إنهاء خدمات بالتراضي لمسؤول ائتمان فرع النجف',
    titleEn: 'Mutual Separation & Settlement - Najaf Credit Officer',
    requesterName: 'أ. ضياء عبدالأمير الخفاجي',
    requesterRole: 'مدير فرع النجف الأشرف',
    department: 'إدارة الائتمان',
    branch: 'النجف الأشرف',
    date: '2026-10-15',
    priority: 'normal',
    detailsAr: 'طلب إنهاء خدمة بالتراضي ونقل كفالات الموظف، مع براءة ذمة مالية تامة ومكافأة نهاية الخدمة وفق المادة 45 من قانون العمل العراقي.',
    detailsEn: 'Mutual separation agreement with full financial clearance and statutory severance under Iraqi Labor Law Art. 45.',
    amountOrDuration: 'مستحقات نهاية الخدمة: 4,120,000 د.ع',
    status: 'pending',
    policyCompliance: 'compliant',
    impactSummaryAr: 'تم تدقيق كافة ملفات القروض والذمم المالية والتحقق من عدم وجود أي التزامات معلقة.',
    impactSummaryEn: 'Audited all credit files with zero outstanding liabilities.'
  },
  {
    id: 'dec-007',
    type: 'budget',
    titleAr: 'اعتماد موازنة برنامج القيادة المصرفية العليا لعام 2026',
    titleEn: 'Approval of 2026 Executive Banking Leadership Program Budget',
    requesterName: 'أ. رامي عبدالستار التميمي',
    requesterRole: 'مدير التدريب والتطوير المؤسسي',
    department: 'التدريب وبناء القدرات',
    branch: 'المقر العام والفروع',
    date: '2026-10-14',
    priority: 'high',
    detailsAr: 'برنامج تدريبي معتمد بالتعاون مع المعهد المصرفي العراقي لتدريب 25 مدير فرع وقسم على أحدث تقنيات الإقراض المتطور والتحليل المالي.',
    detailsEn: 'Executive leadership certification for 25 branch & division managers in advanced lending & financial analysis.',
    amountOrDuration: '15,000,000 د.ع (شامل الشهادات والمدربين)',
    status: 'pending',
    policyCompliance: 'compliant',
    impactSummaryAr: 'استثمار استراتيجي لرفع جودة إدارة المحافظ وتخفيض المخاطر الائتمانية.',
    impactSummaryEn: 'Strategic capacity-building lowering institutional credit risk.'
  }
];

const INITIAL_BRANCHES: BranchPerformance[] = [
  {
    id: 'br-bgd-mansour',
    code: 'BGD-01',
    nameAr: 'المقر العام - بغداد المنصور',
    nameEn: 'Baghdad HQ - Mansour',
    governorate: 'بغداد',
    managerName: 'د. شاكر الحسني',
    managerPhone: '+964 780 111 2233',
    headcount: 245,
    activeToday: 241,
    attendanceRate: 98.4,
    monthlyPayrollIqd: 385000000,
    budgetUtilizationPct: 97.2,
    performanceScore: 99.1,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-bgd-karrada',
    code: 'BGD-02',
    nameAr: 'بغداد - فرع الكرادة',
    nameEn: 'Baghdad - Karrada Branch',
    governorate: 'بغداد',
    managerName: 'أ. حيدر صباح الجبوري',
    managerPhone: '+964 781 222 3344',
    headcount: 112,
    activeToday: 109,
    attendanceRate: 97.3,
    monthlyPayrollIqd: 142000000,
    budgetUtilizationPct: 96.5,
    performanceScore: 97.8,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-bgd-wehda',
    code: 'BGD-03',
    nameAr: 'بغداد - فرع الوحدة',
    nameEn: 'Baghdad - Wehda Branch',
    governorate: 'بغداد',
    managerName: 'أ. نورالدين ماجد البغدادي',
    managerPhone: '+964 782 333 4455',
    headcount: 98,
    activeToday: 95,
    attendanceRate: 96.9,
    monthlyPayrollIqd: 120500000,
    budgetUtilizationPct: 94.8,
    performanceScore: 96.2,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-bgd-shaab',
    code: 'BGD-04',
    nameAr: 'بغداد - فرع الشعب',
    nameEn: 'Baghdad - Shaab Branch',
    governorate: 'بغداد',
    managerName: 'أ. مصطفى فاضل الحمداني',
    managerPhone: '+964 783 444 5566',
    headcount: 88,
    activeToday: 84,
    attendanceRate: 95.5,
    monthlyPayrollIqd: 108000000,
    budgetUtilizationPct: 99.1,
    performanceScore: 95.0,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-basra',
    code: 'BSR-01',
    nameAr: 'البصرة - الفرع الإقليمي',
    nameEn: 'Basra Regional Branch',
    governorate: 'البصرة',
    managerName: 'أ. حيدر جاسم الموسوي',
    managerPhone: '+964 780 555 6677',
    headcount: 148,
    activeToday: 143,
    attendanceRate: 96.6,
    monthlyPayrollIqd: 182000000,
    budgetUtilizationPct: 101.4,
    performanceScore: 98.2,
    operationalStatus: 'warning',
    activeAlert: 'تجاوز ميزانية العمل الإضافي بنسبة 1.4% بسبب تدقيق المحافظ النصف سنوية'
  },
  {
    id: 'br-erbil',
    code: 'EBL-01',
    nameAr: 'أربيل - فرع كردستان',
    nameEn: 'Erbil - Kurdistan Branch',
    governorate: 'أربيل',
    managerName: 'أ. آزاد سيروان البرزنجي',
    managerPhone: '+964 750 666 7788',
    headcount: 125,
    activeToday: 123,
    attendanceRate: 98.4,
    monthlyPayrollIqd: 165000000,
    budgetUtilizationPct: 95.0,
    performanceScore: 100.0,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-sulaymaniyah',
    code: 'SUL-01',
    nameAr: 'السليمانية - فرع الإقليم',
    nameEn: 'Sulaymaniyah Branch',
    governorate: 'السليمانية',
    managerName: 'أ. دلير محمد شواني',
    managerPhone: '+964 750 777 8899',
    headcount: 94,
    activeToday: 91,
    attendanceRate: 96.8,
    monthlyPayrollIqd: 119000000,
    budgetUtilizationPct: 93.5,
    performanceScore: 97.4,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-najaf',
    code: 'NJF-01',
    nameAr: 'النجف الأشرف - الفرع الرئيسي',
    nameEn: 'Najaf Branch',
    governorate: 'النجف',
    managerName: 'أ. ضياء عبدالأمير الخفاجي',
    managerPhone: '+964 781 888 9900',
    headcount: 86,
    activeToday: 83,
    attendanceRate: 96.5,
    monthlyPayrollIqd: 105000000,
    budgetUtilizationPct: 94.0,
    performanceScore: 96.0,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-karbala',
    code: 'KRB-01',
    nameAr: 'كربلاء المقدسة - الفرع الرئيسي',
    nameEn: 'Karbala Branch',
    governorate: 'كربلاء',
    managerName: 'أ. علاء مهدي الحسيني',
    managerPhone: '+964 782 999 0011',
    headcount: 82,
    activeToday: 80,
    attendanceRate: 97.6,
    monthlyPayrollIqd: 101000000,
    budgetUtilizationPct: 96.0,
    performanceScore: 97.5,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-mosul',
    code: 'MSL-01',
    nameAr: 'نينوى - فرع الموصل',
    nameEn: 'Mosul - Nineveh Branch',
    governorate: 'نينوى',
    managerName: 'أ. مهند ذنون الأعرجي',
    managerPhone: '+964 770 123 4567',
    headcount: 92,
    activeToday: 88,
    attendanceRate: 95.7,
    monthlyPayrollIqd: 114000000,
    budgetUtilizationPct: 98.2,
    performanceScore: 96.8,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-kirkuk',
    code: 'KRK-01',
    nameAr: 'كركوك - فرع المدينة',
    nameEn: 'Kirkuk Branch',
    governorate: 'كركوك',
    managerName: 'أ. برهان كمال الداودي',
    managerPhone: '+964 771 234 5678',
    headcount: 76,
    activeToday: 73,
    attendanceRate: 96.1,
    monthlyPayrollIqd: 94500000,
    budgetUtilizationPct: 95.8,
    performanceScore: 95.4,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-kut',
    code: 'KUT-01',
    nameAr: 'واسط - فرع الكوت',
    nameEn: 'Wasit - Kut Branch',
    governorate: 'واسط',
    managerName: 'أ. وسام كاظم السعدون',
    managerPhone: '+964 780 345 6789',
    headcount: 65,
    activeToday: 63,
    attendanceRate: 96.9,
    monthlyPayrollIqd: 81000000,
    budgetUtilizationPct: 92.4,
    performanceScore: 96.1,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-hillah',
    code: 'BAB-01',
    nameAr: 'بابل - فرع الحلة',
    nameEn: 'Babil - Hillah Branch',
    governorate: 'بابل',
    managerName: 'أ. ثامر سلمان المعموري',
    managerPhone: '+964 781 456 7890',
    headcount: 72,
    activeToday: 70,
    attendanceRate: 97.2,
    monthlyPayrollIqd: 89000000,
    budgetUtilizationPct: 95.0,
    performanceScore: 96.5,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-nasiriyah',
    code: 'DHI-01',
    nameAr: 'ذي قار - فرع الناصرية',
    nameEn: 'Dhi Qar - Nasiriyah Branch',
    governorate: 'ذي قار',
    managerName: 'أ. علي جبار الغزي',
    managerPhone: '+964 782 567 8901',
    headcount: 68,
    activeToday: 65,
    attendanceRate: 95.6,
    monthlyPayrollIqd: 83500000,
    budgetUtilizationPct: 94.2,
    performanceScore: 95.8,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-diwaniyah',
    code: 'QAD-01',
    nameAr: 'القادسية - فرع الديوانية',
    nameEn: 'Qadisiyah - Diwaniyah Branch',
    governorate: 'القادسية',
    managerName: 'أ. فراس كريم الخزعلي',
    managerPhone: '+964 783 678 9012',
    headcount: 54,
    activeToday: 52,
    attendanceRate: 96.3,
    monthlyPayrollIqd: 67000000,
    budgetUtilizationPct: 93.0,
    performanceScore: 95.2,
    operationalStatus: 'optimal'
  },
  {
    id: 'br-amarah',
    code: 'MAY-01',
    nameAr: 'ميسان - فرع العمارة',
    nameEn: 'Maysan - Amarah Branch',
    governorate: 'ميسان',
    managerName: 'أ. مازن رحيم البهادلي',
    managerPhone: '+964 780 789 0123',
    headcount: 55,
    activeToday: 53,
    attendanceRate: 96.4,
    monthlyPayrollIqd: 68250000,
    budgetUtilizationPct: 91.5,
    performanceScore: 96.0,
    operationalStatus: 'optimal'
  }
];

const INITIAL_DECREES: ExecutiveDecree[] = [
  {
    id: 'dcr-58',
    number: 'أمر إداري رقم (58)',
    year: 2026,
    titleAr: 'تطبيق التعديلات التشريعية لقانون الضمان الاجتماعي رقم 18 لسنة 2023',
    titleEn: 'Implementation of Social Security Law No. 18 of 2023 Amendments',
    category: 'financial',
    priority: 'urgent',
    date: '2026-10-18',
    issuedBy: 'د. شاكر الحسني - المدير العام التنفيذي',
    targetAudienceAr: 'كافة الفروع والإدارات والأقسام في عموم العراق',
    targetAudienceEn: 'All branches, directorates and units across Iraq',
    contentAr: 'بناءً على الصلاحيات المخولة لنا واستناداً إلى الجريدة الرسمية (الوقائع العراقية) وبدء نفاذ قانون التقاعد والضمان الاجتماعي للعمال رقم 18 لسنة 2023، تقرر اعتماد نسب الاستقطاع الرسمية (5% على الموظف و12% على رب العمل) مع الالتزام التام بالحدين الأدنى (350,000 د.ع) والأعلى (5,000,000 د.ع).',
    contentEn: 'Pursuant to our executive authorities and Law 18 of 2023, standard statutory contribution rates (5% employee, 12% employer) are implemented across all payroll systems.',
    acknowledgmentRate: 100,
    status: 'active'
  },
  {
    id: 'dcr-52',
    number: 'أمر إداري رقم (52)',
    year: 2026,
    titleAr: 'منح مكافأة مالية تحفيزية لفرق التميز الإقليمي (الربع الثالث)',
    titleEn: 'Performance Incentive Awards for Regional Excellence (Q3)',
    category: 'promotions',
    priority: 'normal',
    date: '2026-10-10',
    issuedBy: 'د. شاكر الحسني - المدير العام التنفيذي',
    targetAudienceAr: 'الفروع المتميزة (أربيل، بغداد الكرادة، البصرة)',
    targetAudienceEn: 'Winning Branches (Erbil, Baghdad Karrada, Basra)',
    contentAr: 'تقديراً للجهود الاستثنائية التي بذلتها كوادرنا في تحقيق الأهداف الائتمانية والتشغيلية بنسب إنجاز قياسية، تقرر صرف حافز تفوق مالي للفروع الفائزة بالمراكز الثلاثة الأولى وفق سلم التقييم المعتمد.',
    contentEn: 'Awarding financial performance bonuses to top 3 achieving branches for exceptional microfinance outreach and recovery.',
    acknowledgmentRate: 98,
    status: 'active'
  },
  {
    id: 'dcr-45',
    number: 'تعميم إداري رقم (14)',
    year: 2026,
    titleAr: 'سياسة حماية البيانات المصرفية والتحول الكامل للأرشفة الرقمية المشفرة',
    titleEn: 'Banking Data Protection & Encrypted Digital Archiving Policy',
    category: 'security',
    priority: 'confidential',
    date: '2026-09-28',
    issuedBy: 'د. شاكر الحسني - المدير العام التنفيذي',
    targetAudienceAr: 'مدراء الفروع، مسؤولي الائتمان، وموظفي العمليات',
    targetAudienceEn: 'Branch Managers, Credit Officers & Operations Staff',
    contentAr: 'يمنع منعاً باتاً تداول مستندات كفالات واقتراض العملاء عبر القنوات غير المعتمدة رسمياً، والتأكيد على حصر حفظ كافة أضابير الموظفين والمقترضين عبر منظومة الأرشفة الرقمية المشفرة لنظام VITAS IRAQ HRMS.',
    contentEn: 'Strict prohibition of sharing client collateral documents through unapproved channels. All records must be stored in encrypted HRMS vaults.',
    acknowledgmentRate: 96,
    status: 'active'
  }
];

const ExecutiveContext = createContext<ExecutiveContextType | undefined>(undefined);

export const ExecutiveContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('vitas_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [language, setLanguage] = useState<'ar' | 'en'>(() => {
    try {
      return (localStorage.getItem('vitas_language') as 'ar' | 'en') || 'ar';
    } catch {
      return 'ar';
    }
  });

  const applyThemeToDOM = (nextTheme: 'dark' | 'light') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.add('disable-transitions');
    if (nextTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('vitas_theme', nextTheme);
    } catch {}

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('disable-transitions');
      });
    });
  };

  const applyLanguageToDOM = (nextLang: 'ar' | 'en') => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.add('disable-transitions');
    root.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    root.lang = nextLang;
    try {
      localStorage.setItem('vitas_language', nextLang);
    } catch {}

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('disable-transitions');
      });
    });
  };

  React.useLayoutEffect(() => {
    applyThemeToDOM(theme);
  }, [theme]);

  React.useLayoutEffect(() => {
    applyLanguageToDOM(language);
  }, [language]);
  
  const [executiveUser, setExecutiveUser] = useState<any>(() => {
    return {
      id: 'exec-gm-001',
      badgeNo: 'VTS-GM-01',
      fullNameAr: 'د. شاكر الحسني',
      fullNameEn: 'Dr. Shaker Al-Hasani',
      role: 'General Manager & CEO',
      titleAr: 'المدير العام والرئيس التنفيذي',
      titleEn: 'Managing Director & CEO',
      organizationAr: 'شركة فيتاس العراق للتمويل الأصغر',
      organizationEn: 'VITAS Iraq Microfinance',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
      email: 'gm.director@vitasiraq.org',
      phone: '+964 780 111 0001'
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [kpis, setKpis] = useState<StrategicKPIs>(DEFAULT_KPIS);
  const [decisions, setDecisions] = useState<ExecutiveDecision[]>(INITIAL_DECISIONS);
  const [branches] = useState<BranchPerformance[]>(INITIAL_BRANCHES);
  const [decrees, setDecrees] = useState<ExecutiveDecree[]>(INITIAL_DECREES);
  const [emergencyAlert, setEmergencyAlert] = useState<{ active: boolean; title: string; message: string; timestamp?: string } | null>(null);

  // Auto calculate pending count
  useEffect(() => {
    const pendingCount = decisions.filter(d => d.status === 'pending').length;
    setKpis(prev => ({ ...prev, pendingDecisionsCount: pendingCount }));
  }, [decisions]);

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'dark' ? 'light' : 'dark';
    applyThemeToDOM(next);
    return next;
  });
  const toggleLanguage = () => setLanguage(prev => {
    const next = prev === 'ar' ? 'en' : 'ar';
    applyLanguageToDOM(next);
    return next;
  });
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const loginAsGeneralManager = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const approveDecision = (id: string, note?: string) => {
    setDecisions(prev => prev.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: 'approved',
          decisionNote: note || 'تمت المصادقة والاعتماد بموجب الصلاحيات المخولة للمدير العام.',
          decisionDate: new Date().toISOString()
        };
      }
      return d;
    }));
  };

  const rejectDecision = (id: string, reason: string) => {
    setDecisions(prev => prev.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: 'rejected',
          decisionNote: reason || 'مرفوض لعدم استيفاء المبررات التشغيلية أو المالية.',
          decisionDate: new Date().toISOString()
        };
      }
      return d;
    }));
  };

  const requestRevision = (id: string, comment: string) => {
    setDecisions(prev => prev.map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: 'revision',
          decisionNote: comment || 'يرجى استيفاء البيانات وتقديم دراسة جدوى مفصلة.',
          decisionDate: new Date().toISOString()
        };
      }
      return d;
    }));
  };

  const issueDecree = (decreeData: Omit<ExecutiveDecree, 'id' | 'acknowledgmentRate' | 'status'>) => {
    const newDecree: ExecutiveDecree = {
      ...decreeData,
      id: `dcr-${Date.now()}`,
      acknowledgmentRate: 0,
      status: 'active'
    };
    setDecrees(prev => [newDecree, ...prev]);
  };

  const triggerEmergencyAlert = (title: string, message: string) => {
    setEmergencyAlert({
      active: true,
      title,
      message,
      timestamp: new Date().toLocaleTimeString('ar-IQ')
    });
  };

  const clearEmergencyAlert = () => {
    setEmergencyAlert(null);
  };

  return (
    <ExecutiveContext.Provider
      value={{
        executiveUser,
        setExecutiveUser,
        isAuthenticated,
        loginAsGeneralManager,
        logout,
        theme,
        toggleTheme,
        language,
        toggleLanguage,
        t,
        kpis,
        decisions,
        branches,
        decrees,
        approveDecision,
        rejectDecision,
        requestRevision,
        issueDecree,
        triggerEmergencyAlert,
        emergencyAlert,
        clearEmergencyAlert
      }}
    >
      {children}
    </ExecutiveContext.Provider>
  );
};

export const useExecutiveContext = () => {
  const context = useContext(ExecutiveContext);
  if (!context) {
    throw new Error('useExecutiveContext must be used within an ExecutiveContextProvider');
  }
  return context;
};
