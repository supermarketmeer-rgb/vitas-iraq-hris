import React, { useState, useEffect } from 'react';
import { useEmployeeContext } from '../context/EmployeeContext';
import { 
  Bell, 
  Paperclip, 
  FileText, 
  FileSpreadsheet, 
  Eye, 
  Download, 
  Check, 
  Search, 
  Printer, 
  X,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Lock,
  Edit3,
  Save,
  Users,
  Building2,
  ShieldAlert,
  Star
} from 'lucide-react';

export interface MobileAttachment {
  id: string;
  name: string;
  nameEn?: string;
  type: 'pdf' | 'excel' | 'word' | 'image';
  size: string;
  refNo?: string;
  docTitle?: string;
  docTitleEn?: string;
  docDate?: string;
  issuer?: string;
  issuerEn?: string;
  contentSnippet?: string;
  contentSnippetEn?: string;
  tableData?: Array<{ [key: string]: string | number }>;
  tableDataEn?: Array<{ [key: string]: string | number }>;
  deliveryId?: string;
  signatureMode?: 'wet_signature' | 'electronic_copy';
  isEditable?: boolean;
  formData?: any;
  recipientName?: string;
  branchName?: string;
  supervisorName?: string;
}

export interface MobileNotification {
  id: string;
  title: string;
  titleEn?: string;
  sender: string;
  senderEn?: string;
  category: 'decision' | 'payroll' | 'leave' | 'medical' | 'report' | 'contract';
  categoryLabelAr: string;
  categoryLabelEn: string;
  date: string;
  time: string;
  timeEn?: string;
  message: string;
  messageEn?: string;
  read: boolean;
  priority: 'normal' | 'important' | 'urgent';
  attachments?: MobileAttachment[];
}

interface EmployeeNotificationsProps {
  employee: any;
  onLogout?: () => void;
}

