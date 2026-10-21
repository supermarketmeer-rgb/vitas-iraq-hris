import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecutiveContext } from '../context/ExecutiveContext';
import { 
  Users, 
  Building2, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  TrendingUp, 
  ShieldAlert, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Zap, 
  Award,
  PhoneCall
} from 'lucide-react';

export const ExecutiveDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    executiveUser, 
    kpis, 
    decisions, 
    branches, 
    approveDecision, 
    rejectDecision, 
    theme, 
    language, 
    t 
  } = useExecutiveContext();

  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const pendingDecisions = decisions.filter(d => d.status === 'pending');
  const recentUrgent = pendingDecisions.slice(0, 3);

  const formatIqd = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount);
  };

  return (
    <div className="p-3.5 space-y-4 pb-20 animate-in fade-in duration-300">
      {/* 1. Welcome & Executive Greeting Card */}
      <div className={`p-4 rounded-2xl border relative overflow-hidden shadow-sm ${
        isDark 
          ? 'bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#0d1627] border-amber-500/20 text-white' 
          : 'bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 border-slate-700 text-white'
      }`}>
        <div className="absolute top-0 end-0 -mt-4 -me-4 w-32 h-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between relative z-10 gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase">
                {t('لوحة اتخاذ القرار التنفيذي', 'EXECUTIVE DECISION COCKPIT')}
              </span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">
              {t('مرحباً سيادة المدير العام،', 'Welcome, Managing Director,')}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {language === 'ar' ? executiveUser.fullNameAr : executiveUser.fullNameEn}
            </p>
          </div>

          <div className="text-end shrink-0">
            <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold block">
              16/16 {t('فرع نشط', 'Branches')}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {t('العراق بأكمله', 'All Iraq Coverage')}
            </span>
          </div>
        </div>

        {/* Action summary badge banner */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-[11px]">
              {pendingDecisions.length} {t('قرارات ومصادقات تنتظر توقيعك', 'decisions awaiting your signature')}
            </span>
          </div>
          <button
            onClick={() => navigate('/executive-app/approvals')}
            className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-0.5 cursor-pointer"
          >
            <span>{t('فتح القرارات', 'Open All')}</span>
            {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Top Strategic KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Workforce */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {t('إجمالي الكادر', 'Total Staff')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              {kpis.totalStaff.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 ms-1 font-normal">
              {t('موظف', 'employees')}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>96.8% {t('حضور اليوم', 'today attendance')}</span>
          </div>
        </div>

        {/* Monthly Payroll Total */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {t('فاتورة الرواتب', 'Monthly Payroll')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-lg font-bold tracking-tight text-amber-400">
              1.845B
            </span>
            <span className="text-[10px] text-slate-400 ms-1 font-normal">
              {t('د.ع / شهر', 'IQD / mo')}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-teal-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% {t('امتثال للضمان والضريبة', 'Tax & SS Compliant')}</span>
          </div>
        </div>

        {/* Active Branches Coverage */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {t('الفروع العاملة', 'Active Branches')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold tracking-tight text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              16 / 16
            </span>
            <span className="text-[10px] text-emerald-400 ms-1 font-bold">
              {t('نشط بالكامل', '100% Active')}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {t('بغداد، البصرة، أربيل، الموصل...', 'Baghdad, Basra, Erbil...')}
          </div>
        </div>

        {/* Budget Adherence */}
        <div className={`p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">
              {t('الانضباط المالي', 'Budget Adherence')}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <span className="text-xl font-bold tracking-tight text-emerald-400">
              98.4%
            </span>
            <span className="text-[10px] text-slate-400 ms-1 font-normal">
              {t('ضمن السقف', 'on target')}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {t('دوران الكادر: 2.1% فقط', 'Turnover: 2.1% low')}
          </div>
        </div>
      </div>

      {/* 3. Urgent Decision Radar (Direct Action from Dashboard) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-100 dark:text-slate-100 light:text-slate-900" style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}>
              {t('رادار القرارات المستعجلة', 'Urgent Decision Radar')}
            </h3>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold">
              {pendingDecisions.length}
            </span>
          </div>
          <button
            onClick={() => navigate('/executive-app/approvals')}
            className="text-[11px] text-amber-500 hover:underline font-semibold"
          >
            {t('عرض الكل', 'View All')}
          </button>
        </div>

        <div className="space-y-2.5">
          {recentUrgent.map(decision => (
            <div
              key={decision.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isDark 
                  ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/40' 
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 text-[9px] font-bold">
                      {decision.type === 'leave' && t('إجازة قيادية', 'Leadership Leave')}
                      {decision.type === 'hire' && t('تعيين قيادي', 'Leadership Hire')}
                      {decision.type === 'bonus' && t('مكافأة تميز', 'Bonus Request')}
                      {decision.type === 'contract' && t('تجديد عقود', 'Contract Renewal')}
                      {decision.type === 'overtime' && t('عمل إضافي', 'Overtime Exception')}
                      {decision.type === 'termination' && t('إنهاء خدمة', 'Settlement')}
                      {decision.type === 'budget' && t('موازنة تدريب', 'Training Budget')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {decision.branch}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 leading-snug" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {isAr ? decision.titleAr : decision.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {t('المقدم: ', 'By: ')} {decision.requesterName} ({decision.requesterRole})
                  </p>
                </div>

                {decision.amountOrDuration && (
                  <span className="px-2 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 font-mono text-[10px] font-bold shrink-0">
                    {decision.amountOrDuration}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-300 dark:text-slate-300 light:text-slate-600 mt-2 leading-relaxed bg-slate-800/40 dark:bg-slate-800/40 light:bg-slate-50 p-2 rounded-xl">
                {isAr ? decision.detailsAr : decision.detailsEn}
              </p>

              {/* Instant Decision Actions */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => navigate('/executive-app/approvals')}
                  className="text-[10px] text-slate-400 hover:text-slate-200"
                >
                  {t('التفاصيل الكاملة', 'Full Details')}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => rejectDecision(decision.id, 'مرفوض بتوجيه المدير العام')}
                    className="px-2.5 py-1.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{t('رفض', 'Reject')}</span>
                  </button>

                  <button
                    onClick={() => approveDecision(decision.id, 'معتمد ومصادق بتوقيع المدير العام')}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('اعتماد ومصادقة', 'Approve & Sign')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Quick Executive Action Buttons */}
      <div className="p-3.5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {t('إجراءات تنفيذية سريعة', 'Quick Executive Actions')}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate('/executive-app/decrees')}
            className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{t('إصدار أمر إداري', 'Issue Decree')}</span>
          </button>

          <button
            onClick={() => navigate('/executive-app/branches')}
            className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 hover:bg-teal-500/20 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="truncate">{t('خريطة أداء الفروع', 'Branch Matrix')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
