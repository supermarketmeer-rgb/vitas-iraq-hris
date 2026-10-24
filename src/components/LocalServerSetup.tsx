import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
type StepStatus = 'idle' | 'running' | 'done' | 'warn' | 'error' | 'needs_action';

interface StepState {
  status: StepStatus;
  logs: string[];
  details?: Record<string, any>;
}

type StepKey =
  | 'requirements'
  | 'environment'
  | 'database'
  | 'api'
  | 'network'
  | 'autostart'
  | 'sync'
  | 'test';

const STEP_KEYS: StepKey[] = [
  'requirements',
  'environment',
  'database',
  'api',
  'network',
  'autostart',
  'sync',
  'test',
];

const STEP_LABELS_AR: Record<StepKey, string> = {
  requirements: 'فحص المتطلبات',
  environment: 'تجهيز بيئة التشغيل',
  database: 'إعداد قاعدة البيانات',
  api: 'إعداد API المحلي',
  network: 'إعداد الشبكة المحلية',
  autostart: 'إعداد التشغيل التلقائي',
  sync: 'إعداد المزامنة السحابية',
  test: 'اختبار النظام الشامل',
};

const STEP_LABELS_EN: Record<StepKey, string> = {
  requirements: 'Requirements Check',
  environment: 'Runtime Environment Setup',
  database: 'Local Database Setup',
  api: 'Local API Setup',
  network: 'LAN Network Setup',
  autostart: 'Auto-Start (Windows Service)',
  sync: 'Cloud Sync Setup',
  test: 'System Test',
};

const STEP_ICONS: Record<StepKey, string> = {
  requirements: 'fact_check',
  environment: 'build',
  database: 'storage',
  api: 'api',
  network: 'lan',
  autostart: 'start',
  sync: 'sync',
  test: 'verified',
};

