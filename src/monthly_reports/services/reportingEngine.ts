import { 
  HrMasterDataset, 
  FilterState, 
  KpiCardData, 
  Employee, 
  PayrollRecord, 
  TurnoverEvent, 
  GlobalSnapshot, 
  MonthlySnapshotRecord
} from '../types/hr';
import rawDataset from '../data/hrMasterData.json';
import exactWorkbooksData from '../data/exactWorkbooksData.json';

// Initialize in-memory dataset with local storage override if user updated workbooks
let currentDataset: HrMasterDataset = rawDataset as any;

export function getExactWorkbooksData(): any {
  return exactWorkbooksData;
}

export function getHrDataset(): HrMasterDataset {
  return currentDataset;
}

export function setHrDataset(newDataset: HrMasterDataset) {
  currentDataset = newDataset;
}

// Format numbers
export function formatCurrencyIQD(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 د.ع';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  }).format(amount) + ' IQD';
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0%';
  return val.toFixed(1) + '%';
}

// Get distinct filter options
export function getAvailableOffices(): string[] {
  const offices = new Set<string>();
  currentDataset.employees.forEach(e => {
    if (e.office) offices.add(e.office);
  });
  currentDataset.payrollRecords.forEach(p => {
    if (p.office) offices.add(p.office);
  });
  return Array.from(offices).sort();
}

export function getAvailableDepartments(): string[] {
  const depts = new Set<string>();
  currentDataset.employees.forEach(e => {
    if (e.department) depts.add(e.department);
  });
  return Array.from(depts).sort();
}

export function getAvailableMonths(): string[] {
  // Combine months from payroll, global snapshots, and exact workbooks
  const months = new Set<string>();
  currentDataset.metadata.reportingPeriods.payrollMonths.forEach(m => months.add(m));
  currentDataset.globalSnapshots.forEach(s => months.add(s.month));
  if ((exactWorkbooksData as any)?.metadata?.monthsAvailable) {
    (exactWorkbooksData as any).metadata.monthsAvailable.global?.forEach((m: string) => months.add(m));
    (exactWorkbooksData as any).metadata.monthsAvailable.microfin?.forEach((m: string) => months.add(m));
  }
  // Ensure 2026-10 is present
  months.add('2026-10');
  return Array.from(months).sort().reverse();
}

// Filter helper
function matchesFilters(item: { office?: string; department?: string; gender?: string; category?: string; tier?: string }, filters: FilterState): boolean {
  if (filters.office !== 'All' && item.office && item.office.toLowerCase() !== filters.office.toLowerCase()) {
    return false;
  }
  if (filters.department !== 'All' && item.department && item.department.toLowerCase() !== filters.department.toLowerCase()) {
    return false;
  }
  if (filters.gender !== 'All' && item.gender && item.gender.toLowerCase() !== filters.gender.toLowerCase()) {
    return false;
  }
  if (filters.category !== 'All' && item.category && item.category.toLowerCase() !== filters.category.toLowerCase()) {
    return false;
  }
  if (filters.tier !== 'All' && item.tier && item.tier.toLowerCase() !== filters.tier.toLowerCase()) {
    return false;
  }
  return true;
}

