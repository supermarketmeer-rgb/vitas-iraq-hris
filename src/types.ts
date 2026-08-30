export type ThemeMode = 'dark' | 'light';

export type UserRole = 
  | 'Super Admin' 
  | 'HR Manager' 
  | 'Recruiter' 
  | 'Department Head' 
  | 'Employee' 
  | 'IT Admin' 
  | 'Compliance Officer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department: string;
  employeeId: string;
  branch: string;
  // User permissions (from PHP system)
  can_manage_employees?: number;
  can_manage_finance?: number;
  can_manage_recruitment?: number;
  can_manage_settings?: number;
  can_manage_users?: number;
}

export interface ModuleItem {
  id: string;
  title: string;
  titleEn: string;
  icon: string;
  description: string;
  badgeCount?: number;
  hidden?: boolean;
}

export interface CategoryGroup {
  id: string;
  title: string;
  titleEn: string;
  icon: string;
  modules: ModuleItem[];
}

export interface EmployeeChild {
  id?: string;
  name: string;
  relation: 'Son' | 'Daughter' | 'ولد' | 'بنت';
  dob: string;
  age?: number;
}

// Data Entities for state persistence
export interface Employee {
  id: string;
  employeeId: string;
  employee_id?: string;
  badgeNo?: string;
  badge_no?: string;
  fullName: string;
  fullNameAr?: string;
  full_name_ar?: string;
  fullNameEn?: string;
  full_name_en?: string;
  email: string;
  personalEmail?: string;
  personal_email?: string;
  phone: string;
  mobile?: string;
  emergencyPhone?: string;
  emergency_mobile?: string;
  department: string;
  jobTitle: string;
  jobTitleEn?: string;
  position_ar?: string;
  position_en?: string;
  position?: string;
  branch: string;
  branchEn?: string;
  location_ar?: string;
  location_en?: string;
  location?: string;
  joinDate: string;
  salary: number;
  basicSalary?: number;
  basic_salary?: number | string;
  transportationFixed?: number;
  fixedBonus?: number;
  phoneAllowance?: number;
  certificateAllowance?: number;
  writtenBasicSalaryAr?: string;
  bankName?: string;
  bank_name?: string;
  iban?: string;
  nationalId?: string;
  national_id?: string;
  passportNo?: string;
  passport_no?: string;
  passportExpiry?: string;
  passport_expiry?: string;
  dob?: string;
  yearsOfEmployment?: number;
  yearsInPosition?: number;
  exitDate?: string;
  photoUrl?: string;
  photo_url?: string;
  photo?: string;
  gender?: 'ذكر' | 'أنثى' | 'male' | 'female' | string;
  maritalStatus?: 'أعزب' | 'متأهل' | 'مطلق' | 'أرمل' | 'single' | 'married' | 'divorced' | 'widow' | string;
  isSsTaxExempt?: boolean | number;
  ssTaxExemptionReason?: string;
  spouseName?: string;
  spouse_name?: string;
  spouseEmployedHere?: boolean;
  contractStartDate?: string;
  contractEndDate?: string;
  originalStartDate?: string;
  probationEndDate?: string;
  termOfContract?: string;
  grade?: string;
  supervisorName?: string;
  supervisor_name?: string;
  workScope?: 'Field' | 'Admin' | 'Field & Admin' | string;
  work_scope?: string;
  nationality?: string;
  childrenList?: EmployeeChild[];
  childrenDetails?: string;
  trainingsRecord?: string;
  warningsRecord?: string;
  status: 'Active' | 'On Leave' | 'Terminated' | 'Onboarding' | 'active' | 'inactive' | 'onboarding' | string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'إجازة سنوية' | 'إجازة مرضية' | 'إجازة بدون راتب' | 'إجازة طارئة' | 'إجازة أمومة';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'قيد الانتظار' | 'مقبول' | 'مرفوض';
  appliedDate: string;
}

export interface JobVacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'دوام كامل' | 'Full Time' | 'دوام جزئي' | 'Part Time' | 'عقد' | 'Contract';
  experienceYears: number;
  status: 'مفتوحة' | 'Open' | 'مغلقة' | 'Closed' | 'مسودة' | 'Draft';
  createdDate: string;
  candidatesCount: number;
  requirements?: string;
  deadline?: string;
}

