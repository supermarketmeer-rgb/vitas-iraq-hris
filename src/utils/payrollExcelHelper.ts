import * as XLSX from 'xlsx';
import { isKurdistanLocation } from './iraqPayrollTaxEngine';

/**
 * Save an Excel workbook using the native File System Access API (showSaveFilePicker)
 * to let the user choose the folder and file name via a Windows save dialog,
 * with an automatic fallback to standard browser download (XLSX.writeFile).
 */
export async function saveExcelWithSaveDialog(
  workbook: XLSX.WorkBook,
  suggestedFilename: string
): Promise<{ success: boolean; canceled?: boolean; filename?: string; error?: string }> {
  try {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Check if File System Access API is supported (Supported in Chromium / Electron / Edge / Chrome)
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedFilename,
          types: [
            {
              description: 'ملف إكسل Excel Spreadsheet (*.xlsx)',
              accept: {
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { success: true, filename: handle.name || suggestedFilename };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          // User clicked Cancel in the save dialog
          return { success: false, canceled: true };
        }
        console.warn('showSaveFilePicker failed or was blocked, falling back to standard download:', err);
      }
    }

    // Fallback: Standard browser download
    XLSX.writeFile(workbook, suggestedFilename);
    return { success: true, filename: suggestedFilename };
  } catch (error: any) {
    console.error('Error exporting excel file:', error);
    return { success: false, error: error?.message || 'Failed to export excel' };
  }
}

/**
 * Generate and export Payroll Excel Template pre-populated with active employees
 * and their fixed allowances (incentives, transportation, bonus, etc.)
 */