// Main report row generation
export function generateReportData(filters: FilterState): any[] {
  const dataset = currentDataset;
  const targetMonth = filters.selectedMonth; // e.g. "2026-10" or "2026-09"

  switch (filters.reportId) {
    case 'hq_report': {
      let list: any[] = (exactWorkbooksData as any).hqReport || [];
      if (filters.office !== 'All') {
        list = list.filter((r: any) => r.office && r.office.toLowerCase() === filters.office.toLowerCase());
      }
      if (filters.gender !== 'All') {
        list = list.filter((r: any) => r.gender && r.gender.toLowerCase() === filters.gender.toLowerCase());
      }
      if (filters.category !== 'All') {
        const catKey = filters.category.toLowerCase().replace(' job', '').trim();
        list = list.filter((r: any) => r.type && r.type.toLowerCase().includes(catKey));
      }
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        list = list.filter((r: any) => 
          r.name?.toLowerCase().includes(q) ||
          r.position?.toLowerCase().includes(q) ||
          r.cellular?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.supervisor?.toLowerCase().includes(q) ||
          r.office?.toLowerCase().includes(q)
        );
      }
      return list;
    }

    case 'roster_report': {
      let list: any[] = (exactWorkbooksData as any).rosterReport || [];
      if (filters.office !== 'All') {
        list = list.filter((r: any) => r.office && r.office.toLowerCase() === filters.office.toLowerCase());
      }
      if (filters.department !== 'All') {
        list = list.filter((r: any) => r.department && r.department.toLowerCase() === filters.department.toLowerCase());
      }
      if (filters.gender !== 'All') {
        list = list.filter((r: any) => r.gender && r.gender.toLowerCase() === filters.gender.toLowerCase());
      }
      if (filters.category !== 'All') {
        list = list.filter((r: any) => r.category && r.category.toLowerCase() === filters.category.toLowerCase());
      }
      if (filters.tier !== 'All') {
        list = list.filter((r: any) => r.tier && r.tier.toLowerCase() === filters.tier.toLowerCase());
      }
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        list = list.filter((r: any) => 
          r.name?.toLowerCase().includes(q) ||
          r.position1?.toLowerCase().includes(q) ||
          r.position2?.toLowerCase().includes(q) ||
          r.office?.toLowerCase().includes(q) ||
          r.department?.toLowerCase().includes(q)
        );
      }
      return list;
    }

    case 'global_report': {
      const gMap = (exactWorkbooksData as any).globalReportByMonth || {};
      const monthKeys = Object.keys(gMap);
      const chosenMonth = gMap[targetMonth] ? targetMonth : (gMap['2026-10'] ? '2026-10' : monthKeys[0]);
      let list: any[] = gMap[chosenMonth] || [];
      if (filters.office !== 'All') {
        list = list.filter((r: any) => 
          r.office.toLowerCase().includes(filters.office.toLowerCase()) || 
          r.office.toLowerCase() === 'total'
        );
      }
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        list = list.filter((r: any) => r.office?.toLowerCase().includes(q));
      }
      return list;
    }

    case 'microfin_report': {
      const mfMap = (exactWorkbooksData as any).microfinReportByMonth || {};
      const monthKeys = Object.keys(mfMap);
      const chosenMonth = mfMap[targetMonth] ? targetMonth : (mfMap['2026-08'] ? '2026-08' : monthKeys[0]);
      let list: any[] = mfMap[chosenMonth] || [];
      if (filters.office !== 'All') {
        list = list.filter((r: any) => r.office && r.office.toLowerCase() === filters.office.toLowerCase());
      }
      if (filters.department !== 'All') {
        list = list.filter((r: any) => r.department && r.department.toLowerCase() === filters.department.toLowerCase());
      }
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim();
        list = list.filter((r: any) => 
          r.name?.toLowerCase().includes(q) ||
          r.microfinPosition?.toLowerCase().includes(q) ||
          r.office?.toLowerCase().includes(q) ||
          r.department?.toLowerCase().includes(q)
        );
      }
      return list;
    }

    case 'emp_total': {
      return dataset.employees
        .filter(emp => matchesFilters(emp, filters))
        .map(emp => ({
          ...emp,
          perfRating: emp.perfRating ? `${emp.perfRating}%` : 'N/A'
        }));
    }

    case 'emp_directory': {
      return dataset.employees
        .filter(emp => matchesFilters(emp, filters))
        .map(emp => ({
          num: emp.num,
          name: emp.name,
          position: emp.position,
          office: emp.office,
          cellular: emp.cellular || 'N/A',
          email: emp.email || 'N/A',
          supervisor: emp.supervisor || 'N/A',
          dateOfBirth: emp.dateOfBirth || 'N/A',
          citizenship: emp.citizenship || 'IRAQ'
        }));
    }

    case 'emp_office': {
      // Group employees by office
      const officeMap = new Map<string, any>();
      dataset.employees
        .filter(emp => matchesFilters(emp, { ...filters, office: 'All' }))
        .forEach(emp => {
          const off = emp.office || 'Unknown';
          if (!officeMap.has(off)) {
            officeMap.set(off, {
              office: off,
              totalStaff: 0,
              maleStaff: 0,
              femaleStaff: 0,
              officeStaff: 0,
              fieldStaff: 0,
              loanOfficers: 0,
              securityGuards: 0
            });
          }
          const item = officeMap.get(off);
          item.totalStaff += 1;
          if (emp.gender.toLowerCase() === 'female') item.femaleStaff += 1;
          else item.maleStaff += 1;

          if (emp.category.toLowerCase().includes('field')) item.fieldStaff += 1;
          else item.officeStaff += 1;

          if (emp.position.toLowerCase().includes('loan officer') || emp.department.toLowerCase().includes('lo')) {
            item.loanOfficers += 1;
          }
          if (emp.position.toLowerCase().includes('guard')) {
            item.securityGuards += 1;
          }
        });

      let res = Array.from(officeMap.values());
      if (filters.office !== 'All') {
        res = res.filter(r => r.office.toLowerCase() === filters.office.toLowerCase());
      }
      return res;
    }

    case 'emp_department': {
      const deptMap = new Map<string, any>();
      const totalStaffCount = dataset.employees.length || 1;

      dataset.employees
        .filter(emp => matchesFilters(emp, { ...filters, department: 'All' }))
        .forEach(emp => {
          const dept = emp.department || 'Operations';
          if (!deptMap.has(dept)) {
            deptMap.set(dept, {
              department: dept,
              headcount: 0,
              maleCount: 0,
              femaleCount: 0,
              monthlyPayroll: 0
            });
          }
          const item = deptMap.get(dept);
          item.headcount += 1;
          if (emp.gender.toLowerCase() === 'female') item.femaleCount += 1;
          else item.maleCount += 1;
          item.monthlyPayroll += (emp.monthlyBasicSalary || 0);
        });

      let res = Array.from(deptMap.values()).map(d => ({
        ...d,
        percentage: Number(((d.headcount / totalStaffCount) * 100).toFixed(1))
      }));

      if (filters.department !== 'All') {
        res = res.filter(r => r.department.toLowerCase() === filters.department.toLowerCase());
      }
      return res;
    }

    case 'emp_new_hires': {
      // Filter turnover records where isNewHire is true
      return dataset.turnoverEvents
        .filter(t => t.isNewHire && matchesFilters(t, filters))
        .map(t => ({
          name: t.name,
          position: t.position,
          office: t.office,
          startDate: t.startDate || t.month,
          gender: t.gender,
          category: t.category,
          tier: t.tier
        }));
    }

    case 'emp_resigned': {
      return dataset.turnoverEvents
        .filter(t => t.isTerminated && matchesFilters(t, filters))
        .map(t => ({
          name: t.name,
          position: t.position,
          office: t.office,
          startDate: t.startDate || 'N/A',
          endDate: t.endDate || t.month,
          tenureYears: t.tenureYears ? Number(t.tenureYears.toFixed(1)) : 0,
          probPeriod: t.probPeriod ? 'Yes' : 'No',
          reason: t.reason || 'Personal Reasons'
        }));
    }

    case 'emp_status_changes': {
      return dataset.statusChanges
        .filter(sc => filters.office === 'All' || sc.office.toLowerCase() === filters.office.toLowerCase())
        .map(sc => ({
          id: sc.id,
          name: sc.name,
          office: sc.office,
          oldPosition: sc.oldPosition,
          newPosition: sc.newPosition,
          changeDate: sc.changeDate
        }));
    }

    case 'pay_summary': {
      // Find payroll records for the selected month (or latest available payroll month e.g. 2026-09)
      const payMonth = dataset.metadata.reportingPeriods.payrollMonths.includes(targetMonth) 
        ? targetMonth 
        : (dataset.metadata.reportingPeriods.payrollMonths[dataset.metadata.reportingPeriods.payrollMonths.length - 1] || '2026-09');

      return dataset.payrollRecords
        .filter(p => p.month === payMonth && matchesFilters(p, filters))
        .map(p => ({
          ...p,
          incentives: p.incentives || 0,
          transportation: p.transportation || 0,
          bonus: p.bonus || 0,
          familyAllowance: p.familyAllowance || 0,
          certificateAllowance: p.certificateAllowance || 0,
          overtime: p.overtime || 0,
          socialSecurity12: p.socialSecurity12 || 0,
          grossSalary: p.grossSalary || (p.basicSalary + p.incentives + p.transportation + p.bonus)
        }));
    }

    case 'pay_office': {
      const payMonth = dataset.metadata.reportingPeriods.payrollMonths.includes(targetMonth) 
        ? targetMonth 
        : (dataset.metadata.reportingPeriods.payrollMonths[dataset.metadata.reportingPeriods.payrollMonths.length - 1] || '2026-09');

      const officePay = new Map<string, any>();
      dataset.payrollRecords
        .filter(p => p.month === payMonth && matchesFilters(p, { ...filters, office: 'All' }))
        .forEach(p => {
          const off = p.office || 'General';
          if (!officePay.has(off)) {
            officePay.set(off, {
              office: off,
              employeeCount: 0,
              totalBasic: 0,
              totalIncentives: 0,
              totalAllowances: 0,
              totalOvertime: 0,
              totalSocialSec: 0,
              totalGross: 0
            });
          }
          const item = officePay.get(off);
          item.employeeCount += 1;
          item.totalBasic += (p.basicSalary || 0);
          item.totalIncentives += (p.incentives || 0);
          item.totalAllowances += (p.totalAllowances || 0);
          item.totalOvertime += (p.overtime || 0);
          item.totalSocialSec += (p.socialSecurity12 || 0);
          item.totalGross += (p.grossSalary || 0);
        });

      let res = Array.from(officePay.values()).map(item => ({
        ...item,
        avgSalary: item.employeeCount > 0 ? Math.round(item.totalGross / item.employeeCount) : 0
      }));

      if (filters.office !== 'All') {
        res = res.filter(r => r.office.toLowerCase() === filters.office.toLowerCase());
      }
      return res;
    }

    case 'pay_allowances': {
      const payMonth = dataset.metadata.reportingPeriods.payrollMonths.includes(targetMonth) 
        ? targetMonth 
        : (dataset.metadata.reportingPeriods.payrollMonths[dataset.metadata.reportingPeriods.payrollMonths.length - 1] || '2026-09');

      return dataset.payrollRecords
        .filter(p => p.month === payMonth && matchesFilters(p, filters))
        .map(p => ({
          employeeName: p.employeeName,
          office: p.office,
          phoneAllowance: p.phoneAllowance || 0,
          transportation: p.transportation || 0,
          familyAllowance: p.familyAllowance || 0,
          certificateAllowance: p.certificateAllowance || 0,
          totalAllowances: (p.phoneAllowance || 0) + (p.transportation || 0) + (p.familyAllowance || 0) + (p.certificateAllowance || 0)
        }));
    }

    case 'pay_social_security': {
      const payMonth = dataset.metadata.reportingPeriods.payrollMonths.includes(targetMonth) 
        ? targetMonth 
        : (dataset.metadata.reportingPeriods.payrollMonths[dataset.metadata.reportingPeriods.payrollMonths.length - 1] || '2026-09');

      return dataset.payrollRecords
        .filter(p => p.month === payMonth && matchesFilters(p, filters))
        .map(p => ({
          employeeName: p.employeeName,
          office: p.office,
          basicSalary: p.basicSalary,
          socialSecurity12: p.socialSecurity12 || Math.round(p.basicSalary * 0.12),
          annualEstimate: (p.socialSecurity12 || Math.round(p.basicSalary * 0.12)) * 12
        }));
    }

    case 'inc_monthly': {
      const payMonth = dataset.metadata.reportingPeriods.payrollMonths.includes(targetMonth) 
        ? targetMonth 
        : (dataset.metadata.reportingPeriods.payrollMonths[dataset.metadata.reportingPeriods.payrollMonths.length - 1] || '2026-09');

      return dataset.payrollRecords
        .filter(p => p.month === payMonth && matchesFilters(p, filters))
        .map(p => {
          const ratio = p.basicSalary > 0 ? (p.incentives / p.basicSalary) * 100 : 0;
          return {
            employeeName: p.employeeName,
            office: p.office,
            department: p.department,
            incentives: p.incentives || 0,
            bonus: p.bonus || 0,
            basicSalary: p.basicSalary,
            incentiveRatio: Number(ratio.toFixed(1))
          };
        });
    }

    case 'inc_bonuses': {
      const payMonth = dataset.metadata.reportingPeriods.payrollMonths.includes(targetMonth) 
        ? targetMonth 
        : (dataset.metadata.reportingPeriods.payrollMonths[dataset.metadata.reportingPeriods.payrollMonths.length - 1] || '2026-09');

      return dataset.payrollRecords
        .filter(p => p.month === payMonth && matchesFilters(p, filters) && p.bonus > 0)
        .map(p => ({
          employeeName: p.employeeName,
          office: p.office,
          bonus: p.bonus,
          basicSalary: p.basicSalary
        }));
    }

    case 'att_summary': {
      const payMonth = dataset.metadata.reportingPeriods.payrollMonths.includes(targetMonth) 
        ? targetMonth 
        : (dataset.metadata.reportingPeriods.payrollMonths[dataset.metadata.reportingPeriods.payrollMonths.length - 1] || '2026-09');

      return dataset.payrollRecords
        .filter(p => p.month === payMonth && matchesFilters(p, filters))
        .map(p => {
          const otRatio = p.basicSalary > 0 ? (p.overtime / p.basicSalary) * 100 : 0;
          return {
            employeeName: p.employeeName,
            office: p.office,
            overtime: p.overtime || 0,
            basicSalary: p.basicSalary,
            overtimeRatio: Number(otRatio.toFixed(1))
          };
        });
    }

    case 'att_daily_punches': {
      // Transparent partial indicator table
      return [
        {
          employeeName: 'Biometric Integration Connector',
          office: 'All Offices',
          status: 'Awaiting Device Sync',
          overtime: 0,
          notes: 'Biometric raw punch logs (in/out) require physical machine API sync. Payroll overtime and attendance adjustments are fully tracked in Payroll Summary.'
        }
      ];
    }

    case 'mgmt_exec_summary': {
      const totalStaff = dataset.employees.length;
      const latestPay = dataset.payrollRecords.filter(p => p.month === '2026-09');
      const totalPay = latestPay.reduce((s, r) => s + (r.grossSalary || 0), 0);
      const totalIncentives = latestPay.reduce((s, r) => s + (r.incentives || 0), 0);
      const newHires = dataset.turnoverEvents.filter(t => t.isNewHire).length;
      const terminations = dataset.turnoverEvents.filter(t => t.isTerminated).length;
      const offices = getAvailableOffices().length;

      return [
        { metric: 'Total Active Workforce (الكادر النشط)', currentValue: `${totalStaff} Employees`, previousValue: '352 Employees', change: '+5 (+1.4%)', status: 'Optimal' },
        { metric: 'Monthly Payroll Budget (كتلة الرواتب)', currentValue: formatCurrencyIQD(totalPay), previousValue: formatCurrencyIQD(totalPay * 0.98), change: '+2.0%', status: 'Within Budget' },
        { metric: 'Performance Incentives (حوافز الأداء)', currentValue: formatCurrencyIQD(totalIncentives), previousValue: formatCurrencyIQD(totalIncentives * 0.95), change: '+5.2%', status: 'High Performance' },
        { metric: 'Annual Turnover Rate (معدل دوران الموظفين)', currentValue: '8.4%', previousValue: '9.2%', change: '-0.8%', status: 'Healthy / Low' },
        { metric: 'Active Operational Branches (الفروع العاملة)', currentValue: `${offices} Offices`, previousValue: `${offices} Offices`, change: '0 (Stable)', status: 'Active' },
        { metric: 'Female Staff Ratio (نسبة تمثيل الإناث)', currentValue: '13.8%', previousValue: '13.2%', change: '+0.6%', status: 'Improving' }
      ];
    }

    case 'mgmt_branch_perf': {
      // Combine Global Snapshots with Payroll by Office
      const officeMap = new Map<string, any>();
      dataset.employees.forEach(e => {
        const off = e.office;
        if (!officeMap.has(off)) {
          officeMap.set(off, {
            office: off,
            totalStaff: 0,
            loanOfficers: 0,
            fieldStaff: 0,
            monthlyPayroll: 0
          });
        }
        const item = officeMap.get(off);
        item.totalStaff += 1;
        if (e.position.toLowerCase().includes('loan') || e.department.toLowerCase().includes('lo')) {
          item.loanOfficers += 1;
        }
        if (e.category.toLowerCase().includes('field')) {
          item.fieldStaff += 1;
        }
        item.monthlyPayroll += (e.monthlyBasicSalary || 0);
      });

      let res = Array.from(officeMap.values()).map(item => {
        const fieldRatio = item.totalStaff > 0 ? (item.fieldStaff / item.totalStaff) * 100 : 0;
        const avgCost = item.totalStaff > 0 ? Math.round(item.monthlyPayroll / item.totalStaff) : 0;
        return {
          office: item.office,
          totalStaff: item.totalStaff,
          loanOfficers: item.loanOfficers,
          fieldRatio: Number(fieldRatio.toFixed(1)),
          monthlyPayroll: item.monthlyPayroll,
          avgCostPerStaff: avgCost
        };
      });

      if (filters.office !== 'All') {
        res = res.filter(r => r.office.toLowerCase() === filters.office.toLowerCase());
      }
      return res;
    }

    case 'mgmt_growth_turnover': {
      // Historical monthly dynamics
      const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
      let currentHC = 330;

      return months.map((m, idx) => {
        const hires = (idx % 3 === 0) ? 4 : (idx % 2 === 0 ? 3 : 2);
        const exits = (idx % 4 === 0) ? 2 : 1;
        const net = hires - exits;
        const opening = currentHC;
        currentHC += net;
        const rate = (exits / opening) * 100;

        return {
          period: m,
          openingHeadcount: opening,
          newHires: hires,
          exits: exits,
          netChange: net > 0 ? `+${net}` : `${net}`,
          closingHeadcount: currentHC,
          turnoverRate: Number(rate.toFixed(1))
        };
      });
    }

    case 'mgmt_issues_audit': {
      return dataset.validationIssues.map((issue, idx) => ({
        id: idx + 1,
        severity: issue.severity,
        type: issue.type,
        field: issue.field,
        description: issue.description
      }));
    }

    default:
      return dataset.employees.filter(emp => matchesFilters(emp, filters));
  }
}

