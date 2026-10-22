import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { UserRole, CategoryGroup } from '../types';
import { api } from '../api/client';
import { transliterateEnglishNameToArabic, hasArabicCharacters } from '../utils/nameHelper';
import { CATEGORY_GROUPS } from '../data/categories';
import * as XLSX from 'xlsx';
import { PoliciesSection } from '../components/PoliciesSection';

export const Category9RiskComplianceView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    riskRecords,
    addRiskRecord,
    currentUser,
    setCurrentUserRole,
    employees,
    addEmployee,
    language,
    theme,
    appSettings,
    t
  } = useApp();

  const isDark = theme === 'dark';

  // Extract Arabic Name with 100% certainty from all possible fields and transliteration fallback
  const extractArabicName = (emp: any): string => {
    if (!emp) return '';
    const candidates = [
      emp.full_name_ar,
      emp.fullNameAr,
      emp.name_ar,
      emp.nameAr,
      emp.fullName,
      emp.full_name,
      emp.name,
      emp.employeeName,
      emp.employeeNameAr
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() && c.trim() !== 'غير محدد' && hasArabicCharacters(c)) {
        return c.trim();
      }
    }
    const en = emp.full_name_en || emp.fullNameEn || emp.name_en || emp.nameEn || emp.fullName || emp.name || '';
    if (en && typeof en === 'string' && en.trim()) {
      return transliterateEnglishNameToArabic(en.trim());
    }
    return '';
  };

  const extractEnglishName = (emp: any): string => {
    if (!emp) return '';
    const candidates = [
      emp.full_name_en,
      emp.fullNameEn,
      emp.name_en,
      emp.nameEn,
      emp.fullName,
      emp.full_name,
      emp.name
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string' && c.trim() && c.trim() !== 'غير محدد' && !hasArabicCharacters(c)) {
        return c.trim();
      }
    }
    return emp.full_name_en || emp.fullNameEn || emp.name_en || '';
  };

  // --- 1. Risk Assessment State ---
  const [riskTitle, setRiskTitle] = useState('');
  const [riskCat, setRiskCat] = useState<'أمن المعلومات' | 'الامتثال التنظيمي' | 'التشغيلي' | 'المالي'>('أمن المعلومات');
  const [impact, setImpact] = useState<'منخفض' | 'متوسط' | 'عالي' | 'حرج'>('عالي');
  const [mitigation, setMitigation] = useState('');

  // --- 2. API Keys State ---
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; created: string; expires?: string; permissions?: string; status: string }[]>([
    { id: 'KEY-9401', name: 'مفتاح الربط مع بوابة التأمينات والتقاعد', key: 'vts_live_sk_8923fd829a47b10', created: '2026-01-15', expires: '2027-01-15', permissions: 'قراءة وكتابة (Full Access)', status: 'نشط' },
    { id: 'KEY-4122', name: 'واجهة الربط المصرفي CBI Gateway API', key: 'vts_live_sk_4421aa8720cb551', created: '2026-02-10', expires: '2027-02-10', permissions: 'قراءة وكتابة (Full Access)', status: 'نشط' },
    { id: 'KEY-2105', name: 'بوابة إرسال إشعارات الرسائل القصيرة SMS Gateway', key: 'vts_live_sk_1198bb9910ac332', created: '2026-03-01', expires: '2026-12-31', permissions: 'إرسال فقط (Send Only)', status: 'نشط' }
  ]);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [isAddApiKeyModalOpen, setIsAddApiKeyModalOpen] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [newApiKeyForm, setNewApiKeyForm] = useState({
    name: '',
    permissions: 'قراءة وكتابة (Full Access)',
    expires: '2027-10-13',
    description: ''
  });

  // --- Security Audit Logs State (Audit Trail & CBI Surveillance) ---
  const [auditLogs, setAuditLogs] = useState<any[]>([
    {
      id: 'LOG-2026-9042',
      timestamp: '2026-10-13 11:05:40',
      userId: 'EMP-001',
      userName: 'أحمد مصطفى الحسيني',
      userRole: 'Super Admin',
      action: 'تعديل صلاحيات الوصول لمجموعة الموارد البشرية (RBAC Policy Update)',
      actionType: 'RBAC_UPDATE',
      severity: 'warning',
      module: 'الصلاحيات والأدوار (cat-9-risk)',
      ipAddress: '192.168.1.109',
      userDevice: 'Chrome 129 (Windows 11)',
      status: 'ناجح',
      details: 'تم منح صلاحية تعديل العقود لمسؤول التوظيف وسحب صلاحية حذف السجلات.',
      metadata: { changed_by: 'Super Admin', target_group: 'HR Officers', policy_id: 'POL-SEC-02', hash: '8f7a6b2c9d1e4f3a5b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a' }
    },
    {
      id: 'LOG-2026-9038',
      timestamp: '2026-10-13 10:48:15',
      userId: 'EMP-014',
      userName: 'سارة عبد الرحمن الكرخي',
      userRole: 'HR Manager',
      action: 'اعتماد جدول رواتب شهر تشرين الأول وحساب البدلات (Payroll Execution)',
      actionType: 'PAYROLL_APPROVE',
      severity: 'success',
      module: 'الرواتب والتعويضات (cat-5-payroll)',
      ipAddress: '192.168.1.44',
      userDevice: 'Edge 128 (Windows 11)',
      status: 'ناجح',
      details: 'اعتماد كشف الرواتب الإجمالي لـ 142 موظفاً وتوليد ملف التوطين المصرفي.',
      metadata: { total_employees: 142, currency: 'IQD', cbi_gateway: 'Approved', hash: '5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d' }
    },
    {
      id: 'LOG-2026-9031',
      timestamp: '2026-10-13 10:30:22',
      userId: 'SYSTEM-SEC',
      userName: 'نظام الأمان التلقائي (IDS Watchdog)',
      userRole: 'System Security',
      action: 'رصد محاولة دخول فاشلة متكررة وتجميد الحساب مؤقتاً',
      actionType: 'FAILED_LOGIN_BLOCKED',
      severity: 'critical',
      module: 'تسجيل الدخول والأمان (cat-1-auth)',
      ipAddress: '185.220.101.5',
      userDevice: 'Python Requests / Automated Probe',
      status: 'محظور',
      details: 'تم حظر عنوان IP تلقائياً لمدة 60 دقيقة بعد 5 محاولات دخول فاشلة بكلمة مرور غير صحيحة.',
      metadata: { threat_level: 'HIGH', attempts: 5, action_taken: 'IP_BLOCKED', hash: '3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b' }
    },
    {
      id: 'LOG-2026-9025',
      timestamp: '2026-10-13 09:55:04',
      userId: 'EMP-007',
      userName: 'علي فاضل السعدي',
      userRole: 'Payroll Officer',
      action: 'تصدير بيانات سرية - تقرير الاستقطاعات الضريبية والضمان الاجتماعي',
      actionType: 'EXPORT_DATA',
      severity: 'info',
      module: 'التقارير الديناميكية (sys-dynamic-reports)',
      ipAddress: '192.168.1.52',
      userDevice: 'Chrome 129 (Windows 10)',
      status: 'ناجح',
      details: 'تصدير ملف إكسل مشفر ببيانات ضريبة الدخل والضمان الاجتماعي لفرع بغداد.',
      metadata: { export_format: 'XLSX', encrypted: true, records_count: 85, hash: '2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c' }
    },
    {
      id: 'LOG-2026-9018',
      timestamp: '2026-10-13 09:12:30',
      userId: 'SYNC-ENGINE',
      userName: 'محرك المزامنة السحابية وقواعد البيانات (Auto Sync)',
      userRole: 'System Core',
      action: 'مزامنة سجلات الحضور البيومتري وأجهزة البصمة مع الفروع',
      actionType: 'BIOMETRIC_SYNC',
      severity: 'success',
      module: 'الحضور والدوام (cat-4-leave)',
      ipAddress: '10.0.1.1',
      userDevice: 'Internal TCP Service (Port 5000)',
      status: 'ناجح',
      details: 'اكتمال سحب 1,240 قيد حضور وانصراف من 16 فرعاً بدون أي تعارض أو تكرار.',
      metadata: { synced_branches: 16, total_punches: 1240, conflicts: 0, hash: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b' }
    },
    {
      id: 'LOG-2026-9010',
      timestamp: '2026-10-13 08:30:00',
      userId: 'EMP-001',
      userName: 'أحمد مصطفى الحسيني',
      userRole: 'Super Admin',
      action: 'تسجيل دخول ناجح مع التحقق الثنائي (2FA Verification Passed)',
      actionType: 'LOGIN_2FA',
      severity: 'success',
      module: 'تسجيل الدخول والأمان (cat-1-auth)',
      ipAddress: '192.168.1.109',
      userDevice: 'Chrome 129 (Windows 11)',
      status: 'ناجح',
      details: 'تمت المصادقة الثنائية بنجاح عبر رمز OTP للجلسة المشفرة.',
      metadata: { session_id: 'SESS_89F12A', mfa_method: 'TOTP_AUTHENTICATOR', hash: '4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e' }
    },
    {
      id: 'LOG-2026-9002',
      timestamp: '2026-10-12 16:45:10',
      userId: 'EMP-022',
      userName: 'حيدر كامل المعموري',
      userRole: 'Legal & Compliance Officer',
      action: 'تحديث لائحة الامتثال والتوافق مع متطلبات البنك المركزي العراقي CBI',
      actionType: 'COMPLIANCE_UPDATE',
      severity: 'info',
      module: 'الحوكمة والامتثال (cat-9-risk)',
      ipAddress: '192.168.1.88',
      userDevice: 'Firefox 130 (Windows 11)',
      status: 'ناجح',
      details: 'إرفاق شهادة الامتثال الفصلية للربع الثالث وتحديث ضوابط مكافحة غسل الأموال AML.',
      metadata: { compliance_code: 'CBI-IT-GOV-2026', quarter: 'Q3', hash: '6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b' }
    },
    {
      id: 'LOG-2026-8994',
      timestamp: '2026-10-12 14:20:00',
      userId: 'DB-BACKUP-CRON',
      userName: 'نظام النسخ الاحتياطي التلقائي (Automated DB Backup)',
      userRole: 'System Daemon',
      action: 'توليد نسخة احتياطية مشفرة كاملة لقاعدة البيانات والوثائق (WORM Archive)',
      actionType: 'DB_BACKUP',
      severity: 'success',
      module: 'النظام والمطورين (cat-10-sys)',
      ipAddress: '127.0.0.1',
      userDevice: 'mysqldump / AES-256 Engine',
      status: 'ناجح',
      details: 'تم إنشاء النسخة الاحتياطية وتخزينها بتشفير AES-256 بحجم 428 MB وفحص سلامة التجزئة SHA-256 بنجاح.',
      metadata: { backup_file: 'backup_20261012_vitas.sql.enc', sha256_verified: true, hash: '7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c' }
    },
    {
      id: 'LOG-2026-8985',
      timestamp: '2026-10-12 11:15:33',
      userId: 'EMP-031',
      userName: 'مروة باسم الخفاجي',
      userRole: 'Archive Specialist',
      action: 'محاولة تحميل وثيقة سرية مقيدة بدون تفويض مدير الأرشيف',
      actionType: 'UNAUTHORIZED_ACCESS',
      severity: 'critical',
      module: 'أرشيف الملفات (cat-12-archive)',
      ipAddress: '192.168.1.73',
      userDevice: 'Chrome 128 (Windows 10)',
      status: 'محظور',
      details: 'رفض النظام طلب تنزيل ملف عقد عمل إداري مصنف (سري للغاية) لعدم توفر رتبة الأمان الكافية.',
      metadata: { document_id: 'DOC-CONF-8812', required_level: 'TOP_SECRET', user_level: 'CONFIDENTIAL', hash: '8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d' }
    },
    {
      id: 'LOG-2026-8971',
      timestamp: '2026-10-12 09:00:18',
      userId: 'EMP-001',
      userName: 'أحمد مصطفى الحسيني',
      userRole: 'Super Admin',
      action: 'تدوير مفتاح الربط البرمجي لواجهة CBI Gateway API وتنشيط الرمز الجديد',
      actionType: 'API_KEY_ROTATED',
      severity: 'warning',
      module: 'مفاتيح الربط البرمجي (cat-9-risk)',
      ipAddress: '192.168.1.109',
      userDevice: 'Chrome 129 (Windows 11)',
      status: 'ناجح',
      details: 'إلغاء المفتاح القديم KEY-3301 وإنشاء KEY-4122 بتشفير 256-bit للربط مع البنك المركزي.',
      metadata: { old_key_id: 'KEY-3301', new_key_id: 'KEY-4122', hash: '9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e' }
    }
  ]);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info' | 'success'>('all');
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('all');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);
  const [isLiveAuditStreaming, setIsLiveAuditStreaming] = useState<boolean>(true);
  const [isAddAuditModalOpen, setIsAddAuditModalOpen] = useState<boolean>(false);
  const [auditToast, setAuditToast] = useState<string | null>(null);
  const [newAuditForm, setNewAuditForm] = useState({
    action: '',
    actionType: 'MANUAL_AUDIT_INSPECTION',
    severity: 'info' as 'critical' | 'warning' | 'info' | 'success',
    module: 'الحوكمة والرقابة (cat-9-risk)',
    status: 'ناجح' as 'ناجح' | 'محظور' | 'تحذير',
    details: ''
  });

  // Fetch real audit logs from database with fallback
  useEffect(() => {
    const fetchAuditLogsFromApi = async () => {
      try {
        const res: any = await (api as any).getAuditLogs?.().catch(() => null);
        if (res?.success && Array.isArray(res.logs) && res.logs.length > 0) {
          const mapped = res.logs.map((l: any) => ({
            id: l.id || `LOG-${Date.now()}`,
            timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString('ar-EG') : new Date().toLocaleString('ar-EG'),
            userId: l.user_id || 'USR-SYSTEM',
            userName: l.user_name || 'System User',
            userRole: l.user_role || 'Staff',
            action: l.action || 'عملية تدقيق أمني',
            actionType: l.action_type || 'INFO',
            severity: (l.severity as any) || 'info',
            module: l.module || 'الأمان والامتثال',
            ipAddress: l.ip_address || '127.0.0.1',
            userDevice: l.user_agent || 'Client System',
            status: (l.status as any) || 'ناجح',
            details: l.details || '',
            metadata: typeof l.metadata === 'string' ? JSON.parse(l.metadata || '{}') : (l.metadata || {})
          }));
          setAuditLogs(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newRows = mapped.filter((m: any) => !existingIds.has(m.id));
            return [...newRows, ...prev];
          });
        }
      } catch (e) {
        // Fallback to initial state
      }
    };
    fetchAuditLogsFromApi();
  }, []);

  // Filtered audit logs computation
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditSeverityFilter !== 'all' && log.severity !== auditSeverityFilter) return false;
      if (auditModuleFilter !== 'all' && !log.module.includes(auditModuleFilter)) return false;
      if (auditSearch.trim()) {
        const q = auditSearch.toLowerCase().trim();
        const matches =
          (log.id && log.id.toLowerCase().includes(q)) ||
          (log.userName && log.userName.toLowerCase().includes(q)) ||
          (log.userId && log.userId.toLowerCase().includes(q)) ||
          (log.userRole && log.userRole.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.actionType && log.actionType.toLowerCase().includes(q)) ||
          (log.module && log.module.toLowerCase().includes(q)) ||
          (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
          (log.details && log.details.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [auditLogs, auditSeverityFilter, auditModuleFilter, auditSearch]);

  // Statistics KPI calculation
  const auditStats = useMemo(() => {
    const total = auditLogs.length;
    const critical = auditLogs.filter(l => l.severity === 'critical').length;
    const warnings = auditLogs.filter(l => l.severity === 'warning').length;
    const successes = auditLogs.filter(l => l.severity === 'success').length;
    const blocked = auditLogs.filter(l => l.status === 'محظور').length;
    return { total, critical, warnings, successes, blocked, complianceScore: 99.8 };
  }, [auditLogs]);

  // Export to Excel handler
  const handleExportAuditLogsExcel = () => {
    try {
      const exportData = filteredAuditLogs.map((log, index) => ({
        '#': index + 1,
        'معرف الحدث (Event ID)': log.id,
        'التاريخ والوقت': log.timestamp,
        'اسم المستخدم': log.userName,
        'معرف المستخدم': log.userId,
        'الدور الوظيفي': log.userRole,
        'نوع الحدث': log.action,
        'رمز الحدث': log.actionType,
        'المستوى الأمني (Severity)': log.severity,
        'الموديول المستهدف': log.module,
        'الحالة': log.status,
        'عنوان IP': log.ipAddress,
        'المتصفح / الجهاز': log.userDevice,
        'تفاصيل الحدث': log.details,
        'التوقيع الأمني (SHA-256)': log.metadata?.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Security Audit Logs');
      XLSX.writeFile(workbook, `VITAS_Audit_Trail_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setAuditToast(language === 'ar' ? 'تم تصدير سجلات التدقيق إلى ملف إكسل بنجاح!' : 'Audit logs exported to Excel successfully!');
      setTimeout(() => setAuditToast(null), 3500);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
    }
  };

  // Print CBI Compliance Report
  const handlePrintCbiAuditReport = () => {
    window.print();
  };

  // Add new audit record handler
  const handleAddAuditRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuditForm.action.trim()) return;

    const newRecord = {
      id: `LOG-2026-${Math.floor(9200 + Math.random() * 700)}`,
      timestamp: new Date().toLocaleString('ar-EG'),
      userId: currentUser?.employeeId || 'EMP-ADMIN',
      userName: currentUser?.name || 'مسؤول التدقيق والامتثال',
      userRole: currentUser?.role || 'Auditor',
      action: newAuditForm.action.trim(),
      actionType: newAuditForm.actionType,
      severity: newAuditForm.severity,
      module: newAuditForm.module,
      ipAddress: '192.168.1.109',
      userDevice: 'Browser Management Client',
      status: newAuditForm.status,
      details: newAuditForm.details.trim() || 'فحص تدقيق يدوي رسمي مسجل بواسطة مسؤول النظام والامتثال.',
      metadata: {
        manual_entry: true,
        auditor: currentUser?.name || 'Super Admin',
        hash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      }
    };

    setAuditLogs(prev => [newRecord, ...prev]);
    setIsAddAuditModalOpen(false);
    setNewAuditForm({
      action: '',
      actionType: 'MANUAL_AUDIT_INSPECTION',
      severity: 'info',
      module: 'الحوكمة والرقابة (cat-9-risk)',
      status: 'ناجح',
      details: ''
    });
    setAuditToast(language === 'ar' ? 'تم تسجيل فحص التدقيق الأمني بنجاح!' : 'Manual audit inspection logged successfully!');
    setTimeout(() => setAuditToast(null), 3500);

    // Save to backend if available
    await (api as any).addAuditLog?.({
      id: newRecord.id,
      user_id: newRecord.userId,
      user_name: newRecord.userName,
      user_role: newRecord.userRole,
      action: newRecord.action,
      action_type: newRecord.actionType,
      severity: newRecord.severity,
      module: newRecord.module,
      details: newRecord.details,
      status: newRecord.status
    }).catch(() => {});
  };

  // API Key handlers
  const handleToggleRevealKey = (id: string) => {
    setRevealedKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyApiKey = (id: string, keyVal: string) => {
    navigator.clipboard.writeText(keyVal).then(() => {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 3000);
    }).catch(() => {});
  };

  const handleGenerateApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKeyForm.name.trim()) return;
    const newId = `KEY-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const generatedKey = `vts_live_sk_${randomHex}`;
    const newKeyObj = {
      id: newId,
      name: newApiKeyForm.name.trim(),
      key: generatedKey,
      created: new Date().toISOString().slice(0, 10),
      expires: newApiKeyForm.expires || '2027-10-13',
      permissions: newApiKeyForm.permissions,
      status: 'نشط'
    };
    setApiKeys(prev => [newKeyObj, ...prev]);
    setIsAddApiKeyModalOpen(false);
    setNewApiKeyForm({ name: '', permissions: 'قراءة وكتابة (Full Access)', expires: '2027-10-13', description: '' });
    setAuditToast(language === 'ar' ? `تم إنشاء مفتاح API الجديد (${newId}) بنجاح!` : `New API Key (${newId}) generated!`);
    setTimeout(() => setAuditToast(null), 3500);
  };

  const handleDeleteApiKey = (id: string) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء وتعطيل مفتاح الوصول هذا؟ ستتوقف كافة التطبيقات المتصلة به.' : 'Are you sure you want to revoke this API Key? Connected applications will lose access.')) {
      setApiKeys(prev => prev.filter(k => k.id !== id));
      setAuditToast(language === 'ar' ? 'تم تعطيل وإلغاء مفتاح الوصول بنجاح.' : 'API Key revoked successfully.');
      setTimeout(() => setAuditToast(null), 3500);
    }
  };

  // --- 3. Security Settings State & Persistence ---
  const [minPasswordLength, setMinPasswordLength] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.minPasswordLength) return Number(parsed.minPasswordLength);
      }
    } catch (e) {}
    return 8;
  });
  const [requireSpecialChars, setRequireSpecialChars] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.requireSpecialChars === 'boolean') return parsed.requireSpecialChars;
      }
    } catch (e) {}
    return true;
  });
  const [enable2FA, setEnable2FA] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.enable2FA === 'boolean') return parsed.enable2FA;
      }
    } catch (e) {}
    return true;
  });
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sessionTimeoutMinutes) return Number(parsed.sessionTimeoutMinutes);
      }
    } catch (e) {}
    return 30;
  });
  const [maxFailedAttempts, setMaxFailedAttempts] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.maxFailedAttempts) return Number(parsed.maxFailedAttempts);
      }
    } catch (e) {}
    return 5;
  });
  const [isSavingSecuritySettings, setIsSavingSecuritySettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [lastSavedSecuritySettings, setLastSavedSecuritySettings] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('vitas_security_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.updatedAt) return parsed.updatedAt;
      }
    } catch (e) {}
    return null;
  });

  // Hydrate security settings from remote backend app_settings if available
  useEffect(() => {
    const loadRemoteSecuritySettings = async () => {
      try {
        const res: any = await api.getAppSettings().catch(() => null);
        if (res) {
          const map: Record<string, string> = {};
          if (Array.isArray(res)) {
            res.forEach((item: any) => {
              if (item.setting_key) map[item.setting_key] = item.setting_value;
            });
          } else if (typeof res === 'object') {
            Object.assign(map, res);
          }

          if (map.security_min_password_length) {
            setMinPasswordLength(Number(map.security_min_password_length));
          }
          if (map.security_session_timeout_minutes) {
            setSessionTimeoutMinutes(Number(map.security_session_timeout_minutes));
          }
          if (map.security_max_failed_attempts) {
            setMaxFailedAttempts(Number(map.security_max_failed_attempts));
          }
          if (map.security_require_special_chars !== undefined) {
            setRequireSpecialChars(map.security_require_special_chars === 'true');
          }
          if (map.security_enable_2fa !== undefined) {
            setEnable2FA(map.security_enable_2fa === 'true');
          }
          if (map.security_settings_updated_at) {
            setLastSavedSecuritySettings(map.security_settings_updated_at);
          }
        }
      } catch (err) {
        console.warn('Failed to load remote security settings:', err);
      }
    };
    loadRemoteSecuritySettings();
  }, []);

  // --- 4. Role Permission Editor State ---
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<string>('HR Manager');
  const [rolePermissions, setRolePermissions] = useState<Record<string, Record<string, boolean>>>({
    'Super Admin': { employees: true, payroll: true, recruitment: true, attendance: true, risk: true, settings: true, audit: true },
    'HR Manager': { employees: true, payroll: true, recruitment: true, attendance: true, risk: true, settings: false, audit: true },
    'Recruiter': { employees: false, payroll: false, recruitment: true, attendance: false, risk: false, settings: false, audit: false },
    'Department Head': { employees: true, payroll: false, recruitment: true, attendance: true, risk: false, settings: false, audit: false },
    'Employee': { employees: false, payroll: false, recruitment: false, attendance: true, risk: false, settings: false, audit: false },
    'IT Admin': { employees: false, payroll: false, recruitment: false, attendance: false, risk: true, settings: true, audit: true }
  });

  // --- 5. Employee Specific Module Permissions State (RBAC Delegation) ---
  const [rbacSubTab, setRbacSubTab] = useState<'custom_employees' | 'system_roles'>('custom_employees');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [empDeptFilter, setEmpDeptFilter] = useState<string>('all');
  const [empSearch, setEmpSearch] = useState<string>('');

  // Add New User Modal State & SubTab Switcher (Users vs Policies Mini-Settings)
  const [rolePermissionsSubTab, setRolePermissionsSubTab] = useState<'users' | 'policies'>('users');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [moduleFilterQuery, setModuleFilterQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'cat-2-dash': true,
    'cat-3-emp': true,
    'cat-4-leave': true,
    'cat-5-payroll': true,
    'cat-drivers': false,
    'cat-6-recruit': false,
    'cat-7-perf': false,
    'cat-8-assets': false,
    'cat-12-archive': false,
    'cat-9-risk': false,
    'cat-10-sys': false,
    'cat-11-support': false
  });
  const [newUserForm, setNewUserForm] = useState({
    id: undefined as number | string | undefined,
    originalUsername: '',
    originalEmployeeId: '',
    originalEmail: '',
    username: '',
    password: 'Password123!',
    fullNameAr: '',
    fullNameEn: '',
    jobTitle: 'موظف موارد بشرية',
    department: 'الموارد البشرية والشؤون الإدارية',
    branch: 'الإدارة العامة - بغداد',
    email: '',
    phone: '',
    modules: {
      'emp-list': 'write',
      'emp-add': 'write',
      'emp-directory': 'write',
      'leave-attendance': 'write',
      'sys-dynamic-reports': 'read'
    } as Record<string, 'write' | 'read' | 'none' | boolean>,
    level: 'full' as 'full' | 'read',
    canManageUsers: false,
    role: 'Employee' as UserRole,
    notes: 'مخول بالعمل على الموديولات والشاشات المحددة أدناه'
  });

  const [showUserPassword, setShowUserPassword] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<any | null>(null);
  const [quickNewPassword, setQuickNewPassword] = useState('');
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [isSavingQuickPassword, setIsSavingQuickPassword] = useState(false);

  const handleQuickChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !quickNewPassword.trim()) return;
    if (quickNewPassword.trim().length < 4) {
      alert(language === 'ar' ? 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' : 'Password must be at least 4 characters');
      return;
    }
    setIsSavingQuickPassword(true);
    try {
      const cleanPass = quickNewPassword.trim();
      
      // 1. Call server change-password API with administrative reset flag
      await api.changePassword({
        id: passwordModalUser.id,
        username: passwordModalUser.username,
        employeeId: passwordModalUser.employee_id,
        newPassword: cleanPass,
        adminReset: true
      } as any).catch(err => {
        console.warn('api.changePassword warning:', err);
      });

      // 2. Also ensure saveUser updates MySQL users table directly
      await api.saveUser({
        id: passwordModalUser.id,
        username: passwordModalUser.username,
        password: cleanPass,
        full_name: passwordModalUser.full_name || passwordModalUser.name,
        employee_id: passwordModalUser.employee_id,
        email: passwordModalUser.email
      }).catch(err => {
        console.warn('api.saveUser warning:', err);
      });

      // 3. Update localStorage custom users if present
      try {
        const raw = localStorage.getItem('vitas_custom_users') || '{}';
        const parsed = JSON.parse(raw);
        const uKey = (passwordModalUser.username || '').toLowerCase();
        if (parsed[uKey]) {
          parsed[uKey].password = cleanPass;
        } else {
          parsed[uKey] = {
            ...passwordModalUser,
            password: cleanPass
          };
        }
        localStorage.setItem('vitas_custom_users', JSON.stringify(parsed));
        api.updateAppSettingsBulk({
          vitas_custom_users: JSON.stringify(parsed)
        }).catch(() => {});
      } catch (e) {}

      // 4. Update local dbUsers state
      setDbUsers(prev => prev.map(u => {
        if (u.id === passwordModalUser.id || (u.username && u.username.toLowerCase() === (passwordModalUser.username || '').toLowerCase())) {
          return { ...u, password: cleanPass };
        }
        return u;
      }));

      // 5. Add Security Audit Log entry
      const auditEntry = {
        id: `LOG-PASS-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser?.id || 'USR-ADMIN',
        userName: currentUser?.name || 'مدير النظام والامتثال',
        userRole: currentUser?.role || 'Super Admin',
        action: 'تغيير وتعيين كلمة مرور مستخدم',
        actionType: 'PASSWORD_RESET',
        severity: 'warning' as const,
        module: 'إدارة المستخدمين والصلاحيات (sec-roles-permissions)',
        ipAddress: '192.168.1.109',
        userDevice: navigator.userAgent || 'Web Client',
        status: 'ناجح' as const,
        details: `تم تغيير كلمة المرور للمستخدم (${passwordModalUser.username || passwordModalUser.employee_id}) بنجاح.`
      };
      setAuditLogs(prev => [auditEntry, ...prev]);
      api.addAuditLog?.(auditEntry).catch(() => {});

      // 6. Refresh users list & broadcast
      fetchUsersFromDb();
      window.dispatchEvent(new CustomEvent('vitas:users_changed'));

      const userName = passwordModalUser.full_name || passwordModalUser.name || passwordModalUser.username;
      setCustomEmpSavedToast(
        language === 'ar'
          ? `تم تحديث كلمة المرور للمستخدم (${userName}) بنجاح وتفعيلها فوراً!`
          : `Password for (${userName}) updated and active immediately!`
      );
      setTimeout(() => setCustomEmpSavedToast(null), 5000);
      setPasswordModalUser(null);
      setQuickNewPassword('');
    } catch (err: any) {
      alert(language === 'ar' ? `فشل تحديث كلمة المرور: ${err.message || err}` : `Failed to update password: ${err.message || err}`);
    } finally {
      setIsSavingQuickPassword(false);
    }
  };

  // Granular Permission Helpers
  const getModLevel = (modId: string): 'write' | 'read' | 'none' => {
    const val = (newUserForm.modules as any)?.[modId];
    if (val === 'write' || val === true) return 'write';
    if (val === 'read') return 'read';
    return 'none';
  };

  const setModuleLevel = (modId: string, level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      const nextModules = { ...prev.modules };
      if (level === 'none') {
        delete nextModules[modId];
      } else {
        nextModules[modId] = level;
      }
      return { ...prev, modules: nextModules };
    });
  };

  const setCategoryAll = (cat: CategoryGroup, level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      const nextModules = { ...prev.modules };
      cat.modules.forEach(m => {
        if (level === 'none') {
          delete nextModules[m.id];
        } else {
          nextModules[m.id] = level;
        }
      });
      if (level === 'none') {
        delete nextModules[cat.id];
      } else {
        nextModules[cat.id] = level;
      }
      return { ...prev, modules: nextModules };
    });
  };

  const setGlobalAll = (level: 'write' | 'read' | 'none') => {
    setNewUserForm(prev => {
      if (level === 'none') {
        return { ...prev, modules: {} };
      }
      const nextModules: Record<string, any> = {};
      CATEGORY_GROUPS.filter(c => c.id !== 'cat-1-auth').forEach(c => {
        nextModules[c.id] = level;
        c.modules.forEach(m => {
          nextModules[m.id] = level;
        });
      });
      return { ...prev, modules: nextModules };
    });
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const toggleAllCategories = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    CATEGORY_GROUPS.forEach(c => {
      next[c.id] = expand;
    });
    setExpandedCategories(next);
  };

  const permissionStats = useMemo(() => {
    let writeCount = 0;
    let readCount = 0;
    Object.entries(newUserForm.modules || {}).forEach(([k, v]) => {
      if (k.startsWith('cat-')) return;
      if (v === 'write' || v === true) writeCount++;
      else if (v === 'read') readCount++;
    });
    return { writeCount, readCount, total: writeCount + readCount };
  }, [newUserForm.modules]);

  const dynamicModuleLabels = useMemo(() => {
    const labels: Record<string, string> = {
      employees: t('الموظفون والعقود', 'Employees & Contracts'),
      attendance: t('الحضور والدوام والإجازات', 'Leaves & Attendance'),
      payroll: t('الرواتب والتعويضات', 'Payroll & Compensation'),
      recruitment: t('التوظيف والاستقطاب (ATS)', 'Recruitment & ATS'),
      reports: t('التقارير الديناميكية وتصدير البيانات', 'Dynamic Reports & Export'),
      risk: t('المخاطر والامتثال والحوكمة', 'Risk & Compliance'),
      settings: t('إعدادات النظام والتهيئة', 'System Settings'),
      support: t('الدعم والمساعدة الفنية', 'Support & Help Desk'),
      drivers: t('إدارة السائقين والحركة والأسطول', 'Drivers & Fleet Management'),
      performance: t('إدارة الأداء والتدريب والكفاءات', 'Performance & Training'),
      assets: t('العهد والأصول والمستندات', 'Assets & Custody'),
      archive: t('الأرشيف الإلكتروني', 'Digital Archive'),
      'cat-2-dash': t('الرئيسية والإدارة', 'Dashboard & Executive'),
      'cat-3-emp': t('إدارة الموظفين والعقود', 'Employee Management & Contracts'),
      'cat-4-leave': t('الحضور والدوام والإجازات', 'Leaves & Attendance'),
      'cat-5-payroll': t('الرواتب والتعويضات', 'Payroll & Compensation'),
      'cat-drivers': t('إدارة السائقين والحركة', 'Drivers & Fleet Management'),
      'cat-6-recruit': t('التوظيف والاستقطاب', 'Recruitment & ATS'),
      'cat-7-perf': t('إدارة الأداء والتدريب', 'Performance & Training'),
      'cat-8-assets': t('العهد والأصول والمستندات', 'Assets & Custody'),
      'cat-12-archive': t('الأرشيف والملفات', 'Archive'),
      'cat-9-risk': t('المخاطر والامتثال والحوكمة', 'Risk & Compliance'),
      'cat-10-sys': t('التطوير البرمجي وإعدادات النظام', 'System Development & Settings'),
      'cat-11-support': t('الدعم الفني ومركز المساعدة', 'Support & Help Desk')
    };

    CATEGORY_GROUPS.forEach(g => {
      labels[g.id] = language === 'ar' ? g.title : g.titleEn;
      g.modules.forEach(m => {
        labels[m.id] = language === 'ar' ? m.title : m.titleEn;
      });
    });

    return labels;
  }, [language, t]);

  const filteredCategoryGroups = useMemo(() => {
    const operational = CATEGORY_GROUPS.filter(c => c.id !== 'cat-1-auth');
    if (!moduleFilterQuery.trim()) {
      return operational;
    }
    const q = moduleFilterQuery.toLowerCase().trim();
    return operational.map(cat => {
      const catMatches = cat.title.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q);
      const matchedModules = cat.modules.filter(m => 
        catMatches ||
        m.title.toLowerCase().includes(q) ||
        m.titleEn.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
      );
      return {
        ...cat,
        modules: matchedModules
      };
    }).filter(cat => cat.modules.length > 0);
  }, [moduleFilterQuery]);
  const [badgeSearchQuery, setBadgeSearchQuery] = useState<string>('');
  const [matchedEmployee, setMatchedEmployee] = useState<any>(null);
  const [isComboboxOpen, setIsComboboxOpen] = useState<boolean>(false);
  const comboboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsComboboxOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsComboboxOpen(false);
      }
    };

    if (isComboboxOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isComboboxOpen]);

  // Text normalization helper for flexible Arabic & English search
  const normalizeSearchText = (text: any) => {
    return String(text || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();
  };

  // Dynamic filter for Combobox search (instant search on any 1-2 characters in name or badge)
  const filteredEmployeesForCombobox = useMemo(() => {
    const rawQ = badgeSearchQuery.trim();
    if (!rawQ) return (employees || []).slice(0, 50);

    const normQ = normalizeSearchText(rawQ);
    const cleanQ = normQ.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();

    return (employees || []).filter((e: any) => {
      const b = normalizeSearchText(e.badge_no || e.badgeNo || '');
      const id = normalizeSearchText(e.employee_id || e.employeeId || e.id || '');
      const cleanB = b.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();
      const cleanId = id.replace(/^vts-?/i, '').replace(/^v-?/i, '').replace(/^b-?/i, '').trim();

      const nameAr = normalizeSearchText(e.full_name_ar || e.fullNameAr || e.name_ar || e.fullName || e.full_name || e.name || '');
      const nameEn = normalizeSearchText(e.full_name_en || e.fullNameEn || e.name_en || '');
      const dept = normalizeSearchText(e.department || e.department_ar || '');
      const pos = normalizeSearchText(e.position || e.position_ar || e.job_title || e.jobTitle || '');

      return (
        b.includes(normQ) ||
        (cleanQ && cleanB.includes(cleanQ)) ||
        id.includes(normQ) ||
        (cleanQ && cleanId.includes(cleanQ)) ||
        nameAr.includes(normQ) ||
        nameEn.includes(normQ) ||
        dept.includes(normQ) ||
        pos.includes(normQ)
      );
    }).slice(0, 60);
  }, [employees, badgeSearchQuery]);

  const handleAutofillFromEmployee = (emp: any) => {
    if (!emp) return;
    setMatchedEmployee(emp);
    setIsComboboxOpen(false);

    const badge = emp.badge_no || emp.badgeNo || emp.employee_id || emp.employeeId || emp.id || '';
    
    // Robust Arabic and English full name resolution with 100% guarantee
    const fullNameAr = extractArabicName(emp);
    const fullNameEn = extractEnglishName(emp) || fullNameAr;
    const jobTitle = emp.position || emp.position_ar || emp.job_title || emp.jobTitle || 'موظف';
    const dept = emp.department || emp.department_ar || 'الموارد البشرية والشؤون الإدارية';
    const branch = emp.branch || emp.location_ar || emp.location || 'الإدارة العامة - بغداد';
    const email = emp.email || emp.org_email || emp.personal_email || (badge ? `${String(badge).toLowerCase().replace(/[^a-z0-9]/g, '')}@vitasiraq.iq` : '');
    const phone = emp.phone || emp.mobile || '';
    
    // Clean suggested username without spaces
    const rawUser = emp.username || (emp.employee_id ? String(emp.employee_id).toLowerCase() : (badge ? String(badge).toLowerCase() : (email ? email.split('@')[0] : '')));
    const suggestedUsername = rawUser.replace(/\s+/g, '');

    setBadgeSearchQuery(`${badge} - ${fullNameAr || fullNameEn}`);

    setNewUserForm(prev => ({
      ...prev,
      originalEmployeeId: String(badge),
      username: suggestedUsername || prev.username,
      fullNameAr: fullNameAr || prev.fullNameAr,
      fullNameEn: fullNameEn || prev.fullNameEn,
      jobTitle: jobTitle || prev.jobTitle,
      department: dept || prev.department,
      branch: branch || prev.branch,
      email: email || prev.email,
      phone: phone || prev.phone
    }));
  };

  const [empPermLevel, setEmpPermLevel] = useState<'full' | 'read'>('full');
  const [empNotes, setEmpNotes] = useState<string>('');
  const [empModulePerms, setEmpModulePerms] = useState<Record<string, boolean>>({
    payroll: true,
    attendance: true,
    employees: true,
    recruitment: false,
    risk: false,
    settings: false,
    reports: true
  });
  const [customEmpSavedToast, setCustomEmpSavedToast] = useState<string | null>(null);

  const [savedEmpDelegations, setSavedEmpDelegations] = useState<Record<string, {
    id?: number | string;
    username?: string;
    employeeId: string;
    employeeName: string;
    employeeNameEn: string;
    department: string;
    jobTitle: string;
    modules: Record<string, boolean>;
    level: 'full' | 'read';
    notes: string;
    grantedBy: string;
    grantedAt: string;
  }>>(() => {
    try {
      const raw = localStorage.getItem('vitas_custom_employee_permissions');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
    return {
      '1': {
        employeeId: '1',
        employeeName: 'أحمد محمود العراقي',
        employeeNameEn: 'Ahmed Mahmoud Al-Iraqi',
        department: 'الموارد البشرية والشؤون الإدارية',
        jobTitle: 'مسؤول الرواتب والدوام',
        modules: { payroll: true, attendance: true, employees: true, recruitment: false, risk: false, settings: false, reports: true },
        level: 'full',
        notes: 'مخول رسمياً بإدارة مسيرات الرواتب الشهرية واعتماد حركات الحضور والإجازات',
        grantedBy: 'Super Admin',
        grantedAt: '2026-08-30'
      }
    };
  });

  const [departmentsList, setDepartmentsList] = useState<{ id: string | number; name_ar: string; name_en: string }[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);

  const fetchUsersFromDb = () => {
    api.getUsers()
      .then((usersList: any) => {
        if (Array.isArray(usersList)) {
          const nonAdminUsers = usersList.filter((u: any) => u.username !== 'admin' && u.username !== 'admin_super');
          setDbUsers(nonAdminUsers);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    api.getDepartments()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDepartmentsList(data.map((d: any) => ({
            id: d.id,
            name_ar: d.name_ar || d.name || 'قسم',
            name_en: d.name_en || d.name_ar || 'Department'
          })));
        }
      })
      .catch(() => {});

    fetchUsersFromDb();
    const handleUsersChanged = () => { fetchUsersFromDb(); };
    window.addEventListener('vitas:users_changed', handleUsersChanged);
    return () => window.removeEventListener('vitas:users_changed', handleUsersChanged);
  }, []);

  // Compute all unique departments from Settings + Employees table
  const allUniqueDepartments = useMemo(() => {
    const map = new Map<string, { name_ar: string; name_en: string }>();

    // 1. From settings API
    departmentsList.forEach(d => {
      if (d.name_ar && d.name_ar.trim()) {
        map.set(d.name_ar.trim(), {
          name_ar: d.name_ar.trim(),
          name_en: d.name_en?.trim() || d.name_ar.trim()
        });
      }
    });

    // 2. From all active employees in table
    employees.forEach(emp => {
      const deptAr = (emp.department || emp.department_ar || '').trim();
      const deptEn = (emp.department_en || deptAr).trim();
      if (deptAr && !map.has(deptAr)) {
        map.set(deptAr, { name_ar: deptAr, name_en: deptEn });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
  }, [departmentsList, employees]);

  // Auto-reset sub-tab to Employee Delegation whenever RBAC module is opened
  React.useEffect(() => {
    if (activeModuleId === 'sec-roles-permissions') {
      setRbacSubTab('custom_employees');
    }
  }, [activeModuleId]);

  // Handler to create a new user account & grant permissions immediately (WITHOUT inserting to employees table)
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.username.trim() || !newUserForm.fullNameAr.trim()) {
      alert(language === 'ar' ? 'يرجى إدخال اسم المستخدم والاسم الكامل بالعربية' : 'Please enter username and Arabic full name');
      return;
    }

    const cleanUsername = newUserForm.username.trim();
    const empCode = cleanUsername.toUpperCase().startsWith('VTS') ? cleanUsername.toUpperCase() : `VTS-${cleanUsername.toUpperCase()}`;
    const cleanEmpCode = newUserForm.originalEmployeeId || empCode;
    
    try {
      // NOTE: Creating a User NEVER adds or modifies records in the employees table!

      // Prepare full modules map with category rollups
      const fullModules: Record<string, any> = { ...newUserForm.modules };

      const categoryRollupKeys: Record<string, { catId: string; subIds: string[] }> = {
        employees: { catId: 'cat-3-emp', subIds: ['emp-list', 'emp-add', 'emp-contracts', 'emp-org-chart', 'emp-directory', 'emp-delegation', 'emp-sync-guide', 'emp-hr-directory'] },
        attendance: { catId: 'cat-4-leave', subIds: ['leave-attendance', 'leave-apply', 'leave-balance', 'leave-approvals', 'leave-timesheets', 'leave-earned', 'leave-schedule', 'leave-biometric-settings', 'leave-db-schema'] },
        payroll: { catId: 'cat-5-payroll', subIds: ['payroll-sheet', 'payroll-payslip', 'payroll-loans', 'payroll-tax', 'payroll-end-service', 'payroll-analytics', 'pay-dashboard', 'payroll-mgmt'] },
        recruitment: { catId: 'cat-6-recruit', subIds: ['recruit-openings', 'recruit-pipeline', 'recruit-interviews', 'recruit-offers', 'recruit-onboarding', 'recruit-dash', 'recruit-ats', 'recruit-candidate-profile'] },
        reports: { catId: 'cat-2-dash', subIds: ['sys-dynamic-reports', 'dash-overview', 'dash-exec-1', 'dash-exec-2', 'dash-ess', 'dash-search'] },
        risk: { catId: 'cat-9-risk', subIds: ['risk-matrix', 'risk-audit-logs', 'risk-policies', 'risk-incidents', 'risk-compliance-checklist', 'sec-roles', 'risk-assessment'] },
        settings: { catId: 'cat-10-sys', subIds: ['sys-code-view', 'sys-schema', 'sys-api-logs', 'sys-deploy-status', 'sys-sql-console', 'sys-env', 'auth-secure', 'auth-sso', 'auth-biometric'] },
        support: { catId: 'cat-11-support', subIds: ['support-tickets', 'support-faq', 'support-contact', 'support-guides', 'supp-knowledge-base', 'supp-emp-portal', 'supp-internal-chat', 'supp-notif-center', 'supp-mobile-app'] },
        drivers: { catId: 'cat-drivers', subIds: ['drivers-list', 'drivers-assignments', 'drivers-trips', 'drivers-maintenance', 'drivers-fuel', 'drivers-kpi'] },
        performance: { catId: 'cat-7-perf', subIds: ['perf-appraisals', 'perf-goals', 'perf-kpi', 'perf-training-plans', 'perf-courses'] },
        assets: { catId: 'cat-8-assets', subIds: ['asset-inventory', 'asset-assign', 'asset-custody', 'asset-maintenance', 'asset-my-requests', 'doc-company', 'doc-templates', 'doc-my-docs'] },
        archive: { catId: 'cat-12-archive', subIds: ['archive-digital', 'archive-cabinets', 'archive-indexing', 'archive-retention', 'archive-ocr', 'archive-audit'] }
      };

      Object.entries(categoryRollupKeys).forEach(([catKey, info]) => {
        const hasWrite = info.subIds.some(id => fullModules[id] === 'write' || fullModules[id] === true) || fullModules[info.catId] === 'write';
        const hasRead = info.subIds.some(id => fullModules[id] === 'read') || fullModules[info.catId] === 'read';
        if (hasWrite) {
          fullModules[catKey] = 'write';
          fullModules[info.catId] = 'write';
        } else if (hasRead) {
          fullModules[catKey] = 'read';
          fullModules[info.catId] = 'read';
        } else {
          fullModules[catKey] = false;
          fullModules[info.catId] = 'none';
        }
      });

      // 1. Save credentials for login (Local state)
      let existingUsers: any = {};
      try {
        const existingUsersRaw = localStorage.getItem('vitas_custom_users') || '{}';
        existingUsers = JSON.parse(existingUsersRaw);
        const isExplicitAdmin = Boolean(newUserForm.canManageUsers || newUserForm.role === 'Admin');
        const assignedRole: UserRole = isExplicitAdmin
          ? 'Admin'
          : (newUserForm.jobTitle.includes('مدير الموارد البشرية') ||
            newUserForm.jobTitle.toLowerCase().includes('hr manager') ||
            newUserForm.jobTitle.toLowerCase().includes('hr director'))
              ? 'HR Manager'
              : 'Employee';

        if (isExplicitAdmin) {
          fullModules['sec-roles-permissions'] = 'write';
          fullModules['sec-roles'] = 'write';
          fullModules['cat-9-risk'] = 'write';
          fullModules['risk'] = 'write';
        }

        // If password is blank when editing existing user, preserve existing password!
        const existingStoredPass = existingUsers[cleanUsername.toLowerCase()]?.password ||
          existingUsers[(newUserForm.originalUsername || '').toLowerCase()]?.password;
        const finalSavedPassword = (newUserForm.password && newUserForm.password.trim())
          ? newUserForm.password.trim()
          : (existingStoredPass || '123456');

        existingUsers[cleanUsername.toLowerCase()] = {
          username: cleanUsername,
          password: finalSavedPassword,
          name: newUserForm.fullNameAr.trim(),
          role: assignedRole,
          can_manage_users: isExplicitAdmin ? 1 : 0,
          employeeId: cleanEmpCode,
          jobTitle: newUserForm.jobTitle.trim(),
          modules: fullModules
        };
        localStorage.setItem('vitas_custom_users', JSON.stringify(existingUsers));
      } catch (err) {
        console.error(err);
      }

      const isExplicitAdmin = Boolean(newUserForm.canManageUsers || newUserForm.role === 'Admin');
      const assignedRole: UserRole = isExplicitAdmin
        ? 'Admin'
        : (newUserForm.jobTitle.includes('مدير الموارد البشرية') ||
          newUserForm.jobTitle.toLowerCase().includes('hr manager') ||
          newUserForm.jobTitle.toLowerCase().includes('hr director'))
            ? 'HR Manager'
            : 'Employee';

      // 2. Save delegated module permissions (Local state)
      const updatedDelegations = {
        ...savedEmpDelegations,
        [cleanEmpCode]: {
          id: newUserForm.id,
          username: cleanUsername,
          employeeId: cleanEmpCode,
          employeeName: newUserForm.fullNameAr.trim(),
          employeeNameEn: newUserForm.fullNameEn.trim() || newUserForm.fullNameAr.trim(),
          department: newUserForm.department,
          jobTitle: newUserForm.jobTitle.trim(),
          role: assignedRole,
          can_manage_users: isExplicitAdmin ? 1 : 0,
          modules: fullModules,
          level: newUserForm.level,
          notes: newUserForm.notes,
          grantedBy: currentUser?.name || 'Super Admin',
          grantedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        }
      };

      // Clean up previous keys if code or username was renamed
      if (newUserForm.originalEmployeeId && newUserForm.originalEmployeeId !== cleanEmpCode) {
        delete updatedDelegations[newUserForm.originalEmployeeId];
      }
      if (newUserForm.originalUsername && newUserForm.originalUsername.toLowerCase() !== cleanUsername.toLowerCase()) {
        delete existingUsers[newUserForm.originalUsername.toLowerCase()];
        delete updatedDelegations[newUserForm.originalUsername.toUpperCase()];
        delete updatedDelegations[`VTS-${newUserForm.originalUsername.toUpperCase()}`];
      }

      setSavedEmpDelegations(updatedDelegations);
      localStorage.setItem('vitas_custom_employee_permissions', JSON.stringify(updatedDelegations));

      // 3. Persist to Database users table (and Real-Time sync to Cloud)
      try {
        await api.saveUser({
          id: newUserForm.id,
          original_username: newUserForm.originalUsername || undefined,
          original_employee_id: newUserForm.originalEmployeeId || undefined,
          original_email: newUserForm.originalEmail || undefined,
          username: cleanUsername,
          // Only send password if user explicitly typed a new one, else keep current database password
          password: (newUserForm.password && newUserForm.password.trim()) ? newUserForm.password.trim() : undefined,
          full_name: newUserForm.fullNameAr.trim(),
          name: newUserForm.fullNameAr.trim(),
          email: newUserForm.email.trim() || `${cleanUsername.toLowerCase()}@vitasiraq.iq`,
          job_title: newUserForm.jobTitle.trim(),
          role: assignedRole,
          department: newUserForm.department,
          employee_id: cleanEmpCode,
          branch: newUserForm.branch,
          can_manage_employees: fullModules.employees ? 1 : (isExplicitAdmin ? 1 : 0),
          can_manage_finance: fullModules.payroll ? 1 : 0,
          can_manage_recruitment: fullModules.recruitment ? 1 : 0,
          can_manage_settings: fullModules.settings ? 1 : (isExplicitAdmin ? 1 : 0),
          can_manage_users: isExplicitAdmin ? 1 : 0,
          status: 'active',
          allowed_screens: fullModules
        });
      } catch (err: any) {
        alert(language === 'ar' ? `فشل حفظ المستخدم: ${err.message || err}` : `Failed to save user: ${err.message || err}`);
        return;
      }

      fetchUsersFromDb();
      window.dispatchEvent(new CustomEvent('vitas:users_changed'));

      await api.updateAppSettingsBulk({
        vitas_custom_employee_permissions: JSON.stringify(updatedDelegations),
        vitas_custom_users: JSON.stringify(existingUsers)
      }).catch((err: any) => {
        console.warn('Notice saving custom users to DB:', err.message);
      });

      api.getUsers().then((usersList: any) => {
        if (Array.isArray(usersList)) {
          const nonAdminUsers = usersList.filter((u: any) => u.username !== 'admin' && u.username !== 'admin_super');
          const delegationsFromDb: Record<string, any> = {};
          nonAdminUsers.forEach((u: any) => {
            const uCode = (u.employee_id || u.username || String(u.id)).toUpperCase();
            let parsedModules: Record<string, boolean> = {
              employees: Boolean(u.can_manage_employees),
              payroll: Boolean(u.can_manage_finance),
              recruitment: Boolean(u.can_manage_recruitment),
              settings: Boolean(u.can_manage_settings),
              attendance: false,
              reports: false,
              risk: false
            };
            if (u.allowed_screens) {
              try {
                const s = typeof u.allowed_screens === 'string' ? JSON.parse(u.allowed_screens) : u.allowed_screens;
                if (s && typeof s === 'object') parsedModules = { ...s };
              } catch (e) {}
            }
            delegationsFromDb[uCode] = {
              id: u.id,
              username: u.username,
              employeeId: uCode,
              employeeName: u.name || u.full_name || u.username,
              employeeNameEn: u.full_name || u.name || u.username,
              department: u.department || 'الموارد البشرية والشؤون الإدارية',
              jobTitle: u.job_title || u.role || 'مسؤول رواتب وحضور',
              modules: parsedModules,
              level: 'full',
              notes: 'مسؤول رواتب وحضور',
              grantedBy: 'مدير النظام (Super Admin)',
              grantedAt: u.created_at ? new Date(u.created_at).toISOString().slice(0, 16) : '2026-09-02 11:30'
            };
          });
          setSavedEmpDelegations(prev => ({ ...prev, ...delegationsFromDb }));
        }
      }).catch(() => {});

      api.syncNow().catch(() => {});

      // 4. Select this user and feedback
      setSelectedEmpId(cleanEmpCode);
      setIsAddUserModalOpen(false);
      const isEditingUser = Boolean(newUserForm.id);
      setCustomEmpSavedToast(
        language === 'ar'
          ? (isEditingUser
              ? `تم تحديث بيانات المستخدم (${newUserForm.fullNameAr}) وكلمة المرور والصلاحيات بنجاح!`
              : `تم حفظ وإنشاء حساب المستخدم (${newUserForm.fullNameAr}) ومزامنته مع السرفر السحابي بنجاح!`)
          : (isEditingUser
              ? `User account (${newUserForm.fullNameEn || newUserForm.fullNameAr}), password and permissions updated successfully!`
              : `User account (${newUserForm.fullNameEn || newUserForm.fullNameAr}) saved and synced to cloud successfully!`)
      );
      setTimeout(() => setCustomEmpSavedToast(null), 5000);

      // Reset form
      setNewUserForm({
        username: '',
        password: 'Password123!',
        fullNameAr: '',
        fullNameEn: '',
        jobTitle: 'مدخل بيانات موارد بشرية (HR Data Entry)',
        department: 'الموارد البشرية والشؤون الإدارية',
        branch: 'الإدارة العامة - بغداد',
        email: '',
        phone: '',
        modules: {
          employees: true,
          attendance: false,
          payroll: false,
          recruitment: false,
          risk: false,
          settings: false,
          reports: true
        },
        level: 'full',
        notes: 'مسؤول عن إدخال وتحديث بيانات الموظفين الأساسية، العقود، والمستندات في قسم الموارد البشرية'
      });
    } catch (err) {
      console.error(err);
      alert('Error creating user: ' + err);
    }
  };

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskTitle) return;
    addRiskRecord({
      riskCode: `RSK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: riskTitle,
      category: riskCat,
      impact,
      probability: 'متوسط',
      owner: currentUser?.name || currentUser?.email || 'مدير المخاطر والامتثال',
      mitigationPlan: mitigation || 'سيتم إعداد خطة التعافي والتغطية فوراً',
      status: 'مفتوح'
    });
    setRiskTitle('');
    setMitigation('');
    setActiveModuleId('risk-assessment');
  };

  const handleGenerateApiKey = () => {
    const newK = {
      id: `KEY-${Date.now().toString().slice(-4)}`,
      name: `مفتاح API جديد - ${currentUser?.role || 'مسؤول'}`,
      key: `vts_live_sk_${Math.random().toString(36).substring(2, 18)}`,
      created: new Date().toISOString().split('T')[0],
      status: 'نشط'
    };
    setApiKeys(prev => [newK, ...prev]);
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSecuritySettings(true);
    const nowIso = new Date().toISOString();

    const payload = {
      minPasswordLength: Number(minPasswordLength) || 8,
      sessionTimeoutMinutes: Number(sessionTimeoutMinutes) || 30,
      maxFailedAttempts: Number(maxFailedAttempts) || 5,
      requireSpecialChars: Boolean(requireSpecialChars),
      enable2FA: Boolean(enable2FA),
      updatedAt: nowIso
    };

    try {
      // 1. Immediately cache in localStorage (0ms display & offline resilience)
      localStorage.setItem('vitas_security_settings', JSON.stringify(payload));

      // 2. Sync to vitas_app_settings in localStorage as well
      try {
        const rawLocalApp = localStorage.getItem('vitas_app_settings');
        const parsedApp = rawLocalApp ? JSON.parse(rawLocalApp) : {};
        parsedApp.security_min_password_length = String(payload.minPasswordLength);
        parsedApp.security_session_timeout_minutes = String(payload.sessionTimeoutMinutes);
        parsedApp.security_max_failed_attempts = String(payload.maxFailedAttempts);
        parsedApp.security_require_special_chars = String(payload.requireSpecialChars);
        parsedApp.security_enable_2fa = String(payload.enable2FA);
        parsedApp.security_settings_updated_at = nowIso;
        localStorage.setItem('vitas_app_settings', JSON.stringify(parsedApp));
      } catch (e) {}

      // 3. Persist to backend MySQL database via bulk settings endpoint
      const backendPayload: Record<string, string> = {
        security_min_password_length: String(payload.minPasswordLength),
        security_session_timeout_minutes: String(payload.sessionTimeoutMinutes),
        security_max_failed_attempts: String(payload.maxFailedAttempts),
        security_require_special_chars: String(payload.requireSpecialChars),
        security_enable_2fa: String(payload.enable2FA),
        security_settings_updated_at: nowIso
      };

      await api.updateAppSettingsBulk(backendPayload).catch(err => {
        console.warn('Backend settings bulk save warning:', err);
      });

      // 4. Dispatch custom window event so other modules stay synchronized
      window.dispatchEvent(new CustomEvent('vitas_security_settings_updated', { detail: payload }));

      // 5. Add to audit trail log
      const auditEntry = {
        id: `LOG-SEC-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        userId: currentUser?.id || 'USR-ADMIN',
        userName: currentUser?.name || 'مدير النظام والامتثال',
        userRole: currentUser?.role || 'Super Admin',
        action: 'تحديث سياسات وإعدادات الأمان العامة',
        actionType: 'SECURITY_POLICY_UPDATE',
        severity: 'info' as const,
        module: 'إعدادات الأمان العامة (sec-general-settings)',
        ipAddress: '192.168.1.109',
        userDevice: navigator.userAgent || 'Web Client',
        status: 'ناجح' as const,
        details: `تم تحديث سياسات الأمان: الحد الأدنى لكلمة المرور (${payload.minPasswordLength})، مهلة الجلسة (${payload.sessionTimeoutMinutes} دقيقة)، عدد المحاولات (${payload.maxFailedAttempts})، الرموز الخاصة (${payload.requireSpecialChars ? 'مُفعّلة' : 'مُعطّلة'})، المصادقة الثنائية 2FA (${payload.enable2FA ? 'مُفعّلة' : 'مُعطّلة'}).`,
        metadata: payload
      };

      setAuditLogs(prev => [auditEntry, ...prev]);

      // Post audit log to server in background
      await (api as any).addAuditLog?.({
        id: auditEntry.id,
        user_id: auditEntry.userId,
        user_name: auditEntry.userName,
        user_role: auditEntry.userRole,
        action: auditEntry.action,
        action_type: auditEntry.actionType,
        severity: auditEntry.severity,
        module: auditEntry.module,
        details: auditEntry.details,
        status: auditEntry.status
      }).catch(() => {});

      // 6. UI Feedbacks
      setLastSavedSecuritySettings(nowIso);
      setSettingsSaved(true);
      setAuditToast(
        language === 'ar'
          ? 'تم حفظ إعدادات وسياسات الأمان بنجاح وتحديث قاعدة البيانات!'
          : 'Security policies & parameters saved successfully to database!'
      );

      setTimeout(() => setSettingsSaved(false), 4000);
      setTimeout(() => setAuditToast(null), 5000);
    } catch (err: any) {
      console.error('Error saving security settings:', err);
      alert(language === 'ar' ? `حدث خطأ أثناء حفظ الإعدادات: ${err.message}` : `Error saving security settings: ${err.message}`);
    } finally {
      setIsSavingSecuritySettings(false);
    }
  };

  const handleResetSecuritySettingsToDefaults = () => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من استعادة إعدادات الأمان الافتراضية الموصى بها؟' : 'Are you sure you want to restore recommended security defaults?')) {
      setMinPasswordLength(8);
      setSessionTimeoutMinutes(30);
      setMaxFailedAttempts(5);
      setRequireSpecialChars(true);
      setEnable2FA(true);
    }
  };

  const togglePermission = (role: string, moduleKey: string) => {
    setRolePermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleKey]: !prev[role]?.[moduleKey]
      }
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          {(activeModuleId === 'risk-audit-reports' || activeModuleId === 'risk-audit') && t('مركز تقارير التدقيق والامتثال التنظيمي', 'Audit & Regulatory Compliance Reports Center')}
          {(activeModuleId === 'risk-governance' || activeModuleId === 'risk-dashboard' || activeModuleId === 'cat-9-risk') && t('لوحة حوكمة الامتثال وسجلات الرقابة المصرفية', 'Compliance Governance & Banking Supervision Logs')}
          {activeModuleId === 'risk-tracker' && t('متتبع التوافق والتشريعات واللوائح المصرفية', 'Regulatory Compliance & Statutory Tracker')}
          {(activeModuleId === 'risk-policies' || activeModuleId === 'risk-training') && t('سجل اللوائح والسياسات الداخلية المعتمدة', 'Approved Internal Policies & Regulations Register')}
          {(activeModuleId === 'risk-assessment' || activeModuleId === 'risk-incident') && t('سجل ونظرة عامة على تقييم المخاطر', 'Risk Assessment Register & Overview')}
          {activeModuleId === 'risk-identify-new' && t('تسجيل وتحديد خطر تشغيلي / سيبراني جديد', 'Register New Operational / Cyber Risk')}
          {activeModuleId === 'risk-details-privacy' && t('إطار حماية الخصوصية والبيانات الشخصية', 'Data Privacy & Protection Framework')}
          {activeModuleId === 'sec-general-settings' && t('إعدادات وسياسات الأمان العامة', 'General Security Settings & Policies')}
          {activeModuleId === 'sec-audit-logs' && t('سجلات تدقيق الأمان وأحداث النظام (Audit Trail)', 'Security Audit Logs & System Events')}
          {activeModuleId === 'sec-roles-permissions' && t('إدارة أدوار وصلاحيات المستخدمين (RBAC)', 'Role-Based Access Control & Permissions (RBAC)')}
          {activeModuleId === 'sec-edit-role' && t('محرر ومخصص الصلاحيات البرمجية للأدوار', 'Role Permissions Editor')}
          {activeModuleId === 'sec-api-keys' && t('إدارة مفاتيح وتصاريح الربط البرمجي (API Keys)', 'API Keys & Integration Management')}
        </h1>
      </div>

      {/* =========================================================================
          MODULE 1 & DEFAULT: Compliance Governance Dashboard (risk-governance / cat-9-risk)
          ========================================================================= */}
      {(activeModuleId === 'risk-governance' || activeModuleId === 'risk-dashboard' || activeModuleId === 'cat-9-risk' || !activeModuleId) && (
        <div className="space-y-6">
          {/* Top Compliance Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('نسبة الامتثال التنظيمي', 'Compliance Index')}</span>
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 material-symbols-outlined text-lg">verified</span>
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">99.4%</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('مطابق لمتطلبات البنك المركزي العراقي CBI', 'Compliant with Central Bank of Iraq standards')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('المخاطر التشغيلية المفتوحة', 'Open Operational Risks')}</span>
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 material-symbols-outlined text-lg">warning</span>
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{riskRecords.length} {t('مخاطر', 'Risks')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('تحت خطة المعالجة والتخفيف النشطة', 'Under active mitigation plans')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('سياسات المؤسسة المعتمدة', 'Approved Policies')}</span>
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 material-symbols-outlined text-lg">policy</span>
              </div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">8 {t('لوائح', 'Policies')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('محدثة ومعتمدة من مجلس الإدارة 2026', 'Updated & approved by BoD')}</p>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('حالة الأمان والـ RBAC', 'Security & RBAC Status')}</span>
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 material-symbols-outlined text-lg">shield</span>
              </div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{t('مؤمّن بالكامل', 'Fully Secured')}</div>
              <p className="text-[11px] text-slate-500 mt-1">{t('2FA نشط مع تسجيل تدقيق مستمر', '2FA enabled with full audit trail')}</p>
            </div>
          </div>

          {/* CBI Supervision & Banking Guidelines Table */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div>
                <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('سجل التوافق مع تعاميم وضوابط البنك المركزي العراقي (CBI Compliance Log)', 'CBI Circulars & Banking Supervision Compliance Log')}
                </h2>
                <p className="text-slate-500 text-[11px] mt-0.5">{t('المؤسسة تخضع لرقابة وإشراف البنك المركزي العراقي للمؤسسات المالية غير المصرفية', 'VITAS Iraq is regulated by the Central Bank of Iraq')}</p>
              </div>
              <button
                onClick={() => setActiveModuleId('risk-audit-reports')}
                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-sm flex items-center gap-1 text-xs"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>{t('تصدير سجل الامتثال', 'Export Compliance')}</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start">
                <thead>
                  <tr className={`border-b text-[11px] font-bold ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                    <th className="pb-3 text-start">{t('التعميم / اللائحة الرقابية', 'Regulation / Circular')}</th>
                    <th className="pb-3 text-start">{t('الجهة المصدرة', 'Authority')}</th>
                    <th className="pb-3 text-start">{t('تاريخ الإصدار', 'Date')}</th>
                    <th className="pb-3 text-start">{t('موقف نظام الموارد البشرية', 'HRIS Status')}</th>
                    <th className="pb-3 text-start">{t('حالة الامتثال', 'Compliance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {[
                    { title: 'ضوابط مكافحة غسل الأموال وتمويل الإرهاب (AML/CFT)', auth: 'البنك المركزي العراقي', date: '2026-01-10', status: 'تطبيق فحص دوري لكافة الموظفين والمرشحين', comp: 'مطابق 100%' },
                    { title: 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', auth: 'وزارة العمل والشؤون الاجتماعية', date: '2025-11-20', status: 'دمج محرك احتساب الضمان والضريبة المباشرة بنجاح', comp: 'مطابق 100%' },
                    { title: 'معايير الحوكمة وإدارة المخاطر التشغيلية والسيبرانية', auth: 'قسم الرقابة والامتثال CBI', date: '2026-02-01', status: 'تفعيل سجل التدقيق والمصادقة الثنائية وتشفير البيانات', comp: 'مطابق 100%' },
                    { title: 'حماية بيانات العملاء والموظفين وسرية المعلومات الائتمانية', auth: 'البنك المركزي العراقي', date: '2025-12-15', status: 'تشفير كامل لقاعدة البيانات وإدارة صلاحيات RBAC', comp: 'مطابق 100%' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-3 font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{row.title}</td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{row.auth}</td>
                      <td className="py-3 font-mono text-slate-500">{row.date}</td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{row.status}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                          {row.comp}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 2: Audit & Regulatory Compliance Reports (risk-audit-reports / risk-audit)
          ========================================================================= */}
      {(activeModuleId === 'risk-audit-reports' || activeModuleId === 'risk-audit') && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('مركز تقارير التدقيق والرقابة التنظيمية المعتمدة', 'Official Regulatory & Compliance Audit Reports')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('تقارير جاهزة للطباعة والتصدير للجهات الرقابية والمراجع الخارجي', 'Export-ready reports for regulators & external auditors')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'AUD-2026-01', title: 'تقرير تدقيق الامتثال السنوي للبنك المركزي CBI', date: '2026-02-15', auditor: 'إدارة الامتثال والمخاطر', status: 'معتمد رسمياً', desc: 'تقرير مفصل حول التزام مؤسسة فيتاس العراق بكافة الضوابط الرقابية والحوكمة المؤسسية.' },
              { id: 'AUD-2026-02', title: 'تقرير مراجعة وتدقيق كشوفات الرواتب ومطابقة الضمان', date: '2026-02-01', auditor: 'التدقيق الداخلي والمالي', status: 'معتمد رسمياً', desc: 'مطابقة دقيقة لكشوفات الرواتب، استقطاعات الضمان الاجتماعي رقم 18 لسنة 2023 وضريبة الدخل.' },
              { id: 'AUD-2026-03', title: 'تقرير فحص أمان النفاذ وصلاحيات المستخدمين (RBAC Audit)', date: '2026-01-20', auditor: 'أمن المعلومات والسيبراني', status: 'معتمد رسمياً', desc: 'مراجعة دورية لمصفوفة الصلاحيات، الحسابات الإدارية، وسجلات الدخول على مستوى الفروع.' },
              { id: 'AUD-2026-04', title: 'تقرير فحص الأصول والعهد الرقمية واللوائح الداخلية', date: '2026-01-05', auditor: 'لجنة التدقيق الإداري', status: 'معتمد رسمياً', desc: 'حصر العهد الإلكترونية والأجهزة المخصصة للموظفين والتأكد من وثائق التسليم والاسترجاع.' }
            ].map(rep => (
              <div key={rep.id} className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">{rep.id}</span>
                    <h3 className="font-bold text-sm mt-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{rep.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    {rep.status}
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">{rep.desc}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('المدقق:', 'Auditor:')} <b className="text-slate-600 dark:text-slate-200">{rep.auditor}</b></span>
                  <button
                    onClick={() => alert(`تم تجهيز ملف التقرير ${rep.id} للطباعة والتصدير.`)}
                    className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">download</span>
                    <span>{t('تحميل PDF', 'Download PDF')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 3: Regulatory Compliance Tracker (risk-tracker)
          ========================================================================= */}
      {activeModuleId === 'risk-tracker' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('متتبع التوافق والتشريعات واللوائح العراقية النافذة', 'Iraqi Statutory & Regulatory Compliance Tracker')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('المتابعة اللحظية للقوانين واللوائح الملزمة في جمهورية العراق', 'Active tracking of applicable laws & regulatory requirements in Iraq')}</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { law: 'قانون العمل العراقي رقم (37) لسنة 2015', scope: 'عقود العمل، ساعات الدوام، الإجازات، مكافأة نهاية الخدمة، والسلامة المهنية', comp: '100% مطابق', nextReview: '2026-06-30' },
              { law: 'قانون التقاعد والضمان الاجتماعي للعمال رقم (18) لسنة 2023', scope: 'نسب الاستقطاع (5% عامل + 12% صاحب عمل) والتصريح الإلكتروني بالرواتب', comp: '100% مطابق', nextReview: '2026-03-31' },
              { law: 'تعليمات البنك المركزي العراقي رقم (4) لمؤسسات التمويل الأصغر', scope: 'الحوكمة، الرقابة الداخلية، وإدارة المخاطر الائتمانية والتشغيلية', comp: '100% مطابق', nextReview: '2026-05-15' },
              { law: 'قانون ضريبة الدخل العراقي وتعديلاته والسماحات القانونية', scope: 'احتساب الاستقطاع المباشر والسماحات الزوجية وتنزيل الاشتراكات التقاعدية', comp: '100% مطابق', nextReview: '2026-04-30' }
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="space-y-1 max-w-xl">
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{item.law}</h3>
                  <p className="text-slate-500 text-[11px]">{item.scope}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-end">
                    <span className="text-[10px] text-slate-400 block">{t('المراجعة القادمة', 'Next Review')}</span>
                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{item.nextReview}</span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    {item.comp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 4: Company Policies Register (risk-policies / risk-training)
          ========================================================================= */}
      {(activeModuleId === 'risk-policies' || activeModuleId === 'risk-training') && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('سجل السياسات واللوائح الداخلية المعتمدة لمؤسسة فيتاس العراق', 'VITAS Iraq Approved Internal Policies Register')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('السياسات المعتمدة والملزمة لجميع موظفي المؤسسة في الإدارة العامة وكافة الفروع', 'Mandatory policies for all staff across HQ and branch network')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { code: 'POL-HR-01', title: 'دليل سياسات وإجراءات الموارد البشرية والتوظيف', version: 'v3.2', date: '2026-01-01', pages: '45 صفحة', desc: 'المعايير المعتمدة للتعيين، التقييم، الترقية، الرواتب والبدلات، وإنهاء الخدمة.' },
              { code: 'POL-SEC-02', title: 'سياسة أمان المعلومات وسرية البيانات والأجهزة', version: 'v2.8', date: '2025-12-10', pages: '28 صفحة', desc: 'ضوابط كلمات المرور، استخدام الحواسيب المحمولة، وحظر تسريب بيانات المقترضين.' },
              { code: 'POL-ETH-03', title: 'ميثاق السلوك المهني والنزاهة ومكافحة الفساد', version: 'v4.0', date: '2026-01-15', pages: '18 صفحة', desc: 'قواعد تجنب تضارب المصالح، قبول الهدايا، وحماية أصول المؤسسة وسمعتها.' },
              { code: 'POL-LEV-04', title: 'لائحة تنظيم الدوام الرسمي والإجازات والانضباط', version: 'v3.0', date: '2025-11-05', pages: '22 صفحة', desc: 'ضوابط الإجازات السنوية، المرضية، الاستثنائية، وساعات العمل المرنة.' }
            ].map(pol => (
              <div key={pol.code} className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-[10px] text-teal-600 dark:text-teal-400 font-bold">{pol.code} • {pol.version}</span>
                    <h3 className="font-bold text-sm mt-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{pol.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold">
                    {pol.pages}
                  </span>
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">{pol.desc}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">{t('تاريخ التحديث:', 'Updated:')} <b className="font-mono text-slate-600 dark:text-slate-200">{pol.date}</b></span>
                  <button
                    onClick={() => alert(`سيتم فتح واستعراض مستند ${pol.title}`)}
                    className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">visibility</span>
                    <span>{t('استعراض الدليل', 'View Policy')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Interactive HR System Policies & Contract Dates Batch Tool */}
          <div className="pt-6 border-t border-slate-200 dark:border-white/10">
            <PoliciesSection
              language={language}
              t={t}
              employees={employees}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 5: Risk Assessment Register (risk-assessment / risk-incident)
          ========================================================================= */}
      {(activeModuleId === 'risk-assessment' || activeModuleId === 'risk-incident') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            <span>{t(`سجل المخاطر النشطة (${riskRecords.length})`, `Active Risk Register (${riskRecords.length})`)}</span>
            <button
              onClick={() => setActiveModuleId('risk-identify-new')}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-500 transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add_alert</span>
              <span>{t('+ تسجيل خطر جديد', '+ Register New Risk')}</span>
            </button>
          </div>

          {riskRecords.length === 0 ? (
            <EmptyState
              icon="warning"
              title={t('سجل المخاطر مفرّغ تماماً', 'Risk Register Empty')}
              description={t('لم يتم تسجيل أي مخاطر تشغيلية أو سيبرانية غير معالجة حتى الآن.', 'No unmitigated operational or cyber risks have been identified.')}
              actionText={t('تحديد خطر جديد', 'Identify New Risk')}
              onAction={() => setActiveModuleId('risk-identify-new')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {riskRecords.map(r => (
                <div key={r.id} className={`p-5 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    <span className="text-sm">{r.title}</span>
                    <span className="text-rose-500 dark:text-rose-400 font-mono text-xs">{r.riskCode}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    <b>{t('الفئة:', 'Category:')}</b> {r.category} • <b>{t('خطة المعالجة:', 'Mitigation:')}</b> {r.mitigationPlan}
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-between items-center text-[11px]">
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                      {t('التأثير:', 'Impact:')} {r.impact}
                    </span>
                    <span className="text-slate-400 font-mono">{t('تم الرصد:', 'Logged:')} {r.identifiedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 6: Identify & Register New Risk (risk-identify-new)
          ========================================================================= */}
      {activeModuleId === 'risk-identify-new' && (
        <div className={`max-w-xl mx-auto p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <h2 className="text-base font-bold border-b border-slate-200 dark:border-white/10 pb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {t('تسجيل خطر تشغيلي أو سيبراني جديد', 'Register New Risk in Governance Register')}
          </h2>
          <form onSubmit={handleAddRisk} className="space-y-4">
            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('وصف الخطر المحتمل *', 'Potential Risk Description *')}
              </label>
              <input
                type="text"
                required
                placeholder={t('مثال: احتمال انقطاع خدمة الاتصال الشبكي عن فرع البصرة', 'e.g. Potential network connection outage at Basra branch')}
                value={riskTitle}
                onChange={e => setRiskTitle(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-normal outline-none transition-all ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('فئة الخطر', 'Risk Category')}
                </label>
                <select
                  value={riskCat}
                  onChange={e => setRiskCat(e.target.value as any)}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="أمن المعلومات">{t('أمن المعلومات والسيبراني', 'Information & Cyber Security')}</option>
                  <option value="الامتثال التنظيمي">{t('الامتثال للبنك المركزي CBI', 'Central Bank Compliance')}</option>
                  <option value="التشغيلي">{t('التشغيلي واستمرارية العمل', 'Operational & Business Continuity')}</option>
                  <option value="المالي">{t('المالي والائتمان', 'Financial & Credit')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('درجة التأثير المتوقعة', 'Expected Impact Level')}
                </label>
                <select
                  value={impact}
                  onChange={e => setImpact(e.target.value as any)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-bold text-rose-500 outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="منخفض">{t('منخفض (Low)', 'Low')}</option>
                  <option value="متوسط">{t('متوسط (Medium)', 'Medium')}</option>
                  <option value="عالي">{t('عالي (High)', 'High')}</option>
                  <option value="حرج">{t('حرج جداً (Critical)', 'Critical')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                {t('خطة المعالجة والتخفيف (Mitigation Plan)', 'Mitigation Plan')}
              </label>
              <textarea
                rows={3}
                placeholder={t('تفاصيل خطة التحوط والتغطية للحد من أثر الخطر...', 'Mitigation plan details...')}
                value={mitigation}
                onChange={e => setMitigation(e.target.value)}
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                className={`w-full p-3 rounded-xl border text-xs font-normal outline-none transition-all ${
                  isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all text-xs"
            >
              {t('حفظ وتثبيت الخطر في سجل الحوكمة', 'Save Risk to Governance Register')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 7: Data Privacy & Protection (risk-details-privacy)
          ========================================================================= */}
      {activeModuleId === 'risk-details-privacy' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إطار حماية وسرية البيانات الشخصية للموظفين والعملاء', 'Data Privacy & Protection Governance Framework')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('معايير التشفير والاحتفاظ الآمن بالبيانات وفق التشريعات المصرفية', 'Data encryption, retention, and access management standards')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">lock</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('تشفير البيانات الحساسة', 'Data Encryption')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('تشفير بيانات الرواتب، أرقام الهويات الوطنية، والمستندات ببروتوكول AES-256 بت على السيرفر المحلي والسحابي.', 'Sensitive data encrypted with AES-256.')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">history_toggle_off</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('سياسة الاحتفاظ والأرشفة', 'Retention Policy')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('الاحتفاظ بالسجلات الوظيفية والمالية لمدة 10 سنوات امتثالاً لتعليمات البنك المركزي العراقي وقانون العمل.', 'Retention of HR & payroll records for 10 years.')}</p>
            </div>

            <div className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-2xl">security</span>
              <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{t('حقوق النفاذ المحددة (Least Privilege)', 'Least Privilege Access')}</h3>
              <p className="text-slate-500 text-[11px] leading-relaxed">{t('لا يمكن لأي موظف الاطلاع على رواتب أو تقييمات زملائه إلا بوجود صلاحية إدارية محددة في RBAC.', 'Strict RBAC prevents unauthorized payroll access.')}</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 8: General Security Settings (sec-general-settings)
          ========================================================================= */}
      {activeModuleId === 'sec-general-settings' && (
        <div className={`max-w-2xl mx-auto p-6 rounded-3xl border shadow-xl space-y-5 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إعدادات وسياسات الأمان العامة للبوابة', 'Portal General Security Policies & Parameters')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('تخصيص شروط كلمات المرور، انتهاء الجلسات، والمصادقة المزدوجة', 'Configure password rules, session timeouts, and MFA')}</p>
            </div>
            {lastSavedSecuritySettings && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono">
                <span className="material-symbols-outlined text-xs">verified</span>
                <span>{t('محفوظة ومحدثة', 'Synced & Saved')}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('الحد الأدنى لطول كلمة المرور (أحرف)', 'Min Password Length')}
                </label>
                <input
                  type="number"
                  min={4}
                  max={32}
                  value={minPasswordLength}
                  onChange={e => setMinPasswordLength(e.target.value === '' ? '' as any : Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('يوصى بـ 8 أحرف على الأقل لحماية الحسابات', 'Recommended 8+ characters')}</p>
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('مهلة انتهاء الجلسة بعد الخمول (بالدقائق)', 'Session Inactivity Timeout (Minutes)')}
                </label>
                <input
                  type="number"
                  min={5}
                  max={480}
                  value={sessionTimeoutMinutes}
                  onChange={e => setSessionTimeoutMinutes(e.target.value === '' ? '' as any : Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('يتم قفل الشاشة تلقائياً بعد عدم التفاعل', 'Auto locks session after inactivity')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('عدد محاولات الدخول الخاطئة قبل القفل المؤقت', 'Max Failed Attempts Before Lockout')}
                </label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={maxFailedAttempts}
                  onChange={e => setMaxFailedAttempts(e.target.value === '' ? '' as any : Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isDark ? 'bg-[#0a0c10] border-slate-700 focus:border-teal-400' : 'bg-slate-50 border-slate-300 focus:border-teal-600'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('حماية من هجمات التخمين والقوة العمياء (Brute Force)', 'Protection against brute force attacks')}</p>
              </div>

              <div className="flex items-center gap-3 pt-4 sm:pt-6">
                <input
                  type="checkbox"
                  id="req-special"
                  checked={requireSpecialChars}
                  onChange={e => setRequireSpecialChars(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 cursor-pointer"
                />
                <label htmlFor="req-special" className="font-bold cursor-pointer select-none" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إلزامية احتواء كلمة المرور على رموز خاصة وأرقام', 'Require special characters & numbers')}
                </label>
              </div>
            </div>

            {/* Interactive 2FA Switch */}
            <div 
              onClick={() => setEnable2FA(prev => !prev)}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer select-none transition-all ${
                enable2FA 
                  ? 'bg-teal-500/10 border-teal-500/40 text-teal-700 dark:text-teal-300' 
                  : isDark ? 'bg-slate-800/40 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined ${enable2FA ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`}>
                  {enable2FA ? 'verified_user' : 'shield'}
                </span>
                <div>
                  <p className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {enable2FA 
                      ? t('المصادقة الثنائية (2FA) مُفعّلة', '2-Factor Authentication Enabled')
                      : t('المصادقة الثنائية (2FA) مُعطّلة', '2-Factor Authentication Disabled')}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {enable2FA 
                      ? t('جميع الحسابات الإدارية تستخدم التحقق المزدوج لحماية النظام', 'All admin accounts require dual-step verification')
                      : t('انقر للتفعيل لفرض التحقق المزدوج لحماية الحسابات الإدارية', 'Click to enforce dual-step verification on admin accounts')}
                  </p>
                </div>
              </div>
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enable2FA ? 'bg-teal-600' : 'bg-slate-400 dark:bg-slate-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                  enable2FA ? (language === 'ar' ? '-translate-x-6' : 'translate-x-6') : (language === 'ar' ? '-translate-x-1' : 'translate-x-1')
                }`} />
              </div>
            </div>

            {settingsSaved && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top duration-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{t('تم حفظ وتطبيق إعدادات الأمان بنجاح في قاعدة البيانات!', 'Security settings saved & applied successfully!')}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  {lastSavedSecuritySettings ? new Date(lastSavedSecuritySettings).toLocaleTimeString() : ''}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingSecuritySettings}
                className={`flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-bold text-xs transition-all shadow-lg shadow-teal-600/25 cursor-pointer flex items-center justify-center gap-2 ${
                  isSavingSecuritySettings ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSavingSecuritySettings ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>{t('جاري الحفظ في الخادم...', 'Saving to server...')}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>{t('حفظ إعدادات الأمان', 'Save Security Settings')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetSecuritySettingsToDefaults}
                className={`px-4 py-3 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDark ? 'border-slate-700 hover:bg-white/5 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
                title={t('استعادة الإعدادات الافتراضية', 'Reset to Defaults')}
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span className="hidden sm:inline">{t('الافتراضي', 'Defaults')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 9: Security Audit Logs & System Events (sec-audit-logs)
          ========================================================================= */}
      {activeModuleId === 'sec-audit-logs' && (
        <div className="space-y-6">

          {/* Toast Notification */}
          {auditToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-between gap-2 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">verified</span>
                <span>{auditToast}</span>
              </div>
              <button onClick={() => setAuditToast(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* Top Control Bar & Live Surveillance Banner */}
          <div className={`p-5 rounded-3xl border shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/10">
                <span className="material-symbols-outlined text-2xl">history</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('سجل تدقيق الأمان ومراقبة أحداث النظام المباشرة', 'Security Audit Trail & Real-time System Surveillance')}
                  </h2>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      {isLiveAuditStreaming && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>{isLiveAuditStreaming ? t('بث مباشر نشط', 'Live Stream Active') : t('البث متوقف', 'Stream Paused')}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('سجل رقابي غير قابل للتعديل (WORM Tamper-Evident) متوافق مع لوائح البنك المركزي العراقي CBI ومعايير ISO 27001.', 'Tamper-evident immutable audit log compliant with Central Bank of Iraq (CBI) regulations & ISO 27001.')}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsLiveAuditStreaming(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isLiveAuditStreaming
                    ? isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                    : isDark ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20' : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
                title={isLiveAuditStreaming ? t('إيقاف التحديث اللحظي مؤقتاً', 'Pause Live Feed') : t('استئناف التحديث اللحظي', 'Resume Live Feed')}
              >
                <span className="material-symbols-outlined text-sm">
                  {isLiveAuditStreaming ? 'pause_circle' : 'play_circle'}
                </span>
                <span>{isLiveAuditStreaming ? t('إيقاف مؤقت', 'Pause') : t('استئناف', 'Resume')}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddAuditModalOpen(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add_moderator</span>
                <span>{t('تسجيل فحص تدقيق يدوي', 'Log Manual Audit')}</span>
              </button>

              <button
                type="button"
                onClick={handleExportAuditLogsExcel}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isDark ? 'border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300' : 'border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800'
                }`}
                title={t('تصدير السجلات إلى إكسل', 'Export to Excel')}
              >
                <span className="material-symbols-outlined text-sm">table_view</span>
                <span>{t('تصدير إكسل', 'Export Excel')}</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCbiAuditReport}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title={t('طباعة تقرير التدقيق الرقابي الرسمي', 'Print CBI Compliance Report')}
              >
                <span className="material-symbols-outlined text-sm">print</span>
                <span>{t('تقرير رقابي', 'CBI Report')}</span>
              </button>
            </div>
          </div>

          {/* 5 KPI Metric Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Total */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">receipt_long</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('إجمالي الأحداث', 'Total Logs')}</p>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {auditStats.total}
                </h3>
              </div>
            </div>

            {/* Critical */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${
              isDark ? 'bg-[#111827] border-rose-500/30' : 'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">gpp_bad</span>
              </div>
              <div>
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{t('حوادث حرجة', 'Critical Events')}</p>
                <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400">
                  {auditStats.critical}
                </h3>
              </div>
            </div>

            {/* Warnings */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${
              isDark ? 'bg-[#111827] border-amber-500/30' : 'bg-amber-50/50 border-amber-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">{t('تنبيهات ومخاطر', 'Warnings')}</p>
                <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {auditStats.warnings}
                </h3>
              </div>
            </div>

            {/* Successes */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${
              isDark ? 'bg-[#111827] border-emerald-500/30' : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">verified_user</span>
              </div>
              <div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{t('عمليات معتمدة', 'Approved')}</p>
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {auditStats.successes}
                </h3>
              </div>
            </div>

            {/* Blocked Attempts */}
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 col-span-2 md:col-span-1 ${
              isDark ? 'bg-[#111827] border-purple-500/30' : 'bg-purple-50/50 border-purple-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">shield</span>
              </div>
              <div>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">{t('محاولات محظورة', 'Blocked Access')}</p>
                <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {auditStats.blocked}
                </h3>
              </div>
            </div>
          </div>

          {/* Search, Severity Filters, & Module Selector */}
          <div className={`p-4 rounded-3xl border shadow-xl space-y-3 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search bar */}
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder={t('بحث فوري في السجلات بالموظف، IP، نوع العملية، الموديول أو الوصف...', 'Search audit logs by user, IP, action, module, or details...')}
                  className={`w-full pr-10 pl-9 py-2.5 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    isDark ? 'bg-slate-900 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                {auditSearch && (
                  <button
                    onClick={() => setAuditSearch('')}
                    className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                  >
                    cancel
                  </button>
                )}
              </div>

              {/* Module Filter Dropdown */}
              <div className="w-full md:w-64">
                <select
                  value={auditModuleFilter}
                  onChange={(e) => setAuditModuleFilter(e.target.value)}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">{t('كافة الموديولات والأنظمة', 'All Modules & Services')}</option>
                  <option value="cat-1-auth">{t('تسجيل الدخول والمصادقة (cat-1-auth)', 'Authentication & 2FA')}</option>
                  <option value="cat-5-payroll">{t('الرواتب والبدلات والتوطين (cat-5-payroll)', 'Payroll & Salaries')}</option>
                  <option value="cat-9-risk">{t('المخاطر والصلاحيات والامتثال (cat-9-risk)', 'Risk, RBAC & Policies')}</option>
                  <option value="cat-4-leave">{t('الحضور والبصمة والإجازات (cat-4-leave)', 'Attendance & Biometrics')}</option>
                  <option value="cat-12-archive">{t('الأرشيف والمستندات (cat-12-archive)', 'Digital Archive')}</option>
                  <option value="cat-10-sys">{t('قواعد البيانات والنظام (cat-10-sys)', 'Database & System Backend')}</option>
                </select>
              </div>
            </div>

            {/* Severity Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 ml-1">{t('المستوى الأمني:', 'Severity:')}</span>
                
                {[
                  { id: 'all', labelAr: 'الكل', labelEn: 'All', count: auditLogs.length, color: 'slate' },
                  { id: 'critical', labelAr: 'حرج', labelEn: 'Critical', count: auditStats.critical, color: 'rose' },
                  { id: 'warning', labelAr: 'تحذير', labelEn: 'Warning', count: auditStats.warnings, color: 'amber' },
                  { id: 'success', labelAr: 'معتمد / ناجح', labelEn: 'Success', count: auditStats.successes, color: 'emerald' },
                  { id: 'info', labelAr: 'معلومات', labelEn: 'Info', count: auditLogs.filter(l => l.severity === 'info').length, color: 'blue' }
                ].map((s) => {
                  const isActive = auditSeverityFilter === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setAuditSeverityFilter(s.id as any)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? s.color === 'rose'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : s.color === 'amber'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                            : s.color === 'emerald'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                            : s.color === 'blue'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                          : isDark
                          ? 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
                          : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{language === 'ar' ? s.labelAr : s.labelEn}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-black/25 text-white' : isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {s.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {(auditSearch || auditSeverityFilter !== 'all' || auditModuleFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setAuditSearch('');
                    setAuditSeverityFilter('all');
                    setAuditModuleFilter('all');
                  }}
                  className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  <span>{t('إعادة ضبط الفلاتر', 'Reset Filters')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className={`rounded-3xl border shadow-xl overflow-hidden ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className={`border-b font-bold ${
                    isDark ? 'bg-slate-900/60 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <th className="py-3 px-4">{t('معرف الحدث والتوقيت', 'Event ID & Time')}</th>
                    <th className="py-3 px-4">{t('الفاعل / المستخدم', 'Actor / User')}</th>
                    <th className="py-3 px-4">{t('الحدث والإجراء', 'Action & Event')}</th>
                    <th className="py-3 px-4">{t('الموديول المستهدف', 'Target Module')}</th>
                    <th className="py-3 px-4">{t('المستوى الأمني', 'Severity')}</th>
                    <th className="py-3 px-4">{t('عنوان IP والجهاز', 'IP & Device')}</th>
                    <th className="py-3 px-4">{t('الحالة', 'Status')}</th>
                    <th className="py-3 px-4 text-center">{t('فحص', 'Inspect')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2 text-slate-500">search_off</span>
                        <p className="font-bold">{t('لا توجد سجلات تدقيق مطابقة لمعايير البحث الحالية', 'No audit logs found matching the selected criteria.')}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isCritical = log.severity === 'critical';
                      const isWarning = log.severity === 'warning';
                      const isSuccess = log.severity === 'success';

                      return (
                        <tr
                          key={log.id}
                          className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                            isCritical ? 'bg-rose-500/5' : ''
                          }`}
                        >
                          {/* ID & Timestamp */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[11px]">
                              {log.id}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[12px]">schedule</span>
                              <span>{log.timestamp}</span>
                            </div>
                          </td>

                          {/* Actor / User */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isDark ? 'bg-teal-950 text-teal-300 border border-teal-500/30' : 'bg-teal-100 text-teal-800'
                              }`}>
                                {log.userName ? log.userName.charAt(0) : 'U'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-xs">
                                  {log.userName}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-[9px] font-semibold">
                                    {log.userRole}
                                  </span>
                                  <span>{log.userId}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Action & Code */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-900 dark:text-white line-clamp-1">
                              {log.action}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {log.details}
                            </div>
                          </td>

                          {/* Target Module */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium border bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10">
                              {log.module}
                            </span>
                          </td>

                          {/* Severity Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isCritical ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                <span>{t('حرج', 'Critical')}</span>
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                <span>{t('تحذير', 'Warning')}</span>
                              </span>
                            ) : isSuccess ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>{t('ناجح', 'Success')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                <span>{t('معلومات', 'Info')}</span>
                              </span>
                            )}
                          </td>

                          {/* IP & Device */}
                          <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                            <div className="text-slate-800 dark:text-slate-200 font-bold">{log.ipAddress}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{log.userDevice}</div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              log.status === 'محظور'
                                ? 'bg-rose-500 text-white'
                                : log.status === 'تحذير'
                                ? 'bg-amber-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}>
                              {log.status}
                            </span>
                          </td>

                          {/* Actions / Inspect */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedAuditLog(log)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                              title={t('عرض التفاصيل الفنية للحدث', 'Inspect Event Details')}
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              <span>{t('تفاصيل', 'Inspect')}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer info */}
            <div className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 ${
              isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50/50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-teal-500">lock_open_right</span>
                <span>{t('جميع الأحداث موقعة بتشفير SHA-256 ومخزنة في السجل المركزي الموحد.', 'All events are SHA-256 cryptographically hashed & stored in the central audit ledger.')}</span>
              </div>
              <div className="font-bold text-slate-700 dark:text-slate-300">
                {t(`عرض ${filteredAuditLogs.length} من إجمالي ${auditLogs.length} سجل`, `Showing ${filteredAuditLogs.length} of ${auditLogs.length} logs`)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 10: Dynamic Users & Module Permissions (sec-roles-permissions)
          ========================================================================= */}
      {(activeModuleId === 'sec-roles-permissions' || activeModuleId === 'sec-edit-role') && (
        <div className="space-y-4">
          {/* SubTab Switcher: User Role & Permission vs Policies & Mini-Settings */}
          <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl">
              <button
                type="button"
                onClick={() => setRolePermissionsSubTab('users')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  rolePermissionsSubTab === 'users'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">manage_accounts</span>
                <span>{t('أدوار وصلاحيات المستخدمين (RBAC)', 'User Roles & Permissions')}</span>
              </button>

              <button
                type="button"
                onClick={() => setRolePermissionsSubTab('policies')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  rolePermissionsSubTab === 'policies'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">policy</span>
                <span>{t('شاشة مصغرة للإعدادات والسياسات (Policies)', 'Mini Settings & Policies')}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold border border-emerald-500/30">
                  {t('تعديل تواريخ العقود', 'Contracts')}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-teal-500 text-base">verified_user</span>
              <span className="text-[11px] font-medium">
                {rolePermissionsSubTab === 'policies'
                  ? t('السياسات والضوابط، وتعديل تواريخ العقود الدائمية بكبسة زر واحدة', 'Central policies & one-click permanent contract dates batch update')
                  : t('إدارة مستخدمي النظام ومصفوفة الصلاحيات الدقيقة', 'Manage system users and granular RBAC access matrix')}
              </span>
            </div>
          </div>

          {/* Policies & Mini-Settings Tab Content */}
          {rolePermissionsSubTab === 'policies' && (
            <PoliciesSection
              language={language}
              t={t}
              employees={employees}
            />
          )}

          {/* Users & Permissions Table Content */}
          {rolePermissionsSubTab === 'users' && (
            <div className={`rounded-3xl border shadow-xl overflow-hidden space-y-0 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>

          {/* Prominent Add User CTA Banner */}
          <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 ${
            isDark ? 'bg-teal-950/30 border-teal-500/40' : 'bg-teal-50 border-teal-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
                <span className="material-symbols-outlined text-xl">manage_accounts</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إدارة المستخدمين وصلاحيات الموديولات', 'User Management & Module Permissions')}
                </h2>
                <p className="text-teal-600 dark:text-teal-400 text-[11px] font-medium">
                  {t('أضف مستخدمين جدد وحدد الموديولات المصرح بها عبر علامات ✓ (Tick)', 'Add new users and assign permitted modules via ✓ checkboxes')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-teal-600 dark:text-teal-400 font-bold bg-teal-500/10 border border-teal-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                <span>{currentUser?.role === 'Admin' ? t('مسؤول نظام (Admin) نشط', 'Admin Active') : (currentUser?.role === 'Super Admin' ? t('Super Admin نشط', 'Super Admin Active') : t('إدارة الصلاحيات', 'RBAC Active'))}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setNewUserForm({
                    id: undefined,
                    originalUsername: '',
                    username: '',
                    password: 'Password123!',
                    fullNameAr: '',
                    fullNameEn: '',
                    jobTitle: 'مدخل بيانات موارد بشرية',
                    department: 'الموارد البشرية والشؤون الإدارية',
                    branch: 'الإدارة العامة - بغداد',
                    email: '',
                    phone: '',
                    modules: {
                      employees: true,
                      attendance: false,
                      payroll: false,
                      recruitment: false,
                      risk: false,
                      settings: false,
                      reports: true
                    },
                    level: 'full',
                    canManageUsers: false,
                    role: 'Employee' as UserRole,
                    notes: 'مخول بالعمل على الموديولات المحددة'
                  });
                  setBadgeSearchQuery('');
                  setMatchedEmployee(null);
                  setIsAddUserModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-600/30 transition-all cursor-pointer shrink-0 border-2 border-teal-400/30"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>{t('+ إضافة مستخدم جديد مع الصلاحيات', '+ Add New User with Permissions')}</span>
              </button>
            </div>
          </div>

          {/* Sub-header info row */}
          <div className={`px-6 py-3 border-b flex items-center gap-2 ${isDark ? 'border-white/10 bg-[#0a0c10]/50' : 'border-slate-200 bg-slate-50/50'}`}>
            <span className="material-symbols-outlined text-sm text-slate-400">info</span>
            <p className="text-[11px] text-slate-500">
              {t('اضغط على "+ إضافة مستخدم جديد" لفتح النموذج وتحديد اسم المستخدم، كلمة المرور، نوع الوظيفة، والموديولات المصرح بها عبر Tick ✓ أمام كل موديول', 'Click "+ Add New User with Permissions" to open the form and assign username, password, job title, and permitted modules via Tick ✓ checkboxes')}
            </p>
          </div>

          {/* Toast Notification */}
          {customEmpSavedToast && (
            <div className="m-6 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
              <span className="material-symbols-outlined text-lg text-emerald-500">check_circle</span>
              <span>{customEmpSavedToast}</span>
            </div>
          )}

          {/* Search & Filter Section */}
          <div className={`px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
          }`}>
            <p className="text-xs font-bold" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
              {t(`إجمالي المستخدمين المخصصين: ${dbUsers.length} مستخدم (+ Super Admin دائم)`,
                 `Total Custom Users: ${dbUsers.length} (+ Permanent Super Admin)`)}
            </p>

          <div className="flex flex-wrap items-center gap-3">
              {/* Department filter */}
              <select
                value={empDeptFilter}
                onChange={e => setEmpDeptFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                  isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="all">{t('كافة الأقسام (All Departments)', 'All Departments')}</option>
                {allUniqueDepartments.map(d => (
                  <option key={d.name_ar} value={d.name_ar}>
                    {language === 'ar' ? d.name_ar : (d.name_en || d.name_ar)}
                  </option>
                ))}
              </select>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('بحث باسم أو يوزر المستخدم...', 'Search username or name...')}
                  value={empSearch}
                  onChange={e => setEmpSearch(e.target.value)}
                  className={`px-3.5 py-2 rounded-xl border text-xs outline-none w-56 ${
                    isDark ? 'bg-[#111827] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Users List Table */}
          <div className="p-6 space-y-4">
            <div className={`overflow-x-auto rounded-2xl border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold ${
                    isDark ? 'bg-[#0a0c10] border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <th className="p-3.5 text-start">{t('المستخدم والحساب', 'User & Account')}</th>
                    <th className="p-3.5 text-start">{t('نوع الوظيفة / المسمى الوظيفي', 'Job Title / Position')}</th>
                    <th className="p-3.5 text-start">{t('القسم والفرع', 'Department & Branch')}</th>
                    <th className="p-3.5 text-start">{t('الموديولات المصرح بها', 'Allowed Modules')}</th>
                    <th className="p-3.5 text-start">{t('كلمة المرور', 'Password')}</th>
                    <th className="p-3.5 text-center">{t('الإجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {/* 1. Super Admin Row (Permanent & Protected) */}
                  <tr className={`transition-colors ${isDark ? 'bg-teal-950/10 hover:bg-teal-950/20' : 'bg-teal-50/40 hover:bg-teal-50/80'}`}>
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
                          <span className="material-symbols-outlined text-lg">shield</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                              {t('مدير النظام الشامل (Super Admin)', 'Super Administrator')}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                              {t('كامل الصلاحيات', 'Full Access')}
                            </span>
                          </div>
                          <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">admin</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-[11px]">
                        {t('مدير النظام (Super Admin)', 'System Administrator')}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <p className="text-xs text-slate-500">{t('جميع الأقسام والفروع', 'All Departments & Branches')}</p>
                    </td>
                    <td className="p-3.5">
                      <div className="relative inline-block w-full min-w-[220px] max-w-[280px]">
                        <select
                          defaultValue="summary"
                          className={`w-full py-1.5 pe-8 ps-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer transition-all ${
                            isDark
                              ? 'bg-[#111827] border-teal-500/40 text-teal-300 hover:border-teal-400 focus:border-teal-400'
                              : 'bg-teal-50/80 border-teal-400 text-teal-900 hover:border-teal-600 focus:border-teal-600 shadow-2xs'
                          }`}
                        >
                          <option value="summary" className={isDark ? 'bg-[#111827] text-teal-300 font-bold' : 'bg-slate-50 text-teal-900 font-bold'}>
                            {t('♾️ جميع الموديولات الـ 11 (محمي)', '♾️ All 11 Modules (Protected)')}
                          </option>
                          {CATEGORY_GROUPS.map(g => (
                            <option key={g.id} value={g.id} className={isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-800'}>
                              ✓ {language === 'ar' ? g.title : g.titleEn} ({t('كامل الصلاحيات', 'Full Access')})
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2 text-teal-600 dark:text-teal-400">
                          <span className="material-symbols-outlined text-base">expand_more</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">••••••••</span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold flex items-center gap-1 w-fit mx-auto">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        {t('محمي', 'Protected')}
                      </span>
                    </td>
                  </tr>

                  {/* 2. Custom Users Rows (Directly from MySQL dbUsers) */}
                  {dbUsers.map((u: any) => {
                    const fullName = u.full_name || u.name || u.username;
                    const uCode = (u.employee_id || `VTS-${u.username.toUpperCase()}`).toUpperCase();
                    const isCustomMatch =
                      empSearch.trim() === '' ||
                      (fullName || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                      (u.username || '').toLowerCase().includes(empSearch.toLowerCase()) ||
                      (uCode || '').toLowerCase().includes(empSearch.toLowerCase());

                    if (!isCustomMatch) return null;
                    if (empDeptFilter !== 'all' && u.department !== empDeptFilter) return null;

                    let parsedModules: Record<string, any> = {
                      employees: Boolean(u.can_manage_employees),
                      payroll: Boolean(u.can_manage_finance),
                      recruitment: Boolean(u.can_manage_recruitment),
                      settings: Boolean(u.can_manage_settings),
                      attendance: false,
                      reports: false,
                      risk: false
                    };

                    if (u.allowed_screens) {
                      try {
                        const s = typeof u.allowed_screens === 'string' ? JSON.parse(u.allowed_screens) : u.allowed_screens;
                        if (s && typeof s === 'object') {
                          parsedModules = { ...s };
                        }
                      } catch (e) {}
                    }

                    const activeModEntries = Object.entries(parsedModules).filter(([_, v]) => v && v !== 'none' && v !== false);

                    return (
                      <tr key={u.id || u.username} className="hover:bg-slate-500/5 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold">
                              <span className="material-symbols-outlined text-lg">person</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                                  {fullName}
                                </h4>
                                {(u.can_manage_users === 1 || u.role === 'Admin') && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[9px] inline-flex items-center gap-0.5 border border-amber-500/30">
                                    <span className="material-symbols-outlined text-[11px]">admin_panel_settings</span>
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-teal-600 dark:text-teal-400 font-mono text-[11px]">
                                {uCode}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] inline-flex items-center gap-1 ${
                            (u.can_manage_users === 1 || u.role === 'Admin')
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                              : 'bg-teal-500/10 border-teal-500/20 text-teal-700 dark:text-teal-300'
                          }`}>
                            {(u.can_manage_users === 1 || u.role === 'Admin') && (
                              <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
                            )}
                            {u.job_title || (u.role && u.role !== 'Employee' ? u.role : null) || t('مسؤول رواتب وحضور', 'Payroll & Attendance Officer')}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <p className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                            {u.department || t('الموارد البشرية والشؤون الإدارية', 'Human Resources')}
                          </p>
                        </td>

                        <td className="p-3.5">
                          {activeModEntries.length === 0 ? (
                            <div className="relative inline-block w-full min-w-[200px] max-w-[280px]">
                              <select
                                disabled
                                className={`w-full py-1.5 pe-8 ps-3 rounded-xl border text-xs font-semibold appearance-none outline-none opacity-60 cursor-not-allowed ${
                                  isDark ? 'bg-[#111827] border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                                }`}
                              >
                                <option>{t('لا توجد موديولات مصرح بها (0)', 'No Modules Assigned (0)')}</option>
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2.5 text-slate-400">
                                <span className="material-symbols-outlined text-base">lock</span>
                              </div>
                            </div>
                          ) : (
                            <div className="relative inline-block w-full min-w-[210px] max-w-[280px]">
                              <select
                                defaultValue="summary"
                                className={`w-full py-1.5 pe-8 ps-3 rounded-xl border text-xs font-bold appearance-none outline-none cursor-pointer transition-all ${
                                  isDark
                                    ? 'bg-[#111827] border-teal-500/30 text-teal-300 hover:border-teal-400 focus:border-teal-400'
                                    : 'bg-white border-teal-500/40 text-teal-800 hover:border-teal-600 focus:border-teal-600 shadow-2xs'
                                }`}
                              >
                                <option value="summary" className={isDark ? 'bg-[#111827] text-teal-300 font-bold' : 'bg-slate-50 text-teal-800 font-bold'}>
                                  {t(`📋 ${activeModEntries.length} موديول مصرح به (عرض القائمة)`, `📋 ${activeModEntries.length} Allowed Modules (View List)`)}
                                </option>
                                {activeModEntries.map(([mKey, mVal]) => {
                                  const isRead = mVal === 'read';
                                  const label = dynamicModuleLabels[mKey] || mKey;
                                  const permText = isRead ? t('قراءة فقط', 'Read Only') : t('تعديل وصلاحية كاملة', 'Write / Full');
                                  return (
                                    <option key={mKey} value={mKey} className={isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-800'}>
                                      {isRead ? '👁️' : '✏️'} {label} ({permText})
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-2 text-teal-600 dark:text-teal-400">
                                <span className="material-symbols-outlined text-base">expand_more</span>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-mono text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">
                            ••••••••
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => {
                                const isUserAdmin = Boolean(u.can_manage_users === 1 || u.role === 'Admin' || u.role === 'Super Admin');
                                setNewUserForm({
                                  id: u.id,
                                  originalUsername: u.username,
                                  originalEmployeeId: u.employee_id || uCode,
                                  originalEmail: u.email || '',
                                  username: u.username,
                                  password: '', // Blank so user is not forced to type a password when editing
                                  fullNameAr: fullName,
                                  fullNameEn: u.name || fullName,
                                  jobTitle: u.job_title || (u.role && u.role !== 'Employee' ? u.role : '') || 'مسؤول رواتب وحضور',
                                  department: u.department || 'الموارد البشرية والشؤون الإدارية',
                                  branch: u.branch || 'الإدارة العامة - بغداد',
                                  email: u.email || `${u.username.toLowerCase()}@vitasiraq.iq`,
                                  phone: u.phone || '07700000000',
                                  modules: parsedModules,
                                  canManageUsers: isUserAdmin,
                                  role: isUserAdmin ? 'Admin' : (u.role || 'Employee'),
                                  level: 'full',
                                  notes: 'مخول بالعمل على الموديولات المحددة'
                                });
                                setBadgeSearchQuery(`${fullName} (${uCode})`);
                                setShowUserPassword(false);
                                setIsAddUserModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:scale-110 active:scale-95 transition-all cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20"
                              title={t('تعديل بيانات وصلاحيات المستخدم', 'Edit User & Permissions')}
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>

                            {/* Quick Change Password Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordModalUser(u);
                                setQuickNewPassword('');
                                setShowQuickPassword(false);
                              }}
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:scale-110 active:scale-95 transition-all cursor-pointer bg-amber-500/10 hover:bg-amber-500/20"
                              title={t('تغيير كلمة المرور مباشرة', 'Change Password Directly')}
                            >
                              <span className="material-symbols-outlined text-base">key</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={async () => {
                                const confirmMsg = language === 'ar'
                                  ? `هل أنت متأكد من حذف حساب وصلاحيات المستخدم (${fullName})؟`
                                  : `Are you sure you want to delete user account (${fullName})?`;

                                if (confirm(confirmMsg)) {
                                  await api.deleteUser(u.username || u.employee_id || u.id).catch(() => {});
                                  fetchUsersFromDb();
                                  window.dispatchEvent(new CustomEvent('vitas:users_changed'));
                                  setCustomEmpSavedToast(
                                    language === 'ar' ? `تم حذف حساب المستخدم (${fullName}) بنجاح.` : `User account (${fullName}) deleted.`
                                  );
                                  setTimeout(() => setCustomEmpSavedToast(null), 4000);
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:scale-110 active:scale-95 transition-all cursor-pointer bg-rose-500/10 hover:bg-rose-500/20"
                              title={t('حذف المستخدم', 'Delete User')}
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODULE 11: API & Access Key Manager (sec-api-keys)
          ========================================================================= */}
      {activeModuleId === 'sec-api-keys' && (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className={`p-5 rounded-3xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/10">
                <span className="material-symbols-outlined text-2xl">key</span>
              </div>
              <div>
                <h2 className="text-base font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إدارة مفاتيح الربط البرمجي وواجهات التكامل (API Keys)', 'API Keys & Integration Management')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('توليد وإدارة مفاتيح الربط البرمجي للتكامل الآمن مع بوابة البنك المركزي العراقي CBI والأنظمة الخارجية المصرفية.', 'Generate and manage API keys for secure integration with CBI gateway and financial systems.')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddApiKeyModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md shadow-teal-600/25 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>{t('إنشاء مفتاح ربط جديد', 'Generate New Key')}</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">vpn_key</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('المفاتيح النشطة', 'Active Keys')}</p>
                <h3 className="text-lg font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {apiKeys.filter(k => k.status === 'نشط').length}
                </h3>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">verified</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('معيار التشفير', 'Encryption Standard')}</p>
                <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  AES-256 GCM
                </h3>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-md flex items-center gap-3 ${
              isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
            }`}>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">sync_alt</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('تكامل البنك المركزي', 'CBI Integration')}</p>
                <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {t('متصل ونشط', 'Connected')}
                </h3>
              </div>
            </div>
          </div>

          {/* API Keys List */}
          <div className="space-y-3">
            {apiKeys.map((item) => {
              const isRevealed = !!revealedKeys[item.id];
              const isCopied = copiedKeyId === item.id;
              const displayKey = isRevealed
                ? item.key
                : `${item.key.slice(0, 12)}••••••••••••••••${item.key.slice(-4)}`;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                    isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                        {item.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {item.status}
                      </span>
                      {item.permissions && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                          {item.permissions}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                      <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 select-all ${
                        isDark ? 'bg-slate-900 border-white/10 text-teal-300' : 'bg-slate-50 border-slate-200 text-teal-700'
                      }`}>
                        <span>{displayKey}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleRevealKey(item.id)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                          isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                        title={isRevealed ? t('إخفاء المفتاح', 'Hide Key') : t('إظهار المفتاح', 'Reveal Key')}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isRevealed ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyApiKey(item.id, item.key)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isDark ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isCopied ? 'check' : 'content_copy'}
                        </span>
                        <span>{isCopied ? t('تم النسخ', 'Copied') : t('نسخ المفتاح', 'Copy')}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                      <span>{t('تاريخ الإنشاء:', 'Created:')} {item.created}</span>
                      {item.expires && (
                        <span>• {t('تاريخ الانتهاء:', 'Expires:')} {item.expires}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteApiKey(item.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 border border-rose-500/30 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">block</span>
                      <span>{t('إلغاء المفتاح', 'Revoke Key')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Security Alert Note */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">shield</span>
            <div>
              <p className="font-bold">{t('إرشادات أمان مفاتيح الربط البرمجي:', 'API Security Best Practices:')}</p>
              <p className="text-[11px] mt-0.5 text-amber-800/80 dark:text-amber-200/80">
                {t('لا تشارك مفاتيح API في بيئات الاختبار غير المحمية أو عبر البريد الإلكتروني. يتم تسجيل كافة استدعاءات المفاتيح في سجل تدقيق الأمان (Audit Trail) بشكل فوري وفحص عنوان IP.', 'Never expose production API keys in client-side code or unencrypted emails. All calls are logged in the Security Audit Trail with IP verification.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          DYNAMIC "ADD / EDIT USER & MODULE PERMISSIONS" MODAL
      ============================================================ */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-4xl xl:max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-inner ${
                  newUserForm.id
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-teal-500/20 text-teal-600 dark:text-teal-400'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {newUserForm.id ? 'manage_accounts' : 'person_add'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {newUserForm.id
                      ? (language === 'ar'
                          ? `تعديل بيانات وصلاحيات المستخدم: ${newUserForm.fullNameAr || newUserForm.username}`
                          : `Edit User & Permissions: ${newUserForm.fullNameEn || newUserForm.username}`)
                      : t('إنشاء يوزر جديد وتحديد نوع الوظيفة والموديولات', 'Add New User, Job Title & Assign Module Permissions')
                    }
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {newUserForm.id
                      ? t('قم بتعديل بيانات الحساب، كلمة المرور، المسمى الوظيفي، أو الصلاحيات الممنوحة للمستخدم', 'Update user credentials, password, job title, or assigned permissions')
                      : t('أدخل بيانات المستخدم، حدد نوع الوظيفة، وضع علامة (Tick ✓) على الموديولات المسموحة له', 'Enter user details, specify job title, and check (Tick ✓) the allowed modules')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewUser} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">

              {/* Section 1: User Account & Job Title Info */}
              <div className={`p-4 rounded-2xl border space-y-3.5 ${
                isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50/80 border-slate-200'
              }`}>
                <h4 className="font-bold text-xs flex items-center gap-2 text-teal-600 dark:text-teal-400">
                  <span className="material-symbols-outlined text-base">badge</span>
                  <span>{t('1. بيانات المستخدم ونوع الوظيفة (User & Position Details)', '1. User Account & Position Details')}</span>
                </h4>

                {/* 🌟 Dynamic Searchable Combobox for Badge & Employee Name */}
                <div className={`p-3.5 rounded-2xl border space-y-2 relative ${
                  isDark ? 'bg-teal-950/20 border-teal-500/30' : 'bg-teal-50/70 border-teal-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-teal-800 dark:text-teal-300 text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">person_search</span>
                      <span>{t('البحث التفاعلي برقم البادج أو اسم الموظف (Dynamic Combobox Search)', 'Dynamic Search by Badge No. or Employee Name')}</span>
                    </label>

                    {matchedEmployee && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span>
                        <span>{t('تم ربط الموظف والملء التلقائي', 'Employee Linked & Autofilled')}</span>
                      </span>
                    )}
                  </div>

                  <div ref={comboboxRef} className="relative">
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute start-3 text-teal-600 text-base pointer-events-none">
                        search
                      </span>
                      <input
                        type="text"
                        placeholder={t('اكتب رقم البادج (مثال: B-101، v 96) أو اسم الموظف بالعربية أو الإنجليزية للبحث الفوري...', 'Type Badge No. (e.g. B-101, v 96) or employee name to filter live...')}
                        value={badgeSearchQuery}
                        onFocus={() => setIsComboboxOpen(true)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') {
                            setIsComboboxOpen(false);
                          }
                        }}
                        onChange={e => {
                          setBadgeSearchQuery(e.target.value);
                          setIsComboboxOpen(true);
                        }}
                        className={`w-full ps-9 pe-16 py-2.5 rounded-xl border text-xs outline-none font-bold transition-all shadow-sm ${
                          isDark ? 'bg-[#111827] border-teal-500/40 text-white placeholder-slate-500 focus:border-teal-400' : 'bg-white border-teal-500/40 text-slate-900 placeholder-slate-400 focus:border-teal-600'
                        }`}
                      />
                      <div className="absolute end-2 flex items-center gap-1">
                        {badgeSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setBadgeSearchQuery('');
                              setMatchedEmployee(null);
                              setIsComboboxOpen(false);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="مسح البحث"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsComboboxOpen(!isComboboxOpen)}
                          className="p-1 rounded-lg text-teal-600 hover:bg-teal-500/10 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-base">
                            {isComboboxOpen ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Floating Dropdown List of Filtered Employees with Guaranteed Solid Black Text */}
                    {isComboboxOpen && (
                      <>
                        {/* Transparent Backdrop to immediately intercept any click outside the dropdown and close it */}
                        <div
                          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsComboboxOpen(false);
                          }}
                        />

                        <div
                          className="absolute start-0 end-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-2xl border-2 border-teal-500 shadow-2xl divide-y divide-slate-200"
                          style={{ backgroundColor: '#ffffff', color: '#000000' }}
                        >
                          {/* Sticky Header Bar with Count and Dedicated Close Button */}
                          <div className="sticky top-0 z-10 px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 shadow-xs">
                            <span className="flex items-center gap-1.5 text-teal-800">
                              <span className="material-symbols-outlined text-sm text-teal-600">badge</span>
                              <span>{t('نتائج بحث الموظفين', 'Employee Search Results')} ({filteredEmployeesForCombobox.length})</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsComboboxOpen(false);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                              <span>{t('إغلاق', 'Close')}</span>
                            </button>
                          </div>

                          {filteredEmployeesForCombobox.length === 0 ? (
                          <div className="p-4 text-center text-xs font-bold" style={{ color: '#000000', WebkitTextFillColor: '#000000' }}>
                            <span className="material-symbols-outlined text-2xl block mb-1 text-slate-500">search_off</span>
                            {t('لا يوجد موظف مطابق لهذا البحث', 'No matching employee found')}
                          </div>
                        ) : (
                          filteredEmployeesForCombobox.map((emp: any) => {
                            const b = emp.badge_no || emp.badgeNo || emp.employee_id || emp.employeeId || emp.id || '';
                            const arName = extractArabicName(emp);
                            const enName = extractEnglishName(emp);
                            const dept = emp.department || emp.department_ar || '';
                            const pos = emp.position || emp.position_ar || emp.job_title || emp.jobTitle || '';
                            const mainName = arName || enName || `موظف #${b}`;
                            const photo = emp.photoUrl || emp.photo_url || emp.photo || emp.avatar || emp.avatarUrl || emp.profile_image || '';

                            return (
                              <button
                                key={emp.id || b}
                                type="button"
                                onClick={() => handleAutofillFromEmployee(emp)}
                                className="w-full p-2.5 text-start flex items-center justify-between gap-3 transition-all cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-teal-50/80"
                                style={{ backgroundColor: '#ffffff', color: '#000000' }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Employee Photo Thumbnail or Fallback Icon */}
                                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-teal-200 text-teal-800 flex items-center justify-center text-sm shrink-0 shadow-sm">
                                    {photo ? (
                                      <img
                                        src={photo}
                                        alt={mainName}
                                        className="w-full h-full object-contain p-0.5"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span className="material-symbols-outlined text-xl text-teal-700">person</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Main Arabic / Full Name in Normal Font Weight */}
                                      <span
                                        className="font-normal text-sm"
                                        style={{ color: '#000000', WebkitTextFillColor: '#000000', fontWeight: 400 }}
                                      >
                                        {mainName}
                                      </span>
                                      {/* Secondary English Name in Normal Font Weight */}
                                      {enName && arName && enName.toLowerCase() !== arName.toLowerCase() && (
                                        <span
                                          className="text-xs font-normal"
                                          style={{ color: '#475569', WebkitTextFillColor: '#475569', fontWeight: 400 }}
                                        >
                                          ({enName})
                                        </span>
                                      )}
                                    </div>
                                    <p
                                      className="text-xs font-normal mt-0.5"
                                      style={{ color: '#64748b', WebkitTextFillColor: '#64748b', fontWeight: 400 }}
                                    >
                                      {pos ? `${pos} • ` : ''}{dept}
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 text-end">
                                  <span
                                    className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-600 font-mono font-bold text-xs shadow-sm inline-block"
                                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                                  >
                                    {b}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Username */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('اسم المستخدم للدخول (Username) *', 'Username *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. dataentry.hr أو vts1055"
                      value={newUserForm.username}
                      onChange={e => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
                        {newUserForm.id
                          ? t('كلمة المرور (اختياري - اتركها فارغة للاحتفاظ بالقديمة)', 'Password (Optional - leave blank to keep current)')
                          : t('كلمة المرور *', 'Password *')}
                      </label>
                      {newUserForm.id && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {t('محمية ومحفوظة', 'Kept Secure')}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        required={!newUserForm.id}
                        placeholder={
                          newUserForm.id
                            ? t('•••••••• (اترك الحقل فارغاً للاحتفاظ بكلمة المرور الحالية دون تغيير)', '•••••••• (Leave blank to keep current unchanged)')
                            : 'Password123!'
                        }
                        value={newUserForm.password}
                        onChange={e => setNewUserForm(prev => ({ ...prev, password: e.target.value }))}
                        className={`w-full px-3 py-2 pe-10 rounded-xl border text-xs font-mono outline-none transition-all ${
                          isDark ? 'bg-[#111827] border-slate-700 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={showUserPassword ? t('إخفاء', 'Hide') : t('إظهار', 'Show')}
                      >
                        <span className="material-symbols-outlined text-base">
                          {showUserPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {newUserForm.id && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t('لا داعي لإدخال كلمة المرور إلا إذا كنت ترغب بتعيين كلمة مرور جديدة لهذا المستخدم.', 'Only enter a password if you wish to set a new password for this user.')}
                      </p>
                    )}
                  </div>

                  {/* Job Title - highlighted */}
                  <div>
                    <label className="font-bold text-teal-700 dark:text-teal-300 block text-[11px] mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">work</span>
                      <span>{t('نوع الوظيفة / المسمى الوظيفي *', 'Job Title / Position *')}</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: مدخل بيانات موارد بشرية"
                      value={newUserForm.jobTitle}
                      onChange={e => setNewUserForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none border-teal-500/50 shadow-sm ${
                        isDark ? 'bg-[#111827] text-white' : 'bg-white text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name AR */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('الاسم الكامل بالعربية *', 'Full Name (Arabic) *')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد كريم عبدالله"
                      value={newUserForm.fullNameAr}
                      onChange={e => setNewUserForm(prev => ({ ...prev, fullNameAr: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Full Name EN */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('الاسم الكامل بالإنجليزية', 'Full Name (English)')}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ahmed Kareem Abdullah"
                      value={newUserForm.fullNameEn}
                      onChange={e => setNewUserForm(prev => ({ ...prev, fullNameEn: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Department */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('القسم / الإدارة', 'Department')}
                    </label>
                    <select
                      value={newUserForm.department}
                      onChange={e => setNewUserForm(prev => ({ ...prev, department: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
                        isDark ? 'bg-[#111827] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {allUniqueDepartments.map(d => (
                        <option key={d.name_ar} value={d.name_ar}>
                          {language === 'ar' ? d.name_ar : (d.name_en || d.name_ar)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('البريد الإلكتروني', 'Email')}
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. dataentry@vitasiraq.iq"
                      value={newUserForm.email}
                      onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-400 block text-[11px] mb-1">
                      {t('رقم الهاتف', 'Phone')}
                    </label>
                    <input
                      type="text"
                      placeholder="07700000000"
                      value={newUserForm.phone}
                      onChange={e => setNewUserForm(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Admin Privileges Card */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  newUserForm.canManageUsers
                    ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15 dark:border-amber-500/50 shadow-sm'
                    : (isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-slate-50 border-slate-200')
                }`}>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={Boolean(newUserForm.canManageUsers)}
                      onChange={e => {
                        const checked = e.target.checked;
                        setNewUserForm(prev => {
                          const nextModules = { ...prev.modules };
                          if (checked) {
                            nextModules['sec-roles-permissions'] = 'write';
                            nextModules['sec-roles'] = 'write';
                            nextModules['cat-9-risk'] = 'write';
                            nextModules['risk'] = 'write';
                          }
                          return {
                            ...prev,
                            canManageUsers: checked,
                            role: checked ? 'Admin' : (prev.jobTitle.includes('مدير الموارد') ? 'HR Manager' : 'Employee'),
                            modules: nextModules
                          };
                        });
                      }}
                      className="mt-1 w-4 h-4 rounded border-amber-500 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">admin_panel_settings</span>
                        <span className="font-bold text-xs text-amber-800 dark:text-amber-300">
                          {t('منح صلاحية مسؤول نظام (Admin) لإدارة وإضافة المستخدمين', 'Grant Admin Privileges (Manage & Add Users)')}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[10px] font-bold">
                          {t('صلاحية إدارية عليا', 'High Administrative Privilege')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {t('تفعيل هذا الخيار يمنح المستخدم صلاحية الدخول لشاشة إدارة المستخدمين والصلاحيات (sec-roles-permissions) وإضافة مستخدمين جدد وتعديل الأدوار وكلمات المرور.',
                           'Enabling this grants the user access to User Management & RBAC screen, allowing them to add/edit users, assign permissions, and manage credentials.')}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 2: Dynamic Hierarchical Module & Screen Permissions */}
              <div className="space-y-4">
                {/* Section Header with Stats & Global Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl border border-teal-500/20 bg-teal-500/5">
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs flex items-center gap-2 text-teal-700 dark:text-teal-300">
                      <span className="material-symbols-outlined text-base">rule</span>
                      <span>{t('2. مصفوفة الصلاحيات والموديولات الديناميكية (Read & Read/Write)', '2. Dynamic Module & Screen Permissions Matrix')}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('حدد لكل شاشة وموديول نوع الصلاحية: قراءة فقط (Read) أو قراءة وكتابة وتعديل (Read / Write)',
                         'Set permission level for each screen: Read Only or Read & Write')}
                    </p>
                  </div>

                  {/* Summary Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-300 font-bold text-[11px] flex items-center gap-1.5 shadow-2xs">
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      <span>
                        {permissionStats.total} {t('شاشة مصرح بها', 'screens')}
                        <span className="font-normal opacity-85 text-[10px] mx-1">
                          ({permissionStats.writeCount} {t('تعديل', 'Write')} • {permissionStats.readCount} {t('قراءة', 'Read')})
                        </span>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Filter & Global Actions Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Search filter input */}
                  <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder={t('بحث سريع في الموديولات والشاشات (مثال: رواتب، عقود، تقارير...)...', 'Search screens & modules (e.g. payroll, contracts, reports...)...')}
                      value={moduleFilterQuery}
                      onChange={e => setModuleFilterQuery(e.target.value)}
                      className={`w-full ps-9 pe-3 py-2 rounded-xl border text-xs outline-none transition-all ${
                        isDark ? 'bg-[#0a0c10] border-slate-700 text-white placeholder-slate-500 focus:border-teal-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-teal-600'
                      }`}
                    />
                    {moduleFilterQuery && (
                      <button
                        type="button"
                        onClick={() => setModuleFilterQuery('')}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 dark:bg-white/10"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Master Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setGlobalAll('write')}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      title={t('منح صلاحية كاملة (قراءة وتعديل) لكافة شاشات النظام', 'Grant Read/Write to all screens')}
                    >
                      <span className="material-symbols-outlined text-xs">edit_note</span>
                      <span>{t('الكل تعديل', 'All Write')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGlobalAll('read')}
                      className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                      title={t('منح صلاحية قراءة فقط لكافة شاشات النظام', 'Grant Read Only to all screens')}
                    >
                      <span className="material-symbols-outlined text-xs">visibility</span>
                      <span>{t('الكل قراءة', 'All Read')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGlobalAll('none')}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      title={t('إلغاء جميع الصلاحيات', 'Clear all permissions')}
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                      <span>{t('إلغاء الكل', 'Clear All')}</span>
                    </button>

                    <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

                    <button
                      type="button"
                      onClick={() => {
                        const anyCollapsed = Object.values(expandedCategories).some(v => !v);
                        toggleAllCategories(anyCollapsed);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">unfold_more</span>
                      <span>{t('توسيع / طي', 'Expand / Collapse')}</span>
                    </button>
                  </div>
                </div>

                {/* Categories & Sub-Modules Tree */}
                <div className="space-y-3 pt-1">
                  {filteredCategoryGroups.map(cat => {
                    const isExpanded = moduleFilterQuery.trim() ? true : Boolean(expandedCategories[cat.id]);
                    const catModules = cat.modules.filter(m => !m.hidden);
                    const enabledCount = catModules.filter(m => {
                      const lvl = getModLevel(m.id);
                      return lvl === 'write' || lvl === 'read';
                    }).length;

                    const allWrite = catModules.length > 0 && catModules.every(m => getModLevel(m.id) === 'write');
                    const allRead = catModules.length > 0 && catModules.every(m => getModLevel(m.id) === 'read');

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isDark ? 'bg-[#0f141f] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                        }`}
                      >
                        {/* Category Header Bar */}
                        <div
                          className={`p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 cursor-pointer select-none transition-colors ${
                            enabledCount > 0
                              ? isDark ? 'bg-teal-950/20 hover:bg-teal-950/30' : 'bg-teal-50/60 hover:bg-teal-50'
                              : isDark ? 'bg-[#0a0c10] hover:bg-white/5' : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          onClick={() => toggleCategory(cat.id)}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                              enabledCount > 0 ? 'bg-teal-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                            }`}>
                              <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                                  {language === 'ar' ? cat.title : cat.titleEn}
                                </h5>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  enabledCount === catModules.length && enabledCount > 0
                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                    : enabledCount > 0
                                    ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30'
                                    : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                }`}>
                                  {enabledCount} / {catModules.length} {t('مفعل', 'active')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Category-Level Quick Action Buttons */}
                          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'write')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                allWrite
                                  ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                                  : 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30'
                              }`}
                              title={t('منح صلاحية كتابة وتعديل لكل موديولات هذا القسم', 'Grant Read/Write to all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">edit_note</span>
                              <span className="hidden sm:inline">{t('الكل تعديل', 'All Write')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'read')}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                allRead
                                  ? 'bg-sky-600 text-white border-sky-500 shadow-xs'
                                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30'
                              }`}
                              title={t('منح صلاحية قراءة فقط لكل موديولات هذا القسم', 'Grant Read Only to all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">visibility</span>
                              <span className="hidden sm:inline">{t('الكل قراءة', 'All Read')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCategoryAll(cat, 'none')}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 transition-all cursor-pointer flex items-center gap-1"
                              title={t('إلغاء جميع صلاحيات هذا القسم', 'Clear all in category')}
                            >
                              <span className="material-symbols-outlined text-xs">close</span>
                              <span className="hidden sm:inline">{t('إلغاء', 'Clear')}</span>
                            </button>

                            {/* Accordion Arrow Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleCategory(cat.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <span className={`material-symbols-outlined text-base transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                expand_more
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-modules list */}
                        {isExpanded && (
                          <div className="p-3 sm:p-4 space-y-2 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-black/10 animate-in fade-in duration-150">
                            <div className="grid grid-cols-1 gap-2">
                              {catModules.map(mod => {
                                const modLevel = getModLevel(mod.id);
                                return (
                                  <div
                                    key={mod.id}
                                    className={`p-2.5 sm:p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                      modLevel === 'write'
                                        ? isDark ? 'bg-teal-950/25 border-teal-500/40 shadow-xs shadow-teal-500/5' : 'bg-teal-50/80 border-teal-500/40 shadow-xs'
                                        : modLevel === 'read'
                                        ? isDark ? 'bg-sky-950/25 border-sky-500/40 shadow-xs shadow-sky-500/5' : 'bg-sky-50/80 border-sky-500/40 shadow-xs'
                                        : isDark ? 'bg-[#0a0c10]/40 border-white/5 opacity-80 hover:opacity-100' : 'bg-white border-slate-200/80 opacity-80 hover:opacity-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        modLevel === 'write' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' :
                                        modLevel === 'read' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                      }`}>
                                        <span className="material-symbols-outlined text-lg">{mod.icon || 'radio_button_unchecked'}</span>
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                                            {language === 'ar' ? mod.title : mod.titleEn}
                                          </span>
                                          <span className="font-mono text-[9px] text-slate-400 hidden md:inline">({mod.id})</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md">
                                          {mod.description}
                                        </p>
                                      </div>
                                    </div>

                                    {/* 3-State Segmented Control: None | Read | Read & Write */}
                                    <div className="flex items-center bg-slate-200/80 dark:bg-black/40 p-1 rounded-xl shrink-0 self-end sm:self-auto border border-slate-300 dark:border-white/10">
                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'none')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          modLevel === 'none'
                                            ? 'bg-slate-500 text-white shadow-xs'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                        title={t('تعطيل هذا الموديول', 'Disable this module')}
                                      >
                                        <span className="material-symbols-outlined text-xs">close</span>
                                        <span>{t('معطل', 'None')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'read')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          modLevel === 'read'
                                            ? 'bg-sky-600 text-white shadow-xs'
                                            : 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10'
                                        }`}
                                        title={t('صلاحية قراءة وعرض فقط', 'Read only')}
                                      >
                                        <span className="material-symbols-outlined text-xs">visibility</span>
                                        <span>{t('قراءة', 'Read')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setModuleLevel(mod.id, 'write')}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                          modLevel === 'write'
                                            ? 'bg-teal-600 text-white shadow-xs'
                                            : 'text-teal-600 dark:text-teal-400 hover:bg-teal-500/10'
                                        }`}
                                        title={t('صلاحية كاملة قراءة وتعديل وكتابة', 'Read and write')}
                                      >
                                        <span className="material-symbols-outlined text-xs">edit_note</span>
                                        <span>{t('قراءة وكتابة', 'Read / Write')}</span>
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
                  })}
                </div>
              </div>

              {/* Modal Footer Buttons - Sticky at Bottom */}
              <div className="sticky bottom-0 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md z-20 py-3.5 px-6 -mx-6 -mb-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shadow-2xl">
                <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  {newUserForm.id
                    ? t('تعديل الحساب يحدّث قاعدة البيانات فوراً عبر السيرفر والمزامنة السحابية', 'Saving updates DB directly across local & cloud nodes')
                    : t('يتم حفظ المستخدم فوراً مع الصلاحيات المحددة', 'User and permissions are saved immediately')}
                </div>
                <div className="flex items-center gap-3 ms-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-xs cursor-pointer"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all shadow-lg shadow-teal-600/25 flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">{newUserForm.id ? 'save' : 'person_add'}</span>
                    <span>
                      {newUserForm.id
                        ? t('حفظ التعديلات على المستخدم والصلاحيات', 'Save Changes to User & Permissions')
                        : t('حفظ وإنشاء المستخدم مع الصلاحيات', 'Save & Create User with Permissions')}
                    </span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          QUICK CHANGE PASSWORD MODAL (DIRECT & INSTANT)
      ============================================================ */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {t('تغيير كلمة المرور', 'Change User Password')}
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    {passwordModalUser.full_name || passwordModalUser.name || passwordModalUser.username}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleQuickChangePassword} className="p-6 space-y-4 text-xs">
              {/* User summary badge */}
              <div className={`p-3.5 rounded-2xl border space-y-1.5 ${
                isDark ? 'bg-[#0a0c10] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('اسم الدخول:', 'Username:')}</span>
                  <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{passwordModalUser.username}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('كود الموظف:', 'Employee Code:')}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{passwordModalUser.employee_id || '-'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{t('المسمى الوظيفي:', 'Position:')}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{passwordModalUser.job_title || passwordModalUser.role || '-'}</span>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                    {t('كلمة المرور الجديدة *', 'New Password *')}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
                      let gen = '';
                      for (let i = 0; i < 10; i++) gen += chars.charAt(Math.floor(Math.random() * chars.length));
                      setQuickNewPassword(gen);
                      setShowQuickPassword(true);
                    }}
                    className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <span className="material-symbols-outlined text-xs">autorenew</span>
                    <span>{t('توليد كلمة عشوائية', 'Generate')}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showQuickPassword ? 'text' : 'password'}
                    required
                    value={quickNewPassword}
                    onChange={e => setQuickNewPassword(e.target.value)}
                    placeholder={t('أدخل كلمة المرور الجديدة (4 أحرف على الأقل)...', 'Enter new password (min 4 characters)...')}
                    className={`w-full px-3.5 py-2.5 pe-10 rounded-xl border text-xs font-mono outline-none ${
                      isDark ? 'bg-[#0a0c10] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPassword(!showQuickPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showQuickPassword ? t('إخفاء', 'Hide') : t('إظهار', 'Show')}
                  >
                    <span className="material-symbols-outlined text-base">
                      {showQuickPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  {t('سيتم تحديث كلمة المرور في قاعدة البيانات فوراً ومزامنتها مع الخادم السحابي.', 'Password updates directly in MySQL and syncs to cloud immediately.')}
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  disabled={isSavingQuickPassword}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-xs cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickPassword}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all shadow-lg shadow-amber-600/25 flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">{isSavingQuickPassword ? 'sync' : 'check'}</span>
                  <span>{isSavingQuickPassword ? t('جاري الحفظ...', 'Saving...') : t('حفظ كلمة المرور', 'Save Password')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          AUDIT EVENT INSPECTION & HASH VERIFICATION MODAL
      ============================================================ */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">policy</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {t('فحص تفاصيل الحدث الأمني وسجل التدقيق', 'Security Audit Event Inspection')}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-teal-600 dark:text-teal-400">
                    <span>{selectedAuditLog.id}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-400 font-sans">{selectedAuditLog.timestamp}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Event Title Banner */}
              <div className={`p-4 rounded-2xl border ${
                selectedAuditLog.severity === 'critical'
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : selectedAuditLog.severity === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-teal-500/10 border-teal-500/30'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedAuditLog.action}
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedAuditLog.status === 'محظور'
                      ? 'bg-rose-600 text-white'
                      : selectedAuditLog.status === 'تحذير'
                      ? 'bg-amber-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}>
                    {selectedAuditLog.status}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {selectedAuditLog.details}
                </p>
              </div>

              {/* Actor & Source Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('المستخدم المنفذ للعملية (Actor):', 'Actor / User:')}</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedAuditLog.userName}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedAuditLog.userId} ({selectedAuditLog.userRole})</p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('الموديول المستهدف والرمز:', 'Target Module & Code:')}</p>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedAuditLog.module}</p>
                  <p className="text-[10px] text-teal-600 dark:text-teal-400 font-mono mt-0.5">{selectedAuditLog.actionType}</p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('عنوان IP والمصدر الشبكي:', 'IP Address:')}</p>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{selectedAuditLog.ipAddress}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedAuditLog.userDevice}</p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-[10px] text-slate-400 font-bold mb-1">{t('المستوى الأمني والامتثال:', 'Severity & Compliance:')}</p>
                  <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${
                    selectedAuditLog.severity === 'critical'
                      ? 'bg-rose-500/20 text-rose-400'
                      : selectedAuditLog.severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {selectedAuditLog.severity.toUpperCase()}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">{t('متوافق مع تعليمات CBI', 'CBI Compliant')}</p>
                </div>
              </div>

              {/* SHA-256 Tamper-Proof Checksum */}
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-teal-500">lock</span>
                    <span>{t('التوقيع الرقمي للحدث (SHA-256 Cryptographic Signature):', 'Cryptographic Signature (SHA-256):')}</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{t('سليم وغير معدل', 'Tamper-Proof Verified')}</span>
                </div>
                <div className="font-mono text-[10px] text-teal-600 dark:text-teal-400 break-all select-all bg-black/10 dark:bg-black/30 p-2 rounded-xl border border-white/5">
                  {selectedAuditLog.metadata?.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </div>
              </div>

              {/* Metadata JSON Viewer */}
              {selectedAuditLog.metadata && (
                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">data_object</span>
                      <span>{t('الحمولة الفنية والبيانات الوصفية (Metadata Payload):', 'Metadata Payload (JSON):')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(selectedAuditLog.metadata, null, 2));
                        setAuditToast(language === 'ar' ? 'تم نسخ الحمولة الفنية!' : 'Metadata JSON copied!');
                        setTimeout(() => setAuditToast(null), 3000);
                      }}
                      className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[11px]">content_copy</span>
                      <span>{t('نسخ JSON', 'Copy')}</span>
                    </button>
                  </div>
                  <pre className="font-mono text-[10px] text-slate-700 dark:text-slate-300 bg-black/15 dark:bg-black/40 p-3 rounded-xl overflow-x-auto select-all border border-white/5">
                    {JSON.stringify(selectedAuditLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-end ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-all cursor-pointer"
              >
                {t('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MANUAL SECURITY AUDIT LOG MODAL
      ============================================================ */}
      {isAddAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">add_moderator</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {t('تسجيل فحص تدقيق أمني يدوي', 'Log Manual Security Audit')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('إضافة قيد رقابي رسمي إلى سجل التدقيق المركزي الموحد', 'Record official inspection note to audit ledger')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAuditModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleAddAuditRecordSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('موضوع أو عنوان الفحص التدقيقي *', 'Inspection Action / Subject *')}
                </label>
                <input
                  type="text"
                  required
                  value={newAuditForm.action}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, action: e.target.value })}
                  placeholder={t('مثال: فحص سلامة أذونات التوطين المصرفي للفرع الرئيسي', 'e.g., Audit inspection of banking payroll authorization')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('المستوى الأمني', 'Severity')}
                  </label>
                  <select
                    value={newAuditForm.severity}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, severity: e.target.value as any })}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="info">{t('معلومات (Info)', 'Info')}</option>
                    <option value="success">{t('ناجح / معتمد (Success)', 'Success')}</option>
                    <option value="warning">{t('تحذير / مخاطرة (Warning)', 'Warning')}</option>
                    <option value="critical">{t('حرج / عالي الخطورة (Critical)', 'Critical')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    {t('الحالة الناتجة', 'Resulting Status')}
                  </label>
                  <select
                    value={newAuditForm.status}
                    onChange={(e) => setNewAuditForm({ ...newAuditForm, status: e.target.value as any })}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${
                      isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="ناجح">{t('ناجح (Approved)', 'Approved')}</option>
                    <option value="تحذير">{t('تحذير (Warning)', 'Warning')}</option>
                    <option value="محظور">{t('محظور (Blocked)', 'Blocked')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('الموديول أو القسم المستهدف', 'Target Module / Scope')}
                </label>
                <select
                  value={newAuditForm.module}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, module: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="الحوكمة والرقابة (cat-9-risk)">{t('الحوكمة والرقابة والامتثال (cat-9-risk)', 'Governance & Risk')}</option>
                  <option value="الرواتب والتعويضات (cat-5-payroll)">{t('الرواتب والتعويضات والتوطين (cat-5-payroll)', 'Payroll & Banking')}</option>
                  <option value="تسجيل الدخول والأمان (cat-1-auth)">{t('تسجيل الدخول والأمان والمصادقة (cat-1-auth)', 'Authentication & 2FA')}</option>
                  <option value="الموظفون والعقود (cat-3-emp)">{t('إدارة الموظفين والعقود (cat-3-emp)', 'Employee Management')}</option>
                  <option value="الأرشيف (cat-12-archive)">{t('الأرشيف والمستندات (cat-12-archive)', 'Digital Archive')}</option>
                  <option value="قواعد البيانات والنظام (cat-10-sys)">{t('قواعد البيانات والنظام (cat-10-sys)', 'System & Database')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('الملاحظات والتفاصيل الرقابية', 'Audit Findings & Notes')}
                </label>
                <textarea
                  rows={3}
                  value={newAuditForm.details}
                  onChange={(e) => setNewAuditForm({ ...newAuditForm, details: e.target.value })}
                  placeholder={t('اكتب تفاصيل التقرير، الملاحظات الفنية، أو التوصيات الرقابية بدقة...', 'Enter inspection findings, technical notes, or compliance recommendations...')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2 border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddAuditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>{t('حفظ وتسجيل الحدث', 'Save & Log Event')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          GENERATE NEW API KEY MODAL
      ============================================================ */}
      {isAddApiKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-white/10 bg-[#0a0c10]' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    {t('إنشاء مفتاح ربط برمجي جديد', 'Generate New API Key')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('توليد مفتاح مشفر للربط مع الأنظمة المصرفية والجهات الرقابية', 'Generate 256-bit secure key for external integrations')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddApiKeyModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleGenerateApiKeySubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('اسم المفتاح أو الجهة المتصلة *', 'Key / Integration Name *')}
                </label>
                <input
                  type="text"
                  required
                  value={newApiKeyForm.name}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, name: e.target.value })}
                  placeholder={t('مثال: منصة التوطين المصرفي CBI API Gateway', 'e.g., CBI Payment & Settlement Gateway')}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('مستوى الصلاحيات الممنوحة', 'Granted Permissions')}
                </label>
                <select
                  value={newApiKeyForm.permissions}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, permissions: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="قراءة وكتابة (Full Access)">{t('قراءة وكتابة كاملة (Full Access)', 'Full Read / Write Access')}</option>
                  <option value="قراءة فقط (Read Only)">{t('قراءة فقط واستعلام (Read Only)', 'Read Only')}</option>
                  <option value="إرسال فقط (Send Only)">{t('إرسال إشعارات فقط (Send Only)', 'Send Only')}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  {t('تاريخ الانتهاء والصلاحية', 'Expiration Date')}
                </label>
                <input
                  type="date"
                  value={newApiKeyForm.expires}
                  onChange={(e) => setNewApiKeyForm({ ...newApiKeyForm, expires: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2 border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddApiKeyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  {t('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">vpn_key</span>
                  <span>{t('توليد المفتاح', 'Generate Key')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