const statusColors: Record<StepStatus, { bg: string; text: string; border: string; icon: string }> = {
  idle:         { bg: 'bg-slate-800/60',   text: 'text-slate-400', border: 'border-slate-700',   icon: 'radio_button_unchecked' },
  running:      { bg: 'bg-blue-900/40',    text: 'text-blue-300',  border: 'border-blue-600',    icon: 'progress_activity' },
  done:         { bg: 'bg-teal-900/40',    text: 'text-teal-300',  border: 'border-teal-600',    icon: 'check_circle' },
  warn:         { bg: 'bg-amber-900/40',   text: 'text-amber-300', border: 'border-amber-600',   icon: 'warning' },
  error:        { bg: 'bg-rose-900/40',    text: 'text-rose-300',  border: 'border-rose-600',    icon: 'error' },
  needs_action: { bg: 'bg-purple-900/40',  text: 'text-purple-300',border: 'border-purple-600',  icon: 'pending_actions' },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Helper: call local API endpoint
───────────────────────────────────────────────────────────────────────────── */
async function callSetupApi(endpoint: string, body?: Record<string, any>) {
  const res = await fetch(`/api/local-setup/${endpoint}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(errJson.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Persist setup state in localStorage so user can resume
───────────────────────────────────────────────────────────────────────────── */
const STORAGE_KEY = 'vitas_local_setup_state';

function loadPersistedState(): Partial<Record<StepKey, StepState>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistState(steps: Record<StepKey, StepState>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(steps)); } catch {}
}

/* ─────────────────────────────────────────────────────────────────────────────
   Default step state factory
───────────────────────────────────────────────────────────────────────────── */
function defaultSteps(): Record<StepKey, StepState> {
  const persisted = loadPersistedState();
  const result = {} as Record<StepKey, StepState>;
  for (const key of STEP_KEYS) {
    result[key] = persisted[key] ?? { status: 'idle', logs: [] };
  }
  return result;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────────────────── */
export const LocalServerSetup: React.FC = () => {
  const { language, theme, currentUser } = useApp();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  /* Permission guard: only Super Admin / can_manage_settings users */
  const isSuperAdmin =
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Admin' ||
    Boolean(currentUser?.can_manage_settings);

  const [steps, setSteps] = useState<Record<StepKey, StepState>>(defaultSteps);
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [expandedStep, setExpandedStep] = useState<StepKey | null>(null);
  const [serverInfo, setServerInfo] = useState<Record<string, any> | null>(null);
  const [fullReport, setFullReport] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll logs */
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [steps]);

  /* Persist whenever steps change */
  useEffect(() => {
    persistState(steps);
  }, [steps]);

  /* Load saved server info from setup if any */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vitas_local_server_info');
      if (saved) setServerInfo(JSON.parse(saved));
    } catch {}
  }, []);

  /* ── Helper: update single step ── */
  const updateStep = useCallback((key: StepKey, patch: Partial<StepState>) => {
    setSteps(prev => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      persistState(next);
      return next;
    });
  }, []);

  const appendLog = useCallback((key: StepKey, line: string) => {
    setSteps(prev => {
      const next = {
        ...prev,
        [key]: { ...prev[key], logs: [...prev[key].logs, `[${new Date().toLocaleTimeString()}] ${line}`] },
      };
      persistState(next);
      return next;
    });
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     Step Runners
  ───────────────────────────────────────────────────────────────────────── */

  /** STEP 1 – Requirements */
  const runRequirements = async () => {
    const key: StepKey = 'requirements';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'بدء فحص متطلبات النظام...' : 'Starting system requirements check...');

    try {
      const data = await callSetupApi('check-requirements');
      const checks: Array<{ label: string; ok: boolean; value?: string; fix?: string }> = data.checks || [];

      for (const c of checks) {
        appendLog(key, `${c.ok ? '✅' : '❌'} ${c.label}${c.value ? ` — ${c.value}` : ''}${!c.ok && c.fix ? ` ⚠️ ${c.fix}` : ''}`);
      }

      const allOk = checks.every(c => c.ok);
      const anyFail = checks.some(c => !c.ok);

      if (allOk) {
        appendLog(key, isAr ? '✅ جميع المتطلبات متوفرة.' : '✅ All requirements satisfied.');
        updateStep(key, { status: 'done', details: data });
      } else if (anyFail) {
        appendLog(key, isAr ? '⚠️ بعض المتطلبات غير متوفرة. راجع التفاصيل أعلاه.' : '⚠️ Some requirements missing. Review details above.');
        updateStep(key, { status: 'needs_action', details: data });
      } else {
        updateStep(key, { status: 'warn', details: data });
      }
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      updateStep(key, { status: 'error' });
    }
    setActiveStep(null);
  };

  /** STEP 2 – Environment */
  const runEnvironment = async () => {
    const key: StepKey = 'environment';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'تجهيز بيئة التشغيل...' : 'Setting up runtime environment...');

    try {
      const data = await callSetupApi('check-environment');
      for (const line of (data.info || [])) {
        appendLog(key, `ℹ️ ${line}`);
      }
      updateStep(key, { status: data.ready ? 'done' : 'warn', details: data });
      appendLog(key, data.ready
        ? (isAr ? '✅ بيئة التشغيل جاهزة.' : '✅ Runtime environment ready.')
        : (isAr ? '⚠️ بيئة التشغيل تحتاج إلى مراجعة.' : '⚠️ Environment needs review.'));
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      updateStep(key, { status: 'error' });
    }
    setActiveStep(null);
  };

  /** STEP 3 – Database */
  const runDatabase = async () => {
    const key: StepKey = 'database';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'فحص قاعدة البيانات المحلية...' : 'Checking local database...');

    try {
      const data = await callSetupApi('setup-database');
      for (const line of (data.logs || [])) {
        appendLog(key, `ℹ️ ${line}`);
      }
      if (data.existingDatabase) {
        appendLog(key, isAr
          ? `✅ تم اكتشاف قاعدة بيانات موجودة: ${data.existingDatabase} (${data.tablesCount} جداول). لم يتم إجراء أي تعديل عليها.`
          : `✅ Existing database detected: ${data.existingDatabase} (${data.tablesCount} tables). No changes made.`);
        updateStep(key, { status: 'done', details: data });
      } else if (data.created) {
        appendLog(key, isAr
          ? `✅ تم إنشاء قاعدة البيانات وتجهيز الجداول بنجاح.`
          : `✅ Database created and tables initialized successfully.`);
        updateStep(key, { status: 'done', details: data });
      } else {
        appendLog(key, isAr ? '⚠️ الوضع غير محدد — تحقق من التفاصيل.' : '⚠️ Unclear state — check details.');
        updateStep(key, { status: 'warn', details: data });
      }
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      if (err.message.includes('Access denied') || err.message.includes('ECONNREFUSED')) {
        appendLog(key, isAr
          ? '⚠️ تعذر الاتصال بـ MySQL. تأكد من تشغيل MySQL وصحة بيانات الاتصال.'
          : '⚠️ Cannot connect to MySQL. Ensure MySQL is running and credentials are correct.');
        updateStep(key, { status: 'needs_action' });
      } else {
        updateStep(key, { status: 'error' });
      }
    }
    setActiveStep(null);
  };

  /** STEP 4 – API */
  const runApi = async () => {
    const key: StepKey = 'api';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'فحص حالة API المحلي...' : 'Checking local API status...');

    try {
      const health = await callSetupApi('check-api');
      appendLog(key, `✅ API ${isAr ? 'يستجيب على' : 'responding at'} ${health.url || '/api/health'}`);
      appendLog(key, `ℹ️ ${isAr ? 'الدور' : 'Role'}: ${health.role || 'LOCAL_SERVER'}`);
      appendLog(key, `ℹ️ ${isAr ? 'قاعدة البيانات' : 'DB'}: ${health.database || 'CONNECTED'}`);
      updateStep(key, { status: 'done', details: health });
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      appendLog(key, isAr
        ? '⚠️ API غير متاح. تأكد من تشغيل node server.js على المنفذ 5000.'
        : '⚠️ API not reachable. Ensure node server.js is running on port 5000.');
      updateStep(key, { status: 'error' });
    }
    setActiveStep(null);
  };

  /** STEP 5 – Network */
  const runNetwork = async () => {
    const key: StepKey = 'network';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'اكتشاف بيانات الشبكة المحلية...' : 'Discovering LAN network info...');

    try {
      const data = await callSetupApi('network-info');
      const info = data.info || {};

      if (info.localIp) {
        appendLog(key, `ℹ️ ${isAr ? 'عنوان IP المحلي' : 'Local IP'}: ${info.localIp}`);
        appendLog(key, `🔗 ${isAr ? 'رابط الوصول من الشبكة الداخلية' : 'LAN Access URL'}: http://${info.localIp}:${info.port || 5000}`);
        appendLog(key, `ℹ️ ${isAr ? 'اسم الجهاز' : 'Hostname'}: ${info.hostname || 'N/A'}`);
        if (info.firewall) {
          appendLog(key, `🛡️ ${isAr ? 'جدار الحماية' : 'Firewall'}: ${info.firewall}`);
        }
        // Save server info for display
        const si = {
          localIp: info.localIp,
          port: info.port || 5000,
          hostname: info.hostname,
          lanUrl: `http://${info.localIp}:${info.port || 5000}`,
        };
        setServerInfo(si);
        localStorage.setItem('vitas_local_server_info', JSON.stringify(si));
        updateStep(key, { status: 'done', details: data });
        appendLog(key, isAr
          ? '✅ بيانات الشبكة جاهزة. يمكن للأجهزة الأخرى الاتصال عبر الرابط المذكور.'
          : '✅ Network info ready. Other devices can connect via the LAN URL above.');
        appendLog(key, isAr
          ? '⚠️ ملاحظة: اختبار الوصول من هذا الجهاز لا يضمن وصول باقي الأجهزة. قد تحتاج لفتح المنفذ في Windows Firewall يدوياً.'
          : '⚠️ Note: Testing from this machine does not guarantee access from other devices. You may need to allow the port in Windows Firewall manually.');
      } else {
        appendLog(key, isAr ? '⚠️ تعذر تحديد عنوان IP. تحقق من اتصال الشبكة.' : '⚠️ Could not determine local IP. Check network connection.');
        updateStep(key, { status: 'warn', details: data });
      }
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      updateStep(key, { status: 'error' });
    }
    setActiveStep(null);
  };

  /** STEP 6 – Autostart */
  const runAutostart = async () => {
    const key: StepKey = 'autostart';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'فحص إعداد التشغيل التلقائي...' : 'Checking auto-start configuration...');

    try {
      const data = await callSetupApi('check-autostart');
      for (const line of (data.info || [])) {
        appendLog(key, `ℹ️ ${line}`);
      }
      if (data.configured) {
        appendLog(key, isAr ? '✅ الخدمات مضبوطة للبدء تلقائياً.' : '✅ Services configured for auto-start.');
        updateStep(key, { status: 'done', details: data });
      } else {
        appendLog(key, isAr
          ? '⚠️ التشغيل التلقائي غير مضبوط حالياً. راجع الإرشادات أدناه لإعداد خدمة Windows.'
          : '⚠️ Auto-start not yet configured. See instructions below to set up Windows Service.');
        appendLog(key, isAr
          ? '📋 الطريقة الموصى بها: استخدام NSSM (Non-Sucking Service Manager) لتشغيل node server.js كخدمة Windows.'
          : '📋 Recommended: Use NSSM (Non-Sucking Service Manager) to run node server.js as a Windows Service.');
        appendLog(key, '1. ' + (isAr ? 'حمّل NSSM من https://nssm.cc/download' : 'Download NSSM from https://nssm.cc/download'));
        appendLog(key, '2. ' + (isAr ? 'شغّل: nssm install VITASHRMSServer' : 'Run: nssm install VITASHRMSServer'));
        appendLog(key, '3. ' + (isAr ? `اضبط المسار: ${data.nodePath || 'C:\\Program Files\\nodejs\\node.exe'}` : `Set path: ${data.nodePath || 'C:\\Program Files\\nodejs\\node.exe'}`));
        appendLog(key, '4. ' + (isAr ? `اضبط المجلد والوسيط: ${data.projectPath || process.cwd()}\\server.js` : `Set dir & args: ${data.projectPath || ''}\\server.js`));
        appendLog(key, '5. ' + (isAr ? 'شغّل: nssm start VITASHRMSServer' : 'Run: nssm start VITASHRMSServer'));
        updateStep(key, { status: 'needs_action', details: data });
      }
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      updateStep(key, { status: 'error' });
    }
    setActiveStep(null);
  };

  /** STEP 7 – Sync */
  const runSync = async () => {
    const key: StepKey = 'sync';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'فحص اتصال قاعدة البيانات السحابية...' : 'Checking cloud database connection...');

    try {
      const data = await callSetupApi('check-sync');
      for (const line of (data.info || [])) {
        appendLog(key, `ℹ️ ${line}`);
      }
      if (data.cloudReachable) {
        appendLog(key, isAr ? '✅ الاتصال بقاعدة Railway متاح.' : '✅ Railway cloud database reachable.');
        appendLog(key, isAr
          ? `ℹ️ آلية المزامنة: ${data.syncMode || 'Bidirectional Full Table Sync (every 60s) + Realtime SSE'}`
          : `ℹ️ Sync mode: ${data.syncMode || 'Bidirectional Full Table Sync (every 60s) + Realtime SSE'}`);
        if (data.warnings && data.warnings.length > 0) {
          for (const w of data.warnings) {
            appendLog(key, `⚠️ ${w}`);
          }
          updateStep(key, { status: 'warn', details: data });
        } else {
          updateStep(key, { status: 'done', details: data });
        }
      } else {
        appendLog(key, isAr
          ? `⚠️ لا يوجد اتصال بالسحابة حالياً (${data.reason || 'انقطاع الإنترنت أو لم تُضبط بيانات الاتصال'}).`
          : `⚠️ Cloud unreachable: ${data.reason || 'No internet or cloud credentials not set.'}`);
        appendLog(key, isAr
          ? 'ℹ️ يمكن اكتمال إعداد الخادم المحلي دون الاتصال السحابي. ستبدأ المزامنة تلقائياً عند عودة الإنترنت.'
          : 'ℹ️ Local setup can complete without cloud. Sync starts automatically when internet is restored.');
        updateStep(key, { status: 'warn', details: data });
      }
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      updateStep(key, { status: 'error' });
    }
    setActiveStep(null);
  };

  /** STEP 8 – System Test */
  const runTest = async () => {
    const key: StepKey = 'test';
    updateStep(key, { status: 'running', logs: [] });
    setActiveStep(key);
    setExpandedStep(key);
    appendLog(key, isAr ? 'تنفيذ اختبارات التحقق الشامل...' : 'Running comprehensive verification tests...');

    try {
      const data = await callSetupApi('run-tests');
      const tests: Array<{ name: string; passed: boolean; message?: string }> = data.tests || [];

      for (const t of tests) {
        appendLog(key, `${t.passed ? '✅' : '❌'} ${t.name}${t.message ? ` — ${t.message}` : ''}`);
      }

      const passed = tests.filter(t => t.passed).length;
      const total = tests.length;
      const allPassed = passed === total;

      appendLog(key, `\n📊 ${isAr ? 'النتيجة' : 'Result'}: ${passed}/${total} ${isAr ? 'اختبار ناجح' : 'tests passed'}`);

      if (allPassed) {
        appendLog(key, isAr
          ? '🎉 جميع الاختبارات نجحت! الخادم المحلي جاهز للاستخدام.'
          : '🎉 All tests passed! Local server is ready for use.');
        updateStep(key, { status: 'done', details: data });
        buildFinalReport(tests, data);
      } else {
        appendLog(key, isAr
          ? '⚠️ بعض الاختبارات لم تنجح. راجع السجلات وأصلح المشكلات قبل الاستخدام.'
          : '⚠️ Some tests failed. Review logs and fix issues before production use.');
        updateStep(key, { status: 'warn', details: data });
        buildFinalReport(tests, data);
      }
    } catch (err: any) {
      appendLog(key, `❌ ${err.message}`);
      updateStep(key, { status: 'error' });
    }
    setActiveStep(null);
  };

  /* Build final report string */
  const buildFinalReport = (tests: any[], data: any) => {
    const lines: string[] = [
      `=== VITAS Iraq HRMS — Local Server Setup Report ===`,
      `Date: ${new Date().toLocaleString()}`,
      ``,
      `--- Step Summary ---`,
    ];
    for (const k of STEP_KEYS) {
      lines.push(`${STEP_LABELS_EN[k as StepKey]}: ${steps[k as StepKey].status.toUpperCase()}`);
    }
    lines.push('');
    lines.push('--- Test Results ---');
    for (const t of tests) {
      lines.push(`${t.passed ? 'PASS' : 'FAIL'} ${t.name}${t.message ? ` - ${t.message}` : ''}`);
    }
    if (serverInfo) {
      lines.push('');
      lines.push('--- Server Info ---');
      lines.push(`Local IP: ${serverInfo.localIp}`);
      lines.push(`LAN URL: ${serverInfo.lanUrl}`);
      lines.push(`Hostname: ${serverInfo.hostname}`);
    }
    setFullReport(lines.join('\n'));
  };

  /* Run all steps sequentially */
  const runAll = async () => {
    setIsRunningAll(true);
    await runRequirements();
    await runEnvironment();
    await runDatabase();
    await runApi();
    await runNetwork();
    await runAutostart();
    await runSync();
    await runTest();
    setIsRunningAll(false);
  };

  /* Reset everything */
  const resetAll = () => {
    if (!window.confirm(isAr ? 'هل تريد مسح نتائج التثبيت والبدء من جديد؟' : 'Clear all setup results and restart?')) return;
    const fresh = {} as Record<StepKey, StepState>;
    for (const k of STEP_KEYS) fresh[k as StepKey] = { status: 'idle', logs: [] };
    setSteps(fresh);
    setFullReport(null);
    setExpandedStep(null);
    setServerInfo(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('vitas_local_server_info');
  };

  /* Step runners map */
  const stepRunners: Record<StepKey, () => Promise<void>> = {
    requirements: runRequirements,
    environment: runEnvironment,
    database: runDatabase,
    api: runApi,
    network: runNetwork,
    autostart: runAutostart,
    sync: runSync,
    test: runTest,
  };

  /* ─── Render ─── */
  if (!isSuperAdmin) {
    return (
      <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <span className="material-symbols-outlined text-5xl text-rose-400 mb-4">lock</span>
        <p className="text-slate-400 text-sm font-medium">
          {isAr ? 'صلاحية المدير فقط — Local Server Setup' : 'Admin permission required — Local Server Setup'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" dir={isAr ? 'rtl' : 'ltr'}>

      {/* Header Banner */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 border-teal-800/40' : 'bg-gradient-to-br from-teal-50 to-white border-teal-200'} shadow-lg`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/30">
              <span className="material-symbols-outlined text-3xl">dns</span>
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {isAr ? 'إعداد وتثبيت الخادم المحلي' : 'Local Server Setup & Installation'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isAr
                  ? 'معالج متعدد المراحل لتجهيز هذا الجهاز كخادم محلي للمكتب مع مزامنة سحابية Railway'
                  : 'Multi-step wizard to configure this machine as a local office server with Railway cloud sync'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={runAll}
              disabled={isRunningAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-semibold text-sm transition-all shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-sm ${isRunningAll ? 'animate-spin' : ''}`}>
                {isRunningAll ? 'progress_activity' : 'play_arrow'}
              </span>
              {isAr ? 'تثبيت الخادم المحلي' : 'Install Local Server'}
            </button>
            <button
              onClick={resetAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-600 hover:border-rose-500 text-slate-400 hover:text-rose-400 text-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              {isAr ? 'إعادة البدء' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* Server Info Card — shown after network step */}
      {serverInfo && (
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-teal-950/30 border-teal-700/40' : 'bg-teal-50 border-teal-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="material-symbols-outlined text-teal-400 text-xl">lan</span>
            <span className={`font-bold text-sm ${isDark ? 'text-teal-300' : 'text-teal-700'}`}>
              {isAr ? 'بيانات الخادم المحلي' : 'Local Server Info'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-black/30' : 'bg-white'} border ${isDark ? 'border-teal-800/40' : 'border-teal-200'}`}>
              <div className="text-slate-400 mb-1">{isAr ? 'عنوان IP' : 'IP Address'}</div>
              <div className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{serverInfo.localIp}</div>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-black/30' : 'bg-white'} border ${isDark ? 'border-teal-800/40' : 'border-teal-200'}`}>
              <div className="text-slate-400 mb-1">{isAr ? 'رابط الوصول عبر الشبكة' : 'LAN Access URL'}</div>
              <div className="font-mono font-bold text-teal-400 break-all">{serverInfo.lanUrl}</div>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-black/30' : 'bg-white'} border ${isDark ? 'border-teal-800/40' : 'border-teal-200'}`}>
              <div className="text-slate-400 mb-1">{isAr ? 'اسم الجهاز' : 'Hostname'}</div>
              <div className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{serverInfo.hostname || 'N/A'}</div>
            </div>
          </div>
          <p className="text-[11px] text-amber-400 mt-3 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">info</span>
            {isAr
              ? 'افتح هذا الرابط من أي حاسوب في الشبكة الداخلية للوصول إلى التطبيق. إذا تغيّر عنوان IP، حدّث الرابط من إعدادات Desktop Sync.'
              : 'Open this URL from any device on the local network to access the application. If IP changes, update via Desktop Sync settings.'}
          </p>
        </div>
      )}

      {/* Step Cards */}
      <div className="space-y-3">
        {STEP_KEYS.map((key, index) => {
          const step = steps[key];
          const colors = statusColors[step.status];
          const isExpanded = expandedStep === key;
          const label = isAr ? STEP_LABELS_AR[key] : STEP_LABELS_EN[key];
          const icon = STEP_ICONS[key];

          return (
            <div
              key={key}
              className={`rounded-2xl border ${colors.border} ${colors.bg} transition-all duration-200`}
            >
              {/* Step header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={() => setExpandedStep(isExpanded ? null : key)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${colors.border} ${colors.bg}`}>
                    {index + 1}
                  </div>
                  <span className={`material-symbols-outlined ${colors.text} text-lg`}>{icon}</span>
                  <span className={`font-semibold text-sm ${colors.text}`}>{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status badge */}
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${colors.border} ${colors.bg} ${colors.text}`}>
                    {isAr
                      ? { idle: 'لم يبدأ', running: 'قيد التنفيذ', done: 'مكتمل', warn: 'تحذير', error: 'فشل', needs_action: 'يحتاج تدخل' }[step.status]
                      : { idle: 'Idle', running: 'Running', done: 'Done', warn: 'Warning', error: 'Failed', needs_action: 'Action Needed' }[step.status]
                    }
                  </span>
                  <span className={`material-symbols-outlined ${colors.text} text-sm ${step.status === 'running' ? 'animate-spin' : ''}`}>
                    {step.status === 'running' ? 'progress_activity' : colors.icon}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); stepRunners[key](); }}
                    disabled={activeStep !== null || isRunningAll}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-40 ${
                      step.status === 'idle'
                        ? 'border-slate-600 text-slate-300 hover:border-teal-500 hover:text-teal-300'
                        : 'border-slate-700 text-slate-400 hover:border-blue-500 hover:text-blue-300'
                    }`}
                    title={isAr ? 'تشغيل هذه الخطوة' : 'Run this step'}
                  >
                    {step.status === 'running'
                      ? (isAr ? 'جارٍ...' : 'Running...')
                      : step.status === 'idle'
                        ? (isAr ? 'تشغيل' : 'Run')
                        : (isAr ? 'إعادة' : 'Re-run')}
                  </button>
                  <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </div>
              </div>

              {/* Step logs (expanded) */}
              {isExpanded && step.logs.length > 0 && (
                <div className={`px-4 pb-4 space-y-1`}>
                  <div className={`rounded-xl border ${isDark ? 'bg-black/50 border-slate-800' : 'bg-slate-900 border-slate-700'} p-3 max-h-72 overflow-y-auto font-mono text-[11px] space-y-0.5`}>
                    {step.logs.map((line, i) => (
                      <div key={i} className={`leading-relaxed ${
                        line.startsWith('❌') ? 'text-rose-400'
                        : line.startsWith('✅') ? 'text-teal-400'
                        : line.startsWith('⚠️') ? 'text-amber-400'
                        : line.startsWith('🔗') ? 'text-blue-400'
                        : line.startsWith('📊') ? 'text-purple-400'
                        : line.startsWith('🎉') ? 'text-yellow-400'
                        : 'text-slate-300'
                      }`}>
                        {line}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection Test Button */}
      <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-blue-400 text-xl">network_check</span>
          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {isAr ? 'اختبار الاتصال السريع' : 'Quick Connection Test'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={runApi}
            disabled={activeStep !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-600 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">api</span>
            {isAr ? 'اختبار API المحلي' : 'Test Local API'}
          </button>
          <button
            onClick={runDatabase}
            disabled={activeStep !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600/20 border border-teal-600 text-teal-400 text-xs font-medium hover:bg-teal-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">storage</span>
            {isAr ? 'اختبار قاعدة البيانات' : 'Test Database'}
          </button>
          <button
            onClick={runSync}
            disabled={activeStep !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-600 text-purple-400 text-xs font-medium hover:bg-purple-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            {isAr ? 'اختبار اتصال السحابة' : 'Test Cloud Connection'}
          </button>
          <button
            onClick={runNetwork}
            disabled={activeStep !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600/20 border border-amber-600 text-amber-400 text-xs font-medium hover:bg-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">lan</span>
            {isAr ? 'عنوان IP والشبكة' : 'Network & IP Info'}
          </button>
        </div>
      </div>

      {/* Final Report */}
      {fullReport && (
        <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-900 border-slate-700'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-400 text-xl">summarize</span>
              <span className="text-teal-300 font-bold text-sm">
                {isAr ? 'تقرير التثبيت النهائي' : 'Final Installation Report'}
              </span>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(fullReport); alert(isAr ? 'تم نسخ التقرير' : 'Report copied to clipboard'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 text-xs hover:border-teal-500 hover:text-teal-300 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              {isAr ? 'نسخ التقرير' : 'Copy Report'}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
            {fullReport}
          </pre>
        </div>
      )}

      {/* Help Section */}
      <div className={`rounded-2xl border p-5 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-amber-400 text-xl">help_outline</span>
          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
            {isAr ? 'إرشادات الاستخدام والصيانة' : 'Usage & Maintenance Guide'}
          </span>
        </div>
        <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
          <p>🖥️ {isAr
            ? 'يجب أن يكون هذا الجهاز يعمل دائماً لكي تتمكن أجهزة المكتب الأخرى من الاتصال به.'
            : 'This machine must remain powered on for other office devices to connect.'}</p>
          <p>🔌 {isAr
            ? 'وصّل جهاز UPS (احتياط للطاقة) لضمان استمرار الخدمة عند انقطاع الكهرباء.'
            : 'Connect a UPS (power backup) to ensure service continuity during power outages.'}</p>
          <p>🌐 {isAr
            ? 'إذا تغيّر عنوان IP للخادم المحلي، يجب على كل موظف تحديث رابط الخادم في إعدادات Desktop Sync.'
            : 'If the local server IP changes, each user must update the server URL in Desktop Sync settings.'}</p>
          <p>💾 {isAr
            ? 'خذ نسخة احتياطية يومية من قاعدة البيانات باستخدام: mysqldump -u root vitasiraq_hris_db > backup.sql'
            : 'Take daily backups using: mysqldump -u root vitasiraq_hris_db > backup.sql'}</p>
          <p>🔄 {isAr
            ? 'المزامنة مع Railway تعمل تلقائياً كل 60 ثانية ما دام الإنترنت متصلاً.'
            : 'Sync with Railway runs automatically every 60 seconds while internet is connected.'}</p>
          <p>🛑 {isAr
            ? 'لإيقاف الخادم: استخدم NSSM stop VITASHRMSServer أو أوقف خدمة MySQL من إدارة Windows.'
            : 'To stop server: use NSSM stop VITASHRMSServer or stop MySQL service from Windows Services.'}</p>
        </div>
      </div>

    </div>
  );
};
