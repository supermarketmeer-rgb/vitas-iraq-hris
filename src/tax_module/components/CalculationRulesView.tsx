import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext.js';
import {
  Sliders,
  Plus,
  Edit,
  GitBranch,
  ShieldCheck,
  History,
  CheckCircle2,
  AlertTriangle,
  Play,
  Database,
  ArrowDown,
  RefreshCw,
  GitCompare,
  CheckSquare,
  Square,
  Archive,
  Check,
  X,
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter,
  ChevronDown,
  ChevronRight,
  Code2,
  Calendar,
  Zap,
  Search,
  Copy,
  RotateCcw,
  Activity,
  FileSpreadsheet,
  LayoutGrid,
  List,
} from 'lucide-react';
import { CalculationRule, RuleVersion } from '../types.js';
import { RuleVersionComparator } from './RuleVersionComparator.js';
import { RuleVersionHistorySidebar } from './RuleVersionHistorySidebar.js';

export const CalculationRulesView: React.FC = () => {
  const {
    lang,
    t,
    rules,
    snapshots,
    refreshData,
    showNotification,
    setEditingRule,
    setIsRuleModalOpen,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'rules_list' | 'comparator' | 'dependency_graph' | 'sql_tester'>('rules_list');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedRuleForCompare, setSelectedRuleForCompare] = useState<string>('');
  const [historyRule, setHistoryRule] = useState<CalculationRule | null>(null);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState<boolean>(false);
  const [dependencyGraph, setDependencyGraph] = useState<any>(null);
  const [testSql, setTestSql] = useState(
    "SELECT tax_rate FROM tax_brackets WHERE :taxable_income >= min_income AND (:taxable_income <= max_income OR max_income IS NULL) AND :calculation_date >= effective_from AND status = 'ACTIVE'"
  );
  const [sqlValidationResult, setSqlValidationResult] = useState<any>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isCloning, setIsCloning] = useState<boolean>(false);

  // Bulk Operations State: Support both Rule and Version selections
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);
  const [expandedRuleIds, setExpandedRuleIds] = useState<string[]>([]);
  const [bulkCategory, setBulkCategory] = useState<string>('SOCIAL_SECURITY');
  const [isProcessingBulk, setIsProcessingBulk] = useState<boolean>(false);

  const fetchDependencyGraph = async () => {
    try {
      const res = await fetch('/api/tax-module/dependency-graph').then((r) => r.json());
      setDependencyGraph(res);
    } catch (err) {
      console.error('Failed to fetch dependency graph:', err);
    }
  };

  useEffect(() => {
    fetchDependencyGraph();
  }, [rules]);

  const handleTestSql = async () => {
    try {
      const res = await fetch('/api/tax-module/validate-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql_query: testSql }),
      }).then((r) => r.json());
      setSqlValidationResult(res);
    } catch (err) {
      showNotification('SQL verification failed', 'error');
    }
  };

  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => a.execution_order - b.execution_order);
  }, [rules]);

  // Compute filtered rules based on Search, Category, Type, and Version Status filters
  const filteredRules = useMemo(() => {
    return sortedRules.filter((rule) => {
      // 1. Search Query filter (code, name_ar, name_en, output_variable, formulas, change_notes)
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchCode = rule.code?.toLowerCase().includes(q);
        const matchNameAr = (rule.name_ar || '').toLowerCase().includes(q);
        const matchNameEn = (rule.name_en || '').toLowerCase().includes(q);
        const matchOutVar = (rule.output_variable || '').toLowerCase().includes(q);
        const matchFormula = rule.versions?.some((v) =>
          (v.formula_or_query || '').toLowerCase().includes(q) ||
          (v.change_notes || '').toLowerCase().includes(q) ||
          (v.version_code || '').toLowerCase().includes(q)
        );
        if (!matchCode && !matchNameAr && !matchNameEn && !matchOutVar && !matchFormula) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryFilter !== 'ALL' && rule.category !== categoryFilter) {
        return false;
      }

      // 3. Rule Type Filter
      if (typeFilter !== 'ALL' && rule.rule_type !== typeFilter) {
        return false;
      }

      // 4. Version Status Filter (LIVE / DRAFT / ARCHIVED)
      if (statusFilter !== 'ALL') {
        const activeVer = rule.versions.find((v) => v.id === rule.active_version_id) || rule.versions[0];
        const effectiveStatus = activeVer?.status || rule.status;
        if (statusFilter === 'ACTIVE' && effectiveStatus !== 'ACTIVE') return false;
        if (statusFilter === 'DRAFT' && effectiveStatus !== 'DRAFT') return false;
        if (statusFilter === 'INACTIVE' && effectiveStatus !== 'INACTIVE' && effectiveStatus !== 'ARCHIVED') return false;
      }

      return true;
    });
  }, [sortedRules, searchQuery, categoryFilter, typeFilter, statusFilter]);

  // Toggle expand/collapse rule versions
  const toggleExpandRule = (ruleId: string) => {
    setExpandedRuleIds((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]
    );
  };

  // Bulk Select Handlers for Rules & Versions
  const handleToggleSelectAllRules = () => {
    if (selectedRuleIds.length === filteredRules.length && filteredRules.length > 0) {
      setSelectedRuleIds([]);
      setSelectedVersionIds([]);
    } else {
      setSelectedRuleIds(filteredRules.map((r) => r.id));
      setSelectedVersionIds(filteredRules.flatMap((r) => r.versions.map((v) => v.id)));
    }
  };

  const handleToggleSelectRule = (ruleId: string) => {
    const targetRule = sortedRules.find((r) => r.id === ruleId);
    const ruleVersionIds = targetRule ? targetRule.versions.map((v) => v.id) : [];

    if (selectedRuleIds.includes(ruleId)) {
      setSelectedRuleIds((prev) => prev.filter((id) => id !== ruleId));
      setSelectedVersionIds((prev) => prev.filter((id) => !ruleVersionIds.includes(id)));
    } else {
      setSelectedRuleIds((prev) => [...prev, ruleId]);
      setSelectedVersionIds((prev) => Array.from(new Set([...prev, ...ruleVersionIds])));
    }
  };

  const handleToggleSelectVersion = (versionId: string) => {
    setSelectedVersionIds((prev) =>
      prev.includes(versionId) ? prev.filter((id) => id !== versionId) : [...prev, versionId]
    );
  };

  // Clone an existing rule as a new draft
  const handleCloneRule = async (ruleId: string) => {
    setIsCloning(true);
    try {
      const res = await fetch(`/api/tax-module/rules/${ruleId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json());

      if (res.success) {
        showNotification(
          lang === 'ar'
            ? `تم استنساخ القاعدة كمسودة جديدة (${res.rule.code}) بنجاح`
            : `Successfully cloned rule as new draft (${res.rule.code})`,
          'success'
        );
        await refreshData();
      } else {
        showNotification(res.error || 'Failed to clone rule', 'error');
      }
    } catch (err) {
      showNotification('Clone operation failed', 'error');
    } finally {
      setIsCloning(false);
    }
  };

  // Clone a specific rule version as a new draft version
  const handleCloneVersion = async (ruleId: string, versionId: string) => {
    setIsCloning(true);
    try {
      const res = await fetch(`/api/tax-module/rules/${ruleId}/versions/${versionId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json());

      if (res.success) {
        showNotification(
          lang === 'ar'
            ? `تم استنساخ إصدار مسودة جديد (${res.version.version_code}) للقاعدة بنجاح`
            : `Successfully cloned draft version (${res.version.version_code})`,
          'success'
        );
        await refreshData();
      } else {
        showNotification(res.error || 'Failed to clone version', 'error');
      }
    } catch (err) {
      showNotification('Clone version failed', 'error');
    } finally {
      setIsCloning(false);
    }
  };

  // Calculate usage count: how many payroll snapshots are linked to this rule
  const getRuleUsageCount = (rule: CalculationRule) => {
    if (!snapshots || snapshots.length === 0) return 0;
    const codeUpper = (rule.code || '').toUpperCase();
    const outVarLower = (rule.output_variable || '').toLowerCase();
    let count = 0;

    snapshots.forEach((s) => {
      // Check calculation step traces
      const hasStep = s.calculation_steps?.some(
        (step) => step.rule_code?.toUpperCase() === codeUpper
      );
      // Check calculation result output variable mapping
      const hasOutput =
        (s.calculation_result as any)?.[outVarLower] !== undefined ||
        (s.input_values as any)?.[outVarLower] !== undefined;

      if (hasStep || hasOutput) {
        count++;
      }
    });

    return count;
  };

  // Visual status badge helper for Active (Green), Draft (Yellow/Amber), and Archived (Grey/Slate)
  const renderStatusBadge = (status: string, isLiveVersion = false) => {
    if (status === 'ACTIVE' || isLiveVersion) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{lang === 'ar' ? 'نشط (Active)' : 'Active'}</span>
        </span>
      );
    }
    if (status === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>{lang === 'ar' ? 'مسودة (Draft)' : 'Draft'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 shadow-xs">
        <Archive className="w-3 h-3 text-slate-500" />
        <span>{lang === 'ar' ? 'مؤرشف (Archived)' : 'Archived'}</span>
      </span>
    );
  };

  // Bulk Action on Rule Versions (Activate / Archive multiple versions simultaneously)
  const handleBulkVersionAction = async (action: 'ACTIVATE' | 'ARCHIVE') => {
    let targetVersionIds = [...selectedVersionIds];
    if (targetVersionIds.length === 0 && selectedRuleIds.length > 0) {
      targetVersionIds = sortedRules
        .filter((r) => selectedRuleIds.includes(r.id))
        .flatMap((r) => r.versions.map((v) => v.id));
    }

    if (targetVersionIds.length === 0) {
      showNotification(
        lang === 'ar' ? 'يرجى تحديد إصدارات القواعد أولاً' : 'Please select rule versions to perform batch action',
        'error'
      );
      return;
    }

    setIsProcessingBulk(true);
    try {
      const res = await fetch('/api/tax-module/rules/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_ids: targetVersionIds, action }),
      }).then((r) => r.json());

      if (res.success) {
        showNotification(
          lang === 'ar'
            ? `تم تنفيذ (${action === 'ACTIVATE' ? 'التفعيل' : 'الأرشفة'}) الجماعي لـ (${res.updated_count}) إصدار بنجاح`
            : `Successfully performed bulk ${action.toLowerCase()} on ${res.updated_count} rule versions`,
          'success'
        );
        setSelectedVersionIds([]);
        setSelectedRuleIds([]);
        refreshData();
      } else {
        showNotification(res.error || 'Bulk version action failed', 'error');
      }
    } catch (err) {
      showNotification('Error performing bulk version action', 'error');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Bulk Category Update
  const handleBulkCategoryChange = async (targetCategory: string) => {
    if (selectedRuleIds.length === 0) return;
    setIsProcessingBulk(true);
    try {
      const res = await fetch('/api/tax-module/rules/bulk-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule_ids: selectedRuleIds, category: targetCategory }),
      }).then((r) => r.json());

      if (res.success) {
        showNotification(
          lang === 'ar'
            ? `تم نقل وتصنيف (${res.count}) قواعد إلى ${targetCategory} بنجاح`
            : `Successfully re-categorized ${res.count} rules to ${targetCategory}`,
          'success'
        );
        setSelectedRuleIds([]);
        refreshData();
      }
    } catch (err) {
      showNotification('Error updating rule categories', 'error');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const openComparatorForRule = (ruleId: string) => {
    setSelectedRuleForCompare(ruleId);
    setActiveTab('comparator');
  };

  const isAnyFilterActive = searchQuery !== '' || categoryFilter !== 'ALL' || typeFilter !== 'ALL' || statusFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
  };

  const totalSelectedItems = selectedVersionIds.length > 0 ? selectedVersionIds.length : selectedRuleIds.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            {t('calculation_rules')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'إدارة محرك القواعد، الفلاتر والبحث اللحظي، شارات الحالة، استنساخ القواعد، تتبع الاستخدام، ومقارنة الإصدارات'
              : 'Orchestrate calculation formulas, instant search & filter toolbar, status badges, rule cloning, snapshot usage audit, and version topology'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tab navigation */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => setActiveTab('rules_list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'rules_list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'سجل القواعد' : 'Rules Registry'}
            </button>
            <button
              onClick={() => setActiveTab('comparator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'comparator'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'ar' ? 'مقارن الإصدارات' : 'Version Comparator'}</span>
            </button>
            <button
              onClick={() => setActiveTab('dependency_graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dependency_graph'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'مخطط الاعتماديات' : 'Dependency Graph'}
            </button>
            <button
              onClick={() => setActiveTab('sql_tester')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'sql_tester'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'فاحص استعلامات SQL' : 'SQL Security Tester'}
            </button>
          </div>

          <button
            onClick={() => {
              setEditingRule(null);
              setIsRuleModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_new_rule')}</span>
          </button>
        </div>
      </div>

      {/* Floating / Docked Bulk Actions Bar */}
      {(selectedVersionIds.length > 0 || selectedRuleIds.length > 0) && activeTab === 'rules_list' && (
        <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-indigo-800 text-white font-bold flex items-center justify-center text-xs shadow-inner">
              {totalSelectedItems}
            </span>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>
                  {lang === 'ar'
                    ? `تم تحديد (${selectedVersionIds.length} إصدار / ${selectedRuleIds.length} قاعدة) للإجراء الجماعي`
                    : `${selectedVersionIds.length} version(s) & ${selectedRuleIds.length} rule(s) selected for bulk batch action`}
                </span>
                {selectedVersionIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-white font-mono">
                    {selectedVersionIds.length} versions
                  </span>
                )}
              </div>
              <div className="text-[11px] text-indigo-200 mt-0.5">
                {lang === 'ar'
                  ? 'تفعيل أو أرشفة الإصدارات المحددة دفعة واحدة وإعادة تصنيف القواعد'
                  : 'Batch activate or archive selected rule versions simultaneously across the engine'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Activate Rule Versions */}
            <button
              disabled={isProcessingBulk}
              onClick={() => handleBulkVersionAction('ACTIVATE')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              title={lang === 'ar' ? 'تفعيل جميع الإصدارات المحددة' : 'Activate all selected rule versions'}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تفعيل الإصدارات (Bulk Activate)' : 'Bulk Activate Versions'}</span>
            </button>

            {/* Bulk Archive / Deactivate Rule Versions */}
            <button
              disabled={isProcessingBulk}
              onClick={() => handleBulkVersionAction('ARCHIVE')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm inline-flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
              title={lang === 'ar' ? 'أرشفة جميع الإصدارات المحددة' : 'Archive all selected rule versions'}
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'أرشفة الإصدارات (Bulk Archive)' : 'Bulk Archive Versions'}</span>
            </button>

            {/* Bulk Category Selector */}
            <div className="flex items-center gap-1 bg-indigo-950/80 p-1 rounded-xl border border-indigo-700 text-xs">
              <select
                value={bulkCategory}
                onChange={(e) => {
                  setBulkCategory(e.target.value);
                  handleBulkCategoryChange(e.target.value);
                }}
                className="bg-transparent text-xs font-semibold text-white p-1 focus:outline-none cursor-pointer"
              >
                <option value="SOCIAL_SECURITY" className="text-slate-900">
                  {lang === 'ar' ? 'تصنيف: الضمان الاجتماعي' : 'Set Category: Social Security'}
                </option>
                <option value="INCOME_TAX" className="text-slate-900">
                  {lang === 'ar' ? 'تصنيف: ضريبة الدخل' : 'Set Category: Income Tax'}
                </option>
                <option value="GENERAL_PAYROLL" className="text-slate-900">
                  {lang === 'ar' ? 'تصنيف: كشف الرواتب' : 'Set Category: Payroll'}
                </option>
                <option value="EXEMPTION" className="text-slate-900">
                  {lang === 'ar' ? 'تصنيف: الإعفاءات' : 'Set Category: Exemptions'}
                </option>
              </select>
            </div>

            {/* Clear Selection */}
            <button
              onClick={() => {
                setSelectedRuleIds([]);
                setSelectedVersionIds([]);
              }}
              className="p-1.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-indigo-200 hover:text-white transition-colors cursor-pointer"
              title={lang === 'ar' ? 'إلغاء التحديد' : 'Clear selection'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Tab: Rules Registry Table & Card View with Search & Filter Toolbar */}
      {activeTab === 'rules_list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-5 space-y-4">
          {/* Robust Search and Filter Toolbar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Quick Text Search Bar */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'بحث سريع بالاسم، الرمز، المخرجات، أو المعادلة...'
                    : 'Search rules by name, code, variable, formula, or notes...'
                }
                className="w-full ps-10 pe-9 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Filters (Category, Type, Version Status) & View Mode */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{lang === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</option>
                  <option value="SOCIAL_SECURITY">{lang === 'ar' ? 'الضمان الاجتماعي' : 'Social Security'}</option>
                  <option value="INCOME_TAX">{lang === 'ar' ? 'ضريبة الدخل' : 'Income Tax'}</option>
                  <option value="GENERAL_PAYROLL">{lang === 'ar' ? 'كشف الرواتب' : 'General Payroll'}</option>
                  <option value="EXEMPTION">{lang === 'ar' ? 'الإعفاءات' : 'Exemptions'}</option>
                </select>
              </div>

              {/* Rule Type Filter */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
                <Code2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{lang === 'ar' ? 'جميع الأنواع' : 'All Rule Types'}</option>
                  <option value="FORMULA">FORMULA</option>
                  <option value="SQL_QUERY">SQL_QUERY</option>
                  <option value="BRACKET_LOOKUP">BRACKET_LOOKUP</option>
                  <option value="PROGRESSIVE_TAX">PROGRESSIVE_TAX</option>
                  <option value="FIXED_VALUE">FIXED_VALUE</option>
                  <option value="TABLE_LOOKUP">TABLE_LOOKUP</option>
                </select>
              </div>

              {/* Version Status Filter (Active, Draft, Archived) */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-xs">
                <Zap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                  <option value="ACTIVE">{lang === 'ar' ? 'نشط (Active / Live)' : 'Active'}</option>
                  <option value="DRAFT">{lang === 'ar' ? 'مسودة (Draft)' : 'Draft'}</option>
                  <option value="INACTIVE">{lang === 'ar' ? 'مؤرشف (Archived)' : 'Archived'}</option>
                </select>
              </div>

              {/* Reset / Clear Filters Button */}
              {isAnyFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  title={lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset all filters'}
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'مسح الفلاتر' : 'Clear'}</span>
                </button>
              )}

              {/* View Mode Toggle: Table vs Card Grid */}
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={lang === 'ar' ? 'عرض الجدول' : 'Table View'}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title={lang === 'ar' ? 'عرض البطاقات' : 'Cards Grid View'}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filter Counter Badge */}
              <div className="px-3 py-1 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 shrink-0">
                {lang === 'ar'
                  ? `عرض ${filteredRules.length} من أصل ${rules.length} قاعدة`
                  : `Showing ${filteredRules.length} of ${rules.length} rules`}
              </div>
            </div>
          </div>

          {/* TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    {/* Master Checkbox Header */}
                    <th className="p-3.5 text-center w-10">
                      <button
                        onClick={handleToggleSelectAllRules}
                        className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'تحديد الكل / إلغاء تحديد الكل' : 'Select / Deselect all'}
                      >
                        {selectedRuleIds.length === filteredRules.length && filteredRules.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5 text-center w-8">#</th>
                    <th className="p-3.5 text-center">{t('execution_order')}</th>
                    <th className="p-3.5 text-start">{t('rule_code')}</th>
                    <th className="p-3.5 text-start">{lang === 'ar' ? 'اسم القاعدة والتصنيف' : 'Rule Name & Category'}</th>
                    <th className="p-3.5 text-start">{t('rule_type')}</th>
                    <th className="p-3.5 text-start">{lang === 'ar' ? 'المعادلة / الاستعلام النشط' : 'Active Formula'}</th>
                    <th className="p-3.5 text-center">{t('version')}</th>
                    <th className="p-3.5 text-center">{lang === 'ar' ? 'الحالة التشغيلية' : 'Status'}</th>
                    <th className="p-3.5 text-center">{lang === 'ar' ? 'الاستخدام (Usage)' : 'Usage'}</th>
                    <th className="p-3.5 text-center">{lang === 'ar' ? 'إجراءات واستنساخ' : 'Actions & Clone'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-8 text-center text-slate-400">
                        <Filter className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold">
                          {lang === 'ar' ? 'لا توجد قواعد تطابق معايير البحث والتصفية المحددة' : 'No rules match the current search and filter criteria.'}
                        </p>
                        <button
                          onClick={handleClearFilters}
                          className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                        >
                          {lang === 'ar' ? 'مسح الفلاتر وعرض جميع القواعد' : 'Clear filters and show all rules'}
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => {
                      const activeVer = rule.versions.find((v) => v.id === rule.active_version_id) || rule.versions[0];
                      const isRuleSelected = selectedRuleIds.includes(rule.id);
                      const isExpanded = expandedRuleIds.includes(rule.id);
                      const usageCount = getRuleUsageCount(rule);
                      const effectiveStatus = activeVer?.status || rule.status;

                      return (
                        <React.Fragment key={rule.id}>
                          <tr
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                              isRuleSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => handleToggleSelectRule(rule.id)}
                                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                              >
                                {isRuleSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </td>

                            {/* Expand/Collapse Version List */}
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => toggleExpandRule(rule.id)}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                title={lang === 'ar' ? 'عرض تفاصيل الإصدارات' : 'Expand versions'}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>

                            <td className="p-3.5 text-center font-bold text-slate-400">
                              <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 inline-flex items-center justify-center font-mono">
                                {rule.execution_order}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                {rule.code}
                              </span>
                              <div className="text-[11px] text-slate-400 font-mono">{rule.output_variable}</div>
                            </td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {lang === 'ar' ? rule.name_ar : rule.name_en}
                              </div>
                              <div className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                                {rule.category}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                                {rule.rule_type}
                              </span>
                            </td>
                            <td className="p-3.5 max-w-xs font-mono text-[11px] text-slate-600 dark:text-slate-300 truncate" title={activeVer?.formula_or_query}>
                              {activeVer?.formula_or_query || 'N/A'}
                            </td>
                            <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono">
                                {activeVer?.version_code || 'v1.0'}
                              </span>
                              {rule.versions.length > 1 && (
                                <button
                                  onClick={() => toggleExpandRule(rule.id)}
                                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5 hover:underline cursor-pointer"
                                >
                                  {rule.versions.length} versions
                                </button>
                              )}
                            </td>

                            {/* Visual Active, Draft, Archived Status Badges */}
                            <td className="p-3.5 text-center">
                              {renderStatusBadge(effectiveStatus, effectiveStatus === 'ACTIVE')}
                            </td>

                            {/* Usage Column: Number of Linked Payroll Snapshots */}
                            <td className="p-3.5 text-center">
                              <div
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300"
                                title={
                                  lang === 'ar'
                                    ? `مرتبط بـ ${usageCount} كشف راتب وسجل احتساب في النظام`
                                    : `Linked to ${usageCount} payroll calculation snapshots`
                                }
                              >
                                <Database className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                <span className="font-bold text-slate-900 dark:text-white">{usageCount}</span>
                                <span className="text-[10px] text-slate-400 font-sans">
                                  {lang === 'ar' ? 'كشف' : 'snaps'}
                                </span>
                              </div>
                            </td>

                            {/* Actions & Clone */}
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Clone Rule Button */}
                                <button
                                  onClick={() => handleCloneRule(rule.id)}
                                  disabled={isCloning}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                  title={lang === 'ar' ? 'استنساخ هذه القاعدة كمسودة جديدة' : 'Clone rule as new draft template'}
                                >
                                  <Copy className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>{lang === 'ar' ? 'استنساخ' : 'Clone'}</span>
                                </button>

                                {/* Version History Sidebar Trigger */}
                                <button
                                  onClick={() => {
                                    setHistoryRule(rule);
                                    setIsHistorySidebarOpen(true);
                                  }}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title={lang === 'ar' ? 'عرض المخطط الزمني لإصدارات هذه القاعدة' : 'View rule version history timeline'}
                                >
                                  <History className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                  <span>{lang === 'ar' ? 'السجل' : 'History'}</span>
                                </button>

                                {/* Quick Version Comparator Trigger */}
                                <button
                                  onClick={() => openComparatorForRule(rule.id)}
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title={lang === 'ar' ? 'مقارنة إصدارات هذه القاعدة' : 'Compare versions of this rule'}
                                >
                                  <GitCompare className="w-3 h-3" />
                                  <span>{lang === 'ar' ? 'مقارنة' : 'Diff'}</span>
                                </button>

                                {/* Edit Rule / Version Modal */}
                                <button
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setIsRuleModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Version Sub-table for this rule */}
                          {isExpanded && (
                            <tr className="bg-slate-50/70 dark:bg-slate-800/30">
                              <td colSpan={11} className="p-3 ps-12">
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 p-3 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-100 dark:border-slate-800">
                                    <span className="flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                      {lang === 'ar' ? `إصدارات القاعدة (${rule.code})` : `All Versions of (${rule.code})`}
                                    </span>
                                    <span className="text-[11px] font-normal text-slate-400">
                                      {lang === 'ar' ? 'حدد إصدارات محددة للإجراء الجماعي أو استنسخ إصداراً كمسودة' : 'Select individual versions for bulk activation/archival or clone as draft'}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {rule.versions.map((ver) => {
                                      const isVerSelected = selectedVersionIds.includes(ver.id);
                                      const isActiveVer = ver.id === rule.active_version_id;

                                      return (
                                        <div
                                          key={ver.id}
                                          className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                                            isVerSelected
                                              ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30'
                                              : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <button
                                              onClick={() => handleToggleSelectVersion(ver.id)}
                                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                                            >
                                              {isVerSelected ? (
                                                <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                              ) : (
                                                <Square className="w-3.5 h-3.5" />
                                              )}
                                            </button>

                                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                              {ver.version_code}
                                            </span>

                                            {/* Version Operational State Badge */}
                                            {renderStatusBadge(ver.status, isActiveVer)}

                                            <span className="text-[11px] text-slate-400 font-mono">
                                              ({ver.effective_from || '2026-01-01'})
                                            </span>

                                            <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-sm" title={ver.formula_or_query}>
                                              {ver.formula_or_query}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 italic max-w-xs truncate" title={ver.change_notes}>
                                              {ver.change_notes || 'Standard definition'}
                                            </span>

                                            {/* Clone Version Button */}
                                            <button
                                              onClick={() => handleCloneVersion(rule.id, ver.id)}
                                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 cursor-pointer"
                                              title={lang === 'ar' ? 'استنساخ هذا الإصدار كمسودة جديدة' : 'Clone this version as new draft'}
                                            >
                                              <Copy className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                              <span>{lang === 'ar' ? 'استنساخ الإصدار' : 'Clone Ver'}</span>
                                            </button>

                                            <button
                                              onClick={() => openComparatorForRule(rule.id)}
                                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                                            >
                                              <GitCompare className="w-2.5 h-2.5" />
                                              <span>Diff</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CARD GRID VIEW */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {filteredRules.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Filter className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-sm">
                    {lang === 'ar' ? 'لا توجد بطاقات قواعد تطابق معايير التصفية' : 'No rule cards match the current filter criteria.'}
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    {lang === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
                  </button>
                </div>
              ) : (
                filteredRules.map((rule) => {
                  const activeVer = rule.versions.find((v) => v.id === rule.active_version_id) || rule.versions[0];
                  const isRuleSelected = selectedRuleIds.includes(rule.id);
                  const usageCount = getRuleUsageCount(rule);
                  const effectiveStatus = activeVer?.status || rule.status;

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between gap-3 ${
                        isRuleSelected
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-md ring-1 ring-indigo-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Top Header with Status Badge & Order */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleSelectRule(rule.id)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            >
                              {isRuleSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-500">
                              #{rule.execution_order}
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              {rule.code}
                            </span>
                          </div>

                          {/* Operational Status Badge (Active, Draft, Archived) */}
                          <div>
                            {renderStatusBadge(effectiveStatus, effectiveStatus === 'ACTIVE')}
                          </div>
                        </div>

                        {/* Title & Category */}
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {lang === 'ar' ? rule.name_ar : rule.name_en}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {rule.category}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {rule.rule_type}
                          </span>
                        </div>

                        {/* Formula snippet */}
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all line-clamp-2" title={activeVer?.formula_or_query}>
                          {activeVer?.formula_or_query || 'N/A'}
                        </div>

                        {/* Metadata row: Output Variable & Usage */}
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <div className="font-mono text-[10px] text-slate-400">
                            out: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{rule.output_variable}</span>
                          </div>

                          {/* Usage Count Badge */}
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            title={`Linked to ${usageCount} payroll snapshots`}
                          >
                            <Database className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-bold">{usageCount}</span>
                            <span className="text-slate-400">{lang === 'ar' ? 'كشف' : 'snaps'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                        {/* Clone Button */}
                        <button
                          onClick={() => handleCloneRule(rule.id)}
                          disabled={isCloning}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Clone as new draft rule"
                        >
                          <Copy className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{lang === 'ar' ? 'استنساخ' : 'Clone'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setHistoryRule(rule);
                              setIsHistorySidebarOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                            title="Timeline history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openComparatorForRule(rule.id)}
                            className="p-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                            title="Version diff"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRule(rule);
                              setIsRuleModalOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 dark:text-slate-300 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit className="w-3 h-3" />
                            <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Tab: Rule Version Comparator */}
      {activeTab === 'comparator' && (
        <RuleVersionComparator
          initialRuleId={selectedRuleForCompare || (rules.length > 0 ? rules[0].id : undefined)}
        />
      )}

      {/* 3. Tab: Dependency Graph Visualizer */}
      {activeTab === 'dependency_graph' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-emerald-600" />
                {lang === 'ar' ? 'شجرة الاعتماديات والترتيب الطوبولوجي (Topological Execution Flow)' : 'Dependency Graph & Execution Pipeline'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'ar'
                  ? 'يتحقق المحرك آلياً من تسلسل الاعتماديات، ويكتشف أي دورات مغلقة (Circular Dependencies) أو متغيرات مفقودة قبل التفعيل.'
                  : 'Automated acyclic graph verification ensuring deterministic rule execution without circular loops.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {dependencyGraph?.isValid ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'شجرة الاعتماديات سليمة (Acyclic)' : 'Graph Valid (DAG)'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تنبيه: حلقة دائرية أو اعتمادية مفقودة' : 'Circular Dependency / Error'}
                </span>
              )}
            </div>
          </div>

          {/* Pipeline Visual Steps */}
          <div className="space-y-3">
            {sortedRules.map((rule, idx) => (
              <div
                key={rule.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        {lang === 'ar' ? rule.name_ar : rule.name_en}
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold">
                        {rule.output_variable}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lang === 'ar' ? rule.description_ar : rule.description_en}
                    </p>
                  </div>
                </div>

                {/* Dependencies pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {lang === 'ar' ? 'يعتمد على:' : 'Depends on:'}
                  </span>
                  {rule.dependencies.length > 0 ? (
                    rule.dependencies.map((dep) => (
                      <span
                        key={dep}
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                      >
                        {dep}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">
                      {lang === 'ar' ? 'مدخلات أساسية' : 'Root Input'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Tab: SQL Query Security Tester */}
      {activeTab === 'sql_tester' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              {lang === 'ar' ? 'فاحص ومحاكي استعلامات SQL الآمنة (Prepared Statements & AST Validator)' : 'Safe SQL Query Validator'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'ar'
                ? 'يسمح المحرك فقط باستعلامات SELECT مع Prepared Parameters، ويمنع تماماً أي أوامر DDL/DML كـ INSERT أو UPDATE أو DELETE أو DROP أو TRUNCATE أو EXEC.'
                : 'Validates queries in real-time. Strictly blocks dangerous modifications while verifying parameterized bindings.'}
            </p>
          </div>

          <div className="space-y-2">
            <textarea
              rows={4}
              value={testSql}
              onChange={(e) => setTestSql(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleTestSql}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'فحص أمان الاستعلام' : 'Validate Query Security'}</span>
            </button>
          </div>

          {sqlValidationResult && (
            <div
              className={`p-4 rounded-xl border text-xs ${
                sqlValidationResult.isValid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200'
              }`}
            >
              <div className="font-bold flex items-center gap-2">
                {sqlValidationResult.isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'ar' ? 'الاستعلام آمن ومعتمد (SELECT-Only Parameterized Query)' : 'Query Security Verification Passed'}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>{sqlValidationResult.error}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rule Version History Sidebar */}
      <RuleVersionHistorySidebar
        rule={historyRule}
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
        onOpenComparator={openComparatorForRule}
      />
    </div>
  );
};
