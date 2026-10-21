import {
  User,
  Employee,
  VariableDefinition,
  FormulaDefinition,
  ImportBatch,
  LoanOfficerEntitlement,
  SupervisorEntitlement,
  PeriodSummary,
  AuditLog,
  AppSettings,
  CalculationPeriodStatus,
} from '../types';
import { FormulaEngine } from './formulaEngine';

const STORAGE_KEYS = {
  USERS: 'ims_users_v1',
  CURRENT_USER: 'ims_current_user_v1',
  EMPLOYEES: 'ims_employees_v1',
  VARIABLES: 'ims_variables_v1',
  FORMULAS: 'ims_formulas_v1',
  IMPORT_BATCHES: 'ims_import_batches_v1',
  LO_ENTITLEMENTS: 'ims_lo_entitlements_v1',
  SUPERVISOR_ENTITLEMENTS: 'ims_sup_entitlements_v1',
  PERIOD_SUMMARIES: 'ims_period_summaries_v1',
  AUDIT_LOGS: 'ims_audit_logs_v1',
  SETTINGS: 'ims_settings_v1',
};

// Seed Users
const DEFAULT_USERS: User[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'م. خالد المنصور (مدير النظام)',
    email: 'khalid@vitasiraq.com',
    role: 'admin',
    office: 'الإدارة العامة - بغداد',
  },
  {
    id: 'usr_spec',
    username: 'specialist',
    name: 'أ. سارة القحطاني (أخصائي الحوافز والتعويضات)',
    email: 'sara@vitasiraq.com',
    role: 'specialist',
    office: 'إدارة العمليات والائتمان',
  },
  {
    id: 'usr_rev',
    username: 'reviewer',
    name: 'أ. طارق الشمري (مراجع ومحاسب المستحقات)',
    email: 'tariq@vitasiraq.com',
    role: 'reviewer',
    office: 'المراجعة والتدقيق المالي',
  },
  {
    id: 'usr_app',
    username: 'approver',
    name: 'د. فيصل العتيبي (مدير الموارد البشرية والاعتماد)',
    email: 'faisal@vitasiraq.com',
    role: 'approver',
    office: 'الإدارة التنفيذية',
  },
];

// Seed Variable Definitions (The 10 Required Variables)
const DEFAULT_VARIABLES: VariableDefinition[] = [
  {
    id: 'var_01',
    code: 'Variable01',
    nameAr: 'عدد القروض المنصرفة',
    nameEn: 'Disbursed Loans Count',
    dataType: 'integer',
    unit: 'قرض',
    description: 'إجمالي عدد ملفات التمويل المنصرفة للعملاء خلال الشهر',
    defaultValue: 0,
    minValue: 0,
    maxValue: 200,
  },
  {
    id: 'var_02',
    code: 'Variable02',
    nameAr: 'إجمالي قيمة المبالغ المنصرفة',
    nameEn: 'Total Disbursed Volume',
    dataType: 'currency',
    unit: 'د.ع',
    description: 'المبلغ الإجمالي الممنوح بالدينار لمجموع التمويلات',
    defaultValue: 0,
    minValue: 0,
  },
  {
    id: 'var_03',
    code: 'Variable03',
    nameAr: 'نسبة التحصيل والسداد',
    nameEn: 'Repayment Collection Rate',
    dataType: 'percentage',
    unit: '%',
    description: 'النسبة المئوية للأقساط المحصلة مقارنة بالمطلوب سداده',
    defaultValue: 95,
    minValue: 0,
    maxValue: 100,
  },
  {
    id: 'var_04',
    code: 'Variable04',
    nameAr: 'عدد العملاء النشطين بالمحفظة',
    nameEn: 'Active Portfolio Clients',
    dataType: 'integer',
    unit: 'عميل',
    description: 'إجمالي عدد المقترضين القائمين تحت إدارة مسؤول التمويل',
    defaultValue: 0,
    minValue: 0,
  },
  {
    id: 'var_05',
    code: 'Variable05',
    nameAr: 'محفظة المخاطر المتأخرة PAR>30',
    nameEn: 'Portfolio at Risk (PAR30)',
    dataType: 'percentage',
    unit: '%',
    description: 'نسبة القروض المتعثرة المتأخرة لأكثر من 30 يوماً',
    defaultValue: 2,
    minValue: 0,
    maxValue: 100,
  },
  {
    id: 'var_06',
    code: 'Variable06',
    nameAr: 'عدد الزيارات الميدانية المنفذة',
    nameEn: 'Field Inspection Visits',
    dataType: 'integer',
    unit: 'زيارة',
    description: 'عدد المعاينات والزيارات التفتيشية الميدانية للأنشطة والعملاء',
    defaultValue: 0,
    minValue: 0,
  },
  {
    id: 'var_07',
    code: 'Variable07',
    nameAr: 'عدد العملاء الجدد المكتسبين',
    nameEn: 'New Clients Acquisition',
    dataType: 'integer',
    unit: 'عميل جديد',
    description: 'العملاء الجدد الذين تم ضمهم للمرة الأولى بالمؤسسة',
    defaultValue: 0,
    minValue: 0,
  },
  {
    id: 'var_08',
    code: 'Variable08',
    nameAr: 'مؤشر جودة ملفات الائتمان',
    nameEn: 'Credit File Quality Score',
    dataType: 'number',
    unit: 'نقطة',
    description: 'درجة تقييم دقة البيانات والاستعلام الائتماني من 100',
    defaultValue: 90,
    minValue: 0,
    maxValue: 100,
  },
  {
    id: 'var_09',
    code: 'Variable09',
    nameAr: 'أيام العمل الميداني الفعلية',
    nameEn: 'Actual Field Days Worked',
    dataType: 'integer',
    unit: 'يوم',
    description: 'عدد أيام الحضور والعمل الميداني المعتمدة بالشهر',
    defaultValue: 22,
    minValue: 0,
    maxValue: 31,
  },
  {
    id: 'var_10',
    code: 'Variable10',
    nameAr: 'مؤشر التميز والأداء النوعي',
    nameEn: 'Operational Excellence Index',
    dataType: 'number',
    unit: 'معامل',
    description: 'معامل إضافي يعكس رضا العملاء والالتزام بالضوابط التنظيمية (1.0 إلى 5.0)',
    defaultValue: 1,
    minValue: 0,
    maxValue: 10,
  },
];

