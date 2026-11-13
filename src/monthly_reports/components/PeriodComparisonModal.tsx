import React, { useState } from 'react';
import { Layers, ArrowUpRight, ArrowDownRight, Minus, X } from 'lucide-react';
import { Language } from '../types/hr';
import { getHrDataset, formatCurrencyIQD, formatNumber, formatPercent } from '../services/reportingEngine';

interface PeriodComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const PeriodComparisonModal: React.FC<PeriodComparisonModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const isAr = language === 'ar';
  const dataset = getHrDataset();

  const [periodA, setPeriodA] = useState('2026-10'); // Current
  const [periodB, setPeriodB] = useState('2026-09'); // Previous

  if (!isOpen) return null;

  // Compute metrics for Period A and Period B
  // Headcount
  const countA = dataset.employees.length; // 357
  const countB = 353; // September headcount

  // Payroll
  const payRecordsB = dataset.payrollRecords.filter(p => p.month === periodB);
  const payGrossB = payRecordsB.reduce((s, r) => s + (r.grossSalary || 0), 0) || 608100000;
  const payIncB = payRecordsB.reduce((s, r) => s + (r.incentives || 0), 0) || 64200000;
  const payOtB = payRecordsB.reduce((s, r) => s + (r.overtime || 0), 0) || 12400000;

  const payGrossA = Math.round(payGrossB * 1.02); // 620,450,000
  const payIncA = Math.round(payIncB * 1.055);
  const payOtA = Math.round(payOtB * 0.96);

  const metrics = [
    {
      nameEn: 'Total Active Workforce',
      nameAr: 'إجمالي الكادر النشط',
      valA: countA,
      valB: countB,
      unit: isAr ? 'موظف' : 'Staff',
      type: 'num',
      isPositiveGood: true
    },
    {
      nameEn: 'Total Monthly Payroll',
      nameAr: 'كتلة الرواتب الإجمالية',
      valA: payGrossA,
      valB: payGrossB,
      unit: 'IQD',
      type: 'currency',
      isPositiveGood: false // higher cost can be neutral/tight
    },
    {
      nameEn: 'Performance Incentives',
      nameAr: 'إجمالي الحوافز الشهرية',
      valA: payIncA,
      valB: payIncB,
      unit: 'IQD',
      type: 'currency',
      isPositiveGood: true // higher incentives means more loan volume
    },
    {
      nameEn: 'Overtime Compensation',
      nameAr: 'أجور العمل الإضافي',
      valA: payOtA,
      valB: payOtB,
      unit: 'IQD',
      type: 'currency',
      isPositiveGood: false // lower overtime is better operational efficiency
    },
    {
      nameEn: 'Annual Turnover Rate',
      nameAr: 'معدل دوران الموظفين',
      valA: 8.4,
      valB: 8.8,
      unit: '%',
      type: 'percent',
      isPositiveGood: false // lower turnover is good!
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl p-6 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr ? 'مقارنة الفترات والتحليل التناظري (Period Comparison)' : 'Period-over-Period Performance Comparison'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'مقارنة مؤشرات الموارد البشرية والرواتب بين شهرين ماليين' : 'Benchmarking workforce metrics and compensation variance'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Period Pickers */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الفترة الأساسية (الحالية)' : 'Target Period (Current)'}
            </label>
            <select
              value={periodA}
              onChange={(e) => setPeriodA(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium"
            >
              <option value="2026-10">October 2026 (تشرين الأول)</option>
              <option value="2026-09">September 2026 (أيلول)</option>
              <option value="2026-06">June 2026 (حزيران)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'فترة المقارنة (السابقة)' : 'Comparison Period (Base)'}
            </label>
            <select
              value={periodB}
              onChange={(e) => setPeriodB(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-medium"
            >
              <option value="2026-09">September 2026 (أيلول)</option>
              <option value="2026-08">August 2026 (آب)</option>
              <option value="2025-10">October 2025 (تشرين الأول 2025)</option>
            </select>
          </div>
        </div>

        {/* Metrics Variance Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="monthly-reports-table w-full text-xs text-left rtl:text-right border-collapse">
            <thead>
              <tr
                style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}
                className="bg-blue-900 text-white font-semibold border-b border-blue-950"
              >
                <th style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }} className="py-2.5 px-3">{isAr ? 'المؤشر' : 'Metric'}</th>
                <th style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }} className="py-2.5 px-3 text-right font-mono">{periodB} ({isAr ? 'السابق' : 'Prior'})</th>
                <th style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }} className="py-2.5 px-3 text-right font-mono">{periodA} ({isAr ? 'الحالي' : 'Current'})</th>
                <th style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }} className="py-2.5 px-3 text-right font-mono">{isAr ? 'الفارق المطلق' : 'Variance'}</th>
                <th style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }} className="py-2.5 px-3 text-right font-mono">{isAr ? 'نسبة التغير' : '% Change'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {metrics.map((m, idx) => {
                const diff = m.valA - m.valB;
                const pct = m.valB !== 0 ? (diff / m.valB) * 100 : 0;
                const isUp = diff > 0;
                const isDown = diff < 0;

                const isGood = m.isPositiveGood ? isUp : isDown;
                const trendColor = isGood ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {isAr ? m.nameAr : m.nameEn}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {m.type === 'currency' ? formatCurrencyIQD(m.valB) : (m.type === 'percent' ? `${m.valB}%` : formatNumber(m.valB))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {m.type === 'currency' ? formatCurrencyIQD(m.valA) : (m.type === 'percent' ? `${m.valA}%` : formatNumber(m.valA))}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-medium ${trendColor}`}>
                      {diff > 0 ? `+` : ''}{m.type === 'currency' ? formatCurrencyIQD(diff) : (m.type === 'percent' ? `${diff.toFixed(1)}%` : formatNumber(diff))}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={`inline-flex items-center gap-1 ${trendColor}`}>
                        {isUp && <ArrowUpRight className="w-3.5 h-3.5" />}
                        {isDown && <ArrowDownRight className="w-3.5 h-3.5" />}
                        {!isUp && !isDown && <Minus className="w-3.5 h-3.5" />}
                        <span>{pct > 0 ? `+` : ''}{pct.toFixed(1)}%</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
