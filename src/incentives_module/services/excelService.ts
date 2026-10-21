import * as XLSX from 'xlsx';
import { VariableDefinition, LoanOfficerEntitlement, SupervisorEntitlement, PeriodSummary } from '../types';
import { StorageService } from './storage';

export interface ParsedSheetData {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export class ExcelService {
  /**
   * Reads an uploaded Excel or CSV file as ArrayBuffer and extracts sheet info
   */
  public static async parseExcelFile(file: File): Promise<ParsedSheetData> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      throw new Error('ملف Excel لا يحتوي على أي صفحات عمل صالحة');
    }

    const firstSheetName = sheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (rawData.length === 0) {
      throw new Error('ورقة العمل فارغة تماماً ولا تحتوي على أية بيانات');
    }

    // Extract headers from first non-empty row
    let headerRowIdx = 0;
    while (headerRowIdx < rawData.length && rawData[headerRowIdx].every((cell: any) => cell === '' || cell == null)) {
      headerRowIdx++;
    }

    if (headerRowIdx >= rawData.length) {
      throw new Error('تعذر العثور على عناوين الأعمدة في ملف Excel');
    }

    const rawHeaders: any[] = rawData[headerRowIdx];
    const headers: string[] = rawHeaders
      .map((h, i) => (h ? String(h).trim() : `Column_${i + 1}`))
      .filter((h) => h.length > 0);

    // Parse subsequent data rows
    const rows: Record<string, any>[] = [];
    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const rowArr = rawData[r];
      if (!rowArr || rowArr.every((cell: any) => cell === '' || cell == null)) {
        continue;
      }