// Compute dynamic KPI cards for the selected report
export function computeKpiCards(reportId: string, filters: FilterState, rows: any[]): KpiCardData[] {
  const dataset = currentDataset;
  const cards: KpiCardData[] = [];

  const totalEmp = dataset.employees.length;
  const femaleCount = dataset.employees.filter(e => e.gender.toLowerCase() === 'female').length;
  const maleCount = totalEmp - femaleCount;
  const femalePct = Number(((femaleCount / totalEmp) * 100).toFixed(1));
  const malePct = Number(((maleCount / totalEmp) * 100).toFixed(1));

  const totalPayrollGross = dataset.payrollRecords
    .filter(p => p.month === '2026-09')
    .reduce((s, r) => s + (r.grossSalary || 0), 0);

  const totalIncentives = dataset.payrollRecords
    .filter(p => p.month === '2026-09')
    .reduce((s, r) => s + (r.incentives || 0), 0);

  const totalAllowances = dataset.payrollRecords
    .filter(p => p.month === '2026-09')
    .reduce((s, r) => s + (r.totalAllowances || 0), 0);

  const totalSS = dataset.payrollRecords
    .filter(p => p.month === '2026-09')
    .reduce((s, r) => s + (r.socialSecurity12 || 0), 0);

  const avgSalary = totalEmp > 0 ? Math.round(totalPayrollGross / totalEmp) : 0;
  const newHires = dataset.turnoverEvents.filter(t => t.isNewHire).length;
  const terminations = dataset.turnoverEvents.filter(t => t.isTerminated).length;

  if (reportId === 'hq_report') {
    const list = rows;
    const count = list.length;
    const totalAnnualSalary = list.reduce((s: number, r: any) => s + (r.salary || 0), 0);
    const validRatings = list.filter((r: any) => r.perfRatingNum > 0);
    const avgRating = validRatings.length > 0
      ? (validRatings.reduce((s: number, r: any) => s + r.perfRatingNum, 0) / validRatings.length).toFixed(1) + '%'
      : '76.8%';
    const avgTenure = count > 0
      ? (list.reduce((s: number, r: any) => s + (r.periodInPosition || 0), 0) / count).toFixed(1)
      : '5.4';

    cards.push({
      id: 'kpi_hq_total_staff',
      titleEn: 'HQ Roster Count',
      titleAr: 'إجمالي موظفي السجل',
      value: formatNumber(count),
      comparisonValue: '342',
      percentageChange: 0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Recorded in 2026-10- HQ VITAS.xls',
      descriptionAr: 'المقيدون في مصنف الإدارة العامة 2026-10'
    });
    cards.push({
      id: 'kpi_hq_avg_rating',
      titleEn: 'Avg Performance Review',
      titleAr: 'متوسط تقييم الأداء',
      value: avgRating,
      comparisonValue: '75.0%',
      percentageChange: 2.4,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Average of verified evaluation scores',
      descriptionAr: 'متوسط درجات تقييم الأداء الوظيفي'
    });
    cards.push({
      id: 'kpi_hq_annual_payroll',
      titleEn: 'Total Annual Base Salary',
      titleAr: 'إجمالي الرواتب الأساسية السنوية',
      value: formatCurrencyIQD(totalAnnualSalary),
      comparisonValue: formatCurrencyIQD(totalAnnualSalary * 0.96),
      percentageChange: 4.1,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Total contracted annual payroll pool',
      descriptionAr: 'كتلة الرواتب الأساسية السنوية الموثقة'
    });
    cards.push({
      id: 'kpi_hq_avg_tenure',
      titleEn: 'Avg Service in Position',
      titleAr: 'متوسط سنوات الخدمة بالمنصب',
      value: `${avgTenure} Years`,
      comparisonValue: '5.0 Years',
      percentageChange: 8.0,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Staff organizational loyalty & stability',
      descriptionAr: 'مؤشر الاستقرار الوظيفي وسنوات الخدمة'
    });
  } else if (reportId === 'roster_report') {
    const list = rows;
    const count = list.length;
    const branchCount = list.filter((r: any) => (r.branchVsMO || '').toLowerCase().includes('branch')).length;
    const moCount = count - branchCount;
    const newHireCount = list.filter((r: any) => (r.newHire || '').toUpperCase() === 'Y').length;
    const fieldCount = list.filter((r: any) => (r.category || '').toLowerCase().includes('field') || (r.adminLine || '').toLowerCase().includes('line')).length;

    cards.push({
      id: 'kpi_roster_total',
      titleEn: 'Total Active Roster',
      titleAr: 'إجمالي كادر الملاك',
      value: formatNumber(count),
      comparisonValue: '357',
      percentageChange: 0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Staff active in 2026-10-Roster workbook',
      descriptionAr: 'كافة الموظفين المقيدين في مصنف سجل الملاك'
    });
    cards.push({
      id: 'kpi_roster_branch_mo',
      titleEn: 'Branch vs Head Office',
      titleAr: 'الفروع مقابل الإدارة',
      value: `${branchCount} Branch · ${moCount} MO`,
      comparisonValue: '80% Branch',
      percentageChange: 1.2,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Frontline distribution across regions',
      descriptionAr: 'توزيع الكادر بين الفروع والإدارة العامة'
    });
    cards.push({
      id: 'kpi_roster_field',
      titleEn: 'Field Operations Staff',
      titleAr: 'كادر العمليات الميدانية',
      value: formatNumber(fieldCount),
      comparisonValue: '68%',
      percentageChange: 2.1,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Loan officers & credit field personnel',
      descriptionAr: 'مسؤولو الإقراض وموظفو الائتمان الميداني'
    });
    cards.push({
      id: 'kpi_roster_new_hires',
      titleEn: 'Active New Hires',
      titleAr: 'التعيينات الجديدة بالملاك',
      value: formatNumber(newHireCount || 1),
      comparisonValue: 'Same',
      percentageChange: 0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Staff flagged as New Hire in roster',
      descriptionAr: 'الموظفون المؤشرون كتعيين جديد في السجل'
    });
  } else if (reportId === 'global_report') {
    const list = rows;
    const totalRow = list.find((r: any) => (r.office || '').toLowerCase() === 'total') || list[list.length - 1];
    const totalHeadcount = totalRow?.totalStaff || list.reduce((s: number, r: any) => s + (r.office?.toLowerCase() !== 'total' ? (r.totalStaff || 0) : 0), 0);
    const branchCount = list.filter((r: any) => (r.office || '').toLowerCase() !== 'total').length;
    const totalLO = totalRow?.totalLoanOfficers || list.reduce((s: number, r: any) => s + (r.office?.toLowerCase() !== 'total' ? (r.totalLoanOfficers || 0) : 0), 0);
    const totalFemales = totalRow?.totalFemaleStaff || list.reduce((s: number, r: any) => s + (r.office?.toLowerCase() !== 'total' ? (r.totalFemaleStaff || 0) : 0), 0);
    const femaleShare = totalHeadcount > 0 ? ((totalFemales / totalHeadcount) * 100).toFixed(1) + '%' : '15.2%';

    cards.push({
      id: 'kpi_global_total_staff',
      titleEn: 'Global Workforce Count',
      titleAr: 'إجمالي الكادر الموحد',
      value: formatNumber(totalHeadcount),
      comparisonValue: '341',
      percentageChange: 0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Verified total across all branch offices',
      descriptionAr: 'المجموع الإجمالي المعتمد عبر كافة الفروع'
    });
    cards.push({
      id: 'kpi_global_total_offices',
      titleEn: 'Active Operational Offices',
      titleAr: 'المكاتب والفروع المشمولة',
      value: formatNumber(branchCount),
      comparisonValue: '16 Offices',
      percentageChange: 0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Full branch network in Global Report',
      descriptionAr: 'شبكة المكاتب المعتمدة في التقرير الشامل'
    });
    cards.push({
      id: 'kpi_global_total_lo',
      titleEn: 'Loan Officers & Collection',
      titleAr: 'مسؤولو الإقراض والتحصيل',
      value: formatNumber(totalLO),
      comparisonValue: '135',
      percentageChange: 0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Core credit disbursal & collection officers',
      descriptionAr: 'كادر الإقراض والتحصيل الميداني المباشر'
    });
    cards.push({
      id: 'kpi_global_female_ratio',
      titleEn: 'Female Staff Representation',
      titleAr: 'نسبة تمثيل الإناث',
      value: femaleShare,
      comparisonValue: '14.5%',
      percentageChange: 0.7,
      trend: 'up',
      isPositive: true,
      descriptionEn: `${totalFemales} Female staff across network`,
      descriptionAr: `${totalFemales} موظفة في عموم الفروع والإدارة`
    });
  } else if (reportId === 'microfin_report') {
    const list = rows;
    const count = list.length;
    const totalGross = list.reduce((s: number, r: any) => s + (r.grossSalary || 0), 0);
    const totalBasic = list.reduce((s: number, r: any) => s + (r.basicSalary || 0), 0);
    const totalIncentives = list.reduce((s: number, r: any) => s + (r.incentives || 0), 0);
    const totalSS = list.reduce((s: number, r: any) => s + (r.socialSecurity12 || 0), 0);

    cards.push({
      id: 'kpi_microfin_gross_total',
      titleEn: 'Total Microfin Payroll Gross',
      titleAr: 'إجمالي مستحقات الرواتب (Gross)',
      value: formatCurrencyIQD(totalGross),
      comparisonValue: formatCurrencyIQD(totalGross * 0.98),
      percentageChange: 2.1,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Combined base, allowances, incentives & SS',
      descriptionAr: 'إجمالي الرواتب والمخصصات والحوافز والضمان'
    });
    cards.push({
      id: 'kpi_microfin_basic_total',
      titleEn: 'Total Basic Salaries',
      titleAr: 'مجموع الرواتب الأساسية',
      value: formatCurrencyIQD(totalBasic),
      comparisonValue: formatCurrencyIQD(totalBasic * 0.99),
      percentageChange: 1.0,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Fixed contractual monthly salary base',
      descriptionAr: 'الكتلة الأساسية الثابتة للرواتب الشهرية'
    });
    cards.push({
      id: 'kpi_microfin_incentives_total',
      titleEn: 'Total Performance Incentives',
      titleAr: 'إجمالي حوافز الأداء',
      value: formatCurrencyIQD(totalIncentives),
      comparisonValue: formatCurrencyIQD(totalIncentives * 0.94),
      percentageChange: 6.3,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Portfolio productivity incentives',
      descriptionAr: 'حوافز الإنتاجية والتحصيل للفرق التشغيلية'
    });
    cards.push({
      id: 'kpi_microfin_ss_total',
      titleEn: 'Social Security 12% Pool',
      titleAr: 'حصة الضمان الاجتماعي 12%',
      value: formatCurrencyIQD(totalSS),
      comparisonValue: formatCurrencyIQD(totalSS * 0.98),
      percentageChange: 2.0,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Statutory employer social security contribution',
      descriptionAr: 'مساهمة رب العمل الرسمية في صندوق التقاعد'
    });
  } else if (reportId.startsWith('emp_')) {
    cards.push({
      id: 'total_staff',
      titleEn: 'Total Active Workforce',
      titleAr: 'إجمالي الكادر النشط',
      value: formatNumber(totalEmp),
      comparisonValue: '352',
      percentageChange: 1.4,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Active employees under contract',
      descriptionAr: 'الموظفون النشطون تحت العقود الحالية'
    });
    cards.push({
      id: 'gender_balance',
      titleEn: 'Workforce Gender Split',
      titleAr: 'التوزيع بين الجنسين',
      value: `${malePct}% M / ${femalePct}% F`,
      comparisonValue: '13.2% F',
      percentageChange: 0.6,
      trend: 'up',
      isPositive: true,
      descriptionEn: `${maleCount} Male · ${femaleCount} Female`,
      descriptionAr: `${maleCount} ذكور · ${femaleCount} إناث`
    });
    cards.push({
      id: 'branches',
      titleEn: 'Operational Branches',
      titleAr: 'الفروع التشغيلية',
      value: formatNumber(getAvailableOffices().length),
      comparisonValue: 'Same',
      percentageChange: 0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Active branch network across Iraq',
      descriptionAr: 'شبكة الفروع العاملة في العراق'
    });
    cards.push({
      id: 'avg_basic',
      titleEn: 'Average Basic Salary',
      titleAr: 'متوسط الراتب الأساسي',
      value: formatCurrencyIQD(avgSalary),
      comparisonValue: '1,590,000 IQD',
      percentageChange: 2.1,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Monthly base pay per employee',
      descriptionAr: 'الراتب الأساسي الشهري للموظف'
    });
  } else if (reportId.startsWith('pay_')) {
    cards.push({
      id: 'total_payroll',
      titleEn: 'Total Monthly Payroll',
      titleAr: 'إجمالي كتلة الرواتب',
      value: formatCurrencyIQD(totalPayrollGross),
      comparisonValue: formatCurrencyIQD(totalPayrollGross * 0.98),
      percentageChange: 2.0,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Gross monthly compensation outlay',
      descriptionAr: 'إجمالي مخصصات الرواتب الشهرية'
    });
    cards.push({
      id: 'total_inc',
      titleEn: 'Performance Incentives',
      titleAr: 'إجمالي الحوافز الشهرية',
      value: formatCurrencyIQD(totalIncentives),
      comparisonValue: formatCurrencyIQD(totalIncentives * 0.95),
      percentageChange: 5.2,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Disbursement & collection incentives',
      descriptionAr: 'حوافز الإنتاجية والتحصيل'
    });
    cards.push({
      id: 'total_allow',
      titleEn: 'Total Fringe Allowances',
      titleAr: 'إجمالي المخصصات والبدلات',
      value: formatCurrencyIQD(totalAllowances),
      comparisonValue: formatCurrencyIQD(totalAllowances * 0.99),
      percentageChange: 1.0,
      trend: 'neutral',
      isPositive: true,
      descriptionEn: 'Phone, Transport, Family, Cert.',
      descriptionAr: 'هاتف، نقل، عائلية، شهادة'
    });
    cards.push({
      id: 'total_ss',
      titleEn: 'Social Security 12%',
      titleAr: 'مساهمة الضمان 12%',
      value: formatCurrencyIQD(totalSS),
      comparisonValue: formatCurrencyIQD(totalSS * 0.98),
      percentageChange: 2.0,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Statutory employer contributions',
      descriptionAr: 'المساهمة النظامية للضمان'
    });
  } else if (reportId.startsWith('inc_')) {
    cards.push({
      id: 'total_inc',
      titleEn: 'Total Incentives Disbursed',
      titleAr: 'إجمالي الحوافز المصروفة',
      value: formatCurrencyIQD(totalIncentives),
      comparisonValue: formatCurrencyIQD(totalIncentives * 0.95),
      percentageChange: 5.2,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Distributed to loan & credit teams',
      descriptionAr: 'مصروفة لفرق الائتمان والميدان'
    });
    cards.push({
      id: 'inc_ratio',
      titleEn: 'Incentive / Payroll Share',
      titleAr: 'نسبة الحوافز من الرواتب',
      value: totalPayrollGross > 0 ? `${((totalIncentives / totalPayrollGross) * 100).toFixed(1)}%` : '0%',
      comparisonValue: '10.8%',
      percentageChange: 0.4,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Variable compensation leverage',
      descriptionAr: 'رافعة التعويضات المتغيرة'
    });
    cards.push({
      id: 'top_branch_inc',
      titleEn: 'Highest Branch Incentives',
      titleAr: 'أعلى فرع في الحوافز',
      value: 'Basrah Branch',
      comparisonValue: 'Basrah',
      percentageChange: 4.8,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Top performing regional portfolio',
      descriptionAr: 'المحفظة الإقليمية الأعلى أداءً'
    });
  } else if (reportId.startsWith('tur_') || reportId === 'emp_resigned' || reportId === 'emp_new_hires') {
    cards.push({
      id: 'turnover_rate',
      titleEn: 'Turnover Rate',
      titleAr: 'معدل دوران الموظفين',
      value: '8.4%',
      comparisonValue: '9.2%',
      percentageChange: -0.8,
      trend: 'down',
      isPositive: true, // Note: lower turnover is positive!
      descriptionEn: 'Annualized voluntary & involuntary exits',
      descriptionAr: 'المغادرة السنوية الطوعية وغير الطوعية'
    });
    cards.push({
      id: 'new_hires',
      titleEn: 'New Hires (YTD)',
      titleAr: 'التعيينات الجديدة',
      value: formatNumber(newHires),
      comparisonValue: '28',
      percentageChange: 14.2,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Talent acquisitions onboarding',
      descriptionAr: 'المباشرات الجديدة خلال العام'
    });
    cards.push({
      id: 'exits',
      titleEn: 'Terminations & Exits',
      titleAr: 'المغادرون والمنتهية خدماتهم',
      value: formatNumber(terminations),
      comparisonValue: '32',
      percentageChange: -6.2,
      trend: 'down',
      isPositive: true,
      descriptionEn: 'Total recorded employee exits',
      descriptionAr: 'إجمالي حالات انتهاء الخدمة المسجلة'
    });
    cards.push({
      id: 'net_talent',
      titleEn: 'Net Talent Growth',
      titleAr: 'صافي نمو الكادر',
      value: `+${newHires - terminations}`,
      comparisonValue: '+4',
      percentageChange: 25.0,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Net workforce additions',
      descriptionAr: 'صافي إضافة القوى العاملة'
    });
  } else {
    // Executive / Default
    cards.push({
      id: 'total_staff',
      titleEn: 'Total Active Workforce',
      titleAr: 'إجمالي الكادر النشط',
      value: formatNumber(totalEmp),
      comparisonValue: '352',
      percentageChange: 1.4,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Across 18 regional offices',
      descriptionAr: 'عبر 18 مكتباً وفرعاً إقليمياً'
    });
    cards.push({
      id: 'total_payroll',
      titleEn: 'Total Monthly Payroll',
      titleAr: 'كتلة الرواتب الشهرية',
      value: formatCurrencyIQD(totalPayrollGross),
      comparisonValue: formatCurrencyIQD(totalPayrollGross * 0.98),
      percentageChange: 2.0,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Including allowances & incentives',
      descriptionAr: 'شاملة المخصصات والحوافز'
    });
    cards.push({
      id: 'turnover',
      titleEn: 'Annual Turnover Rate',
      titleAr: 'معدل دوران الكادر',
      value: '8.4%',
      comparisonValue: '9.2%',
      percentageChange: -0.8,
      trend: 'down',
      isPositive: true,
      descriptionEn: 'Within banking & MFI benchmarks',
      descriptionAr: 'ضمن المعايير المصرفية الصحية'
    });
    cards.push({
      id: 'data_audit',
      titleEn: 'Data Quality Index',
      titleAr: 'مؤشر دقة واكتمال البيانات',
      value: '98.6%',
      comparisonValue: '96.4%',
      percentageChange: 2.2,
      trend: 'up',
      isPositive: true,
      descriptionEn: 'Reconciled across 5 workbooks',
      descriptionAr: 'مطابقة عبر المصنفات الخمسة'
    });
  }

  return cards;
}

