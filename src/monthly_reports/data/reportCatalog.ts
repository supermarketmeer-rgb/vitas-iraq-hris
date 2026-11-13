import { ReportDefinition } from '../types/hr';

export const REPORT_CATALOG: ReportDefinition[] = [
  // 0. Primary Attached Excel Workbooks (مطابقة لمصنفات الإكسل المرفقة)
  {
    id: 'hq_report',
    category: 'WORKBOOKS',
    titleEn: 'HQ Report',
    titleAr: 'تقرير الإدارة العامة (HQ Report)',
    descriptionEn: 'Headquarter roster and employee ledger exactly matching 2026-10- HQ VITAS.xls (sheet: Vitas Iraq -Oct-2026) with ratings, supervisors, tenure, and salary breakdown.',
    descriptionAr: 'سجل موظفي الإدارة العامة المطابق تماماً لمصنف 2026-10- HQ VITAS.xls (ورقة Vitas Iraq -Oct-2026) مع تقييمات الأداء، المشرفين، والرواتب والتعديلات.',
    supportLevel: 'FULL',
    dataSourceNote: 'مطابق لمصنف 2026-10- HQ VITAS.xls (ورقة Vitas Iraq -Oct-2026)',
    columns: [
      { key: 'num', headerEn: '#', headerAr: '#', type: 'number', width: 60 },
      { key: 'name', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'cellular', headerEn: 'Cellular', headerAr: 'رقم الهاتف', type: 'string', width: 140 },
      { key: 'dateOfBirth', headerEn: 'Date of Birth', headerAr: 'تاريخ الميلاد', type: 'date', width: 120 },
      { key: 'email', headerEn: 'Email', headerAr: 'البريد الإلكتروني', type: 'string', width: 200 },
      { key: 'position', headerEn: 'Position', headerAr: 'المسمى الوظيفي', type: 'string', width: 180 },
      { key: 'citizenship', headerEn: 'Citizenship', headerAr: 'الجنسية', type: 'string', width: 110 },
      { key: 'secondCitizenship', headerEn: '2nd Citizenship', headerAr: 'الجنسية الثانية', type: 'string', width: 120 },
      { key: 'supervisor', headerEn: 'Supervisor Name', headerAr: 'المسؤول المباشر', type: 'string', width: 180 },
      { key: 'perfRating', headerEn: 'Rating of Last Review', headerAr: 'تقييم الأداء الأخير', type: 'string', width: 140 },
      { key: 'periodInPosition', headerEn: 'Period in Position (Years)', headerAr: 'سنوات الخدمة في المنصب', type: 'number', width: 150 },
      { key: 'office', headerEn: 'Office Location', headerAr: 'المكتب / الفرع', type: 'string', width: 140 },
      { key: 'type', headerEn: 'Type', headerAr: 'نوع الوظيفة', type: 'string', width: 100 },
      { key: 'gender', headerEn: 'Gender', headerAr: 'الجنس', type: 'string', width: 100 },
      { key: 'hireDate', headerEn: 'Hire Date', headerAr: 'تاريخ التعيين', type: 'date', width: 120 },
      { key: 'releaseDate', headerEn: 'Release Date', headerAr: 'تاريخ الانتهاء', type: 'date', width: 120 },
      { key: 'salary', headerEn: 'Annual Salary (IQD)', headerAr: 'الراتب السنوي (د.ع)', type: 'currency', width: 170 },
      { key: 'monthlySalary', headerEn: 'Monthly Salary (IQD)', headerAr: 'الراتب الشهري (د.ع)', type: 'currency', width: 160 },
      { key: 'earnings2', headerEn: 'Earnings 2 / Rate', headerAr: 'المخصصات الإضافية', type: 'currency', width: 160 },
      { key: 'adjust1', headerEn: 'Adjust 1 / Amt', headerAr: 'التعديل 1', type: 'currency', width: 140 },
      { key: 'adjust2', headerEn: 'Adjust 2 / Amt', headerAr: 'التعديل 2', type: 'currency', width: 140 }
    ],
    defaultColumns: ['num', 'name', 'position', 'office', 'supervisor', 'perfRating', 'periodInPosition', 'monthlySalary', 'hireDate'],
    defaultSort: { key: 'num', direction: 'asc' },
    kpis: ['kpi_hq_total_staff', 'kpi_hq_avg_rating', 'kpi_hq_annual_payroll', 'kpi_hq_avg_tenure'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Staff by Office Location', titleAr: 'توزيع الكادر حسب موقع المكتب', xAxis: 'office', yAxis: 'count' },
      { type: 'pie', titleEn: 'HQ Staff by Type', titleAr: 'توزيع كادر الإدارة حسب النوع', xAxis: 'type', yAxis: 'count' }
    ]
  },
  {
    id: 'roster_report',
    category: 'WORKBOOKS',
    titleEn: 'Roster Report',
    titleAr: 'تقرير سجل الموظفين (Roster Report)',
    descriptionEn: 'Complete organizational staff roster matching 2026-10-Roster VITAS and ATAS-microfin.xls (Roster Report sheet) with dual positions, headcount categories, contract dates, and tier levels.',
    descriptionAr: 'سجل الملاك الوظيفي الكامل المطابق تماماً لمصنف 2026-10-Roster VITAS and ATAS-microfin.xls مع تصنيفات ميكروفين، تواريخ العقود، والمستويات الإدارية.',
    supportLevel: 'FULL',
    dataSourceNote: 'مطابق لمصنف 2026-10-Roster VITAS and ATAS-microfin.xls (ورقة Roster Report)',
    columns: [
      { key: 'num', headerEn: 'No.', headerAr: 'الرقم', type: 'number', width: 60 },
      { key: 'name', headerEn: 'Local Staff (list all)', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'position1', headerEn: 'Position 1', headerAr: 'المسمى الوظيفي 1', type: 'string', width: 180 },
      { key: 'position2', headerEn: 'Position 2', headerAr: 'المسمى الوظيفي 2', type: 'string', width: 180 },
      { key: 'microfinHeadcount', headerEn: 'Microfin Headcount Category', headerAr: 'فئة ميكروفين', type: 'string', width: 180 },
      { key: 'branchVsMO', headerEn: 'Branch vs MO Microfin', headerAr: 'فرع / إدارة عامة', type: 'string', width: 140 },
      { key: 'hireDate', headerEn: 'Date of Hire', headerAr: 'تاريخ التعيين', type: 'date', width: 120 },
      { key: 'contractEnds', headerEn: 'Contract Ends', headerAr: 'تاريخ انتهاء العقد', type: 'date', width: 130 },
      { key: 'newHire', headerEn: 'New Hire', headerAr: 'تعيين جديد', type: 'string', width: 100 },
      { key: 'terminated', headerEn: 'Terminated', headerAr: 'منتهية خدمته', type: 'string', width: 110 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب / الفرع', type: 'string', width: 140 },
      { key: 'department', headerEn: 'Department', headerAr: 'القسم', type: 'string', width: 180 },
      { key: 'category', headerEn: 'Employ. Category', headerAr: 'فئة العمل', type: 'string', width: 130 },
      { key: 'adminLine', headerEn: 'Admin / Line / LineField', headerAr: 'التصنيف التشغيلي', type: 'string', width: 160 },
      { key: 'gender', headerEn: 'Gender', headerAr: 'الجنس', type: 'string', width: 100 },
      { key: 'tier', headerEn: 'Tiers', headerAr: 'المستوى الإداري', type: 'string', width: 160 }
    ],
    defaultColumns: ['num', 'name', 'position1', 'office', 'department', 'branchVsMO', 'hireDate', 'contractEnds', 'gender', 'tier'],
    defaultSort: { key: 'num', direction: 'asc' },
    kpis: ['kpi_roster_total', 'kpi_roster_branch_staff', 'kpi_roster_mo_staff', 'kpi_roster_new_hires'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Staff by Department', titleAr: 'الكادر حسب الأقسام', xAxis: 'department', yAxis: 'count' },
      { type: 'donut', titleEn: 'Branch vs Head Office', titleAr: 'توزيع الكادر (فروع مقابل إدارة)', xAxis: 'branchVsMO', yAxis: 'count' }
    ]
  },
  {
    id: 'global_report',
    category: 'WORKBOOKS',
    titleEn: 'Global Report',
    titleAr: 'التقرير الشامل للفروع (Global Report)',
    descriptionEn: 'Consolidated branch-level operational report matching 2026-10-Global Report VITAS ATAS.xls with office staff, field staff, loan officers, security guards, gender breakdown, and difference checks.',
    descriptionAr: 'التقرير الموحد لفروع ومكاتب المؤسسة المطابق لمصنف 2026-10-Global Report VITAS ATAS.xls مع كادر الإدارة والميدان ومسؤولي الإقراض والتحصيل وتوازن الكادر.',
    supportLevel: 'FULL',
    dataSourceNote: 'مطابق لمصنف 2026-10-Global Report VITAS ATAS.xls (الأوراق الشهرية)',
    columns: [
      { key: 'office', headerEn: 'CHFVITAS (Office)', headerAr: 'المكتب / الفرع', type: 'string', width: 180 },
      { key: 'maleOffice', headerEn: 'Male Office Staff', headerAr: 'إدارة (ذكور)', type: 'number', width: 120 },
      { key: 'femaleOffice', headerEn: 'Female Office Staff', headerAr: 'إدارة (إناث)', type: 'number', width: 120 },
      { key: 'totalOffice', headerEn: 'Total Office Staff', headerAr: 'إجمالي الإدارة', type: 'number', width: 120 },
      { key: 'maleField', headerEn: 'Male Field Staff', headerAr: 'ميدان (ذكور)', type: 'number', width: 120 },
      { key: 'femaleField', headerEn: 'Female Field Staff', headerAr: 'ميدان (إناث)', type: 'number', width: 120 },
      { key: 'totalLineField', headerEn: 'Total Line_Field Staff', headerAr: 'كادر الميدان المباشر', type: 'number', width: 140 },
      { key: 'totalField', headerEn: 'Total Field Staff', headerAr: 'إجمالي الميدان', type: 'number', width: 120 },
      { key: 'securityGuards', headerEn: 'Security Guards', headerAr: 'حراس الأمن', type: 'number', width: 120 },
      { key: 'maleLoanOfficers', headerEn: 'Male Loan Officers', headerAr: 'إقراض (ذكور)', type: 'number', width: 120 },
      { key: 'collectionOfficers', headerEn: 'Collection Officer', headerAr: 'تحصيل (ذكور)', type: 'number', width: 120 },
      { key: 'femaleLoanOfficers', headerEn: 'Female Loan Officers', headerAr: 'إقراض (إناث)', type: 'number', width: 120 },
      { key: 'femaleCollectionOfficers', headerEn: 'Female Collection Officers', headerAr: 'تحصيل (إناث)', type: 'number', width: 130 },
      { key: 'totalLoanOfficers', headerEn: 'Total Loan Officers', headerAr: 'إجمالي مسؤولي الإقراض', type: 'number', width: 140 },
      { key: 'totalFemaleStaff', headerEn: 'Total Female Staff', headerAr: 'إجمالي الإناث', type: 'number', width: 120 },
      { key: 'totalCollectionStaff', headerEn: 'Total Collection Staff', headerAr: 'إجمالي التحصيل', type: 'number', width: 130 },
      { key: 'staffHired', headerEn: 'Staff Hired', headerAr: 'تعيينات جديدة', type: 'number', width: 110 },
      { key: 'staffLeft', headerEn: 'Staff Who Left', headerAr: 'مغادرون', type: 'number', width: 110 },
      { key: 'movedFromOtherBranch', headerEn: 'Moved From Branch', headerAr: 'منقول من فرع', type: 'number', width: 120 },
      { key: 'movedToOtherBranch', headerEn: 'Moved To Branch', headerAr: 'منقول لفرع', type: 'number', width: 120 },
      { key: 'totalStaff', headerEn: 'Total Staff', headerAr: 'إجمالي الكادر', type: 'number', width: 130 },
      { key: 'differenceCheck', headerEn: 'Diff Check', headerAr: 'فحص المطابقة', type: 'number', width: 110 }
    ],
    defaultColumns: ['office', 'totalOffice', 'totalField', 'maleLoanOfficers', 'femaleLoanOfficers', 'totalLoanOfficers', 'totalFemaleStaff', 'totalStaff'],
    defaultSort: { key: 'totalStaff', direction: 'desc' },
    kpis: ['kpi_global_total_staff', 'kpi_global_total_offices', 'kpi_global_total_lo', 'kpi_global_female_ratio'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Total Staff by Office', titleAr: 'إجمالي الكادر حسب المكتب', xAxis: 'office', yAxis: 'totalStaff' },
      { type: 'bar', titleEn: 'Office vs Field Staff', titleAr: 'مقارنة كادر الإدارة والميدان', xAxis: 'office', yAxis: 'totalOffice', groupField: 'totalField' }
    ]
  },
  {
    id: 'microfin_report',
    category: 'WORKBOOKS',
    titleEn: 'Microfin Report',
    titleAr: 'تقرير ميكروفين للرواتب (Microfin Report)',
    descriptionEn: 'Detailed monthly payroll ledger matching Microfin july aug Sep.26 Payroll.xlsx with basic salary, phone allowance, incentives, transportation, bonuses, family & certificate allowances, overtime, and social security 12%.',
    descriptionAr: 'كشف الرواتب والمخصصات الشهري المطابق لمصنف Microfin july aug Sep.26 Payroll.xlsx متضمناً الراتب الأساسي، الهاتف، الحوافز، النقل، المكافآت، الزوجية والشهادة، الإضافي، وحصة الضمان 12%.',
    supportLevel: 'FULL',
    dataSourceNote: 'مطابق لمصنف Microfin july aug Sep.26 Payroll.xlsx (الأوراق الشهرية)',
    columns: [
      { key: 'name', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'microfinPosition', headerEn: 'Microfin Headcount Position', headerAr: 'فئة ميكروفين', type: 'string', width: 180 },
      { key: 'branchVsMO', headerEn: 'Branch vs MO', headerAr: 'فرع / إدارة عامة', type: 'string', width: 130 },
      { key: 'department', headerEn: 'Department', headerAr: 'القسم', type: 'string', width: 150 },
      { key: 'office', headerEn: 'Branch', headerAr: 'الفرع / المكتب', type: 'string', width: 140 },
      { key: 'startDate', headerEn: 'Start Date', headerAr: 'تاريخ المباشرة', type: 'date', width: 120 },
      { key: 'basicSalary', headerEn: 'Basic Salary (IQD)', headerAr: 'الراتب الأساسي', type: 'currency', width: 160 },
      { key: 'phoneAllowance', headerEn: 'Phone Allowance', headerAr: 'مخصصات الهاتف', type: 'currency', width: 130 },
      { key: 'incentives', headerEn: 'Incentives', headerAr: 'حوافز الأداء', type: 'currency', width: 140 },
      { key: 'transportation', headerEn: 'Transportation', headerAr: 'مخصصات النقل', type: 'currency', width: 140 },
      { key: 'bonus', headerEn: 'Other Benefits / Bonus', headerAr: 'المكافآت / موظف الشهر', type: 'currency', width: 150 },
      { key: 'familyAllowance', headerEn: 'Family Allowance', headerAr: 'المخصصات العائلية', type: 'currency', width: 140 },
      { key: 'certificateAllowance', headerEn: 'Certificate Allowance', headerAr: 'مخصصات الشهادة', type: 'currency', width: 140 },
      { key: 'overtime', headerEn: 'Overtime', headerAr: 'أجور الإضافي', type: 'currency', width: 130 },
      { key: 'socialSecurity12', headerEn: 'Share OF SS % 12', headerAr: 'حصة الضمان 12%', type: 'currency', width: 150 },
      { key: 'grossSalary', headerEn: 'Gross Payout (IQD)', headerAr: 'إجمالي المستحقات (د.ع)', type: 'currency', width: 180 }
    ],
    defaultColumns: ['name', 'office', 'department', 'basicSalary', 'incentives', 'transportation', 'familyAllowance', 'socialSecurity12', 'grossSalary'],
    defaultSort: { key: 'grossSalary', direction: 'desc' },
    kpis: ['kpi_microfin_gross_total', 'kpi_microfin_basic_total', 'kpi_microfin_incentives_total', 'kpi_microfin_ss_total'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Gross Payroll by Branch', titleAr: 'إجمالي الرواتب حسب الفرع', xAxis: 'office', yAxis: 'grossSalary' },
      { type: 'pie', titleEn: 'Incentives Distribution', titleAr: 'توزيع حوافز الأداء حسب الفرع', xAxis: 'office', yAxis: 'incentives' }
    ]
  },

  // A. Employee Reports
  {
    id: 'emp_total',
    category: 'EMPLOYEE',
    titleEn: 'Total Employees Report',
    titleAr: 'تقرير إجمالي الموظفين',
    descriptionEn: 'Comprehensive master list of active employees across all offices, departments, management tiers, and employment categories.',
    descriptionAr: 'قائمة شاملة بكافة الموظفين النشطين عبر جميع المكاتب والأقسام والمستويات الإدارية وفئات التوظيف.',
    supportLevel: 'FULL',
    dataSourceNote: 'Combined from 2026-10-Roster VITAS and ATAS-microfin.xls & 2026-10- HQ VITAS.xls',
    columns: [
      { key: 'id', headerEn: 'Employee ID', headerAr: 'الرقم الوظيفي', type: 'string', width: 110 },
      { key: 'name', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'position', headerEn: 'Position', headerAr: 'المسمى الوظيفي', type: 'string', width: 190 },
      { key: 'department', headerEn: 'Department', headerAr: 'القسم', type: 'string', width: 160 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'category', headerEn: 'Category', headerAr: 'فئة العمل', type: 'string', width: 130 },
      { key: 'tier', headerEn: 'Management Tier', headerAr: 'المستوى الإداري', type: 'string', width: 160 },
      { key: 'gender', headerEn: 'Gender', headerAr: 'الجنس', type: 'string', width: 100 },
      { key: 'hireDate', headerEn: 'Hire Date', headerAr: 'تاريخ التعيين', type: 'date', width: 120 },
      { key: 'monthlyBasicSalary', headerEn: 'Basic Salary (IQD)', headerAr: 'الراتب الأساسي (د.ع)', type: 'currency', width: 160 },
      { key: 'perfRating', headerEn: 'Review Rating (%)', headerAr: 'تقييم الأداء (%)', type: 'percent', width: 140 }
    ],
    defaultColumns: ['id', 'name', 'position', 'department', 'office', 'category', 'tier', 'gender', 'hireDate', 'monthlyBasicSalary'],
    defaultSort: { key: 'name', direction: 'asc' },
    kpis: ['kpi_total_employees', 'kpi_male_ratio', 'kpi_female_ratio', 'kpi_avg_salary'],
    recommendedCharts: [
      { type: 'pie', titleEn: 'Employees by Office', titleAr: 'توزيع الموظفين حسب المكتب', xAxis: 'office', yAxis: 'count' },
      { type: 'column', titleEn: 'Employees by Department', titleAr: 'الموظفون حسب الأقسام', xAxis: 'department', yAxis: 'count' },
      { type: 'donut', titleEn: 'Staff by Category', titleAr: 'الفئة (مكتبي / ميداني)', xAxis: 'category', yAxis: 'count' }
    ]
  },
  {
    id: 'emp_directory',
    category: 'EMPLOYEE',
    titleEn: 'Employee Directory & Contacts',
    titleAr: 'دليل الموظفين وبيانات الاتصال',
    descriptionEn: 'Staff contact information, corporate email, mobile number, date of birth, citizenship, and direct supervisor.',
    descriptionAr: 'بيانات الاتصال بالموظفين، البريد الإلكتروني المؤسسي، الهاتف، تاريخ الميلاد، الجنسية والمسؤول المباشر.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: 2026-10- HQ VITAS.xls (Vitas Iraq -Oct-2026)',
    columns: [
      { key: 'num', headerEn: '#', headerAr: '#', type: 'number', width: 60 },
      { key: 'name', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'position', headerEn: 'Position', headerAr: 'المسمى الوظيفي', type: 'string', width: 180 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'cellular', headerEn: 'Cellular', headerAr: 'رقم الهاتف', type: 'string', width: 140 },
      { key: 'email', headerEn: 'Email', headerAr: 'البريد الإلكتروني', type: 'string', width: 200 },
      { key: 'supervisor', headerEn: 'Supervisor', headerAr: 'المسؤول المباشر', type: 'string', width: 190 },
      { key: 'dateOfBirth', headerEn: 'Date of Birth', headerAr: 'تاريخ الميلاد', type: 'date', width: 120 },
      { key: 'citizenship', headerEn: 'Citizenship', headerAr: 'الجنسية', type: 'string', width: 110 }
    ],
    defaultColumns: ['name', 'position', 'office', 'cellular', 'email', 'supervisor', 'dateOfBirth'],
    defaultSort: { key: 'name', direction: 'asc' },
    kpis: ['kpi_total_employees', 'kpi_with_email', 'kpi_with_phone'],
    recommendedCharts: [
      { type: 'bar', titleEn: 'Employees per Office', titleAr: 'الموظفون في كل مكتب', xAxis: 'office', yAxis: 'count' }
    ]
  },
  {
    id: 'emp_office',
    category: 'EMPLOYEE',
    titleEn: 'Employees by Office Location',
    titleAr: 'توزيع الموظفين حسب المكاتب والفروع',
    descriptionEn: 'Aggregated distribution of headcount by branch, showing office staff, field staff, loan officers, and gender balance.',
    descriptionAr: 'توزيع إجمالي الموظفين حسب الفروع، يوضح موظفي المكاتب والميدان ومسؤولي الإقراض والتوازن بين الجنسين.',
    supportLevel: 'FULL',
    dataSourceNote: 'Cross-validated between Roster and 2026-10-Global Report VITAS ATAS.xls',
    columns: [
      { key: 'office', headerEn: 'Office Location', headerAr: 'المكتب / الفرع', type: 'string', width: 180 },
      { key: 'totalStaff', headerEn: 'Total Staff', headerAr: 'إجمالي الموظفين', type: 'number', width: 130 },
      { key: 'maleStaff', headerEn: 'Male Staff', headerAr: 'الموظفون الذكور', type: 'number', width: 120 },
      { key: 'femaleStaff', headerEn: 'Female Staff', headerAr: 'الموظفات الإناث', type: 'number', width: 120 },
      { key: 'officeStaff', headerEn: 'Office Staff', headerAr: 'موظفو الإدارة', type: 'number', width: 120 },
      { key: 'fieldStaff', headerEn: 'Field Staff', headerAr: 'موظفو الميدان', type: 'number', width: 120 },
      { key: 'loanOfficers', headerEn: 'Loan Officers', headerAr: 'مسؤولو الإقراض', type: 'number', width: 130 },
      { key: 'securityGuards', headerEn: 'Security Guards', headerAr: 'حراس الأمن', type: 'number', width: 120 }
    ],
    defaultColumns: ['office', 'totalStaff', 'maleStaff', 'femaleStaff', 'officeStaff', 'fieldStaff', 'loanOfficers'],
    defaultSort: { key: 'totalStaff', direction: 'desc' },
    kpis: ['kpi_total_offices', 'kpi_largest_office', 'kpi_total_employees'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Staff by Office', titleAr: 'إجمالي الكادر حسب المكتب', xAxis: 'office', yAxis: 'totalStaff' },
      { type: 'bar', titleEn: 'Office vs Field Staff', titleAr: 'مقارنة المكتبي والميداني', xAxis: 'office', yAxis: 'officeStaff', groupField: 'fieldStaff' }
    ]
  },
  {
    id: 'emp_department',
    category: 'EMPLOYEE',
    titleEn: 'Employees by Department',
    titleAr: 'توزيع الموظفين حسب الأقسام',
    descriptionEn: 'Headcount and operational breakdown across corporate and branch departments.',
    descriptionAr: 'توزيع الكادر والعمليات التشغيلية عبر الإدارات والأقسام المختلفة.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: 2026-10-Roster VITAS and ATAS-microfin.xls',
    columns: [
      { key: 'department', headerEn: 'Department', headerAr: 'القسم الإداري', type: 'string', width: 200 },
      { key: 'headcount', headerEn: 'Headcount', headerAr: 'عدد الموظفين', type: 'number', width: 130 },
      { key: 'percentage', headerEn: '% of Workforce', headerAr: 'نسبة الكادر (%)', type: 'percent', width: 140 },
      { key: 'maleCount', headerEn: 'Male', headerAr: 'ذكور', type: 'number', width: 100 },
      { key: 'femaleCount', headerEn: 'Female', headerAr: 'إناث', type: 'number', width: 100 },
      { key: 'monthlyPayroll', headerEn: 'Total Monthly Basic (IQD)', headerAr: 'إجمالي الراتب الأساسي الشهري (د.ع)', type: 'currency', width: 220 }
    ],
    defaultColumns: ['department', 'headcount', 'percentage', 'maleCount', 'femaleCount', 'monthlyPayroll'],
    defaultSort: { key: 'headcount', direction: 'desc' },
    kpis: ['kpi_total_departments', 'kpi_largest_department'],
    recommendedCharts: [
      { type: 'donut', titleEn: 'Headcount by Department', titleAr: 'توزيع الموظفين حسب الأقسام', xAxis: 'department', yAxis: 'headcount' },
      { type: 'bar', titleEn: 'Payroll by Department', titleAr: 'كتلة الرواتب الأساسية حسب القسم', xAxis: 'department', yAxis: 'monthlyPayroll' }
    ]
  },
  {
    id: 'emp_new_hires',
    category: 'EMPLOYEE',
    titleEn: 'New Hires & Onboarding Report',
    titleAr: 'تقرير التعيينات الجديدة',
    descriptionEn: 'Employees newly recruited and onboarded during the selected reporting period.',
    descriptionAr: 'الموظفون الجدد الذين تم تعيينهم وانضمامهم للعمل خلال الفترة المحددة.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Turnover FY 2027.xlsx & 2026-10-Roster VITAS and ATAS-microfin.xls',
    columns: [
      { key: 'name', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'position', headerEn: 'Position', headerAr: 'المسمى الوظيفي', type: 'string', width: 180 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'startDate', headerEn: 'Start Date', headerAr: 'تاريخ المباشرة', type: 'date', width: 120 },
      { key: 'gender', headerEn: 'Gender', headerAr: 'الجنس', type: 'string', width: 100 },
      { key: 'category', headerEn: 'Category', headerAr: 'فئة العمل', type: 'string', width: 130 },
      { key: 'tier', headerEn: 'Management Tier', headerAr: 'المستوى', type: 'string', width: 150 }
    ],
    defaultColumns: ['name', 'position', 'office', 'startDate', 'gender', 'category', 'tier'],
    defaultSort: { key: 'startDate', direction: 'desc' },
    kpis: ['kpi_new_hires_count'],
    recommendedCharts: [
      { type: 'column', titleEn: 'New Hires by Office', titleAr: 'التعيينات الجديدة حسب المكتب', xAxis: 'office', yAxis: 'count' }
    ]
  },
  {
    id: 'emp_resigned',
    category: 'TURNOVER',
    titleEn: 'Resigned & Terminated Employees Report',
    titleAr: 'تقرير الاستقالات وإنهاء الخدمات',
    descriptionEn: 'Turnover records showing terminated or resigned staff, tenure of service, and recorded reasons for leaving.',
    descriptionAr: 'سجلات دوران الموظفين تبين المنتهية خدماتهم أو المستقيلين، ومدة الخدمة وأسباب المغادرة.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Turnover FY 2027.xlsx (IN OUT Employees sheet)',
    columns: [
      { key: 'name', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'position', headerEn: 'Position', headerAr: 'المسمى الوظيفي', type: 'string', width: 180 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'startDate', headerEn: 'Start Date', headerAr: 'تاريخ البدء', type: 'date', width: 120 },
      { key: 'endDate', headerEn: 'End Date', headerAr: 'تاريخ الانتهاء', type: 'date', width: 120 },
      { key: 'tenureYears', headerEn: 'Tenure (Years)', headerAr: 'سنوات الخدمة', type: 'number', width: 130 },
      { key: 'probPeriod', headerEn: 'During Probation?', headerAr: 'خلال التجربة؟', type: 'string', width: 140 },
      { key: 'reason', headerEn: 'Reason for Exit', headerAr: 'سبب المغادرة', type: 'string', width: 180 }
    ],
    defaultColumns: ['name', 'position', 'office', 'endDate', 'tenureYears', 'probPeriod', 'reason'],
    defaultSort: { key: 'endDate', direction: 'desc' },
    kpis: ['kpi_terminations_count', 'kpi_avg_tenure'],
    recommendedCharts: [
      { type: 'pie', titleEn: 'Exit Reasons', titleAr: 'أسباب انتهاء الخدمة', xAxis: 'reason', yAxis: 'count' },
      { type: 'column', titleEn: 'Exits by Office', titleAr: 'المغادرون حسب المكتب', xAxis: 'office', yAxis: 'count' }
    ]
  },
  {
    id: 'emp_status_changes',
    category: 'EMPLOYEE',
    titleEn: 'Employee Promotions & Status Changes',
    titleAr: 'تقرير الترقيات وتغيير المسميات الوظيفية',
    descriptionEn: 'Internal job promotions, position modifications, and department transfers recorded in official HR records.',
    descriptionAr: 'الترقيات الوظيفية وتعديلات المسميات والتنقلات المسجلة في السجلات الرسمية.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: 2026-10-Roster VITAS and ATAS-microfin.xls (Status change sheet)',
    columns: [
      { key: 'id', headerEn: '#', headerAr: '#', type: 'string', width: 80 },
      { key: 'name', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'oldPosition', headerEn: 'Previous Position', headerAr: 'المسمى السابق', type: 'string', width: 200 },
      { key: 'newPosition', headerEn: 'New Position', headerAr: 'المسمى الجديد / الترقية', type: 'string', width: 220 },
      { key: 'changeDate', headerEn: 'Effective Date', headerAr: 'تاريخ السريان', type: 'date', width: 130 }
    ],
    defaultColumns: ['name', 'office', 'oldPosition', 'newPosition', 'changeDate'],
    defaultSort: { key: 'changeDate', direction: 'desc' },
    kpis: ['kpi_promotions_count'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Promotions by Office', titleAr: 'الترقيات حسب المكتب', xAxis: 'office', yAxis: 'count' }
    ]
  },

  // B. Payroll & Financial HR Reports
  {
    id: 'pay_summary',
    category: 'PAYROLL',
    titleEn: 'Monthly Payroll Summary',
    titleAr: 'ملخص الرواتب والتعويضات الشهري',
    descriptionEn: 'Complete employee payroll ledger showing basic salary, allowances, incentives, bonuses, overtime, social security 12%, and total gross payout.',
    descriptionAr: 'كشف الرواتب الشهري التفصيلي موضحاً الراتب الأساسي والمخصصات والمكافآت والضمان الاجتماعي 12% وإجمالي المستحقات.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Microfin july aug Sep.26 Payroll.xlsx (Monthly sheets)',
    columns: [
      { key: 'employeeName', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 130 },
      { key: 'department', headerEn: 'Department', headerAr: 'القسم', type: 'string', width: 140 },
      { key: 'basicSalary', headerEn: 'Basic Salary (IQD)', headerAr: 'الراتب الأساسي', type: 'currency', width: 150 },
      { key: 'phoneAllowance', headerEn: 'Phone Allow.', headerAr: 'مخصصات الهاتف', type: 'currency', width: 130 },
      { key: 'transportation', headerEn: 'Transportation', headerAr: 'مخصصات النقل', type: 'currency', width: 140 },
      { key: 'familyAllowance', headerEn: 'Family Allow.', headerAr: 'مخصصات الزوجية', type: 'currency', width: 130 },
      { key: 'certificateAllowance', headerEn: 'Certificate Allow.', headerAr: 'مخصصات الشهادة', type: 'currency', width: 140 },
      { key: 'incentives', headerEn: 'Incentives', headerAr: 'الحوافز الشهرية', type: 'currency', width: 140 },
      { key: 'bonus', headerEn: 'Bonus / EOM', headerAr: 'المكافآت / موظف الشهر', type: 'currency', width: 140 },
      { key: 'overtime', headerEn: 'Overtime', headerAr: 'أجور الإضافي', type: 'currency', width: 130 },
      { key: 'socialSecurity12', headerEn: 'Social Sec. 12%', headerAr: 'حصة الضمان 12%', type: 'currency', width: 140 },
      { key: 'grossSalary', headerEn: 'Gross Payout (IQD)', headerAr: 'إجمالي المستحقات', type: 'currency', width: 170 }
    ],
    defaultColumns: ['employeeName', 'office', 'basicSalary', 'incentives', 'transportation', 'bonus', 'socialSecurity12', 'grossSalary'],
    defaultSort: { key: 'grossSalary', direction: 'desc' },
    kpis: ['kpi_total_payroll', 'kpi_total_basic', 'kpi_total_incentives', 'kpi_total_social_sec', 'kpi_avg_gross'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Gross Payroll by Office', titleAr: 'إجمالي الرواتب حسب المكتب', xAxis: 'office', yAxis: 'grossSalary' },
      { type: 'pie', titleEn: 'Payroll Cost Breakdown', titleAr: 'هيكل تكلفة الرواتب', xAxis: 'category', yAxis: 'amount' }
    ]
  },
  {
    id: 'pay_office',
    category: 'PAYROLL',
    titleEn: 'Salaries & Payroll by Office',
    titleAr: 'الرواتب والأجور حسب المكاتب',
    descriptionEn: 'Consolidated financial comparison of basic salaries, allowances, and incentives across all branches.',
    descriptionAr: 'مقارنة مالية موحدة للرواتب الأساسية والمخصصات والحوافز عبر كافة الفروع والمكاتب.',
    supportLevel: 'FULL',
    dataSourceNote: 'Aggregated from Microfin Payroll sheets',
    columns: [
      { key: 'office', headerEn: 'Office Location', headerAr: 'المكتب / الفرع', type: 'string', width: 180 },
      { key: 'employeeCount', headerEn: 'Staff Count', headerAr: 'عدد الموظفين', type: 'number', width: 120 },
      { key: 'totalBasic', headerEn: 'Total Basic Salary (IQD)', headerAr: 'مجموع الرواتب الأساسية', type: 'currency', width: 190 },
      { key: 'totalIncentives', headerEn: 'Total Incentives', headerAr: 'مجموع الحوافز', type: 'currency', width: 160 },
      { key: 'totalAllowances', headerEn: 'Total Allowances', headerAr: 'مجموع المخصصات', type: 'currency', width: 160 },
      { key: 'totalOvertime', headerEn: 'Total Overtime', headerAr: 'مجموع الإضافي', type: 'currency', width: 150 },
      { key: 'totalSocialSec', headerEn: 'Social Security 12%', headerAr: 'الضمان الاجتماعي', type: 'currency', width: 170 },
      { key: 'totalGross', headerEn: 'Total Gross (IQD)', headerAr: 'إجمالي المستحقات (د.ع)', type: 'currency', width: 190 },
      { key: 'avgSalary', headerEn: 'Avg Gross / Staff', headerAr: 'متوسط الراتب / موظف', type: 'currency', width: 170 }
    ],
    defaultColumns: ['office', 'employeeCount', 'totalBasic', 'totalIncentives', 'totalAllowances', 'totalGross', 'avgSalary'],
    defaultSort: { key: 'totalGross', direction: 'desc' },
    kpis: ['kpi_total_payroll', 'kpi_highest_payroll_office', 'kpi_avg_gross'],
    recommendedCharts: [
      { type: 'bar', titleEn: 'Total Payroll by Office', titleAr: 'إجمالي كتلة الرواتب حسب المكتب', xAxis: 'office', yAxis: 'totalGross' }
    ]
  },
  {
    id: 'pay_allowances',
    category: 'PAYROLL',
    titleEn: 'Allowances & Benefits Detailed Report',
    titleAr: 'تقرير المخصصات والمزايا التفصيلي',
    descriptionEn: 'Detailed distribution of statutory and fringe allowances including Phone, Transportation, Family, and Academic Certificate allowances.',
    descriptionAr: 'توزيع تفصيلي للمخصصات تشمل الهاتف، النقل، مخصصات الزوجية والأطفال، ومخصصات الشهادة العلمية.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Microfin Payroll monthly sheets',
    columns: [
      { key: 'employeeName', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'phoneAllowance', headerEn: 'Phone Allowance (IQD)', headerAr: 'مخصصات هاتف', type: 'currency', width: 170 },
      { key: 'transportation', headerEn: 'Transportation Allowance', headerAr: 'مخصصات نقل', type: 'currency', width: 180 },
      { key: 'familyAllowance', headerEn: 'Family Allowance', headerAr: 'مخصصات عائلية', type: 'currency', width: 160 },
      { key: 'certificateAllowance', headerEn: 'Certificate Allowance', headerAr: 'مخصصات شهادة', type: 'currency', width: 170 },
      { key: 'totalAllowances', headerEn: 'Total Allowances (IQD)', headerAr: 'مجموع المخصصات', type: 'currency', width: 180 }
    ],
    defaultColumns: ['employeeName', 'office', 'phoneAllowance', 'transportation', 'familyAllowance', 'certificateAllowance', 'totalAllowances'],
    defaultSort: { key: 'totalAllowances', direction: 'desc' },
    kpis: ['kpi_total_allowances', 'kpi_total_transport', 'kpi_total_family_allow'],
    recommendedCharts: [
      { type: 'pie', titleEn: 'Allowances Breakdown', titleAr: 'نسب توزيع المخصصات', xAxis: 'allowanceType', yAxis: 'amount' }
    ]
  },
  {
    id: 'pay_social_security',
    category: 'PAYROLL',
    titleEn: 'Social Security & Statutory Contributions',
    titleAr: 'تقرير مساهمات الضمان الاجتماعي',
    descriptionEn: 'Employer 12% social security contribution calculations per employee and branch compliance breakdown.',
    descriptionAr: 'احتساب حصة المؤسسة في الضمان الاجتماعي بنسبة 12% لكل موظف وتفصيل الالتزام عبر الفروع.',
    supportLevel: 'FULL',
    dataSourceNote: 'Calculated from basic salary x 12% as verified in Microfin Payroll',
    columns: [
      { key: 'employeeName', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'basicSalary', headerEn: 'Basic Salary (IQD)', headerAr: 'الراتب الأساسي', type: 'currency', width: 160 },
      { key: 'socialSecurity12', headerEn: 'Employer SS 12% (IQD)', headerAr: 'حصة الضمان 12%', type: 'currency', width: 180 },
      { key: 'annualEstimate', headerEn: 'Annualized SS Cost', headerAr: 'التكلفة السنوية المقدرة', type: 'currency', width: 180 }
    ],
    defaultColumns: ['employeeName', 'office', 'basicSalary', 'socialSecurity12', 'annualEstimate'],
    defaultSort: { key: 'socialSecurity12', direction: 'desc' },
    kpis: ['kpi_total_social_sec', 'kpi_avg_social_sec'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Social Security by Office', titleAr: 'مساهمة الضمان حسب المكتب', xAxis: 'office', yAxis: 'socialSecurity12' }
    ]
  },

  // C. Incentives & Bonuses Reports
  {
    id: 'inc_monthly',
    category: 'INCENTIVES',
    titleEn: 'Monthly Incentives & Performance Report',
    titleAr: 'تقرير الحوافز ومكافآت الأداء الشهرية',
    descriptionEn: 'Incentives disbursed based on portfolio quality, loan disbursements, and branch performance metrics.',
    descriptionAr: 'الحوافز المصروفة لموظفي الإقراض والتحصيل بناءً على حجم المحفظة والأداء الشهري.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Microfin Payroll monthly sheets',
    columns: [
      { key: 'employeeName', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'department', headerEn: 'Department', headerAr: 'القسم', type: 'string', width: 150 },
      { key: 'incentives', headerEn: 'Incentives (IQD)', headerAr: 'مبلغ الحافز (د.ع)', type: 'currency', width: 160 },
      { key: 'bonus', headerEn: 'Bonus (IQD)', headerAr: 'المكافأة (د.ع)', type: 'currency', width: 150 },
      { key: 'basicSalary', headerEn: 'Basic Salary', headerAr: 'الراتب الأساسي', type: 'currency', width: 150 },
      { key: 'incentiveRatio', headerEn: 'Incentive / Basic (%)', headerAr: 'نسبة الحافز للأساسي', type: 'percent', width: 160 }
    ],
    defaultColumns: ['employeeName', 'office', 'department', 'incentives', 'bonus', 'incentiveRatio'],
    defaultSort: { key: 'incentives', direction: 'desc' },
    kpis: ['kpi_total_incentives', 'kpi_top_incentive_recipient', 'kpi_avg_incentive'],
    recommendedCharts: [
      { type: 'bar', titleEn: 'Top 10 Incentive Recipients', titleAr: 'أعلى 10 مستلمين للحوافز', xAxis: 'employeeName', yAxis: 'incentives' },
      { type: 'column', titleEn: 'Incentives by Office', titleAr: 'إجمالي الحوافز حسب المكتب', xAxis: 'office', yAxis: 'incentives' }
    ]
  },
  {
    id: 'inc_bonuses',
    category: 'INCENTIVES',
    titleEn: 'Bonuses & Employee of the Month Report',
    titleAr: 'تقرير المكافآت التقديرية وموظف الشهر',
    descriptionEn: 'Special achievements, target bonuses, and Employee of the Month (EOM) rewards.',
    descriptionAr: 'المكافآت التقديرية ومكافآت تحقيق الأهداف وموظف الشهر (EOM).',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Microfin Payroll',
    columns: [
      { key: 'employeeName', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'bonus', headerEn: 'Bonus Amount (IQD)', headerAr: 'مبلغ المكافأة (د.ع)', type: 'currency', width: 180 },
      { key: 'basicSalary', headerEn: 'Basic Salary', headerAr: 'الراتب الأساسي', type: 'currency', width: 160 }
    ],
    defaultColumns: ['employeeName', 'office', 'bonus', 'basicSalary'],
    defaultSort: { key: 'bonus', direction: 'desc' },
    kpis: ['kpi_total_bonuses'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Bonuses by Office', titleAr: 'المكافآت حسب المكتب', xAxis: 'office', yAxis: 'bonus' }
    ]
  },

  // D. Attendance & Leave Reports
  {
    id: 'att_summary',
    category: 'ATTENDANCE',
    titleEn: 'Attendance & Overtime Summary',
    titleAr: 'ملخص الحضور والعمل الإضافي',
    descriptionEn: 'Overtime hours compensation, shift allowances, and payroll attendance reconciliation records.',
    descriptionAr: 'تعويضات ساعات العمل الإضافي وبدلات المناوبات ومطابقة الحضور المالية.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Microfin Payroll overtime transactions',
    columns: [
      { key: 'employeeName', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 220 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'overtime', headerEn: 'Overtime Pay (IQD)', headerAr: 'أجر العمل الإضافي (د.ع)', type: 'currency', width: 180 },
      { key: 'basicSalary', headerEn: 'Basic Salary', headerAr: 'الراتب الأساسي', type: 'currency', width: 160 },
      { key: 'overtimeRatio', headerEn: 'Overtime / Basic (%)', headerAr: 'نسبة الإضافي للأساسي', type: 'percent', width: 160 }
    ],
    defaultColumns: ['employeeName', 'office', 'overtime', 'basicSalary', 'overtimeRatio'],
    defaultSort: { key: 'overtime', direction: 'desc' },
    kpis: ['kpi_total_overtime'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Overtime by Office', titleAr: 'العمل الإضافي حسب المكتب', xAxis: 'office', yAxis: 'overtime' }
    ]
  },
  {
    id: 'att_daily_punches',
    category: 'ATTENDANCE',
    titleEn: 'Daily Biometric Attendance Logs',
    titleAr: 'سجلات الحضور البيومتري اليومية',
    descriptionEn: 'Detailed clock-in, clock-out, late arrival, and early departure logs.',
    descriptionAr: 'سجلات البصمة اليومية للحضور والانصراف والتأخير والمغادرة المبكرة.',
    supportLevel: 'PARTIAL',
    supportNoteEn: 'Biometric device clock-in raw transactions require syncing with biometric attendance machine or specialized punch log workbook. Currently summarized via payroll attendance deductions and overtime records.',
    supportNoteAr: 'سجلات البصمة الخام تتطلب ربط جهاز البصمة أو مصنف الحضور المباشر. ملخصة حالياً عبر كشوفات الخصم والإضافي الشهرية.',
    dataSourceNote: 'System status indicator: Biometric connector standby',
    columns: [
      { key: 'employeeName', headerEn: 'Employee Name', headerAr: 'اسم الموظف', type: 'string', width: 200 },
      { key: 'office', headerEn: 'Office', headerAr: 'المكتب', type: 'string', width: 140 },
      { key: 'status', headerEn: 'Status', headerAr: 'الحالة', type: 'string', width: 130 },
      { key: 'overtime', headerEn: 'Overtime Linked', headerAr: 'إضافي معتمد', type: 'currency', width: 150 },
      { key: 'notes', headerEn: 'Audit Note', headerAr: 'ملاحظة التدقيق', type: 'string', width: 240 }
    ],
    defaultColumns: ['employeeName', 'office', 'status', 'overtime', 'notes'],
    kpis: ['kpi_attendance_status'],
    recommendedCharts: []
  },

  // E. Management Reports
  {
    id: 'mgmt_exec_summary',
    category: 'MANAGEMENT',
    titleEn: 'Monthly HR Executive Summary',
    titleAr: 'الملخص التنفيذي الشهري للموارد البشرية',
    descriptionEn: 'High-level executive dashboard designed for the General Manager and Board of Directors, combining workforce metrics, payroll budget, headcount changes, and key highlights.',
    descriptionAr: 'لوحة قيادة تنفيذية عليا موجهة للمدير العام ومجلس الإدارة تجمع مؤشرات القوى العاملة، ميزانية الرواتب، حركة الموظفين والملاحظات الاستراتيجية.',
    supportLevel: 'FULL',
    dataSourceNote: 'Multi-source integration across all 5 workbooks',
    columns: [
      { key: 'metric', headerEn: 'Key Indicator', headerAr: 'المؤشر الاستراتيجي', type: 'string', width: 240 },
      { key: 'currentValue', headerEn: 'Current Value', headerAr: 'القيمة الحالية', type: 'string', width: 160 },
      { key: 'previousValue', headerEn: 'Previous Period', headerAr: 'الفترة السابقة', type: 'string', width: 160 },
      { key: 'change', headerEn: 'Variance', headerAr: 'التغير', type: 'string', width: 140 },
      { key: 'status', headerEn: 'Assessment', headerAr: 'التقييم', type: 'string', width: 140 }
    ],
    defaultColumns: ['metric', 'currentValue', 'previousValue', 'change', 'status'],
    kpis: ['kpi_total_employees', 'kpi_total_payroll', 'kpi_total_incentives', 'kpi_turnover_rate', 'kpi_new_hires_count'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Workforce by Office', titleAr: 'القوى العاملة حسب المكتب', xAxis: 'office', yAxis: 'totalStaff' },
      { type: 'donut', titleEn: 'Staff by Category', titleAr: 'تصنيف الكادر (مكتبي / ميداني)', xAxis: 'category', yAxis: 'count' }
    ]
  },
  {
    id: 'mgmt_branch_perf',
    category: 'MANAGEMENT',
    titleEn: 'Branch Staffing & Cost Performance',
    titleAr: 'أداء الفروع والكثافة الوظيفية والتكاليف',
    descriptionEn: 'Comparative analysis of branch staffing efficiency, ratio of field loan officers to office support, and total compensation outlay.',
    descriptionAr: 'تحليل مقارن لكفاءة التوظيف بالفروع، ونسبة مسؤولي الإقراض الميدانيين إلى الإداريين، والتكلفة الإجمالية.',
    supportLevel: 'FULL',
    dataSourceNote: 'Combined from 2026-10-Global Report VITAS ATAS.xls and Microfin Payroll',
    columns: [
      { key: 'office', headerEn: 'Branch / Office', headerAr: 'الفرع / المكتب', type: 'string', width: 180 },
      { key: 'totalStaff', headerEn: 'Total Staff', headerAr: 'إجمالي الموظفين', type: 'number', width: 130 },
      { key: 'loanOfficers', headerEn: 'Loan Officers', headerAr: 'مسؤولو الإقراض', type: 'number', width: 130 },
      { key: 'fieldRatio', headerEn: 'Field Staff Ratio', headerAr: 'نسبة الكادر الميداني', type: 'percent', width: 150 },
      { key: 'monthlyPayroll', headerEn: 'Monthly Payroll (IQD)', headerAr: 'كتلة الرواتب الشهرية', type: 'currency', width: 180 },
      { key: 'avgCostPerStaff', headerEn: 'Avg Cost / Staff', headerAr: 'متوسط التكلفة / موظف', type: 'currency', width: 170 }
    ],
    defaultColumns: ['office', 'totalStaff', 'loanOfficers', 'fieldRatio', 'monthlyPayroll', 'avgCostPerStaff'],
    defaultSort: { key: 'totalStaff', direction: 'desc' },
    kpis: ['kpi_total_offices', 'kpi_avg_branch_size', 'kpi_total_lo_count'],
    recommendedCharts: [
      { type: 'column', titleEn: 'Branch Staff vs Loan Officers', titleAr: 'مقارنة إجمالي الكادر ومسؤولي الإقراض', xAxis: 'office', yAxis: 'totalStaff', groupField: 'loanOfficers' }
    ]
  },
  {
    id: 'mgmt_growth_turnover',
    category: 'MANAGEMENT',
    titleEn: 'Workforce Growth & Turnover Dynamics',
    titleAr: 'ديناميكيات نمو القوى العاملة ودوران الموظفين',
    descriptionEn: 'Historical analysis of net employee headcount additions, hiring velocity, exit rates, and retention stability.',
    descriptionAr: 'تحليل تاريخي لصافي إضافة الموظفين، وسرعة التعيين، ومعدل المغادرة والاستقرار الوظيفي.',
    supportLevel: 'FULL',
    dataSourceNote: 'Source: Turnover FY 2027.xlsx & Global Report series',
    columns: [
      { key: 'period', headerEn: 'Period / Month', headerAr: 'الفترة / الشهر', type: 'string', width: 140 },
      { key: 'openingHeadcount', headerEn: 'Opening Headcount', headerAr: 'الكادر في بداية الفترة', type: 'number', width: 160 },
      { key: 'newHires', headerEn: 'New Hires (+)', headerAr: 'التعيينات الجديدة (+)', type: 'number', width: 150 },
      { key: 'exits', headerEn: 'Terminations (-)', headerAr: 'المغادرون (-)', type: 'number', width: 150 },
      { key: 'netChange', headerEn: 'Net Change', headerAr: 'صافي التغير', type: 'number', width: 140 },
      { key: 'closingHeadcount', headerEn: 'Closing Headcount', headerAr: 'الكادر في نهاية الفترة', type: 'number', width: 160 },
      { key: 'turnoverRate', headerEn: 'Turnover Rate (%)', headerAr: 'معدل الدوران (%)', type: 'percent', width: 150 }
    ],
    defaultColumns: ['period', 'openingHeadcount', 'newHires', 'exits', 'netChange', 'closingHeadcount', 'turnoverRate'],
    defaultSort: { key: 'period', direction: 'asc' },
    kpis: ['kpi_turnover_rate', 'kpi_net_growth', 'kpi_retention_rate'],
    recommendedCharts: [
      { type: 'line', titleEn: 'Headcount Trend Over Time', titleAr: 'مسار نمو الكادر عبر الزمن', xAxis: 'period', yAxis: 'closingHeadcount' },
      { type: 'column', titleEn: 'Hires vs Exits', titleAr: 'مقارنة التعيينات بالمغادرين', xAxis: 'period', yAxis: 'newHires', groupField: 'exits' }
    ]
  },
  {
    id: 'mgmt_issues_audit',
    category: 'MANAGEMENT',
    titleEn: 'HR Exceptions & Data Quality Audit',
    titleAr: 'سجل استثناءات الموارد البشرية وتدقيق جودة البيانات',
    descriptionEn: 'Automated data validation monitor flagging missing mandatory fields, duplicate employee IDs, contact discrepancies, and outlier compensations.',
    descriptionAr: 'نظام مراقبة جودة البيانات يكشف الحقول الناقصة، تكرار السجلات، ونواقص الاتصال والرواتب الاستثنائية.',
    supportLevel: 'FULL',
    dataSourceNote: 'Automated verification across all 5 workbooks',
    columns: [
      { key: 'id', headerEn: '#', headerAr: '#', type: 'number', width: 70 },
      { key: 'severity', headerEn: 'Severity', headerAr: 'الأهمية', type: 'string', width: 120 },
      { key: 'type', headerEn: 'Issue Type', headerAr: 'نوع الملاحظة', type: 'string', width: 180 },
      { key: 'field', headerEn: 'Target Field', headerAr: 'الحقل المستهدف', type: 'string', width: 160 },
      { key: 'description', headerEn: 'Audit Finding & Rationale', headerAr: 'تفاصيل الملاحظة والتوصية', type: 'string', width: 350 }
    ],
    defaultColumns: ['id', 'severity', 'type', 'field', 'description'],
    kpis: ['kpi_data_quality_score', 'kpi_total_exceptions'],
    recommendedCharts: [
      { type: 'pie', titleEn: 'Issues by Severity', titleAr: 'الملاحظات حسب الأهمية', xAxis: 'severity', yAxis: 'count' }
    ]
  }
];

// Set all columns checked by default across all reports
REPORT_CATALOG.forEach(report => {
  report.defaultColumns = report.columns.map(c => c.key);
});

export function getReportById(id: string): ReportDefinition {
  const report = REPORT_CATALOG.find(r => r.id === id);
  return report || REPORT_CATALOG[0];
}
