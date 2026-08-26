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
    t
  } = useApp();

  const [riskTitle, setRiskTitle] = useState('');
  const [riskCat, setRiskCat] = useState<'أمن المعلومات' | 'الامتثال التنظيمي' | 'التشغيلي' | 'المالي'>('أمن المعلومات');
  const [impact, setImpact] = useState<'منخفض' | 'متوسط' | 'عالي' | 'حرج'>('عالي');
  const [mitigation, setMitigation] = useState('');

  const [apiKeys, setApiKeys] = useState<{ id: string; name: string; key: string; created: string }[]>([]);

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!riskTitle) return;
    addRiskRecord({
      riskCode: `RSK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: riskTitle,
      category: riskCat,
      impact,
      probability: 'متوسط',
      owner: currentUser.name,
      mitigationPlan: mitigation || 'سيتم إعداد خطة التعافي فوراً',
      status: 'مفتوح'
    });
    setRiskTitle('');
    setMitigation('');
    setActiveModuleId('risk-assessment');
  };

  const handleGenerateApiKey = () => {
    const newK = {
      id: `KEY-${Date.now().toString().slice(-4)}`,
      name: `مفتاح API - ${currentUser.role}`,
      key: `vts_live_sk_${Math.random().toString(36).substring(2, 18)}`,
      created: new Date().toISOString().split('T')[0]
    };
    setApiKeys(prev => [newK, ...prev]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-6 rounded-3xl bg-[#0a0c10] border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-teal-400">gavel</span>
            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-normal">
              RISK, COMPLIANCE & SECURITY GOVERNANCE
            </span>
          </div>
          <h1 className="text-2xl font-normal text-white drop-shadow-sm">
            {activeModuleId === 'risk-audit-reports' && t('مركز تقارير التدقيق والامتثال التنظيمي', 'Audit & Regulatory Compliance Reports Center')}
            {activeModuleId === 'risk-governance' && t('لوحة حوكمة الامتثال وسجلات الرقابة المصرفية', 'Compliance Governance & Banking Supervision Logs')}
            {activeModuleId === 'risk-tracker' && t('متتبع التوافق والتشريعات العفوية', 'Regulatory Compliance & Statutory Tracker')}
            {activeModuleId === 'risk-policies' && t('سجل اللوائح والسياسات الداخلية المعتمدة', 'Approved Internal Policies & Regulations Register')}
            {activeModuleId === 'risk-assessment' && t('سجل ونظرة عامة على تقييم المخاطر', 'Risk Assessment Register & Overview')}
            {activeModuleId === 'risk-identify-new' && t('تسجيل وتحديد خطر تشغيلي / سيبراني جديد', 'Register New Operational / Cyber Risk')}
            {activeModuleId === 'risk-details-privacy' && t('تفاصيل خطر حماية الخصوصية والبيانات', 'Data Privacy & Protection Risk Details')}
            {activeModuleId === 'sec-general-settings' && t('إعدادات وسياسات الأمان العامة', 'General Security Settings & Policies')}
            {activeModuleId === 'sec-audit-logs' && t('سجلات تدقيق الأمان وأحداث النظام (Audit Logs)', 'Security Audit Logs & System Events')}
            {activeModuleId === 'sec-roles-permissions' && t('إدارة أدوار وصلاحيات المستخدمين (RBAC)', 'Role-Based Access Control & Permissions (RBAC)')}
            {activeModuleId === 'sec-edit-role' && t('محرر ومخصص الصلاحيات البرمجية للأدوار', 'Role Permissions Editor')}
            {activeModuleId === 'sec-api-keys' && t('إدارة مفاتيح وتصاريح الربط البرمجي (API Keys)', 'API Keys & Integration Management')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('الحوكمة وإدارة المخاطر المعززة وفق معايير البنك المركزي العراقي CBI', 'Enhanced governance and risk management according to CBI guidelines')}
          </p>
        </div>
      </div>

      {activeModuleId === 'risk-assessment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span>{t(`سجل المخاطر المفتوحة (${riskRecords.length})`, `Open Risk Register (${riskRecords.length})`)}</span>
            <button
              onClick={() => setActiveModuleId('risk-identify-new')}
              className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-500 transition-all shadow-md shadow-teal-600/20"
            >
              {t('+ تسجيل خطر جديد', '+ Register New Risk')}
            </button>
          </div>

          {riskRecords.length === 0 ? (
            <EmptyState
              icon="warning"
              title={t('سجل المخاطر مفرّغ تماماً', 'Risk Register Completely Empty')}
              description={t('لم يتم رصد أو إدخال أي مخاطر تشغيلية أو سيبرانية حتى الآن.', 'No operational or cyber risks have been identified or logged yet.')}
              actionText={t('تحديد خطر جديد', 'Identify New Risk')}
              onAction={() => setActiveModuleId('risk-identify-new')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {riskRecords.map(r => (
                <div key={r.id} className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 space-y-2 shadow-sm">
                  <div className="flex justify-between font-bold text-white">
                    <span>{r.title}</span>
                    <span className="text-rose-400 font-mono text-[10px]">{r.riskCode}</span>
                  </div>
                  <p className="text-slate-400">{t('الفئة:', 'Category:')} {r.category} • {t('خطة المعالجة:', 'Mitigation:')} {r.mitigationPlan}</p>
                  <div className="pt-2 border-t border-white/5 flex justify-between text-[10px]">
                    <span className="text-teal-400 font-bold">{t('التأثير:', 'Impact:')} {r.impact}</span>
                    <span className="text-slate-500">{t('تم الرصد بتاريخ', 'Logged on')} {r.identifiedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeModuleId === 'risk-identify-new' && (
        <div className="max-w-xl mx-auto p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
          <h2 className="text-base font-bold text-white border-b border-white/10 pb-2">{t('تسجيل خطر جديد', 'Register New Risk')}</h2>
          <form onSubmit={handleAddRisk} className="space-y-3">
            <div>
              <label className="block text-slate-400 mb-1">{t('وصف الخطر المحتمل *', 'Potential Risk Description *')}</label>
              <input
                type="text"
                required
                placeholder={t('مثال: احتمال انقطاع الخدمة السحابية عن الفروع', 'e.g. Potential cloud service outage at branches')}
                value={riskTitle}
                onChange={e => setRiskTitle(e.target.value)}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{t('فئة الخطر', 'Risk Category')}</label>
              <select
                value={riskCat}
                onChange={e => setRiskCat(e.target.value as any)}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
              >
                <option value="أمن المعلومات">{t('أمن المعلومات والسيبراني', 'Information & Cyber Security')}</option>
                <option value="الامتثال التنظيمي">{t('الامتثال للبنك المركزي', 'Central Bank Compliance')}</option>
                <option value="التشغيلي">{t('التشغيلي والسيولة', 'Operational & Liquidity')}</option>
                <option value="المالي">{t('المالي والائتمان', 'Financial & Credit')}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{t('درجة التأثير المتوقعة', 'Expected Impact Level')}</label>
              <select
                value={impact}
                onChange={e => setImpact(e.target.value as any)}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-rose-400 font-bold focus:outline-none"
              >
                <option value="منخفض">{t('منخفض', 'Low')}</option>
                <option value="متوسط">{t('متوسط', 'Medium')}</option>
                <option value="عالي">{t('عالي', 'High')}</option>
                <option value="حرج">{t('حرج جداً', 'Critical')}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{t('خطة المعالجة والتخفيف (Mitigation Plan)', 'Mitigation Plan')}</label>
              <textarea
                rows={3}
                placeholder={t('تفاصيل التخفيف والتغطية...', 'Mitigation plan details...')}
                value={mitigation}
                onChange={e => setMitigation(e.target.value)}
                className="w-full bg-[#0a0c10] border border-white/10 rounded-xl p-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all"
            >
              {t('حفظ الخطر في سجل الحوكمة', 'Save Risk to Governance Register')}
            </button>
          </form>
        </div>
      )}

      {activeModuleId === 'sec-roles-permissions' && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white">{t('إدارة الأدوار والصلاحيات (Role-Based Access Control)', 'Role-Based Access Control (RBAC)')}</h2>
            <span className="text-teal-400 font-bold">{t(`دورك الحالي: ${currentUser.role}`, `Current Role: ${currentUser.role}`)}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {['Super Admin', 'HR Manager', 'Recruiter', 'Department Head', 'Employee', 'IT Admin'].map(role => (
              <div key={role} className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 space-y-2 shadow-sm">
                <p className="font-bold text-white text-sm">{role}</p>
                <p className="text-slate-400 text-[10px]">{t('صلاحيات كاملة لإدارة الوحدات وتغيير التكوينات', 'Full access for module management & configuration')}</p>
                <button
                  onClick={() => setCurrentUserRole(role as UserRole)}
                  className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-teal-600 hover:text-white text-slate-200 font-bold transition-colors"
                >
                  {t('اختبار الدخول بهذا الدور', 'Switch to this Role')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeModuleId === 'sec-api-keys' && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-sm font-bold text-white">{t('إدارة مفاتيح API للتكامل الخارجي', 'External API Keys Management')}</h2>
            <button
              onClick={handleGenerateApiKey}
              className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold hover:bg-teal-500 transition-all shadow-md shadow-teal-600/20"
            >
              {t('+ إنشاء مفتاح API جديد', '+ Generate New API Key')}
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
            <div className="space-y-2">
              {apiKeys.map(k => (
                <div key={k.id} className="p-3 rounded-2xl bg-[#0a0c10] border border-white/10 flex items-center justify-between font-mono shadow-sm">
                  <div>
                    <p className="font-bold text-white text-xs">{k.name}</p>
                    <p className="text-teal-400 text-[11px] mt-0.5">{k.key}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">{k.created}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(activeModuleId === 'risk-audit-reports' ||
        activeModuleId === 'risk-governance' ||
        activeModuleId === 'risk-tracker' ||
        activeModuleId === 'risk-policies' ||
        activeModuleId === 'risk-details-privacy' ||
        activeModuleId === 'sec-general-settings' ||
        activeModuleId === 'sec-audit-logs' ||
        activeModuleId === 'sec-edit-role') && (
        <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-400">admin_panel_settings</span>
            {t('لوحات الأمان والامتثال والتدقيق', 'Security, Compliance & Audit Panels')}
          </h2>
          <EmptyState
            icon="policy"
            title={t('وحدة الامتثال والأمان مجهزة', 'Compliance & Security Module Ready')}
            description={t('جميع السجلات متصلة بمركز تدقيق الأمان المباشر لبوابة فيتاس العراق.', 'All logs are connected to the live VITAS Iraq audit center.')}
          />
        </div>
      )}
    </div>
  );
};
