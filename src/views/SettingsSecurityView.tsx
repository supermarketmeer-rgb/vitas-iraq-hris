import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../api/client';
import * as XLSX from 'xlsx';

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
  const { language, t, theme, setEmployees, refreshEmployees, employees, resetToZeroData } = useApp();
  const [activeTab, setActiveTab] = useState<string>('locations');

  const handleClearAllData = async () => {
    const confirmMsg = language === 'ar'
      ? 'هل أنت متأكد من مسح جميع بيانات النظام بالكامل؟\nسوف يتم مسح كافة الموظفين، الإجازات، المستندات، الطلبات، والإعدادات بشكل نهائي باستثناء بيانات دخول السوبر آدمن (Super Admin).'
      : 'Are you sure you want to clear all system data?\nAll employees, leaves, documents, requests, and settings will be permanently deleted EXCEPT Super Admin login credentials.';

    if (window.confirm(confirmMsg)) {
      try {
        await resetToZeroData();
        await loadData();
        alert(language === 'ar' 
          ? 'تم مسح جميع بيانات النظام بنجاح مع الإبقاء على حساب بيانات السوبر آدمن.' 
          : 'All system data has been cleared successfully while preserving Super Admin credentials.');
      } catch (error: any) {
        console.error('Error clearing system data:', error);
        alert(language === 'ar' 
          ? `حدث خطأ أثناء مسح البيانات: ${error?.message || 'تأكد من تشغيل خادم النظام node server.js'}` 
          : `Error clearing data: ${error?.message || 'Ensure node server.js is running'}`);
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

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);
  const [formData, setFormData] = useState({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' });
  
  // Excel import/export states
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: TabConfig[] = [
    { id: 'locations', icon: 'location_city', labelAr: 'الفروع', labelEn: 'Locations' },
    { id: 'positions', icon: 'work', labelAr: 'المسميات', labelEn: 'Positions' },
    { id: 'departments', icon: 'business', labelAr: 'الأقسام', labelEn: 'Departments' },
    { id: 'contract-types', icon: 'description', labelAr: 'أنواع القوالب', labelEn: 'Template Types' },
    { id: 'employees', icon: 'badge', labelAr: 'الموظفين', labelEn: 'Employees' },
    { id: 'status-changes', icon: 'published_with_changes', labelAr: 'تغيير الحالة', labelEn: 'Status Change' },
    { id: 'trainings', icon: 'school', labelAr: 'التدريبات', labelEn: 'Trainings' },
    { id: 'allowances', icon: 'settings_suggest', labelAr: 'السياسات', labelEn: 'Policies' },
    { id: 'templates', icon: 'edit_document', labelAr: 'القوالب', labelEn: 'Templates' },
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
      const loadClauses = async () => {
        try {
          const clauses: any = await api.getContractClauses(selectedContractType.toString());
          // Ensure all clauses have proper structure and valid numbers
          const normalizedClauses = Array.isArray(clauses) ? clauses.map((clause: any) => ({
            id: clause.id || Date.now(),
            contract_type_id: clause.contract_type_id || selectedContractType,
            clause_number: parseInt(clause.clause_number) || 0,
            title_ar: clause.title_ar || '',
            text_ar: clause.text_ar || ''
          })) : [];
          setContractClauses(normalizedClauses);
        } catch (error) {
          console.error('Error loading contract clauses:', error);
          setContractClauses([]); // Set empty array on error
        }
      };
      loadClauses();
    } else {
      setContractClauses([]); // Clear clauses when no contract type is selected
    }
  }, [selectedContractType]);

  const getCurrentData = (): DataItem[] => {
    switch (activeTab) {
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
    switch (activeTab) {
      case 'locations': setLocations(data); break;
      case 'positions': setPositions(data); break;
      case 'departments': setDepartments(data); break;
      case 'contract-types': setContractTypes(data); break;
      case 'status-changes': setStatusChanges(data); break;
      case 'trainings': setTrainings(data); break;
    }
  };

  const handleAdd = async () => {
    if (!formData.name_en || (activeTab === 'locations' && !formData.name_ar)) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      let result;
      switch (activeTab) {
        case 'locations':
          // Map name_ar to name for server compatibility
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

    if (!formData.name_en || (activeTab === 'locations' && !formData.name_ar)) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      switch (activeTab) {
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
    }
  };

  const handleDelete = async (id: number | string) => {
    const confirmMessage = language === 'ar' 
      ? 'هل أنت متأكد من حذف هذا العنصر؟' 
      : 'Are you sure you want to delete this item?';
    
    if (window.confirm(confirmMessage)) {
      try {
        switch (activeTab) {
          case 'locations':
            await api.deleteBranch(id.toString());
            break;
          case 'positions':
            await api.deletePosition(id.toString());
            break;
          case 'departments':
            await api.deleteDepartment(id.toString());
            break;
          case 'contract-types':
            await api.deleteContractType(id.toString());
            break;
          case 'status-changes':
            await api.deleteStatusChange(id.toString());
            break;
          case 'trainings':
            await api.deleteTraining(id.toString());
            break;
        }

        // Reload data from API after deleting
        await loadData();
      } catch (error) {
        console.error('Error deleting item:', error);
      }
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
    if (selectedContractType) {
      try {
        // Delete existing clauses for this contract type (matching PHP logic)
        await api.deleteContractClauses(selectedContractType.toString());
        
        // Add new clauses only if they have content (matching PHP logic)
        let addedCount = 0;
        for (const clause of contractClauses) {
          if (clause.title_ar.trim() !== '' || clause.text_ar.trim() !== '') {
            await api.addContractClause({
              contract_type_id: selectedContractType,
              clause_number: clause.clause_number,
              title_ar: clause.title_ar.trim(),
              text_ar: clause.text_ar.trim()
            });
            addedCount++;
          }
        }
        
        // Show success message in both languages (matching PHP message)
        const successMessage = language === 'ar' 
          ? `تم حفظ قالب العقد بنجاح (${addedCount} بنود)` 
          : `Contract template updated successfully (${addedCount} clauses)`;
        alert(successMessage);
        
        // Reload clauses to get the saved data with proper IDs
        const clauses = await api.getContractClauses(selectedContractType.toString());
        setContractClauses(clauses);
      } catch (error) {
        console.error('Error saving contract clauses:', error);
        const errorMessage = language === 'ar' 
          ? 'حدث خطأ في حفظ قالب العقد' 
          : 'Error saving contract template';
        alert(errorMessage);
      }
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

  // Excel Template Generation
  const generateExcelTemplate = (tabId: string) => {
    try {
      console.log('Generating Excel template for:', tabId);
      
      const templateData = [
        {
          'Name (English)': '',
          'الاسم (العربية)': '',
          'Sort Order': 1
        },
        {
          'Name (English)': '',
          'الاسم (العربية)': '',
          'Sort Order': 2
        },
        {
          'Name (English)': '',
          'الاسم (العربية)': '',
          'Sort Order': 3
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      
      // Set sheet name based on tab
      const sheetNames: Record<string, string> = {
        'locations': 'Locations Template',
        'positions': 'Positions Template',
        'departments': 'Departments Template',
        'contract-types': 'Contract Types Template',
        'status-changes': 'Status Changes Template',
        'trainings': 'Trainings Template'
      };
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetNames[tabId] || 'Template');
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 30 }, // Name (English)
        { wch: 30 }, // الاسم (العربية)
        { wch: 10 }  // Sort Order
      ];

      // Set filename based on tab
      const filenames: Record<string, string> = {
        'locations': 'locations_template.xlsx',
        'positions': 'positions_template.xlsx',
        'departments': 'departments_template.xlsx',
        'contract-types': 'contract_types_template.xlsx',
        'status-changes': 'status_changes_template.xlsx',
        'trainings': 'trainings_template.xlsx'
      };
      
      XLSX.writeFile(workbook, filenames[tabId] || 'template.xlsx');
      console.log('Excel template generated successfully');
    } catch (error) {
      console.error('Error generating Excel template:', error);
      alert(language === 'ar' 
        ? 'حدث خطأ في إنشاء قالب Excel' 
        : 'Error generating Excel template');
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
          'تاريخ الميلاد': sanitizeCellText(emp.dob || ''),
          'البريد الإلكتروني المؤسسي': sanitizeCellText(emp.email || ''),
          'البريد الإلكتروني الشخصي': sanitizeCellText(emp.personalEmail || emp.personal_email || ''),
          'رقم الهاتف': sanitizeCellText(emp.phone || emp.mobile || ''),
          'هاتف الطوارئ': sanitizeCellText(emp.emergencyPhone || emp.emergency_mobile || emp.emergency_phone || ''),
          'الجنس': emp.gender === 'female' || emp.gender === 'أنثى' ? 'أنثى' : 'ذكر',
          'الحالة الاجتماعية': sanitizeCellText(emp.maritalStatus || emp.marital_status || ''),
          'الجنسية': sanitizeCellText(emp.nationality || 'عراقي'),
          'تاريخ المباشرة': sanitizeCellText(emp.originalStartDate || emp.original_start_date || emp.contract_original_start || emp.joinDate || ''),
          'تاريخ بداية العقد': sanitizeCellText(emp.contractStartDate || emp.contract_start_date || ''),
          'تاريخ نهاية العقد': sanitizeCellText(emp.contractEndDate || emp.contract_end_date || ''),
          'نهاية فترة التجربة': sanitizeCellText(emp.probationEndDate || emp.probation_end_date || ''),
          'تاريخ المغادرة': sanitizeCellText(emp.exitDate || emp.exit_date || ''),
          'نوع العقد': sanitizeCellText(emp.termOfContract || emp.term_of_contract || ''),
          'الدرجة الوظيفية': sanitizeCellText(emp.grade || ''),
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
          'اسم الطفل 3': sanitizeCellText(kids[3]?.name || ''),
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

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();

      if (exportData.length > 0) {
        const keys = Object.keys(exportData[0]);
        worksheet['!cols'] = keys.map(k => ({ wch: Math.max(k.length + 4, 16) }));
        worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: keys.length - 1, r: exportData.length } }) };
        worksheet['!views'] = [{ RTL: true, showGridLines: true }];
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, 'بيانات الموظفين');
      XLSX.writeFile(workbook, `vitas_iraq_employees_${new Date().toISOString().split('T')[0]}.xlsx`);
      console.log('Employees exported successfully');
    } catch (error) {
      console.error('Error exporting employees:', error);
      alert(language === 'ar' 
        ? `حدث خطأ أثناء تصدير ملف الموظفين: ${(error as any)?.message || error}` 
        : `Error exporting employees file: ${(error as any)?.message || error}`);
    }
  };

  // Employee Excel Template Generation
  const generateEmployeeExcelTemplate = () => {
    try {
      console.log('Generating Formatted Employee Excel template...');
      
      const templateData = [
        {
          'الاسم الكامل (عربي)': 'مثال: مصطفى الحسيني',
          'الاسم الكامل (إنجليزي)': 'Mustafa Al-Husseini',
          'رمز الموظف': 'VTS-1001',
          'رقم البادج': 'V131',
          'البريد الإلكتروني المؤسسي': 'mustafa@vitasiraq.com',
          'البريد الإلكتروني الشخصي': 'mustafa.personal@gmail.com',
          'رقم الهاتف': '07700000000',
          'هاتف الطوارئ': '07800000000',
          'تاريخ الميلاد': '1990-01-01',
          'الجنس': 'ذكر',
          'الحالة الاجتماعية': 'متأهل',
          'الجنسية': 'عراقي',
          'رابط الصورة': 'https://example.com/photo1.jpg',
          'تاريخ المباشرة': '2020-01-01',
          'تاريخ بداية العقد': '2024-01-01',
          'تاريخ نهاية العقد': '2025-01-01',
          'نهاية فترة التجربة': '2024-04-01',
          'تاريخ المغادرة': '',
          'نوع العقد': 'عقد محدد المدة (سنة واحدة)',
          'الدرجة الوظيفية': 'G-4 الدرجة الرابعة',
          'المسمى الوظيفي (عربي)': 'مسؤول ائتمان أول',
          'المسمى الوظيفي (إنجليزي)': 'Senior Credit Officer',
          'القسم / الإدارة (عربي)': 'قسم العمليات والائتمان',
          'القسم / الإدارة (إنجليزي)': 'Operations & Credit Department',
          'الفرع (عربي)': 'فرع بغداد - الكرادة',
          'الفرع (إنجليزي)': 'Baghdad Branch - Karrada',
          'اسم المشرف المباشر': 'أحمد جاسم المحمداوي',
          'نطاق العمل': 'ميداني ومكتبي',
          'الراتب الاسمي': 1200000,
          'الراتب الاسمي كتابة': 'مليون ومائتا ألف دينار عراقي',
          'بدل النقل الثابت': 150000,
          'المكافأة الثابتة': 100000,
          'بدل الهاتف': 50000,
          'بدل الشهادة': 100000,
          'بدل الزوجة': 50000,
          'بدل الطفل الواحد': 25000,
          'إجمالي الراتب الكلي': 1800000,
          'اسم المصرف': 'مصرف بغداد',
          'رقم IBAN': 'IQ98 BAKI 0000 1234 5678 9012',
          'البطاقة الوطنية': '199012345678',
          'رقم جواز السفر': 'A12345678',
          'تاريخ نفاذ الجواز': '2030-01-01',
          'اسم الزوج/الزوجة': 'فاطمة علي',
          'الزوج يعمل بالشركة': 'لا',
          'اسم الطفل 1': 'علي مصطفى',
          'صلة الطفل 1 (ولد/بنت)': 'ولد',
          'تاريخ ميلاد الطفل 1': '2015-05-12',
          'اسم الطفل 2': 'زهراء مصطفى',
          'صلة الطفل 2 (ولد/بنت)': 'بنت',
          'تاريخ ميلاد الطفل 2': '2017-08-20',
          'اسم الطفل 3': 'حسين مصطفى',
          'صلة الطفل 3 (ولد/بنت)': 'ولد',
          'تاريخ ميلاد الطفل 3': '2019-11-03',
          'اسم الطفل 4': 'مريم مصطفى',
          'صلة الطفل 4 (ولد/بنت)': 'بنت',
          'تاريخ ميلاد الطفل 4': '2021-02-15',
          'اسم الطفل 5': 'محمد مصطفى',
          'صلة الطفل 5 (ولد/بنت)': 'ولد',
          'تاريخ ميلاد الطفل 5': '2022-09-10',
          'اسم الطفل 6': 'زينب مصطفى',
          'صلة الطفل 6 (ولد/بنت)': 'بنت',
          'تاريخ ميلاد الطفل 6': '2024-01-01',
          'الحالة': 'Active'
        },
        {
          'الاسم الكامل (عربي)': 'مثال: زينب فاضل عباس',
          'الاسم الكامل (إنجليزي)': 'Zainab Fadhil Abbas',
          'رمز الموظف': 'VTS-1002',
          'رقم البادج': 'V132',
          'البريد الإلكتروني المؤسسي': 'zainab@vitasiraq.com',
          'البريد الإلكتروني الشخصي': 'zainab.personal@gmail.com',
          'رقم الهاتف': '07711111111',
          'هاتف الطوارئ': '07811111111',
          'تاريخ الميلاد': '1993-04-15',
          'الجنس': 'أنثى',
          'الحالة الاجتماعية': 'متأهل',
          'الجنسية': 'عراقي',
          'رابط الصورة': '',
          'تاريخ المباشرة': '2021-03-15',
          'تاريخ بداية العقد': '2024-03-15',
          'تاريخ نهاية العقد': '2025-03-15',
          'نهاية فترة التجربة': '2024-06-15',
          'تاريخ المغادرة': '',
          'نوع العقد': 'عقد غير محدد المدة (دائم)',
          'الدرجة الوظيفية': 'G-3 الدرجة الثالثة',
          'المسمى الوظيفي (عربي)': 'محاسب رئيسي',
          'المسمى الوظيفي (إنجليزي)': 'Senior Accountant',
          'القسم / الإدارة (عربي)': 'القسم المالي والحسابات',
          'القسم / الإدارة (إنجليزي)': 'Finance & Accounting Department',
          'الفرع (عربي)': 'الفرع الرئيسي - بغداد',
          'الفرع (إنجليزي)': 'Head Office - Baghdad',
          'اسم المشرف المباشر': 'حسن كمال الدين',
          'نطاق العمل': 'مكتبي',
          'الراتب الاسمي': 1500000,
          'الراتب الاسمي كتابة': 'مليون وخمسمائة ألف دينار عراقي',
          'بدل النقل الثابت': 150000,
          'المكافأة الثابتة': 120000,
          'بدل الهاتف': 50000,
          'بدل الشهادة': 150000,
          'بدل الزوجة': 0,
          'بدل الطفل الواحد': 25000,
          'إجمالي الراتب الكلي': 2020000,
          'اسم المصرف': 'المصرف العراقي للتجارة TBI',
          'رقم IBAN': 'IQ98 TRIQ 0000 9876 5432 1098',
          'البطاقة الوطنية': '199398765432',
          'رقم جواز السفر': 'A87654321',
          'تاريخ نفاذ الجواز': '2031-05-20',
          'اسم الزوج/الزوجة': 'عمر خالد',
          'الزوج يعمل بالشركة': 'نعم',
          'اسم الطفل 1': 'أحمد عمر',
          'صلة الطفل 1 (ولد/بنت)': 'ولد',
          'تاريخ ميلاد الطفل 1': '2018-03-10',
          'اسم الطفل 2': 'سارة عمر',
          'صلة الطفل 2 (ولد/بنت)': 'بنت',
          'تاريخ ميلاد الطفل 2': '2020-07-14',
          'اسم الطفل 3': '',
          'صلة الطفل 3 (ولد/بنت)': '',
          'تاريخ ميلاد الطفل 3': '',
          'اسم الطفل 4': '',
          'صلة الطفل 4 (ولد/بنت)': '',
          'تاريخ ميلاد الطفل 4': '',
          'اسم الطفل 5': '',
          'صلة الطفل 5 (ولد/بنت)': '',
          'تاريخ ميلاد الطفل 5': '',
          'اسم الطفل 6': '',
          'صلة الطفل 6 (ولد/بنت)': '',
          'تاريخ ميلاد الطفل 6': '',
          'الحالة': 'Active'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();

      // Configure Column Widths for formatted table view
      const keys = Object.keys(templateData[0]);
      worksheet['!cols'] = keys.map(k => ({
        wch: Math.max(k.length + 4, 16)
      }));

      // Add Auto-Filter range for Excel Table formatting
      worksheet['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { c: 0, r: 0 },
          e: { c: keys.length - 1, r: templateData.length }
        })
      };

      // Set sheet display view: RTL & show grid lines
      worksheet['!views'] = [{ RTL: true, showGridLines: true }];

      XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب الموظفين الشامل');

      XLSX.writeFile(workbook, 'employees_template.xlsx');
      console.log('Employee Excel template generated successfully with formatted table settings.');
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

  // Employee Excel Import Handler
  const handleEmployeeExcelImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file triggers onChange
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        let rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Only search rawGrid for header row if rawRows is empty or contains empty rows
        const hasValidObjects = rawRows && rawRows.length > 0 && rawRows.some(r => r && typeof r === 'object' && Object.values(r).some(v => v !== null && v !== undefined && String(v).trim() !== ''));
        
        if (!hasValidObjects) {
          const rawGrid = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          if (rawGrid.length > 0) {
            const headerKeywords = ['الاسم', 'name', 'موظف', 'code', 'رمز', 'بادج', 'القسم', 'department', 'title', 'عنوان', 'رقم'];
            const headerIndex = rawGrid.findIndex(row => 
              Array.isArray(row) && row.some(cell => 
                cell && headerKeywords.some(kw => normalizeHeaderKey(cell).includes(normalizeHeaderKey(kw)))
              )
            );

            if (headerIndex >= 0 && headerIndex < rawGrid.length - 1) {
              const headers = rawGrid[headerIndex].map(h => String(h || '').trim());
              const dataRows = rawGrid.slice(headerIndex + 1);
              rawRows = dataRows.map(rowArr => {
                const obj: any = {};
                if (Array.isArray(rowArr)) {
                  headers.forEach((h, colIdx) => {
                    if (h && rowArr[colIdx] !== undefined) obj[h] = rowArr[colIdx];
                  });
                }
                return obj;
              });
            }
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
          return '';
        };

        // Helper to convert Excel dates cleanly to YYYY-MM-DD
        const parseExcelDate = (val: any): string => {
          if (val === undefined || val === null || String(val).trim() === '') return '';
          if (val instanceof Date) {
            if (isNaN(val.getTime())) return '';
            const year = val.getFullYear();
            const month = String(val.getMonth() + 1).padStart(2, '0');
            const day = String(val.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          const str = String(val).trim();
          const num = Number(str);
          if (!isNaN(num) && num > 20000 && num < 80000) {
            const utc_days = Math.floor(num - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            const year = date_info.getUTCFullYear();
            const month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date_info.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          if (str.includes('/') || str.includes('-')) {
            const parts = str.split(/[/-]/);
            if (parts.length === 3) {
              let y = parseInt(parts[0], 10);
              let m = parseInt(parts[1], 10);
              let d = parseInt(parts[2], 10);
              if (parts[0].length === 1 || parts[0].length === 2) {
                if (parseInt(parts[2], 10) > 1900) {
                  y = parseInt(parts[2], 10);
                  m = parseInt(parts[1], 10);
                  d = parseInt(parts[0], 10);
                }
              }
              if (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
                return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              }
            }
          }
          const dateObj = new Date(str);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          return str;
        };

        const calcAge = (dobStr: string) => {
          const cleanDob = parseExcelDate(dobStr);
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

        const importedEmployees: any[] = [];
        const errorsList: string[] = [];
        let currentLocations = [...locations];
        let currentDepartments = [...departments];
        let currentPositions = [...positions];

        for (const row of rawRows) {
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
              const childDob = parseExcelDate(rawChildDob);
              
              const isValidName = childName && typeof childName === 'string' && childName.trim() !== '' && !childName.startsWith('طفل ') && childName !== 'الطفل';
              const isValidDob = childDob && typeof childDob === 'string' && childDob.trim() !== '' && childDob !== 'N/A';
              
              if (isValidName || isValidDob) {
                childrenList.push({
                  id: Date.now().toString() + i + Math.random().toString().slice(2, 6),
                  name: isValidName ? childName.trim() : `طفل ${i}`,
                  dob: isValidDob ? childDob : '',
                  relation: (childRelation === 'بنت' || childRelation === 'Daughter' || childRelation === 'female') ? 'بنت' : 'ولد',
                  age: calcAge(childDob)
                });
              }
            }

            const fullNameVal = getVal(row, [
              'Full Name (Arabic)', 'fullName', 'full_name', 'full_name_ar', 'الاسم الكامل (عربي)', 'الاسم الكامل(عربي)', 
              'الاسم الكامل', 'اسم الموظف', 'الاسم العربي', 'الاسم', 'الاسم الثلاثي', 'اسم الموظف الثلاثي', 
              'اسم الموظف الكامل', 'Full Name', 'Name', 'Employee Name', 'Emp Name', 'Staff Name', 'اسم الموظف الرباعي', 
              'الموظف', 'اسم الشخص', 'اسم الموارد', 'اسم الموظف واللقب', 'الاسم واللقب', 'الموظفين', 'الموظف/ة'
            ]);

            let fullName = fullNameVal;
            if (!fullName && row && typeof row === 'object') {
              const rowKeys = Object.keys(row);
              for (const rk of rowKeys) {
                const cleanK = normalizeHeaderKey(rk);
                if (cleanK.includes('اسم') || cleanK.includes('name') || cleanK.includes('موظف') || cleanK.includes('كامل') || cleanK.includes('ثلاثي')) {
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

            if (!fullName) continue;

            const fullNameEn = getVal(row, ['Full Name (English)', 'fullNameEn', 'full_name_en', 'الاسم الكامل (إنجليزي)', 'الاسم الكامل (انجليزي)', 'الاسم الانكليزي', 'الاسم الإنجليزي', 'English Name', 'Full Name English']) || fullName;
            let empCode = getVal(row, ['Employee Code', 'empCode', 'employeeId', 'employee_id', 'رمز الموظف', 'كود الموظف', 'رقم الموظف', 'الرمز الوظيفي', 'Code', 'ID', 'ت', 'م', 'الرقم', 'رقم']);
            if (!empCode) {
              empCode = `VTS-${1000 + importedEmployees.length + 1}`;
            }
            const badgeNo = getVal(row, ['Badge Number', 'badgeNo', 'badge_no', 'رقم البادج', 'البادج', 'رقم الهوية', 'Badge']);
            const dob = parseExcelDate(getVal(row, ['Date of Birth', 'dob', 'تاريخ الميلاد', 'تاريخ ولادة', 'DOB', 'Birth Date']));
            const email = getVal(row, ['Email', 'email', 'البريد الإلكتروني المؤسسي', 'البريد الإلكتروني', 'البريد الالكتروني', 'الإيميل', 'الايميل', 'البريد المؤسسي']);
            const personalEmail = getVal(row, ['Personal Email', 'personalEmail', 'personal_email', 'البريد الإلكتروني الشخصي', 'البريد الشخصي', 'الايميل الشخصي']);
            const phone = getVal(row, ['Phone', 'phone', 'mobile', 'Mobile', 'الهاتف', 'رقم الهاتف', 'الموبايل', 'رقم الجوال', 'الجوال']);
            const emergencyPhone = getVal(row, ['Emergency Phone', 'emergencyPhone', 'emergency_phone', 'هاتف الطوارئ', 'رقم الطوارئ']);
            const gender = getVal(row, ['Gender', 'gender', 'الجنس', 'النوع']) || 'ذكر';
            const maritalStatus = getVal(row, ['Marital Status', 'maritalStatus', 'marital_status', 'الحالة الاجتماعية', 'الحالة الزوجية']) || 'أعزب';
            const nationality = getVal(row, ['Nationality', 'nationality', 'الجنسية']) || 'عراقي';

            const contractStartDate = parseExcelDate(getVal(row, ['Contract Start Date', 'contractStartDate', 'contract_start_date', 'تاريخ بداية العقد', 'تاريخ بدء العقد', 'تاريخ بداية العقد الحالي', 'بداية العقد']));
            const contractEndDate = parseExcelDate(getVal(row, ['Contract End Date', 'contractEndDate', 'contract_end_date', 'تاريخ نهاية العقد', 'تاريخ انتهاء العقد', 'نهاية العقد']));
            const originalStartDate = parseExcelDate(getVal(row, ['Original Start Date', 'originalStartDate', 'original_start_date', 'joinDate', 'تاريخ المباشرة', 'تاريخ المباشرة الأولى', 'تاريخ المباشره', 'تاريخ التعيين']));
            const probationEndDate = parseExcelDate(getVal(row, ['Probation End Date', 'probationEndDate', 'probation_end_date', 'نهاية فترة التجربة', 'تاريخ انتهاء فترة التجربة', 'فترة التجربة']));
            const exitDate = parseExcelDate(getVal(row, ['Exit Date', 'exitDate', 'exit_date', 'تاريخ المغادرة', 'تاريخ إنهاء الخدمة', 'تاريخ الاستقالة']));
            const termOfContract = getVal(row, ['Term of Contract', 'termOfContract', 'term_of_contract', 'نوع العقد', 'نوع مدة العقد', 'مدة العقد']) || 'عقد محدد المدة (سنة واحدة)';
            const grade = getVal(row, ['Grade', 'grade', 'الدرجة الوظيفية', 'الدرجة', 'الدرجة السلمية', 'المستوى']) || 'G-4 الدرجة الرابعة';

            const jobTitle = getVal(row, ['Job Title (Arabic)', 'jobTitle', 'job_title', 'position', 'position_ar', 'المسمى الوظيفي (عربي)', 'العنوان الوظيفي (عربي)', 'المسمى الوظيفي عربي', 'المسمى الوظيفي', 'العنوان الوظيفي', 'الوظيفة']);
            const jobTitleEn = getVal(row, ['Job Title (English)', 'jobTitleEn', 'job_title_en', 'position_en', 'المسمى الوظيفي (إنجليزي)', 'المسمى الوظيفي (انجليزي)', 'العنوان الوظيفي (إنجليزي)', 'العنوان الوظيفي (انجليزي)', 'المسمى الوظيفي إنجليزي', 'Job Title English']) || jobTitle;
            const department = getVal(row, ['Department (Arabic)', 'department', 'department_ar', 'القسم / الإدارة (عربي)', 'القسم/الإدارة (عربي)', 'القسم (عربي)', 'القسم / الإدارة', 'القسم', 'الإدارة']);
            const departmentEn = getVal(row, ['Department (English)', 'departmentEn', 'department_en', 'القسم / الإدارة (إنجليزي)', 'القسم / الإدارة (انجليزي)', 'القسم/الإدارة (إنجليزي)', 'القسم (إنجليزي)', 'Department English']) || department;
            const branch = getVal(row, ['Branch (Arabic)', 'branch', 'branch_ar', 'location', 'location_ar', 'الفرع (عربي)', 'الموقع (عربي)', 'الفرع العربي', 'الفرع', 'الموقع', 'مكان العمل']);
            const branchEn = getVal(row, ['Branch (English)', 'branchEn', 'branch_en', 'location_en', 'الفرع (إنجليزي)', 'الفرع (انجليزي)', 'الموقع (إنجليزي)', 'الفرع الإنجليزي', 'Branch English']) || branch;
            const supervisorName = getVal(row, ['Supervisor Name', 'supervisorName', 'supervisor_name', 'اسم المشرف المباشر', 'اسم المشرف', 'المشرف', 'المدير المباشر']);
            const workScope = getVal(row, ['Work Scope', 'workScope', 'نطاق العمل']) || 'ميداني ومكتبي';

            const basicSalary = Number(getVal(row, ['Basic Salary', 'basicSalary', 'basic_salary', 'الراتب الاسمي', 'الراتب الأساسي', 'الراتب'])) || 1200000;
            const writtenBasicSalaryAr = getVal(row, ['Written Basic Salary (Arabic)', 'writtenBasicSalaryAr', 'الراتب الاسمي كتابة']) || 'مليون ومائتا ألف دينار عراقي';
            const transportationFixed = Number(getVal(row, ['Transportation Fixed', 'transportationFixed', 'بدل النقل الثابت', 'بدل النقل'])) || 150000;
            const fixedBonus = Number(getVal(row, ['Fixed Bonus', 'fixedBonus', 'المكافأة الثابتة', 'مكافأة ثابتة'])) || 100000;
            const phoneAllowance = Number(getVal(row, ['Phone Allowance', 'phoneAllowance', 'بدل الهاتف', 'مخصصات الهاتف'])) || 50000;
            const certificateAllowance = Number(getVal(row, ['Certificate Allowance', 'certificateAllowance', 'بدل الشهادة', 'مخصصات الشهادة'])) || 100000;
            const bankName = getVal(row, ['Bank Name', 'bankName', 'bank_name', 'اسم المصرف', 'المصرف', 'البنك']) || 'مصرف بغداد';
            const iban = getVal(row, ['IBAN', 'iban', 'رقم IBAN', 'رقم الحساب', 'الآيبان', 'حساب المصرف']) || 'IQ98 BAKI 0000 1234 5678 9012';

            const nationalId = getVal(row, ['National ID', 'nationalId', 'national_id', 'البطاقة الوطنية', 'الرقم الوطني', 'رقم الهوية الوطنية']);
            const passportNo = getVal(row, ['Passport Number', 'passportNo', 'passport_no', 'رقم جواز السفر', 'رقم الجواز', 'جواز السفر']);
            const passportExpiry = parseExcelDate(getVal(row, ['Passport Expiry', 'passportExpiry', 'تاريخ نفاذ الجواز']));
            const photoUrl = getVal(row, ['Photo URL', 'photoUrl', 'رابط الصورة']);

            const spouseName = getVal(row, ['Spouse Name', 'spouseName', 'اسم الزوج/الزوجة']);
            const spouseEmployedHere = getVal(row, ['Spouse Employed Here', 'spouseEmployedHere', 'الزوج يعمل بالشركة']) === 'true' || getVal(row, ['Spouse Employed Here', 'spouseEmployedHere', 'الزوج يعمل بالشركة']) === 'نعم';

            const status = getVal(row, ['Status', 'status', 'الحالة', 'حالة الموظف']) || 'Active';

            // Auto-add Branch / Location to Settings if missing
            if (branch && !currentLocations.some(l => l.name_ar === branch || l.name === branch || (branchEn && l.name_en === branchEn))) {
              try {
                const addedLoc: any = await api.addBranch({
                  name: branch,
                  name_ar: branch,
                  name_en: branchEn || branch,
                  status: 'Active'
                });
                currentLocations.push(addedLoc || { id: Date.now(), name_ar: branch, name: branch, name_en: branchEn || branch });
              } catch (e) {
                console.warn('Could not auto-add branch to settings:', e);
              }
            }

            // Auto-add Department to Settings if missing
            if (department && !currentDepartments.some(d => d.name_ar === department || d.name === department || (departmentEn && d.name_en === departmentEn))) {
              try {
                const addedDept: any = await api.addDepartment({
                  name_ar: department,
                  name_en: departmentEn || department,
                  sort_order: currentDepartments.length + 1,
                  status: 'Active'
                });
                currentDepartments.push(addedDept || { id: Date.now(), name_ar: department, name_en: departmentEn || department });
              } catch (e) {
                console.warn('Could not auto-add department to settings:', e);
              }
            }

            // Auto-add Position / Job Title to Settings if missing
            if (jobTitle && !currentPositions.some(p => p.name_ar === jobTitle || p.name === jobTitle || (jobTitleEn && p.name_en === jobTitleEn))) {
              try {
                const addedPos: any = await api.addPosition({
                  name_ar: jobTitle,
                  name_en: jobTitleEn || jobTitle,
                  sort_order: currentPositions.length + 1,
                  status: 'Active'
                });
                currentPositions.push(addedPos || { id: Date.now(), name_ar: jobTitle, name_en: jobTitleEn || jobTitle });
              } catch (e) {
                console.warn('Could not auto-add position to settings:', e);
              }
            }

            const employeeData = {
              fullName,
              fullNameEn,
              empCode,
              badgeNo,
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
              basicSalary,
              writtenBasicSalaryAr,
              transportationFixed,
              fixedBonus,
              phoneAllowance,
              certificateAllowance,
              bankName,
              iban,
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

            const result = await api.addEmployee(employeeData);
            importedEmployees.push(result);
          } catch (error: any) {
            console.error('Error importing employee row:', error);
            errorsList.push(error?.message || String(error));
          }
        }

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

        if (importedEmployees.length > 0) {
          alert(language === 'ar' 
            ? `تم استيراد ${importedEmployees.length} موظف بنجاح وإعادة تحديث دليل الموظفين والإعدادات` 
            : `Successfully imported ${importedEmployees.length} employees and updated directory & settings`);
        } else {
          const detail = errorsList.length > 0 ? `\n\nالتفاصيل: ${errorsList.slice(0, 3).join(', ')}` : '';
          alert(language === 'ar' 
            ? `لم يتم استيراد أي موظف. يرجى التأكد من اختيار ملف يحتوي على بيانات الموظفين وعناوين الأعمدة الصحيحة.${detail}`
            : `No employees imported. Please ensure the file contains valid employee rows and correct headers.${detail}`);
        }
      } catch (error: any) {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold mb-1 ${
            theme === 'dark' ? 'text-[#e2e8f0]' : 'text-gray-800'
          }`}>
            {t('الإعدادات والأمان', 'Settings & Security')}
          </h1>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-slate-400' : 'text-gray-500'
          }`}>
            {t('إدارة تفضيلات النظام والأمان', 'Manage system preferences and security')}
          </p>
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
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${language === 'ar' ? 'text-sm' : 'text-xs'} font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? theme === 'dark'
                  ? 'bg-teal-500/20 border-teal-500/30 text-teal-400'
                  : 'bg-teal-100 border-teal-300 text-teal-700'
                : tab.id === 'maintenance'
                ? theme === 'dark'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-rose-100 border-rose-300 text-rose-700 hover:bg-rose-200'
                : theme === 'dark'
                  ? 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-[#e2e8f0]'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-800'
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
            data={locations}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            language={language}
            showExcelButtons={false}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'positions' && (
          <DataTable
            title={t('المسميات الوظيفية', 'Positions')}
            icon="work"
            data={positions}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            language={language}
            showExcelButtons={false}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'departments' && (
          <DataTable
            title={t('الأقسام', 'Departments')}
            icon="business"
            data={departments}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            language={language}
            showExcelButtons={false}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'contract-types' && (
          <DataTable
            title={t('أنواع العقود', 'Contract Types')}
            icon="description"
            data={contractTypes}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            language={language}
            showExcelButtons={true}
            onGenerateTemplate={() => generateExcelTemplate('contract-types')}
            onImportExcel={(e) => handleExcelImport(e, 'contract-types')}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'status-changes' && (
          <DataTable
            title={t('تغييرات الحالة', 'Status Changes')}
            icon="published_with_changes"
            data={statusChanges}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            language={language}
            showExcelButtons={true}
            onGenerateTemplate={() => generateExcelTemplate('status-changes')}
            onImportExcel={(e) => handleExcelImport(e, 'status-changes')}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'trainings' && (
          <DataTable
            title={t('البرامج التدريبية', 'Training Programs')}
            icon="school"
            data={trainings}
            onAdd={() => { setShowAddModal(true); setFormData({ name_en: '', name_ar: '', sort_order: 0, address: '', city: '', phone: '', email: '', status: 'Active' }); }}
            onEdit={openEditModal}
            onDelete={handleDelete}
            language={language}
            showExcelButtons={true}
            onGenerateTemplate={() => generateExcelTemplate('trainings')}
            onImportExcel={(e) => handleExcelImport(e, 'trainings')}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'allowances' && (
          <PoliciesSection
            appSettings={appSettings}
            onSettingChange={handleSettingChange}
            onSaveAll={handleSaveAllSettings}
            language={language}
            t={t}
            isSaving={isSavingSettings}
          />
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
            language={language}
            t={t}
          />
        )}
        {activeTab === 'employees' && (
          <DataTable
            title={t('إدارة الموظفين', 'Employee Management')}
            icon="badge"
            data={[]}
            onAdd={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            language={language}
            showExcelButtons={true}
            showOnlyTemplateAndImport={true}
            onGenerateTemplate={generateEmployeeExcelTemplate}
            onExportExcel={handleEmployeeExcelExport}
            onImportExcel={handleEmployeeExcelImport}
            fileInputRef={fileInputRef}
            activeTab={activeTab}
          />
        )}
        {activeTab === 'maintenance' && (
          <div className="text-center py-12 bg-rose-500/5 rounded-2xl border border-rose-500/20 max-w-2xl mx-auto p-8 my-4">
            <span className="material-symbols-outlined text-6xl text-rose-500 mb-4 animate-pulse">warning</span>
            <h3 className="text-2xl font-bold text-rose-400 mb-2">
              {t('منطقة الخطر - تفريغ كافة البيانات', 'Danger Zone - Clear All System Data')}
            </h3>
            <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto leading-relaxed">
              {t(
                'سيتم مسح جميع بيانات التطبيق في كافة الأقسام (الموظفين، الإجازات، المستندات، الطلبات، الإعدادات) بشكل نهائي، مع الإبقاء الحصري على بيانات الدخول للسوبر آدمن (Super Admin).',
                'This will permanently delete all application data across all modules (employees, leaves, documents, requests, settings) EXCEPT the Super Admin login credentials.'
              )}
            </p>
            <button 
              onClick={handleClearAllData}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-rose-600/30 flex items-center gap-2 mx-auto"
            >
              <span className="material-symbols-outlined text-xl">delete_forever</span>
              {t('مسح البيانات بالكامل', 'Clear All Data')}
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <Modal
          title={t('إضافة عنصر جديد', 'Add New Item')}
          onClose={() => setShowAddModal(false)}
          onSave={handleAdd}
          formData={formData}
          setFormData={setFormData}
          language={language}
          activeTab={activeTab}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Modal
          title={t('تعديل العنصر', 'Edit Item')}
          onClose={() => { setShowEditModal(false); setEditingItem(null); }}
          onSave={handleEdit}
          formData={formData}
          setFormData={setFormData}
          language={language}
          activeTab={activeTab}
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
  activeTab = ''
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
              ? 'bg-teal-500/10 text-teal-400' 
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
                className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-600 transition-all pointer-events-auto cursor-pointer"
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
          {!showOnlyTemplateAndImport && (
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
            className={`flex justify-between items-center border p-3 rounded-xl transition-colors ${
              theme === 'dark' 
                ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div>
              <p className={`text-sm font-bold ${theme === 'dark' ? 'text-[#e2e8f0]' : 'text-gray-800'}`}>{item.name_en}</p>
              <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>{item.name_ar || item.name}</p>
              {activeTab === 'locations' && (
                <>
                  {item.city && <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>{item.city}</p>}
                  {item.phone && <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>{item.phone}</p>}
                  {item.email && <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-gray-500'}`}>{item.email}</p>}
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${item.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {item.status === 'Active' ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(item);
                }}
                className={`transition-colors pointer-events-auto cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-teal-400' : 'text-gray-500 hover:text-teal-600'}`}
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className={`transition-colors pointer-events-auto cursor-pointer ${theme === 'dark' ? 'text-slate-400 hover:text-rose-400' : 'text-gray-500 hover:text-rose-600'}`}
              >
                <span className="material-symbols-outlined text-sm">delete</span>
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
            </>
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

// Policies Section Component
interface PoliciesSectionProps {
  appSettings: Record<string, string>;
  onSettingChange: (key: string, value: string) => void;
  onSaveAll: () => void;
  language: string;
  t: (ar: string, en: string) => string;
  isSaving?: boolean;
}

const PoliciesSection: React.FC<PoliciesSectionProps> = ({ appSettings, onSettingChange, onSaveAll, language, t, isSaving }) => {
  console.log('PoliciesSection received appSettings:', appSettings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#e2e8f0] flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400">settings_suggest</span>
          {t('السياسات والبدلات', 'Policies & Allowances')}
        </h3>
        <button
          onClick={onSaveAll}
          disabled={isSaving}
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-teal-600/25 transition-all flex items-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              {t('جاري الحفظ...', 'Saving...')}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">save</span>
              {t('حفظ جميع الإعدادات', 'Save All Settings')}
            </>
          )}
        </button>
      </div>

      {/* Show loading or empty state */}
      {Object.keys(appSettings).length === 0 && (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-slate-500 mb-2">settings</span>
          <p className="text-slate-400">
            {language === 'ar' ? 'لا توجد إعدادات متاحة' : 'No settings available'}
          </p>
        </div>
      )}

      {/* Wife and Child Allowances */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">family_restroom</span>
          {t('مخصصات الزوجة والطفل', 'Wife and Child Allowances')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('مخصص الزوجية (بدل الزوجة)', 'Spouse Allowance (Wife Allowance)')}
            </label>
            <input
              type="number"
              step="0.01"
              value={appSettings.marriage_allowance_default || ''}
              onChange={(e) => onSettingChange('marriage_allowance_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('مخصص الطفل (لكل طفل دون 18)', 'Child Allowance (per child < 18)')}
            </label>
            <input
              type="number"
              step="0.01"
              value={appSettings.child_allowance_default || ''}
              onChange={(e) => onSettingChange('child_allowance_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('بدل السكن للمتزوجين', 'Housing Allowance for Married')}
            </label>
            <input
              type="number"
              step="0.01"
              value={appSettings.housing_allowance_default || ''}
              onChange={(e) => onSettingChange('housing_allowance_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Statutory Deductions, Tax & Insurance Policies */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400 text-sm">payments</span>
          {t('سياسات الضمان الاجتماعي والضريبة والتأمين', 'Social Security, Income Tax & Insurance Policies')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('نسبة اقتطاع الضمان الاجتماعي (حصة الموظف %)', 'Social Security Rate (Employee %)')}
            </label>
            <input
              type="number"
              step="0.1"
              placeholder="5"
              value={appSettings.social_security_rate_default || '5'}
              onChange={(e) => onSettingChange('social_security_rate_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('بدل اقتطاع التأمين الصحي والحياة (د.ع)', 'Health & Life Insurance Deduction (IQD)')}
            </label>
            <input
              type="number"
              step="1000"
              placeholder="25000"
              value={appSettings.insurance_deduction_default || '25000'}
              onChange={(e) => onSettingChange('insurance_deduction_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-rose-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('نسبة/طريقة ضريبة الدخل (قانوني / %)', 'Income Tax Method / Rate (%)')}
            </label>
            <input
              type="text"
              placeholder="تلقائي (حسب الشرائح القانونية)"
              value={appSettings.income_tax_rate_default || ''}
              onChange={(e) => onSettingChange('income_tax_rate_default', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-rose-500"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              {t('اتركه فارغاً للاعتماد التلقائي على الشرائح الضريبية الرسمية (3% - 15%)', 'Leave blank to use official legal progressive tax brackets (3% - 15%)')}
            </span>
          </div>
        </div>
      </div>

      {/* Leave Policy */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">event_available</span>
          {t('سياسة الإجازات (بالأيام)', 'Leave Policy (Days)')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('رصيد الإجازة الاعتيادية', 'Annual Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.annual_leave_balance || ''}
              onChange={(e) => onSettingChange('annual_leave_balance', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('رصيد الإجازة المرضية الأقصى', 'Sick Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.max_sick_leave || ''}
              onChange={(e) => onSettingChange('max_sick_leave', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('رصيد إجازة الأمومة', 'Maternity Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.maternity_leave_limit || ''}
              onChange={(e) => onSettingChange('maternity_leave_limit', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('رصيد الإجازات الطارئة', 'Emergency Leave Limit')}
            </label>
            <input
              type="number"
              value={appSettings.emergency_leave_limit || ''}
              onChange={(e) => onSettingChange('emergency_leave_limit', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Tax/Deductions */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">account_balance</span>
          {t('الضريبة والخصومات (نسبة مئوية)', 'Tax & Deductions (%)')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('حصة المؤسسة في الضريبة (%)', 'Company Tax Share (%)')}
            </label>
            <input
              type="number"
              step="0.01"
              value={appSettings.social_security_company_share || ''}
              onChange={(e) => onSettingChange('social_security_company_share', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {t('حصة الموظف في الضريبة (%)', 'Employee Tax Share (%)')}
            </label>
            <input
              type="number"
              step="0.01"
              value={appSettings.social_security_employee_share || ''}
              onChange={(e) => onSettingChange('social_security_employee_share', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Work Hours */}
      <div className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4">
        <h4 className="text-xs font-bold text-[#e2e8f0] uppercase flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-sm">schedule</span>
          {t('سياسة الدوام', 'Work Policy')}
        </h4>
        
        {/* Weekend Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              {t('أيام العطلة الأسبوعية (Weekend)', 'Weekend Days')}
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'sunday', labelAr: 'الأحد', labelEn: 'Sunday' },
                { key: 'monday', labelAr: 'الاثنين', labelEn: 'Monday' },
                { key: 'tuesday', labelAr: 'الثلاثاء', labelEn: 'Tuesday' },
                { key: 'wednesday', labelAr: 'الأربعاء', labelEn: 'Wednesday' },
                { key: 'thursday', labelAr: 'الخميس', labelEn: 'Thursday' },
                { key: 'friday', labelAr: 'الجمعة', labelEn: 'Friday' },
                { key: 'saturday', labelAr: 'السبت', labelEn: 'Saturday' }
              ].map(day => (
                <label key={day.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={appSettings[`weekend_${day.key}`] === 'true'}
                    onChange={(e) => onSettingChange(`weekend_${day.key}`, e.target.checked ? 'true' : 'false')}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500"
                  />
                  <span className="text-xs text-slate-300">
                    {language === 'ar' ? day.labelAr : day.labelEn}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Official Work Hours */}
        <div className="mt-4">
          <h5 className="text-xs font-bold text-slate-300 mb-3">
            {t('ساعات الدوام الرسمية', 'Official Work Hours')}
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t('وقت بداية الدوام الرسمي', 'Official Work Start Time')}
              </label>
              <input
                type="time"
                value={appSettings.official_work_hours_start || '08:00'}
                onChange={(e) => onSettingChange('official_work_hours_start', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t('وقت نهاية الدوام الرسمي', 'Official Work End Time')}
              </label>
              <input
                type="time"
                value={appSettings.official_work_hours_end || '16:00'}
                onChange={(e) => onSettingChange('official_work_hours_end', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h5 className="text-xs font-bold text-slate-300 mb-3">
            {t('ساعات الدوام يوم الخميس', 'Thursday Work Hours')}
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t('وقت بداية الدوام يوم الخميس', 'Thursday Work Start Time')}
              </label>
              <input
                type="time"
                value={appSettings.thursday_work_hours_start || '08:00'}
                onChange={(e) => onSettingChange('thursday_work_hours_start', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                {t('وقت نهاية الدوام يوم الخميس', 'Thursday Work End Time')}
              </label>
              <input
                type="time"
                value={appSettings.thursday_work_hours_end || '14:00'}
                onChange={(e) => onSettingChange('thursday_work_hours_end', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>
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
  language: string;
  t: (ar: string, en: string) => string;
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
  language,
  t
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-[#e2e8f0] flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400">description</span>
          <span className="font-bold text-teal-400">
            {language === 'ar' ? 'إدارة القوالب (عقود، تقييمات، وغيرها)' : 'Templates Manager'}
          </span>
        </div>
        {/* Contract Type Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {language === 'ar' ? 'نوع القالب:' : 'Template Type:'}
          </span>
          <select
            value={selectedContractType || ''}
            onChange={(e) => setSelectedContractType(e.target.value ? parseInt(e.target.value) : null)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#e2e8f0] focus:outline-none cursor-pointer"
          >
            <option value="">{language === 'ar' ? '-- اختر --' : '-- Select --'}</option>
            {contractTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name_ar} ({type.name_en})
              </option>
            ))}
          </select>
        </div>
      </h3>

      {/* Dynamic Placeholders Guide */}
      <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
        <h4 className="text-xs font-bold text-[#e2e8f0]">
          {language === 'ar' ? 'دليل المتغيرات التلقائية المتاحة للاستخدام في نصوص العقود' : 'Dynamic Placeholders Guide'}
        </h4>
        <p className="text-sm text-slate-400 leading-relaxed">
          {language === 'ar' 
            ? 'أثناء صياغة البنود، يمكنك كتابة المتغيرات التالية داخل النص ليقوم النظام باستبدالها تلقائياً ببيانات الموظف الفعلية:'
            : 'You can insert the following placeholders in your contract text. They will be automatically replaced with the actual employee data when generating the document:'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-xs text-teal-400">
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{employee_name_ar}'}</code> {language === 'ar' ? 'الاسم بالعربي' : 'Name (AR)'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{employee_name_en}'}</code> {language === 'ar' ? 'الاسم بالإنجليزي' : 'Name (EN)'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{employee_id}'}</code> {language === 'ar' ? 'ID الموظف' : 'Employee ID'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{badge_no}'}</code> {language === 'ar' ? 'الرقم الوظيفي' : 'Badge No'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{position_ar}'}</code> {language === 'ar' ? 'المسمى الوظيفي' : 'Position'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{location_ar}'}</code> {language === 'ar' ? 'موقع العمل/الفرع' : 'Location'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{basic_salary}'}</code> {language === 'ar' ? 'الراتب الأساسي' : 'Basic Salary'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{written_basic_salary_ar}'}</code> {language === 'ar' ? 'الراتب كتابةً' : 'Salary (Written)'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{transportation_fixed}'}</code> {language === 'ar' ? 'مخصصات النقل' : 'Transportation'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{contract_start_date}'}</code> {language === 'ar' ? 'بدء العقد' : 'Contract Start'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{contract_end_date}'}</code> {language === 'ar' ? 'انتهاء العقد' : 'Contract End'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{term_of_contract}'}</code> {language === 'ar' ? 'مدة العقد' : 'Contract Term'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{grade}'}</code> {language === 'ar' ? 'الدرجة الوظيفية' : 'Grade'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{national_id_no}'}</code> {language === 'ar' ? 'رقم الهوية' : 'National ID'}</div>
          <div><code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded">{'{institution_name}'}</code> {language === 'ar' ? 'اسم المؤسسة' : 'Institution Name'}</div>
        </div>
      </div>

      {/* Contract Clauses */}
      {selectedContractType && (
        <div className="space-y-4">
          <div id="clausesContainer" className="space-y-4">
            {contractClauses.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6 border border-dashed border-white/20 rounded-xl">
                {language === 'ar' 
                  ? 'لا توجد بنود حالياً لهذا النوع من العقود. اضغط على زر "إضافة بند جديد" للبدء بالصياغة.'
                  : 'No clauses currently exist for this contract type. Click "Add Clause" to start drafting.'}
              </div>
            ) : (
              contractClauses.map((clause) => (
                <div key={clause.id} className="bg-white/5 border border-white/10 p-5 rounded-xl space-y-4 relative">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-teal-400">
                        {language === 'ar' ? 'رقم البند' : 'Clause Number'}
                      </span>
                      <input
                        type="number"
                        value={isNaN(clause.clause_number) ? '' : clause.clause_number}
                        onChange={(e) => updateClause(clause.id, 'clause_number', parseInt(e.target.value) || 0)}
                        className="w-16 bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-center text-[#e2e8f0] focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                    <button
                      onClick={() => removeClause(clause.id)}
                      className="text-rose-400 hover:text-rose-500 text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      <span>{language === 'ar' ? 'حذف البند / Delete' : 'Delete Clause'}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {language === 'ar' ? 'عنوان البند (مثال: البند الأول: أطراف العقد)' : 'Clause Title (e.g., Clause 1: Contract Parties)'}
                      </label>
                      <input
                        type="text"
                        value={clause.title_ar || ''}
                        onChange={(e) => updateClause(clause.id, 'title_ar', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {language === 'ar' ? 'نص البند (باللغة العربية)' : 'Clause Text (in Arabic)'}
                      </label>
                      <textarea
                        value={clause.text_ar || ''}
                        onChange={(e) => updateClause(clause.id, 'text_ar', e.target.value)}
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-teal-500"
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
              className="bg-teal-600/10 hover:bg-teal-600/20 border border-teal-600/30 text-teal-400 font-bold text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-105 pointer-events-auto cursor-pointer"
            >
              + {language === 'ar' ? 'إضافة بند جديد / Add Clause' : 'Add New Clause'}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSaveContractClauses();
              }}
              className="bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:scale-105 transition-transform shadow-md shadow-teal-600/20 pointer-events-auto cursor-pointer"
            >
              {language === 'ar' ? 'حفظ القالب والبنود / Save Template Clauses' : 'Save Template Clauses'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