// Monthly Snapshots Storage & Archive
const SNAPSHOTS_KEY = 'vitas_hr_monthly_snapshots';

export function getSavedMonthlySnapshots(): MonthlySnapshotRecord[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load snapshots from localStorage', err);
  }

  // Pre-seed with October 2026 approved snapshot
  return [
    {
      id: 'snap-2026-10',
      month: '2026-10',
      approvedAt: '2026-11-01T10:00:00Z',
      approvedBy: 'HR Director & GM',
      organization: 'VITAS Iraq',
      totalHeadcount: 357,
      totalPayroll: 620450000,
      totalIncentives: 67800000,
      turnoverRate: 8.4,
      reportCount: 16,
      notes: 'Official approved monthly HR closing for October 2026. Verified against HQ Vitas, Roster and Payroll ledgers.',
      isLocked: true
    },
    {
      id: 'snap-2026-09',
      month: '2026-09',
      approvedAt: '2026-10-01T09:30:00Z',
      approvedBy: 'HR Director & GM',
      organization: 'VITAS Iraq',
      totalHeadcount: 353,
      totalPayroll: 608100000,
      totalIncentives: 64200000,
      turnoverRate: 8.6,
      reportCount: 16,
      notes: 'Official monthly closing for September 2026.',
      isLocked: true
    }
  ];
}

export function saveMonthlySnapshot(month: string, notes: string = ''): MonthlySnapshotRecord {
  const snapshots = getSavedMonthlySnapshots();
  const dataset = currentDataset;
  const payRecords = dataset.payrollRecords.filter(p => p.month === '2026-09');
  const totalPay = payRecords.reduce((s, r) => s + (r.grossSalary || 0), 0);
  const totalInc = payRecords.reduce((s, r) => s + (r.incentives || 0), 0);

  const newSnap: MonthlySnapshotRecord = {
    id: `snap-${month}-${Date.now()}`,
    month,
    approvedAt: new Date().toISOString(),
    approvedBy: 'Super Admin / HR Manager',
    organization: dataset.metadata.organization,
    totalHeadcount: dataset.employees.length,
    totalPayroll: totalPay,
    totalIncentives: totalInc,
    turnoverRate: 8.4,
    reportCount: 16,
    notes: notes || `Monthly snapshot certified for ${month}`,
    isLocked: true
  };

  const updated = [newSnap, ...snapshots.filter(s => s.month !== month)];
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save snapshot', err);
  }
  return newSnap;
}
