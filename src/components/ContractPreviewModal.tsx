import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';

interface ContractClause {
  id?: number | string;
  contract_type_id?: number | string;
  clause_number?: number;
  title_ar?: string;
  text_ar?: string;
}

interface ContractPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  contractTypes: any[];
  language?: string;
  companyProfile?: any;
}

export const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({
  isOpen,
  onClose,
  employee,
  contractTypes = [],
  language = 'ar',
  companyProfile
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<number | string | null>(null);
  const [clauses, setClauses] = useState<ContractClause[]>([]);
  const [showMetaTable, setShowMetaTable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Helper to get clauses from localStorage synchronously
  const getCachedClauses = (typeId: number | string | null): ContractClause[] => {
    if (!typeId) return [];
    try {
      const raw = localStorage.getItem(`vitas_contract_clauses_${typeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    // Check other types with matching name
    try {
      const ct = contractTypes.find((c: any) => c.id === Number(typeId) || c.id === typeId);
      if (ct?.name_ar) {
        for (const other of contractTypes) {
          if (other.name_ar === ct.name_ar && other.id !== typeId) {
            const rawOther = localStorage.getItem(`vitas_contract_clauses_${other.id}`);
            if (rawOther) {
              const pOther = JSON.parse(rawOther);
              if (Array.isArray(pOther) && pOther.length > 0) return pOther;
            }
          }
        }
      }
    } catch (e) {}

    return [];
  };

  // Helper to count clauses
  const getCachedClauseCount = (typeId: number | string): number => {
    return getCachedClauses(typeId).length;
  };

  // Match initial contract type from employee data
  useEffect(() => {
    if (employee && contractTypes.length > 0) {
      const empTypeStr = String(
        employee.termOfContract ||
        employee.term_of_contract ||
        employee.contract_type ||
        employee.contractType ||
        ''
      ).trim().toLowerCase();

      // Find all types matching employee's contract name or id
      const matchingTypes = contractTypes.filter((ct: any) => {
        const nameAr = String(ct.name_ar || '').trim().toLowerCase();
        const nameEn = String(ct.name_en || '').trim().toLowerCase();
        const name = String(ct.name || '').trim().toLowerCase();
        const idMatches = employee.contract_type_id && (ct.id === employee.contract_type_id || ct.id === Number(employee.contract_type_id));
        return idMatches || nameAr === empTypeStr || nameEn === empTypeStr || name === empTypeStr;
      });

      // Prefer type with clauses
      if (matchingTypes.length > 0) {
        const withClauses = matchingTypes.find((ct: any) => getCachedClauseCount(ct.id) > 0);
        setSelectedTypeId(withClauses ? withClauses.id : matchingTypes[0].id);
        return;
      }

      // Check if any contract type in system has clauses
      const anyWithClauses = contractTypes.find((ct: any) => getCachedClauseCount(ct.id) > 0);
      if (anyWithClauses) {
        setSelectedTypeId(anyWithClauses.id);
        return;
      }

      setSelectedTypeId(contractTypes[0]?.id || null);
    }
  }, [isOpen, employee, contractTypes]);

  // Listen for real-time contract clause updates from Settings Templates tab
  useEffect(() => {
    const handleUpdate = (e: any) => {
      const updatedTypeId = e?.detail?.contractTypeId;
      if (!selectedTypeId || !updatedTypeId || updatedTypeId === selectedTypeId || String(updatedTypeId) === String(selectedTypeId)) {
        if (e?.detail?.clauses && Array.isArray(e.detail.clauses)) {
          setClauses(e.detail.clauses);
          setIsLoading(false);
        } else if (selectedTypeId) {
          const fresh = getCachedClauses(selectedTypeId);
          setClauses(fresh);
          setIsLoading(false);
        }
      }
    };
    window.addEventListener('vitas_contract_clauses_updated', handleUpdate);
    return () => window.removeEventListener('vitas_contract_clauses_updated', handleUpdate);
  }, [selectedTypeId]);

  // Load clauses immediately from localStorage, then verify with API in background
  useEffect(() => {
    if (!isOpen || !selectedTypeId) {
      if (!isOpen) setClauses([]);
      return;
    }

    // 1. Synchronously load from localStorage immediately (0ms delay)
    const cached = getCachedClauses(selectedTypeId);
    if (cached.length > 0) {
      setClauses(cached);
      setIsLoading(false);
    } else {
      setClauses([]);
      setIsLoading(true);
    }

    // 2. Background check API with a 3-second timeout
    let isCancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const fetchFromApi = async () => {
      try {
        const res: any = await api.getContractClauses(selectedTypeId.toString());
        clearTimeout(timeoutId);
        if (!isCancelled && Array.isArray(res)) {
          setClauses(res);
          try {
            localStorage.setItem(`vitas_contract_clauses_${selectedTypeId}`, JSON.stringify(res));
          } catch (e) {}
        }
      } catch (err) {
        // Ignore API timeout/error if localStorage already provided data
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchFromApi();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, selectedTypeId, contractTypes]);

  // Selected contract type object
  const currentContractType = useMemo(() => {
    return contractTypes.find((ct: any) => ct.id === Number(selectedTypeId) || ct.id === selectedTypeId);
  }, [contractTypes, selectedTypeId]);

  // Format number to Arabic words fallback
  const numberToArabicWords = (n: number): string => {
    if (!n || n === 0) return 'صفر';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
      'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
      'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

    if (n < 20) return ones[n];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return o ? `${ones[o]} و ${tens[t]}` : tens[t];
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const rem = n % 100;
      return rem ? `${hundreds[h]} و ${numberToArabicWords(rem)}` : hundreds[h];
    }
    if (n < 1000000) {
      const th = Math.floor(n / 1000);
      const rem = n % 1000;
      const thWord = th === 1 ? 'ألف' : th === 2 ? 'ألفان' : `${numberToArabicWords(th)} آلاف`;
      return rem ? `${thWord} و ${numberToArabicWords(rem)}` : thWord;
    }
    const mil = Math.floor(n / 1000000);
    const rem = n % 1000000;
    const milWord = mil === 1 ? 'مليون' : mil === 2 ? 'مليونان' : `${numberToArabicWords(mil)} ملايين`;
    return rem ? `${milWord} و ${numberToArabicWords(rem)}` : milWord;
  };

  // Safe string helper for replacing placeholders in clauses
  const replacePlaceholders = (text: string): string => {
    if (!text || !employee) return text || '';

    const empNameAr = employee.fullName || employee.full_name_ar || employee.name_ar || employee.name || '';
    const empNameEn = employee.fullNameEn || employee.full_name_en || employee.name_en || empNameAr;
    const empId = employee.employeeId || employee.employee_id || (employee.id ? `VTS-${employee.id}` : '');
    const badgeNo = employee.badgeNo || employee.badge_no || empId;
    const jobTitleAr = employee.jobTitle || employee.position_ar || employee.position || '';
    const deptAr = employee.department || employee.department_ar || '';
    const branchAr = employee.branch || employee.location_ar || '';

    const basicSalaryNum = Number(employee.basicSalary || employee.salary || 0);
    const basicSalaryFormatted = basicSalaryNum > 0 ? `${basicSalaryNum.toLocaleString()} د.ع` : '0 د.ع';
    
    // Check written salary from employee record first
    const rawWritten = employee.writtenBasicSalaryAr || employee.written_basic_salary_ar;
    const writtenSalary = (rawWritten && rawWritten !== 'N/A' && rawWritten.trim() !== '')
      ? rawWritten
      : (basicSalaryNum > 0 ? `${numberToArabicWords(basicSalaryNum)} دينار عراقي` : 'صفر دينار');

    const transAllowance = employee.transportationFixed ? `${Number(employee.transportationFixed).toLocaleString()} د.ع` : '0 د.ع';
    const phoneAllowance = employee.phoneAllowance ? `${Number(employee.phoneAllowance).toLocaleString()} د.ع` : '0 د.ع';

    const startDate = employee.contractStartDate && employee.contractStartDate !== 'N/A' ? employee.contractStartDate : (employee.originalStartDate || employee.joinDate || '');
    const endDate = employee.contractEndDate && employee.contractEndDate !== 'N/A' ? employee.contractEndDate : '';
    const term = currentContractType?.name_ar || employee.termOfContract || 'عقد محدد المدة';
    const grade = employee.grade || 'G-4';
    const nationalId = employee.nationalId || employee.national_id || employee.passportNo || '';
    const companyName = companyProfile?.company_name || 'شركة فيتاس العراق للتمويل الأصغر';

    return text
      .replace(/{employee_name_ar}/g, empNameAr)
      .replace(/{employee_name_en}/g, empNameEn)
      .replace(/{employee_id}/g, empId)
      .replace(/{badge_no}/g, badgeNo)
      .replace(/{position_ar}/g, jobTitleAr)
      .replace(/{job_title_ar}/g, jobTitleAr)
      .replace(/{department_ar}/g, deptAr)
      .replace(/{location_ar}/g, branchAr)
      .replace(/{branch_ar}/g, branchAr)
      .replace(/{basic_salary}/g, basicSalaryFormatted)
      .replace(/{written_basic_salary_ar}/g, writtenSalary)
      .replace(/{transportation_fixed}/g, transAllowance)
      .replace(/{phone_allowance}/g, phoneAllowance)
      .replace(/{contract_start_date}/g, startDate)
      .replace(/{contract_end_date}/g, endDate)
      .replace(/{term_of_contract}/g, term)
      .replace(/{grade}/g, grade)
      .replace(/{national_id_no}/g, nationalId)
      .replace(/{institution_name}/g, companyName);
  };

  // Print function
  const handlePrint = () => {
    const printContent = document.getElementById('printableContractArea');
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>عقد عمل رسمي - ${employee?.fullName || employee?.name_ar || 'موظف'}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 18mm 20mm 18mm 20mm;
            }
            body {
              font-family: 'Cairo', 'Amiri', Tahoma, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 13.5px;
              line-height: 1.8;
            }
            .header-table {
              width: 100%;
              border-bottom: 2px solid #0d9488;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .title-box {
              text-align: center;
              margin: 20px 0;
              padding: 10px 14px;
              background-color: #f0fdfa;
              border: 1px solid #99f6e4;
              border-radius: 8px;
            }
            .title-box h1 {
              margin: 0;
              color: #115e59;
              font-size: 18px;
              font-weight: 800;
            }
            .clause {
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            .clause-title {
              font-weight: 800;
              color: #0f766e;
              font-size: 14.5px;
              margin-bottom: 6px;
            }
            .clause-text {
              text-align: justify;
              color: #1e293b;
              margin: 0;
              line-height: 2.0;
              white-space: pre-line;
              font-size: 13.5px;
            }
            .signatures {
              margin-top: 50px;
              width: 100%;
              border-collapse: collapse;
              page-break-inside: avoid;
            }
            .signatures td {
              width: 50%;
              vertical-align: top;
              padding: 10px;
            }
            .sig-box {
              border: 1px dashed #cbd5e1;
              border-radius: 8px;
              padding: 14px;
              min-height: 120px;
            }
            .footer-note {
              margin-top: 30px;
              text-align: center;
              font-size: 10.5px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen || !employee) return null;

  const empFullName = employee.fullName || employee.full_name_ar || employee.name_ar || employee.name || 'الموظف';
  const empJobTitle = employee.jobTitle || employee.position_ar || employee.position || '-';
  const empBranch = employee.branch || employee.location_ar || employee.department || '-';
  const empId = employee.employeeId || employee.employee_id || (employee.id ? `VTS-${employee.id}` : '-');
  const contractNumber = `CON-VTS-${employee.badgeNo || employee.badge_no || empId}-${new Date().getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-[#111827] w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#0a0c10]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/30">
              <span className="material-symbols-outlined text-lg">description</span>
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>معاينة وثيقة عقد العمل الرسمي</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300">
                  {currentContractType?.name_ar || 'عقد عمل معتمد'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                الموظف: {empFullName} ({empId}) • {empJobTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Optional Summary Table Toggle */}
            <button
              type="button"
              onClick={() => setShowMetaTable(!showMetaTable)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showMetaTable
                  ? 'bg-blue-600 text-white border-blue-600 shadow'
                  : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
              title="إظهار أو إخفاء جدول ملخص بيانات الموظف والراتب"
            >
              <span className="material-symbols-outlined text-sm">table_rows</span>
              <span>{showMetaTable ? 'إخفاء جدول البيانات' : 'إظهار جدول البيانات'}</span>
            </button>

            {/* Template Selector Dropdown with clause count */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-white/10">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                القالب:
              </span>
              <select
                value={selectedTypeId || ''}
                onChange={(e) => setSelectedTypeId(Number(e.target.value) || e.target.value)}
                className="text-xs font-bold py-1.5 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1a202c] text-slate-800 dark:text-slate-200 outline-none cursor-pointer shadow-2xs"
              >
                {contractTypes.map((ct: any) => {
                  const count = getCachedClauseCount(ct.id);
                  const isCurrent = (ct.id === Number(selectedTypeId) || ct.id === selectedTypeId);
                  const activeCount = isCurrent ? clauses.length : count;
                  const countLabel = activeCount > 0 ? ` (${activeCount} ${activeCount === 1 ? 'بند' : 'بنود'})` : '';
                  return (
                    <option key={ct.id} value={ct.id}>
                      {ct.name_ar || ct.name_en || ct.name}{countLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="طباعة العقد أو حفظه كـ PDF"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>طباعة العقد</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Contract Preview Area (Scrollable A4 document container) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/50 dark:bg-black/40 flex justify-center">
          <div 
            id="printableContractArea"
            className="w-full max-w-[780px] bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-xl border border-slate-200 font-sans leading-relaxed text-xs sm:text-[13.5px]"
            dir="rtl"
          >
            {/* 1. Official Letterhead */}
            <div className="border-b-2 border-teal-600 pb-3 mb-5">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-1/2 align-middle text-right">
                      <h2 className="text-base sm:text-lg font-black text-teal-800 m-0">
                        {companyProfile?.company_name || 'شركة فيتاس العراق للتمويل الأصغر'}
                      </h2>
                      <p className="text-[11px] text-slate-500 m-0 font-semibold mt-0.5">
                        إدارة الموارد البشرية والشؤون الإدارية والقانونية
                      </p>
                    </td>
                    <td className="w-1/2 align-middle text-left font-mono text-[11px] text-slate-500">
                      <div><strong className="text-slate-700">رقم العقد:</strong> {contractNumber}</div>
                      <div><strong className="text-slate-700">تاريخ الإصدار:</strong> {new Date().toISOString().split('T')[0]}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Document Title */}
            <div className="text-center my-4 py-2.5 bg-teal-50/70 border border-teal-200 rounded-xl">
              <h1 className="text-base sm:text-lg font-extrabold text-teal-900 m-0">
                عقد عمل رسمي ({currentContractType?.name_ar || employee?.termOfContract || 'عقد عمل'})
              </h1>
              <p className="text-[11px] text-teal-700 font-semibold m-0 mt-0.5">
                محرر ومصادق عليه وفقاً لأحكام قانون العمل العراقي النافذ رقم (37) لسنة 2015
              </p>
            </div>

            {/* Optional Metadata Table (Only if toggled ON by user) */}
            {showMetaTable && (
              <table className="w-full border-collapse my-4 text-[11px]">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 bg-slate-100 font-bold w-1/4">المسمى الوظيفي:</td>
                    <td className="border border-slate-300 p-2 text-slate-900 font-semibold w-1/4">{empJobTitle}</td>
                    <td className="border border-slate-300 p-2 bg-slate-100 font-bold w-1/4">موقع العمل والفرع:</td>
                    <td className="border border-slate-300 p-2 text-slate-900 font-semibold w-1/4">{empBranch}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 bg-slate-100 font-bold">الراتب الأساسي:</td>
                    <td className="border border-slate-300 p-2 text-emerald-800 font-bold font-mono">
                      {employee.basicSalary ? `${Number(employee.basicSalary).toLocaleString()} د.ع` : (employee.salary ? `${Number(employee.salary).toLocaleString()} د.ع` : '-')}
                    </td>
                    <td className="border border-slate-300 p-2 bg-slate-100 font-bold">الراتب كتابة:</td>
                    <td className="border border-slate-300 p-2 text-slate-900">
                      {employee.writtenBasicSalaryAr || `${numberToArabicWords(Number(employee.basicSalary || employee.salary || 0))} دينار`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 bg-slate-100 font-bold">تاريخ بدء العقد:</td>
                    <td className="border border-slate-300 p-2 text-slate-900 font-mono">
                      {employee.contractStartDate || employee.originalStartDate || employee.joinDate || '-'}
                    </td>
                    <td className="border border-slate-300 p-2 bg-slate-100 font-bold">الدرجة الوظيفية:</td>
                    <td className="border border-slate-300 p-2 text-slate-900 font-semibold">{employee.grade || 'G-4'}</td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* 3. Clauses List (Exact contract content as entered in Settings Templates) */}
            {isLoading && clauses.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                <p className="mt-1 text-xs">جاري تحميل بنود القالب...</p>
              </div>
            ) : clauses.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-slate-300 rounded-xl my-6 bg-slate-50">
                <span className="material-symbols-outlined text-3xl text-slate-400">description</span>
                <p className="text-sm font-bold text-slate-700 mt-2">لا توجد بنود مضافة لهذا القالب حتى الآن</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  لم يتم حفظ أي بنود لهذا القالب بعد. يمكنك كتابة بنود هذا العقد وتخصيصها من خلال:
                  <br />
                  <strong>شاشة الإعدادات ← تبويب القوالب (Templates)</strong>
                </p>
              </div>
            ) : (
              <div className="space-y-4 my-6">
                {clauses.map((clause, idx) => {
                  const hasTitle = Boolean(clause.title_ar && clause.title_ar.trim() !== '');
                  const renderedTitle = hasTitle ? replacePlaceholders(clause.title_ar!.trim()) : '';
                  const renderedText = replacePlaceholders(clause.text_ar || '');

                  return (
                    <div key={clause.id || idx} className="clause text-slate-900">
                      {hasTitle && (
                        <h4 className="font-bold text-teal-800 text-sm sm:text-[14px] mb-2">
                          {renderedTitle}
                        </h4>
                      )}
                      <p className="text-justify text-slate-800 m-0 leading-loose whitespace-pre-line text-xs sm:text-[13.5px]">
                        {renderedText}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 4. Signatures and Stamps */}
            <div className="pt-8 border-t border-slate-200 mt-8">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-1/2 align-top p-2">
                      <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 min-h-[120px] flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-slate-900 m-0">الطرف الأول (صاحب العمل):</p>
                          <p className="text-[11px] text-slate-500 m-0 mt-0.5">عن / شركة فيتاس العراق للتمويل الأصغر</p>
                        </div>
                        <div className="mt-8 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                          <span>التوقيع: ............................</span>
                          <span>الختم الرسمي</span>
                        </div>
                      </div>
                    </td>
                    <td className="w-1/2 align-top p-2">
                      <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 min-h-[120px] flex flex-col justify-between">
                        <div>
                          <p className="font-bold text-slate-900 m-0">الطرف الثاني (الموظف):</p>
                          <p className="text-[11px] text-slate-600 m-0 mt-0.5 font-bold">{empFullName}</p>
                        </div>
                        <div className="mt-8 pt-2 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                          <span>التوقيع: ............................</span>
                          <span>البصمة</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-center text-[10px] text-slate-400 mt-4 border-t border-slate-100 pt-2">
                حرر هذا العقد من نسختين أصليتين متطابقتين، تسلم كل طرف نسخة منه للعمل بموجبها.
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