export const EmployeeNotifications: React.FC<EmployeeNotificationsProps> = ({ employee }) => {
  const { markNotificationAsRead, unreadNotifications, theme, language } = useEmployeeContext();
  const isDark = theme === 'dark';
  const isEn = language === 'en';
  const isAr = !isEn;

  const [filter, setFilter] = useState<'all' | 'unread' | 'attachments'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [routedDeliveries, setRoutedDeliveries] = useState<any[]>([]);
  const [activeScope, setActiveScope] = useState<'own' | 'subordinates' | 'branch_wet_signature'>('own');
  const [previewData, setPreviewData] = useState<{
    attachment: MobileAttachment;
    notifTitle: string;
    notifDate: string;
    delivery?: any;
  } | null>(null);

  // Collaborative Electronic Form State
  const [formInputs, setFormInputs] = useState<{
    selfRating: number;
    achievements: string;
    employeeNotes: string;
    supervisorRating: number;
    supervisorComments: string;
    supervisorDecision: string;
  }>({
    selfRating: 5,
    achievements: '',
    employeeNotes: '',
    supervisorRating: 5,
    supervisorComments: '',
    supervisorDecision: 'approved'
  });
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [formSaveSuccess, setFormSaveSuccess] = useState<string | null>(null);

  // Role detection for scope tabs
  const userPos = String(employee?.position || employee?.jobTitle || '').toLowerCase();
  const isBranchManager = userPos.includes('مدير مكتب') || userPos.includes('مدير فرع') || userPos.includes('office manager') || userPos.includes('branch manager');
  const isSupervisor = userPos.includes('مشرف') || userPos.includes('مسؤول') || userPos.includes('supervisor') || userPos.includes('team lead') || isBranchManager;

  // Intercept Ctrl+P to prevent printing electronic copies
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        if (previewData && previewData.attachment?.signatureMode === 'electronic_copy') {
          e.preventDefault();
          e.stopPropagation();
          alert(
            isEn
              ? 'Security Policy: Printing is strictly restricted for this electronic copy document.'
              : 'سياسة الأمان والامتثال: الطباعة محظورة تماماً لهذه النسخة الإلكترونية المعتمدة.'
          );
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewData, isEn]);

  // Exact Official Notifications List matching the ESS Portal
  const [portalNotifications, setPortalNotifications] = useState<MobileNotification[]>([
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
      timeEn: '10:30 AM',
      message: 'بناءً على مصادقة المدير المفوض، تقرر تطبيق سلم الحوافز والإنتاجية المحدث لكافة الموظفين بالفروع والإدارات. يرجى مراجعة الجدول والمستند المرفق للاطلاع على معايير الاستحقاق والنسب المقررة لكل فئة.',
      messageEn: 'Approved by Managing Director: Updated incentive and bonus structure implemented across branches. Review attached memo for eligibility criteria.',
      read: false,
      priority: 'urgent',
      attachments: [
        {
          id: 'att-1',
          name: 'قرار_إداري_رقم_89_الحوافز_2026.pdf',
          nameEn: 'Administrative_Decision_89_Incentives_2026.pdf',
          type: 'pdf',
          size: '1.4 MB',
          refNo: 'VITAS/HQ/DEC-2026/089',
          docTitle: 'قرار إداري رقم (89) لسنة 2026 - اعتماد لائحة الحوافز والإنتاجية',
          docTitleEn: 'Administrative Decision No. 89 (2026) - Incentive Policy Approval',
          docDate: '2026-08-10',
          issuer: 'الإدارة العامة - مؤسسة فيتاس العراق',
          issuerEn: 'Executive Management - VITAS Iraq',
          contentSnippet: 'المادة الأولى: تُعتمد لائحة الحوافز الربع سنوية الجديدة لجميع الموظفين المستمرين بالخدمة.\nالمادة الثانية: تُصرف الحوافز بناءً على تحقيق مستهدفات الجودة ومعدلات الحضور والإنتاجية بنسبة لا تقل عن 90%.\nالمادة الثالثة: يُعمل بهذا القرار من تاريخ صدوره ويُلغى كل ما يتعارض معه.',
          contentSnippetEn: 'Article 1: Approved updated quarterly incentive schedule for all active personnel.\nArticle 2: Bonus disbursement tied to branch targets, quality KPI scores, and minimum 90% punctuality.\nArticle 3: Effective immediately from date of issue.'
        },
        {
          id: 'att-2',
          name: 'جدول_معايير_الاستحقاق_والتقييم_الربع_سنوي.xlsx',
          nameEn: 'Quarterly_Eligibility_Evaluation_Matrix.xlsx',
          type: 'excel',
          size: '620 KB',
          refNo: 'VITAS/FIN/TBL-2026/44',
          docTitle: 'جدول معايير ونسب احتساب الحوافز الربع سنوية 2026',
          docTitleEn: 'Incentive Calculation Matrix & Eligibility Table 2026',
          docDate: '2026-08-10',
          issuer: 'الإدارة المالية والموارد البشرية',
          issuerEn: 'Finance & HR Administration',
          tableData: [
            { 'المعيار / البند': 'نسبة الالتزام بالدوام الشهري', 'الحد الأدنى': '95%', 'الوزن النسبي': '30%', 'معدل الحافز': '100,000 د.ع' },
            { 'المعيار / البند': 'تقييم الأداء العام (KPIs)', 'الحد الأدنى': '85%', 'الوزن النسبي': '40%', 'معدل الحافز': '150,000 د.ع' },
            { 'المعيار / البند': 'إنجاز المهام التشغيلية والميدانية', 'الحد الأدنى': '90%', 'الوزن النسبي': '30%', 'معدل الحافز': '120,000 د.ع' }
          ],
          tableDataEn: [
            { 'Criterion / Metric': 'Monthly Attendance Adherence', 'Min Score': '95%', 'Weight': '30%', 'Rate': '100,000 IQD' },
            { 'Criterion / Metric': 'General Performance Evaluation (KPIs)', 'Min Score': '85%', 'Weight': '40%', 'Rate': '150,000 IQD' },
            { 'Criterion / Metric': 'Field Operational Completion', 'Min Score': '90%', 'Weight': '30%', 'Rate': '120,000 IQD' }
          ]
        }
      ]
    },
    {
      id: 'notif-p-2',
      title: 'إشعار مالي: صدور قسيمة الراتب الرسمي لشهر آب 2026',
      titleEn: 'Financial Notice: August 2026 Official Payslip Released',
      sender: 'قسم الرواتب والعمليات المالية',
      senderEn: 'Payroll & Financial Operations',
      category: 'payroll',
      categoryLabelAr: 'كشف راتب',
      categoryLabelEn: 'Payroll Slip',
      date: '2026-08-01',
      time: '09:00 ص',
      timeEn: '09:00 AM',
      message: 'تم إيداع وتحويل مستحقات الراتب لشهر أغسطس 2026 في الحساب المصرفي المعتمد، متضمناً الراتب الأساسي ومخصصات الخدمة بعد استقطاع الضمان الاجتماعي.',
      messageEn: 'August 2026 salary credited to designated bank account with full allowances and social security deductions.',
      read: true,
      priority: 'normal',
      attachments: [
        {
          id: 'att-3',
          name: 'قسيمة_راتب_رسمية_آب_2026.pdf',
          nameEn: 'Official_Payslip_August_2026.pdf',
          type: 'pdf',
          size: '420 KB',
          refNo: 'VTS/PAY/2026-08/SLIP',
          docTitle: 'قسيمة راتب شهر آب / أغسطس 2026',
          docTitleEn: 'Official Monthly Payslip - August 2026',
          docDate: '2026-08-01',
          issuer: 'الشؤون المالية - قسم الرواتب',
          issuerEn: 'Finance Department - Payroll',
          contentSnippet: 'الراتب الأساسي: 900,000 د.ع\nبدل النقل والمظهر: 100,000 د.ع\nحافز الإنتاجية: 120,000 د.ع\nاستقطاع الضمان الاجتماعي (5%): 45,000 د.ع\nصافي الراتب المستلم: 1,075,000 د.ع',
          contentSnippetEn: 'Basic Salary: 900,000 IQD\nTransportation Allowance: 100,000 IQD\nPerformance Incentive: 120,000 IQD\nSocial Security Deduction: 45,000 IQD\nNet Disbursed Salary: 1,075,000 IQD'
        }
      ]
    },
    {
      id: 'notif-p-3',
      title: 'تحديث استمارة التأمين الطبي والخدمات العلاجية 2026',
      titleEn: 'Medical Insurance Policy Update & Clinic Network 2026',
      sender: 'وحدة الخدمات والمنافع الطبية',
      senderEn: 'Medical Benefits Unit',
      category: 'medical',
      categoryLabelAr: 'تأمين طبي',
      categoryLabelEn: 'Medical Insurance',
      date: '2026-07-28',
      time: '11:15 ص',
      timeEn: '11:15 AM',
      message: 'نود إعلامكم بتوسيع شبكة المستشفيات والمراكز التخصصية المتعاقد معها للتأمين الصحي الشامل لك ولأفراد عائلتك المستحقين.',
      messageEn: 'Comprehensive medical insurance provider network expanded. Access attached directory for updated clinics and co-pay guidelines.',
      read: true,
      priority: 'normal',
      attachments: [
        {
          id: 'att-4',
          name: 'دليل_شبكة_المستشفيات_والمراكز_الطبية_2026.pdf',
          nameEn: 'Medical_Clinics_Hospital_Directory_2026.pdf',
          type: 'pdf',
          size: '890 KB',
          refNo: 'VITAS/MED/DIR-2026/04',
          docTitle: 'دليل المستشفيات والمراكز الصحية المعتمدة',
          docTitleEn: 'Accredited Hospitals & Healthcare Directory',
          docDate: '2026-07-28',
          issuer: 'شركة التأمين الوطنية & فيتاس العراق',
          issuerEn: 'National Insurance Partner & VITAS Iraq',
          contentSnippet: 'المستشفيات المعتمدة: مستشفى بغداد الدولي، مستشفى القمة التخصصي، مستشفى الكفيل، مستشفى الفارابي.\nنسبة التغطية داخل الشبكة: 85% للعيادات الخارجية و 100% للعمليات والإقامة الجراحية.',
          contentSnippetEn: 'Covered Network: International Baghdad Hospital, Al-Qimma Medical, Al-Kafeel Specialist, Al-Farabi Clinic.\nIn-network coverage: 85% outpatient consultations and 100% inpatient surgical care.'
        }
      ]
    },
    {
      id: 'notif-p-4',
      title: 'تقرير التدقيق والمطابقة التشغيلية للفروع',
      titleEn: 'Branch Compliance & Operational Audit Summary',
      sender: 'إدارة الرقابة والامتثال الداخلي',
      senderEn: 'Internal Audit & Compliance',
      category: 'report',
      categoryLabelAr: 'تقرير تدقيق',
      categoryLabelEn: 'Audit Report',
      date: '2026-07-20',
      time: '02:00 م',
      timeEn: '02:00 PM',
      message: 'يرجى مراجعة توصيات التدقيق الدوري الخاصة بملفات العملاء وإجراءات الأرشفة والالتزام بضوابط مكافحة غسل الأموال وحماية بيانات المقترضين.',
      messageEn: 'Please review branch audit findings regarding file completeness, AML compliance checkpoints, and loan documentation standards.',
      read: true,
      priority: 'important',
      attachments: [
        {
          id: 'att-5',
          name: 'تقرير_المطابقة_والرقابة_الداخلية_Q2.pdf',
          nameEn: 'Internal_Audit_Compliance_Report_Q2.pdf',
          type: 'pdf',
          size: '2.1 MB',
          refNo: 'VITAS/AUD/REP-2026/Q2',
          docTitle: 'تقرير نتائج تدقيق الفروع والامتثال الربع الثاني 2026',
          docTitleEn: 'Branch Audit & Compliance Findings Q2 2026',
          docDate: '2026-07-20',
          issuer: 'لجنة التدقيق المستقلة',
          issuerEn: 'Independent Audit Committee',
          contentSnippet: 'المؤشر العام للالتزام: 94.2% ممتاز.\nالتوصية: استكمال التوقيعات الحية على ملحقات العقود وأرشفة وصولات الدفع اليومية رقمياً.',
          contentSnippetEn: 'Overall Compliance Index: 94.2% Excellent.\nKey Recommendation: Maintain complete digital archiving for loan disbursement receipts.'
        }
      ]
    },
    {
      id: 'notif-p-5',
      title: 'تعميم إداري: مواعيد وساعات الدوام الرسمي خلال العطلات',
      titleEn: 'Official Circular: Working Hours & Public Holiday Schedule',
      sender: 'الشؤون الإدارية & الموارد البشرية',
      senderEn: 'Admin Affairs & HR',
      category: 'decision',
      categoryLabelAr: 'تعميم إداري',
      categoryLabelEn: 'Administrative Circular',
      date: '2026-07-15',
      time: '08:30 ص',
      timeEn: '08:30 AM',
      message: 'نحيطكم علماً بمواعيد الدوام الرسمي المقررة، مع مراعاة جداول المناوبات في الفروع لضمان استمرارية تقديم خدمات القروض والتحصيلات للزبائن دون انقطاع.',
      messageEn: 'Official notification on revised branch opening schedules and roster rotation during upcoming public holiday season.',
      read: true,
      priority: 'normal',
      attachments: [
        {
          id: 'att-6',
          name: 'تعميم_أوقات_الدوام_الرسمي_رقم_14.pdf',
          nameEn: 'Official_Working_Hours_Circular_14.pdf',
          type: 'pdf',
          size: '350 KB',
          refNo: 'VITAS/ADM/CIR-2026/14',
          docTitle: 'تعميم إداري رقم 14 لسنة 2026 - تنظيم أوقات العمل',
          docTitleEn: 'Administrative Circular No. 14 (2026) - Business Hours',
          docDate: '2026-07-15',
          issuer: 'الإدارة العامة',
          issuerEn: 'General Administration',
          contentSnippet: 'يبدأ الدوام الرسمي من الساعة 8:00 صباحاً حتى 4:00 عصراً.\nتلتزم لجان الصندوق والمحصلين بإقفال الحسابات اليومية قبل الساعة 3:30 عصراً.',
          contentSnippetEn: 'Official business hours: 8:00 AM to 4:00 PM.\nTeller counters and field cashiers must reconcile daily transactions before 3:30 PM.'
        }
      ]
    }
  ]);

  // Fetch Live Routed Documents from Centralized Routing API with Scope
  const fetchRoutedDeliveries = () => {
    const empIdentifier = employee?.id || employee?.employeeId || employee?.badgeNo || '85';
    fetch(`/api/routing/employee/${encodeURIComponent(empIdentifier)}/notifications?scope=${activeScope}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRoutedDeliveries(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchRoutedDeliveries();
    const interval = setInterval(fetchRoutedDeliveries, 10000);
    return () => clearInterval(interval);
  }, [employee, activeScope]);

  // Convert Live Routed Documents into official notifications format
  const routedNotifications: MobileNotification[] = routedDeliveries.map(del => {
    const isContract = del.document_type === 'employment_contract' || String(del.document_id).startsWith('CON-');
    const isWetSig = (del.signature_mode || 'wet_signature') === 'wet_signature';
    const isElectronic = del.signature_mode === 'electronic_copy';
    const isEditable = Boolean(del.is_editable || del.document_type === 'appraisal' || del.document_type === 'evaluation');

    const docDate = del.created_at ? new Date(del.created_at).toISOString().split('T')[0] : '2026-10-17';
    const docTimeAr = del.created_at ? new Date(del.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }) : '11:00 ص';
    const docTimeEn = del.created_at ? new Date(del.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '11:00 AM';

    const empName = del.recipient_name || (isEn ? (employee?.fullNameEn || 'Dina Haider Qasim') : (employee?.fullName || 'دينا حيدر قاسم'));

    let parsedFormData: any = {};
    if (del.form_data) {
      try {
        parsedFormData = typeof del.form_data === 'string' ? JSON.parse(del.form_data) : del.form_data;
      } catch {}
    }

    return {
      id: `routed-${del.id}`,
      title: `${isContract ? 'عقد عمل معتمد' : del.document_title}: ${del.document_title}`,
      titleEn: `Official Document: ${del.document_title}`,
      sender: del.sender_name || 'إدارة الموارد البشرية - فيتاس العراق',
      senderEn: del.sender_name ? `${del.sender_name} (HR)` : 'HR Department - VITAS Iraq',
      category: isContract ? 'contract' : 'decision',
      categoryLabelAr: isContract ? (isWetSig ? 'عقد (توقيع حي)' : 'عقد إلكتروني') : (isWetSig ? 'مستند (توقيع حي)' : 'نسخة إلكترونية'),
      categoryLabelEn: isWetSig ? 'Live Signature' : 'Electronic Copy',
      date: docDate,
      time: docTimeAr,
      timeEn: docTimeEn,
      message: isWetSig
        ? `تم توجيه مستند رسمي يتطلب توقيعاً حياً (${del.document_title}) برقم مرجعي (${del.document_id}). متاح للطباعة والتوقيع.`
        : `تم توجيه نسخة إلكترونية (${del.document_title}) برقم مرجعي (${del.document_id}). الطباعة محظورة • قابلة للتعديل والاعتماد.`,
      messageEn: isWetSig
        ? `Official document requiring live signature (${del.document_title}) ref (${del.document_id}). Download and print permitted.`
        : `Electronic official copy (${del.document_title}). Printing restricted • Editable online.`,
      read: del.app_status === 'read',
      priority: isWetSig ? 'urgent' : 'important',
      attachments: [
        {
          id: `att-routed-${del.id}`,
          name: `${del.document_title}.pdf`,
          nameEn: `${del.document_title}_${del.document_id}.pdf`,
          type: 'pdf',
          size: '1.2 MB',
          refNo: del.document_id,
          docTitle: del.document_title,
          docTitleEn: `${del.document_title} - ${del.document_id}`,
          docDate: docDate,
          issuer: 'قسم الموارد البشرية - فيتاس العراق',
          issuerEn: 'Human Resources Department - VITAS Iraq',
          deliveryId: del.id,
          signatureMode: isWetSig ? 'wet_signature' : 'electronic_copy',
          isEditable,
          formData: parsedFormData,
          recipientName: del.recipient_name,
          branchName: del.branch_name,
          supervisorName: del.supervisor_name,
          contentSnippet: isWetSig
            ? `مستند رسمي معتمد صادر عن مؤسسة فيتاس العراق يتطلب توقيعاً حياً أصلياً.\nالعنوان: ${del.document_title}\nالرقم المرجعي: ${del.document_id}\nالمستلم: ${empName}\nالفرع: ${del.branch_name || 'الفرع الرئيسي'}\nالحالة: معتمد للتوقيع الحي والطباعة الأصولية.`
            : `نسخة إلكترونية معتمدة صادرة عن مؤسسة فيتاس العراق (الطباعة محظورة قانونياً).\nالعنوان: ${del.document_title}\nالرقم المرجعي: ${del.document_id}\nالمستلم: ${empName}\nالحالة: نموذج إلكتروني قابل للتعديل والمصادقة المباشرة.`,
          contentSnippetEn: isWetSig
            ? `Official verified document issued by VITAS Iraq requiring live wet signature.\nTitle: ${del.document_title}\nRef No: ${del.document_id}\nRecipient: ${empName}\nStatus: Verified for Live Printing & Physical Signature.`
            : `Electronic certified document issued by VITAS Iraq (Printing Strictly Restricted).\nTitle: ${del.document_title}\nRef: ${del.document_id}\nRecipient: ${empName}\nStatus: Verified Electronic Form for Online Collaboration.`
        }
      ]
    };
  });

  const allNotifications: MobileNotification[] = [
    ...routedNotifications,
    ...portalNotifications.filter(pn => !routedNotifications.some(rn => rn.id === pn.id))
  ];

  const filteredNotifications = allNotifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'attachments' && (!n.attachments || n.attachments.length === 0)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inTitle = (n.title && n.title.toLowerCase().includes(q)) || (n.titleEn && n.titleEn.toLowerCase().includes(q));
      const inMsg = (n.message && n.message.toLowerCase().includes(q)) || (n.messageEn && n.messageEn.toLowerCase().includes(q));
      const inSender = (n.sender && n.sender.toLowerCase().includes(q)) || (n.senderEn && n.senderEn.toLowerCase().includes(q));
      const inAtt = n.attachments?.some(a => 
        a.name.toLowerCase().includes(q) || 
        (a.nameEn && a.nameEn.toLowerCase().includes(q)) || 
        (a.refNo && a.refNo.toLowerCase().includes(q))
      );
      return inTitle || inMsg || inSender || inAtt;
    }
    return true;
  });

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    setPortalNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const targetDel = routedDeliveries.find(d => `routed-${d.id}` === id);
    if (targetDel) {
      setRoutedDeliveries(prev => prev.map(d => d.id === targetDel.id ? { ...d, app_status: 'read' } : d));
    }
  };

  const handleMarkAllAsRead = () => {
    allNotifications.forEach(n => {
      if (!n.read) handleMarkAsRead(n.id);
    });
  };

  const handleOpenPreview = (att: MobileAttachment, notif: MobileNotification) => {
    if (att.deliveryId) {
      handleMarkAsRead(`routed-${att.deliveryId}`);
      // Record access in backend
      fetch(`/api/routing/deliveries/${att.deliveryId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee?.id || employee?.employeeId || employee?.badgeNo || '85',
          documentId: att.refNo,
          action: 'view'
        })
      }).catch(() => {});
    }

    // Populate form data if editable
    if (att.formData) {
      const empIn = att.formData.employee_inputs || {};
      const supIn = att.formData.supervisor_inputs || {};
      setFormInputs({
        selfRating: empIn.selfRating || 5,
        achievements: empIn.achievements || '',
        employeeNotes: empIn.employeeNotes || '',
        supervisorRating: supIn.supervisorRating || 5,
        supervisorComments: supIn.supervisorComments || '',
        supervisorDecision: supIn.supervisorDecision || 'approved'
      });
    } else {
      setFormInputs({
        selfRating: 5,
        achievements: '',
        employeeNotes: '',
        supervisorRating: 5,
        supervisorComments: '',
        supervisorDecision: 'approved'
      });
    }

    setPreviewData({
      attachment: att,
      notifTitle: isEn ? (notif.titleEn || notif.title) : notif.title,
      notifDate: notif.date
    });
  };

  // Collaborative electronic form save
  const handleSaveFormData = async (role: 'employee' | 'supervisor') => {
    if (!previewData?.attachment?.deliveryId) return;
    setIsSavingForm(true);
    setFormSaveSuccess(null);
    try {
      const inputs = role === 'employee' 
        ? {
            selfRating: formInputs.selfRating,
            achievements: formInputs.achievements,
            employeeNotes: formInputs.employeeNotes
          }
        : {
            supervisorRating: formInputs.supervisorRating,
            supervisorComments: formInputs.supervisorComments,
            supervisorDecision: formInputs.supervisorDecision
          };

      const res = await fetch(`/api/routing/deliveries/${previewData.attachment.deliveryId}/form-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee?.id || employee?.employeeId || employee?.badgeNo || '85',
          userRole: role,
          inputs
        })
      });
      const data = await res.json();
      if (data.success) {
        setFormSaveSuccess(isEn ? 'Changes saved successfully!' : 'تم حفظ التعديلات بنجاح!');
        setTimeout(() => setFormSaveSuccess(null), 3500);
        fetchRoutedDeliveries();
      } else {
        alert(data.error || 'Failed to save');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleDownloadAttachment = (att: MobileAttachment) => {
    const mimeType = att.type === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';

    const fileName = isEn ? (att.nameEn || att.name) : att.name;
    const docTitle = isEn ? (att.docTitleEn || att.docTitle) : att.docTitle;
    const issuer = isEn ? (att.issuerEn || att.issuer) : att.issuer;
    const bodyContent = isEn ? (att.contentSnippetEn || att.contentSnippet) : att.contentSnippet;

    let contentText = `=== VITAS IRAQ OFFICIAL HR DOCUMENT ===\nDocument: ${fileName}\nTitle: ${docTitle}\nRef: ${att.refNo || 'VITAS/HR/2026'}\nDate: ${att.docDate || new Date().toISOString().split('T')[0]}\nIssuer: ${issuer}\n\n`;

    if (att.tableData && att.tableData.length > 0) {
      contentText += '--- DATA TABLE ---\n';
      const tbl = isEn && att.tableDataEn ? att.tableDataEn : att.tableData;
      contentText += JSON.stringify(tbl, null, 2);
    } else {
      contentText += bodyContent || 'Verified by VITAS Iraq HRMS Enterprise Portal.';
    }

    const blob = new Blob([contentText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4 pb-20 animate-in fade-in">
      {/* Top Header Matching ESS Portal */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center shadow-xs">
            <Bell className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <h1 className={`text-base font-black leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isEn ? 'Notifications & Official Attachments' : 'التنبيهات والمرفقات الرسمية'}
            </h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isEn 
                ? 'View all administrative decisions, payslips, and official attached documents issued to you.' 
                : 'الاطلاع على جميع القرارات الإدارية، كشوفات الرواتب، والمستندات المرفقة الصادرة لك.'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-teal-600/10 hover:bg-teal-600/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isEn ? 'Mark All Read' : 'تحديد الكل كمقروء'}</span>
          </button>
        )}
      </div>

      {/* Role-based Workflow Scope Selector (Supervisor & Branch Manager) */}
      {(isSupervisor || isBranchManager) && (
        <div className={`p-1.5 rounded-2xl border flex items-center gap-1 shadow-xs ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setActiveScope('own')}
            className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeScope === 'own'
                ? 'bg-teal-600 text-white shadow-xs'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>👤</span>
            <span>{isEn ? 'My Documents' : 'مستنداتي الشخصية'}</span>
          </button>

          {isSupervisor && (
            <button
              type="button"
              onClick={() => setActiveScope('subordinates')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeScope === 'subordinates'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>{isEn ? 'Team (Supervisor)' : 'مستندات فريقي (مشرف)'}</span>
            </button>
          )}

          {isBranchManager && (
            <button
              type="button"
              onClick={() => setActiveScope('branch_wet_signature')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeScope === 'branch_wet_signature'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>{isEn ? 'Branch (Wet Sig Only)' : 'الفرع (توقيع حي ورقي)'}</span>
            </button>
          )}
        </div>
      )}

      {/* Filter Chips Matching ESS Portal */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-teal-600 text-white shadow-sm'
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isEn ? `All (${allNotifications.length})` : `الكل (${allNotifications.length})`}
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
            filter === 'unread'
              ? 'bg-teal-600 text-white shadow-sm'
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {isEn ? `Unread (${unreadCount})` : `غير مقروءة (${unreadCount})`}
        </button>

        <button
          onClick={() => setFilter('attachments')}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            filter === 'attachments'
              ? 'bg-teal-600 text-white shadow-sm'
              : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Paperclip className="w-3.5 h-3.5" />
          <span>
            {isEn 
              ? `Has Attachments (${allNotifications.filter(n => n.attachments && n.attachments.length > 0).length})` 
              : `تحتوي مرفقات (${allNotifications.filter(n => n.attachments && n.attachments.length > 0).length})`}
          </span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-slate-400 ${
          isEn ? 'left-3' : 'right-3'
        }`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? 'Search notifications or reference numbers...' : 'بحث في التنبيهات أو أرقام المرفقات...'}
          className={`w-full py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
            isEn ? 'pl-8 pr-3' : 'pr-8 pl-3'
          } ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        />
      </div>

      {/* Notifications List Cards */}
      <div className="space-y-3.5">
        {filteredNotifications.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center ${
            isDark ? 'bg-[#131b2e] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
          }`}>
            <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
            }`}>
              <Bell className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold">
              {isEn ? 'No notifications or attachments matching your search' : 'لا توجد تنبيهات أو مرفقات تطابق البحث'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const notifTitle = isEn ? (notif.titleEn || notif.title) : notif.title;
            const notifMessage = isEn ? (notif.messageEn || notif.message) : notif.message;
            const notifCategory = isEn ? notif.categoryLabelEn : notif.categoryLabelAr;
            const notifSender = isEn ? (notif.senderEn || notif.sender) : notif.sender;
            const notifTime = isEn ? (notif.timeEn || notif.time) : notif.time;

            return (
              <div
                key={notif.id}
                className={`p-4 rounded-2xl border transition-all ${
                  !notif.read
                    ? isDark
                      ? 'bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border-teal-500/40 shadow-lg shadow-teal-950/20'
                      : 'bg-teal-50/70 border-teal-300 shadow-sm'
                    : isDark
                      ? 'bg-slate-900/70 border-slate-800 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                {/* Card Meta Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                      notif.category === 'decision'
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        : notif.category === 'contract'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : notif.category === 'payroll'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : notif.category === 'medical'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}>
                      {notifCategory}
                    </span>

                    {notif.priority === 'urgent' && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
                        {isEn ? 'Urgent' : 'عاجل'}
                      </span>
                    )}

                    <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      • {notifSender}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {notif.date} | {notifTime}
                    </span>
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        title={isEn ? 'Mark as read' : 'تحديد كمقروء'}
                        className="p-1 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-teal-400 transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className={`text-xs sm:text-sm font-black mb-1.5 leading-snug ${
                  !notif.read ? (isDark ? 'text-white' : 'text-slate-950') : (isDark ? 'text-slate-200' : 'text-slate-800')
                }`}>
                  {notifTitle}
                </h3>
                <p className={`text-[11px] leading-relaxed mb-3 font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  {notifMessage}
                </p>

                {/* Official Verified Attachments Section */}
                {notif.attachments && notif.attachments.length > 0 && (
                  <div className={`pt-2.5 mt-2 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Paperclip className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="text-[11px] font-black text-teal-700 dark:text-teal-400">
                        {isEn ? `Official Verified Attachments (${notif.attachments.length})` : `المرفقات الرسمية المعتمدة (${notif.attachments.length})`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {notif.attachments.map((att) => {
                        const attName = isEn ? (att.nameEn || att.name) : att.name;

                        return (
                          <div
                            key={att.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                              isDark 
                                ? 'bg-slate-900/90 border-slate-700/80 hover:border-teal-500/50' 
                                : 'bg-slate-50 border-slate-300 hover:border-teal-400 shadow-2xs'
                            }`}
                          >
                            {/* File Icon & Info */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                att.type === 'pdf'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : 'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {att.type === 'pdf' ? (
                                  <FileText className="w-4 h-4" />
                                ) : (
                                  <FileSpreadsheet className="w-4 h-4" />
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className={`text-xs font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {attName}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                  <span className={`text-[9px] font-mono truncate font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {att.type.toUpperCase()} • {att.size} {att.refNo && `• ${att.refNo}`}
                                  </span>
                                  {att.signatureMode === 'electronic_copy' ? (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-0.5">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>{isEn ? 'No Print • Editable' : 'الطباعة محظورة • قابل للتعديل'}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                                      <Printer className="w-2.5 h-2.5" />
                                      <span>{isEn ? 'Live Signature • Printable' : 'توقيع حي • متاح للطباعة'}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Preview & Download */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleOpenPreview(att, notif)}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                              >
                                <Eye className="w-3 h-3" />
                                <span>{isEn ? 'Preview' : 'معاينة'}</span>
                              </button>

                              <button
                                onClick={() => handleDownloadAttachment(att)}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  isDark 
                                    ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700' 
                                    : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                                }`}
                                title={isEn ? 'Download' : 'تحميل'}
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Official Verified Document / Attachment Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className={`w-full max-w-lg max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-[#0f172a] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-3.5 border-b flex items-center justify-between gap-2 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  previewData.attachment.type === 'pdf' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {previewData.attachment.type === 'pdf' ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <h3 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isEn ? (previewData.attachment.nameEn || previewData.attachment.name) : previewData.attachment.name}
                  </h3>
                  <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {isEn 
                      ? (previewData.attachment.docTitleEn || previewData.notifTitle) 
                      : (previewData.attachment.docTitle || previewData.notifTitle)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Print button based on signatureMode */}
                {previewData.attachment.signatureMode === 'wet_signature' ? (
                  <button
                    onClick={() => {
                      if (previewData.attachment.deliveryId) {
                        fetch(`/api/routing/deliveries/${previewData.attachment.deliveryId}/access`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            employeeId: employee?.id || employee?.employeeId || '85',
                            action: 'print'
                          })
                        }).catch(() => {});
                      }
                      window.print();
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    title={isEn ? 'Print for Live Wet Signature' : 'طباعة المستند الورقي للتوقيع الحي باليد'}
                  >
                    <Printer className="w-3 h-3" />
                    <span>{isEn ? 'Print' : 'طباعة'}</span>
                  </button>
                ) : (
                  <div
                    className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 cursor-not-allowed select-none opacity-80"
                    title={isEn ? 'Printing is strictly disabled for electronic copy documents' : 'الطباعة محظورة تماماً للنسخ الإلكترونية المعتمدة'}
                  >
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>{isEn ? 'Print Locked' : 'الطباعة مقفلة'}</span>
                  </div>
                )}

                <button
                  onClick={() => handleDownloadAttachment(previewData.attachment)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <Download className="w-3 h-3" />
                  <span>{isEn ? 'Download' : 'تحميل'}</span>
                </button>
                <button
                  onClick={() => setPreviewData(null)}
                  className={`p-1 rounded-lg cursor-pointer ${
                    isDark 
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Official Letterhead Paper View */}
            <div className={`p-4 overflow-y-auto flex-1 relative ${isDark ? 'bg-[#080d1a]' : 'bg-slate-100'}`}>
              <div className={`p-5 rounded-2xl shadow-xl border relative overflow-hidden ${
                isDark ? 'bg-[#0f172a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                {/* Official Watermark */}
                <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-[0.03]">
                  <p className="text-5xl font-black uppercase rotate-[-25deg] tracking-widest text-center">
                    VITAS IRAQ<br />OFFICIAL
                  </p>
                </div>

                {/* Letterhead Header */}
                <div className="border-b-2 border-teal-500/40 pb-3 mb-4">
                  <div className={`flex items-center justify-between ${isEn ? 'text-left' : 'text-right'}`}>
                    <div>
                      <h4 className="text-sm font-black text-teal-600 dark:text-teal-400">
                        {isEn ? 'VITAS IRAQ MICROFINANCE INSTITUTION' : 'مؤسسة فيتاس العراق للتمويل الأصغر'}
                      </h4>
                      <p className="text-[9px] font-mono tracking-wider text-slate-400">
                        VITAS IRAQ MICROFINANCE - HRMS
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                        {isEn 
                          ? (previewData.attachment.issuerEn || 'Human Resources & Administrative Affairs') 
                          : (previewData.attachment.issuer || 'قسم الموارد البشرية والشؤون الإدارية')}
                      </p>
                    </div>

                    <div className={`font-mono text-[10px] space-y-0.5 ${isEn ? 'text-right' : 'text-left'}`}>
                      <p><span className="text-slate-400">{isEn ? 'Ref: ' : 'الرقم: '}</span><span className="font-bold text-teal-500">{previewData.attachment.refNo || 'VITAS/HR/2026'}</span></p>
                      <p><span className="text-slate-400">{isEn ? 'Date: ' : 'التاريخ: '}</span><span className="font-bold">{previewData.attachment.docDate || previewData.notifDate}</span></p>
                      <p><span className="text-slate-400">{isEn ? 'Status: ' : 'الحالة: '}</span><span className="font-bold text-emerald-500">{isEn ? 'Verified & Official' : 'معتمد ورسمي'}</span></p>
                    </div>
                  </div>
                </div>

                {/* Document Title */}
                <div className="text-center my-4">
                  <h2 className="text-xs sm:text-sm font-black underline underline-offset-4 decoration-teal-500">
                    {isEn 
                      ? (previewData.attachment.docTitleEn || previewData.attachment.nameEn || previewData.attachment.name)
                      : (previewData.attachment.docTitle || previewData.attachment.name)}
                  </h2>
                </div>

                {/* Document Content */}
                <div className="space-y-3 text-xs leading-relaxed">
                  {previewData.attachment.tableData && previewData.attachment.tableData.length > 0 ? (
                    <div className="mt-2 border border-slate-300 dark:border-slate-700 rounded-xl overflow-x-auto">
                      {(() => {
                        const tbl = isEn && previewData.attachment.tableDataEn ? previewData.attachment.tableDataEn : previewData.attachment.tableData;
                        return (
                          <table className={`w-full text-[11px] ${isEn ? 'text-left' : 'text-right'}`}>
                            <thead className={isDark ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-teal-700'}>
                              <tr>
                                {Object.keys(tbl[0]).map((col, idx) => (
                                  <th key={idx} className="p-2 font-bold border-b border-slate-300 dark:border-slate-700 whitespace-nowrap">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {tbl.map((row, rIdx) => (
                                <tr key={rIdx} className={rIdx % 2 === 0 ? (isDark ? 'bg-slate-900/40' : 'bg-white') : (isDark ? 'bg-slate-900/80' : 'bg-slate-50')}>
                                  {Object.values(row).map((val, cIdx) => (
                                    <td key={cIdx} className={`p-2 whitespace-nowrap font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                      {String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="space-y-2 whitespace-pre-line text-justify leading-relaxed text-[11px]">
                      {isEn 
                        ? (previewData.attachment.contentSnippetEn || 'Official memorandum and verified record issued by VITAS Iraq Human Resources.') 
                        : (previewData.attachment.contentSnippet || 'نص الوثيقة والمذكرة الرسمية المعتمدة من إدارة الموارد البشرية بمؤسسة فيتاس العراق.')}
                    </div>
                  )}
                </div>

                {/* Collaborative Editable Form Section (For Appraisals & Electronic Forms) */}
                {previewData.attachment.isEditable && (
                  <div className="my-5 p-4 rounded-2xl border bg-indigo-50/40 dark:bg-slate-900/90 border-indigo-200 dark:border-indigo-900/50 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2.5 border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                          {isEn ? 'Collaborative Interactive Form (Editable Online)' : 'استمارة تفاعلية مشتركة (قابلة للتعديل والاعتماد الإلكتروني)'}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{isEn ? 'Printing Restricted' : 'الطباعة محظورة أصولياً'}</span>
                      </span>
                    </div>

                    {formSaveSuccess && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                        <Check className="w-4 h-4" />
                        <span>{formSaveSuccess}</span>
                      </div>
                    )}

                    {/* Employee Self-Appraisal Section */}
                    <div className="space-y-3 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>👤</span>
                          <span>{isEn ? '1. Employee Self-Appraisal & Notes' : '1. تقييم الموظف الذاتي والملاحظات'}</span>
                        </h5>
                        <span className="text-[10px] font-mono font-bold text-teal-600">
                          {previewData.attachment.recipientName || employee?.fullName}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {isEn ? 'Self Rating (Punctuality, Quality & Commitment):' : 'التقييم الذاتي للالتزام وجودة العمل:'}
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFormInputs(prev => ({ ...prev, selfRating: star }))}
                              className={`p-1 rounded-lg transition cursor-pointer ${
                                formInputs.selfRating >= star ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          ))}
                          <span className="text-xs font-mono font-bold text-amber-500 mr-2">
                            {formInputs.selfRating} / 5
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {isEn ? 'Key Achievements & Completed Tasks:' : 'أبرز الإنجازات المحققة والمهام المنفذة:'}
                        </label>
                        <textarea
                          rows={2}
                          value={formInputs.achievements}
                          onChange={(e) => setFormInputs(prev => ({ ...prev, achievements: e.target.value }))}
                          placeholder={isEn ? 'Write achievements...' : 'اكتب تفاصيل إنجازاتك خلال هذه الفترة...'}
                          className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {isEn ? 'Employee Notes / Training Goals:' : 'ملاحظات الموظف والأهداف التدريبية المقترحة:'}
                        </label>
                        <textarea
                          rows={2}
                          value={formInputs.employeeNotes}
                          onChange={(e) => setFormInputs(prev => ({ ...prev, employeeNotes: e.target.value }))}
                          placeholder={isEn ? 'Write training goals or suggestions...' : 'اكتب المقترحات أو الاحتياجات التدريبية...'}
                          className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          disabled={isSavingForm}
                          onClick={() => handleSaveFormData('employee')}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition active:scale-95"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Save Employee Inputs' : 'حفظ مدخلات الموظف'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Direct Supervisor Evaluation Section */}
                    <div className="space-y-3 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <span>👥</span>
                          <span>{isEn ? '2. Direct Supervisor Evaluation & Recommendation' : '2. تقييم المشرف المباشر والتوصيات'}</span>
                        </h5>
                        <span className="text-[10px] font-mono font-bold text-indigo-600">
                          {isEn ? 'Supervisor Review' : 'مراجعة المشرف'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {isEn ? 'Supervisor Assessment Score:' : 'درجة تقييم المشرف المباشر للإنتاجية:'}
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFormInputs(prev => ({ ...prev, supervisorRating: star }))}
                              className={`p-1 rounded-lg transition cursor-pointer ${
                                formInputs.supervisorRating >= star ? 'text-indigo-500' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          ))}
                          <span className="text-xs font-mono font-bold text-indigo-600 mr-2">
                            {formInputs.supervisorRating} / 5
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {isEn ? 'Supervisor Comments & Development Feedback:' : 'ملاحظات المشرف المباشر وتوجيهات التطوير:'}
                        </label>
                        <textarea
                          rows={2}
                          value={formInputs.supervisorComments}
                          onChange={(e) => setFormInputs(prev => ({ ...prev, supervisorComments: e.target.value }))}
                          placeholder={isEn ? 'Supervisor notes and recommendations...' : 'اكتب تعليق المشرف وتوصياته المهنية...'}
                          className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          {isEn ? 'Supervisor Decision / Action:' : 'قرار وتوصية المشرف:'}
                        </label>
                        <select
                          value={formInputs.supervisorDecision}
                          onChange={(e) => setFormInputs(prev => ({ ...prev, supervisorDecision: e.target.value }))}
                          className={`w-full p-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="approved">{isAr ? 'مصادقة واعتماد التقييم رسمياً' : 'Formally Approved'}</option>
                          <option value="promotion_recommended">{isAr ? 'يوصى بالترقية أو منح مكافأة تشجيعية' : 'Recommended for Promotion / Bonus'}</option>
                          <option value="needs_training">{isAr ? 'إدراج في خطة التدريب وتحسين الأداء' : 'Needs Performance Improvement Plan'}</option>
                        </select>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          disabled={isSavingForm}
                          onClick={() => handleSaveFormData('supervisor')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition active:scale-95"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Save Supervisor Evaluation' : 'حفظ تقييم المشرف المباشر'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Wet Signature Physical Blocks (Only for wet_signature documents) */}
                {previewData.attachment.signatureMode === 'wet_signature' && (
                  <div className="my-5 p-4 rounded-2xl border-2 border-dashed border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Printer className="w-4 h-4" />
                        <span>{isAr ? 'خانات التوقيع الحي الورقي (مطلوبة بعد الطباعة)' : 'Physical Wet Signature Blocks'}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                        {isAr ? 'نسخة أصلية حية' : 'Live Original'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70">
                        <p className="text-[10px] font-bold text-slate-500">{isAr ? 'توقيع الموظف المعني' : 'Employee Signature'}</p>
                        <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                        <p className="text-[9px] text-slate-400 mt-1 font-mono">{previewData.attachment.recipientName || 'التوقيع الحي'}</p>
                      </div>

                      <div className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70">
                        <p className="text-[10px] font-bold text-slate-500">{isAr ? 'المشرف المباشر' : 'Direct Supervisor'}</p>
                        <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                        <p className="text-[9px] text-slate-400 mt-1 font-mono">{previewData.attachment.supervisorName || 'توقيع المشرف'}</p>
                      </div>

                      <div className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70">
                        <p className="text-[10px] font-bold text-slate-500">{isAr ? 'مدير المكتب / الفرع' : 'Branch Manager'}</p>
                        <div className="h-10 border-b border-dashed border-slate-400 mt-2" />
                        <p className="text-[9px] text-slate-400 mt-1 font-mono">{isAr ? 'المصادقة والأرشفة' : 'Branch Verification'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Official Stamps & Signatures Footer */}
                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400">
                      {isEn ? 'Internal Audit & Governance' : 'قسم التدقيق الداخلي والحوكمة'}
                    </p>
                    <p className="text-[10px] font-extrabold text-teal-600 mt-0.5">
                      {isEn ? 'Digitally Verified Successfully' : 'مصادق إلكترونياً بنجاح'}
                    </p>
                  </div>

                  {/* Stamp Graphic */}
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-teal-500/80 p-0.5 flex items-center justify-center rotate-[-8deg] select-none text-center">
                    <div className="w-full h-full rounded-full border border-teal-500/60 flex flex-col items-center justify-center p-0.5 text-[7px] font-black text-teal-500 leading-tight">
                      <span>{isEn ? 'VITAS IRAQ' : 'فيتاس العراق'}</span>
                      <span className="my-0.5">{isEn ? '★ VERIFIED ★' : '★ معتمد ★'}</span>
                      <span>{isEn ? 'HUMAN RESOURCES' : 'الموارد البشرية'}</span>
                    </div>
                  </div>

                  <div className={isEn ? 'text-right' : 'text-left'}>
                    <p className="text-[9px] font-bold text-slate-400">
                      {isEn ? 'Managing Director / Authorized' : 'المدير العام / المفوض'}
                    </p>
                    <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 mt-0.5">
                      {isEn ? 'VITAS Iraq Institution' : 'مؤسسة فيتاس العراق'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};