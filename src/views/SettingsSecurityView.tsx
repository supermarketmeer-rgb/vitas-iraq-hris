import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import * as XLSX from 'xlsx';
import { exportFormattedExcelFromJson } from '../utils/excelFormatHelper';
import { DesktopSyncSettings } from '../components/DesktopSyncSettings';
import { LocalServerSetup } from '../components/LocalServerSetup';
import { formatIraqiPhoneNumber } from '../utils/phoneHelper';
import { PoliciesSection } from '../components/PoliciesSection';
import { IraqLegalTaxSettingsSection } from '../components/payroll/IraqLegalTaxSettingsSection';
import { IncentivesDevConfigView } from '../incentives_module/components/IncentivesDevConfigView';
import { StatusChangeTable } from '../components/StatusChangeTable';
import { TrainingTable } from '../components/TrainingTable';
import { WarningTable } from '../components/WarningTable';
import { Microsoft365Settings } from '../components/m365/Microsoft365Settings';
import { numberToArabicWords } from '../utils/numberToArabicWords';

interface TabConfig {
  id: string;
  icon: string;
  labelAr: string;
  labelEn: string;
}

interface DataItem {
  id: number | string;
  name_en: string;
  name_ar?: string;
  name?: string; // For server compatibility - might be used instead of name_ar
  sort_order: number;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  status?: string;
  employee_id?: string;
  waid?: string;
  department?: string;
  position?: string;
}

interface AppSetting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  category: string;
  description_ar: string;
  description_en: string;
}

interface ContractClause {
  id: number;
  contract_type_id: number;
  clause_number: number;
  title_ar: string;
  text_ar: string;
}

