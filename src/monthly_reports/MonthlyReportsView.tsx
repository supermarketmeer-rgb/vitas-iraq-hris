import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { REPORT_CATALOG, getReportById } from './data/reportCatalog';
import { 
  ReportDefinition, 
  FilterState, 
  Language, 
  ChartConfigItem, 
  SavedTemplate 
} from './types/hr';
import { 
  generateReportData, 
  computeKpiCards,
  setHrDataset
} from './services/reportingEngine';
import { exportReportToExcel } from './services/excelExport';
import { Header } from './components/Header';
import { ReportSelector } from './components/ReportSelector';
import { PeriodFilter } from './components/PeriodFilter';
import { AdditionalFilters } from './components/AdditionalFilters';
import { KpiCards } from './components/KpiCards';
import { DataTable } from './components/DataTable';
import { ChartBuilder } from './components/ChartBuilder';
import { PeriodComparisonModal } from './components/PeriodComparisonModal';
import { ExecutiveSummaryModal } from './components/ExecutiveSummaryModal';
import { DataQualityModal } from './components/DataQualityModal';
import { SnapshotArchiveModal } from './components/SnapshotArchiveModal';
import { TemplatesModal } from './components/TemplatesModal';

export const MonthlyReportsView: React.FC = () => {
  const { language: appLang } = useApp();
  const language: Language = appLang === 'en' ? 'en' : 'ar';
  const isAr = language === 'ar';

  // Selected Report
  const [selectedReport, setSelectedReport] = useState<ReportDefinition>(REPORT_CATALOG[0]);

  // Selected Columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>(REPORT_CATALOG[0].defaultColumns);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    reportId: REPORT_CATALOG[0].id,
    periodType: 'month',
    selectedYear: '2026',
    selectedMonth: '2026-10',
    selectedQuarter: 'Q3',
    fromDate: '2026-10-01',
    toDate: '2026-10-31',
    office: 'All',
    department: 'All',
    category: 'All',
    gender: 'All',
    tier: 'All',
    searchQuery: ''
  });

  // Charts
  const [charts, setCharts] = useState<ChartConfigItem[]>(() => {
    return (REPORT_CATALOG[0].recommendedCharts || []).map((rc, idx) => ({
      id: `rc-${idx}`,
      type: rc.type,
      titleEn: rc.titleEn,
      titleAr: rc.titleAr,
      xAxis: rc.xAxis,
      yAxis: rc.yAxis,
      aggregation: 'sum'
    }));
  });

  // Attached Executive Commentary
  const [attachedCommentary, setAttachedCommentary] = useState<string>('');

  // Live Database Sync State
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [liveEmpCount, setLiveEmpCount] = useState<number>(0);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [dataVersion, setDataVersion] = useState<number>(0);

  const fetchLiveDataset = async () => {
    setIsLoadingLive(true);
    try {
      const res = await fetch('/api/reports/live-dataset');
      const data = await res.json();
      if (data.success && data.dataset) {
        setHrDataset(data.dataset);
        setIsLiveConnected(true);
        setLiveEmpCount(data.dataset.employees?.length || 0);
        setLastSyncTime(new Date().toLocaleTimeString(language === 'ar' ? 'ar-IQ' : 'en-US'));
        setDataVersion(v => v + 1);
      }
    } catch (e) {
      console.warn('Could not fetch live report dataset, using standard fallback:', e);
    } finally {
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    fetchLiveDataset();
  }, []);

  // Modals
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isAiInsightsOpen, setIsAiInsightsOpen] = useState(false);
  const [isDataQualityOpen, setIsDataQualityOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Handle report selection
  const handleSelectReport = (report: ReportDefinition) => {
    setSelectedReport(report);
    setSelectedColumns(report.defaultColumns);
    setFilters(prev => ({
      ...prev,
      reportId: report.id
    }));
    // Reset charts to recommended
    setCharts((report.recommendedCharts || []).map((rc, idx) => ({
      id: `rc-${Date.now()}-${idx}`,
      type: rc.type,
      titleEn: rc.titleEn,
      titleAr: rc.titleAr,
      xAxis: rc.xAxis,
      yAxis: rc.yAxis,
      aggregation: 'sum'
    })));
  };

  // Filter handlers
  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters(prev => ({
      ...prev,
      office: 'All',
      department: 'All',
      category: 'All',
      gender: 'All',
      tier: 'All',
      searchQuery: ''
    }));
  };

  // Column toggles
  const handleToggleColumn = (colKey: string) => {
    if (selectedColumns.includes(colKey)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter(c => c !== colKey));
      }
    } else {
      setSelectedColumns([...selectedColumns, colKey]);
    }
  };

  const handleResetColumns = () => {
    setSelectedColumns(selectedReport.defaultColumns);
  };

  // Chart handlers
  const handleAddChart = (newChart: ChartConfigItem) => {
    setCharts([...charts, newChart]);
  };

  const handleRemoveChart = (id: string) => {
    setCharts(charts.filter(c => c.id !== id));
  };

  const handleUpdateChart = (updated: ChartConfigItem) => {
    setCharts(charts.map(c => c.id === updated.id ? updated : c));
  };

  // Template loader
  const handleLoadTemplate = (tpl: SavedTemplate) => {
    const report = getReportById(tpl.reportId);
    setSelectedReport(report);
    setSelectedColumns(tpl.selectedColumns);
    if (tpl.filters) {
      setFilters(prev => ({ ...prev, ...tpl.filters, reportId: tpl.reportId }));
    }
    if (tpl.charts) {
      setCharts(tpl.charts);
    }
  };

  // Report Data Calculation
  const rawReportRows = useMemo(() => {
    return generateReportData(filters);
  }, [filters, dataVersion]);

  // Apply Live Text Search Query across all fields
  const filteredReportRows = useMemo(() => {
    if (!filters.searchQuery.trim()) return rawReportRows;
    const q = filters.searchQuery.toLowerCase();
    return rawReportRows.filter(row => {
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [rawReportRows, filters.searchQuery]);

  // KPI Cards Calculation
  const kpiCards = useMemo(() => {
    return computeKpiCards(selectedReport.id, filters, rawReportRows);
  }, [selectedReport.id, filters, rawReportRows]);

  // Excel Export Handler
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      await exportReportToExcel({
        report: selectedReport,
        filters,
        columns: selectedColumns,
        data: filteredReportRows,
        kpis: kpiCards,
        language,
        commentary: attachedCommentary
      });
    } catch (err) {
      console.error('Failed to export Excel', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Print Preview
  const handlePrintPreview = () => {
    window.print();
  };

  return (
    <div 
      dir={isAr ? 'rtl' : 'ltr'} 
      className="space-y-5 p-4 sm:p-6 pb-16 text-slate-900 dark:text-slate-100 font-sans transition-colors animate-in fade-in duration-200"
    >
      {/* 1. Header Section */}
      <Header
        language={language}
        reportingPeriod={filters.selectedMonth}
        onExportExcel={handleExportExcel}
        onPrintPreview={handlePrintPreview}
        onOpenDataQuality={() => setIsDataQualityOpen(true)}
        onOpenSnapshots={() => setIsSnapshotsOpen(true)}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenComparison={() => setIsComparisonOpen(true)}
        isExportingExcel={isExportingExcel}
      />

      {/* Main Workspace */}
      <main className="w-full space-y-5">
        
        {/* 2. Prominent Searchable Report Selection ComboBox */}
        <section aria-label="Report Selection">
          <ReportSelector
            selectedReport={selectedReport}
            onSelectReport={handleSelectReport}
            language={language}
          />
        </section>

        {/* 3 & 4. Filter Strip: Reporting Period + Dynamic Filters */}
        <section aria-label="Filters" className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <div className="lg:col-span-5">
            <PeriodFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              language={language}
            />
          </div>
          <div className="lg:col-span-7">
            <AdditionalFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              language={language}
            />
          </div>
        </section>

        {/* 5. Dynamic Executive KPI Scorecard Cards */}
        <section aria-label="Executive KPIs">
          <KpiCards
            cards={kpiCards}
            language={language}
          />
        </section>

        {/* 6. Dynamic Interactive Data Table */}
        <section aria-label="Data Table">
          <DataTable
            report={selectedReport}
            data={filteredReportRows}
            selectedColumns={selectedColumns}
            onToggleColumn={handleToggleColumn}
            onResetColumns={handleResetColumns}
            language={language}
          />
        </section>

        {/* 7. Interactive Chart Builder with Multiple Visualizations */}
        <section aria-label="Visualizations">
          <ChartBuilder
            report={selectedReport}
            data={filteredReportRows}
            charts={charts}
            onAddChart={handleAddChart}
            onRemoveChart={handleRemoveChart}
            onUpdateChart={handleUpdateChart}
            language={language}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 rounded-xl p-3.5 text-center text-xs text-slate-500 dark:text-slate-400 no-print">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {isAr 
              ? 'مؤسسة فيتاس العراق للتمويل الأصغر · نظام التقارير والتحليلات الشهرية للموارد البشرية' 
              : 'VITAS Iraq Microfinance · HR Monthly Reporting & Executive Analytics System'}
          </span>
          <span className="font-mono text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
            {isAr ? 'بيانات معتمدة ومطابقة بنسبة 100%' : '100% Reconciled Multi-Workbook Engine'}
          </span>
        </div>
      </footer>

      {/* Executive Modals */}
      <PeriodComparisonModal
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        language={language}
      />

      <ExecutiveSummaryModal
        isOpen={isAiInsightsOpen}
        onClose={() => setIsAiInsightsOpen(false)}
        report={selectedReport}
        month={filters.selectedMonth}
        language={language}
        onApplyCommentaryToExport={(txt) => setAttachedCommentary(txt)}
      />

      <DataQualityModal
        isOpen={isDataQualityOpen}
        onClose={() => setIsDataQualityOpen(false)}
        language={language}
      />

      <SnapshotArchiveModal
        isOpen={isSnapshotsOpen}
        onClose={() => setIsSnapshotsOpen(false)}
        language={language}
        currentMonth={filters.selectedMonth}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        language={language}
        currentReportId={selectedReport.id}
        currentColumns={selectedColumns}
        currentFilters={filters}
        currentCharts={charts}
        onLoadTemplate={handleLoadTemplate}
      />

    </div>
  );
};