      const rowObj: Record<string, any> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
      });
      rows.push(rowObj);
    }

    return {
      sheetNames,
      activeSheet: firstSheetName,
      headers,
      rows,
      totalRows: rows.length,
    };
  }

  /**
   * Helper to suggest best column matches for the 10 variables & Employee ID
   */
  public static autoSuggestMappings(
    headers: string[],
    variables: VariableDefinition[]
  ): Record<string, string> {
    const mappings: Record<string, string> = {};

    headers.forEach((header) => {
      const hLower = header.toLowerCase();

      // WAID mapping detection
      if (
        hLower.includes('waid') ||
        hLower.includes('wa_id') ||
        hLower.includes('معرف الحوافز') ||
        hLower.includes('كود الحوافز') ||
        hLower.includes('حوافز')
      ) {
        mappings['waid'] = header;
      }

      // Badge No
      if (
        hLower.includes('badge') ||
        hLower.includes('بادج') ||
        hLower.includes('باج')
      ) {
        mappings['badgeNo'] = header;
      }

      // Employee ID mapping detection
      if (
        hLower.includes('employee') ||
        hLower.includes('emp_id') ||
        hLower.includes('empid') ||
        hLower.includes('رقم الموظف') ||
        hLower.includes('كود الموظف') ||
        hLower.includes('الرقم الوظيفي')
      ) {
        mappings['employeeId'] = header;
      }

      // Employee Name
      if (
        hLower.includes('name') ||
        hLower.includes('اسم') ||
        hLower.includes('الموظف')
      ) {
        if (!mappings['employeeName']) {
          mappings['employeeName'] = header;
        }
      }

      // Office / Branch
      if (
        hLower.includes('office') ||
        hLower.includes('branch') ||
        hLower.includes('فرع') ||
        hLower.includes('مكتب') ||
        hLower.includes('موقع')
      ) {
        mappings['office'] = header;
      }

      // Match variables by code or Arabic/English names
      variables.forEach((v) => {
        const vCode = v.code.toLowerCase();
        const vNameAr = v.nameAr.toLowerCase();
        const vNameEn = v.nameEn.toLowerCase();

        if (
          hLower === vCode ||
          hLower.includes(vCode) ||
          hLower.includes(vNameAr) ||
          vNameAr.includes(hLower) ||
          hLower.includes(vNameEn)
        ) {
          mappings[v.code] = header;
        }
      });
    });

    return mappings;
  }

  /**
   * Generates and downloads a clean Excel template (.xlsx) with pre-filled headers
   */
  public static downloadTemplate(variables: VariableDefinition[]): void {
    const headers = [
      'الرقم المؤسسي (Employee ID)',
      'رقم البادج (Badge No)',
      'معرف الحوافز (WAID)',
      'اسم الموظف (Employee Name)',
      'الفرع / المكتب (Office)',
      ...variables.map((v) => `${v.nameAr} [${v.code}] (${v.unit})`),
    ];

    const sampleRow = [
      'VTS-5345',
      'B-5345',
      'WA-5345',
      'علي حسن محي العراوي',
      'بابل_الحلة',
      25, // Loans
      32000000, // Volume
      97.5, // Repayment %
      110, // Active clients
      1.2, // PAR30 %
      22, // Visits
      7, // New clients
      95, // Quality score
      22, // Days worked
      4, // Excellence index
    ];

    const sampleRow2 = [
      'VTS-LO-202',
      'B-202',
      'WA-202',
      'زينب كاظم الفتلاوي',
      'بابل_الحلة',
      22,
      28000000,
      96.2,
      95,
      1.8,
      20,
      6,
      93,
      22,
      3,
    ];

    const wsData = [headers, sampleRow, sampleRow2];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 28 },
      { wch: 28 },
      { wch: 24 },
      ...variables.map(() => ({ wch: 28 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'متغيرات_الحوافز');

    XLSX.writeFile(wb, 'نموذج_استيراد_حوافز_مسؤولي_القروض_فيتاس_العراق.xlsx');
  }

  /**
   * Helper to export current period entitlements report directly from storage
   */
  public static exportEntitlementsReport(period: string): void {
    const loList = StorageService.getLOEntitlements(period);
    const supList = StorageService.getSupervisorEntitlements(period);
    const summary = StorageService.getPeriodSummary(period);
    this.exportEntitlementsToExcel(period, loList, supList, summary);
  }

  /**
   * Exports full calculation results (Loan Officers & Supervisors) to an Excel file
   */
  public static exportEntitlementsToExcel(
    period: string,
    loList: LoanOfficerEntitlement[],
    supList: SupervisorEntitlement[],
    summary: PeriodSummary | null,
    currencySymbol: string = 'د.ع'
  ): void {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Loan Officers Entitlements
    const loHeaders = [
      'الفترة',
      'الرقم المؤسسي (ID)',
      'رقم البادج (Badge)',
      'معرف الحوافز (WAID)',
      'اسم الموظف',
      'الفرع / المكتب',
      'المشرف المباشر',
      `الحوافز (${currencySymbol})`,
      `بدل الانتقال (${currencySymbol})`,
      `المكافأة (${currencySymbol})`,
      `إجمالي المستحقات (${currencySymbol})`,
      'الحالة',
      'تاريخ الاحتساب',
    ];

    const loRows = loList.map((lo) => [
      lo.period,
      lo.employeeId,
      lo.badgeNo || '-',
      lo.waid || '-',
      lo.employeeName,
      lo.office,
      lo.supervisorName || lo.supervisorId || 'غير محدد',
      lo.incentives,
      lo.transportation,
      lo.bonus,
      lo.totalEntitlements,
      lo.status,
      lo.calculatedAt ? new Date(lo.calculatedAt).toLocaleDateString('ar-IQ') : '',
    ]);

    const totalLOInc = loList.reduce((s, r) => s + r.incentives, 0);
    const totalLOTrans = loList.reduce((s, r) => s + r.transportation, 0);
    const totalLOBonus = loList.reduce((s, r) => s + r.bonus, 0);
    const totalLOTotal = loList.reduce((s, r) => s + r.totalEntitlements, 0);

    loRows.push([
      'المجموع الإجمالي',
      `${loList.length} مسؤول قروض`,
      '',
      '',
      '',
      totalLOInc,
      totalLOTrans,
      totalLOBonus,
      totalLOTotal,
      '',
      '',
    ]);

    const wsLO = XLSX.utils.aoa_to_sheet([loHeaders, ...loRows]);
    wsLO['!cols'] = [
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 24 },
      { wch: 14 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLO, 'مسؤولو_القروض');

    // Sheet 2: Supervisors Entitlements
    const supHeaders = [
      'الفترة',
      'رقم المشرف',
      'اسم المشرف',
      'الفرع / المكتب',
      'عدد مسؤولي القروض المكلفين',
      'المسؤولين المؤهلين',
      `إجمالي مبالغ صرف الفريق (${currencySymbol})`,
      'متوسط نسبة تحصيل الفريق %',
      `إجمالي حوافز الفريق (${currencySymbol})`,
      `حافز الإشراف (${currencySymbol})`,
      `بدل الانتقال (${currencySymbol})`,
      `المكافأة (${currencySymbol})`,
      `إجمالي مستحقات المشرف (${currencySymbol})`,
      'الحالة',
    ];

    const supRows = supList.map((sup) => [
      sup.period,
      sup.supervisorId,
      sup.supervisorName,
      sup.office,
      sup.supervisedOfficersCount,
      sup.qualifiedOfficersCount,
      sup.totalDisbursedAmount,
      sup.averageRepaymentRate + '%',
      sup.totalTeamIncentives,
      sup.incentives,
      sup.transportation,
      sup.bonus,
      sup.totalEntitlements,
      sup.status,
    ]);

    const totalSupInc = supList.reduce((s, r) => s + r.incentives, 0);
    const totalSupTrans = supList.reduce((s, r) => s + r.transportation, 0);
    const totalSupBonus = supList.reduce((s, r) => s + r.bonus, 0);
    const totalSupTotal = supList.reduce((s, r) => s + r.totalEntitlements, 0);

    supRows.push([
      'المجموع الإجمالي',
      `${supList.length} مشرف`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totalSupInc,
      totalSupTrans,
      totalSupBonus,
      totalSupTotal,
      '',
    ]);

    const wsSup = XLSX.utils.aoa_to_sheet([supHeaders, ...supRows]);
    wsSup['!cols'] = [
      { wch: 12 },
      { wch: 16 },
      { wch: 28 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSup, 'مشرفو_المسؤولين');

    // Sheet 3: Period Executive Summary
    if (summary) {
      const sumRows = [
        ['تقرير مستحقات وحوافز الفترة', summary.period],
        ['حالة الفترة الحالية', summary.status],
        ['عدد مسؤولي القروض المحتسبين', summary.loCount],
        ['عدد المشرفين المعتمدين', summary.supervisorCount],
        [`إجمالي بند الحوافز (${currencySymbol})`, summary.totalIncentives],
        [`إجمالي بند بدل الانتقال (${currencySymbol})`, summary.totalTransportation],
        [`إجمالي بند المكافآت (${currencySymbol})`, summary.totalBonus],
        [`المجموع الكلي للمستحقات (${currencySymbol})`, summary.grandTotal],
        ['تاريخ ووقت الاحتساب', summary.lastCalculatedAt],
        ['معتمد بواسطة', summary.approvedBy || 'قيد المراجعة'],
        ['تاريخ الاعتماد', summary.approvedAt || '-'],
        ['مقفل بواسطة', summary.lockedBy || 'غير مقفل'],
      ];
      const wsSum = XLSX.utils.aoa_to_sheet(sumRows);
      wsSum['!cols'] = [{ wch: 32 }, { wch: 38 }];
      XLSX.utils.book_append_sheet(wb, wsSum, 'الملخص_التنفيذي');
    }

    const safeFilename = `تقرير_مستحقات_الحوافز_فيتاس_العراق_فترة_${period}.xlsx`;
    XLSX.writeFile(wb, safeFilename);
  }
}
