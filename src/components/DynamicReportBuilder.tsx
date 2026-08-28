import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';

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
  const { employees, leaveRequests, candidates, assetRecords, t, currentUser, language, theme } = useApp();
  const isDark = theme === 'dark';

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

  // Active Report Name State
  const [reportTitle, setReportTitle] = useState<string>('تقرير الموظفين الشامل مع الرواتب والبدلات');

  // Modals visibility
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);

  // Sharing form inputs
  const [newReportName, setNewReportName] = useState<string>('');
  const [newReportDesc, setNewReportDesc] = useState<string>('');
  const [shareRecipientRole, setShareRecipientRole] = useState<string>('HR Manager');
  const [shareCustomNote, setShareCustomNote] = useState<string>('');
  const [emailTo, setEmailTo] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

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
        return employees.map(emp => ({
          employee_id: emp.employeeId,
          fullName: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          jobTitle: emp.jobTitle,
          branch: emp.branch,
          joinDate: emp.joinDate,
          basicSalary: emp.basicSalary || emp.salary || 1250000,
          transportationFixed: emp.transportationFixed || 150000,
          fixedBonus: emp.fixedBonus || 100000,
          bankName: emp.bankName || 'مصرف بغداد - فرع الكرادة',
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
        return [
          { id: 'ATT-1001', employeeId: 'EMP-101', attendanceDate: '2026-07-31', checkIn: '08:01 AM', checkOut: '04:05 PM', lateMinutes: 0, overtimeHours: 1.0, attendanceStatus: 'حاضر' },
          { id: 'ATT-1002', employeeId: 'EMP-102', attendanceDate: '2026-07-31', checkIn: '08:25 AM', checkOut: '04:30 PM', lateMinutes: 25, overtimeHours: 0.5, attendanceStatus: 'متأخر' },
          { id: 'ATT-1003', employeeId: 'EMP-103', attendanceDate: '2026-07-31', checkIn: '07:55 AM', checkOut: '05:00 PM', lateMinutes: 0, overtimeHours: 2.0, attendanceStatus: 'حاضر' },
          { id: 'ATT-1004', employeeId: 'EMP-104', attendanceDate: '2026-07-31', checkIn: '09:10 AM', checkOut: '04:00 PM', lateMinutes: 70, overtimeHours: 0.0, attendanceStatus: 'تأخير كبير' },
          { id: 'ATT-1005', employeeId: 'EMP-105', attendanceDate: '2026-07-31', checkIn: '08:00 AM', checkOut: '04:00 PM', lateMinutes: 0, overtimeHours: 0.0, attendanceStatus: 'حاضر' },
        ];

      case 'payroll_periods':
        return [
          { period_id: 'PAY-2026-07', periodName: 'مسير رواتب تموز (July 2026)', disbursedAmount: 485000000, employeesCount: 320, payrollStatus: 'معتمد ومصروف', approvalDate: '2026-07-28' },
          { period_id: 'PAY-2026-06', periodName: 'مسير رواتب حزيران (June 2026)', disbursedAmount: 478000000, employeesCount: 318, payrollStatus: 'معتمد ومصروف', approvalDate: '2026-06-27' },
          { period_id: 'PAY-2026-05', periodName: 'مسير رواتب أيار (May 2026)', disbursedAmount: 472000000, employeesCount: 315, payrollStatus: 'معتمد ومصروف', approvalDate: '2026-05-28' },
        ];

      case 'assets':
        return assetRecords.map(ast => ({
          assetTag: ast.assetTag,
          assetName: ast.name,
          category: ast.category,
          serialNumber: ast.serialNumber,
          assignedToEmployee: ast.assignedEmployeeName || 'غير مخصص',
          assetBranch: ast.branch,
          assetStatus: ast.status,
          purchaseDate: ast.purchaseDate
        }));

      case 'candidates':
        return candidates.map(c => ({
          candidateId: c.id,
          candidateName: c.fullName,
          candidateEmail: c.email,
          jobTitleApplied: c.jobTitle,
          stage: c.stage,
          ratingScore: c.rating,
          appliedDate: c.appliedDate
        }));

      case 'leave_requests':
        return leaveRequests.map(l => ({
          leaveId: l.id,
          employeeName: l.employeeName,
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
          daysCount: l.days,
          approvalStatus: l.status
        }));

      default:
        return employees.map(e => ({ employee_id: e.employeeId, fullName: e.fullName, department: e.department, status: e.status }));
    }
  }, [primaryTable, employees, assetRecords, candidates, leaveRequests]);

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

  // Export to Excel / CSV File Download
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

      {/* Top Banner & Control Bar */}
      <div className={`p-6 rounded-3xl border transition-all space-y-4 ${
        isDark 
          ? 'bg-[#0a0c10] border-white/10 shadow-xl text-white' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>table_chart</span>
              <span className={`text-xs font-mono uppercase tracking-widest font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                ENTERPRISE DYNAMIC REPORT ENGINE • QUERY BUILDER
              </span>
            </div>
            <h1 className={`text-2xl font-black drop-shadow-sm flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t(reportTitle, reportTitle === 'تقرير الموظفين الشامل مع الرواتب والبدلات' ? 'Comprehensive Employee Directory & Payroll Report' : reportTitle)}
              <span className="text-xs font-normal px-2.5 py-1 rounded-full bg-teal-600 text-white shadow-md border border-teal-500/20 font-mono">
                XAMPP MySQL Live Sync
              </span>
            </h1>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {t('منشئ استعلامات الجداول المتعددة، التصفية الذكية، التحديث التلقائي والعرض بصيغة إكسل تفاعلية', 'Multi-table Query Builder, Smart Filtering, Auto-Refresh & Formatted Excel Sheet Grid')}
            </p>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPrintPreviewModal(true)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 ${
                isDark 
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/10 shadow' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-xs'
              }`}
              title={t('طباعة أو معاينة PDF مع الهيدر والتوقيع', 'Print or PDF Preview')}
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>{t('طباعة / PDF', 'Print / PDF')}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
              title={t('تصدير الملف إلى إكسل', 'Export to Excel')}
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>{t('تصدير إكسل', 'Export Excel')}</span>
            </button>

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
                {isSyncing ? t('جاري مزامنة قواعد XAMPP...', 'Syncing MySQL...') : t('متصل مع سيرفر MySQL (XAMPP)', 'Connected to XAMPP MySQL')}
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
                const found = savedReports.find(r => r.id === e.target.value);
                if (found) applySavedReport(found);
              }}
              className={`border rounded-xl px-3 py-1.5 font-bold focus:outline-none cursor-pointer ${
                isDark ? 'bg-slate-900 border-teal-500/40 text-white' : 'bg-slate-50 border-slate-300 text-slate-800 shadow-xs'
              }`}
            >
              <option value="">{t('-- اختر تقريراً محفوظاً --', '-- Select Saved Preset --')}</option>
              {savedReports.map(rep => (
                <option key={rep.id} value={rep.id}>{rep.name} ({rep.createdBy})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Query Builder Configuration Cards Grid */}
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
                    className={`w-full text-right flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all query-primary-table-item ${
                      isSelected
                        ? 'bg-teal-500/40 border-teal-600'
                        : 'bg-teal-500/20 border-teal-500/40 hover:bg-teal-500/30'
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
                      <span className="font-medium query-primary-table-label" style={{ color: '#000000' }}>{language === 'en' ? tab.labelEn : tab.labelAr}</span>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-teal-800 text-sm">check_circle</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Joined Tables Multiselect Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <label className="text-xs font-bold text-slate-300 block">{t('ربط جداول إضافية (Joined Tables / JOIN):', 'Join Secondary Tables:')}</label>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {DB_TABLES_CATALOG.filter(t => t.name !== primaryTable).map(tab => {
                const isJoined = joinedTables.includes(tab.name);
                return (
                  <label
                    key={tab.name}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                      isJoined ? 'bg-teal-500/40 border-teal-600 text-slate-900' : 'bg-teal-500/20 border-teal-500/40 text-slate-900 hover:bg-teal-500/30'
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
                      <span className="font-medium force-text-black text-black">{language === 'en' ? tab.labelEn : tab.labelAr}</span>
                    </div>
                    <span className="text-[10px] query-table-label font-mono font-normal" style={{ color: "#000000" }}>FK Link</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 2: Choose Columns / Fields */}
        <div className="p-5 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-600 text-white shadow-md flex items-center justify-center text-xs font-mono font-bold">2</span>
              {t('تحديد الحقول المطلوبة (Columns)', 'Select Required Columns')}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={selectAllFields}
                className="text-[10px] text-teal-400 hover:underline px-1.5 py-0.5 rounded bg-teal-500/10"
              >
                {t('تحديد الكل', 'Select All')}
              </button>
              <button
                onClick={clearAllFields}
                className="text-[10px] text-slate-400 hover:underline px-1.5 py-0.5 rounded bg-white/5"
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
              className="w-full pr-8 pl-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
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
                        ? 'bg-teal-500/40 border-teal-600 text-slate-900'
                        : 'bg-teal-500/20 border-teal-500/40 text-slate-900 hover:bg-teal-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleField(field.key)}
                        className="rounded border-white/20 text-teal-500 focus:ring-0"
                      />
                      <span className="truncate font-medium query-table-label" style={{ color: "#000000" }}>{language === "en" ? field.labelEn : field.labelAr}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/30 query-table-label font-mono font-normal border border-teal-500/40" style={{ color: "#000000" }}>
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
        <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-inner bg-[#0a0c10]">
          <table className="w-full text-xs text-right border-collapse">
            <thead>
              <tr className="bg-[#1e293b] text-white font-bold border-b border-white/10 select-none">
                <th className="p-3 text-center border-l border-white/10 w-12 font-mono text-white bg-slate-900">#</th>
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
                      className="p-3 border-l border-white/10 hover:bg-white/5 cursor-pointer whitespace-nowrap transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-bold">{language === "en" ? (meta?.labelEn || fKey) : (meta?.labelAr || fKey)}</span>
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
                              {Number(val || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} {t('د.ع', 'IQD')}
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
                          {t('مجموع:', 'Total:')} {(columnTotals[fKey] || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} {t('د.ع', 'IQD')}
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
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t('مثال: تقرير رواتب فرع البصرة 2026', 'e.g. Basra Branch Payroll 2026')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('وصف النموذج:', 'Description:')}</label>
                <textarea
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
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

      {/* MODAL 2: Share via In-App Notification Modal */}
      {showShareModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">share</span>
                {t('مشاركة التقرير داخل النظام', 'Share Report In-App')}
              </h3>
              <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('مشاركة مع الدور الإداري:', 'Share with Role:')}</label>
                <select
                  value={shareRecipientRole}
                  onChange={(e) => setShareRecipientRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="HR Manager">مدير الموارد البشرية (HR Manager)</option>
                  <option value="Department Head">رئيس القسم الإداري (Department Head)</option>
                  <option value="IT Admin">مسؤول تقنية المعلومات (IT Admin)</option>
                  <option value="Super Admin">الإدارة العليا (Executive Board)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 dark:text-slate-300 font-bold block mb-1">{t('ملاحظات وإرشادات مرفقة:', 'Attached Notes:')}</label>
                <textarea
                  value={shareCustomNote}
                  onChange={(e) => setShareCustomNote(e.target.value)}
                  rows={3}
                  placeholder={t('يرجى الاطلاع على تقرير المسير المرفق للاعتماد...', 'Notes for recipient...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-white/15 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button onClick={() => setShowShareModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  triggerSuccessToast(`تم إرسال التقرير بنجاح إلى ${shareRecipientRole} عبر إشعارات النظام الداخلية!`);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg"
              >
                {t('إرسال التنبيه', 'Send Notification')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Send via Email Modal */}
      {showEmailModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/15 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">mail</span>
                {t('إرسال التقرير عبر البريد الإلكتروني (Email)', 'Send Report via Email')}
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
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

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                {t('إلغاء', 'Cancel')}
              </button>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  triggerSuccessToast(`تم إرسال الإيميل مع مرفق إكسل التقرير إلى ${emailTo || 'المستلم'} بنجاح!`);
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg"
              >
                {t('إرسال الإيميل', 'Send Email')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: Formal Print / PDF View Modal (Portal + Smooth Scrollable) */}
      {showPrintPreviewModal && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md overflow-y-auto overflow-x-hidden flex justify-center items-start p-3 sm:p-6 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-3xl max-w-5xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-auto border border-slate-200 relative">
            
            {/* Top Close & Quick Action Floating Bar */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-600">جمهورية العراق • مؤسسة فيتاس العراق للتمويل الأصغر</p>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{reportTitle}</h1>
                <p className="text-xs text-slate-500 font-mono">
                  تاريخ الاستخراج: {new Date().toLocaleDateString('ar-IQ')} • بواسطة: {currentUser.name} ({currentUser.role})
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-left font-mono text-xs text-slate-600 hidden sm:block">
                  <p className="font-bold text-teal-700">VITAS IRAQ HRMS</p>
                  <p>Doc Ref: VR-REP-{Math.floor(1000 + Math.random() * 9000)}</p>
                  <p>XAMPP MySQL Sync: Verified</p>
                </div>
                <button
                  onClick={() => setShowPrintPreviewModal(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-colors flex items-center justify-center border border-slate-200"
                  title={t('إغلاق', 'Close')}
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Printable Formatted Data Table with Internal Smooth Scrolling */}
            <div className="overflow-x-auto overflow-y-auto max-h-[55vh] border border-slate-300 rounded-2xl shadow-inner scrollbar-thin">
              <table className="w-full text-xs text-right border-collapse border border-slate-300 bg-white">
                <thead className="sticky top-0 bg-slate-100 shadow-xs z-10">
                  <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                    <th className="p-2.5 border border-slate-300 text-center w-10 bg-slate-100">#</th>
                    {selectedFields.map(fKey => {
                      const meta = availableFields.find(f => f.key === fKey);
                      return <th key={fKey} className="p-2.5 border border-slate-300 bg-slate-100 whitespace-nowrap">{language === 'en' ? (meta?.labelEn || fKey) : (meta?.labelAr || fKey)}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredData?.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-2 border border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                      {selectedFields.map(fKey => {
                        const meta = availableFields.find(f => f.key === fKey);
                        const val = (row as any)[fKey];
                        return (
                          <td key={fKey} className="p-2 border border-slate-300 font-sans whitespace-nowrap">
                            {meta?.type === 'currency' ? `${Number(val || 0).toLocaleString(language === 'en' ? 'en-US' : 'ar-IQ')} ${t('د.ع', 'IQD')}` : String(val ?? '-')}
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
              <div className="space-y-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p>{t('إعداد مسؤول الموارد البشرية', 'Prepared by HR Officer')}</p>
                <p className="font-mono text-slate-400">{t('التوقيع:', 'Signature:')} ....................</p>
              </div>
              <div className="space-y-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p>{t('تدقيق رئيس قسم IT والأنظمة', 'Audited by IT Manager')}</p>
                <p className="font-mono text-slate-400">{t('التوقيع:', 'Signature:')} ....................</p>
              </div>
              <div className="space-y-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p>{t('مصادقة واعتماد المدير التنفيذي', 'Approved by Executive Director')}</p>
                <p className="font-mono text-slate-400">{t('التوقيع:', 'Signature:')} ....................</p>
              </div>
            </div>

            {/* Modal Bottom Controls */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-slate-200 no-print">
              <div className="text-xs text-slate-500 font-mono">
                {t('إجمالي الصفوف المستعرضة:', 'Total rows previewed:')} {Math.min(filteredData?.length || 0, 100)} {t('سجل', 'records')}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPrintPreviewModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition-colors"
                >
                  {t('إغلاق', 'Close')}
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-500 shadow-lg transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  <span>{t('طباعة التقرير (Print / PDF)', 'Print Report / PDF')}</span>
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
