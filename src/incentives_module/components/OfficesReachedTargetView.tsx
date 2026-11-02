import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Trophy,
  Target,
  Users,
  Building2,
  Award,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  Send,
  ArrowLeft,
  Search,
  Filter,
  Sparkles,
  Info,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Employee } from '../../types';
import { EmployeePayoutRecord } from '../types/excelIncentives';
import { isEmployeeInBranch, getBranchName, BRANCH_NAMES_MAP, normalizeBranchKey } from '../../utils/branchHelper';
import { api } from '../../api/client';

// Target Bonus Structure as specified in the official policy document (Effective May 1, 2025)
export interface TargetRoleRule {
  key: 'office_manager' | 'los' | 'credit_assistant' | 'teller' | 'receptionist_admin';
  titleAr: string;
  titleEn: string;
  bonusAmount: number; // in IQD
}

export const TARGET_ROLE_RULES: TargetRoleRule[] = [
  {
    key: 'office_manager',
    titleAr: 'مدير المكتب / أقدم',
    titleEn: 'Office Manager / Senior',
    bonusAmount: 112000,
  },
  {
    key: 'los',
    titleAr: 'مشرف مسؤولي القروض / أقدم',
    titleEn: 'LOS / Senior',
    bonusAmount: 112000,
  },
  {
    key: 'credit_assistant',
    titleAr: 'مساعد ائتمان / أقدم',
    titleEn: 'Credit Assistant / Senior',
    bonusAmount: 75000,
  },
  {
    key: 'teller',
    titleAr: 'أمين الصندوق',
    titleEn: 'Teller',
    bonusAmount: 75000,
  },
  {
    key: 'receptionist_admin',
    titleAr: 'موظف الاستعلامات / مساعد إداري',
    titleEn: 'Receptionist / Admin Assistant',
    bonusAmount: 60000,
  },
];

export interface OfficeLoanOfficer {
  id: string;
  name: string;
  badgeNo?: string;
  bonus: number;
  hasReachedBonus: boolean;
  incentives: number;
  transportation: number;
}

export interface TargetBeneficiaryStaff {
  id: string;
  employeeId: string;
  fullName: string;
  jobTitle: string;
  office: string;
  roleKey: TargetRoleRule['key'];
  roleTitleAr: string;
  roleTitleEn: string;
  bonusAmount: number;
  note: 'Reached Target';
  isPayrollSynced?: boolean;
}

export interface OfficeTargetEvaluation {
  officeKey: string;
  officeNameAr: string;
  officeNameEn: string;
  totalLOs: number;
  achievedLOs: number;
  requiredThreshold: number;
  achievementPercentage: number;
  reachedTarget: boolean;
  loanOfficers: OfficeLoanOfficer[];
  beneficiaryStaff: TargetBeneficiaryStaff[];
  totalOfficeBonus: number;
}

interface OfficesReachedTargetViewProps {
  extractedRecords: EmployeePayoutRecord[];
  employees: Employee[];
  onBack: () => void;
  language?: string;
  theme?: string;
  t: (ar: string, en: string) => string;
  setActiveModuleId: (id: string) => void;
  activeFxRate?: number;
}

/**
 * Identify if an employee or record fits one of the 5 administrative beneficiary roles
 */
export function matchTargetBeneficiaryRole(empOrRec: any): TargetRoleRule | null {
  const title = `${empOrRec.jobTitle || ''} ${empOrRec.position || ''} ${empOrRec.position_ar || ''} ${empOrRec.position_en || ''} ${empOrRec.title || ''}`.toLowerCase();

  // 1. Office Manager / Senior (112,000 IQD)
  if (
    title.includes('office manager') ||
    title.includes('مدير مكتب') ||
    title.includes('مدير المكتب') ||
    title.includes('مدير فرع') ||
    title.includes('branch manager')
  ) {
    return TARGET_ROLE_RULES[0];
  }

  // 2. LOS / Senior (112,000 IQD)
  if (
    title.includes('los') ||
    title.includes('مشرف مسؤولي القروض') ||
    title.includes('مشرف مسؤولي قروض') ||
    title.includes('مشرف قروض') ||
    title.includes('loan officer supervisor')
  ) {
    return TARGET_ROLE_RULES[1];
  }

  // 3. Credit Assistant / Senior (75,000 IQD)
  if (
    title.includes('credit assistant') ||
    title.includes('مساعد ائتمان') ||
    title.includes('مساعد ائتماني') ||
    title.includes('منسق ائتمان') ||
    title.includes('منسق الائتمان') ||
    title.includes('credit coordinator') ||
    title.trim() === 'co'
  ) {
    return TARGET_ROLE_RULES[2];
  }

  // 4. Teller (75,000 IQD)
  if (
    title.includes('teller') ||
    title.includes('أمين الصندوق') ||
    title.includes('امين الصندوق') ||
    title.includes('أمين صندوق') ||
    title.includes('امين صندوق') ||
    title.includes('كاشير') ||
    title.includes('صراف') ||
    title.includes('خازن') ||
    title.includes('cashier')
  ) {
    return TARGET_ROLE_RULES[3];
  }

  // 5. Receptionist / Admin Assistant (60,000 IQD)
  if (
    title.includes('receptionist') ||
    title.includes('موظف الاستعلامات') ||
    title.includes('موظف استعلامات') ||
    title.includes('موظف استقبال') ||
    title.includes('موظفة استقبال') ||
    title.includes('مساعد إداري') ||
    title.includes('مساعد اداري') ||
    title.includes('استعلامات') ||
    title.includes('admin assistant') ||
    title.includes('administrative assistant') ||
    title.includes('front desk')
  ) {
    return TARGET_ROLE_RULES[4];
  }

  return null;
}

