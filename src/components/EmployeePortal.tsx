import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Employee } from '../types';
import { 
  Clock, 
  CreditCard, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Printer, 
  ShieldCheck, 
  DollarSign, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  User,
  Check,
  Award,
  Bell,
  Paperclip,
  FileText,
  FileSpreadsheet,
  Eye,
  X,
  Filter,
  ExternalLink,
  Search,
  Sparkles
} from 'lucide-react';

export interface PortalAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'excel' | 'word' | 'image';
  size: string;
  refNo?: string;
  docTitle?: string;
  docDate?: string;
  issuer?: string;
  contentSnippet?: string;
  tableData?: Array<{ [key: string]: string | number }>;
}

export interface PortalNotification {
  id: string;
  title: string;
  titleEn?: string;
  sender: string;
  senderEn?: string;
  category: 'decision' | 'payroll' | 'leave' | 'announcement' | 'report' | 'medical';
  categoryLabelAr: string;
  categoryLabelEn: string;
  date: string;
  time: string;
  message: string;
  messageEn?: string;
  read: boolean;
  priority: 'normal' | 'important' | 'urgent';
  attachments?: PortalAttachment[];
}

type TabType = 'profile' | 'attendance' | 'payroll' | 'leave' | 'evaluation' | 'notifications';

interface EmployeePortalProps {
  embedded?: boolean;
  employee?: Employee;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({ embedded = false, employee }) => {
  const { employees, t, language, theme, currentUser } = useApp();
  const isDark = theme === 'dark';

  const [isLoggedIn, setIsLoggedIn] = useState(embedded);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(employee || null);
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [punchedToday, setPunchedToday] = useState(true);
  const [punchToast, setPunchToast] = useState<string | null>(null);
  const [selectedPayslipIndex, setSelectedPayslipIndex] = useState(0);

  // Leaves & Attendance State for Employee
  const [liveClockTime, setLiveClockTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  });
  const [isSyncingAttendance, setIsSyncingAttendance] = useState(false);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [showLeaveHistoryTable, setShowLeaveHistoryTable] = useState(false);

  const [todayAttendanceState, setTodayAttendanceState] = useState({
    scheduled_start: '08:00',
    scheduled_end: '16:00',
    check_in: '07:55',
    check_out: '16:15',
    worked_hours: '8.35 hrs',
    status: 'present'
  });