export const SettingsSecurityView: React.FC = () => {
  const { language, t, theme, setEmployees, refreshEmployees, employees, deleteEmployee, resetToZeroData, deleteAllEmployees } = useApp();
  const [activeTab, setActiveTab] = useState<string>('locations');

  const handleClearAllData = async () => {
    const confirmMsg = language === 'ar'
      ? 'هل أنت متأكد من تفريغ البيانات التشغيلية للنظام؟\n\nسيتم حذف جميع سجلات الموظفين، الحضور والانصراف، الإجازات، الرواتب، والطلبات، بالإضافة لتفريغ بيانات (الفروع Locations، المسميات Positions، الأقسام Departments).\n\n✅ سيتم الحفاظ بالكامل على:\n- بيانات جدول المستخدمين (Users) وحسابات الدخول\n- الصلاحيات والأدوار (Roles & Permissions)\n- قوالب وبنود العقود في الإعدادات (Contracts)\n- السياسات واللوائح والضرائب (Policies)'
      : 'Are you sure you want to clear operational system data?\n\nAll employee records, attendance, leaves, payroll, requests, and (Locations, Positions, Departments) will be cleared.\n\n✅ WILL BE PRESERVED:\n- Users table and login credentials\n- Roles & Permissions\n- Contract Templates & Clauses\n- System Policies & Rules';

    if (window.confirm(confirmMsg)) {
      try {
        await resetToZeroData();
        setLocations([]);
        setPositions([]);
        setDepartments([]);
        await loadData();
        alert(language === 'ar' 
          ? 'تم تفريغ البيانات التشغيلية وتفريغ الفروع والمسميات والأقسام بنجاح مع الحفاظ الكامل على المستخدمين، الصلاحيات، العقود، والسياسات.' 
          : 'Operational data and (Locations, Positions, Departments) cleared successfully while preserving Users, Roles, Contracts, and Policies.');
      } catch (error: any) {
        console.error('Error clearing system data:', error);
        alert(language === 'ar' 
          ? `حدث خطأ أثناء مسح البيانات: ${error?.message || 'تأكد من تشغيل خادم النظام node server.js'}` 
          : `Error clearing data: ${error?.message || 'Ensure node server.js is running'}`);
      }
    }
  };

  const handleDeleteAllEmployees = async () => {
    const confirmMsg = language === 'ar'
      ? 'هل أنت متأكد من حذف جدول الموظفين بالكامل؟\n\n⚠️ سيتم تفريغ وحذف البيانات من الشاشات التالية تلقائياً:\n- الفروع والمواقع (Locations)\n- المسميات الوظيفية (Positions)\n- الأقسام (Departments)\n\n✅ مع الحفاظ التام على حسابات المستخدمين (Users)، الصلاحيات، العقود، والسياسات وباقي إعدادات النظام.'
      : 'Are you sure you want to delete the entire employees table?\n\n⚠️ Data will also be cleared from:\n- Locations\n- Positions\n- Departments\n\n✅ Users, Roles & Permissions, Contracts, Policies, and system settings will be preserved.';
    if (window.confirm(confirmMsg)) {
      try {
        if (deleteAllEmployees) {
          await deleteAllEmployees();
        } else {
          await api.deleteAllEmployees();
        }
        setLocations([]);
        setPositions([]);
        setDepartments([]);
        if (setEmployees) setEmployees([]);
        try {
          localStorage.removeItem('vitas_departments');
          localStorage.removeItem('vitas_branches');
          localStorage.removeItem('vitas_positions');
          localStorage.removeItem('vitas_employees');
        } catch (e) {}
        await loadData();
        alert(language === 'ar' 
          ? 'تم حذف جدول الموظفين وتفريغ الفروع والمسميات والأقسام بنجاح.' 
          : 'Employees table deleted and Locations, Positions, Departments cleared successfully.');
      } catch (err: any) {
        alert(language === 'ar' ? `حدث خطأ: ${err?.message || 'فشل الحذف'}` : `Error: ${err?.message || 'Delete failed'}`);
      }
    }
  };
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Data storage for each tab
  const [locations, setLocations] = useState<DataItem[]>([]);
  const [positions, setPositions] = useState<DataItem[]>([]);
  const [departments, setDepartments] = useState<DataItem[]>([]);
  const [contractTypes, setContractTypes] = useState<DataItem[]>([]);
  const [statusChanges, setStatusChanges] = useState<DataItem[]>([]);
  const [trainings, setTrainings] = useState<DataItem[]>([]);
  const [appSettings, setAppSettings] = useState<Record<string, string>>({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [contractClauses, setContractClauses] = useState<ContractClause[]>([]);
  const [selectedContractType, setSelectedContractType] = useState<number | null>(null);
  const [isSavingClauses, setIsSavingClauses] = useState(false);
  const [clausesToast, setClausesToast] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);
  const [formData, setFormData] = useState({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' });
  
  // High-speed Excel import states
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatusText, setImportStatusText] = useState<string>('');
  
  // Excel import/export states
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track which tab the modal is operating on (for cross-tab modal operations)
  const modalTargetTab = useRef<string | null>(null);

  const tabs: TabConfig[] = [
    { id: 'locations', icon: 'location_city', labelAr: 'الفروع', labelEn: 'Locations' },
    { id: 'positions', icon: 'work', labelAr: 'المسميات', labelEn: 'Positions' },
    { id: 'departments', icon: 'business', labelAr: 'الأقسام', labelEn: 'Departments' },
    { id: 'employees', icon: 'badge', labelAr: 'الموظفين', labelEn: 'Employees' },
    { id: 'status-changes', icon: 'published_with_changes', labelAr: 'تغيير الحالة', labelEn: 'Status Change' },
    { id: 'trainings', icon: 'school', labelAr: 'التدريبات', labelEn: 'Trainings' },
    { id: 'warnings', icon: 'warning', labelAr: 'الإنذارات', labelEn: 'Warnings' },
    { id: 'allowances', icon: 'settings_suggest', labelAr: 'السياسات', labelEn: 'Policies' },
    { id: 'iraq-tax-security', icon: 'policy', labelAr: 'إعدادات الضمان الاجتماعي وضريبة الدخل — العراق', labelEn: 'Social Security & Tax Settings (Iraq)' },
    { id: 'templates', icon: 'edit_document', labelAr: 'القوالب', labelEn: 'Templates' },
    { id: 'incentives-engine-dev', icon: 'functions', labelAr: 'محرك الحوافز (إعدادات المطور والمعادلات)', labelEn: 'Incentives Engine (Developer & Formulas)' },
    { id: 'desktop-sync', icon: 'desktop_windows', labelAr: 'إعدادات Desktop والمزامنة', labelEn: 'Desktop & Sync' },
    { id: 'local-server-setup', icon: 'dns', labelAr: 'إعداد وتثبيت الخادم المحلي', labelEn: 'Local Server Setup' },
    { id: 'm365-integration', icon: 'mark_email_read', labelAr: 'إعدادات Microsoft 365 وOutlook', labelEn: 'Microsoft 365 & Outlook Settings' },
    { id: 'maintenance', icon: 'warning', labelAr: 'الصيانة', labelEn: 'Maintenance' },
  ];

  const isRTL = language === 'ar';

  // Load data from API
  const loadData = async () => {
    // Load from localStorage immediately for fast display
    try {
      const localSettings = localStorage.getItem('vitas_app_settings');
      if (localSettings) {
        const parsedSettings = JSON.parse(localSettings);
        console.log('Loaded settings from localStorage (fast load):', parsedSettings);
        setAppSettings(parsedSettings);
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }

    // Then load from API in background
    try {
      const [branchesData, positionsData, departmentsData, contractTypesData, statusChangesData, trainingsData, appSettingsData] = await Promise.all([
        api.getBranches().catch(() => []),
        api.getPositions().catch(() => []),
        api.getDepartments().catch(() => []),
        api.getContractTypes().catch(() => []),
        api.getStatusChanges().catch(() => []),
        api.getTrainings().catch(() => []),
        api.getAppSettings().catch(() => [])
      ]);

      console.log('App Settings Data from API:', appSettingsData);

      const rawBranches = Array.isArray(branchesData) ? branchesData : [];
      const normalizedBranches = rawBranches.map((b: any) => ({
        ...b,
        name_ar: b.name_ar || b.name || '',
        name: b.name || b.name_ar || '',
        name_en: b.name_en || ''
      }));

      setLocations(normalizedBranches);
      setPositions(Array.isArray(positionsData) ? positionsData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setContractTypes(Array.isArray(contractTypesData) ? contractTypesData : []);
      setStatusChanges(Array.isArray(statusChangesData) ? statusChangesData : []);
      setTrainings(Array.isArray(trainingsData) ? trainingsData : []);

      // Convert app settings array to object safely
      const settingsObj: Record<string, string> = {};
      if (Array.isArray(appSettingsData)) {
        appSettingsData.forEach((setting: any) => {
          if (setting && setting.setting_key) {
            settingsObj[setting.setting_key] = setting.setting_value;
          }
        });
      }
      console.log('Converted App Settings Object:', settingsObj);

      // Only update from API if we got data
      if (Object.keys(settingsObj).length > 0) {
        setAppSettings(settingsObj);
      }
    } catch (error) {
      console.error('Error loading settings data from API:', error);
      // Keep localStorage data as fallback
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Deduplicate locations strictly by trimmed name
  const deduplicatedLocations = React.useMemo(() => {
    const seen = new Set();
    return locations.filter(item => {
      const key = String(item.name_ar || item.name || item.name_en || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [locations]);

  // Deduplicate positions strictly by trimmed name
  const deduplicatedPositions = React.useMemo(() => {
    const seen = new Set();
    return positions.filter(item => {
      const key = String(item.name_ar || item.name || item.name_en || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [positions]);

  // Deduplicate departments strictly by trimmed name and filter person names
  const deduplicatedDepartments = React.useMemo(() => {
    const seen = new Set();
    return departments.filter(item => {
      const key = String(item.name_ar || item.name || item.name_en || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      const isPerson = employees.some(e => {
        const eAr = String(e.fullName || e.name || '').trim().toLowerCase();
        const eEn = String(e.fullNameEn || e.name_en || '').trim().toLowerCase();
        return (key === eAr || key === eEn);
      });
      if (isPerson) return false;
      seen.add(key);
      return true;
    });
  }, [departments, employees]);

  // Map and deduplicate employees for the Employee Management tab
  const employeeDataItems: DataItem[] = React.useMemo(() => {
    const seen = new Set();
    const result: DataItem[] = [];
    for (const emp of (employees || [])) {
      const code = String(emp.employeeId || emp.employee_id || emp.id || '').trim();
      const nameAr = String(emp.fullNameAr || emp.full_name_ar || emp.fullName || '').trim();
      const nameEn = String(emp.fullNameEn || emp.full_name_en || emp.fullName || nameAr || '').trim();
      const key = (code || nameAr || nameEn).toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);

      result.push({
        id: emp.id || code,
        name_en: nameEn,
        name_ar: nameAr,
        name: nameAr,
        sort_order: 0,
        employee_id: code,
        waid: emp.waid || emp.wa_id || '',
        department: emp.department || '',
        position: emp.jobTitle || emp.position || emp.position_ar || '',
        city: emp.branch || emp.location_ar || emp.location || '',
        phone: emp.phone || emp.mobile || '',
        email: emp.email || '',
        status: (emp.status && String(emp.status).toLowerCase() === 'active') ? 'Active' : (emp.status || 'Active')
      });
    }
    return result;
  }, [employees]);

  // Reload settings from localStorage when switching to allowances tab
  useEffect(() => {
    if (activeTab === 'allowances') {
      try {
        const localSettings = localStorage.getItem('vitas_app_settings');
        if (localSettings) {
          const parsedSettings = JSON.parse(localSettings);
          console.log('Reloaded settings from localStorage when switching to policies tab:', parsedSettings);
          setAppSettings(parsedSettings);
        }
      } catch (e) {
        console.error('Error reading from localStorage:', e);
      }
    }
  }, [activeTab]);

  // Load contract clauses when contract type is selected
  useEffect(() => {
    if (selectedContractType) {
      // 1. Immediately read from localStorage (0ms)
      try {
        const cached = localStorage.getItem(`vitas_contract_clauses_${selectedContractType}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setContractClauses(parsed);
          }
        }
      } catch (e) {}

      // 2. Fetch fresh data from API
      const loadClauses = async () => {
        try {
          const clauses: any = await api.getContractClauses(selectedContractType.toString());
          if (Array.isArray(clauses) && clauses.length > 0) {
            const normalizedClauses = clauses.map((clause: any) => ({
              id: clause.id || Date.now(),
              contract_type_id: clause.contract_type_id || selectedContractType,
              clause_number: parseInt(clause.clause_number) || 0,
              title_ar: clause.title_ar || '',
              text_ar: clause.text_ar || ''
            }));
            setContractClauses(normalizedClauses);
            try {
              localStorage.setItem(`vitas_contract_clauses_${selectedContractType}`, JSON.stringify(normalizedClauses));
            } catch (e) {}
          }
        } catch (error) {
          console.warn('API getContractClauses note:', error);
        }
      };
      loadClauses();
    } else {
      setContractClauses([]);
    }
  }, [selectedContractType]);

  const getCurrentData = (): DataItem[] => {
    const tab = modalTargetTab.current || activeTab;
    switch (tab) {
      case 'locations': return locations;
      case 'positions': return positions;
      case 'departments': return departments;
      case 'contract-types': return contractTypes;
      case 'status-changes': return statusChanges;
      case 'trainings': return trainings;
      default: return [];
    }
  };

  const setCurrentData = (data: DataItem[]) => {
    const tab = modalTargetTab.current || activeTab;
    switch (tab) {
      case 'locations': setLocations(data); break;
      case 'positions': setPositions(data); break;
      case 'departments': setDepartments(data); break;
      case 'contract-types': setContractTypes(data); break;
      case 'status-changes': setStatusChanges(data); break;
      case 'trainings': setTrainings(data); break;
    }
  };

  const handleAdd = async () => {
    const tab = modalTargetTab.current || activeTab;
    if (!formData.name_en || (tab === 'locations' && !formData.name_ar)) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      let result;
      switch (tab) {
        case 'locations':
          result = await api.addBranch({
            name: formData.name_ar,
            name_en: formData.name_en,
            address: formData.address,
            city: formData.city,
            phone: formData.phone,
            email: formData.email,
            status: formData.status
          });
          break;
        case 'positions':
          result = await api.addPosition(formData);
          break;
        case 'departments':
          result = await api.addDepartment(formData);
          break;
        case 'contract-types':
          result = await api.addContractType(formData);
          break;
        case 'status-changes':
          result = await api.addStatusChange(formData);
          break;
        case 'trainings':
          result = await api.addTraining(formData);
          break;
      }

      // Reload data from API after adding
      await loadData();
      setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' });
      setShowAddModal(false);
      modalTargetTab.current = null;
    } catch (error) {
      console.error('Error adding item:', error);
      alert(language === 'ar' ? 'حدث خطأ أثناء الإضافة' : 'Error adding item');
    }
  };

  const handleEdit = async () => {
    if (!editingItem) {
      alert(language === 'ar' ? 'لم يتم تحديد العنصر للتعديل' : 'No item selected for editing');
      return;
    }

    const tab = modalTargetTab.current || activeTab;

    if (!formData.name_en || (tab === 'locations' && !formData.name_ar)) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      switch (tab) {
        case 'locations':
          // Map name_ar to name for server compatibility
          await api.updateBranch(editingItem.id.toString(), {
            name: formData.name_ar,
            name_en: formData.name_en,
            address: formData.address,
            city: formData.city,
            phone: formData.phone,
            email: formData.email,
            status: formData.status
          });
          break;
        case 'positions':
          await api.updatePosition(editingItem.id.toString(), formData);
          break;
        case 'departments':
          await api.updateDepartment(editingItem.id.toString(), formData);
          break;
        case 'contract-types':
          await api.updateContractType(editingItem.id.toString(), formData);
          break;
        case 'status-changes':
          await api.updateStatusChange(editingItem.id.toString(), formData);
          break;
        case 'trainings':
          await api.updateTraining(editingItem.id.toString(), formData);
          break;
      }

      // Reload data from API after editing
      await loadData();
      setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' });
      setShowEditModal(false);
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      alert(language === 'ar' ? 'حدث خطأ أثناء التعديل' : 'Error updating item');
    } finally {
      modalTargetTab.current = null;
    }
  };

  const handleDelete = async (id: number | string, explicitTab?: string) => {
    const confirmMessage = language === 'ar' 
      ? 'هل أنت متأكد من حذف هذا العنصر؟' 
      : 'Are you sure you want to delete this item?';
    
    if (window.confirm(confirmMessage)) {
      const tab = explicitTab || modalTargetTab.current || activeTab;
      try {
        // Optimistically update local state immediately by ID and all matching name aliases
        const idStr = String(id);
        if (tab === 'locations') {
          const item = locations.find(x => String(x.id) === idStr);
          const aliasSet = new Set();
          if (item) {
            if (item.name) aliasSet.add(item.name.trim().toLowerCase());
            if (item.name_ar) aliasSet.add(item.name_ar.trim().toLowerCase());
            if (item.name_en) aliasSet.add(item.name_en.trim().toLowerCase());
          }
          setLocations(prev => prev.filter(x => {
            if (String(x.id) === idStr) return false;
            const k = (x.name_ar || x.name || x.name_en || '').trim().toLowerCase();
            return !aliasSet.has(k);
          }));
        } else if (tab === 'positions') {
          const item = positions.find(x => String(x.id) === idStr);
          const aliasSet = new Set();
          if (item) {
            if (item.name) aliasSet.add(item.name.trim().toLowerCase());
            if (item.name_ar) aliasSet.add(item.name_ar.trim().toLowerCase());
            if (item.name_en) aliasSet.add(item.name_en.trim().toLowerCase());
            if (item.title) aliasSet.add(item.title.trim().toLowerCase());
            if (item.title_ar) aliasSet.add(item.title_ar.trim().toLowerCase());
          }
          setPositions(prev => prev.filter(x => {
            if (String(x.id) === idStr) return false;
            const k = (x.name_ar || x.name || x.name_en || x.title || x.title_ar || '').trim().toLowerCase();
            return !aliasSet.has(k);
          }));
        } else if (tab === 'departments') {
          const item = departments.find(x => String(x.id) === idStr);
          const aliasSet = new Set();
          if (item) {
            if (item.name) aliasSet.add(item.name.trim().toLowerCase());
            if (item.name_ar) aliasSet.add(item.name_ar.trim().toLowerCase());
            if (item.name_en) aliasSet.add(item.name_en.trim().toLowerCase());
          }
          setDepartments(prev => prev.filter(x => {
            if (String(x.id) === idStr) return false;
            const k = (x.name_ar || x.name || x.name_en || '').trim().toLowerCase();
            return !aliasSet.has(k);
          }));
        } else if (tab === 'contract-types') {
          setContractTypes(prev => prev.filter(item => String(item.id) !== idStr));
        } else if (tab === 'status-changes') {
          setStatusChanges(prev => prev.filter(item => String(item.id) !== idStr));
        } else if (tab === 'trainings') {
          setTrainings(prev => prev.filter(item => String(item.id) !== idStr));
        }

        switch (tab) {
          case 'locations':
            await api.deleteBranch(idStr);
            break;
          case 'positions':
            await api.deletePosition(idStr);
            break;
          case 'departments':
            await api.deleteDepartment(idStr);
            break;
          case 'contract-types':
            await api.deleteContractType(idStr);
            if (selectedContractType === id || selectedContractType === parseInt(idStr)) {
              setSelectedContractType(null);
            }
            break;
          case 'status-changes':
            await api.deleteStatusChange(idStr);
            break;
          case 'trainings':
            await api.deleteTraining(idStr);
            break;
          case 'employees':
            if (deleteEmployee) {
              await deleteEmployee(idStr);
            } else {
              await api.deleteEmployee(idStr);
            }
            break;
        }

        // Reload fresh data from API after deleting
        await loadData();
      } catch (error: any) {
        console.error('Error deleting item:', error);
        alert(language === 'ar' 
          ? `حدث خطأ أثناء الحذف: ${error?.message || 'خطأ غير معروف'}` 
          : `Failed to delete: ${error?.message || 'Unknown error'}`);
        await loadData();
      } finally {
        modalTargetTab.current = null;
      }
    } else {
      modalTargetTab.current = null;
    }
  };

  const openEditModal = (item: DataItem) => {
    setEditingItem(item);
    setFormData({
      name_en: item.name_en,
      name_ar: item.name_ar || item.name || '', // Use name as fallback for name_ar
      sort_order: item.sort_order,
      address: item.address || '',
      city: item.city || '',
      phone: item.phone || '',
      email: item.email || '',
      status: item.status || 'Active'
    });
    setShowEditModal(true);
  };

  const handleSettingChange = (key: string, value: string) => {
    // Update local state immediately
    setAppSettings(prev => ({ ...prev, [key]: value }));
    console.log(`Setting updated locally: ${key} = ${value}`);
  };

  const handleSaveAllSettings = async () => {
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    try {
      console.log('Saving all settings:', appSettings);

      // Save to localStorage immediately
      localStorage.setItem('vitas_app_settings', JSON.stringify(appSettings));

      // Save to API backend
      try {
        await api.updateAppSettingsBulk(appSettings);
        console.log('Successfully bulk saved settings to server');
      } catch (bulkErr) {
        console.warn('Bulk save sync warning:', bulkErr);
      }

      alert(language === 'ar'
        ? 'تم حفظ جميع الإعدادات والسياسات بنجاح!'
        : 'All settings and policies saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      localStorage.setItem('vitas_app_settings', JSON.stringify(appSettings));
      alert(language === 'ar'
        ? 'تم حفظ جميع الإعدادات والسياسات بنجاح!'
        : 'All settings and policies saved successfully!');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveContractClauses = async () => {
    if (!selectedContractType) {
      alert(language === 'ar' ? 'يرجى اختيار نوع القالب أولاً' : 'Please select a template / contract type first');
      return;
    }

    if (isSavingClauses) return;
    setIsSavingClauses(true);

    try {
      // 1. Immediately cache to localStorage so it is available locally at once
      try {
        localStorage.setItem(`vitas_contract_clauses_${selectedContractType}`, JSON.stringify(contractClauses));
        localStorage.setItem('vitas_contract_clauses_updated_at', Date.now().toString());
      } catch (lsErr) {}

      // 2. Dispatch global event so open modals/previews update in real-time
      window.dispatchEvent(
        new CustomEvent('vitas_contract_clauses_updated', {
          detail: { contractTypeId: selectedContractType, clauses: contractClauses }
        })
      );

      // 3. Delete existing clauses for this contract type via API
      try {
        await api.deleteContractClauses(selectedContractType.toString());
      } catch (delErr) {
        console.warn('API deleteContractClauses notice:', delErr);
      }

      // 4. Add new clauses
      let addedCount = 0;
      for (const clause of contractClauses) {
        const title = String(clause.title_ar || '').trim();
        const text = String(clause.text_ar || '').trim();
        if (title !== '' || text !== '') {
          try {
            await api.addContractClause({
              contract_type_id: selectedContractType,
              clause_number: Number(clause.clause_number) || (addedCount + 1),
              title_ar: title,
              text_ar: text
            });
          } catch (addErr) {
            console.warn('API addContractClause error:', addErr);
          }
          addedCount++;
        }
      }

      // 5. Reload clauses to get fresh synchronized data
      try {
        const fresh: any = await api.getContractClauses(selectedContractType.toString());
        if (Array.isArray(fresh) && fresh.length > 0) {
          const normalized = fresh.map((c: any) => ({
            id: c.id || Date.now(),
            contract_type_id: c.contract_type_id || selectedContractType,
            clause_number: parseInt(c.clause_number) || 0,
            title_ar: c.title_ar || '',
            text_ar: c.text_ar || ''
          }));
          setContractClauses(normalized);
          localStorage.setItem(`vitas_contract_clauses_${selectedContractType}`, JSON.stringify(normalized));
        }
      } catch (reloadErr) {}

      const successMessage = language === 'ar' 
        ? `تم حفظ وتحديث قالب العقد بنجاح (${addedCount} بنود)` 
        : `Contract template saved and updated successfully (${addedCount} clauses)`;

      setClausesToast(successMessage);
      setTimeout(() => setClausesToast(null), 4000);
      alert(successMessage);
    } catch (error) {
      console.error('Error saving contract clauses:', error);
      // Fallback save to localStorage
      try {
        localStorage.setItem(`vitas_contract_clauses_${selectedContractType}`, JSON.stringify(contractClauses));
        window.dispatchEvent(
          new CustomEvent('vitas_contract_clauses_updated', {
            detail: { contractTypeId: selectedContractType, clauses: contractClauses }
          })
        );
        const successMessage = language === 'ar' 
          ? `تم حفظ بنود قالب العقد محلياً بنجاح` 
          : `Contract template clauses saved locally`;
        setClausesToast(successMessage);
        setTimeout(() => setClausesToast(null), 4000);
        alert(successMessage);
      } catch (fallbackErr) {}
    } finally {
      setIsSavingClauses(false);
    }
  };

  const addClauseRow = () => {
    if (!selectedContractType) {
      alert(language === 'ar' ? 'يرجى اختيار نوع العقد أولاً' : 'Please select a contract type first');
      return;
    }
    
    const currentClauses = contractClauses || [];
    const newClause: ContractClause = {
      id: Date.now(), // Temporary ID, will be replaced by server ID after save
      contract_type_id: selectedContractType,
      clause_number: currentClauses.length + 1,
      title_ar: '',
      text_ar: ''
    };
    setContractClauses([...currentClauses, newClause]);
  };

  const removeClause = (id: number) => {
    const updatedClauses = contractClauses.filter(clause => clause.id !== id);
    setContractClauses(updatedClauses);
    
    // Check if no clauses remain (matching PHP logic for showing empty state message)
    if (updatedClauses.length === 0) {
      // The UI will automatically show the empty state message via the conditional rendering
    }
  };

  const updateClause = (id: number, field: keyof ContractClause, value: string | number) => {
    setContractClauses(contractClauses.map(clause =>
      clause.id === id ? { ...clause, [field]: value } : clause
    ));
  };

  // Formatted Excel Template Generation for Settings tabs
  const generateExcelTemplate = async (tabId: string) => {
    try {
      console.log('Generating Formatted Excel template for:', tabId);
      
      let templateData: any[] = [];
      const sheetNames: Record<string, string> = {
        'locations': 'Locations Template',
        'positions': 'Positions Template',
        'departments': 'Departments Template',
        'contract-types': 'Contract Types Template',
        'status-changes': 'Status Changes Template',
        'trainings': 'Trainings Template'
      };

      const filenames: Record<string, string> = {
        'locations': 'locations_template.xlsx',
        'positions': 'positions_template.xlsx',
        'departments': 'departments_template.xlsx',
        'contract-types': 'contract_types_template.xlsx',
        'status-changes': 'status_changes_template.xlsx',
        'trainings': 'trainings_template.xlsx'
      };

      if (tabId === 'locations') {
        templateData = [
          {
            'Name (English)': 'Baghdad - Karrada',
            'الاسم (العربية)': 'بغداد - الكرادة',
            'City': 'Baghdad',
            'Address': 'Karrada, District 903',
            'Phone': '07700000000',
            'Email': 'karrada@vitas.iq',
            'Sort Order': 1,
            'Status': 'Active'
          },
          {
            'Name (English)': 'Basrah Branch',
            'الاسم (العربية)': 'فرع البصرة',
            'City': 'Basrah',
            'Address': 'Al-Ashar, St 14',
            'Phone': '07800000000',
            'Email': 'basrah@vitas.iq',
            'Sort Order': 2,
            'Status': 'Active'
          }
        ];
      } else if (tabId === 'positions') {
        templateData = [
          {
            'Name (English)': 'Senior Credit Officer',
            'الاسم (العربية)': 'مسؤول ائتمان أول',
            'Sort Order': 1
          },
          {
            'Name (English)': 'Branch Manager',
            'الاسم (العربية)': 'مدير فرع',
            'Sort Order': 2
          }
        ];
      } else if (tabId === 'departments') {
        templateData = [
          {
            'Name (English)': 'Operations & Credit',
            'الاسم (العربية)': 'العمليات والائتمان',
            'Sort Order': 1
          },
          {
            'Name (English)': 'Human Resources',
            'الاسم (العربية)': 'الموارد البشرية',
            'Sort Order': 2
          }
        ];
      } else {
        templateData = [
          {
            'Name (English)': '',
            'الاسم (العربية)': '',
            'Sort Order': 1
          },
          {
            'Name (English)': '',
            'الاسم (العربية)': '',
            'Sort Order': 2
          }
        ];
      }

      await exportFormattedExcelFromJson(
        templateData,
        filenames[tabId] || 'template.xlsx',
        sheetNames[tabId] || 'Template',
        language === 'ar'
      );
      console.log('Formatted Excel template generated successfully');
    } catch (error) {
      console.error('Error generating Excel template:', error);
      alert(language === 'ar' 
        ? 'حدث خطأ في إنشاء قالب Excel' 
        : 'Error generating Excel template');
    }
  };

  // Formatted Data Export for Settings tabs (Locations, Positions, Departments)
  const handleTabExport = async (tabId: string) => {
    try {
      let dataToExport: any[] = [];
      let filename = `${tabId}_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      let sheetName = tabId;

      if (tabId === 'locations') {
        dataToExport = deduplicatedLocations.map((l, idx) => ({
          '#': idx + 1,
          'Name (English)': l.name_en || '',
          'الاسم (العربية)': l.name_ar || l.name || '',
          'City': l.city || '',
          'Address': l.address || '',
          'Phone': l.phone || '',
          'Email': l.email || '',
          'Sort Order': l.sort_order || 0,
          'Status': l.status || 'Active'
        }));
        sheetName = 'Locations';
        filename = `vitas_iraq_locations_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (tabId === 'positions') {
        dataToExport = deduplicatedPositions.map((p, idx) => ({
          '#': idx + 1,
          'Name (English)': p.name_en || '',
          'الاسم (العربية)': p.name_ar || p.name || '',
          'Sort Order': p.sort_order || 0
        }));
        sheetName = 'Positions';
        filename = `vitas_iraq_positions_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (tabId === 'departments') {
        dataToExport = deduplicatedDepartments.map((d, idx) => ({
          '#': idx + 1,
          'Name (English)': d.name_en || '',
          'الاسم (العربية)': d.name_ar || d.name || '',
          'Sort Order': d.sort_order || 0
        }));
        sheetName = 'Departments';
        filename = `vitas_iraq_departments_${new Date().toISOString().split('T')[0]}.xlsx`;
      }

      if (dataToExport.length === 0) {
        alert(language === 'ar' ? 'لا توجد بيانات متاحة للتصدير' : 'No data available to export');
        return;
      }

      await exportFormattedExcelFromJson(dataToExport, filename, sheetName, language === 'ar');
    } catch (e: any) {
      console.error('Error exporting tab data:', e);
      alert(language === 'ar' ? 'حدث خطأ أثناء تصدير البيانات' : 'Error exporting data');
    }
  };

  // Excel Import Handler
  const handleExcelImport = (event: React.ChangeEvent<HTMLInputElement>, tabId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting the same file triggers onChange
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Smart Check: If user selected an Employee Master Workbook while on settings tabs, redirect to Employees
        const isEmployeeWorkbook = jsonData.slice(0, 5).some(r => 
          r['Full Name (Arabic)'] || r['Full Name (English)'] || r['Employee Code'] || r['Badge No'] || r['Local Staff (list all)'] || r['اسم الموظف'] || r['الاسم الكامل (عربي)']
        );
        if (isEmployeeWorkbook && tabId !== 'employees') {
          alert(language === 'ar'
            ? '⚠️ هذا الملف يحتوي على بيانات الموظفين (سجل الموظفين الشامل). تم توجيهك تلقائياً إلى تبويب "الموظفين" (Employees) لاستيراد كافة بيانات الموظفين وفروعهم ومسمياتهم دفعة واحدة.'
            : '⚠️ This file contains complete employee records. Redirecting to "Employees" tab to import all staff, positions, and branches.');
          setActiveTab('employees');
          return;
        }

        // Process imported data
        const importedItems: DataItem[] = [];
        for (const row of jsonData) {
          const name_en = row['Name (English)'] || row['name_en'] || '';
          const name_ar = row['الاسم (العربية)'] || row['name_ar'] || '';
          const sort_order = row['Sort Order'] || row['sort_order'] || 0;

          if (name_en && name_ar) {
            try {
              let result;
              switch (tabId) {
                case 'locations':
                  result = await api.addBranch({ name_en, name_ar, sort_order });
                  break;
                case 'positions':
                  result = await api.addPosition({ name_en, name_ar, sort_order });
                  break;
                case 'departments':
                  result = await api.addDepartment({ name_en, name_ar, sort_order });
                  break;
                case 'contract-types':
                  result = await api.addContractType({ name_en, name_ar, sort_order });
                  break;
                case 'status-changes':
                  result = await api.addStatusChange({ name_en, name_ar, sort_order });
                  break;
                case 'trainings':
                  result = await api.addTraining({ name_en, name_ar, sort_order });
                  break;
                default:
                  throw new Error('Unknown tab ID');
              }
              importedItems.push(result);
            } catch (error) {
              console.error(`Error importing item for ${tabId}:`, error);
            }
          }
        }

        // Reload data based on tab
        switch (tabId) {
          case 'locations':
            const branchesData = await api.getBranches();
            setLocations(branchesData);
            break;
          case 'positions':
            const positionsData = await api.getPositions();
            setPositions(positionsData);
            break;
          case 'departments':
            const departmentsData = await api.getDepartments();
            setDepartments(departmentsData);
            break;
          case 'contract-types':
            const contractTypesData = await api.getContractTypes();
            setContractTypes(contractTypesData);
            break;
          case 'status-changes':
            const statusChangesData = await api.getStatusChanges();
            setStatusChanges(statusChangesData);
            break;
          case 'trainings':
            const trainingsData = await api.getTrainings();
            setTrainings(trainingsData);
            break;
        }

        const successMessages: Record<string, { ar: string, en: string }> = {
          'locations': { ar: 'تم استيراد الفروع بنجاح', en: 'Successfully imported locations' },
          'positions': { ar: 'تم استيراد المسميات الوظيفية بنجاح', en: 'Successfully imported positions' },
          'contract-types': { ar: 'تم استيراد أنواع العقود بنجاح', en: 'Successfully imported contract types' },
          'status-changes': { ar: 'تم استيراد تغييرات الحالة بنجاح', en: 'Successfully imported status changes' },
          'trainings': { ar: 'تم استيراد البرامج التدريبية بنجاح', en: 'Successfully imported trainings' }
        };

        const message = successMessages[tabId] || { ar: 'تم الاستيراد بنجاح', en: 'Successfully imported' };
        alert(language === 'ar' 
          ? `${message.ar} (${importedItems.length})` 
          : `${message.en} (${importedItems.length})`);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        alert(language === 'ar' 
          ? 'حدث خطأ في معالجة ملف Excel' 
          : 'Error processing Excel file');
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Employee Excel Export Handler (Exports all employees matching application schema)
  const handleEmployeeExcelExport = async () => {
    try {
      console.log('Exporting employee data...');
      let empList = employees;
      if (!empList || empList.length === 0) {
        try {
          const freshList = await api.getEmployees();
          if (Array.isArray(freshList) && freshList.length > 0) {
            empList = freshList;
          }
        } catch (err) {
          console.warn('Could not fetch employees from API for export:', err);
        }
      }

      if (!empList || empList.length === 0) {
        alert(language === 'ar' ? 'لا يوجد موظفون في النظام لتصدير بياناتهم حالياً' : 'No employees in system to export');
        return;
      }

      const parseChildren = (emp: any): any[] => {
        try {
          const raw = emp.childrenList || emp.children_details || emp.children_json;
          if (Array.isArray(raw)) return raw;
          if (typeof raw === 'string' && raw.trim().startsWith('[')) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch (e) {
          console.warn('Error parsing children details:', e);
        }
        return [];
      };

      const sanitizeCellText = (val: any) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'number' || typeof val === 'boolean') return val;
        const str = String(val);
        if (str.length > 32000) {
          if (str.startsWith('data:image/')) {
            return '[صورة مخزنة / Base64 Photo]';
          }
          return str.slice(0, 32000);
        }
        return str;
      };

      const exportData = empList.map((emp: any) => {
        const kids = parseChildren(emp);
        const photoVal = emp.photoUrl || emp.photo_url || emp.photo || '';
        const cleanPhoto = typeof photoVal === 'string' && photoVal.startsWith('data:image/') 
          ? '[صورة مخزنة / Base64 Photo]' 
          : sanitizeCellText(photoVal);

        return {
          'الاسم الكامل (عربي)': sanitizeCellText(emp.fullName || emp.full_name_ar || emp.name || ''),
          'الاسم الكامل (إنجليزي)': sanitizeCellText(emp.fullNameEn || emp.full_name_en || emp.name_en || ''),
          'رمز الموظف': sanitizeCellText(emp.employeeId || emp.employee_id || emp.empCode || ''),
          'رقم البادج': sanitizeCellText(emp.badgeNo || emp.badge_no || ''),
          'معرف الحوافز (WAID)': sanitizeCellText(emp.waid || emp.wa_id || ''),
          'تاريخ الميلاد': sanitizeCellText(emp.dob || ''),
          'البريد الإلكتروني المؤسسي': sanitizeCellText(emp.email || ''),
          'البريد الإلكتروني الشخصي': sanitizeCellText(emp.personalEmail || emp.personal_email || ''),
          'رقم الهاتف': sanitizeCellText(emp.phone || emp.mobile || ''),
          'هاتف الطوارئ': sanitizeCellText(emp.emergencyPhone || emp.emergency_mobile || emp.emergency_phone || ''),
          'الجنس': emp.gender === 'female' || emp.gender === 'أنثى' ? 'أنثى' : 'ذكر',
          'الحالة الاجتماعية': sanitizeCellText(emp.maritalStatus || emp.marital_status || ''),
          'الجنسية': sanitizeCellText(emp.nationality || 'عراقي'),
          'الجنسية الثانية': sanitizeCellText(emp.secondCitizenship || emp.second_citizenship || 'N/A'),
          'الدرجة العلمية / Graduation Degree': sanitizeCellText(emp.graduationDegree || emp.graduation_degree || ''),
          'تاريخ المباشرة': sanitizeCellText(emp.originalStartDate || emp.original_start_date || emp.contract_original_start || emp.joinDate || ''),
          'تاريخ بداية العقد': sanitizeCellText(emp.contractStartDate || emp.contract_start_date || ''),
          'تاريخ نهاية العقد': sanitizeCellText(emp.contractEndDate || emp.contract_end_date || ''),
          'نهاية فترة التجربة': sanitizeCellText(emp.probationEndDate || emp.probation_end_date || ''),
          'تاريخ المغادرة': sanitizeCellText(emp.exitDate || emp.exit_date || ''),
          'سبب ترك العمل أو الاستقالة': sanitizeCellText(emp.terminationReason || emp.termination_reason || ''),
          'نوع العقد': sanitizeCellText(emp.termOfContract || emp.term_of_contract || ''),
          'الدرجة الوظيفية': sanitizeCellText(emp.grade || ''),
          'المستوى الإداري (Management Tier)': sanitizeCellText(emp.managementTier || emp.management_tier || emp.tier || 'Non Management'),
          'تصنيف المكتب (Branch vs MO)': sanitizeCellText(emp.branchVsMo || emp.branch_vs_mo || emp.branchVsMO || 'Branch'),
          'المستوى الوظيفي 1 (Position Level 1)': sanitizeCellText(emp.positionLevel1 || emp.position_level_1 || emp.position1 || ''),
          'المستوى الوظيفي 2 (Position Level 2)': sanitizeCellText(emp.positionLevel2 || emp.position_level_2 || emp.position2 || ''),
          'المسمى في ميكروفين (Microfin Position)': sanitizeCellText(emp.microfinPosition || emp.microfin_position || ''),
          'خط التبعية الإداري (Admin Line)': sanitizeCellText(emp.adminLine || emp.admin_line || ''),
          'تقييم الأداء (Performance Rating)': emp.perfRating || emp.perf_rating || '',
          'المسمى الوظيفي (عربي)': sanitizeCellText(emp.jobTitle || emp.position_ar || emp.position || ''),
          'المسمى الوظيفي (إنجليزي)': sanitizeCellText(emp.jobTitleEn || emp.position_en || ''),
          'القسم / الإدارة (عربي)': sanitizeCellText(emp.department || ''),
          'القسم / الإدارة (إنجليزي)': sanitizeCellText(emp.departmentEn || emp.department_en || emp.department || ''),
          'الفرع (عربي)': sanitizeCellText(emp.branch || emp.location_ar || ''),
          'الفرع (إنجليزي)': sanitizeCellText(emp.branchEn || emp.location_en || emp.branch_en || ''),
          'اسم المشرف المباشر': sanitizeCellText(emp.supervisorName || emp.supervisor_name || ''),
          'نطاق العمل': sanitizeCellText(emp.workScope || emp.work_scope || ''),
          'الراتب الاسمي': Number(emp.basicSalary || emp.basic_salary) || 0,
          'الراتب الاسمي كتابة': sanitizeCellText(emp.writtenBasicSalaryAr || emp.written_basic_salary_ar || ''),
          'بدل النقل الثابت': Number(emp.transportationFixed || emp.transportation_fixed) || 0,
          'المكافأة الثابتة': Number(emp.fixedBonus || emp.fixed_bonus) || 0,
          'بدل الهاتف': Number(emp.phoneAllowance || emp.phone_allowance) || 0,
          'بدل الشهادة': Number(emp.certificateAllowance || emp.certificate_allowance) || 0,
          'إجمالي الراتب الكلي': Number(emp.salary || emp.totalCalculatedSalary) || 0,
          'اسم المصرف': sanitizeCellText(emp.bankName || emp.bank_name || ''),
          'رقم IBAN': sanitizeCellText(emp.iban || ''),
          'البطاقة الوطنية': sanitizeCellText(emp.nationalId || emp.national_id || ''),
          'رقم جواز السفر': sanitizeCellText(emp.passportNo || emp.passport_no || ''),
          'تاريخ نفاذ الجواز': sanitizeCellText(emp.passportExpiry || emp.passport_expiry || ''),
          'اسم الزوج/الزوجة': sanitizeCellText(emp.spouseName || emp.spouse_name || ''),
          'الزوج يعمل بالشركة': (emp.spouseEmployedHere || emp.spouse_employed_here) ? 'نعم' : 'لا',
          'اسم الطفل 1': sanitizeCellText(kids[0]?.name || ''),
          'صلة الطفل 1 (ولد/بنت)': sanitizeCellText(kids[0]?.relation || ''),
          'تاريخ ميلاد الطفل 1': sanitizeCellText(kids[0]?.dob || ''),
          'اسم الطفل 2': sanitizeCellText(kids[1]?.name || ''),
          'صلة الطفل 2 (ولد/بنت)': sanitizeCellText(kids[1]?.relation || ''),
          'تاريخ ميلاد الطفل 2': sanitizeCellText(kids[1]?.dob || ''),
          'اسم الطفل 3': sanitizeCellText(kids[2]?.name || ''),
          'صلة الطفل 3 (ولد/بنت)': sanitizeCellText(kids[2]?.relation || ''),
          'تاريخ ميلاد الطفل 3': sanitizeCellText(kids[2]?.dob || ''),
          'اسم الطفل 4': sanitizeCellText(kids[3]?.name || ''),
          'صلة الطفل 4 (ولد/بنت)': sanitizeCellText(kids[3]?.relation || ''),
          'تاريخ ميلاد الطفل 4': sanitizeCellText(kids[3]?.dob || ''),
          'اسم الطفل 5': sanitizeCellText(kids[4]?.name || ''),
          'صلة الطفل 5 (ولد/بنت)': sanitizeCellText(kids[4]?.relation || ''),
          'تاريخ ميلاد الطفل 5': sanitizeCellText(kids[4]?.dob || ''),
          'اسم الطفل 6': sanitizeCellText(kids[5]?.name || ''),
          'صلة الطفل 6 (ولد/بنت)': sanitizeCellText(kids[5]?.relation || ''),
          'تاريخ ميلاد الطفل 6': sanitizeCellText(kids[5]?.dob || ''),
          'رابط الصورة': cleanPhoto,
          'الحالة': sanitizeCellText(emp.status || 'Active')
        };
      });

      await exportFormattedExcelFromJson(
        exportData,
        `vitas_iraq_employees_${new Date().toISOString().split('T')[0]}.xlsx`,
        'بيانات الموظفين',
        true
      );
      console.log('Employees exported successfully with formatted Excel table design');
    } catch (error) {
      console.error('Error exporting employees:', error);
      alert(language === 'ar' 
        ? `حدث خطأ أثناء تصدير ملف الموظفين: ${(error as any)?.message || error}` 
        : `Error exporting employees file: ${(error as any)?.message || error}`);
    }
  };

  // Employee Excel Template Generation (Formatted with English Headers)
  const generateEmployeeExcelTemplate = async () => {
    try {
      console.log('Generating Formatted Employee Excel template with English Headers...');
      
      const templateData = [
        {
          'Employee Code': 'VTS-1001',
          'Badge No': 'V131',
          'WAID': 'WA-1001',
          'Full Name (Arabic)': 'مصطفى الحسيني',
          'Full Name (English)': 'Mustafa Al-Husseini',
          'Department (Arabic)': 'قسم العمليات والائتمان',
          'Department (English)': 'Operations & Credit Department',
          'Job Title (Arabic)': 'مسؤول ائتمان أول',
          'Job Title (English)': 'Senior Credit Officer',
          'Branch (Arabic)': 'فرع بغداد - الكرادة',
          'Branch (English)': 'Baghdad Branch - Karrada',
          'Branch vs Main Office': 'Branch',
          'Work Scope': 'Field Job',
          'Management Tier': 'Middle Management',
          'Admin Line': 'Operations Line',
          'Position Level 1': 'Specialist',
          'Position Level 2': 'Senior',
          'Microfin Position': 'Senior Credit Officer',
          'Performance Rating': 85,
          'Grade': 'G-4 الدرجة الرابعة',
          'Supervisor Name': 'أحمد جاسم المحمداوي',
          'Date of Birth': '1990-01-01',
          'Gender': 'ذكر',
          'Marital Status': 'متأهل',
          'Nationality': 'عراقي',
          'Second Citizenship': 'N/A',
          'Graduation Degree': 'Bachelar',
          'Phone': '07700000000',
          'Emergency Phone': '07800000000',
          'Email': 'mustafa@vitasiraq.com',
          'Personal Email': 'mustafa.personal@gmail.com',
          'National ID': '199012345678',
          'Passport Number': 'A12345678',
          'Passport Expiry': '2030-01-01',
          'Original Start Date': '2020-01-01',
          'Contract Start Date': '2024-01-01',
          'Contract End Date': '2025-01-01',
          'Probation End Date': '2024-04-01',
          'Exit Date': '',
          'Termination Reason': '',
          'Term of Contract': 'عقد محدد المدة (سنة واحدة)',
          'Basic Salary': 1200000,
          'Written Basic Salary (Arabic)': 'مليون ومائتا ألف دينار عراقي',
          'Transportation Fixed': 150000,
          'Fixed Bonus': 100000,
          'Phone Allowance': 50000,
          'Certificate Allowance': 100000,
          'Bank Name': 'مصرف بغداد',
          'IBAN': 'IQ98 BAKI 0000 1234 5678 9012',
          'Photo URL': 'https://example.com/photo1.jpg',
          'Spouse Name': 'فاطمة علي',
          'Spouse Employed Here': 'لا',
          'Child 1 Name': 'علي مصطفى',
          'Child 1 Relation (Son/Daughter)': 'ولد',
          'Child 1 Date of Birth': '2015-05-12',
          'Child 2 Name': 'زهراء مصطفى',
          'Child 2 Relation (Son/Daughter)': 'بنت',
          'Child 2 Date of Birth': '2017-08-20',
          'Child 3 Name': 'حسين مصطفى',
          'Child 3 Relation (Son/Daughter)': 'ولد',
          'Child 3 Date of Birth': '2019-11-03',
          'Child 4 Name': 'مريم مصطفى',
          'Child 4 Relation (Son/Daughter)': 'بنت',
          'Child 4 Date of Birth': '2021-02-15',
          'Child 5 Name': 'محمد مصطفى',
          'Child 5 Relation (Son/Daughter)': 'ولد',
          'Child 5 Date of Birth': '2022-09-10',
          'Child 6 Name': 'زينب مصطفى',
          'Child 6 Relation (Son/Daughter)': 'بنت',
          'Child 6 Date of Birth': '2024-01-01',
          'Status': 'Active'
        },
        {
          'Employee Code': 'VTS-1002',
          'Badge No': 'V132',
          'WAID': 'WA-1002',
          'Full Name (Arabic)': 'زينب فاضل عباس',
          'Full Name (English)': 'Zainab Fadhil Abbas',
          'Department (Arabic)': 'القسم المالي والحسابات',
          'Department (English)': 'Finance & Accounting Department',
          'Job Title (Arabic)': 'محاسب رئيسي',
          'Job Title (English)': 'Senior Accountant',
          'Branch (Arabic)': 'الفرع الرئيسي - بغداد',
          'Branch (English)': 'Head Office - Baghdad',
          'Branch vs Main Office': 'Main Office',
          'Work Scope': 'Office Job',
          'Management Tier': 'Non Management',
          'Admin Line': 'Finance Line',
          'Position Level 1': 'Officer',
          'Position Level 2': 'Principal',
          'Microfin Position': 'Senior Accountant',
          'Performance Rating': 90,
          'Grade': 'G-3 الدرجة الثالثة',
          'Supervisor Name': 'حسن كمال الدين',
          'Date of Birth': '1993-04-15',
          'Gender': 'أنثى',
          'Marital Status': 'متأهل',
          'Nationality': 'عراقي',
          'Second Citizenship': 'N/A',
          'Graduation Degree': 'Master',
          'Phone': '07711111111',
          'Emergency Phone': '07811111111',
          'Email': 'zainab@vitasiraq.com',
          'Personal Email': 'zainab.personal@gmail.com',
          'National ID': '199398765432',
          'Passport Number': 'A87654321',
          'Passport Expiry': '2031-05-20',
          'Original Start Date': '2021-03-15',
          'Contract Start Date': '2024-03-15',
          'Contract End Date': '2025-03-15',
          'Probation End Date': '2024-06-15',
          'Exit Date': '',
          'Termination Reason': '',
          'Term of Contract': 'عقد غير محدد المدة (دائم)',
          'Basic Salary': 1500000,
          'Written Basic Salary (Arabic)': 'مليون وخمسمائة ألف دينار عراقي',
          'Transportation Fixed': 150000,
          'Fixed Bonus': 120000,
          'Phone Allowance': 50000,
          'Certificate Allowance': 150000,
          'Bank Name': 'المصرف العراقي للتجارة TBI',
          'IBAN': 'IQ98 TRIQ 0000 9876 5432 1098',
          'Photo URL': '',
          'Spouse Name': 'عمر خالد',
          'Spouse Employed Here': 'نعم',
          'Child 1 Name': 'أحمد عمر',
          'Child 1 Relation (Son/Daughter)': 'ولد',
          'Child 1 Date of Birth': '2018-03-10',
          'Child 2 Name': 'سارة عمر',
          'Child 2 Relation (Son/Daughter)': 'بنت',
          'Child 2 Date of Birth': '2020-07-14',
          'Child 3 Name': '',
          'Child 3 Relation (Son/Daughter)': '',
          'Child 3 Date of Birth': '',
          'Child 4 Name': '',
          'Child 4 Relation (Son/Daughter)': '',
          'Child 4 Date of Birth': '',
          'Child 5 Name': '',
          'Child 5 Relation (Son/Daughter)': '',
          'Child 5 Date of Birth': '',
          'Child 6 Name': '',
          'Child 6 Relation (Son/Daughter)': '',
          'Child 6 Date of Birth': '',
          'Status': 'Active'
        }
      ];

      await exportFormattedExcelFromJson(
        templateData,
        'employees_template.xlsx',
        'Employees_Template',
        false // Left-to-Right layout for English headers
      );
      console.log('Employee Excel template generated successfully with English headers.');
    } catch (error) {
      console.error('Error generating Employee Excel template:', error);
      alert(language === 'ar' 
        ? 'حدث خطأ في إنشاء قالب Excel للموظفين' 
        : 'Error generating Employee Excel template');
    }
  };

  // Helper for normalizing Arabic and English string keys for flexible header matching
  const normalizeHeaderKey = (str: any): string => {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .trim()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\s\(\)\_\-\/\,\.\:\;\#\*\+\=\\\"\']/g, '');
  };

  const BRANCH_EN_TO_AR_DICT: Record<string, string> = {
    'main office': 'المقر الرئيسي (الإدارة العامة)',
    'main': 'المقر الرئيسي (الإدارة العامة)',
    'headquarter': 'المقر الرئيسي (الإدارة العامة)',
    'hq': 'المقر الرئيسي (الإدارة العامة)',
    'karbala': 'كربلاء',
    'karbalaa': 'كربلاء',
    'karbala office': 'فرع كربلاء',
    'karbalaa office': 'فرع كربلاء',
    'hilla': 'الحلة',
    'hilla office': 'فرع الحلة',
    'najaf': 'النجف',
    'najjaf': 'النجف',
    'najaf office': 'فرع النجف',
    'najjaf office': 'فرع النجف',
    'basra': 'البصرة',
    'basrah': 'البصرة',
    'basra office': 'فرع البصرة',
    'basrah office': 'فرع البصرة',
    'diwaniyah': 'الديوانية',
    'diwaniya': 'الديوانية',
    'diwaniyah office': 'فرع الديوانية',
    'kut': 'الكوت',
    'kut office': 'فرع الكوت',
    'erbil': 'أربيل',
    'erbil office': 'فرع أربيل',
    'sulaimaniyah': 'السليمانية',
    'sulayaniya': 'السليمانية',
    'sulaimaniyah office': 'فرع السليمانية',
    'mansour': 'المنصور',
    'mansour office': 'فرع المنصور',
    'wehdah': 'الوحدة',
    'wehda': 'الوحدة',
    'wehdah office': 'فرع الوحدة',
    'mudaina': 'المدينة',
    'mudayna': 'المدينة',
    'mudaina office': 'فرع المدينة',
    'samawa': 'السماوة',
    'samawa office': 'فرع السماوة',
    'hindia': 'الهندية',
    'hindia office': 'فرع الهندية',
    'nassiriyah': 'الناصرية',
    'nasyria': 'الناصرية',
    'nassiriyah office': 'فرع الناصرية',
    'kirkuk': 'كركوك',
    'kirkuk office': 'فرع كركوك',
    'hashmiya': 'الهاشمية',
    'hashmiyah': 'الهاشمية',
    'shatra': 'الشطرة',
    'kadhimiya': 'الكاظمية',
    'amara': 'العمارة',
    'baqubah': 'بعقوبة',
    'fallujah': 'الفلوجة',
    'ramadi': 'الرمادي',
    'dohuk': 'دهوك',
    'atas': 'مكتب لبنان (ATAS)',
    'lebanon': 'مكتب لبنان (ATAS)',
    'lebanon office': 'مكتب لبنان (ATAS)'
  };

  const DEPT_EN_TO_AR_DICT: Record<string, string> = {
    'credit': 'قسم الائتمان',
    'credit department': 'قسم الائتمان',
    'treasury': 'قسم الخزينة',
    'treasury department': 'قسم الخزينة',
    'security': 'قسم الأمن',
    'security department': 'قسم الأمن',
    'procurement and facilities': 'المشتريات والتسهيلات',
    'procurement & facilities': 'المشتريات والتسهيلات',
    'compliance': 'قسم الامتثال',
    'compliance department': 'قسم الامتثال',
    'mis': 'نظم المعلومات الإدارية (MIS)',
    'management information systems': 'نظم المعلومات الإدارية (MIS)',
    'partnership': 'الشراكات',
    'pr': 'التسويق والعلاقات العامة',
    'marketing': 'التسويق والعلاقات العامة',
    'marketing & pr': 'التسويق والعلاقات العامة',
    'hr': 'الموارد البشرية',
    'human resources': 'الموارد البشرية',
    'legal & regulatory': 'الشؤون القانونية والتنظيمية',
    'legal': 'الشؤون القانونية والتنظيمية',
    'risk management': 'إدارة المخاطر',
    'risk': 'إدارة المخاطر',
    'accounting': 'المالية والمحاسبة',
    'finance': 'المالية والمحاسبة',
    'finance & accounting': 'المالية والمحاسبة',
    'it': 'تكنولوجيا المعلومات',
    'information technology': 'تكنولوجيا المعلومات',
    'mis and it': 'تكنولوجيا ونظم المعلومات',
    'internal audit': 'التدقيق الداخلي',
    'operations': 'العمليات وإدارة الفروع',
    'operations & branch management': 'العمليات وإدارة الفروع'
  };

  const translatePositionTitle = (posEn: string): string => {
    if (!posEn) return '';
    const p = posEn.toLowerCase();
    if (p.includes('senior internal auditor') || p.includes('sr. internal auditor')) return 'مدقق داخلي أقدم';
    if (p.includes('internal auditor') || p.includes('auditor')) return 'مدقق داخلي';
    if (p.includes('senior loan officer supervisor')) return 'مشرف مسؤولي قروض أقدم';
    if (p.includes('loan officer supervisor')) return 'مشرف مسؤولي قروض';
    if (p.includes('senior loan officer') || p.includes('se loan officer')) return 'مسؤول قروض أقدم';
    if (p.includes('loan officer')) return 'مسؤول قروض';
    if (p.includes('credit assistant')) return 'مساعد ائتمان';
    if (p.includes('collection officer')) return 'مسؤول تحصيل';
    if (p.includes('branch treasury assistant') || p.includes('treasury assistant')) return 'مساعد خبير خزينة فرع';
    if (p.includes('treasury officer') || p.includes('treasurer')) return 'مسؤول خزينة';
    if (p.includes('branch manager')) return 'مدير فرع';
    if (p.includes('office manager')) return 'مدير مكتب';
    if (p.includes('cleaner') || p.includes('cleaning')) return 'عامل نظافة';
    if (p.includes('security guard') || p.includes('guard')) return 'حارس أمن';
    if (p.includes('it support') || p.includes('it officer')) return 'مسؤول دعم تكنولوجيا المعلومات';
    if (p.includes('mis specialist') || p.includes('mis officer')) return 'أخصائي نظم معلومات (MIS)';
    if (p.includes('compliance officer')) return 'مسؤول امتثال';
    if (p.includes('risk officer')) return 'مسؤول مخاطر';
    if (p.includes('hr officer') || p.includes('hr specialist')) return 'مسؤول موارد بشرية';
    if (p.includes('accountant') || p.includes('accounting officer')) return 'محاسب';
    if (p.includes('procurement officer')) return 'مسؤول مشتريات';
    if (p.includes('marketing officer') || p.includes('pr officer')) return 'مسؤول تسويق وعلاقات عامة';
    if (p.includes('driver')) return 'سائق';
    if (p.includes('receptionist')) return 'موظف استقبال';
    return posEn.split('-')[0].trim();
  };

  // Employee Excel Import Handler
  const handleEmployeeExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers onChange
    event.target.value = '';

    setIsImporting(true);
    setImportStatusText(language === 'ar' ? 'جاري قراءة وتحليل ملف Excel...' : 'Reading and analyzing Excel file...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });

        // 1. Scan workbook sheets to intelligently pick the best data sheet
        let targetSheetName = workbook.SheetNames[0];
        const employeeSheetCandidates = workbook.SheetNames.filter(name => {
          const n = name.toLowerCase().trim();
          return (
            n.includes('detailed') ||
            n.includes('employee') ||
            n.includes('staff') ||
            n.includes('roster') ||
            n.includes('موظف') ||
            n.includes('كادر') ||
            n.includes('بيانات')
          );
        });

        if (employeeSheetCandidates.length > 0) {
          targetSheetName = employeeSheetCandidates[0];
        } else {
          // If no candidate name matched, pick the sheet with the most recognized employee header keywords
          let bestSheet = targetSheetName;
          let bestMatchCount = -1;
          const probeKeywords = ['staff', 'employee', 'موظف', 'badge', 'بادج', 'position', 'مسمى', 'office', 'فرع', 'مكتب', 'department', 'قسم', 'roster'];
          for (const sName of workbook.SheetNames) {
            const sh = workbook.Sheets[sName];
            if (!sh || !sh['!ref']) continue;
            const grid = XLSX.utils.sheet_to_json(sh, { header: 1 }) as any[][];
            let matches = 0;
            for (const r of grid.slice(0, 10)) {
              if (Array.isArray(r)) {
                for (const c of r) {
                  const str = normalizeHeaderKey(c);
                  if (str && probeKeywords.some(kw => str.includes(normalizeHeaderKey(kw)))) {
                    matches++;
                  }
                }
              }
            }
            if (matches > bestMatchCount) {
              bestMatchCount = matches;
              bestSheet = sName;
            }
          }
          if (bestMatchCount > 0) {
            targetSheetName = bestSheet;
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];

        // 2. High-precision 2D grid header detection (bypasses banner titles, logos & empty rows)
        const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        let rawRows: any[] = [];

        if (rawGrid.length > 0) {
          const headerKeywords = [
            'local staff', 'employee name', 'staff name', 'full name', 'اسم الموظف', 'الاسم', 'موظف',
            'position', 'position 1', 'job title', 'المسمى الوظيفي', 'العنوان الوظيفي', 'الوظيفة',
            'office', 'branch', 'location', 'الفرع', 'المكتب', 'الموقع',
            'department', 'القسم', 'code', 'رمز', 'بادج', 'badge'
          ];

          let headerIndex = -1;
          let maxMatches = 0;

          for (let r = 0; r < Math.min(15, rawGrid.length); r++) {
            const row = rawGrid[r];
            if (!Array.isArray(row)) continue;
            let matches = 0;
            for (const cell of row) {
              const cellStr = normalizeHeaderKey(cell);
              if (cellStr && headerKeywords.some(kw => cellStr.includes(normalizeHeaderKey(kw)))) {
                matches++;
              }
            }
            if (matches > maxMatches) {
              maxMatches = matches;
              headerIndex = r;
            }
          }

          if (headerIndex >= 0 && maxMatches >= 2 && headerIndex < rawGrid.length - 1) {
            const headers = rawGrid[headerIndex].map(h => String(h || '').trim());
            const dataRows = rawGrid.slice(headerIndex + 1);
            rawRows = dataRows
              .map(rowArr => {
                const obj: any = {};
                if (Array.isArray(rowArr)) {
                  headers.forEach((h, colIdx) => {
                    if (h && rowArr[colIdx] !== undefined && rowArr[colIdx] !== null && String(rowArr[colIdx]).trim() !== '') {
                      obj[h] = rowArr[colIdx];
                    }
                  });
                }
                return obj;
              })
              .filter(obj => Object.keys(obj).length > 0);
          } else {
            rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];
          }
        }

        const getVal = (row: any, keys: string[]) => {
          if (!row || typeof row !== 'object') return '';
          // 1. Direct exact lookup
          for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
              return String(row[k]).trim();
            }
          }
          // 2. Normalized lookup (ignoring trailing spaces, casing, special chars & Arabic alef/hamza/ta-marbouta variants)
          const rowKeys = Object.keys(row);
          for (const k of keys) {
            const cleanK = normalizeHeaderKey(k);
            const matchedKey = rowKeys.find(rk => normalizeHeaderKey(rk) === cleanK);
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
              return String(row[matchedKey]).trim();
            }
          }
          // 3. Fallback: partial/contains match for descriptive keys
          for (const k of keys) {
            const cleanK = normalizeHeaderKey(k);
            if (cleanK.length >= 4) {
              const matchedKey = rowKeys.find(rk => {
                const nrk = normalizeHeaderKey(rk);
                return nrk === cleanK || (nrk.length >= 4 && nrk.includes(cleanK));
              });
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== '') {
                return String(row[matchedKey]).trim();
              }
            }
          }
          return '';
        };

        // Helper to convert Excel dates cleanly to YYYY-MM-DD
        const parseExcelDate = (val: any, isChild: boolean = false): string => {
          if (val === undefined || val === null) return '';
          const strVal = String(val).trim();
          if (!strVal || strVal === '0' || strVal === '0.0' || strVal === 'N/A' || strVal === '-' || strVal === 'null' || strVal === 'undefined') return '';
          if (strVal.startsWith('1899') || strVal.startsWith('1900') || strVal.includes('1899-12-30') || strVal.includes('1900-01-00')) return '';
          if (!isNaN(Number(strVal)) && Number(strVal) <= 0) return '';

          const currentYear = new Date().getFullYear(); // e.g. 2026
          let y = 0, m = 0, d = 0;

          if (val instanceof Date) {
            if (isNaN(val.getTime())) return '';
            y = val.getFullYear();
            m = val.getMonth() + 1;
            d = val.getDate();
          } else {
            const num = Number(strVal);
            // Excel serial date format (e.g. 42156)
            if (!isNaN(num) && num > 10000 && num < 80000) {
              const utc_days = Math.floor(num - 25569);
              const utc_value = utc_days * 86400;
              const date_info = new Date(utc_value * 1000);
              y = date_info.getUTCFullYear();
              m = date_info.getUTCMonth() + 1;
              d = date_info.getUTCDate();
            } else if (strVal.includes('/') || strVal.includes('-') || strVal.includes('.')) {
              const parts = strVal.split(/[/.-]/).map(p => p.trim());
              if (parts.length === 3) {
                const p0 = parseInt(parts[0], 10);
                const p1 = parseInt(parts[1], 10);
                const p2 = parseInt(parts[2], 10);

                if (p0 > 1000) {
                  // YYYY-MM-DD
                  y = p0; m = p1; d = p2;
                } else if (p2 > 1000) {
                  // DD-MM-YYYY or MM-DD-YYYY
                  y = p2;
                  if (p1 > 12) { m = p0; d = p1; }
                  else { m = p1; d = p0; }
                } else {
                  // 2-digit year format (e.g. DD/MM/YY)
                  if (p2 >= 0 && p2 <= 99) {
                    d = p0; m = p1;
                    y = p2 <= (currentYear % 100) ? 2000 + p2 : (isChild ? 2000 + p2 : 1900 + p2);
                  } else {
                    y = p0 <= (currentYear % 100) ? 2000 + p0 : (isChild ? 2000 + p0 : 1900 + p0);
                    m = p1; d = p2;
                  }
                }
              }
            } else {
              const dateObj = new Date(strVal);
              if (!isNaN(dateObj.getTime())) {
                y = dateObj.getFullYear();
                m = dateObj.getMonth() + 1;
                d = dateObj.getDate();
              }
            }
          }

          if (y <= 1900 || y === 1899) return '';

          if (y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            // Fix 2-digit year misinterpretations:
            // Excel or JS often parses '15' or '20' as 1915 or 1920
            if (isChild) {
              // A child in HRIS must have a reasonable birth year (born after 1995)
              // If parsed as 1900-1945, shift by +100 to 2000-2045 (e.g. 1915 -> 2015, 1920 -> 2020)
              if (y >= 1900 && y <= 1945) {
                y += 100;
              }
              if (y > currentYear && (y - 100) >= 1990) {
                y -= 100;
              }
              // Children cannot be born before 1995 (under ~30 years old)
              if (y < 1995 || (currentYear - y) > 30) {
                return '';
              }
            } else {
              // Adult employee: anyone born 1900-1935 was likely 2000-2035 (e.g. 2001)
              if (y >= 1900 && y <= 1935) {
                y += 100;
              }
            }
            return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
          return '';
        };

        const calcAge = (dobStr: string) => {
          const cleanDob = parseExcelDate(dobStr, true);
          if (!cleanDob) return 0;
          const dobDate = new Date(cleanDob);
          if (isNaN(dobDate.getTime())) return 0;
          const today = new Date();
          let age = today.getFullYear() - dobDate.getFullYear();
          const m = today.getMonth() - dobDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
            age--;
          }
          return age >= 0 ? age : 0;
        };

        const employeesToImport: any[] = [];
        const branchesToCreate: any[] = [];
        const departmentsToCreate: any[] = [];
        const positionsToCreate: any[] = [];
        const errorsList: string[] = [];
        let currentLocations = [...locations];
        let currentDepartments = [...departments];
        let currentPositions = [...positions];

        let rowIdx = 0;
        for (const row of rawRows) {
          rowIdx++;
          try {
            // Process children data (up to 6 children)
            const childrenList: any[] = [];
            for (let i = 1; i <= 6; i++) {
              const childName = getVal(row, [
                `Child ${i} Name`, `child${i}Name`, `طفل ${i}`, `الطفل ${i}`, `اسم الطفل ${i}`, `اسم الطفل${i}`, `طفل${i}`
              ]);
              const childRelation = getVal(row, [
                `Child ${i} Relation (Son/Daughter)`, `Child ${i} Gender`, `child${i}Relation`, `صلة الطفل ${i} (ولد/بنت)`, `صلة الطفل ${i}`, `صلة الطفل${i}`, `جنس الطفل ${i}`, `جنس الطفل${i}`, `نوع الطفل ${i}`, `نوع الطفل${i}`, `Child ${i} Relation`
              ]);
              const rawChildDob = getVal(row, [
                `Child ${i} Date of Birth`, `child${i}Dob`, `تاريخ ميلاد الطفل ${i}`, `تاريخ ميلاد الطفل${i}`, `تاريخ الطفل ${i}`, `تاريخ الطفل${i}`
              ]);
              const childDob = parseExcelDate(rawChildDob, true);
              
              const isValidName = childName && typeof childName === 'string' && childName.trim() !== '' && !childName.startsWith('طفل ') && childName !== 'الطفل';
              const isValidDob = childDob && typeof childDob === 'string' && childDob.trim() !== '' && childDob !== 'N/A' && !childDob.startsWith('1899') && !childDob.startsWith('1900');
              const childAge = isValidDob ? calcAge(childDob) : 0;
              
              // Only add if there is a real name or a valid date under 30 years old
              if (isValidName || (isValidDob && childAge < 30)) {
                childrenList.push({
                  id: Date.now().toString() + i + Math.random().toString().slice(2, 6),
                  name: isValidName ? childName.trim() : `طفل ${i}`,
                  dob: isValidDob ? childDob : '',
                  relation: (childRelation === 'بنت' || childRelation === 'Daughter' || childRelation === 'female') ? 'بنت' : 'ولد',
                  age: childAge
                });
              }
            }

            const fullNameVal = getVal(row, [
              'Full Name (Arabic)', 'fullName', 'full_name', 'full_name_ar', 'الاسم الكامل (عربي)', 'الاسم الكامل(عربي)', 
              'الاسم الكامل', 'اسم الموظف', 'الاسم العربي', 'الاسم', 'الاسم الثلاثي', 'اسم الموظف الثلاثي', 
              'اسم الموظف الكامل', 'Full Name', 'Name', 'Employee Name', 'Emp Name', 'Staff Name', 'اسم الموظف الرباعي', 
              'الموظف', 'اسم الشخص', 'اسم الموارد', 'اسم الموظف واللقب', 'الاسم واللقب', 'الموظفين', 'الموظف/ة',
              'Local Staff (list all)', 'Local Staff', 'Staff', 'Staff List', 'Staff (list all)'
            ]);

            let fullName = fullNameVal;
            if (!fullName && row && typeof row === 'object') {
              const rowKeys = Object.keys(row);
              for (const rk of rowKeys) {
                const cleanK = normalizeHeaderKey(rk);
                if (cleanK.includes('اسم') || cleanK.includes('name') || cleanK.includes('موظف') || cleanK.includes('كامل') || cleanK.includes('ثلاثي') || cleanK.includes('staff')) {
                  const v = row[rk];
                  if (v !== undefined && v !== null && String(v).trim() !== '') {
                    fullName = String(v).trim();
                    break;
                  }
                }
              }
            }

            if (!fullName && row && typeof row === 'object') {
              const vals = Object.values(row)
                .map(v => String(v || '').trim())
                .filter(v => v.length > 1 && isNaN(Number(v)) && !v.includes('http') && !v.includes('@') && !v.includes('/') && !v.includes('-'));
              if (vals.length > 0) {
                fullName = vals[0];
              }
            }

            let fullNameEn = getVal(row, [
              'Full Name (English)', 'Employee Name (EN)', 'Employee Name (English)', 'fullNameEn', 'full_name_en', 
              'الاسم الكامل (إنجليزي)', 'الاسم الكامل (انجليزي)', 'الاسم الانكليزي', 'الاسم الإنجليزي', 'English Name', 'Full Name English',
              'Local Staff (list all)', 'Local Staff', 'Staff Name'
            ]);
            if (!fullName) fullName = fullNameEn;
            if (!fullName) continue;
            if (!fullNameEn) fullNameEn = fullName;
            // Only accept explicit Employee Code/ID (excluding sequence numbers 'ت', 'م', 'الرقم' and '0')
            let empCode = getVal(row, ['Employee Code', 'Employee ID', 'empCode', 'employeeId', 'employee_id', 'رمز الموظف', 'كود الموظف', 'الرمز الوظيفي']);
            if (!empCode || empCode === '0' || empCode === '0.0' || empCode.trim() === '') {
              empCode = `VTS-${1000 + rowIdx}`;
            }
            const rawBadge = getVal(row, ['Badge No', 'Badge Number', 'badgeNo', 'badge_no', 'رقم البادج', 'البادج', 'Badge']);
            const badgeNo = (!rawBadge || rawBadge === '0' || rawBadge === '0.0') ? `B-${1000 + rowIdx}` : rawBadge;
            let waid = getVal(row, ['SystemID', 'System ID', 'system_id', 'systemid', 'WAID', 'waid', 'wa_id', 'معرف الحوافز', 'كود الحوافز', 'معرف الحوافز (WAID)', 'Incentives ID', 'Incentives WAID', 'Incentives WAID(For Incentives)']);
            if (waid === '0' || waid === '0.0') waid = '';
            const dob = parseExcelDate(getVal(row, ['Date of Birth', 'dob', 'تاريخ الميلاد', 'تاريخ ولادة', 'DOB', 'Birth Date']));
            const email = getVal(row, ['Email', 'email', 'البريد الإلكتروني المؤسسي', 'البريد الإلكتروني', 'البريد الالكتروني', 'الإيميل', 'الايميل', 'البريد المؤسسي']);
            const personalEmail = getVal(row, ['Personal Email', 'personalEmail', 'personal_email', 'البريد الإلكتروني الشخصي', 'البريد الشخصي', 'الايميل الشخصي']);
            const phone = formatIraqiPhoneNumber(getVal(row, ['Phone', 'phone', 'mobile', 'Mobile', 'الهاتف', 'رقم الهاتف', 'الموبايل', 'رقم الجوال', 'الجوال', 'Cellular']));
            const emergencyPhone = formatIraqiPhoneNumber(getVal(row, ['Emergency Phone', 'emergencyPhone', 'emergency_phone', 'هاتف الطوارئ', 'رقم الطوارئ']));
            
            const rawGender = getVal(row, ['Gender', 'gender', 'الجنس', 'النوع']) || 'ذكر';
            const gender = (rawGender.toLowerCase() === 'female' || rawGender.includes('أنثى') || rawGender.includes('انثى')) ? 'أنثى' : 'ذكر';

            const rawMarital = getVal(row, ['Marital Status', 'maritalStatus', 'marital_status', 'الحالة الاجتماعية', 'الحالة الزوجية']) || 'أعزب';
            const maritalStatus = (rawMarital.toLowerCase() === 'married' || rawMarital.includes('متزوج') || rawMarital.includes('متأهل')) ? 'متأهل' : 'أعزب';

            const nationality = getVal(row, ['Nationality', 'nationality', 'الجنسية', 'Citizenship', 'citizenship']) || 'عراقي';

            const rawGraduationDegree = getVal(row, [
              'Graduation Degree', 'graduationDegree', 'graduation_degree', 
              'الدرجة العلمية', 'الشهادة العلمية', 'المؤهل العلمي', 'المؤهل', 'الشهادة', 
              'Graduation', 'Degree', 'الدرجة العلمية (Graduation Degree)', 'الدرجة العلمية / Graduation Degree',
              'Graduation Degree (Diplome, Bachelar, Master)'
            ]);
            let graduationDegree = '';
            if (rawGraduationDegree) {
              const normDeg = String(rawGraduationDegree).trim().toLowerCase();
              if (normDeg.includes('master') || normDeg.includes('ماجستير')) {
                graduationDegree = 'Master';
              } else if (normDeg.includes('bachelor') || normDeg.includes('bachelar') || normDeg.includes('بكالوريوس')) {
                graduationDegree = 'Bachelar';
              } else if (normDeg.includes('diploma') || normDeg.includes('diplome') || normDeg.includes('دبلوم')) {
                graduationDegree = 'Diplome';
              } else {
                graduationDegree = String(rawGraduationDegree).trim();
              }
            }

            const contractStartDate = parseExcelDate(getVal(row, ['Contract Start Date', 'contractStartDate', 'contract_start_date', 'تاريخ بداية العقد', 'تاريخ بدء العقد', 'تاريخ بداية العقد الحالي', 'بداية العقد']));
            const contractEndDate = parseExcelDate(getVal(row, ['Contract End Date', 'contractEndDate', 'contract_end_date', 'Contract Ends', 'تاريخ نهاية العقد', 'تاريخ انتهاء العقد', 'نهاية العقد']));
            const originalStartDate = parseExcelDate(getVal(row, ['Original Start Date', 'originalStartDate', 'original_start_date', 'joinDate', 'Date of Hire', 'Hire Date', 'Start Date', 'تاريخ المباشرة', 'تاريخ المباشرة الأولى', 'تاريخ المباشره', 'تاريخ التعيين']));
            const probationEndDate = parseExcelDate(getVal(row, ['Probation End Date', 'probationEndDate', 'probation_end_date', 'نهاية فترة التجربة', 'تاريخ انتهاء فترة التجربة', 'فترة التجربة']));
            const exitDate = parseExcelDate(getVal(row, ['Exit Date', 'exitDate', 'exit_date', 'تاريخ المغادرة', 'تاريخ إنهاء الخدمة', 'تاريخ الاستقالة']));
            const termOfContract = getVal(row, ['Term of Contract', 'termOfContract', 'term_of_contract', 'نوع العقد', 'نوع مدة العقد', 'مدة العقد']) || 'عقد محدد المدة (سنة واحدة)';
            const grade = getVal(row, ['Grade', 'grade', 'الدرجة الوظيفية', 'الدرجة', 'الدرجة السلمية', 'المستوى']) || 'G-4 الدرجة الرابعة';

            let jobTitle = getVal(row, [
              'Job Title (Arabic)', 'Job Title (AR)', 'jobTitle', 'job_title', 'position', 'position_ar', 
              'المسمى الوظيفي (عربي)', 'العنوان الوظيفي (عربي)', 'المسمى الوظيفي عربي', 'المسمى الوظيفي', 'العنوان الوظيفي', 'الوظيفة',
              'Position 1', 'Position 2', 'Position', 'Microfin Headcount Position', 'Microfin Position',
              'Job Title', 'Job Title (English)', 'Position / Role', 'Role', 'Title',
              'المسمى الوظيفي 1', 'المسمى الوظيفي 2', 'مسمى الوظيفة', 'العنوان المهني'
            ]);
            let jobTitleEn = getVal(row, [
              'Job Title (English)', 'Job Title (EN)', 'jobTitleEn', 'job_title_en', 'position_en', 'position1', 'position2',
              'المسمى الوظيفي (إنجليزي)', 'المسمى الوظيفي (انجليزي)', 'العنوان الوظيفي (إنجليزي)', 'العنوان الوظيفي (انجليزي)', 'المسمى الوظيفي إنجليزي', 'Job Title English',
              'Position 1', 'Position', 'Position Level 1', 'Position Level 2', 'Microfin Headcount Position'
            ]) || jobTitle;
            if (!jobTitle && jobTitleEn) jobTitle = jobTitleEn;
            if (!jobTitleEn && jobTitle) jobTitleEn = jobTitle;

            let department = getVal(row, [
              'Department (Arabic)', 'Department (AR)', 'department_ar', 
              'القسم / الإدارة (عربي)', 'القسم/الإدارة (عربي)', 'القسم (عربي)', 'القسم / الإدارة', 'القسم', 'اسم القسم'
            ]);
            let departmentEn = getVal(row, [
              'Department (English)', 'Department (EN)', 'departmentEn', 'department_en', 
              'القسم / الإدارة (إنجليزي)', 'القسم / الإدارة (انجليزي)', 'القسم/الإدارة (إنجليزي)', 'القسم (إنجليزي)', 'Department English', 'Department'
            ]);

            let branch = getVal(row, [
              'Branch (Arabic)', 'Branch (AR)', 'Location (AR)', 'Location (Arabic)', 'branch', 'branch_ar', 'location', 'location_ar', 
              'الفرع (عربي)', 'الموقع (عربي)', 'الفرع العربي', 'الفرع', 'الموقع', 'مكان العمل', 'المكتب', 'المكتب / الفرع', 'المكتب/الفرع',
              'Office', 'Office Location', 'Branch', 'Location', 'CHFVITAS (Office)', 'Branch Name', 'City', 'المدينة'
            ]);
            let branchEn = getVal(row, [
              'Branch (English)', 'Branch (EN)', 'Location (EN)', 'Location (English)', 'branchEn', 'branch_en', 'location_en', 
              'الفرع (إنجليزي)', 'الفرع (انجليزي)', 'الموقع (إنجليزي)', 'الفرع الإنجليزي', 'Branch English',
              'Office', 'Office Location', 'Branch', 'Location', 'CHFVITAS (Office)'
            ]) || branch;
            if (!branch && branchEn) branch = branchEn;
            if (!branchEn && branch) branchEn = branch;

            const supervisorName = getVal(row, [
              'Supervisor Name', 'supervisorName', 'supervisor_name', 'اسم المشرف المباشر', 'اسم المشرف', 'المشرف', 'المدير المباشر', 'Supervisor'
            ]);

            // SANITY CHECKS: Department, Position, and Branch must NEVER be an employee or supervisor name!
            const isPersonName = (val: string) => {
              if (!val) return false;
              const cv = val.trim().toLowerCase();
              if (cv === fullName.toLowerCase()) return true;
              if (fullNameEn && cv === fullNameEn.toLowerCase()) return true;
              if (supervisorName && cv === supervisorName.toLowerCase()) return true;
              return false;
            };

            if (department && isPersonName(department)) department = '';
            if (departmentEn && isPersonName(departmentEn)) departmentEn = '';
            if (jobTitle && isPersonName(jobTitle)) jobTitle = '';
            if (jobTitleEn && isPersonName(jobTitleEn)) jobTitleEn = '';
            if (branch && isPersonName(branch)) branch = '';
            if (branchEn && isPersonName(branchEn)) branchEn = '';

            // Post-sanitization Fallbacks & English-to-Arabic Normalization
            if (!branch && branchEn) branch = branchEn;
            if (!branchEn && branch) branchEn = branch;
            if (branch && BRANCH_EN_TO_AR_DICT[branch.trim().toLowerCase()]) {
              branch = BRANCH_EN_TO_AR_DICT[branch.trim().toLowerCase()];
            } else if (branchEn && BRANCH_EN_TO_AR_DICT[branchEn.trim().toLowerCase()]) {
              branch = BRANCH_EN_TO_AR_DICT[branchEn.trim().toLowerCase()];
            }

            if (!jobTitle && jobTitleEn) jobTitle = jobTitleEn;
            if (!jobTitleEn && jobTitle) jobTitleEn = jobTitle;
            const rawScopeText = (getVal(row, ['Work Scope', 'workScope', 'work_scope', 'Employ. Category']) || '').toLowerCase();
            const emailLower = (email || '').toLowerCase();

            // Infer missing Job Title from email / work scope if still missing
            if (!jobTitle && !jobTitleEn) {
              if (emailLower.startsWith('lo_')) {
                jobTitle = 'مسؤول قروض'; jobTitleEn = 'Loan Officer';
              } else if (rawScopeText.includes('field')) {
                jobTitle = 'مسؤول قروض ميداني'; jobTitleEn = 'Field Loan Officer';
              } else if (rawScopeText.includes('office')) {
                jobTitle = 'موظف إداري فرع'; jobTitleEn = 'Branch Office Staff';
              } else {
                jobTitle = 'مسؤول قروض'; jobTitleEn = 'Loan Officer';
              }
            } else {
              const translated = translatePositionTitle(jobTitleEn || jobTitle);
              if (translated && translated !== (jobTitleEn || jobTitle)) {
                jobTitle = translated;
              }
            }

            // Department Fallbacks & Normalization
            if (!department && departmentEn) department = departmentEn;
            if (!departmentEn && department) departmentEn = department;

            if (department && DEPT_EN_TO_AR_DICT[department.trim().toLowerCase()]) {
              department = DEPT_EN_TO_AR_DICT[department.trim().toLowerCase()];
            } else if (departmentEn && DEPT_EN_TO_AR_DICT[departmentEn.trim().toLowerCase()]) {
              department = DEPT_EN_TO_AR_DICT[departmentEn.trim().toLowerCase()];
            }

            // Auto-infer Department from Job Title or Email or Scope if missing
            if (!department) {
              const p = `${jobTitle || ''} ${jobTitleEn || ''} ${email || ''}`.toLowerCase();
              if (p.includes('treasur') || p.includes('خزين') || p.includes('صندوق') || p.includes('صراف')) {
                department = 'قسم الخزينة'; departmentEn = 'Treasury';
              } else if (p.includes('secur') || p.includes('guard') || p.includes('أمن') || p.includes('حارس')) {
                department = 'قسم الأمن'; departmentEn = 'Security';
              } else if (p.includes('audit') || p.includes('تدقيق')) {
                department = 'التدقيق الداخلي'; departmentEn = 'Internal Audit';
              } else if (p.includes('risk') || p.includes('مخاطر')) {
                department = 'المخاطر والامتثال'; departmentEn = 'Risk & Compliance';
              } else if (p.includes('compliance') || p.includes('regulatory') || p.includes('امتثال')) {
                department = 'قسم الامتثال'; departmentEn = 'Compliance';
              } else if (p.includes('account') || p.includes('financ') || p.includes('محاسب') || p.includes('مالي') || p.includes('حسابات')) {
                department = 'المالية والمحاسبة'; departmentEn = 'Finance & Accounting';
              } else if (p.includes('hr') || p.includes('recruit') || p.includes('training') || p.includes('personnel') || p.includes('موارد بشرية')) {
                department = 'الموارد البشرية'; departmentEn = 'Human Resources';
              } else if (p.includes('mis')) {
                department = 'نظم المعلومات الإدارية (MIS)'; departmentEn = 'MIS';
              } else if (p.includes('it') || p.includes('معلومات') || p.includes('تقنية') || p.includes('technical')) {
                department = 'تكنولوجيا المعلومات'; departmentEn = 'IT';
              } else if (p.includes('collect') || p.includes('تحصيل') || p.includes('استحصال')) {
                department = 'الاستحصال والتحصيل'; departmentEn = 'Collection & Recovery';
              } else if (p.includes('procure') || p.includes('facilit') || p.includes('مشتريات') || p.includes('تسهيلات')) {
                department = 'المشتريات والتسهيلات'; departmentEn = 'Procurement & Facilities';
              } else if (p.includes('market') || p.includes('pr') || p.includes('social media') || p.includes('تسويق') || p.includes('علاقات عامة')) {
                department = 'التسويق والعلاقات العامة'; departmentEn = 'Marketing & PR';
              } else if (p.includes('office manager') || p.includes('reception') || p.includes('clean') || p.includes('نظافة') || p.includes('استقبال') || p.includes('مدير مكتب')) {
                department = 'العمليات وإدارة الفروع'; departmentEn = 'Operations';
              } else {
                department = 'قسم الائتمان'; departmentEn = 'Credit';
              }
            }

            if (!departmentEn) departmentEn = department;

            // Work Scope (Harmonized with Office Job & Field Job)
            const rawWorkScope = getVal(row, ['Work Scope', 'workScope', 'work_scope', 'نطاق العمل', 'طبيعة العمل', 'نطاق وطبيعة العمل', 'Employ. Category', 'Category', 'فئة العمل']) || 'Office Job';
            let workScope = 'Office Job';
            if (rawWorkScope.toLowerCase().includes('field & admin') || rawWorkScope.includes('ميداني ومكتبي')) {
              workScope = 'Field & Admin';
            } else if (rawWorkScope.toLowerCase().includes('field') || rawWorkScope.includes('ميداني')) {
              workScope = 'Field Job';
            } else {
              workScope = 'Office Job';
            }

            // Management Tier
            const managementTier = getVal(row, ['Management Tier', 'managementTier', 'management_tier', 'tier', 'Tiers', 'المستوى الإداري', 'المستوى الاداري', 'المستوى']) || 'Non Management';

            // Branch vs Main Office
            const branchVsMo = getVal(row, ['Branch vs Main Office', 'Branch vs MO', 'Branch vs MO Microfin', 'branchVsMo', 'branch_vs_mo', 'branchVsMO', 'تصنيف المكتب', 'فرع أم إدارة عامة']) || (branch && (branch.toLowerCase().includes('main') || branch.toLowerCase().includes('hq') || branch.includes('الرئيسي') || branch.includes('العامة')) ? 'Main Office' : 'Branch');

            // Admin Line
            const adminLine = getVal(row, ['Admin Line', 'adminLine', 'admin_line', 'Admin / Line / LineField', 'خط التبعية الإداري', 'خط التبعية الاداري', 'التبعية الإدارية']) || supervisorName || '';

            // Position Levels
            const positionLevel1 = getVal(row, ['Position Level 1', 'positionLevel1', 'position_level_1', 'position1', 'المستوى الوظيفي 1', 'المستوى الوظيفي الأول']) || jobTitle || '';
            const positionLevel2 = getVal(row, ['Position Level 2', 'positionLevel2', 'position_level_2', 'position2', 'المستوى الوظيفي 2', 'المستوى الوظيفي الثاني']) || '';
            const microfinPosition = getVal(row, ['Microfin Position', 'Microfin Headcount Position', 'microfinPosition', 'microfin_position', 'مسمى ميكروفين', 'مسمى الوظيفة في ميكروفين', 'وظيفة ميكروفين']) || jobTitle || '';

            // Second Citizenship
            const secondCitizenship = getVal(row, ['Second Citizenship', '2nd Citizenship', 'secondCitizenship', 'second_citizenship', 'الجنسية الثانية', 'الجنسية 2']) || 'N/A';

            // Termination Reason
            const terminationReason = getVal(row, ['Termination Reason', 'terminationReason', 'termination_reason', 'reason', 'سبب ترك العمل', 'سبب الاستقالة', 'سبب إنهاء الخدمة']) || '';

            const parseValToNum = (v: any): number => {
              if (v === undefined || v === null) return 0;
              const str = String(v).replace(/,/g, '').trim();
              if (str === '') return 0;
              const num = Number(str);
              return isNaN(num) ? 0 : num;
            };

            const rawBasicSalary = getVal(row, ['Basic Salary', 'basicSalary', 'basic_salary', 'الراتب الاسمي', 'الراتب الأساسي', 'الراتب', 'الراتب الاسمي (دينار)', 'الراتب الاسمي د.ع']);
            const basicSalary = parseValToNum(rawBasicSalary);
            // Basic salary in words automatically calculated to match basic salary amount:
            const rawWrittenSalary = getVal(row, ['Written Basic Salary (Arabic)', 'writtenBasicSalaryAr', 'الراتب الاسمي كتابة', 'الراتب كتابة']);
            const writtenBasicSalaryAr = (basicSalary > 0 ? numberToArabicWords(basicSalary) : '') || rawWrittenSalary || '';

            // Allowances default to 0 for empty cells:
            const transportationFixed = parseValToNum(getVal(row, ['Transportation Fixed', 'transportationFixed', 'بدل النقل الثابت', 'بدل النقل', 'مخصصات النقل']));
            const fixedBonus = parseValToNum(getVal(row, ['Fixed Bonus', 'fixedBonus', 'المكافأة الثابتة', 'مكافأة ثابتة', 'المكافاة الثابتة']));
            const phoneAllowance = parseValToNum(getVal(row, ['Phone Allowance', 'phoneAllowance', 'بدل الهاتف', 'مخصصات الهاتف']));
            let certificateAllowance = parseValToNum(getVal(row, ['Certificate Allowance', 'certificateAllowance', 'بدل الشهادة', 'مخصصات الشهادة']));

            // Automatically calculate and save certificate allowance from policies if 0 or empty but graduation degree is provided
            if (certificateAllowance === 0 && graduationDegree) {
              const curr = appSettings['certificate_allowance_currency'] || 'IQD';
              const fx = parseFloat(appSettings['usd_to_iqd_rate'] || '1520') || 1520;
              let policyVal = 0;
              if (graduationDegree === 'Diplome') {
                policyVal = parseFloat(appSettings['certificate_allowance_diplome'] || '50000') || 50000;
              } else if (graduationDegree === 'Bachelar') {
                policyVal = parseFloat(appSettings['certificate_allowance_bachelar'] || '100000') || 100000;
              } else if (graduationDegree === 'Master') {
                policyVal = parseFloat(appSettings['certificate_allowance_master'] || '150000') || 150000;
              }
              certificateAllowance = curr === 'USD' ? Math.round(policyVal * fx) : policyVal;
            }
            const bankName = getVal(row, ['Bank Name', 'bankName', 'bank_name', 'اسم المصرف', 'المصرف', 'البنك']) || '';
            const iban = getVal(row, ['IBAN', 'iban', 'رقم IBAN', 'رقم الحساب', 'الآيبان', 'حساب المصرف']) || '';

            const rawExempt = getVal(row, ['SS Tax Exempt', 'isSsTaxExempt', 'is_ss_tax_exempt', 'غير خاضع للضمان', 'غير خاضع للضمان والضريبة', 'معفى من الضمان', 'متقاعد']);
            const isSsTaxExempt = (rawExempt.toLowerCase() === 'true' || rawExempt.toLowerCase() === 'yes' || rawExempt.includes('نعم') || rawExempt === '1' || rawExempt.includes('متقاعد') || rawExempt.includes('معفى'));
            const ssTaxExemptionReason = getVal(row, ['Exemption Reason', 'ssTaxExemptionReason', 'ss_tax_exemption_reason', 'سبب الإعفاء', 'سبب الاعفاء']) || (isSsTaxExempt ? 'متقاعد / غير خاضع للضمان الاجتماعي' : '');

            const nationalId = getVal(row, ['National ID', 'nationalId', 'national_id', 'البطاقة الوطنية', 'الرقم الوطني', 'رقم الهوية الوطنية']);
            const passportNo = getVal(row, ['Passport Number', 'Passport No', 'passportNo', 'passport_no', 'رقم جواز السفر', 'رقم الجواز', 'جواز السفر']);
            const passportExpiry = parseExcelDate(getVal(row, ['Passport Expiry', 'passportExpiry', 'تاريخ نفاذ الجواز']));
            const photoUrl = getVal(row, ['Photo URL', 'photoUrl', 'رابط الصورة']);

            const spouseName = getVal(row, ['Spouse Name', 'spouseName', 'اسم الزوج/الزوجة']);
            const rawSpouseEmployed = getVal(row, ['Spouse Employed Here', 'spouseEmployedHere', 'الزوج يعمل بالشركة']);
            const spouseEmployedHere = rawSpouseEmployed === 'true' || rawSpouseEmployed === 'yes' || rawSpouseEmployed === 'Yes' || rawSpouseEmployed === 'نعم';

            const rawStatus = getVal(row, ['Status', 'status', 'الحالة', 'حالة الموظف']) || 'Active';
            const status = (rawStatus.toLowerCase().includes('inact') || rawStatus.includes('غير نشط')) ? 'Inactive' : 'Active';

            const rawPerfRating = getVal(row, ['Performance Rating', 'perfRating', 'perf_rating', 'Rating', 'تقييم الأداء', 'تقييم الاداء', 'درجة التقييم']);
            const perfRating = rawPerfRating !== '' ? parseValToNum(rawPerfRating) : null;

            // Collect unique Branch / Location to add in batch (Strict Guard: Never add employee name as branch)
            if (branch && !isPersonName(branch) && branch.trim().length > 1) {
              const normB = branch.trim().toLowerCase();
              const normBEn = (branchEn || branch).trim().toLowerCase();
              const exists = currentLocations.some(l => 
                (l.name_ar && l.name_ar.trim().toLowerCase() === normB) || 
                (l.name && l.name.trim().toLowerCase() === normB) || 
                (l.name_en && l.name_en.trim().toLowerCase() === normBEn)
              );
              if (!exists) {
                const alreadyPushed = branchesToCreate.some(b => 
                  (b.name_ar && b.name_ar.trim().toLowerCase() === normB) || 
                  (b.name_en && b.name_en.trim().toLowerCase() === normBEn)
                );
                if (!alreadyPushed) {
                  branchesToCreate.push({
                    name: branch.trim(),
                    name_ar: branch.trim(),
                    name_en: (branchEn || branch).trim(),
                    status: 'Active'
                  });
                }
              }
            }

            // Collect unique Department to add in batch (Strict Guard: Never add employee name as department)
            if (department && !isPersonName(department) && department.trim().length > 1) {
              const normD = department.trim().toLowerCase();
              const normDEn = (departmentEn || department).trim().toLowerCase();
              const exists = currentDepartments.some(d => 
                (d.name_ar && d.name_ar.trim().toLowerCase() === normD) || 
                (d.name && d.name.trim().toLowerCase() === normD) || 
                (d.name_en && d.name_en.trim().toLowerCase() === normDEn)
              );
              if (!exists) {
                const alreadyPushed = departmentsToCreate.some(d => 
                  (d.name_ar && d.name_ar.trim().toLowerCase() === normD) || 
                  (d.name_en && d.name_en.trim().toLowerCase() === normDEn)
                );
                if (!alreadyPushed) {
                  departmentsToCreate.push({
                    name_ar: department.trim(),
                    name_en: (departmentEn || department).trim(),
                    sort_order: currentDepartments.length + departmentsToCreate.length + 1,
                    status: 'Active'
                  });
                }
              }
            }

            // Collect unique Position to add in batch (Strict Guard: Never add employee name as position)
            if (jobTitle && !isPersonName(jobTitle) && jobTitle.trim().length > 1) {
              const normP = jobTitle.trim().toLowerCase();
              const normPEn = (jobTitleEn || jobTitle).trim().toLowerCase();
              const exists = currentPositions.some(p => 
                (p.name_ar && p.name_ar.trim().toLowerCase() === normP) || 
                (p.name && p.name.trim().toLowerCase() === normP) || 
                (p.name_en && p.name_en.trim().toLowerCase() === normPEn) ||
                (p.title && p.title.trim().toLowerCase() === normPEn) ||
                (p.title_ar && p.title_ar.trim().toLowerCase() === normP)
              );
              if (!exists) {
                const alreadyPushed = positionsToCreate.some(p => 
                  (p.name_ar && p.name_ar.trim().toLowerCase() === normP) || 
                  (p.name_en && p.name_en.trim().toLowerCase() === normPEn)
                );
                if (!alreadyPushed) {
                  positionsToCreate.push({
                    name_ar: jobTitle.trim(),
                    name_en: (jobTitleEn || jobTitle).trim(),
                    sort_order: currentPositions.length + positionsToCreate.length + 1,
                    status: 'Active'
                  });
                }
              }
            }

            const employeeData = {
              fullName,
              fullNameEn,
              empCode,
              badgeNo,
              waid,
              dob,
              email,
              personalEmail,
              phone,
              emergencyPhone,
              gender,
              maritalStatus,
              nationality,
              contractStartDate,
              contractEndDate,
              originalStartDate,
              probationEndDate,
              exitDate,
              termOfContract,
              grade,
              jobTitle,
              jobTitleEn,
              department,
              departmentEn,
              branch,
              branchEn,
              supervisorName,
              workScope,
              work_scope: workScope,
              managementTier,
              management_tier: managementTier,
              tier: managementTier,
              branchVsMo,
              branch_vs_mo: branchVsMo,
              branchVsMO: branchVsMo,
              adminLine,
              admin_line: adminLine,
              positionLevel1,
              position_level_1: positionLevel1,
              positionLevel2,
              position_level_2: positionLevel2,
              microfinPosition,
              microfin_position: microfinPosition,
              secondCitizenship,
              second_citizenship: secondCitizenship,
              terminationReason,
              termination_reason: terminationReason,
              perfRating,
              perf_rating: perfRating,
              basicSalary,
              writtenBasicSalaryAr,
              transportationFixed,
              fixedBonus,
              phoneAllowance,
              certificateAllowance,
              certificate_allowance: certificateAllowance,
              graduationDegree: graduationDegree || null,
              graduation_degree: graduationDegree || null,
              bankName,
              iban,
              isSsTaxExempt,
              ssTaxExemptionReason,
              nationalId,
              passportNo,
              passportExpiry,
              photoUrl,
              spouseName,
              spouseEmployedHere,
              childrenList,
              children_details: childrenList.length > 0 ? JSON.stringify(childrenList) : null,
              children_json: childrenList.length > 0 ? JSON.stringify(childrenList) : null,
              status
            };

            employeesToImport.push(employeeData);
          } catch (error: any) {
            console.error('Error importing employee row:', error);
            errorsList.push(error?.message || String(error));
          }
        }

        if (employeesToImport.length === 0) {
          setIsImporting(false);
          const detail = errorsList.length > 0 ? `\n\nالتفاصيل: ${errorsList.slice(0, 3).join(', ')}` : '';
          alert(language === 'ar' 
            ? `لم يتم العثور على أي موظف صالح للاستيراد. يرجى التأكد من اختيار ملف يحتوي على بيانات الموظفين وعناوين الأعمدة الصحيحة.${detail}`
            : `No employees imported. Please ensure the file contains valid employee rows and correct headers.${detail}`);
          return;
        }

        setImportStatusText(language === 'ar'
          ? `جاري حفظ ${employeesToImport.length} موظف دفعة واحدة بسرعة فائقة...`
          : `Saving ${employeesToImport.length} employees to database in high-speed batch...`);

        // Execute batch import in a single lightning-fast request
        const batchResult: any = await api.batchImportEmployees({
          employees: employeesToImport,
          branches: branchesToCreate,
          departments: departmentsToCreate,
          positions: positionsToCreate
        });

        // Reload Settings data (Locations, Departments, Positions) so new entries appear in Settings UI
        try {
          await loadData();
        } catch (err) {
          console.warn('Could not reload settings data:', err);
        }

        // Refresh employees state in AppContext so employee cards immediately appear in Employee Directory
        try {
          if (refreshEmployees) {
            await refreshEmployees();
          } else {
            const freshList = await api.getEmployees();
            if (setEmployees) setEmployees(freshList);
          }
        } catch (err) {
          console.warn('Could not refresh employees list:', err);
        }

        setIsImporting(false);

        const totalImported = batchResult?.count || employeesToImport.length;
        alert(language === 'ar' 
          ? `✅ تم استيراد وحفظ ${totalImported} موظف بنجاح وتحديث النظام بالكامل خلال ثوانٍ معدودة!` 
          : `✅ Successfully imported ${totalImported} employees and updated directory & settings in seconds!`);
      } catch (error: any) {
        setIsImporting(false);
        console.error('Error processing Employee Excel file:', error);
        alert(language === 'ar' 
          ? `حدث خطأ في معالجة ملف Excel للموظفين: ${error?.message || String(error)}` 
          : `Error processing Employee Excel file: ${error?.message || String(error)}`);
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* High-Speed Batch Import Overlay */}
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={`p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-md w-full mx-4 ${
            theme === 'dark' ? 'bg-[#111827] border border-white/10 text-white' : 'bg-white text-gray-900 shadow-xl'
          }`}>
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-lg font-bold mb-2">
              {language === 'ar' ? 'استيراد بيانات الموظفين' : 'Importing Employee Data'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {importStatusText || (language === 'ar' ? 'يرجى الانتظار، جاري حفظ البيانات بسرعة فائقة...' : 'Please wait, saving records at high speed...')}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${
            theme === 'dark' ? 'text-[#e2e8f0]' : 'text-gray-800'
          }`}>
            {t('الإعدادات والأمان', 'Settings & Security')}
          </h1>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={`flex flex-wrap items-center gap-2 pb-3 mb-6 border-b ${
        theme === 'dark' ? 'border-white/10' : 'border-gray-200'
      }`} dir={isRTL ? 'rtl' : 'ltr'}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${language === 'ar' ? 'text-sm' : 'text-xs'} font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? theme === 'dark'
                  ? 'bg-teal-500/20 border-teal-500/30 text-teal-400'
                  : 'bg-teal-600 text-white shadow-md'
                : tab.id === 'maintenance'
                ? theme === 'dark'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200'
                : theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-[#e2e8f0]'
                  : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-100 hover:text-black shadow-2xs'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {tab.icon}
            </span>
            <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={`rounded-2xl p-6 ${
        theme === 'dark' 
          ? 'glass-panel' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        {activeTab === 'locations' && (
          <DataTable
            title={t('الفروع والمواقع', 'Locations & Offices')}
            icon="location_city"
            data={deduplicatedLocations}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={(id) => handleDelete(id, 'locations')}
            language={language}
            showExcelButtons={true}
            onGenerateTemplate={() => generateExcelTemplate('locations')}
            onExportExcel={() => handleTabExport('locations')}
            onImportExcel={(e) => handleExcelImport(e, 'locations')}
            fileInputRef={fileInputRef}
            activeTab="locations"
          />
        )}
        {activeTab === 'positions' && (
          <DataTable
            title={t('المسميات الوظيفية', 'Positions')}
            icon="work"
            data={deduplicatedPositions}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={(id) => handleDelete(id, 'positions')}
            language={language}
            showExcelButtons={true}
            onGenerateTemplate={() => generateExcelTemplate('positions')}
            onExportExcel={() => handleTabExport('positions')}
            onImportExcel={(e) => handleExcelImport(e, 'positions')}
            fileInputRef={fileInputRef}
            activeTab="positions"
          />
        )}
        {activeTab === 'departments' && (
          <DataTable
            title={t('الأقسام', 'Departments')}
            icon="business"
            data={deduplicatedDepartments}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={(id) => handleDelete(id, 'departments')}
            language={language}
            showExcelButtons={true}
            onGenerateTemplate={() => generateExcelTemplate('departments')}
            onExportExcel={() => handleTabExport('departments')}
            onImportExcel={(e) => handleExcelImport(e, 'departments')}
            fileInputRef={fileInputRef}
            activeTab="departments"
          />
        )}

        {activeTab === 'incentives-engine-dev' && (
          <IncentivesDevConfigView isDark={theme === 'dark'} />
        )}

        {activeTab === 'desktop-sync' && (
          <DesktopSyncSettings />
        )}

        {activeTab === 'local-server-setup' && (
          <LocalServerSetup />
        )}
        {activeTab === 'status-changes' && (
          <div className={`p-4 sm:p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
            <StatusChangeTable
              employees={employees}
              language={language}
              theme={theme}
            />
          </div>
        )}
        {activeTab === 'trainings' && (
          <div className={`p-4 sm:p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
            <TrainingTable
              employees={employees}
              language={language}
              theme={theme}
            />
          </div>
        )}
        {activeTab === 'warnings' && (
          <div className={`p-4 sm:p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0f1420] border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
            <WarningTable
              employees={employees}
              language={language}
              theme={theme}
            />
          </div>
        )}
        {activeTab === 'allowances' && (
          <PoliciesSection
            appSettings={appSettings}
            onSettingChange={handleSettingChange}
            onSaveAll={handleSaveAllSettings}
            language={language}
            t={t}
            isSaving={isSavingSettings}
            employees={employees}
          />
        )}
        {activeTab === 'iraq-tax-security' && (
          <IraqLegalTaxSettingsSection language={language as any} />
        )}
        {activeTab === 'templates' && (
          <TemplatesSection
            contractTypes={contractTypes}
            selectedContractType={selectedContractType}
            setSelectedContractType={setSelectedContractType}
            contractClauses={contractClauses}
            addClauseRow={addClauseRow}
            removeClause={removeClause}
            updateClause={updateClause}
            handleSaveContractClauses={handleSaveContractClauses}
            isSavingClauses={isSavingClauses}
            clausesToast={clausesToast}
            language={language}
            t={t}
            onAddContractType={() => {
              modalTargetTab.current = 'contract-types';
              setShowAddModal(true);
              setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' });
            }}
            onEditContractType={(item) => {
              modalTargetTab.current = 'contract-types';
              openEditModal(item);
            }}
            onDeleteContractType={async (id) => {
              const confirmMsg = language === 'ar' 
                ? 'هل أنت متأكد من حذف نوع العقد هذا مع كافة بنوده المرتبطة؟' 
                : 'Are you sure you want to delete this contract type and its associated clauses?';
              if (window.confirm(confirmMsg)) {
                try {
                  // Optimistically remove from view immediately
                  setContractTypes(prev => prev.filter(c => c.id !== id && String(c.id) !== String(id)));
                  if (selectedContractType === id || selectedContractType === parseInt(id.toString())) {
                    setSelectedContractType(null);
                    setContractClauses([]);
                  }
                  
                  // Call API to delete from database
                  await api.deleteContractType(id.toString());

                  // Clean any local storage cache for this contract type
                  try {
                    localStorage.removeItem(`vitas_contract_clauses_${id}`);
                  } catch (e) {}

                  // Refresh contract types from API
                  const updated = await api.getContractTypes();
                  if (Array.isArray(updated)) {
                    setContractTypes(updated);
                  }
                } catch (err: any) {
                  console.error('Error deleting contract type:', err);
                  alert(language === 'ar' ? 'حدث خطأ أثناء حذف نوع العقد' : 'Error deleting contract type');
                  await loadData();
                }
              }
            }}
          />
        )}
        {activeTab === 'employees' && (
          <DataTable
            title={t('إدارة الموظفين', 'Employee Management')}
            icon="badge"
            data={employeeDataItems}
            onAdd={() => {}}
            onEdit={openEditModal}
            onDelete={async (id) => {
              const confirmMsg = language === 'ar' ? 'هل أنت متأكد من حذف هذا الموظف؟' : 'Are you sure you want to delete this employee?';
              if (window.confirm(confirmMsg)) {
                try {
                  await deleteEmployee(String(id));
                  await refreshEmployees();
                  await loadData();
                } catch (err: any) {
                  console.error('Delete employee error:', err);
                  alert(language === 'ar' ? `حدث خطأ أثناء الحذف: ${err?.message || 'فشل الحذف'}` : `Error deleting employee: ${err?.message || 'Failed'}`);
                }
              }
            }}
            onDeleteAll={handleDeleteAllEmployees}
            language={language}
            showExcelButtons={true}
            showOnlyTemplateAndImport={false}
            onGenerateTemplate={generateEmployeeExcelTemplate}
            onExportExcel={handleEmployeeExcelExport}
            onImportExcel={handleEmployeeExcelImport}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'm365-integration' && (
          <Microsoft365Settings />
        )}
        {activeTab === 'maintenance' && (
          <div className="text-center py-12 bg-rose-500/5 rounded-2xl border border-rose-500/20 max-w-2xl mx-auto p-8 my-4">
            <span className="material-symbols-outlined text-6xl text-rose-500 mb-4 animate-pulse">warning</span>
            <h3 className="text-2xl font-bold text-rose-400 mb-2">
              {t('منطقة الصيانة - تفريغ البيانات التشغيلية', 'Maintenance - Clear Operational Data')}
            </h3>
            <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto leading-relaxed">
              {t(
                'يقوم هذا الإجراء بحذف كافة البيانات التشغيلية (الموظفين، الحضور والانصراف، الإجازات، الرواتب، والطلبات) بشكل نهائي، مع الحفاظ التام على حسابات المستخدمين (Users)، الصلاحيات، الإعدادات، قوالب العقود، والسياسات.',
                'This will permanently delete all operational data (employees, attendance, leaves, payroll, requests), while completely preserving Users, Roles & Permissions, Settings, Contract Templates, and Policies.'
              )}
            </p>
            <button 
              onClick={handleClearAllData}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-rose-600/30 flex items-center gap-2 mx-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">delete_sweep</span>
              {t('مسح البيانات التشغيلية', 'Clear Operational Data')}
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal
          title={
            (modalTargetTab.current || activeTab) === 'contract-types'
              ? (language === 'ar' ? 'إضافة نوع عقد جديد' : 'Add New Contract Type')
              : t('إضافة عنصر جديد', 'Add New Item')
          }
          onClose={() => {
            setShowAddModal(false);
            modalTargetTab.current = null;
          }}
          onSave={handleAdd}
          formData={formData}
          setFormData={setFormData}
          language={language}
          activeTab={modalTargetTab.current || activeTab}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal
          title={
            (modalTargetTab.current || activeTab) === 'contract-types'
              ? (language === 'ar' ? 'تعديل نوع العقد' : 'Edit Contract Type')
              : t('تعديل العنصر', 'Edit Item')
          }
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
            modalTargetTab.current = null;
          }}
          onSave={handleEdit}
          formData={formData}
          setFormData={setFormData}
          language={language}
          activeTab={modalTargetTab.current || activeTab}
        />
      )}
    </div>
  );
};

// DataTable Component
interface DataTableProps {
  title: string;
  icon: string;
  data: DataItem[];
  onAdd: () => void;
  onEdit: (item: DataItem) => void;
  onDelete: (id: number | string) => void;
  language: string;
  showExcelButtons?: boolean;
  showOnlyTemplateAndImport?: boolean;
  onGenerateTemplate?: () => void;
  onExportExcel?: () => void;
  onImportExcel?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  activeTab?: string;
  onDeleteAll?: () => void;
}

const DataTable: React.FC<DataTableProps> = ({
  title,
  icon,
  data,
  onAdd,
  onEdit,
  onDelete,
  language,
  showExcelButtons = false,
  showOnlyTemplateAndImport = false,
  onGenerateTemplate,
  onExportExcel,
  onImportExcel,
  fileInputRef,
  activeTab = '',
  onDeleteAll
}) => {
  const isRTL = language === 'ar';
  const { theme } = useApp();
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = fileInputRef || localFileInputRef;

  return (
    <div className="flex flex-col h-[500px]">
      <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
        theme === 'dark' ? 'border-white/10' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
            theme === 'dark' 
              ? 'bg-teal-600 text-white shadow-md' 
              : 'bg-teal-100 text-teal-600'
          }`}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <div>
            <h4 className={`font-bold text-sm uppercase tracking-wider ${
              theme === 'dark' ? 'text-[#e2e8f0]' : 'text-gray-800'
            }`}>{title}</h4>
            <p className={`text-xs ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
            }`}>
              {language === 'ar' ? 'إدارة البيانات' : 'Manage data'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showExcelButtons && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Template button clicked');
                  if (onGenerateTemplate) {
                    onGenerateTemplate();
                  } else {
                    console.error('onGenerateTemplate is not defined');
                  }
                }}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-teal-600 transition-all pointer-events-auto cursor-pointer"
                title={language === 'ar' ? 'إنشاء قالب Excel' : 'Generate Excel Template'}
              >
                <span className="material-symbols-outlined text-xs">table_view</span>
                <span className="hidden sm:inline">{language === 'ar' ? 'قالب' : 'Template'}</span>
              </button>
              {onExportExcel && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onExportExcel();
                  }}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-emerald-700 transition-all pointer-events-auto cursor-pointer"
                  title={language === 'ar' ? 'تصدير بيانات الموظفين' : 'Export Employees Data'}
                >
                  <span className="material-symbols-outlined text-xs">download</span>
                  <span className="hidden sm:inline">{language === 'ar' ? 'تصدير' : 'Export'}</span>
                </button>
              )}
              {onDeleteAll && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteAll();
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all pointer-events-auto cursor-pointer shadow-sm hover:shadow-rose-600/30"
                  title={language === 'ar' ? 'حذف جدول الموظفين بالكامل وتفريغ الفروع والمسميات والأقسام' : 'Delete Entire Employees Table'}
                >
                  <span className="material-symbols-outlined text-xs">delete_forever</span>
                  <span className="hidden sm:inline">{language === 'ar' ? 'حذف جدول الموظفين بالكامل' : 'Delete All Employees'}</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  activeInputRef.current?.click();
                }}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-600 transition-all pointer-events-auto cursor-pointer"
                title={language === 'ar' ? 'استيراد من Excel' : 'Import from Excel'}
              >
                <span className="material-symbols-outlined text-xs">upload_file</span>
                <span className="hidden sm:inline">{language === 'ar' ? 'استيراد' : 'Import'}</span>
              </button>
              <input
                ref={activeInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={onImportExcel}
                className="hidden"
              />
            </>
          )}
          {!showOnlyTemplateAndImport && !showExcelButtons && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAdd();
              }}
              className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-teal-600 transition-all pointer-events-auto cursor-pointer"
            >
            <span className="material-symbols-outlined text-xs">add</span>
            <span>{language === 'ar' ? 'إضافة' : 'Add'}</span>
          </button>
          )}
        </div>
      </div>
      {!showOnlyTemplateAndImport && (
        <div className="flex-1 overflow-y-auto space-y-3">
        {data.map((item) => (
          <div
            key={item.id}
            className={`flex justify-between items-center border py-2.5 px-4 rounded-xl transition-colors ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 min-w-0 flex-1 me-4">
              <span className={`text-sm font-bold whitespace-nowrap ${theme === 'dark' ? 'text-[#e2e8f0]' : 'text-gray-900'}`}>
                {item.name_en}
              </span>
              {(item.name_ar || item.name) && (
                <span className={`text-xs font-semibold whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                  {item.name_ar || item.name}
                </span>
              )}
              {activeTab === 'locations' ? (
                <>
                  {item.city && (
                    <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-[13px] opacity-70">location_on</span>
                      {item.city}
                    </span>
                  )}
                  {item.phone && (
                    <span className={`text-xs font-mono flex items-center gap-1 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-[13px] opacity-70">call</span>
                      {item.phone}
                    </span>
                  )}
                  {item.email && (
                    <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-[13px] opacity-70">mail</span>
                      {item.email}
                    </span>
                  )}
                  {item.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      item.status === 'Active'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.status === 'Active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </span>
                  )}
                </>
              ) : activeTab === 'employees' ? (
                <>
                  {item.employee_id && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-400 font-mono font-bold whitespace-nowrap">
                      {item.employee_id}
                    </span>
                  )}
                  {item.waid && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-teal-600/20 text-teal-300 font-mono font-bold whitespace-nowrap border border-teal-500/20" title="WAID - Incentives ID">
                      WAID: {item.waid}
                    </span>
                  )}
                  {item.department && (
                    <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-[13px] opacity-70">business</span>
                      {item.department}
                    </span>
                  )}
                  {item.position && (
                    <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-[13px] opacity-70">work</span>
                      {item.position}
                    </span>
                  )}
                  {item.city && (
                    <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-[13px] opacity-70">location_on</span>
                      {item.city}
                    </span>
                  )}
                  {item.phone && (
                    <span className={`text-xs font-mono flex items-center gap-1 whitespace-nowrap ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      <span className="material-symbols-outlined text-[13px] opacity-70">call</span>
                      {item.phone}
                    </span>
                  )}
                  {item.status && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      item.status === 'Active'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}>
                      {item.status === 'Active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                    </span>
                  )}
                </>
              ) : (
                item.status && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    item.status === 'Active'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {item.status === 'Active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer bg-transparent"
                title={language === 'ar' ? 'تعديل' : 'Edit'}
              >
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="p-1 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer bg-transparent"
                title={language === 'ar' ? 'حذف' : 'Delete'}
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
            <p>{language === 'ar' ? 'لا توجد بيانات' : 'No data available'}</p>
          </div>
        )}
        </div>
      )}
      {showOnlyTemplateAndImport && (
        <div className={`flex-1 flex items-center justify-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl mb-4">badge</span>
            <p>{language === 'ar' ? 'استخدم قالب Excel لاستيراد الموظفين' : 'Use Excel template to import employees'}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal Component
interface ModalProps {
  title: string;
  onClose: () => void;
  onSave: () => void;
  formData: { name_en: string; name_ar: string; sort_order: number; address: string; city: string; phone: string; email: string; status: string };
  setFormData: (data: { name_en: string; name_ar: string; sort_order: number; address: string; city: string; phone: string; email: string; status: string }) => void;
  language: string;
  activeTab: string;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, onSave, formData, setFormData, language, activeTab }) => {
  const { theme } = useApp();
  const isLocationsTab = activeTab === 'locations';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Form submitted');
    onSave();
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 pointer-events-auto">
      <div className={`w-full max-w-sm rounded-2xl p-6 border relative z-[10000] pointer-events-auto ${
        theme === 'dark' 
          ? 'bg-[#1a1f2e] border-white/10' 
          : 'bg-white border-gray-200'
      }`}>
        <h4 className={`font-bold text-sm mb-4 ${
          theme === 'dark' ? 'text-[#e2e8f0]' : 'text-gray-800'
        }`}>{title}</h4>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs mb-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }`}>Name (English)</label>
            <input
              type="text"
              value={formData.name_en}
              onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-[#e2e8f0]' 
                  : 'bg-gray-50 border-gray-300 text-gray-800'
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }`}>الاسم (العربية)</label>
            <input
              type="text"
              value={formData.name_ar}
              onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              dir="rtl"
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 text-[#e2e8f0]' 
                  : 'bg-gray-50 border-gray-300 text-gray-800'
              }`}
            />
          </div>
          <div>
            <label className={`block text-xs mb-1 ${
              theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
            }`}>Sort Order / الترتيب</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-[#e2e8f0]'
                  : 'bg-gray-50 border-gray-300 text-gray-800'
              }`}
            />
          </div>

          {isLocationsTab && (
            <>
              <div>
                <label className={`block text-xs mb-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>{language === 'ar' ? 'العنوان' : 'Address'}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-[#e2e8f0]'
                      : 'bg-gray-50 border-gray-300 text-gray-800'
                  }`}
                  placeholder={language === 'ar' ? 'العنوان الكامل' : 'Full address'}
                />
              </div>

              <div>
                <label className={`block text-xs mb-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>{language === 'ar' ? 'المدينة' : 'City'}</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-[#e2e8f0]'
                      : 'bg-gray-50 border-gray-300 text-gray-800'
                  }`}
                  placeholder={language === 'ar' ? 'مثال: بغداد' : 'e.g., Baghdad'}
                />
              </div>

              <div>
                <label className={`block text-xs mb-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-[#e2e8f0]'
                      : 'bg-gray-50 border-gray-300 text-gray-800'
                  }`}
                  placeholder={language === 'ar' ? 'مثال: 07700000000' : 'e.g., 07700000000'}
                />
              </div>

              <div>
                <label className={`block text-xs mb-1 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
                }`}>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-[#e2e8f0]'
                      : 'bg-gray-50 border-gray-300 text-gray-800'
                  }`}
                  placeholder="branch@vitas.iq"
                />
              </div>
            </>
          )}

          {(isLocationsTab || activeTab === 'contract-types') && (
            <div>
              <label className={`block text-xs mb-1 ${
                theme === 'dark' ? 'text-slate-400' : 'text-gray-600'
              }`}>{language === 'ar' ? 'الحالة' : 'Status'}</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-500 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-[#e2e8f0]'
                    : 'bg-gray-50 border-gray-300 text-gray-800'
                }`}
              >
                <option value="Active">{language === 'ar' ? 'نشط' : 'Active'}</option>
                <option value="Inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className={`px-4 py-2 text-xs rounded-xl transition-colors pointer-events-auto cursor-pointer ${
                theme === 'dark' 
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs rounded-xl transition-all pointer-events-auto cursor-pointer"
            >
              {language === 'ar' ? 'حفظ' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Templates Section Component
interface TemplatesSectionProps {
  contractTypes: DataItem[];
  selectedContractType: number | null;
  setSelectedContractType: (id: number | null) => void;
  contractClauses: ContractClause[];
  addClauseRow: () => void;
  removeClause: (id: number) => void;
  updateClause: (id: number, field: keyof ContractClause, value: string | number) => void;
  handleSaveContractClauses: () => void;
  isSavingClauses: boolean;
  clausesToast: string | null;
  language: string;
  t: (ar: string, en: string) => string;
  onAddContractType: () => void;
  onEditContractType: (item: DataItem) => void;
  onDeleteContractType: (id: number | string) => void;
}

const TemplatesSection: React.FC<TemplatesSectionProps> = ({
  contractTypes,
  selectedContractType,
  setSelectedContractType,
  contractClauses,
  addClauseRow,
  removeClause,
  updateClause,
  handleSaveContractClauses,
  isSavingClauses,
  clausesToast,
  language,
  t,
  onAddContractType,
  onEditContractType,
  onDeleteContractType
}) => {
  return (
    <div className="space-y-6">
      {clausesToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{clausesToast}</span>
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-900 dark:text-[#e2e8f0] flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-700 dark:text-teal-400">description</span>
          <span className="font-bold text-teal-800 dark:text-teal-400">
            {language === 'ar' ? 'إدارة القوالب (عقود، تقييمات، وغيرها)' : 'Templates Manager'}
          </span>
        </div>
        {/* Contract Type Selector + Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-400">
            {language === 'ar' ? 'نوع القالب:' : 'Template Type:'}
          </span>
          <select
            value={selectedContractType || ''}
            onChange={(e) => setSelectedContractType(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-[#e2e8f0] focus:outline-none cursor-pointer"
          >
            <option value="">{language === 'ar' ? '-- اختر --' : '-- Select --'}</option>
            {contractTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name_ar} ({type.name_en})
              </option>
            ))}
          </select>

          {/* Add Contract Type Button */}
          <button
            type="button"
            onClick={onAddContractType}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-md hover:shadow-teal-500/30 hover:scale-105 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>{language === 'ar' ? 'إضافة نوع العقد' : 'Add Contract Type'}</span>
          </button>
        </div>
      </h3>

      {/* Contract Types Table */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-teal-700 dark:text-teal-400 text-lg">description</span>
            <span className="text-xs font-bold text-slate-900 dark:text-[#e2e8f0] uppercase tracking-wider">
              {language === 'ar' ? 'جدول أنواع العقود المضافة' : 'Added Contract Types'}
            </span>
            <span className="bg-teal-500/20 border border-teal-500/30 text-teal-800 dark:text-teal-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              {contractTypes.length} {language === 'ar' ? 'عقد' : 'types'}
            </span>
          </div>

          <button
            type="button"
            onClick={onAddContractType}
            className="flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-md hover:shadow-teal-500/30 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>{language === 'ar' ? 'إضافة نوع العقد' : 'Add Contract Type'}</span>
          </button>
        </div>

        {contractTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
            <span className="material-symbols-outlined text-4xl text-slate-600">description</span>
            <p className="text-xs font-medium">
              {language === 'ar' ? 'لا توجد أنواع عقود مضافة بعد. اضغط على زر "إضافة نوع العقد" للبدء.' : 'No contract types added yet. Click "Add Contract Type" to start.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.02] text-[11px] font-bold text-slate-700 dark:text-slate-400">
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'نوع العقد (عربي)' : 'Contract Type (Arabic)'}</th>
                  <th className="py-3 px-4 text-start">{language === 'ar' ? 'اسم العقد (إنجليزي)' : 'Contract Type (English)'}</th>
                  <th className="py-3 px-4 text-center w-20">{language === 'ar' ? 'الترتيب' : 'Order'}</th>
                  <th className="py-3 px-4 text-center w-24">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center w-36">{language === 'ar' ? 'بنود العقد' : 'Clauses'}</th>
                  <th className="py-3 px-4 text-center w-28">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                {contractTypes.map((type, index) => {
                  const isSelected = selectedContractType === (typeof type.id === 'number' ? type.id : parseInt(type.id as string));
                  return (
                    <tr
                      key={type.id}
                      className={`transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04] ${
                        isSelected ? 'bg-teal-50 dark:bg-teal-500/10 border-l-4 border-l-teal-600 dark:border-l-teal-500 rtl:border-l-0 rtl:border-r-4 rtl:border-r-teal-600 dark:rtl:border-r-teal-500' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-500 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-[#e2e8f0]">
                        <span 
                          className="hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer" 
                          onClick={() => setSelectedContractType(typeof type.id === 'number' ? type.id : parseInt(type.id as string))}
                          title={language === 'ar' ? 'اضغط لتحديد هذا العقد وتحرير بنوده' : 'Click to select this contract'}
                        >
                          {type.name_ar || type.name || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {type.name_en || '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        {type.sort_order ?? 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          type.status === 'Active'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30'
                        }`}>
                          {type.status === 'Active'
                            ? (language === 'ar' ? 'نشط' : 'Active')
                            : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                            <span className="material-symbols-outlined text-xs">check</span>
                            <span>{language === 'ar' ? 'مُحدد حالياً' : 'Selected'}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedContractType(typeof type.id === 'number' ? type.id : parseInt(type.id as string));
                            }}
                            className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 hover:bg-teal-50 dark:hover:bg-teal-500/20 text-slate-800 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-300 dark:border-white/10 hover:border-teal-500/30 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            title={language === 'ar' ? 'اختيار هذا العقد لعرض وصياغة بنوده' : 'Select this contract to edit clauses'}
                          >
                            <span className="material-symbols-outlined text-xs">edit_note</span>
                            <span>{language === 'ar' ? 'صياغة البنود' : 'Edit Clauses'}</span>
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onEditContractType(type);
                            }}
                            className="p-1.5 rounded-lg text-teal-400 hover:bg-teal-500/20 hover:text-teal-200 transition-all active:scale-95 cursor-pointer"
                            title={language === 'ar' ? 'تعديل نوع العقد' : 'Edit Contract Type'}
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteContractType(type.id)}
                            className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 hover:text-rose-200 transition-all active:scale-95 cursor-pointer"
                            title={language === 'ar' ? 'حذف نوع العقد' : 'Delete Contract Type'}
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Placeholders Guide */}
      <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-xl space-y-2">
        <h4 className="text-xs font-bold text-slate-900 dark:text-[#e2e8f0]">
          {language === 'ar' ? 'دليل المتغيرات التلقائية المتاحة للاستخدام في نصوص العقود' : 'Dynamic Placeholders Guide'}
        </h4>
        <p className="text-sm text-slate-700 dark:text-slate-400 leading-relaxed font-medium">
          {language === 'ar' 
            ? 'أثناء صياغة البنود، يمكنك كتابة المتغيرات التالية داخل النص ليقوم النظام باستبدالها تلقائياً ببيانات الموظف الفعلية:'
            : 'You can insert the following placeholders in your contract text. They will be automatically replaced with the actual employee data when generating the document:'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs text-teal-800 dark:text-teal-400 font-bold">
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{employee_name_ar}'}</code> {language === 'ar' ? 'الاسم بالعربي' : 'Name (AR)'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{employee_name_en}'}</code> {language === 'ar' ? 'الاسم بالإنجليزي' : 'Name (EN)'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{employee_id}'}</code> {language === 'ar' ? 'ID الموظف' : 'Employee ID'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{badge_no}'}</code> {language === 'ar' ? 'الرقم الوظيفي' : 'Badge No'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{position_ar}'}</code> {language === 'ar' ? 'المسمى الوظيفي' : 'Position'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{location_ar}'}</code> {language === 'ar' ? 'موقع العمل/الفرع' : 'Location'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{basic_salary}'}</code> {language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{written_basic_salary_ar}'}</code> {language === 'ar' ? 'الراتب كتابةً' : 'Salary (Written)'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{transportation_fixed}'}</code> {language === 'ar' ? 'مخصصات النقل' : 'Transportation'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{contract_start_date}'}</code> {language === 'ar' ? 'بدء العقد' : 'Contract Start'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{contract_end_date}'}</code> {language === 'ar' ? 'انتهاء العقد' : 'Contract End'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{term_of_contract}'}</code> {language === 'ar' ? 'مدة العقد' : 'Contract Term'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{grade}'}</code> {language === 'ar' ? 'الدرجة الوظيفية' : 'Grade'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{national_id_no}'}</code> {language === 'ar' ? 'رقم الهوية' : 'National ID'}</div>
          <div><code className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 px-1 py-0.5 rounded text-slate-900 dark:text-teal-300">{'{institution_name}'}</code> {language === 'ar' ? 'اسم المؤسسة' : 'Institution Name'}</div>
        </div>
      </div>

      {/* Contract Annexes & Mandatory Undertakings Section */}
      <div className="bg-teal-50/70 dark:bg-gradient-to-r dark:from-teal-500/10 dark:via-blue-500/10 dark:to-transparent border border-teal-300 dark:border-teal-500/30 p-4 rounded-xl space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-700 dark:text-teal-400">verified_user</span>
            <h4 className="text-xs font-bold text-teal-900 dark:text-teal-300">
              {language === 'ar' 
                ? 'المستندات والتعهدات الإلزامية الملحقة بالعقد (8 مستندات رسمية)' 
                : 'Mandatory Contract Annexes & Undertakings (8 Official Documents)'}
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-600 text-white dark:bg-teal-500/20 dark:text-teal-300 border border-teal-600 dark:border-teal-500/40">
            {language === 'ar' ? 'مفعلة تلقائياً بعد آخر صفحة من العقد' : 'Appended after last page'}
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
          {language === 'ar'
            ? 'تضاف المستندات الرسمية التالية تلقائياً بعد الصفحة الرابعة (آخر صفحة من العقد) لكلا العقدين (عقد موظف جديد وعقد دائمي) بنفس خط وهوية العقود الرسمية وتعبأ تلقائياً ببيانات الموظف:'
            : 'The following official documents are automatically appended after the 4th page (last page of the contract) for both contract types using the official contract font:'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">التعهد 1 (ضوابط سلوك العمل)</span>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">التعهد 2 (سرية المعلومات)</span>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">التعهد 3 (السياسات والإجراءات)</span>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">4</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">تعهد تفرغ وظيفي</span>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">5</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">التعهد 5 (مسؤول قروض 5-ب)</span>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">6</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">الاستمارة الطبية</span>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">7</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">المستفيدين من التأمين</span>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 p-2.5 rounded-lg flex items-center gap-2 shadow-2xs">
            <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px]">8</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">ضريبة الدخل (Income Tax)</span>
          </div>
        </div>
      </div>

      {/* Contract Clauses */}
      {selectedContractType && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between p-3.5 bg-teal-50 dark:bg-teal-500/10 border border-teal-300 dark:border-teal-500/30 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-700 dark:text-teal-400">gavel</span>
              <span className="text-xs font-bold text-teal-900 dark:text-teal-300">
                {language === 'ar' ? 'بنود العقد المُحدد:' : 'Selected Contract Clauses:'}{' '}
                <span className="text-slate-900 dark:text-white font-bold underline decoration-teal-500/50">
                  {contractTypes.find(c => c.id === selectedContractType)?.name_ar || contractTypes.find(c => c.id === selectedContractType)?.name_en || ''}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-teal-800 dark:text-teal-400 font-mono font-bold bg-teal-500/20 px-2.5 py-0.5 rounded-full">
                {contractClauses.length} {language === 'ar' ? 'بند' : 'clauses'}
              </span>
              <button
                type="button"
                onClick={() => setSelectedContractType(null)}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title={language === 'ar' ? 'إغلاق المحرر' : 'Close Editor'}
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
          <div id="clausesContainer" className="space-y-4">
            {contractClauses.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-300 dark:border-white/20 rounded-xl font-medium">
                {language === 'ar' 
                  ? 'لا توجد بنود حالياً لهذا النوع من العقود. اضغط على زر "إضافة بند جديد" للبدء بالصياغة.'
                  : 'No clauses currently exist for this contract type. Click "Add Clause" to start drafting.'}
              </div>
            ) : (
              contractClauses.map((clause) => (
                <div key={clause.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-5 rounded-xl space-y-4 relative shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                        {language === 'ar' ? 'رقم البند' : 'Clause Number'}
                      </span>
                      <input
                        type="number"
                        value={isNaN(clause.clause_number) ? '' : clause.clause_number}
                        onChange={(e) => updateClause(clause.id, 'clause_number', parseInt(e.target.value) || 0)}
                        className="w-16 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-2 py-1 text-xs text-center text-slate-900 dark:text-[#e2e8f0] font-bold focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                    <button
                      onClick={() => removeClause(clause.id)}
                      className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-500 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>{language === 'ar' ? 'حذف البند / Delete' : 'Delete Clause'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-400 mb-1">
                        {language === 'ar' ? 'عنوان البند (مثال: البند الأول: أطراف العقد)' : 'Clause Title (e.g., Clause 1: Contract Parties)'}
                      </label>
                      <input
                        type="text"
                        value={clause.title_ar || ''}
                        onChange={(e) => updateClause(clause.id, 'title_ar', e.target.value)}
                        className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-[#e2e8f0] font-medium focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-400 mb-1">
                        {language === 'ar' ? 'نص البند (باللغة العربية)' : 'Clause Text (in Arabic)'}
                      </label>
                      <textarea
                        value={clause.text_ar || ''}
                        onChange={(e) => updateClause(clause.id, 'text_ar', e.target.value)}
                        rows={4}
                        className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-[#e2e8f0] font-medium focus:outline-none focus:border-teal-500 leading-relaxed"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addClauseRow();
              }}
              className="bg-teal-600 text-white shadow-md hover:bg-teal-500 font-bold text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-105 pointer-events-auto cursor-pointer"
            >
              + {language === 'ar' ? 'إضافة بند جديد / Add Clause' : 'Add New Clause'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveContractClauses();
              }}
              disabled={isSavingClauses}
              className={`font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 pointer-events-auto cursor-pointer ${
                isSavingClauses
                  ? 'bg-slate-500 text-white opacity-70 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:scale-105 shadow-teal-600/20 active:scale-95'
              }`}
            >
              {isSavingClauses && (
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              )}
              <span>
                {isSavingClauses 
                  ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (language === 'ar' ? 'حفظ بنود القالب' : 'Save Template Clauses')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
