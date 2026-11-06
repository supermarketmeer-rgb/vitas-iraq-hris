import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { CompanyNews } from '../components/CompanyNews';
import {
  localizeNotificationTitle,
  localizeNotificationMessage,
  localizeTimestamp
} from '../utils/nameHelper';

interface HandbookDoc {
  id: string;
  title: string;
  category: 'دليل وسياسات' | 'كتيب الموظف' | 'التوظيف والموارد البشرية' | 'الأمان وتكنولوجيا المعلومات' | 'اللوائح القانونية';
  fileName: string;
  fileSize: string;
  uploadDate: string;
  version: string;
  description: string;
}

interface SupportTicket {
  id: number | string;
  employee_id: number | string;
  subject: string;
  category: 'HR Query' | 'IT Support' | 'Facilities' | 'Other';
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  ticket_type?: 'طلب' | 'شكوى' | 'استفسار' | 'دعم فني';
  priority?: 'عادية' | 'متوسطة' | 'عاجلة';
  hr_response?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  full_name_ar?: string;
  full_name_en?: string;
  emp_code?: string;
  department?: string;
  branch?: string;
}

interface FAQItem {
  id: string;
  category: 'payroll' | 'leave' | 'hr' | 'it';
  categoryAr: string;
  categoryEn: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
}