// Seed Employees (Supervisors and Loan Officers in VITAS Iraq)
const DEFAULT_EMPLOYEES: Employee[] = [
  // Supervisors
  {
    id: 'emp_sup_01',
    employeeId: 'VTS-SUP-101',
    badgeNo: 'B-101',
    waid: 'WA-101',
    name: 'مصطفى المير (مدير منطقة الفرات الأوسط)',
    office: 'بابل_الحلة',
    jobTitle: 'مشرف أول مسؤولي القروض',
    category: 'Loan Officer Supervisor',
    status: 'Active',
    effectiveFrom: '2023-01-01',
    email: 'mustafa.meer@vitasiraq.com',
    phone: '+964780112233',
  },
  {
    id: 'emp_sup_02',
    employeeId: 'VTS-SUP-102',
    name: 'حيدر عبدالكريم الموسوي',
    office: 'بغداد_الكرخ',
    jobTitle: 'مشرف فرق التمويل الميداني',
    category: 'Loan Officer Supervisor',
    status: 'Active',
    effectiveFrom: '2023-03-15',
    email: 'haidar.mousawi@vitasiraq.com',
    phone: '+9647802223344',
  },
  {
    id: 'emp_sup_03',
    employeeId: 'VTS-SUP-103',
    name: 'أحمد جاسم البصري',
    office: 'البصرة',
    jobTitle: 'مشرف مسؤولي ائتمان وتمويل',
    category: 'Loan Officer Supervisor',
    status: 'Active',
    effectiveFrom: '2023-06-01',
    email: 'ahmed.basri@vitasiraq.com',
    phone: '+9647803334455',
  },

  // Supervised Loan Officers (Babil Hilla, supervised by VTS-SUP-101)
  {
    id: 'emp_lo_01',
    employeeId: 'VTS-5345',
    badgeNo: 'B-5345',
    waid: 'WA-5345',
    name: 'علي حسن محي العراوي',
    office: 'بابل_الحلة',
    jobTitle: 'مسؤول قروض أول',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-101',
    status: 'Active',
    effectiveFrom: '2023-02-01',
    email: 'ali.arawi@vitasiraq.com',
  },
  {
    id: 'emp_lo_02',
    employeeId: 'VTS-LO-202',
    name: 'زينب كاظم الفتلاوي',
    office: 'بابل_الحلة',
    jobTitle: 'مسؤول قروض وتمويل',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-101',
    status: 'Active',
    effectiveFrom: '2023-04-10',
    email: 'zainab.fatlawi@vitasiraq.com',
  },
  {
    id: 'emp_lo_03',
    employeeId: 'VTS-LO-203',
    name: 'كرار حسام الشمري',
    office: 'بابل_الحلة',
    jobTitle: 'مسؤول قروض ميداني',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-101',
    status: 'Active',
    effectiveFrom: '2023-08-01',
    email: 'karrar.shammari@vitasiraq.com',
  },

  // Supervised Loan Officers (Baghdad Karkh, supervised by VTS-SUP-102)
  {
    id: 'emp_lo_04',
    employeeId: 'VTS-LO-204',
    name: 'محمد صادق العبيدي',
    office: 'بغداد_الكرخ',
    jobTitle: 'مسؤول قروض أول',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-102',
    status: 'Active',
    effectiveFrom: '2023-05-01',
    email: 'm.obaidi@vitasiraq.com',
  },
  {
    id: 'emp_lo_05',
    employeeId: 'VTS-LO-205',
    name: 'نور مهدي السعدي',
    office: 'بغداد_الكرخ',
    jobTitle: 'مسؤول قروض وتمويل',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-102',
    status: 'Active',
    effectiveFrom: '2023-07-15',
    email: 'noor.saadi@vitasiraq.com',
  },
  {
    id: 'emp_lo_06',
    employeeId: 'VTS-LO-206',
    name: 'عمر فاضل الزبيدي',
    office: 'بغداد_الكرخ',
    jobTitle: 'مسؤول قروض ميداني',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-102',
    status: 'Active',
    effectiveFrom: '2023-09-01',
    email: 'omar.zubaidi@vitasiraq.com',
  },

  // Supervised Loan Officers (Basra, supervised by VTS-SUP-103)
  {
    id: 'emp_lo_07',
    employeeId: 'VTS-LO-207',
    name: 'حسين علي عبدالحسين',
    office: 'البصرة',
    jobTitle: 'مسؤول قروض أول',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-103',
    status: 'Active',
    effectiveFrom: '2023-03-01',
    email: 'hussein.abdulhussein@vitasiraq.com',
  },
  {
    id: 'emp_lo_08',
    employeeId: 'VTS-LO-208',
    name: 'فاطمة جواد الخفاجي',
    office: 'البصرة',
    jobTitle: 'مسؤول قروض وتمويل',
    category: 'Loan Officer',
    supervisorId: 'VTS-SUP-103',
    status: 'Active',
    effectiveFrom: '2023-06-20',
    email: 'fatima.khafaji@vitasiraq.com',
  },
];

