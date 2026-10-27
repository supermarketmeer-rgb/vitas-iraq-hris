import React, { useState, useEffect } from 'react';
import { useDocumentRouting, DocumentRoutingOptions } from '../../context/DocumentRoutingContext';
import { useApp } from '../../context/AppContext';

export const DocumentRoutingModal: React.FC = () => {
  const { isRoutingOpen, routingOptions, closeDocumentRouting } = useDocumentRouting();
  const { language, theme, currentUser, t } = useApp();

  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  // Form State
  const [recipientType, setRecipientType] = useState<string>('direct_supervisor');
  const [resolvedRecipients, setResolvedRecipients] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [eligibleRecipients, setEligibleRecipients] = useState<any[]>([]);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Delivery Channel
  const [channel, setChannel] = useState<'both' | 'email' | 'app'>('both');
  const [signatureMode, setSignatureMode] = useState<'wet_signature' | 'electronic_copy'>('wet_signature');
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [m365Status, setM365Status] = useState<any>(null);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Message & Attachments
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string; type: string; contentBytes: string }>>([]);

  // Submission State
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');

  // 1. Initialize options when modal opens
  useEffect(() => {
    if (!isRoutingOpen || !routingOptions) {
      setSendResult(null);
      setResolutionError(null);
      return;
    }

    const defaultType = routingOptions.suggestedRecipient || 'direct_supervisor';
    setRecipientType(defaultType);

    // Initialize signature and editability based on document type
    const isEvalOrForm = routingOptions.documentType === 'appraisal' || 
                         routingOptions.documentType === 'evaluation' || 
                         routingOptions.documentType === 'hr_form' || 
                         Boolean(routingOptions.metadata?.is_editable);
    if (isEvalOrForm) {
      setSignatureMode('electronic_copy');
      setIsEditable(true);
    } else {
      setSignatureMode((routingOptions.metadata?.signature_mode as any) || 'wet_signature');
      setIsEditable(Boolean(routingOptions.metadata?.is_editable));
    }

    const docName = routingOptions.documentTitle || 'مستند إداري';
    const docRef = routingOptions.documentId || '';
    setSubject(isAr ? `[فيتاس العراق] توجيه ${docName} (${docRef})` : `[VITAS Iraq] Routing ${docName} (${docRef})`);
    setMessage(isAr 
      ? `تحية طيبة،\nنود إعلامكم بأنه تم إرسال وتوجيه المستند (${docName}) المعتمد رسمياً إليكم للمراجعة والتدقيق والعمل بموجبه.`
      : `Dear Colleague,\nPlease find attached the official document (${docName}) routed to you for review and necessary action.`
    );

    // Initial idempotency token
    setIdempotencyKey(`IDEM-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
    setSendResult(null);

    // Attach primary document if provided
    if (routingOptions.fileData) {
      setAttachments([{
        name: routingOptions.fileName || `${routingOptions.documentType || 'document'}.pdf`,
        size: '1.2 MB',
        type: routingOptions.fileType || 'application/pdf',
        contentBytes: routingOptions.fileData
      }]);
    } else {
      setAttachments([]);
    }

    // Check Microsoft 365 status
    fetch('/api/routing/m365/status')
      .then(res => res.json())
      .then(data => setM365Status(data))
      .catch(() => setM365Status({ isConfigured: false }));

  }, [isRoutingOpen, routingOptions, isAr]);

  // 2. Resolve recipients whenever recipientType or target changes
  useEffect(() => {
    if (!isRoutingOpen || !routingOptions) return;

    let isMounted = true;
    setIsResolving(true);
    setResolutionError(null);
    setResolvedRecipients([]);
    setEligibleRecipients([]);
    setSelectedRecipients([]);

    fetch('/api/routing/resolve-recipients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientType,
        documentType: routingOptions.documentType,
        employeeId: routingOptions.employeeId,
        employeeName: routingOptions.employeeName,
        specificEmployeeIds: routingOptions.specificEmployeeIds || (routingOptions.employeeId ? [routingOptions.employeeId] : []),
        departmentId: routingOptions.departmentId,
        branchId: routingOptions.branchId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (!isMounted) return;
        setIsResolving(false);

        if (data.resolved && data.recipients) {
          setResolvedRecipients(data.recipients);
          setSelectedRecipients(data.recipients);
          setResolutionError(null);
        } else if (data.multiple && data.eligibleRecipients) {
          // Multiple recipients occupy this position or office
          setEligibleRecipients(data.eligibleRecipients);
          setSelectedRecipients([data.eligibleRecipients[0]]); // default to first
          setResolutionError(null);
        } else {
          setResolutionError(isAr ? (data.error_ar || data.error) : data.error);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setIsResolving(false);
        setResolutionError(err.message);
      });

    return () => { isMounted = false; };
  }, [recipientType, isRoutingOpen, routingOptions, isAr]);

  if (!isRoutingOpen || !routingOptions) return null;

  // Recipient selection toggle for multi-recipient scenarios
  const toggleRecipient = (rec: any) => {
    if (selectedRecipients.some(r => r.id === rec.id)) {
      setSelectedRecipients(selectedRecipients.filter(r => r.id !== rec.id));
    } else {
      setSelectedRecipients([...selectedRecipients, rec]);
    }
  };

  // Add permitted file attachment
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(isAr ? 'حجم الملف يتجاوز الحد المسموح به (10 ميغابايت)' : 'File size exceeds 10MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || '';
      setAttachments(prev => [
        ...prev,
        {
          name: file.name,
          size: `${(file.size / 1024).toFixed(0)} KB`,
          type: file.type || 'application/pdf',
          contentBytes: base64
        }
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Execute Sending
  const handleSend = async () => {
    if (selectedRecipients.length === 0) {
      alert(isAr ? 'يرجى تحديد مستلم واحد على الأقل قبل الإرسال.' : 'Please select at least one recipient.');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const payload = {
        documentType: routingOptions.documentType,
        documentId: routingOptions.documentId,
        documentTitle: routingOptions.documentTitle,
        sourceModule: routingOptions.sourceModule || 'general',
        recipients: selectedRecipients.map(r => ({
          ...r,
          recipient_type: recipientType
        })),
        channelRequested: channel,
        signatureMode,
        isEditable,
        subject,
        message,
        attachments,
        idempotencyKey,
        currentUser: {
          id: currentUser?.id || 'admin',
          name: currentUser?.name || 'مسؤول النظام'
        }
      };

      const response = await fetch('/api/routing/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      setSendResult(result);

      if (result.success && routingOptions.onSuccess) {
        routingOptions.onSuccess(result);
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        overallStatus: 'failed',
        message: err.message
      });
    } finally {
      setIsSending(false);
    }
  };

  // Retry failed email from the inline result
  const handleRetryEmail = async (deliveryId: string) => {
    try {
      const res = await fetch(`/api/routing/deliveries/${deliveryId}/retry-email`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(isAr ? 'تمت إعادة محاولة إرسال البريد بنجاح.' : 'Email retry accepted successfully.');
        setSendResult((prev: any) => ({
          ...prev,
          overallStatus: data.overallStatus,
          results: prev.results.map((r: any) => r.deliveryId === deliveryId ? { ...r, emailStatus: data.emailStatus } : r)
        }));
      } else {
        alert(data.error || 'Retry failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getDocTypeBadge = (type: string) => {
    const map: Record<string, { ar: string; en: string; color: string }> = {
      employment_contract: { ar: 'عقد توظيف', en: 'Employment Contract', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
      leave_request: { ar: 'طلب إجازة', en: 'Leave Request', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20' },
      hr_form: { ar: 'استمارة موارد بشرية', en: 'HR Form', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20' },
      official_letter: { ar: 'كتاب رسمي', en: 'Official Letter', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' },
      employee_document: { ar: 'وثيقة موظف', en: 'Employee Document', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20' },
      monthly_report: { ar: 'تقرير شهري', en: 'Monthly Report', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
      administrative_circular: { ar: 'تعميم إداري', en: 'Circular', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20' }
    };
    return map[type] || { ar: 'مستند إداري', en: 'Document', color: 'bg-slate-500/15 text-slate-600 border-slate-500/20' };
  };

  const docBadge = getDocTypeBadge(routingOptions.documentType);

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className={`w-full max-w-3xl rounded-3xl shadow-2xl border flex flex-col max-h-[92vh] overflow-hidden transition-all ${
        isDark ? 'bg-[#0f172a] border-white/10 text-white shadow-teal-950/30' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
              <span className="material-symbols-outlined text-xl">forward_to_inbox</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  {t('التوجيه والتسليم للمستندات', 'Document Routing & Delivery')}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${docBadge.color}`}>
                  {isAr ? docBadge.ar : docBadge.en}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {routingOptions.documentTitle} • {routingOptions.documentId}
              </p>
            </div>
          </div>

          <button
            onClick={closeDocumentRouting}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Result Banner if already submitted */}
          {sendResult && (
            <div className={`p-4 rounded-2xl border space-y-3 ${
              sendResult.overallStatus === 'delivered'
                ? isDark ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : sendResult.overallStatus === 'partial_success'
                  ? isDark ? 'bg-amber-950/40 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-950'
                  : isDark ? 'bg-rose-950/40 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span className="material-symbols-outlined text-lg">
                    {sendResult.overallStatus === 'delivered' ? 'check_circle' : sendResult.overallStatus === 'partial_success' ? 'warning' : 'error'}
                  </span>
                  <span>{sendResult.message}</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-black/20">
                  {sendResult.overallStatus}
                </span>
              </div>

              {/* Per-recipient Channel status */}
              {sendResult.results && (
                <div className="space-y-2 pt-2 border-t border-current/10 text-xs">
                  {sendResult.results.map((r: any, idx: number) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-black/10">
                      <div>
                        <strong>{r.recipientName}</strong> ({r.recipientEmail || 'بدون بريد'})
                      </div>
                      <div className="flex items-center gap-2">
                        {r.appStatus !== 'not_applicable' && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            r.appStatus === 'delivered' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700'
                          }`}>
                            تطبيق الموظف: {r.appStatus === 'delivered' ? '✓ تم التسليم' : 'فشل'}
                          </span>
                        )}
                        {r.emailStatus !== 'not_applicable' && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            r.emailStatus === 'accepted' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/20 text-rose-700'
                          }`}>
                            بريد M365: {r.emailStatus === 'accepted' ? '✓ تم القبول' : 'فشل/غير مهيأ'}
                          </span>
                        )}
                        {r.emailStatus === 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleRetryEmail(r.deliveryId)}
                            className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            إعادة محاولة البريد
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 1. Recipient Resolution based on Organizational Structure */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-base text-teal-600">account_tree</span>
                <span>{t('تحديد المستلم وفق الهيكل التنظيمي', 'Recipient Resolution via Organizational Hierarchy')}</span>
              </label>
              {isResolving && (
                <span className="text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1 animate-pulse font-medium">
                  <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                  <span>{t('جاري التدقيق في الهيكل...', 'Resolving organizational structure...')}</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'direct_supervisor', ar: 'المشرف المباشر', en: 'Direct Supervisor', icon: 'supervisor_account' },
                { id: 'office_manager', ar: 'مدير المكتب / الفرع', en: 'Office Manager', icon: 'store' },
                { id: 'department_manager', ar: 'مدير القسم (HOD)', en: 'Dept Manager', icon: 'domain' },
                { id: 'top_management', ar: 'الإدارة العليا (المدير العام)', en: 'General Managers', icon: 'stars' },
                { id: 'specific_employee', ar: 'الموظف المعني', en: 'Specific Employee', icon: 'person' },
                { id: 'job_position', ar: 'شاغلو منصب معين', en: 'Job Position', icon: 'badge' },
                { id: 'department_all', ar: 'كافة موظفي القسم', en: 'All Dept Staff', icon: 'groups' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRecipientType(opt.id)}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition flex flex-col items-center gap-1.5 cursor-pointer text-center ${
                    recipientType === opt.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/25'
                      : isDark
                        ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                  <span className="leading-tight">{isAr ? opt.ar : opt.en}</span>
                </button>
              ))}
            </div>

            {/* Resolution Error / Ambiguity Alert */}
            {resolutionError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-lg shrink-0">report_problem</span>
                <span>{resolutionError}</span>
              </div>
            )}

            {/* Resolved Single Recipient Preview Card */}
            {!isResolving && resolvedRecipients.length === 1 && (
              <div className={`p-4 rounded-2xl border transition ${
                isDark ? 'bg-slate-900/80 border-teal-500/30' : 'bg-teal-50/60 border-teal-200'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">
                      {resolvedRecipients[0].name_ar?.charAt(0) || 'م'}
                    </div>
                    <div>
                      <div className="font-bold text-sm">
                        {resolvedRecipients[0].name_ar} {resolvedRecipients[0].name_en ? `(${resolvedRecipients[0].name_en})` : ''}
                      </div>
                      <div className={`text-xs mt-0.5 flex flex-wrap items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <span>{resolvedRecipients[0].position_ar || 'منصب رسمي'}</span>
                        <span>•</span>
                        <span>{resolvedRecipients[0].department || 'القسم'}</span>
                        <span>•</span>
                        <span>{resolvedRecipients[0].branch || 'المقر'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-mono bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold border border-teal-500/20">
                      {resolvedRecipients[0].org_email || resolvedRecipients[0].email || 'لا يوجد بريد مسجل'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Multi-Recipient Selection Grid (When multiple occupants exist) */}
            {!isResolving && (eligibleRecipients.length > 0 || resolvedRecipients.length > 1) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {t('يرجى تحديد المستلمين المطلوبين من القائمة المعتمدة:', 'Select intended recipients from the resolved list:')}
                  </p>
                  {routingOptions.employeeName && (
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                      المعني: {routingOptions.employeeName}
                    </span>
                  )}
                </div>

                {/* Filter search bar */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-sm">search</span>
                  <input
                    type="text"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder={t('بحث بالاسم أو الرقم الوظيفي أو القسم...', 'Search by name, badge, or department...')}
                    className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40">
                  {(eligibleRecipients.length > 0 ? eligibleRecipients : resolvedRecipients)
                    .filter(rec => {
                      if (!recipientSearch) return true;
                      const q = recipientSearch.toLowerCase();
                      return (
                        (rec.name_ar && rec.name_ar.toLowerCase().includes(q)) ||
                        (rec.name_en && rec.name_en.toLowerCase().includes(q)) ||
                        (rec.badge_no && String(rec.badge_no).toLowerCase().includes(q)) ||
                        (rec.department && rec.department.toLowerCase().includes(q)) ||
                        (rec.position_ar && rec.position_ar.toLowerCase().includes(q))
                      );
                    })
                    .map(rec => {
                    const isSelected = selectedRecipients.some(r => r.id === rec.id);
                    return (
                      <div
                        key={rec.id}
                        onClick={() => toggleRecipient(rec)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                          isSelected
                            ? 'bg-teal-500/15 border-teal-500 text-teal-900 dark:text-teal-200 font-bold'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-teal-600 focus:ring-teal-500"
                          />
                          <span>{rec.name_ar}</span>
                          <span className="text-[11px] opacity-75">({rec.position_ar || rec.department})</span>
                          {rec.badge_no && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 rounded">
                              {rec.badge_no}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono opacity-80">{rec.org_email || rec.email}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>تم اختيار: {selectedRecipients.length} مستلم</span>
                  <button
                    type="button"
                    onClick={() => {
                      const list = eligibleRecipients.length > 0 ? eligibleRecipients : resolvedRecipients;
                      setSelectedRecipients(selectedRecipients.length === list.length ? [] : [...list]);
                    }}
                    className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    {selectedRecipients.length === (eligibleRecipients.length > 0 ? eligibleRecipients : resolvedRecipients).length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 1.5 Document Signature Mode & Collaboration Policy */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-base text-teal-600">history_edu</span>
                <span>{t('نوع النسخة ومسار الاعتماد / التوقيع', 'Document Copy Type & Signature Mode')}</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Wet Signature */}
              <button
                type="button"
                onClick={() => {
                  setSignatureMode('wet_signature');
                  setIsEditable(false);
                }}
                className={`p-3 rounded-2xl border text-right cursor-pointer transition flex flex-col justify-between ${
                  signatureMode === 'wet_signature'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                    : isDark
                      ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">history_edu</span>
                    <span className="text-xs font-bold">{isAr ? 'نسخة أصلية بتوقيع حي' : 'Live Wet Signature'}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    signatureMode === 'wet_signature' ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isAr ? 'قابلة للطباعة والتنزيل' : 'Print & Download'}
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${signatureMode === 'wet_signature' ? 'text-emerald-50' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isAr 
                    ? 'تتطلب توقيعاً حياً باليد. يتاح تنزيلها وطباعتها للموظف المعني، المشرف المباشر، ومدير المكتب/الفرع لكافة موظفي مكتبه.'
                    : 'Requires live physical pen signature. Download & print permitted for employee, supervisor, and branch manager.'}
                </p>
              </button>

              {/* Option 2: Electronic Copy (Editable) */}
              <button
                type="button"
                onClick={() => {
                  setSignatureMode('electronic_copy');
                  setIsEditable(true);
                }}
                className={`p-3 rounded-2xl border text-right cursor-pointer transition flex flex-col justify-between ${
                  signatureMode === 'electronic_copy'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : isDark
                      ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">edit_document</span>
                    <span className="text-xs font-bold">{isAr ? 'نسخة إلكترونية تفاعلية' : 'Electronic Copy (Editable)'}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    signatureMode === 'electronic_copy' ? 'bg-white/20 text-white' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {isAr ? 'الطباعة محظورة • قابلة للتعديل' : 'No Print • Editable'}
                  </span>
                </div>
                <p className={`text-[11px] leading-relaxed ${signatureMode === 'electronic_copy' ? 'text-indigo-50' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isAr 
                    ? 'لا يُسمح بطباعتها نهائياً. قابلة للتعديل من الموظف والمشرف (مثل فورم التقييم). محجوبة عن مدير المكتب.'
                    : 'Strictly no printing allowed. Editable collaboratively by employee and supervisor (like appraisals). Restricted from branch manager.'}
                </p>
              </button>
            </div>
          </div>

          {/* 2. Delivery Channel Selection */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-base text-teal-600">cell_tower</span>
                <span>{t('قنوات التسليم المعتمدة', 'Authorized Delivery Channels')}</span>
              </label>
              
              {/* M365 Config Indicator */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className={`w-2 h-2 rounded-full ${m365Status?.isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-slate-500 dark:text-slate-400">
                  {m365Status?.isConfigured ? 'Microsoft 365 متصل' : 'M365 يتطلب ضبط إعدادات السيرفر'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'both', ar: 'القناتين معاً (تطبيق + بريد)', en: 'Both Channels', icon: 'dynamic_feed', desc: 'تسليم في التطبيق مع إشعار بالبريد المؤسسي' },
                { id: 'app', ar: 'تطبيق الموظف فقط', en: 'Employee App Only', icon: 'smartphone', desc: 'إشعار فوري داخل التطبيق وسجل التسليم' },
                { id: 'email', ar: 'بريد Microsoft 365 فقط', en: 'M365 Email Only', icon: 'mail', desc: 'إرسال رسمي عبر حساب المؤسسة' }
              ].map(ch => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id as any)}
                  className={`p-3 rounded-2xl border text-right cursor-pointer transition flex flex-col justify-between ${
                    channel === ch.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                      : isDark
                        ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="material-symbols-outlined text-xl">{ch.icon}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      channel === ch.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}>
                      {ch.id.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">{isAr ? ch.ar : ch.en}</h4>
                    <p className={`text-[10px] mt-1 line-clamp-2 ${channel === ch.id ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {ch.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Note if M365 is not yet configured */}
            {channel !== 'app' && !m365Status?.isConfigured && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">info</span>
                <span>
                  {isAr 
                    ? 'تنبيه تدقيق: لم يتم إدخال مفاتيح Microsoft Graph في ملف .env حتى الآن. ستسجل المحاولة كـ (Config Required) ولن يُعطى نجاح زائف وفق المتطلبات.'
                    : 'Notice: Microsoft Graph API credentials are not yet configured in server environment. The attempt will be accurately recorded.'}
                </span>
              </div>
            )}
          </div>

          {/* 3. Subject and Message Body */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('موضوع الإشعار والرسالة:', 'Subject:')}
              </label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold border outline-none transition ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-white focus:border-teal-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('نص الرسالة والتوجيه:', 'Message Content:')}
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-xs font-semibold border outline-none transition resize-none ${
                  isDark
                    ? 'bg-slate-900 border-white/10 text-white focus:border-teal-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                }`}
              />
            </div>
          </div>

          {/* 4. Document Attachments */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <span className="material-symbols-outlined text-base text-teal-600">attachment</span>
                <span>{t('المرفقات المعتمدة (الحد الأقصى 10 ميغابايت)', 'Document Attachments (Max 10MB)')}</span>
              </label>
              
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-teal-600/15 text-teal-700 dark:text-teal-300 hover:bg-teal-600/25 transition cursor-pointer">
                <span className="material-symbols-outlined text-sm">add</span>
                <span>{t('إضافة مرفق إضافي', 'Add Attachment')}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xlsx,.png,.jpg,.jpeg"
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <div className={`p-4 rounded-xl border text-center text-xs ${
                isDark ? 'border-white/5 text-slate-500' : 'border-slate-200 text-slate-400'
              }`}>
                {t('لا توجد مرفقات مادية منفصلة - سيتم إرفاق مرجع المستند الرقمي المشفر آلياً.', 'No attached physical files - document digital reference will be attached.')}
              </div>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-500 text-base">description</span>
                      <span className="font-semibold">{att.name}</span>
                      <span className="text-[10px] opacity-60">({att.size})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-rose-500 hover:text-rose-700 transition cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-[11px] text-slate-500">
            <span>{selectedRecipients.length} مستلم محدد</span> • <span>القناة: {channel.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeDocumentRouting}
              disabled={isSending}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {t('إلغاء', 'Cancel')}
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || selectedRecipients.length === 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 text-white shadow-lg shadow-teal-600/25 transition cursor-pointer ${
                isSending || selectedRecipients.length === 0
                  ? 'bg-slate-600 opacity-60 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 active:scale-95'
              }`}
            >
              {isSending ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                  <span>{t('جاري التوجيه والتسليم...', 'Routing & Delivering...')}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>{t('إرسال وتوجيه المستند', 'Send & Route Document')}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
