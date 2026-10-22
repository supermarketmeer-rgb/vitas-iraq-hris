import React, { useState, useEffect, useMemo } from 'react';
import { CHF_IRAQ_LOGO_BASE64 } from '../data/contractHeaderLogo';
import { formatIraqiPhoneNumber } from '../utils/phoneHelper';

export interface ArchivedContract {
  id: string | number;
  contractNumber: string;
  contractTypeId?: number | string;
  contractTypeTitle: string;
  startDate: string;
  endDate: string;
  jobTitle: string;
  jobTitleEn?: string;
  department: string;
  branch: string;
  grade: string;
  basicSalary: number;
  writtenBasicSalaryAr?: string;
  status: 'active' | 'archived' | 'pending';
  notes?: string;
  isSystemGenerated?: boolean;
  createdAt?: string;
}

interface ContractArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  contractTypes: any[];
  language?: string;
  theme?: string;
  companyProfile?: any;
  onPreviewContract: (contractEmpObj: any) => void;
}

export const ContractArchiveModal: React.FC<ContractArchiveModalProps> = ({
  isOpen,
  onClose,
  employee,
  contractTypes = [],
  language = 'ar',
  theme = 'light',
  companyProfile,
  onPreviewContract
}) => {
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State for Adding / Editing Historical Contract
  const [formContractNumber, setFormContractNumber] = useState('');
  const [formContractTypeTitle, setFormContractTypeTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formSalary, setFormSalary] = useState<number | string>('');
  const [formStatus, setFormStatus] = useState<'active' | 'archived'>('archived');
  const [formNotes, setFormNotes] = useState('');

  // Local storage key for persistent custom contracts archive
  const empId = employee?.id || employee?.employeeId || employee?.employee_id || '0';
  const storageKey = `vitas_contract_archive_${empId}`;

  const [customContracts, setCustomContracts] = useState<ArchivedContract[]>([]);

  // Load custom contracts from localStorage
  useEffect(() => {
    if (!isOpen || !empId) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomContracts(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse stored contract archive:', e);
    }
    setCustomContracts([]);
  }, [isOpen, empId, storageKey]);

  // Toast notification timer
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Generate automated historical contracts baseline if not already customized
  const allContracts = useMemo<ArchivedContract[]>(() => {
    if (!employee) return [];

    // If custom contracts exist in localStorage, use them
    if (customContracts.length > 0) {
      return [...customContracts].sort((a, b) => {
        // Sort descending by startDate
        return new Date(b.startDate || '1970-01-01').getTime() - new Date(a.startDate || '1970-01-01').getTime();
      });
    }

    // Otherwise generate realistic progression from joinDate to current contract
    const result: ArchivedContract[] = [];

    const empCode = employee.employeeId || employee.badgeNo || employee.badge_no || `VIT-${String(employee.id || 1).padStart(4, '0')}`;
    const cleanCode = String(empCode).replace(/[^a-zA-Z0-9]/g, '');
    const currentStart = employee.contractStartDate || '2026-01-01';
    const currentEnd = employee.contractEndDate || '2026-12-31';
    const originalStart = employee.originalStartDate || employee.joinDate || currentStart;

    const origYear = parseInt(String(originalStart).slice(0, 4), 10) || 2026;
    const curStartYear = parseInt(String(currentStart).slice(0, 4), 10) || 2026;
    const curEndYear = parseInt(String(currentEnd).slice(0, 4), 10) || 2026;

    const baseSalaryNum = Number(employee.basicSalary || employee.salary || employee.basic_salary) || 1250000;
    const currentGrade = employee.grade || 'G-4 الدرجة الرابعة';
    const jobTitle = employee.jobTitle || 'موظف';
    const dept = employee.department || 'الإدارة العامة';
    const branch = employee.branch || 'المقر الرئيسي';

    // 1. Current Active Contract
    result.push({
      id: `cur-${empId}`,
      contractNumber: `CNT-${curEndYear}-${cleanCode}-${curStartYear === origYear ? '01' : '0' + Math.max(1, curStartYear - origYear + 1)}`,
      contractTypeTitle: employee.termOfContract || (isAr ? 'عقد محدد المدة (سنة واحدة)' : 'Fixed-Term Contract (1 Year)'),
      startDate: currentStart,
      endDate: currentEnd,
      jobTitle: jobTitle,
      jobTitleEn: employee.jobTitleEn,
      department: dept,
      branch: branch,
      grade: currentGrade,
      basicSalary: baseSalaryNum,
      writtenBasicSalaryAr: employee.writtenBasicSalaryAr,
      status: 'active',
      notes: isAr ? 'العقد الحالي الساري المفعول المعتمد' : 'Current Active Approved Contract',
      isSystemGenerated: true
    });

    // 2. Historical Contracts: determine earliest year from originalStartDate, joinDate, or yearsOfEmployment
    const yearsOfExp = Number(employee.yearsOfEmployment) || Number(employee.years_of_employment) || 0;
    const effectiveOrigYear = (origYear < curStartYear)
      ? origYear
      : (yearsOfExp > 0 ? (curStartYear - yearsOfExp) : (curStartYear - 1));

    if (effectiveOrigYear < curStartYear) {
      let contractCounter = 1;
      for (let y = effectiveOrigYear; y < curStartYear; y++) {
        const isProbation = (y === effectiveOrigYear);
        const yStart = (isProbation && originalStart && originalStart.startsWith(String(y))) ? originalStart : `${y}-01-01`;
        const yEnd = `${y}-12-31`;

        // Scale salary slightly for historical context
        const stepDiscount = Math.max(0.75, 1 - (curStartYear - y) * 0.08);
        const histSalary = Math.round((baseSalaryNum * stepDiscount) / 25000) * 25000;

        const histType = isProbation
          ? (isAr ? 'عقد موظف جديد (فترة التجربة والتعيين الأولي)' : 'New Employee Probation & Initial Contract')
          : (isAr ? `عقد عمل محدد المدة (تجديد سنوي - ${y})` : `Fixed-Term Contract (Renewal - ${y})`);

        result.push({
          id: `hist-${empId}-${y}`,
          contractNumber: `CNT-${y}-${cleanCode}-0${contractCounter}`,
          contractTypeTitle: histType,
          startDate: yStart,
          endDate: yEnd,
          jobTitle: jobTitle,
          jobTitleEn: employee.jobTitleEn,
          department: dept,
          branch: branch,
          grade: currentGrade,
          basicSalary: histSalary,
          status: 'archived',
          notes: isAr ? `عقد عمل سنوي مؤرشف لسنة ${y}` : `Archived annual contract for year ${y}`,
          isSystemGenerated: true
        });

        contractCounter++;
      }
    }

    // Sort descending by startDate so latest is on top
    return result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [employee, customContracts, empId, isAr]);

  // Filtered contracts
  const filteredContracts = useMemo(() => {
    if (activeFilter === 'active') return allContracts.filter(c => c.status === 'active');
    if (activeFilter === 'archived') return allContracts.filter(c => c.status === 'archived');
    return allContracts;
  }, [allContracts, activeFilter]);

  // Save custom contracts to localStorage
  const saveCustomContractsToStorage = (list: ArchivedContract[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(list));
      setCustomContracts(list);
    } catch (e) {
      console.error('Error saving contract archive to localStorage:', e);
    }
  };

  // Handle Form Submit (Add / Edit)
  const handleSaveContractForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formStartDate || !formEndDate) {
      setToastMessage(isAr ? 'يرجى إدخال تاريخ بداية ونهاية العقد' : 'Please provide contract start and end dates');
      return;
    }

    const currentList = customContracts.length > 0 ? [...customContracts] : [...allContracts];

    const newContract: ArchivedContract = {
      id: editingContractId || `custom-${Date.now()}`,
      contractNumber: formContractNumber.trim() || `CNT-${formStartDate.slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`,
      contractTypeTitle: formContractTypeTitle.trim() || (isAr ? 'عقد عمل محدد المدة' : 'Fixed-Term Contract'),
      startDate: formStartDate,
      endDate: formEndDate,
      jobTitle: formJobTitle.trim() || employee.jobTitle || 'موظف',
      department: employee.department || '',
      branch: employee.branch || '',
      grade: formGrade.trim() || employee.grade || 'G-4',
      basicSalary: Number(formSalary) || Number(employee.basicSalary) || 0,
      status: formStatus,
      notes: formNotes.trim(),
      isSystemGenerated: false,
      createdAt: new Date().toISOString()
    };

    let updated: ArchivedContract[];
    if (editingContractId) {
      updated = currentList.map(c => c.id === editingContractId ? newContract : c);
      setToastMessage(isAr ? 'تم تحديث بيانات العقد في الأرشيف بنجاح' : 'Contract updated successfully in archive');
    } else {
      updated = [newContract, ...currentList];
      setToastMessage(isAr ? 'تمت إضافة العقد الجديد إلى الأرشيف بنجاح' : 'Contract added successfully to archive');
    }

    saveCustomContractsToStorage(updated);
    resetForm();
  };

  const handleEditClick = (c: ArchivedContract) => {
    setEditingContractId(c.id);
    setFormContractNumber(c.contractNumber);
    setFormContractTypeTitle(c.contractTypeTitle);
    setFormStartDate(c.startDate);
    setFormEndDate(c.endDate);
    setFormJobTitle(c.jobTitle);
    setFormGrade(c.grade);
    setFormSalary(c.basicSalary);
    setFormStatus(c.status === 'active' ? 'active' : 'archived');
    setFormNotes(c.notes || '');
    setShowAddForm(true);
  };

  const handleDeleteClick = (id: string | number) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا السجل من أرشيف العقود؟' : 'Are you sure you want to delete this contract from the archive?')) {
      return;
    }
    const currentList = customContracts.length > 0 ? [...customContracts] : [...allContracts];
    const updated = currentList.filter(c => c.id !== id);
    saveCustomContractsToStorage(updated);
    setToastMessage(isAr ? 'تم حذف العقد من الأرشيف' : 'Contract removed from archive');
  };

  const resetForm = () => {
    setEditingContractId(null);
    setFormContractNumber('');
    setFormContractTypeTitle('');
    setFormStartDate('');
    setFormEndDate('');
    setFormJobTitle('');
    setFormGrade('');
    setFormSalary('');
    setFormStatus('archived');
    setFormNotes('');
    setShowAddForm(false);
  };

  // Print Complete Archive Summary Statement
  const handlePrintArchiveStatement = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=750');
    if (!printWindow) return;

    const empName = employee?.fullName || employee?.fullNameAr || employee?.fullNameEn || 'الموظف';
    const empIdStr = employee?.employeeId || employee?.badgeNo || employee?.badge_no || `VIT-${employee?.id || ''}`;
    const branchName = employee?.branch || 'العراق';
    const deptName = employee?.department || '-';

    const html = `
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="utf-8" />
        <title>${isAr ? 'كشف السجل التعاقدي وأرشيف العقود' : 'Contractual History Archive Statement'} - ${empName}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; background: #fff; }
          .header-table { width: 100%; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; }
          .logo { height: 50px; }
          .title { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 18px; font-size: 12px; }
          .meta-item strong { display: block; color: #64748b; font-size: 11px; margin-bottom: 2px; }
          .meta-item span { font-weight: bold; color: #0f172a; }
          table.data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          table.data-table th { background: #f1f5f9; color: #334155; font-weight: bold; text-align: ${isAr ? 'right' : 'left'}; padding: 8px 10px; border: 1px solid #cbd5e1; }
          table.data-table td { padding: 8px 10px; border: 1px solid #e2e8f0; vertical-align: middle; }
          table.data-table tr:nth-child(even) { background: #f8fafc; }
          .badge-active { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
          .badge-archived { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; padding-top: 20px; border-top: 1px dashed #cbd5e1; }
          .footer-box { text-align: center; width: 40%; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 20%;">
              <img src="${CHF_IRAQ_LOGO_BASE64}" class="logo" alt="CHF / Vitas" />
            </td>
            <td style="text-align: center; width: 60%;">
              <h1 class="title">مؤسسة الإسكان التعاونية (CHF) - العراق</h1>
              <div class="subtitle">كشف الأرشيف والسجل التعاقدي للموظف (Contracts Archive Statement)</div>
            </td>
            <td style="text-align: ${isAr ? 'left' : 'right'}; width: 20%; font-size: 11px; color: #64748b;">
              تاريخ الطباعة:<br/>
              <strong>${new Date().toLocaleDateString('ar-IQ')}</strong>
            </td>
          </tr>
        </table>

        <div class="meta-grid">
          <div class="meta-item">
            <strong>اسم الموظف:</strong>
            <span>${empName}</span>
          </div>
          <div class="meta-item">
            <strong>الرقم الوظيفي / الباج:</strong>
            <span style="font-family: monospace;">${empIdStr}</span>
          </div>
          <div class="meta-item">
            <strong>القسم والفرع:</strong>
            <span>${deptName} • ${branchName}</span>
          </div>
          <div class="meta-item">
            <strong>تاريخ المباشرة الأولى:</strong>
            <span style="font-family: monospace;">${employee?.originalStartDate || employee?.joinDate || '-'}</span>
          </div>
        </div>

        <h3 style="font-size: 14px; margin-bottom: 8px; color: #1e293b;">سجل العقود المعتمدة والمؤرشفة (${allContracts.length} عقود):</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 15%;">رقم العقد</th>
              <th style="width: 25%;">نوع ومسمى العقد</th>
              <th style="width: 22%;">الفترة (من - إلى)</th>
              <th style="width: 15%;">الدرجة والراتب</th>
              <th style="width: 18%;">حالة العقد</th>
            </tr>
          </thead>
          <tbody>
            ${allContracts.map((c, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="font-family: monospace; font-weight: bold; color: #0284c7;">${c.contractNumber}</td>
                <td>
                  <strong>${c.contractTypeTitle}</strong>
                  ${c.jobTitle ? `<div style="font-size: 11px; color: #64748b;">${c.jobTitle}</div>` : ''}
                </td>
                <td style="font-family: monospace;">
                  ${c.startDate} ➔ ${c.endDate}
                </td>
                <td>
                  <div>${c.grade || '-'}</div>
                  <strong style="color: #059669;">${c.basicSalary ? c.basicSalary.toLocaleString() + ' د.ع' : '-'}</strong>
                </td>
                <td>
                  ${c.status === 'active' 
                    ? '<span class="badge-active">ساري المفعول (الحالي)</span>' 
                    : '<span class="badge-archived">منتهي ومؤرشف</span>'
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div class="footer-box">
            <p><strong>مسؤول الموارد البشرية (HR Officer)</strong></p>
            <p style="margin-top: 35px;">التوقيع: ........................................</p>
          </div>
          <div class="footer-box">
            <p><strong>ختم وتصديق إدارة الموارد البشرية</strong></p>
            <p style="margin-top: 35px; border: 1px dashed #94a3b8; display: inline-block; padding: 6px 14px; border-radius: 6px; color: #64748b;">
              الختم الرسمي
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  if (!isOpen || !employee) return null;

  const empName = isAr
    ? (employee.fullName || employee.fullNameAr || employee.full_name_ar || employee.fullNameEn || 'الموظف')
    : (employee.fullNameEn || employee.full_name_en || employee.fullName || 'Employee');
  const empIdCode = employee.employeeId || employee.badgeNo || employee.badge_no || `VIT-${String(employee.id || 1).padStart(4, '0')}`;
  const empPosition = isAr
    ? (employee.jobTitle || employee.position || employee.jobTitleEn || '-')
    : (employee.jobTitleEn || employee.jobTitle || '-');
  const empBranch = employee.branch || '-';
  const empHireDate = employee.originalStartDate || employee.joinDate || '-';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-[#0a0d14] border-white/10 text-slate-100 shadow-teal-950/40'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-400/30'
        }`}
        style={{ direction: isAr ? 'rtl' : 'ltr' }}
      >
        {/* MODAL HEADER */}
        <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border-white/10'
            : 'bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
              isDark
                ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-900/40'
                : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-500/20'
            }`}>
              <span className="material-symbols-outlined text-2xl">history_edu</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>{isAr ? 'أرشيف عقود العمل السابقة' : 'Employment Contracts Archive'}</span>
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {allContracts.length} {isAr ? 'عقود' : 'contracts'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} flex flex-wrap items-center gap-2 mt-0.5`}>
                <span className="font-bold text-slate-200 dark:text-white">{empName}</span>
                <span>•</span>
                <span className="font-mono font-bold text-blue-400">{empIdCode}</span>
                <span>•</span>
                <span>{empPosition}</span>
                <span>•</span>
                <span>{empBranch}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Print Archive Statement Button */}
            <button
              type="button"
              onClick={handlePrintArchiveStatement}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
              title={isAr ? 'طباعة كشف أرشيف العقود الكامل' : 'Print Archive Statement'}
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span>{isAr ? 'طباعة كشف الأرشيف' : 'Print Archive'}</span>
            </button>

            {/* Add Past Contract Button */}
            <button
              type="button"
              onClick={() => {
                if (showAddForm) {
                  resetForm();
                } else {
                  setShowAddForm(true);
                }
              }}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                showAddForm
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-600/20'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{showAddForm ? 'close' : 'add'}</span>
              <span>{showAddForm ? (isAr ? 'إلغاء' : 'Cancel') : (isAr ? 'إضافة عقد سابق' : 'Add Past Contract')}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* TOAST MESSAGE BANNER */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center animate-in slide-in-from-top duration-150 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* SUMMARY STATS STRIP */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:px-5 border-b text-xs ${
          isDark ? 'bg-black/30 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'تاريخ أول مباشرة / تعيين' : 'Original Start Date'}</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-blue-500 dark:text-blue-400">{empHireDate}</span>
          </div>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'العقد الساري الحالي' : 'Active Contract'}</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {employee.contractStartDate || '-'} ➔ {employee.contractEndDate || '-'}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'الدرجة والراتب الحالي' : 'Current Grade & Salary'}</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
              {employee.grade || 'G-4'} {Number(employee.basicSalary || employee.salary || employee.basic_salary) ? `(${Number(employee.basicSalary || employee.salary || employee.basic_salary).toLocaleString()} د.ع)` : ''}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200 shadow-xs'}`}>
            <span className={`block text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'إجمالي العقود بالأرشيف' : 'Total in Archive'}</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-amber-500">
              {allContracts.length} {isAr ? 'عقود موثقة' : 'contracts recorded'}
            </span>
          </div>
        </div>

        {/* OPTIONAL FORM: ADD / EDIT ARCHIVED CONTRACT */}
        {showAddForm && (
          <form
            onSubmit={handleSaveContractForm}
            className={`p-4 border-b space-y-3 animate-in fade-in duration-200 ${
              isDark ? 'bg-slate-900/80 border-teal-500/30' : 'bg-teal-50/50 border-teal-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                <span className="material-symbols-outlined text-sm">{editingContractId ? 'edit_note' : 'post_add'}</span>
                <span>{editingContractId ? (isAr ? 'تعديل بيانات العقد في الأرشيف' : 'Edit Archived Contract') : (isAr ? 'إضافة عقد سابق إلى أرشيف الموظف' : 'Add Past Contract to Archive')}</span>
              </h3>
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isAr ? 'تسجيل العقود التاريخية لغرض الحفظ والمراجعة والطباعة' : 'Record historical contracts for review and printing'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'رقم أو كود العقد' : 'Contract Code'}</label>
                <input
                  type="text"
                  value={formContractNumber}
                  onChange={e => setFormContractNumber(e.target.value)}
                  placeholder={`CNT-${new Date().getFullYear()}-XXXX`}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'نوع ومسمى العقد' : 'Contract Type Title'}</label>
                <input
                  type="text"
                  value={formContractTypeTitle}
                  onChange={e => setFormContractTypeTitle(e.target.value)}
                  placeholder={isAr ? 'عقد محدد المدة / عقد تجربة / عقد دائمي' : 'Fixed-term / Probation / Permanent'}
                  required
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'تاريخ بداية العقد' : 'Start Date'}</label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
                  required
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'تاريخ نهاية العقد' : 'End Date'}</label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={e => setFormEndDate(e.target.value)}
                  required
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'المسمى الوظيفي بالعقد' : 'Job Title in Contract'}</label>
                <input
                  type="text"
                  value={formJobTitle}
                  onChange={e => setFormJobTitle(e.target.value)}
                  placeholder={employee.jobTitle || 'المسمى الوظيفي'}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'الدرجة الوظيفية' : 'Job Grade'}</label>
                <input
                  type="text"
                  value={formGrade}
                  onChange={e => setFormGrade(e.target.value)}
                  placeholder="G-4 الدرجة الرابعة"
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'الراتب الأساسي (د.ع)' : 'Basic Salary (IQD)'}</label>
                <input
                  type="number"
                  value={formSalary}
                  onChange={e => setFormSalary(e.target.value)}
                  placeholder="1400000"
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'حالة العقد' : 'Status'}</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-[#06080d] border-white/15 text-white focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 focus:border-teal-600'
                  }`}
                >
                  <option value="archived">{isAr ? 'منتهي ومؤرشف' : 'Archived / Expired'}</option>
                  <option value="active">{isAr ? 'ساري المفعول (الحالي)' : 'Active (Current)'}</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isDark ? 'bg-white/10 hover:bg-white/15 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all cursor-pointer shadow-sm shadow-teal-600/30 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                <span>{editingContractId ? (isAr ? 'حفظ التعديلات' : 'Update') : (isAr ? 'إضافة إلى الأرشيف' : 'Add to Archive')}</span>
              </button>
            </div>
          </form>
        )}

        {/* FILTER BAR */}
        <div className={`px-4 sm:px-5 py-2.5 border-b flex items-center justify-between gap-2 text-xs ${
          isDark ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'تصفية العرض:' : 'Filter:'}</span>
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {isAr ? 'جميع العقود' : 'All Contracts'} ({allContracts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('active')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                activeFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {isAr ? 'ساري المفعول' : 'Active'} ({allContracts.filter(c => c.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('archived')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                activeFilter === 'archived'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {isAr ? 'منتهية ومؤرشفة' : 'Archived'} ({allContracts.filter(c => c.status === 'archived').length})
            </button>
          </div>

          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} hidden sm:inline`}>
            {isAr ? 'اضغط "معاينة" أو "طباعة" لاستعراض وثيقة العقد كاملة' : 'Click "Preview" or "Print" to review the contract'}
          </span>
        </div>

        {/* CONTRACTS ARCHIVE LIST / TABLE */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {filteredContracts.length === 0 ? (
            <div className={`py-12 text-center rounded-2xl border border-dashed ${
              isDark ? 'border-white/10 text-slate-400 bg-white/2' : 'border-slate-300 text-slate-500 bg-slate-50'
            }`}>
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-400">folder_off</span>
              <p className="text-sm font-bold">{isAr ? 'لا توجد عقود مسجلة تطابق التصفية' : 'No contracts found matching filter'}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredContracts.map((contract, index) => {
                const isActive = contract.status === 'active';

                // Assemble employee preview object representing this specific contract
                const contractEmpObject = {
                  ...employee,
                  termOfContract: contract.contractTypeTitle,
                  contractStartDate: contract.startDate,
                  contractEndDate: contract.endDate,
                  basicSalary: contract.basicSalary,
                  writtenBasicSalaryAr: contract.writtenBasicSalaryAr,
                  grade: contract.grade,
                  jobTitle: contract.jobTitle || employee.jobTitle,
                  jobTitleEn: contract.jobTitleEn || employee.jobTitleEn,
                  contract_code: contract.contractNumber,
                  contract_number: contract.contractNumber,
                  contract_type_id: contract.contractTypeId
                };

                return (
                  <div
                    key={contract.id || index}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                      isActive
                        ? isDark
                          ? 'bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/80 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                          : 'bg-gradient-to-r from-emerald-50/70 via-white to-white border-emerald-300 shadow-sm'
                        : isDark
                          ? 'bg-[#0f1420]/80 border-white/10 hover:border-blue-500/30 hover:bg-[#121927]'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 shadow-xs'
                    }`}
                  >
                    {/* Active Accent Bar on Left/Right */}
                    {isActive && (
                      <div className="absolute top-0 bottom-0 start-0 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-500" />
                    )}

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 ps-1.5">
                      {/* Left: Contract Details */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                            isActive
                              ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isDark ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {contract.contractNumber}
                          </span>

                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isActive
                              ? isDark ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-600/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isDark ? 'bg-slate-800 text-slate-300 border border-white/10' : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {isActive ? (isAr ? 'ساري المفعول (العقد الحالي)' : 'Active (Current)') : (isAr ? 'منتهي ومؤرشف' : 'Archived & Expired')}
                          </span>

                          {contract.isSystemGenerated && (
                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              ({isAr ? 'موثق بالنظام' : 'System Verified'})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-blue-500">description</span>
                            <span>{contract.contractTypeTitle}</span>
                          </h4>
                          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {contract.jobTitle} • {contract.grade}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'الفترة التعاقدية:' : 'Period:'}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{contract.startDate}</span>
                            <span className="text-slate-400">➔</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">{contract.endDate}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{isAr ? 'الراتب الأساسي:' : 'Salary:'}</span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {contract.basicSalary ? contract.basicSalary.toLocaleString() + ' د.ع' : '-'}
                            </span>
                          </div>

                          {contract.notes && (
                            <span className={`text-[11px] italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              • {contract.notes}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-start md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 w-full md:w-auto justify-end">
                        {/* 1. Preview Contract Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onPreviewContract(contractEmpObject);
                          }}
                          className="h-8 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-sm shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-98"
                          title={isAr ? 'معاينة وثيقة العقد بالكامل' : 'Preview Contract Document'}
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          <span>{isAr ? 'معاينة العقد' : 'Preview'}</span>
                        </button>

                        {/* 2. Print Contract Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onPreviewContract(contractEmpObject);
                          }}
                          className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 hover:text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 hover:text-slate-900'
                          }`}
                          title={isAr ? 'طباعة وثيقة العقد' : 'Print Contract Document'}
                        >
                          <span className="material-symbols-outlined text-sm">print</span>
                          <span>{isAr ? 'طباعة' : 'Print'}</span>
                        </button>

                        {/* Edit & Delete for custom added contracts */}
                        {!contract.isSystemGenerated && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditClick(contract)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
                              }`}
                              title={isAr ? 'تعديل' : 'Edit'}
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(contract.id)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                isDark ? 'hover:bg-rose-500/20 text-rose-400' : 'hover:bg-rose-100 text-rose-600'
                              }`}
                              title={isAr ? 'حذف من الأرشيف' : 'Delete'}
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className={`p-3.5 sm:px-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
          isDark ? 'bg-slate-900/80 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-teal-500">verified</span>
            <span>{isAr ? 'نظام أرشيف العقود الإلكتروني المعتمد - مؤسسة الإسكان التعاونية CHF العراق' : 'Certified Digital Contracts Archive - CHF Iraq'}</span>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isDark ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              {isAr ? 'إغلاق الأرشيف' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
