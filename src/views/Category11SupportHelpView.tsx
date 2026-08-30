import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';

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

export const Category11SupportHelpView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    currentUser,
    notifications,
    markNotificationRead,
    resetToZeroData,
    theme,
    t
  } = useApp();

  const isDark = theme === 'dark';

  // --- Support Tickets State ---
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  // --- Live Chat State ---
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([
    { sender: 'مكتب الدعم الفني', text: 'أهلاً بك في بوابة فيتاس العراق! كيف يمكننا مساعدتك اليوم؟', time: '09:00 ص' }
  ]);

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

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject) return;
    setTicketSent(true);
    setTicketSubject('');
    setTicketMsg('');
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput) return;
    const newM = {
      sender: currentUser?.name || 'مستخدم النظام',
      text: chatInput,
      time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, newM]);
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
    alert('تم إضافة ورفع المستند بنجاح إلى قاعدة المعرفة والكتيبات.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-[#e8ebef] border-slate-300'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">support_agent</span>
            <span className="text-xs font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest font-normal">
              SUPPORT, COMMUNICATION & HANDBOOK PORTAL
            </span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {(activeModuleId === 'supp-knowledge-base' || activeModuleId === 'supp-emp-handbook' || activeModuleId === 'supp-guide-center' || activeModuleId === 'sup-guides' || activeModuleId === 'sup-faq') && t('كتيب الموظف وقاعدة المعرفة والأدلة الرسمية', 'Employee Handbook & Knowledge Base Portal')}
            {activeModuleId === 'supp-emp-portal' && t('بوابة دعم الموظفين وتذاكر الاستفسارات', 'Employee Support Portal & Tickets')}
            {activeModuleId === 'supp-agent-desk' && t('لوحة مكتب وكيل الدعم وإدارة التذاكر', 'Support Desk Agent Portal & Ticket Management')}
            {activeModuleId === 'supp-news-admin' && t('إدارة ونشر الأخبار والتنبيهات الإدارية', 'Company News & Announcements Admin')}
            {activeModuleId === 'supp-notif-center' && t('مركز التنبيهات والأحداث الرسمية', 'Notification & Events Center')}
            {activeModuleId === 'supp-profile-settings' && t('إعدادات الملف والتفضيلات الشخصية', 'Profile & Preference Settings')}
            {activeModuleId === 'supp-internal-chat' && t('المحادثات المباشرة بين الموظفين (Live Chat)', 'Internal Staff Messaging')}
            {activeModuleId === 'supp-mobile-app' && t('تحميل ومزامنة تطبيق الهاتف المحمول', 'Mobile Application Download')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('المستودع الرقمي للأدلة والكتيبات الرسمية والتواصل الداخلي لمؤسسة فيتاس العراق', 'Digital repository of official handbooks, guides, and communication channels')}
          </p>
        </div>

        {/* Quick Nav Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {[
            { id: 'supp-knowledge-base', label: t('الكتيبات والمستندات', 'Handbooks & Docs'), icon: 'menu_book' },
            { id: 'supp-emp-portal', label: t('تذاكر الدعم', 'Support Tickets'), icon: 'confirmation_number' },
            { id: 'supp-internal-chat', label: t('المحادثة المباشرة', 'Chat'), icon: 'forum' },
            { id: 'supp-notif-center', label: t('التنبيهات', 'Alerts'), icon: 'notifications' },
            { id: 'supp-mobile-app', label: t('تطبيق الموبايل', 'Mobile App'), icon: 'smartphone' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveModuleId(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
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
          MODULE 1: Handbooks, Knowledge Base & Documents Repository
          ========================================================================= */}
      {(activeModuleId === 'supp-knowledge-base' ||
        activeModuleId === 'supp-emp-handbook' ||
        activeModuleId === 'supp-guide-center' ||
        activeModuleId === 'sup-guides' ||
        activeModuleId === 'sup-faq' ||
        !activeModuleId) && (
        <div className="space-y-6">
          {/* Top Bar with Add Document Button */}
          <div className={`p-5 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h2 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('مستودع الكتيبات والمستندات الرسمية المعتمدة', 'Approved Handbooks & Official Documents Repository')}
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                {t('تحميل واستعراض كراسات السياسات ودليل الموظف ومسارات العمل', 'Download and view policy booklets, employee handbooks, and workflow guides')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddDocModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>{t('+ إضافة مستند جديد', '+ Add / Upload Document')}</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              SPECIAL FEATURE: Interactive Recruitment Workflow Guide (مسار عمل التوظيف)
              ========================================================================= */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 material-symbols-outlined text-xl">
                  work_history
                </span>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('دليل ومسار عمل التوظيف والـ ATS من الإعلان حتى التعيين الرسمي', 'Recruitment & ATS Lifecycle Workflow Guide')}
                  </h3>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {t('الخطوات الإجرائية الست لمسؤول التوظيف في مؤسسة فيتاس العراق', 'The 6 standard operating steps for VITAS Iraq Recruiters')}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold font-mono text-[10px]">
                {t('مخطط تفاعلي معتمد', 'Standard SOP')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {[
                {
                  step: '01',
                  title: 'إعلان ونشر الشاغر الوظيفي',
                  sub: 'Job Posting & Vacancy Creation',
                  icon: 'post_add',
                  desc: 'الدخول إلى شاشة الشواغر -> إضافة وظيفة جديدة وتحديد المسمى، الفرع، الراتب، المؤهلات والمسؤوليات -> نشر الشاغر لتظهر فوراً في بوابة التقديم (/apply).'
                },
                {
                  step: '02',
                  title: 'استقبال طلبات المتقدمين والسي في',
                  sub: 'Application Intake & CVs',
                  icon: 'cloud_download',
                  desc: 'يقوم المتقدم بملء البيانات الشخصية والاسم باللغة العربية والإنجليزية ورفع السيرة الذاتية PDF -> يتم قيد الطلب فوراً في قاعدة البيانات بحالة (جديد).'
                },
                {
                  step: '03',
                  title: 'فرز ومطابقة السير الذاتية (ATS)',
                  sub: 'Screening & Shortlisting',
                  icon: 'filter_alt',
                  desc: 'مراجعة مؤهلات وخبرات المرشح عبر شاشة تتبع المتقدمين ATS -> نقل المرشح المطابق لمرحلة (تم الفرز / Shortlisted) وإرسال إشعار للمرشح.'
                },
                {
                  step: '04',
                  title: 'جدولة المقابلات والتقييم',
                  sub: 'Interview & Evaluation',
                  icon: 'groups',
                  desc: 'تحديد موعد المقابلة مع أعضاء اللجنة -> تسجيل درجات التقييم الفني والسلوكي وتدوين ملاحظات المقابلة في بطاقة المرشح.'
                },
                {
                  step: '05',
                  title: 'تقديم العرض الوظيفي (Job Offer)',
                  sub: 'Offer Letter & Negotiation',
                  icon: 'mark_email_read',
                  desc: 'إصدار خطاب العرض الوظيفي الرسمي وتحديد الراتب والبدلات والمسمى وموعد المباشرة المتوقع بعد اعتماد إدارة الموارد البشرية.'
                },
                {
                  step: '06',
                  title: 'إتمام التعيين والتحويل لدليل الموظفين',
                  sub: 'Hire & Direct Onboarding',
                  icon: 'how_to_reg',
                  desc: 'الضغط على زر (تعيين واعتماد) -> يتم توليد رقم وظيفي ونقل بيانات المرشح آلياً إلى سجلات الموظفين الرسمية لتفعيل الراتب والإجازات.'
                }
              ].map(s => (
                <div
                  key={s.step}
                  className={`p-4 rounded-2xl border space-y-2 relative overflow-hidden transition-all hover:border-teal-500/50 ${
                    isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono font-bold flex items-center justify-center text-xs">
                      {s.step}
                    </span>
                    <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-xl">
                      {s.icon}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{s.title}</h4>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 font-mono font-bold">{s.sub}</p>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed pt-1">
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* List of Available Handbooks & Documents */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm px-1" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {t(`قائمة الكتيبات والمستندات المتاحة (${documents.length})`, `Available Handbooks & Documents (${documents.length})`)}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className={`p-5 rounded-2xl border space-y-3 shadow-sm transition-all hover:border-teal-500/50 ${
                    isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5">
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                        {doc.category}
                      </span>
                      <h4 className="font-bold text-sm pt-1" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                        {doc.title}
                      </h4>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-400 shrink-0">
                      {doc.version}
                    </span>
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                    {doc.description}
                  </p>

                  <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                    isDark ? 'border-white/5' : 'border-slate-100'
                  }`}>
                    <div className="flex items-center gap-3 text-slate-400 font-mono">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">attach_file</span>
                        {doc.fileName}
                      </span>
                      <span>•</span>
                      <span>{doc.fileSize}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => alert(`جاري تنزيل ملف: ${doc.fileName}`)}
                        className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-xs">download</span>
                        <span>{t('تحميل المستند', 'Download')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: Add New Document / Upload Handbook
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

      {/* =========================================================================
          MODULE 2: Employee Support Tickets (supp-emp-portal)
          ========================================================================= */}
      {activeModuleId === 'supp-emp-portal' && (
        <div className={`max-w-2xl mx-auto p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${
          isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <h2 className="text-sm font-bold border-b border-slate-200 dark:border-white/10 pb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {t('تقديم تذكرة دعم جديدة', 'Submit New Support Ticket')}
          </h2>

          {ticketSent && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
              {t(`تم إرسال تذكرتك بنجاح برقم #TK-${Math.floor(1000 + Math.random() * 9000)} وسيتواصل معك فريق الدعم قريباً.`, `Your ticket #TK-${Math.floor(1000 + Math.random() * 9000)} was submitted successfully.`)}
            </div>
          )}

          <form onSubmit={handleSendTicket} className="space-y-3">
            <div>
              <label className="block font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('موضوع التذكرة *', 'Ticket Subject *')}
              </label>
              <input
                type="text"
                required
                placeholder={t('مثال: استفسار عن اقتطاع بدل السكن لهذا الشهر', 'e.g. Housing allowance query for this month')}
                value={ticketSubject}
                onChange={e => setTicketSubject(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            <div>
              <label className="block font-bold mb-1" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('تفاصيل الاستفسار أو المشكلة *', 'Issue / Request Details *')}
              </label>
              <textarea
                rows={4}
                required
                placeholder={t('اكتب استفسارك بالتفصيل...', 'Write details...')}
                value={ticketMsg}
                onChange={e => setTicketMsg(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full p-3 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all text-xs"
            >
              {t('إرسال التذكرة لفريق الموارد البشرية والدعم', 'Submit Ticket')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 3: Internal Staff Live Chat (supp-internal-chat)
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

          <div className={`h-64 overflow-y-auto p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-[#0a0c10] border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            {chatMessages.map((msg, idx) => (
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
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-md shadow-teal-600/20"
            >
              {t('إرسال', 'Send')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 4: Notifications Center (supp-notif-center)
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
            <span className="text-xs bg-teal-500/10 text-teal-700 dark:text-teal-400 font-mono font-bold px-3 py-1 rounded-full border border-teal-500/20">
              {notifications.filter(n => !n.read).length} {t('غير مقروءة', 'unread')}
            </span>
          </div>

          {notifications.length === 0 ? (
            <EmptyState
              icon="notifications_off"
              title={t('لا توجد تنبيهات مسجلة', 'No Notifications')}
              description={t('جميع الإشعارات الصادرة ستظهر هنا فور وقوع الحدث.', 'All alerts and system events will appear here.')}
            />
          ) : (
            <div className="space-y-3">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markNotificationRead(n.id)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    n.read
                      ? isDark ? 'bg-[#0a0c10] border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                      : isDark ? 'bg-teal-600/10 border-teal-500/30 text-white font-bold' : 'bg-teal-50 border-teal-300 text-slate-900 font-bold shadow-sm'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-teal-500 inline-block animate-pulse"></span>}
                      <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{n.title}</p>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'} font-medium`}>{n.message}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500 whitespace-nowrap mr-3">{n.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 5: Mobile App Download (supp-mobile-app)
          ========================================================================= */}
      {activeModuleId === 'supp-mobile-app' && (
        <div className={`max-w-xl mx-auto p-8 rounded-3xl border shadow-xl text-center space-y-6 ${
          isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-teal-600/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">smartphone</span>
          </div>

          <div>
            <h2 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>VITAS IRAQ HRMS Mobile App</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('تطبيق الموبايل المباشر لمتابعة الإجازات، الراتب والدوام من هاتفك الذكي', 'Mobile app for tracking leaves, payslips & attendance on your smartphone')}</p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => alert('جاري تجهيز حزمة تثبيت أندرويد VITAS_HRMS.apk')}
              className="px-5 py-2.5 rounded-xl bg-[#0a0c10] hover:bg-slate-800 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-teal-400">android</span>
              {t('تحميل لنظام Android (APK)', 'Download Android (APK)')}
            </button>
            <button
              onClick={() => alert('سيتم تحويلك إلى متجر Apple App Store')}
              className="px-5 py-2.5 rounded-xl bg-[#0a0c10] hover:bg-slate-800 text-white font-bold text-xs border border-white/10 flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-teal-400">apple</span>
              {t('تحميل لنظام iOS App Store', 'Download iOS App Store')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
