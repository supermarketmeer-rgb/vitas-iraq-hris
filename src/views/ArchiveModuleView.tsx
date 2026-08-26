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
  const { activeModuleId, language, theme, t } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('employees');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [uploadEmployeeId, setUploadEmployeeId] = useState<string | undefined>(undefined);
  const [uploadCategoryId, setUploadCategoryId] = useState<string | undefined>(undefined);

  // Map activeModuleId to currentTab
  useEffect(() => {
    const tabMap: Record<string, string> = {
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
    // Placeholder for archive functionality
    console.log('Archive document:', docId);
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`min-h-screen font-sans antialiased transition-colors duration-200`}>
      {/* Module Header - matching HRMS design */}
      <div className="mb-6 dark-banner p-6 rounded-3xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <span className="material-symbols-outlined text-2xl">archive</span>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white text-white-force">
              {t('موديول الأرشفة الذكي', 'Smart Archive Module')}
            </h1>
            <p className="text-sm text-slate-400">
              {t('نظام إدارة الوثائق والمستندات المتقدم', 'Advanced Document Management System')}
            </p>
          </div>
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
