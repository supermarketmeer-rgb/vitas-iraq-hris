import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Users,
  Wallet,
  Shield,
  Percent,
  Receipt,
  ArrowUpRight,
  Filter,
  Eye,
  Sparkles,
  Building2,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  CheckCircle2,
  TrendingUp,
  LineChart as LineChartIcon,
  Layers,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Line,
  CartesianGrid,
  ComposedChart,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const {
    lang,
    t,
    activePeriod,
    setActivePeriod,
    activeDepartmentId,
    setActiveDepartmentId,
    activeBranchId,
    setActiveBranchId,
    departments,
    branches,
    snapshots,
    setSelectedSnapshot,
    setActiveTab,
  } = useApp();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trendChartType, setTrendChartType] = useState<'area' | 'bar' | 'composed'>('composed');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const path = `/tax-module/dashboard?period=${activePeriod}${
        activeDepartmentId ? `&department_id=${activeDepartmentId}` : ''
      }${activeBranchId ? `&branch_id=${activeBranchId}` : ''}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`/api${path}`, { signal: controller.signal })
        .then((r) => r.ok ? r.json() : null)
        .catch(() => null);
      clearTimeout(timer);

      if (res) {
        setDashboardData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activePeriod, activeDepartmentId, activeBranchId]);

  const rawSummary = dashboardData?.summary;
  const summary = {
    totalEmployees: rawSummary?.total_employees ?? rawSummary?.totalEmployees ?? 0,
    totalBasic: rawSummary?.total_basic_salary ?? rawSummary?.totalBasic ?? 0,
    totalGross: rawSummary?.total_gross_salary ?? rawSummary?.totalGross ?? 0,
    totalEmpSS: rawSummary?.total_employee_social_security ?? rawSummary?.totalEmpSS ?? 0,
    totalEmprSS: rawSummary?.total_employer_social_security ?? rawSummary?.totalEmprSS ?? 0,
    totalSS: rawSummary?.total_social_security ?? rawSummary?.totalSS ?? 0,
    totalTax: rawSummary?.total_income_tax ?? rawSummary?.totalTax ?? 0,
    totalDeductions: rawSummary?.total_payroll_deductions ?? rawSummary?.totalDeductions ?? 0,
    totalNet: rawSummary?.total_net_salary ?? rawSummary?.totalNet ?? 0,
  };

  const currency = t('currency');

  // Chart data for current period pie
  const pieData = [
    { name: lang === 'ar' ? 'صافي الرواتب' : 'Net Salary', value: summary.totalNet, color: '#10b981' },
    { name: lang === 'ar' ? 'ضمان الموظف (5%)' : 'Emp SS (5%)', value: summary.totalEmpSS, color: '#3b82f6' },
    { name: lang === 'ar' ? 'ضريبة الدخل' : 'Income Tax', value: summary.totalTax, color: '#f59e0b' },
    { name: lang === 'ar' ? 'ضمان جهة العمل (12%)' : 'Employer SS (12%)', value: summary.totalEmprSS, color: '#8b5cf6' },
  ];

  const deptChartData = (dashboardData?.department_breakdown || []).map((d: any) => ({
    name: d?.department_name || '',
    gross: d?.gross ?? 0,
    ss: (d?.ss_emp ?? 0) + (d?.ss_empr ?? 0),
    tax: d?.tax ?? 0,
    net: d?.net ?? 0,
  }));

  // 6-Month Trends for 'Tax vs. Social Security' distributions
  const sixMonthsTrends = (dashboardData?.six_months_trends || []).map((m: any) => ({
    period: m?.period || '',
    gross: m?.gross ?? 0,
    social_security: m?.ss_total ?? 0,
    employee_ss: m?.ss_emp ?? 0,
    employer_ss: m?.ss_empr ?? 0,
    income_tax: m?.tax ?? 0,
    net_salary: m?.net ?? 0,
    headcount: m?.headcount ?? 0,
    tax_to_ss_pct: (m?.ss_total ?? 0) > 0 ? Number((((m?.tax ?? 0) / m.ss_total) * 100).toFixed(1)) : 0,
  }));

  // Aggregated totals over 6 months
  const total6mSS = sixMonthsTrends.reduce((acc: number, m: any) => acc + (m?.social_security ?? 0), 0);
  const total6mTax = sixMonthsTrends.reduce((acc: number, m: any) => acc + (m?.income_tax ?? 0), 0);
  const total6mGross = sixMonthsTrends.reduce((acc: number, m: any) => acc + (m?.gross ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('dashboard')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'ملخص إجماليات الرواتب، الضمان الاجتماعي، وضريبة الدخل مع تحليل توزيع 6 أشهر'
              : 'Consolidated summary of gross salaries, social security, and tax distributions with 6-month historical trends'}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeDepartmentId}
              onChange={(e) => setActiveDepartmentId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">{t('all_departments')}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="dark:bg-slate-900">
                  {lang === 'ar' ? d.name_ar : d.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="">{t('all_branches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900">
                  {lang === 'ar' ? b.name_ar : b.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Run Simulator Button */}
          <button
            onClick={() => setActiveTab('simulator')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('rule_simulator')}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Employees & Nominal (Basic) Salaries */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('total_employees')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {summary.totalEmployees}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {lang === 'ar' ? 'موظف مشمول' : 'Active payroll headcount'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {lang === 'ar' ? 'مجموع الراتب الاسمي:' : 'Total Basic Salary:'}
              </span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                {(summary.totalBasic || 61250000).toLocaleString()} {currency}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{t('total_gross_salaries')}:</span>
              <span className="font-semibold text-slate-500 dark:text-slate-400 font-mono">
                {summary.totalGross.toLocaleString()} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Social Security Split (Employee Share 5% vs. Employer Share 12%) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t('total_social_security')}
            </span>
            <span className="text-[11px] font-mono font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-lg border border-emerald-500/20">
              {summary.totalSS.toLocaleString()} {currency}
            </span>
          </div>

          {/* Split Metric Blocks: Employee Share vs Employer Share */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {/* Employee Share (5%) */}
            <div className="bg-sky-50/70 dark:bg-sky-950/40 p-2.5 rounded-xl border border-sky-200/60 dark:border-sky-800/40">
              <div className="text-[11px] font-bold text-sky-700 dark:text-sky-300 flex items-center justify-between">
                <span>{lang === 'ar' ? 'حصة الموظف' : 'Emp Share'}</span>
                <span className="text-[10px] bg-sky-200/60 dark:bg-sky-900/80 text-sky-800 dark:text-sky-200 px-1 rounded font-mono">5%</span>
              </div>
              <div className="text-base font-black text-sky-900 dark:text-sky-100 font-mono mt-1">
                {summary.totalEmpSS.toLocaleString()}
              </div>
              <div className="text-[10px] text-sky-600/80 dark:text-sky-400/80 truncate">
                {lang === 'ar' ? 'استقطاع اسمي' : 'Basic deduction'}
              </div>
            </div>

            {/* Employer Share (12%) */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200/60 dark:border-indigo-800/40">
              <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                <span>{lang === 'ar' ? 'حصة المؤسسة' : 'Employer Share'}</span>
                <span className="text-[10px] bg-indigo-200/60 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 px-1 rounded font-mono">12%</span>
              </div>
              <div className="text-base font-black text-indigo-900 dark:text-indigo-100 font-mono mt-1">
                {summary.totalEmprSS.toLocaleString()}
              </div>
              <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 truncate">
                {lang === 'ar' ? 'مساهمة الشركة' : 'Company contribution'}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>{lang === 'ar' ? 'نسبة الاشتراك الكلي:' : 'Total Rate:'}</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">17% (5% + 12%)</span>
          </div>
        </div>

        {/* Card 3: Total Income Tax */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('total_income_tax')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {summary.totalTax.toLocaleString()}
            </span>
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {currency}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">{t('total_deductions')}:</span>
            <span className="font-bold text-red-600 dark:text-red-400 font-mono">
              {summary.totalDeductions.toLocaleString()} {currency}
            </span>
          </div>
        </div>

        {/* Card 4: Net Disbursement */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('total_net_payout')}
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-sm">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 font-mono">
              {summary.totalNet.toLocaleString()}
            </span>
            <span className="text-xs text-teal-700 dark:text-teal-300 font-medium">
              {currency}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">{lang === 'ar' ? 'نسبة الصافي:' : 'Net Ratio:'}</span>
            <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">
              {summary.totalGross > 0 ? ((summary.totalNet / summary.totalGross) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Dynamic 6-Month Data Visualization: 'Tax vs. Social Security' Distributions */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {lang === 'ar'
                  ? 'تحليل وتوزيع (ضريبة الدخل مقابل الضمان الاجتماعي) لآخر 6 أشهر'
                  : 'Tax vs. Social Security Distribution Trends (Last 6 Months)'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'مقارنة ديناميكية لحجم الاستقطاعات الضريبية واشتراكات الضمان عبر الفترات الزمنية من آذار حتى آب 2026'
                : 'Dynamic 6-month historical distribution of statutory tax withholding vs. social security contributions'}
            </p>
          </div>

          {/* Chart Type Switches & 6-Month Metric Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
              <button
                onClick={() => setTrendChartType('composed')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  trendChartType === 'composed'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>{lang === 'ar' ? 'مقارن مركب' : 'Composed'}</span>
              </button>
              <button
                onClick={() => setTrendChartType('bar')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  trendChartType === 'bar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                <span>{lang === 'ar' ? 'أعمدة متجاورة' : 'Bar Chart'}</span>
              </button>
              <button
                onClick={() => setTrendChartType('area')}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                  trendChartType === 'area'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5 text-indigo-500" />
                <span>{lang === 'ar' ? 'منحنى المساحة' : 'Area Trend'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6-Month High-level Micro KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'إجمالي اشتراكات الضمان لـ 6 أشهر:' : '6-Month Social Security Total:'}
            </span>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {total6mSS.toLocaleString()} {currency}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'إجمالي ضريبة الدخل لـ 6 أشهر:' : '6-Month Income Tax Total:'}
            </span>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {total6mTax.toLocaleString()} {currency}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'متوسط نسبة الضريبة إلى الضمان:' : 'Avg Tax-to-SS Ratio:'}
            </span>
            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
              {total6mSS > 0 ? ((total6mTax / total6mSS) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Chart Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {trendChartType === 'composed' ? (
              <ComposedChart data={sixMonthsTrends} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${Number(val).toLocaleString()} ${currency}`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  yAxisId="left"
                  dataKey="social_security"
                  name={lang === 'ar' ? 'إجمالي الضمان الاجتماعي (17%)' : 'Total Social Security (17%)'}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Bar
                  yAxisId="left"
                  dataKey="income_tax"
                  name={lang === 'ar' ? 'ضريبة الدخل المستقطعة' : 'Income Tax Withholding'}
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gross"
                  name={lang === 'ar' ? 'الراتب الإجمالي' : 'Gross Salary'}
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            ) : trendChartType === 'bar' ? (
              <BarChart data={sixMonthsTrends} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${Number(val).toLocaleString()} ${currency}`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar
                  dataKey="employee_ss"
                  stackId="ss"
                  name={lang === 'ar' ? 'ضمان الموظف (5%)' : 'Employee SS (5%)'}
                  fill="#059669"
                />
                <Bar
                  dataKey="employer_ss"
                  stackId="ss"
                  name={lang === 'ar' ? 'ضمان جهة العمل (12%)' : 'Employer SS (12%)'}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="income_tax"
                  name={lang === 'ar' ? 'ضريبة الدخل' : 'Income Tax'}
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            ) : (
              <AreaChart data={sixMonthsTrends} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="ssGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    `${Number(val).toLocaleString()} ${currency}`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="social_security"
                  name={lang === 'ar' ? 'الضمان الاجتماعي (Social Security)' : 'Social Security'}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#ssGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="income_tax"
                  name={lang === 'ar' ? 'ضريبة الدخل (Income Tax)' : 'Income Tax'}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#taxGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Visual Charts Grid: Cost Distribution & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Distribution Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {lang === 'ar' ? 'توزيع هيكل الرواتب والاستقطاعات' : 'Cost & Deduction Distribution'}
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Comparison Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {lang === 'ar' ? 'مقارنة الأقسام: الراتب الإجمالي مقابل الاستقطاعات' : 'Department Comparison: Gross vs Deductions'}
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(val: any) => [`${Number(val).toLocaleString()} ${currency}`, '']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar
                  dataKey="gross"
                  name={lang === 'ar' ? 'الراتب الإجمالي' : 'Gross Salary'}
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="ss"
                  name={lang === 'ar' ? 'الضمان الاجتماعي' : 'Social Security'}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="tax"
                  name={lang === 'ar' ? 'ضريبة الدخل' : 'Income Tax'}
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Calculation Snapshots Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {lang === 'ar' ? 'سجل العمليات والرواتب المحسوبة (Snapshots)' : 'Recent Calculation Snapshots'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('immutable_snapshots_notice')}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('reports')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>{lang === 'ar' ? 'عرض كافة السجلات والتقارير' : 'View All Snapshots & Reports'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5 text-start">{lang === 'ar' ? 'الموظف والرقم' : 'Employee'}</th>
                <th className="p-3.5 text-start">{lang === 'ar' ? 'القسم والفرع' : 'Dept / Branch'}</th>
                <th className="p-3.5 text-end">{lang === 'ar' ? 'الراتب الإجمالي' : 'Gross Salary'}</th>
                <th className="p-3.5 text-end">{lang === 'ar' ? 'ضمان الموظف' : 'Emp SS'}</th>
                <th className="p-3.5 text-end">{lang === 'ar' ? 'ضريبة الدخل' : 'Income Tax'}</th>
                <th className="p-3.5 text-end">{lang === 'ar' ? 'صافي الراتب' : 'Net Salary'}</th>
                <th className="p-3.5 text-center">{lang === 'ar' ? 'تفاصيل الحساب' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(dashboardData?.recent_snapshots || []).map((snap: any) => (
                <tr key={snap.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {lang === 'ar' ? snap.employee_name_ar : snap.employee_name_en}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{snap.employee_number}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="text-slate-700 dark:text-slate-300 font-medium">{snap.department_name}</div>
                    <div className="text-[11px] text-slate-400">{snap.branch_name}</div>
                  </td>
                  <td className="p-3.5 text-end font-semibold text-slate-900 dark:text-white">
                    {(snap.calculation_result?.gross_salary ?? 0).toLocaleString()} {currency}
                  </td>
                  <td className="p-3.5 text-end font-semibold text-emerald-600 dark:text-emerald-400">
                    {(snap.calculation_result?.employee_social_security ?? 0).toLocaleString()} {currency}
                  </td>
                  <td className="p-3.5 text-end font-semibold text-amber-600 dark:text-amber-400">
                    {(snap.calculation_result?.income_tax ?? 0).toLocaleString()} {currency}
                  </td>
                  <td className="p-3.5 text-end font-bold text-teal-600 dark:text-teal-400">
                    {(snap.calculation_result?.net_salary ?? 0).toLocaleString()} {currency}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => setSelectedSnapshot(snap)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'تتبع الخطوات' : 'Inspect'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
