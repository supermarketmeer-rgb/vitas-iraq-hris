import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Settings,
  Database,
  Sliders,
  Shield,
  Layers,
  CheckCircle2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  FileCode,
  ArrowRight,
  Sparkles,
  Link,
  Code,
  Table,
  Check,
  X,
  ExternalLink,
  Eye,
  Hash,
  Activity,
  History,
  AlertCircle,
  Copy,
  Trash2,
  Edit,
  Globe,
  Share2,
} from 'lucide-react';
import { CalculationVariable, AuditLogRecord } from '../types.js';

export const SettingsView: React.FC = () => {
  const { lang, t, variables, parameters, refreshData, showNotification } = useApp();

  const [activeTab, setActiveTab] = useState<
    'variables' | 'parameters' | 'audit_logs' | 'presets' | 'hr_integration'
  >('variables');

  // Variable Mapping Form State
  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<CalculationVariable | null>(null);
  const [varCode, setVarCode] = useState('');
  const [varNameAr, setVarNameAr] = useState('');
  const [varNameEn, setVarNameEn] = useState('');
  const [varCategory, setVarCategory] = useState<'INPUT' | 'INTERMEDIATE' | 'OUTPUT' | 'SYSTEM'>('INPUT');
  const [varDataType, setVarDataType] = useState<'NUMBER' | 'PERCENTAGE' | 'BOOLEAN' | 'STRING' | 'CURRENCY'>('CURRENCY');
  const [varDefaultVal, setVarDefaultVal] = useState<string>('');
  const [varDescAr, setVarDescAr] = useState('');
  const [varDescEn, setVarDescEn] = useState('');
  const [varSourceType, setVarSourceType] = useState<string>('EMPLOYEE_PROFILE');
  const [varSourceTable, setVarSourceTable] = useState('hr_employees');
  const [varSourceColumn, setVarSourceColumn] = useState('');
  const [varFormulaExpr, setVarFormulaExpr] = useState('');
  const [varSqlQuery, setVarSqlQuery] = useState('');
  const [isSavingVar, setIsSavingVar] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [auditFilterType, setAuditFilterType] = useState<string>('');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogRecord | null>(null);
  const [isSyncingBridge, setIsSyncingBridge] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const fetchAuditLogs = async () => {
    try {
      let url = '/api/audit-logs?limit=100';
      if (auditFilterType) url += `&event_type=${auditFilterType}`;
      if (auditSearchQuery) url += `&search=${encodeURIComponent(auditSearchQuery)}`;
      const res = await fetch(url).then((r) => r.json());
      setAuditLogs(res.audit_logs || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    }
  }, [activeTab, auditFilterType, auditSearchQuery]);

  const handleSyncToHrAuditBridge = async () => {
    setIsSyncingBridge(true);
    try {
      const res = await fetch('/api/tax-module/audit-logs/sync-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then((r) => r.json());

      if (res.success) {
        showNotification(
          lang === 'ar'
            ? `تمت مزامنة (${res.synced_count}) سجل تدقيق بنجاح مع جدول التدقيق الرئيسي (hr_system_audit_logs)`
            : `Successfully bridged and synced ${res.synced_count} audit logs to hr_system_audit_logs`,
          'success'
        );
        fetchAuditLogs();
      }
    } catch (err) {
      showNotification('Bridge sync failed', 'error');
    } finally {
      setIsSyncingBridge(false);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    try {
      const res = await fetch('/api/tax-module/presets/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetId }),
      }).then((r) => r.json());
      if (res.success) {
        showNotification(
          lang === 'ar'
            ? 'تم تطبيق القالب القانوني وإعادة تهيئة معاملات الحساب بنجاح'
            : 'Legal template applied and rules updated',
          'success'
        );
        refreshData();
        fetchAuditLogs();
      }
    } catch (err) {
      showNotification('Preset apply failed', 'error');
    }
  };

  const openNewVariableModal = () => {
    setEditingVar(null);
    setVarCode('');
    setVarNameAr('');
    setVarNameEn('');
    setVarCategory('INPUT');
    setVarDataType('CURRENCY');
    setVarDefaultVal('0');
    setVarDescAr('');
    setVarDescEn('');
    setVarSourceType('EMPLOYEE_PROFILE');
    setVarSourceTable('hr_employees');
    setVarSourceColumn('');
    setVarFormulaExpr('');
    setVarSqlQuery('');
    setIsVarModalOpen(true);
  };

  const openEditVariableModal = (v: CalculationVariable) => {
    setEditingVar(v);
    setVarCode(v.code);
    setVarNameAr(v.name_ar);
    setVarNameEn(v.name_en);
    setVarCategory(v.category);
    setVarDataType(v.data_type);
    setVarDefaultVal(String(v.default_value ?? '0'));
    setVarDescAr(v.description_ar || '');
    setVarDescEn(v.description_en || '');
    setVarSourceType(v.source_type || (v.category === 'INPUT' ? 'EMPLOYEE_PROFILE' : 'CALCULATED_AGGREGATE'));
    setVarSourceTable(v.source_table || 'hr_employees');
    setVarSourceColumn(v.source_column || '');
    setVarFormulaExpr(v.source_mapping?.formula_expression || '');
    setVarSqlQuery(v.source_mapping?.sql_query || '');
    setIsVarModalOpen(true);
  };

  const handleSaveVariable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varCode || !varNameAr || !varNameEn) {
      showNotification(lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', 'error');
      return;
    }

    setIsSavingVar(true);
    try {
      const payload = {
        code: varCode.toUpperCase().replace(/\s+/g, '_'),
        name_ar: varNameAr,
        name_en: varNameEn,
        category: varCategory,
        data_type: varDataType,
        default_value: varDataType === 'NUMBER' || varDataType === 'CURRENCY' ? Number(varDefaultVal) : varDefaultVal,
        description_ar: varDescAr,
        description_en: varDescEn,
        source_type: varSourceType,
        source_table: varSourceTable,
        source_column: varSourceColumn || varCode.toLowerCase(),
        source_mapping: {
          formula_expression: varFormulaExpr,
          sql_query: varSqlQuery,
          description: `Mapped source for ${varCode}`,
        },
      };

      const url = editingVar ? `/api/variables/${editingVar.id}` : '/api/variables';
      const method = editingVar ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(
          lang === 'ar'
            ? `تم ${editingVar ? 'تحديث' : 'إنشاء'} متغير النظام وتعيين المصدر بنجاح`
            : `Successfully ${editingVar ? 'updated' : 'created'} system variable & source mapping`,
          'success'
        );
        setIsVarModalOpen(false);
        refreshData();
      }
    } catch (err: any) {
      showNotification(err.message || 'Failed to save variable', 'error');
    } finally {
      setIsSavingVar(false);
    }
  };

  const handleDeleteVariable = async (varId: string, varCode: string) => {
    if (!confirm(lang === 'ar' ? `هل أنت متأكد من حذف المتغير (${varCode})؟` : `Delete variable ${varCode}?`)) return;

    try {
      const res = await fetch(`/api/tax-module/variables/${varId}`, { method: 'DELETE' }).then((r) => r.json());
      if (res.error) {
        showNotification(res.error, 'error');
      } else {
        showNotification(
          lang === 'ar' ? `تم حذف المتغير (${varCode})` : `Deleted variable ${varCode}`,
          'success'
        );
        refreshData();
      }
    } catch (err) {
      showNotification('Delete failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('settings')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إدارة متغيرات النظام وتعيين مصادرها، سجلات التدقيق المتوافقة، المعاملات، والقوالب القانونية'
              : 'Manage system variable source mappings, event-driven audit logs, calculation parameters, and legal presets'}
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'variables'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{lang === 'ar' ? 'متغيرات النظام والربط' : 'System Variables & Mapping'}</span>
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'audit_logs'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{lang === 'ar' ? 'سجل التدقيق والمطابقة' : 'Audit Logs & Bridge'}</span>
          </button>
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'parameters'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{lang === 'ar' ? 'المعاملات الديناميكية' : 'Parameters'}</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'presets'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'ar' ? 'القوالب القانونية' : 'Legal Presets'}</span>
          </button>
          <button
            onClick={() => setActiveTab('hr_integration')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'hr_integration'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{lang === 'ar' ? 'تكامل الموارد البشرية' : 'HRMS Integration'}</span>
          </button>
        </div>
      </div>

      {/* 1. System Variables & Mapping Section */}
      {activeTab === 'variables' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {lang === 'ar' ? 'قاموس متغيرات النظام وتعيين المصادر (Variable Source Mapping)' : 'System Variables & Dynamic Source Mapping'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'يتيح للمسؤولين تعريف متغيرات جديدة وتحديد مصادر تغذيتها (بيانات الموظف، معايير الشركة، جداول الضرائب، أو استعلامات SQL) لفك تشفيرها لحظياً في محرك القواعد.'
                  : 'Allows administrators to define new system variables and their sources via a simple mapping interface, ensuring the Rules Engine dynamically resolves keys during runtime.'}
              </p>
            </div>

            <button
              onClick={openNewVariableModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إضافة متغير نظام جديد' : 'Define New System Variable'}</span>
            </button>
          </div>

          {/* Variables Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="px-4 py-3">{lang === 'ar' ? 'رمز المتغير (Code)' : 'Variable Code'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'الاسم والوصف' : 'Name & Description'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'التصنيف والنوع' : 'Category & Data Type'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'مصدر التعيين (Source Mapping)' : 'Source Mapping'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {variables.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800/50">
                            {v.code}
                          </code>
                          {v.is_system && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                              Core
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{lang === 'ar' ? v.name_ar : v.name_en}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {lang === 'ar' ? v.description_ar : v.description_en}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.category === 'INPUT'
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                                : v.category === 'INTERMEDIATE'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {v.category}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {v.data_type}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {v.source_type || (v.category === 'INPUT' ? 'EMPLOYEE_PROFILE' : 'CALCULATED_AGGREGATE')}
                            </span>
                          </div>
                          {v.source_table && (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {v.source_table}.{v.source_column || v.code.toLowerCase()}
                            </span>
                          )}
                          {v.source_mapping?.formula_expression && (
                            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                              {v.source_mapping.formula_expression}
                            </span>
                          )}
                          {v.source_mapping?.sql_query && (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded truncate max-w-xs">
                              {v.source_mapping.sql_query}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{lang === 'ar' ? 'نشط' : 'Active'}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditVariableModal(v)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            title={lang === 'ar' ? 'تعديل التعيين' : 'Edit Mapping'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!v.is_system && (
                            <button
                              onClick={() => handleDeleteVariable(v.id, v.code)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title={lang === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Audit Logs & HR Audit Bridge Section */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {lang === 'ar' ? 'سجل التدقيق والمطابقة القانونية (Event-Driven Audit Logger)' : 'Event-Driven Audit Logger & HR Audit Bridge'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'يلتقط تلقائياً كافة عمليات الإنشاء والتعديل والتفعيل للقواعد والمعاملات والمتغيرات بصيغة JSON مهيكلة مع بصمة Checksum رقمية وجسر مزامنة لجدول hr_system_audit_logs.'
                  : 'Automatically captures CRUD operations on rules and versions into JSON, providing a bridge to the HR system main audit table.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncToHrAuditBridge}
                disabled={isSyncingBridge}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBridge ? 'animate-spin' : ''}`} />
                <span>{lang === 'ar' ? 'مزامنة مع جدول HR الرئيسي' : 'Sync to HR Audit Table'}</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 ltr:left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'بحث في سجل التدقيق (رمز القاعدة، المستخدم، الإجراء، أو التفاصيل)...'
                    : 'Search audit logs (rule code, actor, summary)...'
                }
                className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <select
              value={auditFilterType}
              onChange={(e) => setAuditFilterType(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">{lang === 'ar' ? 'جميع أنواع الأحداث (All Events)' : 'All Event Types'}</option>
              <option value="VERSION_ACTIVATED">VERSION_ACTIVATED</option>
              <option value="RULE_CREATED">RULE_CREATED</option>
              <option value="RULE_UPDATED">RULE_UPDATED</option>
              <option value="VARIABLE_CREATED">VARIABLE_CREATED</option>
              <option value="VARIABLE_MAPPING_UPDATED">VARIABLE_MAPPING_UPDATED</option>
              <option value="PARAMETER_UPDATED">PARAMETER_UPDATED</option>
              <option value="TAX_BRACKET_UPDATED">TAX_BRACKET_UPDATED</option>
              <option value="SNAPSHOT_FINALIZED">SNAPSHOT_FINALIZED</option>
              <option value="BULK_VERSIONS_ACTIVATED">BULK_VERSIONS_ACTIVATED</option>
            </select>
          </div>

          {/* Audit Logs List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="px-4 py-3">{lang === 'ar' ? 'التوقيت والمعرف' : 'Timestamp & Event ID'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'نوع الحدث والمورد' : 'Event & Target Resource'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'المستخدم المنفذ (Actor)' : 'Actor (HR System)'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'ملخص الإجراء والتغييرات' : 'Summary & Diff'}</th>
                    <th className="px-4 py-3">{lang === 'ar' ? 'حالة جسر HR' : 'HR Bridge Status'}</th>
                    <th className="px-4 py-3 text-center">{lang === 'ar' ? 'عرض JSON' : 'Inspect JSON'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-US') : 'N/A'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{log.event_id}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold self-start ${
                              log.event_type.includes('ACTIVATED')
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : log.event_type.includes('CREATED')
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                                : log.event_type.includes('UPDATED')
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                            }`}
                          >
                            {log.event_type}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {log.resource_type} {log.rule_code ? `(${log.rule_code})` : ''}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{log.actor.name}</div>
                        <div className="text-[10px] text-slate-400">{log.actor.email}</div>
                        <div className="text-[10px] font-mono text-slate-400">{log.actor.ip_address}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200 max-w-sm">
                          {lang === 'ar' ? log.summary_ar : log.summary_en}
                        </div>
                        {log.diff_summary && log.diff_summary.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {log.diff_summary.slice(0, 3).map((d, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400"
                              >
                                {d.field}: {String(d.old_value)} ➔ {String(d.new_value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/50">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{log.bridge_sync_status}</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-400">{log.hr_audit_table_id}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'فحص JSON' : 'JSON'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Parameters Section */}
      {activeTab === 'parameters' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {lang === 'ar' ? 'المعاملات الحسابية الديناميكية (Zero Hardcoding)' : 'Dynamic Calculation Parameters'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'جميع نسب الضمان، الحدود الدنيا والعليا، ومعاملات الإعفاء مسترجعة ديناميكياً من قاعدة البيانات بدون أي أرقام ثابتة في الكود البرمجي.'
                : 'All statutory rates, minimum and maximum contribution caps, and exemption parameters are loaded dynamically from the database.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parameters.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                      {p.code}
                    </code>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      {p.status}
                    </span>
                  </div>

                  <div className="mt-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{lang === 'ar' ? p.name_ar : p.name_en}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {lang === 'ar' ? p.description_ar : p.description_en}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-xs text-slate-400">{lang === 'ar' ? 'القيمة المعتمدة:' : 'Active Value:'}</div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {p.value.toLocaleString()} <span className="text-xs font-medium text-slate-500">{p.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Legal Presets */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {lang === 'ar' ? 'القوالب القانونية الجاهزة' : 'Statutory & Jurisdictional Legal Presets'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'تطبيق القوانين الجاهزة بضغطة زر مع ضبط المعاملات والشرائح الضريبية والضمان الاجتماعي المعتمدة رسمياً.'
                : 'Instantly apply complete legal rule packages, tax bracket tiers, and statutory contribution rates.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Iraq Standard */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-indigo-500/30 dark:border-indigo-500/20 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-full">
                    {lang === 'ar' ? 'المعيار الرسمي المعتمد' : 'Official Primary Standard'}
                  </span>
                  <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-3">
                  {lang === 'ar' ? 'قانون التقاعد والضمان الاجتماعي العراقي رقم 18 لسنة 2023 وضريبة الدخل رقم 113' : 'Iraqi Social Security Law No. 18 (2023) & Income Tax Law No. 113'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {lang === 'ar'
                    ? 'نسبة 5% استقطاع موظف، 12% مساهمة صاحب عمل، إعفاءات ضريبية شخصية وعائلية، وشرائح تصاعدية (3%، 5%، 10%، 15%).'
                    : '5% employee contribution, 12% employer contribution, personal exemptions, and progressive income tax brackets (3% to 15%).'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">100% Parameterized DB</span>
                <button
                  onClick={() => handleApplyPreset('IRAQ_STANDARD')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                >
                  {lang === 'ar' ? 'تطبيق هذا القالب' : 'Apply Iraq Preset'}
                </button>
              </div>
            </div>

            {/* Jordan Preset */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
                    {lang === 'ar' ? 'قالب تجريبي' : 'Regional Benchmark'}
                  </span>
                  <Globe className="w-5 h-5 text-slate-400" />
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-3">
                  {lang === 'ar' ? 'قانون الضمان الاجتماعي الأردني وضريبة الدخل' : 'Jordanian Social Security & Income Tax Rules'}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {lang === 'ar'
                    ? 'نسبة 7.5% استقطاع موظف، 14.25% مساهمة جهة العمل، مع شرائح ضريبة الدخل المعتمدة في المملكة الأردنية الهاشمية.'
                    : '7.5% employee contribution, 14.25% employer contribution, and Jordanian progressive tax brackets.'}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">Parameterized Benchmark</span>
                <button
                  onClick={() => handleApplyPreset('JORDAN_STANDARD')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-all"
                >
                  {lang === 'ar' ? 'تطبيق هذا القالب' : 'Apply Jordan Preset'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. HRMS Integration Section */}
      {activeTab === 'hr_integration' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-emerald-500" />
              {lang === 'ar' ? 'خدمات الربط والتكامل مع نظام الموارد البشرية (HR Core Services)' : 'HR Core Services Integration Bridge'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'يعتمد الموديول معمارية خالية من تكرار تسجيل الدخول أو الصلاحيات المنفصلة، ويستهلك مباشرة جداول الموظفين، الأقسام، والفروع من نظام HR الرئيسي.'
                : 'Consumes HR core employee contract profiles, departments, branches, and attendance bridges without redundant auth layers.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">HREmployeeService</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">12 Active Contracts</div>
              <div className="text-xs text-slate-400 mt-1">Bound to `hr_employees`</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">DepartmentService</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">6 Departments</div>
              <div className="text-xs text-slate-400 mt-1">Bound to `departments`</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">AuditLogBridge</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">hr_system_audit_logs</div>
              <div className="text-xs text-slate-400 mt-1">Auto-synced JSON events</div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Define or Edit System Variable */}
      {isVarModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  {editingVar
                    ? lang === 'ar'
                      ? `تعديل متغير النظام وتعيين المصدر: ${editingVar.code}`
                      : `Edit System Variable Mapping: ${editingVar.code}`
                    : lang === 'ar'
                    ? 'تعريف متغير نظام جديد وتعيين مصدر البيانات'
                    : 'Define New System Variable & Source Mapping'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'ar'
                    ? 'ربط المفتاح البرمجي بجدول أو عمود أو استعلام محدد لتغذيته أثناء تنفيذ محرك القواعد.'
                    : 'Configure dynamic variable resolution to feed the Rules Engine at runtime.'}
                </p>
              </div>

              <button
                onClick={() => setIsVarModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVariable} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'رمز المتغير بالإنجليزية (Variable Code) *' : 'Variable Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={varCode}
                    onChange={(e) => setVarCode(e.target.value)}
                    placeholder="e.g. SENIORITY_BONUS"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'نوع المصدر (Source Type) *' : 'Source Type *'}
                  </label>
                  <select
                    value={varSourceType}
                    onChange={(e) => setVarSourceType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="EMPLOYEE_PROFILE">EMPLOYEE_PROFILE (ملف الموظف وعقد العمل)</option>
                    <option value="COMPANY_POLICY">COMPANY_POLICY (معاملات وسياسات الشركة)</option>
                    <option value="TAX_TABLE">TAX_TABLE (جداول ومعايير الضريبة والضمان)</option>
                    <option value="SQL_LOOKUP">SQL_LOOKUP (استعلام SQL بارامتري آمن)</option>
                    <option value="CALCULATED_AGGREGATE">CALCULATED_AGGREGATE (مخرجات عملية وسيطة)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الاسم بالعربية *' : 'Arabic Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={varNameAr}
                    onChange={(e) => setVarNameAr(e.target.value)}
                    placeholder="مثال: مكافأة سنوات الخدمة والأقدمية"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'الاسم بالإنجليزية *' : 'English Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={varNameEn}
                    onChange={(e) => setVarNameEn(e.target.value)}
                    placeholder="e.g. Seniority Service Bonus"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'التصنيف الحسابي' : 'Category'}
                  </label>
                  <select
                    value={varCategory}
                    onChange={(e) => setVarCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="INPUT">INPUT (مدخل)</option>
                    <option value="INTERMEDIATE">INTERMEDIATE (وسيط)</option>
                    <option value="OUTPUT">OUTPUT (مخرج نهائي)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'نوع البيانات' : 'Data Type'}
                  </label>
                  <select
                    value={varDataType}
                    onChange={(e) => setVarDataType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="CURRENCY">CURRENCY (عملة د.ع)</option>
                    <option value="NUMBER">NUMBER (عدد)</option>
                    <option value="PERCENTAGE">PERCENTAGE (نسبة مئوية %)</option>
                    <option value="BOOLEAN">BOOLEAN (منطقي نعم/لا)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'ar' ? 'القيمة الافتراضية' : 'Default Value'}
                  </label>
                  <input
                    type="text"
                    value={varDefaultVal}
                    onChange={(e) => setVarDefaultVal(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Source-specific Mapping Details */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تفاصيل ربط وتعيين المصدر' : 'Source Mapping Configuration'}</span>
                </div>

                {varSourceType === 'EMPLOYEE_PROFILE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {lang === 'ar' ? 'جدول الموارد البشرية (Source Table)' : 'Target Table'}
                      </label>
                      <input
                        type="text"
                        value={varSourceTable}
                        onChange={(e) => setVarSourceTable(e.target.value)}
                        placeholder="hr_employees"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {lang === 'ar' ? 'اسم الحقل / العمود (Column Name)' : 'Column / Key'}
                      </label>
                      <input
                        type="text"
                        value={varSourceColumn}
                        onChange={(e) => setVarSourceColumn(e.target.value)}
                        placeholder="basic_salary / dependents_count / hire_date"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {varSourceType === 'SQL_LOOKUP' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {lang === 'ar' ? 'استعلام SQL بارامتري (يخضع للفاحص الأمني Whitelist)' : 'Parameterized SELECT Query'}
                    </label>
                    <textarea
                      rows={2}
                      value={varSqlQuery}
                      onChange={(e) => setVarSqlQuery(e.target.value)}
                      placeholder="SELECT SUM(overtime_hours) FROM employee_attendance WHERE employee_id = :employee_id AND period = :calculation_date"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    ></textarea>
                  </div>
                )}

                {varSourceType === 'CALCULATED_AGGREGATE' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {lang === 'ar' ? 'تعبير المعادلة الحسابية (Formula Expression)' : 'Formula Expression'}
                    </label>
                    <input
                      type="text"
                      value={varFormulaExpr}
                      onChange={(e) => setVarFormulaExpr(e.target.value)}
                      placeholder="housing + transport + living + other"
                      className="w-full px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'الوصف بالعربية' : 'Arabic Description'}
                </label>
                <textarea
                  rows={2}
                  value={varDescAr}
                  onChange={(e) => setVarDescAr(e.target.value)}
                  placeholder="وصف تفصيلي للغرض المحاسبي والقانوني من المتغير"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVarModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSavingVar}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  {isSavingVar
                    ? lang === 'ar'
                      ? 'جاري الحفظ...'
                      : 'Saving...'
                    : lang === 'ar'
                    ? 'حفظ المتغير والتعيين'
                    : 'Save Variable Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Audit Log JSON Inspector */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                  <FileCode className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {lang === 'ar' ? 'فحص حمولة سجل التدقيق' : 'Audit Log Record Inspector'}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-slate-500">{selectedAuditLog.event_id}</span>
                    <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded">
                      {selectedAuditLog.checksum}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                <div>
                  <span className="text-slate-400">{lang === 'ar' ? 'الحدث:' : 'Event:'} </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAuditLog.event_type}</span>
                </div>
                <div>
                  <span className="text-slate-400">{lang === 'ar' ? 'المورد:' : 'Target:'} </span>
                  <span className="font-mono font-bold text-indigo-600">{selectedAuditLog.resource_type} ({selectedAuditLog.resource_id})</span>
                </div>
                <div>
                  <span className="text-slate-400">{lang === 'ar' ? 'المستخدم:' : 'Actor:'} </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedAuditLog.actor.name} ({selectedAuditLog.actor.email})</span>
                </div>
                <div>
                  <span className="text-slate-400">{lang === 'ar' ? 'الجسر إلى HR:' : 'HR Bridge Sync:'} </span>
                  <span className="font-bold text-emerald-600">{selectedAuditLog.bridge_sync_status} ({selectedAuditLog.hr_audit_table_id})</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? 'حمولة JSON الموثقة (JSON Payload):' : 'Structured JSON Payload:'}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAuditLog.json_payload);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{isCopied ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : lang === 'ar' ? 'نسخ JSON' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed">
                  {selectedAuditLog.json_payload}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-800/30">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-sm transition-all"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
