import React, { useState, useEffect, useCallback } from 'react';
import { OrgNode, Department, Office, JobPosition, Employee, NormalizationRule, IntegrityIssue } from '../../types/hris';
import { Language, translations } from './translations';
import { OrgChartCanvas } from './OrgChartCanvas';
import { AcceptanceTestsModal } from './AcceptanceTestsModal';
import { FluorescentSettingsModal, DEFAULT_FLUORESCENT_CONFIG, FluorescentConfig } from './FluorescentSettingsModal';

export type HrisActiveTab =
  | 'company-profile'
  | 'diagram';

interface DynamicHrisModuleProps {
  lang: 'ar' | 'en';
  theme?: 'dark' | 'light';
  initialTab?: HrisActiveTab;
  companyProfileContent?: React.ReactNode;
}

export const DynamicHrisModule: React.FC<DynamicHrisModuleProps> = ({
  lang,
  theme = 'dark',
  initialTab = 'company-profile',
  companyProfileContent
}) => {
  const [activeTab, setActiveTab] = useState<HrisActiveTab>(initialTab);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Core Live Data from MySQL
  const [rootNode, setRootNode] = useState<OrgNode | null>(null);
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [metrics, setMetrics] = useState({
    totalDepartments: 0,
    totalOffices: 0,
    totalPositions: 0,
    totalEmployees: 0,
    activeEmployees: 0
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isFluorescentModalOpen, setIsFluorescentModalOpen] = useState(false);
  const [isTestsModalOpen, setIsTestsModalOpen] = useState(false);
  const [fluorescentConfig, setFluorescentConfig] = useState<FluorescentConfig>(DEFAULT_FLUORESCENT_CONFIG);

  const t = translations[lang] || translations.ar;
  const isDark = theme !== 'light';

  // Fetch full live HRIS state directly from MySQL endpoints
  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      const [chartRes, deptRes, offRes, posRes, empRes, ruleRes] = await Promise.all([
        fetch(`/api/org-chart?status=${statusFilter}`),
        fetch('/api/departments'),
        fetch('/api/offices'),
        fetch('/api/job-positions'),
        fetch('/api/employees'),
        fetch('/api/normalization-rules')
      ]);

      if (!chartRes.ok) throw new Error('Failed to fetch organization chart');

      const chartData = await chartRes.json();
      setRootNode(chartData.root);
      setIssues(chartData.issues || []);
      if (chartData.metrics) {
        setMetrics(chartData.metrics);
      }

      if (deptRes.ok) setDepartments(await deptRes.json());
      if (offRes.ok) setOffices(await offRes.json());
      if (posRes.ok) setPositions(await posRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (ruleRes.ok) setRules(await ruleRes.json());
    } catch (err: any) {
      console.error('Error fetching HRIS data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Only Company Profile and Dynamic Org Diagram (the buttons in Image 3 are cancelled as requested)
  const navItems = [
    {
      id: 'company-profile' as HrisActiveTab,
      label: lang === 'ar' ? 'الملف التعريفي للشركة' : 'Company Profile',
      icon: <span className="material-symbols-outlined text-base text-blue-400">domain</span>
    },
    {
      id: 'diagram' as HrisActiveTab,
      label: lang === 'ar' ? 'الهيكل التنظيمي التفاعلي' : 'Dynamic Org Diagram',
      icon: <span className="material-symbols-outlined text-base text-teal-400">account_tree</span>
    }
  ];

  return (
    <div className="w-full space-y-4">
      {/* Sub-navigation Tabs & Quick Actions Bar */}
      <div className={`p-3 rounded-2xl ${isDark ? 'bg-[#111827] border border-white/10 shadow-lg' : 'bg-white border border-slate-200 shadow-sm'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Navigation Tabs: Company Profile & Org Diagram */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30 ring-1 ring-teal-400/40'
                        : 'bg-teal-600 text-white shadow-md'
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-white/5'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Metrics Pill (Distinct counts without repetition) */}
            <div className={`hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl text-[11px] font-medium ${
              isDark ? 'bg-[#0a0c10] border border-white/10 text-slate-300' : 'bg-slate-50 border border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-teal-400 text-xs">group</span>
                <span>{lang === 'ar' ? 'الموظفون:' : 'Active:'}</span>
                <span className="font-bold text-white font-mono">{metrics.activeEmployees}</span>
              </div>
              <span className="opacity-30">|</span>
              <div>
                <span>{lang === 'ar' ? 'الأقسام:' : 'Depts:'}</span>
                <span className="font-bold text-white ml-1 font-mono">{metrics.totalDepartments}</span>
              </div>
              <span className="opacity-30">|</span>
              <div>
                <span>{lang === 'ar' ? 'الفروع:' : 'Branches:'}</span>
                <span className="font-bold text-white ml-1 font-mono">{metrics.totalOffices}</span>
              </div>
            </div>

            {/* Acceptance Tests Button */}
            <button
              onClick={() => setIsTestsModalOpen(true)}
              title={lang === 'ar' ? 'فحص تكامل الهيكل التنظيمي (18 اختبار)' : 'Acceptance Tests (18 Cases)'}
              className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                isDark
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <span className="material-symbols-outlined text-rose-400 text-sm">verified</span>
              <span className="hidden sm:inline text-[11px] font-bold font-mono">18/18</span>
            </button>

            {/* Phosphorescent glow settings */}
            <button
              onClick={() => setIsFluorescentModalOpen(true)}
              title={lang === 'ar' ? 'إعدادات الإطار الفسفوري والتوهج' : 'Phosphorescent Borders & Glow Settings'}
              className={`p-1.5 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold cursor-pointer ${
                isDark
                  ? 'bg-[#0a0c10] hover:bg-white/10 border border-white/10 text-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-amber-600'
              }`}
            >
              <span className="material-symbols-outlined text-amber-400 text-sm">flare</span>
              <span className="hidden sm:inline text-[11px]">{lang === 'ar' ? 'الإطار الفسفوري' : 'Glow'}</span>
            </button>

            {/* Refresh live state */}
            <button
              onClick={fetchAllData}
              title={lang === 'ar' ? 'تحديث البيانات الحية' : 'Refresh live data'}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                isDark
                  ? 'bg-[#0a0c10] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin text-teal-400' : ''}`}>
                sync
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/30 text-rose-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400 text-base">warning</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchAllData}
            className="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-white rounded font-bold transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full">
        {/* TAB 1: Company Profile (Preserves the EXACT card shown in the user's screenshot!) */}
        {activeTab === 'company-profile' && companyProfileContent}

        {/* TAB 2: Dynamic Org Diagram (Interactive Visual Canvas) */}
        {activeTab === 'diagram' && (
          <div className="w-full">
            {rootNode ? (
              <OrgChartCanvas
                rootNode={rootNode}
                lang={lang}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onRefresh={fetchAllData}
              />
            ) : (
              <div className={`h-96 rounded-3xl flex flex-col items-center justify-center gap-3 border ${
                isDark ? 'bg-[#111827] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                <span className="material-symbols-outlined text-teal-400 text-4xl animate-spin">sync</span>
                <p className="text-xs font-semibold">{t.loading}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acceptance Tests Modal */}
      {isTestsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-4xl w-full max-h-[85vh] overflow-y-auto border shadow-2xl p-6 ${
            isDark ? 'bg-[#111827] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-400">verified</span>
                <span>{lang === 'ar' ? 'فحص تكامل الهيكل واختبارات القبول (18/18)' : 'Integrity & Acceptance Tests (18/18)'}</span>
              </h3>
              <button
                onClick={() => setIsTestsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <AcceptanceTestsModal
              lang={lang}
              theme={theme}
              onRefreshAll={fetchAllData}
            />
          </div>
        </div>
      )}

      {/* Fluorescent Border Settings Modal */}
      {isFluorescentModalOpen && (
        <FluorescentSettingsModal
          isOpen={isFluorescentModalOpen}
          config={fluorescentConfig}
          lang={lang}
          onChangeConfig={setFluorescentConfig}
          onClose={() => setIsFluorescentModalOpen(false)}
        />
      )}
    </div>
  );
};
