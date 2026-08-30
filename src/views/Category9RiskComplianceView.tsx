import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { UserRole } from '../types';

export const Category9RiskComplianceView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    riskRecords,
    addRiskRecord,
    currentUser,
    setCurrentUserRole,
    language,
    theme,
    t
  } = useApp();

  const isDark = theme === 'dark';

  // --- 1. Risk Assessment State ---
  const [riskTitle, setRiskTitle] = useState('');
  const [riskCat, setRiskCat] = useState<'أمن المعلومات' | 'الامتثال التنظيمي' | 'التشغيلي' | 'المالي'>('أمن المعلومات');
  const [impact, setImpact] = useState<'منخفض' | 'متوسط' | 'عالي' | 'حرج'>('عالي');
  const [mitigation, setMitigation] = useState('');

  // --- 2. API Keys State ---
  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; created: string; status: string }[]>([
    { id: 'KEY-9401', name: 'مفتاح الربط مع بوابة التأمينات والتقاعد', key: 'vts_live_sk_8923fd829a47b10', created: '2026-01-15', status: 'نشط' },
    { id: 'KEY-4122', name: 'واجهة الربط المصرفي CBI Gateway API', key: 'vts_live_sk_4421aa8720cb551', created: '2026-02-10', status: 'نشط' }
  ]);

  // --- 3. Security Settings State ---
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [enable2FA, setEnable2FA] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(5);
  const [settingsSaved, setSettingsSaved] = useState(false);

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

  const handleSaveSecuritySettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
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
      {/* Top Category Banner */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-[#e8ebef] border-slate-300'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">gavel</span>
            <span className="text-xs font-mono text-teal-700 dark:text-teal-400 uppercase tracking-widest font-normal">
              RISK, COMPLIANCE & SECURITY GOVERNANCE
            </span>
          </div>
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('الحوكمة وإدارة المخاطر المعززة وفق معايير البنك المركزي العراقي CBI وقوانين العمل والضمان', 'Enhanced governance & risk management according to CBI guidelines & labor laws')}
          </p>
        </div>

        {/* Quick Module Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {[
            { id: 'risk-governance', label: t('الحوكمة', 'Governance'), icon: 'balance' },
            { id: 'risk-audit-reports', label: t('التقارير', 'Reports'), icon: 'assessment' },
            { id: 'risk-assessment', label: t('المخاطر', 'Risks'), icon: 'warning' },
            { id: 'risk-policies', label: t('السياسات', 'Policies'), icon: 'policy' },
            { id: 'sec-roles-permissions', label: t('الأدوار (RBAC)', 'RBAC'), icon: 'admin_panel_settings' },
            { id: 'sec-audit-logs', label: t('سجل الأمان', 'Audit Logs'), icon: 'history' },
            { id: 'sec-general-settings', label: t('الأمان', 'Security'), icon: 'security' },
            { id: 'sec-api-keys', label: t('مفاتيح API', 'API Keys'), icon: 'key' }
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
          </div>

          <form onSubmit={handleSaveSecuritySettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('الحد الأدنى لطول كلمة المرور (أحرف)', 'Min Password Length')}
                </label>
                <input
                  type="number"
                  min={6}
                  max={20}
                  value={minPasswordLength}
                  onChange={e => setMinPasswordLength(Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1.5" style={{ color: isDark ? '#cbd5e1' : '#0f172a' }}>
                  {t('مهلة انتهاء الجلسة بعد الخمول (بالدقائق)', 'Session Inactivity Timeout (Minutes)')}
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={sessionTimeoutMinutes}
                  onChange={e => setSessionTimeoutMinutes(Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
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
                  max={10}
                  value={maxFailedAttempts}
                  onChange={e => setMaxFailedAttempts(Number(e.target.value))}
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                  className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono outline-none ${
                    isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="req-special"
                  checked={requireSpecialChars}
                  onChange={e => setRequireSpecialChars(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600"
                />
                <label htmlFor="req-special" className="font-bold cursor-pointer" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {t('إلزامية احتواء كلمة المرور على رموز خاصة وأرقام', 'Require special characters & numbers')}
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-teal-500/10 border border-teal-500/30">
              <input
                type="checkbox"
                id="enable-2fa"
                checked={enable2FA}
                onChange={e => setEnable2FA(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600"
              />
              <label htmlFor="enable-2fa" className="font-bold cursor-pointer text-teal-800 dark:text-teal-300">
                {t('تفعيل المصادقة الثنائية الإلزامية (2FA) لمديري النظام والأقسام', 'Enforce Two-Factor Authentication (2FA) for Admins & Managers')}
              </label>
            </div>

            {settingsSaved && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-center">
                ✓ {t('تم حفظ وتطبيق سياسات الأمان بنجاح.', 'Security policies updated successfully.')}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all text-xs"
            >
              {t('حفظ وتطبيق سياسات الأمان', 'Save Security Policies')}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODULE 9: Security Audit Logs (sec-audit-logs)
          ========================================================================= */}
      {activeModuleId === 'sec-audit-logs' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('سجل التدقيق الأمني المباشر وتتبع نشاط المستخدمين (Security Audit Trail)', 'Live Security Audit Logs & User Activity Trail')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('سجل غير قابل للتعديل يوثق جميع عمليات الدخول، التعديلات الإدارية، وتصدير البيانات', 'Immutable log of logins, administrative modifications, and exports')}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead>
                <tr className={`border-b text-[11px] font-bold ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                  <th className="pb-3 text-start">{t('الوقت والتاريخ', 'Timestamp')}</th>
                  <th className="pb-3 text-start">{t('المستخدم', 'User')}</th>
                  <th className="pb-3 text-start">{t('الدور', 'Role')}</th>
                  <th className="pb-3 text-start">{t('نوع الإجراء', 'Action')}</th>
                  <th className="pb-3 text-start">{t('عنوان IP', 'IP Address')}</th>
                  <th className="pb-3 text-start">{t('الحالة', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono text-[11px]">
                {[
                  { time: '2026-02-29 10:25:12', user: 'admin', role: 'Super Admin', action: 'تسجيل دخول ناجح للنظام (Portal Login)', ip: '192.168.1.104', status: 'ناجح' },
                  { time: '2026-02-29 10:15:40', user: 'hrmanager', role: 'HR Manager', action: 'تحديث بيانات مرشح التوظيف (CAND-17877)', ip: '192.168.1.118', status: 'ناجح' },
                  { time: '2026-02-29 09:44:22', user: 'admin', role: 'Super Admin', action: 'تحديث واحتساب رواتب الموظفين لشهر شباط 2026', ip: '192.168.1.104', status: 'ناجح' },
                  { time: '2026-02-29 08:30:10', user: 'v1264', role: 'Employee', action: 'تقديم طلب إجازة اعتيادية (LV-9412)', ip: '10.0.4.15', status: 'ناجح' },
                  { time: '2026-02-29 08:15:02', user: 'unknown', role: 'Guest', action: 'محاولة تسجيل دخول بكلمة مرور خاطئة', ip: '172.16.8.99', status: 'مرفوض' }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 text-slate-500">{row.time}</td>
                    <td className="py-3 font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{row.user}</td>
                    <td className="py-3 text-slate-500">{row.role}</td>
                    <td className="py-3 font-sans text-slate-700 dark:text-slate-300 font-normal">{row.action}</td>
                    <td className="py-3 text-teal-600 dark:text-teal-400">{row.ip}</td>
                    <td className="py-3 font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.status === 'ناجح' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 10: User Roles & Permissions RBAC (sec-roles-permissions)
          ========================================================================= */}
      {activeModuleId === 'sec-roles-permissions' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-5 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إدارة أدوار وصلاحيات المستخدمين (Role-Based Access Control - RBAC)', 'Role-Based Access Control & Permissions (RBAC)')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('الأدوار القيادية والوظيفية في المؤسسة مع إمكانية اختبار التبديل السريع', 'Enterprise roles with instant role-switching for testing')}</p>
            </div>
            <span className="text-teal-600 dark:text-teal-400 font-bold bg-teal-500/10 px-3 py-1 rounded-xl">
              {t(`دورك الحالي: ${currentUser?.role || 'Super Admin'}`, `Current Role: ${currentUser?.role || 'Super Admin'}`)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { role: 'Super Admin', ar: 'مدير النظام الشامل', desc: 'كامل الصلاحيات دون استثناء لإدارة كافة الأقسام، السيرفرات، الإعدادات، والمستخدمين.' },
              { role: 'HR Manager', ar: 'مدير الموارد البشرية', desc: 'صلاحيات كاملة لإدارة الموظفين، الرواتب، كشوفات الضمان والضريبة، التوظيف، والإجازات.' },
              { role: 'Department Head', ar: 'مدير قسم / فرع', desc: 'موافقة واعتماد الإجازات، استعراض موظفي القسم/الفرع، والمشاركة في تقييمات الأداء والتوظيف.' },
              { role: 'Recruiter', ar: 'مسؤول التوظيف والاستقطاب', desc: 'إدارة الشواغر الوظيفية، استعراض المتقدمين، جدولة المقابلات، ومتابعة مراحل التعيين (ATS).' },
              { role: 'Employee', ar: 'الموظف (خدمات ذاتية)', desc: 'الوصول لبوابة الخدمات الذاتية، تقديم الإجازات، استعراض كشف الراتب، وتحديث الملف الشخصي.' },
              { role: 'IT Admin', ar: 'مسؤول النظم والتقنية', desc: 'مراقبة أداء الخوادم، مفاتيح الربط البرمجي API، سجلات تدقيق الأمان، والصيانة التقنية.' }
            ].map(item => (
              <div key={item.role} className={`p-4 rounded-2xl border space-y-3 shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{item.role}</h3>
                    <p className="text-teal-600 dark:text-teal-400 text-[11px] font-bold">{item.ar}</p>
                  </div>
                  {currentUser?.role === item.role && (
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                      {t('النشط الآن', 'Active')}
                    </span>
                  )}
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">{item.desc}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentUserRole(item.role as UserRole);
                      alert(`تم تبديل دور المستخدم الحالي إلى: ${item.role}`);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition-all shadow-sm"
                  >
                    {t('اختبار الدخول بهذا الدور', 'Switch to Role')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRoleForEdit(item.role);
                      setActiveModuleId('sec-edit-role');
                    }}
                    className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
                    title={t('تعديل الصلاحيات', 'Edit Permissions')}
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODULE 11: Role Permission Editor (sec-edit-role)
          ========================================================================= */}
      {activeModuleId === 'sec-edit-role' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-5 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('محرر ومخصص الصلاحيات البرمجية الدقيقة للأدوار', 'Role Permissions & Access Granularity Editor')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('تحديد ما يمكن لكل دور الوصول إليه في وحدات وأقسام النظام', 'Specify exact view/edit capabilities per role')}</p>
            </div>
            <button
              onClick={() => setActiveModuleId('sec-roles-permissions')}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 font-bold transition-all text-xs"
            >
              {t('رجوع للأدوار', 'Back to Roles')}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="font-bold text-slate-500">{t('اختر الدور للتعديل:', 'Select Role to Edit:')}</label>
            <select
              value={selectedRoleForEdit}
              onChange={e => setSelectedRoleForEdit(e.target.value)}
              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
              className={`px-4 py-2 rounded-xl border text-xs font-bold outline-none ${
                isDark ? 'bg-[#0a0c10] border-slate-700' : 'bg-slate-50 border-slate-300'
              }`}
            >
              {['Super Admin', 'HR Manager', 'Recruiter', 'Department Head', 'Employee', 'IT Admin'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {[
              { key: 'employees', title: 'دليل وسجلات الموظفين (Employee Directory & Service Records)', desc: 'عرض وإضافة وتعديل ملفات الموظفين والوثائق الشخصية' },
              { key: 'payroll', title: 'إدارة الرواتب والتعويضات ومحرك الضمان (Payroll & Compensation)', desc: 'احتساب الرواتب، توليد قسائم الراتب، وكشوفات الضمان والضريبة' },
              { key: 'recruitment', title: 'التوظيف والاستقطاب وبوابة المرشحين (Recruitment & ATS Portal)', desc: 'نشر الوظائف، استلام الطلبات، إدارة المقابلات والقبول' },
              { key: 'attendance', title: 'الإجازات وسجلات الدوام والبصمة (Leaves & Attendance)', desc: 'تقديم الإجازات، تسجيل الحضور، ومراجعة سجلات أجهزة البصمة' },
              { key: 'risk', title: 'المخاطر والامتثال والحوكمة (Risk, Compliance & Governance)', desc: 'تقارير البنك المركزي، سجل المخاطر، واللوائح المعتمدة' },
              { key: 'settings', title: 'الإعدادات والأمان وإدارة الخوادم (System Settings & Security)', desc: 'تكوين الخوادم، مفاتيح API، وتفضيلات النظام العامة' },
              { key: 'audit', title: 'سجلات التدقيق الأمني وتتبع النشاط (Security Audit Trail)', desc: 'استعراض العمليات وتتبع نشاط المستخدمين وعناوين IP' }
            ].map(mod => {
              const hasAccess = Boolean(rolePermissions[selectedRoleForEdit]?.[mod.key]);
              return (
                <div
                  key={mod.key}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${
                    hasAccess
                      ? isDark ? 'bg-teal-950/20 border-teal-500/30' : 'bg-teal-50 border-teal-200'
                      : isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{mod.title}</h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">{mod.desc}</p>
                  </div>
                  <button
                    onClick={() => togglePermission(selectedRoleForEdit, mod.key)}
                    className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      hasAccess
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-300 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {hasAccess ? t('مفعّل (Granted)', 'Granted') : t('معطّل (Denied)', 'Denied')}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => alert(`تم حفظ وتحديث صلاحيات دور ${selectedRoleForEdit} بنجاح.`)}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all text-xs"
          >
            {t(`حفظ وتطبيق صلاحيات (${selectedRoleForEdit})`, `Save Permissions for (${selectedRoleForEdit})`)}
          </button>
        </div>
      )}

      {/* =========================================================================
          MODULE 12: API Keys Management (sec-api-keys)
          ========================================================================= */}
      {activeModuleId === 'sec-api-keys' && (
        <div className={`p-6 rounded-3xl border shadow-xl space-y-4 text-xs ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <div>
              <h2 className="text-sm font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                {t('إدارة وتوليد مفاتيح وتصاريح الربط البرمجي (API & Secret Keys)', 'External API Keys & Integration Management')}
              </h2>
              <p className="text-slate-500 text-[11px] mt-0.5">{t('إنشاء مفاتيح آمنة للربط مع الأنظمة المصرفية والجهات الخارجية', 'Generate secure API tokens for third-party integrations')}</p>
            </div>
            <button
              onClick={handleGenerateApiKey}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-500 transition-all shadow-md shadow-teal-600/20 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">key</span>
              <span>{t('+ إنشاء مفتاح API جديد', '+ Generate API Key')}</span>
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <EmptyState
              icon="key"
              title={t('لا توجد مفاتيح API منشأة', 'No API Keys Generated')}
              description={t('قم بإنشاء مفتاح آمن للربط مع الأنظمة الخارجية أو برمجيات الطرف الثالث.', 'Generate a secure API key for third-party integrations.')}
              actionText={t('إنشاء مفتاح API', 'Generate API Key')}
              onAction={handleGenerateApiKey}
            />
          ) : (
            <div className="space-y-3">
              {apiKeys.map(k => (
                <div key={k.id} className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 font-mono shadow-sm ${isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans">{k.id}</span>
                    <h3 className="font-bold text-xs font-sans mt-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{k.name}</h3>
                    <p className="text-teal-600 dark:text-teal-400 text-xs mt-1 bg-teal-500/10 px-2 py-0.5 rounded-lg inline-block">{k.key}</p>
                  </div>
                  <div className="flex items-center gap-3 font-sans">
                    <span className="text-[11px] text-slate-500 font-mono">{t('الإنشاء:', 'Created:')} {k.created}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      {k.status}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(k.key);
                        alert('تم نسخ مفتاح API بنجاح.');
                      }}
                      className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 transition-all"
                      title={t('نسخ المفتاح', 'Copy Key')}
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