export const Category11SupportHelpView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    currentUser,
    notifications,
    markNotificationRead,
    markAllNotificationsAsRead,
    theme,
    toggleTheme,
    language,
    toggleLanguage,
    t
  } = useApp();

  const isDark = theme === 'dark';
  const isEn = language === 'en';

  // --- Support Tickets State ---
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketType, setTicketType] = useState<'طلب' | 'شكوى' | 'استفسار' | 'دعم فني'>('طلب');
  const [ticketCategory, setTicketCategory] = useState<'HR Query' | 'IT Support' | 'Facilities' | 'Other'>('HR Query');
  const [ticketPriority, setTicketPriority] = useState<'عادية' | 'متوسطة' | 'عاجلة'>('متوسطة');
  const [ticketSent, setTicketSent] = useState(false);

  // --- Admin Agent Desk Tickets State ---
  const [adminTickets, setAdminTickets] = useState<SupportTicket[]>([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'Open' | 'In Progress' | 'Resolved'>('all');
  const [ticketCatFilter, setTicketCatFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isUpdatingTicket, setIsUpdatingTicket] = useState(false);

  // --- Live Chat State ---
  const [activeChatChannel, setActiveChatChannel] = useState<'hr' | 'it' | 'branches'>('hr');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, { sender: string; text: string; time: string }[]>>({
    hr: [
      { sender: 'شؤون الموظفين (HR)', text: 'أهلاً بك! يمكنك إرسال أي استفسار يخص الرواتب، الإجازات، أو التقييم السنوي هنا.', time: '09:00 ص' }
    ],
    it: [
      { sender: 'الدعم الفني والتقني (IT)', text: 'مرحباً، فريق تكنولوجيا المعلومات جاهز لمساعدتك في أي استفسار يخص الحسابات والأنظمة.', time: '09:05 ص' }
    ],
    branches: [
      { sender: 'إدارة الفروع (Operations)', text: 'قناة التنسيق اللوجستي وشؤون الفروع الـ 16 مفتوحة للاستفسارات الرسمية.', time: '09:10 ص' }
    ]
  });

  // --- Knowledge Base & FAQ State ---
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState<'all' | 'payroll' | 'leave' | 'hr' | 'it'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [isAddFaqModalOpen, setIsAddFaqModalOpen] = useState(false);
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newFaqCat, setNewFaqCat] = useState<'payroll' | 'leave' | 'hr' | 'it'>('hr');

  const [faqList, setFaqList] = useState<FAQItem[]>([
    {
      id: 'faq-1',
      category: 'payroll',
      categoryAr: 'الرواتب والمالية',
      categoryEn: 'Payroll & Finance',
      questionAr: 'متى يتم تحويل الراتب الشهري وكيف أستخرج كشف الراتب (Payslip)؟',
      questionEn: 'When is monthly payroll disbursed and how do I download my payslip?',
      answerAr: 'يتم صرف وتحويل الرواتب شهرياً قبل نهاية الشهر بـ 2 إلى 3 أيام عمل. يمكنك استخراج كشف راتبك مباشرة عبر شاشة الرواتب أو تطبيق الموبايل وطباعته بصيغة PDF معتمدة.',
      answerEn: 'Salaries are disbursed 2-3 working days before month end. Payslips can be downloaded and printed directly from the Payroll view or Mobile App.'
    },
    {
      id: 'faq-2',
      category: 'payroll',
      categoryAr: 'الرواتب والمالية',
      categoryEn: 'Payroll & Finance',
      questionAr: 'ما هي معايير احتساب مخصصات الزوجية والأطفال وفق القانون؟',
      questionEn: 'How are spouse and child allowances calculated under Iraqi law?',
      answerAr: 'تُمنح مخصصات الزوجية (15,200 دينار) للموظف المتزوج وتُحجب عن العازب. للموظفة المتزوجة يُطبق شرط المادة 12 من قانون ضريبة الدخل والضمان. وتُمنح مخصصات الأطفال لمن هم دون سن 18 عاماً.',
      answerEn: 'Spouse allowance is granted to married employees. For married female employees, Article 12 of the Iraqi Income Tax Law applies. Child allowances cover dependents under 18.'
    },
    {
      id: 'faq-3',
      category: 'leave',
      categoryAr: 'الإجازات والدوام',
      categoryEn: 'Leaves & Attendance',
      questionAr: 'ما هو الحد الأدنى للرصيد وكيف أقدم على إجازة سنوية أو مرضية؟',
      questionEn: 'How do I apply for annual or sick leave and check balances?',
      answerAr: 'يستحق الموظف 21 يوماً إجازة سنوية سنوياً تُحسب بمعدل 1.75 يوم شهرياً. يُقدم الطلب عبر بوابة الموظف (ESS) أو تطبيق الموبايل قبل 48 ساعة على الأقل للإجازة الاعتيادية للمصادقة من المدير المباشر.',
      answerEn: 'Employees earn 21 days annual leave (1.75 days/month). Requests should be submitted via ESS or Mobile App at least 48 hours in advance for supervisor approval.'
    },
    {
      id: 'faq-4',
      category: 'leave',
      categoryAr: 'الإجازات والدوام',
      categoryEn: 'Leaves & Attendance',
      questionAr: 'كيف يتعامل النظام مع التأخير أو نسيان تسجيل البصمة؟',
      questionEn: 'How does the system handle late check-ins or missed biometric punches?',
      answerAr: 'يسمح النظام بفترة سماح 15 دقيقة صباحاً. في حال نسيان البصمة، يمكن للموظف تقديم "طلب استثناء حضور" أو توجيه تذكرة عبر شاشة الدعم لاعتماد البصمة يدوياً بعد موافقة مدير الفرع.',
      answerEn: 'A 15-minute morning grace period applies. If a punch is missed, submit an Attendance Exception Request via ESS for Branch Manager validation.'
    },
    {
      id: 'faq-5',
      category: 'hr',
      categoryAr: 'شؤون الموظفين',
      categoryEn: 'HR & Policies',
      questionAr: 'كيف أطلب وثيقة لمن يهمه الأمر أو شهادة راتب موجهة لجهة رسمية؟',
      questionEn: 'How do I request an official To Whom It May Concern letter or salary certificate?',
      answerAr: 'يمكنك تقديم الطلب مباشرة عبر تبويب "تذاكر الدعم والطلبات" في هذه الصفحة واختيار نوع الطلب (طلب إداري)، وسيتم تجهيز الوثيقة موقعة ومختومة وإرسالها إلكترونياً أو بالبريد الداخلي خلال 24 ساعة.',
      answerEn: 'Submit an Administrative Request through this Support Desk portal. The sealed document will be processed and dispatched within 24 hours.'
    },
    {
      id: 'faq-6',
      category: 'it',
      categoryAr: 'الدعم التقني والأنظمة',
      categoryEn: 'IT & Systems',
      questionAr: 'كيف أقوم بتغيير كلمة المرور أو تفعيل تسجيل الدخول بالبصمة على الموبايل؟',
      questionEn: 'How do I change my password or activate biometric login on mobile?',
      answerAr: 'يمكن تغيير كلمة المرور عبر تبويب "إعدادات الحساب والملف الشخصي". ولتفعيل بصمة الوجه أو الأصبع على الموبايل، اضغط على زر تفعيل البصمة في شاشة الدخول بتطبيق الموبايل.',
      answerEn: 'Change your password in Profile Settings. Biometric Face/Fingerprint login can be toggled on the login screen of the Mobile App.'
    }
  ]);

  // --- User Guide Center State ---
  const [selectedGuideIndex, setSelectedGuideIndex] = useState(0);

  // --- Employee Handbook Reader State ---
  const [selectedHandbookChapter, setSelectedHandbookChapter] = useState(1);

  // --- Notification Settings State ---
  const [notifSettings, setNotifSettings] = useState({
    emailAlerts: true,
    desktopPopups: true,
    mobilePush: true,
    soundAlerts: true,
    eventLeaves: true,
    eventPayroll: true,
    eventTickets: true,
    eventAppraisals: true,
    eventAnnouncements: true
  });
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // --- Profile Settings State ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordToast, setPasswordToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // --- Nexus Hub State ---
  const [pingLatency, setPingLatency] = useState<number | null>(18);
  const [isPinging, setIsPinging] = useState(false);

  // --- Document / Handbook State ---
  const [documents, setDocuments] = useState<HandbookDoc[]>([
    {
      id: 'DOC-HB-01',
      title: 'دليل وكتيب الموظف الرسمي (VITAS Iraq Employee Handbook 2026)',
      category: 'كتيب الموظف',
      fileName: 'VITAS_Iraq_Employee_Handbook_2026.pdf',
      fileSize: '4.2 MB',
      uploadDate: '2026-01-10',
      version: 'v4.1',
      description: 'الدليل الشامل لحقوق، واجبات، مزايا، وإجراءات العمل المعتمدة لكافة موظفي مؤسسة فيتاس العراق.'
    },
    {
      id: 'DOC-REC-02',
      title: 'دليل ومسار عمل التوظيف والـ ATS من الإعلان حتى التعيين',
      category: 'التوظيف والموارد البشرية',
      fileName: 'Recruitment_Lifecycle_Workflow_Guide.pdf',
      fileSize: '2.8 MB',
      uploadDate: '2026-02-01',
      version: 'v2.0',
      description: 'مخطط سير العمل التفصيلي لمسؤولي التوظيف لإدارة الشواغر واستقبال السير الذاتية وإجراء المقابلات وإتمام التعيين.'
    },
    {
      id: 'DOC-POL-03',
      title: 'ميثاق السلوك المهني والنزاهة وحوكمة العمل',
      category: 'دليل وسياسات',
      fileName: 'Code_of_Conduct_Ethics_Policy.pdf',
      fileSize: '1.9 MB',
      uploadDate: '2025-12-15',
      version: 'v3.0',
      description: 'معايير النزاهة والشفافية وتجنب تضارب المصالح المعتمدة وفق لوائح البنك المركزي العراقي CBI.'
    },
    {
      id: 'DOC-SEC-04',
      title: 'دليل وسياسة أمان المعلومات وسرية البيانات المصرفية',
      category: 'الأمان وتكنولوجيا المعلومات',
      fileName: 'Information_Security_Data_Protection.pdf',
      fileSize: '3.1 MB',
      uploadDate: '2026-01-20',
      version: 'v2.5',
      description: 'ضوابط حماية بيانات العملاء والموظفين، استخدام الحواسيب، والامتثال لمعايير الأمن السيبراني.'
    }
  ]);

  // --- Add Document Modal State ---
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<HandbookDoc['category']>('كتيب الموظف');
  const [newDocVersion, setNewDocVersion] = useState('v1.0');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);

  // Fetch Tickets from API
  const loadAdminTickets = async () => {
    try {
      const res = await fetch('/api/support-tickets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAdminTickets(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadAdminTickets();
  }, [activeModuleId]);

  const handleSendTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject) return;
    try {
      await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: currentUser?.id || (currentUser as any)?.employeeId || 1,
          subject: ticketSubject.trim(),
          category: ticketCategory,
          description: ticketMsg.trim(),
          ticket_type: ticketType,
          priority: ticketPriority
        })
      });
      loadAdminTickets();
    } catch (e) {}
    setTicketSent(true);
    setTicketSubject('');
    setTicketMsg('');
  };

  const handleReplyTicket = async (ticketId: number | string, newStatus: string = 'Resolved') => {
    if (!replyText.trim() && newStatus === 'Resolved') return;
    setIsUpdatingTicket(true);
    try {
      await fetch(`/api/support-tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          hr_response: replyText.trim() || undefined,
          resolved_by: currentUser?.name || 'إدارة الموارد البشرية'
        })
      });
      setReplyText('');
      setSelectedTicket(null);
      await loadAdminTickets();
    } catch (e) {
    } finally {
      setIsUpdatingTicket(false);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newM = {
      sender: currentUser?.name || 'مستخدم النظام',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => ({
      ...prev,
      [activeChatChannel]: [...(prev[activeChatChannel] || []), newM]
    }));
    setChatInput('');
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle) return;

    const newDoc: HandbookDoc = {
      id: `DOC-HB-${Date.now().toString().slice(-4)}`,
      title: newDocTitle,
      category: newDocCategory,
      fileName: newDocFile ? newDocFile.name : `${newDocTitle.replace(/\s+/g, '_')}.pdf`,
      fileSize: newDocFile ? `${(newDocFile.size / (1024 * 1024)).toFixed(1)} MB` : '2.5 MB',
      uploadDate: new Date().toISOString().split('T')[0],
      version: newDocVersion || 'v1.0',
      description: newDocDescription || 'مستند رسمي معتمد لبوابة مؤسسة فيتاس العراق.'
    };

    setDocuments(prev => [newDoc, ...prev]);
    setIsAddDocModalOpen(false);
    setNewDocTitle('');
    setNewDocDescription('');
    setNewDocVersion('v1.0');
    setNewDocFile(null);
  };

  const handleSaveNotifSettings = () => {
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  const handleTriggerTestNotification = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: isEn ? 'Test Notification Alert' : 'تنبيه إشعار تجريبي',
          message: isEn ? 'Notification delivery channels are fully operational.' : 'قنوات الإشعار والتنبيهات المباشرة تعمل بكفاءة 100%.',
          type: 'info'
        })
      });
      alert(isEn ? '✓ Test notification dispatched successfully!' : '✓ تم إرسال الإشعار التجريبي بنجاح!');
    } catch (e) {
      alert('Error triggering notification');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordToast({ type: 'error', msg: isEn ? 'Passwords do not match' : 'كلمتا المرور غير متطابقتين' });
      return;
    }
    setPasswordToast({ type: 'success', msg: isEn ? 'Password updated successfully!' : 'تم تحديث كلمة المرور بنجاح!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordToast(null), 3500);
  };

  const handlePingNexus = () => {
    setIsPinging(true);
    setTimeout(() => {
      setPingLatency(Math.floor(12 + Math.random() * 15));
      setIsPinging(false);
    }, 400);
  };

  // Filtered Tickets for Agent Desk
  const filteredAdminTickets = useMemo(() => {
    return adminTickets.filter(t => {
      if (ticketStatusFilter !== 'all' && t.status !== ticketStatusFilter) return false;
      if (ticketCatFilter !== 'all' && t.category !== ticketCatFilter) return false;
      if (ticketSearch.trim()) {
        const q = ticketSearch.toLowerCase().trim();
        const mSub = t.subject?.toLowerCase().includes(q);
        const mDesc = t.description?.toLowerCase().includes(q);
        const mName = (t.full_name_ar || t.full_name_en || '').toLowerCase().includes(q);
        const mCode = (t.emp_code || '').toLowerCase().includes(q);
        const mId = String(t.id).includes(q);
        return mSub || mDesc || mName || mCode || mId;
      }
      return true;
    });
  }, [adminTickets, ticketStatusFilter, ticketCatFilter, ticketSearch]);

  const openTicketsCount = adminTickets.filter(t => t.status === 'Open').length;
  const inProgressTicketsCount = adminTickets.filter(t => t.status === 'In Progress').length;
  const resolvedTicketsCount = adminTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-3xl">support_agent</span>
            <span>
              {activeModuleId === 'supp-agent-desk' && t('لوحة وكيل الدعم وإدارة التذاكر والشكاوى', 'Support Desk Agent & Ticket Management')}
              {(activeModuleId === 'supp-emp-portal' || activeModuleId === 'sup-tickets') && t('بوابة تذاكر الموظفين والطلبات الذاتية', 'Employee Support Portal & Tickets')}
              {(activeModuleId === 'supp-knowledge-base' || activeModuleId === 'sup-faq') && t('قاعدة المعرفة والأسئلة الشائعة', 'Help Desk & Knowledge Base Portal')}
              {(activeModuleId === 'supp-guide-center' || activeModuleId === 'sup-guides') && t('مركز دليل المستخدم وإجراءات العمل (SOP)', 'User Guide Center & Standard SOPs')}
              {activeModuleId === 'supp-emp-handbook' && t('دليل وكتيب الموظف الرسمي 2026', 'Official Employee Handbook 2026')}
              {activeModuleId === 'supp-news-admin' && t('إدارة ونشر الأخبار والتعميمات الإدارية', 'Company News & Announcements Admin')}
              {activeModuleId === 'supp-notif-settings' && t('إعدادات وتفضيلات قنوات الإشعارات والتنبيه', 'Notification Settings & Delivery Preferences')}
              {activeModuleId === 'supp-notif-center' && t('مركز التنبيهات والأحداث الرسمية', 'Notification & Events Center')}
              {activeModuleId === 'supp-profile-settings' && t('إعدادات الملف والتفضيلات الشخصية والأمان', 'Profile & Preference Settings')}
              {activeModuleId === 'supp-internal-chat' && t('المحادثات المباشرة والتواصل الداخلي (Live Chat)', 'Internal Staff Messaging')}
              {(activeModuleId === 'supp-mobile-app' || activeModuleId === 'supp-nexus-mobile') && t('تحميل ومزامنة تطبيقات الهاتف المحمول', 'Mobile Application Download & Telemetry')}
              {activeModuleId === 'supp-enterprise-nexus' && t('مركز تكامل الخدمات المؤسسية والسحابية', 'Enterprise Hub & Service Integration')}
              {(!activeModuleId || activeModuleId === 'cat-11-support') && t('مركز الدعم والمساعدة الموحد', 'Unified Support & Help Desk')}
            </span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {t('المنظومة الموحدة لخدمات الموظفين، التذاكر، كتيب السياسات، التنبيهات، وقنوات الدعم الإداري والتقني', 
               'Unified enterprise platform for employee support, ticketing, handbooks, SOP guides, and alert channels')}
          </p>
        </div>

        {/* Quick Nav Module Tabs (All 12 Modules Synchronized) */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 border-b sm:border-b-0 border-slate-200 dark:border-white/10">
          {[
            { id: 'supp-agent-desk', label: t('وكيل الدعم والتذاكر', 'Agent Desk'), icon: 'headset_mic' },
            { id: 'supp-emp-portal', label: t('تقديم تذكرة', 'New Ticket'), icon: 'confirmation_number' },
            { id: 'supp-knowledge-base', label: t('قاعدة المعرفة', 'Knowledge Base'), icon: 'auto_stories' },
            { id: 'supp-guide-center', label: t('دليل الاستخدام', 'User Guides'), icon: 'help_center' },
            { id: 'supp-emp-handbook', label: t('كتيب الموظف', 'Handbook'), icon: 'import_contacts' },
            { id: 'supp-news-admin', label: t('إدارة الأخبار', 'News Admin'), icon: 'edit_note' },
            { id: 'supp-notif-settings', label: t('إعدادات الإشعارات', 'Alert Settings'), icon: 'notifications_active' },
            { id: 'supp-notif-center', label: t('التنبيهات', 'Alerts'), icon: 'circle_notifications' },
            { id: 'supp-profile-settings', label: t('الملف والأمان', 'Profile'), icon: 'settings_suggest' },
            { id: 'supp-internal-chat', label: t('المحادثات', 'Chat'), icon: 'forum' },
            { id: 'supp-mobile-app', label: t('تطبيقات الموبايل', 'Mobile Apps'), icon: 'smartphone' },
            { id: 'supp-enterprise-nexus', label: t('تكامل الخدمات', 'Enterprise Hub'), icon: 'cloud_sync' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveModuleId(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                activeModuleId === tab.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : isDark
                    ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          MODULE 1: Support Desk Agent Portal & Ticket Queue (supp-agent-desk)
          ========================================================================= */}
      {activeModuleId === 'supp-agent-desk' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top KPI Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">{t('إجمالي التذاكر', 'Total Tickets')}</span>
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 material-symbols-outlined text-lg">receipt_long</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{adminTickets.length}</p>
              <span className="text-[10px] text-teal-600 font-bold">{t('معاملات واستفسارات واردة', 'All inquiries & complaints')}</span>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">{t('بانتظار المراجعة', 'Open / Pending')}</span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 material-symbols-outlined text-lg">pending_actions</span>
              </div>
              <p className="text-2xl font-black text-amber-600 mt-1">{openTicketsCount}</p>
              <span className="text-[10px] text-amber-600 font-bold">{t('تتطلب تدخل الموارد البشرية', 'Requires HR action')}</span>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">{t('قيد المتابعة', 'In Progress')}</span>
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 material-symbols-outlined text-lg">hourglass_top</span>
              </div>
              <p className="text-2xl font-black text-sky-600 mt-1">{inProgressTicketsCount}</p>
              <span className="text-[10px] text-sky-600 font-bold">{t('جاري التدقيق والمعالجة', 'Under review')}</span>
            </div>

            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">{t('تم الرد والحل', 'Resolved')}</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 material-symbols-outlined text-lg">task_alt</span>
              </div>
              <p className="text-2xl font-black text-emerald-600 mt-1">{resolvedTicketsCount}</p>
              <span className="text-[10px] text-emerald-600 font-bold">{t('معاملات مكتملة ومغلقة', 'Completed tickets')}</span>
            </div>
          </div>

          {/* Ticket Queue Controls & Filters */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <span className="material-symbols-outlined text-slate-400 absolute start-3 top-2.5 text-lg">search</span>
                <input
                  type="text"
                  placeholder={t('البحث برقم التذكرة، اسم الموظف، الموضوع...', 'Search by ticket #, employee name, subject...')}
                  value={ticketSearch}
                  onChange={e => setTicketSearch(e.target.value)}
                  className={`w-full ps-9 pe-3 py-2 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <select
                value={ticketStatusFilter}
                onChange={e => setTicketStatusFilter(e.target.value as any)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">{t('جميع الحالات', 'All Statuses')}</option>
                <option value="Open">{t('مفتوحة / قيد الانتظار', 'Open / Pending')}</option>
                <option value="In Progress">{t('قيد المتابعة', 'In Progress')}</option>
                <option value="Resolved">{t('تم الرد والحل', 'Resolved')}</option>
              </select>

              {/* Category Filter */}
              <select
                value={ticketCatFilter}
                onChange={e => setTicketCatFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">{t('جميع الأقسام', 'All Categories')}</option>
                <option value="HR Query">{t('الموارد البشرية والرواتب (HR)', 'HR & Payroll')}</option>
                <option value="IT Support">{t('الدعم التقني والأنظمة (IT)', 'IT Support')}</option>
                <option value="Facilities">{t('الخدمات واللوجستيات', 'Facilities')}</option>
                <option value="Other">{t('أخرى', 'Other')}</option>
              </select>

              <button
                onClick={loadAdminTickets}
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>{t('تحديث', 'Refresh')}</span>
              </button>
            </div>
          </div>

          {/* Ticket Queue Cards List */}
          <div className="space-y-3">
            {filteredAdminTickets.length === 0 ? (
              <div className={`p-8 rounded-3xl border text-center space-y-2 ${
                isDark ? 'bg-[#111827] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <span className="material-symbols-outlined text-4xl text-teal-600">inbox</span>
                <p className="font-bold text-xs">{t('لا توجد تذاكر تطابق معايير البحث الحالية.', 'No tickets match the search criteria.')}</p>
              </div>
            ) : (
              filteredAdminTickets.map(ticket => {
                const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                      isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-lg border border-teal-500/20">
                          #TK-{ticket.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          ticket.ticket_type === 'شكوى'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : ticket.ticket_type === 'استفسار'
                            ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                            : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                        }`}>
                          {ticket.ticket_type || 'طلب'}
                        </span>
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {ticket.full_name_ar || ticket.full_name_en || ticket.emp_code || 'موظف'}
                        </span>
                        {ticket.department && (
                          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                            • {ticket.department} {ticket.branch ? `(${ticket.branch})` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                          isResolved
                            ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                            : ticket.status === 'In Progress'
                            ? 'bg-sky-500/15 text-sky-600 border border-sky-500/30'
                            : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>
                            {isResolved ? t('تم الحل', 'Resolved') : ticket.status === 'In Progress' ? t('قيد المتابعة', 'In Progress') : t('مفتوحة', 'Open')}
                          </span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('ar-IQ') : ''}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">{ticket.subject}</h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Previous HR Response Box */}
                    {ticket.hr_response && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between font-bold text-[10px] text-emerald-700 dark:text-emerald-400">
                          <span>{t('الرد الرسمي من الموارد البشرية:', 'Official HR Response:')}</span>
                          {ticket.resolved_by && <span>بواسطة: {ticket.resolved_by}</span>}
                        </div>
                        <p className="leading-relaxed">{ticket.hr_response}</p>
                      </div>
                    )}

                    {/* Agent Response Drawer / Form */}
                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {ticket.status !== 'In Progress' && !isResolved && (
                          <button
                            onClick={() => handleReplyTicket(ticket.id, 'In Progress')}
                            className="px-2.5 py-1 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px] font-bold hover:bg-sky-500/20 transition-all cursor-pointer"
                          >
                            {t('تعيين كـ (قيد المتابعة)', 'Mark In Progress')}
                          </button>
                        )}
                        {!isResolved && (
                          <button
                            onClick={() => {
                              setSelectedTicket(isSelected ? null : ticket);
                              setReplyText(ticket.hr_response || '');
                            }}
                            className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">reply</span>
                            <span>{isSelected ? t('إلغاء الرد', 'Cancel') : t('كتابة رد واعتماد الحل', 'Reply & Resolve')}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{t('الفئة:', 'Category:')} {ticket.category}</span>
                        <span>•</span>
                        <span>{t('الأولوية:', 'Priority:')} {ticket.priority || 'متوسطة'}</span>
                      </div>
                    </div>

                    {/* Expanded Reply Box */}
                    {isSelected && (
                      <div className="pt-3 border-t border-teal-500/20 space-y-2 animate-in fade-in duration-150">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {t('نص الرد والتوجيه للموظف *', 'Official HR Response to Employee *')}
                        </label>
                        <textarea
                          rows={3}
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          placeholder={t('اكتب الرد الرسمي للموظف، وسيتم إشعاره فوراً في تطبيق الموبايل وبوابة الموظف...', 'Write official response to employee...')}
                          className={`w-full p-3 rounded-xl border text-xs outline-none ${
                            isDark ? 'bg-black border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                          }`}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(null)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                          >
                            {t('إلغاء', 'Cancel')}
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingTicket}
                            onClick={() => handleReplyTicket(ticket.id, 'Resolved')}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>{isUpdatingTicket ? t('جاري الحفظ...', 'Saving...') : t('إرسال الرد وإغلاق التذكرة بنجاح', 'Send Reply & Resolve')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 2: Employee Support Tickets (supp-emp-portal / sup-tickets)
          ========================================================================= */}
      {(activeModuleId === 'supp-emp-portal' || activeModuleId === 'sup-tickets') && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200 text-xs">
          {/* Quick link to ESS Portal */}
          <div className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
            isDark ? 'bg-gradient-to-r from-teal-950/40 to-[#111827] border-teal-500/30' : 'bg-teal-50/80 border-teal-300'
          }`}>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-teal-600 text-white material-symbols-outlined text-xl">person_pin</span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  {t('بوابة الموظف للخدمة الذاتية (Employee Portal)', 'Employee Self-Service Portal')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('بوابتك لمتابعة الإجازات، الحضور، كشف الراتب الشهري، وتقديم الطلبات', 'Portal for tracking leaves, attendance, payslips, and submitting requests')}
                </p>
              </div>
            </div>
            <a
              href="/employee-app"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>{t('تشغيل البوابة الذاتية', 'Open ESS')}</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </a>
          </div>

          {/* New Ticket Form */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h2 className="text-sm font-bold border-b border-slate-200 dark:border-white/10 pb-2 flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              <span className="material-symbols-outlined text-teal-600 text-lg">edit_note</span>
              {t('تقديم تذكرة دعم واستفسار أو شكوى جديدة', 'Submit New Support Ticket or Grievance')}
            </h2>

            {ticketSent && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                <span>{t(`تم إرسال تذكرتك بنجاح برقم #TK-${Math.floor(1000 + Math.random() * 9000)} وسيقوم فريق الدعم بالرد قريباً.`, `Your ticket was submitted successfully.`)}</span>
              </div>
            )}

            <form onSubmit={handleSendTicket} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('نوع المعاملة *', 'Type of Submission *')}
                  </label>
                  <select
                    value={ticketType}
                    onChange={e => setTicketType(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="طلب">{t('📝 طلب إداري', 'Administrative Request')}</option>
                    <option value="شكوى">{t('⚠️ شكوى وتظلم', 'Formal Grievance / Complaint')}</option>
                    <option value="استفسار">{t('❓ استفسار عام', 'General Inquiry')}</option>
                    <option value="دعم فني">{t('💻 دعم فني وأنظمة', 'IT & Systems Support')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('القسم الموجه إليه *', 'Department *')}
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={e => setTicketCategory(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="HR Query">{t('الموارد البشرية والرواتب (HR)', 'Human Resources & Payroll')}</option>
                    <option value="IT Support">{t('تكنولوجيا المعلومات (IT)', 'Information Technology')}</option>
                    <option value="Facilities">{t('الخدمات واللوجستيات', 'Facilities & Admin')}</option>
                    <option value="Other">{t('الإدارة العامة / أخرى', 'General Admin / Other')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('درجة الأهمية', 'Priority')}
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={e => setTicketPriority(e.target.value as any)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="عادية">{t('عادية (Normal)', 'Normal')}</option>
                    <option value="متوسطة">{t('متوسطة (Medium)', 'Medium')}</option>
                    <option value="عاجلة">{t('عاجلة جداً (Urgent)', 'Urgent')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('موضوع التذكرة أو الشكوى *', 'Subject *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('مثال: استفسار عن احتساب بدل السكن لهذا الشهر، أو طلب تعديل بيانات', 'e.g. Query regarding allowance calculation')}
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('تفاصيل المشكلة أو الشرح الوافي *', 'Details & Explanation *')}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={t('اكتب شرحاً مفصلاً لطلبك أو استفسارك لمساعدة مسؤولي الموارد البشرية...', 'Write complete details...')}
                  value={ticketMsg}
                  onChange={e => setTicketMsg(e.target.value)}
                  className={`w-full p-3 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">send</span>
                <span>{t('إرسال التذكرة لفريق الموارد البشرية والدعم', 'Submit Ticket to HR Support')}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 3: Help Desk & Knowledge Base (supp-knowledge-base / sup-faq)
          ========================================================================= */}
      {(activeModuleId === 'supp-knowledge-base' || activeModuleId === 'sup-faq') && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          {/* Top Banner with Search */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-600">auto_stories</span>
                  {t('قاعدة المعرفة والأسئلة الشائعة الرسمية', 'Official Knowledge Base & FAQs')}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {t('إجابات معتمدة حول الرواتب، الدوام، الإجازات، ولوائح وسياسات مؤسسة فيتاس العراق', 'Official answers for payroll, attendance, leave policies, and company bylaws')}
                </p>
              </div>

              <button
                onClick={() => setIsAddFaqModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-600/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                <span>{t('+ إضافة سؤال جديد', '+ Add FAQ')}</span>
              </button>
            </div>

            {/* Search Input & Category Pills */}
            <div className="space-y-3 pt-1">
              <div className="relative">
                <span className="material-symbols-outlined text-slate-400 absolute start-3 top-2.5 text-lg">search</span>
                <input
                  type="text"
                  placeholder={t('ابحث في الأسئلة الشائعة وقاعدة المعرفة (مثال: راتب، إجازة، بصمة، وثيقة)...', 'Search knowledge base...')}
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  className={`w-full ps-10 pe-4 py-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
                  { id: 'payroll', labelAr: 'الرواتب والبدلات', labelEn: 'Payroll' },
                  { id: 'leave', labelAr: 'الإجازات والدوام', labelEn: 'Leaves' },
                  { id: 'hr', labelAr: 'شؤون الموظفين', labelEn: 'HR Policies' },
                  { id: 'it', labelAr: 'الأنظمة والدعم التقني', labelEn: 'IT & Systems' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFaqCategory(cat.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                      faqCategory === cat.id
                        ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                        : isDark
                          ? 'bg-[#0a0c10] border-slate-800 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isEn ? cat.labelEn : cat.labelAr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Accordion List of FAQs */}
          <div className="space-y-3">
            {faqList
              .filter(item => {
                if (faqCategory !== 'all' && item.category !== faqCategory) return false;
                if (faqSearch.trim()) {
                  const q = faqSearch.toLowerCase().trim();
                  const mQ = item.questionAr.toLowerCase().includes(q) || item.questionEn.toLowerCase().includes(q);
                  const mA = item.answerAr.toLowerCase().includes(q) || item.answerEn.toLowerCase().includes(q);
                  return mQ || mA;
                }
                return true;
              })
              .map(faq => {
                const isExpanded = expandedFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isDark ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className={`p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isExpanded
                          ? isDark ? 'bg-teal-950/20' : 'bg-teal-50/70'
                          : isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 material-symbols-outlined text-lg">help</span>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {isEn ? faq.questionEn : faq.questionAr}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                          {isEn ? faq.categoryEn : faq.categoryAr}
                        </span>
                        <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/40 dark:bg-black/10 text-slate-700 dark:text-slate-300 text-xs leading-relaxed animate-in fade-in duration-150">
                        {isEn ? faq.answerEn : faq.answerAr}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Modal to Add New FAQ */}
          {isAddFaqModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 animate-in zoom-in-95 ${
                isDark ? 'bg-[#111827] border-white/20' : 'bg-white border-slate-300'
              }`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">help</span>
                    {t('إضافة مقال أو سؤال جديد لقاعدة المعرفة', 'Add FAQ Article')}
                  </h3>
                  <button onClick={() => setIsAddFaqModalOpen(false)} className="text-slate-400 hover:text-white text-base">✕</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{t('التصنيف', 'Category')}</label>
                    <select
                      value={newFaqCat}
                      onChange={e => setNewFaqCat(e.target.value as any)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="payroll">{t('الرواتب والبدلات', 'Payroll')}</option>
                      <option value="leave">{t('الإجازات والدوام', 'Leaves')}</option>
                      <option value="hr">{t('شؤون الموظفين والسياسات', 'HR')}</option>
                      <option value="it">{t('الأنظمة والدعم التقني', 'IT')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{t('نص السؤال *', 'Question *')}</label>
                    <input
                      type="text"
                      required
                      value={newFaqQ}
                      onChange={e => setNewFaqQ(e.target.value)}
                      placeholder={t('اكتب السؤال هنا...', 'Question text...')}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{t('نص الإجابة المعتمدة *', 'Answer *')}</label>
                    <textarea
                      rows={4}
                      required
                      value={newFaqA}
                      onChange={e => setNewFaqA(e.target.value)}
                      placeholder={t('اكتب تفاصيل الإجابة المعتمدة...', 'Answer details...')}
                      className={`w-full p-3 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddFaqModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      {t('إلغاء', 'Cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFaqQ || !newFaqA) return;
                        const item: FAQItem = {
                          id: `faq-${Date.now()}`,
                          category: newFaqCat,
                          categoryAr: newFaqCat === 'payroll' ? 'الرواتب والمالية' : newFaqCat === 'leave' ? 'الإجازات والدوام' : newFaqCat === 'it' ? 'الأنظمة' : 'شؤون الموظفين',
                          categoryEn: newFaqCat.toUpperCase(),
                          questionAr: newFaqQ,
                          questionEn: newFaqQ,
                          answerAr: newFaqA,
                          answerEn: newFaqA
                        };
                        setFaqList(prev => [item, ...prev]);
                        setIsAddFaqModalOpen(false);
                        setNewFaqQ('');
                        setNewFaqA('');
                      }}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20"
                    >
                      {t('حفظ السؤال', 'Save')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 4: User Guide Center & SOPs (supp-guide-center / sup-guides)
          ========================================================================= */}
      {(activeModuleId === 'supp-guide-center' || activeModuleId === 'sup-guides') && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          {/* Guide Center Header */}
          <div className={`p-6 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">help_center</span>
                {t('مركز دليل المستخدم وإجراءات العمل القياسية (SOP)', 'User Guide Center & Standard Operating Procedures')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {t('أدلة تفاعلية ومسارات عمل خطوة بخطوة لكل قسم في نظام فيتاس العراق', 'Interactive step-by-step procedures for each operational module')}
              </p>
            </div>
          </div>

          {/* SOP Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { idx: 0, titleAr: '1. مسار الرواتب والضرائب', titleEn: '1. Payroll SOP', icon: 'payments' },
              { idx: 1, titleAr: '2. الحضور وأجهزة البصمة', titleEn: '2. Biometric SOP', icon: 'fingerprint' },
              { idx: 2, titleAr: '3. الإجازات والغيابات', titleEn: '3. Leaves SOP', icon: 'calendar_month' },
              { idx: 3, titleAr: '4. التوظيف وتتبع الـ ATS', titleEn: '4. Recruitment ATS', icon: 'person_search' },
              { idx: 4, titleAr: '5. توجيه العقود والأرشفة', titleEn: '5. Contract Routing', icon: 'drive_file_move' },
              { idx: 5, titleAr: '6. تطبيق المدير العام التنفيذي', titleEn: '6. GM Mobile Suite', icon: 'shield_person' },
            ].map(tab => (
              <button
                key={tab.idx}
                onClick={() => setSelectedGuideIndex(tab.idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  selectedGuideIndex === tab.idx
                    ? 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/20'
                    : isDark
                      ? 'bg-[#111827] border-slate-800 text-slate-300 hover:bg-slate-800'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{isEn ? tab.titleEn : tab.titleAr}</span>
              </button>
            ))}
          </div>

          {/* Active Guide Content */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            {selectedGuideIndex === 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">payments</span>
                    {t('دليل مسار احتساب الرواتب والضريبة والضمان الاجتماعي', 'Payroll, Income Tax & Social Security Calculation Guide')}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 font-bold text-[10px]">
                    SOP-PAY-01
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { step: '01', title: 'مزامنة سجلات الدوام', desc: 'تحديث الحضور والغيابات وحسم الإجازات غير مدفوعة الأجر واحتساب الساعات الإضافية المعتمدة.' },
                    { step: '02', title: 'تطبيق مخصصات الزوجية والأطفال', desc: 'احتساب 15,200 دينار للزوجة، و 3,800 دينار لكل طفل حتى 4 أطفال، وتطبيق شرط المادة 12 للمتزوجات.' },
                    { step: '03', title: 'احتساب الضريبة والضمان', desc: 'استقطاع الضمان الاجتماعي 5% وضريبة الدخل بالشرائح التصاعدية وتوليد كشف Excel المطابق.' }
                  ].map(s => (
                    <div key={s.step} className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 space-y-1.5">
                      <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-600 font-bold flex items-center justify-center font-mono text-xs">{s.step}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{s.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedGuideIndex === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">fingerprint</span>
                    {t('دليل أجهزة البصمة البيومترية ومزامنة الدوام بالفروع', 'Biometric Clocks & Attendance Sync SOP')}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 font-bold text-[10px]">
                    SOP-ATT-02
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { step: '01', title: 'تسجيل بصمة الموظف بالفرع', desc: 'يقوم مسؤول تكنولوجيا المعلومات بتعريف رقم الموظف على جهاز ZKTeco وتخزين القالب البيومتري.' },
                    { step: '02', title: 'المزامنة السحابية اللحظية', desc: 'يقوم الخادم بجلب الحركات تلقائياً كل دقيقة وحفظها في جدول raw_attendance_logs.' },
                    { step: '03', title: 'احتساب الدوام والتأخيرات', desc: 'يقوم المحرك الذكي بحساب ساعات العمل، التأخير الصباحي بعد فترة السماح (15 دقيقة)، وتحديث رصيد الموظف.' }
                  ].map(s => (
                    <div key={s.step} className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 space-y-1.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-600 font-bold flex items-center justify-center font-mono text-xs">{s.step}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{s.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedGuideIndex === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">calendar_month</span>
                    {t('دليل مسار التقديم على الإجازات والمصادقات', 'Leave Application & Approvals SOP')}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 font-bold text-[10px]">
                    SOP-LV-03
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { step: '01', title: 'تقديم الطلب عبر الموبايل أو الويب', desc: 'يختار الموظف نوع الإجازة، تاريخ البدء والانتهاء، والبديل الإداري المؤقت.' },
                    { step: '02', title: 'موافقة المسؤول المباشر ومدير الفرع', desc: 'يصل إشعار فوري للمشرف المباشر للاعتماد أو الرفض مع تدوين الملاحظات.' },
                    { step: '03', title: 'الخصم التلقائي من الرصيد السنوي', desc: 'فور الاعتماد، يتم تحديث رصيد الإجازات وعكسها تلقائياً على مسير الرواتب الشهري.' }
                  ].map(s => (
                    <div key={s.step} className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 space-y-1.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 font-bold flex items-center justify-center font-mono text-xs">{s.step}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{s.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedGuideIndex === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">person_search</span>
                    {t('دليل مسار عمل التوظيف والـ ATS من الإعلان حتى التعيين', 'Recruitment ATS SOP')}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 font-bold text-[10px]">
                    SOP-REC-04
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { step: '01', title: 'نشر الشاغر واستقبال الطلبات', desc: 'نشر الوظيفة على بوابة التقديم /apply واستقبال السير الذاتية وقيدها آلياً.' },
                    { step: '02', title: 'الفرز وإجراء المقابلات', desc: 'فرز المتقدمين، تشكيل لجان المقابلات، ورصد درجات التقييم الفني والسلوكي.' },
                    { step: '03', title: 'إصدار العرض والتعيين الرسمي', desc: 'إصدار خطاب العرض الوظيفي، وتوليد كود الموظف ونقل ملفه إلى دليل الموظفين.' }
                  ].map(s => (
                    <div key={s.step} className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 space-y-1.5">
                      <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 font-bold flex items-center justify-center font-mono text-xs">{s.step}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{s.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedGuideIndex === 4 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600">drive_file_move</span>
                    {t('دليل توجيه العقود والأرشفة الرقمية والربط مع M365', 'Contract Routing & Document Archive SOP')}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 font-bold text-[10px]">
                    SOP-DOC-05
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { step: '01', title: 'توليد مسودة العقد الرسمي', desc: 'بناء العقد استناداً للبنود المعتمدة وسحب بيانات الموظف والراتب والفرع تلقائياً.' },
                    { step: '02', title: 'التوجيه المجمّع حسب الفرع', desc: 'توجيه العقود بالبريد الإلكتروني المؤسسي إلى مسؤولي المكاتب والفروع.' },
                    { step: '03', title: 'التوقيع والأرشفة الرقمية الدائمة', desc: 'رفع النسخة الموقعة وتوليد باركود أرشفة وتخزينها في الأرشيف الإلكتروني الآمن.' }
                  ].map(s => (
                    <div key={s.step} className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 space-y-1.5">
                      <span className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-600 font-bold flex items-center justify-center font-mono text-xs">{s.step}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{s.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedGuideIndex === 5 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">shield_person</span>
                    {t('دليل تطبيق المدير العام والقيادة التنفيذية', 'General Manager Decision Suite SOP')}
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                    SOP-EXEC-06
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { step: '01', title: 'مراقبة أداء الفروع الـ 16 لحظياً', desc: 'متابعة نسب الحضور والغياب، وإحصائيات مسير الرواتب في كل المحافظات.' },
                    { step: '02', title: 'المصادقة الفورية على الطلبات الحساسة', desc: 'اعتماد الاستثناءات، تعديلات الرواتب، والعقود الكبرى بضغطة زر واحدة.' },
                    { step: '03', title: 'إصدار الأوامر والتعميمات الإدارية', desc: 'نشر التعميمات الفورية لجميع الموظفين على هواتفهم المحمولة مباشرة.' }
                  ].map(s => (
                    <div key={s.step} className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 space-y-1.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-600 font-bold flex items-center justify-center font-mono text-xs">{s.step}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{s.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 5: Employee Handbook (supp-emp-handbook)
          ========================================================================= */}
      {activeModuleId === 'supp-emp-handbook' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          {/* Top Bar with Chapters & Document Downloads */}
          <div className={`p-6 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">import_contacts</span>
                {t('دليل وكتيب الموظف الرسمي (VITAS Iraq Employee Handbook 2026)', 'Official Employee Handbook 2026')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {t('المرجع القانوني والتنظيمي الشامل لحقوق وواجبات وسياسات العمل في مؤسسة فيتاس العراق', 'Official comprehensive regulatory reference for employee rights and company policies')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>{t('طباعة الكتيب', 'Print')}</span>
              </button>
              <button
                onClick={() => setIsAddDocModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>{t('إضافة مستند أو سياسة جديدة', 'Upload Policy')}</span>
              </button>
            </div>
          </div>

          {/* Handbook Chapters Browser & Reader Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Chapters Table of Contents */}
            <div className={`p-4 rounded-3xl border space-y-1.5 h-fit ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <h3 className="font-bold text-xs px-2 py-1 text-slate-500 uppercase tracking-wider">
                {t('أبواب وفصول الكتيب', 'Handbook Chapters')}
              </h3>
              {[
                { ch: 1, title: 'الباب الأول: الرؤية، الرسالة والقيم', icon: 'flag' },
                { ch: 2, title: 'الباب الثاني: التعيين وشروط التعاقد', icon: 'badge' },
                { ch: 3, title: 'الباب الثالث: الرواتب، البدلات والمزايا', icon: 'payments' },
                { ch: 4, title: 'الباب الرابع: الدوام الرسمي والإجازات', icon: 'schedule' },
                { ch: 5, title: 'الباب الخامس: ميثاق النزاهة وسرية البيانات', icon: 'security' },
                { ch: 6, title: 'الباب السادس: التظلمات وحل الشكاوى', icon: 'gavel' }
              ].map(c => (
                <button
                  key={c.ch}
                  onClick={() => setSelectedHandbookChapter(c.ch)}
                  className={`w-full p-2.5 rounded-xl text-start font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    selectedHandbookChapter === c.ch
                      ? 'bg-teal-600 text-white shadow-xs'
                      : isDark
                        ? 'text-slate-300 hover:bg-white/5'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{c.icon}</span>
                  <span className="truncate">{c.title}</span>
                </button>
              ))}
            </div>

            {/* Chapter Full Reader */}
            <div className={`lg:col-span-3 p-6 rounded-3xl border shadow-xl space-y-4 leading-relaxed ${
              isDark ? 'bg-[#111827] border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {selectedHandbookChapter === 1 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-teal-600 dark:text-teal-400">الباب الأول: الرؤية والرسالة والقيم الجوهرية لمؤسسة فيتاس العراق</h3>
                  <p className="text-xs">تلتزم مؤسسة فيتاس العراق بتقديم خدمات تمويل وتطوير مؤسسي تلبي تطلعات أصحاب المشاريع الصغيرة في كافة المحافظات العراقية. نرتكز على النزاهة، الشفافية، العدالة، والاحترام المتبادل بين كافة أفراد عائلة فيتاس العراق.</p>
                  <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-xs font-bold text-teal-700 dark:text-teal-300">
                    القيم الخمس: النزاهة المطلقة • العميل أولاً • الابتكار والتطوير المستمر • العمل كفريق واحد • الالتزام بالمعايير القانونية والمهنية.
                  </div>
                </div>
              )}

              {selectedHandbookChapter === 2 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-teal-600 dark:text-teal-400">الباب الثاني: شروط التعيين، العقود وفترة التجربة</h3>
                  <p className="text-xs">يخضع جميع الموظفين الجدد لفترة تجربة مدتها ثلاثة أشهر قابلة للتمديد وفق قانون العمل العراقي رقم 37 لسنة 2015. يتم إبرام عقد عمل رسمي محدد أو غير محدد المدة، وتسجيل الموظف رسمياً في دائرة التقاعد والضمان الاجتماعي للعمال.</p>
                </div>
              )}

              {selectedHandbookChapter === 3 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-teal-600 dark:text-teal-400">الباب الثالث: هيكل الرواتب، البدلات والمكافآت السنوية</h3>
                  <p className="text-xs">يتم احتساب الراتب الإجمالي شاملاً الراتب الأساسي، مخصصات الشهادة، مخصصات المنصب والموقع، بدل السكن، ومخصصات الزوجية والأطفال. تُصرف الرواتب دورياً عبر التحويل المصرفي قبل نهاية الشهر الميلادي.</p>
                </div>
              )}

              {selectedHandbookChapter === 4 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-teal-600 dark:text-teal-400">الباب الرابع: أوقات الدوام الرسمي، البصمة البيومترية والإجازات</h3>
                  <p className="text-xs">ساعات العمل الرسمية هي 8 ساعات يومياً (من 08:00 صباحاً إلى 04:00 عصراً) من الأحد إلى الخميس. يجب تسجيل الحضور والانصراف عبر أجهزة البصمة البيومترية. يستحق الموظف 21 يوماً إجازة سنوية مدفوعة الأجر و14 يوماً إجازة مرضية.</p>
                </div>
              )}

              {selectedHandbookChapter === 5 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-teal-600 dark:text-teal-400">الباب الخامس: ميثاق السلوك المهني والنزاهة وسرية المعلومات</h3>
                  <p className="text-xs">يُحظر تماماً إفشاء أسرار العمل أو بيانات العملاء والموظفين المالية لأي جهة غير مخولة. يُلزم الموظف بالامتناع عن قبول أي هدايا أو عمولات، وتجنب أي تضارب للمصالح الشخصية مع مصلحة المؤسسة.</p>
                </div>
              )}

              {selectedHandbookChapter === 6 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-teal-600 dark:text-teal-400">الباب السادس: التظلمات، الشكاوى وحل النزاعات الإدارية</h3>
                  <p className="text-xs">لكل موظف الحق في رفع تظلم أو شكوى رسمية دون خوف من أي إجراء عقابي. يُتاح تقديم الشكاوى مباشرة وسرياً عبر شاشة الدعم الفني وتطبيق الموبايل وتُحال إلى لجنة محايدة برئاسة مدير الموارد البشرية والامتثال للبت فيها خلال 7 أيام عمل.</p>
                </div>
              )}
            </div>
          </div>

          {/* Downloadable PDF Policy Documents Grid */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm px-1 text-slate-900 dark:text-white">
              {t(`المستندات والكتيبات المعتمدة للتحميل (${documents.length})`, `Downloadable Policies & Handbooks (${documents.length})`)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                        {doc.category}
                      </span>
                      <h4 className="font-bold text-xs pt-1 text-slate-900 dark:text-white">{doc.title}</h4>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{doc.version}</span>
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{doc.description}</p>
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">{doc.fileName} ({doc.fileSize})</span>
                    <button
                      onClick={() => alert(`جاري تنزيل ملف: ${doc.fileName}`)}
                      className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">download</span>
                      <span>{t('تحميل', 'Download')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 6: Company News & Circulars Admin (supp-news-admin)
          ========================================================================= */}
      {activeModuleId === 'supp-news-admin' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <CompanyNews language={language} isReadOnly={false} />
        </div>
      )}

      {/* =========================================================================
          MODULE 7: Notification Settings & Preferences (supp-notif-settings)
          ========================================================================= */}
      {activeModuleId === 'supp-notif-settings' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200 text-xs">
          {settingsSavedToast && (
            <div className="p-3.5 rounded-2xl bg-teal-600 text-white font-bold text-xs shadow-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{t('تم حفظ تفضيلات وقنوات الإشعارات بنجاح.', 'Notification preferences saved successfully.')}</span>
            </div>
          )}

          <div className={`p-6 rounded-3xl border shadow-xl space-y-5 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-600">notifications_active</span>
                  {t('إعدادات وتفضيلات قنوات الإشعارات الرسمية', 'Notification Channels & Subscriptions')}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {t('تخصيص قنوات تسليم التنبيهات والأحداث للموظفين والمدراء', 'Configure delivery channels and automated alerts')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleTriggerTestNotification}
                className="px-3.5 py-1.5 rounded-xl border border-teal-500/40 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500/10 flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                <span>{t('إرسال إشعار تجريبي', 'Test Alert')}</span>
              </button>
            </div>

            {/* Delivery Channels */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider">{t('قنوات التسليم المفعلة', 'Active Delivery Channels')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'emailAlerts', title: 'البريد الإلكتروني المؤسسي (M365)', desc: 'إرسال العقود، كشوفات الرواتب والتنبيهات الهامة بالبريد', icon: 'mail' },
                  { key: 'desktopPopups', title: 'إشعارات النظام اللحظية (In-App)', desc: 'ظهور إشعار منبثق في زاوية الشاشة فور وقوع الحدث', icon: 'desktop_windows' },
                  { key: 'mobilePush', title: 'إشعارات تطبيق الهاتف المحمول (Push)', desc: 'تنبيه الموظفين على هواتفهم الذكية لحظة صدور القرار', icon: 'notifications' },
                  { key: 'soundAlerts', title: 'التنبيهات الصوتية', desc: 'تشغيل نغمة تنبيه لطيفة عند وصول رسالة أو تذكرة جديدة', icon: 'volume_up' }
                ].map(ch => {
                  const active = (notifSettings as any)[ch.key];
                  return (
                    <div
                      key={ch.key}
                      onClick={() => setNotifSettings(prev => ({ ...prev, [ch.key]: !active }))}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        active
                          ? isDark ? 'bg-teal-950/20 border-teal-500/40' : 'bg-teal-50/70 border-teal-400'
                          : isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-slate-50 border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`material-symbols-outlined text-xl ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                          {ch.icon}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">{ch.title}</h4>
                          <p className="text-[10.5px] text-slate-500 leading-tight">{ch.desc}</p>
                        </div>
                      </div>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-white text-xs ${active ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                        {active ? '✓' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Event Triggers */}
            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider">{t('اشتراكات الأحداث التلقائية', 'Automated Event Triggers')}</h3>
              <div className="space-y-2">
                {[
                  { key: 'eventLeaves', title: 'طلبات واعتماد الإجازات والغياب' },
                  { key: 'eventPayroll', title: 'إصدار كشف الراتب الشهري ومكافآت الأداء' },
                  { key: 'eventTickets', title: 'ورود تذكرة دعم أو شكوى جديدة والرد عليها' },
                  { key: 'eventAppraisals', title: 'جلسات تقييم الأداء ومقابلات التوظيف' },
                  { key: 'eventAnnouncements', title: 'نشر تعميم أو أمر إداري جديد من الإدارة العامة' }
                ].map(ev => {
                  const active = (notifSettings as any)[ev.key];
                  return (
                    <div
                      key={ev.key}
                      onClick={() => setNotifSettings(prev => ({ ...prev, [ev.key]: !active }))}
                      className="p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{ev.title}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-500/20 text-emerald-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                        {active ? t('مفعل', 'Enabled') : t('معطل', 'Disabled')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveNotifSettings}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                <span>{t('حفظ التفضيلات', 'Save Preferences')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 8: Notifications Center (supp-notif-center)
          ========================================================================= */}
      {activeModuleId === 'supp-notif-center' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${
          isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">notifications_active</span>
              {t(`مركز التنبيهات والإشعارات الرسمية (${notifications.length})`, `Official Notifications Center (${notifications.length})`)}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllNotificationsAsRead}
                style={{ color: '#ffffff' }}
                className="mark-all-read-btn flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-teal-600/30 active:scale-95 cursor-pointer"
                title={t('تحديد جميع التنبيهات كمقروءة بضغطة زر واحدة', 'Mark all notifications as read in one click')}
              >
                <span className="material-symbols-outlined text-sm" style={{ color: '#ffffff' }}>done_all</span>
                <span style={{ color: '#ffffff' }}>{t('الكل مقروء', 'Mark All Read')}</span>
              </button>
              <span className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 font-mono font-bold px-3 py-1 rounded-full border border-teal-500/20">
                {notifications.filter(n => !(n.read === true || n.read === 1 || (n as any).is_read === 1 || (n as any).is_read === true)).length} {t('غير مقروءة', 'unread')}
              </span>
            </div>
          </div>

          {notifications.length === 0 ? (
            <EmptyState
              icon="notifications_off"
              title={t('لا توجد تنبيهات مسجلة', 'No Notifications')}
              description={t('جميع الإشعارات الصادرة ستظهر هنا فور وقوع الحدث.', 'All alerts and system events will appear here.')}
            />
          ) : (
            <div className="space-y-3">
              {notifications.map(n => {
                const isRead = Boolean(n.read === true || n.read === 1 || (n as any).is_read === 1 || (n as any).is_read === true);
                return (
                  <div
                    key={n.id}
                    dir={language === 'en' ? 'ltr' : 'rtl'}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isRead
                        ? isDark ? 'bg-[#0a0c10] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                        : isDark ? 'bg-teal-600/10 border-teal-500/30 text-white font-bold' : 'bg-teal-50 border-teal-300 text-slate-900 font-bold shadow-sm'
                    }`}
                  >
                    <div className={`space-y-1 ${language === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-center gap-2">
                        {!isRead && <span className="w-2 h-2 rounded-full bg-teal-500 inline-block animate-pulse"></span>}
                        <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {localizeNotificationTitle(n.title, language)}
                        </p>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium`}>
                        {localizeNotificationMessage(n.message, language)}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 whitespace-nowrap mx-3">
                      {localizeTimestamp(n.timestamp, language)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 9: Profile & Preference Settings (supp-profile-settings)
          ========================================================================= */}
      {activeModuleId === 'supp-profile-settings' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200 text-xs">
          {passwordToast && (
            <div className={`p-3.5 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 ${
              passwordToast.type === 'success' ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              <span className="material-symbols-outlined text-base">
                {passwordToast.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{passwordToast.msg}</span>
            </div>
          )}

          {/* Profile Overview Card */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3.5 border-b pb-4 border-slate-200 dark:border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-teal-600/30">
                {(currentUser?.name || 'V').charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{currentUser?.name || 'مستخدم النظام'}</h3>
                <p className="text-teal-600 dark:text-teal-400 font-mono text-xs">{currentUser?.role || 'موظف'}</p>
                <p className="text-slate-400 text-[11px]">{currentUser?.email || 'user@vitasiraq.iq'}</p>
              </div>
            </div>

            {/* Language & Theme Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t('لغة واجهة النظام', 'System Language')}</h4>
                  <p className="text-[10px] text-slate-400">{isEn ? 'Current: English' : 'الحالية: العربية'}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  {isEn ? 'عربي' : 'English'}
                </button>
              </div>

              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{t('مظهر الواجهة (Theme)', 'Theme')}</h4>
                  <p className="text-[10px] text-slate-400">{isDark ? 'Dark Mode (ليلي)' : 'Light Mode (نهاري)'}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  {isDark ? '☀️ نهاري' : '🌙 ليلي'}
                </button>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-white/10">
              <span className="material-symbols-outlined text-teal-600">lock_reset</span>
              {t('تغيير كلمة المرور وتأمين الحساب', 'Change Password & Security')}
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{t('كلمة المرور الحالية', 'Current Password')}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{t('كلمة المرور الجديدة *', 'New Password *')}</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">{t('تأكيد كلمة المرور الجديدة *', 'Confirm Password *')}</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer"
              >
                {t('تحديث كلمة المرور', 'Update Password')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 10: Internal Staff Live Chat (supp-internal-chat)
          ========================================================================= */}
      {activeModuleId === 'supp-internal-chat' && (
        <div className={`max-w-2xl mx-auto p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${
          isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">forum</span>
              {t('المحادثات والتواصل الفوري مع مسؤولي الدعم', 'Internal Staff Support Chat')}
            </h2>
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('متصل الآن', 'Online')}
            </span>
          </div>

          {/* Channel Selector */}
          <div className="flex items-center gap-1.5 border-b border-slate-200/60 dark:border-white/5 pb-2">
            {[
              { id: 'hr', labelAr: '#الموارد_البشرية', labelEn: '#HR_Support' },
              { id: 'it', labelAr: '#تقنية_المعلومات', labelEn: '#IT_Helpdesk' },
              { id: 'branches', labelAr: '#شؤون_الفروع', labelEn: '#Branch_Ops' },
            ].map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChatChannel(ch.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activeChatChannel === ch.id
                    ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                    : isDark
                      ? 'bg-[#0a0c10] border-slate-800 text-slate-300'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {isEn ? ch.labelEn : ch.labelAr}
              </button>
            ))}
          </div>

          <div className={`h-64 overflow-y-auto p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#0a0c10] border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            {(chatMessages[activeChatChannel] || []).map((msg, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span className="font-bold text-teal-600 dark:text-teal-400">{msg.sender}</span>
                  <span>{msg.time}</span>
                </div>
                <div className={`p-3 rounded-2xl text-xs max-w-[85%] ${
                  msg.sender === (currentUser?.name || 'مستخدم النظام')
                    ? 'bg-teal-600 text-white mr-auto'
                    : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800 shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChatMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={t('اكتب رسالتك المباشرة هنا...', 'Type your message here...')}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-xs outline-none ${
                isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
              }`}
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md shadow-teal-600/20 cursor-pointer"
            >
              {t('إرسال', 'Send')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 11: Mobile Application Download & Companion (supp-mobile-app / supp-nexus-mobile)
          ========================================================================= */}
      {(activeModuleId === 'supp-mobile-app' || activeModuleId === 'supp-nexus-mobile') && (
        <div className={`max-w-xl mx-auto p-8 rounded-3xl border shadow-xl text-center space-y-6 ${
          isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">smartphone</span>
          </div>

          <div>
            <h2 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>VITAS IRAQ HRMS Mobile App Suite</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('تطبيقات الهاتف المحمول للمدير العام والموظفين للوصول المباشر للدوام، الرواتب والقرارات', 'Enterprise Mobile App Suite')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* General Manager Executive App */}
            <div className={`p-4 rounded-2xl border text-start space-y-2.5 ${
              isDark ? 'bg-gradient-to-br from-amber-500/10 to-slate-900 border-amber-500/30' : 'bg-amber-50/60 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider">
                  EXECUTIVE SUITE
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                  GM & Leadership
                </span>
              </div>
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('تطبيق المدير العام والقيادة التنفيذية', 'General Manager Decision Suite')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('لوحة اتخاذ القرارات والمصادقات اللحظية، ومتابعة أداء الـ 16 فرعاً وإصدار الأوامر الإدارية.',
                   'Real-time decision cockpit, approvals, 16-branch telemetry and executive decrees on mobile.')}
              </p>
              <a
                href="/executive-app"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">shield_person</span>
                <span>{t('تشغيل تطبيق المدير العام', 'Open GM Mobile App')}</span>
              </a>
            </div>

            {/* Employee Self-Service App */}
            <div className={`p-4 rounded-2xl border text-start space-y-2.5 ${
              isDark ? 'bg-gradient-to-br from-teal-500/10 to-slate-900 border-teal-500/30' : 'bg-teal-50/60 border-teal-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider">
                  EMPLOYEE ESS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[9px] font-bold">
                  All Staff
                </span>
              </div>
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('تطبيق الموظف الذاتي (ESS)', 'Employee Self-Service App')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('بوابة الموظف للهواتف المحمولة لمتابعة الحضور، الإجازات، الراتب الشهري، وتقديم الشكاوى.',
                   'Employee companion for leaves, payslips, live attendance and grievances.')}
              </p>
              <a
                href="/employee-app"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">person</span>
                <span>{t('تشغيل تطبيق الموظف', 'Open Employee App')}</span>
              </a>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => alert('جاري تجهيز حزمة تثبيت أندرويد VITAS_HRMS.apk')}
              className="px-5 py-2.5 rounded-xl bg-[#0a0c10] hover:bg-slate-800 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-teal-400">android</span>
              {t('تحميل لنظام Android (APK)', 'Download Android (APK)')}
            </button>
            <button
              onClick={() => alert('سيتم تحويلك إلى متجر Apple App Store')}
              className="px-5 py-2.5 rounded-xl bg-[#0a0c10] hover:bg-slate-800 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-teal-400">apple</span>
              {t('تحميل لنظام iOS App Store', 'Download iOS App Store')}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 12: Enterprise Nexus Hub & Services Integration (supp-enterprise-nexus)
          ========================================================================= */}
      {activeModuleId === 'supp-enterprise-nexus' && (
        <div className="space-y-6 animate-in fade-in duration-200 text-xs">
          {/* Nexus Header */}
          <div className={`p-6 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">cloud_sync</span>
                {t('مركز تكامل الخدمات المؤسسية والسحابية', 'Enterprise Integration & Telemetry Hub')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {t('مركز مراقبة تكامل الخوادم، مزامنة البصمة اللحظية، مايكروسوفت 365، وسلامة قاعدة البيانات', 'System-wide health telemetry and service connectivity matrix')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPinging}
                onClick={handlePingNexus}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-sm ${isPinging ? 'animate-spin' : ''}`}>sync</span>
                <span>{isPinging ? t('جاري الفحص...', 'Pinging...') : t('فحص استجابة الخوادم (Ping)', 'Ping Telemetry')}</span>
              </button>
            </div>
          </div>

          {/* Telemetry Matrix Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { title: 'خادم قاعدة البيانات (MySQL)', subtitle: 'MariaDB 10.4 / vitasiraq_hris_db', status: 'متصل 100%', latency: `${pingLatency} ms`, icon: 'database', ok: true },
              { title: 'خادم المزامنة اللحظية (Cloud Engine)', subtitle: 'Bidirectional SSE Auto-Sync', status: 'نشط ويعمل', latency: `${(pingLatency || 15) + 4} ms`, icon: 'sync_alt', ok: true },
              { title: 'ربط Microsoft 365 & Graph API', subtitle: 'Azure AD / M365 Corporate Mail', status: 'مفعل ومصرح', latency: `${(pingLatency || 15) + 12} ms`, icon: 'mark_email_read', ok: true },
              { title: 'أجهزة البصمة بالفروع الـ 16', subtitle: 'ZKTeco Time Clocks / Network Heartbeat', status: '16 فرع متصل', latency: `${(pingLatency || 15) + 8} ms`, icon: 'fingerprint', ok: true },
            ].map(tel => (
              <div
                key={tel.title}
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 material-symbols-outlined text-lg">
                    {tel.icon}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{tel.status}</span>
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white pt-1">{tel.title}</h4>
                <p className="text-[10.5px] text-slate-500">{tel.subtitle}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>Latency:</span>
                  <span className="text-emerald-500 font-bold">{tel.latency}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Integration Features Summary */}
          <div className={`p-5 rounded-3xl border space-y-3 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-teal-600">security</span>
              {t('مواصفات الأمان ومزامنة البيانات في فيتاس العراق', 'Security & Telemetry Specifications')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="font-bold text-teal-600 dark:text-teal-400">تشفير البيانات (AES-256)</span>
                <p>تشفير كامل لكافة بيانات الرواتب، العقود، والأرقام القومية للموظفين أثناء الإرسال والتخزين.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="font-bold text-teal-600 dark:text-teal-400">سجل التدقيق (Audit Logs)</span>
                <p>تسجيل زمني دقيق لكل عملية تعديل، إضافة، أو مصادقة في النظام مع تحديد المستخدم والفرع والوقت.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 space-y-1">
                <span className="font-bold text-teal-600 dark:text-teal-400">المزامنة مع Microsoft 365</span>
                <p>إرسال العقود تلقائياً وتنبيهات البريد عبر نطاق vitasiraq.iq مع دعم تقارير التسليم اللحظية.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Add New Document / Upload Handbook (Reusable)
          ========================================================================= */}
      {isAddDocModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-xs ${
            isDark ? 'bg-[#111827] border-white/20' : 'bg-white border-slate-300'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">upload_file</span>
                {t('إضافة ورفع مستند أو كتيب جديد', 'Upload New Handbook or Policy Document')}
              </h3>
              <button
                onClick={() => setIsAddDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('عنوان المستند أو الكتيب *', 'Document Title *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('مثال: كتيب الموظف المحدث 2026، دليل سياسات الإجازات', 'e.g. Employee Handbook 2026, Leave Policy Guide')}
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('فئة المستند', 'Category')}
                  </label>
                  <select
                    value={newDocCategory}
                    onChange={e => setNewDocCategory(e.target.value as any)}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <option value="كتيب الموظف">{t('كتيب الموظف (Handbook)', 'Employee Handbook')}</option>
                    <option value="دليل وسياسات">{t('دليل وسياسات الموارد البشرية', 'HR Policies & Guidelines')}</option>
                    <option value="التوظيف والموارد البشرية">{t('التوظيف والـ ATS', 'Recruitment & ATS')}</option>
                    <option value="الأمان وتكنولوجيا المعلومات">{t('الأمان وتكنولوجيا المعلومات', 'Security & IT')}</option>
                    <option value="اللوائح القانونية">{t('اللوائح والتشريعات القانونية', 'Legal & Regulatory')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                    {t('رقم الإصدار', 'Version')}
                  </label>
                  <input
                    type="text"
                    placeholder="v1.0"
                    value={newDocVersion}
                    onChange={e => setNewDocVersion(e.target.value)}
                    style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('ملف المستند (PDF / Word / Excel) *', 'Document File (PDF/DOCX) *')}
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={e => setNewDocFile(e.target.files?.[0] || null)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none cursor-pointer ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('وصف وتفاصيل المستند', 'Description')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('ملاحظات وتفاصيل المستند المعتمد...', 'Description of the handbook...')}
                  value={newDocDescription}
                  onChange={e => setNewDocDescription(e.target.value)}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full p-3 rounded-xl border text-xs font-normal outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddDocModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25"
                >
                  {t('حفظ ورفع المستند', 'Upload & Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