export const OfficesReachedTargetView: React.FC<OfficesReachedTargetViewProps> = ({
  extractedRecords,
  employees,
  onBack,
  language = 'ar',
  theme = 'light',
  t,
  setActiveModuleId,
  activeFxRate = 1310,
}) => {
  const isDark = theme === 'dark';
  const isAr = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REACHED' | 'NOT_REACHED'>('ALL');
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [branchesList, setBranchesList] = useState<any[]>([]);

  // Fetch branches to know active / inactive branch statuses
  useEffect(() => {
    let isMounted = true;
    api.getBranches()
      .then((data: any) => {
        if (isMounted && Array.isArray(data)) {
          setBranchesList(data);
        }
      })
      .catch(() => {
        fetch('/api/branches')
          .then((res) => res.json())
          .then((data: any) => {
            if (isMounted && Array.isArray(data)) {
              setBranchesList(data);
            }
          })
          .catch(() => {});
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Helper to determine if an office/branch is inactive:
   * 1. Office name itself indicates invalid/unspecified/inactive/closed
   * 2. Branch in DB branches table has status === 'Inactive' / 'inactive' / 'غير فعال'
   * 3. Office has zero active employees in HRIS
   */
  const isBranchInactive = useCallback(
    (officeKey: string, rawName: string): boolean => {
      const key = (officeKey || '').trim().toLowerCase();
      const raw = (rawName || '').trim().toLowerCase();

      // 1. Explicit invalid or inactive indicators in the office name itself
      const invalidKeywords = [
        'unspecified',
        'غير محدد',
        'n/a',
        'end',
        'inactive',
        'غير فعال',
        'غير نشط',
        'مغلق',
        'closed',
        'ملغي'
      ];
      if (
        invalidKeywords.some(
          (kw) =>
            key === kw ||
            raw === kw ||
            key.includes('غير فعال') ||
            raw.includes('غير فعال') ||
            key.includes('inactive') ||
            raw.includes('inactive') ||
            key.includes('مغلق') ||
            raw.includes('مغلق')
        )
      ) {
        return true;
      }

      // 2. Check status against database branches table
      if (branchesList && branchesList.length > 0) {
        const normKey = normalizeBranchKey(officeKey);
        const normRaw = normalizeBranchKey(rawName);

        const matchedBranch = branchesList.find((b) => {
          const bName = (b.name || '').trim().toLowerCase();
          const bAr = (b.name_ar || '').trim().toLowerCase();
          const bEn = (b.name_en || '').trim().toLowerCase();
          const normB = normalizeBranchKey(b.name || b.name_ar || b.name_en);

          if (
            bName === key ||
            bAr === key ||
            bEn === key ||
            bName === raw ||
            bAr === raw ||
            bEn === raw
          ) {
            return true;
          }
          if (
            normKey &&
            normB &&
            (normKey === normB || normKey.includes(normB) || normB.includes(normKey))
          ) {
            return true;
          }
          if (
            normRaw &&
            normB &&
            (normRaw === normB || normRaw.includes(normB) || normB.includes(normRaw))
          ) {
            return true;
          }
          return false;
        });

        if (matchedBranch) {
          const st = String(matchedBranch.status || '').trim().toLowerCase();
          if (st === 'inactive' || st === 'غير فعال' || st === 'closed' || st === 'مغلق') {
            return true;
          }
        }
      }

      // 3. If employees are associated with this branch, check if all of them are inactive
      const empsInBranch = employees.filter(
        (e) => isEmployeeInBranch(e, officeKey) || isEmployeeInBranch(e, rawName)
      );
      if (empsInBranch.length > 0) {
        const hasActiveEmp = empsInBranch.some((e) => {
          const s = String(e.status || '').trim().toLowerCase();
          return s === 'active' || s === 'on leave' || s === 'onboarding' || !s;
        });
        if (!hasActiveEmp) {
          return true; // All employees in this branch are inactive/terminated
        }
      }

      return false;
    },
    [branchesList, employees]
  );

  /**
   * Main Evaluation Engine:
   * 1. Groups Loan Officers by Office (excluding non-LOs and offices with no LOs)
   * 2. Evaluates whether each office reached half of LOs achieving Bonus
   * 3. Excludes inactive offices and offices without Loan Officers
   * 4. Calculates the beneficiary administrative staff for each winning office
   */
  const officesEvaluation = useMemo<OfficeTargetEvaluation[]>(() => {
    // Collect distinct offices from extracted records for loan officers
    const officeGroups: Record<
      string,
      {
        loanOfficers: OfficeLoanOfficer[];
        rawOfficeName: string;
      }
    > = {};

    // 1. Process Extracted Records for Loan Officers ONLY
    extractedRecords.forEach((rec) => {
      const office = rec.office?.trim() || 'Unspecified';
      if (!office || office.toLowerCase() === 'unspecified' || office.toLowerCase() === 'end') return;

      const title = (rec.jobTitle || '').toLowerCase();
      // A loan officer in the extraction sheet:
      const isLO =
        title === 'lo' ||
        title.includes('loan officer') ||
        title.includes('مسؤول قروض') ||
        title.includes('ضابط قروض');

      // Only actual Loan Officers are counted for the LO disbursement target
      if (!isLO) return;

      // Unify canonical office key so spelling variations group into the same office
      const canonicalKey = getBranchName(office, 'en') || office;

      if (!officeGroups[canonicalKey]) {
        officeGroups[canonicalKey] = { loanOfficers: [], rawOfficeName: office };
      }

      const bonusVal = rec.bonus || 0;
      officeGroups[canonicalKey].loanOfficers.push({
        id: rec.matchedEmployeeId || rec.employeeId,
        name: rec.employeeName,
        badgeNo: rec.matchedBadgeNo || rec.employeeId,
        bonus: bonusVal,
        hasReachedBonus: bonusVal > 0,
        incentives: rec.incentives || 0,
        transportation: rec.transportation || 0,
      });
    });

    // 2. Evaluate each office
    const results: OfficeTargetEvaluation[] = [];

    Object.entries(officeGroups).forEach(([officeKey, data]) => {
      const totalLOs = data.loanOfficers.length;

      // REQUIREMENT 1: Any office that has NO loan officers must NOT appear in the table
      if (totalLOs === 0) {
        return;
      }

      // REQUIREMENT 2: Any inactive office must NOT appear in the table
      if (isBranchInactive(officeKey, data.rawOfficeName)) {
        return;
      }

      // Formula as explicitly stated:
      // Even: >= N / 2 (e.g. 8 -> 4)
      // Odd: >= floor(N / 2) (e.g. 7 -> 3)
      const requiredThreshold =
        totalLOs <= 0
          ? 0
          : totalLOs % 2 === 0
          ? totalLOs / 2
          : Math.max(1, Math.floor(totalLOs / 2));

      const achievedLOs = data.loanOfficers.filter((lo) => lo.hasReachedBonus).length;
      const reachedTarget = totalLOs > 0 && achievedLOs >= requiredThreshold;
      const achievementPercentage = totalLOs > 0 ? Math.round((achievedLOs / totalLOs) * 100) : 0;

      // Localized Office Names
      const mapped = BRANCH_NAMES_MAP[officeKey] || BRANCH_NAMES_MAP[data.rawOfficeName];
      const officeNameAr = mapped?.ar || getBranchName(officeKey, 'ar') || officeKey;
      const officeNameEn = mapped?.en || getBranchName(officeKey, 'en') || officeKey;

      // 3. Find beneficiary administrative staff for this office (from HRIS & Extracted records)
      const beneficiaries: TargetBeneficiaryStaff[] = [];
      const seenEmpIds = new Set<string>();

      if (reachedTarget) {
        // Search in active HRIS employees
        employees.forEach((emp) => {
          if (isEmployeeInBranch(emp, officeKey) || isEmployeeInBranch(emp, data.rawOfficeName)) {
            const roleRule = matchTargetBeneficiaryRole(emp);
            if (roleRule && !seenEmpIds.has(String(emp.id))) {
              seenEmpIds.add(String(emp.id));
              beneficiaries.push({
                id: String(emp.id),
                employeeId: String(emp.employeeId || emp.id),
                fullName: emp.fullName || emp.fullNameAr || emp.name_ar || emp.name || 'موظف إداري',
                jobTitle: emp.position_ar || emp.position || emp.jobTitle || roleRule.titleAr,
                office: officeNameAr,
                roleKey: roleRule.key,
                roleTitleAr: roleRule.titleAr,
                roleTitleEn: roleRule.titleEn,
                bonusAmount: roleRule.bonusAmount,
                note: 'Reached Target',
              });
            }
          }
        });

        // Also check if any beneficiary was extracted in the spreadsheet for this office (e.g. LOS or CO)
        extractedRecords.forEach((rec) => {
          if (
            rec.office === officeKey ||
            rec.office === data.rawOfficeName ||
            isEmployeeInBranch({ branch: rec.office }, officeKey) ||
            isEmployeeInBranch({ branch: rec.office }, data.rawOfficeName)
          ) {
            const roleRule = matchTargetBeneficiaryRole(rec);
            const targetId = String(rec.matchedEmployeeId || rec.employeeId);
            if (roleRule && !seenEmpIds.has(targetId) && targetId !== '—') {
              seenEmpIds.add(targetId);
              beneficiaries.push({
                id: targetId,
                employeeId: String(rec.employeeId || targetId),
                fullName: rec.employeeName,
                jobTitle: rec.jobTitle || roleRule.titleAr,
                office: officeNameAr,
                roleKey: roleRule.key,
                roleTitleAr: roleRule.titleAr,
                roleTitleEn: roleRule.titleEn,
                bonusAmount: roleRule.bonusAmount,
                note: 'Reached Target',
              });
            }
          }
        });
      }

      const totalOfficeBonus = beneficiaries.reduce((sum, b) => sum + b.bonusAmount, 0);

      results.push({
        officeKey,
        officeNameAr,
        officeNameEn,
        totalLOs,
        achievedLOs,
        requiredThreshold,
        achievementPercentage,
        reachedTarget,
        loanOfficers: data.loanOfficers,
        beneficiaryStaff: beneficiaries,
        totalOfficeBonus,
      });
    });

    // Sort: Reached Target offices first, then by achievement percentage desc
    return results.sort((a, b) => {
      if (a.reachedTarget && !b.reachedTarget) return -1;
      if (!a.reachedTarget && b.reachedTarget) return 1;
      return b.achievementPercentage - a.achievementPercentage;
    });
  }, [extractedRecords, employees, isBranchInactive]);

  // All beneficiary staff across all winning offices
  const allBeneficiaries = useMemo<TargetBeneficiaryStaff[]>(() => {
    return officesEvaluation.flatMap((off) => off.beneficiaryStaff);
  }, [officesEvaluation]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalOffices = officesEvaluation.filter((o) => o.totalLOs > 0).length;
    const reachedOffices = officesEvaluation.filter((o) => o.reachedTarget).length;
    const totalBeneficiaries = allBeneficiaries.length;
    const totalBonusAmount = allBeneficiaries.reduce((sum, b) => sum + b.bonusAmount, 0);
    const totalLoanOfficers = officesEvaluation.reduce((sum, o) => sum + o.totalLOs, 0);
    const achievedLoanOfficers = officesEvaluation.reduce((sum, o) => sum + o.achievedLOs, 0);

    return {
      totalOffices,
      reachedOffices,
      totalBeneficiaries,
      totalBonusAmount,
      totalLoanOfficers,
      achievedLoanOfficers,
    };
  }, [officesEvaluation, allBeneficiaries]);

  // Filtered Offices for Table
  const filteredOffices = useMemo(() => {
    return officesEvaluation.filter((office) => {
      // Status Filter
      if (statusFilter === 'REACHED' && !office.reachedTarget) return false;
      if (statusFilter === 'NOT_REACHED' && office.reachedTarget) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName =
          office.officeNameAr.toLowerCase().includes(q) ||
          office.officeNameEn.toLowerCase().includes(q) ||
          office.officeKey.toLowerCase().includes(q);
        const matchesStaff = office.beneficiaryStaff.some((b) =>
          b.fullName.toLowerCase().includes(q)
        );
        const matchesLO = office.loanOfficers.some((lo) => lo.name.toLowerCase().includes(q));
        if (!matchesName && !matchesStaff && !matchesLO) return false;
      }

      return true;
    });
  }, [officesEvaluation, statusFilter, searchQuery]);

  /**
   * Apply Target Bonuses to Live Payroll:
   * 1. Updates `vitas_payroll_manual_adjustments` with the bonus amount and bonusNote = 'Reached Target'
   * 2. Adds cell comment for auditability
   * 3. Dispatches custom event to notify Category5PayrollView live
   */
  const handleApplyToPayroll = useCallback(() => {
    if (allBeneficiaries.length === 0) {
      alert(
        isAr
          ? 'لا توجد كوادر مستحقة حالياً نظراً لعدم وصول أي مكتب للهدف المحدد.'
          : 'No eligible administrative staff found as no offices have reached the target threshold.'
      );
      return;
    }

    setIsApplying(true);
    try {
      const savedRaw = localStorage.getItem('vitas_payroll_manual_adjustments');
      const adjustments: Record<string, any> = savedRaw ? JSON.parse(savedRaw) : {};

      const savedComments = localStorage.getItem('vitas_payroll_cell_comments');
      const cellComments: Record<string, any> = savedComments ? JSON.parse(savedComments) : {};

      let appliedCount = 0;
      allBeneficiaries.forEach((beneficiary) => {
        const empId = beneficiary.id;
        const currentAdj = adjustments[empId] || {};
        const existingBonus = currentAdj.bonus || 0;
        const targetBonus = beneficiary.bonusAmount;

        // Apply bonus and mark note
        adjustments[empId] = {
          ...currentAdj,
          bonus: existingBonus + targetBonus,
          bonusExtra: (currentAdj.bonusExtra || 0) + targetBonus,
          bonusNote: 'Reached Target',
        };

        // Write cell comment for live hover tooltip in payroll table
        const commentKey = `${empId}_bonus`;
        cellComments[commentKey] = {
          empId,
          fieldKey: 'bonus',
          value: targetBonus,
          note: 'Reached Target',
          author: 'Offices Target Policy',
          updatedAt: new Date().toISOString(),
        };

        appliedCount++;
      });

      // Persist to localStorage
      localStorage.setItem('vitas_payroll_manual_adjustments', JSON.stringify(adjustments));
      localStorage.setItem('vitas_payroll_cell_comments', JSON.stringify(cellComments));

      // Dispatch live real-time sync event
      window.dispatchEvent(
        new CustomEvent('vitas_payroll_adjustments_updated', { detail: adjustments })
      );

      const msg = isAr
        ? `تم بنجاح تطبيق وإضافة علاوة الهدف مع ملاحظة "Reached Target" لـ ${appliedCount} موظفاً في ${stats.reachedOffices} مكاتب محققة للهدف!`
        : `Successfully applied target performance bonuses with note "Reached Target" for ${appliedCount} staff in ${stats.reachedOffices} winning offices!`;

      setSyncFeedback(msg);
      setTimeout(() => setSyncFeedback(null), 8000);
    } catch (err) {
      console.error('Failed to apply target bonuses to payroll:', err);
      alert(isAr ? 'حدث خطأ أثناء تطبيق المكافآت على المسير.' : 'Failed to apply bonuses to payroll.');
    } finally {
      setIsApplying(false);
    }
  }, [allBeneficiaries, isAr, stats.reachedOffices]);

  /**
   * Export Clean Excel Report:
   * Sheet 1: Offices Target Evaluation Summary
   * Sheet 2: Eligible Beneficiary Staff & Bonuses
   */
  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Offices Evaluation
    const officesRows = officesEvaluation.map((o, idx) => ({
      '#': idx + 1,
      'Office Name (En)': o.officeNameEn,
      'اسم المكتب (عربي)': o.officeNameAr,
      'Total Loan Officers': o.totalLOs,
      'LOs Reached Bonus': o.achievedLOs,
      'Required Threshold': o.requiredThreshold,
      'Achievement %': `${o.achievementPercentage}%`,
      'Target Status': o.reachedTarget ? 'Reached Target' : 'Not Reached',
      'Eligible Admin Staff Count': o.beneficiaryStaff.length,
      'Total Bonus IQD': o.totalOfficeBonus,
    }));
    const ws1 = XLSX.utils.json_to_sheet(officesRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'Offices Target Evaluation');

    // Sheet 2: Beneficiary Staff
    const staffRows = allBeneficiaries.map((b, idx) => ({
      '#': idx + 1,
      'Employee ID': b.employeeId,
      'Employee Name': b.fullName,
      'Office': b.office,
      'Job Title': b.jobTitle,
      'Role Classification': b.roleTitleEn,
      'العنوان الوظيفي': b.roleTitleAr,
      'Bonus Amount (IQD)': b.bonusAmount,
      'Note': b.note,
    }));
    const ws2 = XLSX.utils.json_to_sheet(staffRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Eligible Staff Bonuses');

    const fileName = `Offices_Reached_Target_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [officesEvaluation, allBeneficiaries]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isAr ? 'rtl' : 'ltr'}>
      {/* =========================================================================
          TOP BANNER & BREADCRUMB NAVIGATION
          ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-all cursor-pointer border border-slate-200 dark:border-white/10 shrink-0"
              title={t('العودة لشاشة استخراج الحوافز', 'Back to Extraction Module')}
            >
              <ArrowLeft className={`w-5 h-5 ${isAr ? 'rotate-180' : ''}`} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {t('المكاتب المحققة للهدف وعلاوات الكادر الإداري', 'Offices Reached Target & Admin Performance Bonuses')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>{t('لائحة 1 أيار 2025 المعتمدة', 'Official May 2025 Policy')}</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30">
                  {stats.reachedOffices} {t('مكتباً محققاً للهدف', 'Offices Reached Target')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                {t(
                  'احتساب علاوة الأداء للموظفين الإداريين في الفروع ومشرفي مسؤولي القروض عند وصول نصف عدد مسؤولي القروض في الفرع إلى الهدف المطلوب من مبلغ الصرف خلال الشهر (حصول مسؤول القروض على Bonus دليل على تحقيقه للهدف).',
                  'Performance bonus calculation for administrative staff and loan officer supervisors when half of the branch loan officers reach their disbursement target (LO Bonus > 0 indicates target achievement).'
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-stretch lg:self-auto justify-end">
            {/* Apply Target Bonuses to Payroll */}
            <button
              type="button"
              onClick={handleApplyToPayroll}
              disabled={isApplying || allBeneficiaries.length === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              title={t('اعتماد وإضافة علاوة الهدف لكافة الكوادر الإدارية المستحقة في مسير الرواتب مع ملاحظة Reached Target', 'Apply target bonuses to live payroll')}
            >
              <Send className="w-4 h-4" />
              <span>{isApplying ? t('جاري التطبيق...', 'Applying...') : t('تطبيق مكافآت الهدف لمسير الرواتب', 'Apply Target Bonuses to Payroll')}</span>
            </button>

            {/* View in Payroll */}
            <button
              type="button"
              onClick={() => setActiveModuleId('payroll-mgmt')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              title={t('معاينة مسير الرواتب للتأكد من مبالغ المكافآت المضافة', 'Open live payroll sheet')}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t('معاينة مسير الرواتب', 'View in Payroll')}</span>
            </button>

            {/* Export Target Report Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title={t('تصدير تقرير المكاتب المحققة والموظفين المستحقين لإكسل', 'Export Target Report to Excel')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('تصدير إكسل', 'Export Excel')}</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Alert */}
        {syncFeedback && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="leading-relaxed">{syncFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveModuleId('payroll-mgmt')}
              className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition-colors shrink-0 cursor-pointer"
            >
              {t('فتح مسير الرواتب الآن ←', 'Open Payroll Now →')}
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          KPI SUMMARY CARDS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Reached Target Offices */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">
              {t('المكاتب المحققة للهدف', 'Offices Reached Target')}
            </span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {stats.reachedOffices}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {t(`من أصل ${stats.totalOffices} مكتباً`, `of ${stats.totalOffices} offices`)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {stats.totalOffices > 0
              ? `${Math.round((stats.reachedOffices / stats.totalOffices) * 100)}% ${t('من شبكة المكاتب حققت الهدف', 'of branch network achieved target')}`
              : '—'}
          </p>
        </div>

        {/* Card 2: Beneficiary Administrative Staff */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">
              {t('الكوادر الإدارية المستحقة للعلاوة', 'Beneficiary Admin Staff')}
            </span>
            <Users className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
              {stats.totalBeneficiaries}
            </span>
            <span className="text-xs text-slate-500 font-bold">{t('موظفاً إدارياً', 'staff')}</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {t('مدراء مكاتب، مشرفو قروض، مساعدو ائتمان، أمناء صندوق، استعلامات', 'Managers, LOS, Credit Assistants, Tellers, Receptionists')}
          </p>
        </div>

        {/* Card 3: Total Target Bonus Payout */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">
              {t('إجمالي علاوات الهدف المستحقة', 'Total Target Bonuses')}
            </span>
            <Award className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.totalBonusAmount.toLocaleString('en-US')}
            </span>
            <span className="text-xs text-slate-500 font-bold">{t('د.ع', 'IQD')}</span>
          </div>
          <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <BadgeCheck className="w-3.5 h-3.5" />
            <span>{t('مع ملاحظة "Reached Target" في البيرول', 'With note "Reached Target" in payroll')}</span>
          </p>
        </div>

        {/* Card 4: Total Loan Officers Evaluated */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">
              {t('مسؤولو القروض المحققون للبونص', 'Loan Officers Reached Target')}
            </span>
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {stats.achievedLoanOfficers}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {t(`من أصل ${stats.totalLoanOfficers} مسؤول قروض`, `of ${stats.totalLoanOfficers} LOs`)}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {stats.totalLoanOfficers > 0
              ? `${Math.round((stats.achievedLoanOfficers / stats.totalLoanOfficers) * 100)}% ${t('نسبة إنجاز مسؤولي القروض العامة', 'overall LO achievement rate')}`
              : '—'}
          </p>
        </div>
      </div>

      {/* =========================================================================
          POLICY EXPLANATION & BONUS COMPENSATION MATRIX (MATCHING USER IMAGES)
          ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('ضوابط وقانون احتساب علاوة الهدف للمكاتب (فيتاس العراق)', 'Official Policy & Target Disbursement Matrix (Vitas Iraq)')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('حسب الجدول الرسمي المعتمد الصادر بتاريخ 1 أيار 2025', 'According to official approved regulation dated May 1, 2025')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              {t('الأعداد الزوجية: النصف (>= N / 2)', 'Even LOs: Half (>= N / 2)')}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              {t('الأعداد الفردية: مثال 7 -> 3 (>= Math.floor(N / 2))', 'Odd LOs: e.g. 7 -> 3')}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/30">
              {t('سعر الصرف المعتمد:', 'Exchange Rate:')} 1$ = {activeFxRate.toLocaleString()} IQD
            </span>
          </div>
        </div>

        {/* Matrix of Role Bonuses from Image 2 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TARGET_ROLE_RULES.map((rule) => (
            <div
              key={rule.key}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-2"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? rule.titleAr : rule.titleEn}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {!isAr ? rule.titleAr : rule.titleEn}
                </span>
              </div>
              <div>
                <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {rule.bonusAmount.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {t('+ ملاحظة Reached Target', '+ Reached Target note')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          MAIN TABLE: OFFICES TARGET EVALUATION (جدول المكاتب وحالة وصول الهدف)
          ========================================================================= */}
      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute start-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('البحث باسم المكتب، الفرع، أو الموظف...', 'Search by office, branch, or employee...')}
                className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-white/5 p-1 border border-slate-200 dark:border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('جميع المكاتب', 'All Offices')} ({officesEvaluation.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('REACHED')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'REACHED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('المحققة للهدف فقط', 'Reached Only')} ({stats.reachedOffices})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('NOT_REACHED')}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'NOT_REACHED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-600 hover:text-rose-700 dark:text-rose-400'
                }`}
              >
                {t('غير المحققة', 'Not Reached')} ({officesEvaluation.length - stats.reachedOffices})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="incentives-table-header bg-slate-200/90 dark:bg-slate-800 border-b border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold">
              <tr>
                <th className="px-4 py-3 text-start">#</th>
                <th className="px-4 py-3 text-start">{t('المكتب / الفرع', 'Office / Branch')}</th>
                <th className="px-4 py-3 text-center">{t('إجمالي مسؤولي القروض', 'Total Loan Officers')}</th>
                <th className="px-4 py-3 text-center">{t('المحققون للبونص (>0)', 'LOs with Bonus > 0')}</th>
                <th className="px-4 py-3 text-center">{t('الحد المطلوب', 'Required Threshold')}</th>
                <th className="px-4 py-3 text-center">{t('نسبة الإنجاز', 'Achievement %')}</th>
                <th className="px-4 py-3 text-center">{t('حالة الهدف', 'Target Status')}</th>
                <th className="px-4 py-3 text-center">{t('الكوادر الإدارية المستحقة', 'Eligible Admin Staff')}</th>
                <th className="px-4 py-3 text-end">{t('إجمالي علاوة المكتب', 'Total Office Bonus')}</th>
                <th className="px-4 py-3 text-center">{t('التفاصيل', 'Details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredOffices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>{t('لا توجد مكاتب مطابقة لمعايير البحث الحالية', 'No offices match the selected filter.')}</p>
                  </td>
                </tr>
              ) : (
                filteredOffices.map((office, idx) => {
                  const isExpanded = expandedOffice === office.officeKey;
                  return (
                    <React.Fragment key={office.officeKey}>
                      <tr
                        className={`transition-colors ${
                          office.reachedTarget
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Building2 className={`w-4 h-4 ${office.reachedTarget ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <div>
                              <span>{isAr ? office.officeNameAr : office.officeNameEn}</span>
                              <span className="text-[10px] text-slate-400 block font-normal">
                                {!isAr ? office.officeNameAr : office.officeNameEn}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {office.totalLOs}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-lg ${
                              office.achievedLOs >= office.requiredThreshold && office.totalLOs > 0
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {office.achievedLOs}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-600 dark:text-slate-400">
                          {office.requiredThreshold}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  office.reachedTarget ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(100, office.achievementPercentage)}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] font-bold">
                              {office.achievementPercentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {office.reachedTarget ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-2xs">
                              <Trophy className="w-3.5 h-3.5 text-amber-500" />
                              <span>{t('وصل الهدف (Reached Target)', 'Reached Target')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10">
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t('لم يصل الهدف', 'Not Reached')}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold">
                          {office.beneficiaryStaff.length > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300 font-bold text-xs">
                              {office.beneficiaryStaff.length} {t('موظفاً', 'staff')}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {office.totalOfficeBonus > 0 ? (
                            <span>{office.totalOfficeBonus.toLocaleString('en-US')} {t('د.ع', 'IQD')}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedOffice(isExpanded ? null : office.officeKey)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title={isExpanded ? t('إخفاء التفاصيل', 'Hide details') : t('عرض تفاصيل مسؤولي القروض والكوادر الإدارية', 'View staff details')}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Details Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-white/[0.02]">
                          <td colSpan={10} className="p-4 border-t border-b border-slate-200 dark:border-white/10">
                            <div className="space-y-4">
                              {/* Sub-Section 1: Eligible Beneficiaries in this Winning Office */}
                              {office.reachedTarget && (
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                                    <Award className="w-4 h-4 text-emerald-600" />
                                    <span>
                                      {t(
                                        `الكوادر الإدارية المستحقة لمكافأة الهدف في ${office.officeNameAr} (ملاحظة: Reached Target)`,
                                        `Eligible Admin Staff & Bonuses in ${office.officeNameEn}`
                                      )}
                                    </span>
                                  </h4>

                                  {office.beneficiaryStaff.length === 0 ? (
                                    <p className="text-xs text-slate-400 ps-5">
                                      {t('لم يتم العثور على كوادر إدارية مرتبطة بهذا الفرع في النظام.', 'No administrative staff records linked to this branch.')}
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {office.beneficiaryStaff.map((staff) => (
                                        <div
                                          key={staff.id}
                                          className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-emerald-500/30 flex items-center justify-between gap-3 shadow-2xs"
                                        >
                                          <div>
                                            <span className="font-bold text-slate-900 dark:text-white block text-xs">
                                              {staff.fullName}
                                            </span>
                                            <span className="text-[11px] text-slate-500 block">
                                              {isAr ? staff.roleTitleAr : staff.roleTitleEn}
                                            </span>
                                            <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                                              {staff.note}
                                            </span>
                                          </div>
                                          <div className="text-end">
                                            <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                                              +{staff.bonusAmount.toLocaleString('en-US')}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{t('د.ع IQD', 'IQD')}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Sub-Section 2: Breakdown of Loan Officers in this Office */}
                              <div>
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
                                  <Users className="w-4 h-4 text-slate-400" />
                                  <span>
                                    {t(
                                      `مسؤولو القروض في المكتب (${office.loanOfficers.length} موظفاً):`,
                                      `Loan Officers in this Office (${office.loanOfficers.length} staff):`
                                    )}
                                  </span>
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                  {office.loanOfficers.map((lo, lIdx) => (
                                    <div
                                      key={lIdx}
                                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                                        lo.hasReachedBonus
                                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                                          : 'bg-white dark:bg-[#111827] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                                      }`}
                                    >
                                      <div>
                                        <span className="font-bold block truncate max-w-[150px]">{lo.name}</span>
                                        <span className="text-[10px] opacity-75">{lo.badgeNo}</span>
                                      </div>
                                      <div className="text-end">
                                        <span className="font-mono font-bold block">
                                          {lo.bonus > 0 ? `${lo.bonus.toLocaleString()} (≈ ${Math.round(lo.bonus * activeFxRate).toLocaleString()} د.ع)` : '—'}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                            lo.hasReachedBonus
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                          }`}
                                        >
                                          {lo.hasReachedBonus ? t('حقق الهدف', 'Achieved') : t('لم يحقق', 'Zero Bonus')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: ALL BENEFICIARY STAFF CONSOLIDATED TABLE
          ========================================================================= */}
      {allBeneficiaries.length > 0 && (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t('جدول الكوادر الإدارية المستحقة لمكافأة الهدف (Reached Target)', 'Consolidated Beneficiary Staff List')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(
                    `إجمالي ${allBeneficiaries.length} موظفاً في ${stats.reachedOffices} مكاتب حققت معيار صرف الهدف`,
                    `Total of ${allBeneficiaries.length} staff across ${stats.reachedOffices} winning offices`
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyToPayroll}
              disabled={isApplying}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{t('تحديث ومزامنة في مسير الرواتب', 'Sync to Payroll')}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="incentives-table-header bg-slate-200/90 dark:bg-slate-800 border-b border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold">
                <tr>
                  <th className="px-4 py-3 text-start">#</th>
                  <th className="px-4 py-3 text-start">{t('الرقم الوظيفي', 'Employee ID')}</th>
                  <th className="px-4 py-3 text-start">{t('اسم الموظف', 'Employee Name')}</th>
                  <th className="px-4 py-3 text-start">{t('المكتب / الفرع', 'Office / Branch')}</th>
                  <th className="px-4 py-3 text-start">{t('العنوان الوظيفي', 'Job Title')}</th>
                  <th className="px-4 py-3 text-end">{t('علاوة الهدف المستحقة', 'Target Bonus')}</th>
                  <th className="px-4 py-3 text-center">{t('الملاحظة المسجلة', 'Designated Note')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {allBeneficiaries.map((b, idx) => (
                  <tr key={b.id + idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">{b.employeeId}</td>
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{b.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{b.office}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <span className="font-bold">{isAr ? b.roleTitleAr : b.roleTitleEn}</span>
                    </td>
                    <td className="px-4 py-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      +{b.bonusAmount.toLocaleString('en-US')} {t('د.ع', 'IQD')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                        {b.note}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

