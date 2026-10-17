import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { CHF_IRAQ_LOGO_BASE64 } from '../data/contractHeaderLogo';
import { formatIraqiPhoneNumber } from '../utils/phoneHelper';
import { useDocumentRouting } from '../context/DocumentRoutingContext';

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
  const { openDocumentRouting } = useDocumentRouting();
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

  // Sorted contract types prioritizing official contracts (عقد موظف جديد first, then عقد دائمي)
  const sortedContractTypes = useMemo(() => {
    return [...contractTypes].sort((a, b) => {
      const getPriority = (item: any) => {
        const name = String(item.name_ar || item.name_en || '').trim();
        if (name === 'عقد موظف جديد' || name === 'New Employee Contract') return 1;
        if (name === 'عقد دائمي' || name === 'Permanent Contract') return 2;
        return 10;
      };
      return getPriority(a) - getPriority(b);
    });
  }, [contractTypes]);

  // Match initial contract type from employee data
  useEffect(() => {
    if (employee && sortedContractTypes.length > 0) {
      const empTypeStr = String(
        employee.termOfContract ||
        employee.term_of_contract ||
        employee.contract_type ||
        employee.contractType ||
        ''
      ).trim().toLowerCase();

      // Find all types matching employee's contract name or id
      const matchingType = sortedContractTypes.find((ct: any) => {
        const nameAr = String(ct.name_ar || '').trim().toLowerCase();
        const nameEn = String(ct.name_en || '').trim().toLowerCase();
        const name = String(ct.name || '').trim().toLowerCase();
        const idMatches = employee.contract_type_id && (ct.id === employee.contract_type_id || ct.id === Number(employee.contract_type_id));
        return idMatches || (empTypeStr && (nameAr === empTypeStr || nameEn === empTypeStr || name === empTypeStr));
      });

      if (matchingType) {
        setSelectedTypeId(matchingType.id);
        return;
      }

      // Prefer official contract types
      const preferred = sortedContractTypes.find((ct: any) => ct.name_ar === 'عقد موظف جديد' || ct.name_en === 'New Employee Contract')
        || sortedContractTypes.find((ct: any) => ct.name_ar === 'عقد دائمي' || ct.name_en === 'Permanent Contract');

      if (preferred) {
        setSelectedTypeId(preferred.id);
        return;
      }

      setSelectedTypeId(sortedContractTypes[0]?.id || null);
    }
  }, [isOpen, employee, sortedContractTypes]);

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
  // Safe string helper for replacing placeholders in clauses with exact Word bold & underline styling
  const replacePlaceholders = (text: string, rich: boolean = true): string => {
    if (!text || !employee) return text || '';

    const empNameAr = employee.fullName || employee.full_name_ar || employee.name_ar || employee.name || '';
    const empNameEn = employee.fullNameEn || employee.full_name_en || employee.name_en || empNameAr;
    const empId = employee.employeeId || employee.employee_id || (employee.id ? `VTS-${employee.id}` : '');
    const badgeNo = employee.badgeNo || employee.badge_no || empId;
    const jobTitleAr = employee.jobTitle || employee.position_ar || employee.position || '';
    const deptAr = employee.department || employee.department_ar || '';
    const branchAr = employee.branch || employee.location_ar || '';
    const city = employee.city || employee.branch || employee.location_ar || 'بغداد';
    const rawPhone = employee.phone || employee.mobile || employee.phone_number || employee.phoneNumber || employee.mobileNo || employee.emergencyPhone || '';
    const phone = formatIraqiPhoneNumber(rawPhone) || rawPhone || '';
    const email = employee.personalEmail || employee.personal_email || employee.email || '';
    const birthDate = employee.dob || employee.birthDate || employee.birth_date || '';

    const basicSalaryNum = Number(employee.basicSalary || employee.salary || 0);
    const basicSalaryPlain = basicSalaryNum > 0 ? `${basicSalaryNum.toLocaleString()}` : '0';
    
    // Check written salary from employee record first
    const rawWritten = employee.writtenBasicSalaryAr || employee.written_basic_salary_ar;
    const writtenSalaryPlain = (rawWritten && rawWritten !== 'N/A' && rawWritten.trim() !== '')
      ? rawWritten
      : (basicSalaryNum > 0 ? `${numberToArabicWords(basicSalaryNum)} دينار عراقي` : 'صفر دينار');

    const transAllowance = employee.transportationFixed ? `${Number(employee.transportationFixed).toLocaleString()} د.ع` : '0 د.ع';
    const phoneAllowance = employee.phoneAllowance ? `${Number(employee.phoneAllowance).toLocaleString()} د.ع` : '0 د.ع';

    const startDate = employee.contractStartDate && employee.contractStartDate !== 'N/A' ? employee.contractStartDate : (employee.originalStartDate || employee.joinDate || '');
    const endDate = employee.contractEndDate && employee.contractEndDate !== 'N/A' ? employee.contractEndDate : '';
    const term = currentContractType?.name_ar || employee.termOfContract || 'عقد محدد المدة';
    const grade = employee.grade || 'G-4';
    const nationalId = employee.nationalId || employee.national_id || employee.passportNo || '';
    const companyName = 'مؤسسة الإسكان التعاونية CHF';

    // Rich HTML formatted values (Bold + Underline where Word has them)
    const styledEmpName = rich ? `<u><strong class="font-bold underline text-slate-900">${empNameAr}</strong></u>` : empNameAr;
    const styledJobTitle = rich ? `<u><strong class="font-bold underline text-slate-900">${jobTitleAr}</strong></u>` : jobTitleAr;
    const styledBranch = rich ? `<u><strong class="font-bold underline text-slate-900">${branchAr}</strong></u>` : branchAr;
    const styledSalary = rich ? `<u><strong class="font-bold underline text-slate-900">${basicSalaryPlain}</strong></u>` : `${basicSalaryPlain} د.ع`;
    const styledWrittenSalary = rich ? `<u><strong class="font-bold underline text-slate-900">${writtenSalaryPlain}</strong></u>` : writtenSalaryPlain;
    const styledStartDate = rich ? `<strong class="font-bold text-slate-900">${startDate}</strong>` : startDate;
    const styledEndDate = rich ? `<strong class="font-bold text-slate-900">${endDate}</strong>` : endDate;

    // In العنوان الكامل and الطرف الثاني headers, address and name are plain text matching the Word document (no underline)
    let textToProcess = text;
    if (rich) {
      if (textToProcess.includes('العنوان الكامل:')) {
        textToProcess = textToProcess.replace(/العنوان الكامل:[^\n]+/g, (match) => {
          return match
            .replace(/{location_ar}/g, branchAr)
            .replace(/{branch_ar}/g, branchAr)
            .replace(/{city}/g, city)
            .replace(/{phone}/g, phone);
        });
      }
      if (textToProcess.includes('الطرف الثاني:')) {
        textToProcess = textToProcess.replace(/الطرف الثاني:[^\n]+/g, (match) => {
          return match.replace(/{employee_name_ar}/g, empNameAr);
        });
      }
    }

    let res = textToProcess
      .replace(/{employee_name_ar}/g, styledEmpName)
      .replace(/{employee_name_en}/g, empNameEn)
      .replace(/{employee_id}/g, empId)
      .replace(/{badge_no}/g, badgeNo)
      .replace(/{position_ar}/g, styledJobTitle)
      .replace(/{job_title_ar}/g, styledJobTitle)
      .replace(/{department_ar}/g, deptAr)
      .replace(/{location_ar}/g, styledBranch)
      .replace(/{branch_ar}/g, styledBranch)
      .replace(/{city}/g, city)
      .replace(/{phone}/g, phone)
      .replace(/{email}/g, email)
      .replace(/{birth_date}/g, birthDate)
      .replace(/{basic_salary}/g, styledSalary)
      .replace(/{written_basic_salary_ar}/g, styledWrittenSalary)
      .replace(/{transportation_fixed}/g, transAllowance)
      .replace(/{phone_allowance}/g, phoneAllowance)
      .replace(/{contract_start_date}/g, styledStartDate)
      .replace(/{contract_end_date}/g, styledEndDate)
      .replace(/{term_of_contract}/g, term)
      .replace(/{grade}/g, grade)
      .replace(/{national_id_no}/g, nationalId)
      .replace(/{institution_name}/g, companyName);

    if (rich) {
      // 1. اتفق الطرفان المتعاقدان على ما يلي: (Bold + Underline in Word)
      res = res.replace(/اتفق الطرفان المتعاقدان على ما يلي:/g, '<u><strong class="font-bold underline text-slate-900">اتفق الطرفان المتعاقدان على ما يلي:</strong></u>');

      // 2. Format salary amounts in parentheses if already hardcoded in text
      res = res.replace(/رقما\s*\(([^)]+)\)/g, (match, p1) => {
        if (p1.includes('<u')) return match;
        return `رقما (<u><strong class="font-bold underline text-slate-900">${p1}</strong></u>)`;
      });
      res = res.replace(/كتابة\s*\(([^)]+)\)/g, (match, p1) => {
        if (p1.includes('<u')) return match;
        return `كتابة (<u><strong class="font-bold underline text-slate-900">${p1}</strong></u>)`;
      });

      // 3. سادساً subheadings (Bold + Underline in Word)
      res = res.replace(/المعلومات السرية\s*:/g, '<u><strong class="font-bold underline text-slate-900">المعلومات السرية :</strong></u>');
      res = res.replace(/عدم المنافسة\s*:/g, '<u><strong class="font-bold underline text-slate-900">عدم المنافسة:</strong></u>');
      res = res.replace(/(?:3\.\s*)?الملكية الفكرية\s*:/g, '<u><strong class="font-bold underline text-slate-900">3. الملكية الفكرية :</strong></u>');

      // 4. Ensure any phone number displayed in clause text has leading 0
      res = res.replace(/(رقم الهاتف النقال\s*\()\s*([^\)]+)\)/g, (match, prefix, p1) => {
        const formatted = formatIraqiPhoneNumber(p1.trim());
        return `${prefix}${formatted || p1})`;
      });
      res = res.replace(/(رقم الموبايل:?\s*)([0-9\+\s\-]+)/g, (match, prefix, p1) => {
        const formatted = formatIraqiPhoneNumber(p1.trim());
        return `${prefix}${formatted || p1}`;
      });
    }

    return res;
  };

  // Helper to split clauses into exact 4 pages matching Word desktop documents
  const splitClause4 = (text: string) => {
    const idx = text.indexOf('6. ');
    if (idx !== -1) return [text.slice(0, idx).trim(), text.slice(idx).trim()];
    const lines = text.split('\n');
    if (lines.length > 5) return [lines.slice(0, 5).join('\n').trim(), lines.slice(5).join('\n').trim()];
    return [text, ''];
  };

  const splitClause5 = (text: string) => {
    const hasProbation = text.includes('فترة اختبار') || text.includes('90 يوما');
    if (hasProbation) {
      const idx = text.indexOf('12. ');
      if (idx !== -1) return [text.slice(0, idx).trim(), text.slice(idx).trim()];
    } else {
      const matchGov = text.match(/(?=13\.\s)|(?=يجوز للطرف الاول)/);
      if (matchGov && matchGov.index !== undefined) {
        return [text.slice(0, matchGov.index).trim(), text.slice(matchGov.index).trim()];
      }
    }
    const idx12 = text.indexOf('12. ');
    if (idx12 !== -1) return [text.slice(0, idx12).trim(), text.slice(idx12).trim()];
    return [text, ''];
  };

  const splitClause7 = (text: string) => {
    const match = text.match(/(?=(?:3\.\s*|3\.)?الملكية الفكرية)/);
    if (match && match.index !== undefined) {
      return [text.slice(0, match.index).trim(), text.slice(match.index).trim()];
    }
    return [text, ''];
  };

  // Helper to render preamble with bold labels and underlined data matching Word formatting
  const renderPreamble = (rawText: string) => {
    const text = replacePlaceholders(rawText, true);
    const lines = text.split('\n');

    return (
      <div className="preamble-container space-y-1.5 text-xs sm:text-[13.5px] leading-relaxed mb-3">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-1"></div>;

          if (trimmed.startsWith('الطرف الاول:')) {
            const rest = trimmed.replace('الطرف الاول:', '').trim();
            return (
              <p key={idx} className="preamble-line m-0 text-justify">
                <span className="font-bold text-slate-900">الطرف الاول:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: rest }} />
              </p>
            );
          }

          if (trimmed.startsWith('الطرف الثاني:')) {
            const rest = trimmed.replace('الطرف الثاني:', '').trim();
            return (
              <p key={idx} className="preamble-line m-0 text-justify">
                <span className="font-bold text-slate-900">الطرف الثاني:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: rest }} />
              </p>
            );
          }

          if (trimmed.startsWith('العنوان الكامل:')) {
            const rest = trimmed.replace('العنوان الكامل:', '').trim();
            const formattedRest = rest.replace(/(رقم الهاتف النقال\s*\()\s*([^\)]+)\)/g, (match, prefix, p1) => {
              const formatted = formatIraqiPhoneNumber(p1.trim());
              return `${prefix}${formatted || p1})`;
            });
            return (
              <p key={idx} className="preamble-line m-0 text-justify">
                <span className="font-bold text-slate-900">العنوان الكامل:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: formattedRest }} />
              </p>
            );
          }

          if (trimmed.startsWith('البريد الالكتروني')) {
            const colonIdx = trimmed.indexOf(':');
            const label = colonIdx !== -1 ? trimmed.slice(0, colonIdx + 1) : 'البريد الالكتروني الشخصي المعتمد للمراسلات:';
            const val = colonIdx !== -1 ? trimmed.slice(colonIdx + 1).trim() : trimmed.replace(/البريد الالكتروني\s*(الشخصي)?\s*(المعتمد)?\s*(للمراسلات)?/g, '').trim();
            return (
              <p key={idx} className="preamble-line m-0">
                <span className="font-bold text-slate-900">{label}</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: val }} />
              </p>
            );
          }

          if (trimmed.startsWith('رقم الموبايل:')) {
            const rest = trimmed.replace('رقم الموبايل:', '').trim();
            const formattedPhone = formatIraqiPhoneNumber(rest) || rest;
            return (
              <p key={idx} className="preamble-line m-0">
                <span className="font-bold text-slate-900">رقم الموبايل:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: formattedPhone }} />
              </p>
            );
          }

          if (trimmed.startsWith('تاريخ الميلاد:') || trimmed.startsWith('تاريخ الميلاد')) {
            const rest = trimmed.replace(/تاريخ الميلاد:?/g, '').trim();
            return (
              <p key={idx} className="preamble-line m-0">
                <span className="font-bold text-slate-900">تاريخ الميلاد:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: rest }} />
              </p>
            );
          }

          if (trimmed.startsWith('رقم البطاقة الوطنية:') || trimmed.startsWith('رقم البطاقة الوطنية')) {
            const rest = trimmed.replace(/رقم البطاقة الوطنية:?/g, '').trim();
            return (
              <p key={idx} className="preamble-line m-0">
                <span className="font-bold text-slate-900">رقم البطاقة الوطنية:</span>{' '}
                <span dangerouslySetInnerHTML={{ __html: rest }} />
              </p>
            );
          }

          if (trimmed === 'محل العقد:' || trimmed.startsWith('محل العقد:')) {
            const rest = trimmed.replace('محل العقد:', '').trim();
            return (
              <div key={idx} className="mt-2">
                <span className="font-bold text-slate-900 block mb-0.5">محل العقد:</span>
                {rest && (
                  <div 
                    className="clause-text text-justify m-0"
                    dangerouslySetInnerHTML={{ __html: rest }}
                  />
                )}
              </div>
            );
          }

          if (trimmed.includes('اتفق الطرفان المتعاقدان على ما يلي')) {
            return (
              <p key={idx} className="my-2.5">
                <u className="font-bold underline text-slate-900">
                  اتفق الطرفان المتعاقدان على ما يلي:
                </u>
              </p>
            );
          }

          return (
            <div 
              key={idx} 
              className="clause-text text-justify m-0"
              dangerouslySetInnerHTML={{ __html: trimmed }}
            />
          );
        })}
      </div>
    );
  };

  // Helper to render standard clause with HTML formatting (Bold & Underline)
  const renderClause = (clause: ContractClause) => {
    const hasTitle = Boolean(clause.title_ar && clause.title_ar.trim() !== '');
    const renderedTitle = hasTitle ? replacePlaceholders(clause.title_ar!.trim(), false) : '';
    const renderedText = replacePlaceholders(clause.text_ar || '', true);

    return (
      <div key={clause.id || clause.clause_number} className="clause-block mb-3">
        {hasTitle && (
          <h4 className="clause-title font-bold text-slate-900 text-xs sm:text-[14px] mb-1 leading-snug">
            {renderedTitle}
          </h4>
        )}
        <div 
          className="clause-text text-justify text-slate-800 m-0 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]"
          dangerouslySetInnerHTML={{ __html: renderedText }}
        />
      </div>
    );
  };

  // Helper to compute 4 structured pages matching Word docx
  const getContractPages = () => {
    if (clauses.length === 0) return [];

    // Map clauses by clause_number
    const c1 = clauses.find(c => c.clause_number === 1) || clauses[0];
    const c2 = clauses.find(c => c.clause_number === 2) || clauses[1];
    const c3 = clauses.find(c => c.clause_number === 3) || clauses[2];
    const c4 = clauses.find(c => c.clause_number === 4) || clauses[3];
    const c5 = clauses.find(c => c.clause_number === 5) || clauses[4];
    const c6 = clauses.find(c => c.clause_number === 6) || clauses[5];
    const c7 = clauses.find(c => c.clause_number === 7) || clauses[6];
    const c8 = clauses.find(c => c.clause_number === 8) || clauses[7];
    const c9 = clauses.find(c => c.clause_number === 9) || clauses[8];
    const c10 = clauses.find(c => c.clause_number === 10) || clauses[9];
    const c11 = clauses.find(c => c.clause_number === 11) || clauses[10];
    const c12 = clauses.find(c => c.clause_number === 12) || clauses[11];
    const c13 = clauses.find(c => c.clause_number === 13) || clauses[12];

    // Split Clause 4 (third clause) into Part 1 (items 1-5) and Part 2 (items 6-13)
    const [c4_part1, c4_part2] = splitClause4(c4?.text_ar || '');

    // Split Clause 5 (fourth clause) into Part 1 and Part 2
    const [c5_part1, c5_part2] = splitClause5(c5?.text_ar || '');

    // Split Clause 7 (sixth clause) into Part 1 (Confidentiality & Non-compete) and Part 2 (Intellectual Property)
    const [c7_part1, c7_part2] = splitClause7(c7?.text_ar || '');

    return [
      {
        pageNumber: 1,
        isFirstPage: true,
        isLastPage: false,
        hasStamp: true,
        hasSignatures: false,
        content: (
          <>
            {c1 && renderPreamble(c1.text_ar || '')}
            {c2 && renderClause(c2)}
            {c3 && renderClause(c3)}
            {c4 && (
              <div className="clause-block mb-3">
                <h4 className="clause-title font-bold text-slate-900 text-xs sm:text-[14px] mb-1">
                  {replacePlaceholders(c4.title_ar || 'ثالثا: - التزامات الطرف الثاني:', false)}
                </h4>
                <div 
                  className="clause-text text-justify text-slate-800 m-0 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]"
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(c4_part1, true) }}
                />
              </div>
            )}
          </>
        )
      },
      {
        pageNumber: 2,
        isFirstPage: false,
        isLastPage: false,
        hasStamp: true,
        hasSignatures: false,
        content: (
          <>
            {c4_part2 && (
              <div className="clause-block mb-3">
                <div 
                  className="clause-text text-justify text-slate-800 m-0 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]"
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(c4_part2, true) }}
                />
              </div>
            )}
            {c5 && (
              <div className="clause-block mb-3">
                <h4 className="clause-title font-bold text-slate-900 text-xs sm:text-[14px] mb-1">
                  {replacePlaceholders(c5.title_ar || 'رابعا: الاحكام العامة :', false)}
                </h4>
                <div 
                  className="clause-text text-justify text-slate-800 m-0 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]"
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(c5_part1, true) }}
                />
              </div>
            )}
          </>
        )
      },
      {
        pageNumber: 3,
        isFirstPage: false,
        isLastPage: false,
        hasStamp: true,
        hasSignatures: false,
        content: (
          <>
            {c5_part2 && (
              <div className="clause-block mb-3">
                <div 
                  className="clause-text text-justify text-slate-800 m-0 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]"
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(c5_part2, true) }}
                />
              </div>
            )}
            {c6 && renderClause(c6)}
            {c7 && (
              <div className="clause-block mb-3">
                <h4 className="clause-title font-bold text-slate-900 text-xs sm:text-[14px] mb-1">
                  {replacePlaceholders(c7.title_ar || 'سادسا: السرية وعدم المنافسة وحقوق الملكية الفكرية :', false)}
                </h4>
                <div 
                  className="clause-text text-justify text-slate-800 m-0 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]"
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(c7_part1, true) }}
                />
              </div>
            )}
          </>
        )
      },
      {
        pageNumber: 4,
        isFirstPage: false,
        isLastPage: true,
        hasStamp: false,
        hasSignatures: true,
        content: (
          <>
            {c7_part2 && (
              <div className="clause-block mb-3">
                <h4 className="clause-subtitle font-bold text-slate-900 text-xs sm:text-[14px] mb-1">
                  <u className="underline font-bold">3. الملكية الفكرية :</u>
                </h4>
                <div 
                  className="clause-text text-justify text-slate-800 m-0 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]"
                  dangerouslySetInnerHTML={{ __html: replacePlaceholders(c7_part2.replace(/^(?:3\.\s*|3\.)?الملكية الفكرية\s*:?\s*/, ''), true) }}
                />
              </div>
            )}
            {c8 && renderClause(c8)}
            {c9 && renderClause(c9)}
            {c10 && renderClause(c10)}
            {c11 && renderClause(c11)}
            {c12 && renderClause(c12)}
            {c13 && renderClause(c13)}
          </>
        )
      }
    ];
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

    try {
      printWindow.document.title = "";
    } catch (e) {}

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title></title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            * {
              box-sizing: border-box !important;
              font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              direction: rtl;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            }
            u, .underline {
              text-decoration: underline !important;
              text-underline-offset: 3px;
            }
            strong, b, .font-bold {
              font-weight: 700 !important;
            }
            .contract-page-wrapper {
              margin: 0 !important;
              padding: 0 !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            .contract-page-wrapper:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .page-number-indicator, .no-print {
              display: none !important;
            }
            .contract-page {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              width: 210mm !important;
              min-height: 295mm !important;
              max-height: 296.5mm !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              box-sizing: border-box !important;
              padding: 10mm 16mm 10mm 16mm !important;
              margin: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: #ffffff !important;
              overflow: hidden !important;
            }
            .contract-page.last-page,
            .contract-page-last,
            .contract-page:last-child,
            .contract-page-wrapper:last-child .contract-page {
              page-break-after: avoid !important;
              break-after: auto !important;
            }
            .contract-page-header {
              text-align: center;
              margin-bottom: 6px;
            }
            .contract-header-logo {
              display: block;
              margin: 0 auto;
              height: 54px;
              max-width: 230px;
              object-fit: contain;
            }
            .contract-main-title {
              text-align: center;
              font-size: 15pt;
              font-weight: 800;
              margin: 3px 0 8px 0;
              color: #000000;
              font-family: 'Cairo', sans-serif !important;
            }
            .clause-block {
              margin-bottom: 5px;
            }
            .clause-title {
              font-weight: 700;
              font-size: 11pt;
              color: #000000;
              margin-top: 4px;
              margin-bottom: 2px;
              line-height: 1.4;
              font-family: 'Cairo', sans-serif !important;
            }
            .clause-subtitle {
              font-weight: 700;
              font-size: 11pt;
              color: #000000;
              margin-top: 4px;
              margin-bottom: 2px;
              font-family: 'Cairo', sans-serif !important;
            }
            .clause-text {
              text-align: justify;
              text-justify: inter-word;
              color: #000000;
              margin: 0 0 4px 0;
              line-height: 1.5;
              font-size: 9.8pt;
              white-space: pre-line;
              font-family: 'Cairo', sans-serif !important;
            }
            .preamble-line {
              margin-bottom: 2.5px;
              line-height: 1.5;
              font-size: 9.8pt;
              text-align: justify;
              text-justify: inter-word;
              font-family: 'Cairo', sans-serif !important;
            }
            .page-stamp-row {
              margin-top: auto;
              padding-top: 6px;
              border-top: 1px dashed #64748b;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 11pt !important;
              page-break-inside: avoid;
              break-inside: avoid;
              font-family: 'Cairo', sans-serif !important;
            }
            .stamp-box {
              border: 1.5px dashed #475569;
              border-radius: 6px;
              padding: 3px 12px;
              font-size: 11pt !important;
              font-weight: 700;
              color: #334155;
              text-align: center;
            }
            .signatures-section {
              margin-top: auto;
              padding-top: 4px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .sig-title {
              text-align: center;
              font-weight: 700;
              font-size: 11pt !important;
              margin-bottom: 3px;
              font-family: 'Cairo', sans-serif !important;
            }
            .sig-divider {
              width: 100%;
              border-top: 1.5px solid #000000;
              margin-bottom: 6px;
            }
            .sig-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11pt !important;
            }
            .sig-table td {
              width: 50%;
              vertical-align: top;
              padding: 0 8px;
            }
            .sig-box {
              line-height: 1.55;
              font-size: 11pt !important;
              font-family: 'Cairo', sans-serif !important;
            }
            .sig-box p {
              font-size: 11pt !important;
              margin: 0;
            }
            .sig-box span {
              font-size: 11pt !important;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 0 !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              try { document.title = ""; } catch (e) {}
              if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(function() {
                  setTimeout(function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                  }, 150);
                });
              } else {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() { window.close(); }, 300);
                }, 250);
              }
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

  const contractPages = getContractPages();

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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                  4 صفحات معتمدة
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
                {sortedContractTypes.map((ct: any) => {
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
              title="طباعة العقد (4 صفحات مطابقة للوورد مع الشعار في كل صفحة)"
            >
              <span className="material-symbols-outlined text-base">print</span>
              <span>طباعة العقد (4 صفحات)</span>
            </button>

            {/* Smart Document Routing & Delivery Button */}
            <button
              type="button"
              onClick={() => {
                openDocumentRouting({
                  documentType: 'employment_contract',
                  documentId: contractNumber,
                  documentTitle: `عقد عمل - ${empFullName}`,
                  sourceModule: 'contracts',
                  employeeId: String(employee.id || employee.employeeId || employee.badgeNo || employee.badge_no || ''),
                  employeeName: empFullName,
                  specificEmployeeIds: [
                    String(employee.id || ''),
                    String(employee.employeeId || employee.employee_id || ''),
                    String(employee.badgeNo || employee.badge_no || ''),
                    empFullName
                  ].filter(Boolean),
                  suggestedRecipient: 'specific_employee',
                  fileName: `${contractNumber}.pdf`,
                  fileType: 'application/pdf',
                  metadata: {
                    contractType: currentContractType?.name_ar,
                    salary: employee.basicSalary || employee.salary,
                    position: empJobTitle,
                    branch: empBranch,
                    badgeNo: employee.badgeNo || employee.badge_no
                  }
                });
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="إرسال وتوجيه العقد عبر البريد المؤسسي وتطبيق الموظف"
            >
              <span className="material-symbols-outlined text-base">forward_to_inbox</span>
              <span>توجيه العقد ذكياً</span>
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

        {/* Contract Preview Area (Scrollable Multi-Page Document) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 dark:bg-black/50 flex flex-col items-center">
          
          {/* Optional Metadata Table (Only if toggled ON by user) */}
          {showMetaTable && (
            <div className="w-full max-w-[800px] mb-6 bg-white dark:bg-[#1a202c] p-4 rounded-xl border border-slate-300 dark:border-white/10 shadow-md">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-teal-600">badge</span>
                <span>ملخص بيانات الموظف والراتب الأساسي</span>
              </h4>
              <table className="meta-summary-table w-full border-collapse text-[11px]">
                <tbody>
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 bg-slate-100 dark:bg-white/5 font-bold w-1/4">المسمى الوظيفي:</td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-slate-200 font-semibold w-1/4">{empJobTitle}</td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 bg-slate-100 dark:bg-white/5 font-bold w-1/4">موقع العمل والفرع:</td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-slate-200 font-semibold w-1/4">{empBranch}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 bg-slate-100 dark:bg-white/5 font-bold">الراتب الأساسي:</td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-emerald-600 font-bold font-mono">
                      {employee.basicSalary ? `${Number(employee.basicSalary).toLocaleString()} د.ع` : (employee.salary ? `${Number(employee.salary).toLocaleString()} د.ع` : '-')}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 bg-slate-100 dark:bg-white/5 font-bold">الراتب كتابة:</td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-slate-200">
                      {employee.writtenBasicSalaryAr || `${numberToArabicWords(Number(employee.basicSalary || employee.salary || 0))} دينار`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 bg-slate-100 dark:bg-white/5 font-bold">تاريخ بدء العقد:</td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-slate-200 font-mono">
                      {employee.contractStartDate || employee.originalStartDate || employee.joinDate || '-'}
                    </td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 bg-slate-100 dark:bg-white/5 font-bold">الدرجة الوظيفية:</td>
                    <td className="border border-slate-300 dark:border-slate-700 p-2 text-slate-900 dark:text-slate-200 font-semibold">{employee.grade || 'G-4'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {isLoading && clauses.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
              <p className="mt-2 text-sm font-semibold">جاري تحميل وثيقة العقد...</p>
            </div>
          ) : clauses.length === 0 ? (
            <div className="w-full max-w-[800px] py-12 px-6 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-white shadow-sm my-6">
              <span className="material-symbols-outlined text-4xl text-slate-400">description</span>
              <p className="text-base font-bold text-slate-800 mt-2">لا توجد بنود مضافة لهذا القالب حتى الآن</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                لم يتم حفظ أي بنود لهذا القالب بعد. يمكنك كتابة بنود هذا العقد وتخصيصها من خلال:
                <br />
                <strong>شاشة الإعدادات ← تبويب القوالب (Templates)</strong>
              </p>
            </div>
          ) : (
            <div id="printableContractArea" className="w-full max-w-[800px]" dir="rtl">
              {contractPages.map((page) => (
                <div key={page.pageNumber} className="contract-page-wrapper mb-8">
                  {/* Visual Page Indicator Header in Preview */}
                  <div className="page-number-indicator flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-2 no-print">
                    <span className="bg-slate-200 dark:bg-white/10 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                      <span className="material-symbols-outlined text-sm">article</span>
                      <span>الصفحة {page.pageNumber} من 4</span>
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      مؤسسة الإسكان التعاونية CHF • {currentContractType?.name_ar || 'عقد عمل'}
                    </span>
                  </div>

                  {/* Single Contract Page Box */}
                  <div 
                    className={`contract-page bg-white text-slate-900 p-8 sm:p-12 rounded-xl shadow-xl border border-slate-200 flex flex-col justify-between font-['Cairo',sans-serif] ${page.isLastPage ? 'contract-page-last last-page' : ''}`}
                    style={{ minHeight: '1020px' }}
                  >
                    {/* Official CHF Iraq Logo Header (Appears on EVERY page) */}
                    <div className="contract-page-header text-center mb-4">
                      <img 
                        src={CHF_IRAQ_LOGO_BASE64} 
                        alt="CHF Iraq Logo" 
                        className="contract-header-logo h-14 sm:h-18 mx-auto object-contain mb-2"
                      />
                      {page.isFirstPage && (
                        <h1 className="contract-main-title text-xl sm:text-2xl font-bold text-slate-900 m-0 my-2">
                          عقد عمل
                        </h1>
                      )}
                    </div>

                    {/* Page Body Clauses */}
                    <div className="contract-page-body flex-1 text-xs sm:text-[13.5px] leading-relaxed">
                      {page.content}
                    </div>

                    {/* Bottom Stamp for Pages 1, 2, 3 (Matching desktop Word document) */}
                    {page.hasStamp && (
                      <div className="page-stamp-row mt-auto pt-4 border-t border-dashed border-slate-400 flex justify-between items-end text-xs sm:text-[14px] text-slate-800">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-xs sm:text-[14px]">الطرف الثاني</div>
                          <div className="font-bold text-slate-900 text-xs sm:text-[14px]">
                            الاسم: <span className="font-normal">{empFullName}</span>
                          </div>
                          <div className="font-bold text-slate-900 text-xs sm:text-[14px]">
                            التوقيع: ................................................
                          </div>
                        </div>
                        <div className="stamp-box border border-dashed border-slate-500 rounded-lg px-4 py-2 text-center text-xs sm:text-[14px] font-bold text-slate-600">
                          ختم المؤسسة
                        </div>
                      </div>
                    )}

                    {/* Official Signatures Section for Page 4 (Matching desktop Word document) */}
                    {page.hasSignatures && (
                      <div className="signatures-section mt-auto pt-4 border-t-2 border-slate-900">
                        <div className="sig-title text-center font-bold text-xs sm:text-[14px] text-slate-900 mb-2">
                          نهاية العقد
                        </div>
                        <div className="sig-divider w-full border-t border-slate-400 mb-4"></div>

                        <table className="sig-table w-full text-xs sm:text-[14px]">
                          <tbody>
                            <tr>
                              {/* Right column: الطرف الأول */}
                              <td className="w-1/2 align-top pr-2 pl-4 text-right">
                                <div className="sig-box space-y-2 text-xs sm:text-[14px]">
                                  <p className="font-bold text-slate-900 m-0 text-xs sm:text-[14px]">الطرف الأول: مؤسسة الإسكان التعاونية (CHF)</p>
                                  <p className="font-bold text-slate-800 m-0 text-xs sm:text-[14px]">عنها (إضافة لوظيفته) السيد: ثائر عذاب جاسم</p>
                                  <p className="font-bold text-slate-700 m-0 pt-2 text-xs sm:text-[14px]">التوقيع: ................................................</p>
                                  <div className="pt-2">
                                    <span className="inline-block border border-dashed border-slate-400 rounded-lg px-4 py-2 text-xs sm:text-[14px] text-slate-500 font-bold">
                                      ختم المؤسسة الرسمي
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Left column: الطرف الثاني */}
                              <td className="w-1/2 align-top pl-2 pr-4 text-right">
                                <div className="sig-box space-y-2 text-xs sm:text-[14px]">
                                  <p className="font-bold text-slate-900 m-0 text-xs sm:text-[14px]">الطرف الثاني</p>
                                  <p className="font-bold text-slate-800 m-0 text-xs sm:text-[14px]">الاسم: <span className="font-normal">{empFullName}</span></p>
                                  <p className="font-bold text-slate-700 m-0 pt-2 text-xs sm:text-[14px]">التوقيع: ................................................</p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};


