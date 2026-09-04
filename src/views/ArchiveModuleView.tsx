import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmployeeList } from '../components/archive/EmployeeList';
import { EmployeeDigitalFile } from '../components/archive/EmployeeDigitalFile';
import { UploadCenter } from '../components/archive/UploadCenter';
import { AdvancedSearch } from '../components/archive/AdvancedSearch';
import { ExpiryManagement } from '../components/archive/ExpiryManagement';
import { WorkflowManager } from '../components/archive/WorkflowManager';
import { AuditLogsView } from '../components/archive/AuditLogsView';
import { ReportsAnalytics } from '../components/archive/ReportsAnalytics';
import { CategoriesSettings } from '../components/archive/CategoriesSettings';
import { DocumentViewModal } from '../components/archive/DocumentViewModal';

export const ArchiveModuleView: React.FC = () => {
  const { activeModuleId, setActiveModuleId, language, theme, t } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('employees');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [uploadEmployeeId, setUploadEmployeeId] = useState<string | undefined>(undefined);
  const [uploadCategoryId, setUploadCategoryId] = useState<string | undefined>(undefined);

  const tabs = [
    { id: 'employees', moduleId: 'archive-employees', labelAr: 'الملفات الإلكترونية للموظفين', labelEn: 'Employee Digital Files', icon: 'badge' },
    { id: 'upload', moduleId: 'archive-upload', labelAr: 'مركز الرفع والمسح الذكي', labelEn: 'Upload & OCR Center', icon: 'upload_file' },
    { id: 'search', moduleId: 'archive-search', labelAr: 'محرك البحث المتقدم', labelEn: 'Advanced Search', icon: 'search' },
    { id: 'expiry', moduleId: 'archive-expiry', labelAr: 'إدارة الانتهاء والتنبيهات', labelEn: 'Expiry Management', icon: 'event_available' },
    { id: 'workflows', moduleId: 'archive-workflows', labelAr: 'مسارات العمل والـ n8n', labelEn: 'Workflows & n8n', icon: 'account_tree' },
    { id: 'reports', moduleId: 'archive-reports', labelAr: 'التقارير والإحصائيات', labelEn: 'Reports & Analytics', icon: 'analytics' },
    { id: 'audit', moduleId: 'archive-audit', labelAr: 'سجل التدقيق والصلاحيات', labelEn: 'Audit Logs & RBAC', icon: 'security' },
    { id: 'settings', moduleId: 'archive-settings', labelAr: 'التصنيفات وتثبيت النظام', labelEn: 'Categories & System', icon: 'settings' },
  ];

  // Map activeModuleId to currentTab
  useEffect(() => {
    const tabMap: Record<string, string> = {
      'cat-12-archive': 'employees',
      'archive-general': 'employees',
      'archive-employee': 'employees',
      'archive-employees': 'employees',
      'archive-upload': 'upload',
      'archive-search': 'search',
      'archive-expiry': 'expiry',
      'archive-workflows': 'workflows',
      'archive-reports': 'reports',
      'archive-audit': 'audit',
      'archive-settings': 'settings'
    };
    
    if (tabMap[activeModuleId]) {
      setCurrentTab(tabMap[activeModuleId]);
    }
  }, [activeModuleId]);

  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const handleOpenUploadForEmployee = (empId: string, catId?: string) => {
    setUploadEmployeeId(empId);
    setUploadCategoryId(catId);
    setCurrentTab('upload');
  };

  const handleArchiveDocument = async (docId: string) => {
    console.log('Archive document:', docId);
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`min-h-screen font-sans antialiased transition-colors duration-200 space-y-6 animate-in fade-in duration-300`}>
      {/* Module Header - matching HRMS design */}
      <div className={`p-6 rounded-3xl border transition-all ${
        isDark ? 'bg-[#0a0c10] border-white/10 shadow-xl text-white' : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
              isDark ? 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/20 text-white' : 'bg-teal-50 border border-teal-200 text-teal-700'
            }`}>
              <span className="material-symbols-outlined text-3xl">archive</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-2xl font-black tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('موديول الأرشفة الذكي', 'Smart Archive Module')}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                  isDark ? 'bg-teal-900/60 text-white border-teal-400/30' : 'bg-teal-50 text-teal-700 border-teal-200'
                }`}>
                  OCR & EDMS v2.0
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {t('نظام إدارة وحفظ ومطابقة الوثائق والمستندات الرقمية المتقدم', 'Advanced Document Management, OCR & Employee Digital Files System')}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Sub-Navigation Tabs */}
        <div className="mt-6 pt-4 border-t border-teal-500/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setCurrentTab(tab.id);
                  if (tab.moduleId && setActiveModuleId) {
                    setActiveModuleId(tab.moduleId);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-teal-600 text-white font-bold shadow-md scale-[1.02]'
                    : isDark
                    ? 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-white/10'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {/* Tab 1: Employee Digital Profiles */}
        {currentTab === 'employees' && (
          selectedEmployee ? (
            <EmployeeDigitalFile
              employee={selectedEmployee}
              onBack={() => setSelectedEmployee(null)}
              onUploadForEmployee={handleOpenUploadForEmployee}
              onViewDocument={(doc) => setSelectedDocument(doc)}
              onArchiveDocument={handleArchiveDocument}
              language={language}
              theme={theme}
            />
          ) : (
            <EmployeeList
              onSelectEmployee={(emp) => setSelectedEmployee(emp)}
              onAddEmployee={() => setIsAddEmployeeOpen(true)}
              isAddModalOpen={isAddEmployeeOpen}
              setIsAddModalOpen={setIsAddEmployeeOpen}
              language={language}
              theme={theme}
            />
          )
        )}

        {/* Tab 2: Upload & OCR Center */}
        {currentTab === 'upload' && (
          <UploadCenter
            preselectedEmployeeId={uploadEmployeeId}
            preselectedCategoryId={uploadCategoryId}
            onUploadSuccess={(newDoc) => {
              if (newDoc.employeeId) {
                setSelectedEmployee({ id: newDoc.employeeId });
                setCurrentTab('employees');
              }
            }}
            language={language}
            theme={theme}
          />
        )}

        {/* Tab 3: Advanced Search Engine */}
        {currentTab === 'search' && (
          <AdvancedSearch
            onViewDocument={(doc) => setSelectedDocument(doc)}
            onArchiveDocument={handleArchiveDocument}
            language={language}
            theme={theme}
          />
        )}

        {/* Tab 4: Expiration & Alerts Management */}
        {currentTab === 'expiry' && (
          <ExpiryManagement
            onViewDocument={(doc) => setSelectedDocument(doc)}
            language={language}
            theme={theme}
          />
        )}

        {/* Tab 5: Workflow Manager */}
        {currentTab === 'workflows' && (
          <WorkflowManager
            language={language}
            theme={theme}
          />
        )}

        {/* Tab 6: Reports & Analytics */}
        {currentTab === 'reports' && (
          <ReportsAnalytics
            language={language}
            theme={theme}
          />
        )}

        {/* Tab 7: Audit Logs */}
        {currentTab === 'audit' && (
          <AuditLogsView
            language={language}
            theme={theme}
          />
        )}

        {/* Tab 8: Categories & System Settings */}
        {currentTab === 'settings' && (
          <CategoriesSettings
            language={language}
            theme={theme}
          />
        )}
      </main>

      {/* Document View Modal */}
      {selectedDocument && (
        <DocumentViewModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          language={language}
          theme={theme}
        />
      )}
    </div>
  );
};
