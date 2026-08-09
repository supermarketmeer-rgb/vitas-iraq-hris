import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Code2,
  Database,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode2,
  Cpu,
  Layers,
  ShieldCheck,
  GitFork,
  Activity,
  Variable,
  AlertTriangle,
  Play,
  CheckCircle2,
} from 'lucide-react';

export const PhpArchitectureView: React.FC = () => {
  const { lang, t, showNotification } = useApp();

  const [phpFiles, setPhpFiles] = useState<any>(null);
  const [activeFile, setActiveFile] = useState<string>('query_validator');
  const [copied, setCopied] = useState(false);

  // Live Query Validator Sandbox state
  const [testSql, setTestSql] = useState<string>(
    'SELECT * FROM tax_brackets WHERE status = :status AND effective_from <= :calcDate'
  );
  const [sandboxValidation, setSandboxValidation] = useState<any>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/tax-module/php-architecture')
      .then((r) => r.json())
      .then((data) => {
        setPhpFiles({
          sql_schema: data.migration_sql,
          ...(data.php_files || {}),
        });
      })
      .catch((err) => console.error('Failed to load PHP bundle:', err));
  }, []);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showNotification(lang === 'ar' ? 'تم نسخ الكود البرمجي' : 'Code copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestQueryValidator = async (queryToTest?: string) => {
    const q = queryToTest || testSql;
    setIsValidating(true);
    try {
      const res = await fetch('/api/tax-module/validate-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql_query: q }),
      }).then((r) => r.json());
      setSandboxValidation(res);
    } catch (e) {
      setSandboxValidation({
        isValid: false,
        error: 'Validation failed due to network error',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const fileDefinitions: Record<
    string,
    { filename: string; label: string; icon: React.FC<any>; keyInBundle: string }
  > = {
    query_validator: {
      filename: 'QueryValidatorService.php',
      label: lang === 'ar' ? 'فاحص الاستعلامات (Query Validator)' : 'QueryValidatorService.php',
      icon: ShieldCheck,
      keyInBundle: 'QueryValidatorService.php',
    },
    dependency_graph: {
      filename: 'DependencyGraphAnalyzer.php',
      label: lang === 'ar' ? 'محلل الاعتماديات (DAG Analyzer)' : 'DependencyGraphAnalyzer.php',
      icon: GitFork,
      keyInBundle: 'DependencyGraphAnalyzer.php',
    },
    audit_logger: {
      filename: 'AuditLoggerService.php',
      label: lang === 'ar' ? 'سجل التدقيق (Audit Logger)' : 'AuditLoggerService.php',
      icon: Activity,
      keyInBundle: 'AuditLoggerService.php',
    },
    variable_manager: {
      filename: 'SystemVariableManager.php',
      label: lang === 'ar' ? 'مدير المتغيرات (Variable Manager)' : 'SystemVariableManager.php',
      icon: Variable,
      keyInBundle: 'SystemVariableManager.php',
    },
    schema_sql: {
      filename: 'social_security_and_tax_schema.sql',
      label: lang === 'ar' ? 'مخطط MySQL (Schema)' : 'MySQL Schema SQL',
      icon: Database,
      keyInBundle: 'sql_schema',
    },
    engine_php: {
      filename: 'PayrollRulesEngine.php',
      label: 'PayrollRulesEngine.php',
      icon: Cpu,
      keyInBundle: 'PayrollRulesEngine.php',
    },
    formula_php: {
      filename: 'FormulaEngine.php',
      label: 'FormulaEngine.php',
      icon: FileCode2,
      keyInBundle: 'FormulaEngine.php',
    },
    query_php: {
      filename: 'QueryEngine.php',
      label: 'QueryEngine.php',
      icon: Terminal,
      keyInBundle: 'QueryEngine.php',
    },
  };

  const activeDef = fileDefinitions[activeFile] || fileDefinitions['query_validator'];
  const currentContent = phpFiles ? phpFiles[activeDef.keyInBundle] || '' : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {t('php_architecture')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'مخطط جداول MySQL وحزم PHP 8+ للخدمات المتقدمة (فاحص الاستعلامات، محلل الاعتماديات DAG، وسجل التدقيق)'
              : 'Production-ready PHP 8+ service architecture and MySQL migrations for XAMPP / Laravel HRMS deployment'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(currentContent)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الكود' : 'Copy')}</span>
          </button>

          <button
            onClick={() => handleDownload(activeDef.filename, currentContent)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تحميل الملف' : 'Download File'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Query Validator Sandbox Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold">
              {lang === 'ar'
                ? 'مختبر فحص استعلامات SQL الآمنة (PHP Regex Query Validator Sandbox)'
                : 'PHP Regex-Based Query Validator Sandbox'}
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
            PHP 8+ Whitelist Regex
          </span>
        </div>

        <p className="text-xs text-slate-300">
          {lang === 'ar'
            ? 'يقوم هذا المختبر بمحاكاة خدمة QueryValidatorService.php عبر مطابقة الاستعلام باللائحة البيضاء ومنع أي عمليات تخريبية (DELETE, DROP, EXEC, ALTER).'
            : 'Simulates the QueryValidatorService.php engine by enforcing regex whitelist parsing and rejecting forbidden DDL/DML keywords.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testSql}
            onChange={(e) => setTestSql(e.target.value)}
            placeholder="SELECT * FROM tax_brackets WHERE status = :status"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={() => handleTestQueryValidator()}
            disabled={isValidating}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isValidating ? (lang === 'ar' ? 'جاري الفحص...' : 'Validating...') : (lang === 'ar' ? 'فحص الاستعلام' : 'Validate Query')}</span>
          </button>
        </div>

        {/* Quick preset queries to test */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-slate-400">{lang === 'ar' ? 'استعلامات سريعة للتجربة:' : 'Quick test queries:'}</span>
          <button
            onClick={() => {
              const q = 'SELECT * FROM tax_brackets WHERE status = :status';
              setTestSql(q);
              handleTestQueryValidator(q);
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono"
          >
            Valid SELECT
          </button>
          <button
            onClick={() => {
              const q = 'DROP TABLE hr_employees;';
              setTestSql(q);
              handleTestQueryValidator(q);
            }}
            className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-mono border border-rose-800"
          >
            Attack: DROP TABLE
          </button>
          <button
            onClick={() => {
              const q = 'DELETE FROM calculation_rules WHERE id = 1';
              setTestSql(q);
              handleTestQueryValidator(q);
            }}
            className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-mono border border-rose-800"
          >
            Attack: DELETE
          </button>
          <button
            onClick={() => {
              const q = 'EXEC sp_configure;';
              setTestSql(q);
              handleTestQueryValidator(q);
            }}
            className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-mono border border-rose-800"
          >
            Attack: EXEC
          </button>
        </div>

        {/* Sandbox Validation Result */}
        {sandboxValidation && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono transition-all ${
              sandboxValidation.isValid
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/70 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {sandboxValidation.isValid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'ar' ? 'الاستعلام آمن ومطابق للمحددات (VALID SQL QUERY)' : 'Query Security Approved by Regex Whitelist'}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>{lang === 'ar' ? 'تم رفض الاستعلام لأسباب أمنية (SECURITY VIOLATION)' : 'Security Violation - Prohibited Operation Blocked'}</span>
                </>
              )}
            </div>
            <p className="text-[11px] opacity-90">
              {sandboxValidation.error || sandboxValidation.explanation}
            </p>
            {sandboxValidation.target_table && (
              <div className="text-[10px] text-slate-400 mt-1">
                Target Table: <span className="text-white font-bold">{sandboxValidation.target_table}</span> | Detected Placeholders: {JSON.stringify(sandboxValidation.parameters || [])}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Code Explorer Layout */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {/* File Tabs Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-3 flex items-center gap-1 overflow-x-auto">
          {Object.entries(fileDefinitions).map(([key, def]) => {
            const Icon = def.icon;
            const isActive = activeFile === key;
            return (
              <button
                key={key}
                onClick={() => setActiveFile(key)}
                className={`px-3 py-2.5 text-xs font-mono font-semibold flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{def.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content Window */}
        <div className="p-4 overflow-x-auto max-h-[600px] text-xs font-mono text-emerald-300/90 leading-relaxed">
          <pre dir="ltr" className="text-start">
            <code>{currentContent || '// Loading PHP 8+ architecture bundle...'}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
