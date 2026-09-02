import * as XLSX from 'xlsx';

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
 */
export async function generateSocialSecurityTemplateExcel(
  employees: any[],
  periodStr: string = '2026-08'
): Promise<{ success: boolean; canceled?: boolean; filename?: string }> {
  const rows = employees.map((emp, idx) => {
    const basicSalary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
    const isExempt = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;
    const ssEmployeeRate = 0.05; // 5%
    const ssEmployerRate = 0.12; // 12%

    const employeeSS = isExempt ? 0 : Math.round(basicSalary * ssEmployeeRate);
    const employerSS = isExempt ? 0 : Math.round(basicSalary * ssEmployerRate);

    return {
      '#': idx + 1,
      'الرقم الوظيفي / Badge No': emp.badge_no || emp.badgeNo || emp.employeeId || emp.id || '',
      'اسم الموظف / Employee Name': emp.name_ar || emp.name || emp.employee_name || '',
      'الموقع / الفرع / Branch': emp.branch || emp.location_ar || emp.location || '',
      'المسمى الوظيفي / Position': emp.job_title || emp.position || '',
      'الراتب الاسمي / Basic Salary': basicSalary,
      'معفى من الضمان (1=معفى, 0=خاضع) / Is Exempt': isExempt ? 1 : 0,
      'وعاء الضمان المخصص / Custom SS Base': basicSalary,
      'استقطاع الموظف 5% / Employee SS (5%)': employeeSS,
      'مساهمة رب العمل 12% / Employer SS (12%)': employerSS,
      'ملاحظات / Notes': isExempt ? 'معفى بموجب اللائحة' : '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 25 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 25 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب الضمان الاجتماعي');

  const suggestedFilename = `vitas_social_security_template_${periodStr.replace('-', '_')}.xlsx`;
  return await saveExcelWithSaveDialog(workbook, suggestedFilename);
}

/**
 * Parse Social Security Excel file
 */
export async function parseSocialSecurityExcel(
  file: File,
  existingEmployees: any[]
): Promise<{
  success: boolean;
  totalRows: number;
  matchedCount: number;
  exemptCount: number;
  parsedData: Record<string, { isExempt: boolean; customSSBase?: number; customEmployeeSS?: number; customEmployerSS?: number; notes?: string }>;
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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!rawRows || rawRows.length === 0) {
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
            row['الرقم الوظيفي / Badge No'] ??
            row['الرقم الوظيفي'] ??
            row['badge_no'] ??
            row['badgeNo'] ??
            row['employee_id'] ??
            row['id'] ??
            '';

          const rawName =
            row['اسم الموظف / Employee Name'] ??
            row['اسم الموظف'] ??
            row['employee_name'] ??
            row['name'] ??
            '';

          const cleanBadge = String(rawBadge).trim();
          const cleanName = String(rawName).trim();

          const matchedEmp = existingEmployees.find((emp) => {
            const empBadge = String(emp.badge_no || emp.badgeNo || emp.employeeId || emp.id || '').trim();
            const empNameAr = String(emp.name_ar || emp.name || emp.employee_name || '').trim();
            const empNameEn = String(emp.name_en || '').trim();
            const empId = String(emp.id).trim();

            if (cleanBadge && (empBadge === cleanBadge || empId === cleanBadge)) return true;
            if (cleanName && (empNameAr === cleanName || empNameEn.toLowerCase() === cleanName.toLowerCase())) return true;
            return false;
          });

          if (!matchedEmp) return;

          const rawExempt =
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
            row['وعاء الضمان المخصص / Custom SS Base'] ??
            row['وعاء الضمان'] ??
            row['custom_ss_base'] ??
            0
          );

          const employeeSS = Number(
            row['استقطاع الموظف 5% / Employee SS (5%)'] ??
            row['استقطاع الموظف'] ??
            row['employee_ss'] ??
            0
          );

          const employerSS = Number(
            row['مساهمة رب العمل 12% / Employer SS (12%)'] ??
            row['مساهمة رب العمل'] ??
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
 */
export async function generateIncomeTaxTemplateExcel(
  employees: any[],
  periodStr: string = '2026-08'
): Promise<{ success: boolean; canceled?: boolean; filename?: string }> {
  const rows = employees.map((emp, idx) => {
    const basicSalary = Number(emp.basicSalary ?? emp.basic_salary ?? emp.salary ?? 1250000);
    const isExempt = Number(emp.isSsTaxExempt ?? emp.is_ss_tax_exempt ?? 0) === 1;
    const estTax = isExempt ? 0 : Math.round(basicSalary * 0.03);

    return {
      '#': idx + 1,
      'الرقم الوظيفي / Badge No': emp.badge_no || emp.badgeNo || emp.employeeId || emp.id || '',
      'اسم الموظف / Employee Name': emp.name_ar || emp.name || emp.employee_name || '',
      'الموقع / الفرع / Branch': emp.branch || emp.location_ar || emp.location || '',
      'المسمى الوظيفي / Position': emp.job_title || emp.position || '',
      'الراتب الكلي التقديري / Gross Salary': basicSalary,
      'معفى من الضريبة (1=معفى, 0=خاضع) / Is Exempt': isExempt ? 1 : 0,
      'إعفاء سنوي/شهري مخصص / Custom Tax Relief': 208333,
      'مبلغ استقطاع الضريبة / Tax Deduction Amount': estTax,
      'ملاحظات / Notes': isExempt ? 'معفى من الضريبة' : '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 15 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 25 },
    { wch: 24 },
    { wch: 24 },
    { wch: 25 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب ضريبة الدخل');

  const suggestedFilename = `vitas_income_tax_template_${periodStr.replace('-', '_')}.xlsx`;
  return await saveExcelWithSaveDialog(workbook, suggestedFilename);
}

/**
 * Parse Income Tax Excel file
 */
export async function parseIncomeTaxExcel(
  file: File,
  existingEmployees: any[]
): Promise<{
  success: boolean;
  totalRows: number;
  matchedCount: number;
  exemptCount: number;
  parsedData: Record<string, { isExempt: boolean; customTaxRelief?: number; customTaxDeduction?: number; notes?: string }>;
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
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!rawRows || rawRows.length === 0) {
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
            row['الرقم الوظيفي / Badge No'] ??
            row['الرقم الوظيفي'] ??
            row['badge_no'] ??
            row['badgeNo'] ??
            row['employee_id'] ??
            row['id'] ??
            '';

          const rawName =
            row['اسم الموظف / Employee Name'] ??
            row['اسم الموظف'] ??
            row['employee_name'] ??
            row['name'] ??
            '';

          const cleanBadge = String(rawBadge).trim();
          const cleanName = String(rawName).trim();

          const matchedEmp = existingEmployees.find((emp) => {
            const empBadge = String(emp.badge_no || emp.badgeNo || emp.employeeId || emp.id || '').trim();
            const empNameAr = String(emp.name_ar || emp.name || emp.employee_name || '').trim();
            const empNameEn = String(emp.name_en || '').trim();
            const empId = String(emp.id).trim();

            if (cleanBadge && (empBadge === cleanBadge || empId === cleanBadge)) return true;
            if (cleanName && (empNameAr === cleanName || empNameEn.toLowerCase() === cleanName.toLowerCase())) return true;
            return false;
          });

          if (!matchedEmp) return;

          const rawExempt =
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
            row['إعفاء سنوي/شهري مخصص / Custom Tax Relief'] ??
            row['إعفاء مخصص'] ??
            row['custom_tax_relief'] ??
            0
          );

          const taxDeduction = Number(
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
