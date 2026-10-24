import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../api/client';

export interface SendDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeId?: string;
  initialDocumentName?: string;
  initialFileData?: string; // base64
  initialFileType?: string;
  sourceModule?: string;
  onSuccess?: (result: any) => void;
}

export const SendDocumentDialog: React.FC<SendDocumentDialogProps> = ({
  isOpen,
  onClose,
  initialEmployeeId,
  initialDocumentName,
  initialFileData,
  initialFileType,
  sourceModule = 'general',
  onSuccess
}) => {
  const { language, theme, currentUser, t } = useApp();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  // Search & Selected Employee State
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeResults, setEmployeeResults] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isSearchingEmp, setIsSearchingEmp] = useState(false);

  // Email form state
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [ccList, setCcList] = useState('');
  const [showCc, setShowCc] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<Array<{ name: string; contentType: string; contentBytes: string; sizeKb: number }>>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Sending progress & result state
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string; details?: string; graphMessageId?: string } | null>(null);

  // Initialize dialog when opened
  useEffect(() => {
    if (!isOpen) {
      setSendResult(null);
      setSelectedEmployee(null);
      setEmployeeSearch('');
      return;
    }

    // Load templates
    api.getM365Templates()
      .then((res: any) => setTemplates(Array.isArray(res) ? res : []))
      .catch(() => setTemplates([]));

    // Handle initial document attachment if provided
    if (initialFileData) {
      const docName = initialDocumentName || 'document.pdf';
      const cType = initialFileType || 'application/pdf';
      const sizeKb = Math.round(Buffer.byteLength(initialFileData, 'base64') / 1024);
      setAttachments([{
        name: docName,
        contentType: cType,
        contentBytes: initialFileData,
        sizeKb
      }]);
    } else {
      setAttachments([]);
    }

    // Resolve initial employee if provided
    if (initialEmployeeId) {
      api.getM365EmployeeEmail(initialEmployeeId)
        .then((emp: any) => {
          if (emp && emp.found) {
            setSelectedEmployee(emp);
            populateDefaults(emp, initialDocumentName);
          }
        })
        .catch(() => {});
    } else {
      // Search initial top employees
      searchEmployees('');
    }

  }, [isOpen, initialEmployeeId, initialDocumentName, initialFileData]);

  // Search employees handler
  const searchEmployees = async (query: string) => {
    setIsSearchingEmp(true);
    try {
      const results: any = await api.searchM365Employees(query, 10);
      setEmployeeResults(Array.isArray(results) ? results : []);
    } catch (e) {
      setEmployeeResults([]);
    } finally {
      setIsSearchingEmp(false);
    }
  };

  const populateDefaults = (emp: any, docName?: string) => {
    const documentTitle = docName || initialDocumentName || (isAr ? 'مستند إداري رسمي' : 'Official HR Document');
    const empName = emp.full_name_ar || emp.full_name_en || emp.name || '';
    
    setSubject(isAr 
      ? `وثيقة رسمية: ${documentTitle} - شركة فيتاس العراق`
      : `Official HR Document: ${documentTitle} - VITAS Iraq`);

    setBodyText(isAr
      ? `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; color: #1e293b;">
  <p>عزيزي/عزيزتي <strong>${empName}</strong> المحترم/ة،</p>
  <p>تحية طيبة وبعد،</p>
  <p>نرفق لكم طياً نسخة من <strong>${documentTitle}</strong> الصادر رسمياً من شركة فيتاس العراق للتمويل الأصغر.</p>
  <p>يرجى الاطلاع على المستند المرفق بالبريد الإلكتروني والعمل بموجبه وفق الأصول.</p>
  <p>الرقم الوظيفي: <strong>${emp.employee_id || ''}</strong><br/>القسم: <strong>${emp.department || ''}</strong></p>
  <p>مع أطيب التحيات والتقدير،<br/><strong>${currentUser?.name || 'قسم الموارد البشرية'}</strong><br/>شركة فيتاس العراق</p>
</div>`
      : `<div dir="ltr" style="font-family: Arial, sans-serif; line-height: 1.8; color: #1e293b;">
  <p>Dear <strong>${empName}</strong>,</p>
  <p>Please find attached the official document: <strong>${documentTitle}</strong> issued by VITAS Iraq Human Resources.</p>
  <p>Employee ID: <strong>${emp.employee_id || ''}</strong><br/>Department: <strong>${emp.department || ''}</strong></p>
  <p>Best regards,<br/><strong>${currentUser?.name || 'HR Team'}</strong><br/>VITAS Iraq</p>
</div>`);
  };

  // Handle template selection
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find(t => String(t.id) === String(templateId));
    if (!tpl) return;

    const empName = selectedEmployee ? (selectedEmployee.full_name_ar || selectedEmployee.name || '') : '{employee_name}';
    const empId = selectedEmployee ? (selectedEmployee.employee_id || '') : '{employee_id}';
    const empEmail = selectedEmployee ? (selectedEmployee.email || '') : '{employee_email}';
    const deptName = selectedEmployee ? (selectedEmployee.department || '') : '{department_name}';
    const docName = attachments.length > 0 ? attachments[0].name : (initialDocumentName || '{document_name}');

    let sub = tpl.subject
      .replace(/\{employee_name\}/g, empName)
      .replace(/\{employee_id\}/g, empId)
      .replace(/\{document_name\}/g, docName)
      .replace(/\{department_name\}/g, deptName);

    let body = tpl.body
      .replace(/\{employee_name\}/g, empName)
      .replace(/\{employee_id\}/g, empId)
      .replace(/\{employee_email\}/g, empEmail)
      .replace(/\{department_name\}/g, deptName)
      .replace(/\{document_name\}/g, docName)
      .replace(/\{sender_name\}/g, currentUser?.name || 'VITAS Iraq HR')
      .replace(/\{current_date\}/g, new Date().toISOString().split('T')[0]);

    setSubject(sub);
    setBodyText(body);
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 20MB
    if (file.size > 20 * 1024 * 1024) {
      alert(isAr ? 'حجم الملف يتجاوز الحد المسموح (20 ميجابايت)' : 'File size exceeds limit of 20MB');
      return;
    }

    setIsUploadingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setAttachments(prev => [
        ...prev,
        {
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          contentBytes: base64Data,
          sizeKb: Math.round(file.size / 1024)
        }
      ]);
      setIsUploadingFile(false);
    };
    reader.onerror = () => {
      setIsUploadingFile(false);
      alert(isAr ? 'فشل قراءة الملف' : 'Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Explicit Send Confirmation Handler
  const handleSendEmail = async () => {
    if (!selectedEmployee) {
      alert(isAr ? 'يرجى اختيار الموظف المستلم' : 'Please select a recipient employee');
      return;
    }

    if (!selectedEmployee.valid_email) {
      alert(isAr ? 'الموظف المختار لا يمتلك بريداً إلكترونياً مؤسسياً صالحاً' : 'Selected employee does not have a valid corporate email');
      return;
    }

    if (!subject.trim()) {
      alert(isAr ? 'يرجى إدخال عنوان الرسالة' : 'Please enter an email subject');
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const cc = ccList.split(',').map(e => e.trim()).filter(e => e.includes('@'));
      const payload: any = {
        to: selectedEmployee.email,
        cc,
        subject: subject.trim(),
        bodyHtml: bodyText,
        attachments: attachments.map(att => ({
          name: att.name,
          contentType: att.contentType,
          contentBytes: att.contentBytes
        })),
        documentName: attachments.length > 0 ? attachments[0].name : initialDocumentName,
        employeeId: selectedEmployee.employee_id || selectedEmployee.id,
        userName: currentUser?.name || 'HR Specialist',
        userId: currentUser?.id || 'HR-USER',
        idempotencyKey: `SEND-DIALOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      };

      const res: any = await api.sendM365Email(payload);

      setSendResult({
        success: true,
        message: isAr 
          ? `تم إرسال المستند بنجاح إلى (${selectedEmployee.email}) وتم استلامه من قبل Microsoft Graph.` 
          : `Document successfully accepted by Microsoft Graph for delivery to (${selectedEmployee.email}).`,
        details: isAr 
          ? `معرّف الرسالة: ${res.graphMessageId || 'N/A'} | معرّف العملية: ${res.operationId}` 
          : `Graph ID: ${res.graphMessageId} | Operation ID: ${res.operationId}`,
        graphMessageId: res.graphMessageId
      });

      if (onSuccess) {
        onSuccess(res);
      }

    } catch (err: any) {
      console.error('Send dialog error:', err);
      setSendResult({
        success: false,
        message: isAr ? 'فشل إرسال المستند عبر Microsoft 365' : 'Failed to send document via Microsoft 365',
        details: err.message
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
        isDark ? 'bg-[#0f141c] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">mark_email_read</span>
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {isAr ? 'إرسال مستند عبر البريد المؤسسي (Microsoft 365 & Outlook)' : 'Send Document via Microsoft 365 & Outlook'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'إرسال العقود، النماذج، والكتب الرسمية مباشرة لحساب الموظف' : 'Deliver official contracts, forms & letters directly to employee inbox'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Result Alert if available */}
          {sendResult && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in ${
              sendResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
            }`}>
              <span className="material-symbols-outlined text-2xl shrink-0 mt-0.5">
                {sendResult.success ? 'check_circle' : 'error'}
              </span>
              <div className="flex-1 text-xs">
                <div className="font-bold text-sm">{sendResult.message}</div>
                {sendResult.details && <div className="mt-1 font-mono text-[11px] opacity-90">{sendResult.details}</div>}
              </div>
            </div>
          )}

          {/* Section 1: Select Employee */}
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <label className="block text-xs font-bold mb-2 flex items-center justify-between">
              <span>{isAr ? 'الموظف المستلم (Recipient Employee)' : 'Recipient Employee'} <span className="text-rose-500">*</span></span>
              {selectedEmployee && (
                <button
                  type="button"
                  onClick={() => setSelectedEmployee(null)}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline font-bold"
                >
                  {isAr ? 'تغيير الموظف' : 'Change Employee'}
                </button>
              )}
            </label>

            {!selectedEmployee ? (
              <div className="space-y-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-sm">search</span>
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={e => {
                      setEmployeeSearch(e.target.value);
                      searchEmployees(e.target.value);
                    }}
                    placeholder={isAr ? 'ابحث بالاسم، الرقم الوظيفي، أو القسم...' : 'Search employee by name, ID, or department...'}
                    className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-[#0f141c] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Search Results Dropdown List */}
                <div className="max-h-40 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-white/5 border rounded-xl p-1 bg-white dark:bg-[#0f141c]">
                  {employeeResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      {isSearchingEmp ? (isAr ? 'جاري البحث...' : 'Searching...') : (isAr ? 'لا توجد نتائج مطابقة' : 'No employees found')}
                    </div>
                  ) : (
                    employeeResults.map(emp => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployee(emp);
                          populateDefaults(emp);
                        }}
                        className="p-2 rounded-lg hover:bg-teal-500/10 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-bold">{emp.full_name_ar || emp.name}</div>
                          <div className="text-[10px] text-slate-400">{emp.employee_id} • {emp.department} • {emp.position_ar}</div>
                        </div>
                        <div>
                          {emp.valid_email ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {emp.email}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                              {isAr ? 'بريد مفقود' : 'No Email'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Selected Employee Card */
              <div className="p-3 rounded-xl bg-white dark:bg-[#0f141c] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm shrink-0">
                    {(selectedEmployee.full_name_ar || selectedEmployee.name || 'E').slice(0, 1)}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{selectedEmployee.full_name_ar || selectedEmployee.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedEmployee.employee_id} • {selectedEmployee.department}
                    </div>
                  </div>
                </div>

                <div>
                  {selectedEmployee.valid_email ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <span className="material-symbols-outlined text-sm">mail</span>
                      <span>{selectedEmployee.email}</span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 text-[11px] font-bold border border-rose-500/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <span>{isAr ? 'تنبيه: لا يوجد بريد إلكتروني صالح مسجل لهذا الموظف' : 'No valid corporate email registered'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Templates & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'قالب محفوظ (اختياري)' : 'Saved Template'}</label>
              <select
                value={selectedTemplateId}
                onChange={e => handleTemplateChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="">{isAr ? '-- بدون قالب (تخصيص يدوي) --' : '-- No Template (Custom) --'}</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.template_name}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1">{isAr ? 'عنوان الرسالة (Subject)' : 'Subject'} <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Optional CC toggle */}
          <div>
            {!showCc ? (
              <button
                type="button"
                onClick={() => setShowCc(true)}
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-bold"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>{isAr ? 'إضافة نسخة كربونية (CC)' : 'Add Carbon Copy (CC)'}</span>
              </button>
            ) : (
              <div>
                <label className="block text-xs font-bold mb-1">{isAr ? 'نسخة كربونية (CC - مفصولة بفواصل)' : 'CC Email Addresses'}</label>
                <input
                  type="text"
                  value={ccList}
                  onChange={e => setCcList(e.target.value)}
                  placeholder="manager@vitasiraq.com, audit@vitasiraq.com"
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Section 3: Body / HTML editor */}
          <div>
            <label className="block text-xs font-bold mb-1">{isAr ? 'نص الرسالة (Body / HTML)' : 'Email Body (HTML)'}</label>
            <textarea
              rows={5}
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              className={`w-full p-3 rounded-xl border text-xs font-mono outline-none ${
                isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {/* Section 4: Attachments */}
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0a0c10] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-500 text-base">attachment</span>
                <span>{isAr ? 'المستندات والمرفقات (PDF, DOCX, XLSX)' : 'Attached Documents'}</span>
              </label>
              
              <label className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold cursor-pointer flex items-center gap-1 transition-all">
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>{isUploadingFile ? '...' : (isAr ? 'إرفاق ملف' : 'Attach File')}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.docx,.xlsx,.doc,.xls,.png,.jpg"
                  className="hidden"
                />
              </label>
            </div>

            {attachments.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400 italic">
                {isAr ? 'لا توجد مرفقات محددة حالياً' : 'No attachments attached'}
              </div>
            ) : (
              <div className="space-y-1.5">
                {attachments.map((att, idx) => (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#0f141c] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-teal-500 text-base">description</span>
                      <span className="font-bold text-slate-900 dark:text-white">{att.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({att.sizeKb} KB)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-rose-500 hover:text-rose-600 p-1 rounded-lg"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer & Explicit Confirmation */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-[#0a0c10]">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isAr ? 'يتطلب الإرسال تأكيداً صريحاً' : 'Explicit confirmation required'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={isSending || !selectedEmployee || !selectedEmployee.valid_email}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-teal-600/25 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">{isSending ? 'sync' : 'send'}</span>
              <span>{isSending ? (isAr ? 'جاري الإرسال عبر Graph...' : 'Sending...') : (isAr ? 'تأكيد وإرسال المستند' : 'Confirm & Send Document')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