// Seed Formulas
const DEFAULT_FORMULAS: FormulaDefinition[] = [
  {
    id: 'fml_lo_inc_v1',
    type: 'lo_incentives',
    nameAr: 'معادلة حوافز مسؤولي القروض الأساسية',
    nameEn: 'Loan Officer Incentives Core Formula',
    expression:
      'IF(Variable03 >= 95, (Variable01 * 14000) + (Variable02 * 0.0035) - (Variable05 * 8000), (Variable01 * 7500) + (Variable02 * 0.0018))',
    description:
      'إذا كانت نسبة السداد 95% فأكثر: 14,000 د.ع لكل قرض + 0.35% من حجم الصرف - خصم عن نسبة التعثر. وإلا: نصف المعدل.',
    version: 1,
    effectiveFrom: '2026-01-01',
    isActive: true,
    updatedBy: 'إدارة الرواتب والعمليات',
    updatedAt: '2026-01-01T10:00:00Z',
    testCases: [
      {
        name: 'أداء ممتاز مع سداد 96%',
        inputs: { Variable01: 25, Variable02: 30000000, Variable03: 96, Variable05: 1.5 },
        expectedOutput: 443000,
      },
    ],
  },
  {
    id: 'fml_lo_trans_v1',
    type: 'lo_transportation',
    nameAr: 'مخصصات بدل الانتقال الميداني',
    nameEn: 'Loan Officer Transportation Allowance',
    expression: 'IF(Variable06 >= 15, 75000 + (Variable06 - 15) * 3000, Variable06 * 4000)',
    description:
      'إذا بلغت الزيارات الميدانية 15 زيارة فأكثر: 75,000 د.ع أساسي + 3,000 د.ع لكل زيارة إضافية، وإلا 4,000 د.ع لكل زيارة.',
    version: 1,
    effectiveFrom: '2026-01-01',
    isActive: true,
    updatedBy: 'إدارة الرواتب والعمليات',
    updatedAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'fml_lo_bonus_v1',
    type: 'lo_bonus',
    nameAr: 'مكافآت التميز والعملاء الجدد',
    nameEn: 'Performance & New Acquisition Bonus',
    expression:
      'IF(Variable03 >= 97 AND Variable07 >= 6, 120000 + (Variable10 * 10000), IF(Variable03 >= 95 AND Variable07 >= 3, 60000, 0))',
    description:
      'مكافأة 120,000 د.ع + بونص التميز إذا كان السداد 97% فأكثر والعملاء الجدد 6 فأكثر، أو 60,000 د.ع إذا تجاوز 95% وسداد 3 عملاء.',
    version: 1,
    effectiveFrom: '2026-01-01',
    isActive: true,
    updatedBy: 'إدارة الرواتب والعمليات',
    updatedAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'fml_sup_inc_v1',
    type: 'supervisor_incentives',
    nameAr: 'معادلة حوافز مشرفي مسؤولي القروض',
    nameEn: 'Supervisor Entitlement Rollup Formula',
    expression:
      'IF(LO_AVG_REPAYMENT >= 95, (LO_TOTAL_INCENTIVES * 0.16) + (LO_QUALIFIED_COUNT * 25000) + (LO_TOTAL_DISBURSED * 0.0008), LO_TOTAL_INCENTIVES * 0.09)',
    description:
      'تحتسب بناءً على نتائج الفريق: إذا تجاوز متوسط سداد الفريق 95%: 16% من إجمالي حوافز المسؤولين + 25,000 د.ع عن كل مسؤول مؤهل + 0.08% من حجم صرف الفريق.',
    version: 1,
    effectiveFrom: '2026-01-01',
    isActive: true,
    updatedBy: 'إدارة الرواتب والعمليات',
    updatedAt: '2026-01-01T10:00:00Z',
  },
];

// Seed Sample Imported Batch for Period 2026-10
const SEED_IMPORT_BATCH: ImportBatch = {
  id: 'batch_2026_10_oct',
  period: '2026-10',
  fileName: 'Loan_Officers_Variables_Oct_2026.xlsx',
  sheetName: 'Sheet1',
  totalRows: 8,
  validRows: 8,
  errorRows: 0,
  importedBy: 'أ. سارة القحطاني',
  importedAt: '2026-10-18T09:30:00Z',
  columnMappings: {
    'Loans_Count': 'Variable01',
    'Disbursed_Amount': 'Variable02',
    'Repayment_Pct': 'Variable03',
    'Active_Clients': 'Variable04',
    'PAR30_Pct': 'Variable05',
    'Field_Visits': 'Variable06',
    'New_Clients': 'Variable07',
    'Quality_Score': 'Variable08',
    'Days_Worked': 'Variable09',
    'Excellence_Index': 'Variable10',
  },
  rows: [
    {
      employeeId: 'VTS-5345',
      employeeName: 'علي حسن محي العراوي',
      office: 'بابل_الحلة',
      isValid: true,
      variables: {
        Variable01: 28,
        Variable02: 34000000,
        Variable03: 97.4,
        Variable04: 115,
        Variable05: 1.2,
        Variable06: 24,
        Variable07: 8,
        Variable08: 96,
        Variable09: 22,
        Variable10: 4,
      },
    },
    {
      employeeId: 'VTS-LO-202',
      employeeName: 'زينب كاظم الفتلاوي',
      office: 'بابل_الحلة',
      isValid: true,
      variables: {
        Variable01: 24,
        Variable02: 29500000,
        Variable03: 96.1,
        Variable04: 98,
        Variable05: 1.8,
        Variable06: 21,
        Variable07: 7,
        Variable08: 94,
        Variable09: 22,
        Variable10: 3,
      },
    },
    {
      employeeId: 'VTS-LO-203',
      employeeName: 'كرار حسام الشمري',
      office: 'بابل_الحلة',
      isValid: true,
      variables: {
        Variable01: 19,
        Variable02: 21000000,
        Variable03: 94.2,
        Variable04: 82,
        Variable05: 3.1,
        Variable06: 18,
        Variable07: 4,
        Variable08: 89,
        Variable09: 21,
        Variable10: 2,
      },
    },
    {
      employeeId: 'VTS-LO-204',
      employeeName: 'محمد صادق العبيدي',
      office: 'بغداد_الكرخ',
      isValid: true,
      variables: {
        Variable01: 31,
        Variable02: 41000000,
        Variable03: 98.2,
        Variable04: 130,
        Variable05: 0.8,
        Variable06: 26,
        Variable07: 9,
        Variable08: 98,
        Variable09: 22,
        Variable10: 5,
      },
    },
    {
      employeeId: 'VTS-LO-205',
      employeeName: 'نور مهدي السعدي',
      office: 'بغداد_الكرخ',
      isValid: true,
      variables: {
        Variable01: 22,
        Variable02: 27000000,
        Variable03: 95.8,
        Variable04: 92,
        Variable05: 1.9,
        Variable06: 19,
        Variable07: 5,
        Variable08: 92,
        Variable09: 22,
        Variable10: 3,
      },
    },
    {
      employeeId: 'VTS-LO-206',
      employeeName: 'عمر فاضل الزبيدي',
      office: 'بغداد_الكرخ',
      isValid: true,
      variables: {
        Variable01: 16,
        Variable02: 18000000,
        Variable03: 93.5,
        Variable04: 74,
        Variable05: 3.8,
        Variable06: 14,
        Variable07: 3,
        Variable08: 85,
        Variable09: 20,
        Variable10: 2,
      },
    },
    {
      employeeId: 'VTS-LO-207',
      employeeName: 'حسين علي عبدالحسين',
      office: 'البصرة',
      isValid: true,
      variables: {
        Variable01: 29,
        Variable02: 36000000,
        Variable03: 96.8,
        Variable04: 122,
        Variable05: 1.4,
        Variable06: 23,
        Variable07: 7,
        Variable08: 95,
        Variable09: 22,
        Variable10: 4,
      },
    },
    {
      employeeId: 'VTS-LO-208',
      employeeName: 'فاطمة جواد الخفاجي',
      office: 'البصرة',
      isValid: true,
      variables: {
        Variable01: 25,
        Variable02: 31000000,
        Variable03: 95.4,
        Variable04: 105,
        Variable05: 2.1,
        Variable06: 20,
        Variable07: 6,
        Variable08: 93,
        Variable09: 22,
        Variable10: 3,
      },
    },
  ],
};

