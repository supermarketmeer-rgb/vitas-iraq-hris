import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export const DocumentRoutingAdminView: React.FC = () => {
  const { language, theme, t } = useApp();
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'history' | 'rules' | 'm365' | 'tests'>('history');

  // Delivery History State
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);

  // Routing Rules State
  const [rules, setRules] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);

  // M365 & Push State
  const [m365Status, setM365Status] = useState<any | null>(null);
  const [pushStatus, setPushStatus] = useState<any | null>(null);
  const [testingM365, setTestingM365] = useState(false);

  // Acceptance Tests State
  const [testReport, setTestReport] = useState<any | null>(null);
  const [runningTests, setRunningTests] = useState(false);

  // 1. Fetch Deliveries
  const fetchDeliveries = async () => {
    setLoadingHistory(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterChannel !== 'all') params.append('channel', filterChannel);
      if (historySearch) params.append('search', historySearch);

      const res = await fetch(`/api/routing/deliveries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data);
      }
    } catch (e) {
      console.error('Error fetching deliveries:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 2. Fetch Rules
  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await fetch('/api/routing/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (e) {
      console.error('Error fetching rules:', e);
    } finally {
      setLoadingRules(false);
    }
  };

  // 3. Fetch M365 & Push Status
  const fetchIntegrationStatus = async () => {
    setTestingM365(true);
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/routing/m365/status'),
        fetch('/api/routing/push/status')
      ]);
      if (mRes.ok) setM365Status(await mRes.json());
      if (pRes.ok) setPushStatus(await pRes.json());
    } catch (e) {
      console.error('Error fetching integration status:', e);
    } finally {
      setTestingM365(false);
    }
  };

  // 4. Run Acceptance Tests
  const runAcceptanceTests = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/routing/run-acceptance-tests', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTestReport(data);
      }
    } catch (e) {
      console.error('Error running acceptance tests:', e);
    } finally {
      setRunningTests(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchDeliveries();
    if (activeTab === 'rules') fetchRules();
    if (activeTab === 'm365') fetchIntegrationStatus();
    if (activeTab === 'tests' && !testReport) runAcceptanceTests();
  }, [activeTab, filterStatus, filterChannel]);

  // Retry Failed Email
  const handleRetryEmail = async (deliveryId: string) => {
    try {
      const res = await fetch(`/api/routing/deliveries/${deliveryId}/retry-email`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(isAr ? 'تمت إعادة محاولة البريد بنجاح.' : 'Email retry processed.');
        fetchDeliveries();
        if (selectedDelivery && selectedDelivery.id === deliveryId) {
          setSelectedDelivery({ ...selectedDelivery, email_status: data.emailStatus, overall_status: data.overallStatus });
        }
      } else {
        alert(data.error || 'Retry failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Save Rule
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const res = await fetch(`/api/routing/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule)
      });
      if (res.ok) {
        alert(isAr ? 'تم تحديث قاعدة التوجيه بنجاح.' : 'Routing rule updated.');
        setEditingRule(null);
        fetchRules();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="space-y-6">
      
      {/* Top Header Card */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
              isDark ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20 text-white' : 'bg-teal-50 border border-teal-200 text-teal-700'
            }`}>
              <span className="material-symbols-outlined text-3xl">route</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">
                  {t('نظام التوجيه والتسليم الذكي للمستندات', 'Smart Document Routing & Delivery Center')}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                  isDark ? 'bg-teal-900/60 text-white border-teal-400/30' : 'bg-teal-50 text-teal-700 border-teal-200'
                }`}>
                  M365 & App Integration
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('إدارة مركزية لتسليم العقود والنماذج والتقارير عبر بريد المؤسسة وتطبيق الموظف ومتابعة السجلات.', 'Centralized routing for contracts, forms and reports across M365 Email and Employee App.')}
              </p>
            </div>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              if (activeTab === 'history') fetchDeliveries();
              if (activeTab === 'rules') fetchRules();
              if (activeTab === 'm365') fetchIntegrationStatus();
              if (activeTab === 'tests') runAcceptanceTests();
            }}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 cursor-pointer self-start md:self-auto transition"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>{t('تحديث البيانات', 'Refresh Data')}</span>
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: 'history', ar: 'سجل التسليم المركزي', en: 'Central Delivery History', icon: 'history' },
            { id: 'rules', ar: 'قواعد التوجيه المعتمدة', en: 'Routing Rules', icon: 'rule' },
            { id: 'm365', ar: 'تكامل Microsoft 365 والخدمات', en: 'M365 & Gateways', icon: 'cloud_sync' },
            { id: 'tests', ar: 'فحص الاعتماد والاختبارات (16 فحص)', en: 'Acceptance Tests (16 Tests)', icon: 'verified' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{isAr ? tab.ar : tab.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: Central Delivery History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <span className="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالعنوان، المستلم، أو الرقم المرجعي...' : 'Search by title, recipient, or ID...'}
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchDeliveries()}
                  className={`w-full pr-9 pl-3 py-2 rounded-xl text-xs border outline-none font-medium ${
                    isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                  isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="all">كافة الحالات (All Statuses)</option>
                <option value="delivered">مكتمل التسليم (Delivered)</option>
                <option value="partial_success">تسليم جزئي (Partial Success)</option>
                <option value="failed">تعثر التسليم (Failed)</option>
              </select>

              <select
                value={filterChannel}
                onChange={e => setFilterChannel(e.target.value)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                  isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="all">كافة القنوات (All Channels)</option>
                <option value="both">كلاهما (Both)</option>
                <option value="app">تطبيق الموظف (App Only)</option>
                <option value="email">البريد المؤسسي (Email Only)</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-bold">
              إجمالي السجلات: {deliveries.length}
            </div>
          </div>

          {/* Deliveries Table */}
          <div className={`rounded-3xl border overflow-hidden ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className={`border-b font-bold ${
                    isDark ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <th className="p-4">رقم العملية / المرجع</th>
                    <th className="p-4">المستند والنوع</th>
                    <th className="p-4">المستلم والبريد</th>
                    <th className="p-4">القناة المطلوبة</th>
                    <th className="p-4">حالة تطبيق الموظف</th>
                    <th className="p-4">حالة بريد M365</th>
                    <th className="p-4">الحالة العامة</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        {loadingHistory ? 'جاري تحميل السجلات...' : 'لا توجد عمليات توجيه مسجلة تطابق معايير البحث.'}
                      </td>
                    </tr>
                  ) : (
                    deliveries.map(del => (
                      <tr key={del.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                        <td className="p-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {del.id}
                          <div className="text-[10px] text-slate-400 font-normal">{del.document_id}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold">{del.document_title}</div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 font-medium">
                            {del.document_type}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold">{del.recipient_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{del.recipient_email || 'لا يوجد بريد'}</div>
                        </td>
                        <td className="p-4 uppercase font-bold text-[11px]">
                          {del.channel_requested}
                        </td>
                        <td className="p-4">
                          {del.app_status === 'not_applicable' ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              del.app_status === 'read' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                              del.app_status === 'delivered' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                              'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}>
                              {del.app_status === 'read' ? '✓ تم الاطلاع' : del.app_status === 'delivered' ? '✓ تم التسليم' : 'فشل'}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {del.email_status === 'not_applicable' ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                del.email_status === 'accepted' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                                'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              }`}>
                                {del.email_status === 'accepted' ? '✓ مقبول' : 'فشل / غير مهيأ'}
                              </span>
                              {del.email_status === 'failed' && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryEmail(del.id)}
                                  className="text-[10px] px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-bold transition cursor-pointer"
                                  title="إعادة محاولة إرسال البريد فقط"
                                >
                                  إعادة
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            del.overall_status === 'delivered' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                            del.overall_status === 'partial_success' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          }`}>
                            {del.overall_status === 'delivered' ? 'ناجح بالكامل' : del.overall_status === 'partial_success' ? 'نجاح جزئي' : 'فشل'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {new Date(del.created_at).toLocaleDateString('ar-IQ')} {new Date(del.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedDelivery(del)}
                            className="p-1.5 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition cursor-pointer"
                            title="عرض التفاصيل وسجل الوصول"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Configurable Routing Rules */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div>
              <h3 className="font-bold text-sm">قواعد التوجيه المعتمدة حسب نوع المستند</h3>
              <p className="text-xs text-slate-500">تحديد المستلم الافتراضي وقنوات التسليم وصلاحيات التغيير والمرفقات لكل نوع مستند.</p>
            </div>
          </div>

          <div className={`rounded-3xl border overflow-hidden ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <table className="w-full text-right text-xs">
              <thead>
                <tr className={`border-b font-bold ${
                  isDark ? 'bg-slate-900/50 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="p-4">نوع المستند</th>
                  <th className="p-4">الموديول المصدر</th>
                  <th className="p-4">المستلم الافتراضي</th>
                  <th className="p-4">القناة الافتراضية</th>
                  <th className="p-4">تعدد المستلمين</th>
                  <th className="p-4">تغيير المستلم</th>
                  <th className="p-4">طلب موافقة</th>
                  <th className="p-4">مرفقات إضافية</th>
                  <th className="p-4 text-center">تعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition">
                    <td className="p-4 font-bold">
                      {rule.name_ar}
                      <div className="text-[10px] text-slate-400">{rule.document_type}</div>
                    </td>
                    <td className="p-4 uppercase font-mono">{rule.source_module}</td>
                    <td className="p-4 font-bold text-teal-600 dark:text-teal-400">{rule.default_recipient_type}</td>
                    <td className="p-4 font-bold uppercase">{rule.default_channels}</td>
                    <td className="p-4">{rule.allow_multiple_recipients ? 'مسموح' : 'فردي فقط'}</td>
                    <td className="p-4">{rule.allow_sender_override ? 'نعم' : 'إجباري'}</td>
                    <td className="p-4">{rule.requires_approval ? 'نعم (مطلوب)' : 'تسليم مباشر'}</td>
                    <td className="p-4">{rule.allow_additional_attachments ? 'مسموح' : 'ممنوع'}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setEditingRule(rule)}
                        className="px-3 py-1 rounded-xl bg-teal-600/10 text-teal-600 dark:text-teal-400 hover:bg-teal-600/20 font-bold transition cursor-pointer"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Microsoft 365 & Gateways */}
      {activeTab === 'm365' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Microsoft 365 Graph Status Card */}
          <div className={`p-6 rounded-3xl border space-y-4 ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  M365
                </div>
                <div>
                  <h3 className="font-bold text-sm">Microsoft 365 Graph API</h3>
                  <p className="text-xs text-slate-500">تكامل البريد المؤسسي عبر Microsoft Entra ID</p>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                m365Status?.isConfigured
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-600 border-amber-500/20'
              }`}>
                {m365Status?.isConfigured ? 'مهيأ ومتصل' : 'يتطلب ضبط الإعدادات'}
              </span>
            </div>

            <div className={`p-4 rounded-2xl text-xs space-y-2 ${
              isDark ? 'bg-slate-900 border border-white/5' : 'bg-slate-50 border border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-500">نوع الصلاحيات الموصى بها:</span>
                <span className="font-mono font-bold">Mail.Send (Application / Least-Privilege)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">حساب الإرسال المؤسسي:</span>
                <span className="font-mono font-bold">{m365Status?.senderEmail || 'MS_GRAPH_SENDER_EMAIL'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">معرف المستأجر (Tenant ID):</span>
                <span className="font-mono">{m365Status?.details?.hasTenantId ? '✓ متوفر في الخادم' : 'غير مهيأ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">معرف التطبيق (Client ID):</span>
                <span className="font-mono">{m365Status?.details?.hasClientId ? '✓ متوفر في الخادم' : 'غير مهيأ'}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              وفق ضوابط الأمان: لا يتم كشف الرموز السرية أو كلمات المرور في الواجهة الأمامية أبداً. يتم الاعتماد على متغيرات بيئة الخادم المحمية (MS_GRAPH_CLIENT_SECRET).
            </p>

            <button
              type="button"
              onClick={fetchIntegrationStatus}
              disabled={testingM365}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span className={`material-symbols-outlined text-base ${testingM365 ? 'animate-spin' : ''}`}>sync</span>
              <span>{testingM365 ? 'جاري الفحص...' : 'فحص الاتصال بـ Microsoft Entra ID'}</span>
            </button>
          </div>

          {/* Mobile Push Status Card */}
          <div className={`p-6 rounded-3xl border space-y-4 ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-xl">notifications_active</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">إشعارات Push للهواتف المحمولة</h3>
                  <p className="text-xs text-slate-500">بوابة الإشعارات الفورية لتطبيق الموظف</p>
                </div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                pushStatus?.isConfigured
                  ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-600 border-amber-500/20'
              }`}>
                {pushStatus?.isConfigured ? 'نشط' : 'نقاط التكامل جاهزة'}
              </span>
            </div>

            <div className={`p-4 rounded-2xl text-xs space-y-2 ${
              isDark ? 'bg-slate-900 border border-white/5' : 'bg-slate-50 border border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-500">حالة المزود الخارجي:</span>
                <span className="font-bold">{pushStatus?.provider || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">حماية السرية:</span>
                <span className="font-bold text-emerald-600">مضمونة (لا تتضمن محتوى المستند السري)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">البديل الداخلي الفوري:</span>
                <span className="font-bold text-teal-600">نشط (سجل الإشعارات داخل التطبيق)</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              تم تجهيز نقاط التكامل البرمجية للإشعارات الخارجية (FCM_SERVER_KEY / WebPush). وفي حال عدم ربط مفاتيح Firebase، يتم تسليم الإشعارات فورياً داخل تطبيق الموظف دون أي تعطيل للخدمة.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: Acceptance Tests (16 Tests) */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className={`p-6 rounded-3xl border flex flex-wrap items-center justify-between gap-4 ${
            isDark ? 'bg-[#0a0c10] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-500 text-2xl">verified</span>
                <h2 className="text-base font-black">حزمة فحوصات الاعتماد والتوافق الشاملة (16 فحصاً)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                تغطي كافة حالات التوجيه، عزل الأذونات، منع التكرار، التعامل مع غياب إعدادات M365، والحفاظ على الهيكل التنظيمي الحالي.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {testReport && (
                <div className={`px-4 py-2 rounded-2xl font-black text-sm border ${
                  testReport.allPassed
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                }`}>
                  النتيجة: {testReport.passedCount} / {testReport.totalTests} ناجح
                </div>
              )}

              <button
                type="button"
                onClick={runAcceptanceTests}
                disabled={runningTests}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-teal-600/25 transition cursor-pointer"
              >
                <span className={`material-symbols-outlined text-base ${runningTests ? 'animate-spin' : ''}`}>refresh</span>
                <span>{runningTests ? 'جاري الفحص المباشر...' : 'تشغيل كافة الفحوصات الـ 16'}</span>
              </button>
            </div>
          </div>

          {/* Test Results List */}
          <div className="space-y-2.5">
            {testReport?.results?.map((tItem: any) => (
              <div
                key={tItem.id}
                className={`p-4 rounded-2xl border flex items-start justify-between gap-4 transition ${
                  tItem.passed
                    ? isDark ? 'bg-slate-900/60 border-emerald-500/20 text-white' : 'bg-white border-emerald-200 text-slate-900'
                    : isDark ? 'bg-rose-950/20 border-rose-500/30 text-white' : 'bg-rose-50 border-rose-200 text-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined text-xl mt-0.5 ${
                    tItem.passed ? 'text-emerald-500' : 'text-rose-500'
                  }`}>
                    {tItem.passed ? 'check_circle' : 'cancel'}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs flex items-center gap-2">
                      <span className="font-mono text-slate-400">#{tItem.id}</span>
                      <span>{isAr ? tItem.name_ar : tItem.name}</span>
                    </h4>
                    <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isAr ? (tItem.message_ar || tItem.message) : tItem.message}
                    </p>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  tItem.passed ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600'
                }`}>
                  {tItem.passed ? 'اجتياز (PASS)' : 'تعثر (FAIL)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl ${
            isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="font-bold text-base mb-4">تعديل قاعدة التوجيه: {editingRule.name_ar}</h3>
            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">المستلم الافتراضي:</label>
                <select
                  value={editingRule.default_recipient_type}
                  onChange={e => setEditingRule({ ...editingRule, default_recipient_type: e.target.value })}
                  className={`w-full p-2 rounded-xl border outline-none font-bold ${
                    isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="direct_supervisor">المشرف المباشر (Direct Supervisor)</option>
                  <option value="office_manager">مدير المكتب / الفرع (Office Manager)</option>
                  <option value="department_manager">مدير القسم (Department Head)</option>
                  <option value="top_management">الإدارة العليا (General Managers)</option>
                  <option value="specific_employee">الموظف المعني (Specific Employee)</option>
                  <option value="department_all">كافة موظفي القسم (All Department Staff)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">القنوات الافتراضية:</label>
                <select
                  value={editingRule.default_channels}
                  onChange={e => setEditingRule({ ...editingRule, default_channels: e.target.value })}
                  className={`w-full p-2 rounded-xl border outline-none font-bold ${
                    isDark ? 'bg-slate-900 border-white/10' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="both">كلاهما (تطبيق + بريد)</option>
                  <option value="app">تطبيق الموظف فقط</option>
                  <option value="email">البريد المؤسسي فقط</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingRule.allow_multiple_recipients)}
                    onChange={e => setEditingRule({ ...editingRule, allow_multiple_recipients: e.target.checked ? 1 : 0 })}
                  />
                  <span>السماح بتعدد المستلمين</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingRule.allow_sender_override)}
                    onChange={e => setEditingRule({ ...editingRule, allow_sender_override: e.target.checked ? 1 : 0 })}
                  />
                  <span>سماح للمرسل بتغيير المستلم</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingRule.requires_approval)}
                    onChange={e => setEditingRule({ ...editingRule, requires_approval: e.target.checked ? 1 : 0 })}
                  />
                  <span>يتطلب موافقة قبل التسليم</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(editingRule.allow_additional_attachments)}
                    onChange={e => setEditingRule({ ...editingRule, allow_additional_attachments: e.target.checked ? 1 : 0 })}
                  />
                  <span>السماح بمرفقات إضافية</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/10 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Details Drawer / Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-2xl p-6 rounded-3xl border shadow-2xl max-h-[90vh] overflow-y-auto ${
            isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="font-bold text-sm">تفاصيل عملية التسليم والسجل التدقيقي</h3>
                <p className="text-xs font-mono text-teal-600">{selectedDelivery.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-black/10">
                <div><strong>المستند:</strong> {selectedDelivery.document_title}</div>
                <div><strong>نوع المستند:</strong> {selectedDelivery.document_type}</div>
                <div><strong>المرسل:</strong> {selectedDelivery.sender_name}</div>
                <div><strong>المستلم:</strong> {selectedDelivery.recipient_name} ({selectedDelivery.recipient_email})</div>
                <div><strong>تاريخ الإنشاء:</strong> {selectedDelivery.created_at}</div>
                <div><strong>الحالة العامة:</strong> <span className="font-bold text-teal-600">{selectedDelivery.overall_status}</span></div>
              </div>

              {/* Channel Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold">حالة القنوات المستقلة:</h4>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 space-y-1">
                  <div><strong>تطبيق الموظف:</strong> {selectedDelivery.app_status} (تم التسليم: {selectedDelivery.app_delivered_at || '-'} / تم الاطلاع: {selectedDelivery.app_read_at || 'لم يُقرأ بعد'})</div>
                  <div><strong>بريد Microsoft 365:</strong> {selectedDelivery.email_status} (رسالة المعرف: {selectedDelivery.email_message_id || '-'})</div>
                  {selectedDelivery.email_error && (
                    <div className="text-rose-500 font-mono text-[11px]">خطأ البريد: {selectedDelivery.email_error}</div>
                  )}
                </div>
              </div>

              {/* Message */}
              {selectedDelivery.message && (
                <div>
                  <h4 className="font-bold mb-1">نص الرسالة:</h4>
                  <p className="p-3 rounded-xl bg-black/10 whitespace-pre-wrap">{selectedDelivery.message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
