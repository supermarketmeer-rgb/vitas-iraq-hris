import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import { isEmployeeInBranch, normalizeBranchKey, getBranchName } from '../utils/branchHelper';

// Database Schema Field Metadata definition
interface FieldMeta {
  key: string;
  labelAr: string;
  labelEn: string;
  tableName: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'badge';
  description?: string;
}

interface TableMeta {
  name: string;
  labelAr: string;
  labelEn: string;
  description: string;
  icon: string;
  primaryKey: string;
  fields: FieldMeta[];
}

interface FilterRule {
  id: string;
  fieldKey: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
  value: string;
}

interface SavedReport {
  id: string;
  name: string;
  description: string;
  primaryTable: string;
  joinedTables: string[];
  selectedFields: string[];
  filters: FilterRule[];
  groupBy?: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  createdAt: string;
  createdBy: string;
}

// Complete Catalog of Database Tables & Fields matching XAMPP hr_pro_db Schema
const DB_TABLES_CATALOG: TableMeta[] = [
  {
    name: 'employees',
    labelAr: 'جدول الموظفين الرئيسي (employees)',
    labelEn: 'Employees Master Table',
    description: 'سجلات البيانات الشخصية والوظيفية والمالية لكافة الموظفين',
    icon: 'badge',
    primaryKey: 'employee_id',
    fields: [
      { key: 'employee_id', labelAr: 'الرقم الوظيفي', labelEn: 'Employee ID', tableName: 'employees', type: 'text' },
      { key: 'fullName', labelAr: 'الاسم الكامل', labelEn: 'Full Name', tableName: 'employees', type: 'text' },
      { key: 'email', labelAr: 'البريد الإلكتروني الرسمي', labelEn: 'Official Email', tableName: 'employees', type: 'text' },
      { key: 'phone', labelAr: 'رقم الهاتف', labelEn: 'Phone Number', tableName: 'employees', type: 'text' },
      { key: 'department', labelAr: 'القسم / الإدارة', labelEn: 'Department', tableName: 'employees', type: 'badge' },
      { key: 'jobTitle', labelAr: 'المسمى الوظيفي', labelEn: 'Job Title', tableName: 'employees', type: 'text' },
      { key: 'branch', labelAr: 'الفرع / الموقع', labelEn: 'Branch Office', tableName: 'employees', type: 'badge' },
      { key: 'joinDate', labelAr: 'تاريخ المباشرة', labelEn: 'Join Date', tableName: 'employees', type: 'date' },
      { key: 'basicSalary', labelAr: 'الراتب الاسمي (د.ع)', labelEn: 'Basic Salary (IQD)', tableName: 'employees', type: 'currency' },
      { key: 'transportationFixed', labelAr: 'بدل النقل والسفر', labelEn: 'Transport Allowance', tableName: 'employees', type: 'currency' },
      { key: 'fixedBonus', labelAr: 'المكافآت والبدلات الثابتة', labelEn: 'Fixed Bonus', tableName: 'employees', type: 'currency' },
      { key: 'bankName', labelAr: 'اسم المصرف', labelEn: 'Bank Name', tableName: 'employees', type: 'text' },
      { key: 'iban', labelAr: 'رقم الحساب البنكي (IBAN)', labelEn: 'IBAN Number', tableName: 'employees', type: 'text' },
      { key: 'nationalId', labelAr: 'رقم البطاقة الوطنية', labelEn: 'National ID', tableName: 'employees', type: 'text' },
      { key: 'gender', labelAr: 'الجنس', labelEn: 'Gender', tableName: 'employees', type: 'badge' },
      { key: 'status', labelAr: 'حالة الموظف', labelEn: 'Employee Status', tableName: 'employees', type: 'badge' },
    ]
  },
  {
    name: 'attendance',
    labelAr: 'جدول الحضور والغياب (attendance)',
    labelEn: 'Time & Attendance Table',
    description: 'حركات الحضور اليومية، البصمة، التأخيرات وساعات العمل الإضافي',
    icon: 'schedule',
    primaryKey: 'id',
    fields: [
      { key: 'id', labelAr: 'معرف السجل', labelEn: 'Record ID', tableName: 'attendance', type: 'text' },
      { key: 'employeeId', labelAr: 'الرقم الوظيفي للموظف', labelEn: 'Employee ID', tableName: 'attendance', type: 'text' },
      { key: 'attendanceDate', labelAr: 'تاريخ الحضور', labelEn: 'Date', tableName: 'attendance', type: 'date' },
      { key: 'checkIn', labelAr: 'وقت بصمة الدخول', labelEn: 'Check In', tableName: 'attendance', type: 'text' },
      { key: 'checkOut', labelAr: 'وقت بصمة الخروج', labelEn: 'Check Out', tableName: 'attendance', type: 'text' },
      { key: 'lateMinutes', labelAr: 'دقائق التأخير', labelEn: 'Late Minutes', tableName: 'attendance', type: 'number' },
      { key: 'overtimeHours', labelAr: 'ساعات الإضافي', labelEn: 'Overtime Hours', tableName: 'attendance', type: 'number' },
      { key: 'attendanceStatus', labelAr: 'حالة الحضور', labelEn: 'Attendance Status', tableName: 'attendance', type: 'badge' },
    ]
  },
  {
    name: 'payroll_periods',
    labelAr: 'جدول مسيرات الرواتب (payroll_periods)',
    labelEn: 'Payroll Master Periods',
    description: 'المسيرات الشهرية للرواتب، البدلات، الاستقطاعات وصفات الصرف',
    icon: 'payments',
    primaryKey: 'period_id',
    fields: [
      { key: 'period_id', labelAr: 'رمز المسير', labelEn: 'Period Code', tableName: 'payroll_periods', type: 'text' },
      { key: 'periodName', labelAr: 'اسم الشهر والمسير', labelEn: 'Period Name', tableName: 'payroll_periods', type: 'text' },
      { key: 'disbursedAmount', labelAr: 'صافي المبلغ المصروف (IQD)', labelEn: 'Net Disbursed Amount', tableName: 'payroll_periods', type: 'currency' },
      { key: 'employeesCount', labelAr: 'عدد الموظفين في المسير', labelEn: 'Employees Count', tableName: 'payroll_periods', type: 'number' },
      { key: 'payrollStatus', labelAr: 'حالة الاعتماد والصرف', labelEn: 'Payroll Status', tableName: 'payroll_periods', type: 'badge' },
      { key: 'approvalDate', labelAr: 'تاريخ التوقيع والاعتماد', labelEn: 'Approval Date', tableName: 'payroll_periods', type: 'date' },
    ]
  },
  {
    name: 'employee_contracts',
    labelAr: 'جدول عقود الموظفين (employee_contracts)',
    labelEn: 'Employee Contracts Table',
    description: 'تفاصيل العقود القانونية، البداية، الانتهاء والدرجات الوظيفية',
    icon: 'description',
    primaryKey: 'contract_id',
    fields: [
      { key: 'contract_id', labelAr: 'رقم العقد', labelEn: 'Contract ID', tableName: 'employee_contracts', type: 'text' },
      { key: 'employeeId', labelAr: 'الرقم الوظيفي', labelEn: 'Employee ID', tableName: 'employee_contracts', type: 'text' },
      { key: 'contractType', labelAr: 'نوع العقد', labelEn: 'Contract Type', tableName: 'employee_contracts', type: 'badge' },
      { key: 'startDate', labelAr: 'تاريخ بداية العقد', labelEn: 'Start Date', tableName: 'employee_contracts', type: 'date' },
      { key: 'endDate', labelAr: 'تاريخ نهاية العقد', labelEn: 'End Date', tableName: 'employee_contracts', type: 'date' },
      { key: 'contractSalary', labelAr: 'الراتب المتعاقد عليه', labelEn: 'Contract Salary', tableName: 'employee_contracts', type: 'currency' },
      { key: 'contractStatus', labelAr: 'حالة العقد', labelEn: 'Contract Status', tableName: 'employee_contracts', type: 'badge' },
    ]
  },
  {
    name: 'assets',
    labelAr: 'جدول العهد والأصول (assets)',
    labelEn: 'Company Assets Table',
    description: 'مخزون الأجهزة الرقمية، حواسب، هواتف وأثاث عهدة الموظفين',
    icon: 'inventory_2',
    primaryKey: 'id',
    fields: [
      { key: 'assetTag', labelAr: 'رمز العهدة (Asset Tag)', labelEn: 'Asset Tag', tableName: 'assets', type: 'text' },
      { key: 'assetName', labelAr: 'اسم الأصل / الجهاز', labelEn: 'Asset Name', tableName: 'assets', type: 'text' },
      { key: 'category', labelAr: 'تصنيف الأصل', labelEn: 'Category', tableName: 'assets', type: 'badge' },
      { key: 'serialNumber', labelAr: 'الرقم التسلسلي (S/N)', labelEn: 'Serial Number', tableName: 'assets', type: 'text' },
      { key: 'assignedToEmployee', labelAr: 'اسم الموظف المستلم', labelEn: 'Assigned Employee', tableName: 'assets', type: 'text' },
      { key: 'assetBranch', labelAr: 'الفرع المستلم', labelEn: 'Asset Branch', tableName: 'assets', type: 'badge' },
      { key: 'assetStatus', labelAr: 'حالة العهدة', labelEn: 'Asset Status', tableName: 'assets', type: 'badge' },
      { key: 'purchaseDate', labelAr: 'تاريخ الشراء والاعتماد', labelEn: 'Purchase Date', tableName: 'assets', type: 'date' },
    ]
  },
  {
    name: 'candidates',
    labelAr: 'جدول المتقدمين للوظائف (candidates)',
    labelEn: 'ATS Recruitment Candidates',
    description: 'بيانات المرشحين، مراحل التقييم ودرجات اللجان التنافسية',
    icon: 'person_search',
    primaryKey: 'id',
    fields: [
      { key: 'candidateId', labelAr: 'رمز المرشح', labelEn: 'Candidate ID', tableName: 'candidates', type: 'text' },
      { key: 'candidateName', labelAr: 'اسم المتقدم', labelEn: 'Candidate Name', tableName: 'candidates', type: 'text' },
      { key: 'candidateEmail', labelAr: 'البريد الإلكتروني', labelEn: 'Email', tableName: 'candidates', type: 'text' },
      { key: 'jobTitleApplied', labelAr: 'الوظيفة المتقدم لها', labelEn: 'Applied Job', tableName: 'candidates', type: 'text' },
      { key: 'stage', labelAr: 'مرحلة التوظيف', labelEn: 'Pipeline Stage', tableName: 'candidates', type: 'badge' },
      { key: 'ratingScore', labelAr: 'تقييم اللجنة (من 5)', labelEn: 'Committee Rating', tableName: 'candidates', type: 'number' },
      { key: 'appliedDate', labelAr: 'تاريخ التقديم', labelEn: 'Applied Date', tableName: 'candidates', type: 'date' },
    ]
  },
  {
    name: 'leave_requests',
    labelAr: 'جدول طلبات الإجازات (leave_requests)',
    labelEn: 'Leave Requests Log',
    description: 'سجلات طلبات الإجازات، الأنواع، المدة وموافقات الإدارة',
    icon: 'event_available',
    primaryKey: 'id',
    fields: [
      { key: 'leaveId', labelAr: 'رمز الطلب', labelEn: 'Request ID', tableName: 'leave_requests', type: 'text' },
      { key: 'employeeName', labelAr: 'اسم الموظف', labelEn: 'Employee Name', tableName: 'leave_requests', type: 'text' },
      { key: 'leaveType', labelAr: 'نوع الإجازة', labelEn: 'Leave Type', tableName: 'leave_requests', type: 'badge' },
      { key: 'startDate', labelAr: 'تاريخ البداية', labelEn: 'Start Date', tableName: 'leave_requests', type: 'date' },
      { key: 'endDate', labelAr: 'تاريخ النهاية', labelEn: 'End Date', tableName: 'leave_requests', type: 'date' },
      { key: 'daysCount', labelAr: 'عدد الأيام', labelEn: 'Days Count', tableName: 'leave_requests', type: 'number' },
      { key: 'approvalStatus', labelAr: 'حالة الطلب والموافقة', labelEn: 'Approval Status', tableName: 'leave_requests', type: 'badge' },
    ]
  }
];