export async function generatePayrollTemplateExcel(
  payrollRows: any[],
  year: number,
  month: number
): Promise<{ success: boolean; canceled?: boolean; filename?: string }> {
  const templateRows = payrollRows.map((row, index) => {
    return {
      '#': index + 1,
      'الرقم الوظيفي / Badge No': row.badge_no || row.badgeNo || row.employeeId || row.id || '',
      'اسم الموظف / Employee Name': row.employee_name || row.name || row.name_ar || '',
      'الموقع / Location': row.location || row.branch || '',
      'المسمى الوظيفي / Position': row.position || row.job_title || '',
      'الراتب الأساسي / Basic Salary': Number(row.basic_salary || row.salary || 0),
      'الحوافز / Incentives': Number(row.incentives || 0),
      'بدل النقل / Transportation': Number(row.transportation || 0),
      'المكافآت / Bonus': Number(row.bonus || 0),
      'ساعات إضافي / Overtime Hours': Number(row.overtime_hours || row.overtimeHours || 0),
      'مبلغ الإضافي / Overtime Amount': Number(row.overtime || row.overtimeAmount || 0),
      'إجازات مستحقة / Earned Leave': Number(row.earned_leave || row.earnedLeave || 0),
      'أيام الغياب / Absence Days': Number(row.absence_days || row.absenceDays || 0),
      'سداد سلف / Loan Payment': Number(row.loan_payment || row.loanPayment || 0),
      'استقطاعات أخرى / Other Deductions': Number(row.other_deductions || row.otherDeductions || 0),
      'ملاحظات / Notes': '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(templateRows);

  // Column width configuration
  worksheet['!cols'] = [
    { wch: 5 },  // #
    { wch: 15 }, // Badge No
    { wch: 28 }, // Employee Name
    { wch: 16 }, // Location
    { wch: 22 }, // Position
    { wch: 18 }, // Basic Salary
    { wch: 16 }, // Incentives
    { wch: 16 }, // Transportation
    { wch: 16 }, // Bonus
    { wch: 16 }, // Overtime Hours
    { wch: 18 }, // Overtime Amount
    { wch: 18 }, // Earned Leave
    { wch: 16 }, // Absence Days
    { wch: 16 }, // Loan Payment
    { wch: 18 }, // Other Deductions
    { wch: 25 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب البدلات والحوافز');

  const suggestedFilename = `vitas_payroll_template_${year}_${String(month).padStart(2, '0')}.xlsx`;
  return await saveExcelWithSaveDialog(workbook, suggestedFilename);
}

/**
 * Parse an uploaded Payroll Excel file containing incentives, transportation, bonus, etc.
 */
export async function parsePayrollExcel(
  file: File,
  existingEmployees: any[]
): Promise<{
  success: boolean;
  totalRows: number;
  matchedCount: number;
  unmatchedRows: any[];
  parsedAdjustments: Record<string, any>;
  summary: {
    totalIncentives: number;
    totalTransportation: number;
    totalBonus: number;
    totalOvertime: number;
    totalEarnedLeave: number;
    totalAbsenceDays: number;
    totalLoanPayments: number;
    totalOtherDeductions: number;
  };
  error?: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!rawRows || rawRows.length === 0) {
          resolve({
            success: false,
            totalRows: 0,
            matchedCount: 0,
            unmatchedRows: [],
            parsedAdjustments: {},
            summary: {
              totalIncentives: 0,
              totalTransportation: 0,
              totalBonus: 0,
              totalOvertime: 0,
              totalEarnedLeave: 0,
              totalAbsenceDays: 0,
              totalLoanPayments: 0,
              totalOtherDeductions: 0,
            },
            error: 'الملف فارغ أو لا يحتوي على صفوف بيانات صالحة',
          });
          return;
        }

        const parsedAdjustments: Record<string, any> = {};
        const unmatchedRows: any[] = [];
        let matchedCount = 0;

        let totalIncentives = 0;
        let totalTransportation = 0;
        let totalBonus = 0;
        let totalOvertime = 0;
        let totalEarnedLeave = 0;
        let totalAbsenceDays = 0;
        let totalLoanPayments = 0;
        let totalOtherDeductions = 0;

        rawRows.forEach((row, idx) => {
          // Find employee identifier
          const rawBadge =
            row['الرقم الوظيفي / Badge No'] ??
            row['الرقم الوظيفي'] ??
            row['badge_no'] ??
            row['badgeNo'] ??
            row['employee_id'] ??
            row['employeeId'] ??
            row['id'] ??
            row['ID'] ??
            row['الكود'] ??
            '';

          const rawName =
            row['اسم الموظف / Employee Name'] ??
            row['اسم الموظف'] ??
            row['الاسم'] ??
            row['employee_name'] ??
            row['name'] ??
            '';

          const cleanBadge = String(rawBadge).trim();
          const cleanName = String(rawName).trim();

          // Match with existing employees
          const matchedEmp = existingEmployees.find((emp) => {
            const empBadge = String(emp.badge_no || emp.badgeNo || emp.employeeId || emp.id || '').trim();
            const empNameAr = String(emp.name_ar || emp.name || emp.employee_name || '').trim();
            const empNameEn = String(emp.name_en || '').trim();
            const empId = String(emp.id).trim();

            if (cleanBadge && (empBadge === cleanBadge || empId === cleanBadge)) return true;
            if (cleanBadge && empBadge.replace(/\s+/g, '') === cleanBadge.replace(/\s+/g, '')) return true;
            if (cleanName && (empNameAr === cleanName || empNameEn.toLowerCase() === cleanName.toLowerCase())) return true;
            return false;
          });

          if (!matchedEmp) {
            unmatchedRows.push({ rowIndex: idx + 2, rawBadge, rawName });
            return;
          }

          // Extract amounts
          const incentives = Number(
            row['الحوافز / Incentives'] ??
            row['الحوافز'] ??
            row['حوافز'] ??
            row['incentives'] ??
            row['incentive'] ??
            0
          );

          const transportation = Number(
            row['بدل النقل / Transportation'] ??
            row['بدل النقل'] ??
            row['النقل'] ??
            row['المواصلات'] ??
            row['transportation'] ??
            row['transport'] ??
            0
          );

          const bonus = Number(
            row['المكافآت / Bonus'] ??
            row['المكافآت'] ??
            row['مكافأة'] ??
            row['مكافآت'] ??
            row['bonus'] ??
            row['bonuses'] ??
            0
          );

          const overtimeHours = Number(
            row['ساعات إضافي / Overtime Hours'] ??
            row['ساعات إضافي'] ??
            row['ساعات العمل الاضافي'] ??
            row['overtime_hours'] ??
            row['overtimeHours'] ??
            0
          );

          const overtimeAmount = Number(
            row['مبلغ الإضافي / Overtime Amount'] ??
            row['مبلغ الإضافي'] ??
            row['العمل الاضافي'] ??
            row['إضافي'] ??
            row['overtime'] ??
            row['overtime_amount'] ??
            row['overtimeAmount'] ??
            0
          );

          const earnedLeave = Number(
            row['إجازات مستحقة / Earned Leave'] ??
            row['إجازات مستحقة'] ??
            row['الاجازات المستحقة'] ??
            row['earned_leave'] ??
            row['earnedLeave'] ??
            0
          );

          const absenceDays = Number(
            row['أيام الغياب / Absence Days'] ??
            row['أيام الغياب'] ??
            row['ايام الغياب'] ??
            row['غياب'] ??
            row['absence_days'] ??
            row['absenceDays'] ??
            0
          );

          const loanPayment = Number(
            row['سداد سلف / Loan Payment'] ??
            row['سداد سلف'] ??
            row['سداد القروض'] ??
            row['قروض'] ??
            row['loan_payment'] ??
            row['loanPayment'] ??
            0
          );

          const otherDeductions = Number(
            row['استقطاعات أخرى / Other Deductions'] ??
            row['استقطاعات أخرى'] ??
            row['استقطاعات اخرى'] ??
            row['other_deductions'] ??
            row['otherDeductions'] ??
            0
          );

          parsedAdjustments[matchedEmp.id] = {
            incentives: isNaN(incentives) ? 0 : incentives,
            transportation: isNaN(transportation) ? 0 : transportation,
            bonus: isNaN(bonus) ? 0 : bonus,
            overtimeHours: isNaN(overtimeHours) ? 0 : overtimeHours,
            overtimeAmount: isNaN(overtimeAmount) ? 0 : overtimeAmount,
            overtime: isNaN(overtimeAmount) ? 0 : overtimeAmount,
            earnedLeave: isNaN(earnedLeave) ? 0 : earnedLeave,
            absenceDays: isNaN(absenceDays) ? 0 : absenceDays,
            loanPayment: isNaN(loanPayment) ? 0 : loanPayment,
            otherDeductions: isNaN(otherDeductions) ? 0 : otherDeductions,
          };

          totalIncentives += isNaN(incentives) ? 0 : incentives;
          totalTransportation += isNaN(transportation) ? 0 : transportation;
          totalBonus += isNaN(bonus) ? 0 : bonus;
          totalOvertime += isNaN(overtimeAmount) ? 0 : overtimeAmount;
          totalEarnedLeave += isNaN(earnedLeave) ? 0 : earnedLeave;
          totalAbsenceDays += isNaN(absenceDays) ? 0 : absenceDays;
          totalLoanPayments += isNaN(loanPayment) ? 0 : loanPayment;
          totalOtherDeductions += isNaN(otherDeductions) ? 0 : otherDeductions;

          matchedCount++;
        });

        resolve({
          success: true,
          totalRows: rawRows.length,
          matchedCount,
          unmatchedRows,
          parsedAdjustments,
          summary: {
            totalIncentives,
            totalTransportation,
            totalBonus,
            totalOvertime,
            totalEarnedLeave,
            totalAbsenceDays,
            totalLoanPayments,
            totalOtherDeductions,
          },
        });
      } catch (err: any) {
        console.error('Error reading excel file:', err);
        resolve({
          success: false,
          totalRows: 0,
          matchedCount: 0,
          unmatchedRows: [],
          parsedAdjustments: {},
          summary: {
            totalIncentives: 0,
            totalTransportation: 0,
            totalBonus: 0,
            totalOvertime: 0,
            totalEarnedLeave: 0,
            totalAbsenceDays: 0,
            totalLoanPayments: 0,
            totalOtherDeductions: 0,
          },
          error: err?.message || 'فشل في قراءة ومعالجة ملف الإكسل',
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        totalRows: 0,
        matchedCount: 0,
        unmatchedRows: [],
        parsedAdjustments: {},
        summary: {
          totalIncentives: 0,
          totalTransportation: 0,
          totalBonus: 0,
          totalOvertime: 0,
          totalEarnedLeave: 0,
          totalAbsenceDays: 0,
          totalLoanPayments: 0,
          totalOtherDeductions: 0,
        },
        error: 'حدث خطأ أثناء فتح الملف',
      });
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate and export Social Security Excel Template
 * Generates two dedicated sheets matching company's official Excel models:
 * 1. Sheet "ضمان العراق (الاتحادي)" (Image 4): Capped base at 1.75M IQD rounded up to nearest 1,000, 5% Employee, 12% Employer
 * 2. Sheet "ضمان إقليم كردستان" (Image 5): Basic + Allowances, no cap, 5% Employee, 12% Employer
 */
export async function generateSocialSecurityTemplateExcel(
  employees: any[],
  periodStr: string = '2026-08'
): Promise<{ success: boolean; canceled?: boolean; filename?: string }> {
  const kurdistanEmployees: any[] = [];
  const federalEmployees: any[] = [];

  employees.forEach((emp) => {
    const loc = `${emp.branch || ''} ${emp.location || ''} ${emp.location_ar || ''}`;
    if (isKurdistanLocation(loc, emp.branch)) {
      kurdistanEmployees.push(emp);
    } else {
      federalEmployees.push(emp);
    }
  });

  // 1. Federal Iraq Social Security Sheet (صورة 4)
  const federalRows = federalEmployees.map((emp, idx) => {
    const basicSalary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
    const fixedAllowances =
      Number(emp.housing_allowance || 0) +
      Number(emp.transport_allowance || 0) +
      Number(emp.living_allowance || 0);
    const totalWage = basicSalary + fixedAllowances;
    const isExempt = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;

    // Excel formula: =ROUNDUP(IF(TotalWage>=1750000, 1750000, TotalWage), -3)
    const rawCapped = Math.min(totalWage, 1750000);
    const insuredBase = isExempt ? 0 : Math.ceil(rawCapped / 1000) * 1000;
    const employeeSS = isExempt ? 0 : Math.round(insuredBase * 0.05);
    const employerSS = isExempt ? 0 : Math.round(insuredBase * 0.12);
    const totalSS = employeeSS + employerSS;

    return {
      'No.': idx + 1,
      'Location': emp.branch || emp.location_ar || emp.location || 'Baghdad',
      'ID': emp.badge_no || emp.badgeNo || emp.employee_number || emp.employeeId || emp.id || '',
      'Employee Name': emp.name_ar || emp.name || emp.employee_name || '',
      'Position': emp.job_title || emp.position || '',
      'Start Date': emp.hire_date || emp.start_date || '2020-01-01',
      'الأجر الخاضع للضمان': insuredBase,
      'حصة الموظف 5%': employeeSS,
      'حصة المؤسسة 12%': employerSS,
      'مجموع الاستقطاع 17%': totalSS,
      'معفى من الضمان (1=معفى, 0=خاضع)': isExempt ? 1 : 0,
      'ملاحظات / Notes': isExempt ? 'معفى بموجب اللائحة' : '',
    };
  });

  // 2. Kurdistan Region Social Security Sheet (صورة 5)
  const kurdistanRows = kurdistanEmployees.map((emp, idx) => {
    const basicSalary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
    const fixedAllowances =
      Number(emp.housing_allowance || 0) +
      Number(emp.transport_allowance || 0) +
      Number(emp.living_allowance || 0);
    const isExempt = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;

    const baseForSS = basicSalary + fixedAllowances;
    const employeeSS = isExempt ? 0 : Math.round(baseForSS * 0.05);
    const employerSS = isExempt ? 0 : Math.round(baseForSS * 0.12);
    const totalSS = employeeSS + employerSS;

    return {
      'No': idx + 1,
      'Location': emp.branch || emp.location || 'Suleymaniya',
      'arabicname': emp.name_ar || emp.name || '',
      'Job Title': emp.job_title || emp.position || '',
      'مجموع الاستقطاع': totalSS,
      'حصة المؤسسة 12%': employerSS,
      'حصة الموظف 5%': employeeSS,
      'المخصصات الثابتة': fixedAllowances,
      'الأجر الخاضع للضمان': basicSalary,
      'Start Date': emp.hire_date || emp.start_date || '',
      'Position': emp.job_title || emp.position || '',
      'Employee Name': emp.name_en || emp.name || '',
      'Gender': emp.gender || 'm',
      'Institution': 'Vitas',
      'معفى من الضمان': isExempt ? 1 : 0,
      'ملاحظات': isExempt ? 'معفى' : '',
    };
  });

  const workbook = XLSX.utils.book_new();

  const fedSheet = XLSX.utils.json_to_sheet(
    federalRows.length > 0
      ? federalRows
      : [
          {
            'No.': 1,
            'Location': 'Baghdad',
            'ID': '101',
            'Employee Name': 'احمد علي',
            'Position': 'محاسب',
            'Start Date': '2022-01-01',
            'الأجر الخاضع للضمان': 1500000,
            'حصة الموظف 5%': 75000,
            'حصة المؤسسة 12%': 180000,
            'مجموع الاستقطاع 17%': 255000,
            'معفى من الضمان (1=معفى, 0=خاضع)': 0,
            'ملاحظات / Notes': '',
          },
        ]
  );
  fedSheet['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, fedSheet, 'ضمان العراق (الاتحادي)');

  const kurdSheet = XLSX.utils.json_to_sheet(
    kurdistanRows.length > 0
      ? kurdistanRows
      : [
          {
            'No': 1,
            'Location': 'Suleymaniya',
            'arabicname': 'محمد كرم علي',
            'Job Title': 'امين صندوق',
            'مجموع الاستقطاع': 198135,
            'حصة المؤسسة 12%': 139860,
            'حصة الموظف 5%': 58275,
            'المخصصات الثابتة': 40500,
            'الأجر الخاضع للضمان': 1125000,
            'Start Date': '1/Nov/15',
            'Position': 'Branch Treasury Assistant',
            'Employee Name': 'Muhammed Karam Ali',
            'Gender': 'm',
            'Institution': 'Vitas',
            'معفى من الضمان': 0,
            'ملاحظات': '',
          },
        ]
  );
  kurdSheet['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 25 },
    { wch: 25 },
    { wch: 8 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
  ];
  XLSX.utils.book_append_sheet(workbook, kurdSheet, 'ضمان إقليم كردستان');

  const suggestedFilename = `vitas_social_security_${periodStr.replace('-', '_')}.xlsx`;
  return await saveExcelWithSaveDialog(workbook, suggestedFilename);
}

/**
 * Parse Social Security Excel file
 * Robustly reads both single-sheet and multi-sheet workbooks conforming to
 * Federal Iraq (Image 4) or Kurdistan Region (Image 5) formats.
 */
export async function parseSocialSecurityExcel(
  file: File,
  existingEmployees: any[]
): Promise<{
  success: boolean;
  totalRows: number;
  matchedCount: number;
  exemptCount: number;
  parsedData: Record<
    string,
    {
      isExempt: boolean;
      customSSBase?: number;
      customEmployeeSS?: number;
      customEmployerSS?: number;
      notes?: string;
    }
  >;
  summary: {
    totalEmployeeSS: number;
    totalEmployerSS: number;
  };
  error?: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const rawRows: any[] = [];
        workbook.SheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          if (ws) {
            const rows = XLSX.utils.sheet_to_json(ws) as any[];
            if (rows && rows.length > 0) {
              rawRows.push(...rows);
            }
          }
        });

        if (rawRows.length === 0) {
          resolve({
            success: false,
            totalRows: 0,
            matchedCount: 0,
            exemptCount: 0,
            parsedData: {},
            summary: { totalEmployeeSS: 0, totalEmployerSS: 0 },
            error: 'الملف فارغ أو لا يحتوي على صفوف بيانات صالحة',
          });
          return;
        }

        const parsedData: Record<string, any> = {};
        let matchedCount = 0;
        let exemptCount = 0;
        let totalEmployeeSS = 0;
        let totalEmployerSS = 0;

        rawRows.forEach((row) => {
          const rawBadge =
            row['ID'] ??
            row['id'] ??
            row['الرقم الوظيفي / Badge No'] ??
            row['الرقم الوظيفي'] ??
            row['badge_no'] ??
            row['badgeNo'] ??
            row['employee_number'] ??
            row['employee_id'] ??
            row['No.'] ??
            row['No'] ??
            row['#'] ??
            '';

          const rawName =
            row['Employee Name'] ??
            row['arabicname'] ??
            row['Name of Employee'] ??
            row['اسم الموظف / Employee Name'] ??
            row['اسم الموظف'] ??
            row['الاسم بالعربي'] ??
            row['employee_name'] ??
            row['name'] ??
            '';

          const cleanBadge = String(rawBadge).trim();
          const cleanName = String(rawName).trim();

          const matchedEmp = existingEmployees.find((emp) => {
            const empBadge = String(
              emp.badge_no || emp.badgeNo || emp.employee_number || emp.employeeId || emp.id || ''
            ).trim();
            const empNameAr = String(emp.name_ar || emp.name || emp.employee_name || '').trim();
            const empNameEn = String(emp.name_en || '').trim();
            const empId = String(emp.id).trim();

            if (cleanBadge && (empBadge === cleanBadge || empId === cleanBadge)) return true;
            if (cleanName && (empNameAr === cleanName || empNameEn.toLowerCase() === cleanName.toLowerCase()))
              return true;
            return false;
          });

          if (!matchedEmp) return;

          const rawExempt =
            row['معفى من الضمان (1=معفى, 0=خاضع)'] ??
            row['معفى من الضمان (1=معفى, 0=خاضع) / Is Exempt'] ??
            row['معفى من الضمان'] ??
            row['معفى'] ??
            row['is_exempt'] ??
            row['is_ss_exempt'] ??
            0;

          const isExempt =
            String(rawExempt).trim() === '1' ||
            String(rawExempt).trim().toLowerCase() === 'true' ||
            String(rawExempt).trim() === 'نعم' ||
            String(rawExempt).trim() === 'معفى';

          const customSSBase = Number(
            row['الأجر الخاضع للضمان'] ??
              row['الأجر الخاضع للضمان / Insured Salary'] ??
              row['وعاء الضمان المخصص / Custom SS Base'] ??
              row['وعاء الضمان'] ??
              row['custom_ss_base'] ??
              0
          );

          const employeeSS = Number(
            row['حصة الموظف 5%'] ??
              row['حصة الموظف 5% / Employee SS (5%)'] ??
              row['استقطاع الموظف 5% / Employee SS (5%)'] ??
              row['استقطاع الموظف'] ??
              row['حصة الموظف'] ??
              row['employee_ss'] ??
              0
          );

          const employerSS = Number(
            row['حصة المؤسسة 12%'] ??
              row['حصة المؤسسة 12% / Employer SS (12%)'] ??
              row['مساهمة رب العمل 12% / Employer SS (12%)'] ??
              row['مساهمة رب العمل'] ??
              row['حصة المؤسسة'] ??
              row['employer_ss'] ??
              0
          );

          const notes = String(row['ملاحظات / Notes'] ?? row['ملاحظات'] ?? '');

          parsedData[matchedEmp.id] = {
            isExempt,
            customSSBase: isNaN(customSSBase) ? undefined : customSSBase,
            customEmployeeSS: isNaN(employeeSS) ? undefined : employeeSS,
            customEmployerSS: isNaN(employerSS) ? undefined : employerSS,
            notes,
          };

          if (isExempt) exemptCount++;
          totalEmployeeSS += isNaN(employeeSS) ? 0 : employeeSS;
          totalEmployerSS += isNaN(employerSS) ? 0 : employerSS;
          matchedCount++;
        });

        resolve({
          success: true,
          totalRows: rawRows.length,
          matchedCount,
          exemptCount,
          parsedData,
          summary: { totalEmployeeSS, totalEmployerSS },
        });
      } catch (err: any) {
        resolve({
          success: false,
          totalRows: 0,
          matchedCount: 0,
          exemptCount: 0,
          parsedData: {},
          summary: { totalEmployeeSS: 0, totalEmployerSS: 0 },
          error: err?.message || 'فشل في قراءة ملف الضمان الاجتماعي',
        });
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate and export Income Tax Excel Template
 * Generates two dedicated sheets matching company's official Excel models:
 * 1. Sheet "ضريبة العراق (الاستقطاع المباشر)" (Image 2): Basic * 70% - SS, 416667 Personal, 333333 Spouse, 33333/child, 4 Tiers (3%, 5%, 10%, 15%)
 * 2. Sheet "ضريبة كردستان العراق" (Image 3): Statutory 1,000,000 IQD exemption + Allowances + SS, Flat 5% Tax
 */
export async function generateIncomeTaxTemplateExcel(
  employees: any[],
  periodStr: string = '2026-08'
): Promise<{ success: boolean; canceled?: boolean; filename?: string }> {
  const kurdistanEmployees: any[] = [];
  const federalEmployees: any[] = [];

  employees.forEach((emp) => {
    const loc = `${emp.branch || ''} ${emp.location || ''} ${emp.location_ar || ''}`;
    if (isKurdistanLocation(loc, emp.branch)) {
      kurdistanEmployees.push(emp);
    } else {
      federalEmployees.push(emp);
    }
  });

  // 1. Federal Iraq Income Tax Sheet (صورة 2: ضريبة العراق الاستقطاع المباشر)
  const federalRows = federalEmployees.map((emp, idx) => {
    const basicSalary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
    const isExempt = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;

    // Social Security 5% (capped at 1,750,000 rounded up to 1,000)
    const rawCapped = Math.min(basicSalary, 1750000);
    const insuredBase = Math.ceil(rawCapped / 1000) * 1000;
    const employeeSS = isExempt ? 0 : Math.round(insuredBase * 0.05);

    // Basic * 0.7 - SS
    const netAfter30PercentAndSS = Math.max(0, basicSalary * 0.7 - employeeSS);

    // Personal Allowance: 416,667 IQD/month
    const personalRelief = 416667;

    // Spouse Allowance: 333,333 IQD/month (if married & spouse has no income)
    const isMarried =
      emp.marital_status === 'married' ||
      emp.marital_status === 'MARRIED' ||
      emp.marital_status === 'MARRIED_WITH_DEPENDENTS' ||
      emp.marital_status === 'متزوج';
    const spouseRelief = isMarried ? 333333 : 0;

    // Children Allowance: 33,333 IQD/month per child (max 4)
    const childrenCount = Math.min(
      Math.max(0, Number(emp.children_count ?? emp.dependents_count ?? 0)),
      4
    );
    const childrenRelief = childrenCount * 33333;

    const totalRelief = personalRelief + spouseRelief + childrenRelief;
    const taxableBase = isExempt ? 0 : Math.max(0, netAfter30PercentAndSS - totalRelief);

    // 4 Monthly Tiers
    let t1 = 0,
      t2 = 0,
      t3 = 0,
      t4 = 0;
    if (taxableBase > 0) {
      t1 = Math.min(taxableBase, 500000) * 0.03;
      if (taxableBase > 500000) {
        t2 = Math.min(taxableBase - 500000, 500000) * 0.05;
      }
      if (taxableBase > 1000000) {
        t3 = Math.min(taxableBase - 1000000, 1000000) * 0.1;
      }
      if (taxableBase > 2000000) {
        t4 = (taxableBase - 2000000) * 0.15;
      }
    }
    const monthlyTax = Math.round(t1 + t2 + t3 + t4);

    return {
      'Location': emp.branch || emp.location_ar || emp.location || 'Baghdad',
      'ID': emp.badge_no || emp.badgeNo || emp.employee_number || emp.employeeId || emp.id || (idx + 1),
      'Name of Employee': emp.name_ar || emp.name || emp.employee_name || '',
      'Job Title': emp.job_title || emp.position || '',
      'ما يعادل الراتب الاسمي لهذا الشهر': basicSalary,
      'السماح الشخصي (416,667)': personalRelief,
      'اسم الزوجة': isMarried ? (emp.spouse_name || 'ربة بيت') : '',
      'الزوجة لا تتقاضى راتبا (333,333)': spouseRelief,
      'عدد الأولاد': childrenCount,
      'سماحات الأولاد (33,333/طفل)': childrenRelief,
      'الضمان الاجتماعي (حصة الموظف 5%)': employeeSS,
      'الراتب الصافي الخاضع للضريبة': Math.round(taxableBase),
      'الضريبة لأول 500,000 دينار (3%)': Math.round(t1),
      'الضريبة لثاني 500,000 دينار (5%)': Math.round(t2),
      'الضريبة لثالث شريحة حتى 2,000,000 دينار (10%)': Math.round(t3),
      'الضريبة لما فوق 2,000,000 دينار (15%)': Math.round(t4),
      'كلي الضريبة الشهرية': monthlyTax,
    };
  });

  // 2. Kurdistan Region Income Tax Sheet (صورة 3: جدول حساب الضريبة كردستان)
  const kurdistanRows = kurdistanEmployees.map((emp, idx) => {
    const basicSalary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
    const allowances =
      Number(emp.housing_allowance || 0) +
      Number(emp.transport_allowance || 0) +
      Number(emp.living_allowance || 0);
    const otherBenefits = Number(emp.bonus || 0) + Number(emp.overtime || 0);
    const totalGross = basicSalary + allowances + otherBenefits;

    const isExempt = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;

    // SS 5% of (Basic + Allowances)
    const empSS = isExempt ? 0 : Math.round((basicSalary + allowances) * 0.05);

    // Kurdistan Deductions: 1,000,000 statutory + SS + Allowances
    const statutoryExemption = 1000000;
    const exemptAllowances = allowances;
    const totalDeductions = statutoryExemption + empSS + exemptAllowances;
    const taxableBase = isExempt ? 0 : Math.max(0, totalGross - totalDeductions);
    const monthlyTax = isExempt ? 0 : Math.round(taxableBase * 0.05);

    return {
      'الرقم / No': idx + 1,
      'اسم الموظف / Employee Name': emp.name_ar || emp.name || emp.name_en || '',
      'الموقع / Location': emp.branch || emp.location || 'Suleymaniya',
      'الراتب الاسمي / Basic Salary': basicSalary,
      'المخصصات / Allowances': allowances,
      'المخصصات الاخرى / Other Benefits': otherBenefits,
      'المجموع الكلي / Total Gross': totalGross,
      'الضمان الاجتماعي 5% / Social Security': empSS,
      'المخصصات المعفاة / Exempt Allowances': exemptAllowances,
      'السماح القانوني (1,000,000) / Statutory Relief': statutoryExemption,
      'مجموع التنزيلات / Total Deductions': totalDeductions,
      'الراتب الخاضع للضريبة / Taxable Base': taxableBase,
      'نسبة الضريبة 5% / Tax Rate': '5%',
      'مبلغ الضريبة الشهرية / Monthly Tax': monthlyTax,
    };
  });

  const workbook = XLSX.utils.book_new();

  const fedSheet = XLSX.utils.json_to_sheet(
    federalRows.length > 0
      ? federalRows
      : [
          {
            'Location': 'Baghdad',
            'ID': '1',
            'Name of Employee': 'احمد علي',
            'Job Title': 'محاسب',
            'ما يعادل الراتب الاسمي لهذا الشهر': 2000000,
            'السماح الشخصي (416,667)': 416667,
            'اسم الزوجة': 'زينب',
            'الزوجة لا تتقاضى راتبا (333,333)': 333333,
            'عدد الأولاد': 2,
            'سماحات الأولاد (33,333/طفل)': 66666,
            'الضمان الاجتماعي (حصة الموظف 5%)': 87500,
            'الراتب الصافي الخاضع للضريبة': 495834,
            'الضريبة لأول 500,000 دينار (3%)': 14875,
            'الضريبة لثاني 500,000 دينار (5%)': 0,
            'الضريبة لثالث شريحة حتى 2,000,000 دينار (10%)': 0,
            'الضريبة لما فوق 2,000,000 دينار (15%)': 0,
            'كلي الضريبة الشهرية': 14875,
          },
        ]
  );
  fedSheet['!cols'] = [
    { wch: 15 },
    { wch: 10 },
    { wch: 25 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 15 },
    { wch: 22 },
    { wch: 12 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, fedSheet, 'ضريبة العراق (الاستقطاع المباشر)');

  const kurdSheet = XLSX.utils.json_to_sheet(
    kurdistanRows.length > 0
      ? kurdistanRows
      : [
          {
            'الرقم / No': 1,
            'اسم الموظف / Employee Name': 'محمد كرم علي',
            'الموقع / Location': 'Suleymaniya',
            'الراتب الاسمي / Basic Salary': 1125000,
            'المخصصات / Allowances': 40500,
            'المخصصات الاخرى / Other Benefits': 0,
            'المجموع الكلي / Total Gross': 1165500,
            'الضمان الاجتماعي 5% / Social Security': 58275,
            'المخصصات المعفاة / Exempt Allowances': 40500,
            'السماح القانوني (1,000,000) / Statutory Relief': 1000000,
            'مجموع التنزيلات / Total Deductions': 1098775,
            'الراتب الخاضع للضريبة / Taxable Base': 66725,
            'نسبة الضريبة 5% / Tax Rate': '5%',
            'مبلغ الضريبة الشهرية / Monthly Tax': 3336,
          },
        ]
  );
  kurdSheet['!cols'] = [
    { wch: 8 },
    { wch: 25 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 },
    { wch: 22 },
    { wch: 15 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, kurdSheet, 'ضريبة كردستان العراق');

  const suggestedFilename = `vitas_income_tax_${periodStr.replace('-', '_')}.xlsx`;
  return await saveExcelWithSaveDialog(workbook, suggestedFilename);
}

/**
 * Parse Income Tax Excel file
 * Robustly reads both single-sheet and multi-sheet workbooks conforming to
 * Federal Iraq (Image 2) or Kurdistan Region (Image 3) formats.
 */
export async function parseIncomeTaxExcel(
  file: File,
  existingEmployees: any[]
): Promise<{
  success: boolean;
  totalRows: number;
  matchedCount: number;
  exemptCount: number;
  parsedData: Record<
    string,
    {
      isExempt: boolean;
      customTaxRelief?: number;
      customTaxDeduction?: number;
      notes?: string;
    }
  >;
  summary: {
    totalTaxDeductions: number;
  };
  error?: string;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const rawRows: any[] = [];
        workbook.SheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          if (ws) {
            const rows = XLSX.utils.sheet_to_json(ws) as any[];
            if (rows && rows.length > 0) {
              rawRows.push(...rows);
            }
          }
        });

        if (rawRows.length === 0) {
          resolve({
            success: false,
            totalRows: 0,
            matchedCount: 0,
            exemptCount: 0,
            parsedData: {},
            summary: { totalTaxDeductions: 0 },
            error: 'الملف فارغ أو لا يحتوي على صفوف بيانات صالحة',
          });
          return;
        }

        const parsedData: Record<string, any> = {};
        let matchedCount = 0;
        let exemptCount = 0;
        let totalTaxDeductions = 0;

        rawRows.forEach((row) => {
          const rawBadge =
            row['ID'] ??
            row['id'] ??
            row['الرقم الوظيفي / Badge No'] ??
            row['الرقم الوظيفي'] ??
            row['badge_no'] ??
            row['badgeNo'] ??
            row['employee_number'] ??
            row['employee_id'] ??
            row['الرقم / No'] ??
            row['الرقم'] ??
            row['No.'] ??
            row['No'] ??
            row['#'] ??
            '';

          const rawName =
            row['Name of Employee'] ??
            row['Employee Name'] ??
            row['اسم الموظف / Employee Name'] ??
            row['اسم الموظف'] ??
            row['arabicname'] ??
            row['الاسم بالعربي'] ??
            row['employee_name'] ??
            row['name'] ??
            '';

          const cleanBadge = String(rawBadge).trim();
          const cleanName = String(rawName).trim();

          const matchedEmp = existingEmployees.find((emp) => {
            const empBadge = String(
              emp.badge_no || emp.badgeNo || emp.employee_number || emp.employeeId || emp.id || ''
            ).trim();
            const empNameAr = String(emp.name_ar || emp.name || emp.employee_name || '').trim();
            const empNameEn = String(emp.name_en || '').trim();
            const empId = String(emp.id).trim();

            if (cleanBadge && (empBadge === cleanBadge || empId === cleanBadge)) return true;
            if (cleanName && (empNameAr === cleanName || empNameEn.toLowerCase() === cleanName.toLowerCase()))
              return true;
            return false;
          });

          if (!matchedEmp) return;

          const rawExempt =
            row['معفى من الضريبة (1=معفى, 0=خاضع)'] ??
            row['معفى من الضريبة (1=معفى, 0=خاضع) / Is Exempt'] ??
            row['معفى من الضريبة'] ??
            row['معفى'] ??
            row['is_exempt'] ??
            row['is_tax_exempt'] ??
            0;

          const isExempt =
            String(rawExempt).trim() === '1' ||
            String(rawExempt).trim().toLowerCase() === 'true' ||
            String(rawExempt).trim() === 'نعم' ||
            String(rawExempt).trim() === 'معفى';

          const customTaxRelief = Number(
            row['مجموع التنزيلات / Total Deductions'] ??
              row['الراتب الصافي الخاضع للضريبة'] ??
              row['الراتب الخاضع للضريبة / Taxable Base'] ??
              row['إعفاء سنوي/شهري مخصص / Custom Tax Relief'] ??
              row['إعفاء مخصص'] ??
              row['custom_tax_relief'] ??
              0
          );

          const taxDeduction = Number(
            row['كلي الضريبة الشهرية'] ??
              row['مبلغ الضريبة الشهرية / Monthly Tax'] ??
              row['مبلغ استقطاع الضريبة / Tax Deduction Amount'] ??
              row['مبلغ استقطاع الضريبة'] ??
              row['الضريبة'] ??
              row['tax_deduction'] ??
              0
          );

          const notes = String(row['ملاحظات / Notes'] ?? row['ملاحظات'] ?? '');

          parsedData[matchedEmp.id] = {
            isExempt,
            customTaxRelief: isNaN(customTaxRelief) ? undefined : customTaxRelief,
            customTaxDeduction: isNaN(taxDeduction) ? undefined : taxDeduction,
            notes,
          };

          if (isExempt) exemptCount++;
          totalTaxDeductions += isNaN(taxDeduction) ? 0 : taxDeduction;
          matchedCount++;
        });

        resolve({
          success: true,
          totalRows: rawRows.length,
          matchedCount,
          exemptCount,
          parsedData,
          summary: { totalTaxDeductions },
        });
      } catch (err: any) {
        resolve({
          success: false,
          totalRows: 0,
          matchedCount: 0,
          exemptCount: 0,
          parsedData: {},
          summary: { totalTaxDeductions: 0 },
          error: err?.message || 'فشل في قراءة ملف ضريبة الدخل',
        });
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
