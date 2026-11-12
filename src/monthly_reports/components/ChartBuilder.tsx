import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  LineChart as LineIcon, 
  Plus, 
  Trash2, 
  Download, 
  Settings2,
  Maximize2
} from 'lucide-react';
import { ReportDefinition, ChartConfigItem, Language } from '../types/hr';
import { formatCurrencyIQD, formatNumber } from '../services/reportingEngine';

interface ChartBuilderProps {
  report: ReportDefinition;
  data: any[];
  charts: ChartConfigItem[];
  onAddChart: (chart: ChartConfigItem) => void;
  onRemoveChart: (id: string) => void;
  onUpdateChart: (chart: ChartConfigItem) => void;
  language: Language;
}

const PALETTE = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#0284C7', // Sky
  '#7C3AED', // Violet
  '#E11D48', // Rose
  '#475569', // Slate
  '#0D9488'  // Teal
];

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  report,
  data,
  charts,
  onAddChart,
  onRemoveChart,
  onUpdateChart,
  language
}) => {
  const isAr = language === 'ar';
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingChartId, setEditingChartId] = useState<string | null>(null);

  // Form states for creating/editing a chart
  const [chartType, setChartType] = useState<'column' | 'bar' | 'line' | 'area' | 'pie' | 'donut'>('column');
  const [xAxisField, setXAxisField] = useState<string>(report.columns[0]?.key || 'office');
  const [yAxisField, setYAxisField] = useState<string>('count');
  const [aggregation, setAggregation] = useState<'sum' | 'count' | 'avg'>('count');
  const [chartTitle, setChartTitle] = useState<string>('');

  // Identify eligible fields
  const categoricalFields = useMemo(() => {
    return report.columns.filter(c => c.type === 'string' || c.type === 'date');
  }, [report]);

  const numericFields = useMemo(() => {
    return report.columns.filter(c => c.type === 'currency' || c.type === 'number');
  }, [report]);

  const handleOpenAdd = () => {
    setEditingChartId(null);
    setChartType('column');
    setXAxisField(categoricalFields[0]?.key || 'office');
    setYAxisField(numericFields[0]?.key || 'count');
    setAggregation(numericFields.length > 0 ? 'sum' : 'count');
    setChartTitle(isAr ? 'رسم بياني مخصص' : 'Custom Report Chart');
    setShowConfigModal(true);
  };

  const handleSaveChart = () => {
    if (editingChartId) {
      onUpdateChart({
        id: editingChartId,
        type: chartType,
        titleEn: chartTitle || 'Custom Chart',
        titleAr: chartTitle || 'رسم بياني مخصص',
        xAxis: xAxisField,
        yAxis: yAxisField,
        aggregation
      });
    } else {
      onAddChart({
        id: `chart-${Date.now()}`,
        type: chartType,
        titleEn: chartTitle || 'Custom Chart',
        titleAr: chartTitle || 'رسم بياني مخصص',
        xAxis: xAxisField,
        yAxis: yAxisField,
        aggregation
      });
    }
    setShowConfigModal(false);
  };

  // Render individual chart component
  const renderChartGraphic = (cfg: ChartConfigItem) => {
    // Aggregate data by cfg.xAxis
    const aggMap = new Map<string, { label: string; value: number; count: number }>();

    data.forEach((row) => {
      const rawX = row[cfg.xAxis];
      const key = rawX !== undefined && rawX !== null ? String(rawX) : 'Other';
      if (!aggMap.has(key)) {
        aggMap.set(key, { label: key, value: 0, count: 0 });
      }
      const entry = aggMap.get(key)!;
      entry.count += 1;

      if (cfg.yAxis === 'count') {
        entry.value += 1;
      } else {
        const rawY = row[cfg.yAxis];
        const num = typeof rawY === 'number' ? rawY : (parseFloat(String(rawY).replace(/[^0-9.-]/g, '')) || 0);
        entry.value += (isNaN(num) ? 0 : num);
      }
    });

    let chartData = Array.from(aggMap.values());
    if (cfg.aggregation === 'avg') {
      chartData = chartData.map(d => ({
        ...d,
        value: d.count > 0 ? Math.round(d.value / d.count) : 0
      }));
    }

    // Sort descending by value and take top 12 for clean aesthetics
    chartData.sort((a, b) => b.value - a.value);
    if (chartData.length > 12) {
      chartData = chartData.slice(0, 12);
    }

    const isCurrency = cfg.yAxis.toLowerCase().includes('salary') || 
                      cfg.yAxis.toLowerCase().includes('payroll') || 
                      cfg.yAxis.toLowerCase().includes('incentive') ||
                      cfg.yAxis.toLowerCase().includes('allowance');

    const formatTooltipVal = (val: any) => {
      if (typeof val !== 'number') return val;
      return isCurrency ? formatCurrencyIQD(val) : formatNumber(val);
    };

    if (cfg.type === 'pie' || cfg.type === 'donut') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={cfg.type === 'donut' ? 60 : 0}
              outerRadius={85}
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={formatTooltipVal} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (cfg.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(val) => isCurrency ? `${Math.round(val / 1000000)}M` : formatNumber(val)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={formatTooltipVal} />
            <Line type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (cfg.type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={(val) => isCurrency ? `${Math.round(val / 1000000)}M` : formatNumber(val)} tick={{ fontSize: 10 }} />
            <Tooltip formatter={formatTooltipVal} />
            <Area type="monotone" dataKey="value" stroke="#059669" fill="#059669" fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (cfg.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis type="number" tickFormatter={(val) => isCurrency ? `${Math.round(val / 1000000)}M` : formatNumber(val)} tick={{ fontSize: 10 }} />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={80} />
            <Tooltip formatter={formatTooltipVal} />
            <Bar dataKey="value" fill="#4F46E5" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    // Default: Column chart
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
          <YAxis tickFormatter={(val) => isCurrency ? `${Math.round(val / 1000000)}M` : formatNumber(val)} tick={{ fontSize: 10 }} />
          <Tooltip formatter={formatTooltipVal} />
          <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="space-y-4">
      {/* Chart Builder Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {isAr ? 'منصة الرسوم البيانية التفاعلية (Interactive Chart Builder)' : 'Interactive Visualizations & Chart Builder'}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-500">
            {charts.length} {isAr ? 'رسوم' : 'charts'}
          </span>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAr ? 'إضافة رسم بياني جديد' : 'Add New Chart'}</span>
        </button>
      </div>

      {/* Grid of multiple charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {charts.map((cfg) => (
          <div
            key={cfg.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition-all flex flex-col"
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? cfg.titleAr : cfg.titleEn}
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isAr ? 'المحور الأفقي:' : 'X-Axis:'} {cfg.xAxis} · {isAr ? 'المقياس:' : 'Metric:'} {cfg.yAxis} ({cfg.aggregation})
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onRemoveChart(cfg.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded"
                  title={isAr ? 'حذف الرسم' : 'Delete Chart'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chart Graphics */}
            <div className="flex-1 min-h-[260px] pt-1">
              {renderChartGraphic(cfg)}
            </div>
          </div>
        ))}
      </div>

      {/* Chart Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingChartId 
                  ? (isAr ? 'تعديل إعدادات الرسم البياني' : 'Edit Chart Configuration') 
                  : (isAr ? 'إنشاء رسم بياني جديد' : 'Configure New Chart')}
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Chart Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'عنوان الرسم البياني' : 'Chart Title'}
                </label>
                <input
                  type="text"
                  value={chartTitle}
                  onChange={(e) => setChartTitle(e.target.value)}
                  placeholder="e.g. Employee Distribution by Office"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Chart Type Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {isAr ? 'نوع الرسم' : 'Visualization Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'column', label: isAr ? 'أعمدة' : 'Column' },
                    { id: 'bar', label: isAr ? 'شريطي أفقي' : 'Horizontal Bar' },
                    { id: 'line', label: isAr ? 'خطي' : 'Line Trend' },
                    { id: 'area', label: isAr ? 'مساحي' : 'Area' },
                    { id: 'pie', label: isAr ? 'دائري' : 'Pie Chart' },
                    { id: 'donut', label: isAr ? 'حلقي (Donut)' : 'Donut' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setChartType(t.id as any)}
                      className={`p-2 rounded-lg border font-medium text-center transition-colors ${
                        chartType === t.id
                          ? 'bg-teal-50 dark:bg-teal-950 border-teal-600 text-teal-700 dark:text-teal-400'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* X-Axis / Category Field */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'المحور الأفقي / التصنيف (X-Axis)' : 'Category / X-Axis Dimension'}
                </label>
                <select
                  value={xAxisField}
                  onChange={(e) => setXAxisField(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {report.columns.map(col => (
                    <option key={col.key} value={col.key}>
                      {isAr ? col.headerAr : col.headerEn} ({col.key})
                    </option>
                  ))}
                </select>
              </div>

              {/* Y-Axis / Metric Value */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'القيمة / المقياس (Y-Axis)' : 'Value / Y-Axis Metric'}
                </label>
                <select
                  value={yAxisField}
                  onChange={(e) => setYAxisField(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="count">{isAr ? 'العدد التكراري (Count)' : 'Record Count'}</option>
                  {numericFields.map(col => (
                    <option key={col.key} value={col.key}>
                      {isAr ? col.headerAr : col.headerEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aggregation */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'طريقة التجميع' : 'Aggregation Method'}
                </label>
                <select
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="sum">{isAr ? 'المجموع (Sum)' : 'Sum'}</option>
                  <option value="count">{isAr ? 'العدد (Count)' : 'Count'}</option>
                  <option value="avg">{isAr ? 'المتوسط الحسابي (Average)' : 'Average'}</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveChart}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-2xs"
              >
                {isAr ? 'حفظ الرسم وإضافته' : 'Apply & Render Chart'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
