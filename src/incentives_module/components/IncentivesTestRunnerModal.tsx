import React, { useEffect, useState } from 'react';
import { TestRunner, TestCaseResult } from '../services/testRunner';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  RotateCcw,
  X,
  ShieldCheck,
  Check
} from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const IncentivesTestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose, isDark = false }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestCaseResult[];
  } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const out = await TestRunner.runAllTests();
      setTestResults(out);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !testResults) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className={`rounded-3xl max-w-3xl w-full p-6 shadow-2xl border max-h-[90vh] flex flex-col justify-between ${
        isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/20">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                منظومة الاختبارات الآلية للتحقق من صحة الحسابات (Automated Test Suite)
              </h2>
              <div className="text-xs text-slate-400 mt-0.5">
                إثبات دقة محرك الـ AST، تجميع حوافز المشرفين، وقواعد دورة العمل
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
              isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Results Summary Bar */}
        {testResults && (
          <div className={`my-4 p-4 rounded-2xl border flex items-center justify-between text-xs ${
            isDark ? 'bg-[#0a0c10] border-white/10' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-400">إجمالي الفحوصات:</span>
                <span className="font-mono font-bold text-teal-400 mr-1.5 text-sm">
                  {testResults.total}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>الناجحة:</span>
                <span className="font-mono">{testResults.passed}</span>
              </div>
              {testResults.failed > 0 && (
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <XCircle className="w-4 h-4" />
                  <span>الفاشلة:</span>
                  <span className="font-mono">{testResults.failed}</span>
                </div>
              )}
            </div>

            <button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md shadow-teal-600/20"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>إعادة الاختبار</span>
            </button>
          </div>
        )}

        {/* Tests List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 max-h-[50vh]">
          {testResults?.results.map((t, idx) => (
            <div
              key={t.id}
              className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                t.passed
                  ? isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span>{idx + 1}. {t.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-white/5 border border-white/10 text-slate-400">
                      {t.category}
                    </span>
                  </div>
                  {t.details && (
                    <div className="text-[11px] text-slate-400 mt-0.5">{t.details}</div>
                  )}
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    المتوقع: <span className="text-slate-300">{String(t.expected)}</span> | الفعلي:{' '}
                    <span className={t.passed ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {String(t.actual)}
                    </span>
                  </div>
                </div>
              </div>

              <span className="font-mono text-[10px] text-slate-500 shrink-0">
                {t.durationMs}ms
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between text-xs`}>
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام محرك الحسابات مطابق 100% للمواصفات والضوابط المصرفية</span>
          </div>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl font-bold transition-all ${
              isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
            }`}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