const DEFAULT_SETTINGS: AppSettings = {
  institutionNameAr: 'مؤسسة فيتاس العراق للتمويل الأصغر (VITAS Iraq)',
  institutionNameEn: 'VITAS Iraq Microfinance Institution',
  currency: 'د.ع',
  databaseName: 'vitasiraq_hris_db',
  enableStrictParCheck: true,
  minParThreshold: 5.0,
  recalculationRequiresReason: true,
  hrApiToken: 'ims_secure_token_live_hr_sync_2026_finance',
  exportDateFormat: 'YYYY-MM-DD',
};

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_seed_1',
    timestamp: '2026-10-18T09:30:00Z',
    userId: 'usr_spec',
    userName: 'أ. سارة القحطاني',
    userRole: 'specialist',
    category: 'IMPORT',
    action: 'استيراد متغيرات شهر أكتوبر 2026 من Excel',
    details: 'تم استيراد ومعاينة 8 صفوف لفروع بابل وبغداد والبصرة بنجاح بعد التحقق من أرقام الموظفين.',
  },
  {
    id: 'log_seed_2',
    timestamp: '2026-10-18T10:15:00Z',
    userId: 'usr_admin',
    userName: 'م. خالد المنصور',
    userRole: 'admin',
    category: 'FORMULAS',
    action: 'تفعيل واعتماد إصدار المعادلات رقم 1',
    details: 'تم اختبار المعادلات الرياضية لحوافز وبدل انتقال وبونص مسؤولي القروض والمشرفين.',
  },
];