export interface Candidate {
  id: string;
  fullName: string;
  fullNameAr?: string;
  email: string;
  phone: string;
  appliedJobId: string;
  jobTitle: string;
  department?: string;
  branch?: string;
  stage: 
    | 'استلام الطلبات' | 'Applied' | 'تم التقديم'
    | 'فرز المتقدمين' | 'Initial Screening' | 'الفحص المبدئي'
    | 'تقييم المتقدمين من قبل لجنة التقييم' | 'Committee Evaluation'
    | 'مقابلة اولى' | 'First Interview' | 'المقابلة'
    | 'مقابلة نهائية اختيارية' | 'Optional Final Interview' | 'العرض الوظيفي' | 'Job Offer'
    | 'تعيين' | 'Hired' | 'تم التعيين'
    | 'إدخال البيانات في دليل الموظفين' | 'Employee Directory Entry' | 'ادخال البيانات الاساسية بعد القبول الكامل في Employee Directory'
    | 'مرفوض' | 'Rejected';
  rating: number;
  appliedDate: string;
  notes?: string;
  experienceYears?: number;
  photoUrl?: string;
  resumeUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  personalEmail?: string;
  nationalIdNumber?: string;
  committeeOpinion?: string;
  decisionReason?: string;
  committeeScores?: CommitteeScore[];
  // New committee evaluation fields
  officeName?: string; // اسم المكتب للمشترك بالتقييم
  evaluatorName?: string; // اسم المقيم
  evaluatorJobTitle?: string; // عنوانه الوظيفي
  finalScore?: number; // الدرجة النهائية Score
  interviewDate?: string;
  interviewTime?: string;
  interviewLocation?: string;
  secondInterviewDate?: string;
  secondInterviewTime?: string;
  secondInterviewLocation?: string;
  secondInterviewNotes?: string;
  addedToDirectory?: boolean;
  employeeId?: string;
}

export interface CommitteeScore {
  officeName: string; // اسم المكتب التابع له
  fullName: string; // اسمه الكامل
  jobTitle: string; // وظيفته
  score: number; // الدرجة من 100
}

export interface AssetRecord {
  id: string;
  assetTag: string;
  name: string;
  category: 'أجهزة حاسوب' | 'هواتف' | 'أثاث' | 'مركبات' | 'معدات شبكة';
  serialNumber: string;
  assignedTo?: string;
  assignedEmployeeName?: string;
  branch: string;
  status: 'متاح' | 'مخصص' | 'صيانة' | 'تالف';
  purchaseDate: string;
}

export interface RiskRecord {
  id: string;
  riskCode: string;
  title: string;
  category: 'أمن المعلومات' | 'الامتثال التنظيمي' | 'التشغيلي' | 'المالي';
  impact: 'منخفض' | 'متوسط' | 'عالي' | 'حرج';
  probability: 'منخفض' | 'متوسط' | 'عالي';
  owner: string;
  mitigationPlan: string;
  status: 'قيد المراجعة' | 'معالج' | 'مفتوح';
  identifiedDate: string;
}

export interface DocumentRecord {
  id: string;
  docNumber: string;
  title: string;
  type: 'عقد' | 'سياسة' | 'هوية' | 'شهادة' | 'تقرير' | string;
  department: string;
  uploadedBy: string;
  uploadDate: string;
  fileSize: string;
  category: string;
  employeeId?: string;
  employeeName?: string;
  contentHtml?: string;
  fileUrl?: string;
  description?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'alert' | 'news';
  relatedId?: string; // News item ID if type is 'news'
  actionUrl?: string; // URL to navigate to when clicked
}

export interface CompanyNewsItem {
  id: number;
  title_ar: string;
  title_en: string;
  content_ar: string;
  content_en: string;
  category: string;
  target_audience: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  published_by: string;
  publish_date: string;
  expiry_date: string;
  status: 'draft' | 'published' | 'archived';
  attachment_url: string;
  views_count: number;
  created_at: string;
  updated_at: string;
}
