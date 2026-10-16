import React, { useState, useEffect } from 'react';
import { AcceptanceTestReport, IntegrityIssue } from '../../types/hris';
import { Language, translations } from './translations';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Clock,
  Sparkles
} from 'lucide-react';

interface AcceptanceTestsModalProps {
  lang: Language;
  theme?: 'dark' | 'light';
  onRefreshAll: () => void;
}

export const AcceptanceTestsModal: React.FC<AcceptanceTestsModalProps> = ({
  lang,
  theme = 'dark',
  onRefreshAll
}) => {
  const t = translations[lang];
  const isArabic = lang === 'ar';
  const isDark = theme !== 'light';

  const [testReport, setTestReport] = useState<AcceptanceTestReport | null>(null);
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchIntegrityAndRunTests = async () => {
    setLoading(true);
    try {
      const [testRes, integrityRes] = await Promise.all([
        fetch('/api/audit/run-tests', { method: 'POST' }),
        fetch('/api/audit/integrity')
      ]);

      if (testRes.ok) {
        const report = await testRes.json();
        setTestReport(report);
      }

      if (integrityRes.ok) {
        const integrityData = await integrityRes.json();
        setIssues(integrityData.issues || []);
      }
    } catch (err: any) {
      console.error('Failed to run acceptance tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrityAndRunTests();
  }, []);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
        isDark ? 'bg-[#111827] border-white/10 shadow-lg text-white' : 'bg-white border-slate-200 shadow-xs text-slate-900'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400 text-xl">verified</span>
            <h2 className="text-sm font-bold">{t.testsTitle}</h2>
          </div>
          <p className={`text-xs mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.testsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIntegrityAndRunTests}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/25 transition-all cursor-pointer"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>{loading ? (isArabic ? 'جاري الفحص...' : 'Running Tests...') : t.runAllTestsBtn}</span>
          </button>
        </div>
      </div>

      {/* Summary Scoreboard */}
      {testReport && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          testReport.allPassed
            ? isDark
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : isDark
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-center gap-3">
            {testReport.allPassed ? (
              <span className="material-symbols-outlined text-2xl text-emerald-400">check_circle</span>
            ) : (
              <span className="material-symbols-outlined text-2xl text-rose-400">cancel</span>
            )}
            <div>
              <h3 className="text-xs font-bold">
                {testReport.allPassed ? t.allPassedMsg : t.failuresFound}
              </h3>
              <p className="text-[11px] opacity-90 mt-0.5">
                {testReport.passedCount} {isArabic ? 'من أصل' : 'of'} {testReport.total} {isArabic ? 'اختبار قبول ناجح ومطابق' : 'Acceptance Tests Passed'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono opacity-80">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span>{new Date(testReport.executedAt).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* Diagnostic Issues Section */}
      <div className={`rounded-2xl p-4 border space-y-3 ${
        isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
      }`}>
        <h3 className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <span className="material-symbols-outlined text-amber-400 text-base">warning</span>
          <span>{t.diagnosticIssues}</span>
        </h3>

        {issues.length === 0 ? (
          <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            isDark ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
          }`}>
            <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
            <span>{t.noIssues}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {issues.map((issue, idx) => (
              <div key={idx} className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                isDark ? 'bg-amber-950/30 border border-amber-500/20 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-900'
              }`}>
                <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">warning</span>
                <div>
                  <span className="font-semibold">{isArabic ? issue.message_ar : issue.message}</span>
                  <div className="mt-1 font-mono text-[11px] opacity-75">
                    Entity: {issue.entity_type} #{issue.entity_id} · Severity: {issue.severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 18 Acceptance Tests List */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
      }`}>
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-100'
        }`}>
          <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {isArabic ? 'نتائج اختبارات سلامة وتكامل الهيكل (18 اختبار)' : 'Specification Acceptance Tests (18 Cases)'}
          </h3>
          <span className="text-xs font-bold text-teal-400 font-mono">
            {testReport ? `${testReport.passedCount} / ${testReport.total} Passed` : ''}
          </span>
        </div>

        <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
          {(testReport?.results || []).map((test) => (
            <div key={test.id} className={`p-3.5 flex items-start justify-between gap-4 transition-colors ${
              isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/60'
            }`}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {test.passed ? (
                    <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-rose-400 text-lg">cancel</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{test.id.toString().padStart(2, '0')}
                    </span>
                    <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? test.name_ar : test.name}
                    </h4>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {test.message}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
                  test.passed
                    ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-800'
                    : isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-100 text-rose-800'
                }`}>
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