  const empKey = selectedEmployee?.badgeNo || selectedEmployee?.employeeId || selectedEmployee?.id || 'default';
  const [leaveBalances, setLeaveBalances] = useState(() => {
    try {
      const saved = localStorage.getItem(`vitas_emp_leave_balances_${empKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      annual: { available: 17, entitled: 21 },
      sick: { available: 13, entitled: 14 },
      emergency: { available: 5, entitled: 5 }
    };
  });

  const [myLeaveRequests, setMyLeaveRequests] = useState<Array<{
    id: string;
    type: string;
    typeEn: string;
    startDate: string;
    endDate: string;
    days: number;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    appliedDate: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem(`vitas_emp_leave_requests_${empKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'LV-2026-0012',
        type: 'إجازة سنوية',
        typeEn: 'Annual Leave',
        startDate: '2026-08-08',
        endDate: '2026-08-11',
        days: 4,
        reason: 'إجازة سنوية مجدولة مسبقاً بعد إغلاق الحسابات النصف سنوية',
        status: 'approved',
        appliedDate: '2026-08-01'
      },
      {
        id: 'LV-2026-0005',
        type: 'إجازة طارئة',
        typeEn: 'Emergency Leave',
        startDate: '2026-06-14',
        endDate: '2026-06-14',
        days: 1,
        reason: 'ظرف عائلي طارئ',
        status: 'approved',
        appliedDate: '2026-06-14'
      }
    ];
  });

  const [newLeaveForm, setNewLeaveForm] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    isEmergency: false
  });

  const [correctionForm, setCorrectionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requestedIn: '08:00',
    requestedOut: '16:00',
    reason: ''
  });

  // Employee Notifications & Attachments State
  const initialPortalNotifications: PortalNotification[] = [
    {
      id: 'notif-p-1',
      title: 'قرار إداري: اعتماد لائحة الحوافز والإنتاجية الربع سنوية المحدثة 2026',
      titleEn: 'Administrative Decision: Updated Quarterly Incentive Policy 2026',
      sender: 'الإدارة العامة & قسم الموارد البشرية',
      senderEn: 'Executive Management & HR Department',
      category: 'decision',
      categoryLabelAr: 'قرار إداري',
      categoryLabelEn: 'Administrative Decision',
      date: '2026-08-10',
      time: '10:30 ص',
      message: 'بناءً على مصادقة المدير المفوض، تقرر تطبيق سلم الحوافز والإنتاجية المحدث لكافة الموظفين بالفروع والإدارات. يرجى مراجعة الجدول والمستند المرفق للاطلاع على معايير الاستحقاق والنسب المقررة لكل فئة.',
      messageEn: 'Approved by Managing Director: Updated incentive and bonus structure implemented across branches. Review attached memo for eligibility criteria.',
      read: false,
      priority: 'urgent',
      attachments: [
        {
          id: 'att-1',
          name: 'قرار_إداري_رقم_89_الحوافز_2026.pdf',
          type: 'pdf',
          size: '1.4 MB',
          refNo: 'VITAS/HQ/DEC-2026/089',
          docTitle: 'قرار إداري رقم (89) لسنة 2026 - اعتماد لائحة الحوافز والإنتاجية',
          docDate: '2026-08-10',
          issuer: 'الإدارة العامة - مؤسسة فيتاس العراق',
          contentSnippet: 'المادة الأولى: تُعتمد لائحة الحوافز الربع سنوية الجديدة لجميع الموظفين المستمرين بالخدمة.\nالمادة الثانية: تُصرف الحوافز بناءً على تحقيق مستهدفات الجودة ومعدلات الحضور والإنتاجية بنسبة لا تقل عن 90%.\nالمادة الثالثة: يُعمل بهذا القرار من تاريخ صدوره ويُلغى كل ما يتعارض معه.'
        },
        {
          id: 'att-2',
          name: 'جدول_معايير_الاستحقاق_والتقييم_الربع_سنوي.xlsx',
          type: 'excel',
          size: '620 KB',
          refNo: 'VITAS/FIN/TBL-2026/44',
          docTitle: 'جدول معايير ونسب احتساب الحوافز الربع سنوية 2026',
          docDate: '2026-08-10',
          issuer: 'الإدارة المالية والموارد البشرية',
          tableData: [
            { 'المعيار / البند': 'نسبة الالتزام بالدوام الشهري', 'الحد الأدنى': '95%', 'الوزن النسبي': '30%', 'معدل الحافز': '100,000 د.ع' },
            { 'المعيار / البند': 'تقييم الأداء العام (KPIs)', 'الحد الأدنى': '85%', 'الوزن النسبي': '40%', 'معدل الحافز': '150,000 د.ع' },
            { 'المعيار / البند': 'إنجاز المهام التشغيلية والميدانية', 'الحد الأدنى': '90%', 'الوزن النسبي': '30%', 'معدل الحافز': '120,000 د.ع' }
          ]
        }
      ]
    },
    {
      id: 'notif-p-2',
      title: 'إشعار مالي: صدور قسيمة الراتب الرسمي لشهر آب 2026',
      titleEn: 'Financial Notice: August 2026 Payslip Released',
      sender: 'قسم الرواتب والأجور - الشؤون المالية',
      senderEn: 'Payroll & Compensation Department',
      category: 'payroll',
      categoryLabelAr: 'قسيمة راتب',
      categoryLabelEn: 'Salary Payslip',
      date: '2026-08-05',
      time: '08:00 ص',
      message: 'تم تدقيق وإيداع المستحقات المالية لشهر آب 2026 متضمنة البدلات والمكافآت المستحقة. يمكنك معاينة قسيمة الراتب المعتمدة أو تنزيلها وطباعتها مباشرة من المرفق.',
      messageEn: 'Salary for August 2026 has been finalized and deposited. Official payslip is attached for download and verification.',
      read: false,
      priority: 'important',
      attachments: [
        {
          id: 'att-3',
          name: 'قسيمة_راتب_معتمدة_آب_2026.pdf',
          type: 'pdf',
          size: '380 KB',
          refNo: 'VTS/PAY/2026-08/SLIP',
          docTitle: 'قسيمة راتب رسمية - شهر آب / أغسطس 2026',
          docDate: '2026-08-05',
          issuer: 'قسم الرواتب والتدقيق المالي - فيتاس العراق',
          contentSnippet: 'قسيمة صرف الرواتب الشهرية لموظفي مؤسسة فيتاس العراق.\nصافي الراتب المستحق: مدفوع في الحساب المصرفي.\nتتضمن القسيمة تفاصيل الاستقطاعات القانونية وصندوق الضمان الاجتماعي والبدلات المقررة.'
        }
      ]
    },
    {
      id: 'notif-p-3',
      title: 'تعميم إداري: جدول العطلات الرسمية وضوابط تقديم طلبات الإجازات',
      titleEn: 'Administrative Circular: Official Holidays & Leave Requests Schedule',
      sender: 'قسم الموارد البشرية & شؤون الموظفين',
      senderEn: 'HR Department & Personnel Affairs',
      category: 'leave',
      categoryLabelAr: 'تعميم وإجازات',
      categoryLabelEn: 'Leaves & Holidays',
      date: '2026-08-01',
      time: '11:15 ص',
      message: 'نحيطكم علماً بالجدول الزمني المعتمد للعطلات الرسمية ومواعيد الدوام، مع التأكيد على ضرورة تقديم طلبات الإجازات السنوية قبل 48 ساعة من موعدها عبر البوابة الإلكترونية.',
      messageEn: 'Official schedule for public holidays and updated guidelines for submitting leave requests via the portal.',
      read: true,
      priority: 'normal',
      attachments: [
        {
          id: 'att-4',
          name: 'جدول_العطلات_الرسمية_المحدث_2026.pdf',
          type: 'pdf',
          size: '890 KB',
          refNo: 'VITAS/HR/CIRC-2026/041',
          docTitle: 'تعميم إداري رقم (41) - جدول العطلات الرسمية 2026',
          docDate: '2026-08-01',
          issuer: 'قسم الموارد البشرية - فيتاس العراق',
          contentSnippet: 'إلى كافة الفروع والمكاتب: يُعتمد التقويم الرسمي للعطلات والمناسبات الوطنية والدينية لسنة 2026. تُنظم المناوبات في الفروع التشغيلية بالتنسيق مع مسؤولي الفروع.'
        }
      ]
    },
    {
      id: 'notif-p-4',
      title: 'تحديث بيانات التأمين الصحي وإصدار البطاقات الطبية للموظفين',
      titleEn: 'Health Insurance Update & Medical Network Cards',
      sender: 'شؤون الموظفين - وحدة الخدمات والمنافع',
      senderEn: 'Employee Welfare & Medical Benefits Unit',
      category: 'medical',
      categoryLabelAr: 'تأمين صحي',
      categoryLabelEn: 'Medical Benefits',
      date: '2026-07-28',
      time: '01:45 م',
      message: 'يرجى مراجعة استمارة التأمين الصحي المرفقة وقائمة المستشفيات والعيادات الطبية المشمولة بالشبكة التأمينية لعام 2026 لضمان التغطية لك ولأفراد عائلتك المستحقين.',
      messageEn: 'Review the attached medical insurance form and authorized hospital network directory for full health coverage.',
      read: true,
      priority: 'important',
      attachments: [
        {
          id: 'att-5',
          name: 'استمارة_تحديث_التأمين_الصحي_2026.pdf',
          type: 'pdf',
          size: '710 KB',
          refNo: 'VITAS/MED/FORM-2026/12',
          docTitle: 'استمارة تجديد وثيقة التأمين الصحي للموظفين والتابعين',
          docDate: '2026-07-28',
          issuer: 'وحدة الخدمات والمنافع - فيتاس العراق',
          contentSnippet: 'استمارة شمول الموظف وأفراد العائلة (الزوج/الزوجة والأبناء) بالتأمين الصحي الشامل لدى شركة التأمين المعتمدة.'
        },
        {
          id: 'att-6',
          name: 'دليل_شبكة_المستشفيات_والمراكز_المعتمدة.xlsx',
          type: 'excel',
          size: '1.2 MB',
          refNo: 'VITAS/MED/NET-2026/08',
          docTitle: 'دليل المستشفيات والمراكز والمختبرات الطبية المعتمدة في العراق',
          docDate: '2026-07-28',
          issuer: 'إدارة التأمين والمنافع الصحية',
          tableData: [
            { 'المحافظة / المدينة': 'بغداد - الكرخ', 'اسم المستشفى / المركز': 'مستشفى الراهبات الأهلي', 'نوع الخدمة': 'جراحة وعيادات شاملة', 'نسبة التغطية': '100%' },
            { 'المحافظة / المدينة': 'بغداد - الرصافة', 'اسم المستشفى / المركز': 'مركز السلام الطبي التخصصي', 'نوع الخدمة': 'مختبرات وأشعة', 'نسبة التغطية': '90%' },
            { 'المحافظة / المدينة': 'واسط - الكوت', 'اسم المستشفى / المركز': 'مجمع الأمل الطبي التخصصي', 'نوع الخدمة': 'عيادات وفحوصات', 'نسبة التغطية': '100%' },
            { 'المحافظة / المدينة': 'البصرة', 'اسم المستشفى / المركز': 'مستشفى الفيحاء التخصصي', 'نوع الخدمة': 'طوارئ وعيادات باطنية', 'نسبة التغطية': '100%' },
            { 'المحافظة / المدينة': 'أربيل', 'اسم المستشفى / المركز': 'مستشفى زيان الأهلي', 'نوع الخدمة': 'عناية شاملة وجراحة', 'نسبة التغطية': '95%' }
          ]
        }
      ]
    },
    {
      id: 'notif-p-5',
      title: 'مشاركة تقرير: ملخص إنجاز ومطابقة عمليات الفرع الشهري',
      titleEn: 'Report Shared: Monthly Branch Operations Summary',
      sender: 'الإدارة الإقليمية & قسم العمليات',
      senderEn: 'Regional Operations & Branch Audit',
      category: 'report',
      categoryLabelAr: 'تقرير ومطابقة',
      categoryLabelEn: 'Audit Report',
      date: '2026-07-22',
      time: '02:10 م',
      message: 'تمت مشاركة ملخص تقرير الأداء الميداني ومطابقة القيود مع مسؤول الفرع والموظفين عبر النظام للاطلاع على مؤشرات الجودة ومقارنة المستهدفات.',
      messageEn: 'Monthly operations report shared for review. Check attached excel sheet for indicators.',
      read: true,
      priority: 'normal',
      attachments: [
        {
          id: 'att-7',
          name: 'تقرير_مطابقة_عمليات_الفرع_المشترك.xlsx',
          type: 'excel',
          size: '950 KB',
          refNo: 'VITAS/OPS/REP-2026/77',
          docTitle: 'تقرير مؤشرات الأداء ومطابقة العمليات الميدانية',
          docDate: '2026-07-22',
          issuer: 'إدارة العمليات والائتمان - فيتاس العراق',
          tableData: [
            { 'المؤشر التشغيلي': 'نسبة إنجاز المعاملات بالموعد', 'الهدف': '90%', 'المحقق فعلياً': '94.2%', 'الحالة': 'ممتاز' },
            { 'المؤشر التشغيلي': 'معدل رضا المستفيدين والعملاء', 'الهدف': '85%', 'المحقق فعلياً': '91.0%', 'الحالة': 'ممتاز' },
            { 'المؤشر التشغيلي': 'دقة السجلات والمطابقة اليومية', 'الهدف': '98%', 'المحقق فعلياً': '99.5%', 'الحالة': 'مكتمل' }
          ]
        }
      ]
    }
  ];

  const [notificationsList, setNotificationsList] = useState<PortalNotification[]>(() => {
    try {
      const saved = localStorage.getItem(`vitas_portal_notifications_${empKey}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialPortalNotifications;
  });

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'attachments'>('all');
  const [notifSearch, setNotifSearch] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<{
    attachment: PortalAttachment;
    notifTitle: string;
    notifSender: string;
    notifDate: string;
    notifRef?: string;
  } | null>(null);

  const unreadNotificationsCount = notificationsList.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotificationsList(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n);
      try { localStorage.setItem(`vitas_portal_notifications_${empKey}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    setNotificationsList(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      try { localStorage.setItem(`vitas_portal_notifications_${empKey}`, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleOpenAttachmentPreview = (attachment: PortalAttachment, notif: PortalNotification) => {
    setPreviewAttachment({
      attachment,
      notifTitle: notif.title,
      notifSender: notif.sender,
      notifDate: notif.date,
      notifRef: attachment.refNo
    });
    handleMarkAsRead(notif.id);
  };

  const handleDownloadAttachment = (attachment: PortalAttachment) => {
    let mimeType = 'application/pdf';
    if (attachment.type === 'excel') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (attachment.type === 'word') mimeType = 'application/msword';
    else if (attachment.type === 'image') mimeType = 'image/png';

    const content = `=== VITAS IRAQ OFFICIAL HR DOCUMENT ===\nDocument: ${attachment.name}\nRef: ${attachment.refNo || 'VITAS/HR/2026'}\nDate: ${new Date().toLocaleDateString('ar-IQ')}\nTitle: ${attachment.docTitle || attachment.name}\nIssuer: ${attachment.issuer || 'VITAS IRAQ HR'}\n\n${attachment.contentSnippet || 'Verified by VITAS Iraq HRMS Portal.'}`;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClockTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (embedded) {
      setIsLoggedIn(true);
      if (employee) {
        setSelectedEmployee(employee);
      } else if (currentUser) {
        const cEmpId = String(currentUser.employeeId || currentUser.id || '').trim().toLowerCase();
        const cBadge = String(currentUser.badgeNo || '').trim().toLowerCase();
        const matched = employees.find(emp => {
          const eId = String(emp.employeeId || emp.id || '').trim().toLowerCase();
          const bNo = String(emp.badgeNo || '').trim().toLowerCase();
          return (cEmpId && (eId === cEmpId || bNo === cEmpId)) || (cBadge && (bNo === cBadge || eId === cBadge));
        });
        if (matched) {
          setSelectedEmployee(matched);
        } else {
          setSelectedEmployee({
            id: currentUser.id || 'admin',
            employeeId: currentUser.employeeId || 'admin',
            badgeNo: currentUser.badgeNo || 'admin',
            fullName: currentUser.name || 'مدير النظام (Super Admin)',
            email: currentUser.email || 'admin@vitasiraq.iq',
            phone: '',
            department: 'الإدارة العليا',
            jobTitle: currentUser.role || 'Super Admin',
            branch: 'المقر الرئيسي - بغداد',
            joinDate: new Date().toISOString(),
            salary: 2200000,
            status: 'Active' as const
          });
        }
      }
    }
  }, [embedded, employee, currentUser, employees]);

  // Handle login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Check for super admin login
    if (badgeNumber === 'admin' && password === 'admin') {
      // Create a mock super admin user
      const superAdmin: Employee = {
        id: '0',
        employeeId: 'admin',
        badgeNo: 'admin',
        fullName: 'مدير النظام (Super Admin)',
        email: 'admin@vitasiraq.iq',
        phone: '',
        department: 'الإدارة العليا',
        jobTitle: 'Super Admin',
        branch: 'المقر الرئيسي',
        joinDate: new Date().toISOString(),
        salary: 0,
        status: 'Active' as const
      };
      setSelectedEmployee(superAdmin);
      setIsLoggedIn(true);
      setLoginError('');
      return;
    }

    const cleanInput = badgeNumber.trim().toLowerCase();
    const cleanInputAlpha = cleanInput.replace(/[^a-z0-9]/g, '');

    if (!cleanInput) {
      setLoginError(language === 'en' ? 'Please enter badge number' : 'يرجى إدخال رقم البادج أو معرف الموظف');
      return;
    }

    // Match against real employees list from Context
    const matched = employees && employees.length > 0
      ? employees.find(emp => {
          const bNo = String(emp.badgeNo || emp.badge_no || '').trim().toLowerCase();
          const eId = String(emp.employeeId || emp.employee_id || emp.id || '').trim().toLowerCase();
          const bNoAlpha = bNo.replace(/[^a-z0-9]/g, '');
          const eIdAlpha = eId.replace(/[^a-z0-9]/g, '');

          return (
            bNo === cleanInput ||
            eId === cleanInput ||
            (cleanInputAlpha && bNoAlpha === cleanInputAlpha) ||
            (cleanInputAlpha && eIdAlpha === cleanInputAlpha) ||
            (cleanInputAlpha && (bNoAlpha.includes(cleanInputAlpha) || cleanInputAlpha.includes(bNoAlpha))) ||
            (cleanInputAlpha && (eIdAlpha.includes(cleanInputAlpha) || cleanInputAlpha.includes(eIdAlpha))) ||
            (emp.email && emp.email.toLowerCase().includes(cleanInput))
          );
        })
      : null;

    if (matched) {
      setSelectedEmployee(matched);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      const fallbackEmp: Employee = {
        id: cleanInputAlpha || '5245',
        employeeId: `VTS-${cleanInput.toUpperCase()}`,
        badgeNo: badgeNumber.trim(),
        fullName: `الموظف (${badgeNumber.trim()})`,
        email: `${cleanInputAlpha}@vitasiraq.com`,
        phone: '07700000000',
        department: 'قسم العمليات والائتمان',
        jobTitle: 'مسؤول ائتمان',
        branch: 'الإدارة العامة - بغداد',
        joinDate: '2022-01-01',
        salary: 1200000,
        status: 'Active' as const
      };
      setSelectedEmployee(fallbackEmp);
      setIsLoggedIn(true);
      setLoginError('');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedEmployee(null);
    setBadgeNumber('');
    setPassword('');
  };

  // Login form
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
        isDark 
          ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white' 
          : 'bg-slate-100 text-slate-900'
      }`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('بوابة الموظف الذاتية', 'Employee Self-Service Portal')}</h1>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{t('مؤسسة فيتاس العراق', 'VITAS Iraq')}</p>
          </div>

          <div className={`p-6 rounded-2xl border shadow-2xl w-full max-w-md mx-auto ${
            isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>
                  {t('رقم البادج', 'Badge Number')}
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder={t('أدخل رقم البادج', 'Enter Badge Number')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: isDark ? '#cbd5e1' : '#1e293b' }}>
                  {t('كلمة المرور', 'Password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('كلمة المرور', 'Password')}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm font-bold">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-600/20"
              >
                {t('تسجيل الدخول', 'Login')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main portal content
  const portalContent = (
    <>
      {!embedded && (
        <div className={`flex items-center justify-between mb-8 pb-4 border-b ${
          isDark ? 'border-white/10' : 'border-slate-300'
        }`}>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {t('بوابة الموظف الذاتية', 'Employee Self-Service Portal')}
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{selectedEmployee?.fullName}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notifications Button with unread counter badge */}
            <button
              onClick={() => setShowNotificationsModal(true)}
              className={`p-2.5 px-3.5 rounded-xl border relative transition-all flex items-center gap-2 cursor-pointer shadow-sm group active:scale-95 ${
                isDark 
                  ? 'bg-slate-800/90 border-slate-700 text-teal-400 hover:bg-slate-700 hover:border-teal-500/40 hover:text-teal-300' 
                  : 'bg-white border-slate-300 text-teal-700 hover:bg-teal-50 hover:border-teal-400'
              }`}
              title={t('التنبيهات والمرفقات الرسمية', 'Notifications & Official Attachments')}
            >
              <div className="relative">
                <Bell className="w-5 h-5 text-teal-500 group-hover:rotate-12 transition-transform" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold">{t('التنبيهات والمرفقات', 'Notifications')}</span>
              {unreadNotificationsCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/20 cursor-pointer"
            >
              {t('تسجيل الخروج', 'Logout')}
            </button>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {punchToast && (
        <div className="mb-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-sm font-bold flex items-center gap-2 transition-all">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{punchToast}</span>
        </div>
      )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {t('الملف الشخصي', 'Profile')}
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'attendance'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            {t('الحضور', 'Attendance')}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            {t('الرواتب', 'Payroll')}
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'leave'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {t('الإجازات', 'Leave')}
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'evaluation'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            {t('التقييم الذاتي', 'Self Evaluation')}
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 relative ${
              activeTab === 'notifications'
                ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {t('التنبيهات والمرفقات', 'Notifications & Attachments')}
            {unreadNotificationsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className={`p-6 rounded-2xl border shadow-xl ${
          isDark ? 'bg-[#1e293b] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {t('معلومات الموظف', 'Employee Information')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('الاسم الكامل', 'Full Name')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.fullName}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم الموظف', 'Employee ID')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.employeeId}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم البادج', 'Badge Number')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.badgeNo}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('القسم', 'Department')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.department}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('المسمى الوظيفي', 'Job Title')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.jobTitle}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('الفرع ومقر العمل', 'Branch / Location')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.branch || t('المقر الرئيسي - بغداد', 'Headquarters - Baghdad')}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('البريد الإلكتروني', 'Email')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.email}</p>
                </div>
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{t('رقم الهاتف', 'Phone')}</label>
                  <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedEmployee?.phone || '07700000000'}</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Attendance Tab */}
          {activeTab === 'attendance' && (() => {
            const handleQuickPunch = () => {
              const now = new Date();
              const timeStr = now.toLocaleTimeString(language === 'ar' ? 'ar-IQ' : 'en-US', { hour: '2-digit', minute: '2-digit' });
              if (punchedToday) {
                setPunchedToday(false);
                setPunchToast(language === 'ar' ? `تم تسجيل الانصراف بنجاح الساعة ${timeStr}` : `Clocked out successfully at ${timeStr}`);
              } else {
                setPunchedToday(true);
                setPunchToast(language === 'ar' ? `تم تسجيل الحضور بنجاح الساعة ${timeStr}` : `Clocked in successfully at ${timeStr}`);
              }
              setTimeout(() => setPunchToast(null), 3500);
            };

            const attendanceLogs = [
              { date: '2026-10-12', day: language === 'ar' ? 'الإثنين' : 'Monday', checkIn: '08:05 ص', checkOut: punchedToday ? '--:--' : '04:30 م', hours: punchedToday ? '4:25' : '8:25', status: 'present', note: punchedToday ? (language === 'ar' ? 'دوام فعلي (جاري)' : 'In progress') : (language === 'ar' ? 'مكتمل' : 'Completed') },
              { date: '2026-10-11', day: language === 'ar' ? 'الأحد' : 'Sunday', checkIn: '08:00 ص', checkOut: '04:30 م', hours: '8:30', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
              { date: '2026-10-10', day: language === 'ar' ? 'السبت' : 'Saturday', checkIn: '--:--', checkOut: '--:--', hours: '0:00', status: 'weekend', note: language === 'ar' ? 'عطلة أسبوعية' : 'Weekend' },
              { date: '2026-10-09', day: language === 'ar' ? 'الجمعة' : 'Friday', checkIn: '--:--', checkOut: '--:--', hours: '0:00', status: 'weekend', note: language === 'ar' ? 'عطلة أسبوعية' : 'Weekend' },
              { date: '2026-10-08', day: language === 'ar' ? 'الخميس' : 'Thursday', checkIn: '08:18 ص', checkOut: '04:45 م', hours: '8:27', status: 'late', note: language === 'ar' ? 'تأخير 18 دقيقة' : 'Late 18 min' },
              { date: '2026-10-07', day: language === 'ar' ? 'الأربعاء' : 'Wednesday', checkIn: '07:55 ص', checkOut: '04:30 م', hours: '8:35', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
              { date: '2026-10-06', day: language === 'ar' ? 'الثلاثاء' : 'Tuesday', checkIn: '08:00 ص', checkOut: '04:30 م', hours: '8:30', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
              { date: '2026-10-05', day: language === 'ar' ? 'الإثنين' : 'Monday', checkIn: '08:02 ص', checkOut: '04:32 م', hours: '8:30', status: 'present', note: language === 'ar' ? 'مكتمل' : 'Completed' },
            ];

            return (
              <div className="space-y-6">
                {/* Attendance Header & Today Punch */}
                <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {t('سجل الحضور والانصراف', 'Attendance & Time Logs')}
                      </h2>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('حالة اليوم:', 'Today Status:')}{' '}
                        <span className={`font-bold ${punchedToday ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {punchedToday ? t('مسجل حضور (08:05 ص)', 'Clocked In (08:05 AM)') : t('غير مسجل حضور / منصرف', 'Clocked Out')}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleQuickPunch}
                    className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${
                      punchedToday 
                        ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' 
                        : 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {punchedToday ? t('تسجيل انصراف فوري', 'Clock Out') : t('تسجيل حضور فوري', 'Clock In')}
                  </button>
                </div>

                {/* 4 Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('أيام الحضور', 'Present Days')}</div>
                    <div className="text-2xl font-black text-emerald-500">21 <span className="text-xs font-normal text-slate-400">/ 22</span></div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">95.5% {t('نسبة الالتزام', 'Commitment')}</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('أيام التأخير', 'Late Arrivals')}</div>
                    <div className="text-2xl font-black text-amber-500">1 <span className="text-xs font-normal text-slate-400">{t('يوم', 'day')}</span></div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">{t('18 دقيقة إجمالي', '18 min total')}</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('الغياب والإجازات', 'Absences & Leaves')}</div>
                    <div className="text-2xl font-black text-sky-500">0 <span className="text-xs font-normal text-slate-400">{t('غياب', 'absence')}</span></div>
                    <div className="text-[11px] text-sky-600 dark:text-sky-400 mt-1">{t('سجل نظيف', 'Clean record')}</div>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-bold text-slate-400 mb-1">{t('ساعات العمل الإجمالية', 'Total Work Hours')}</div>
                    <div className="text-2xl font-black text-teal-500">168:30 <span className="text-xs font-normal text-slate-400">{t('ساعة', 'hrs')}</span></div>
                    <div className="text-[11px] text-teal-600 dark:text-teal-400 mt-1">{t('متوسط 8.4 ساعة/يوم', 'Avg 8.4h/day')}</div>
                  </div>
                </div>

                {/* Attendance Records Table */}
                <div>
                  <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {t('سجل الحضور لشهر تشرين الأول 2026', 'Attendance Log - October 2026')}
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs text-right">
                      <thead className={isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                        <tr>
                          <th className="p-3 font-bold">{t('التاريخ', 'Date')}</th>
                          <th className="p-3 font-bold">{t('اليوم', 'Day')}</th>
                          <th className="p-3 font-bold">{t('الدخول', 'Check-In')}</th>
                          <th className="p-3 font-bold">{t('الخروج', 'Check-Out')}</th>
                          <th className="p-3 font-bold">{t('ساعات العمل', 'Hours')}</th>
                          <th className="p-3 font-bold">{t('الحالة', 'Status')}</th>
                          <th className="p-3 font-bold">{t('الملاحظات', 'Notes')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {attendanceLogs.map((log, idx) => (
                          <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                            <td className="p-3 font-mono font-medium">{log.date}</td>
                            <td className="p-3">{log.day}</td>
                            <td className="p-3 font-mono text-emerald-500">{log.checkIn}</td>
                            <td className="p-3 font-mono text-slate-400">{log.checkOut}</td>
                            <td className="p-3 font-mono font-bold">{log.hours}</td>
                            <td className="p-3">
                              {log.status === 'present' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {t('حاضر', 'Present')}
                                </span>
                              )}
                              {log.status === 'late' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  {t('تأخير', 'Late')}
                                </span>
                              )}
                              {log.status === 'weekend' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                                  {t('عطلة', 'Weekend')}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-slate-400">{log.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 3. Payroll Tab */}
          {/* 3. Payroll Tab */}
          {activeTab === 'payroll' && (() => {
            const rawSalary = Number(selectedEmployee?.salary) || (selectedEmployee?.employeeId === 'admin' ? 2200000 : 1350000);
            const basicSalary = selectedEmployee?.basicSalary ? Number(selectedEmployee.basicSalary) : Math.round(rawSalary * 0.72);
            const absenceDays = Number(selectedEmployee?.absenceDays ?? selectedEmployee?.absence_days ?? 0);
            const absenceDeduction = Math.round(absenceDays * (basicSalary / 30));
            const currentMonthBasic = Math.max(0, basicSalary - absenceDeduction);
            const phoneAllowance = Number(selectedEmployee?.phoneAllowance ?? selectedEmployee?.phone_allowance ?? (rawSalary >= 2000000 ? 50000 : 40000));
            const familyAllowance = Number(
              selectedEmployee?.familyAllowance ?? 
              selectedEmployee?.family_allowance ?? 
              (selectedEmployee?.maritalStatus === 'متأهل' || selectedEmployee?.maritalStatus === 'married' ? 100000 : (rawSalary >= 2000000 ? 100000 : 50000))
            );
            const certAllowance = Number(selectedEmployee?.certificateAllowance ?? selectedEmployee?.certificate_allowance ?? (rawSalary >= 2000000 ? 114000 : 80000));
            const incentivesAllowance = Number(selectedEmployee?.incentives ?? 75000);
            const transportAllowance = Number(selectedEmployee?.transportationFixed ?? selectedEmployee?.transportation_fixed ?? 100000);
            const bonusAllowance = Number(selectedEmployee?.fixedBonus ?? selectedEmployee?.fixed_bonus ?? 120000);
            const overtimeAllowance = Number(selectedEmployee?.overtime ?? 45000);
            const earnedLeaveAllowance = Number(selectedEmployee?.earnedLeave ?? selectedEmployee?.earned_leave ?? 50000);

            const totalAllowances = phoneAllowance + familyAllowance + certAllowance + incentivesAllowance + transportAllowance + bonusAllowance + overtimeAllowance + earnedLeaveAllowance;
            const grossSalary = currentMonthBasic + totalAllowances;

            const isExempt = Number(selectedEmployee?.isSsTaxExempt ?? selectedEmployee?.is_ss_tax_exempt ?? 0) === 1;
            const socialSecurityDeduction = isExempt ? 0 : Math.round(basicSalary * 0.05);
            const taxDeduction = isExempt ? 0 : Math.round(basicSalary * 0.03);
            const insuranceDeduction = isExempt ? 0 : 25000;
            const loanDeduction = Number(selectedEmployee?.loanPayment ?? selectedEmployee?.loan_payment ?? 0);
            const otherDeductions = Number(selectedEmployee?.otherDeductions ?? selectedEmployee?.other_deductions ?? 0);
            const totalDeductions = socialSecurityDeduction + taxDeduction + insuranceDeduction + loanDeduction + absenceDeduction + otherDeductions;
            const netSalary = grossSalary - totalDeductions;

            const handlePrint = () => {
              window.print();
            };

            const handleDownload = () => {
              setPunchToast(language === 'ar' ? 'جاري تجهيز وتحميل قسيمة الراتب PDF...' : 'Preparing and downloading payslip PDF...');
              setTimeout(() => setPunchToast(null), 3000);
            };

            const payslipHistory = [
              { 
                month: language === 'ar' ? 'تشرين الأول (أكتوبر) 2026' : 'October 2026', 
                shortMonth: language === 'ar' ? 'تشرين الأول 2026' : 'October 2026',
                gross: grossSalary, 
                net: netSalary, 
                date: '2026-10-28', 
                status: 'paid',
                basic: basicSalary,
                currentMonthBasic: currentMonthBasic,
                phone: phoneAllowance,
                family: familyAllowance,
                cert: certAllowance,
                incentives: incentivesAllowance,
                transport: transportAllowance,
                bonus: bonusAllowance,
                overtime: overtimeAllowance,
                earnedLeave: earnedLeaveAllowance,
                socialSecurity: socialSecurityDeduction,
                tax: taxDeduction,
                insurance: insuranceDeduction,
                loan: loanDeduction,
                absence: absenceDeduction,
                other: otherDeductions,
                deductions: totalDeductions
              },
              { 
                month: language === 'ar' ? 'أيلول (سبتمبر) 2026' : 'September 2026', 
                shortMonth: language === 'ar' ? 'أيلول 2026' : 'September 2026',
                gross: grossSalary, 
                net: netSalary, 
                date: '2026-09-28', 
                status: 'paid',
                basic: basicSalary,
                currentMonthBasic: currentMonthBasic,
                phone: phoneAllowance,
                family: familyAllowance,
                cert: certAllowance,
                incentives: incentivesAllowance,
                transport: transportAllowance,
                bonus: bonusAllowance,
                overtime: overtimeAllowance,
                earnedLeave: earnedLeaveAllowance,
                socialSecurity: socialSecurityDeduction,
                tax: taxDeduction,
                insurance: insuranceDeduction,
                loan: loanDeduction,
                absence: absenceDeduction,
                other: otherDeductions,
                deductions: totalDeductions
              },
              { 
                month: language === 'ar' ? 'آب (أغسطس) 2026' : 'August 2026', 
                shortMonth: language === 'ar' ? 'آب 2026' : 'August 2026',
                gross: grossSalary, 
                net: netSalary, 
                date: '2026-08-27', 
                status: 'paid',
                basic: basicSalary,
                currentMonthBasic: currentMonthBasic,
                phone: phoneAllowance,
                family: familyAllowance,
                cert: certAllowance,
                incentives: incentivesAllowance,
                transport: transportAllowance,
                bonus: bonusAllowance,
                overtime: overtimeAllowance,
                earnedLeave: earnedLeaveAllowance,
                socialSecurity: socialSecurityDeduction,
                tax: taxDeduction,
                insurance: insuranceDeduction,
                loan: loanDeduction,
                absence: absenceDeduction,
                other: otherDeductions,
                deductions: totalDeductions
              },
            ];

            const activePayslip = payslipHistory[selectedPayslipIndex] || payslipHistory[0];

            return (
              <div className="space-y-6">
                {/* Payroll Hero Card (النافذة العليا) */}
                <div id="payroll-hero-card" className="p-6 rounded-2xl bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white shadow-xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {t('مدفوع ومحوّل للحساب', 'Paid & Transferred')}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: '#ffffff' }}>
                          {activePayslip.shortMonth}
                        </span>
                        {selectedPayslipIndex > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/40">
                            {t('أرشيف سابق', 'Archived Payslip')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold mb-1" style={{ color: '#ffffff' }}>
                        {t('صافي الراتب المستحق', 'Net Salary Payable')} ({activePayslip.shortMonth})
                      </div>
                      <div className="text-3xl md:text-4xl font-black tracking-tight flex items-baseline gap-2">
                        <span className="font-mono font-black drop-shadow-sm" style={{ color: '#60a5fa' }}>
                          {activePayslip.net.toLocaleString('en-US')}
                        </span>
                        <span className="text-sm font-bold" style={{ color: '#ffffff' }}>
                          {t('دينار عراقي', 'IQD')}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium mt-2" style={{ color: '#ffffff' }}>
                        {t('تاريخ الإيداع:', 'Disbursed:')} {activePayslip.date} • {t('عبر المصرف العراقي للتجارة (TBI)', 'Trade Bank of Iraq (TBI)')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleDownload}
                        className="px-4 py-2.5 rounded-xl bg-teal-950/80 hover:bg-teal-950 text-white text-xs font-bold transition-all border border-teal-500/30 flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-teal-300" />
                        <span className="text-white font-bold">{t('تحميل القسيمة (PDF)', 'Download Payslip (PDF)')}</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        className="px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition-all border border-teal-500/40 flex items-center gap-2 shadow-md cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-white" />
                        <span className="text-white font-bold">{t('طباعة القسيمة', 'Print Payslip')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown (Earnings vs Deductions) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Earnings Column */}
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t('المستحقات والبدلات', 'Earnings & Allowances')}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-emerald-500 font-mono">
                        +{activePayslip.gross.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                      </span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('الراتب الاسمي الأساسي', 'Nominal Basic Salary')}</span>
                        <span className="font-bold font-mono text-slate-200">{activePayslip.basic.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('الراتب الاسمي الفعلي', 'Current Month Basic')}</span>
                        <span className="font-bold font-mono text-teal-400">{(activePayslip.currentMonthBasic ?? activePayslip.basic).toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل الهاتف', 'Phone Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.phone.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل الزوجية والأولاد', 'Family Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.family.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل الشهادة', 'Certificate Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.cert.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('المحفزات التشجيعية (Incentives)', 'Incentives Allowance')}</span>
                        <span className="font-bold font-mono text-emerald-500">+{(activePayslip.incentives || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل النقل والمواصلات (Transportation)', 'Transportation Allowance')}</span>
                        <span className="font-bold font-mono">{activePayslip.transport.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('المكافآت والمنح التشغيلية (Bonus)', 'Operational Bonus')}</span>
                        <span className="font-bold font-mono text-emerald-500">+{(activePayslip.bonus || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('أجر العمل الإضافي (Overtime)', 'Overtime Pay')}</span>
                        <span className="font-bold font-mono text-emerald-500">+{(activePayslip.overtime || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('بدل الإجازات المكتسبة (Earned Leave)', 'Earned Leave Allowance')}</span>
                        <span className="font-bold font-mono text-emerald-500">+{(activePayslip.earnedLeave || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                        <span>{t('إجمالي الراتب الإجمالي (Gross)', 'Total Gross Salary')}</span>
                        <span className="font-mono text-teal-500">{activePayslip.gross.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions Column */}
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="w-4 h-4 text-rose-500" />
                        <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t('الاستقطاعات والتأمين', 'Deductions & Taxes')}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-rose-500 font-mono">
                        -{activePayslip.deductions.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                      </span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع أيام الغياب', 'Absence Deductions')}</span>
                        <span className="font-bold font-mono text-rose-500">-{(activePayslip.absence || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع التقاعد والضمان الاجتماعي (5%)', 'Pension & Social Security (5%)')}</span>
                        <span className="font-bold font-mono text-rose-500">-{activePayslip.socialSecurity.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع ضريبة الدخل (3%)', 'Income Tax (3%)')}</span>
                        <span className="font-bold font-mono text-rose-500">-{activePayslip.tax.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('قسط التأمين الصحي والحياة', 'Health & Life Insurance')}</span>
                        <span className="font-bold font-mono text-slate-400">-{activePayslip.insurance.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاع القروض والسلف', 'Loan Deduction')}</span>
                        <span className="font-bold font-mono text-slate-400">-{activePayslip.loan.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">{t('استقطاعات أخرى وجزاءات', 'Other Deductions')}</span>
                        <span className="font-bold font-mono text-slate-400">-{(activePayslip.other || 0).toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold">
                        <span>{t('إجمالي الاستقطاعات', 'Total Deductions')}</span>
                        <span className="font-mono text-rose-500">-{activePayslip.deductions.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Account Information */}
                <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isDark ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-400">{t('المصرف المحول إليه', 'Bank Name')}</div>
                      <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {selectedEmployee?.bankName || t('المصرف العراقي للتجارة (Trade Bank of Iraq)', 'Trade Bank of Iraq (TBI)')}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">{t('رقم الآيبان (IBAN)', 'IBAN Number')}</div>
                    <div className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                      {selectedEmployee?.iban || 'IQ44 TBIQ 0000 0012 3456 7890'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400">{t('طريقة الدفع', 'Payment Method')}</div>
                    <div className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {t('إيداع بنكي مباشر', 'Direct Bank Deposit')}
                    </div>
                  </div>
                </div>

                {/* Payslip History Archive */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {t('أرشيف كشوفات الرواتب السابقة', 'Previous Payslips Archive')}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {t('انقر على "View Details" لعرض بيانات أي شهر في النافذة العليا', 'Click "View Details" to show any month in top card')}
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className={`w-full text-xs ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      <thead className={isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                        <tr>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('الشهر والدفعة', 'Period')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('الراتب الإجمالي', 'Gross')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('صافي المستلم', 'Net Paid')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('تاريخ الصرف', 'Disbursed Date')}</th>
                          <th className={`p-3 font-bold ${language === 'en' ? 'text-left' : 'text-right'}`}>{t('الحالة', 'Status')}</th>
                          <th className="p-3 font-bold text-center">{t('الإجراء', 'Action')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {payslipHistory.map((p, idx) => (
                          <tr 
                            key={idx} 
                            className={`transition-colors ${
                              selectedPayslipIndex === idx
                                ? isDark ? 'bg-teal-950/40 border-r-4 border-r-teal-400' : 'bg-teal-50/70 border-r-4 border-r-teal-600'
                                : isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="p-3 font-bold flex items-center gap-2">
                              <span>{p.month}</span>
                              {selectedPayslipIndex === idx && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                                  {t('معروض بالأعلى', 'Active in View')}
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">{p.gross.toLocaleString('en-US')} {t('د.ع', 'IQD')}</td>
                            <td className="p-3 font-mono font-bold text-emerald-500">{p.net.toLocaleString('en-US')} {t('د.ع', 'IQD')}</td>
                            <td className="p-3 font-mono text-slate-400">{p.date}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {t('مدفوع', 'Paid')}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setSelectedPayslipIndex(idx);
                                  const heroCard = document.getElementById('payroll-hero-card');
                                  if (heroCard) {
                                    heroCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                  }
                                  setPunchToast(
                                    language === 'ar'
                                      ? `تم عرض بيانات كشف راتب شهر (${p.shortMonth}) في النافذة العليا بنجاح`
                                      : `Displaying payslip for ${p.shortMonth} in the top window`
                                  );
                                  setTimeout(() => setPunchToast(null), 3000);
                                }}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-xs ${
                                  selectedPayslipIndex === idx
                                    ? 'bg-teal-600 text-white shadow-teal-600/30 ring-2 ring-teal-400'
                                    : 'bg-teal-600/10 hover:bg-teal-600/25 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                }`}
                                title={language === 'ar' ? `عرض بيانات شهر ${p.shortMonth} في النافذة العليا` : `Show ${p.shortMonth} in top card`}
                              >
                                <span className="material-symbols-outlined text-sm">visibility</span>
                                <span>{t('عرض التفاصيل', 'View Details')}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4. Leave Tab - Matches Image 1 precisely, scoped to current employee */}
          {activeTab === 'leave' && (() => {
            const todayDateStr = new Date().toISOString().split('T')[0];

            // Department Bilingual Mapper
            const getDeptBilingual = () => {
              const raw = selectedEmployee?.department || 'قسم الائتمان';
              if (language === 'ar') return raw;
              const map: Record<string, string> = {
                'قسم الائتمان': 'Credit Department',
                'الائتمان': 'Credit Department',
                'قسم الاتئمان': 'Credit Department',
                'قسم العمليات والائتمان': 'Operations & Credit Department',
                'الموارد البشرية': 'Human Resources Department',
                'المعلوماتية والاتصالات': 'IT & Communications Department',
                'تكنولوجيا المعلومات': 'Information Technology Department',
                'المالية والمحاسبة': 'Finance & Accounting Department',
                'القسم المالي': 'Finance Department',
                'الإدارة العليا': 'Executive Management',
                'المشتريات والتسهيلات': 'Procurement & Facilities Department',
                'الأمن': 'Security Department',
                'قسم الأمن': 'Security Department'
              };
              return (selectedEmployee as any)?.departmentEn || map[raw] || raw;
            };

            // Position Bilingual Mapper
            const getPositionBilingual = () => {
              const raw = selectedEmployee?.jobTitle || 'حارس وصيانة';
              if (language === 'ar') return raw;
              const map: Record<string, string> = {
                'حارس وصيانة': 'Guard&Maintenance',
                'حارس و صيانة': 'Guard&Maintenance',
                'حارس أمن': 'Security Guard',
                'مسؤول ائتمان': 'Credit Officer',
                'أخصائي ائتمان': 'Loan Specialist',
                'محاسب أول': 'Senior Accountant',
                'مسؤول موارد بشرية': 'HR Officer',
                'Super Admin': 'Super Admin',
                'مدير النظام': 'Super Admin'
              };
              return (selectedEmployee as any)?.jobTitleEn || map[raw] || raw;
            };

            // Employee Name
            const empDisplayName = language === 'ar'
              ? (selectedEmployee?.fullName || 'وليد خالد اسماعيل البياتي')
              : ((selectedEmployee as any)?.fullNameEn || selectedEmployee?.fullName || 'Waleed Khalid Ismail Al Bayati');

            const handleSyncNow = () => {
              setIsSyncingAttendance(true);
              setTimeout(() => {
                setIsSyncingAttendance(false);
                setPunchToast(
                  language === 'ar'
                    ? 'تمت مزامنة سجلات الحضور بنجاح مع خادم البصمة البيومترية'
                    : 'Attendance records synchronized successfully with biometric server'
                );
                setTimeout(() => setPunchToast(null), 3500);
              }, 1200);
            };

            const handleApplyLeaveSubmit = (e: React.FormEvent) => {
              e.preventDefault();
              if (!newLeaveForm.startDate || !newLeaveForm.endDate) return;

              const start = new Date(newLeaveForm.startDate);
              const end = new Date(newLeaveForm.endDate);
              const diffTime = Math.max(0, end.getTime() - start.getTime());
              const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

              const typeNames: Record<string, { ar: string; en: string }> = {
                annual: { ar: 'إجازة سنوية', en: 'Annual Leave' },
                sick: { ar: 'إجازة مرضية', en: 'Sick Leave' },
                emergency: { ar: 'إجازة طارئة', en: 'Emergency Leave' },
                unpaid: { ar: 'إجازة بدون راتب', en: 'Unpaid Leave' }
              };

              const newReq = {
                id: `LV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
                type: typeNames[newLeaveForm.leaveType]?.ar || 'إجازة اعتيادية',
                typeEn: typeNames[newLeaveForm.leaveType]?.en || 'Annual Leave',
                startDate: newLeaveForm.startDate,
                endDate: newLeaveForm.endDate,
                days: daysCount,
                reason: newLeaveForm.reason || (language === 'ar' ? 'طلب إجازة شخصية' : 'Personal leave request'),
                status: 'pending' as const,
                appliedDate: todayDateStr
              };

              const updatedRequests = [newReq, ...myLeaveRequests];
              setMyLeaveRequests(updatedRequests);

              // Update balance
              if (newLeaveForm.leaveType === 'annual' && leaveBalances.annual.available >= daysCount) {
                const updatedBal = {
                  ...leaveBalances,
                  annual: { ...leaveBalances.annual, available: leaveBalances.annual.available - daysCount }
                };
                setLeaveBalances(updatedBal);
                localStorage.setItem(`vitas_emp_leave_balances_${empKey}`, JSON.stringify(updatedBal));
              } else if (newLeaveForm.leaveType === 'sick' && leaveBalances.sick.available >= daysCount) {
                const updatedBal = {
                  ...leaveBalances,
                  sick: { ...leaveBalances.sick, available: leaveBalances.sick.available - daysCount }
                };
                setLeaveBalances(updatedBal);
                localStorage.setItem(`vitas_emp_leave_balances_${empKey}`, JSON.stringify(updatedBal));
              } else if (newLeaveForm.leaveType === 'emergency' && leaveBalances.emergency.available >= daysCount) {
                const updatedBal = {
                  ...leaveBalances,
                  emergency: { ...leaveBalances.emergency, available: leaveBalances.emergency.available - daysCount }
                };
                setLeaveBalances(updatedBal);
                localStorage.setItem(`vitas_emp_leave_balances_${empKey}`, JSON.stringify(updatedBal));
              }

              localStorage.setItem(`vitas_emp_leave_requests_${empKey}`, JSON.stringify(updatedRequests));

              setShowApplyLeaveModal(false);
              setNewLeaveForm({
                leaveType: 'annual',
                startDate: '',
                endDate: '',
                reason: '',
                isEmergency: false
              });

              setPunchToast(
                language === 'ar'
                  ? `تم تقديم طلب الإجازة (${daysCount} أيام) بنجاح وبانتظار موافقة المدير`
                  : `Leave request for ${daysCount} days submitted successfully for approval`
              );
              setTimeout(() => setPunchToast(null), 4000);
            };

            const handleCorrectionSubmit = (e: React.FormEvent) => {
              e.preventDefault();
              setTodayAttendanceState(prev => ({
                ...prev,
                check_in: correctionForm.requestedIn || prev.check_in,
                check_out: correctionForm.requestedOut || prev.check_out
              }));
              setShowCorrectionModal(false);
              setPunchToast(
                language === 'ar'
                  ? 'تم إرسال طلب تصحيح البصمة إلى مسؤول الموارد البشرية بنجاح'
                  : 'Attendance correction request submitted to HR officer successfully'
              );
              setTimeout(() => setPunchToast(null), 4000);
            };

            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* 1. Top Banner with live clock and identity */}
                <div className={`p-6 sm:p-7 rounded-3xl border shadow-sm flex flex-wrap items-center justify-between gap-6 transition-all ${
                  isDark ? 'bg-[#0a0c10] border-white/10 shadow-xl' : 'bg-white border-slate-200'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className="w-13 h-13 rounded-2xl bg-teal-50 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-2xl">space_dashboard</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest font-bold bg-teal-50 dark:bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/20">
                          VITAS IRAQ HRIS • LEAVES & ATTENDANCE
                        </span>
                        <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 hidden sm:inline font-semibold">
                          {todayDateStr}
                        </span>
                      </div>
                      <h1 className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {language === 'ar' ? `مرحباً، ${empDisplayName}` : `Welcome back, ${empDisplayName}`}
                      </h1>
                      <p className={`text-xs sm:text-sm font-medium mt-1 flex items-center gap-2 ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        <span>{getPositionBilingual()}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-teal-600 dark:text-teal-400 font-bold">{getDeptBilingual()}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Live digital clock pill */}
                    <div className={`px-4 py-2.5 rounded-2xl border font-mono text-xs sm:text-sm font-bold flex items-center gap-2 shadow-inner ${
                      isDark ? 'bg-slate-900/80 border-slate-700/80 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{liveClockTime}</span>
                    </div>

                    <button
                      onClick={() => setShowApplyLeaveModal(true)}
                      className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition-all flex items-center gap-2 border border-teal-400/40 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">edit_calendar</span>
                      <span>{t('تقديم طلب إجازة', 'Apply for Leave')}</span>
                    </button>

                    <button
                      onClick={handleSyncNow}
                      disabled={isSyncingAttendance}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-2 border cursor-pointer disabled:opacity-50 active:scale-95 ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-base text-teal-600 dark:text-teal-400 ${isSyncingAttendance ? 'animate-spin' : ''}`}>sync</span>
                      <span>{isSyncingAttendance ? t('جارٍ المزامنة...', 'Syncing...') : t('تحديث الحضور الآن', 'Sync Attendance Now')}</span>
                    </button>
                  </div>
                </div>

                {/* 2. High Level Attendance KPIs - Scoped to this Employee */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                  {/* Present */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-emerald-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('حاضر', 'Present')}</span>
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-base">person_check</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      20
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{language === 'ar' ? '41% نسبة الحضور' : '41% Attendance'}</span>
                    </div>
                  </div>

                  {/* Late */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-amber-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('متأخر', 'Late')}</span>
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-base">schedule</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
                      10
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
                      {t('تأخير صباحي', 'Morning Late')}
                    </div>
                  </div>

                  {/* On Leave */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-blue-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('في إجازة', 'On Leave')}</span>
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <span className="material-symbols-outlined text-base">event_available</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                      5
                    </div>
                    <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                      {t('إجازات معتمدة', 'Approved Leaves')}
                    </div>
                  </div>

                  {/* Early Leave */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-purple-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('خروج مبكر', 'Early Leave')}</span>
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <span className="material-symbols-outlined text-base">output</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                      5
                    </div>
                    <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                      {t('خروج قبل الوقت', 'Early Out')}
                    </div>
                  </div>

                  {/* Missing Punch */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-rose-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('بصمة مفقودة', 'Missing Punch')}</span>
                      <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <span className="material-symbols-outlined text-base">warning</span>
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                      4
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                      {t('بحاجة لتصحيح', 'Needs Correction')}
                    </div>
                  </div>

                  {/* Absent */}
                  <div className={`p-4 rounded-2xl border shadow-xs transition-all hover:shadow-md hover:border-slate-500/40 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t('غائب', 'Absent')}</span>
                      <div className="p-1.5 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400">
                        <span className="material-symbols-outlined text-base">person_off</span>
                      </div>
                    </div>
                    <div className={`text-2xl sm:text-3xl font-black ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      5
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      {t('غائب بدون عذر', 'Unexcused')}
                    </div>
                  </div>
                </div>

                {/* 3. Main Grid: My Attendance Today + My Leave Balances */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Today's Personal Attendance Card */}
                  <div className={`lg:col-span-6 rounded-3xl border p-6 space-y-4 shadow-sm flex flex-col justify-between ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
                        isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal-500">fingerprint</span>
                          <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {t('حضوري اليوم', 'My Attendance Today')}
                          </h2>
                        </div>
                        <button
                          onClick={() => setShowCorrectionModal(true)}
                          className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          <span>{t('طلب تصحيح', 'Request Correction')}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('الوردية المجدولة', 'Scheduled Shift')}</span>
                          <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {todayAttendanceState.scheduled_start} - {todayAttendanceState.scheduled_end}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('وقت الحضور', 'Check In')}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {todayAttendanceState.check_in}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('وقت الانصراف', 'Check Out')}</span>
                          <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {todayAttendanceState.check_out}
                          </span>
                        </div>
                        <div className={`p-3 rounded-2xl border ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-slate-400 block mb-1">{t('ساعات العمل', 'Worked Hours')}</span>
                          <span className="font-bold text-teal-600 dark:text-teal-400">
                            {todayAttendanceState.worked_hours}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Simulation Buttons */}
                    <div className={`pt-3 border-t ${isDark ? 'border-[#1f2d4a]' : 'border-slate-100'}`}>
                      <span className="text-[11px] text-slate-400 block mb-2 font-medium">
                        {t('تسجيل البصمة السريع:', 'Instant Live Punch Simulation:')}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => {
                            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            setTodayAttendanceState(prev => ({ ...prev, check_in: now }));
                            setPunchToast(language === 'ar' ? `تم تسجيل حضورك بنجاح (${now})` : `Punch In recorded at ${now}`);
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">login</span>
                          <span>{t('تسجيل حضور', 'Punch In')}</span>
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                            setTodayAttendanceState(prev => ({ ...prev, check_out: now }));
                            setPunchToast(language === 'ar' ? `تم تسجيل انصرافك بنجاح (${now})` : `Punch Out recorded at ${now}`);
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">logout</span>
                          <span>{t('تسجيل انصراف', 'Punch Out')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setPunchToast(language === 'ar' ? 'تم تسجيل خروج للاستراحة' : 'Break Out recorded');
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">coffee</span>
                          <span>{t('خروج استراحة', 'Break Out')}</span>
                        </button>
                        <button
                          onClick={() => {
                            setPunchToast(language === 'ar' ? 'تم تسجيل عودة من الاستراحة' : 'Break In recorded');
                            setTimeout(() => setPunchToast(null), 3000);
                          }}
                          className="px-3 py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">work</span>
                          <span>{t('عودة للعمل', 'Break In')}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Leave Balances Card */}
                  <div className={`lg:col-span-6 rounded-3xl border p-6 space-y-4 shadow-sm flex flex-col justify-between ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <div className={`flex items-center justify-between border-b pb-3 mb-4 ${
                        isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal-500">account_balance_wallet</span>
                          <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {t('أرصدة إجازاتي', 'My Leave Balances')}
                          </h2>
                        </div>
                        <button
                          onClick={() => setShowApplyLeaveModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          <span>{t('تقديم طلب إجازة', 'Apply for Leave')}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Annual Leave */}
                        <div className={`p-3.5 rounded-2xl border space-y-2 hover:border-teal-500/30 transition-all ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {t('إجازة اعتيادية / سنوية', 'Annual Leave')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              2026
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                              {leaveBalances.annual.available}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t('من', 'of')} {leaveBalances.annual.entitled} {t('يوم', 'days')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (leaveBalances.annual.available / (leaveBalances.annual.entitled || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Sick Leave */}
                        <div className={`p-3.5 rounded-2xl border space-y-2 hover:border-teal-500/30 transition-all ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {t('إجازة مرضية', 'Sick Leave')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              2026
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                              {leaveBalances.sick.available}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t('من', 'of')} {leaveBalances.sick.entitled} {t('يوم', 'days')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (leaveBalances.sick.available / (leaveBalances.sick.entitled || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Emergency Leave */}
                        <div className={`p-3.5 rounded-2xl border space-y-2 hover:border-teal-500/30 transition-all ${
                          isDark ? 'bg-[#0c1322] border-[#1f2d4a]' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {t('إجازة طارئة / اضطرارية', 'Emergency Leave')}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400">
                              2026
                            </span>
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">
                              {leaveBalances.emergency.available}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {t('من', 'of')} {leaveBalances.emergency.entitled} {t('يوم', 'days')}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-teal-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, (leaveBalances.emergency.available / (leaveBalances.emergency.entitled || 1)) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick links under balances */}
                    <div className={`pt-3 border-t flex items-center justify-between text-xs ${
                      isDark ? 'border-[#1f2d4a]' : 'border-slate-100'
                    }`}>
                      <span className="text-slate-400">
                        {language === 'ar' 
                          ? `طلبات الإجازة المعلقة حالياً: ${myLeaveRequests.filter(r => r.status === 'pending').length}` 
                          : `Pending requests: ${myLeaveRequests.filter(r => r.status === 'pending').length}`}
                      </span>
                      <button
                        onClick={() => setShowLeaveHistoryTable(!showLeaveHistoryTable)}
                        className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>{showLeaveHistoryTable ? t('إخفاء السجل ▲', 'Hide History ▲') : t('سجل إجازاتي الكامل ←', 'Full Leave History →')}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Full Leave History Section (Toggleable or always shown) */}
                {showLeaveHistoryTable && (
                  <div className={`rounded-3xl border p-6 space-y-4 shadow-sm animate-in fade-in duration-300 ${
                    isDark ? 'bg-[#121b2d] border-[#1f2d4a]' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between border-b pb-3 dark:border-[#1f2d4a] border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-500">history_edu</span>
                        <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t('سجل طلبات إجازاتي', 'My Leave Request History')}
                        </h2>
                      </div>
                      <span className="text-xs text-slate-400">
                        {t('إجمالي الطلبات:', 'Total requests:')} {myLeaveRequests.length}
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#1f2d4a]">
                      <table className="w-full text-xs text-right">
                        <thead className={isDark ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                          <tr>
                            <th className="p-3 font-bold">{t('رقم الطلب', 'Request ID')}</th>
                            <th className="p-3 font-bold">{t('نوع الإجازة', 'Leave Type')}</th>
                            <th className="p-3 font-bold">{t('الفترة', 'Period')}</th>
                            <th className="p-3 font-bold">{t('عدد الأيام', 'Days')}</th>
                            <th className="p-3 font-bold">{t('السبب', 'Reason')}</th>
                            <th className="p-3 font-bold">{t('الحالة', 'Status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {myLeaveRequests.map((req) => (
                            <tr key={req.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                              <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">{req.id}</td>
                              <td className="p-3 font-semibold">{language === 'ar' ? req.type : req.typeEn}</td>
                              <td className="p-3 font-mono text-slate-400">{req.startDate} → {req.endDate}</td>
                              <td className="p-3 font-bold">{req.days} {t('يوم', 'days')}</td>
                              <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{req.reason}</td>
                              <td className="p-3">
                                {req.status === 'approved' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    {t('معتمدة', 'Approved')}
                                  </span>
                                )}
                                {req.status === 'pending' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    {t('قيد المراجعة', 'Pending')}
                                  </span>
                                )}
                                {req.status === 'rejected' && (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    {t('مرفوضة', 'Rejected')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. Modal: Apply for Leave */}
                {showApplyLeaveModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">edit_calendar</span>
                          </div>
                          <div>
                            <h3 className="text-base font-black">{t('تقديم طلب إجازة جديدة', 'Submit New Leave Request')}</h3>
                            <p className="text-xs text-slate-400">{empDisplayName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowApplyLeaveModal(false)}
                          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>

                      <form onSubmit={handleApplyLeaveSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('نوع الإجازة المطلوبة *', 'Leave Type *')}
                          </label>
                          <select
                            value={newLeaveForm.leaveType}
                            onChange={(e) => setNewLeaveForm({ ...newLeaveForm, leaveType: e.target.value })}
                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          >
                            <option value="annual">
                              {language === 'ar' ? `إجازة سنوية اعتيادية (متاح: ${leaveBalances.annual.available} يوم)` : `Annual Leave (${leaveBalances.annual.available} days available)`}
                            </option>
                            <option value="sick">
                              {language === 'ar' ? `إجازة مرضية بتقرير (متاح: ${leaveBalances.sick.available} يوم)` : `Sick Leave (${leaveBalances.sick.available} days available)`}
                            </option>
                            <option value="emergency">
                              {language === 'ar' ? `إجازة طارئة / اضطرارية (متاح: ${leaveBalances.emergency.available} يوم)` : `Emergency Leave (${leaveBalances.emergency.available} days available)`}
                            </option>
                            <option value="unpaid">
                              {language === 'ar' ? 'إجازة بدون راتب' : 'Unpaid Leave'}
                            </option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('تاريخ البدء *', 'Start Date *')}
                            </label>
                            <input
                              type="date"
                              value={newLeaveForm.startDate}
                              onChange={(e) => setNewLeaveForm({ ...newLeaveForm, startDate: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('تاريخ النهاية *', 'End Date *')}
                            </label>
                            <input
                              type="date"
                              value={newLeaveForm.endDate}
                              onChange={(e) => setNewLeaveForm({ ...newLeaveForm, endDate: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('سبب طلب الإجازة *', 'Reason for Leave *')}
                          </label>
                          <textarea
                            value={newLeaveForm.reason}
                            onChange={(e) => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })}
                            rows={3}
                            placeholder={t('اكتب سبب طلب الإجازة...', 'Enter reason for leave request...')}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setShowApplyLeaveModal(false)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {t('إلغاء', 'Cancel')}
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>{t('إرسال الطلب للموافقة', 'Submit for Approval')}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* 6. Modal: Attendance Correction */}
                {showCorrectionModal && (
                  <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 ${
                      isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </div>
                          <div>
                            <h3 className="text-base font-black">{t('طلب تصحيح بصمة دوام', 'Request Attendance Correction')}</h3>
                            <p className="text-xs text-slate-400">{empDisplayName}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowCorrectionModal(false)}
                          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>

                      <form onSubmit={handleCorrectionSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('تاريخ اليوم المراد تصحيحه *', 'Correction Date *')}
                          </label>
                          <input
                            type="date"
                            value={correctionForm.date}
                            onChange={(e) => setCorrectionForm({ ...correctionForm, date: e.target.value })}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('وقت الحضور الفعلي *', 'Actual Check In *')}
                            </label>
                            <input
                              type="time"
                              value={correctionForm.requestedIn}
                              onChange={(e) => setCorrectionForm({ ...correctionForm, requestedIn: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                              {t('وقت الانصراف الفعلي *', 'Actual Check Out *')}
                            </label>
                            <input
                              type="time"
                              value={correctionForm.requestedOut}
                              onChange={(e) => setCorrectionForm({ ...correctionForm, requestedOut: e.target.value })}
                              className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                            {t('سبب عدم تسجيل البصمة بالجهاز *', 'Reason for Correction *')}
                          </label>
                          <textarea
                            value={correctionForm.reason}
                            onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                            rows={3}
                            placeholder={t('اكتب سبب نسيان البصمة أو العطل الفني أو الواجب الميداني...', 'Explain reason (field task, device error, etc.)...')}
                            className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                            required
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => setShowCorrectionModal(false)}
                            className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                              isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {t('إلغاء', 'Cancel')}
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>{t('إرسال طلب التصحيح', 'Submit Correction')}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* 5. Evaluation Tab */}
          {activeTab === 'evaluation' && (
            <div className="space-y-6">
              <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('التقييم الذاتي', 'Self Evaluation')}</h2>
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-500/20 border-slate-600 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <p className="text-sm font-medium">{t('سيتم إضافة نموذج التقييم الذاتي قريباً', 'Self evaluation form will be added soon')}</p>
              </div>
            </div>
          )}

          {/* 6. Notifications & Official Attachments Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 dark:border-white/10">
                <div>
                  <h2 className={`text-xl font-bold flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Bell className="w-5 h-5 text-teal-500" />
                    <span>{t('التنبيهات والإشعارات والمرفقات الرسمية', 'Notifications & Official Attachments')}</span>
                  </h2>
                  <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t('الاطلاع على جميع القرارات الإدارية، كشوفات الرواتب، التعاميم، والمستندات المرفقة الصادرة لك.', 'View all administrative decisions, payslips, circulars, and official attached documents issued to you.')}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600/10 hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t('تحديد الكل كمقروء', 'Mark All Read')}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Filters and Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    onClick={() => setNotifFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      notifFilter === 'all'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('الكل', 'All')} ({notificationsList.length})
                  </button>
                  <button
                    onClick={() => setNotifFilter('unread')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      notifFilter === 'unread'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {t('غير مقروءة', 'Unread')} ({unreadNotificationsCount})
                  </button>
                  <button
                    onClick={() => setNotifFilter('attachments')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      notifFilter === 'attachments'
                        ? 'bg-teal-600 text-white shadow-sm'
                        : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{t('تحتوي مرفقات', 'Has Attachments')} ({notificationsList.filter(n => n.attachments && n.attachments.length > 0).length})</span>
                  </button>
                </div>

                <div className="relative min-w-[240px]">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={notifSearch}
                    onChange={(e) => setNotifSearch(e.target.value)}
                    placeholder={t('بحث في التنبيهات والمرفقات...', 'Search notifications or files...')}
                    className={`w-full pr-8 pl-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Notifications Cards List */}
              <div className="space-y-4">
                {notificationsList
                  .filter(n => {
                    if (notifFilter === 'unread' && n.read) return false;
                    if (notifFilter === 'attachments' && (!n.attachments || n.attachments.length === 0)) return false;
                    if (notifSearch.trim()) {
                      const q = notifSearch.toLowerCase();
                      const inTitle = n.title.toLowerCase().includes(q);
                      const inMsg = n.message.toLowerCase().includes(q);
                      const inSender = n.sender.toLowerCase().includes(q);
                      const inAtt = n.attachments?.some(a => a.name.toLowerCase().includes(q) || (a.docTitle && a.docTitle.toLowerCase().includes(q)));
                      return inTitle || inMsg || inSender || inAtt;
                    }
                    return true;
                  })
                  .map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        !notif.read
                          ? isDark
                            ? 'bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border-teal-500/40 shadow-lg shadow-teal-950/20'
                            : 'bg-teal-50/60 border-teal-300 shadow-sm'
                          : isDark
                            ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                            : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                            notif.category === 'decision'
                              ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                              : notif.category === 'payroll'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : notif.category === 'medical'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              : notif.category === 'report'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          }`}>
                            {language === 'en' ? notif.categoryLabelEn : notif.categoryLabelAr}
                          </span>

                          {notif.priority === 'urgent' && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
                              {t('عاجل', 'Urgent')}
                            </span>
                          )}

                          <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            • {language === 'en' && notif.senderEn ? notif.senderEn : notif.sender}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {notif.date} | {notif.time}
                          </span>
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              title={t('تحديد كمقروء', 'Mark read')}
                              className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-teal-400 transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Notification Title & Body */}
                      <h3 className={`text-sm sm:text-base font-bold mb-1.5 ${
                        !notif.read ? (isDark ? 'text-white' : 'text-slate-950 font-black') : (isDark ? 'text-slate-200' : 'text-slate-800')
                      }`}>
                        {language === 'en' && notif.titleEn ? notif.titleEn : notif.title}
                      </h3>
                      <p className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {language === 'en' && notif.messageEn ? notif.messageEn : notif.message}
                      </p>

                      {/* Attached Documents Section */}
                      {notif.attachments && notif.attachments.length > 0 && (
                        <div className={`pt-3.5 mt-3 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <Paperclip className="w-4 h-4 text-teal-500" />
                            <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                              {t('المرفقات الرسمية المعتمدة', 'Official Verified Attachments')} ({notif.attachments.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {notif.attachments.map((att) => (
                              <div
                                key={att.id}
                                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                                  isDark 
                                    ? 'bg-slate-900/90 border-slate-700/80 hover:border-teal-500/50' 
                                    : 'bg-white border-slate-200 hover:border-teal-400 shadow-xs'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    att.type === 'pdf' 
                                      ? 'bg-rose-500/10 text-rose-500' 
                                      : att.type === 'excel'
                                      ? 'bg-emerald-500/10 text-emerald-500'
                                      : 'bg-blue-500/10 text-blue-500'
                                  }`}>
                                    {att.type === 'pdf' ? (
                                      <FileText className="w-4 h-4" />
                                    ) : att.type === 'excel' ? (
                                      <FileSpreadsheet className="w-4 h-4" />
                                    ) : (
                                      <Paperclip className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold truncate" title={att.name}>
                                      {att.name}
                                    </p>
                                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {att.type.toUpperCase()} • {att.size}
                                      {att.refNo && ` • ${att.refNo}`}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {/* Preview Attachment Button */}
                                  <button
                                    onClick={() => handleOpenAttachmentPreview(att, notif)}
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-teal-600/10 hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                                    title={t('معاينة المرفق كاملاً داخل النظام', 'Preview attachment')}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{t('معاينة', 'Preview')}</span>
                                  </button>

                                  {/* Download Attachment Button */}
                                  <button
                                    onClick={() => handleDownloadAttachment(att)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-all cursor-pointer active:scale-95"
                                    title={t('تحميل المرفق على جهازك', 'Download file')}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

      {/* Quick Notifications Modal (When Clicking Bell in Header) */}
      {showNotificationsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className={`w-full max-w-2xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-teal-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>{t('التنبيهات والمرفقات الرسمية', 'Notifications & Attachments')}</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {unreadNotificationsCount} {t('جديدة', 'new')}
                      </span>
                    )}
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('تنبيهات وقرارات مؤسسة فيتاس العراق الموجهة لك', 'Official notifications & decisions issued for you')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline px-2 py-1 cursor-pointer"
                  >
                    {t('قراءة الكل', 'Read All')}
                  </button>
                )}
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
              {notificationsList.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all ${
                    !notif.read
                      ? isDark ? 'bg-slate-900 border-teal-500/30' : 'bg-teal-50/60 border-teal-200'
                      : isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                        {notif.categoryLabelAr}
                      </span>
                      <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {notif.sender}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {notif.date}
                    </span>
                  </div>

                  <h4 className={`text-xs sm:text-sm font-bold mb-1 ${!notif.read ? 'text-teal-400 dark:text-teal-300' : ''}`}>
                    {notif.title}
                  </h4>
                  <p className={`text-xs leading-relaxed mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {notif.message}
                  </p>

                  {/* Attachments */}
                  {notif.attachments && notif.attachments.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/5">
                      {notif.attachments.map(att => (
                        <div
                          key={att.id}
                          className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs ${
                            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {att.type === 'pdf' ? (
                              <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span className="truncate font-semibold">{att.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">({att.size})</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                setShowNotificationsModal(false);
                                handleOpenAttachmentPreview(att, notif);
                              }}
                              className="px-2 py-1 rounded-md text-[10px] font-bold bg-teal-600 text-white hover:bg-teal-500 flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{t('معاينة', 'Preview')}</span>
                            </button>
                            <button
                              onClick={() => handleDownloadAttachment(att)}
                              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                              title={t('تحميل', 'Download')}
                            >
                              <Download className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className={`p-3 sm:p-4 border-t flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                onClick={() => {
                  setShowNotificationsModal(false);
                  setActiveTab('notifications');
                }}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('عرض جميع التنبيهات في صفحة كاملة', 'Open Full Notifications Page')}</span>
              </button>

              <button
                onClick={() => setShowNotificationsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
              >
                {t('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Attachment / Document Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Document Header Bar */}
            <div className={`p-4 border-b flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  previewAttachment.attachment.type === 'pdf'
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {previewAttachment.attachment.type === 'pdf' ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">
                    {previewAttachment.attachment.name}
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {previewAttachment.attachment.docTitle || previewAttachment.notifTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title={t('طباعة الوثيقة الرسمية', 'Print Document')}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('طباعة', 'Print')}</span>
                </button>
                <button
                  onClick={() => handleDownloadAttachment(previewAttachment.attachment)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title={t('تحميل المستند', 'Download')}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('تحميل', 'Download')}</span>
                </button>
                <button
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content / Paper Viewer */}
            <div className={`p-6 sm:p-8 overflow-y-auto flex-1 relative ${
              isDark ? 'bg-[#080d1a]' : 'bg-slate-100'
            }`}>
              {/* Paper Layout */}
              <div className={`max-w-2xl mx-auto p-6 sm:p-10 rounded-2xl shadow-xl border relative overflow-hidden ${
                isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Background Official Watermark */}
                <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.04]">
                  <p className="text-6xl sm:text-7xl font-black uppercase rotate-[-25deg] tracking-widest text-center">
                    VITAS IRAQ<br />OFFICIAL
                  </p>
                </div>

                {/* Letterhead Header */}
                <div className="border-b-2 border-teal-500/40 pb-5 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400">
                        مؤسسة فيتاس العراق للتمويل الأصغر
                      </h4>
                      <p className="text-[11px] font-mono tracking-wider text-slate-400">
                        VITAS IRAQ MICROFINANCE - HRMS
                      </p>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {previewAttachment.attachment.issuer || 'قسم الموارد البشرية والشؤون الإدارية'}
                      </p>
                    </div>

                    <div className="text-left font-mono text-xs space-y-1">
                      <p><span className="text-slate-400">الرقم: </span><span className="font-bold text-teal-500">{previewAttachment.attachment.refNo || 'VITAS/HR/2026/089'}</span></p>
                      <p><span className="text-slate-400">التاريخ: </span><span className="font-bold">{previewAttachment.attachment.docDate || previewAttachment.notifDate}</span></p>
                      <p><span className="text-slate-400">الحالة: </span><span className="font-bold text-emerald-500">معتمد ورسمي</span></p>
                    </div>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center my-6">
                  <h2 className="text-base sm:text-lg font-black underline underline-offset-8 decoration-teal-500">
                    {previewAttachment.attachment.docTitle || previewAttachment.attachment.name}
                  </h2>
                </div>

                {/* Document Body */}
                <div className="space-y-4 text-xs sm:text-sm leading-relaxed">
                  {/* Table View (for Excel spreadsheets) */}
                  {previewAttachment.attachment.tableData && previewAttachment.attachment.tableData.length > 0 ? (
                    <div className="mt-4 border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className={isDark ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-teal-700'}>
                          <tr>
                            {Object.keys(previewAttachment.attachment.tableData[0]).map((col, idx) => (
                              <th key={idx} className="p-2.5 font-bold border-b border-slate-300 dark:border-slate-700">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {previewAttachment.attachment.tableData.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx % 2 === 0 ? (isDark ? 'bg-slate-900/40' : 'bg-white') : (isDark ? 'bg-slate-900/80' : 'bg-slate-50')}>
                              {Object.values(row).map((val, cIdx) => (
                                <td key={cIdx} className="p-2.5">
                                  {String(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    /* Text Clauses View */
                    <div className="space-y-3 whitespace-pre-line text-justify leading-loose">
                      {previewAttachment.attachment.contentSnippet || 'نص الوثيقة والمذكرة الرسمية المعتمدة من إدارة الموارد البشرية بمؤسسة فيتاس العراق.'}
                    </div>
                  )}
                </div>

                {/* Official Stamps & Signatures Footer */}
                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400">قسم التدقيق الداخلي والحوكمة</p>
                    <p className="text-xs font-extrabold text-teal-600 mt-1">مصادق إلكترونياً بنجاح</p>
                  </div>

                  {/* Stamp Graphic */}
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-teal-500/80 p-1 flex items-center justify-center rotate-[-8deg] select-none text-center">
                    <div className="w-full h-full rounded-full border border-teal-500/60 flex flex-col items-center justify-center p-1 text-[8px] font-black text-teal-500 leading-tight">
                      <span>فيتاس العراق</span>
                      <span className="my-0.5">★ معتمد ★</span>
                      <span>الموارد البشرية</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <p className="text-[11px] font-bold text-slate-400">المدير العام / المفوض</p>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 mt-1">مؤسسة فيتاس العراق</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{portalContent}</div>;
  }

  return (
    <div className={`min-h-screen transition-colors ${
      isDark 
        ? 'bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white' 
        : 'bg-slate-100 text-slate-900'
    }`}>
      <div className="container mx-auto p-4 py-8">
        {portalContent}
      </div>
    </div>
  );
};