export class StorageService {
  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch (e) {
      console.warn(`Error reading localStorage key ${key}:`, e);
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving to localStorage key ${key}:`, e);
    }
  }

  // Current User Session
  public static getCurrentUser(): User {
    const user = this.getItem<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (user) return user;
    const defaultUser = DEFAULT_USERS[0];
    this.setCurrentUser(defaultUser);
    return defaultUser;
  }

  public static setCurrentUser(user: User): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  public static getUsers(): User[] {
    return this.getItem<User[]>(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  public static saveUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    this.setItem(STORAGE_KEYS.USERS, users);
  }

  // Employees
  public static getEmployees(): Employee[] {
    return this.getItem<Employee[]>(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
  }

  public static saveEmployee(emp: Employee): void {
    const list = this.getEmployees();
    const index = list.findIndex((e) => e.id === emp.id || e.employeeId === emp.employeeId);
    if (index >= 0) {
      list[index] = emp;
    } else {
      list.push(emp);
    }
    this.setItem(STORAGE_KEYS.EMPLOYEES, list);
    this.logAudit('EMPLOYEES', `تحديث/إضافة موظف: ${emp.name} (${emp.employeeId})`, emp.employeeId);
  }

  public static deleteEmployee(employeeId: string): void {
    const list = this.getEmployees().filter((e) => e.employeeId !== employeeId && e.id !== employeeId);
    this.setItem(STORAGE_KEYS.EMPLOYEES, list);
    this.logAudit('EMPLOYEES', `حذف الموظف رقم ${employeeId}`, employeeId);
  }

  /**
   * Syncs real staff from VITAS Iraq HRMS database/context
   */
  public static syncFromVitasHR(vitasEmployees: any[]): { added: number; updated: number; total: number } {
    if (!Array.isArray(vitasEmployees) || vitasEmployees.length === 0) {
      return { added: 0, updated: 0, total: 0 };
    }

    const currentList = this.getEmployees();
    let addedCount = 0;
    let updatedCount = 0;

    vitasEmployees.forEach((emp) => {
      const empId = emp.badge_no ? `VTS-${emp.badge_no}` : (emp.employeeId || emp.emp_no || String(emp.id));
      const badgeNo = emp.badgeNo || emp.badge_no || '';
      const waid = emp.waid || emp.wa_id || '';
      const empName = emp.name_ar || emp.name || emp.fullName || emp.full_name_ar || 'موظف فيتاس';
      const office = emp.location_ar || emp.branch || emp.office || 'المكتب الرئيسي';
      const title = emp.position_ar || emp.position || emp.jobTitle || 'موظف';

      // Categorize as Loan Officer or Supervisor
      const titleLower = title.toLowerCase();
      const isSupervisor = titleLower.includes('مشرف') || titleLower.includes('supervisor') || titleLower.includes('مدير مكتب') || titleLower.includes('مدير فرع') || titleLower.includes('منسق');
      const isLoanOfficer = titleLower.includes('قروض') || titleLower.includes('loan') || titleLower.includes('ائتمان') || titleLower.includes('credit') || !isSupervisor;

      const category = isSupervisor ? 'Loan Officer Supervisor' : 'Loan Officer';

      const existingIdx = currentList.findIndex((e) => e.employeeId === empId || e.id === String(emp.id) || (waid && e.waid === waid));
      if (existingIdx >= 0) {
        currentList[existingIdx] = {
          ...currentList[existingIdx],
          name: empName,
          badgeNo: badgeNo || currentList[existingIdx].badgeNo,
          waid: waid || currentList[existingIdx].waid,
          office,
          jobTitle: title,
          category,
          status: emp.status === 'Inactive' ? 'Inactive' : 'Active',
          email: emp.email || emp.orgEmail || currentList[existingIdx].email,
          phone: emp.phone || emp.mobile || currentList[existingIdx].phone,
        };
        updatedCount++;
      } else {
        currentList.push({
          id: `emp_vts_${emp.id || Math.random().toString(36).substring(2, 7)}`,
          employeeId: empId,
          badgeNo,
          waid,
          name: empName,
          office,
          jobTitle: title,
          category,
          status: emp.status === 'Inactive' ? 'Inactive' : 'Active',
          effectiveFrom: emp.hire_date || '2023-01-01',
          email: emp.email || emp.orgEmail || '',
          phone: emp.phone || emp.mobile || '',
        });
        addedCount++;
      }
    });

    this.setItem(STORAGE_KEYS.EMPLOYEES, currentList);
    this.logAudit('EMPLOYEES', `مزامنة كادر فيتاس العراق: إضافة ${addedCount} وتحديث ${updatedCount} موظفاً`, 'sync_vitas_hr');
    return { added: addedCount, updated: updatedCount, total: currentList.length };
  }

  // Variables Configuration
  public static getVariables(): VariableDefinition[] {
    return this.getItem<VariableDefinition[]>(STORAGE_KEYS.VARIABLES, DEFAULT_VARIABLES);
  }

  public static saveVariables(variables: VariableDefinition[]): void {
    this.setItem(STORAGE_KEYS.VARIABLES, variables);
    this.logAudit('VARIABLES', 'تحديث إعدادات متغيرات الاحتساب العشرة', 'variables_config');
  }

  // Formulas
  public static getFormulas(): FormulaDefinition[] {
    return this.getItem<FormulaDefinition[]>(STORAGE_KEYS.FORMULAS, DEFAULT_FORMULAS);
  }

  public static saveFormula(formula: FormulaDefinition): void {
    const formulas = this.getFormulas();
    const index = formulas.findIndex((f) => f.id === formula.id);
    if (index >= 0) {
      if (formulas[index].expression !== formula.expression) {
        formula.version = formulas[index].version + 1;
        formula.updatedAt = new Date().toISOString();
      }
      formulas[index] = formula;
    } else {
      formulas.push(formula);
    }
    this.setItem(STORAGE_KEYS.FORMULAS, formulas);
    this.logAudit(
      'FORMULAS',
      `تحديث/إنشاء معادلة: ${formula.nameAr} (الإصدار ${formula.version})`,
      formula.id,
      undefined,
      formula.expression
    );
  }

  // Import Batches
  public static getImportBatches(): ImportBatch[] {
    const batches = this.getItem<ImportBatch[]>(STORAGE_KEYS.IMPORT_BATCHES, []);
    if (batches.length === 0) {
      this.setItem(STORAGE_KEYS.IMPORT_BATCHES, [SEED_IMPORT_BATCH]);
      return [SEED_IMPORT_BATCH];
    }
    return batches;
  }

  public static saveImportBatch(batch: ImportBatch): void {
    const batches = this.getImportBatches();
    const index = batches.findIndex((b) => b.id === batch.id || b.period === batch.period);
    if (index >= 0) {
      batches[index] = batch;
    } else {
      batches.unshift(batch);
    }
    this.setItem(STORAGE_KEYS.IMPORT_BATCHES, batches);
    this.logAudit(
      'IMPORT',
      `استيراد ملف ${batch.fileName} للفترة ${batch.period} (${batch.validRows} صف صالح)`,
      batch.id
    );
  }

  // Loan Officer Entitlements
  public static getLOEntitlements(period?: string): LoanOfficerEntitlement[] {
    const all = this.getItem<LoanOfficerEntitlement[]>(STORAGE_KEYS.LO_ENTITLEMENTS, []);
    if (period) {
      return all.filter((r) => r.period === period);
    }
    return all;
  }

  public static saveLOEntitlements(results: LoanOfficerEntitlement[]): void {
    const current = this.getItem<LoanOfficerEntitlement[]>(STORAGE_KEYS.LO_ENTITLEMENTS, []);
    const updated = [...current];

    results.forEach((newRecord) => {
      const idx = updated.findIndex(
        (r) => r.period === newRecord.period && r.employeeId === newRecord.employeeId
      );
      if (idx >= 0) {
        updated[idx] = newRecord;
      } else {
        updated.push(newRecord);
      }
    });

    this.setItem(STORAGE_KEYS.LO_ENTITLEMENTS, updated);
  }

  // Supervisor Entitlements
  public static getSupervisorEntitlements(period?: string): SupervisorEntitlement[] {
    const all = this.getItem<SupervisorEntitlement[]>(STORAGE_KEYS.SUPERVISOR_ENTITLEMENTS, []);
    if (period) {
      return all.filter((r) => r.period === period);
    }
    return all;
  }

  public static saveSupervisorEntitlements(results: SupervisorEntitlement[]): void {
    const current = this.getItem<SupervisorEntitlement[]>(STORAGE_KEYS.SUPERVISOR_ENTITLEMENTS, []);
    const updated = [...current];

    results.forEach((newRecord) => {
      const idx = updated.findIndex(
        (r) => r.period === newRecord.period && r.supervisorId === newRecord.supervisorId
      );
      if (idx >= 0) {
        updated[idx] = newRecord;
      } else {
        updated.push(newRecord);
      }
    });

    this.setItem(STORAGE_KEYS.SUPERVISOR_ENTITLEMENTS, updated);
  }

  // Period Summaries & Status
  public static getPeriodSummaries(): PeriodSummary[] {
    return this.getItem<PeriodSummary[]>(STORAGE_KEYS.PERIOD_SUMMARIES, []);
  }

  public static getPeriodSummary(period: string): PeriodSummary | null {
    const list = this.getPeriodSummaries();
    return list.find((p) => p.period === period) || null;
  }

  public static savePeriodSummary(summary: PeriodSummary): void {
    const list = this.getPeriodSummaries();
    const idx = list.findIndex((p) => p.period === summary.period);
    if (idx >= 0) {
      list[idx] = summary;
    } else {
      list.unshift(summary);
    }
    this.setItem(STORAGE_KEYS.PERIOD_SUMMARIES, list);
  }

  // Settings
  public static getSettings(): AppSettings {
    return this.getItem<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  public static saveSettings(settings: AppSettings): void {
    this.setItem(STORAGE_KEYS.SETTINGS, settings);
    this.logAudit('SETTINGS' as any, 'تحديث إعدادات النظام واسم المؤسسة وقاعدة البيانات');
  }

  // Audit Logs
  public static getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, DEFAULT_AUDIT_LOGS);
  }

  public static logAudit(
    category: AuditLog['category'],
    action: string,
    affectedEntityId?: string,
    previousValue?: string,
    newValue?: string
  ): void {
    const currentUser = this.getCurrentUser();
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      category,
      action,
      details: action,
      affectedEntityId,
      previousValue,
      newValue,
    };
    const logs = this.getAuditLogs();
    logs.unshift(newLog);
    if (logs.length > 500) logs.pop();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // Execute Calculation Engine for a Period
  public static calculatePeriod(
    period: string,
    options?: { recalculate?: boolean; reason?: string }
  ): {
    loResults: LoanOfficerEntitlement[];
    supResults: SupervisorEntitlement[];
    summary: PeriodSummary;
  } {
    const currentUser = this.getCurrentUser();
    const formulas = this.getFormulas();
    const loIncFormula = formulas.find((f) => f.type === 'lo_incentives' && f.isActive) || formulas[0];
    const loTransFormula = formulas.find((f) => f.type === 'lo_transportation' && f.isActive) || formulas[1];
    const loBonusFormula = formulas.find((f) => f.type === 'lo_bonus' && f.isActive) || formulas[2];
    const supFormula = formulas.find((f) => f.type === 'supervisor_incentives' && f.isActive) || formulas[3];

    // 1. Fetch imported variables for the period
    const batches = this.getImportBatches();
    const batch = batches.find((b) => b.period === period);
    if (!batch || batch.rows.length === 0) {
      throw new Error(`لا توجد بيانات مستوردة لفترة ${period}. يرجى استيراد ملف Excel أولاً.`);
    }

    const employees = this.getEmployees();
    const existingSummary = this.getPeriodSummary(period);
    const revision = (existingSummary ? (existingSummary.recalculationNotes?.length || 0) + 1 : 1);

    // 2. Calculate Loan Officers
    const loResults: LoanOfficerEntitlement[] = [];

    batch.rows.forEach((row) => {
      const emp = employees.find((e) => 
        (row.waid && (e.waid === row.waid || e.employeeId === row.waid)) ||
        (row.employeeId && (e.employeeId === row.employeeId || e.waid === row.employeeId || e.badgeNo === row.employeeId)) ||
        (row.badgeNo && (e.badgeNo === row.badgeNo || e.employeeId === row.badgeNo))
      );
      const empName = emp ? emp.name : (row.employeeName || row.employeeId);
      const office = emp ? emp.office : (row.office || 'المكتب الرئيسي');
      const supervisorId = emp?.supervisorId;
      const supervisor = supervisorId ? employees.find((e) => e.employeeId === supervisorId) : undefined;

      // Evaluate Incentives
      const incRes = FormulaEngine.evaluate(loIncFormula.expression, row.variables);
      // Evaluate Transportation
      const transRes = FormulaEngine.evaluate(loTransFormula.expression, row.variables);
      // Evaluate Bonus
      const bonusRes = FormulaEngine.evaluate(loBonusFormula.expression, row.variables);

      const totalEntitlements = Math.round((incRes.value + transRes.value + bonusRes.value) * 100) / 100;

      const loRecord: LoanOfficerEntitlement = {
        id: `lo_ent_${period}_${row.employeeId}`,
        batchId: batch.id,
        period,
        employeeId: row.employeeId,
        badgeNo: emp?.badgeNo || row.badgeNo,
        waid: emp?.waid || row.waid,
        employeeName: empName,
        office,
        supervisorId,
        supervisorName: supervisor?.name,
        variablesSnapshot: { ...row.variables },
        incentives: incRes.value,
        transportation: transRes.value,
        bonus: bonusRes.value,
        totalEntitlements,
        formulaVersionsUsed: {
          incentivesVersion: loIncFormula.version,
          transportationVersion: loTransFormula.version,
          bonusVersion: loBonusFormula.version,
        },
        breakdown: {
          incentivesSteps: incRes.steps.map((st) => ({
            step: 'احتساب الحافز',
            formula: loIncFormula.expression,
            evaluatedExpression: st,
            result: incRes.value,
          })),
          transportationSteps: transRes.steps.map((st) => ({
            step: 'احتساب بدل الانتقال',
            formula: loTransFormula.expression,
            evaluatedExpression: st,
            result: transRes.value,
          })),
          bonusSteps: bonusRes.steps.map((st) => ({
            step: 'احتساب المكافأة',
            formula: loBonusFormula.expression,
            evaluatedExpression: st,
            result: bonusRes.value,
          })),
        },
        status: 'Calculated',
        calculatedAt: new Date().toISOString(),
        calculatedBy: currentUser.name,
        revision,
      };

      loResults.push(loRecord);
    });

    this.saveLOEntitlements(loResults);

    // 3. Calculate Supervisors (Independent Rollup Module)
    const supervisors = employees.filter((e) => e.category === 'Loan Officer Supervisor');
    const supResults: SupervisorEntitlement[] = [];

    supervisors.forEach((sup) => {
      const supervisedLOs = loResults.filter((lo) => lo.supervisorId === sup.employeeId);
      const officerCount = supervisedLOs.length;

      let totalLOIncentives = 0;
      let totalLODisbursed = 0;
      let totalRepaymentRateSum = 0;
      let qualifiedOfficersCount = 0;
      let totalDisbursedCount = 0;

      supervisedLOs.forEach((lo) => {
        totalLOIncentives += lo.incentives;
        const v2 = lo.variablesSnapshot['Variable02'] || 0;
        const v1 = lo.variablesSnapshot['Variable01'] || 0;
        const v3 = lo.variablesSnapshot['Variable03'] || 0;
        totalLODisbursed += v2;
        totalDisbursedCount += v1;
        totalRepaymentRateSum += v3;
        if (v3 >= 95) qualifiedOfficersCount++;
      });

      const avgRepayment = officerCount > 0 ? totalRepaymentRateSum / officerCount : 0;
      const avgTeamIncentives = officerCount > 0 ? totalLOIncentives / officerCount : 0;

      const supervisorScope: Record<string, number> = {
        LO_COUNT: officerCount,
        LO_TOTAL_INCENTIVES: totalLOIncentives,
        LO_AVG_INCENTIVES: avgTeamIncentives,
        LO_TOTAL_DISBURSED: totalLODisbursed,
        LO_TOTAL_COUNT: totalDisbursedCount,
        LO_AVG_REPAYMENT: avgRepayment,
        LO_QUALIFIED_COUNT: qualifiedOfficersCount,
        Variable01: totalDisbursedCount,
        Variable02: totalLODisbursed,
        Variable03: avgRepayment,
        Variable04: officerCount,
      };

      const supIncRes = FormulaEngine.evaluate(supFormula.expression, supervisorScope);
      const supTransportation = officerCount > 0 ? 100000 : 0;
      const supBonus = avgRepayment >= 96 ? 150000 : 0;

      const totalSupEntitlements =
        Math.round((supIncRes.value + supTransportation + supBonus) * 100) / 100;

      const supRecord: SupervisorEntitlement = {
        id: `sup_ent_${period}_${sup.employeeId}`,
        batchId: batch.id,
        period,
        supervisorId: sup.employeeId,
        supervisorName: sup.name,
        office: sup.office,
        supervisedOfficersCount: officerCount,
        qualifiedOfficersCount,
        totalDisbursedAmount: totalLODisbursed,
        totalDisbursedCount,
        averageRepaymentRate: Math.round(avgRepayment * 100) / 100,
        totalTeamIncentives: Math.round(totalLOIncentives * 100) / 100,
        averageTeamIncentives: Math.round(avgTeamIncentives * 100) / 100,
        supervisedOfficerIds: supervisedLOs.map((lo) => lo.employeeId),
        incentives: supIncRes.value,
        transportation: supTransportation,
        bonus: supBonus,
        totalEntitlements: totalSupEntitlements,
        formulaVersionUsed: supFormula.version,
        formulaExpression: supFormula.expression,
        breakdownSteps: supIncRes.steps.map((st) => ({
          step: 'احتساب حافز الإشراف',
          formula: supFormula.expression,
          evaluatedExpression: st,
          result: supIncRes.value,
        })),
        status: 'Calculated',
        calculatedAt: new Date().toISOString(),
        calculatedBy: currentUser.name,
        revision,
      };

      supResults.push(supRecord);
    });

    this.saveSupervisorEntitlements(supResults);

    // 4. Build Period Summary
    const totalLOIncentives = loResults.reduce((sum, r) => sum + r.incentives, 0);
    const totalLOTrans = loResults.reduce((sum, r) => sum + r.transportation, 0);
    const totalLOBonus = loResults.reduce((sum, r) => sum + r.bonus, 0);

    const totalSupIncentives = supResults.reduce((sum, r) => sum + r.incentives, 0);
    const totalSupTrans = supResults.reduce((sum, r) => sum + r.transportation, 0);
    const totalSupBonus = supResults.reduce((sum, r) => sum + r.bonus, 0);

    const grandIncentives = totalLOIncentives + totalSupIncentives;
    const grandTrans = totalLOTrans + totalSupTrans;
    const grandBonus = totalLOBonus + totalSupBonus;
    const grandTotal = grandIncentives + grandTrans + grandBonus;

    const notes = existingSummary?.recalculationNotes ? [...existingSummary.recalculationNotes] : [];
    if (options?.recalculate && options.reason) {
      notes.push({
        reason: options.reason,
        requestedBy: currentUser.name,
        timestamp: new Date().toISOString(),
        revision,
      });
    }

    const summary: PeriodSummary = {
      period,
      status: 'Calculated',
      loCount: loResults.length,
      supervisorCount: supResults.length,
      totalIncentives: Math.round(grandIncentives * 100) / 100,
      totalTransportation: Math.round(grandTrans * 100) / 100,
      totalBonus: Math.round(grandBonus * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      lastCalculatedAt: new Date().toISOString(),
      recalculationNotes: notes,
    };

    this.savePeriodSummary(summary);

    const settings = this.getSettings();
    this.logAudit(
      'CALCULATION',
      `احتساب مستحقات الفترة ${period} (${loResults.length} مسؤول قروض + ${supResults.length} مشرفين) بإجمالي ${grandTotal.toLocaleString()} ${settings.currency}`,
      period
    );

    return { loResults, supResults, summary };
  }

  // Workflow Status Transitions
  public static updatePeriodStatus(
    period: string,
    newStatus: CalculationPeriodStatus,
    justification?: string
  ): void {
    const summary = this.getPeriodSummary(period);
    if (!summary) throw new Error(`الفترة ${period} غير موجودة`);

    const currentUser = this.getCurrentUser();

    if (newStatus === 'Approved') {
      if (currentUser.role !== 'admin' && currentUser.role !== 'approver') {
        throw new Error('صلاحية الاعتماد محصورة بمدير الاعتماد أو مدير النظام');
      }
      summary.approvedBy = currentUser.name;
      summary.approvedAt = new Date().toISOString();
    }

    if (newStatus === 'Locked') {
      if (currentUser.role !== 'admin' && currentUser.role !== 'approver') {
        throw new Error('صلاحية قفل الفترة محصورة بمدير الاعتماد أو مدير النظام');
      }
      summary.lockedBy = currentUser.name;
      summary.lockedAt = new Date().toISOString();
    }

    summary.status = newStatus;
    this.savePeriodSummary(summary);

    const loRecords = this.getLOEntitlements(period).map((r) => ({ ...r, status: newStatus }));
    this.saveLOEntitlements(loRecords);

    const supRecords = this.getSupervisorEntitlements(period).map((r) => ({ ...r, status: newStatus }));
    this.saveSupervisorEntitlements(supRecords);

    this.logAudit(
      'APPROVAL',
      `تحديث حالة فترة ${period} إلى [${newStatus}]${justification ? ' - السبب: ' + justification : ''}`,
      period
    );
  }

  /**
   * Pushes approved monthly entitlements directly into the main VITAS HRMS payroll adjustments
   */
  public static pushToMonthlyPayroll(period: string, vitasEmployees: any[]): { pushedCount: number; message: string } {
    const loRecords = this.getLOEntitlements(period);
    const supRecords = this.getSupervisorEntitlements(period);
    const allRecords = [...loRecords, ...supRecords];

    if (allRecords.length === 0) {
      return { pushedCount: 0, message: 'لا توجد مستحقات محتسبة لهذه الفترة لترحيلها' };
    }

    let existingAdjustments: Record<string, any> = {};
    try {
      const saved = localStorage.getItem('vitas_payroll_manual_adjustments');
      if (saved) existingAdjustments = JSON.parse(saved);
    } catch {}

    let pushedCount = 0;

    allRecords.forEach((rec) => {
      const recId = 'employeeId' in rec ? rec.employeeId : (rec as SupervisorEntitlement).supervisorId;
      const recName = 'employeeName' in rec ? rec.employeeName : (rec as SupervisorEntitlement).supervisorName;

      // Find matching employee by badge_no, id, or institutional employeeId
      const emp = vitasEmployees.find(
        (e) =>
          String(e.badge_no) === recId.replace('VTS-', '') ||
          String(e.id) === recId ||
          (e.name_ar && e.name_ar === recName) ||
          (e.name && e.name === recName)
      );

      const targetId = emp ? String(emp.id) : recId;

      existingAdjustments[targetId] = {
        ...(existingAdjustments[targetId] || {}),
        incentives: rec.incentives || 0,
        transportation: rec.transportation || 0,
        bonus: rec.bonus || 0,
      };
      pushedCount++;
    });

    try {
      localStorage.setItem('vitas_payroll_manual_adjustments', JSON.stringify(existingAdjustments));
    } catch (e) {
      console.error('Failed to save to vitas_payroll_manual_adjustments', e);
    }

    this.logAudit(
      'CALCULATION',
      `ترحيل مستحقات ${pushedCount} موظفاً للفترة ${period} إلى مسير الرواتب الرئيسي`,
      period
    );

    return {
      pushedCount,
      message: `تم ترحيل مبالغ الحوافز وبدل النقل والمكافآت لـ ${pushedCount} موظفاً بنجاح إلى شاشة إدارة الرواتب!`,
    };
  }

  // Backup & Restore
  public static createBackupData(): string {
    const snapshot = {
      app: 'VITAS Iraq Incentives Management System',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: this.getCurrentUser().name,
      databaseName: this.getSettings().databaseName,
      data: {
        users: this.getUsers(),
        employees: this.getEmployees(),
        variables: this.getVariables(),
        formulas: this.getFormulas(),
        importBatches: this.getImportBatches(),
        loEntitlements: this.getLOEntitlements(),
        supervisorEntitlements: this.getSupervisorEntitlements(),
        periodSummaries: this.getPeriodSummaries(),
        auditLogs: this.getAuditLogs(),
        settings: this.getSettings(),
      },
    };
    this.logAudit('BACKUP', 'تصدير نسخة احتياطية كاملة من قاعدة بيانات الحوافز');
    return JSON.stringify(snapshot, null, 2);
  }

  public static restoreBackupData(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || !parsed.data.employees || !parsed.data.variables || !parsed.data.formulas) {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح أو تالف ولا يحتوي على الجداول الأساسية' };
      }

      this.setItem(STORAGE_KEYS.EMPLOYEES, parsed.data.employees);
      this.setItem(STORAGE_KEYS.VARIABLES, parsed.data.variables);
      this.setItem(STORAGE_KEYS.FORMULAS, parsed.data.formulas);
      if (parsed.data.importBatches) this.setItem(STORAGE_KEYS.IMPORT_BATCHES, parsed.data.importBatches);
      if (parsed.data.loEntitlements) this.setItem(STORAGE_KEYS.LO_ENTITLEMENTS, parsed.data.loEntitlements);
      if (parsed.data.supervisorEntitlements) this.setItem(STORAGE_KEYS.SUPERVISOR_ENTITLEMENTS, parsed.data.supervisorEntitlements);
      if (parsed.data.periodSummaries) this.setItem(STORAGE_KEYS.PERIOD_SUMMARIES, parsed.data.periodSummaries);
      if (parsed.data.auditLogs) this.setItem(STORAGE_KEYS.AUDIT_LOGS, parsed.data.auditLogs);
      if (parsed.data.settings) this.setItem(STORAGE_KEYS.SETTINGS, parsed.data.settings);

      this.logAudit('BACKUP', 'تم استعادة النظام بنجاح من نسخة احتياطية سابقة');
      return { success: true, message: 'تم استعادة جميع بيانات النظام والمعادلات والموظفين والنتائج بنجاح' };
    } catch (err: any) {
      return { success: false, message: `فشل استعادة النسخة الاحتياطية: ${err.message || err}` };
    }
  }

  // Reset to Factory Default Seed
  public static resetToFactoryDefaults(): void {
    this.setItem(STORAGE_KEYS.USERS, DEFAULT_USERS);
    this.setItem(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
    this.setItem(STORAGE_KEYS.VARIABLES, DEFAULT_VARIABLES);
    this.setItem(STORAGE_KEYS.FORMULAS, DEFAULT_FORMULAS);
    this.setItem(STORAGE_KEYS.IMPORT_BATCHES, [SEED_IMPORT_BATCH]);
    this.setItem(STORAGE_KEYS.LO_ENTITLEMENTS, []);
    this.setItem(STORAGE_KEYS.SUPERVISOR_ENTITLEMENTS, []);
    this.setItem(STORAGE_KEYS.PERIOD_SUMMARIES, []);
    this.setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.logAudit('BACKUP', 'إعادة ضبط النظام إلى البيانات التأسيسية المصنعية');
  }
}
