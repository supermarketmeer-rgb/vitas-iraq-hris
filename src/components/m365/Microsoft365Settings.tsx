import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';
import { SendDocumentDialog } from './SendDocumentDialog';

interface Template {
  id: number;
  template_name: string;
  template_name_en?: string;
  category: string;
  subject: string;
  body: string;
  language: string;
  is_active: number;
}

interface AuditLog {
  id: string;
  operation_id: string;
  user_id?: string;
  user_name?: string;
  recipient_employee_id?: string;
  recipient_name?: string;
  recipient_email: string;
  subject: string;
  document_name?: string;
  status: 'Pending' | 'Accepted by Microsoft Graph' | 'Failed' | 'Delivery Confirmed';
  error_code?: string;
  error_message?: string;
  graph_message_id?: string;
  attachments_count: number;
  sent_at?: string;
  created_at: string;
}

export const Microsoft365Settings: React.FC = () => {
  const { language, theme, t, currentUser } = useApp();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'connection' | 'templates' | 'audit' | 'tests' | 'guide'>('connection');

  // Connection settings state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [validatingMailbox, setValidatingMailbox] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [hasStoredSecret, setHasStoredSecret] = useState(false);
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [clientSecretExpiry, setClientSecretExpiry] = useState('');
  const [senderMailbox, setSenderMailbox] = useState('');
  const [senderDisplayName, setSenderDisplayName] = useState('VITAS Iraq HR');
  const [graphBaseUrl, setGraphBaseUrl] = useState('https://graph.microsoft.com/v1.0');
  const [isUrlLocked, setIsUrlLocked] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('needs_setup');
  const [lastConnectionTest, setLastConnectionTest] = useState<any>(null);

  // Status feedback toast/alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string; details?: string } | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    template_name: '',
    template_name_en: '',
    category: 'contracts',
    subject: '',
    body: '',
    language: 'ar',
    is_active: 1
  });

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit] = useState(15);
  const [logsSearch, setLogsSearch] = useState('');
  const [logsStatusFilter, setLogsStatusFilter] = useState('all');
  const [selectedLogDetails, setSelectedLogDetails] = useState<AuditLog | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Acceptance Tests state
  const [runningTests, setRunningTests] = useState(false);
  const [testReport, setTestReport] = useState<any>(null);

  // Test Send Dialog
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);

  // Load Settings on Mount
  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  // Reload logs when audit tab opened or filters changed
  useEffect(() => {
    if (activeTab === 'audit') {
      loadLogs();
    }
  }, [activeTab, logsPage, logsSearch, logsStatusFilter]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data: any = await api.getM365Settings();
      setEnabled(Boolean(data.enabled));
      setTenantId(data.tenantId || '');
      setClientId(data.clientId || '');
      setHasStoredSecret(Boolean(data.hasClientSecret));
      setClientSecret('');
      setClientSecretExpiry(data.clientSecretExpiry || '');
      setSenderMailbox(data.senderMailbox || '');
      setSenderDisplayName(data.senderDisplayName || 'VITAS Iraq HR');
      setGraphBaseUrl(data.graphBaseUrl || 'https://graph.microsoft.com/v1.0');
      setConnectionStatus(data.connectionStatus || 'needs_setup');
      setLastConnectionTest(data.lastConnectionTest || null);
    } catch (err: any) {
      console.error('Error loading M365 settings:', err);
      setFeedback({ type: 'error', message: isAr ? 'فشل تحميل إعدادات Microsoft 365' : 'Failed to load Microsoft 365 settings', details: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const data: any = await api.getM365Templates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error loading templates:', err);
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const data: any = await api.getM365AuditLogs({
        page: logsPage,
        limit: logsLimit,
        search: logsSearch,
        status: logsStatusFilter !== 'all' ? logsStatusFilter : undefined
      });
      setLogs(data.logs || []);
      setLogsTotal(data.total || 0);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload: any = {
        enabled,
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        clientSecretExpiry: clientSecretExpiry.trim(),
        senderMailbox: senderMailbox.trim().toLowerCase(),
        senderDisplayName: senderDisplayName.trim(),
        graphBaseUrl: graphBaseUrl.trim()
      };

      // Only send clientSecret if user entered a new one
      if (clientSecret.trim()) {
        payload.clientSecret = clientSecret.trim();
      }

      const res: any = await api.saveM365Settings(payload);
      setHasStoredSecret(res.settings?.hasClientSecret ?? true);
      setClientSecret('');
      setShowSecretInput(false);
      setFeedback({
        type: 'success',
        message: isAr ? 'تم حفظ إعدادات Microsoft 365 بنجاح وتشفير المفتاح السري' : 'Microsoft 365 settings saved and client secret securely encrypted'
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings',
        details: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      // Optional: pass current form values for testing before saving
      let testCreds: any = null;
      if (clientSecret.trim() && tenantId.trim() && clientId.trim()) {
        testCreds = {
          tenantId: tenantId.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
          senderMailbox: senderMailbox.trim()
        };
      }

      const res: any = await api.testM365Connection(testCreds);
      setConnectionStatus(res.status || (res.success ? 'connected' : 'disconnected'));
      setLastConnectionTest(res);

      if (res.success) {
        setFeedback({
          type: 'success',
          message: isAr ? (res.message_ar || 'تم الاتصال بنجاح بـ Microsoft Graph API') : res.message,
          details: isAr ? `صلاحية الرمز المميز: ${res.tokenExpiresIn} ثانية` : `Token Expires In: ${res.tokenExpiresIn}s`
        });
      } else {
        setFeedback({
          type: 'error',
          message: isAr ? (res.message_ar || 'فشل الاتصال بـ Microsoft Graph') : res.message,
          details: res.error || (isAr ? 'يرجى مراجعة Tenant ID وClient ID والمفتاح السري وصلاحيات التطبيق في Microsoft Entra ID' : 'Check Tenant ID, Client ID, Secret, and Application Permissions in Entra ID')
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: isAr ? 'خطأ أثناء اختبار الاتصال' : 'Error testing connection',
        details: err.message
      });
    } finally {
      setTesting(false);
    }
  };

  const handleValidateMailbox = async () => {
    if (!senderMailbox || !senderMailbox.includes('@')) {
      setFeedback({
        type: 'error',
        message: isAr ? 'يرجى إدخال عنوان بريد إلكتروني صالح للمرسل' : 'Please enter a valid sender email address'
      });
      return;
    }

    setValidatingMailbox(true);
    setFeedback(null);
    try {
      const res: any = await api.validateM365Mailbox(senderMailbox.trim());
      if (res.valid) {
        setFeedback({
          type: 'success',
          message: isAr ? (res.message_ar || 'تم التحقق من صندوق البريد بنجاح') : res.message,
          details: isAr ? `اسم الحساب: ${res.displayName || senderMailbox} | الحالة: نشط` : `Account: ${res.displayName} | Status: Active`
        });
      } else {
        setFeedback({
          type: 'error',
          message: isAr ? (res.error_ar || 'صندوق البريد غير متاح أو غير معتمد') : res.error,
          details: isAr ? 'تأكد من وجود صندوق البريد في حساب Microsoft 365 للمؤسسة ومنحه التراخيص المطلوبة' : 'Ensure mailbox exists in tenant and has appropriate Exchange licenses'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: isAr ? 'فشل التحقق من صندوق البريد' : 'Failed to validate mailbox',
        details: err.message
      });
    } finally {
      setValidatingMailbox(false);
    }
  };

  const handleDisableIntegration = async () => {
    const confirmMsg = isAr
      ? 'هل أنت متأكد من رغبتك في تعطيل التكامل مع Microsoft 365؟\nلن يتمكن التطبيق من إرسال العقود والرسائل حتى إعادة التفعيل.'
      : 'Are you sure you want to disable Microsoft 365 integration?\nEmail sending features will be disabled until re-enabled.';

    if (window.confirm(confirmMsg)) {
      setSaving(true);
      try {
        await api.disableM365Integration();
        setEnabled(false);
        setFeedback({
          type: 'info',
          message: isAr ? 'تم تعطيل التكامل مع Microsoft 365' : 'Microsoft 365 integration has been disabled'
        });
      } catch (err: any) {
        setFeedback({ type: 'error', message: err.message });
      } finally {
        setSaving(false);
      }
    }
  };

  // Run 15-point acceptance tests
  const handleRunAcceptanceTests = async () => {
    setRunningTests(true);
    setFeedback(null);
    try {
      const report: any = await api.runM365AcceptanceTests();
      setTestReport(report);
      setFeedback({
        type: report.success ? 'success' : 'info',
        message: isAr 
          ? `اكتمل تشغيل اختبارات القبول: نجاح ${report.passedCount} من ${report.totalTests} اختبار (${report.passRate})`
          : `Acceptance tests completed: ${report.passedCount}/${report.totalTests} passed (${report.passRate})`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: isAr ? 'خطأ أثناء تنفيذ الاختبارات' : 'Error executing acceptance tests',
        details: err.message
      });
    } finally {
      setRunningTests(false);
    }
  };

  // Template Form helpers
  const handleOpenTemplateModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        template_name: template.template_name,
        template_name_en: template.template_name_en || '',
        category: template.category || 'contracts',
        subject: template.subject,
        body: template.body,
        language: template.language || 'ar',
        is_active: template.is_active
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        template_name: '',
        template_name_en: '',
        category: 'contracts',
        subject: '',
        body: '',
        language: 'ar',
        is_active: 1
      });
    }
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await api.updateM365Template(editingTemplate.id, templateForm);
      } else {
        await api.createM365Template(templateForm);
      }
      setIsTemplateModalOpen(false);
      loadTemplates();
      setFeedback({
        type: 'success',
        message: isAr ? 'تم حفظ القالب بنجاح' : 'Template saved successfully'
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا القالب؟' : 'Are you sure you want to delete this template?')) {
      try {
        await api.deleteM365Template(id);
        loadTemplates();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const insertVariableIntoTemplate = (variableTag: string) => {
    setTemplateForm(prev => ({
      ...prev,
      body: prev.body + ` ${variableTag} `
    }));
  };

  // Secret expiry status calculator
  const getExpiryStatus = () => {
    if (!clientSecretExpiry) return null;
    const expiryDate = new Date(clientSecretExpiry);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return { status: 'expired', text: isAr ? 'منتهي الصلاحية!' : 'Expired!', color: 'bg-rose-500 text-white' };
    }
    if (diffDays <= 30) {
      return { status: 'warning', text: isAr ? `ينتهي خلال ${diffDays} يوماً` : `Expires in ${diffDays} days`, color: 'bg-amber-500 text-white animate-pulse' };
    }
    return { status: 'ok', text: isAr ? `صالح (${diffDays} يوماً)` : `Valid (${diffDays} days)`, color: 'bg-emerald-500 text-white' };
  };

  const expiryBadge = getExpiryStatus();

  return (
    <div className={`p-4 md:p-6 rounded-3xl transition-all duration-200 ${isDark ? 'bg-[#0a0c10] text-slate-100' : 'bg-white text-slate-800'}`}>
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <span className="material-symbols-outlined text-2xl">mark_email_read</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              {isAr ? 'إعدادات ربط Microsoft 365 وOutlook' : 'Microsoft 365 & Outlook Integration Settings'}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr 
                ? 'التواصل المؤسسي، إرسال العقود والنماذج الرسمية عبر Microsoft Graph API' 
                : 'Enterprise Communication & Document Delivery via Microsoft Graph API'}
            </p>
          </div>
        </div>

        {/* Global Connection Status Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
            connectionStatus === 'connected'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
              : connectionStatus === 'disconnected'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : connectionStatus === 'disconnected' ? 'bg-rose-500' : 'bg-amber-500'
            }`} />
            <span>
              {connectionStatus === 'connected'
                ? (isAr ? 'متصل' : 'Connected')
                : connectionStatus === 'disconnected'
                ? (isAr ? 'غير متصل' : 'Disconnected')
                : (isAr ? 'يحتاج إلى إعداد' : 'Needs Setup')}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsSendDialogOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <span className="material-symbols-outlined text-base">outgoing_mail</span>
            <span>{isAr ? 'إرسال مستند لموظف' : 'Send Document to Employee'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`mt-4 p-4 rounded-2xl border flex items-start gap-3 transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
            : feedback.type === 'error'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-300'
        }`}>
          <span className="material-symbols-outlined text-xl shrink-0 mt-0.5">
            {feedback.type === 'success' ? 'check_circle' : feedback.type === 'error' ? 'error' : 'info'}
          </span>
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm">{feedback.message}</div>
            {feedback.details && <div className="mt-1 opacity-90 font-mono text-[11px] break-all">{feedback.details}</div>}
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto mt-6 pb-2 border-b border-slate-200 dark:border-white/10 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('connection')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'connection'
              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">settings_ethernet</span>
          <span>{isAr ? 'إعدادات الاتصال والمصادقة' : 'Connection & Auth'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">drafts</span>
          <span>{isAr ? 'قوالب الرسائل' : 'Email Templates'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">{templates.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">fact_check</span>
          <span>{isAr ? 'سجل العمليات والتدقيق' : 'Audit Logs & Deliveries'}</span>
          {logsTotal > 0 && <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">{logsTotal}</span>}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tests'
              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">verified</span>
          <span>{isAr ? 'اختبارات القبول الشاملة (15 اختبار)' : 'Acceptance Tests (15 Tests)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-base">menu_book</span>
          <span>{isAr ? 'دليل المسؤول وصلاحيات Entra ID' : 'Admin & Permissions Guide'}</span>
        </button>
      </div>

      {/* TAB 1: CONNECTION SETTINGS */}
      {activeTab === 'connection' && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          
          {/* Main Form Box */}
          <div className={`p-5 md:p-6 rounded-2xl border ${isDark ? 'bg-[#0f141c] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <h2 className="text-base font-bold flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-teal-500">vpn_key</span>
              <span>{isAr ? 'بيانات الاعتماد والاتصال بـ Microsoft Entra ID' : 'Credentials & Microsoft Entra ID'}</span>
            </h2>

            {/* Toggle Enable Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/5 mb-6">
              <div>
                <div className="font-bold text-sm">
                  {isAr ? 'تفعيل التكامل مع Microsoft 365 (Enable Integration)' : 'Enable Microsoft 365 Integration'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? 'السماح للنظام بإرسال الرسائل والمستندات عبر Microsoft Graph API' : 'Allow system to send emails and documents via Microsoft Graph'}
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Tenant ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'معرّف المؤسسة (Microsoft Tenant ID)' : 'Microsoft Tenant ID'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  placeholder="e.g. 8f4b23a1-1234-5678-abcd-0123456789ab"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all outline-none ${
                    isDark ? 'bg-[#0a0c10] border-white/10 focus:border-teal-400 text-white' : 'bg-white border-slate-300 focus:border-teal-500 text-slate-900'
                  }`}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'Directory (tenant) ID من صفحة التطبيق في Microsoft Entra' : 'Directory (tenant) ID from Azure Entra App Overview'}
                </p>
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'معرّف التطبيق (Application Client ID)' : 'Application (client) ID'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  placeholder="e.g. 3e2a1b9c-4321-8765-dcba-9876543210fe"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all outline-none ${
                    isDark ? 'bg-[#0a0c10] border-white/10 focus:border-teal-400 text-white' : 'bg-white border-slate-300 focus:border-teal-500 text-slate-900'
                  }`}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'Application (client) ID الخاص بالتطبيق المسجل' : 'Application (client) ID of the registered App'}
                </p>
              </div>

              {/* Client Secret */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>{isAr ? 'المفتاح السري (Client Secret)' : 'Client Secret'}</span>
                    {hasStoredSecret && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {isAr ? 'مشفّر ومحفوظ في الخادم' : 'Encrypted & Saved on Server'}
                      </span>
                    )}
                  </label>
                  {hasStoredSecret && (
                    <button
                      type="button"
                      onClick={() => setShowSecretInput(!showSecretInput)}
                      className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold"
                    >
                      {showSecretInput ? (isAr ? 'إلغاء التعديل' : 'Cancel Edit') : (isAr ? 'تغيير المفتاح السري' : 'Change Secret')}
                    </button>
                  )}
                </div>

                {!hasStoredSecret || showSecretInput ? (
                  <div className="relative">
                    <input
                      type="password"
                      value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      placeholder={isAr ? 'أدخل المفتاح السري الجديد...' : 'Enter new client secret...'}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all outline-none ${
                        isDark ? 'bg-[#0a0c10] border-white/10 focus:border-teal-400 text-white' : 'bg-white border-slate-300 focus:border-teal-500 text-slate-900'
                      }`}
                    />
                  </div>
                ) : (
                  <div className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono select-none flex items-center justify-between ${
                    isDark ? 'bg-[#0a0c10]/60 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                  }`}>
                    <span>••••••••••••••••••••••••••••••••</span>
                    <span className="text-[10px] text-slate-400 italic">
                      {isAr ? 'مخفي لأسباب أمنية (AES-256)' : 'Hidden for security'}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'يتم تشفيره باستخدام AES-256-GCM ولا يُرسل أبداً إلى المتصفح' : 'Encrypted via AES-256-GCM and never returned to the browser'}
                </p>
              </div>

              {/* Client Secret Expiration Date */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'تاريخ انتهاء صلاحية المفتاح (Secret Expiry Date)' : 'Client Secret Expiry Date'}
                  </label>
                  {expiryBadge && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${expiryBadge.color}`}>
                      {expiryBadge.text}
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={clientSecretExpiry}
                  onChange={e => setClientSecretExpiry(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-all outline-none ${
                    isDark ? 'bg-[#0a0c10] border-white/10 focus:border-teal-400 text-white' : 'bg-white border-slate-300 focus:border-teal-500 text-slate-900'
                  }`}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'لأغراض المتابعة والتنبيه التلقائي قبل انقطاع الخدمة' : 'For automated monitoring and renewal alerts'}
                </p>
              </div>

              {/* Sender Mailbox */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'صندوق البريد المرسل (Sender Corporate Mailbox)' : 'Sender Corporate Mailbox'} <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={senderMailbox}
                    onChange={e => setSenderMailbox(e.target.value)}
                    placeholder="hr-notification@vitasiraq.com"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all outline-none ${
                      isDark ? 'bg-[#0a0c10] border-white/10 focus:border-teal-400 text-white' : 'bg-white border-slate-300 focus:border-teal-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleValidateMailbox}
                    disabled={validatingMailbox}
                    className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold shrink-0 transition-all cursor-pointer"
                    title={isAr ? 'التحقق من وجود وصلاحيات صندوق البريد' : 'Validate mailbox via Graph API'}
                  >
                    {validatingMailbox ? '...' : (isAr ? 'فحص الصندوق' : 'Verify')}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'حساب البريد المؤسسي المعتمد لإرسال الإشعارات والعقود' : 'Authorized Exchange mailbox used to deliver emails'}
                </p>
              </div>

              {/* Default Sender Display Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'اسم المرسل الافتراضي (Sender Display Name)' : 'Default Sender Display Name'}
                </label>
                <input
                  type="text"
                  value={senderDisplayName}
                  onChange={e => setSenderDisplayName(e.target.value)}
                  placeholder="VITAS Iraq HR Team"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-all outline-none ${
                    isDark ? 'bg-[#0a0c10] border-white/10 focus:border-teal-400 text-white' : 'bg-white border-slate-300 focus:border-teal-500 text-slate-900'
                  }`}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'الاسم الذي يظهر للموظف في حقل المرسل' : 'Display name shown in employee inbox'}
                </p>
              </div>

              {/* Microsoft Graph API Base URL */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? 'نقطة نهاية Microsoft Graph API (Base URL)' : 'Microsoft Graph API Base URL'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsUrlLocked(!isUrlLocked)}
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-bold"
                  >
                    <span className="material-symbols-outlined text-sm">{isUrlLocked ? 'lock' : 'lock_open'}</span>
                    <span>{isUrlLocked ? (isAr ? 'تعديل النقطة للمطورين' : 'Unlock URL') : (isAr ? 'قفل النقطة' : 'Lock URL')}</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={graphBaseUrl}
                  readOnly={isUrlLocked}
                  onChange={e => setGraphBaseUrl(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition-all outline-none ${
                    isUrlLocked
                      ? (isDark ? 'bg-[#0a0c10]/50 border-white/5 text-slate-400 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed')
                      : (isDark ? 'bg-[#0a0c10] border-teal-400 text-white' : 'bg-white border-teal-500 text-slate-900')
                  }`}
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isAr ? 'القيمة الافتراضية المعتمدة عالمياً: https://graph.microsoft.com/v1.0' : 'Global default endpoint: https://graph.microsoft.com/v1.0'}
                </p>
              </div>
            </div>

            {/* Last Connection Test Display */}
            {lastConnectionTest && (
              <div className={`mt-5 p-3.5 rounded-xl border text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 ${
                lastConnectionTest.success 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                  : 'bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-300'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">
                    {lastConnectionTest.success ? 'check_circle' : 'error'}
                  </span>
                  <span>
                    <strong>{isAr ? 'آخر فحص للاتصال:' : 'Last Test:'}</strong> {new Date(lastConnectionTest.timestamp).toLocaleString(isAr ? 'ar-IQ' : 'en-US')} - {lastConnectionTest.message_ar || lastConnectionTest.message}
                  </span>
                </div>
                {lastConnectionTest.tokenExpiresIn > 0 && (
                  <span className="font-mono text-[11px] opacity-80">
                    {isAr ? `صلاحية الرمز: ${lastConnectionTest.tokenExpiresIn} ثانية` : `Token: ${lastConnectionTest.tokenExpiresIn}s`}
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-white/10">
              
              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">{saving ? 'sync' : 'save'}</span>
                <span>{saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الإعدادات' : 'Save Settings')}</span>
              </button>

              {/* Test Live Connection */}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">{testing ? 'sync' : 'network_check'}</span>
                <span>{testing ? (isAr ? 'جاري الاختبار...' : 'Testing...') : (isAr ? 'اختبار اتصال Microsoft 365' : 'Test Microsoft 365 Connection')}</span>
              </button>

              {/* Validate Sender Mailbox */}
              <button
                type="button"
                onClick={handleValidateMailbox}
                disabled={validatingMailbox}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">forward_to_inbox</span>
                <span>{isAr ? 'التحقق من صندوق البريد المرسل' : 'Validate Sender Mailbox'}</span>
              </button>

              {/* Disable Integration */}
              {enabled && (
                <button
                  type="button"
                  onClick={handleDisableIntegration}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ms-auto"
                >
                  <span className="material-symbols-outlined text-base">power_settings_new</span>
                  <span>{isAr ? 'تعطيل التكامل' : 'Disable Integration'}</span>
                </button>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: EMAIL TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">{isAr ? 'قوالب رسائل البريد الإلكتروني المعتمدة' : 'Official Email Templates'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'إدارة وتخصيص نماذج الرسائل مع دعم المتغيرات التلقائية المربوطة ببيانات الموظف' : 'Manage customizable email drafts with dynamic employee placeholder variables'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenTemplateModal()}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              <span>{isAr ? 'إنشاء قالب جديد' : 'Create New Template'}</span>
            </button>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tpl => (
              <div 
                key={tpl.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                  isDark ? 'bg-[#0f141c] border-white/10 hover:border-teal-500/40' : 'bg-slate-50 border-slate-200 hover:border-teal-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {tpl.language === 'ar' ? 'العربية' : 'English'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {tpl.template_name}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                    <strong>{isAr ? 'الموضوع:' : 'Subject:'}</strong> {tpl.subject}
                  </div>

                  <div 
                    className={`p-2.5 rounded-xl border text-[11px] line-clamp-3 mb-4 ${
                      isDark ? 'bg-[#0a0c10] border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                    dangerouslySetInnerHTML={{ __html: tpl.body.replace(/<[^>]*>?/gm, ' ').slice(0, 150) + '...' }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => handleOpenTemplateModal(tpl)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    <span>{isAr ? 'تعديل' : 'Edit'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    <span>{isAr ? 'حذف' : 'Delete'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="mt-6 space-y-4 animate-in fade-in duration-200">
          
          {/* Important Regulatory & Security Disclaimer */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg shrink-0">info</span>
            <span>
              {isAr
                ? '⚠️ تنبيه تشغيلي: حالة "Accepted by Microsoft Graph" تعني استلام خوادم مايكروسوفت المؤسسية للطلب ومعالجته بنجاح، ولا تعد تأكيداً نهائياً لوصول الرسالة إلى صندوق الوارد (Delivery Confirmed) حتى يتم إشعار الاستلام.'
                : '⚠️ Note: "Accepted by Microsoft Graph" indicates Microsoft servers accepted the email payload for delivery, not a guarantee that it has landed in the inbox yet.'}
            </span>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
              <input
                type="text"
                value={logsSearch}
                onChange={e => setLogsSearch(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم، البريد، الموضوع، أو رقم العملية...' : 'Search by recipient, email, subject, or op id...'}
                className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                  isDark ? 'bg-[#0f141c] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <select
              value={logsStatusFilter}
              onChange={e => setLogsStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                isDark ? 'bg-[#0f141c] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">{isAr ? 'كافة الحالات' : 'All Statuses'}</option>
              <option value="Accepted by Microsoft Graph">Accepted by Microsoft Graph</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Delivery Confirmed">Delivery Confirmed</option>
            </select>

            <button
              type="button"
              onClick={loadLogs}
              className="p-2 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-xs font-bold"
              title="Refresh"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
            </button>
          </div>

          {/* Logs Table */}
          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-[#0f141c] border-white/10' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-xs text-start">
              <thead className={`border-b ${isDark ? 'bg-[#0a0c10] border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3 text-start">{isAr ? 'معرّف العملية' : 'Op ID'}</th>
                  <th className="p-3 text-start">{isAr ? 'الموظف المستلم' : 'Recipient'}</th>
                  <th className="p-3 text-start">{isAr ? 'عنوان البريد' : 'Email'}</th>
                  <th className="p-3 text-start">{isAr ? 'الموضوع والمستند' : 'Subject & Doc'}</th>
                  <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  <th className="p-3 text-center">{isAr ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {loadingLogs ? (isAr ? 'جاري تحميل السجلات...' : 'Loading logs...') : (isAr ? 'لا توجد سجلات بريد مطابقة للبحث' : 'No email audit logs found')}
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="p-3 font-mono text-[11px] text-slate-500">{log.operation_id}</td>
                      <td className="p-3">
                        <div className="font-bold">{log.recipient_name || '—'}</div>
                        {log.recipient_employee_id && (
                          <div className="text-[10px] text-slate-400 font-mono">{log.recipient_employee_id}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">{log.recipient_email}</td>
                      <td className="p-3">
                        <div className="font-semibold line-clamp-1">{log.subject}</div>
                        {log.document_name && (
                          <div className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-xs">attach_file</span>
                            <span>{log.document_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          log.status === 'Accepted by Microsoft Graph'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            : log.status === 'Delivery Confirmed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : log.status === 'Failed'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            log.status === 'Accepted by Microsoft Graph' ? 'bg-blue-500' : log.status === 'Delivery Confirmed' ? 'bg-emerald-500' : log.status === 'Failed' ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                          <span>{log.status}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString(isAr ? 'ar-IQ' : 'en-US')}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetails(log)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold"
                        >
                          {isAr ? 'عرض' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logsTotal > logsLimit && (
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <div>
                {isAr ? `إجمالي السجلات: ${logsTotal}` : `Total logs: ${logsTotal}`}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={logsPage <= 1}
                  onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border disabled:opacity-30"
                >
                  {isAr ? 'السابق' : 'Previous'}
                </button>
                <span className="px-3 py-1.5 font-bold">{logsPage}</span>
                <button
                  type="button"
                  disabled={logsPage * logsLimit >= logsTotal}
                  onClick={() => setLogsPage(p => p + 1)}
                  className="px-3 py-1.5 rounded-lg border disabled:opacity-30"
                >
                  {isAr ? 'التالي' : 'Next'}
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 4: ACCEPTANCE TESTS */}
      {activeTab === 'tests' && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">
                {isAr ? 'منظومة اختبارات القبول المعيارية (15 معيار)' : 'Comprehensive Acceptance Tests Suite (15 Standards)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'تنفيذ حزمة الاختبارات الآلية والتحقق من بنود القبول المحددة في القسم 12' : 'Automated test suite verifying every condition outlined in Section 12'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunAcceptanceTests}
              disabled={runningTests}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">{runningTests ? 'sync' : 'play_arrow'}</span>
              <span>{runningTests ? (isAr ? 'جاري الفحص...' : 'Running...') : (isAr ? 'تشغيل الاختبارات الـ 15 كاملة' : 'Run All 15 Tests')}</span>
            </button>
          </div>

          {testReport && (
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0f141c] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                    testReport.success ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}>
                    {testReport.passRate}
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {testReport.success ? (isAr ? 'اجتازت كافة الاختبارات بنجاح 100%' : 'All 15 Acceptance Tests Passed 100%') : (isAr ? 'بعض الاختبارات بحاجة لمراجعة' : 'Some tests need review')}
                    </div>
                    <div className="text-xs text-slate-500">
                      {isAr ? `نجح ${testReport.passedCount} من ${testReport.totalTests} اختبار في ${testReport.durationMs}ms` : `${testReport.passedCount}/${testReport.totalTests} passed in ${testReport.durationMs}ms`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {testReport.tests?.map((t: any) => (
                  <div 
                    key={t.testId}
                    className={`p-3 rounded-xl border flex items-start gap-3 ${
                      t.passed 
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-800 dark:text-slate-200' 
                        : 'bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${t.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {t.passed ? 'check_circle' : 'cancel'}
                    </span>
                    <div className="flex-1 text-xs">
                      <div className="font-bold flex items-center justify-between">
                        <span>#{t.testId}: {isAr ? t.name_ar : t.name_en}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.passed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600'}`}>
                          {t.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>
                      {t.details && <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t.details}</div>}
                      {t.error && <div className="mt-1 text-[11px] text-rose-500 font-mono">{t.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ADMIN GUIDE & PERMISSIONS */}
      {activeTab === 'guide' && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-200">
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0f141c] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <h2 className="text-base font-bold flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-teal-500">security</span>
              <span>{isAr ? 'دليل إعداد مسؤول Microsoft 365 وMicrosoft Entra ID' : 'Microsoft 365 Administrator & Entra ID Setup Guide'}</span>
            </h2>

            <div className="text-xs space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                {isAr
                  ? 'لإتمام تفعيل الربط وتوفير إمكانية إرسال الرسائل والمستندات للموظفين، يتعين على مسؤول Microsoft Entra ID (Global Admin) تنفيذ الخطوات التالية لمرة واحدة فقط:'
                  : 'To complete Microsoft 365 integration and enable corporate email delivery, a Microsoft Entra ID Global Administrator must complete the following one-time configuration:'}
              </p>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/5">
                  <strong className="block text-slate-900 dark:text-white mb-1">
                    1. {isAr ? 'تسجيل التطبيق (App Registration)' : 'Register an Application in Entra ID'}
                  </strong>
                  <span>
                    {isAr 
                      ? 'الدخول إلى بوابة Microsoft Entra admin center ثم App registrations والضغط على New registration. حدد اسم التطبيق: VITAS Iraq HRIS Integration واختيار حسابات هذا الدليل فقط (Accounts in this organizational directory only).'
                      : 'Navigate to Entra admin center -> App registrations -> New registration. Name: "VITAS Iraq HRIS Integration". Choose Single Tenant.'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/5">
                  <strong className="block text-slate-900 dark:text-white mb-1">
                    2. {isAr ? 'منح الصلاحيات المطلوبة (Application Permissions)' : 'Grant Least-Privileged Application Permissions'}
                  </strong>
                  <span>
                    {isAr 
                      ? 'ضمن قسم API permissions اضغط Add a permission ثم Microsoft Graph واختر Application permissions. أضف الصلاحيات التالية:'
                      : 'Under API permissions, add Microsoft Graph -> Application permissions:'}
                  </span>
                  <ul className="list-disc list-inside mt-2 font-mono text-[11px] text-teal-600 dark:text-teal-400 space-y-1">
                    <li>Mail.Send ({isAr ? 'لإرسال رسائل البريد والمستندات' : 'To send emails and contracts'})</li>
                    <li>User.Read.All ({isAr ? 'للتحقق من حسابات وصناديق البريد في المؤسسة' : 'To validate mailboxes in tenant'})</li>
                  </ul>
                  <div className="mt-2 text-rose-500 font-bold">
                    ⚠️ {isAr ? 'هام جداً: يجب الضغط على "Grant admin consent for [Organization]" وإلا ستفشل المصادقة.' : 'CRITICAL: Click "Grant admin consent" button.'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/5">
                  <strong className="block text-slate-900 dark:text-white mb-1">
                    3. {isAr ? 'إنشاء المفتاح السري (Client Secret)' : 'Generate Client Secret'}
                  </strong>
                  <span>
                    {isAr 
                      ? 'من قسم Certificates & secrets اضغط New client secret، حدد وصفاً وصلاحية (سنة أو سنتين). انسخ قيمة القيمة (Value) فور إنشائها وأدخلها في حقل Client Secret أعلاه.'
                      : 'Under Certificates & secrets -> New client secret. Copy the Value immediately and paste into Client Secret setting.'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0a0c10] border border-slate-200 dark:border-white/5">
                  <strong className="block text-slate-900 dark:text-white mb-1">
                    4. {isAr ? 'تقييد الإرسال بصندوق البريد المعتمد فقط (PowerShell ApplicationAccessPolicy)' : 'Restrict Sending to Authorized Mailbox Only'}
                  </strong>
                  <span>
                    {isAr
                      ? 'لحصر صلاحية التطبيق في صندوق بريد الموارد البشرية ومنعه من الإرسال من صناديق أخرى، يمكن لمسؤول Exchange تشغيل أمر PowerShell التالي:'
                      : 'To enforce least-privilege scoping so the app can ONLY send via the HR mailbox, run in Exchange Online PowerShell:'}
                  </span>
                  <div className="mt-2 p-3 rounded-lg bg-black text-emerald-400 font-mono text-[11px] overflow-x-auto">
                    New-ApplicationAccessPolicy -AppId "YOUR_CLIENT_ID" -PolicyScopeGroupId "HRMailboxGroup@vitasiraq.com" -AccessRight RestrictAccess -Description "Restrict HRIS App to HR Mailbox"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#0f141c] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingTemplate ? (isAr ? 'تعديل قالب البريد' : 'Edit Template') : (isAr ? 'إنشاء قالب بريد جديد' : 'New Template')}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">{isAr ? 'اسم القالب' : 'Template Name'} *</label>
                  <input
                    type="text"
                    required
                    value={templateForm.template_name}
                    onChange={e => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none bg-slate-50 dark:bg-[#0a0c10] border-slate-300 dark:border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">{isAr ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={templateForm.category}
                    onChange={e => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none bg-slate-50 dark:bg-[#0a0c10] border-slate-300 dark:border-white/10"
                  >
                    <option value="contracts">{isAr ? 'العقود (Contracts)' : 'Contracts'}</option>
                    <option value="forms">{isAr ? 'النماذج الإدارية (HR Forms)' : 'Forms'}</option>
                    <option value="letters">{isAr ? 'الكتب والمخاطبات (Letters)' : 'Letters'}</option>
                    <option value="general">{isAr ? 'عام (General)' : 'General'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{isAr ? 'عنوان الرسالة (Subject)' : 'Subject'} *</label>
                <input
                  type="text"
                  required
                  value={templateForm.subject}
                  onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none bg-slate-50 dark:bg-[#0a0c10] border-slate-300 dark:border-white/10"
                />
              </div>

              {/* Dynamic Variables Selector */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-teal-600 dark:text-teal-400">
                  {isAr ? 'انقر لإدراج المتغيرات الديناميكية تلقائياً في نص الرسالة:' : 'Click to insert dynamic placeholder variables:'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{employee_name}',
                    '{employee_id}',
                    '{employee_email}',
                    '{department_name}',
                    '{document_name}',
                    '{sender_name}',
                    '{current_date}'
                  ].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariableIntoTemplate(v)}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-[11px] font-mono cursor-pointer transition-all"
                    >
                      + {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{isAr ? 'نص الرسالة (Body / HTML)' : 'Body (HTML)'} *</label>
                <textarea
                  required
                  rows={6}
                  value={templateForm.body}
                  onChange={e => setTemplateForm({ ...templateForm, body: e.target.value })}
                  className="w-full p-3 rounded-xl border text-xs font-mono outline-none bg-slate-50 dark:bg-[#0a0c10] border-slate-300 dark:border-white/10"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
                >
                  {isAr ? 'حفظ القالب' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLogDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl p-5 ${
            isDark ? 'bg-[#0f141c] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500">receipt_long</span>
                <span>{isAr ? 'تفاصيل سجل العملية' : 'Audit Operation Details'}</span>
              </h3>
              <button onClick={() => setSelectedLogDetails(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div><strong>{isAr ? 'معرّف العملية:' : 'Operation ID:'}</strong> <span className="font-mono">{selectedLogDetails.operation_id}</span></div>
              <div><strong>{isAr ? 'الموظف المستلم:' : 'Recipient:'}</strong> {selectedLogDetails.recipient_name} ({selectedLogDetails.recipient_employee_id})</div>
              <div><strong>{isAr ? 'البريد الإلكتروني:' : 'Email:'}</strong> <span className="font-mono">{selectedLogDetails.recipient_email}</span></div>
              <div><strong>{isAr ? 'الموضوع:' : 'Subject:'}</strong> {selectedLogDetails.subject}</div>
              <div><strong>{isAr ? 'المستند المرفق:' : 'Document:'}</strong> {selectedLogDetails.document_name || (isAr ? 'بدون مرفق' : 'No attachment')}</div>
              <div><strong>{isAr ? 'الحالة:' : 'Status:'}</strong> {selectedLogDetails.status}</div>
              {selectedLogDetails.graph_message_id && (
                <div><strong>{isAr ? 'معرّف الرسالة في Graph:' : 'Graph Message ID:'}</strong> <span className="font-mono text-[10px] break-all">{selectedLogDetails.graph_message_id}</span></div>
              )}
              {selectedLogDetails.error_message && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-mono text-[11px]">
                  <strong>Error ({selectedLogDetails.error_code}):</strong> {selectedLogDetails.error_message}
                </div>
              )}
              <div><strong>{isAr ? 'تاريخ التنفيذ:' : 'Sent At:'}</strong> {new Date(selectedLogDetails.created_at).toLocaleString()}</div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-white/10 text-end">
              <button
                type="button"
                onClick={() => setSelectedLogDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-bold"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Send Document Dialog */}
      <SendDocumentDialog
        isOpen={isSendDialogOpen}
        onClose={() => setIsSendDialogOpen(false)}
        onSuccess={() => {
          loadLogs();
        }}
      />

    </div>
  );
};
