import React, { useState } from 'react';
import { useExecutiveContext, BranchPerformance } from '../context/ExecutiveContext';
import { 
  Building2, 
  Search, 
  MapPin, 
  PhoneCall, 
  MessageSquare, 
  Users, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export const ExecutiveBranches: React.FC = () => {
  const { branches, theme, language, t } = useExecutiveContext();
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>('all');

  const governorates = ['all', 'بغداد', 'البصرة', 'أربيل', 'السليمانية', 'النجف', 'كربلاء', 'نينوى', 'كركوك', 'واسط', 'بابل', 'ذي قار', 'القادسية', 'ميسان'];

  const filteredBranches = branches.filter(b => {
    if (selectedGovernorate !== 'all' && b.governorate !== selectedGovernorate) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.nameAr.toLowerCase().includes(q) || b.nameEn.toLowerCase().includes(q);
      const matchManager = b.managerName.toLowerCase().includes(q) || b.code.toLowerCase().includes(q);
      if (!matchName && !matchManager) return false;
    }
    return true;
  });

  const totalHeadcount = branches.reduce((acc, b) => acc + b.headcount, 0);
  const totalPayroll = branches.reduce((acc, b) => acc + b.monthlyPayrollIqd, 0);

  const formatIqd = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <div className="p-3.5 space-y-4 pb-20 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
            {t('شبكة الفروع والأقاليم العراقية', 'Iraqi Branches & Regional Network')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('المتابعة المباشرة لـ 16 فرعاً في كافة المحافظات', 'Direct operational telemetry of 16 branches across Iraq')}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 font-mono text-xs font-bold">
          16 {t('فرعاً نشطاً', 'Active')}
        </span>
      </div>

      {/* High-Level Regional Summary Strip */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-medium">{t('إجمالي كوادر الفروع', 'Branch Total Staff')}</div>
          <div className="text-base font-bold text-amber-400 mt-0.5">{totalHeadcount.toLocaleString()} {t('موظف', 'staff')}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            <span>97.2% {t('متوسط الحضور', 'avg attendance')}</span>
          </div>
        </div>

        <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-[10px] text-slate-400 font-medium">{t('كتلة رواتب الفروع', 'Total Branch Payroll')}</div>
          <div className="text-base font-bold text-teal-400 mt-0.5">{(totalPayroll / 1000000000).toFixed(3)}B {t('د.ع', 'IQD')}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            100% {t('امتثال بنكي وقانوني', 'statutory compliant')}
          </div>
        </div>
      </div>

      {/* Governorate Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
        {governorates.map(gov => (
          <button
            key={gov}
            onClick={() => setSelectedGovernorate(gov)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all cursor-pointer ${
              selectedGovernorate === gov
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                : 'bg-slate-800/60 border border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            {gov === 'all' ? t('كافة المحافظات', 'All Governorates') : gov}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder={t('بحث باسم الفرع، المحافظة، أو مدير الفرع...', 'Search branch, governorate, or manager...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={`w-full ps-9 pe-3 py-2 rounded-xl text-xs outline-none border transition-all ${
            isDark 
              ? 'bg-slate-900/90 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500' 
              : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-600'
          }`}
        />
      </div>

      {/* Branches List Cards */}
      <div className="space-y-3">
        {filteredBranches.map(branch => {
          const isWarning = branch.operationalStatus === 'warning';

          return (
            <div
              key={branch.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isDark 
                  ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Branch Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                    isWarning 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                      : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                  }`}>
                    {branch.code}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white dark:text-white light:text-slate-900" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                      {isAr ? branch.nameAr : branch.nameEn}
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{branch.governorate}</span>
                    </div>
                  </div>
                </div>

                <div className="text-end">
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {branch.performanceScore}% {t('تقييم', 'Score')}
                  </span>
                </div>
              </div>

              {/* Alert message if any */}
              {branch.activeAlert && (
                <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{branch.activeAlert}</span>
                </div>
              )}

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 mt-2.5 p-2 rounded-xl bg-slate-800/40 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">{t('الكادر', 'Staff')}</div>
                  <div className="font-bold text-slate-200 dark:text-slate-200 light:text-slate-800" style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                    {branch.headcount}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400">{t('الحضور اليوم', 'Attendance')}</div>
                  <div className="font-bold text-emerald-400">
                    {branch.attendanceRate}%
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400">{t('الرواتب / شهر', 'Payroll')}</div>
                  <div className="font-bold text-amber-400 font-mono text-[11px]">
                    {(branch.monthlyPayrollIqd / 1000000).toFixed(1)}M
                  </div>
                </div>
              </div>

              {/* Branch Manager & Direct Contacts */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800">
                <div className="text-[11px]">
                  <span className="text-slate-400 text-[10px] block">{t('مدير الفرع:', 'Branch Manager:')}</span>
                  <span className="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800" style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                    {branch.managerName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Phone Call */}
                  <a
                    href={`tel:${branch.managerPhone}`}
                    className="p-1.5 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-400 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    title={t('اتصال مباشر بمدير الفرع', 'Direct Call to Manager')}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t('اتصال', 'Call')}</span>
                  </a>

                  {/* WhatsApp Message */}
                  <a
                    href={`https://wa.me/${branch.managerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">واتساب</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