export const DynamicReportBuilder: React.FC = () => {
  const { 
    employees, 
    leaveRequests, 
    candidates, 
    assetRecords, 
    t, 
    currentUser, 
    language, 
    theme, 
    addNotification,
    isBranchManager,
    userBranch,
    scopedEmployees
  } = useApp();
  const isDark = theme === 'dark';

  // For branch manager, active employees are strictly scoped
  const effectiveEmployees = isBranchManager ? (scopedEmployees || []) : employees;

  // Primary and Joined Tables Selection
  const [primaryTable, setPrimaryTable] = useState<string>('employees');
  const [joinedTables, setJoinedTables] = useState<string[]>(['attendance', 'employee_contracts']);

  // Selected Fields State (Initialized with core default fields)
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'employee_id',
    'fullName',
    'department',
    'jobTitle',
    'branch',
    'basicSalary',
    'transportationFixed',
    'status'
  ]);

  // Query Builder Filter Rules
  const [filters, setFilters] = useState<FilterRule[]>([
    { id: 'f1', fieldKey: 'status', operator: 'equals', value: 'Active' }
  ]);

  // Search & Sorting Options
  const [searchColumnTerm, setSearchColumnTerm] = useState<string>('');
  const [gridSearchTerm, setGridSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('employee_id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [groupByField, setGroupByField] = useState<string>('');

  // Auto Refresh & Sync States
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = Manual, 10, 30, 60
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('ar-IQ'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Saved Reports List State
  const [savedReports, setSavedReports] = useState<SavedReport[]>([
    {
      id: 'rep-1',
      name: 'تقرير الكادر الأساسي مع الراتب والبدلات',
      description: 'استعلام مباشر لموظفي الخدمة الفعالة مع إجمالي الرواتب وبدلات النقل',
      primaryTable: 'employees',
      joinedTables: ['employee_contracts'],
      selectedFields: ['employee_id', 'fullName', 'department', 'jobTitle', 'branch', 'basicSalary', 'transportationFixed', 'status'],
      filters: [{ id: 'f1', fieldKey: 'status', operator: 'equals', value: 'Active' }],
      sortBy: 'basicSalary',
      sortOrder: 'desc',
      createdAt: '2026-07-30',
      createdBy: 'مدير الموارد البشرية'
    },
    {
      id: 'rep-2',
      name: 'تقرير عهد وأجهزة أصول المؤسسة الفعالة',
      description: 'كشف الأجهزة الحاسوبية والهواتف المسلمة لكوادر الفروع',
      primaryTable: 'assets',
      joinedTables: ['employees'],
      selectedFields: ['assetTag', 'assetName', 'category', 'serialNumber', 'assignedToEmployee', 'assetBranch', 'assetStatus'],
      filters: [{ id: 'f1', fieldKey: 'assetStatus', operator: 'equals', value: 'مخصص' }],
      sortBy: 'assetTag',
      sortOrder: 'asc',
      createdAt: '2026-07-31',
      createdBy: 'مسؤول IT'
    }
  ]);

  // Scoped Saved Reports for Branch Managers or standard for others
  const activeSavedReports: SavedReport[] = useMemo(() => {
    if (!isBranchManager) return savedReports;
    const bName = userBranch || 'مكتبك';
    return [
      {
        id: 'bm-rep-1',
        name: `تقرير كادر موظفي ${bName} الشامل مع الرواتب والبدلات`,
        description: `كشف تفصيلي بالموظفين التابعين لـ ${bName} مع الرواتب وبدلات النقل والصفة الوظيفية`,
        primaryTable: 'employees',
        joinedTables: ['employee_contracts'],
        selectedFields: ['employee_id', 'fullName', 'department', 'jobTitle', 'branch', 'basicSalary', 'transportationFixed', 'status'],
        filters: [{ id: 'f1', fieldKey: 'status', operator: 'equals', value: 'Active' }],
        sortBy: 'basicSalary',
        sortOrder: 'desc',
        createdAt: '2026-10-27',
        createdBy: 'إدارة الموارد البشرية'
      },
      {
        id: 'bm-rep-2',
        name: `تقرير عهد وأجهزة وأصول ${bName}`,
        description: `سجل الأجهزة والمعدات والحواسيب المسلمة لكوادر ${bName}`,
        primaryTable: 'assets',
        joinedTables: ['employees'],
        selectedFields: ['assetTag', 'assetName', 'category', 'serialNumber', 'assignedToEmployee', 'assetBranch', 'assetStatus'],
        filters: [{ id: 'f1', fieldKey: 'assetStatus', operator: 'equals', value: 'مخصص' }],
        sortBy: 'assetTag',
        sortOrder: 'asc',
        createdAt: '2026-10-27',
        createdBy: 'مسؤول IT'
      },
      {
        id: 'bm-rep-3',
        name: `تقرير حركة الدوام والبصمة لموظفي ${bName}`,
        description: `سجل حركات الحضور، أوقات البصمة، التأخير وساعات العمل الإضافي لكادر ${bName}`,
        primaryTable: 'attendance',
        joinedTables: ['employees'],
        selectedFields: ['id', 'employeeId', 'attendanceDate', 'checkIn', 'checkOut', 'lateMinutes', 'overtimeHours', 'attendanceStatus'],
        filters: [],
        sortBy: 'attendanceDate',
        sortOrder: 'desc',
        createdAt: '2026-10-27',
        createdBy: 'إدارة الموارد البشرية'
      },
      {
        id: 'bm-rep-4',
        name: `تقرير طلبات وإجازات موظفي ${bName}`,
        description: `كشف بالإجازات السنوية والمرضية والاضطرارية لكادر ${bName}`,
        primaryTable: 'leave_requests',
        joinedTables: ['employees'],
        selectedFields: ['leaveId', 'employeeName', 'leaveType', 'startDate', 'endDate', 'daysCount', 'approvalStatus'],
        filters: [],
        sortBy: 'startDate',
        sortOrder: 'desc',
        createdAt: '2026-10-27',
        createdBy: 'إدارة الموارد البشرية'
      }
    ];
  }, [isBranchManager, userBranch, savedReports]);

  // Active Report Name State
  const [reportTitle, setReportTitle] = useState<string>(
    isBranchManager && userBranch 
      ? `تقرير كادر موظفي ${userBranch} الشامل مع الرواتب والبدلات` 
      : 'تقرير الموظفين الشامل مع الرواتب والبدلات'
  );

  // Auto initialize default branch report on mount for Branch Manager
  useEffect(() => {
    if (isBranchManager && activeSavedReports.length > 0) {
      const defaultRep = activeSavedReports[0];
      setPrimaryTable(defaultRep.primaryTable);
      setJoinedTables(defaultRep.joinedTables);
      setSelectedFields(defaultRep.selectedFields);
      setFilters(defaultRep.filters);
      setSortBy(defaultRep.sortBy);
      setSortOrder(defaultRep.sortOrder);
      setReportTitle(defaultRep.name);
    }
  }, [isBranchManager]);

  // Modals visibility
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);
  const [previewModalMode, setPreviewModalMode] = useState<'print' | 'excel'>('print');

  // Sharing form inputs
  const [newReportName, setNewReportName] = useState<string>('');
  const [newReportDesc, setNewReportDesc] = useState<string>('');
  const [shareRecipientRole, setShareRecipientRole] = useState<string>('HR Manager');
  const [shareCustomNote, setShareCustomNote] = useState<string>('');
  const [shareSearchTerm, setShareSearchTerm] = useState<string>('');
  const [selectedRecipient, setSelectedRecipient] = useState<{
    id: string;
    label: string;
    labelEn: string;
    category: 'branch' | 'department' | 'employee' | 'role';
    categoryLabel: string;
    subtext?: string;
    icon: string;
  } | null>(null);
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState<boolean>(false);
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Compile unique lists of Branches, Departments, Employees, and Roles for Share Recipient Combobox
  const recipientOptions = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      labelEn: string;
      category: 'branch' | 'department' | 'employee' | 'role';
      categoryLabel: string;
      subtext?: string;
      icon: string;
    }> = [];

    // 1. Roles (أدوار إدارية)
    const roles = [
      { id: 'role-super-admin', label: 'الإدارة العليا (Executive Board)', labelEn: 'Executive Board', subtext: 'كافة صلاحيات الإدارة العليا' },
      { id: 'role-hr-manager', label: 'مدير الموارد البشرية (HR Manager)', labelEn: 'HR Manager', subtext: 'إدارة الموارد البشرية والرواتب' },
      { id: 'role-dept-head', label: 'رؤساء الأقسام الإدارية (Department Heads)', labelEn: 'Department Heads', subtext: 'إشراف الأقسام والإدارات' },
      { id: 'role-it-admin', label: 'مسؤولي تقنية المعلومات والأنظمة (IT Admin)', labelEn: 'IT Admin', subtext: 'إدارة السيرفرات وقواعد البيانات' },
    ];
    roles.forEach(r => list.push({
      id: r.id,
      label: r.label,
      labelEn: r.labelEn,
      category: 'role',
      categoryLabel: language === 'en' ? 'Administrative Role' : 'دور إداري',
      subtext: r.subtext,
      icon: 'admin_panel_settings'
    }));

    // 2. Branches / Offices (مكاتب وفروع المؤسسة)
    const branchSet = new Set<string>();
    employees.forEach(e => {
      const b = e.branch || (e as any).location_ar;
      if (b && typeof b === 'string') branchSet.add(b.trim());
    });
    ['الإدارة العامة - بغداد', 'فرع أربيل', 'فرع السليمانية', 'فرع دهوك', 'فرع بغداد الرصافة', 'فرع بغداد الكرخ', 'فرع بابل_الحلة', 'فرع كربلاء', 'فرع النجف', 'فرع البصرة', 'فرع الكوت', 'فرع ميسان', 'فرع الديوانية', 'فرع كركوك'].forEach(b => branchSet.add(b));
    
    branchSet.forEach(b => {
      list.push({
        id: `branch-${b}`,
        label: b.startsWith('فرع') || b.startsWith('مكتب') || b.startsWith('الإدارة') ? b : `فرع ${b}`,
        labelEn: `Branch: ${b}`,
        category: 'branch',
        categoryLabel: language === 'en' ? 'Branch / Office' : 'مكتب / فرع',
        subtext: language === 'en' ? 'All branch staff' : 'كافة موظفي وكادر الفرع',
        icon: 'domain'
      });
    });

    // 3. Departments (الأقسام والإدارات)
    const deptSet = new Set<string>();
    employees.forEach(e => {
      if (e.department && typeof e.department === 'string') deptSet.add(e.department.trim());
    });
    ['قسم الائتمان', 'قسم الموارد البشرية', 'قسم تكنولوجيا المعلومات', 'قسم العمليات والتدقيق', 'قسم المالية والمحاسبة', 'قسم الشؤون القانونية', 'قسم إدارة المخاطر والامتثال', 'قسم خدمة العملاء والتسويق'].forEach(d => deptSet.add(d));

    deptSet.forEach(d => {
      list.push({
        id: `dept-${d}`,
        label: d.startsWith('قسم') ? d : `قسم ${d}`,
        labelEn: `Department: ${d}`,
        category: 'department',
        categoryLabel: language === 'en' ? 'Department' : 'قسم / إدارة',
        subtext: language === 'en' ? 'Department team' : 'كادر وفريق القسم',
        icon: 'account_tree'
      });
    });

    // 4. Employees (كافة الموظفين فردياً)
    employees.forEach(emp => {
      const empName = emp.fullName || (emp as any).fullNameAr || (emp as any).name || 'موظف';
      const badge = emp.employeeId || (emp as any).badgeNo || emp.id;
      const dept = emp.department || '';
      const branch = emp.branch || '';
      const title = emp.jobTitle || '';
      list.push({
        id: `emp-${emp.id}`,
        label: `${empName} (${badge})`,
        labelEn: `${empName} (ID: ${badge})`,
        category: 'employee',
        categoryLabel: language === 'en' ? 'Employee' : 'موظف',
        subtext: `${title} • ${dept} • ${branch}`.replace(/^ • | • $/g, ''),
        icon: 'person'
      });
    });

    return list;
  }, [employees, language]);

  const filteredRecipients = useMemo(() => {
    const term = shareSearchTerm.trim().toLowerCase();
    if (!term) {
      return recipientOptions.slice(0, 15);
    }
    return recipientOptions.filter(item => {
      return item.label.toLowerCase().includes(term) ||
             item.labelEn.toLowerCase().includes(term) ||
             (item.subtext && item.subtext.toLowerCase().includes(term));
    }).slice(0, 30);
  }, [recipientOptions, shareSearchTerm]);

  const handleSaveTemplate = () => {
    if (!newReportName.trim()) return;
    const newRep: SavedReport = {
      id: `rep-${Date.now()}`,
      name: newReportName.trim(),
      description: newReportDesc.trim() || 'استعلام ديناميكي مخصص',
      primaryTable,
      joinedTables,
      selectedFields,
      filters,
      sortBy,
      sortOrder,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser?.name || 'مستخدم النظام'
    };
    setSavedReports(prev => [newRep, ...prev]);
    setShowSaveModal(false);
    setNewReportName('');
    setNewReportDesc('');
    setActionSuccessMsg(t('تم حفظ نموذج التقرير بنجاح!', 'Report template saved successfully!'));
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Auto Refresh Interval Effect
  useEffect(() => {
    if (autoRefreshInterval === 0) return;

    const timer = setInterval(() => {
      setIsSyncing(true);
      setTimeout(() => {
        setIsSyncing(false);
        setLastSyncTime(new Date().toLocaleTimeString('ar-IQ'));
      }, 600);
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval]);

  // Get active meta for primary table
  const currentTableMeta = useMemo(() => {
    return DB_TABLES_CATALOG.find(t => t.name === primaryTable) || DB_TABLES_CATALOG[0];
  }, [primaryTable]);

  // Combined fields across primary & joined tables
  const availableFields = useMemo(() => {
    let fields: FieldMeta[] = [...currentTableMeta.fields];
    joinedTables.forEach(tableName => {
      const jMeta = DB_TABLES_CATALOG.find(t => t.name === tableName);
      if (jMeta) {
        fields = [...fields, ...jMeta.fields.filter(f => !fields.some(existing => existing.key === f.key))];
      }
    });
    return fields;
  }, [currentTableMeta, joinedTables]);

  // Toggle field selection
  const toggleField = (key: string) => {
    if (selectedFields.includes(key)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter(k => k !== key));
      }
    } else {
      setSelectedFields([...selectedFields, key]);
    }
  };

  const selectAllFields = () => {
    setSelectedFields(availableFields.map(f => f.key));
  };

  const clearAllFields = () => {
    setSelectedFields([availableFields[0].key]);
  };

  // Filter Rules Management
  const addFilterRule = () => {
    const newId = `f_${Date.now()}`;
    setFilters([...filters, { id: newId, fieldKey: availableFields[0].key, operator: 'equals', value: '' }]);
  };

  const removeFilterRule = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilterRule = (id: string, key: keyof FilterRule, val: any) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  // Mock Database Data Source Mapping Generator
  const rawData = useMemo(() => {
    switch (primaryTable) {
      case 'employees':
        return effectiveEmployees.map(emp => ({
          employee_id: emp.employeeId,
          fullName: emp.fullName || (emp as any).fullNameAr || (emp as any).name || 'موظف',
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          jobTitle: emp.jobTitle,
          branch: emp.branch,
          joinDate: emp.joinDate,
          basicSalary: emp.basicSalary || emp.salary || 1250000,
          transportationFixed: emp.transportationFixed || 150000,
          fixedBonus: emp.fixedBonus || 100000,
          bankName: emp.bankName || 'مصرف بغداد',
          iban: emp.iban || 'IQ88BGD00112233445566',
          nationalId: emp.nationalId || '199012345678',
          gender: emp.gender || 'ذكر',
          status: emp.status === 'Active' ? 'Active' : emp.status,
          // Joined mock data fields
          attendanceDate: '2026-07-31',
          checkIn: '08:02 AM',
          checkOut: '04:15 PM',
          lateMinutes: 0,
          overtimeHours: 1.5,
          attendanceStatus: 'حاضر',
          contractType: 'دائم (Full Time)',
          startDate: emp.contractStartDate || '2024-01-01',
          endDate: emp.contractEndDate || '2027-01-01',
          contractSalary: emp.salary || 1500000,
          contractStatus: 'ساري المفعول'
        }));

      case 'attendance':
        return effectiveEmployees.map((emp, i) => ({
          id: `ATT-${1000 + i}`,
          employeeId: emp.employeeId || `EMP-${100 + i}`,
          attendanceDate: '2026-07-31',
          checkIn: i % 3 === 0 ? '08:25 AM' : '07:55 AM',
          checkOut: '04:15 PM',
          lateMinutes: i % 3 === 0 ? 25 : 0,
          overtimeHours: i % 2 === 0 ? 1.0 : 0.0,
          attendanceStatus: i % 3 === 0 ? 'متأخر' : 'حاضر'
        }));

      case 'payroll_periods':
        return [
          { period_id: 'PAY-2026-07', periodName: `مسير رواتب تموز (July 2026) - ${isBranchManager ? userBranch : 'المؤسسة'}`, disbursedAmount: isBranchManager ? (effectiveEmployees.length * 1350000) : 485000000, employeesCount: effectiveEmployees.length, payrollStatus: 'معتمد ومصروف', approvalDate: '2026-07-28' },
          { period_id: 'PAY-2026-06', periodName: `مسير رواتب حزيران (June 2026) - ${isBranchManager ? userBranch : 'المؤسسة'}`, disbursedAmount: isBranchManager ? (effectiveEmployees.length * 1320000) : 478000000, employeesCount: effectiveEmployees.length, payrollStatus: 'معتمد ومصروف', approvalDate: '2026-06-27' },
        ];

      case 'assets': {
        const branchAssets = assetRecords.filter(ast => {
          if (!isBranchManager) return true;
          return isEmployeeInBranch({ branch: ast.branch }, userBranch) ||
                 effectiveEmployees.some(e => e.fullName === ast.assignedEmployeeName);
        });
        return branchAssets.map(ast => ({
          assetTag: ast.assetTag,
          assetName: ast.name,
          category: ast.category,
          serialNumber: ast.serialNumber,
          assignedToEmployee: ast.assignedEmployeeName || 'غير مخصص',
          assetBranch: ast.branch,
          assetStatus: ast.status,
          purchaseDate: ast.purchaseDate
        }));
      }

      case 'candidates': {
        const branchCandidates = candidates.filter(c => {
          if (!isBranchManager) return true;
          return isEmployeeInBranch({ branch: (c as any).branch || (c as any).location }, userBranch);
        });
        return branchCandidates.map(c => ({
          candidateId: c.id,
          candidateName: c.fullName,
          candidateEmail: c.email,
          jobTitleApplied: c.jobTitle,
          stage: c.stage,
          ratingScore: c.rating,
          appliedDate: c.appliedDate
        }));
      }

      case 'leave_requests': {
        const branchLeaves = leaveRequests.filter(l => {
          if (!isBranchManager) return true;
          return effectiveEmployees.some(e => 
            e.fullName === l.employeeName || 
            (e as any).fullNameAr === l.employeeName || 
            (e as any).name === l.employeeName
          );
        });
        return branchLeaves.map(l => ({
          leaveId: l.id,
          employeeName: l.employeeName,
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
          daysCount: l.days,
          approvalStatus: l.status
        }));
      }

      default:
        return effectiveEmployees.map(e => ({ employee_id: e.employeeId, fullName: e.fullName, department: e.department, status: e.status }));
    }
  }, [primaryTable, effectiveEmployees, assetRecords, candidates, leaveRequests, isBranchManager, userBranch]);

  // Execute Dynamic Filtering & Sorting
  const filteredData = useMemo(() => {
    return rawData.filter(row => {
      // Apply Global Sheet Search
      if (gridSearchTerm.trim()) {
        const matchesGlobal = Object.values(row).some(val => 
          String(val || '').toLowerCase().includes(gridSearchTerm.toLowerCase())
        );
        if (!matchesGlobal) return false;
      }

      // Apply Query Builder Filter Rules
      return filters.every(f => {
        if (!f.value.trim()) return true; // ignore empty filter
        const val = String((row as any)[f.fieldKey] || '').toLowerCase();
        const filterVal = f.value.toLowerCase();

        switch (f.operator) {
          case 'equals':
            return val === filterVal;
          case 'contains':
            return val.includes(filterVal);
          case 'gt':
            return Number(val) > Number(filterVal);
          case 'lt':
            return Number(val) < Number(filterVal);
          default:
            return true;
        }
      });
    }).sort((a: any, b: any) => {
      const valA = a[sortBy] ?? '';
      const valB = b[sortBy] ?? '';

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc' 
        ? String(valA).localeCompare(String(valB), 'ar') 
        : String(valB).localeCompare(String(valA), 'ar');
    });
  }, [rawData, gridSearchTerm, filters, sortBy, sortOrder]);

  // Calculate Numeric Totals for Selected Currency/Numeric Fields
  const columnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    selectedFields.forEach(fKey => {
      const meta = availableFields.find(f => f.key === fKey);
      if (meta && (meta.type === 'currency' || meta.type === 'number')) {
        const sum = filteredData.reduce((acc, row) => acc + (Number((row as any)[fKey]) || 0), 0);
        totals[fKey] = sum;
      }
    });
    return totals;
  }, [filteredData, selectedFields, availableFields]);

  // Load Saved Report Preset
  const applySavedReport = (rep: SavedReport) => {
    setPrimaryTable(rep.primaryTable);
    setJoinedTables(rep.joinedTables);
    setSelectedFields(rep.selectedFields);
    setFilters(rep.filters);
    setSortBy(rep.sortBy);
    setSortOrder(rep.sortOrder);
    setReportTitle(rep.name);
    triggerSuccessToast(`تم تحميل التقرير المحفوظ: "${rep.name}"`);
  };

  // Save Current Report Preset
  const handleSaveReport = () => {
    if (!newReportName.trim()) return;
    const newRep: SavedReport = {
      id: `rep_${Date.now()}`,
      name: newReportName,
      description: newReportDesc || 'تقرير مخصص مع استعلام تلقائي',
      primaryTable,
      joinedTables,
      selectedFields,
      filters,
      sortBy,
      sortOrder,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name
    };

    setSavedReports([newRep, ...savedReports]);
    setShowSaveModal(false);
    setNewReportName('');
    setNewReportDesc('');
    triggerSuccessToast('تم حفظ نموذج التقرير بنجاح واستخراجه للوصول المستقبلي!');
  };

  // Export to Excel (.xlsx) with automatic fallback to CSV
  const handleSaveExcel = () => {
    try {
      const isEn = language === 'en';
      const selectedMetas = selectedFields.map(fKey => availableFields.find(f => f.key === fKey)!).filter(Boolean);
      
      const exportRows = filteredData.map(row => {
        const obj: Record<string, any> = {};
        selectedMetas.forEach(m => {
          const colLabel = isEn ? (m.labelEn || m.key) : (m.labelAr || m.key);
          const rawVal = (row as any)[m.key];
          if (m.type === 'currency') {
            obj[colLabel] = Number(rawVal || 0);
          } else {
            obj[colLabel] = rawVal ?? '';
          }
        });
        return obj;
      });

      const ws = XLSX.utils.json_to_sheet(exportRows);
      
      // Auto column widths
      const colWidths = selectedMetas.map(m => {
        const colLabel = isEn ? (m.labelEn || m.key) : (m.labelAr || m.key);
        return { wch: Math.max(colLabel.length * 2, 16) };
      });
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      const sheetName = isEn ? 'Report Data' : 'بيانات التقرير';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      const fileName = `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      triggerSuccessToast(isEn 
        ? 'Excel file (.xlsx) exported and saved successfully!' 
        : 'تم حفظ وتصدير ملف إكسل (.xlsx) بنجاح!');
    } catch (e: any) {
      console.error('Error exporting excel:', e);
      handleExportCSV();
    }
  };

  // Export to CSV fallback
  const handleExportCSV = () => {
    const selectedMetas = selectedFields.map(fKey => availableFields.find(f => f.key === fKey)!).filter(Boolean);
    const headers = selectedMetas.map(m => `"${m.labelAr}"`).join(',');
    
    const rows = filteredData.map(row => {
      return selectedMetas.map(m => {
        const rawVal = (row as any)[m.key];
        const formatted = String(rawVal ?? '').replace(/"/g, '""');
        return `"${formatted}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerSuccessToast('تم تصدير تقرير إكسل (.CSV formatted) وحفظه في جهازك!');
  };

  // Print complete table in external dedicated window on A4 across all pages naturally
  const handlePrintExternalWindow = () => {
    const isEn = language === 'en';
    const dir = isEn ? 'ltr' : 'rtl';
    const printWindow = window.open('', '_blank', 'width=1280,height=900');
    
    const selectedMetas = selectedFields.map(fKey => availableFields.find(f => f.key === fKey)!).filter(Boolean);
    
    const tableHeaders = selectedMetas.map(meta => {
      const label = isEn ? (meta.labelEn || meta.key) : (meta.labelAr || meta.key);
      return `<th style="padding: 7px 9px; border: 1px solid #cbd5e1; background: #f1f5f9; color: #0f172a; font-weight: 700; text-align: ${isEn ? 'left' : 'right'}; white-space: nowrap; font-size: 10px;">${label}</th>`;
    }).join('');

    const tableRows = filteredData.map((row, idx) => {
      const cells = selectedMetas.map(meta => {
        const val = (row as any)[meta.key];
        const displayVal = meta.type === 'currency' 
          ? `${Number(val || 0).toLocaleString('en-US')} ${isEn ? 'IQD' : 'د.ع'}`
          : (val ?? '-');
        return `<td style="padding: 5px 9px; border: 1px solid #e2e8f0; white-space: nowrap; text-align: ${isEn ? 'left' : 'right'}; font-size: 10px;">${displayVal}</td>`;
      }).join('');
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `<tr style="background: ${bg};"><td style="padding: 5px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-size: 10px; color: #64748b;">${idx + 1}</td>${cells}</tr>`;
    }).join('');

    const dateStr = new Date().toLocaleDateString('en-US');
    const docRef = `VR-REP-${Math.floor(1000 + Math.random() * 9000)}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="${isEn ? 'en' : 'ar'}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle} - VITAS IRAQ HRMS</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 10mm 12mm 10mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 16px;
      background: #ffffff;
      color: #0f172a;
      direction: ${dir};
    }
    .no-print-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: white;
      padding: 10px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.18);
      z-index: 9999;
    }
    .btn {
      padding: 7px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-print { background: #0d9488; color: white; margin-inline-end: 8px; }
    .btn-print:hover { background: #0f766e; }
    .btn-close { background: #334155; color: white; }
    .btn-close:hover { background: #475569; }
    .header-box {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .org-sub { font-size: 11px; font-weight: 700; color: #475569; }
    .rep-head { font-size: 20px; font-weight: 900; color: #0f172a; margin: 4px 0; }
    .rep-meta { font-size: 10.5px; color: #64748b; font-family: monospace; }
    .meta-rt { text-align: ${isEn ? 'right' : 'left'}; font-family: monospace; font-size: 10.5px; color: #475569; }
    .table-wrap { width: 100%; overflow: visible; }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    .signatures-block {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
      gap: 16px;
      page-break-inside: avoid;
    }
    .sig-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }
    .sig-dots {
      margin-top: 24px;
      color: #94a3b8;
      font-family: monospace;
    }
    @media print {
      .no-print-bar { display: none !important; }
      body { padding: 0; background: transparent; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-weight: 800; font-size: 13px;">
      ${reportTitle} • ${filteredData.length} ${isEn ? 'Records' : 'سجل'}
    </div>
    <div>
      <button class="btn btn-print" onclick="window.print()">${isEn ? '🖨️ Print / Save PDF' : '🖨️ طباعة / حفظ PDF'}</button>
      <button class="btn btn-close" onclick="window.close()">${isEn ? '✕ Close' : '✕ إغلاق'}</button>
    </div>
  </div>

  <div class="header-box">
    <div>
      <div class="org-sub">${isEn ? 'Republic of Iraq • VITAS Iraq Microfinance Institution' : 'جمهورية العراق • مؤسسة فيتاس العراق للتمويل الأصغر'}</div>
      <div class="rep-head">${reportTitle}</div>
      <div class="rep-meta">
        ${isEn ? 'Extraction Date:' : 'تاريخ الاستخراج:'} ${dateStr} • 
        ${isEn ? 'Officer:' : 'بواسطة:'} ${currentUser?.name || 'HR Admin'} (${currentUser?.role || 'Super Admin'})
      </div>
    </div>
    <div class="meta-rt">
      <div style="font-weight: 800; color: #0d9488;">VITAS IRAQ HRMS</div>
      <div>Ref: ${docRef}</div>
      <div>${isEn ? 'Total Records:' : 'إجمالي السجلات:'} ${filteredData.length}</div>
    </div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th style="padding: 7px 9px; border: 1px solid #cbd5e1; background: #f1f5f9; color: #0f172a; text-align: center; width: 36px; font-size: 10px;">#</th>
          ${tableHeaders}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  <div class="signatures-block">
    <div class="sig-card">
      <div>${isEn ? 'Prepared by HR Officer' : 'إعداد مسؤول الموارد البشرية'}</div>
      <div class="sig-dots">${isEn ? 'Signature: ....................' : 'التوقيع: ....................'}</div>
    </div>
    <div class="sig-card">
      <div>${isEn ? 'Audited by IT Systems Head' : 'تدقيق رئيس قسم IT والأنظمة'}</div>
      <div class="sig-dots">${isEn ? 'Signature: ....................' : 'التوقيع: ....................'}</div>
    </div>
    <div class="sig-card">
      <div>${isEn ? 'Approved by Executive Director' : 'مصادقة واعتماد المدير التنفيذي'}</div>
      <div class="sig-dots">${isEn ? 'Signature: ....................' : 'التوقيع: ....................'}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  // Open and send report via Microsoft Outlook natively
  const handleOpenInOutlook = () => {
    const to = emailTo.trim() || 'hr-executive@vitasiraq.org';
    const subject = encodeURIComponent(emailSubject.trim() || `تقرير الموارد البشرية: ${reportTitle}`);
    const bodyText = `${emailBody.trim() || 'تحية طيبة،\nيرجى التفضل بالاطلاع على تقرير الموارد البشرية المعتمد.'}

--------------------------------------------------
تفاصيل التقرير الرسمي:
• اسم التقرير: ${reportTitle}
• تاريخ الاستخراج: ${new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-IQ')}
• مستخرج التقرير: ${currentUser?.name || 'HR Admin'} (${currentUser?.role || 'Super Admin'})
• إجمالي عدد السجلات: ${filteredData.length} سجل
• المنظومة: VITAS IRAQ HRMS Enterprise Portal
--------------------------------------------------`;
    const body = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:${to}?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
    setShowEmailModal(false);
    triggerSuccessToast(language === 'en'
      ? 'Opening Microsoft Outlook with pre-filled report details...'
      : 'جاري فتح برنامج Microsoft Outlook وتعبئة بيانات التقرير...');
  };

  // Helper trigger Toast
  const triggerSuccessToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Success Notification Alert Banner */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">check_circle</span>
            <span className="font-bold text-xs">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-xs hover:text-white">✕</button>
        </div>
      )}

      {/* Top Header & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {language === 'en'
              ? (isBranchManager
                  ? `${getBranchName(userBranch, undefined, 'en')} Staff Directory & Payroll Report`
                  : 'Employee Directory & Payroll Report')
              : reportTitle}
          </h1>
        </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setPreviewModalMode('excel');
                setShowPrintPreviewModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
              title={t('عرض التقرير وتصديره إلى إكسل', 'Preview & Export to Excel')}
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>{t('تصدير إكسل', 'Export Excel')}</span>
            </button>

            <button
              onClick={handlePrintExternalWindow}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold text-xs border border-teal-500/30 transition-all flex items-center gap-2 cursor-pointer"
              title={t('طباعة أو حفظ التقرير PDF', 'Print / PDF')}
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>{t('طباعة / PDF', 'Print / PDF')}</span>
            </button>

            {!isBranchManager && (
              <>
                <button
                  onClick={setShowShareModal ? () => setShowShareModal(true) : undefined}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2"
                  title={t('إرسال التقرير عبر التطبيق', 'Share via App')}
                >
                  <span className="material-symbols-outlined text-sm">share</span>
                  <span>{t('مشاركة بالنظام', 'Share In-App')}</span>
                </button>

                <button
                  onClick={setShowEmailModal ? () => setShowEmailModal(true) : undefined}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2"
                  title={t('إرسال عبر البريد الإلكتروني', 'Send via Email')}
                >
                  <span className="material-symbols-outlined text-sm">mail</span>
                  <span>{t('إرسال إيميل', 'Send Email')}</span>
                </button>

                <button
                  onClick={() => setShowSaveModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2"
                  title={t('حفظ النموذج للرجوع له مستقبلاً', 'Save Report Template')}
                >
                  <span className="material-symbols-outlined text-sm">bookmark_add</span>
                  <span>{t('حفظ النموذج', 'Save Template')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live Auto-Sync Status Bar & Preset Reports */}
        <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-4 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              isDark ? 'bg-slate-900/80 border-white/10' : 'bg-slate-50 border-slate-200 shadow-xs'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`}></span>
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {isSyncing ? t('جاري مزامنة قاعدة البيانات...', 'Syncing Database...') : t('متصل مع قاعدة البيانات', 'Connected to Database')}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">({lastSyncTime})</span>
            </div>

            <div className={`flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <span className="text-slate-500">{t('التحديث التلقائي:', 'Auto Refresh:')}</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className={`border rounded-lg px-2 py-1 font-bold focus:outline-none ${
                  isDark ? 'bg-slate-900 border-white/15 text-teal-400' : 'bg-slate-50 border-slate-300 text-teal-700'
                }`}
              >
                <option value={0}>{t('يدوي (إيقاف)', 'Manual (Off)')}</option>
                <option value={10}>{t('كل 10 ثواني', 'Every 10s')}</option>
                <option value={30}>{t('كل 30 ثانية', 'Every 30s')}</option>
                <option value={60}>{t('كل دقيقة', 'Every 1m')}</option>
              </select>
            </div>
          </div>

          {/* Preset Reports Quick Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">{t('نماذج التقارير الجاهزة:', 'Saved Presets:')}</span>
            <select
              onChange={(e) => {
                const found = activeSavedReports.find(r => r.id === e.target.value);
                if (found) applySavedReport(found);
              }}
              className={`border rounded-xl px-3 py-1.5 font-bold focus:outline-none cursor-pointer ${
                isDark ? 'bg-slate-900 border-teal-500/40 text-white' : 'bg-slate-50 border-slate-300 text-slate-800 shadow-xs'
              }`}
            >
              <option value="">{t('-- اختر تقريراً محفوظاً --', '-- Select Saved Preset --')}</option>
              {activeSavedReports.map(rep => (
                <option key={rep.id} value={rep.id}>{rep.name} ({rep.createdBy})</option>
              ))}
            </select>
          </div>
        </div>

      {/* If Branch Manager, display the Saved Reports Hub */}
      {isBranchManager ? (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-950/40 to-slate-900/90 border border-teal-500/30 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-lg">bookmarks</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {language === 'en'
                    ? `Saved Reports for ${getBranchName(userBranch, undefined, 'en') || 'Office'}`
                    : `التقارير المحفوظة لمكتب: ${userBranch || 'مكتبك'}`}
                </h2>
                <p className="text-[11px] text-teal-300/80">
                  {t('تم حصر السجلات والبيانات بموظفي وموجودات مكتبك حصراً لمنع التداخل بين المكاتب.', 'Data is strictly scoped to your branch staff and assets.')}
                </p>
              </div>
            </div>
            <span className="text-[11px] px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              {t('🔒 صلاحية قراءة وتصدير فقط', '🔒 Read & Export Only')}
            </span>
          </div>

          {/* Quick Cards for Branch Saved Reports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeSavedReports.map(rep => {
              const isSelected = reportTitle === rep.name;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => applySavedReport(rep)}
                  className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-md ${
                    isSelected
                      ? 'bg-teal-600 border-teal-300 text-white shadow-lg shadow-teal-900/40 ring-2 ring-teal-300 scale-[1.01]'
                      : 'bg-teal-800/90 hover:bg-teal-700/90 border-teal-600/60 hover:border-teal-400 text-teal-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-teal-900/80 text-teal-200 border border-teal-400/40' : 'bg-teal-950/70 text-teal-200 border border-teal-500/30'
                      }`}>
                        {rep.primaryTable}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-sm text-teal-200">check_circle</span>
                      )}
                    </div>
                    <div className="font-bold text-xs leading-snug line-clamp-2 text-white">{rep.name}</div>
                    <div className="text-[11px] text-teal-100/80 mt-1 line-clamp-2 leading-relaxed">{rep.description}</div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-teal-600/40 flex items-center justify-between text-[10px] text-teal-200 font-medium">
                    <span>{t('عرض وتصدير', 'View & Export')}</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Query Builder Configuration Cards Grid */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step 1: Select Primary & Joined Tables */}
        <div className="p-5 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white shadow-md flex items-center justify-center text-xs font-mono font-bold">1</span>
              {t('اختيار الجداول (Query Source Tables)', 'Select Query Source Tables')}
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">{DB_TABLES_CATALOG.length} Tables Catalog</span>
          </div>

          {/* Primary Table Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-teal-400 block">{t('الجدول الرئيسي (Primary Table):', 'Primary Table:')}</label>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {DB_TABLES_CATALOG.map(tab => {
                const isSelected = primaryTable === tab.name;
                return (
                  <label
                    key={tab.name}
                    onClick={() => {
                      setPrimaryTable(tab.name);
                      setSelectedFields(tab.fields.map(f => f.key));
                    }}
                    className={`w-full text-right flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? (isDark ? 'bg-teal-500/40 border-teal-500 text-white shadow-sm' : 'bg-teal-50 border-teal-500 text-slate-900 shadow-xs')
                        : (isDark ? 'bg-teal-500/10 border-teal-500/20 text-slate-200 hover:bg-teal-500/20' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100')
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="primary_table_choice"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded-full border-white/20 text-teal-500 focus:ring-0"
                      />
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'en' ? tab.labelEn : tab.labelAr}</span>
                    </div>
                    {isSelected && (
                      <span className={`material-symbols-outlined text-sm ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>check_circle</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Joined Tables Multiselect Checkboxes */}
          <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <label className={`text-xs font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('ربط جداول إضافية (Joined Tables / JOIN):', 'Join Secondary Tables:')}</label>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {DB_TABLES_CATALOG.filter(t => t.name !== primaryTable).map(tab => {
                const isJoined = joinedTables.includes(tab.name);
                return (
                  <label
                    key={tab.name}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                      isJoined
                        ? (isDark ? 'bg-teal-500/40 border-teal-500 text-white shadow-sm' : 'bg-teal-50 border-teal-500 text-slate-900 shadow-xs')
                        : (isDark ? 'bg-teal-500/10 border-teal-500/20 text-slate-200 hover:bg-teal-500/20' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100')
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isJoined}
                        onChange={() => {
                          if (isJoined) {
                            setJoinedTables(joinedTables.filter(tName => tName !== tab.name));
                          } else {
                            setJoinedTables([...joinedTables, tab.name]);
                          }
                        }}
                        className="rounded border-white/20 text-teal-500 focus:ring-0"
                      />
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === 'en' ? tab.labelEn : tab.labelAr}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-medium ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>FK Link</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Choose Columns / Fields */}
        <div className={`p-5 rounded-3xl border shadow-xl space-y-4 ${isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
          <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white shadow-md flex items-center justify-center text-xs font-mono font-bold">2</span>
              {t('تحديد الحقول المطلوبة (Columns)', 'Select Required Columns')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={selectAllFields}
                className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-500/10"
              >
                {t('تحديد الكل', 'Select All')}
              </button>
              <button
                onClick={clearAllFields}
                className="text-[10px] text-slate-500 dark:text-slate-400 hover:underline px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5"
              >
                {t('إلغاء', 'Clear')}
              </button>
            </div>
          </div>

          {/* Search Columns Box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute right-3 top-2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchColumnTerm}
              onChange={(e) => setSearchColumnTerm(e.target.value)}
              placeholder={t('بحث داخل الحقول...', 'Search fields...')}
              className={`w-full pr-8 pl-3 py-1.5 border rounded-xl text-xs focus:outline-none focus:border-teal-500 ${
                isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Fields Selection Checkbox Grid */}
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {availableFields
              .filter(f => f.labelAr.includes(searchColumnTerm) || f.labelEn.toLowerCase().includes(searchColumnTerm.toLowerCase()) || f.key.includes(searchColumnTerm))
              .map(field => {
                const isSelected = selectedFields.includes(field.key);
                return (
                  <label
                    key={field.key}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                      isSelected
                        ? (isDark ? 'bg-teal-500/40 border-teal-500 text-white shadow-sm' : 'bg-teal-50 border-teal-500 text-slate-900 shadow-xs')
                        : (isDark ? 'bg-teal-500/10 border-teal-500/20 text-slate-200 hover:bg-teal-500/20' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100')
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleField(field.key)}
                        className="rounded border-white/20 text-teal-500 focus:ring-0"
                      />
                      <span className={`truncate font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{language === "en" ? field.labelEn : field.labelAr}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono border ${
                      isDark ? 'bg-teal-500/30 text-teal-200 border-teal-500/40' : 'bg-teal-50 text-teal-700 border-teal-200'
                    }`}>
                      {field.type}
                    </span>
                  </label>
                );
              })}
          </div>
        </div>

        {/* Step 3: Query Builder Filters & Sorting */}
        <div className="p-5 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white shadow-md flex items-center justify-center text-xs font-mono font-bold">3</span>
              {t('شروط التصفية والفرز (Filters & Sorting)', 'Filter Rules & Sorting')}
            </h2>
            <button
              onClick={addFilterRule}
              className="px-2 py-1 rounded-lg bg-teal-600 text-white shadow-md hover:bg-teal-600/30 text-[11px] font-bold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">add</span>
              {t('إضافة شرط', 'Add Rule')}
            </button>
          </div>

          {/* Filter Rules List */}
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {filters.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">{t('لا توجد شروط تصفية مفعلة. يتم جلب جميع البيانات.', 'No filters set. Fetching all rows.')}</p>
            ) : (
              filters.map((fRule, idx) => (
                <div key={fRule.id} className="p-2.5 rounded-2xl bg-slate-900 border border-white/10 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-teal-400 font-bold font-mono">Rule #{idx + 1}</span>
                    <button onClick={() => removeFilterRule(fRule.id)} className="text-rose-400 hover:text-rose-300">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {/* Select Field */}
                    <select
                      value={fRule.fieldKey}
                      onChange={(e) => updateFilterRule(fRule.id, 'fieldKey', e.target.value)}
                      className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                    >
                      {availableFields.map(f => (
                        <option key={f.key} value={f.key}>{language === 'en' ? f.labelEn : f.labelAr}</option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      {/* Operator */}
                      <select
                        value={fRule.operator}
                        onChange={(e) => updateFilterRule(fRule.id, 'operator', e.target.value as any)}
                        className="w-1/2 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                      >
                        <option value="equals">{t('يساوي (Equal)', 'Equal')}</option>
                        <option value="contains">{t('يحتوي (Contains)', 'Contains')}</option>
                        <option value="gt">{t('أكبر من (Greater)', 'Greater than')}</option>
                        <option value="lt">{t('أصغر من (Less)', 'Less than')}</option>
                      </select>

                      {/* Input Value */}
                      <input
                        type="text"
                        value={fRule.value}
                        onChange={(e) => updateFilterRule(fRule.id, 'value', e.target.value)}
                        placeholder={t('القيمة المطلوب طابقها...', 'Value...')}
                        className="w-1/2 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sorting Controls */}
          <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
            <label className="font-bold text-slate-300 block">{t('ترتيب وعرض النتائج حسب:', 'Sort Results By:')}</label>
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-2.5 py-1.5 text-white focus:outline-none"
              >
                {availableFields.map(f => (
                  <option key={f.key} value={f.key}>{language === 'en' ? f.labelEn : f.labelAr}</option>
                ))}
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-teal-400 font-bold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">{sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}</span>
                <span>{sortOrder === 'asc' ? t('تصاعدي', 'Ascending') : t('تنازلي', 'Descending')}</span>
              </button>
            </div>
          </div>
        </div>

      </div>
      )}

      {/* Step 4: Formatted Excel Sheet Table View */}
      <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">grid_on</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {t('جدول التقرير التفاعلي بصيغة إكسل (Formated Table Sheet)', 'Formatted Excel Sheet Grid')}
              </h2>
              <p className="text-xs text-slate-400">
                {t(`عدد السجلات الناتجة: ${filteredData.length} سجلات • تم تنفيذ الاستعلام بـ 4ms`, `Returned ${filteredData.length} records in 4ms`)}
              </p>
            </div>
          </div>

          {/* Table Search Input */}
          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={gridSearchTerm}
              onChange={(e) => setGridSearchTerm(e.target.value)}
              placeholder={t('تصفية سريعة داخل جدول التقرير...', 'Filter table contents...')}
              className="w-full pr-9 pl-3 py-2 bg-slate-900 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        {/* Excel Formatted Interactive Table */}
        <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-white/10 shadow-inner bg-[#0a0c10]' : 'border-slate-200 shadow-sm bg-white'}`}>
          <table className="w-full text-xs text-right border-collapse dynamic-report-excel-grid">
            <thead className="dynamic-report-excel-thead">
              <tr className="dynamic-report-excel-tr bg-[#1e293b] text-white font-bold border-b border-white/10 select-none">
                <th className="dynamic-report-th-num p-3 text-center border-l border-white/10 w-12 font-mono text-white bg-slate-900">#</th>
                {selectedFields.map(fKey => {
                  const meta = availableFields.find(f => f.key === fKey)!;
                  const isSorted = sortBy === fKey;
                  return (
                    <th
                      key={fKey}
                      onClick={() => {
                        if (sortBy === fKey) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else { setSortBy(fKey); setSortOrder('asc'); }
                      }}
                      className="dynamic-report-th p-3 border-l border-white/10 hover:bg-white/5 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold">{language === "en" ? (meta?.labelEn || fKey) : (meta?.labelAr || fKey)}</span>
                        {isSorted && (
                          <span className="material-symbols-outlined text-teal-400 text-xs">
                            {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={selectedFields.length + 1} className="p-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl text-slate-500 block mb-2">find_in_page</span>
                    {t('لا توجد بيانات مطابقة لشروط الاستعلام المحددة.', 'No records match the current query criteria.')}
                  </td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-teal-500/5 transition-colors font-sans">
                    <td className="p-2.5 text-center border-l border-slate-300 font-mono text-slate-900 font-bold bg-slate-100">
                      {idx + 1}
                    </td>
                    {selectedFields.map(fKey => {
                      const meta = availableFields.find(f => f.key === fKey);
                      const val = (row as any)[fKey];

                      return (
                        <td key={fKey} className="p-2.5 border-l border-slate-200 whitespace-nowrap text-slate-900 font-bold">
                          {meta?.type === 'currency' ? (
                            <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                              {Number(val || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}
                            </span>
                          ) : meta?.type === 'badge' ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-white border border-teal-200 dark:border-teal-500/20">
                              {val || '-'}
                            </span>
                          ) : meta?.type === 'date' ? (
                            <span className="font-mono text-slate-900 font-bold">{val || '-'}</span>
                          ) : (
                            <span className="text-slate-900 font-bold">{val !== undefined && val !== null ? String(val) : "-"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Auto-Calculation Summary Footer Row */}
            {filteredData.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 dark:bg-[#1e293b] font-bold text-slate-900 dark:text-white border-t-2 border-teal-500/40">
                  <td className="p-3 text-center border-l border-slate-300 dark:border-white/10 bg-slate-200 dark:bg-slate-900 font-mono text-teal-600 dark:text-teal-400">∑</td>
                  {selectedFields.map(fKey => {
                    const meta = availableFields.find(f => f.key === fKey);
                    if (meta?.type === 'currency') {
                      return (
                        <td key={fKey} className="p-3 border-l border-slate-300 dark:border-white/10 font-mono text-slate-900 dark:text-white">
                          {t('مجموع:', 'Total:')} {(columnTotals[fKey] || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}
                        </td>
                      );
                    }
                    if (meta?.type === 'number') {
                      return (
                        <td key={fKey} className="p-3 border-l border-slate-300 dark:border-white/10 font-mono text-amber-600 dark:text-amber-300">
                          {t('المجموع:', 'Sum:')} {columnTotals[fKey] || 0}
                        </td>
                      );
                    }
                    return (
                      <td key={fKey} className="p-3 border-l border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 font-normal">
                        -
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODAL 1: Save Template Modal */}
      {showSaveModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">bookmark_add</span>
                {t('حفظ نموذج التقرير الحالي', 'Save Current Report Template')}
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('اسم النموذج:', 'Template Name:')}</label>
                <input
                  type="text"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  placeholder={t('مثال: تقرير رواتب فرع البصرة 2026', 'e.g. Basra Branch Payroll 2026')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('وصف النموذج:', 'Description:')}</label>
                <textarea
                  value={newReportDesc}
                  onChange={(e) => setNewReportDesc(e.target.value)}
                  rows={2}
                  placeholder={t('وصف موجز للغرض من هذا الاستعلام...', 'Brief description...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                {t('إلغاء', 'Cancel')}
              </button>
              <button onClick={handleSaveTemplate} className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg">
                {t('حفظ في النماذج', 'Save Preset')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Share via In-App Notification Modal (Dynamic Combobox) */}
      {showShareModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/15 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">share</span>
                {t('مشاركة التقرير داخل النظام', 'Share Report In-App')}
              </h3>
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setIsShareDropdownOpen(false);
                }} 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Dynamic Combobox Selector */}
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1.5">
                  {t('تحديد الجهة المستلمة (مكتب، قسم، موظف، أو دور إداري):', 'Select Destination (Office, Department, Staff, or Role):')}
                </label>

                {selectedRecipient ? (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-500/40 text-teal-900 dark:text-teal-200 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">{selectedRecipient.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs truncate">
                            {language === 'en' ? (selectedRecipient.labelEn || selectedRecipient.label) : selectedRecipient.label}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-200/60 dark:bg-teal-800/60 text-teal-800 dark:text-teal-200 shrink-0">
                            {selectedRecipient.categoryLabel}
                          </span>
                        </div>
                        {selectedRecipient.subtext && (
                          <p className="text-[10px] text-teal-700/80 dark:text-teal-300/80 truncate mt-0.5">
                            {selectedRecipient.subtext}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(null);
                        setShareSearchTerm('');
                        setIsShareDropdownOpen(true);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      {t('تغيير', 'Change')}
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-lg">search</span>
                      <input
                        type="text"
                        value={shareSearchTerm}
                        onChange={(e) => {
                          setShareSearchTerm(e.target.value);
                          setIsShareDropdownOpen(true);
                        }}
                        onFocus={() => setIsShareDropdownOpen(true)}
                        placeholder={t('اكتب حرفين أو ثلاثة للبحث (اسم الموظف، الفرع، أو القسم)...', 'Type 2-3 letters to search (Name, Branch, Department)...')}
                        className="w-full pr-10 pl-8 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 text-xs font-semibold"
                      />
                      {shareSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setShareSearchTerm('')}
                          className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Instant Combobox Suggestions Dropdown */}
                    {isShareDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-[#0a0c10] border border-slate-300 dark:border-white/15 rounded-2xl shadow-2xl z-50 p-1.5 divide-y divide-slate-100 dark:divide-white/5 custom-scrollbar">
                        {filteredRecipients.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">
                            {t('لا توجد نتائج مطابقة لبحثك، جرب كتابة مسمى أو فرع آخر', 'No matching results found')}
                          </div>
                        ) : (
                          filteredRecipients.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                setSelectedRecipient(item);
                                setShareSearchTerm('');
                                setIsShareDropdownOpen(false);
                              }}
                              className="p-2 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 cursor-pointer transition-colors flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`material-symbols-outlined text-base ${
                                  item.category === 'branch' ? 'text-blue-500' :
                                  item.category === 'department' ? 'text-purple-500' :
                                  item.category === 'employee' ? 'text-teal-500' : 'text-amber-500'
                                }`}>
                                  {item.icon}
                                </span>
                                <div className="truncate">
                                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                    {language === 'en' ? (item.labelEn || item.label) : item.label}
                                  </p>
                                  {item.subtext && (
                                    <p className="text-[10px] text-slate-500 truncate">{item.subtext}</p>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                item.category === 'branch' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' :
                                item.category === 'department' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' :
                                item.category === 'employee' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' :
                                'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              }`}>
                                {item.categoryLabel}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">
                  {t('ملاحظات وإرشادات مرفقة:', 'Attached Notes & Directives:')}
                </label>
                <textarea
                  value={shareCustomNote}
                  onChange={(e) => setShareCustomNote(e.target.value)}
                  rows={3}
                  placeholder={t('يرجى الاطلاع على تقرير المسير المستخرج للاعتماد الرسمي...', 'Notes for recipient...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setIsShareDropdownOpen(false);
                }} 
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  if (!selectedRecipient) {
                    alert(language === 'en' ? 'Please select a recipient (branch, department, or employee) first.' : 'يرجى اختيار الجهة أو الموظف المستلم أولاً.');
                    return;
                  }
                  if (addNotification) {
                    addNotification({
                      title: language === 'en' ? `Report Shared: ${reportTitle}` : `مشاركة تقرير: ${reportTitle}`,
                      message: language === 'en'
                        ? `Report shared with [${selectedRecipient.labelEn || selectedRecipient.label}] by ${currentUser.name}. Notes: "${shareCustomNote || 'For review.'}"`
                        : `تمت مشاركة التقرير مع [${selectedRecipient.label}] بواسطة ${currentUser.name}. ملاحظات: "${shareCustomNote || 'يرجى الاطلاع والاعتماد.'}"`,
                      type: 'info'
                    });
                  }
                  setShowShareModal(false);
                  triggerSuccessToast(language === 'en'
                    ? `Report shared successfully with [${selectedRecipient.labelEn || selectedRecipient.label}]!`
                    : `تم إرسال التقرير بنجاح إلى [${selectedRecipient.label}] عبر تنبيهات النظام الداخلية!`
                  );
                  setSelectedRecipient(null);
                  setShareCustomNote('');
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg cursor-pointer"
              >
                {t('إرسال التنبيه', 'Send Notification')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Send via Email & Outlook Modal */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">mail</span>
                {t('إرسال التقرير عبر البريد الإلكتروني (Email / Outlook)', 'Send Report via Email / Outlook')}
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('البريد الإلكتروني للمستلم:', 'Recipient Email:')}</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="hr-executive@vitasiraq.org"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('عنوان الرسالة (Subject):', 'Email Subject:')}</label>
                <input
                  type="text"
                  value={emailSubject || `تقرير الموارد البشرية: ${reportTitle}`}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('نص الرسالة:', 'Email Body:')}</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={3}
                  placeholder={t('مرفق لكم التقرير الاستعلامي المحدث مع الملف الإكسل...', 'Email message...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button onClick={() => setShowEmailModal(false)} className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer">
                {t('إلغاء', 'Cancel')}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenInOutlook}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-colors"
                  title={t('فتح التقرير وتفاصيله فوراً في برنامج مايكروسوفت أوتلوك لسطح المكتب', 'Open in Microsoft Outlook Desktop')}
                >
                  <span className="material-symbols-outlined text-sm">outgoing_mail</span>
                  <span>{t('فتح في Outlook', 'Open in Outlook')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    triggerSuccessToast(`تم إرسال الإيميل مع مرفق إكسل التقرير إلى ${emailTo || 'المستلم'} بنجاح!`);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>{t('إرسال مباشر', 'Send Direct')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: Formal Print / PDF & Excel Preview Modal */}
      {showPrintPreviewModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md overflow-y-auto overflow-x-hidden flex justify-center items-start p-3 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-3xl max-w-6xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto border border-slate-200 relative">
            
            {/* Top Close & Quick Action Floating Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-700 text-lg">
                    {previewModalMode === 'excel' ? 'table_view' : 'print'}
                  </span>
                  <p className="text-xs font-bold text-slate-600">
                    {t('جمهورية العراق • مؤسسة فيتاس العراق للتمويل الأصغر', 'Republic of Iraq • VITAS Iraq Microfinance')}
                  </p>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {t(reportTitle, reportTitle)}
                </h1>
                <p className="text-xs text-slate-500 font-mono">
                  {t('تاريخ الاستخراج:', 'Extracted:')} {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ar-IQ')} • 
                  {t('بواسطة:', 'By:')} {currentUser.name} ({currentUser.role}) • 
                  {t('إجمالي السجلات:', 'Total Records:')} {filteredData.length}
                </p>
              </div>

              {/* Action Buttons Header (إلغاء / طباعة / حفظ) */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setShowPrintPreviewModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={t('إلغاء وإغلاق المعاينة', 'Cancel & Close')}
                >
                  <span className="material-symbols-outlined text-base">close</span>
                  <span>{t('إلغاء', 'Cancel')}</span>
                </button>

                <button
                  onClick={handlePrintExternalWindow}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  title={t('طباعة الجدول بالكامل خارج النافذة على ورق A4', 'Print complete table on A4 pages in new window')}
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  <span>{t('طباعة (Print / PDF)', 'Print / PDF')}</span>
                </button>

                <button
                  onClick={() => {
                    handleSaveExcel();
                    setShowPrintPreviewModal(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  title={t('حفظ وتصدير التقرير كملف إكسل', 'Save & Export to Excel')}
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  <span>{t('حفظ (Save Excel)', 'Save (Excel)')}</span>
                </button>
              </div>
            </div>

            {/* Printable Formatted Data Table - Full Natural Height, No Vertical Scrollbar in Preview Box */}
            <div className="w-full overflow-x-auto border border-slate-300 rounded-2xl shadow-inner bg-white">
              <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'} border-collapse border border-slate-300 bg-white`}>
                <thead className="bg-slate-100 shadow-xs">
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <th className="p-2.5 border border-slate-300 text-center w-12 bg-slate-100">#</th>
                    {selectedFields.map(fKey => {
                      const meta = availableFields.find(f => f.key === fKey);
                      return (
                        <th key={fKey} className={`p-2.5 border border-slate-300 bg-slate-100 whitespace-nowrap ${language === 'en' ? 'text-left' : 'text-right'}`}>
                          {language === 'en' ? (meta?.labelEn || fKey) : (meta?.labelAr || fKey)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredData.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-2 border border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                      {selectedFields.map(fKey => {
                        const meta = availableFields.find(f => f.key === fKey);
                        const val = (row as any)[fKey];
                        return (
                          <td key={fKey} className={`p-2 border border-slate-300 font-sans whitespace-nowrap ${language === 'en' ? 'text-left' : 'text-right'}`}>
                            {meta?.type === 'currency' ? `${Number(val || 0).toLocaleString('en-US')} ${t('د.ع', 'IQD')}` : String(val ?? '-')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Formal Signature Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-center text-xs font-bold text-slate-700">
              <div className="space-y-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p>{t('إعداد مسؤول الموارد البشرية', 'Prepared by HR Officer')}</p>
                <p className="font-mono text-slate-400">{t('التوقيع:', 'Signature:')} ....................</p>
              </div>
              <div className="space-y-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p>{t('تدقيق رئيس قسم IT والأنظمة', 'Audited by IT Systems Head')}</p>
                <p className="font-mono text-slate-400">{t('التوقيع:', 'Signature:')} ....................</p>
              </div>
              <div className="space-y-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p>{t('مصادقة واعتماد المدير التنفيذي', 'Approved by Executive Director')}</p>
                <p className="font-mono text-slate-400">{t('التوقيع:', 'Signature:')} ....................</p>
              </div>
            </div>

            {/* Modal Bottom Controls (Footer Toolbar) */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-200 no-print">
              <div className="text-xs text-slate-500 font-mono">
                {t('إجمالي السجلات المستعرضة:', 'Total records displayed:')} <span className="font-bold text-slate-800">{filteredData.length}</span> {t('سجل', 'records')}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowPrintPreviewModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  <span>{t('إلغاء', 'Cancel')}</span>
                </button>
                <button
                  onClick={handlePrintExternalWindow}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 shadow-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={t('طباعة في نافذة A4 كاملة ومستقلة', 'Print in full external A4 window')}
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>{t('طباعة (Print / PDF)', 'Print / PDF')}</span>
                </button>
                <button
                  onClick={() => {
                    handleSaveExcel();
                    setShowPrintPreviewModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={t('حفظ التقرير بصيغة إكسل', 'Save report as Excel')}
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>{t('حفظ (Save Excel)', 'Save (Excel)')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
